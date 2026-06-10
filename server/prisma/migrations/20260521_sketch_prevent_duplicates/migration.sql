-- Phase 1: Clean up existing duplicate SketchMarkerLinks
WITH DuplicateMarkerLinks AS (
    SELECT id,
           ROW_NUMBER() OVER(PARTITION BY "markerId" ORDER BY "createdAt" DESC) as row_num_marker,
           ROW_NUMBER() OVER(PARTITION BY "openingId" ORDER BY "createdAt" DESC) as row_num_opening
    FROM "SketchMarkerLink"
    WHERE "openingId" IS NOT NULL
)
DELETE FROM "SketchMarkerLink"
WHERE id IN (
    SELECT id FROM DuplicateMarkerLinks WHERE row_num_marker > 1 OR row_num_opening > 1
);

-- Phase 2: Clean up duplicate Openings (keep the one with the highest total price, then latest)
WITH DuplicateOpenings AS (
    SELECT id,
           ROW_NUMBER() OVER(PARTITION BY "appointmentId", "openingNumber" ORDER BY "totalPrice" DESC, "updatedAt" DESC) as row_num
    FROM "Opening"
)
DELETE FROM "Opening"
WHERE id IN (
    SELECT id FROM DuplicateOpenings WHERE row_num > 1
);

-- Phase 3: Clean up duplicate SketchMarkers (keep the most recent one)
-- Only enforce this where markerNumber is NOT NULL
WITH DuplicateMarkers AS (
    SELECT id,
           ROW_NUMBER() OVER(PARTITION BY "sketchId", "elevation", "markerType", "markerNumber" ORDER BY "updatedAt" DESC) as row_num
    FROM "SketchMarker"
    WHERE "markerNumber" IS NOT NULL
)
DELETE FROM "SketchMarker"
WHERE id IN (
    SELECT id FROM DuplicateMarkers WHERE row_num > 1
);

-- Phase 4: Add Unique Constraints

-- A. Opening uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "Opening_appointmentId_openingNumber_key" ON "Opening"("appointmentId", "openingNumber");

-- B. SketchMarkerLink uniqueness
DROP INDEX IF EXISTS "SketchMarkerLink_markerId_idx";
DROP INDEX IF EXISTS "SketchMarkerLink_openingId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarkerLink_markerId_key" ON "SketchMarkerLink"("markerId");
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarkerLink_openingId_key" ON "SketchMarkerLink"("openingId");

-- C. SketchMarker uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarker_sketchId_elevation_markerType_markerNumber_key" ON "SketchMarker"("sketchId", "elevation", "markerType", "markerNumber");
