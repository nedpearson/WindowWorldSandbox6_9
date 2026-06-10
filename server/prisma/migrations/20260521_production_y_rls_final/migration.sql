-- ═══════════════════════════════════════════════════════════════════════════════
-- WindowWorldAssistant — Production RLS Migration
-- Apply in Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Helper: get authenticated user's companyId ───────────────────────────────
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS TEXT AS $$
  SELECT "companyId"
  FROM "User"
  WHERE id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── Helper: check if authenticated user owns an appointment ──────────────────
DROP FUNCTION IF EXISTS user_owns_appointment(text);
CREATE OR REPLACE FUNCTION user_owns_appointment(appointment_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Appointment" a
    JOIN "User" u ON u.id = a."userId"
    WHERE a.id = appointment_id
      AND u."companyId" = get_user_company_id()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── Helper: check if user is admin or manager ─────────────────────────────────
CREATE OR REPLACE FUNCTION user_is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text
      AND role IN ('admin', 'manager', 'owner')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER / COMPANY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='User' AND policyname='user_service_role') THEN
    CREATE POLICY "user_service_role" ON "User" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='User' AND policyname='user_read_own_company') THEN
    CREATE POLICY "user_read_own_company" ON "User"
      FOR SELECT TO authenticated
      USING ("companyId" = get_user_company_id());
  END IF;
END $$;

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Company' AND policyname='company_service_role') THEN
    CREATE POLICY "company_service_role" ON "Company" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Company' AND policyname='company_read_own') THEN
    CREATE POLICY "company_read_own" ON "Company"
      FOR SELECT TO authenticated
      USING (id = get_user_company_id());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CUSTOMER / APPOINTMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Customer' AND policyname='customer_service_role') THEN
    CREATE POLICY "customer_service_role" ON "Customer" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Customer' AND policyname='customer_company_scope') THEN
    CREATE POLICY "customer_company_scope" ON "Customer"
      FOR ALL TO authenticated
      USING ("companyId" = get_user_company_id())
      WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;

ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Appointment' AND policyname='appt_service_role') THEN
    CREATE POLICY "appt_service_role" ON "Appointment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Appointment' AND policyname='appt_company_scope') THEN
    CREATE POLICY "appt_company_scope" ON "Appointment"
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = "Appointment"."userId"
            AND u."companyId" = get_user_company_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = "Appointment"."userId"
            AND u."companyId" = get_user_company_id()
        )
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPENING / PHOTO TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "Opening" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Opening' AND policyname='opening_service_role') THEN
    CREATE POLICY "opening_service_role" ON "Opening" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Opening' AND policyname='opening_appointment_scope') THEN
    CREATE POLICY "opening_appointment_scope" ON "Opening"
      FOR ALL TO authenticated
      USING (user_owns_appointment("appointmentId"))
      WITH CHECK (user_owns_appointment("appointmentId"));
  END IF;
END $$;

ALTER TABLE "OpeningPhoto" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningPhoto' AND policyname='photo_service_role') THEN
    CREATE POLICY "photo_service_role" ON "OpeningPhoto" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningPhoto' AND policyname='photo_appointment_scope') THEN
    CREATE POLICY "photo_appointment_scope" ON "OpeningPhoto"
      FOR ALL TO authenticated
      USING (user_owns_appointment("appointmentId"))
      WITH CHECK (user_owns_appointment("appointmentId"));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SKETCH / MARKER TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "SketchMarker" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarker' AND policyname='marker_service_role') THEN
    CREATE POLICY "marker_service_role" ON "SketchMarker" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarker' AND policyname='marker_appointment_scope') THEN
    CREATE POLICY "marker_appointment_scope" ON "SketchMarker"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")))
      WITH CHECK (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")));
  END IF;
END $$;

ALTER TABLE "SketchLayer" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchLayer' AND policyname='layer_service_role') THEN
    CREATE POLICY "layer_service_role" ON "SketchLayer" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchLayer' AND policyname='layer_scope') THEN
    CREATE POLICY "layer_scope" ON "SketchLayer"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")))
      WITH CHECK (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")));
  END IF;
END $$;

ALTER TABLE "SketchMarkerGroup" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarkerGroup' AND policyname='markergroup_service_role') THEN
    CREATE POLICY "markergroup_service_role" ON "SketchMarkerGroup" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarkerGroup' AND policyname='markergroup_scope') THEN
    CREATE POLICY "markergroup_scope" ON "SketchMarkerGroup"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")))
      WITH CHECK (EXISTS (SELECT 1 FROM "FormSketch" s WHERE s.id = "sketchId" AND user_owns_appointment(s."appointmentId")));
  END IF;
END $$;

ALTER TABLE "SketchMarkerGroupMember" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarkerGroupMember' AND policyname='groupmember_service_role') THEN
    CREATE POLICY "groupmember_service_role" ON "SketchMarkerGroupMember" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchMarkerLink" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMarkerLink' AND policyname='markerlink_service_role') THEN
    CREATE POLICY "markerlink_service_role" ON "SketchMarkerLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchAiInterpretation" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchAiInterpretation' AND policyname='sketchai_service_role') THEN
    CREATE POLICY "sketchai_service_role" ON "SketchAiInterpretation" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchCompletenessScore" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchCompletenessScore' AND policyname='sketchscore_service_role') THEN
    CREATE POLICY "sketchscore_service_role" ON "SketchCompletenessScore" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchMeasurementValidation" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchMeasurementValidation' AND policyname='sketchmv_service_role') THEN
    CREATE POLICY "sketchmv_service_role" ON "SketchMeasurementValidation" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchPricingValidation" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchPricingValidation' AND policyname='sketchpv_service_role') THEN
    CREATE POLICY "sketchpv_service_role" ON "SketchPricingValidation" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SketchWarningFlag" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SketchWarningFlag' AND policyname='sketchflag_service_role') THEN
    CREATE POLICY "sketchflag_service_role" ON "SketchWarningFlag" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTRACT / DOCUMENT / SIGNATURE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Contract' AND policyname='contract_service_role') THEN
    CREATE POLICY "contract_service_role" ON "Contract" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Contract' AND policyname='contract_scope') THEN
    CREATE POLICY "contract_scope" ON "Contract"
      FOR ALL TO authenticated
      USING (user_owns_appointment("appointmentId"))
      WITH CHECK (user_owns_appointment("appointmentId"));
  END IF;
END $$;

ALTER TABLE "Signature" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Signature' AND policyname='signature_service_role') THEN
    CREATE POLICY "signature_service_role" ON "Signature" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Payment' AND policyname='payment_service_role') THEN
    CREATE POLICY "payment_service_role" ON "Payment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "FormInstance" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='FormInstance' AND policyname='form_service_role') THEN
    CREATE POLICY "form_service_role" ON "FormInstance" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "FormSketch" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='FormSketch' AND policyname='formsketch_service_role') THEN
    CREATE POLICY "formsketch_service_role" ON "FormSketch" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "DocumentAcknowledgment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='DocumentAcknowledgment' AND policyname='docack_service_role') THEN
    CREATE POLICY "docack_service_role" ON "DocumentAcknowledgment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "DocumentExportLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='DocumentExportLog' AND policyname='doclog_service_role') THEN
    CREATE POLICY "doclog_service_role" ON "DocumentExportLog" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "CustomerDocumentPacket" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CustomerDocumentPacket' AND policyname='cdp_service_role') THEN
    CREATE POLICY "cdp_service_role" ON "CustomerDocumentPacket" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AI CREDIT SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "AiCreditAccount" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiCreditAccount' AND policyname='aicredit_service_role') THEN
    CREATE POLICY "aicredit_service_role" ON "AiCreditAccount" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiCreditAccount' AND policyname='aicredit_company_read') THEN
    CREATE POLICY "aicredit_company_read" ON "AiCreditAccount"
      FOR SELECT TO authenticated
      USING ("companyId" = get_user_company_id());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiCreditAccount' AND policyname='aicredit_admin_write') THEN
    CREATE POLICY "aicredit_admin_write" ON "AiCreditAccount"
      FOR ALL TO authenticated
      USING (user_is_admin_or_manager() AND "companyId" = get_user_company_id())
      WITH CHECK (user_is_admin_or_manager() AND "companyId" = get_user_company_id());
  END IF;
END $$;

ALTER TABLE "AiUsageEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiUsageEvent' AND policyname='aiusage_service_role') THEN
    CREATE POLICY "aiusage_service_role" ON "AiUsageEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiUsageEvent' AND policyname='aiusage_user_read') THEN
    CREATE POLICY "aiusage_user_read" ON "AiUsageEvent"
      FOR SELECT TO authenticated
      USING (
        "userId" = auth.uid()::text
        OR (user_is_admin_or_manager() AND "companyId" = get_user_company_id())
      );
  END IF;
END $$;

ALTER TABLE "AiFeatureLimit" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiFeatureLimit' AND policyname='aifeat_service_role') THEN
    CREATE POLICY "aifeat_service_role" ON "AiFeatureLimit" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiFeatureLimit' AND policyname='aifeat_authenticated_read') THEN
    CREATE POLICY "aifeat_authenticated_read" ON "AiFeatureLimit"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

ALTER TABLE "AiCacheEntry" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiCacheEntry' AND policyname='aicache_service_role') THEN
    CREATE POLICY "aicache_service_role" ON "AiCacheEntry" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "AiUpgradeLink" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiUpgradeLink' AND policyname='aiupgrade_service_role') THEN
    CREATE POLICY "aiupgrade_service_role" ON "AiUpgradeLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiUpgradeLink' AND policyname='aiupgrade_authenticated_read') THEN
    CREATE POLICY "aiupgrade_authenticated_read" ON "AiUpgradeLink"
      FOR SELECT TO authenticated USING ("isActive" = true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VOICE / AI SESSION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "VoiceSession" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='VoiceSession' AND policyname='voicesession_service_role') THEN
    CREATE POLICY "voicesession_service_role" ON "VoiceSession" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='VoiceSession' AND policyname='voicesession_user_scope') THEN
    CREATE POLICY "voicesession_user_scope" ON "VoiceSession"
      FOR ALL TO authenticated
      USING ("userId" = auth.uid()::text)
      WITH CHECK ("userId" = auth.uid()::text);
  END IF;
END $$;

ALTER TABLE "VoiceTranscript" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='VoiceTranscript' AND policyname='voicetrans_service_role') THEN
    CREATE POLICY "voicetrans_service_role" ON "VoiceTranscript" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "VoiceExtractedEntity" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='VoiceExtractedEntity' AND policyname='voiceentity_service_role') THEN
    CREATE POLICY "voiceentity_service_role" ON "VoiceExtractedEntity" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "AiChatSession" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiChatSession' AND policyname='chatsession_service_role') THEN
    CREATE POLICY "chatsession_service_role" ON "AiChatSession" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiChatSession' AND policyname='chatsession_user_scope') THEN
    CREATE POLICY "chatsession_user_scope" ON "AiChatSession"
      FOR ALL TO authenticated
      USING ("userId" = auth.uid()::text)
      WITH CHECK ("userId" = auth.uid()::text);
  END IF;
END $$;

ALTER TABLE "AiChatMessage" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiChatMessage' AND policyname='chatmsg_service_role') THEN
    CREATE POLICY "chatmsg_service_role" ON "AiChatMessage" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "AiValidationWarning" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AiValidationWarning' AND policyname='aiwarning_service_role') THEN
    CREATE POLICY "aiwarning_service_role" ON "AiValidationWarning" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMISSION / PERFORMANCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "CommissionRecord" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionRecord' AND policyname='commission_service_role') THEN
    CREATE POLICY "commission_service_role" ON "CommissionRecord" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionRecord' AND policyname='commission_user_scope') THEN
    CREATE POLICY "commission_user_scope" ON "CommissionRecord"
      FOR SELECT TO authenticated
      USING (
        "userId" = auth.uid()::text
        OR (user_is_admin_or_manager() AND EXISTS (
          SELECT 1 FROM "User" u WHERE u.id = "CommissionRecord"."userId"
            AND u."companyId" = get_user_company_id()
        ))
      );
  END IF;
END $$;

ALTER TABLE "CommissionAdjustment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionAdjustment' AND policyname='commadj_service_role') THEN
    CREATE POLICY "commadj_service_role" ON "CommissionAdjustment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "CommissionPayment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionPayment' AND policyname='commpay_service_role') THEN
    CREATE POLICY "commpay_service_role" ON "CommissionPayment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "CommissionImport" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionImport' AND policyname='commimp_service_role') THEN
    CREATE POLICY "commimp_service_role" ON "CommissionImport" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "CommissionImportRow" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionImportRow' AND policyname='commimprow_service_role') THEN
    CREATE POLICY "commimprow_service_role" ON "CommissionImportRow" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "CommissionRecordLink" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CommissionRecordLink' AND policyname='commlink_service_role') THEN
    CREATE POLICY "commlink_service_role" ON "CommissionRecordLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "RepPerformance" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='RepPerformance' AND policyname='repperf_service_role') THEN
    CREATE POLICY "repperf_service_role" ON "RepPerformance" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT / LOG TABLES (service role write-only)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AuditLog' AND policyname='audit_service_role') THEN
    CREATE POLICY "audit_service_role" ON "AuditLog" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "BusinessRuleExecutionLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='BusinessRuleExecutionLog' AND policyname='rulelog_service_role') THEN
    CREATE POLICY "rulelog_service_role" ON "BusinessRuleExecutionLog" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "MeasurementRuleExecutionLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementRuleExecutionLog' AND policyname='measrulelog_service_role') THEN
    CREATE POLICY "measrulelog_service_role" ON "MeasurementRuleExecutionLog" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "AppointmentTimelineEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AppointmentTimelineEvent' AND policyname='timeline_service_role') THEN
    CREATE POLICY "timeline_service_role" ON "AppointmentTimelineEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- WALKTHROUGH / MEASUREMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "MeasurementAdjustment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementAdjustment' AND policyname='measadj_service_role') THEN
    CREATE POLICY "measadj_service_role" ON "MeasurementAdjustment" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "MeasurementCapturePhoto" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementCapturePhoto' AND policyname='meascap_service_role') THEN
    CREATE POLICY "meascap_service_role" ON "MeasurementCapturePhoto" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "MeasurementPhotoRead" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementPhotoRead' AND policyname='measread_service_role') THEN
    CREATE POLICY "measread_service_role" ON "MeasurementPhotoRead" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "WalkthroughSession" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WalkthroughSession' AND policyname='walkthrough_service_role') THEN
    CREATE POLICY "walkthrough_service_role" ON "WalkthroughSession" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "WalkthroughRoom" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WalkthroughRoom' AND policyname='walkroom_service_role') THEN
    CREATE POLICY "walkroom_service_role" ON "WalkthroughRoom" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "WalkthroughRoomNote" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WalkthroughRoomNote' AND policyname='walknote_service_role') THEN
    CREATE POLICY "walknote_service_role" ON "WalkthroughRoomNote" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "WalkthroughRoomOpening" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WalkthroughRoomOpening' AND policyname='walkopening_service_role') THEN
    CREATE POLICY "walkopening_service_role" ON "WalkthroughRoomOpening" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SpecialtyMeasurementSession" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SpecialtyMeasurementSession' AND policyname='specmeas_service_role') THEN
    CREATE POLICY "specmeas_service_role" ON "SpecialtyMeasurementSession" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SpecialtyMeasurementValue" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SpecialtyMeasurementValue' AND policyname='specval_service_role') THEN
    CREATE POLICY "specval_service_role" ON "SpecialtyMeasurementValue" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE "SpecialtyMeasurementValidation" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='SpecialtyMeasurementValidation' AND policyname='specvalid_service_role') THEN
    CREATE POLICY "specvalid_service_role" ON "SpecialtyMeasurementValidation" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GLOBAL REFERENCE / PRICING / RULE TABLES (authenticated read, service write)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "PricingTable" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingTable' AND policyname='pricingtable_service_role') THEN CREATE POLICY "pricingtable_service_role" ON "PricingTable" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingTable' AND policyname='pricingtable_read') THEN CREATE POLICY "pricingtable_read" ON "PricingTable" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "PricingItem" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingItem' AND policyname='pricingitem_service_role') THEN CREATE POLICY "pricingitem_service_role" ON "PricingItem" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingItem' AND policyname='pricingitem_read') THEN CREATE POLICY "pricingitem_read" ON "PricingItem" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "PricingVersion" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingVersion' AND policyname='pricingver_service_role') THEN CREATE POLICY "pricingver_service_role" ON "PricingVersion" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingVersion' AND policyname='pricingver_read') THEN CREATE POLICY "pricingver_read" ON "PricingVersion" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "PricingVersionItem" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingVersionItem' AND policyname='pricingveritem_service_role') THEN CREATE POLICY "pricingveritem_service_role" ON "PricingVersionItem" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingVersionItem' AND policyname='pricingveritem_read') THEN CREATE POLICY "pricingveritem_read" ON "PricingVersionItem" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "PricingImport" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingImport' AND policyname='pricingimp_service_role') THEN CREATE POLICY "pricingimp_service_role" ON "PricingImport" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "PricingImportRow" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='PricingImportRow' AND policyname='pricingimprow_service_role') THEN CREATE POLICY "pricingimprow_service_role" ON "PricingImportRow" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "BusinessRule" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='BusinessRule' AND policyname='biz_service_role') THEN CREATE POLICY "biz_service_role" ON "BusinessRule" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='BusinessRule' AND policyname='biz_read') THEN CREATE POLICY "biz_read" ON "BusinessRule" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "MeasurementRule" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementRule' AND policyname='measrule_service_role') THEN CREATE POLICY "measrule_service_role" ON "MeasurementRule" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MeasurementRule' AND policyname='measrule_read') THEN CREATE POLICY "measrule_read" ON "MeasurementRule" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "FinanceOption" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='FinanceOption' AND policyname='finance_service_role') THEN CREATE POLICY "finance_service_role" ON "FinanceOption" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='FinanceOption' AND policyname='finance_read') THEN CREATE POLICY "finance_read" ON "FinanceOption" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "OpeningTemplate" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningTemplate' AND policyname='template_service_role') THEN CREATE POLICY "template_service_role" ON "OpeningTemplate" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningTemplate' AND policyname='template_read') THEN CREATE POLICY "template_read" ON "OpeningTemplate" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "OpeningTemplateUsageLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningTemplateUsageLog' AND policyname='templatelog_service_role') THEN CREATE POLICY "templatelog_service_role" ON "OpeningTemplateUsageLog" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "ReferenceDocument" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ReferenceDocument' AND policyname='refdoc_service_role') THEN CREATE POLICY "refdoc_service_role" ON "ReferenceDocument" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ReferenceDocument' AND policyname='refdoc_read') THEN CREATE POLICY "refdoc_read" ON "ReferenceDocument" FOR SELECT TO authenticated USING (true); END IF; END $$;

ALTER TABLE "MissingPricingRule" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MissingPricingRule' AND policyname='missingprice_service_role') THEN CREATE POLICY "missingprice_service_role" ON "MissingPricingRule" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "QuoteLineItem" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='QuoteLineItem' AND policyname='quoteitem_service_role') THEN CREATE POLICY "quoteitem_service_role" ON "QuoteLineItem" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "HouseMap" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='HouseMap' AND policyname='housemap_service_role') THEN CREATE POLICY "housemap_service_role" ON "HouseMap" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "HouseMapMarker" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='HouseMapMarker' AND policyname='housemarker_service_role') THEN CREATE POLICY "housemarker_service_role" ON "HouseMapMarker" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "AppointmentQualityScore" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AppointmentQualityScore' AND policyname='apptquality_service_role') THEN CREATE POLICY "apptquality_service_role" ON "AppointmentQualityScore" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "AppointmentFinanceSelection" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AppointmentFinanceSelection' AND policyname='apptfinance_service_role') THEN CREATE POLICY "apptfinance_service_role" ON "AppointmentFinanceSelection" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "TemperedGlazingFlag" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='TemperedGlazingFlag' AND policyname='tempered_service_role') THEN CREATE POLICY "tempered_service_role" ON "TemperedGlazingFlag" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "AuditorIssue" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AuditorIssue' AND policyname='auditor_service_role') THEN CREATE POLICY "auditor_service_role" ON "AuditorIssue" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "CallbackRiskScore" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='CallbackRiskScore' AND policyname='callback_service_role') THEN CREATE POLICY "callback_service_role" ON "CallbackRiskScore" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "InstallerClarityScore" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='InstallerClarityScore' AND policyname='installer_service_role') THEN CREATE POLICY "installer_service_role" ON "InstallerClarityScore" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "LeadDisclosureReview" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='LeadDisclosureReview' AND policyname='leaddisclosure_service_role') THEN CREATE POLICY "leaddisclosure_service_role" ON "LeadDisclosureReview" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "MobileOfflineDraft" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MobileOfflineDraft' AND policyname='draft_service_role') THEN CREATE POLICY "draft_service_role" ON "MobileOfflineDraft" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MobileOfflineDraft' AND policyname='draft_user_scope') THEN CREATE POLICY "draft_user_scope" ON "MobileOfflineDraft" FOR ALL TO authenticated USING ("userId" = auth.uid()::text) WITH CHECK ("userId" = auth.uid()::text); END IF; END $$;

ALTER TABLE "MobileSyncQueue" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='MobileSyncQueue' AND policyname='syncqueue_service_role') THEN CREATE POLICY "syncqueue_service_role" ON "MobileSyncQueue" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "WorkbookTemplate" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WorkbookTemplate' AND policyname='wbtemplate_service_role') THEN CREATE POLICY "wbtemplate_service_role" ON "WorkbookTemplate" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "WorkbookTemplateVersion" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WorkbookTemplateVersion' AND policyname='wbtempver_service_role') THEN CREATE POLICY "wbtempver_service_role" ON "WorkbookTemplateVersion" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "WorkbookExportJob" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WorkbookExportJob' AND policyname='wbexport_service_role') THEN CREATE POLICY "wbexport_service_role" ON "WorkbookExportJob" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "WorkbookFieldMapping" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WorkbookFieldMapping' AND policyname='wbfieldmap_service_role') THEN CREATE POLICY "wbfieldmap_service_role" ON "WorkbookFieldMapping" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "WorkbookFieldValue" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='WorkbookFieldValue' AND policyname='wbfieldval_service_role') THEN CREATE POLICY "wbfieldval_service_role" ON "WorkbookFieldValue" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;

ALTER TABLE "OpeningSafetyGlazingReview" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='OpeningSafetyGlazingReview' AND policyname='glazing_service_role') THEN CREATE POLICY "glazing_service_role" ON "OpeningSafetyGlazingReview" FOR ALL TO service_role USING (true) WITH CHECK (true); END IF; END $$;
