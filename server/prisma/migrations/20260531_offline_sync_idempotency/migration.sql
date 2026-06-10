-- Migration: 20260531_offline_sync_idempotency
-- Adds offline-sync support fields to core models and creates
-- the SyncIdempotencyKey table to replace the fragile AuditLog
-- text-search approach for idempotency tracking.
--
-- All changes are additive (nullable columns / new table) — safe to
-- apply to a live production database without downtime.

-- ── Customer: offline sync fields ─────────────────────────────────────────────
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "localId"   TEXT,
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Customer_localId_idx"   ON "Customer"("localId");
CREATE INDEX IF NOT EXISTS "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- ── Appointment: offline sync fields ──────────────────────────────────────────
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "localId"   TEXT,
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Appointment_localId_idx"   ON "Appointment"("localId");
CREATE INDEX IF NOT EXISTS "Appointment_deletedAt_idx" ON "Appointment"("deletedAt");

-- ── Opening: offline sync fields ──────────────────────────────────────────────
ALTER TABLE "Opening"
  ADD COLUMN IF NOT EXISTS "localId"   TEXT,
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Opening_localId_idx"   ON "Opening"("localId");
CREATE INDEX IF NOT EXISTS "Opening_deletedAt_idx" ON "Opening"("deletedAt");

-- ── OpeningPhoto: dedup fields ────────────────────────────────────────────────
ALTER TABLE "OpeningPhoto"
  ADD COLUMN IF NOT EXISTS "fileHash"       TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- ── SyncIdempotencyKey: dedicated idempotency table ───────────────────────────
-- Replaces the AuditLog text-search approach (O(n) full scan → O(1) unique index)
CREATE TABLE IF NOT EXISTS "SyncIdempotencyKey" (
  "id"             TEXT NOT NULL,
  "companyId"      TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "deviceId"       TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "entityType"     TEXT NOT NULL,
  "operation"      TEXT NOT NULL,
  "entityLocalId"  TEXT,
  "entityCloudId"  TEXT,
  "responseJson"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SyncIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SyncIdempotencyKey_idempotencyKey_key"
  ON "SyncIdempotencyKey"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "SyncIdempotencyKey_companyId_userId_idx"
  ON "SyncIdempotencyKey"("companyId", "userId");

CREATE INDEX IF NOT EXISTS "SyncIdempotencyKey_expiresAt_idx"
  ON "SyncIdempotencyKey"("expiresAt");

CREATE INDEX IF NOT EXISTS "SyncIdempotencyKey_deviceId_idx"
  ON "SyncIdempotencyKey"("deviceId");
