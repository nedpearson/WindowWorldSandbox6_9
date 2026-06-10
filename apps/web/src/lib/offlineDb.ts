// ─────────────────────────────────────────────────────────────────────────────
// offlineDb.ts — Dexie IndexedDB schema for offline-first field app
//
// This is the single source of truth for ALL offline storage on iPad, iPhone,
// Surface Pro browser/PWA, and desktop browser.
//
// DB version history:
//   v1 — initial schema (2026-05-30): 7 stores
//   v2 — offline-first expansion (2026-05-31):
//          + customers_cache
//          + id_mapping (localId → cloudId)
//          + sketches_cache
//          + audit_trail
//          + offline_signatures
//          New compound indexes on sync_outbox and sync_conflicts
//   v3 — Bluetooth laser measurement (2026-05-31):
//          + laser_captures (offline Bluetooth/manual measurement capture queue)
//   v4 — Multi-point measurement sessions (2026-05-31):
//          + measurement_sessions (offline multi-point session records)
//          Extended laser_captures index with measurementAxis + measurementPoint
//
// SECURITY:
//   - No Supabase service role key or secrets are stored here.
//   - Photo blobs are stored as Blob objects (not base64 strings) to stay
//     within IndexedDB quota limits and avoid bloating other storage.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table } from 'dexie';

// ── Appointment cache ────────────────────────────────────────────────────────

export interface CachedAppointment {
  id: string;                    // cloud appointment ID (or localId while offline)
  companyId: string;
  userId: string;
  status: string;
  jobAddress?: string;
  jobCity?: string;
  jobState?: string;
  jobZip?: string;
  totalAmount?: number;
  customer: Record<string, any>; // full Customer object
  openings: Record<string, any>[]; // full Opening[] array
  rawJson: string;               // full JSON snapshot for hydration
  cachedAt: number;              // Date.now()
  syncStatus: SyncStatus;
  version: number;               // cloud record version for conflict detection
}

// ── Customer cache ───────────────────────────────────────────────────────────

export interface CachedCustomer {
  id: string;                    // cloud customer ID (or localId while offline)
  companyId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  rawJson: string;               // full Customer JSON snapshot
  cachedAt: number;
  syncStatus: SyncStatus;
  version: number;
}

// ── Sketch cache ─────────────────────────────────────────────────────────────

export interface CachedSketch {
  id: string;                    // cloud HouseMap / sketch ID
  appointmentId: string;
  rawJson: string;               // full sketch + markers JSON snapshot
  cachedAt: number;
  syncStatus: SyncStatus;
}

// ── Local ID → Cloud ID mapping ──────────────────────────────────────────────
// After a record created offline is synced to the server, we record the
// mapping here so any subsequent session can resolve the cloud ID without
// needing the outbox item.

export interface IdMapping {
  id?: number;
  entityType: EntityType;
  localId: string;               // local_customer_xxx etc.
  cloudId: string;               // server-assigned cuid
  syncedAt: number;
  companyId?: string;
  userId?: string;
}

// ── Offline signature queue ──────────────────────────────────────────────────
// Field reps can capture a signature while offline. The signature SVG/PNG
// and contract draft are stored here and uploaded on reconnect.

export interface OfflineSignature {
  id?: number;
  localId: string;               // local_sig_xxx
  appointmentId: string;         // cloud or local appointment ID
  signatureDataUrl: string;      // data:image/png;base64,...
  signerName: string;
  signerRole: 'customer' | 'rep' | 'manager';
  contractDraftJson?: string;    // snapshot of contract at time of signing
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: number;
  uploadedAt?: number;
  cloudSignatureId?: string;
}

// ── Audit trail (local) ─────────────────────────────────────────────────────
// Lightweight local log of field-critical user actions.
// Not the same as the server AuditLog — this is for crash recovery only
// and is pruned after 7 days.

export interface AuditTrailEntry {
  id?: number;
  entityType: EntityType;
  entityLocalId: string;
  entityCloudId?: string;
  action: string;                // 'created_offline' | 'updated_offline' | 'synced' | 'conflict' etc.
  details?: string;              // JSON-stringified extra context
  createdAt: number;
}

// ── Sync outbox ──────────────────────────────────────────────────────────────

export type SyncStatus =
  | 'clean'
  | 'dirty'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict';

export type EntityType =
  | 'appointment'
  | 'customer'
  | 'opening'
  | 'measurement'
  | 'laser_capture'
  | 'measurement_session'
  | 'sketch'
  | 'sketch_marker'
  | 'note'
  | 'photo'
  | 'signature'
  | 'follow_up'
  | 'review_action'
  | 'document_generation'
  | 'training_progress'
  | 'field_finding'  // v5: Field Intelligence cache
  | 'quote_group'    // v6: Quote Groups
  | 'quote_group_opening'
  | 'combined_quote'
  | 'combined_quote_group'
  | 'sketch_annotation'; // v9: Sketch Annotations


export type OutboxOperation = 'create' | 'update' | 'delete' | 'upload_file' | 'generate_document';

export type Platform = 'desktop' | 'ipad' | 'iphone' | 'android' | 'web';

export interface OutboxItem {
  id?: number;                   // auto-increment IDB key
  companyId: string;
  userId: string;
  deviceId: string;
  platform: Platform;
  entityType: EntityType;
  entityLocalId: string;         // localId (may equal cloudId for updates)
  entityCloudId?: string;        // null for offline-created records
  appointmentId?: string;        // parent appointment (local or cloud)
  operation: OutboxOperation;
  payloadJson: string;           // JSON.stringify of the payload
  dependsOn?: string;            // entityLocalId this must wait for (parent sync)
  idempotencyKey: string;        // companyId:deviceId:entityType:localId:operation
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;          // Date.now() + backoff delay
  createdAt: number;
  updatedAt: number;
}

// ── Conflict records ─────────────────────────────────────────────────────────

export interface ConflictRecord {
  id?: number;
  entityType: EntityType;
  entityLocalId: string;
  entityCloudId?: string;
  appointmentId?: string;
  fieldName?: string;
  localValue: string;            // JSON stringified
  cloudValue: string;            // JSON stringified
  localUpdatedAt: number;
  cloudUpdatedAt: number;
  resolution?: 'keep_local' | 'keep_cloud' | 'manual' | 'escalated';
  resolvedAt?: number;
  resolvedBy?: string;
  createdAt: number;
}

// ── Pricing cache ─────────────────────────────────────────────────────────────

export interface PricingCacheEntry {
  id?: number;
  cacheType: 'pricing_version' | 'pricing_items' | 'measurement_rules' | 'finance_options' | 'business_rules';
  versionId?: string;
  dataJson: string;              // JSON.stringify of the full response
  fetchedAt: number;
  expiresAt: number;
}

// ── Photo blob queue ─────────────────────────────────────────────────────────
// Photos are stored as Blob objects (never base64 in a plain DB field).
// The blob is binary-stored by Dexie/IndexedDB efficiently.

export interface PhotoBlobQueueItem {
  id?: number;
  localId: string;
  appointmentId: string;
  openingId?: string;
  photoType: string;
  blob: Blob;                    // actual photo blob — stored in IDB binary
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileHash?: string;             // SHA-256 hex — for deduplication
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  cloudUrl?: string;
  supabasePath?: string;         // path in Supabase Storage bucket
  retryCount: number;
  lastError?: string;
  createdAt: number;
  uploadedAt?: number;
}

// ── Offline laser measurement capture ────────────────────────────────────────
// Laser captures (Bluetooth or manual) are stored offline here and synced
// when connectivity returns via the sync_outbox queue.

export interface CachedLaserCapture {
  id?: number;
  localId: string;            // idempotency key = companyId:deviceId:laser_capture:localId:create
  appointmentId: string;
  openingId?: string;
  assignedField: string;      // 'width' | 'height' | etc.
  // Multi-point fields (v4)
  measurementAxis?: string;   // 'width' | 'height' | 'depth' | 'diagonal'
  measurementPoint?: string;  // 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right'
  accepted?: boolean;
  ignored?: boolean;
  ignoreReason?: string;
  pointNotes?: string;
  rawValueText: string;
  rawUnit: string;
  normalizedInches: number;
  normalizedFractionText: string;
  adjustedOrderInches?: number;
  adjustedOrderFractionText?: string;
  deductionInches?: number;
  ruleApplied?: string;
  captureMode: string;        // 'manual' | 'bluetooth_ble' | 'measureon_import'
  deviceModel?: string;
  deviceName?: string;
  confidence: number;
  isSuspicious: boolean;
  suspicionReasons: string[];
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  cloudId?: string;           // server-assigned ID after sync
  capturedAt: number;         // Date.now()
  syncedAt?: number;
}

// ── Multi-point measurement session (v4) ─────────────────────────────────────
// One record per multi-point session per opening. Stores all 6 raw capture
// values, the computed smallest-opening selection, the deduction result,
// and obstruction/override state. Queued for sync to POST /api/measurements/multi-point.

export interface CachedMeasurementSession {
  id?: number;
  localId: string;                // client-generated idempotency key
  cloudId?: string;               // server-assigned adjustmentId after sync
  appointmentId: string;
  openingId?: string;
  openingLocalId?: string;        // if opening was created offline
  // Raw captures per axis/point
  widthTop?: number | null;
  widthMiddle?: number | null;
  widthBottom?: number | null;
  heightLeft?: number | null;
  heightCenter?: number | null;
  heightRight?: number | null;
  // Computed session results
  smallestWidthPoint?: string | null;   // 'widthTop' | 'widthMiddle' | 'widthBottom'
  smallestHeightPoint?: string | null;  // 'heightLeft' | 'heightCenter' | 'heightRight'
  rawWidth?: number | null;             // smallest raw width
  rawHeight?: number | null;            // smallest raw height
  adjWidth?: number | null;             // final adjusted width (after deduction)
  adjHeight?: number | null;            // final adjusted height (after deduction)
  widthTakeoff: number;                 // deduction amount
  heightTakeoff: number;
  ruleId?: string;
  ruleName?: string;
  sizingMethod: 'smallest_opening' | 'manual_override';
  widthVarianceInches?: number | null;
  heightVarianceInches?: number | null;
  widthNeedsReview: boolean;
  heightNeedsReview: boolean;
  obstructionDetected: boolean;
  obstructionType?: string | null;
  obstructionNotes?: string;
  manualOverride: boolean;
  overrideReason?: string;
  idempotencyKey: string;
  savedAt: number;              // Date.now()
  synced: boolean;
  syncedAt?: number;
}

export interface ManualCacheEntry {
  id?: number;
  cacheType: 'article' | 'category' | 'training_path' | 'training_lesson' | 'training_asset';
  entityId: string;              // cloud ID of the article/lesson
  dataJson: string;              // full object JSON
  requiresInternet?: boolean;    // true for YouTube video items
  fetchedAt: number;
  expiresAt: number;
}

// ── Field Intelligence finding cache (v5) ─────────────────────────────────────
// Caches advisory findings generated by the Field Intelligence Engine.
// Findings are advisory only — they never modify source-of-truth data.
// Findings survive app close/reopen and sync to server on reconnect.

export interface CachedFieldFinding {
  id: string;                    // stable hash: mqa/pqa/sqa:appointmentId:openingId:title
  severity: 'info' | 'warning' | 'blocking';
  category: string;
  source: string;
  appointmentId: string;
  openingId?: string;
  openingNumber?: number;
  title: string;
  message: string;
  suggestedAction?: string;
  requiresApproval: boolean;
  confidence?: number;
  status: 'open' | 'applied' | 'ignored' | 'reviewed' | 'manager_review';
  createdAt: number;
  cachedAt: number;              // when this was last written to IDB
  metadataJson?: Record<string, unknown>;
  resolvedAt?: number;
  overrideReason?: string;
}


// ── AI Inferences (v8) ────────────────────────────────────────────────────────
export interface CachedAiInference {
  id: string;                    // appointmentId:agentType
  appointmentId: string;
  agentType: string;
  inferredDataJson: string;
  confidenceScore: number;
  acceptedByUser: boolean;
  createdAt: number;
}

export interface CachedAiConfidenceLog {
  id?: number;
  appointmentId: string;
  openingId: string;
  field: string;
  confidenceScore: number;
  anomalyDetected: boolean;
  createdAt: number;
}

export interface CachedPhotoAnalysisResult {
  id: string;                    // photoId
  appointmentId: string;
  photoId: string;
  recognizedMaterialsJson: string;
  safetyHazardsJson: string;
  createdAt: number;
}

// ── Photo Analysis Records (v12) ─────────────────────────────────────────────
// Stores full photo capture, tags, and AI recommendations for the sketch marker
// migrated from localStorage to support 50+ photos offline without quota limits.
export interface CachedPhotoAnalysisRecord {
  id: string;
  appointmentId: string;
  markerId: string;
  openingNumber: number | null;
  photoDataUrl?: string; // base64 thumbnail (legacy/primary)
  photoDataUrls?: string[]; // base64 thumbnails (multiple photos)
  featureTagsJson: string; // JSON.stringify(PhotoFeatureTags)
  recommendationJson: string; // JSON.stringify(PhotoRecommendation) | null
  createdAt: number;
  updatedAt: number;
}

// ── Device meta ───────────────────────────────────────────────────────────────

export interface DeviceMeta {
  id?: number;
  deviceId: string;
  platform: Platform;
  companyId?: string;
  userId?: string;
  lastSyncAt?: number;
  lastPullAt?: number;
  offlineReadyAt?: number;       // timestamp when full cache warm completed
  offlineReadyStatus?: 'not_ready' | 'warming' | 'ready' | 'ready_with_warnings' | 'failed';
  registeredAt: number;
}

// ── Migrations ────────────────────────────────────────────────────────────────

export interface LocalDbMigration {
  id?: number;
  version: number;
  migratedAt: number;
  success: boolean;
  error?: string;
}

// ── Dexie DB class ────────────────────────────────────────────────────────────

export class WwaOfflineDb extends Dexie {
  // v1 stores
  appointments_cache!: Table<CachedAppointment>;
  sync_outbox!: Table<OutboxItem>;
  sync_conflicts!: Table<ConflictRecord>;
  pricing_cache!: Table<PricingCacheEntry>;
  photo_blob_queue!: Table<PhotoBlobQueueItem>;
  field_manual_cache!: Table<ManualCacheEntry>;
  device_meta!: Table<DeviceMeta>;

  // v2 stores
  customers_cache!: Table<CachedCustomer>;
  id_mapping!: Table<IdMapping>;
  sketches_cache!: Table<CachedSketch>;
  audit_trail!: Table<AuditTrailEntry>;
  offline_signatures!: Table<OfflineSignature>;

  // v3 stores
  laser_captures!: Table<CachedLaserCapture>;

  // v4 stores
  measurement_sessions!: Table<CachedMeasurementSession>;

  // v5 stores
  field_intelligence_cache!: Table<CachedFieldFinding>;

  // v6 stores
  quote_groups!: Table<CachedQuoteGroup>;
  quote_group_openings!: Table<CachedQuoteGroupOpening>;
  combined_quotes!: Table<CachedCombinedQuote>;
  combined_quote_groups!: Table<CachedCombinedQuoteGroup>;

  // v7 stores
  local_db_migrations!: Table<LocalDbMigration>;

  // v8 stores (Synthetic AI Layer)
  ai_inferences!: Table<CachedAiInference>;
  ai_confidence_logs!: Table<CachedAiConfidenceLog>;
  photo_analysis_results!: Table<CachedPhotoAnalysisResult>;

  // v9 stores
  sketch_annotations!: Table<any>;

  // v10 stores
  address_visuals_cache!: Table<any>;


  // v11 stores
  mull_groups!: Table<any>;
  finance_options!: Table<any>;
  selected_finance!: Table<any>;

  // v12 stores
  photo_analysis_records!: Table<CachedPhotoAnalysisRecord>;

  constructor() {
    super('wwa-offline-v1');

    // v1 — initial schema (DO NOT MODIFY — modifying breaks existing user data)
    this.version(1).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey',
      sync_conflicts: '++id, entityType, entityLocalId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt',
      device_meta: '++id, deviceId, companyId',
    });

    // v2 — offline-first expansion
    // Adds new stores; existing v1 stores get additional indexes.
    // Dexie safely merges — existing user data is preserved.
    this.version(2).stores({
      // Existing stores — add new compound indexes without breaking v1 data
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',

      // New v2 stores
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
    });

    // v3 — Bluetooth laser measurement offline capture queue
    // Only adds a new store — existing v1/v2 data is fully preserved.
    this.version(3).stores({
      // Forward-declare all v2 stores unchanged (required by Dexie for version upgrades)
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      // New in v3:
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField',
    });

    // v4 — Multi-point measurement sessions
    // Adds measurement_sessions store; extends laser_captures with point indexes.
    // Existing v1/v2/v3 data is fully preserved.
    this.version(4).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      // v3 stores (re-declare unchanged)
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField, measurementAxis, measurementPoint',
      // New in v4:
      measurement_sessions: '++id, localId, appointmentId, openingId, synced, savedAt',
    });

    // v5 — Field Intelligence findings cache
    // Adds field_intelligence_cache; all v1–v4 stores forward-declared unchanged.
    // Existing user data is fully preserved.
    this.version(5).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField, measurementAxis, measurementPoint',
      measurement_sessions: '++id, localId, appointmentId, openingId, synced, savedAt',
      // New in v5: Field Intelligence findings cache
      field_intelligence_cache: 'id, appointmentId, openingId, severity, status, createdAt, cachedAt',
    });

    // v6 — Quote Groups and Combined Quotes
    this.version(6).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField, measurementAxis, measurementPoint',
      measurement_sessions: '++id, localId, appointmentId, openingId, synced, savedAt',
      field_intelligence_cache: 'id, appointmentId, openingId, severity, status, createdAt, cachedAt',
      // New in v6:
      quote_groups: 'id, localId, appointmentId, syncStatus, createdAt',
      quote_group_openings: 'id, quoteGroupId, openingId, createdAt',
      combined_quotes: 'id, localId, appointmentId, syncStatus, createdAt',
      combined_quote_groups: 'id, combinedQuoteId, quoteGroupId, createdAt',
    });

    // v7 — Local migrations table
    this.version(7).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField, measurementAxis, measurementPoint',
      measurement_sessions: '++id, localId, appointmentId, openingId, synced, savedAt',
      field_intelligence_cache: 'id, appointmentId, openingId, severity, status, createdAt, cachedAt',
      quote_groups: 'id, localId, appointmentId, syncStatus, createdAt',
      quote_group_openings: 'id, quoteGroupId, openingId, createdAt',
      combined_quotes: 'id, localId, appointmentId, syncStatus, createdAt',
      combined_quote_groups: 'id, combinedQuoteId, quoteGroupId, createdAt',
      // New in v7
      local_db_migrations: '++id, version, migratedAt'
    });

    // v8 — Synthetic AI Layer
    this.version(8).stores({
      appointments_cache: 'id, companyId, userId, status, syncStatus, cachedAt, [companyId+userId]',
      sync_outbox: '++id, companyId, userId, entityType, entityLocalId, status, nextRetryAt, createdAt, idempotencyKey, [status+nextRetryAt]',
      sync_conflicts: '++id, entityType, entityLocalId, entityCloudId, resolution, createdAt',
      pricing_cache: '++id, cacheType, fetchedAt, expiresAt',
      photo_blob_queue: '++id, localId, appointmentId, status, createdAt, fileHash',
      field_manual_cache: '++id, cacheType, entityId, fetchedAt, expiresAt',
      device_meta: '++id, deviceId, companyId, userId',
      customers_cache: 'id, companyId, userId, syncStatus, cachedAt, [companyId+userId]',
      id_mapping: '++id, &[entityType+localId], cloudId, syncedAt, entityType',
      sketches_cache: 'id, appointmentId, cachedAt',
      audit_trail: '++id, entityType, entityLocalId, action, createdAt',
      offline_signatures: '++id, localId, appointmentId, status, createdAt',
      laser_captures: '++id, localId, appointmentId, openingId, status, capturedAt, assignedField, measurementAxis, measurementPoint',
      measurement_sessions: '++id, localId, appointmentId, openingId, synced, savedAt',
      field_intelligence_cache: 'id, appointmentId, openingId, severity, status, createdAt, cachedAt',
      quote_groups: 'id, localId, appointmentId, syncStatus, createdAt',
      quote_group_openings: 'id, quoteGroupId, openingId, createdAt',
      combined_quotes: 'id, localId, appointmentId, syncStatus, createdAt',
      combined_quote_groups: 'id, combinedQuoteId, quoteGroupId, createdAt',
      local_db_migrations: '++id, version, migratedAt',
      // New in v8
      ai_inferences: 'id, appointmentId, agentType',
      ai_confidence_logs: '++id, appointmentId, openingId, field',
      photo_analysis_results: 'id, appointmentId, photoId'
    });

    // v9 — Sketch Annotations
    this.version(9).stores({
      sketch_annotations: '++id, appointmentId, sketchId, markerId, type, syncStatus'
    });

    // v10 — Address Visuals
    this.version(10).stores({
      address_visuals_cache: 'appointmentId' // primary key is appointmentId since it's 1:1
    });

    // v11 - Mull Groups and Finance
    this.version(11).stores({
      mull_groups: 'mullGroupId, appointmentId, syncStatus',
      finance_options: 'id, code, active',
      selected_finance: 'appointmentId, selectedFinanceOptionId'
    });

    // v12 - Move PhotoAnalysisRecord to IndexedDB to avoid localStorage quota
    this.version(12).stores({
      photo_analysis_records: 'id, appointmentId, markerId, createdAt'
    });
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _db: WwaOfflineDb | null = null;

export function getOfflineDb(): WwaOfflineDb {
  if (!_db) {
    _db = new WwaOfflineDb();
    _db.on('ready', async () => {
      // Run local migrations if necessary
      await recordMigration(12);
    });
  }
  return _db;
}

async function recordMigration(version: number) {
  if (!_db) return;
  const existing = await _db.local_db_migrations.where('version').equals(version).first().catch(() => null);
  if (!existing) {
    // In a real app we'd trigger a backup here before destructive schema changes
    // await backupLocalData();
    await _db.local_db_migrations.add({ version, migratedAt: Date.now(), success: true }).catch(() => {});
  }
}

// ── Device ID generation ──────────────────────────────────────────────────────

const DEVICE_ID_KEY = 'wwa_device_id';

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Use crypto.randomUUID() when available (modern browsers + Electron)
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `dev_${crypto.randomUUID()}`
      : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function detectPlatformType(): Platform {
  if (typeof window === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/Electron/i.test(ua)) return 'desktop';
  if (/iPad/i.test(ua)) return 'ipad';
  if (/iPhone|iPod/i.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  // Surface Pro running Windows in tablet mode: Touch + Windows UA
  if (/Windows/i.test(ua) && navigator.maxTouchPoints > 1) return 'web'; // surface treated as web
  return 'web';
}

// ── Customer cache helpers ────────────────────────────────────────────────────

export async function cacheCustomer(customer: any): Promise<void> {
  const db = getOfflineDb();
  await db.customers_cache.put({
    id: customer.id,
    companyId: customer.companyId || '',
    userId: customer.userId || customer.createdBy || '',
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    rawJson: JSON.stringify(customer),
    cachedAt: Date.now(),
    syncStatus: 'clean',
    version: customer.version || 1,
  });
}

export async function getCachedCustomer(id: string): Promise<any | null> {
  const db = getOfflineDb();
  const cached = await db.customers_cache.get(id);
  if (!cached) return null;
  try { return JSON.parse(cached.rawJson); } catch { return null; }
}

export async function getAllCachedCustomers(): Promise<any[]> {
  const db = getOfflineDb();
  const all = await db.customers_cache.orderBy('cachedAt').reverse().toArray();
  return all.map(c => {
    try { return JSON.parse(c.rawJson); } catch { return null; }
  }).filter(Boolean);
}

// ── Sketch cache helpers ──────────────────────────────────────────────────────

export async function cacheSketch(sketch: any): Promise<void> {
  const db = getOfflineDb();
  await db.sketches_cache.put({
    id: sketch.id,
    appointmentId: sketch.appointmentId,
    rawJson: JSON.stringify(sketch),
    cachedAt: Date.now(),
    syncStatus: 'clean',
  });
}

export async function getCachedSketch(appointmentId: string): Promise<any | null> {
  const db = getOfflineDb();
  const cached = await db.sketches_cache
    .where('appointmentId').equals(appointmentId)
    .last();
  if (!cached) return null;
  try { return JSON.parse(cached.rawJson); } catch { return null; }
}

// ── ID mapping helpers ────────────────────────────────────────────────────────

export async function recordIdMapping(
  entityType: EntityType,
  localId: string,
  cloudId: string,
  companyId?: string,
  userId?: string
): Promise<void> {
  const db = getOfflineDb();
  // Upsert: delete existing entry for this localId+entityType, then add new
  await db.id_mapping
    .where('[entityType+localId]')
    .equals([entityType, localId])
    .delete();
  await db.id_mapping.add({
    entityType,
    localId,
    cloudId,
    syncedAt: Date.now(),
    companyId,
    userId,
  });
}

export async function resolveCloudId(entityType: EntityType, localId: string): Promise<string | null> {
  const db = getOfflineDb();
  const mapping = await db.id_mapping
    .where('[entityType+localId]')
    .equals([entityType, localId])
    .first();
  return mapping?.cloudId ?? null;
}

// ── Audit trail helper ────────────────────────────────────────────────────────

export async function appendAuditTrail(entry: Omit<AuditTrailEntry, 'id'>): Promise<void> {
  const db = getOfflineDb();
  await db.audit_trail.add(entry);
  // Prune entries older than 7 days to keep IDB lean
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await db.audit_trail.where('createdAt').below(cutoff).delete();
}

// ── User-scoped cache clear (called on logout) ────────────────────────────────
// Clears only THIS user's cached data. Does NOT delete unsynced outbox items
// (those are handled by drainOutbox before logout completes) and does NOT
// wipe another user's data on a shared device.

export async function clearUserCache(userId: string): Promise<void> {
  const db = getOfflineDb();
  await Promise.allSettled([
    db.appointments_cache.where('userId').equals(userId).delete(),
    db.customers_cache.where('userId').equals(userId).delete(),
    db.sketches_cache.toArray().then(items =>
      Promise.all(items.filter(s => {
        try { return JSON.parse(s.rawJson)?.userId === userId; } catch { return false; }
      }).map(s => db.sketches_cache.delete(s.id)))
    ),
    db.pricing_cache.clear(), // pricing is company-wide, safe to clear on logout
    db.field_manual_cache.clear(), // manual is company-wide, safe to clear on logout
    db.id_mapping.where('userId').equals(userId).delete(),
    db.audit_trail.where('entityLocalId').startsWith('local_').delete(),
    db.offline_signatures.where('status').anyOf(['pending', 'failed']).delete(),
    db.device_meta.where('userId').equals(userId).delete(),
    // Clear unsynced laser captures for this user (synced ones have cloudId set)
    db.laser_captures.where('status').anyOf(['pending', 'failed']).delete(),
  ]);
}

// ── Laser capture offline helpers ─────────────────────────────────────────────

/**
 * Save a laser/manual measurement capture offline.
 * Returns the local ID for use in the outbox item.
 */
export async function saveOfflineLaserCapture(
  capture: Omit<CachedLaserCapture, 'id' | 'status' | 'capturedAt'>
): Promise<number> {
  const db = getOfflineDb();
  return await db.laser_captures.add({
    ...capture,
    status: 'pending',
    capturedAt: Date.now(),
  });
}

/**
 * Get all pending laser captures for an appointment (for optimistic UI).
 */
export async function getPendingLaserCaptures(
  appointmentId: string
): Promise<CachedLaserCapture[]> {
  const db = getOfflineDb();
  return await db.laser_captures
    .where('appointmentId').equals(appointmentId)
    .filter(c => c.status === 'pending' || c.status === 'failed')
    .toArray();
}

/**
 * Mark a laser capture as synced (sets cloudId + status).
 */
export async function markLaserCaptureSynced(
  localId: string,
  cloudId: string
): Promise<void> {
  const db = getOfflineDb();
  const item = await db.laser_captures.where('localId').equals(localId).first();
  if (item?.id !== undefined) {
    await db.laser_captures.update(item.id, {
      status: 'synced',
      cloudId,
      syncedAt: Date.now(),
    });
  }
}

// ── Device meta helpers ───────────────────────────────────────────────────────

export async function updateDeviceMeta(partial: Partial<DeviceMeta> & { deviceId: string }): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.device_meta
    .where('deviceId').equals(partial.deviceId)
    .first();
  if (existing?.id !== undefined) {
    await db.device_meta.update(existing.id, partial);
  } else {
    await db.device_meta.add({
      platform: detectPlatformType(),
      registeredAt: Date.now(),
      ...partial,
    });
  }
}

export async function getDeviceMeta(deviceId: string): Promise<DeviceMeta | null> {
  const db = getOfflineDb();
  return await db.device_meta.where('deviceId').equals(deviceId).first() ?? null;
}

// ── Quota helper ──────────────────────────────────────────────────────────────

export async function checkStorageQuota(): Promise<{ usedMb: number; quotaMb: number; pct: number; isLow: boolean }> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return { usedMb: 0, quotaMb: 0, pct: 0, isLow: false };
  }
  try {
    const { usage = 0, quota = 1 } = await navigator.storage.estimate();
    const usedMb = Math.round(usage / 1024 / 1024);
    const quotaMb = Math.round(quota / 1024 / 1024);
    const pct = Math.round((usage / quota) * 100);
    return { usedMb, quotaMb, pct, isLow: pct > 80 };
  } catch {
    return { usedMb: 0, quotaMb: 0, pct: 0, isLow: false };
  }
}

// ── Multi-point measurement session helpers (v4) ──────────────────────────────

/**
 * Save a multi-point measurement session offline.
 * Replaces any existing session for the same localId (idempotent).
 */

// ── Local DB Backup ───────────────────────────────────────────────────────────

export async function backupLocalData(): Promise<boolean> {
  const db = getOfflineDb();
  try {
    const data: Record<string, any[]> = {};
    for (const table of db.tables) {
      // We skip photo_blob_queue because serializing Blobs to JSON is heavy
      if (table.name === 'photo_blob_queue') continue;
      data[table.name] = await table.toArray();
    }
    const jsonStr = JSON.stringify(data, null, 2);

    if (typeof window !== 'undefined' && (window as any).electronAPI?.backupLocalDb) {
      const res = await (window as any).electronAPI.backupLocalDb(jsonStr);
      if (res.success) {
        return true;
      }
    } else {
      // Browser fallback
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wwa_local_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error('Backup failed:', err);
  }
  return false;
}

export async function saveOfflineMeasurementSession(
  session: Omit<CachedMeasurementSession, 'id'>
): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.measurement_sessions
    .where('localId').equals(session.localId).first();
  if (existing?.id !== undefined) {
    await db.measurement_sessions.update(existing.id, { ...session, savedAt: Date.now() });
  } else {
    await db.measurement_sessions.add({ ...session, savedAt: Date.now() });
  }
}

/**
 * Get all pending (unsynced) measurement sessions.
 */
export async function getPendingMeasurementSessions(): Promise<CachedMeasurementSession[]> {
  const db = getOfflineDb();
  return db.measurement_sessions.where('synced').equals(0).toArray();
}

/**
 * Mark a measurement session as synced once the server confirms it.
 */
export async function markMeasurementSessionSynced(
  localId: string,
  cloudId: string
): Promise<void> {
  const db = getOfflineDb();
  const item = await db.measurement_sessions.where('localId').equals(localId).first();
  if (item?.id !== undefined) {
    await db.measurement_sessions.update(item.id, {
      synced: true,
      cloudId,
      syncedAt: Date.now(),
    });
  }
}

// -- Quote Groups & Combined Quotes (v6) --------------------------------------

export interface CachedQuoteGroup {
  id: string;
  localId?: string;
  appointmentId: string;
  customerId?: string;
  name: string;
  description?: string;
  status: string;
  sortOrder: number;
  isWholeJob: boolean;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  pricingStatus: string;
  syncStatus: SyncStatus;
  deletedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CachedQuoteGroupOpening {
  id: string;
  quoteGroupId: string;
  openingId: string;
  markerId?: string;
  openingNumberSnapshot?: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CachedCombinedQuote {
  id: string;
  localId?: string;
  appointmentId: string;
  customerId?: string;
  name: string;
  description?: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  pricingStatus: string;
  useForContract: boolean;
  syncStatus: SyncStatus;
  deletedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CachedCombinedQuoteGroup {
  id: string;
  combinedQuoteId: string;
  quoteGroupId: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

// -- Quote Group helpers --------------------------------------------------------

export async function markQuoteGroupsStaleByOpening(openingIdOrNumber: string | number): Promise<void> {
  try {
    const db = getOfflineDb();
    let targetOpeningId = String(openingIdOrNumber);

    // If a number was passed, find the corresponding local_opening_... or cloud ID
    // We'll search quote_group_openings by openingId (which could be the local ID)
    if (typeof openingIdOrNumber === 'number') {
      const qgoMatches = await db.quote_group_openings.filter(q => q.openingNumberSnapshot === openingIdOrNumber).toArray();
      if (qgoMatches.length > 0) {
        // Mark their parent quote groups as needs_review
        const groupIds = Array.from(new Set(qgoMatches.map(q => q.quoteGroupId)));
        for (const gid of groupIds) {
          await db.quote_groups.update(gid, { pricingStatus: 'needs_review', syncStatus: 'pending' });
        }
      }
      return;
    }

    // By ID
    const qgoMatches = await db.quote_group_openings.where('openingId').equals(targetOpeningId).toArray();
    const groupIds = Array.from(new Set(qgoMatches.map(q => q.quoteGroupId)));
    for (const gid of groupIds) {
      await db.quote_groups.update(gid, { pricingStatus: 'needs_review', syncStatus: 'pending' });
    }
  } catch (err) {
    console.error('[offlineDb] Failed to purge sync records:', err);
  }
}

// ── Address Visuals Cache ───────────────────────────────────────────────────
export async function cacheAddressVisuals(visuals: any): Promise<void> {
  const db = getOfflineDb();
  await db.address_visuals_cache.put(visuals);
}

export async function getCachedAddressVisuals(appointmentId: string): Promise<any | null> {
  const db = getOfflineDb();
  return await db.address_visuals_cache.get(appointmentId) || null;
}
