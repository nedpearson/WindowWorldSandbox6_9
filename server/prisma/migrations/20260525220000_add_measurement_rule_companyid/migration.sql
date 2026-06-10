-- Add companyId to MeasurementRule for company scoping
-- Global rules (companyId IS NULL) are visible to all companies
-- Company-specific rules (companyId IS NOT NULL) are visible only to that company

ALTER TABLE "MeasurementRule" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- Foreign key to Company
ALTER TABLE "MeasurementRule" DROP CONSTRAINT IF EXISTS "MeasurementRule_companyId_fkey";
ALTER TABLE "MeasurementRule" ADD CONSTRAINT "MeasurementRule_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS "MeasurementRule_companyId_idx" ON "MeasurementRule"("companyId");
CREATE INDEX IF NOT EXISTS "MeasurementRule_active_idx" ON "MeasurementRule"("active");
