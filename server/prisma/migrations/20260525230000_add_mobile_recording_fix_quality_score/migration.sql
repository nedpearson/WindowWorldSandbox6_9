-- Migration: Add MobileRecording system + fix AppointmentQualityScore columns
-- Applied: 2026-05-25

-- ─────────────────────────────────────────────────────────────
-- 1. AppointmentQualityScore — add columns used by mobile.ts quality-score route
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "AppointmentQualityScore"
  ADD COLUMN IF NOT EXISTS "installerClarityScore"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "measurementConfidenceScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pricingConfidenceScore"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "contractAccuracyScore"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sketchCompletenessScore"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "riskLevel"                  TEXT,
  ADD COLUMN IF NOT EXISTS "criticalIssueCount"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "warningCount"               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "computedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────
-- 2. MobileRecording — voice/audio recordings captured in field
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileRecording" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "appointmentId" TEXT,
  "openingId"     TEXT,
  "status"        TEXT NOT NULL DEFAULT 'saved',
  "syncStatus"    TEXT NOT NULL DEFAULT 'pending',
  "durationSecs"  DOUBLE PRECISION,
  "fileUrl"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileRecording_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MobileRecording_userId_idx"        ON "MobileRecording"("userId");
CREATE INDEX IF NOT EXISTS "MobileRecording_appointmentId_idx" ON "MobileRecording"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecording_openingId_idx"     ON "MobileRecording"("openingId");

-- ─────────────────────────────────────────────────────────────
-- 3. MobileRecordingTranscript — per-recording transcription segments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileRecordingTranscript" (
  "id"          TEXT NOT NULL,
  "recordingId" TEXT NOT NULL,
  "text"        TEXT NOT NULL,
  "confidence"  DOUBLE PRECISION,
  "startMs"     INTEGER,
  "endMs"       INTEGER,
  "speaker"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileRecordingTranscript_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobileRecordingTranscript_recordingId_fkey"
    FOREIGN KEY ("recordingId") REFERENCES "MobileRecording"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MobileRecordingTranscript_recordingId_idx" ON "MobileRecordingTranscript"("recordingId");

-- ─────────────────────────────────────────────────────────────
-- 4. MobileRecordingFieldExtraction — AI-extracted field values for review
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileRecordingFieldExtraction" (
  "id"              TEXT NOT NULL,
  "recordingId"     TEXT NOT NULL,
  "appointmentId"   TEXT,
  "openingNumber"   INTEGER,
  "targetTable"     TEXT NOT NULL,
  "targetField"     TEXT NOT NULL,
  "rawValue"        TEXT,
  "normalizedValue" TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "appliedBy"       TEXT,
  "approvedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileRecordingFieldExtraction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobileRecordingFieldExtraction_recordingId_fkey"
    FOREIGN KEY ("recordingId") REFERENCES "MobileRecording"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_recordingId_idx"   ON "MobileRecordingFieldExtraction"("recordingId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_appointmentId_idx" ON "MobileRecordingFieldExtraction"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_status_idx"        ON "MobileRecordingFieldExtraction"("status");
