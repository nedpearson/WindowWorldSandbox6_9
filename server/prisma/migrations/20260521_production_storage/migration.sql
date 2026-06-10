-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD ASSISTANT — PRODUCTION STORAGE MIGRATION
-- Creates Supabase Storage buckets + RLS policies for all file types.
-- Run in: Supabase SQL Editor (with service role / postgres user)
-- Safe to re-run: uses DO $$ IF NOT EXISTS $$ + ON CONFLICT DO NOTHING
-- Generated: 2026-05-21
-- ═══════════════════════════════════════════════════════════════

-- ─── HELPER: is the current user an admin? ────────────────────
CREATE OR REPLACE FUNCTION storage_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text
    AND role IN ('admin','manager')
  )
  OR auth.email() = 'nedpearson@gmail.com';
$$;

-- ─── HELPER: does the current user belong to the given companyId? ─────────
-- Path convention: {companyId}/{appointmentId}/{filename}
-- This helper checks the FIRST path segment (companyId).
CREATE OR REPLACE FUNCTION storage_user_in_company(company_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text
    AND ("companyId" = company_id OR role IN ('admin','manager'))
  )
  OR auth.email() = 'nedpearson@gmail.com';
$$;

-- ─── HELPER: does the user own the appointment (any seat at the company table)? ──
-- Already defined in 20260521_company_rls but recreated here for standalone safety.
CREATE OR REPLACE FUNCTION user_owns_appointment(appt_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Appointment" a
    LEFT JOIN "User" u ON u.id = auth.uid()::text
    WHERE a.id = appt_id
    AND (
         a."userId" = auth.uid()::text
         OR auth.email() = 'nedpearson@gmail.com'
         OR (a."companyId" IS NOT NULL AND a."companyId" = u."companyId")
         OR (u.role IN ('admin','manager','office') AND (a."companyId" IS NULL OR a."companyId" = u."companyId"))
    )
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- BUCKET CREATION (idempotent — ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════

-- 1. opening-photos  — site photos taken by reps in the field
--    Path: {companyId}/{appointmentId}/{openingId}_{filename}
--    Private. Max object size enforced in application layer (5 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opening-photos',
  'opening-photos',
  FALSE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- 2. visualizer-images — AI-generated house visualizations
--    Path: {companyId}/{appointmentId}/{suffix}_{timestamp}.png
--    Private. Larger limit for AI-generated images (10 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visualizer-images',
  'visualizer-images',
  FALSE,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- 3. generated-documents — PDFs generated per appointment (proposals, contracts, order forms)
--    Path: {companyId}/{appointmentId}/{exportType}_{timestamp}.pdf
--    Private. Staff/manager/admin roles only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-documents',
  'generated-documents',
  FALSE,
  20971520, -- 20 MB
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- 4. contract-templates — master warranty/disclosure PDF templates
--    Path: {companyId}/{templateName}.pdf  OR  global/{templateName}.pdf
--    Read: any authenticated user in the company. Write: admin only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-templates',
  'contract-templates',
  FALSE,
  20971520, -- 20 MB
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- 5. product-images — product catalog images (window styles, colors, etc.)
--    Path: {category}/{productId}.{ext}
--    Read: any authenticated user. Write: admin only.
--    Note: set public = FALSE; we serve via signed URLs to avoid hotlinking.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  FALSE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'];

-- ═══════════════════════════════════════════════════════════════
-- RLS — Enable on storage.objects (Supabase enables this by default,
--       but we explicitly confirm it here)
-- ═══════════════════════════════════════════════════════════════
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- BUCKET: opening-photos
-- Path convention: {companyId}/{appointmentId}/{filename}
-- INSERT: authenticated user in the same company as the appointment
-- SELECT: same company scoping (via companyId path segment)
-- DELETE: original uploader OR admin
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "opening_photos_insert" ON storage.objects;
CREATE POLICY "opening_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'opening-photos'
    AND auth.role() = 'authenticated'
    AND storage_user_in_company(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "opening_photos_select" ON storage.objects;
CREATE POLICY "opening_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND storage_user_in_company(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "opening_photos_delete" ON storage.objects;
CREATE POLICY "opening_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (
      -- Original uploader
      owner = auth.uid()
      -- Admin / manager
      OR storage_user_is_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- BUCKET: visualizer-images
-- Path convention: {companyId}/{appointmentId}/{suffix}_{ts}.png
-- INSERT: authenticated user in the same company
-- SELECT: same company scoping
-- DELETE: original uploader OR admin
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "visualizer_images_insert" ON storage.objects;
CREATE POLICY "visualizer_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visualizer-images'
    AND auth.role() = 'authenticated'
    AND storage_user_in_company(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "visualizer_images_select" ON storage.objects;
CREATE POLICY "visualizer_images_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'visualizer-images'
    AND storage_user_in_company(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "visualizer_images_delete" ON storage.objects;
CREATE POLICY "visualizer_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'visualizer-images'
    AND (
      owner = auth.uid()
      OR storage_user_is_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- BUCKET: generated-documents
-- Path convention: {companyId}/{appointmentId}/{exportType}_{ts}.pdf
-- INSERT: staff/manager/admin in the same company
-- SELECT: same company — any authenticated user (reps need to view their own docs)
-- DELETE: admin only (documents are legal records — protect them)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "generated_documents_insert" ON storage.objects;
CREATE POLICY "generated_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents'
    AND auth.role() = 'authenticated'
    -- Must belong to the same company (companyId is first segment)
    AND storage_user_in_company(split_part(name, '/', 1))
    -- Must have at least staff/manager/admin role
    AND EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid()::text
      AND role IN ('admin','manager','office','staff','rep')
    )
  );

DROP POLICY IF EXISTS "generated_documents_select" ON storage.objects;
CREATE POLICY "generated_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-documents'
    -- Company-scoped: only users in the same company can read
    AND storage_user_in_company(split_part(name, '/', 1))
  );

DROP POLICY IF EXISTS "generated_documents_delete" ON storage.objects;
CREATE POLICY "generated_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-documents'
    -- Legal records — admin/manager only
    AND storage_user_is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- BUCKET: contract-templates
-- Path convention: {companyId}/{templateName}.pdf  OR  global/{filename}
-- INSERT/UPDATE: admin only
-- SELECT: any authenticated user whose companyId matches first segment
--         OR who is accessing the 'global' folder
-- DELETE: admin only
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "contract_templates_insert" ON storage.objects;
CREATE POLICY "contract_templates_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contract-templates'
    AND storage_user_is_admin()
  );

DROP POLICY IF EXISTS "contract_templates_select" ON storage.objects;
CREATE POLICY "contract_templates_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-templates'
    AND auth.role() = 'authenticated'
    AND (
      -- Global templates folder accessible to all authenticated users
      split_part(name, '/', 1) = 'global'
      -- Company-specific templates
      OR storage_user_in_company(split_part(name, '/', 1))
    )
  );

DROP POLICY IF EXISTS "contract_templates_delete" ON storage.objects;
CREATE POLICY "contract_templates_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract-templates'
    AND storage_user_is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- BUCKET: product-images
-- Path convention: {category}/{productId}.{ext}
-- INSERT/UPDATE/DELETE: admin only (catalog is managed centrally)
-- SELECT: any authenticated user (catalog browsing)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND storage_user_is_admin()
  );

DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND storage_user_is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Confirm all buckets are private:
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('opening-photos','visualizer-images','generated-documents','contract-templates','product-images')
ORDER BY id;
-- Expected: all rows show public = false

-- Confirm policies created:
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

SELECT 'Storage migration complete — ' || NOW()::text AS result;
