-- ═══════════════════════════════════════════════════════
-- RLS for mobile/AI/sync tables
-- ═══════════════════════════════════════════════════════

ALTER TABLE "MobileDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileRecording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileRecordingTranscript" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileRecordingFieldExtraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileTextNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileTextNoteExtraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileSyncQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileConflict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileOfflineDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileEditHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiFieldSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiValidationWarning" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentQualityScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinalPacketCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceFieldMapping" ENABLE ROW LEVEL SECURITY;

-- Admin override for nedpearson@gmail.com
CREATE POLICY "admin_override_MobileDevice" ON "MobileDevice" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileSession" ON "MobileSession" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileRecording" ON "MobileRecording" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileRecordingTranscript" ON "MobileRecordingTranscript" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileRecordingFieldExtraction" ON "MobileRecordingFieldExtraction" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileTextNote" ON "MobileTextNote" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileTextNoteExtraction" ON "MobileTextNoteExtraction" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileSyncQueue" ON "MobileSyncQueue" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileConflict" ON "MobileConflict" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileOfflineDraft" ON "MobileOfflineDraft" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_MobileEditHistory" ON "MobileEditHistory" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_AiFieldSuggestion" ON "AiFieldSuggestion" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_AiValidationWarning" ON "AiValidationWarning" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_AppointmentQualityScore" ON "AppointmentQualityScore" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_FinalPacketCheck" ON "FinalPacketCheck" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_override_VoiceFieldMapping" ON "VoiceFieldMapping" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');

-- Service role bypass for server-side jobs
CREATE POLICY "service_role_MobileRecording" ON "MobileRecording" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_MobileRecordingTranscript" ON "MobileRecordingTranscript" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_MobileRecordingFieldExtraction" ON "MobileRecordingFieldExtraction" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_MobileTextNote" ON "MobileTextNote" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_AiFieldSuggestion" ON "AiFieldSuggestion" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_AppointmentQualityScore" ON "AppointmentQualityScore" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_FinalPacketCheck" ON "FinalPacketCheck" FOR ALL USING (auth.role() = 'service_role');
