-- Module 6: Photo/Sketch/Measurement Fusion
CREATE TABLE IF NOT EXISTS "ProjectPhoto" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "photoUrl" TEXT NOT NULL,
  "photoType" TEXT DEFAULT 'field',
  "caption" TEXT,
  "elevation" TEXT,
  "roomLocation" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "ProjectPhoto"("appointmentId");

CREATE TABLE IF NOT EXISTS "MeasurementSource" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "sourceType" TEXT NOT NULL,
  "rawValue" DOUBLE PRECISION,
  "processedValue" DOUBLE PRECISION,
  "confidence" DOUBLE PRECISION DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ElevationAsset" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "elevation" TEXT NOT NULL,
  "assetUrl" TEXT,
  "assetType" TEXT DEFAULT 'diagram',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 7: Room-Based Configuration
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "status" TEXT DEFAULT 'active',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Elevation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "side" TEXT,
  "sortOrder" INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "Elevation"("projectId");

CREATE TABLE IF NOT EXISTS "Room" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "elevationId" TEXT REFERENCES "Elevation"("id"),
  "name" TEXT NOT NULL,
  "roomType" TEXT,
  "floorNumber" INT DEFAULT 1,
  "sortOrder" INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "Room"("projectId");

CREATE TABLE IF NOT EXISTS "WindowUnit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "openingId" TEXT,
  "roomId" TEXT REFERENCES "Room"("id"),
  "productCategory" TEXT,
  "width" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "unitedInches" DOUBLE PRECISION,
  "specs" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GlassPackage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "unitId" TEXT REFERENCES "WindowUnit"("id") ON DELETE CASCADE,
  "packageName" TEXT NOT NULL,
  "tempered" BOOLEAN DEFAULT false,
  "obscure" BOOLEAN DEFAULT false,
  "lowE" TEXT,
  "argon" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PricingLine" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "unitId" TEXT,
  "label" TEXT NOT NULL,
  "category" TEXT DEFAULT 'product',
  "basePrice" DOUBLE PRECISION DEFAULT 0,
  "modifiers" JSONB,
  "subtotal" DOUBLE PRECISION DEFAULT 0,
  "laborCost" DOUBLE PRECISION DEFAULT 0,
  "margin" DOUBLE PRECISION DEFAULT 0,
  "finalPrice" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "PricingLine"("appointmentId");

CREATE TABLE IF NOT EXISTS "ProductionLine" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "lineNumber" INT,
  "productSpec" JSONB,
  "status" TEXT DEFAULT 'pending',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 8: Mull Designer (extends existing SketchMarkerGroup)
CREATE TABLE IF NOT EXISTS "MullProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "mullBarWidth" DOUBLE PRECISION DEFAULT 0.75,
  "maxUnits" INT DEFAULT 4,
  "structuralLimit" DOUBLE PRECISION DEFAULT 120,
  "pricingPerBar" DOUBLE PRECISION DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MullPricingRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "profileId" TEXT REFERENCES "MullProfile"("id"),
  "unitCount" INT,
  "flatCharge" DOUBLE PRECISION DEFAULT 0,
  "perBarCharge" DOUBLE PRECISION DEFAULT 0,
  "structuralSurcharge" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 9: Structural Header Engine
CREATE TABLE IF NOT EXISTS "StructuralRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "conditionType" TEXT NOT NULL,
  "thresholdValue" DOUBLE PRECISION,
  "warningLevel" TEXT DEFAULT 'review',
  "message" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "OpeningModificationFlag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "modificationType" TEXT NOT NULL,
  "originalWidth" DOUBLE PRECISION,
  "originalHeight" DOUBLE PRECISION,
  "newWidth" DOUBLE PRECISION,
  "newHeight" DOUBLE PRECISION,
  "structuralReviewNeeded" BOOLEAN DEFAULT true,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "OpeningModificationFlag"("appointmentId");

-- Module 10: Dynamic Code Engine
CREATE TABLE IF NOT EXISTS "CodeJurisdiction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "state" TEXT DEFAULT 'LA',
  "city" TEXT DEFAULT 'Baton Rouge',
  "codeVersion" TEXT,
  "windZone" TEXT,
  "coastalZone" BOOLEAN DEFAULT false,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CodeRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jurisdictionId" TEXT REFERENCES "CodeJurisdiction"("id"),
  "ruleType" TEXT NOT NULL,
  "conditionJson" JSONB,
  "requirement" TEXT NOT NULL,
  "citation" TEXT,
  "severity" TEXT DEFAULT 'required',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "CodeRule"("jurisdictionId");

CREATE TABLE IF NOT EXISTS "EgressRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jurisdictionId" TEXT REFERENCES "CodeJurisdiction"("id"),
  "minWidth" DOUBLE PRECISION DEFAULT 20,
  "minHeight" DOUBLE PRECISION DEFAULT 24,
  "minArea" DOUBLE PRECISION DEFAULT 5.7,
  "maxSillHeight" DOUBLE PRECISION DEFAULT 44,
  "appliesToRooms" TEXT[] DEFAULT ARRAY['bedroom'],
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "WindZoneRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jurisdictionId" TEXT REFERENCES "CodeJurisdiction"("id"),
  "zoneName" TEXT NOT NULL,
  "minDpRating" INT,
  "requiredForCoastal" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
