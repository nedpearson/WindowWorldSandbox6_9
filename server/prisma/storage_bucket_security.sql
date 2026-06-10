-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD ASSISTANT — STORAGE BUCKET SECURITY MIGRATION
-- Run this in the Supabase SQL editor (Storage section)
-- ═══════════════════════════════════════════════════════════════

-- ─── Create buckets if missing ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('wwa-opening-photos',   'wwa-opening-photos',   FALSE),
  ('wwa-form-exports',     'wwa-form-exports',      FALSE),
  ('wwa-voice-recordings', 'wwa-voice-recordings',  FALSE),
  ('wwa-sketches',         'wwa-sketches',           FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;
-- Note: All 4 buckets are private (public = FALSE).
-- Public access is NEVER accidentally enabled.

-- ─── Helper: appointment ownership check (reuse from master) ──
-- user_owns_appointment() is already defined in master_supabase_migration.sql.
-- If running standalone, copy that function here first.

-- ═══════════════════════════════════════════════════════════════
-- OPENING PHOTOS — wwa-opening-photos
-- Path format: {appointmentId}/{openingId}/{filename}
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "photos_select" ON storage.objects;
CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'wwa-opening-photos'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "photos_insert" ON storage.objects;
CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wwa-opening-photos'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "photos_delete" ON storage.objects;
CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'wwa-opening-photos'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

-- ═══════════════════════════════════════════════════════════════
-- FORM EXPORTS — wwa-form-exports
-- Path format: {appointmentId}/{exportType}/{filename}.pdf
-- Only the owning rep or admin can see their exports.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "exports_select" ON storage.objects;
CREATE POLICY "exports_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'wwa-form-exports'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "exports_insert" ON storage.objects;
CREATE POLICY "exports_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wwa-form-exports'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "exports_delete" ON storage.objects;
CREATE POLICY "exports_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'wwa-form-exports'
    AND (
      user_owns_appointment(split_part(name, '/', 1))
      OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- VOICE RECORDINGS — wwa-voice-recordings
-- Path format: {appointmentId}/{sessionId}/{filename}
-- Strictly private — only rep who owns the appointment.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "recordings_select" ON storage.objects;
CREATE POLICY "recordings_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'wwa-voice-recordings'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "recordings_insert" ON storage.objects;
CREATE POLICY "recordings_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wwa-voice-recordings'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "recordings_delete" ON storage.objects;
CREATE POLICY "recordings_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'wwa-voice-recordings'
    AND (
      user_owns_appointment(split_part(name, '/', 1))
      OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- SKETCHES — wwa-sketches
-- Path format: {appointmentId}/{filename}
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sketches_select" ON storage.objects;
CREATE POLICY "sketches_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'wwa-sketches'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "sketches_insert" ON storage.objects;
CREATE POLICY "sketches_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wwa-sketches'
    AND user_owns_appointment(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "sketches_delete" ON storage.objects;
CREATE POLICY "sketches_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'wwa-sketches'
    AND (
      user_owns_appointment(split_part(name, '/', 1))
      OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─── Verify bucket privacy ────────────────────────────────────
-- Run this to confirm all buckets are private
SELECT id, name, public FROM storage.buckets WHERE id LIKE 'wwa-%';
-- Expected: all rows show public = false

SELECT 'Storage bucket security migration complete — ' || NOW()::text AS result;
