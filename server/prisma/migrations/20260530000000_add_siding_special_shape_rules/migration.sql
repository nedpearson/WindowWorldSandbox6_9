-- AddColumn: Opening — Special Shape + Siding / Outside Measure rule fields
-- Migration: 20260530000000_add_siding_special_shape_rules

ALTER TABLE "Opening"
  ADD COLUMN IF NOT EXISTS "specialShapeTrimRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "specialShapeTrimSelected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "specialShapeTrimPrice"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "measurementMethod"        TEXT,
  ADD COLUMN IF NOT EXISTS "outsideMeasureUsed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cutbackLikely"            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cutbackSelected"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cutbackReviewStatus"      TEXT,
  ADD COLUMN IF NOT EXISTS "headerRequired"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "headerSelected"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "headerFlashingSelected"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trimRequiredReview"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trimSelected"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trimDecision"             TEXT,
  ADD COLUMN IF NOT EXISTS "trimDecisionReason"       TEXT,
  ADD COLUMN IF NOT EXISTS "trimPhotoRequired"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "managerReviewRequired"    BOOLEAN NOT NULL DEFAULT false;
