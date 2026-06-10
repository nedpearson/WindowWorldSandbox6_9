// cacheWarmer.ts — Orchestrates full offline cache warming after login
//
// Called once after login while online. Warms all field-critical data
// into Dexie so the app works completely offline.
//
// Progress is emitted via callbacks for the UI to show status.
// Stores device_meta.offlineReadyStatus on completion.

import { getOfflineDb, updateDeviceMeta, getOrCreateDeviceId, detectPlatformType, cacheCustomer, cacheSketch } from './offlineDb';
import { cacheAppointment } from './syncEngine';
import { refreshPricingCache } from './pricingCache';
import { refreshManualCache } from './manualCache';
import { api } from '../utils/api';

export type OfflineReadyStatus =
  | 'not_ready'
  | 'warming'
  | 'ready'
  | 'ready_with_warnings'
  | 'failed';

export interface WarmProgress {
  status: OfflineReadyStatus;
  step: string;
  completedSteps: number;
  totalSteps: number;
  warnings: string[];
}

type ProgressCallback = (progress: WarmProgress) => void;

const WARM_WINDOW_DAYS = 14; // fetch appointments within next N days

export async function warmOfflineCaches(
  userId: string,
  companyId: string,
  onProgress?: ProgressCallback
): Promise<{ status: OfflineReadyStatus; warnings: string[] }> {
  const deviceId = getOrCreateDeviceId();
  const warnings: string[] = [];
  let completedSteps = 0;
  const totalSteps = 5;

  const emit = (step: string, status: OfflineReadyStatus = 'warming') => {
    onProgress?.({
      status,
      step,
      completedSteps,
      totalSteps,
      warnings: [...warnings],
    });
  };

  try {
    // Mark warming started
    await updateDeviceMeta({ deviceId, platform: detectPlatformType(), userId, companyId, offlineReadyStatus: 'warming' });
    emit('Warming pricing data...');

    // Step 1: Pricing + rules + finance options + business rules
    try {
      await refreshPricingCache();
    } catch {
      warnings.push('Pricing data could not be cached — offline quotes may be stale');
    }
    completedSteps++;
    emit('Warming field manual...');

    // Step 2: Field manual + training text
    try {
      await refreshManualCache();
    } catch {
      warnings.push('Field manual could not be cached');
    }
    completedSteps++;
    emit('Warming today\'s appointments...');

    // Step 3: Today + in-progress + recent appointments (with full openings + customer)
    let appointmentCount = 0;
    try {
      const dashboard = await api.get('/mobile/field-dashboard');
      const allAppts: any[] = [
        ...(dashboard.today ?? []),
        ...(dashboard.inProgress ?? []),
        ...(dashboard.recent ?? []),
      ];
      // Deduplicate
      const seen = new Set<string>();
      const unique = allAppts.filter(a => a?.id && !seen.has(a.id) && seen.add(a.id));
      for (const appt of unique) {
        await cacheAppointment(appt);
        if (appt.customer) await cacheCustomer(appt.customer);
        appointmentCount++;
      }
    } catch {
      warnings.push('Could not pre-load appointment dashboard');
    }
    completedSteps++;
    emit(`Warming upcoming appointments (next ${WARM_WINDOW_DAYS} days)...`);

    // Step 4: Future appointments within the date window
    try {
      const today = new Date();
      const future = new Date(today);
      future.setDate(future.getDate() + WARM_WINDOW_DAYS);
      const upcoming = await api.get(
        `/appointments?dateFrom=${today.toISOString()}&dateTo=${future.toISOString()}&field=1`
      );
      if (Array.isArray(upcoming)) {
        for (const appt of upcoming) {
          if (!appt?.id) continue;
          await cacheAppointment(appt);
          if (appt.customer) await cacheCustomer(appt.customer);
          appointmentCount++;
        }
      }
    } catch {
      // Non-critical — today's dashboard already cached
    }
    completedSteps++;
    emit('Warming sketches...');

    // Step 5: Pull sketches for cached appointments (best-effort)
    try {
      const db = getOfflineDb();
      const cachedAppts = await db.appointments_cache.limit(30).toArray();
      for (const cached of cachedAppts) {
        try {
          const raw = JSON.parse(cached.rawJson);
          if (raw?.houseMap) {
            await cacheSketch({ ...raw.houseMap, appointmentId: cached.id });
          }
        } catch { /* skip */ }
      }
    } catch {
      // Non-critical
    }
    completedSteps++;

    const finalStatus: OfflineReadyStatus = warnings.length > 0 ? 'ready_with_warnings' : 'ready';
    await updateDeviceMeta({
      deviceId,
      offlineReadyStatus: finalStatus,
      offlineReadyAt: Date.now(),
      lastSyncAt: Date.now(),
    });
    emit(`Offline ready — ${appointmentCount} appointments cached`, finalStatus);
    return { status: finalStatus, warnings };

  } catch (err: any) {
    warnings.push(`Cache warming failed: ${err.message}`);
    await updateDeviceMeta({ deviceId, offlineReadyStatus: 'failed' }).catch(() => {});
    emit('Cache warming failed', 'failed');
    return { status: 'failed', warnings };
  }
}

export async function warmDateRange(
  userId: string,
  companyId: string,
  dateFrom: string,
  dateTo: string,
  onProgress?: ProgressCallback
): Promise<{ status: OfflineReadyStatus; warnings: string[] }> {
  const warnings: string[] = [];
  const emit = (step: string, status: OfflineReadyStatus = 'warming') => {
    onProgress?.({ status, step, completedSteps: 0, totalSteps: 1, warnings });
  };
  
  emit(`Downloading jobs for ${dateFrom} to ${dateTo}...`);
  try {
    const upcoming = await api.get(`/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}&field=1`);
    if (Array.isArray(upcoming)) {
      for (const appt of upcoming) {
        if (!appt?.id) continue;
        await cacheAppointment(appt);
        if (appt.customer) await cacheCustomer(appt.customer);
      }
    }
    emit(`Finished downloading ${upcoming?.length || 0} jobs`, 'ready');
    return { status: 'ready', warnings };
  } catch (err: any) {
    warnings.push(`Failed to download range: ${err.message}`);
    emit('Failed', 'failed');
    return { status: 'failed', warnings };
  }
}

// Get current offline ready status from device_meta
export async function getOfflineReadyStatus(): Promise<{ status: OfflineReadyStatus; offlineReadyAt?: number; warnings: string[] }> {
  const db = getOfflineDb();
  const deviceId = getOrCreateDeviceId();
  const meta = await db.device_meta.where('deviceId').equals(deviceId).first().catch(() => null);
  if (!meta) return { status: 'not_ready', warnings: [] };
  return {
    status: (meta.offlineReadyStatus ?? 'not_ready') as OfflineReadyStatus,
    offlineReadyAt: meta.offlineReadyAt,
    warnings: [],
  };
}
