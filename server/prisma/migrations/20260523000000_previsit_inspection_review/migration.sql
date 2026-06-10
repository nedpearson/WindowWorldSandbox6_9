-- CreateTable
CREATE TABLE "PreVisitPropertyProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "appointmentId" TEXT,
    "address" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "propertyFactsJson" JSONB,
    "imageryStatus" TEXT NOT NULL DEFAULT 'pending',
    "outlineAvailable" BOOLEAN NOT NULL DEFAULT false,
    "aerialAvailable" BOOLEAN NOT NULL DEFAULT false,
    "streetViewAvailable" BOOLEAN NOT NULL DEFAULT false,
    "estimatedOpeningsJson" JSONB,
    "visibleWindowSuggestionsJson" JSONB,
    "suggestedAssumptionsJson" JSONB,
    "limitationsJson" JSONB,
    "confidenceLevel" TEXT,
    "sourceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreVisitPropertyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreVisitVisualSource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "metadataJson" JSONB,
    "imageHash" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreVisitVisualSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreVisitWindowSuggestion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "elevation" TEXT,
    "suggestedType" TEXT,
    "confidence" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreVisitWindowSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreVisitChecklistItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "severity" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreVisitChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExteriorInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "appointmentId" TEXT,
    "broadQuoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "overallInstallComplexity" TEXT,
    "homeownerFinishPreference" TEXT,
    "budgetPreference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExteriorInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExteriorInspectionOpening" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "openingId" TEXT,
    "elevation" TEXT NOT NULL,
    "openingLabel" TEXT NOT NULL,
    "existingWindowType" TEXT,
    "exteriorSurface" TEXT,
    "existingInstallStyle" TEXT,
    "removalDifficulty" TEXT,
    "recommendedInstallMethod" TEXT,
    "costEffectiveRecommendation" TEXT,
    "premiumFinishRecommendation" TEXT,
    "laborFlagsJson" JSONB,
    "finishPreference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExteriorInspectionOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalReviewItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "appointmentId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreVisitPropertyProfile_companyId_idx" ON "PreVisitPropertyProfile"("companyId");

-- CreateIndex
CREATE INDEX "PreVisitPropertyProfile_userId_idx" ON "PreVisitPropertyProfile"("userId");

-- CreateIndex
CREATE INDEX "PreVisitPropertyProfile_customerId_idx" ON "PreVisitPropertyProfile"("customerId");

-- CreateIndex
CREATE INDEX "PreVisitPropertyProfile_appointmentId_idx" ON "PreVisitPropertyProfile"("appointmentId");

-- CreateIndex
CREATE INDEX "PreVisitPropertyProfile_address_idx" ON "PreVisitPropertyProfile"("address");

-- CreateIndex
CREATE INDEX "PreVisitVisualSource_companyId_idx" ON "PreVisitVisualSource"("companyId");

-- CreateIndex
CREATE INDEX "PreVisitVisualSource_profileId_idx" ON "PreVisitVisualSource"("profileId");

-- CreateIndex
CREATE INDEX "PreVisitVisualSource_sourceType_idx" ON "PreVisitVisualSource"("sourceType");

-- CreateIndex
CREATE INDEX "PreVisitWindowSuggestion_companyId_idx" ON "PreVisitWindowSuggestion"("companyId");

-- CreateIndex
CREATE INDEX "PreVisitWindowSuggestion_profileId_idx" ON "PreVisitWindowSuggestion"("profileId");

-- CreateIndex
CREATE INDEX "PreVisitWindowSuggestion_status_idx" ON "PreVisitWindowSuggestion"("status");

-- CreateIndex
CREATE INDEX "PreVisitChecklistItem_companyId_idx" ON "PreVisitChecklistItem"("companyId");

-- CreateIndex
CREATE INDEX "PreVisitChecklistItem_profileId_idx" ON "PreVisitChecklistItem"("profileId");

-- CreateIndex
CREATE INDEX "ExteriorInspection_companyId_idx" ON "ExteriorInspection"("companyId");

-- CreateIndex
CREATE INDEX "ExteriorInspection_userId_idx" ON "ExteriorInspection"("userId");

-- CreateIndex
CREATE INDEX "ExteriorInspection_appointmentId_idx" ON "ExteriorInspection"("appointmentId");

-- CreateIndex
CREATE INDEX "ExteriorInspectionOpening_companyId_idx" ON "ExteriorInspectionOpening"("companyId");

-- CreateIndex
CREATE INDEX "ExteriorInspectionOpening_inspectionId_idx" ON "ExteriorInspectionOpening"("inspectionId");

-- CreateIndex
CREATE INDEX "ExteriorInspectionOpening_openingId_idx" ON "ExteriorInspectionOpening"("openingId");

-- CreateIndex
CREATE INDEX "FinalReviewItem_companyId_idx" ON "FinalReviewItem"("companyId");

-- CreateIndex
CREATE INDEX "FinalReviewItem_appointmentId_idx" ON "FinalReviewItem"("appointmentId");

-- CreateIndex
CREATE INDEX "FinalReviewItem_status_idx" ON "FinalReviewItem"("status");

-- RLS POLICIES
ALTER TABLE "PreVisitPropertyProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreVisitVisualSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreVisitWindowSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreVisitChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExteriorInspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExteriorInspectionOpening" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinalReviewItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PreVisitPropertyProfile_tenant_isolation" ON "PreVisitPropertyProfile" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "PreVisitVisualSource_tenant_isolation" ON "PreVisitVisualSource" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "PreVisitWindowSuggestion_tenant_isolation" ON "PreVisitWindowSuggestion" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "PreVisitChecklistItem_tenant_isolation" ON "PreVisitChecklistItem" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "ExteriorInspection_tenant_isolation" ON "ExteriorInspection" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "ExteriorInspectionOpening_tenant_isolation" ON "ExteriorInspectionOpening" FOR ALL USING ("companyId" = get_user_company_id());
CREATE POLICY "FinalReviewItem_tenant_isolation" ON "FinalReviewItem" FOR ALL USING ("companyId" = get_user_company_id());
