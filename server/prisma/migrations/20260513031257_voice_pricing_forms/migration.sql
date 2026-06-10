-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "completeJob" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedReason" TEXT,
ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "pricingVersionId" TEXT;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "formData" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "phone2" TEXT;

-- AlterTable
ALTER TABLE "HouseMap" ADD COLUMN     "exteriorMaterial" TEXT,
ADD COLUMN     "sketchData" TEXT,
ADD COLUMN     "sketchImage" TEXT;

-- AlterTable
ALTER TABLE "HouseMapMarker" ADD COLUMN     "accessNotes" TEXT,
ADD COLUMN     "floorLevel" INTEGER DEFAULT 1,
ADD COLUMN     "installNotes" TEXT,
ADD COLUMN     "roomName" TEXT;

-- AlterTable
ALTER TABLE "Opening" ADD COLUMN     "exteriorType" TEXT,
ADD COLUMN     "floorNumber" INTEGER DEFAULT 1,
ADD COLUMN     "hinge" TEXT,
ADD COLUMN     "horizontalRR" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "installType" TEXT,
ADD COLUMN     "nailFin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oriel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricingStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "productModel" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sillRepair" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trimType" TEXT,
ALTER COLUMN "temperedGlass" DROP NOT NULL,
ALTER COLUMN "temperedGlass" DROP DEFAULT,
ALTER COLUMN "temperedGlass" SET DATA TYPE TEXT,
ALTER COLUMN "obscureGlass" DROP NOT NULL,
ALTER COLUMN "obscureGlass" DROP DEFAULT,
ALTER COLUMN "obscureGlass" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "PricingVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "importId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingVersionItem" (
    "id" TEXT NOT NULL,
    "pricingVersionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productCategory" TEXT,
    "seriesModel" TEXT,
    "label" TEXT NOT NULL,
    "unitedInchesMin" DOUBLE PRECISION,
    "unitedInchesMax" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceType" TEXT NOT NULL DEFAULT 'flat',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingVersionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'local',
    "driveFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "parsedRowCount" INTEGER,
    "errorMessage" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingImportRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" TEXT,
    "category" TEXT,
    "productCategory" TEXT,
    "seriesModel" TEXT,
    "label" TEXT,
    "unitedInchesMin" DOUBLE PRECISION,
    "unitedInchesMax" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "priceType" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "needsVerification" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingPricingRule" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "openingId" TEXT,
    "productCategory" TEXT,
    "seriesModel" TEXT,
    "unitedInches" DOUBLE PRECISION,
    "optionLabel" TEXT,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissingPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recording',
    "audioUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceTranscript" (
    "id" TEXT NOT NULL,
    "voiceSessionId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "cleanedText" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceExtractedEntity" (
    "id" TEXT NOT NULL,
    "voiceSessionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "openingNumber" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceExtractedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormInstance" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "formData" TEXT,
    "pdfUrl" TEXT,
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingVersionItem_pricingVersionId_idx" ON "PricingVersionItem"("pricingVersionId");

-- CreateIndex
CREATE INDEX "PricingVersionItem_category_idx" ON "PricingVersionItem"("category");

-- CreateIndex
CREATE INDEX "PricingVersionItem_productCategory_idx" ON "PricingVersionItem"("productCategory");

-- CreateIndex
CREATE INDEX "PricingImportRow_importId_idx" ON "PricingImportRow"("importId");

-- CreateIndex
CREATE INDEX "VoiceSession_appointmentId_idx" ON "VoiceSession"("appointmentId");

-- CreateIndex
CREATE INDEX "VoiceSession_userId_idx" ON "VoiceSession"("userId");

-- CreateIndex
CREATE INDEX "VoiceExtractedEntity_voiceSessionId_idx" ON "VoiceExtractedEntity"("voiceSessionId");

-- CreateIndex
CREATE INDEX "FormInstance_appointmentId_idx" ON "FormInstance"("appointmentId");

-- CreateIndex
CREATE INDEX "FormInstance_formType_idx" ON "FormInstance"("formType");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Opening_appointmentId_idx" ON "Opening"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_pricingVersionId_fkey" FOREIGN KEY ("pricingVersionId") REFERENCES "PricingVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingVersion" ADD CONSTRAINT "PricingVersion_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingVersion" ADD CONSTRAINT "PricingVersion_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PricingImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingVersionItem" ADD CONSTRAINT "PricingVersionItem_pricingVersionId_fkey" FOREIGN KEY ("pricingVersionId") REFERENCES "PricingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingImportRow" ADD CONSTRAINT "PricingImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PricingImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTranscript" ADD CONSTRAINT "VoiceTranscript_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "VoiceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceExtractedEntity" ADD CONSTRAINT "VoiceExtractedEntity_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "VoiceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormInstance" ADD CONSTRAINT "FormInstance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
