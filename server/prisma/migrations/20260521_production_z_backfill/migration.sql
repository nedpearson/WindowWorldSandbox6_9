-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTION BACKFILL MIGRATION
-- 20260521_production_backfill/migration.sql
--
-- Purpose : Repair missing default values that pre-date the defaults engine,
--           remove orphan/duplicate sketch markers, fix invalid enum values,
--           and add missing SketchMarker multi-point measurement columns.
-- Safety  : Every statement is idempotent (WHERE + IS NULL / IF EXISTS guards).
-- Tables  : "Opening", "Appointment", "SketchMarker", "FormSketch"
--           (Prisma camelCase model names → PascalCase quoted table names)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "Opening" ADD COLUMN IF NOT EXISTS "gridVerticalCount" INTEGER;
ALTER TABLE "Opening" ADD COLUMN IF NOT EXISTS "gridHorizontalCount" INTEGER;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1 — Opening defaults
-- ───────────────────────────────────────────────────────────────────────────

-- 1A. screen_option = 'Half Screen'
--     Only on non-picture windows.  Picture windows have their own
--     conditional rule (No Screen) and must NOT be touched here.
UPDATE "Opening"
SET    "screenOption" = 'Half Screen'
WHERE  "screenOption" IS NULL
  AND  LOWER(COALESCE("productCategory", '')) NOT IN ('picture', 'pic');

-- 1B. grid_pattern = 'None'
--     New openings default to no grid; backfill historical NULLs.
UPDATE "Opening"
SET    "gridPattern" = 'None'
WHERE  "gridPattern" IS NULL;

-- 1C. grid counts = 0 where grid_pattern = 'None'
--     Only zero out counts when the grid is genuinely absent.
UPDATE "Opening"
SET    "gridVerticalCount"   = 0,
       "gridHorizontalCount" = 0
WHERE  "gridPattern" = 'None'
  AND  (
         "gridVerticalCount"   IS NULL
      OR "gridHorizontalCount" IS NULL
       );

-- 1D. united_inches = width + height
--     Derived field; recalculate for any row where it slipped through NULL.
UPDATE "Opening"
SET    "unitedInches" = "width" + "height"
WHERE  "unitedInches" IS NULL
  AND  "width"        IS NOT NULL
  AND  "height"       IS NOT NULL;

-- 1E. glass_package = 'LEE'  (Window World standard default)
UPDATE "Opening"
SET    "glassPackage" = 'LEE'
WHERE  "glassPackage" IS NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2 — Appointment status
-- ───────────────────────────────────────────────────────────────────────────

-- 2A. status = 'scheduled'
--     The schema declares DEFAULT 'draft', but rows inserted before the
--     default column existed might have NULL status.
UPDATE "Appointment"
SET    "status" = 'scheduled'
WHERE  "status" IS NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3 — SketchMarker orphan removal
--
-- SketchMarker has a CASCADE delete from FormSketch, so orphans should not
-- exist after normal operation — but direct SQL inserts / failed transactions
-- can leave them behind.
-- ───────────────────────────────────────────────────────────────────────────

-- 3A. Remove truly orphan SketchMarkers
--     (markers whose parent FormSketch no longer exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SketchMarker'
  ) THEN
    DELETE FROM "SketchMarker"
    WHERE "sketchId" NOT IN (
      SELECT id FROM "FormSketch"
    );
  END IF;
END $$;

-- 3B. Remove orphan SketchMarkerGroupMembers
--     (members whose group or marker no longer exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SketchMarkerGroupMember'
  ) THEN
    DELETE FROM "SketchMarkerGroupMember"
    WHERE "groupId" NOT IN (SELECT id FROM "SketchMarkerGroup")
       OR "markerId" NOT IN (SELECT id FROM "SketchMarker");
  END IF;
END $$;

-- 3C. Remove orphan SketchMarkerLinks
--     (links whose marker no longer exists — opening may be NULL by design)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SketchMarkerLink'
  ) THEN
    DELETE FROM "SketchMarkerLink"
    WHERE "markerId" NOT IN (SELECT id FROM "SketchMarker");
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4 — Duplicate SketchMarker deduplication
--
-- The unique index (sketchId, elevation, markerType, markerNumber) was added
-- in migration 20260521_sketch_prevent_duplicates, but data created before
-- that migration may still violate it.  Keep the MOST RECENT row per group.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SketchMarker'
  ) THEN
    -- Identify and delete the older duplicates in one shot
    DELETE FROM "SketchMarker"
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "sketchId", "elevation", "markerType", "markerNumber"
            ORDER BY "updatedAt" DESC, "createdAt" DESC
          ) AS rn
        FROM "SketchMarker"
        WHERE "markerNumber" IS NOT NULL   -- NULL markerNumber rows are exempt
      ) ranked
      WHERE rn > 1
    );
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5 — Duplicate SketchMarkerLink cleanup
--
-- Each marker should have at most one link, and each opening at most one link.
-- Retain the most-recently-created link when duplication is found.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SketchMarkerLink'
  ) THEN
    -- De-dup by markerId (keep newest)
    DELETE FROM "SketchMarkerLink"
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "markerId"
                 ORDER BY "createdAt" DESC
               ) AS rn
        FROM "SketchMarkerLink"
      ) r WHERE rn > 1
    );

    -- De-dup by openingId (keep newest), excluding NULL openingId
    DELETE FROM "SketchMarkerLink"
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "openingId"
                 ORDER BY "createdAt" DESC
               ) AS rn
        FROM "SketchMarkerLink"
        WHERE "openingId" IS NOT NULL
      ) r WHERE rn > 1
    );
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6 — Verification counts (useful in Supabase SQL editor output)
-- ───────────────────────────────────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM "Opening" WHERE "screenOption" IS NULL)           AS "Opening.screenOption_still_null",
  (SELECT COUNT(*) FROM "Opening" WHERE "gridPattern"  IS NULL)           AS "Opening.gridPattern_still_null",
  (SELECT COUNT(*) FROM "Opening" WHERE "unitedInches"  IS NULL
                                  AND  "width"          IS NOT NULL
                                  AND  "height"         IS NOT NULL)      AS "Opening.unitedInches_still_null",
  (SELECT COUNT(*) FROM "Opening" WHERE "glassPackage"  IS NULL)          AS "Opening.glassPackage_still_null",
  (SELECT COUNT(*) FROM "Appointment" WHERE "status"    IS NULL)          AS "Appointment.status_still_null",
  (SELECT COUNT(*) FROM "Opening"
   WHERE "obscureGlass" NOT IN ('none','full','half')
     AND "obscureGlass" IS NOT NULL)                                       AS "Opening.obscureGlass_invalid_still";

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7 — Fix invalid obscureGlass enum values
--
-- The schema declares obscureGlass as  none | full | half
-- The value 'standard' was written by an early version of the frontend mapper
-- and maps semantically to 'full' (standard obscure = full pane obscure glass).
-- We also catch any other stray values as a safety net.
-- ───────────────────────────────────────────────────────────────────────────

-- 7A. 'standard' → 'full'  (known bad value from frontend mapper bug)
UPDATE "Opening"
SET    "obscureGlass" = 'full'
WHERE  "obscureGlass" = 'standard';

-- 7B. Any other unrecognised value → 'none'  (safe fallback, logs no glass)
--     This is a safety net only; it should produce 0 rows in a clean DB.
UPDATE "Opening"
SET    "obscureGlass" = 'none'
WHERE  "obscureGlass" IS NOT NULL
  AND  "obscureGlass" NOT IN ('none', 'full', 'half');

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 8 — Add missing SketchMarker multi-point measurement columns
--
-- VisualMeasurementAssistant and sketchSync expect these six nullable Float
-- columns for per-side multi-point measurements.  They were present on
-- MeasurementAdjustment but were never added to SketchMarker.
--
-- Uses IF NOT EXISTS so the migration is safe to re-run and safe against
-- environments where the columns were already added out-of-band.
--
-- ⚠️  After running this migration you MUST also add these six fields to
--    server/prisma/schema.prisma under model SketchMarker and run
--    `prisma generate` so the Prisma client picks them up.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- widthTop
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'widthTop'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "widthTop" DOUBLE PRECISION;
  END IF;

  -- widthMiddle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'widthMiddle'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "widthMiddle" DOUBLE PRECISION;
  END IF;

  -- widthBottom
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'widthBottom'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "widthBottom" DOUBLE PRECISION;
  END IF;

  -- heightLeft
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'heightLeft'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "heightLeft" DOUBLE PRECISION;
  END IF;

  -- heightCenter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'heightCenter'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "heightCenter" DOUBLE PRECISION;
  END IF;

  -- heightRight
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'SketchMarker'
      AND column_name  = 'heightRight'
  ) THEN
    ALTER TABLE "SketchMarker" ADD COLUMN "heightRight" DOUBLE PRECISION;
  END IF;
END $$;
