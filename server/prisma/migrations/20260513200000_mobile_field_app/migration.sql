-- ══════════════════════════════════════════════════════════
-- MOBILE FIELD APP — FULL SUPABASE MIGRATION
-- Extends existing schema with mobile/voice/AI/sync tables
-- ══════════════════════════════════════════════════════════

-- ─── Mobile Devices ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileDevice" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,  -- ios | android | web
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileDevice_userId_idx" ON "MobileDevice"("userId");

-- ─── Mobile Sessions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "appointmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',  -- pending | synced | conflict
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileSession_userId_idx" ON "MobileSession"("userId");
CREATE INDEX IF NOT EXISTS "MobileSession_appointmentId_idx" ON "MobileSession"("appointmentId");

-- ─── Mobile Recordings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileRecording" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "deviceId" TEXT,
    "audioUrl" TEXT,
    "durationSeconds" FLOAT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT DEFAULT 'audio/webm',
    "status" TEXT NOT NULL DEFAULT 'saved',
    -- recording | saved | transcribing | extracting_fields | needs_review | applied_to_form | failed
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecording_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileRecording_appointmentId_idx" ON "MobileRecording"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecording_userId_idx" ON "MobileRecording"("userId");
CREATE INDEX IF NOT EXISTS "MobileRecording_status_idx" ON "MobileRecording"("status");

-- ─── Mobile Recording Transcripts ────────────────────────
CREATE TABLE IF NOT EXISTS "MobileRecordingTranscript" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "recordingId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "cleanedText" TEXT,
    "confidence" FLOAT NOT NULL DEFAULT 0,
    "provider" TEXT,  -- web_speech | whisper | google
    "languageCode" TEXT DEFAULT 'en-US',
    "processingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecordingTranscript_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MobileRecordingTranscript_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "MobileRecording"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "MobileRecordingTranscript_recordingId_idx" ON "MobileRecordingTranscript"("recordingId");

-- ─── Mobile Recording Field Extractions ──────────────────
CREATE TABLE IF NOT EXISTS "MobileRecordingFieldExtraction" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "recordingId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'recording',  -- recording | typed_note | manual
    "sourceText" TEXT,
    "targetTable" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "originalValue" TEXT,
    "normalizedValue" TEXT,
    "confidenceScore" FLOAT NOT NULL DEFAULT 0,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | applied | conflict
    "appliedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "openingNumber" INTEGER,
    "pricingImpact" BOOLEAN NOT NULL DEFAULT false,
    "pricingImpactNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecordingFieldExtraction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MobileRecordingFieldExtraction_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "MobileRecording"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_recordingId_idx" ON "MobileRecordingFieldExtraction"("recordingId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_appointmentId_idx" ON "MobileRecordingFieldExtraction"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_status_idx" ON "MobileRecordingFieldExtraction"("status");

-- ─── Mobile Text Notes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileTextNote" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "deviceId" TEXT,
    "noteText" TEXT NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    -- pending | extracting | needs_review | applied | saved_as_note
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileTextNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileTextNote_appointmentId_idx" ON "MobileTextNote"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileTextNote_userId_idx" ON "MobileTextNote"("userId");

-- ─── Mobile Text Note Extractions ────────────────────────
CREATE TABLE IF NOT EXISTS "MobileTextNoteExtraction" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "noteId" TEXT NOT NULL,
    "sourceText" TEXT,
    "targetTable" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "originalValue" TEXT,
    "normalizedValue" TEXT,
    "confidenceScore" FLOAT NOT NULL DEFAULT 0,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "openingNumber" INTEGER,
    "pricingImpact" BOOLEAN NOT NULL DEFAULT false,
    "appliedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileTextNoteExtraction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MobileTextNoteExtraction_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "MobileTextNote"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "MobileTextNoteExtraction_noteId_idx" ON "MobileTextNoteExtraction"("noteId");

-- ─── Mobile Sync Queue ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileSyncQueue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "appointmentId" TEXT,
    "entityType" TEXT NOT NULL,   -- opening | appointment | note | recording | sketch
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,    -- create | update | delete
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',  -- pending | syncing | synced | failed | conflict
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    CONSTRAINT "MobileSyncQueue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_userId_status_idx" ON "MobileSyncQueue"("userId", "status");
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_appointmentId_idx" ON "MobileSyncQueue"("appointmentId");

-- ─── Mobile Conflicts ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileConflict" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "localValue" TEXT,
    "remoteValue" TEXT,
    "resolution" TEXT,  -- local | remote | manual
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',  -- open | resolved
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileConflict_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileConflict_appointmentId_idx" ON "MobileConflict"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileConflict_status_idx" ON "MobileConflict"("status");

-- ─── Mobile Offline Drafts ───────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileOfflineDraft" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "appointmentId" TEXT,
    "draftType" TEXT NOT NULL,  -- opening | note | sketch | form
    "draftData" JSONB NOT NULL DEFAULT '{}',
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileOfflineDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_userId_idx" ON "MobileOfflineDraft"("userId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_appointmentId_idx" ON "MobileOfflineDraft"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_syncStatus_idx" ON "MobileOfflineDraft"("syncStatus");

-- ─── Mobile Edit History ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "MobileEditHistory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "sourceType" TEXT,  -- voice | typed_note | manual | sync
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileEditHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileEditHistory_appointmentId_idx" ON "MobileEditHistory"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileEditHistory_entityId_idx" ON "MobileEditHistory"("entityId");

-- ─── AI Field Suggestions ────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiFieldSuggestion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "sourceType" TEXT NOT NULL,  -- recording | note | sketch
    "sourceId" TEXT,
    "targetTable" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "suggestedValue" TEXT NOT NULL,
    "confidence" FLOAT NOT NULL DEFAULT 0,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | auto_applied
    "pricingImpact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiFieldSuggestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiFieldSuggestion_appointmentId_idx" ON "AiFieldSuggestion"("appointmentId");
CREATE INDEX IF NOT EXISTS "AiFieldSuggestion_status_idx" ON "AiFieldSuggestion"("status");

-- ─── AI Validation Warnings ──────────────────────────────
CREATE TABLE IF NOT EXISTS "AiValidationWarning" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "warningType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',  -- critical | warning | info
    "message" TEXT NOT NULL,
    "detail" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiValidationWarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiValidationWarning_appointmentId_idx" ON "AiValidationWarning"("appointmentId");
CREATE INDEX IF NOT EXISTS "AiValidationWarning_severity_idx" ON "AiValidationWarning"("severity");

-- ─── Appointment Quality Scores ──────────────────────────
CREATE TABLE IF NOT EXISTS "AppointmentQualityScore" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT NOT NULL,
    "overallScore" FLOAT NOT NULL DEFAULT 0,
    "installerClarityScore" FLOAT NOT NULL DEFAULT 0,
    "measurementConfidenceScore" FLOAT NOT NULL DEFAULT 0,
    "pricingConfidenceScore" FLOAT NOT NULL DEFAULT 0,
    "contractAccuracyScore" FLOAT NOT NULL DEFAULT 0,
    "sketchCompletenessScore" FLOAT NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'REVIEW',  -- PASS | REVIEW | HIGH_RISK
    "criticalIssueCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentQualityScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AppointmentQualityScore_appointmentId_idx" ON "AppointmentQualityScore"("appointmentId");

-- ─── Final Packet Checks ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "FinalPacketCheck" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "blockerLevel" TEXT NOT NULL DEFAULT 'warning',  -- critical | warning | info
    "message" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalPacketCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinalPacketCheck_appointmentId_idx" ON "FinalPacketCheck"("appointmentId");

-- ─── Voice Field Mappings (audit trail) ──────────────────
CREATE TABLE IF NOT EXISTS "VoiceFieldMapping" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "voiceSessionId" TEXT,
    "recordingId" TEXT,
    "appointmentId" TEXT,
    "openingNumber" INTEGER,
    "sourcePhrase" TEXT,
    "targetTable" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "mappedValue" TEXT NOT NULL,
    "confidenceScore" FLOAT NOT NULL DEFAULT 0,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceFieldMapping_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VoiceFieldMapping_appointmentId_idx" ON "VoiceFieldMapping"("appointmentId");
CREATE INDEX IF NOT EXISTS "VoiceFieldMapping_voiceSessionId_idx" ON "VoiceFieldMapping"("voiceSessionId");

-- ─── Add mobile-specific columns to Appointment ──────────
ALTER TABLE "Appointment"
    ADD COLUMN IF NOT EXISTS "mobileSyncStatus" TEXT DEFAULT 'synced',
    ADD COLUMN IF NOT EXISTS "lastMobileEditAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "mobileDeviceId" TEXT;

-- ─── Add mobile-specific columns to Opening ──────────────
ALTER TABLE "Opening"
    ADD COLUMN IF NOT EXISTS "mobileSyncStatus" TEXT DEFAULT 'synced',
    ADD COLUMN IF NOT EXISTS "lastMobileEditAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "mobileEnteredAt" TIMESTAMP(3);

-- ─── Indexes for common mobile queries ───────────────────
CREATE INDEX IF NOT EXISTS "Opening_mobileSyncStatus_idx" ON "Opening"("mobileSyncStatus");
CREATE INDEX IF NOT EXISTS "Appointment_mobileSyncStatus_idx" ON "Appointment"("mobileSyncStatus");
