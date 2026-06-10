-- ════════════════════════════════════════════════════════════════
-- Migration: Multi-Tenant RLS + Storage Buckets
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/pwzrhpdfityxloacqxvz/sql/new
-- ════════════════════════════════════════════════════════════════
--
-- This migration:
-- 1. Creates private storage buckets for sketch exports and generated documents
-- 2. Enables Row-Level Security (RLS) on SketchExport and GeneratedDocument tables
-- 3. Adds company-isolation RLS policies to both tables
-- 4. Adds storage bucket policies restricting access to authenticated users only
-- ════════════════════════════════════════════════════════════════

-- ── STORAGE BUCKETS ────────────────────────────────────────────────────────────

-- Create sketch-exports bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sketch-exports',
  'sketch-exports',
  false,           -- PRIVATE: no public read
  10485760,        -- 10MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create generated-documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-documents',
  'generated-documents',
  false,           -- PRIVATE: no public read
  52428800,        -- 50MB max per file (XLSX/PDF can be large)
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── ROW LEVEL SECURITY — SketchExport ─────────────────────────────────────────

-- Enable RLS
ALTER TABLE public."SketchExport" ENABLE ROW LEVEL SECURITY;

-- Company-isolation policy: users can only see/modify their own company's sketch exports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'SketchExport'
      AND policyname = 'SketchExport: company isolation'
  ) THEN
    CREATE POLICY "SketchExport: company isolation"
    ON public."SketchExport"
    FOR ALL
    USING (
      "companyId" IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
          AND "companyId" IS NOT NULL
      )
    )
    WITH CHECK (
      "companyId" IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
          AND "companyId" IS NOT NULL
      )
    );
  END IF;
END $$;

-- ── ROW LEVEL SECURITY — GeneratedDocument ────────────────────────────────────

-- Enable RLS
ALTER TABLE public."GeneratedDocument" ENABLE ROW LEVEL SECURITY;

-- Company-isolation policy: users can only see/modify their own company's documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'GeneratedDocument'
      AND policyname = 'GeneratedDocument: company isolation'
  ) THEN
    CREATE POLICY "GeneratedDocument: company isolation"
    ON public."GeneratedDocument"
    FOR ALL
    USING (
      "companyId" IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
          AND "companyId" IS NOT NULL
      )
    )
    WITH CHECK (
      "companyId" IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
          AND "companyId" IS NOT NULL
      )
    );
  END IF;
END $$;

-- ── STORAGE POLICIES — sketch-exports bucket ──────────────────────────────────

-- NOTE: Storage policies use a different syntax (storage.objects table).
-- These policies ensure only authenticated users with correct companyId can access files.
-- Path format: company/{companyId}/appointments/{appointmentId}/sketch/sketch-v{n}.png

-- Authenticated users can read their company's sketch exports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'sketch-exports: authenticated read own company'
  ) THEN
    CREATE POLICY "sketch-exports: authenticated read own company"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'sketch-exports'
      AND (storage.foldername(name))[1] = 'company'
      AND (storage.foldername(name))[2] IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
      )
    );
  END IF;
END $$;

-- Service role (backend) can insert/update sketch exports
-- (Backend uses service role key which bypasses RLS — this policy is for completeness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'sketch-exports: service role full access'
  ) THEN
    CREATE POLICY "sketch-exports: service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'sketch-exports');
  END IF;
END $$;

-- ── STORAGE POLICIES — generated-documents bucket ────────────────────────────

-- Authenticated users can read their company's generated documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'generated-documents: authenticated read own company'
  ) THEN
    CREATE POLICY "generated-documents: authenticated read own company"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'generated-documents'
      AND (storage.foldername(name))[1] = 'company'
      AND (storage.foldername(name))[2] IN (
        SELECT "companyId" FROM public."User"
        WHERE id = auth.uid()::text
      )
    );
  END IF;
END $$;

-- Service role (backend) can insert/update generated documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'generated-documents: service role full access'
  ) THEN
    CREATE POLICY "generated-documents: service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'generated-documents');
  END IF;
END $$;

-- ── VERIFICATION QUERIES ──────────────────────────────────────────────────────

-- Run these to verify the migration succeeded:
SELECT id, name, public FROM storage.buckets WHERE id IN ('sketch-exports', 'generated-documents');
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('SketchExport', 'GeneratedDocument');
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%sketch-exports%' OR policyname LIKE '%generated-documents%';
