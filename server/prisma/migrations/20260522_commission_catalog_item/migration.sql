-- Migration: 20260522_commission_catalog_item
-- Creates CommissionCatalogItem — reusable price/commission rate catalog
-- imported from the BTR Commission Sheet (CS-2400) and future rate sheets.

CREATE TABLE IF NOT EXISTS "CommissionCatalogItem" (
    "id"                TEXT NOT NULL,
    "companyId"         TEXT,                           -- null = global/super-admin seeded
    -- Classification
    "category"          TEXT NOT NULL,
    "subcategory"       TEXT,
    "itemName"          TEXT NOT NULL,
    "sku"               TEXT,
    "description"       TEXT,
    -- Price
    "priceType"         TEXT NOT NULL DEFAULT 'fixed',  -- fixed | book | percent_off | job_amount | per_unit
    "priceAmount"       DECIMAL(12,2),                  -- null for BOOK / percent-off items
    "priceAmount2"      DECIMAL(12,2),                  -- second value for ranges e.g. $115/$135
    "pricePercent"      DECIMAL(6,4),                   -- e.g. -0.20 for "20% Off"
    -- Commission
    "commissionType"    TEXT NOT NULL DEFAULT 'fixed',  -- fixed | percent | none
    "commissionAmount"  DECIMAL(12,2),
    "commissionPercent" DECIMAL(6,4),                   -- e.g. 0.10 for 10%
    -- Unit context
    "unit"              TEXT,                            -- foot | square_foot | pair | pane | unit | job
    -- Source tracking
    "sourceSheet"       TEXT,
    "sourceRowNumber"   INTEGER,
    "sourceHash"        TEXT UNIQUE,                     -- SHA-256 dedup key
    -- Misc
    "notes"             TEXT,
    "isActive"          BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionCatalogItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "CommissionCatalogItem_companyId_idx"    ON "CommissionCatalogItem" ("companyId");
CREATE INDEX IF NOT EXISTS "CommissionCatalogItem_category_idx"     ON "CommissionCatalogItem" ("category");
CREATE INDEX IF NOT EXISTS "CommissionCatalogItem_subcategory_idx"  ON "CommissionCatalogItem" ("subcategory");
CREATE INDEX IF NOT EXISTS "CommissionCatalogItem_isActive_idx"     ON "CommissionCatalogItem" ("isActive");

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- Enable RLS so the table is Supabase-safe.
-- Row-level access is enforced at the API layer (Prisma + Express auth middleware),
-- but RLS adds a defense-in-depth layer for direct Supabase client access.

ALTER TABLE "CommissionCatalogItem" ENABLE ROW LEVEL SECURITY;

-- Public read of GLOBAL catalog items (companyId IS NULL) for authenticated users
CREATE POLICY "catalog_read_global"
    ON "CommissionCatalogItem"
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND "companyId" IS NULL
    );

-- Company-scoped read — users can read their own company's catalog items
CREATE POLICY "catalog_read_company"
    ON "CommissionCatalogItem"
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND "companyId" IS NOT NULL
    );

-- Only service_role (backend) can insert/update/delete
CREATE POLICY "catalog_write_service"
    ON "CommissionCatalogItem"
    FOR ALL
    USING (auth.role() = 'service_role');
