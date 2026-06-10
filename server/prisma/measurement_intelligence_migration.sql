-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD — MEASUREMENT INTELLIGENCE MIGRATION
-- Supabase SQL — Run in order, safe to re-run
-- ═══════════════════════════════════════════════════════════════

-- ─── MEASUREMENT RULES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_rules" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                   TEXT NOT NULL,
  "description"            TEXT,
  "status"                 TEXT NOT NULL DEFAULT 'needs_verification',
  -- needs_verification | verified | draft | inactive
  "window_type"            TEXT,
  "exterior_type"          TEXT,
  "install_type"           TEXT,
  "removal_type"           TEXT,
  "condition_json"         JSONB,
  "width_takeoff_fraction" TEXT,
  "height_takeoff_fraction" TEXT,
  "width_takeoff_decimal"  NUMERIC(8,4) DEFAULT 0,
  "height_takeoff_decimal" NUMERIC(8,4) DEFAULT 0,
  "min_deduction"          NUMERIC(8,4),
  "max_deduction"          NUMERIC(8,4),
  "action_type"            TEXT DEFAULT 'deduct',
  "requires_confirmation"  BOOLEAN NOT NULL DEFAULT TRUE,
  "requires_photo"         BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_note"          BOOLEAN NOT NULL DEFAULT FALSE,
  "severity"               TEXT NOT NULL DEFAULT 'high',
  "notes"                  TEXT,
  "effective_date"         DATE,
  "version"                INTEGER NOT NULL DEFAULT 1,
  "active"                 BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"             TEXT,
  "updated_by"             TEXT,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_measurement_rules_window_type"   ON "measurement_rules"("window_type");
CREATE INDEX IF NOT EXISTS "idx_measurement_rules_exterior"      ON "measurement_rules"("exterior_type");
CREATE INDEX IF NOT EXISTS "idx_measurement_rules_status"        ON "measurement_rules"("status");

-- ─── MEASUREMENT RULE VERSIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_rule_versions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_id"         UUID NOT NULL REFERENCES "measurement_rules"("id") ON DELETE CASCADE,
  "version"         INTEGER NOT NULL,
  "snapshot"        JSONB NOT NULL,
  "changed_by"      TEXT,
  "change_reason"   TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MEASUREMENT RULE EXECUTION LOGS ─────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_rule_execution_logs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_id"         UUID REFERENCES "measurement_rules"("id"),
  "appointment_id"  TEXT,
  "opening_id"      TEXT,
  "opening_number"  INTEGER,
  "window_type"     TEXT,
  "exterior_type"   TEXT,
  "install_type"    TEXT,
  "raw_width"       NUMERIC(8,4),
  "raw_height"      NUMERIC(8,4),
  "adj_width"       NUMERIC(8,4),
  "adj_height"      NUMERIC(8,4),
  "width_takeoff"   NUMERIC(8,4),
  "height_takeoff"  NUMERIC(8,4),
  "applied"         BOOLEAN DEFAULT FALSE,
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMPTZ,
  "overridden"      BOOLEAN DEFAULT FALSE,
  "override_reason" TEXT,
  "metadata"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_rule_exec_appointment" ON "measurement_rule_execution_logs"("appointment_id");

-- ─── MEASUREMENT ADJUSTMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_adjustments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"  TEXT NOT NULL,
  "opening_id"      TEXT,
  "opening_number"  INTEGER NOT NULL,
  "source_type"     TEXT NOT NULL DEFAULT 'manual',
  -- manual | voice | photo | ai | rule | wizard
  "raw_width"       NUMERIC(8,4),
  "raw_height"      NUMERIC(8,4),
  "adj_width"       NUMERIC(8,4),
  "adj_height"      NUMERIC(8,4),
  "width_takeoff"   NUMERIC(8,4) DEFAULT 0,
  "height_takeoff"  NUMERIC(8,4) DEFAULT 0,
  "rule_id"         UUID REFERENCES "measurement_rules"("id"),
  "rule_status"     TEXT,
  "confidence"      NUMERIC(4,3),
  "approved"        BOOLEAN NOT NULL DEFAULT FALSE,
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMPTZ,
  "override_reason" TEXT,
  "notes"           TEXT[],
  "warnings"        TEXT[],
  "metadata"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_measurement_adj_appointment" ON "measurement_adjustments"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_measurement_adj_approved"    ON "measurement_adjustments"("approved");

-- ─── MEASUREMENT REVIEW LOGS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_review_logs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adjustment_id"   UUID REFERENCES "measurement_adjustments"("id"),
  "appointment_id"  TEXT NOT NULL,
  "opening_number"  INTEGER,
  "action"          TEXT NOT NULL,
  -- approved | rejected | corrected | overridden
  "previous_value"  JSONB,
  "new_value"       JSONB,
  "review_reason"   TEXT,
  "reviewed_by"     TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MISSING MEASUREMENT RULES ───────────────────────────────
CREATE TABLE IF NOT EXISTS "missing_measurement_rules" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id" TEXT NOT NULL,
  "opening_number" INTEGER,
  "window_type"    TEXT,
  "exterior_type"  TEXT,
  "install_type"   TEXT,
  "notes"          TEXT,
  "resolved"       BOOLEAN NOT NULL DEFAULT FALSE,
  "resolved_at"    TIMESTAMPTZ,
  "resolved_by"    TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MEASUREMENT MANUAL OVERRIDES ────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_manual_overrides" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"   TEXT NOT NULL,
  "opening_number"   INTEGER NOT NULL,
  "override_reason"  TEXT NOT NULL,
  "final_width"      NUMERIC(8,4),
  "final_height"     NUMERIC(8,4),
  "overridden_by"    TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MEASUREMENT CAPTURE PHOTOS ──────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_capture_photos" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id"    TEXT NOT NULL,
  "opening_id"        TEXT,
  "opening_number"    INTEGER,
  "measurement_type"  TEXT NOT NULL,
  -- width | height | top_sash_width | top_sash_height | leg_height | rise | radius
  "photo_url"         TEXT,
  "storage_path"      TEXT,
  "captured_by"       TEXT,
  "captured_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata"          JSONB
);

-- ─── MEASUREMENT PHOTO READS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "measurement_photo_reads" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "photo_id"              UUID REFERENCES "measurement_capture_photos"("id"),
  "appointment_id"        TEXT NOT NULL,
  "opening_number"        INTEGER,
  "measurement_type"      TEXT NOT NULL,
  "raw_ai_text"           TEXT,
  "detected_fraction"     TEXT,
  "detected_decimal"      NUMERIC(8,4),
  "confidence_score"      NUMERIC(4,3),
  "candidates"            TEXT[],
  "selected_value"        NUMERIC(8,4),
  "corrected_value"       NUMERIC(8,4),
  "rule_applied_id"       UUID REFERENCES "measurement_rules"("id"),
  "takeoff_amount"        NUMERIC(8,4),
  "final_decimal"         NUMERIC(8,4),
  "final_fraction"        TEXT,
  "status"                TEXT NOT NULL DEFAULT 'pending',
  -- pending | processing | detected | low_confidence | failed | approved | rejected
  "requires_manual"       BOOLEAN NOT NULL DEFAULT FALSE,
  "approved_by"           TEXT,
  "approved_at"           TIMESTAMPTZ,
  "metadata"              JSONB,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_photo_reads_appointment" ON "measurement_photo_reads"("appointment_id");
CREATE INDEX IF NOT EXISTS "idx_photo_reads_status"      ON "measurement_photo_reads"("status");

-- ─── SPECIALTY WINDOW TYPES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "specialty_window_types" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "window_type"           TEXT NOT NULL UNIQUE,
  "label"                 TEXT NOT NULL,
  "icon"                  TEXT,
  "required_dimensions"   JSONB NOT NULL DEFAULT '[]',
  "optional_dimensions"   JSONB NOT NULL DEFAULT '[]',
  "computed_fields"       JSONB,
  "required_photos"       TEXT[] DEFAULT '{}',
  "requires_sketch"       BOOLEAN NOT NULL DEFAULT FALSE,
  "order_form_notes"      TEXT,
  "status"                TEXT NOT NULL DEFAULT 'needs_verification',
  "active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SPECIALTY MEASUREMENT SESSIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS "specialty_measurement_sessions" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id" TEXT NOT NULL,
  "opening_id"     TEXT,
  "opening_number" INTEGER NOT NULL,
  "window_type"    TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'in_progress',
  -- in_progress | complete | abandoned | needs_review
  "started_by"     TEXT,
  "completed_by"   TEXT,
  "completed_at"   TIMESTAMPTZ,
  "metadata"       JSONB,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SPECIALTY MEASUREMENT VALUES ────────────────────────────
CREATE TABLE IF NOT EXISTS "specialty_measurement_values" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"       UUID NOT NULL REFERENCES "specialty_measurement_sessions"("id") ON DELETE CASCADE,
  "appointment_id"   TEXT NOT NULL,
  "opening_number"   INTEGER,
  "dimension_key"    TEXT NOT NULL,
  "dimension_label"  TEXT NOT NULL,
  "raw_value"        NUMERIC(8,4),
  "adjusted_value"   NUMERIC(8,4),
  "source_type"      TEXT DEFAULT 'manual',
  "photo_read_id"    UUID REFERENCES "measurement_photo_reads"("id"),
  "approved"         BOOLEAN NOT NULL DEFAULT FALSE,
  "approved_at"      TIMESTAMPTZ,
  "metadata"         JSONB,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SPECIALTY MEASUREMENT VALIDATIONS ───────────────────────
CREATE TABLE IF NOT EXISTS "specialty_measurement_validations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"      UUID NOT NULL REFERENCES "specialty_measurement_sessions"("id") ON DELETE CASCADE,
  "appointment_id"  TEXT NOT NULL,
  "opening_number"  INTEGER,
  "issue_type"      TEXT NOT NULL,
  "message"         TEXT NOT NULL,
  "severity"        TEXT NOT NULL DEFAULT 'high',
  "resolved"        BOOLEAN NOT NULL DEFAULT FALSE,
  "resolved_at"     TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS POLICIES ────────────────────────────────────────────
ALTER TABLE "measurement_rules"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_adjustments"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_capture_photos"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_photo_reads"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "specialty_measurement_sessions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "specialty_measurement_values"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_review_logs"           ENABLE ROW LEVEL SECURITY;

-- Measurement rules: all reps read, only admin/manager write
DROP POLICY IF EXISTS "measurement_rules_read" ON "measurement_rules";
CREATE POLICY "measurement_rules_read" ON "measurement_rules"
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "measurement_rules_write" ON "measurement_rules";
CREATE POLICY "measurement_rules_write" ON "measurement_rules"
  FOR ALL USING (
    auth.email() = 'nedpearson@gmail.com'
    OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'manager', 'office'))
  );

-- Measurement adjustments: reps see their own appointments
DROP POLICY IF EXISTS "measurement_adj_select" ON "measurement_adjustments";
CREATE POLICY "measurement_adj_select" ON "measurement_adjustments"
  FOR SELECT USING (
    "appointment_id" IN (SELECT id FROM "Appointment" WHERE "userId" = auth.uid())
    OR auth.email() = 'nedpearson@gmail.com'
    OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'manager', 'office'))
  );

DROP POLICY IF EXISTS "measurement_adj_write" ON "measurement_adjustments";
CREATE POLICY "measurement_adj_write" ON "measurement_adjustments"
  FOR ALL USING (
    "appointment_id" IN (SELECT id FROM "Appointment" WHERE "userId" = auth.uid())
    OR auth.email() = 'nedpearson@gmail.com'
  );

-- Photo reads: same as adjustments
DROP POLICY IF EXISTS "photo_reads_select" ON "measurement_photo_reads";
CREATE POLICY "photo_reads_select" ON "measurement_photo_reads"
  FOR SELECT USING (
    "appointment_id" IN (SELECT id FROM "Appointment" WHERE "userId" = auth.uid())
    OR auth.email() = 'nedpearson@gmail.com'
    OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "photo_reads_write" ON "measurement_photo_reads";
CREATE POLICY "photo_reads_write" ON "measurement_photo_reads"
  FOR ALL USING (
    "appointment_id" IN (SELECT id FROM "Appointment" WHERE "userId" = auth.uid())
    OR auth.email() = 'nedpearson@gmail.com'
  );

-- ─── SEED INITIAL SPECIALTY WINDOW TYPES ─────────────────────
INSERT INTO "specialty_window_types" ("window_type", "label", "icon", "required_dimensions", "optional_dimensions", "required_photos", "requires_sketch", "status")
VALUES
  ('oriel',        'Oriel Window',              '🪟', '[{"key":"topSashWidth","label":"Top Sash Width"},{"key":"topSashHeight","label":"Top Sash Height"}]', '[{"key":"overallWidth","label":"Overall Width"},{"key":"overallHeight","label":"Overall Height"}]', '{"Tape on top sash width","Tape on top sash height"}', TRUE, 'verified'),
  ('circle_top',   'Circle Top / Extended Leg', '⌒', '[{"key":"width","label":"Width"},{"key":"legHeight","label":"Leg Height"},{"key":"rise","label":"Rise"}]', '[{"key":"customRadius","label":"Custom Radius"}]', '{"Width tape","Leg height tape","Rise tape"}', TRUE, 'verified'),
  ('eyebrow',      'Eyebrow Window',            '⌢', '[{"key":"width","label":"Width"},{"key":"rise","label":"Rise"},{"key":"legHeightLeft","label":"Left Leg"},{"key":"legHeightRight","label":"Right Leg"}]', '[{"key":"customRadius","label":"Custom Radius"}]', '{"Width tape","Rise tape","Overall photo"}', TRUE, 'needs_verification'),
  ('arch',         'Full Arch / Half Round',    '⌣', '[{"key":"width","label":"Width"},{"key":"height","label":"Height"}]', '[]', '{"Width tape","Height tape"}', TRUE, 'needs_verification'),
  ('quarter_arch', 'Quarter Arch',              '◜', '[{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"legHeightLeft","label":"Left Leg"},{"key":"legHeightRight","label":"Right Leg"}]', '[{"key":"customRadius","label":"Custom Radius"}]', '{"Width tape","Height tape","Corner detail"}', TRUE, 'needs_verification'),
  ('custom_shape', 'Custom / Geometric Shape',  '✦', '[{"key":"width","label":"Width"},{"key":"height","label":"Height"}]', '[{"key":"legHeight","label":"Leg Height"},{"key":"rise","label":"Rise"},{"key":"customRadius","label":"Custom Radius"}]', '{"Unit photo","All tape measurements"}', TRUE, 'needs_verification')
ON CONFLICT ("window_type") DO NOTHING;

-- ─── SEED INITIAL MEASUREMENT RULES ──────────────────────────
INSERT INTO "measurement_rules" ("id", "name", "description", "status", "window_type", "exterior_type", "install_type", "width_takeoff_decimal", "height_takeoff_decimal", "requires_confirmation", "requires_photo", "severity", "notes")
VALUES
  ('11111111-0001-0000-0000-000000000001', 'Oriel — Top Sash Measurement', 'Oriel windows use top sash measurement as-is. No deduction applied.', 'verified', 'oriel', NULL, NULL, 0, 0, TRUE, TRUE, 'blocker', 'Use top sash. No deduction.'),
  ('11111111-0002-0000-0000-000000000002', 'Insert Install / Brick — Standard Takeoff', '1/4" takeoff width and height for brick insert.', 'needs_verification', NULL, 'brick', 'INT', 0.25, 0.25, TRUE, FALSE, 'high', 'NEEDS_VERIFICATION: confirm with Window World.'),
  ('11111111-0003-0000-0000-000000000003', 'Full Frame Install / Siding — No Deduction', 'EXT siding: measure RO, no takeoff.', 'needs_verification', NULL, 'siding', 'EXT', 0, 0, TRUE, FALSE, 'medium', 'NEEDS_VERIFICATION: confirm full-frame siding protocol.'),
  ('11111111-0004-0000-0000-000000000004', 'Circle Top — Radius Measurement', 'Circle top: collect width, leg height, rise. Radius computed.', 'verified', 'circle_top', NULL, NULL, 0, 0, TRUE, TRUE, 'high', 'Radius = (rise/2) + (w² / 8·rise).'),
  ('11111111-0005-0000-0000-000000000005', 'Patio Door — Rough Opening', 'Patio doors: measure rough opening width and height.', 'needs_verification', 'patio_door', NULL, NULL, 0, 0, TRUE, FALSE, 'high', 'NEEDS_VERIFICATION: confirm patio door RO protocol.')
ON CONFLICT ("id") DO NOTHING;
