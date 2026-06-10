-- ════════════════════════════════════════════════════════════════
-- Property Vision / Quick Quote Vision System
-- New tables for: PropertyVisionProfile, PropertyVisualSource,
-- WindowVisionSuggestion, QuickQuoteVisionSession
-- Run in Supabase SQL Editor → New Query
-- ════════════════════════════════════════════════════════════════

-- 1. PropertyVisionProfile
CREATE TABLE IF NOT EXISTS "PropertyVisionProfile" (
  "id"                TEXT NOT NULL,
  "companyId"         TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "customerId"        TEXT,
  "appointmentId"     TEXT,
  "address"           TEXT NOT NULL,
  "formattedAddress"  TEXT NOT NULL,
  "lat"               DOUBLE PRECISION NOT NULL,
  "lng"               DOUBLE PRECISION NOT NULL,
  "locationType"      TEXT,
  "confidence"        TEXT DEFAULT 'unknown',
  "availableViewsJson" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PropertyVisionProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PropertyVisionProfile_companyId_idx"    ON "PropertyVisionProfile"("companyId");
CREATE INDEX IF NOT EXISTS "PropertyVisionProfile_userId_idx"       ON "PropertyVisionProfile"("userId");
CREATE INDEX IF NOT EXISTS "PropertyVisionProfile_customerId_idx"   ON "PropertyVisionProfile"("customerId");
CREATE INDEX IF NOT EXISTS "PropertyVisionProfile_appointmentId_idx" ON "PropertyVisionProfile"("appointmentId");

-- 2. PropertyVisualSource
CREATE TABLE IF NOT EXISTS "PropertyVisualSource" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "profileId"    TEXT NOT NULL,
  "sourceType"   TEXT NOT NULL,
  "heading"      DOUBLE PRECISION,
  "pitch"        DOUBLE PRECISION,
  "fov"          DOUBLE PRECISION,
  "imageDate"    TEXT,
  "imageHash"    TEXT,
  "metadataJson" TEXT,
  "available"    BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PropertyVisualSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PropertyVisualSource_companyId_idx" ON "PropertyVisualSource"("companyId");
CREATE INDEX IF NOT EXISTS "PropertyVisualSource_profileId_idx" ON "PropertyVisualSource"("profileId");

ALTER TABLE "PropertyVisualSource"
  ADD CONSTRAINT "PropertyVisualSource_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "PropertyVisionProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. WindowVisionSuggestion
CREATE TABLE IF NOT EXISTS "WindowVisionSuggestion" (
  "id"             TEXT NOT NULL,
  "companyId"      TEXT NOT NULL,
  "profileId"      TEXT NOT NULL,
  "visualSourceId" TEXT,
  "label"          TEXT NOT NULL,
  "elevation"      TEXT NOT NULL,
  "suggestedType"  TEXT NOT NULL,
  "confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "bboxJson"       TEXT,
  "status"         TEXT NOT NULL DEFAULT 'suggested',
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WindowVisionSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WindowVisionSuggestion_companyId_idx" ON "WindowVisionSuggestion"("companyId");
CREATE INDEX IF NOT EXISTS "WindowVisionSuggestion_profileId_idx" ON "WindowVisionSuggestion"("profileId");
CREATE INDEX IF NOT EXISTS "WindowVisionSuggestion_status_idx"    ON "WindowVisionSuggestion"("status");

ALTER TABLE "WindowVisionSuggestion"
  ADD CONSTRAINT "WindowVisionSuggestion_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "PropertyVisionProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. QuickQuoteVisionSession
CREATE TABLE IF NOT EXISTS "QuickQuoteVisionSession" (
  "id"              TEXT NOT NULL,
  "companyId"       TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "profileId"       TEXT NOT NULL,
  "broadQuoteId"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "assumptionsJson" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuickQuoteVisionSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuickQuoteVisionSession_companyId_idx" ON "QuickQuoteVisionSession"("companyId");
CREATE INDEX IF NOT EXISTS "QuickQuoteVisionSession_userId_idx"    ON "QuickQuoteVisionSession"("userId");
CREATE INDEX IF NOT EXISTS "QuickQuoteVisionSession_profileId_idx" ON "QuickQuoteVisionSession"("profileId");

ALTER TABLE "QuickQuoteVisionSession"
  ADD CONSTRAINT "QuickQuoteVisionSession_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "PropertyVisionProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ════════════════════════════════════════════════════════════════
-- RLS Policies — company-scoped, service role backend only
-- ════════════════════════════════════════════════════════════════

ALTER TABLE "PropertyVisionProfile"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyVisualSource"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WindowVisionSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuickQuoteVisionSession" ENABLE ROW LEVEL SECURITY;

-- Backend service role bypasses RLS automatically.
-- No direct client access; all writes go through authenticated Express API.
-- No public SELECT/INSERT/UPDATE/DELETE policies needed.

-- ════════════════════════════════════════════════════════════════
-- Mark migration as applied in _prisma_migrations table
-- ════════════════════════════════════════════════════════════════
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name",
  "logs", "rolled_back_at", "started_at", "applied_steps_count"
) VALUES (
  gen_random_uuid()::text,
  'property_vision_manual',
  NOW(),
  '20260523120000_property_vision',
  NULL,
  NULL,
  NOW(),
  1
) ON CONFLICT DO NOTHING;
