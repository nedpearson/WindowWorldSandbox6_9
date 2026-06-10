-- Rename tables
ALTER TABLE "PropertyVisionProfile" RENAME TO "PropertyResearchProfile";
ALTER TABLE "PropertyVisualSource" RENAME TO "PropertyResearchSource";
ALTER TABLE "WindowVisionSuggestion" RENAME TO "OpeningSuggestion";
ALTER TABLE "QuickQuoteVisionSession" RENAME TO "QuickQuoteResearchSession";

-- Fix Constraints due to rename (Wait, Postgres handles constraints renaming automatically or they still work, but to be clean with Prisma, we can rename the PKs and FKs if we want. Prisma might complain on drift if the constraint names don't match, so let's rename them).

ALTER TABLE "PropertyResearchProfile" RENAME CONSTRAINT "PropertyVisionProfile_pkey" TO "PropertyResearchProfile_pkey";
ALTER TABLE "PropertyResearchSource" RENAME CONSTRAINT "PropertyVisualSource_pkey" TO "PropertyResearchSource_pkey";
ALTER TABLE "OpeningSuggestion" RENAME CONSTRAINT "WindowVisionSuggestion_pkey" TO "OpeningSuggestion_pkey";
ALTER TABLE "QuickQuoteResearchSession" RENAME CONSTRAINT "QuickQuoteVisionSession_pkey" TO "QuickQuoteResearchSession_pkey";

-- PropertyResearchProfile modifications
ALTER TABLE "PropertyResearchProfile" DROP COLUMN IF EXISTS "locationType";
ALTER TABLE "PropertyResearchProfile" DROP COLUMN IF EXISTS "availableViewsJson";
ALTER TABLE "PropertyResearchProfile" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "formattedAddress" DROP NOT NULL;
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "lng" DROP NOT NULL;
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "confidence" DROP DEFAULT;
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION USING (
  CASE 
    WHEN confidence ~ '^[0-9\.]+$' THEN confidence::double precision 
    ELSE 0 
  END
);
ALTER TABLE "PropertyResearchProfile" ALTER COLUMN "confidence" SET DEFAULT 0;

-- PropertyResearchSource modifications
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "snippet" TEXT;
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "licenseStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "PropertyResearchSource" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "heading";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "pitch";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "fov";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "imageDate";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "imageHash";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "available";
ALTER TABLE "PropertyResearchSource" DROP COLUMN IF EXISTS "errorMessage";

-- OpeningSuggestion modifications
ALTER TABLE "OpeningSuggestion" DROP COLUMN IF EXISTS "visualSourceId";
ALTER TABLE "OpeningSuggestion" DROP COLUMN IF EXISTS "suggestedType";
ALTER TABLE "OpeningSuggestion" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "openingType" TEXT NOT NULL DEFAULT 'window';
ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "subtype" TEXT;
ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "reasoning" TEXT;
ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "evidenceJson" JSONB;
ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "bboxJson_new" JSONB;
UPDATE "OpeningSuggestion" SET "bboxJson_new" = "bboxJson"::jsonb WHERE "bboxJson" IS NOT NULL AND "bboxJson" != '';
ALTER TABLE "OpeningSuggestion" DROP COLUMN "bboxJson";
ALTER TABLE "OpeningSuggestion" RENAME COLUMN "bboxJson_new" TO "bboxJson";

ALTER TABLE "OpeningSuggestion" ADD COLUMN IF NOT EXISTS "finalQuoteEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OpeningSuggestion" ALTER COLUMN "elevation" DROP NOT NULL;
ALTER TABLE "OpeningSuggestion" ALTER COLUMN "confidence" SET DEFAULT 0;

-- QuickQuoteResearchSession modifications
ALTER TABLE "QuickQuoteResearchSession" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "QuickQuoteResearchSession" ADD COLUMN IF NOT EXISTS "assumptionsJson_new" JSONB;
UPDATE "QuickQuoteResearchSession" SET "assumptionsJson_new" = "assumptionsJson"::jsonb WHERE "assumptionsJson" IS NOT NULL AND "assumptionsJson" != '';
ALTER TABLE "QuickQuoteResearchSession" DROP COLUMN "assumptionsJson";
ALTER TABLE "QuickQuoteResearchSession" RENAME COLUMN "assumptionsJson_new" TO "assumptionsJson";


-- Create PropertyResearchImage
CREATE TABLE IF NOT EXISTS "PropertyResearchImage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT NOT NULL,
    "imageUrl" TEXT,
    "storagePath" TEXT,
    "imageHash" TEXT,
    "licenseStatus" TEXT NOT NULL DEFAULT 'unknown',
    "metadataJson" JSONB,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyResearchImage_pkey" PRIMARY KEY ("id")
);

-- Create OpeningEvidence
CREATE TABLE IF NOT EXISTS "OpeningEvidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpeningEvidence_pkey" PRIMARY KEY ("id")
);

-- RLS POLICIES

-- PropertyResearchProfile
ALTER TABLE "PropertyResearchProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_profile_select" ON "PropertyResearchProfile" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchProfile"."companyId") OR auth.uid()::text IN (SELECT id FROM "User" WHERE role = 'super_admin'));
CREATE POLICY "company_scoped_profile_insert" ON "PropertyResearchProfile" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchProfile"."companyId") OR auth.uid()::text IN (SELECT id FROM "User" WHERE role = 'super_admin'));
CREATE POLICY "company_scoped_profile_update" ON "PropertyResearchProfile" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchProfile"."companyId") OR auth.uid()::text IN (SELECT id FROM "User" WHERE role = 'super_admin'));
CREATE POLICY "company_scoped_profile_delete" ON "PropertyResearchProfile" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchProfile"."companyId") OR auth.uid()::text IN (SELECT id FROM "User" WHERE role = 'super_admin'));

-- PropertyResearchSource
ALTER TABLE "PropertyResearchSource" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_source_select" ON "PropertyResearchSource" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchSource"."companyId"));
CREATE POLICY "company_scoped_source_insert" ON "PropertyResearchSource" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchSource"."companyId"));
CREATE POLICY "company_scoped_source_update" ON "PropertyResearchSource" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchSource"."companyId"));
CREATE POLICY "company_scoped_source_delete" ON "PropertyResearchSource" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchSource"."companyId"));

-- PropertyResearchImage
ALTER TABLE "PropertyResearchImage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_image_select" ON "PropertyResearchImage" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchImage"."companyId"));
CREATE POLICY "company_scoped_image_insert" ON "PropertyResearchImage" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchImage"."companyId"));
CREATE POLICY "company_scoped_image_update" ON "PropertyResearchImage" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchImage"."companyId"));
CREATE POLICY "company_scoped_image_delete" ON "PropertyResearchImage" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "PropertyResearchImage"."companyId"));

-- OpeningSuggestion
ALTER TABLE "OpeningSuggestion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_suggestion_select" ON "OpeningSuggestion" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningSuggestion"."companyId"));
CREATE POLICY "company_scoped_suggestion_insert" ON "OpeningSuggestion" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningSuggestion"."companyId"));
CREATE POLICY "company_scoped_suggestion_update" ON "OpeningSuggestion" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningSuggestion"."companyId"));
CREATE POLICY "company_scoped_suggestion_delete" ON "OpeningSuggestion" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningSuggestion"."companyId"));

-- OpeningEvidence
ALTER TABLE "OpeningEvidence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_evidence_select" ON "OpeningEvidence" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningEvidence"."companyId"));
CREATE POLICY "company_scoped_evidence_insert" ON "OpeningEvidence" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningEvidence"."companyId"));
CREATE POLICY "company_scoped_evidence_update" ON "OpeningEvidence" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningEvidence"."companyId"));
CREATE POLICY "company_scoped_evidence_delete" ON "OpeningEvidence" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "OpeningEvidence"."companyId"));

-- QuickQuoteResearchSession
ALTER TABLE "QuickQuoteResearchSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_scoped_session_select" ON "QuickQuoteResearchSession" FOR SELECT USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "QuickQuoteResearchSession"."companyId"));
CREATE POLICY "company_scoped_session_insert" ON "QuickQuoteResearchSession" FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "QuickQuoteResearchSession"."companyId"));
CREATE POLICY "company_scoped_session_update" ON "QuickQuoteResearchSession" FOR UPDATE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "QuickQuoteResearchSession"."companyId"));
CREATE POLICY "company_scoped_session_delete" ON "QuickQuoteResearchSession" FOR DELETE USING (auth.uid()::text IN (SELECT id FROM "User" WHERE "companyId" = "QuickQuoteResearchSession"."companyId"));
