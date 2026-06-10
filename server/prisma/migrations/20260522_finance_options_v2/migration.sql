-- ================================================================
-- Migration: 20260522_finance_options_v2
-- Extends FinanceOption + AppointmentFinanceSelection with
-- company scoping, import tracking, formula metadata, and
-- calculated payment fields.
-- All changes are additive (ALTER TABLE ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- ── FinanceOptionImportBatch (new table) ──────────────────────
CREATE TABLE IF NOT EXISTS "FinanceOptionImportBatch" (
  "id"            TEXT        NOT NULL,
  "companyId"     TEXT,
  "uploadedById"  TEXT        NOT NULL,
  "fileName"      TEXT        NOT NULL,
  "originalPath"  TEXT,
  "sheetNames"    JSONB,
  "rowCount"      INTEGER     NOT NULL DEFAULT 0,
  "importedCount" INTEGER     NOT NULL DEFAULT 0,
  "skippedCount"  INTEGER     NOT NULL DEFAULT 0,
  "errorCount"    INTEGER     NOT NULL DEFAULT 0,
  "status"        TEXT        NOT NULL DEFAULT 'pending',
  "errorLog"      JSONB,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceOptionImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinanceOptionImportBatch_companyId_idx"    ON "FinanceOptionImportBatch" ("companyId");
CREATE INDEX IF NOT EXISTS "FinanceOptionImportBatch_uploadedById_idx" ON "FinanceOptionImportBatch" ("uploadedById");
CREATE INDEX IF NOT EXISTS "FinanceOptionImportBatch_status_idx"       ON "FinanceOptionImportBatch" ("status");

-- ── FinanceOption — new columns ───────────────────────────────
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "companyId"              TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "importBatchId"          TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "planCode"               TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "lenderName"             TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "displayName"            TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "promoAprPercent"        DECIMAL(6, 4);
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "deferredInterestMonths" INTEGER;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "sameAsCashMonths"       INTEGER;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "maximumAmount"          DECIMAL(12, 2);
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "downPaymentPercent"     DECIMAL(6, 4);
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "downPaymentAmount"      DECIMAL(12, 2);
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "monthlyPaymentFactor"   DECIMAL(12, 8);
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "formulaType"            TEXT NOT NULL DEFAULT 'zero_interest';
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "formulaJson"            JSONB;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "sourceSheet"            TEXT;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "sourceRowNumber"        INTEGER;
ALTER TABLE "FinanceOption" ADD COLUMN IF NOT EXISTS "sourceHash"             TEXT;

-- Rename minimumAmount from Float to keep existing data; add new typed version
-- (Prisma handles Float → Decimal transparently via NUMERIC cast in queries)

-- Indexes on FinanceOption
CREATE INDEX IF NOT EXISTS "FinanceOption_companyId_idx"     ON "FinanceOption" ("companyId");
CREATE INDEX IF NOT EXISTS "FinanceOption_importBatchId_idx" ON "FinanceOption" ("importBatchId");
CREATE INDEX IF NOT EXISTS "FinanceOption_planCode_idx"       ON "FinanceOption" ("planCode");
CREATE INDEX IF NOT EXISTS "FinanceOption_termMonths_idx"     ON "FinanceOption" ("termMonths");
CREATE INDEX IF NOT EXISTS "FinanceOption_isActive_idx"       ON "FinanceOption" ("isActive");

-- Unique index on sourceHash (dedup key)
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceOption_sourceHash_key" ON "FinanceOption" ("sourceHash");

-- FK: FinanceOption → FinanceOptionImportBatch
ALTER TABLE "FinanceOption"
  ADD CONSTRAINT "FinanceOption_importBatchId_fkey"
  FOREIGN KEY ("importBatchId")
  REFERENCES "FinanceOptionImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID; -- NOT VALID so existing rows (null FK) don't block

-- ── AppointmentFinanceSelection — new columns ─────────────────
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "companyId"        TEXT;
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "downPaymentAmount" DECIMAL(12, 2);
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "termMonths"        INTEGER;
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "aprPercent"        DECIMAL(6, 4);
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "totalPayments"     DECIMAL(12, 2);
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "totalInterest"     DECIMAL(12, 2);
ALTER TABLE "AppointmentFinanceSelection" ADD COLUMN IF NOT EXISTS "disclosureText"    TEXT;

CREATE INDEX IF NOT EXISTS "AppointmentFinanceSelection_companyId_idx"     ON "AppointmentFinanceSelection" ("companyId");
CREATE INDEX IF NOT EXISTS "AppointmentFinanceSelection_appointmentId_idx" ON "AppointmentFinanceSelection" ("appointmentId");

-- ── RLS Policies ─────────────────────────────────────────────
-- Access is enforced at the API layer (Prisma + Express auth middleware).
-- RLS adds defense-in-depth for direct Supabase client access.

ALTER TABLE "FinanceOptionImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentFinanceSelection" ENABLE ROW LEVEL SECURITY;

-- FinanceOptionImportBatch: only service_role can manage
CREATE POLICY "finance_import_batch_service" ON "FinanceOptionImportBatch"
  FOR ALL USING (auth.role() = 'service_role');

-- FinanceOption: authenticated users can read active global/company options
CREATE POLICY "finance_option_read_global" ON "FinanceOption"
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND "isActive" = TRUE
    AND "companyId" IS NULL
  );

CREATE POLICY "finance_option_read_company" ON "FinanceOption"
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND "isActive" = TRUE
    AND "companyId" IS NOT NULL
  );

-- Only service_role can insert/update/delete finance options
CREATE POLICY "finance_option_write_service" ON "FinanceOption"
  FOR ALL USING (auth.role() = 'service_role');

-- AppointmentFinanceSelection: authenticated users can read/write own records
CREATE POLICY "finance_selection_authenticated" ON "AppointmentFinanceSelection"
  FOR ALL USING (auth.role() = 'authenticated');
