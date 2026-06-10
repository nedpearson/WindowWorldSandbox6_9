-- Module 1: Manufacturer Constraint Engine
CREATE TABLE IF NOT EXISTS "ManufacturerProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerSeries" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "manufacturerId" TEXT NOT NULL REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "ManufacturerSeries"("manufacturerId");

CREATE TABLE IF NOT EXISTS "ManufacturerSizeLimit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "productCategory" TEXT,
  "minWidth" DOUBLE PRECISION, "maxWidth" DOUBLE PRECISION,
  "minHeight" DOUBLE PRECISION, "maxHeight" DOUBLE PRECISION,
  "maxUI" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerColorRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "colorName" TEXT NOT NULL,
  "colorCode" TEXT,
  "isInterior" BOOLEAN DEFAULT true,
  "isExterior" BOOLEAN DEFAULT true,
  "leadTimeDays" INT DEFAULT 0,
  "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerGlassRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "glassPackage" TEXT NOT NULL,
  "isAvailable" BOOLEAN DEFAULT true,
  "leadTimeDays" INT DEFAULT 0,
  "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerGridRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "gridStyle" TEXT NOT NULL,
  "isAvailable" BOOLEAN DEFAULT true,
  "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerMullRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "maxUnits" INT DEFAULT 3,
  "maxCombinedWidth" DOUBLE PRECISION,
  "requiresStructural" BOOLEAN DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerDpRatingRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "dpRating" INT NOT NULL,
  "windZone" TEXT,
  "isAvailable" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerLeadTimeRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
  "conditionType" TEXT NOT NULL,
  "conditionValue" TEXT,
  "addDays" INT DEFAULT 0,
  "riskLevel" TEXT DEFAULT 'standard',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 2: Rough Opening Engine
CREATE TABLE IF NOT EXISTS "RoughOpeningProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "frameType" TEXT NOT NULL,
  "widthAdd" DOUBLE PRECISION DEFAULT 0,
  "heightAdd" DOUBLE PRECISION DEFAULT 0,
  "shimAllowance" DOUBLE PRECISION DEFAULT 0.25,
  "sealantAllowance" DOUBLE PRECISION DEFAULT 0.125,
  "trimWidth" DOUBLE PRECISION,
  "headerHeight" DOUBLE PRECISION,
  "notes" TEXT,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "InstallSurfaceRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "surfaceType" TEXT NOT NULL,
  "profileId" TEXT REFERENCES "RoughOpeningProfile"("id"),
  "additionalNotes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 3: Install Complexity Scoring
CREATE TABLE IF NOT EXISTS "InstallComplexityRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "factorName" TEXT NOT NULL,
  "conditionType" TEXT NOT NULL,
  "conditionValue" TEXT,
  "points" INT DEFAULT 1,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LaborHourProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "complexityMin" INT NOT NULL,
  "complexityMax" INT NOT NULL,
  "baseHours" DOUBLE PRECISION NOT NULL,
  "hourlyRate" DOUBLE PRECISION DEFAULT 45,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ScaffoldRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "triggerCondition" TEXT NOT NULL,
  "addedCost" DOUBLE PRECISION DEFAULT 0,
  "addedHours" DOUBLE PRECISION DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 4: Live Profit Engine
CREATE TABLE IF NOT EXISTS "CostProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "materialCostPct" DOUBLE PRECISION DEFAULT 0.35,
  "laborCostPerHour" DOUBLE PRECISION DEFAULT 45,
  "disposalFlat" DOUBLE PRECISION DEFAULT 25,
  "fuelFlat" DOUBLE PRECISION DEFAULT 15,
  "permitFlat" DOUBLE PRECISION DEFAULT 0,
  "financingFeeRate" DOUBLE PRECISION DEFAULT 0.03,
  "commissionRate" DOUBLE PRECISION DEFAULT 0.08,
  "riskReserveRate" DOUBLE PRECISION DEFAULT 0.02,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MarginTarget" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" TEXT NOT NULL,
  "greenMinPct" DOUBLE PRECISION DEFAULT 25,
  "yellowMinPct" DOUBLE PRECISION DEFAULT 15,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DiscountGuardrail" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "maxDiscountPct" DOUBLE PRECISION DEFAULT 15,
  "requiresApproval" BOOLEAN DEFAULT true,
  "approvalThresholdPct" DOUBLE PRECISION DEFAULT 10,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 5: AI Error Prevention Engine
CREATE TABLE IF NOT EXISTS "ValidationRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "conditionJson" JSONB,
  "message" TEXT NOT NULL,
  "severity" TEXT DEFAULT 'high',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AnomalyDetectionProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "metricName" TEXT NOT NULL,
  "minValue" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "stdDevThreshold" DOUBLE PRECISION DEFAULT 2,
  "message" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "RemakeRiskPattern" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "patternName" TEXT NOT NULL,
  "description" TEXT,
  "triggerCondition" JSONB,
  "riskScore" INT DEFAULT 5,
  "recommendation" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
