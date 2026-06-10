// ─────────────────────────────────────────────────────────────────────────────
// syncEngine.ts — Offline sync outbox processor
//
// Responsibilities:
//   1. Enqueue offline writes to Dexie sync_outbox
//   2. Drain the outbox when online (one entity at a time, ordered by createdAt)
//   3. Remap localId → cloudId for child records after parent sync
//   4. Detect conflicts (server returns 409 or version mismatch)
//   5. Retry with exponential backoff; 429-aware
//   6. Emit sync state via Zustand
//
// Security:
//   - companyId/userId come from the auth JWT on the server; we include them
//     in the payload for backend validation but the server re-derives from token.
//   - No service role key anywhere in this file.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getOfflineDb,
  getOrCreateDeviceId,
  detectPlatformType,
  type OutboxItem,
  type EntityType,
  type OutboxOperation,
  recordIdMapping,
  appendAuditTrail,
  cacheCustomer,
  cacheSketch,
} from './offlineDb';
import {
  resolveWorkbookDefaults,
  resolveWindowWorldModel,
  abbreviateWindowWorldColor,
  abbreviateType,
} from '../utils/exportContract';

const MAX_RETRIES = 100;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;
const BATCH_SIZE = 20; // outbox items per drain cycle

// ── Outbox helpers ────────────────────────────────────────────────────────────

function makeIdempotencyKey(
  companyId: string,
  entityType: EntityType,
  localId: string,
  operation: OutboxOperation
): string {
  const deviceId = getOrCreateDeviceId();
  return `${companyId}:${deviceId}:${entityType}:${localId}:${operation}`;
}

/** Enqueue a write to the local outbox (called before or instead of API calls). */
export async function enqueueOutboxItem(params: {
  companyId: string;
  userId: string;
  entityType: EntityType;
  entityLocalId: string;
  entityCloudId?: string;
  appointmentId?: string;
  operation: OutboxOperation;
  payload: Record<string, any>;
  dependsOn?: string;
}): Promise<number> {
  const db = getOfflineDb();
  const now = Date.now();
  const idempotencyKey = makeIdempotencyKey(params.companyId, params.entityType, params.entityLocalId, params.operation);

  const existing = await db.sync_outbox.where('idempotencyKey').equals(idempotencyKey).first();
  if (existing) {
    if (existing.status === 'synced') return existing.id!;
    await updateOutboxStatus(existing.id!, existing.status === 'failed' ? 'pending' : existing.status, {
      payloadJson: JSON.stringify(params.payload),
      updatedAt: now,
      retryCount: 0
    });
    return existing.id!;
  }

  const item: OutboxItem = {
    companyId: params.companyId,
    userId: params.userId,
    deviceId: getOrCreateDeviceId(),
    platform: detectPlatformType(),
    entityType: params.entityType,
    entityLocalId: params.entityLocalId,
    entityCloudId: params.entityCloudId,
    appointmentId: params.appointmentId,
    operation: params.operation,
    payloadJson: JSON.stringify(params.payload),
    dependsOn: params.dependsOn,
    idempotencyKey,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  return db.sync_outbox.add(item);
}

/** Update outbox item status. */
async function updateOutboxStatus(
  id: number,
  status: OutboxItem['status'],
  updates: Partial<OutboxItem> = {}
): Promise<void> {
  await getOfflineDb().sync_outbox.update(id, { status, updatedAt: Date.now(), ...updates });
}

// ── Dependency resolution ─────────────────────────────────────────────────────

/** Check if an item's parent has been synced yet (for child records). */
async function isDependencyResolved(item: OutboxItem): Promise<boolean> {
  if (!item.dependsOn) return true;
  const db = getOfflineDb();
  const parent = await db.sync_outbox
    .where('entityLocalId')
    .equals(item.dependsOn)
    .first();
  // Dependency resolved if parent is synced or doesn't exist (already synced and pruned)
  return !parent || parent.status === 'synced';
}

// ── HTTP dispatch ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'wwa_token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function dispatchOutboxItem(item: OutboxItem): Promise<{ cloudId?: string; version?: number }> {
  const payload = JSON.parse(item.payloadJson);

  // Remap customerId for appointment if it depends on a recently synced customer
  if (item.entityType === 'appointment' && item.dependsOn && item.dependsOn !== payload.customerId) {
    // If dependsOn was updated to a cloud ID, update payload
    payload.customerId = item.dependsOn;
  }

  let url: string;
  let method: string;

  switch (item.entityType) {
    case 'opening':
      if (item.operation === 'create') { url = '/api/openings'; method = 'POST'; }
      else if (item.operation === 'update') { url = `/api/openings/${item.entityCloudId || item.entityLocalId}`; method = 'PUT'; }
      else { url = `/api/openings/${item.entityCloudId || item.entityLocalId}`; method = 'DELETE'; }
      break;
    case 'customer':
      if (item.operation === 'update') {
        url = `/api/customers/${item.entityCloudId || item.entityLocalId}`;
        method = 'PUT';
      } else if (item.operation === 'delete') {
        url = `/api/customers/${item.entityCloudId || item.entityLocalId}`;
        method = 'DELETE';
      } else {
        url = '/api/customers';
        method = 'POST';
      }
      break;
    case 'appointment':
      if (item.operation === 'update') {
        // Appointments server uses PUT not PATCH
        url = `/api/appointments/${item.entityCloudId || item.entityLocalId}`;
        method = 'PUT';
      } else if (item.operation === 'delete') {
        url = `/api/appointments/${item.entityCloudId || item.entityLocalId}`;
        method = 'DELETE';
      } else {
        url = '/api/appointments';
        method = 'POST';
      }
      break;
    case 'note':
      url = '/api/mobile/notes';
      method = 'POST';
      break;
    case 'sketch':
    case 'sketch_marker':
      // house-maps uses PUT as an upsert; POST for creation when no entityCloudId
      if (item.entityCloudId) {
        url = `/api/house-maps/${item.entityCloudId}`;
        method = 'PUT';
      } else {
        url = '/api/house-maps';
        method = 'POST';
      }
      break;
    case 'follow_up':
      // /api/follow-ups POST creates a FollowUp record AND updates appointment.followUpDate
      // This route is registered at server/src/index.ts and handles dedup via 409
      if (item.operation === 'update' && item.entityCloudId) {
        url = `/api/follow-ups/${item.entityCloudId}`;
        method = 'PATCH';
      } else {
        url = '/api/follow-ups';
        method = 'POST';
      }
      break;
    case 'review_action':
      url = '/api/review-actions/apply';
      method = 'POST';
      break;
    case 'training_progress':
      url = '/api/training/progress';
      method = 'POST';
      break;
    case 'photo':
      // Photos handled separately by photo queue drainer
      return {};
    case 'measurement':
      // Measurements are saved as opening updates
      url = `/api/openings/${item.entityCloudId || item.entityLocalId}`;
      method = 'PUT';
      break;
    case 'laser_capture':
      // Laser/manual measurement captures sync to dedicated endpoint
      // idempotencyKey is sent in the header and body for server-side dedup
      url = '/api/laser-measurements';
      method = 'POST';
      break;
    case 'measurement_session':
      // Multi-point session (widthTop/Middle/Bottom + heightLeft/Center/Right)
      // syncs to the MeasurementAdjustment endpoint which also updates Opening.width/height
      url = '/api/measurements/multi-point';
      method = 'POST';
      break;
    case 'document_generation': {
      const docType = payload.documentType || 'order_form';
      const apptId = payload.appointmentId || item.entityCloudId || item.entityLocalId;
      
      // Local Desktop Generation interception
      if (typeof window !== 'undefined' && (window as any).electronAPI?.generateExcelLocally && docType !== 'pdf') {
        const apptData = await getCachedAppointment(apptId);
        if (apptData) {
          // Format into AppointmentExportData format expected by the generator
          const exportData = {
            customer: apptData.customer || {},
            openings: (apptData.openings || []).map((rawO: any) => {
              const o = resolveWorkbookDefaults(rawO);
              const modelCode = resolveWindowWorldModel(o);
              return {
                qty: o.quantity ?? 1,
                model: modelCode,
                vinylColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
                intColor: abbreviateWindowWorldColor(o.interiorColor) || '',
                extColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
                width: o.width || undefined,
                height: o.height || undefined,
                legHeight: o.legHeight || undefined,
                customRadius: o.customRadius || undefined,
                windowNumber: o.openingNumber,
                hinge: o.hinge || undefined,
                glassOption: o.glassPackage || undefined,
                foamEnhanced: o.foamEnhanced ? 'FE' : undefined,
                gridStyle: o.gridStyle || undefined,
                gridPattern: o.gridPattern || undefined,
                temperedFull: o.temperedGlass === 'full' ? 'FULL' : o.temperedGlass === 'half' ? 'BSO' : undefined,
                obscureFull: o.obscureGlass === 'full' ? 'FULL' : o.obscureGlass === 'half' ? 'BSO' : undefined,
                fullScreen: (o.screenOption === 'Full' || o.screenOption === 'Full Screen') ? 'Y' : undefined,
                nailFinNoJ: o.nailFin && !o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
                nailFinWithJ: o.nailFin && o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
                orielDim: (o.oriel || o.productCategory === 'oriel' || String(o.productModel || '').toLowerCase().includes('oriel')) ? (o.orielUpperSashHeight ? String(o.orielUpperSashHeight) : 'Y') : undefined,
                headerFlash: (o.exteriorSurface === 'vinyl_siding' || o.exteriorSurface === 'wood_siding' || o.exteriorType === 'siding') ? 'Y' : undefined,
                typeExterior: abbreviateType(o.exteriorSurface || o.exteriorType, 'exterior') || undefined,
                typeTrim: abbreviateType(o.trimType, 'trim') || undefined,
                typeRemoved: abbreviateType(o.removalType, 'remove') || undefined,
                typeInstall: abbreviateType(o.installType, 'install') || undefined,
                sillRepair: o.sillRepair ? 'X' : undefined,
                roomLocation: o.roomLocation || undefined,
                notes: o.customerNotes || undefined,
              };
            }),
            pricing: {
              totalListPrice: apptData.subtotal,
              totalAmount: apptData.totalAmount,
              depositAmount: apptData.depositAmount,
              balanceDue: apptData.balanceDue,
              amtFinanced: apptData.financingAmount,
              customerId: apptData.customer?.customerId
            },
            notes: apptData.notes,
            poNumber: apptData.poNumber,
            orderDate: apptData.appointmentDate,
            completeJob: apptData.completeJob ? 'YES' : 'NO',
            estimatorName: apptData.user?.name || undefined,
            estimatorEmail: (() => {
              const email = apptData.user?.email || 'npearson@winworldinfo.com';
              if (email === 'nedpearson@gmail.com' || email === 'gpearson@winworldinfo.com') {
                return 'npearson@winworldinfo.com';
              }
              return email;
            })(),
          };
          const res = await (window as any).electronAPI.generateExcelLocally(exportData);
          if (res.success) {
            // Treat as successfully generated locally
            return {};
          }
        }
      }

      url = `/api/documents/${docType}/${apptId}/generate`;
      method = 'POST';
      break;
    }
    case 'docusign_send': {
      const apptId = payload.appointmentId || item.entityCloudId || item.entityLocalId;
      url = `/api/documents/appointment/${apptId}/docusign/send`;
      method = 'POST';
      break;
    }
    default:
      throw new Error(`Unknown entityType: ${item.entityType}`);
  }

  const res = await fetch(url, {
    method,
    headers: {
      ...getAuthHeaders(),
      'X-Idempotency-Key': item.idempotencyKey,
      'X-Device-Id': item.deviceId,
    },
    body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
  });

  if (res.status === 409) {
    // Conflict — record it and surface to UI
    const conflictBody = await res.json().catch(() => ({}));
    const db = getOfflineDb();
    await db.sync_conflicts.add({
      entityType: item.entityType,
      entityLocalId: item.entityLocalId,
      entityCloudId: item.entityCloudId,
      appointmentId: item.appointmentId,
      localValue: item.payloadJson,
      cloudValue: JSON.stringify(conflictBody.cloudValue ?? {}),
      localUpdatedAt: item.updatedAt,
      cloudUpdatedAt: conflictBody.cloudUpdatedAt ?? Date.now(),
      createdAt: Date.now(),
    });
    const err: any = new Error('Conflict detected');
    err.isConflict = true;
    throw err;
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '10', 10);
    const err: any = new Error('Rate limited');
    err.isRateLimit = true;
    err.retryAfterMs = retryAfter * 1000;
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  return { cloudId: data.id, version: data.version };
}

// ── LocalId → CloudId remapping ───────────────────────────────────────────────

/** After syncing a parent entity, update all child outbox items to use the cloudId. */
async function remapChildCloudIds(localId: string, cloudId: string): Promise<void> {
  const db = getOfflineDb();
  
  // 1. Remap outbox references
  await db.sync_outbox.where('appointmentId').equals(localId).modify({ appointmentId: cloudId });
  await db.sync_outbox.where('dependsOn').equals(localId).modify({ dependsOn: cloudId });

  // Remap local IDs embedded in payload JSON
  await db.sync_outbox.filter(item => item.payloadJson.includes(`"${localId}"`)).modify(item => {
    item.payloadJson = item.payloadJson.split(`"${localId}"`).join(`"${cloudId}"`);
  });

  // 2. Remap photo blob queue references
  await db.photo_blob_queue.where('appointmentId').equals(localId).modify({ appointmentId: cloudId });
  await db.photo_blob_queue.where('openingId').equals(localId).modify({ openingId: cloudId });
}

/** After syncing an entity, update the appointment cache with its cloudId. */
async function updateCacheCloudId(localId: string, cloudId: string, entityType: EntityType): Promise<void> {
  if (entityType !== 'appointment') return;
  const db = getOfflineDb();
  // Appointment was cached with a temp ID — update it
  const cached = await db.appointments_cache.get(localId);
  if (cached) {
    await db.appointments_cache.delete(localId);
    await db.appointments_cache.put({ ...cached, id: cloudId });
  }
}

// ── Drain ─────────────────────────────────────────────────────────────────────

let _draining = false;
let _syncListeners: Array<(state: SyncEngineState) => void> = [];
let _currentState: SyncEngineState = { status: 'idle', pendingCount: 0, failedCount: 0, conflictCount: 0 };

export interface SyncEngineState {
  status: 'idle' | 'syncing' | 'pending' | 'failed' | 'conflict' | 'offline';
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncAt?: number;
  lastError?: string;
  /** Photo upload progress (0–100) during photo queue drain */
  photoUploadProgress?: number;
  /** Number of photos currently uploading */
  photosUploading?: number;
  /** Total photos queued for upload */
  photosTotalQueued?: number;
}

function emit(state: Partial<SyncEngineState>): void {
  _currentState = { ..._currentState, ...state };
  _syncListeners.forEach(fn => fn(_currentState));
}

export function subscribeSyncState(fn: (state: SyncEngineState) => void): () => void {
  _syncListeners.push(fn);
  fn(_currentState); // emit current state immediately
  return () => { _syncListeners = _syncListeners.filter(l => l !== fn); };
}

export function getSyncState(): SyncEngineState {
  return _currentState;
}

async function refreshCounts(): Promise<void> {
  const db = getOfflineDb();
  const [pendingCount, failedCount, conflictCount] = await Promise.all([
    db.sync_outbox.where('status').anyOf(['pending', 'syncing']).count(),
    db.sync_outbox.where('status').equals('failed').count(),
    // Count conflicts that have no resolution yet (filter in JS since undefined is not indexable)
    db.sync_conflicts.filter(c => !c.resolution).count().catch(() => 0),
  ]);
  emit({ pendingCount, failedCount, conflictCount });
}

export async function drainOutbox(): Promise<void> {
  if (_draining || !navigator.onLine) {
    if (!navigator.onLine) emit({ status: 'offline' });
    return;
  }
  _draining = true;

  const db = getOfflineDb();

  try {
    // Rescue any items stuck in 'syncing' state from a previous crash/interruption
    await db.sync_outbox.where('status').equals('syncing').modify({ status: 'pending', retryCount: 0 }).catch(() => {});

    const now = Date.now();

    // Get pending items ready to retry (not blocked by nextRetryAt)
    const pending = await db.sync_outbox
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(item =>
        item.retryCount < MAX_RETRIES &&
        (!item.nextRetryAt || item.nextRetryAt <= now)
      )
      .limit(BATCH_SIZE)
      .sortBy('createdAt');

    if (pending.length === 0) {
      emit({ status: 'idle' });
      await refreshCounts();
      return;
    }

    emit({ status: 'syncing' });

    for (const item of pending) {
      if (!navigator.onLine) { emit({ status: 'offline' }); break; }

      // Check dependency resolution
      const depResolved = await isDependencyResolved(item);
      if (!depResolved) continue; // skip until parent syncs

      await updateOutboxStatus(item.id!, 'syncing');

      try {
        const { cloudId, version } = await dispatchOutboxItem(item);

        await updateOutboxStatus(item.id!, 'synced', {
          entityCloudId: cloudId || item.entityCloudId,
        });

        // Remap children if this was a create that got a new cloudId
        if (cloudId && cloudId !== item.entityLocalId) {
          await remapChildCloudIds(item.entityLocalId, cloudId);
          await updateCacheCloudId(item.entityLocalId, cloudId, item.entityType);
          // Record the localId → cloudId mapping for crash recovery
          await recordIdMapping(
            item.entityType,
            item.entityLocalId,
            cloudId,
            item.companyId,
            item.userId
          ).catch((err) => {
              console.error(`[SyncEngine] Failed to record ID mapping for ${item.entityLocalId} -> ${cloudId}:`, err);
            });
        }

        // Audit trail
        await appendAuditTrail({
          entityType: item.entityType,
          entityLocalId: item.entityLocalId,
          entityCloudId: cloudId || item.entityCloudId,
          action: 'synced',
          createdAt: Date.now(),
        }).catch((err) => console.error('[SyncEngine] Failed to append audit trail:', err));

        emit({ lastSyncAt: Date.now() });

      } catch (err: any) {
        const retryCount = (item.retryCount || 0) + 1;
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), MAX_DELAY_MS);

        if (err.isConflict) {
          await updateOutboxStatus(item.id!, 'conflict', { retryCount, lastError: 'Conflict with cloud version' });
          emit({ status: 'conflict' });
        } else if (err.isRateLimit) {
          await updateOutboxStatus(item.id!, 'pending', {
            retryCount,
            nextRetryAt: Date.now() + (err.retryAfterMs || 10_000),
            lastError: err.message,
          });
        } else if (retryCount >= MAX_RETRIES) {
          await updateOutboxStatus(item.id!, 'failed', {
            retryCount,
            lastError: err.message,
            nextRetryAt: undefined,
          });
          emit({ status: 'failed', lastError: err.message });
        } else {
          await updateOutboxStatus(item.id!, 'pending', {
            retryCount,
            nextRetryAt: Date.now() + delay,
            lastError: err.message,
          });
        }
      }
    }

    await refreshCounts();

    // Set final status
    const { pendingCount, failedCount, conflictCount } = _currentState;
    if (conflictCount > 0) emit({ status: 'conflict' });
    else if (failedCount > 0) emit({ status: 'failed' });
    else if (pendingCount > 0) emit({ status: 'pending' });
    else emit({ status: 'idle' });

  } finally {
    _draining = false;
  }
}

// ── Pull sync integration ─────────────────────────────────────────────────────

/** Pull delta changes from server, then drain outbox. Call on reconnect. */
export async function drainWithPull(): Promise<void> {
  if (!navigator.onLine) return;
  const db = getOfflineDb();

  try {
    // Get last pull time from device_meta
    const deviceId = getOrCreateDeviceId();
    const meta = await db.device_meta.where('deviceId').equals(deviceId).first().catch(() => null);
    const since = meta?.lastPullAt ? new Date(meta.lastPullAt).toISOString() : new Date(0).toISOString();

    const token = localStorage.getItem('wwa_token');
    let res: Response;
    try {
      res = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          since,
          entities: ['appointments', 'customers', 'openings', 'sketches'],
        }),
      });
    } catch (err) {
      console.error('[SyncEngine] Network or fetch error during pull:', err);
      return;
    }

    if (!res.ok) {
      console.error(`[SyncEngine] Pull failed: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();

    // Merge appointments into cache
    if (Array.isArray(data.appointments)) {
      for (const appt of data.appointments) {
        // Only update cache if no dirty local changes pending for this appt
        const dirtyInOutbox = await db.sync_outbox
          .where('entityLocalId').equals(appt.id)
          .filter(i => i.status === 'pending' || i.status === 'syncing')
          .count();
        if (dirtyInOutbox === 0) {
          await cacheAppointment(appt).catch(() => {});
        }
      }
    }

    // Merge customers
    if (Array.isArray(data.customers)) {
      for (const customer of data.customers) {
        const dirtyInOutbox = await db.sync_outbox
          .where('entityLocalId').equals(customer.id)
          .filter(i => i.status === 'pending' || i.status === 'syncing')
          .count();
        if (dirtyInOutbox === 0) {
          await cacheCustomer(customer).catch(() => {});
        }
      }
    }

    // Merge sketches
    if (Array.isArray(data.sketches)) {
      for (const sketch of data.sketches) {
        const dirtyInOutbox = await db.sync_outbox
          .where('entityLocalId').equals(sketch.id)
          .filter(i => i.status === 'pending' || i.status === 'syncing')
          .count();
        if (dirtyInOutbox === 0) {
          await cacheSketch(sketch).catch(() => {});
        }
      }
    }

    // Handle tombstones — remove deleted records from cache
    if (Array.isArray(data.deletedAppointmentIds)) {
      for (const tomb of data.deletedAppointmentIds) {
        await db.appointments_cache.delete(tomb.id).catch(() => {});
      }
    }
    if (Array.isArray(data.deletedOpeningIds)) {
      // Openings are embedded in appointment cache rawJson — flag for re-fetch
      // by invalidating the parent appointment cache entry
      const apptIds = new Set(data.deletedOpeningIds.map((o: any) => o.appointmentId).filter(Boolean));
      for (const apptId of apptIds) {
        const cached = await db.appointments_cache.get(apptId as string);
        if (cached) {
          const raw = JSON.parse(cached.rawJson);
          raw.openings = (raw.openings || []).filter((o: any) =>
            !data.deletedOpeningIds.some((d: any) => d.id === o.id)
          );
          await db.appointments_cache.put({ ...cached, rawJson: JSON.stringify(raw) }).catch(() => {});
        }
      }
    }

    // Update lastPullAt
    if (meta?.id !== undefined) {
      await db.device_meta.update(meta.id, { lastPullAt: Date.now() }).catch(() => {});
    }
  } catch {
    // Pull failures are non-critical — outbox drain proceeds regardless
  }

  // After pull, drain the outbox
  await drainOutbox();
}

// ── Photo Queue Drain ─────────────────────────────────────────────────────────

let _drainingPhotos = false;

export async function drainPhotoQueue(): Promise<void> {
  if (_drainingPhotos || !navigator.onLine) return;
  _drainingPhotos = true;

  try {
    const db = getOfflineDb();

    // Rescue stuck 'uploading' photos
    await db.photo_blob_queue
      .where('status').equals('uploading')
      .modify({ status: 'queued' });

    const photos = await db.photo_blob_queue
      .where('status')
      .anyOf(['queued', 'failed'])
      .filter(p => (p.retryCount || 0) < MAX_RETRIES)
      .toArray();

    if (photos.length === 0) {
      emit({ photoUploadProgress: undefined, photosUploading: 0, photosTotalQueued: 0 });
      return;
    }

    emit({ photosTotalQueued: photos.length, photosUploading: 0, photoUploadProgress: 0 });

    let completed = 0;

    for (const photo of photos) {
      if (!navigator.onLine) break;

      try {
        await db.photo_blob_queue.update(photo.id!, { status: 'uploading' });
        emit({ photosUploading: 1 });

        const formData = new FormData();
        formData.append('file', photo.blob, photo.fileName);
        formData.append('appointmentId', photo.appointmentId);
        if (photo.openingId) formData.append('openingId', photo.openingId);
        formData.append('photoType', photo.photoType);
        formData.append('idempotencyKey', `photo:${photo.localId}`);

        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch('/api/documents/photos', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));

        await db.photo_blob_queue.update(photo.id!, {
          status: 'uploaded',
          cloudUrl: data.url || data.annotatedUrl,
          uploadedAt: Date.now(),
        });

        completed++;
        emit({
          photoUploadProgress: Math.round((completed / photos.length) * 100),
          photosUploading: 0,
        });

      } catch (err: any) {
        const retryCount = (photo.retryCount || 0) + 1;
        await db.photo_blob_queue.update(photo.id!, {
          status: 'failed',
          retryCount,
          lastError: err.message,
        });
        completed++;
        emit({
          photoUploadProgress: Math.round((completed / photos.length) * 100),
          photosUploading: 0,
        });
      }
    }
  } catch (err) {
    console.error('[SyncEngine] Error draining photo queue:', err);
  } finally {
    emit({ photoUploadProgress: undefined, photosUploading: 0 });
    _drainingPhotos = false;
  }
}

// ── Outbox cleanup ────────────────────────────────────────────────────────────

/** Prune synced items older than 24 hours to keep IDB lean. */
export async function pruneOutbox(): Promise<void> {
  const db = getOfflineDb();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  await db.sync_outbox
    .where('status')
    .equals('synced')
    .filter(i => i.updatedAt < cutoff)
    .delete();
}

// ── Conflict resolution ────────────────────────────────────────────────────────

export async function resolveConflict(
  conflictId: number,
  resolution: 'keep_local' | 'keep_cloud',
  userId: string
): Promise<void> {
  const db = getOfflineDb();
  const conflict = await db.sync_conflicts.get(conflictId);
  if (!conflict) return;

  await db.sync_conflicts.update(conflictId, {
    resolution,
    resolvedAt: Date.now(),
    resolvedBy: userId,
  });

  if (resolution === 'keep_local') {
    // Re-queue the outbox item as pending to force a re-push
    const existing = await db.sync_outbox
      .where('entityLocalId')
      .equals(conflict.entityLocalId)
      .first();
    if (existing) {
      await db.sync_outbox.update(existing.id!, {
        status: 'pending',
        retryCount: 0,
        nextRetryAt: undefined,
        lastError: undefined,
      });
    }
  }

  // If keep_cloud, just mark the conflict resolved — cache will be updated on next pull
}

// ── Appointment cache helpers ──────────────────────────────────────────────────

export async function cacheAppointment(appt: any): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.appointments_cache.get(appt.id);
  
  // If the new payload is missing the 'openings' array entirely (e.g. from a partial dashboard list fetch),
  // preserve the previously cached openings.
  const openingsToSave = appt.openings !== undefined 
    ? appt.openings 
    : (existing ? (JSON.parse(existing.rawJson).openings || []) : []);
    
  const mergedAppt = { ...appt, openings: openingsToSave };

  await db.appointments_cache.put({
    id: appt.id,
    companyId: appt.companyId || '',
    userId: appt.userId || '',
    status: appt.status || 'draft',
    jobAddress: appt.jobAddress,
    jobCity: appt.jobCity,
    jobState: appt.jobState,
    jobZip: appt.jobZip,
    totalAmount: appt.totalAmount,
    customer: appt.customer || {},
    openings: openingsToSave,
    rawJson: JSON.stringify(mergedAppt),
    cachedAt: Date.now(),
    syncStatus: 'clean',
    version: appt.version || 1,
  });

  // Bulletproof Surface Pro Local File Backup
  if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFileLocally) {
    const customerName = appt.customer?.lastName || appt.customer?.firstName || 'Unknown';
    const filename = `Appointment_${customerName}_${appt.id}.json`;
    (window as any).electronAPI.saveFileLocally(filename, JSON.stringify(appt, null, 2));
  }
}

export async function getCachedAppointment(id: string): Promise<any | null> {
  const db = getOfflineDb();
  const cached = await db.appointments_cache.get(id);
  if (!cached) return null;
  try {
    return JSON.parse(cached.rawJson);
  } catch {
    return null;
  }
}

export async function getAllCachedAppointments(userId?: string, companyId?: string, limit = 150): Promise<any[]> {
  const db = getOfflineDb();
  let query = db.appointments_cache.orderBy('cachedAt').reverse();
    
  return await query
    .filter(a => {
      if (userId && a.userId !== userId) return false;
      if (companyId && a.companyId !== companyId) return false;
      return true;
    })
    .limit(limit)
    .toArray()
    .then(all => all.map(a => {
      try { return JSON.parse(a.rawJson); } catch { return null; }
    }).filter(Boolean));
}

// ── Global reconnect handler ──────────────────────────────────────────────────

let _reconnectBound = false;

export function bindReconnectDrain(): void {
  if (_reconnectBound || typeof window === 'undefined') return;
  _reconnectBound = true;

  window.addEventListener('online', async () => {
    emit({ status: 'syncing' });
    await drainWithPull();   // pull first, then drain outbox
    await drainPhotoQueue();
    await pruneOutbox();
  });

  window.addEventListener('offline', () => {
    emit({ status: 'offline' });
  });

  // Register Background Sync API if available (triggers sync when app comes back online)
  registerBackgroundSync();
}

/** Register the Background Sync API so the service worker can trigger sync even when the app tab is backgrounded. */
async function registerBackgroundSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (!('sync' in reg)) return;
    await (reg as any).sync.register('wwa-outbox-sync');
    // Also register periodic sync if supported (for periodic cache refresh)
    if ('periodicSync' in reg) {
      try {
        await (reg as any).periodicSync.register('wwa-periodic-sync', { minInterval: 15 * 60 * 1000 }); // 15 min
      } catch {
        // Periodic sync requires permission — silently ignore if denied
      }
    }
  } catch {
    // Background Sync not available — fallback is the online event listener above
  }
}

/** Get detailed sync progress for UI display. */
export async function getSyncProgress(): Promise<{
  outbox: { pending: number; syncing: number; failed: number; synced: number };
  photos: { queued: number; uploading: number; uploaded: number; failed: number; totalBytes: number };
  conflicts: number;
  lastSyncAt?: number;
}> {
  const db = getOfflineDb();
  const [pending, syncing, failed, synced] = await Promise.all([
    db.sync_outbox.where('status').equals('pending').count(),
    db.sync_outbox.where('status').equals('syncing').count(),
    db.sync_outbox.where('status').equals('failed').count(),
    db.sync_outbox.where('status').equals('synced').count(),
  ]);
  const [photoQueued, photoUploading, photoUploaded, photoFailed] = await Promise.all([
    db.photo_blob_queue.where('status').equals('queued').count(),
    db.photo_blob_queue.where('status').equals('uploading').count(),
    db.photo_blob_queue.where('status').equals('uploaded').count(),
    db.photo_blob_queue.where('status').equals('failed').count(),
  ]);
  const totalPhotoBytes = await db.photo_blob_queue
    .filter(p => p.status !== 'uploaded')
    .toArray()
    .then(photos => photos.reduce((sum, p) => sum + (p.sizeBytes || 0), 0));
  const conflicts = await db.sync_conflicts.filter(c => !c.resolution).count().catch(() => 0);

  return {
    outbox: { pending, syncing, failed, synced },
    photos: { queued: photoQueued, uploading: photoUploading, uploaded: photoUploaded, failed: photoFailed, totalBytes: totalPhotoBytes },
    conflicts,
    lastSyncAt: _currentState.lastSyncAt,
  };
}
