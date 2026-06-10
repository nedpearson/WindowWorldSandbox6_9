-- CreateTable
CREATE TABLE "FormSketch" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT,
    "completenessScore" DOUBLE PRECISION,
    "installerClarityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSketch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchLayer" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchMarker" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "markerType" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "unitedInches" DOUBLE PRECISION,
    "elevation" TEXT,
    "roomLocation" TEXT,
    "floorNumber" INTEGER DEFAULT 1,
    "productType" TEXT,
    "specialtyType" TEXT,
    "installComplexity" TEXT,
    "ladderReq" BOOLEAN NOT NULL DEFAULT false,
    "removalType" TEXT,
    "installType" TEXT,
    "exteriorMaterial" TEXT,
    "notes" TEXT,
    "pricingStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchMarkerLink" (
    "id" TEXT NOT NULL,
    "markerId" TEXT NOT NULL,
    "openingId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchMarkerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchMeasurementValidation" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "openingId" TEXT,
    "markerId" TEXT,
    "status" TEXT NOT NULL,
    "mismatchDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchMeasurementValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchPricingValidation" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "openingId" TEXT,
    "issueType" TEXT NOT NULL,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchPricingValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchAiInterpretation" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "interpretationType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchAiInterpretation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchWarningFlag" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "warningType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchWarningFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchCompletenessScore" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "factors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SketchCompletenessScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallerClarityScore" (
    "id" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    "companyId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallerClarityScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormSketch_appointmentId_idx" ON "FormSketch"("appointmentId");

-- CreateIndex
CREATE INDEX "FormSketch_companyId_idx" ON "FormSketch"("companyId");

-- CreateIndex
CREATE INDEX "SketchLayer_sketchId_idx" ON "SketchLayer"("sketchId");

-- CreateIndex
CREATE INDEX "SketchLayer_companyId_idx" ON "SketchLayer"("companyId");

-- CreateIndex
CREATE INDEX "SketchMarker_sketchId_idx" ON "SketchMarker"("sketchId");

-- CreateIndex
CREATE INDEX "SketchMarker_companyId_idx" ON "SketchMarker"("companyId");

-- CreateIndex
CREATE INDEX "SketchMarkerLink_markerId_idx" ON "SketchMarkerLink"("markerId");

-- CreateIndex
CREATE INDEX "SketchMarkerLink_openingId_idx" ON "SketchMarkerLink"("openingId");

-- CreateIndex
CREATE INDEX "SketchMarkerLink_companyId_idx" ON "SketchMarkerLink"("companyId");

-- CreateIndex
CREATE INDEX "SketchMeasurementValidation_sketchId_idx" ON "SketchMeasurementValidation"("sketchId");

-- CreateIndex
CREATE INDEX "SketchMeasurementValidation_companyId_idx" ON "SketchMeasurementValidation"("companyId");

-- CreateIndex
CREATE INDEX "SketchPricingValidation_sketchId_idx" ON "SketchPricingValidation"("sketchId");

-- CreateIndex
CREATE INDEX "SketchPricingValidation_companyId_idx" ON "SketchPricingValidation"("companyId");

-- CreateIndex
CREATE INDEX "SketchAiInterpretation_sketchId_idx" ON "SketchAiInterpretation"("sketchId");

-- CreateIndex
CREATE INDEX "SketchAiInterpretation_companyId_idx" ON "SketchAiInterpretation"("companyId");

-- CreateIndex
CREATE INDEX "SketchWarningFlag_sketchId_idx" ON "SketchWarningFlag"("sketchId");

-- CreateIndex
CREATE INDEX "SketchWarningFlag_companyId_idx" ON "SketchWarningFlag"("companyId");

-- CreateIndex
CREATE INDEX "SketchCompletenessScore_sketchId_idx" ON "SketchCompletenessScore"("sketchId");

-- CreateIndex
CREATE INDEX "SketchCompletenessScore_companyId_idx" ON "SketchCompletenessScore"("companyId");

-- CreateIndex
CREATE INDEX "InstallerClarityScore_sketchId_idx" ON "InstallerClarityScore"("sketchId");

-- CreateIndex
CREATE INDEX "InstallerClarityScore_companyId_idx" ON "InstallerClarityScore"("companyId");

-- AddForeignKey
ALTER TABLE "FormSketch" ADD CONSTRAINT "FormSketch_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchLayer" ADD CONSTRAINT "SketchLayer_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchMarker" ADD CONSTRAINT "SketchMarker_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchMarkerLink" ADD CONSTRAINT "SketchMarkerLink_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "SketchMarker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchMarkerLink" ADD CONSTRAINT "SketchMarkerLink_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchMeasurementValidation" ADD CONSTRAINT "SketchMeasurementValidation_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchPricingValidation" ADD CONSTRAINT "SketchPricingValidation_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchAiInterpretation" ADD CONSTRAINT "SketchAiInterpretation_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchWarningFlag" ADD CONSTRAINT "SketchWarningFlag_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchCompletenessScore" ADD CONSTRAINT "SketchCompletenessScore_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallerClarityScore" ADD CONSTRAINT "InstallerClarityScore_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "FormSketch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
