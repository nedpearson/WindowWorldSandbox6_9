-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD ASSISTANT — MASTER SUPABASE MIGRATION
-- Run this in the Supabase SQL editor to bring all tables current.
-- Safe to run on a fresh or existing DB (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Generated: 2026-05-14
-- ═══════════════════════════════════════════════════════════════

-- ─── HELPER: update updated_at automatically ─────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ─── 1. FORM INSTANCE VALUES ─────────────────────────────────
-- Stores individual field values for each form instance
CREATE TABLE IF NOT EXISTS "form_instance_values" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_instance_id" TEXT NOT NULL,
  "field_key"       TEXT NOT NULL,
  "field_value"     TEXT,
  "source_type"     TEXT DEFAULT 'manual', -- manual | voice | ai | rule | wizard
  "source_phrase"   TEXT,
  "confidence"      NUMERIC(4,3),
  "opening_number"  INTEGER,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_fiv_form_instance" ON "form_instance_values"("form_instance_id");
CREATE INDEX IF NOT EXISTS "idx_fiv_field_key"     ON "form_instance_values"("field_key");

-- ─── 2. FORM EXPORTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "form_exports" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "form_instance_id" TEXT,
  "export_type"     TEXT NOT NULL, -- order_form | contract | proposal | combined
  "pdf_url"         TEXT,
  "storage_path"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending', -- pending | generating | complete | failed
  "export_version"  INTEGER DEFAULT 1,
  "exported_by"     TEXT,
  "exported_at"     TIMESTAMPTZ,
  "metadata"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_form_exports_appointment" ON "form_exports"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_form_exports_status"      ON "form_exports"("status");

-- ─── 3. FORM SIGNATURES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "form_signatures" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "form_instance_id" TEXT,
  "signer_name"     TEXT,
  "signer_role"     TEXT DEFAULT 'customer', -- customer | rep | witness
  "signature_data"  TEXT, -- base64 SVG/PNG
  "signature_type"  TEXT DEFAULT 'drawn', -- drawn | typed | qr_session
  "qr_session_id"   TEXT,
  "ip_address"      TEXT,
  "signed_at"       TIMESTAMPTZ DEFAULT NOW(),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_form_sigs_appointment" ON "form_signatures"("appointment_id");

-- ─── 4. EXPORT READINESS CHECKS ──────────────────────────────
CREATE TABLE IF NOT EXISTS "export_readiness_checks" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "check_type"      TEXT NOT NULL, -- safety_glazing | measurement | opening_count | sketch | pricing | signature
  "status"          TEXT NOT NULL DEFAULT 'pending', -- pending | pass | warn | blocked
  "blockers"        JSONB DEFAULT '[]',
  "warnings"        JSONB DEFAULT '[]',
  "checked_at"      TIMESTAMPTZ DEFAULT NOW(),
  "resolved_at"     TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_export_checks_appointment" ON "export_readiness_checks"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_export_checks_status"      ON "export_readiness_checks"("status");

-- ─── 5. EXPORT BLOCKERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "export_blockers" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "check_id"        UUID REFERENCES "export_readiness_checks"("id") ON DELETE CASCADE,
  "blocker_type"    TEXT NOT NULL,
  "message"         TEXT NOT NULL,
  "opening_number"  INTEGER,
  "severity"        TEXT NOT NULL DEFAULT 'blocker',
  "resolved"        BOOLEAN NOT NULL DEFAULT FALSE,
  "resolved_at"     TIMESTAMPTZ,
  "override_reason" TEXT,
  "overridden_by"   TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_blockers_appointment" ON "export_blockers"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_blockers_resolved"    ON "export_blockers"("resolved");

-- ─── 6. MOBILE SYNC QUEUE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mobile_sync_queue" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "device_id"       TEXT NOT NULL,
  "appointment_id"  TEXT,
  "entity_type"     TEXT NOT NULL, -- opening | customer | form | sketch | photo | note
  "entity_id"       TEXT,
  "operation"       TEXT NOT NULL, -- create | update | delete
  "payload"         JSONB NOT NULL,
  "sync_status"     TEXT NOT NULL DEFAULT 'pending', -- pending | syncing | synced | conflict | failed
  "retry_count"     INTEGER DEFAULT 0,
  "last_error"      TEXT,
  "synced_at"       TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_sync_queue_device"      ON "mobile_sync_queue"("device_id");
CREATE INDEX IF NOT EXISTS "idx_sync_queue_appointment" ON "mobile_sync_queue"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_sync_queue_status"      ON "mobile_sync_queue"("sync_status");

-- ─── 7. MOBILE OFFLINE DRAFTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS "mobile_offline_drafts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "device_id"       TEXT NOT NULL,
  "appointment_id"  TEXT,
  "draft_type"      TEXT NOT NULL, -- opening | form | note | measurement
  "draft_data"      JSONB NOT NULL,
  "sync_status"     TEXT NOT NULL DEFAULT 'local', -- local | uploading | synced | conflict
  "conflict_data"   JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_drafts_device"      ON "mobile_offline_drafts"("device_id");
CREATE INDEX IF NOT EXISTS "idx_drafts_appointment" ON "mobile_offline_drafts"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_drafts_status"      ON "mobile_offline_drafts"("sync_status");

-- ─── 8. OPENING INSTALLATION NOTES ──────────────────────────
CREATE TABLE IF NOT EXISTS "opening_installation_notes" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "opening_id"      TEXT,
  "opening_number"  INTEGER,
  "note_type"       TEXT DEFAULT 'general', -- general | installer | estimator | office | bso | ladder | trim
  "note_text"       TEXT NOT NULL,
  "source_type"     TEXT DEFAULT 'manual', -- manual | voice | ai | rule
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_install_notes_appointment" ON "opening_installation_notes"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_install_notes_opening"     ON "opening_installation_notes"("opening_id");

-- ─── 9. AI FIELD SUGGESTIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_field_suggestions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "opening_number"  INTEGER,
  "field_key"       TEXT NOT NULL,
  "suggested_value" TEXT NOT NULL,
  "current_value"   TEXT,
  "confidence"      NUMERIC(4,3),
  "reason"          TEXT,
  "source_type"     TEXT DEFAULT 'ai', -- ai | voice | rule | photo
  "source_phrase"   TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | edited
  "accepted_at"     TIMESTAMPTZ,
  "rejected_at"     TIMESTAMPTZ,
  "override_reason" TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_appointment" ON "ai_field_suggestions"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_status"      ON "ai_field_suggestions"("status");

-- ─── 10. VOICE FIELD MAPPINGS ────────────────────────────────
CREATE TABLE IF NOT EXISTS "voice_field_mappings" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "voice_session_id" TEXT NOT NULL,
  "entity_id"       TEXT,
  "voice_session_entity_id" TEXT,
  "field_key"       TEXT NOT NULL,
  "field_value"     TEXT NOT NULL,
  "opening_number"  INTEGER,
  "confidence"      NUMERIC(4,3),
  "source_phrase"   TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  "applied_at"      TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_voice_mappings_session" ON "voice_field_mappings"("voice_session_id");
CREATE INDEX IF NOT EXISTS "idx_voice_mappings_status"  ON "voice_field_mappings"("status");

-- ─── 11. PRICING OVERRIDES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "pricing_overrides" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "opening_id"      TEXT,
  "opening_number"  INTEGER,
  "override_type"   TEXT NOT NULL, -- manual_price | adder | discount | note
  "label"           TEXT NOT NULL,
  "original_price"  NUMERIC(10,2),
  "override_price"  NUMERIC(10,2) NOT NULL,
  "reason"          TEXT NOT NULL,
  "approved_by"     TEXT,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_pricing_overrides_appointment" ON "pricing_overrides"("appointment_id");

-- ─── 12. QUOTE HEALTH CHECKS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "quote_health_checks" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "score"           INTEGER NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL, -- Critical | Needs Attention | Good | Excellent
  "issues"          JSONB DEFAULT '[]',
  "missing_blockers" INTEGER DEFAULT 0,
  "openings_count"  INTEGER DEFAULT 0,
  "checked_at"      TIMESTAMPTZ DEFAULT NOW(),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_health_checks_appointment" ON "quote_health_checks"("appointment_id");

-- ─── 13. MEASUREMENT RULE CONDITIONS (extension) ─────────────
CREATE TABLE IF NOT EXISTS "measurement_rule_conditions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_id"         TEXT NOT NULL, -- references measurement_rules.id
  "field"           TEXT NOT NULL,
  "operator"        TEXT NOT NULL, -- eq | neq | contains | gt | lt | in
  "value"           TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_mrc_rule" ON "measurement_rule_conditions"("rule_id");

-- ─── 14. MISSING PRICING RULES (extended) ────────────────────
-- Already exists as MissingPricingRule in Prisma; add workflow columns
ALTER TABLE IF EXISTS "MissingPricingRule"
  ADD COLUMN IF NOT EXISTS "resolved_by"   TEXT,
  ADD COLUMN IF NOT EXISTS "resolved_at"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "resolution_note" TEXT;

-- ─── 15. APPOINTMENT COMPLETION CHECKS ───────────────────────
CREATE TABLE IF NOT EXISTS "appointment_completion_checks" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "check_category"  TEXT NOT NULL, -- customer | openings | sketch | pricing | safety | measurements | export
  "status"          TEXT NOT NULL DEFAULT 'incomplete', -- incomplete | partial | complete | blocked
  "pct_complete"    INTEGER DEFAULT 0,
  "issues"          JSONB DEFAULT '[]',
  "last_checked"    TIMESTAMPTZ DEFAULT NOW(),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_completion_checks_appointment" ON "appointment_completion_checks"("appointment_id");

-- ─── 16. REP PREFERENCES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rep_preferences" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"         TEXT NOT NULL UNIQUE,
  "default_exterior" TEXT,
  "default_install"  TEXT,
  "default_glass"    TEXT DEFAULT 'LEE',
  "default_foam"     BOOLEAN DEFAULT TRUE,
  "default_removal"  TEXT DEFAULT 'ALUM',
  "preferred_state"  TEXT DEFAULT 'LA',
  "voice_enabled"    BOOLEAN DEFAULT TRUE,
  "measurement_mode" TEXT DEFAULT 'fraction', -- fraction | decimal | voice
  "preferences_json" JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 17. CUSTOMER CONVERSATION NOTES ─────────────────────────
CREATE TABLE IF NOT EXISTS "customer_conversation_notes" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "note_type"       TEXT DEFAULT 'general', -- general | objection | concern | preference | follow_up
  "note_text"       TEXT NOT NULL,
  "source_type"     TEXT DEFAULT 'manual', -- manual | voice | ai
  "source_phrase"   TEXT,
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_conv_notes_appointment" ON "customer_conversation_notes"("appointment_id");

-- ─── 18. SALES FOLLOW-UPS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sales_followups" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "customer_id"     TEXT,
  "followup_type"   TEXT NOT NULL, -- call | email | visit | proposal
  "due_date"        TIMESTAMPTZ,
  "status"          TEXT NOT NULL DEFAULT 'pending', -- pending | completed | cancelled
  "notes"           TEXT,
  "created_by"      TEXT,
  "completed_at"    TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_followups_appointment" ON "sales_followups"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_followups_status"      ON "sales_followups"("status");

-- ─── 19. FIELD SESSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "field_sessions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "device_type"     TEXT DEFAULT 'mobile', -- mobile | desktop | tablet
  "session_start"   TIMESTAMPTZ DEFAULT NOW(),
  "session_end"     TIMESTAMPTZ,
  "openings_added"  INTEGER DEFAULT 0,
  "voice_notes"     INTEGER DEFAULT 0,
  "photos_taken"    INTEGER DEFAULT 0,
  "measurements"    INTEGER DEFAULT 0,
  "sync_events"     INTEGER DEFAULT 0,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_field_sessions_appointment" ON "field_sessions"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_field_sessions_user"        ON "field_sessions"("user_id");

-- ─── 20. CROSS-DEVICE SYNC EVENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS "cross_device_sync_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "source_device"   TEXT,
  "target_device"   TEXT,
  "entity_type"     TEXT NOT NULL,
  "entity_id"       TEXT,
  "event_type"      TEXT NOT NULL, -- push | pull | conflict | resolve
  "payload"         JSONB,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_sync_events_appointment" ON "cross_device_sync_events"("appointment_id");

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES FOR NEW TABLES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "form_instance_values"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_exports"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_signatures"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "export_readiness_checks"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "export_blockers"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mobile_sync_queue"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mobile_offline_drafts"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opening_installation_notes"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_field_suggestions"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voice_field_mappings"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_overrides"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_health_checks"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_completion_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_preferences"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_conversation_notes"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales_followups"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_sessions"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cross_device_sync_events"      ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user owns the appointment
-- (Reused pattern across all appointment-scoped policies)
CREATE OR REPLACE FUNCTION user_owns_appointment(appt_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Appointment"
    WHERE id = appt_id
    AND ("userId" = auth.uid()
         OR auth.email() = 'nedpearson@gmail.com'
         OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin','manager','office')))
  );
$$;

-- Generic rep-scoped policies (appointment-linked tables)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'form_instance_values','form_exports','form_signatures',
    'export_readiness_checks','export_blockers',
    'opening_installation_notes','ai_field_suggestions',
    'voice_field_mappings','pricing_overrides',
    'quote_health_checks','appointment_completion_checks',
    'customer_conversation_notes','sales_followups',
    'field_sessions','cross_device_sync_events'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "rep_select_%1$s" ON "%1$s";
      CREATE POLICY "rep_select_%1$s" ON "%1$s"
        FOR SELECT USING (user_owns_appointment(appointment_id));
      DROP POLICY IF EXISTS "rep_write_%1$s" ON "%1$s";
      CREATE POLICY "rep_write_%1$s" ON "%1$s"
        FOR ALL USING (user_owns_appointment(appointment_id));
    ', tbl);
  END LOOP;
END $$;

-- Mobile sync: device-level policies
DROP POLICY IF EXISTS "rep_select_mobile_sync_queue" ON "mobile_sync_queue";
CREATE POLICY "rep_select_mobile_sync_queue" ON "mobile_sync_queue"
  FOR SELECT USING (
    appointment_id IS NULL OR user_owns_appointment(appointment_id)
  );

DROP POLICY IF EXISTS "rep_write_mobile_sync_queue" ON "mobile_sync_queue";
CREATE POLICY "rep_write_mobile_sync_queue" ON "mobile_sync_queue"
  FOR ALL USING (
    appointment_id IS NULL OR user_owns_appointment(appointment_id)
  );

DROP POLICY IF EXISTS "rep_select_mobile_offline_drafts" ON "mobile_offline_drafts";
CREATE POLICY "rep_select_mobile_offline_drafts" ON "mobile_offline_drafts"
  FOR SELECT USING (
    appointment_id IS NULL OR user_owns_appointment(appointment_id)
  );

DROP POLICY IF EXISTS "rep_write_mobile_offline_drafts" ON "mobile_offline_drafts";
CREATE POLICY "rep_write_mobile_offline_drafts" ON "mobile_offline_drafts"
  FOR ALL USING (
    appointment_id IS NULL OR user_owns_appointment(appointment_id)
  );

-- Rep preferences: own row only
DROP POLICY IF EXISTS "rep_prefs_select" ON "rep_preferences";
CREATE POLICY "rep_prefs_select" ON "rep_preferences"
  FOR SELECT USING (user_id = auth.uid()::text OR auth.email() = 'nedpearson@gmail.com');

DROP POLICY IF EXISTS "rep_prefs_write" ON "rep_preferences";
CREATE POLICY "rep_prefs_write" ON "rep_preferences"
  FOR ALL USING (user_id = auth.uid()::text OR auth.email() = 'nedpearson@gmail.com');

-- ═══════════════════════════════════════════════════════════════
-- VERIFY EXISTING TABLE RLS (from prior migrations)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS "Opening"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Customer"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Appointment"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FormInstance"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Contract"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Signature"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Payment"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HouseMap"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HouseMapMarker"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VoiceSession"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VoiceTranscript"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VoiceExtractedEntity"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PricingVersion"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "OpeningPhoto"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FormSketch"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SketchMarker"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "measurement_rules"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "measurement_adjustments"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "measurement_photo_reads"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "specialty_measurement_sessions" ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- SEED: WINDOW WORLD DEFAULT REP PREFERENCES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO "rep_preferences" (user_id, default_glass, default_foam, default_removal, preferred_state, voice_enabled, measurement_mode)
VALUES ('system-default', 'LEE', TRUE, 'ALUM', 'LA', TRUE, 'fraction')
ON CONFLICT (user_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ENV CHECK: Ensure service role is not accessible from frontend
-- (reminder — this is a documentation note, not executable SQL)
-- SUPABASE_SERVICE_ROLE_KEY must ONLY be used server-side.
-- The frontend uses SUPABASE_ANON_KEY via RLS only.
-- ═══════════════════════════════════════════════════════════════

SELECT 'Migration complete — ' || NOW()::text AS result;
