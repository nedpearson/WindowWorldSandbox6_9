// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/syncQA.ts — Sync state QA + human-friendly explanations
//
// OFFLINE-SAFE: Reads Dexie outbox, conflict, and photo queue tables.
//
// BOUNDARY RULE: These functions read sync state and produce findings.
// They NEVER resolve conflicts, retry uploads, or modify sync state.
// The user must explicitly trigger sync actions.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding } from './types';
import { getOfflineDb } from '../offlineDb';

/** Simple djb2 hash — works with any Unicode string */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function makeId(appointmentId: string, key: string): string {
  return `sqa_${djb2Hash(`sqa:${appointmentId}:${key}`)}`;
}

// ── Sync State Summary ────────────────────────────────────────────────────

export interface SyncStateSummary {
  pendingOutbox: number;
  pendingPhotos: number;
  failedPhotos: number;
  pendingSignatures: number;
  conflicts: number;
  pricingCacheAgeHours: number | null;
}

/**
 * Read the offline DB and return a summary of sync state.
 * All reads are non-destructive.
 */
export async function getSyncStateSummary(
  appointmentId: string,
): Promise<SyncStateSummary> {
  try {
    const db = getOfflineDb();

    const [
      outboxItems,
      conflicts,
      signatures,
    ] = await Promise.all([
      (db as any).sync_outbox?.where({ appointmentId })?.toArray?.() ?? Promise.resolve([]),
      (db as any).sync_conflicts?.where({ appointmentId })?.toArray?.() ?? Promise.resolve([]),
      (db as any).offline_signatures?.where({ appointmentId })?.toArray?.() ?? Promise.resolve([]),
    ]);

    const pendingSignatures = (signatures as any[]).filter(
      (s: any) => s.status === 'pending' || s.status === 'uploading',
    ).length;

    // Photo sync state comes from appointment cache openings data
    // (Photos in offline DB carry syncStatus)
    let pendingPhotos = 0;
    let failedPhotos = 0;
    try {
      const apptCache = await (db as any).appointments?.get(appointmentId);
      if (apptCache?.rawJson) {
        const parsed = JSON.parse(apptCache.rawJson);
        const photos: any[] = parsed?.photos ?? parsed?.openingPhotos ?? [];
        pendingPhotos = photos.filter((p: any) => p.syncStatus === 'pending' || p.syncStatus === 'uploading').length;
        failedPhotos = photos.filter((p: any) => p.syncStatus === 'failed').length;
      }
    } catch {
      // Photo check is best-effort
    }

    // Pricing cache age
    let pricingCacheAgeHours: number | null = null;
    try {
      const pricingMeta = await (db as any).sync_metadata?.get('pricing_rules');
      if (pricingMeta?.lastSyncAt) {
        pricingCacheAgeHours = Math.round((Date.now() - pricingMeta.lastSyncAt) / (60 * 60 * 1000));
      }
    } catch {
      // Pricing meta is best-effort
    }

    return {
      pendingOutbox: (outboxItems as any[]).length,
      pendingPhotos,
      failedPhotos,
      pendingSignatures,
      conflicts: (conflicts as any[]).length,
      pricingCacheAgeHours,
    };
  } catch {
    // If offlineDb is unavailable, return safe empty state
    return {
      pendingOutbox: 0,
      pendingPhotos: 0,
      failedPhotos: 0,
      pendingSignatures: 0,
      conflicts: 0,
      pricingCacheAgeHours: null,
    };
  }
}

// ── Human-Readable Sync Messages ─────────────────────────────────────────

/**
 * Convert a SyncStateSummary into a set of findings with human-friendly messages.
 */
export function buildSyncFindings(
  appointmentId: string,
  summary: SyncStateSummary,
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  if (summary.failedPhotos > 0) {
    findings.push({
      id: makeId(appointmentId, `photo:failed:${summary.failedPhotos}`),
      severity: 'blocking',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `${summary.failedPhotos} photo upload${summary.failedPhotos > 1 ? 's' : ''} failed`,
      message: `${summary.failedPhotos} photo${summary.failedPhotos > 1 ? 's' : ''} could not be uploaded. ` +
        `Tap Retry before generating the final contract. ` +
        `Photos must be on the server before the contract packet is exported.`,
      suggestedAction: 'Go to Photos tab → tap Retry on failed uploads.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { count: summary.failedPhotos },
    });
  }

  if (summary.conflicts > 0) {
    findings.push({
      id: makeId(appointmentId, `conflicts:${summary.conflicts}`),
      severity: 'blocking',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `${summary.conflicts} sync conflict${summary.conflicts > 1 ? 's' : ''} require review`,
      message: `${summary.conflicts} sync conflict${summary.conflicts > 1 ? 's' : ''} occurred when this device reconnected. ` +
        `You must review and resolve these before the data is consistent.`,
      suggestedAction: 'Open the Sync Conflicts panel and choose which version to keep for each conflict.',
      requiresApproval: true,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { count: summary.conflicts },
    });
  }

  if (summary.pendingOutbox > 0) {
    findings.push({
      id: makeId(appointmentId, `outbox:${summary.pendingOutbox}`),
      severity: 'info',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `${summary.pendingOutbox} change${summary.pendingOutbox > 1 ? 's' : ''} saved locally — pending sync`,
      message: `${summary.pendingOutbox} measurement${summary.pendingOutbox > 1 ? 's or change' : ' or change'}s saved locally. ` +
        `They will sync automatically when a stable internet connection is available. ` +
        `Safe to continue working offline.`,
      suggestedAction: 'Stay connected to allow sync to complete.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { count: summary.pendingOutbox },
    });
  }

  if (summary.pendingPhotos > 0) {
    findings.push({
      id: makeId(appointmentId, `photos:pending:${summary.pendingPhotos}`),
      severity: 'warning',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `${summary.pendingPhotos} photo${summary.pendingPhotos > 1 ? 's' : ''} pending upload`,
      message: `${summary.pendingPhotos} photo${summary.pendingPhotos > 1 ? 's' : ''} are queued for upload. ` +
        `They will upload automatically when connected. Do not close the app while photos are uploading.`,
      suggestedAction: 'Remain connected until photos finish uploading.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { count: summary.pendingPhotos },
    });
  }

  if (summary.pendingSignatures > 0) {
    findings.push({
      id: makeId(appointmentId, `sigs:pending:${summary.pendingSignatures}`),
      severity: 'warning',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `${summary.pendingSignatures} signature${summary.pendingSignatures > 1 ? 's' : ''} pending upload`,
      message: `${summary.pendingSignatures} signature${summary.pendingSignatures > 1 ? 's' : ''} captured offline and awaiting upload. ` +
        `Signatures will sync when connected. Contract packet will be available after sync.`,
      suggestedAction: 'Connect to internet to upload signatures.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { count: summary.pendingSignatures },
    });
  }

  if (summary.pricingCacheAgeHours != null && summary.pricingCacheAgeHours >= 24) {
    findings.push({
      id: makeId(appointmentId, `pricing:stale:${summary.pricingCacheAgeHours}`),
      severity: summary.pricingCacheAgeHours >= 48 ? 'warning' : 'info',
      category: 'sync',
      source: 'sync_engine',
      appointmentId,
      title: `Pricing cached ${summary.pricingCacheAgeHours}h ago — online revalidation recommended`,
      message: `Pricing rules were last refreshed ${summary.pricingCacheAgeHours} hours ago. ` +
        (summary.pricingCacheAgeHours >= 48
          ? `Final contract needs online revalidation before signing.`
          : `Pricing appears recent. Recommend online revalidation before final contract.`),
      suggestedAction: 'Go online and tap "Recalculate" to refresh pricing from the server.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { ageHours: summary.pricingCacheAgeHours },
    });
  }

  return findings;
}

// ── What is Safe to Do Offline ────────────────────────────────────────────

export function getOfflineSafeActions(): string[] {
  return [
    'Capture Bluetooth measurements — saved locally, syncs when connected',
    'Enter measurements manually — saved locally',
    'Take photos — stored locally, upload queued for sync',
    'Capture customer signature — stored locally, uploads on reconnect',
    'Update notes — saved locally',
    'View cached appointments, openings, and pricing',
    'Run Smart Check (deterministic rules only — AI checks require internet)',
  ];
}

export function getOnlineRequiredActions(): string[] {
  return [
    'Recalculate final pricing from fresh rules',
    'Generate and export final contract PDF',
    'AI photo analysis (surface detection, tape reading)',
    'Sync measurement adjustments to server',
    'Upload photos and signatures',
    'Resolve sync conflicts',
    'Generate proposal for customer presentation',
  ];
}

// ── Full Sync Analysis (async) ────────────────────────────────────────────

export async function analyzeSyncState(
  appointmentId: string,
): Promise<FieldIntelligenceFinding[]> {
  const summary = await getSyncStateSummary(appointmentId);
  return buildSyncFindings(appointmentId, summary);
}
