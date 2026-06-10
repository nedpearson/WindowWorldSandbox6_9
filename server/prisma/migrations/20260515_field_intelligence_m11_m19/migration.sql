-- Module 11: Lead-Time Intelligence
CREATE TABLE IF NOT EXISTS "LeadTimeProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "manufacturerId" TEXT,
  "seriesId" TEXT,
  "baseDays" INT DEFAULT 14,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LeadTimeModifier" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "profileId" TEXT REFERENCES "LeadTimeProfile"("id") ON DELETE CASCADE,
  "conditionType" TEXT NOT NULL,
  "conditionValue" TEXT,
  "addDays" INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SupplyRiskFlag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" TEXT,
  "riskType" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT DEFAULT 'medium',
  "activeUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 12: Production Packet Generator
CREATE TABLE IF NOT EXISTS "PacketTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "packetType" TEXT NOT NULL,
  "sections" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GeneratedPacket" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "templateId" TEXT REFERENCES "PacketTemplate"("id"),
  "packetType" TEXT NOT NULL,
  "status" TEXT DEFAULT 'draft',
  "fileUrl" TEXT,
  "fileFormat" TEXT DEFAULT 'pdf',
  "generatedBy" TEXT,
  "generatedAt" TIMESTAMPTZ DEFAULT now(),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "GeneratedPacket"("appointmentId");

-- Module 13: AI Sales Optimization
CREATE TABLE IF NOT EXISTS "SalesRecommendationRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "conditionJson" JSONB,
  "recommendation" TEXT NOT NULL,
  "upsellAmount" DOUBLE PRECISION DEFAULT 0,
  "priority" INT DEFAULT 5,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "OptionBundle" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "tier" TEXT DEFAULT 'better',
  "options" JSONB NOT NULL,
  "bundlePrice" DOUBLE PRECISION DEFAULT 0,
  "savingsAmount" DOUBLE PRECISION DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "FinancingProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "termMonths" INT NOT NULL,
  "apr" DOUBLE PRECISION DEFAULT 0,
  "promoType" TEXT,
  "minAmount" DOUBLE PRECISION,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 14: Field Shortcuts
CREATE TABLE IF NOT EXISTS "FieldShortcut" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "shortcutKey" TEXT NOT NULL UNIQUE,
  "category" TEXT DEFAULT 'conversion',
  "description" TEXT,
  "actionsJson" JSONB NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "sortOrder" INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PricingAdder" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "adderType" TEXT NOT NULL,
  "amount" DOUBLE PRECISION DEFAULT 0,
  "pricingLogic" TEXT DEFAULT 'flat',
  "firstUnitAmount" DOUBLE PRECISION,
  "additionalAmount" DOUBLE PRECISION,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "IncludedScopeRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "exteriorType" TEXT NOT NULL,
  "includesTrim" BOOLEAN DEFAULT false,
  "includesHeader" BOOLEAN DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 15: Quote Visualization
CREATE TABLE IF NOT EXISTS "ProposalVersion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "versionNumber" INT DEFAULT 1,
  "status" TEXT DEFAULT 'draft',
  "totalPrice" DOUBLE PRECISION DEFAULT 0,
  "optionsJson" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "ProposalVersion"("appointmentId");

CREATE TABLE IF NOT EXISTS "ProposalOption" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposalId" TEXT REFERENCES "ProposalVersion"("id") ON DELETE CASCADE,
  "tier" TEXT DEFAULT 'good',
  "label" TEXT NOT NULL,
  "totalPrice" DOUBLE PRECISION DEFAULT 0,
  "optionsJson" JSONB,
  "isSelected" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "FinancingScenario" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposalId" TEXT REFERENCES "ProposalVersion"("id") ON DELETE CASCADE,
  "profileId" TEXT,
  "totalAmount" DOUBLE PRECISION DEFAULT 0,
  "monthlyPayment" DOUBLE PRECISION DEFAULT 0,
  "termMonths" INT,
  "apr" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 16: Window Knowledge Library
CREATE TABLE IF NOT EXISTS "WindowDefaultProfile" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "productCategory" TEXT,
  "width" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "defaultsJson" JSONB NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SpecialtyShapeDefault" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "shapeType" TEXT NOT NULL,
  "width" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "rise" DOUBLE PRECISION,
  "radius" DOUBLE PRECISION,
  "legHeight" DOUBLE PRECISION,
  "geometryJson" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SashSplitPreset" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "splitType" TEXT NOT NULL,
  "topRatio" DOUBLE PRECISION,
  "bottomRatio" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 17: Specialty Shape Library
CREATE TABLE IF NOT EXISTS "SpecialtyShape" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "shapeType" TEXT NOT NULL UNIQUE,
  "category" TEXT DEFAULT 'standard',
  "geometryJson" JSONB,
  "validationJson" JSONB,
  "pricingMultiplier" DOUBLE PRECISION DEFAULT 1,
  "leadTimeAddDays" INT DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 18: Remake Analytics
CREATE TABLE IF NOT EXISTS "RemakeEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "eventType" TEXT NOT NULL,
  "reason" TEXT,
  "severity" TEXT DEFAULT 'medium',
  "costImpact" DOUBLE PRECISION DEFAULT 0,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "RemakeEvent"("appointmentId");

CREATE TABLE IF NOT EXISTS "InstallIssue" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "issueType" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT DEFAULT 'medium',
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CallbackLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "reason" TEXT,
  "scheduledDate" TIMESTAMPTZ,
  "completedDate" TIMESTAMPTZ,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MeasurementRevisionHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" TEXT NOT NULL,
  "openingId" TEXT,
  "fieldName" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "reason" TEXT,
  "revisedBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Module 19: Sales Rep Performance
CREATE TABLE IF NOT EXISTS "RepPerformanceMetric" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "closeRate" DOUBLE PRECISION,
  "avgDealSize" DOUBLE PRECISION,
  "avgMarginPct" DOUBLE PRECISION,
  "remakeRate" DOUBLE PRECISION,
  "callbackRate" DOUBLE PRECISION,
  "financingUsagePct" DOUBLE PRECISION,
  "optionAttachRate" DOUBLE PRECISION,
  "avgSpeedToProposalMin" DOUBLE PRECISION,
  "configAccuracyPct" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "RepPerformanceMetric"("userId");

CREATE TABLE IF NOT EXISTS "SalesActivityLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "activityType" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "SalesActivityLog"("userId");

CREATE TABLE IF NOT EXISTS "ProposalConversionEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "proposalId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CoachingInsight" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "insightType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "priority" INT DEFAULT 5,
  "acknowledged" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON "CoachingInsight"("userId");
