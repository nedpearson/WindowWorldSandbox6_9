-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD — SALES REP INTELLIGENCE LAYER
-- RLS Policies & Initial Data Seed
-- ═══════════════════════════════════════════════════════════════

-- Enable Row Level Security on new tables
ALTER TABLE "BusinessRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentTimelineEvent" ENABLE ROW LEVEL SECURITY;

-- ─── BUSINESS RULE POLICIES ──────────────────────────────────
-- Everyone can read active rules
CREATE POLICY "Rules are viewable by all users" ON "BusinessRule"
  FOR SELECT USING (true);

-- Only admins/managers can modify rules
CREATE POLICY "Rules are insertable by admins" ON "BusinessRule"
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Rules are updatable by admins" ON "BusinessRule"
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ─── APPOINTMENT TIMELINE POLICIES ───────────────────────────
-- Reps can see timeline events for their own appointments, or admins can see all
CREATE POLICY "Timeline events viewable by assigned rep or admin" ON "AppointmentTimelineEvent"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Appointment" a 
      WHERE a.id = "AppointmentTimelineEvent"."appointmentId" 
      AND (a."userId" = auth.uid() OR EXISTS (SELECT 1 FROM "User" u WHERE u.id = auth.uid() AND u.role IN ('admin', 'office')))
    )
  );

-- System or reps can insert timeline events
CREATE POLICY "Timeline events insertable by rep" ON "AppointmentTimelineEvent"
  FOR INSERT WITH CHECK (
    "userId" = auth.uid() OR "userId" IS NULL
  );

-- ─── INITIAL BUSINESS RULES SEED ─────────────────────────────
INSERT INTO "BusinessRule" (id, name, description, "isActive", severity, "triggerField", "triggerValue", "actionType", "actionField", "actionValue", message, "createdAt", "updatedAt")
VALUES
  ('rule_brick_ext', 'Brick Exterior → EXT Install', 'Defaults installation to EXT when exterior is Brick', 'exteriorType', 'Brick', 'set_field', 'installType', 'EXT', 'Brick exterior defaults Type Install to EXT', NOW(), NOW()),
  ('rule_siding_int', 'Siding Exterior → INT Install', 'Defaults installation to INT when exterior is Siding/Wood', 'exteriorType', 'Siding', 'require_confirmation', 'installType', 'INT', 'Siding/Wood requires INT Install + Trim/Header', NOW(), NOW()),
  ('rule_tempered_warning', 'Bathroom Tempered Check', 'Warns if tempered glass is missing in a bathroom', 'roomLocation', 'Bath', 'warn', NULL, NULL, 'Bathroom window may require tempered glass by code', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
