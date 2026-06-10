-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD — LOUISIANA SAFETY GLAZING MIGRATION
-- Run against Supabase via SQL editor or migration runner
-- ═══════════════════════════════════════════════════════════════

-- IMPORTANT: This migration is safe to run multiple times (CREATE IF NOT EXISTS pattern)

-- ─── OPENING SAFETY GLAZING REVIEWS ─────────────────────────
CREATE TABLE IF NOT EXISTS "OpeningSafetyGlazingReview" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "appointmentId"      TEXT NOT NULL,
  "openingId"          TEXT,
  "openingNumber"      INTEGER NOT NULL,
  "safetyReviewStatus" TEXT NOT NULL DEFAULT 'not_started',
  "temperedRequired"   TEXT NOT NULL DEFAULT 'not_reviewed',
  "temperedFull"       BOOLEAN NOT NULL DEFAULT FALSE,
  "temperedHalf"       BOOLEAN NOT NULL DEFAULT FALSE,
  "flaggedReasons"     TEXT[] NOT NULL DEFAULT '{}',
  "sourceType"         TEXT NOT NULL DEFAULT 'rule',
  "sourcePhrase"       TEXT,
  "confidenceScore"    INTEGER NOT NULL DEFAULT 0,
  "overrideReason"     TEXT,
  "reviewedBy"         TEXT,
  "reviewedAt"         TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata"           JSONB
);

CREATE INDEX IF NOT EXISTS "idx_safety_review_appointment" ON "OpeningSafetyGlazingReview"("appointmentId");
CREATE INDEX IF NOT EXISTS "idx_safety_review_status"      ON "OpeningSafetyGlazingReview"("safetyReviewStatus");
CREATE INDEX IF NOT EXISTS "idx_safety_review_tempered"    ON "OpeningSafetyGlazingReview"("temperedRequired");

-- ─── TEMPERED GLAZING FLAGS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "TemperedGlazingFlag" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reviewId"       TEXT,
  "appointmentId"  TEXT NOT NULL,
  "openingNumber"  INTEGER NOT NULL,
  "ruleId"         TEXT NOT NULL,
  "ruleName"       TEXT NOT NULL,
  "category"       TEXT NOT NULL,
  "severity"       TEXT NOT NULL DEFAULT 'high',
  "flagReason"     TEXT NOT NULL,
  "sourceType"     TEXT NOT NULL DEFAULT 'rule',
  "sourcePhrase"   TEXT,
  "confidence"     FLOAT NOT NULL DEFAULT 0.85,
  "requiresPhoto"  BOOLEAN NOT NULL DEFAULT FALSE,
  "photoHint"      TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_tempered_flag_appointment" ON "TemperedGlazingFlag"("appointmentId");

-- ─── BUSINESS RULE EXECUTION LOG ────────────────────────────
CREATE TABLE IF NOT EXISTS "BusinessRuleExecutionLog" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ruleId"         TEXT NOT NULL,
  "ruleName"       TEXT NOT NULL,
  "appointmentId"  TEXT,
  "openingId"      TEXT,
  "openingNumber"  INTEGER,
  "triggered"      BOOLEAN NOT NULL DEFAULT FALSE,
  "autoApplied"    BOOLEAN NOT NULL DEFAULT FALSE,
  "overridden"     BOOLEAN NOT NULL DEFAULT FALSE,
  "overrideReason" TEXT,
  "severity"       TEXT NOT NULL DEFAULT 'high',
  "executedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata"       JSONB
);

CREATE INDEX IF NOT EXISTS "idx_rule_exec_log_rule"        ON "BusinessRuleExecutionLog"("ruleId");
CREATE INDEX IF NOT EXISTS "idx_rule_exec_log_appointment" ON "BusinessRuleExecutionLog"("appointmentId");

-- ─── AI VALIDATION WARNINGS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiValidationWarning" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "appointmentId"  TEXT NOT NULL,
  "openingId"      TEXT,
  "openingNumber"  INTEGER,
  "category"       TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "sourceType"     TEXT NOT NULL DEFAULT 'ai',
  "sourcePhrase"   TEXT,
  "confidence"     FLOAT NOT NULL DEFAULT 0.75,
  "resolved"       BOOLEAN NOT NULL DEFAULT FALSE,
  "resolvedAt"     TIMESTAMPTZ,
  "resolvedBy"     TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ai_warning_appointment" ON "AiValidationWarning"("appointmentId");
CREATE INDEX IF NOT EXISTS "idx_ai_warning_resolved"    ON "AiValidationWarning"("resolved");

-- ─── RLS POLICIES ────────────────────────────────────────────
ALTER TABLE "OpeningSafetyGlazingReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemperedGlazingFlag"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessRuleExecutionLog"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiValidationWarning"        ENABLE ROW LEVEL SECURITY;

-- Safety Reviews: rep sees their own appointment reviews, admins see all
DROP POLICY IF EXISTS "safety_review_select" ON "OpeningSafetyGlazingReview";
CREATE POLICY "safety_review_select" ON "OpeningSafetyGlazingReview"
  FOR SELECT USING (
    "appointmentId" IN (
      SELECT id FROM "Appointment"
      WHERE "userId" = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'office', 'manager')
    )
    OR auth.email() = 'nedpearson@gmail.com'
  );

DROP POLICY IF EXISTS "safety_review_insert" ON "OpeningSafetyGlazingReview";
CREATE POLICY "safety_review_insert" ON "OpeningSafetyGlazingReview"
  FOR INSERT WITH CHECK (
    "appointmentId" IN (
      SELECT id FROM "Appointment" WHERE "userId" = auth.uid()
    )
    OR auth.email() = 'nedpearson@gmail.com'
  );

DROP POLICY IF EXISTS "safety_review_update" ON "OpeningSafetyGlazingReview";
CREATE POLICY "safety_review_update" ON "OpeningSafetyGlazingReview"
  FOR UPDATE USING (
    "appointmentId" IN (
      SELECT id FROM "Appointment" WHERE "userId" = auth.uid()
    )
    OR auth.email() = 'nedpearson@gmail.com'
  );

-- Tempered Flags: same rules as safety review
DROP POLICY IF EXISTS "tempered_flag_select" ON "TemperedGlazingFlag";
CREATE POLICY "tempered_flag_select" ON "TemperedGlazingFlag"
  FOR SELECT USING (
    "appointmentId" IN (
      SELECT id FROM "Appointment" WHERE "userId" = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'office', 'manager'))
    OR auth.email() = 'nedpearson@gmail.com'
  );

-- Service role can always read/write all tables (for AI/backend processing)
-- (service_role key bypasses RLS automatically in Supabase)

-- ─── LOUISIANA SAFETY GLAZING RULES SEED ────────────────────
-- These are the default configurable rules for Louisiana jurisdiction.
-- Admins can update/add rules via the Rule Engine admin page.

INSERT INTO "BusinessRule" (id, name, description, "isActive", severity, "triggerField", "triggerValue", "actionType", "actionField", "actionValue", message, "createdAt", "updatedAt")
VALUES
  -- Door / Door-Adjacent
  ('sg-sliding-glass-door',    'Sliding Glass Door Safety Check',   'Sliding glass doors require safety glazing under Louisiana law.',              TRUE, 'high',   'productCategory', 'patio_door',   'warn', NULL, NULL, '🚪 Sliding glass door detected — safety glazing required. Review tempered glass.',   NOW(), NOW()),
  ('sg-entrance-door',         'Entrance/Storm Door Safety Check',  'Glass entrance doors and storm doors require safety glazing.',                  TRUE, 'high',   'productCategory', 'door',         'warn', NULL, NULL, '🚪 Glass door detected — safety glazing required. Review tempered glass.',          NOW(), NOW()),
  ('sg-sidelight-near-door',   'Sidelight / Door-Adjacent Glass',   'Fixed/operable glass panel within 24" of a door requires safety glazing review.', TRUE, 'high',  'roomLocation',   'sidelight',    'warn', NULL, NULL, '↔️ Sidelight/door-adjacent glass detected — review for safety glazing.',           NOW(), NOW()),
  -- Wet Areas
  ('sg-bathroom',              'Bathroom Window Safety Check',      'Bathroom windows near tubs or showers may require safety glazing.',             TRUE, 'high',   'roomLocation',   'bathroom',     'warn', NULL, NULL, '🚿 Bathroom window detected — verify safety glazing per Louisiana code.',           NOW(), NOW()),
  ('sg-shower-tub',            'Shower/Tub Enclosure Check',       'Glass in shower/tub areas requires safety glazing per Louisiana law.',           TRUE, 'high',   'roomLocation',   'shower',       'warn', NULL, NULL, '🚿 Shower/tub area detected — safety glazing required by Louisiana law.',           NOW(), NOW()),
  ('sg-pool-spa',              'Pool/Spa Area Safety Check',        'Glass adjacent to pool or spa areas may require safety glazing.',               TRUE, 'medium', 'roomLocation',   'pool',         'warn', NULL, NULL, '🏊 Pool/spa area detected — review safety glazing requirements.',                  NOW(), NOW()),
  -- Low to Floor / Stairs
  ('sg-low-window',            'Low Window / Floor-Level Glass',   'Glass panels close to walking surface may require safety glazing.',             TRUE, 'high',   'legHeight',      '<18',          'warn', NULL, NULL, '⬇️ Glass close to floor detected — review safety glazing requirements.',           NOW(), NOW()),
  ('sg-stair-landing',         'Stair/Landing Safety Check',       'Glass near stairways or landings may require safety glazing.',                  TRUE, 'high',   'roomLocation',   'stair',        'warn', NULL, NULL, '🪜 Stair/landing area detected — safety glazing review required.',                 NOW(), NOW()),
  -- Large Panel / Impact
  ('sg-large-picture-panel',   'Large Fixed Panel Safety Check',   'Large picture windows over 16 sq ft may require safety glazing review.',        TRUE, 'medium', 'productCategory','picture',      'warn', NULL, NULL, '🖼️ Large fixed glass panel detected — review safety glazing requirements.',         NOW(), NOW()),
  ('sg-impact-risk',           'High Traffic / Impact Risk Area',  'Rep-flagged high-traffic, child area, or impact risk locations.',               TRUE, 'medium', 'installNotes',   'high traffic', 'warn', NULL, NULL, '⚠️ Rep-flagged impact/traffic risk area — confirm tempered glass.',                NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
