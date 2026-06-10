-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCTION SCHEMA FINAL — Window World Assistant
-- Migration: 20260521_production_schema_final
-- Strategy: Idempotent — safe to run multiple times; uses IF NOT EXISTS / DO $$ blocks
-- Covers: All Prisma models + raw-SQL tables referenced from routes
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: CORE TABLES — Company, User, Customer, Appointment, Opening
-- Ensure all columns from Prisma schema exist (previous migrations may be partial)
-- ─────────────────────────────────────────────────────────────────────────────

-- Company
CREATE TABLE IF NOT EXISTS "Company" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "tenantId"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Company_tenantId_key" ON "Company"("tenantId");

-- User
CREATE TABLE IF NOT EXISTS "User" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'sales_rep',
    "password"  TEXT NOT NULL,
    "avatarUrl" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User"("companyId");

-- Customer
CREATE TABLE IF NOT EXISTS "Customer" (
    "id"          TEXT NOT NULL,
    "firstName"   TEXT NOT NULL,
    "lastName"    TEXT NOT NULL,
    "email"       TEXT,
    "phone"       TEXT,
    "phone2"      TEXT,
    "address"     TEXT,
    "city"        TEXT,
    "state"       TEXT DEFAULT 'LA',
    "zip"         TEXT,
    "notes"       TEXT,
    "leadSource"  TEXT,
    "preLead1978" BOOLEAN NOT NULL DEFAULT false,
    "customerId"  TEXT,
    "companyId"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Customer_lastName_firstName_idx" ON "Customer"("lastName", "firstName");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_updatedAt_idx" ON "Customer"("updatedAt");
CREATE INDEX IF NOT EXISTS "Customer_companyId_idx" ON "Customer"("companyId");

-- Appointment
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id"               TEXT NOT NULL,
    "customerId"       TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'draft',
    "appointmentDate"  TIMESTAMP(3),
    "jobAddress"       TEXT,
    "jobCity"          TEXT,
    "jobState"         TEXT DEFAULT 'LA',
    "jobZip"           TEXT,
    "projectType"      TEXT,
    "completeJob"      BOOLEAN NOT NULL DEFAULT true,
    "poNumber"         TEXT,
    "accountNumber"    TEXT,
    "notes"            TEXT,
    "estimatorNotes"   TEXT,
    "installerNotes"   TEXT,
    "officeNotes"      TEXT,
    "subtotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate"          DOUBLE PRECISION NOT NULL DEFAULT 0.0945,
    "taxAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminFee"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financingAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingVersionId" TEXT,
    "completionPct"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lockedAt"         TIMESTAMP(3),
    "lockedReason"     TEXT,
    "companyId"        TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Appointment_customerId_idx" ON "Appointment"("customerId");
CREATE INDEX IF NOT EXISTS "Appointment_userId_idx" ON "Appointment"("userId");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX IF NOT EXISTS "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");
CREATE INDEX IF NOT EXISTS "Appointment_companyId_idx" ON "Appointment"("companyId");

-- Add missing mobile columns to Appointment (from mobile route migration)
ALTER TABLE "Appointment"
    ADD COLUMN IF NOT EXISTS "mobileSyncStatus"  TEXT DEFAULT 'synced',
    ADD COLUMN IF NOT EXISTS "lastMobileEditAt"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "mobileDeviceId"    TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_mobileSyncStatus_idx" ON "Appointment"("mobileSyncStatus");

-- Opening
CREATE TABLE IF NOT EXISTS "Opening" (
    "id"                        TEXT NOT NULL,
    "appointmentId"             TEXT NOT NULL,
    "openingNumber"             INTEGER NOT NULL,
    "quantity"                  INTEGER NOT NULL DEFAULT 1,
    "companyId"                 TEXT,
    "roomLocation"              TEXT,
    "elevation"                 TEXT,
    "floorNumber"               INTEGER DEFAULT 1,
    "width"                     DOUBLE PRECISION,
    "height"                    DOUBLE PRECISION,
    "unitedInches"              DOUBLE PRECISION,
    "productCategory"           TEXT,
    "productModel"              TEXT,
    "seriesModel"               TEXT,
    "interiorColor"             TEXT,
    "exteriorColor"             TEXT,
    "gridStyle"                 TEXT,
    "gridPattern"               TEXT,
    "gridProfile"               TEXT,
    "gridVerticalCount"         INTEGER DEFAULT 0,
    "gridHorizontalCount"       INTEGER DEFAULT 0,
    "gridPlacement"             TEXT,
    "gridNotes"                 TEXT,
    "gridConfirmed"             BOOLEAN NOT NULL DEFAULT true,
    "sdlSize"                   TEXT,
    "isSDL"                     BOOLEAN NOT NULL DEFAULT false,
    "isGBG"                     BOOLEAN NOT NULL DEFAULT false,
    "gridRequiresAudit"         BOOLEAN NOT NULL DEFAULT false,
    "glassPackage"              TEXT,
    "temperedGlass"             TEXT,
    "obscureGlass"              TEXT,
    "argon"                     BOOLEAN NOT NULL DEFAULT false,
    "foamEnhanced"              BOOLEAN NOT NULL DEFAULT false,
    "lowEPackage"               TEXT,
    "screenOption"              TEXT,
    "nailFin"                   BOOLEAN NOT NULL DEFAULT false,
    "oriel"                     BOOLEAN NOT NULL DEFAULT false,
    "orielType"                 TEXT,
    "orielUpperSashHeight"      DOUBLE PRECISION,
    "orielMeasurementBasis"     TEXT,
    "orielMeetingRailReference" TEXT,
    "orielConfirmed"            BOOLEAN NOT NULL DEFAULT false,
    "orielNotes"                TEXT,
    "horizontalRR"              BOOLEAN NOT NULL DEFAULT false,
    "hinge"                     TEXT,
    "exteriorType"              TEXT,
    "exteriorSurface"           TEXT,
    "exteriorConditionNotes"    TEXT,
    "requiresTrimHeader"        BOOLEAN NOT NULL DEFAULT false,
    "requiresSpecialHandling"   BOOLEAN NOT NULL DEFAULT false,
    "trimType"                  TEXT,
    "trimNotes"                 TEXT,
    "removalType"               TEXT,
    "installType"               TEXT,
    "sillRepair"                BOOLEAN NOT NULL DEFAULT false,
    "installNotes"              TEXT,
    "customerNotes"             TEXT,
    "installerNotes"            TEXT,
    "copiedFromOpeningId"       TEXT,
    "measurementConfirmed"      BOOLEAN NOT NULL DEFAULT true,
    "safetyConfirmed"           BOOLEAN NOT NULL DEFAULT false,
    "basePrice"                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    "optionsPrice"              DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborPrice"                DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice"                DOUBLE PRECISION NOT NULL DEFAULT 0,
    "radius"                    DOUBLE PRECISION,
    "customRadius"              DOUBLE PRECISION,
    "legHeight"                 DOUBLE PRECISION,
    "shapeType"                 TEXT,
    "shapeOrientation"          TEXT,
    "shapeSpringlineHeight"     DOUBLE PRECISION,
    "shapeRise"                 DOUBLE PRECISION,
    "shapeHighSide"             DOUBLE PRECISION,
    "shapeLowSide"              DOUBLE PRECISION,
    "shapeSlopeDirection"       TEXT,
    "shapeAcrossFlats"          DOUBLE PRECISION,
    "specialtyNotes"            TEXT,
    "needsVerification"         BOOLEAN NOT NULL DEFAULT false,
    "pricingStatus"             TEXT DEFAULT 'pending',
    "mobileSyncStatus"          TEXT DEFAULT 'synced',
    "lastMobileEditAt"          TIMESTAMP(3),
    "mobileEnteredAt"           TIMESTAMP(3),
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opening_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Opening_appointmentId_openingNumber_key" ON "Opening"("appointmentId", "openingNumber");
CREATE INDEX IF NOT EXISTS "Opening_appointmentId_idx" ON "Opening"("appointmentId");
CREATE INDEX IF NOT EXISTS "Opening_mobileSyncStatus_idx" ON "Opening"("mobileSyncStatus");

-- OpeningPhoto
CREATE TABLE IF NOT EXISTS "OpeningPhoto" (
    "id"               TEXT NOT NULL,
    "companyId"        TEXT,
    "projectId"        TEXT,
    "appointmentId"    TEXT,
    "customerId"       TEXT,
    "sketchId"         TEXT,
    "sketchObjectId"   TEXT,
    "openingId"        TEXT,
    "elevation"        TEXT,
    "itemType"         TEXT,
    "markerNumber"     INTEGER,
    "photoType"        TEXT,
    "originalUrl"      TEXT,
    "annotatedUrl"     TEXT,
    "thumbnailUrl"     TEXT,
    "storagePath"      TEXT,
    "uploadedBy"       TEXT,
    "capturedAt"       TIMESTAMP(3),
    "analysisStatus"   TEXT NOT NULL DEFAULT 'pending',
    "aiAnalysisJson"   JSONB,
    "confidence"       DOUBLE PRECISION,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningPhoto_pkey" PRIMARY KEY ("id")
);

-- PATCH: OpeningPhoto – Add missing columns from new Prisma schema
ALTER TABLE "OpeningPhoto"
    ADD COLUMN IF NOT EXISTS "companyId"      TEXT,
    ADD COLUMN IF NOT EXISTS "projectId"      TEXT,
    ADD COLUMN IF NOT EXISTS "appointmentId"  TEXT,
    ADD COLUMN IF NOT EXISTS "customerId"     TEXT,
    ADD COLUMN IF NOT EXISTS "sketchId"       TEXT,
    ADD COLUMN IF NOT EXISTS "sketchObjectId" TEXT,
    ADD COLUMN IF NOT EXISTS "elevation"      TEXT,
    ADD COLUMN IF NOT EXISTS "itemType"       TEXT,
    ADD COLUMN IF NOT EXISTS "markerNumber"   INTEGER,
    ADD COLUMN IF NOT EXISTS "photoType"      TEXT,
    ADD COLUMN IF NOT EXISTS "originalUrl"    TEXT,
    ADD COLUMN IF NOT EXISTS "annotatedUrl"   TEXT,
    ADD COLUMN IF NOT EXISTS "thumbnailUrl"   TEXT,
    ADD COLUMN IF NOT EXISTS "storagePath"    TEXT,
    ADD COLUMN IF NOT EXISTS "uploadedBy"     TEXT,
    ADD COLUMN IF NOT EXISTS "capturedAt"     TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "analysisStatus" TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS "aiAnalysisJson" JSONB,
    ADD COLUMN IF NOT EXISTS "confidence"     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "notes"          TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt"      TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "OpeningPhoto" ALTER COLUMN "openingId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "OpeningPhoto_openingId_idx" ON "OpeningPhoto"("openingId");
CREATE INDEX IF NOT EXISTS "OpeningPhoto_appointmentId_idx" ON "OpeningPhoto"("appointmentId");
CREATE INDEX IF NOT EXISTS "OpeningPhoto_sketchObjectId_idx" ON "OpeningPhoto"("sketchObjectId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: FOREIGN KEY CONSTRAINTS (idempotent via DO $$ blocks)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_companyId_fkey') THEN
        ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_companyId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_customerId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_userId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opening_appointmentId_fkey') THEN
        ALTER TABLE "Opening" ADD CONSTRAINT "Opening_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opening_companyId_fkey') THEN
        ALTER TABLE "Opening" ADD CONSTRAINT "Opening_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: PRICING ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PricingVersion" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "importId"    TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PricingVersionItem" (
    "id"                TEXT NOT NULL,
    "pricingVersionId"  TEXT NOT NULL,
    "category"          TEXT NOT NULL,
    "productCategory"   TEXT,
    "seriesModel"       TEXT,
    "label"             TEXT NOT NULL,
    "unitedInchesMin"   DOUBLE PRECISION,
    "unitedInchesMax"   DOUBLE PRECISION,
    "price"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceType"         TEXT NOT NULL DEFAULT 'flat',
    "confidence"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingVersionItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PricingVersionItem_pricingVersionId_idx" ON "PricingVersionItem"("pricingVersionId");
CREATE INDEX IF NOT EXISTS "PricingVersionItem_category_idx" ON "PricingVersionItem"("category");
CREATE INDEX IF NOT EXISTS "PricingVersionItem_productCategory_idx" ON "PricingVersionItem"("productCategory");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingVersionItem_pricingVersionId_fkey') THEN
        ALTER TABLE "PricingVersionItem" ADD CONSTRAINT "PricingVersionItem_pricingVersionId_fkey" FOREIGN KEY ("pricingVersionId") REFERENCES "PricingVersion"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_pricingVersionId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_pricingVersionId_fkey" FOREIGN KEY ("pricingVersionId") REFERENCES "PricingVersion"("id") ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PricingImport" (
    "id"            TEXT NOT NULL,
    "fileName"      TEXT NOT NULL,
    "fileType"      TEXT NOT NULL,
    "fileSize"      INTEGER,
    "source"        TEXT NOT NULL DEFAULT 'local',
    "driveFileId"   TEXT,
    "status"        TEXT NOT NULL DEFAULT 'uploaded',
    "parsedRowCount" INTEGER,
    "errorMessage"  TEXT,
    "createdBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PricingImportRow" (
    "id"                TEXT NOT NULL,
    "importId"          TEXT NOT NULL,
    "rowNumber"         INTEGER NOT NULL,
    "rawData"           TEXT,
    "category"          TEXT,
    "productCategory"   TEXT,
    "seriesModel"       TEXT,
    "label"             TEXT,
    "unitedInchesMin"   DOUBLE PRECISION,
    "unitedInchesMax"   DOUBLE PRECISION,
    "price"             DOUBLE PRECISION,
    "priceType"         TEXT,
    "confidence"        DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "needsVerification" BOOLEAN NOT NULL DEFAULT true,
    "status"            TEXT NOT NULL DEFAULT 'pending',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingImportRow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PricingImportRow_importId_idx" ON "PricingImportRow"("importId");

CREATE TABLE IF NOT EXISTS "MissingPricingRule" (
    "id"              TEXT NOT NULL,
    "appointmentId"   TEXT,
    "openingId"       TEXT,
    "productCategory" TEXT,
    "seriesModel"     TEXT,
    "unitedInches"    DOUBLE PRECISION,
    "optionLabel"     TEXT,
    "description"     TEXT NOT NULL,
    "resolved"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissingPricingRule_pkey" PRIMARY KEY ("id")
);

-- Legacy pricing tables (retained for backward compatibility)
CREATE TABLE IF NOT EXISTS "PricingTable" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "description" TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PricingItem" (
    "id"                TEXT NOT NULL,
    "pricingTableId"    TEXT NOT NULL,
    "label"             TEXT NOT NULL,
    "sku"               TEXT,
    "unitedInchesMin"   DOUBLE PRECISION,
    "unitedInchesMax"   DOUBLE PRECISION,
    "seriesModel"       TEXT,
    "productCategory"   TEXT,
    "price"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceType"         TEXT NOT NULL DEFAULT 'flat',
    "isDefault"         BOOLEAN NOT NULL DEFAULT false,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingItem_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: QUOTES / LINE ITEMS / CONTRACTS / SIGNATURES / PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "QuoteLineItem" (
    "id"                TEXT NOT NULL,
    "appointmentId"     TEXT NOT NULL,
    "label"             TEXT NOT NULL,
    "category"          TEXT NOT NULL,
    "quantity"          INTEGER NOT NULL DEFAULT 1,
    "unitPrice"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes"             TEXT,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuoteLineItem_appointmentId_idx" ON "QuoteLineItem"("appointmentId");

CREATE TABLE IF NOT EXISTS "Contract" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "pdfUrl"        TEXT,
    "version"       INTEGER NOT NULL DEFAULT 1,
    "status"        TEXT NOT NULL DEFAULT 'draft',
    "formData"      TEXT,
    "generatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Contract_appointmentId_idx" ON "Contract"("appointmentId");

CREATE TABLE IF NOT EXISTS "Signature" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "signerName"    TEXT NOT NULL,
    "signerRole"    TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Signature_appointmentId_idx" ON "Signature"("appointmentId");

CREATE TABLE IF NOT EXISTS "Payment" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amount"        DOUBLE PRECISION NOT NULL,
    "method"        TEXT NOT NULL,
    "reference"     TEXT,
    "notes"         TEXT,
    "paidAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Payment_appointmentId_idx" ON "Payment"("appointmentId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: HOUSE MAP / SKETCH
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "HouseMap" (
    "id"               TEXT NOT NULL,
    "appointmentId"    TEXT NOT NULL,
    "sketchData"       TEXT,
    "sketchImage"      TEXT,
    "exteriorMaterial" TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseMap_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HouseMap_appointmentId_key" ON "HouseMap"("appointmentId");

CREATE TABLE IF NOT EXISTS "HouseMapMarker" (
    "id"            TEXT NOT NULL,
    "houseMapId"    TEXT NOT NULL,
    "elevation"     TEXT NOT NULL,
    "x"             DOUBLE PRECISION NOT NULL,
    "y"             DOUBLE PRECISION NOT NULL,
    "openingNumber" INTEGER NOT NULL,
    "label"         TEXT,
    "roomName"      TEXT,
    "floorLevel"    INTEGER DEFAULT 1,
    "accessNotes"   TEXT,
    "installNotes"  TEXT,
    CONSTRAINT "HouseMapMarker_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HouseMapMarker_houseMapId_idx" ON "HouseMapMarker"("houseMapId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: VOICE-TO-TEXT ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "VoiceSession" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT,
    "userId"        TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'recording',
    "audioUrl"      TEXT,
    "duration"      DOUBLE PRECISION,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VoiceSession_appointmentId_idx" ON "VoiceSession"("appointmentId");
CREATE INDEX IF NOT EXISTS "VoiceSession_userId_idx" ON "VoiceSession"("userId");

CREATE TABLE IF NOT EXISTS "VoiceTranscript" (
    "id"             TEXT NOT NULL,
    "voiceSessionId" TEXT NOT NULL,
    "rawText"        TEXT NOT NULL,
    "cleanedText"    TEXT,
    "confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider"       TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceTranscript_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VoiceTranscript_voiceSessionId_idx" ON "VoiceTranscript"("voiceSessionId");

CREATE TABLE IF NOT EXISTS "VoiceExtractedEntity" (
    "id"             TEXT NOT NULL,
    "voiceSessionId" TEXT NOT NULL,
    "entityType"     TEXT NOT NULL,
    "fieldName"      TEXT NOT NULL,
    "fieldValue"     TEXT NOT NULL,
    "openingNumber"  INTEGER,
    "confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceExtractedEntity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VoiceExtractedEntity_voiceSessionId_idx" ON "VoiceExtractedEntity"("voiceSessionId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: FORMS ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FormInstance" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "formType"      TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'draft',
    "formData"      TEXT,
    "pdfUrl"        TEXT,
    "exportedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormInstance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FormInstance_appointmentId_idx" ON "FormInstance"("appointmentId");
CREATE INDEX IF NOT EXISTS "FormInstance_formType_idx" ON "FormInstance"("formType");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT,
    "action"   TEXT NOT NULL,
    "entity"   TEXT NOT NULL,
    "entityId" TEXT,
    "details"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: MANAGER ACCOUNTABILITY — AuditorIssue, RepPerformance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AuditorIssue" (
    "id"               TEXT NOT NULL,
    "appointmentId"    TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "severity"         TEXT NOT NULL,
    "category"         TEXT NOT NULL,
    "auditorSource"    TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "correctiveAction" TEXT NOT NULL,
    "blocksProduction" BOOLEAN NOT NULL DEFAULT false,
    "resolved"         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditorIssue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditorIssue_appointmentId_idx" ON "AuditorIssue"("appointmentId");
CREATE INDEX IF NOT EXISTS "AuditorIssue_userId_idx" ON "AuditorIssue"("userId");
CREATE INDEX IF NOT EXISTS "AuditorIssue_resolved_idx" ON "AuditorIssue"("resolved");

CREATE TABLE IF NOT EXISTS "RepPerformance" (
    "id"                     TEXT NOT NULL,
    "userId"                 TEXT NOT NULL,
    "performanceScore"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trainingScore"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualCompletionPct"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scenariosPassed"        INTEGER NOT NULL DEFAULT 0,
    "scenariosFailed"        INTEGER NOT NULL DEFAULT 0,
    "measurementErrorRate"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractErrorRate"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "followUpComplianceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quoteToCloseRate"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeToResolveHours"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepPerformance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RepPerformance_userId_key" ON "RepPerformance"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: NEW DRAWING ENGINE (FormSketch and related)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FormSketch" (
    "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"         TEXT NOT NULL,
    "companyId"             TEXT,
    "name"                  TEXT,
    "completenessScore"     DOUBLE PRECISION,
    "installerClarityScore" DOUBLE PRECISION,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormSketch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FormSketch_appointmentId_idx" ON "FormSketch"("appointmentId");
CREATE INDEX IF NOT EXISTS "FormSketch_companyId_idx" ON "FormSketch"("companyId");

CREATE TABLE IF NOT EXISTS "SketchLayer" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"  TEXT NOT NULL,
    "companyId" TEXT,
    "name"      TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "zIndex"    INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchLayer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchLayer_sketchId_idx" ON "SketchLayer"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchMarkerGroup" (
    "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"         TEXT NOT NULL,
    "companyId"        TEXT,
    "groupType"        TEXT NOT NULL DEFAULT 'mull_pair',
    "groupNote"        TEXT,
    "keepSeparateRows" BOOLEAN NOT NULL DEFAULT true,
    "needsReview"      BOOLEAN NOT NULL DEFAULT true,
    "pricingReviewed"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchMarkerGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchMarkerGroup_sketchId_idx" ON "SketchMarkerGroup"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchMarker" (
    "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"             TEXT NOT NULL,
    "companyId"            TEXT,
    "markerType"           TEXT NOT NULL,
    "markerNumber"         INTEGER,
    "markerSymbol"         TEXT,
    "markerLabel"          TEXT,
    "windowType"           TEXT,
    "shapeType"            TEXT,
    "x"                    DOUBLE PRECISION NOT NULL,
    "y"                    DOUBLE PRECISION NOT NULL,
    "width"                DOUBLE PRECISION,
    "height"               DOUBLE PRECISION,
    "unitedInches"         DOUBLE PRECISION,
    "elevation"            TEXT,
    "roomLocation"         TEXT,
    "floorNumber"          INTEGER DEFAULT 1,
    "productType"          TEXT,
    "specialtyType"        TEXT,
    "installComplexity"    TEXT,
    "ladderReq"            BOOLEAN NOT NULL DEFAULT false,
    "removalType"          TEXT,
    "installType"          TEXT,
    "exteriorMaterial"     TEXT,
    "notes"                TEXT,
    "pricingStatus"        TEXT,
    "linkedOrderRowNumber" INTEGER,
    "validationStatus"     TEXT,
    "groupId"              TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchMarker_pkey" PRIMARY KEY ("id")
);

-- PATCH: SketchMarker – 35 missing columns from frontend SketchMarkerData
ALTER TABLE "SketchMarker"
    ADD COLUMN IF NOT EXISTS "groupId"              TEXT,
    ADD COLUMN IF NOT EXISTS "markerNumber"         INTEGER,
    ADD COLUMN IF NOT EXISTS "markerSymbol"         TEXT,
    ADD COLUMN IF NOT EXISTS "markerLabel"          TEXT,
    ADD COLUMN IF NOT EXISTS "windowType"           TEXT,
    ADD COLUMN IF NOT EXISTS "shapeType"            TEXT,
    ADD COLUMN IF NOT EXISTS "linkedOrderRowNumber" INTEGER,
    ADD COLUMN IF NOT EXISTS "validationStatus"     TEXT,
    -- GRID FIELDS
    ADD COLUMN IF NOT EXISTS "gridPattern"          TEXT,
    ADD COLUMN IF NOT EXISTS "gridProfile"          TEXT,
    ADD COLUMN IF NOT EXISTS "gridVerticalCount"    INTEGER,
    ADD COLUMN IF NOT EXISTS "gridHorizontalCount"  INTEGER,
    ADD COLUMN IF NOT EXISTS "gridPlacement"        TEXT,
    ADD COLUMN IF NOT EXISTS "sdlSize"              TEXT,
    ADD COLUMN IF NOT EXISTS "isSDL"                BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isGBG"                BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "gridStyle"            TEXT,

    -- ORIEL FIELDS
    ADD COLUMN IF NOT EXISTS "orielType"              TEXT,
    ADD COLUMN IF NOT EXISTS "orielUpperSashHeight"   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "orielMeasurementBasis"  TEXT,
    ADD COLUMN IF NOT EXISTS "orielConfirmed"         BOOLEAN NOT NULL DEFAULT false,

    -- SHAPE FIELDS
    ADD COLUMN IF NOT EXISTS "shapeOrientation"  TEXT,
    ADD COLUMN IF NOT EXISTS "shapeRise"         DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeDiameter"     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeCustomNote"   TEXT,

    -- MULTI-POINT MEASUREMENT FIELDS  (critical for VisualMeasurementAssistant)
    ADD COLUMN IF NOT EXISTS "widthTop"      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "widthMiddle"   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "widthBottom"   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "heightLeft"    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "heightCenter"  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "heightRight"   DOUBLE PRECISION,

    -- EXTERIOR / SURFACE FIELDS
    ADD COLUMN IF NOT EXISTS "exteriorSurface"  TEXT,

    -- PRODUCT OPTIONS
    ADD COLUMN IF NOT EXISTS "glassPackage"   TEXT,
    ADD COLUMN IF NOT EXISTS "screenOption"   TEXT,
    ADD COLUMN IF NOT EXISTS "foamEnhanced"   BOOLEAN,
    ADD COLUMN IF NOT EXISTS "temperedGlass"  TEXT,
    ADD COLUMN IF NOT EXISTS "obscureGlass"   TEXT,
    ADD COLUMN IF NOT EXISTS "nailFin"        BOOLEAN,
    ADD COLUMN IF NOT EXISTS "interiorColor"  TEXT,
    ADD COLUMN IF NOT EXISTS "exteriorColor"  TEXT,

    -- CONFIRMATION / VALIDATION TRACKING
    ADD COLUMN IF NOT EXISTS "measurementVerified"  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "hasPhoto"             BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "SketchMarker_sketchId_idx" ON "SketchMarker"("sketchId");
CREATE INDEX IF NOT EXISTS "SketchMarker_companyId_idx" ON "SketchMarker"("companyId");
CREATE INDEX IF NOT EXISTS "SketchMarker_groupId_idx" ON "SketchMarker"("groupId");

CREATE TABLE IF NOT EXISTS "SketchMarkerGroupMember" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "groupId"   TEXT NOT NULL,
    "markerId"  TEXT NOT NULL,
    "position"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchMarkerGroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarkerGroupMember_groupId_markerId_key" ON "SketchMarkerGroupMember"("groupId", "markerId");
CREATE INDEX IF NOT EXISTS "SketchMarkerGroupMember_groupId_idx" ON "SketchMarkerGroupMember"("groupId");
CREATE INDEX IF NOT EXISTS "SketchMarkerGroupMember_markerId_idx" ON "SketchMarkerGroupMember"("markerId");

CREATE TABLE IF NOT EXISTS "SketchMarkerLink" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "markerId"  TEXT NOT NULL,
    "openingId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchMarkerLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarkerLink_markerId_key" ON "SketchMarkerLink"("markerId");
CREATE UNIQUE INDEX IF NOT EXISTS "SketchMarkerLink_openingId_key" ON "SketchMarkerLink"("openingId");
CREATE INDEX IF NOT EXISTS "SketchMarkerLink_companyId_idx" ON "SketchMarkerLink"("companyId");

CREATE TABLE IF NOT EXISTS "SketchMeasurementValidation" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"        TEXT NOT NULL,
    "companyId"       TEXT,
    "openingId"       TEXT,
    "markerId"        TEXT,
    "status"          TEXT NOT NULL,
    "mismatchDetails" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchMeasurementValidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchMeasurementValidation_sketchId_idx" ON "SketchMeasurementValidation"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchPricingValidation" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"    TEXT NOT NULL,
    "companyId"   TEXT,
    "openingId"   TEXT,
    "issueType"   TEXT NOT NULL,
    "description" TEXT,
    "resolved"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchPricingValidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchPricingValidation_sketchId_idx" ON "SketchPricingValidation"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchAiInterpretation" (
    "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"           TEXT NOT NULL,
    "companyId"          TEXT,
    "interpretationType" TEXT NOT NULL,
    "message"            TEXT NOT NULL,
    "confidence"         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "applied"            BOOLEAN NOT NULL DEFAULT false,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchAiInterpretation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchAiInterpretation_sketchId_idx" ON "SketchAiInterpretation"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchWarningFlag" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"    TEXT NOT NULL,
    "companyId"   TEXT,
    "warningType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity"    TEXT NOT NULL,
    "resolved"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchWarningFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchWarningFlag_sketchId_idx" ON "SketchWarningFlag"("sketchId");

CREATE TABLE IF NOT EXISTS "SketchCompletenessScore" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"  TEXT NOT NULL,
    "companyId" TEXT,
    "score"     DOUBLE PRECISION NOT NULL,
    "factors"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SketchCompletenessScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SketchCompletenessScore_sketchId_idx" ON "SketchCompletenessScore"("sketchId");

CREATE TABLE IF NOT EXISTS "InstallerClarityScore" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sketchId"  TEXT NOT NULL,
    "companyId" TEXT,
    "score"     DOUBLE PRECISION NOT NULL,
    "feedback"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstallerClarityScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "InstallerClarityScore_sketchId_idx" ON "InstallerClarityScore"("sketchId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 11: BUSINESS RULES ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "BusinessRule" (
    "id"                     TEXT NOT NULL,
    "ruleKey"                TEXT NOT NULL,
    "name"                   TEXT NOT NULL,
    "description"            TEXT NOT NULL,
    "category"               TEXT NOT NULL DEFAULT 'window_defaults',
    "isActive"               BOOLEAN NOT NULL DEFAULT true,
    "severity"               TEXT NOT NULL DEFAULT 'high',
    "triggerField"           TEXT,
    "triggerValue"           TEXT,
    "triggerConditionJson"   JSONB,
    "actionType"             TEXT NOT NULL,
    "actionField"            TEXT,
    "actionValue"            TEXT,
    "actionJson"             JSONB,
    "message"                TEXT NOT NULL,
    "autoApply"              BOOLEAN NOT NULL DEFAULT true,
    "requiresConfirmation"   BOOLEAN NOT NULL DEFAULT false,
    "requiresOverrideReason" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate"          TIMESTAMP(3),
    "needsVerification"      BOOLEAN NOT NULL DEFAULT false,
    "companyId"              TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessRule_ruleKey_key" ON "BusinessRule"("ruleKey");
CREATE INDEX IF NOT EXISTS "BusinessRule_category_idx" ON "BusinessRule"("category");
CREATE INDEX IF NOT EXISTS "BusinessRule_isActive_idx" ON "BusinessRule"("isActive");
CREATE INDEX IF NOT EXISTS "BusinessRule_companyId_idx" ON "BusinessRule"("companyId");

CREATE TABLE IF NOT EXISTS "BusinessRuleExecutionLog" (
    "id"             TEXT NOT NULL,
    "ruleId"         TEXT NOT NULL,
    "ruleName"       TEXT NOT NULL,
    "appointmentId"  TEXT,
    "openingId"      TEXT,
    "openingNumber"  INTEGER,
    "triggered"      BOOLEAN NOT NULL,
    "autoApplied"    BOOLEAN NOT NULL DEFAULT false,
    "overridden"     BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "severity"       TEXT NOT NULL,
    "executedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata"       JSONB,
    CONSTRAINT "BusinessRuleExecutionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BusinessRuleExecutionLog_ruleId_idx" ON "BusinessRuleExecutionLog"("ruleId");
CREATE INDEX IF NOT EXISTS "BusinessRuleExecutionLog_appointmentId_idx" ON "BusinessRuleExecutionLog"("appointmentId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 12: APPOINTMENT TIMELINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AppointmentTimelineEvent" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "eventType"     TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "userId"        TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentTimelineEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AppointmentTimelineEvent_appointmentId_idx" ON "AppointmentTimelineEvent"("appointmentId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 13: SAFETY GLAZING / TEMPERED GLASS ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OpeningSafetyGlazingReview" (
    "id"                      TEXT NOT NULL,
    "appointmentId"           TEXT NOT NULL,
    "openingId"               TEXT,
    "openingNumber"           INTEGER NOT NULL,
    "safetyReviewStatus"      TEXT NOT NULL DEFAULT 'not_started',
    "temperedRequired"        TEXT NOT NULL DEFAULT 'not_reviewed',
    "temperedFull"            BOOLEAN NOT NULL DEFAULT false,
    "temperedHalf"            BOOLEAN NOT NULL DEFAULT false,
    "flaggedReasons"          TEXT[] NOT NULL DEFAULT '{}',
    "sourceType"              TEXT NOT NULL DEFAULT 'rule',
    "sourcePhrase"            TEXT,
    "confidenceScore"         INTEGER NOT NULL DEFAULT 0,
    "overrideReason"          TEXT,
    "reviewedBy"              TEXT,
    "reviewedAt"              TIMESTAMP(3),
    "tubOrShowerNearby"       TEXT,
    "distanceToTubInches"     DOUBLE PRECISION,
    "bottomGlassHeightInches" DOUBLE PRECISION,
    "glassWidthInches"        DOUBLE PRECISION,
    "glassHeightInches"       DOUBLE PRECISION,
    "glassAreaSqft"           DOUBLE PRECISION,
    "lowGlassConditionMet"    BOOLEAN NOT NULL DEFAULT false,
    "metadata"                JSONB,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningSafetyGlazingReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OpeningSafetyGlazingReview_appointmentId_idx" ON "OpeningSafetyGlazingReview"("appointmentId");
CREATE INDEX IF NOT EXISTS "OpeningSafetyGlazingReview_openingId_idx" ON "OpeningSafetyGlazingReview"("openingId");
CREATE INDEX IF NOT EXISTS "OpeningSafetyGlazingReview_safetyReviewStatus_idx" ON "OpeningSafetyGlazingReview"("safetyReviewStatus");

CREATE TABLE IF NOT EXISTS "TemperedGlazingFlag" (
    "id"            TEXT NOT NULL,
    "reviewId"      TEXT,
    "appointmentId" TEXT NOT NULL,
    "openingNumber" INTEGER NOT NULL,
    "ruleId"        TEXT NOT NULL,
    "ruleName"      TEXT NOT NULL,
    "category"      TEXT NOT NULL,
    "severity"      TEXT NOT NULL DEFAULT 'high',
    "flagReason"    TEXT NOT NULL,
    "sourceType"    TEXT NOT NULL DEFAULT 'rule',
    "sourcePhrase"  TEXT,
    "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "photoHint"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemperedGlazingFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TemperedGlazingFlag_appointmentId_idx" ON "TemperedGlazingFlag"("appointmentId");
CREATE INDEX IF NOT EXISTS "TemperedGlazingFlag_ruleId_idx" ON "TemperedGlazingFlag"("ruleId");

CREATE TABLE IF NOT EXISTS "AiValidationWarning" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "openingId"     TEXT,
    "openingNumber" INTEGER,
    "category"      TEXT,
    "warningType"   TEXT,
    "message"       TEXT NOT NULL,
    "sourceType"    TEXT NOT NULL DEFAULT 'ai',
    "sourcePhrase"  TEXT,
    "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "detail"        TEXT,
    "severity"      TEXT NOT NULL DEFAULT 'warning',
    "resolved"      BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy"    TEXT,
    "resolvedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiValidationWarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiValidationWarning_appointmentId_idx" ON "AiValidationWarning"("appointmentId");
CREATE INDEX IF NOT EXISTS "AiValidationWarning_severity_idx" ON "AiValidationWarning"("severity");
CREATE INDEX IF NOT EXISTS "AiValidationWarning_resolved_idx" ON "AiValidationWarning"("resolved");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 14: MEASUREMENT INTELLIGENCE ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MeasurementRule" (
    "id"                    TEXT NOT NULL,
    "name"                  TEXT NOT NULL,
    "description"           TEXT,
    "status"                TEXT NOT NULL DEFAULT 'needs_verification',
    "windowType"            TEXT,
    "exteriorType"          TEXT,
    "installType"           TEXT,
    "removalType"           TEXT,
    "conditionJson"         JSONB,
    "widthTakeoffFraction"  TEXT,
    "heightTakeoffFraction" TEXT,
    "widthTakeoffDecimal"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heightTakeoffDecimal"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minDeduction"          DOUBLE PRECISION,
    "maxDeduction"          DOUBLE PRECISION,
    "actionType"            TEXT NOT NULL DEFAULT 'deduct',
    "requiresConfirmation"  BOOLEAN NOT NULL DEFAULT true,
    "requiresPhoto"         BOOLEAN NOT NULL DEFAULT false,
    "requiresNote"          BOOLEAN NOT NULL DEFAULT false,
    "severity"              TEXT NOT NULL DEFAULT 'high',
    "notes"                 TEXT,
    "effectiveDate"         TIMESTAMP(3),
    "version"               INTEGER NOT NULL DEFAULT 1,
    "active"                BOOLEAN NOT NULL DEFAULT true,
    "createdBy"             TEXT,
    "updatedBy"             TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MeasurementRule_windowType_idx" ON "MeasurementRule"("windowType");
CREATE INDEX IF NOT EXISTS "MeasurementRule_exteriorType_idx" ON "MeasurementRule"("exteriorType");
CREATE INDEX IF NOT EXISTS "MeasurementRule_status_idx" ON "MeasurementRule"("status");

CREATE TABLE IF NOT EXISTS "MeasurementAdjustment" (
    "id"             TEXT NOT NULL,
    "appointmentId"  TEXT NOT NULL,
    "openingId"      TEXT,
    "openingNumber"  INTEGER NOT NULL,
    "sourceType"     TEXT NOT NULL DEFAULT 'manual',
    "rawWidth"       DOUBLE PRECISION,
    "rawHeight"      DOUBLE PRECISION,
    "widthTop"       DOUBLE PRECISION,
    "widthMiddle"    DOUBLE PRECISION,
    "widthBottom"    DOUBLE PRECISION,
    "heightLeft"     DOUBLE PRECISION,
    "heightCenter"   DOUBLE PRECISION,
    "heightRight"    DOUBLE PRECISION,
    "adjWidth"       DOUBLE PRECISION,
    "adjHeight"      DOUBLE PRECISION,
    "widthTakeoff"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heightTakeoff"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ruleId"         TEXT,
    "ruleStatus"     TEXT,
    "confidence"     DOUBLE PRECISION,
    "approved"       BOOLEAN NOT NULL DEFAULT false,
    "approvedBy"     TEXT,
    "approvedAt"     TIMESTAMP(3),
    "overrideReason" TEXT,
    "notes"          TEXT[] NOT NULL DEFAULT '{}',
    "warnings"       TEXT[] NOT NULL DEFAULT '{}',
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MeasurementAdjustment_appointmentId_idx" ON "MeasurementAdjustment"("appointmentId");
CREATE INDEX IF NOT EXISTS "MeasurementAdjustment_approved_idx" ON "MeasurementAdjustment"("approved");

CREATE TABLE IF NOT EXISTS "MeasurementCapturePhoto" (
    "id"              TEXT NOT NULL,
    "appointmentId"   TEXT NOT NULL,
    "openingId"       TEXT,
    "openingNumber"   INTEGER,
    "measurementType" TEXT NOT NULL,
    "photoUrl"        TEXT,
    "storagePath"     TEXT,
    "capturedBy"      TEXT,
    "capturedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata"        JSONB,
    CONSTRAINT "MeasurementCapturePhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MeasurementCapturePhoto_appointmentId_idx" ON "MeasurementCapturePhoto"("appointmentId");

CREATE TABLE IF NOT EXISTS "MeasurementPhotoRead" (
    "id"               TEXT NOT NULL,
    "photoId"          TEXT,
    "appointmentId"    TEXT NOT NULL,
    "openingNumber"    INTEGER,
    "measurementType"  TEXT NOT NULL,
    "rawAiText"        TEXT,
    "detectedFraction" TEXT,
    "detectedDecimal"  DOUBLE PRECISION,
    "confidenceScore"  DOUBLE PRECISION,
    "candidates"       TEXT[] NOT NULL DEFAULT '{}',
    "selectedValue"    DOUBLE PRECISION,
    "correctedValue"   DOUBLE PRECISION,
    "ruleAppliedId"    TEXT,
    "takeoffAmount"    DOUBLE PRECISION,
    "finalDecimal"     DOUBLE PRECISION,
    "finalFraction"    TEXT,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "requiresManual"   BOOLEAN NOT NULL DEFAULT false,
    "approvedBy"       TEXT,
    "approvedAt"       TIMESTAMP(3),
    "metadata"         JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementPhotoRead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MeasurementPhotoRead_appointmentId_idx" ON "MeasurementPhotoRead"("appointmentId");
CREATE INDEX IF NOT EXISTS "MeasurementPhotoRead_status_idx" ON "MeasurementPhotoRead"("status");

CREATE TABLE IF NOT EXISTS "MeasurementRuleExecutionLog" (
    "id"             TEXT NOT NULL,
    "ruleId"         TEXT,
    "appointmentId"  TEXT,
    "openingId"      TEXT,
    "openingNumber"  INTEGER,
    "windowType"     TEXT,
    "exteriorType"   TEXT,
    "installType"    TEXT,
    "rawWidth"       DOUBLE PRECISION,
    "rawHeight"      DOUBLE PRECISION,
    "adjWidth"       DOUBLE PRECISION,
    "adjHeight"      DOUBLE PRECISION,
    "widthTakeoff"   DOUBLE PRECISION,
    "heightTakeoff"  DOUBLE PRECISION,
    "applied"        BOOLEAN NOT NULL DEFAULT false,
    "approvedBy"     TEXT,
    "approvedAt"     TIMESTAMP(3),
    "overridden"     BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementRuleExecutionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MeasurementRuleExecutionLog_appointmentId_idx" ON "MeasurementRuleExecutionLog"("appointmentId");
CREATE INDEX IF NOT EXISTS "MeasurementRuleExecutionLog_ruleId_idx" ON "MeasurementRuleExecutionLog"("ruleId");

CREATE TABLE IF NOT EXISTS "SpecialtyMeasurementSession" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "openingId"     TEXT,
    "openingNumber" INTEGER NOT NULL,
    "windowType"    TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'in_progress',
    "startedBy"     TEXT,
    "completedBy"   TEXT,
    "completedAt"   TIMESTAMP(3),
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialtyMeasurementSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SpecialtyMeasurementSession_appointmentId_idx" ON "SpecialtyMeasurementSession"("appointmentId");
CREATE INDEX IF NOT EXISTS "SpecialtyMeasurementSession_status_idx" ON "SpecialtyMeasurementSession"("status");

CREATE TABLE IF NOT EXISTS "SpecialtyMeasurementValue" (
    "id"             TEXT NOT NULL,
    "sessionId"      TEXT NOT NULL,
    "appointmentId"  TEXT NOT NULL,
    "openingNumber"  INTEGER,
    "dimensionKey"   TEXT NOT NULL,
    "dimensionLabel" TEXT NOT NULL,
    "rawValue"       DOUBLE PRECISION,
    "adjustedValue"  DOUBLE PRECISION,
    "sourceType"     TEXT NOT NULL DEFAULT 'manual',
    "approved"       BOOLEAN NOT NULL DEFAULT false,
    "approvedAt"     TIMESTAMP(3),
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialtyMeasurementValue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SpecialtyMeasurementValue_sessionId_idx" ON "SpecialtyMeasurementValue"("sessionId");

CREATE TABLE IF NOT EXISTS "SpecialtyMeasurementValidation" (
    "id"            TEXT NOT NULL,
    "sessionId"     TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "openingNumber" INTEGER,
    "issueType"     TEXT NOT NULL,
    "message"       TEXT NOT NULL,
    "severity"      TEXT NOT NULL DEFAULT 'high',
    "resolved"      BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialtyMeasurementValidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SpecialtyMeasurementValidation_sessionId_idx" ON "SpecialtyMeasurementValidation"("sessionId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 15: WORKBOOK TEMPLATE ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WorkbookTemplate" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "description"   TEXT,
    "fileName"      TEXT NOT NULL,
    "filePath"      TEXT NOT NULL,
    "storageBucket" TEXT,
    "isActive"      BOOLEAN NOT NULL DEFAULT false,
    "createdBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkbookTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkbookTemplateVersion" (
    "id"            TEXT NOT NULL,
    "templateId"    TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileName"      TEXT NOT NULL,
    "filePath"      TEXT NOT NULL,
    "sheetNames"    TEXT[] NOT NULL DEFAULT '{}',
    "isActive"      BOOLEAN NOT NULL DEFAULT false,
    "changeNotes"   TEXT,
    "createdBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkbookTemplateVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkbookTemplateVersion_templateId_versionNumber_key" ON "WorkbookTemplateVersion"("templateId", "versionNumber");
CREATE INDEX IF NOT EXISTS "WorkbookTemplateVersion_templateId_idx" ON "WorkbookTemplateVersion"("templateId");

CREATE TABLE IF NOT EXISTS "WorkbookFieldMapping" (
    "id"              TEXT NOT NULL,
    "versionId"       TEXT NOT NULL,
    "sheetName"       TEXT NOT NULL,
    "cellAddress"     TEXT NOT NULL,
    "mergeRange"      TEXT,
    "fieldKey"        TEXT NOT NULL,
    "fieldLabel"      TEXT NOT NULL,
    "fieldType"       TEXT NOT NULL,
    "sourceType"      TEXT NOT NULL,
    "sourcePath"      TEXT,
    "formula"         TEXT,
    "required"        BOOLEAN NOT NULL DEFAULT false,
    "aiPopulatable"   BOOLEAN NOT NULL DEFAULT false,
    "validationRules" TEXT,
    "metadata"        JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkbookFieldMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkbookFieldMapping_versionId_sheetName_cellAddress_key" ON "WorkbookFieldMapping"("versionId", "sheetName", "cellAddress");
CREATE INDEX IF NOT EXISTS "WorkbookFieldMapping_versionId_idx" ON "WorkbookFieldMapping"("versionId");
CREATE INDEX IF NOT EXISTS "WorkbookFieldMapping_fieldKey_idx" ON "WorkbookFieldMapping"("fieldKey");

CREATE TABLE IF NOT EXISTS "WorkbookFieldValue" (
    "id"              TEXT NOT NULL,
    "mappingId"       TEXT NOT NULL,
    "appointmentId"   TEXT NOT NULL,
    "value"           TEXT,
    "normalizedValue" TEXT,
    "sourceType"      TEXT,
    "sourceText"      TEXT,
    "confidence"      DOUBLE PRECISION,
    "reviewStatus"    TEXT NOT NULL DEFAULT 'pending',
    "approvedBy"      TEXT,
    "approvedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkbookFieldValue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkbookFieldValue_appointmentId_idx" ON "WorkbookFieldValue"("appointmentId");
CREATE INDEX IF NOT EXISTS "WorkbookFieldValue_mappingId_idx" ON "WorkbookFieldValue"("mappingId");

CREATE TABLE IF NOT EXISTS "WorkbookExportJob" (
    "id"             TEXT NOT NULL,
    "appointmentId"  TEXT NOT NULL,
    "templateId"     TEXT NOT NULL,
    "versionId"      TEXT,
    "exportFormat"   TEXT NOT NULL DEFAULT 'xlsx',
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "filePath"       TEXT,
    "storageBucket"  TEXT,
    "fileSize"       INTEGER,
    "errorMessage"   TEXT,
    "reconciliation" JSONB,
    "metadata"       JSONB,
    "createdBy"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"    TIMESTAMP(3),
    CONSTRAINT "WorkbookExportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkbookExportJob_appointmentId_idx" ON "WorkbookExportJob"("appointmentId");
CREATE INDEX IF NOT EXISTS "WorkbookExportJob_templateId_idx" ON "WorkbookExportJob"("templateId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 16: REFERENCE DOCUMENTS & FINANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ReferenceDocument" (
    "id"                     TEXT NOT NULL,
    "documentKey"            TEXT NOT NULL,
    "displayName"            TEXT NOT NULL,
    "fileName"               TEXT NOT NULL,
    "filePath"               TEXT NOT NULL,
    "documentType"           TEXT NOT NULL,
    "workflowAreas"          TEXT[] NOT NULL DEFAULT '{}',
    "customerFacing"         BOOLEAN NOT NULL DEFAULT false,
    "internalOnly"           BOOLEAN NOT NULL DEFAULT false,
    "requiredForPacket"      BOOLEAN NOT NULL DEFAULT false,
    "appliesWhen"            TEXT,
    "version"                TEXT,
    "effectiveDate"          TIMESTAMP(3),
    "summary"                TEXT,
    "requiredAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "exportPacketSection"    TEXT,
    "isActive"               BOOLEAN NOT NULL DEFAULT true,
    "metadata"               JSONB,
    "createdBy"              TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferenceDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReferenceDocument_documentKey_key" ON "ReferenceDocument"("documentKey");
CREATE INDEX IF NOT EXISTS "ReferenceDocument_documentType_idx" ON "ReferenceDocument"("documentType");

CREATE TABLE IF NOT EXISTS "DocumentAcknowledgment" (
    "id"                 TEXT NOT NULL,
    "documentId"         TEXT NOT NULL,
    "appointmentId"      TEXT NOT NULL,
    "acknowledgmentType" TEXT NOT NULL,
    "value"              BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy"     TEXT,
    "acknowledgedAt"     TIMESTAMP(3),
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentAcknowledgment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAcknowledgment_documentId_appointmentId_acknowledgmentType_key" ON "DocumentAcknowledgment"("documentId", "appointmentId", "acknowledgmentType");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgment_appointmentId_idx" ON "DocumentAcknowledgment"("appointmentId");

CREATE TABLE IF NOT EXISTS "LeadDisclosureReview" (
    "id"                   TEXT NOT NULL,
    "appointmentId"        TEXT NOT NULL,
    "customerId"           TEXT NOT NULL,
    "homeBuiltYear"        INTEGER,
    "pre1978Status"        TEXT NOT NULL DEFAULT 'unknown',
    "disclosureRequired"   BOOLEAN NOT NULL DEFAULT false,
    "disclosureProvided"   BOOLEAN NOT NULL DEFAULT false,
    "reviewedWithCustomer" BOOLEAN NOT NULL DEFAULT false,
    "customerAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy"           TEXT,
    "reviewedAt"           TIMESTAMP(3),
    "notes"                TEXT,
    "metadata"             JSONB,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadDisclosureReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeadDisclosureReview_appointmentId_key" ON "LeadDisclosureReview"("appointmentId");
CREATE INDEX IF NOT EXISTS "LeadDisclosureReview_customerId_idx" ON "LeadDisclosureReview"("customerId");

CREATE TABLE IF NOT EXISTS "FinanceOption" (
    "id"             TEXT NOT NULL,
    "planKey"        TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "termMonths"     INTEGER NOT NULL,
    "apr"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promoType"      TEXT NOT NULL,
    "minimumAmount"  DOUBLE PRECISION,
    "paymentFormula" TEXT,
    "disclosureText" TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceOption_planKey_key" ON "FinanceOption"("planKey");

CREATE TABLE IF NOT EXISTS "AppointmentFinanceSelection" (
    "id"              TEXT NOT NULL,
    "appointmentId"   TEXT NOT NULL,
    "financeOptionId" TEXT NOT NULL,
    "jobAmount"       DOUBLE PRECISION,
    "monthlyPayment"  DOUBLE PRECISION,
    "amountFinanced"  DOUBLE PRECISION,
    "discussed"       BOOLEAN NOT NULL DEFAULT false,
    "inPacket"        BOOLEAN NOT NULL DEFAULT false,
    "selectedBy"      TEXT,
    "selectedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentFinanceSelection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentFinanceSelection_appointmentId_key" ON "AppointmentFinanceSelection"("appointmentId");
CREATE INDEX IF NOT EXISTS "AppointmentFinanceSelection_financeOptionId_idx" ON "AppointmentFinanceSelection"("financeOptionId");

CREATE TABLE IF NOT EXISTS "CustomerDocumentPacket" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "customerId"    TEXT NOT NULL,
    "packetType"    TEXT NOT NULL DEFAULT 'standard',
    "status"        TEXT NOT NULL DEFAULT 'draft',
    "exportFormat"  TEXT,
    "filePath"      TEXT,
    "fileSize"      INTEGER,
    "documents"     JSONB,
    "metadata"      JSONB,
    "createdBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt"    TIMESTAMP(3),
    CONSTRAINT "CustomerDocumentPacket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerDocumentPacket_appointmentId_idx" ON "CustomerDocumentPacket"("appointmentId");
CREATE INDEX IF NOT EXISTS "CustomerDocumentPacket_customerId_idx" ON "CustomerDocumentPacket"("customerId");

CREATE TABLE IF NOT EXISTS "DocumentExportLog" (
    "id"              TEXT NOT NULL,
    "appointmentId"   TEXT NOT NULL,
    "documentKey"     TEXT NOT NULL,
    "documentVersion" TEXT,
    "exportFormat"    TEXT,
    "exportedBy"      TEXT,
    "exportedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata"        JSONB,
    CONSTRAINT "DocumentExportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DocumentExportLog_appointmentId_idx" ON "DocumentExportLog"("appointmentId");
CREATE INDEX IF NOT EXISTS "DocumentExportLog_documentKey_idx" ON "DocumentExportLog"("documentKey");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 17: COMMISSION MODULE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CommissionImport" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "sourceFileName"  TEXT NOT NULL,
    "sourceFilePath"  TEXT,
    "sourceSheetName" TEXT,
    "totalRows"       INTEGER NOT NULL DEFAULT 0,
    "importedRows"    INTEGER NOT NULL DEFAULT 0,
    "skippedRows"     INTEGER NOT NULL DEFAULT 0,
    "failedRows"      INTEGER NOT NULL DEFAULT 0,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "mappingStatus"   TEXT NOT NULL DEFAULT 'needs_mapping',
    "columnMapping"   JSONB,
    "metadata"        JSONB,
    "errorLog"        JSONB,
    "importedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommissionImport_userId_idx" ON "CommissionImport"("userId");
CREATE INDEX IF NOT EXISTS "CommissionImport_status_idx" ON "CommissionImport"("status");

CREATE TABLE IF NOT EXISTS "CommissionImportRow" (
    "id"           TEXT NOT NULL,
    "importId"     TEXT NOT NULL,
    "rowNumber"    INTEGER NOT NULL,
    "rawData"      JSONB NOT NULL,
    "mappedData"   JSONB,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "recordId"     TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionImportRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionImportRow_importId_rowNumber_key" ON "CommissionImportRow"("importId", "rowNumber");
CREATE INDEX IF NOT EXISTS "CommissionImportRow_importId_idx" ON "CommissionImportRow"("importId");
CREATE INDEX IF NOT EXISTS "CommissionImportRow_status_idx" ON "CommissionImportRow"("status");

CREATE TABLE IF NOT EXISTS "CommissionRecord" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "importId"        TEXT,
    "sourceFileName"  TEXT,
    "sourceSheetName" TEXT,
    "sourceRowNumber" INTEGER,
    "customerName"    TEXT,
    "customerId_"     TEXT,
    "customerAddress" TEXT,
    "customerCity"    TEXT,
    "customerState"   TEXT,
    "customerZip"     TEXT,
    "customerPhone"   TEXT,
    "region"          TEXT,
    "contractNumber"  TEXT,
    "orderNumber"     TEXT,
    "soldDate"        TIMESTAMP(3),
    "installDate"     TIMESTAMP(3),
    "salesRepName"    TEXT,
    "salesRepNumber"  TEXT,
    "result"          TEXT,
    "numWindows"      INTEGER,
    "productTypes"    JSONB,
    "jobAmount"       DECIMAL(12,2),
    "totalSaleAmount" DECIMAL(12,2),
    "commissionableAmt" DECIMAL(12,2),
    "commissionRate"  DECIMAL(5,4),
    "commissionAmount" DECIMAL(12,2),
    "paidAmount"      DECIMAL(12,2) DEFAULT 0,
    "unpaidAmount"    DECIMAL(12,2),
    "adjustedAmount"  DECIMAL(12,2),
    "adminFee"        DECIMAL(12,2),
    "commissionStatus" TEXT NOT NULL DEFAULT 'imported',
    "paymentDate"     TIMESTAMP(3),
    "checkNumber"     TEXT,
    "notes"           TEXT,
    "comments"        TEXT,
    "metadata"        JSONB,
    "isDeleted"       BOOLEAN NOT NULL DEFAULT false,
    "deletedAt"       TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommissionRecord_userId_idx" ON "CommissionRecord"("userId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_importId_idx" ON "CommissionRecord"("importId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_commissionStatus_idx" ON "CommissionRecord"("commissionStatus");
CREATE INDEX IF NOT EXISTS "CommissionRecord_soldDate_idx" ON "CommissionRecord"("soldDate");
CREATE INDEX IF NOT EXISTS "CommissionRecord_customerName_idx" ON "CommissionRecord"("customerName");
CREATE INDEX IF NOT EXISTS "CommissionRecord_isDeleted_idx" ON "CommissionRecord"("isDeleted");

CREATE TABLE IF NOT EXISTS "CommissionRecordLink" (
    "id"              TEXT NOT NULL,
    "commissionId"    TEXT NOT NULL,
    "appointmentId"   TEXT,
    "customerId"      TEXT,
    "linkType"        TEXT NOT NULL DEFAULT 'manual',
    "matchConfidence" DOUBLE PRECISION,
    "matchReason"     TEXT,
    "confirmedAt"     TIMESTAMP(3),
    "confirmedBy"     TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRecordLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommissionRecordLink_commissionId_idx" ON "CommissionRecordLink"("commissionId");
CREATE INDEX IF NOT EXISTS "CommissionRecordLink_appointmentId_idx" ON "CommissionRecordLink"("appointmentId");
CREATE INDEX IF NOT EXISTS "CommissionRecordLink_customerId_idx" ON "CommissionRecordLink"("customerId");

CREATE TABLE IF NOT EXISTS "CommissionAdjustment" (
    "id"             TEXT NOT NULL,
    "commissionId"   TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "amount"         DECIMAL(12,2) NOT NULL,
    "reason"         TEXT,
    "notes"          TEXT,
    "adjustedBy"     TEXT,
    "adjustedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommissionAdjustment_commissionId_idx" ON "CommissionAdjustment"("commissionId");

CREATE TABLE IF NOT EXISTS "CommissionPayment" (
    "id"            TEXT NOT NULL,
    "commissionId"  TEXT NOT NULL,
    "amount"        DECIMAL(12,2) NOT NULL,
    "paymentDate"   TIMESTAMP(3),
    "checkNumber"   TEXT,
    "paymentMethod" TEXT,
    "notes"         TEXT,
    "recordedBy"    TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommissionPayment_commissionId_idx" ON "CommissionPayment"("commissionId");
CREATE INDEX IF NOT EXISTS "CommissionPayment_paymentDate_idx" ON "CommissionPayment"("paymentDate");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 18: WALKTHROUGH ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WalkthroughSession" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"  TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'in_progress',
    "currentRoom"    TEXT,
    "completedRooms" JSONB NOT NULL DEFAULT '[]',
    "totalRooms"     INTEGER NOT NULL DEFAULT 0,
    "completionPct"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"    TIMESTAMP(3),
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WalkthroughSession_appointmentId_idx" ON "WalkthroughSession"("appointmentId");

CREATE TABLE IF NOT EXISTS "WalkthroughRoom" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId"     TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "roomName"      TEXT NOT NULL,
    "roomType"      TEXT NOT NULL DEFAULT 'other',
    "floorNumber"   INTEGER NOT NULL DEFAULT 1,
    "sortOrder"     INTEGER NOT NULL DEFAULT 0,
    "openingCount"  INTEGER NOT NULL DEFAULT 0,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "notes"         TEXT,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoom_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WalkthroughRoom_sessionId_idx" ON "WalkthroughRoom"("sessionId");
CREATE INDEX IF NOT EXISTS "WalkthroughRoom_appointmentId_idx" ON "WalkthroughRoom"("appointmentId");

CREATE TABLE IF NOT EXISTS "WalkthroughRoomOpening" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "roomId"          TEXT NOT NULL,
    "openingId"       TEXT,
    "openingNumber"   INTEGER,
    "productType"     TEXT,
    "width"           DOUBLE PRECISION,
    "height"          DOUBLE PRECISION,
    "notes"           TEXT,
    "hasPhoto"        BOOLEAN NOT NULL DEFAULT false,
    "hasSketchMarker" BOOLEAN NOT NULL DEFAULT false,
    "hasMeasurement"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoomOpening_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WalkthroughRoomOpening_roomId_idx" ON "WalkthroughRoomOpening"("roomId");

CREATE TABLE IF NOT EXISTS "WalkthroughRoomNote" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "roomId"    TEXT NOT NULL,
    "noteType"  TEXT NOT NULL DEFAULT 'text',
    "noteText"  TEXT,
    "audioUrl"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoomNote_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 19: OPENING TEMPLATES & AI CHAT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OpeningTemplate" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "category"        TEXT NOT NULL DEFAULT 'standard',
    "productCategory" TEXT,
    "interiorColor"   TEXT,
    "exteriorColor"   TEXT,
    "gridStyle"       TEXT,
    "temperedGlass"   TEXT,
    "obscureGlass"    TEXT,
    "screenOption"    TEXT,
    "foamEnhanced"    BOOLEAN DEFAULT false,
    "installNotes"    TEXT,
    "removalType"     TEXT,
    "isDefault"       BOOLEAN NOT NULL DEFAULT false,
    "usageCount"      INTEGER NOT NULL DEFAULT 0,
    "metadata"        JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningTemplateUsageLog" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "templateId"    TEXT NOT NULL,
    "appointmentId" TEXT,
    "openingId"     TEXT,
    "userId"        TEXT,
    "appliedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningTemplateUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiChatSession" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT,
    "userId"        TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'active',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiChatSession_appointmentId_idx" ON "AiChatSession"("appointmentId");

CREATE TABLE IF NOT EXISTS "AiChatMessage" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId"   TEXT NOT NULL,
    "role"        TEXT NOT NULL DEFAULT 'user',
    "content"     TEXT NOT NULL,
    "actionItems" JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CallbackRiskScore" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"   TEXT NOT NULL,
    "overallRisk"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "measurementRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sketchRisk"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingRisk"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notesRisk"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signatureRisk"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel"       TEXT NOT NULL DEFAULT 'REVIEW',
    "blockers"        JSONB NOT NULL DEFAULT '[]',
    "computedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallbackRiskScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CallbackRiskScore_appointmentId_idx" ON "CallbackRiskScore"("appointmentId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 20: MOBILE FIELD APP TABLES
-- (mobile.ts route — raw SQL tables not in Prisma schema)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MobileDevice" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"      TEXT NOT NULL,
    "deviceName"  TEXT,
    "platform"    TEXT,
    "pushToken"   TEXT,
    "lastSeenAt"  TIMESTAMP(3),
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileDevice_userId_idx" ON "MobileDevice"("userId");

CREATE TABLE IF NOT EXISTS "MobileSession" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"        TEXT NOT NULL,
    "deviceId"      TEXT,
    "appointmentId" TEXT,
    "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"       TIMESTAMP(3),
    "syncStatus"    TEXT NOT NULL DEFAULT 'pending',
    "lastSyncAt"    TIMESTAMP(3),
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileSession_userId_idx" ON "MobileSession"("userId");
CREATE INDEX IF NOT EXISTS "MobileSession_appointmentId_idx" ON "MobileSession"("appointmentId");

CREATE TABLE IF NOT EXISTS "MobileRecording" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"          TEXT NOT NULL,
    "appointmentId"   TEXT,
    "openingId"       TEXT,
    "deviceId"        TEXT,
    "audioUrl"        TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "fileSizeBytes"   INTEGER,
    "mimeType"        TEXT DEFAULT 'audio/webm',
    "status"          TEXT NOT NULL DEFAULT 'saved',
    "syncStatus"      TEXT NOT NULL DEFAULT 'pending',
    "errorMessage"    TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecording_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileRecording_appointmentId_idx" ON "MobileRecording"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecording_userId_idx" ON "MobileRecording"("userId");
CREATE INDEX IF NOT EXISTS "MobileRecording_status_idx" ON "MobileRecording"("status");

CREATE TABLE IF NOT EXISTS "MobileRecordingTranscript" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "recordingId"   TEXT NOT NULL,
    "rawText"       TEXT NOT NULL,
    "cleanedText"   TEXT,
    "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider"      TEXT,
    "languageCode"  TEXT DEFAULT 'en-US',
    "processingMs"  INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecordingTranscript_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileRecordingTranscript_recordingId_idx" ON "MobileRecordingTranscript"("recordingId");

CREATE TABLE IF NOT EXISTS "MobileRecordingFieldExtraction" (
    "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "recordingId"         TEXT NOT NULL,
    "appointmentId"       TEXT,
    "openingId"           TEXT,
    "sourceType"          TEXT NOT NULL DEFAULT 'recording',
    "sourceText"          TEXT,
    "targetTable"         TEXT NOT NULL,
    "targetField"         TEXT NOT NULL,
    "originalValue"       TEXT,
    "normalizedValue"     TEXT,
    "confidenceScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresReview"      BOOLEAN NOT NULL DEFAULT true,
    "status"              TEXT NOT NULL DEFAULT 'pending',
    "appliedBy"           TEXT,
    "approvedAt"          TIMESTAMP(3),
    "openingNumber"       INTEGER,
    "pricingImpact"       BOOLEAN NOT NULL DEFAULT false,
    "pricingImpactNote"   TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRecordingFieldExtraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_recordingId_idx" ON "MobileRecordingFieldExtraction"("recordingId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_appointmentId_idx" ON "MobileRecordingFieldExtraction"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileRecordingFieldExtraction_status_idx" ON "MobileRecordingFieldExtraction"("status");

CREATE TABLE IF NOT EXISTS "MobileTextNote" (
    "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"           TEXT NOT NULL,
    "appointmentId"    TEXT,
    "openingId"        TEXT,
    "deviceId"         TEXT,
    "noteText"         TEXT NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncStatus"       TEXT NOT NULL DEFAULT 'pending',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileTextNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileTextNote_appointmentId_idx" ON "MobileTextNote"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileTextNote_userId_idx" ON "MobileTextNote"("userId");

CREATE TABLE IF NOT EXISTS "MobileTextNoteExtraction" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "noteId"          TEXT NOT NULL,
    "sourceText"      TEXT,
    "targetTable"     TEXT NOT NULL,
    "targetField"     TEXT NOT NULL,
    "originalValue"   TEXT,
    "normalizedValue" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresReview"  BOOLEAN NOT NULL DEFAULT true,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "openingNumber"   INTEGER,
    "pricingImpact"   BOOLEAN NOT NULL DEFAULT false,
    "appliedBy"       TEXT,
    "approvedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileTextNoteExtraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileTextNoteExtraction_noteId_idx" ON "MobileTextNoteExtraction"("noteId");

CREATE TABLE IF NOT EXISTS "MobileSyncQueue" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"      TEXT NOT NULL,
    "deviceId"    TEXT,
    "appointmentId" TEXT,
    "entityType"  TEXT NOT NULL,
    "entityId"    TEXT NOT NULL,
    "operation"   TEXT NOT NULL,
    "payload"     JSONB NOT NULL DEFAULT '{}',
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "retryCount"  INTEGER NOT NULL DEFAULT 0,
    "lastError"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt"    TIMESTAMP(3),
    CONSTRAINT "MobileSyncQueue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_userId_status_idx" ON "MobileSyncQueue"("userId", "status");
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_appointmentId_idx" ON "MobileSyncQueue"("appointmentId");

CREATE TABLE IF NOT EXISTS "MobileConflict" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"       TEXT NOT NULL,
    "appointmentId" TEXT,
    "entityType"   TEXT NOT NULL,
    "entityId"     TEXT NOT NULL,
    "fieldName"    TEXT NOT NULL,
    "localValue"   TEXT,
    "remoteValue"  TEXT,
    "resolution"   TEXT,
    "resolvedBy"   TEXT,
    "resolvedAt"   TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'open',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileConflict_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileConflict_appointmentId_idx" ON "MobileConflict"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileConflict_status_idx" ON "MobileConflict"("status");

CREATE TABLE IF NOT EXISTS "MobileOfflineDraft" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"        TEXT NOT NULL,
    "deviceId"      TEXT,
    "appointmentId" TEXT,
    "draftType"     TEXT NOT NULL,
    "draftData"     JSONB NOT NULL DEFAULT '{}',
    "syncStatus"    TEXT NOT NULL DEFAULT 'pending',
    "version"       INTEGER NOT NULL DEFAULT 1,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileOfflineDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_userId_idx" ON "MobileOfflineDraft"("userId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_appointmentId_idx" ON "MobileOfflineDraft"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_syncStatus_idx" ON "MobileOfflineDraft"("syncStatus");

CREATE TABLE IF NOT EXISTS "MobileEditHistory" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"        TEXT NOT NULL,
    "appointmentId" TEXT,
    "entityType"    TEXT NOT NULL,
    "entityId"      TEXT NOT NULL,
    "fieldName"     TEXT NOT NULL,
    "oldValue"      TEXT,
    "newValue"      TEXT,
    "sourceType"    TEXT,
    "deviceId"      TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileEditHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileEditHistory_appointmentId_idx" ON "MobileEditHistory"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileEditHistory_entityId_idx" ON "MobileEditHistory"("entityId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 21: AI FIELD ASSISTANCE TABLES (from mobile migration)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AiFieldSuggestion" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"  TEXT,
    "openingId"      TEXT,
    "sourceType"     TEXT NOT NULL,
    "sourceId"       TEXT,
    "targetTable"    TEXT NOT NULL,
    "targetField"    TEXT NOT NULL,
    "suggestedValue" TEXT NOT NULL,
    "confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasoning"      TEXT,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "pricingImpact"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiFieldSuggestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiFieldSuggestion_appointmentId_idx" ON "AiFieldSuggestion"("appointmentId");
CREATE INDEX IF NOT EXISTS "AiFieldSuggestion_status_idx" ON "AiFieldSuggestion"("status");

CREATE TABLE IF NOT EXISTS "AppointmentQualityScore" (
    "id"                        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"             TEXT NOT NULL,
    "overallScore"              DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installerClarityScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "measurementConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingConfidenceScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractAccuracyScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sketchCompletenessScore"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel"                 TEXT NOT NULL DEFAULT 'REVIEW',
    "criticalIssueCount"        INTEGER NOT NULL DEFAULT 0,
    "warningCount"              INTEGER NOT NULL DEFAULT 0,
    "computedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentQualityScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AppointmentQualityScore_appointmentId_idx" ON "AppointmentQualityScore"("appointmentId");

CREATE TABLE IF NOT EXISTS "FinalPacketCheck" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT NOT NULL,
    "checkType"     TEXT NOT NULL,
    "passed"        BOOLEAN NOT NULL DEFAULT false,
    "blockerLevel"  TEXT NOT NULL DEFAULT 'warning',
    "message"       TEXT NOT NULL,
    "checkedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalPacketCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinalPacketCheck_appointmentId_idx" ON "FinalPacketCheck"("appointmentId");

CREATE TABLE IF NOT EXISTS "VoiceFieldMapping" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "voiceSessionId"  TEXT,
    "recordingId"     TEXT,
    "appointmentId"   TEXT,
    "openingNumber"   INTEGER,
    "sourcePhrase"    TEXT,
    "targetTable"     TEXT NOT NULL,
    "targetField"     TEXT NOT NULL,
    "mappedValue"     TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresReview"  BOOLEAN NOT NULL DEFAULT false,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceFieldMapping_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VoiceFieldMapping_appointmentId_idx" ON "VoiceFieldMapping"("appointmentId");
CREATE INDEX IF NOT EXISTS "VoiceFieldMapping_voiceSessionId_idx" ON "VoiceFieldMapping"("voiceSessionId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 22: FIELD INTELLIGENCE MODULES (M1-M19) — already in prior migrations
-- Idempotent guards ensure safe re-application
-- ─────────────────────────────────────────────────────────────────────────────

-- Module 11: Lead-Time Intelligence
CREATE TABLE IF NOT EXISTS "LeadTimeProfile" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "manufacturerId" TEXT,
    "seriesId"       TEXT,
    "baseDays"       INT DEFAULT 14,
    "isActive"       BOOLEAN DEFAULT true,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LeadTimeModifier" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId"      TEXT REFERENCES "LeadTimeProfile"("id") ON DELETE CASCADE,
    "conditionType"  TEXT NOT NULL,
    "conditionValue" TEXT,
    "addDays"        INT DEFAULT 0,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SupplyRiskFlag" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"    TEXT,
    "riskType"    TEXT NOT NULL,
    "description" TEXT,
    "severity"    TEXT DEFAULT 'medium',
    "activeUntil" TIMESTAMPTZ,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

-- Module 12: Production Packet Generator
CREATE TABLE IF NOT EXISTS "PacketTemplate" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "packetType"  TEXT NOT NULL,
    "sections"    JSONB,
    "isActive"    BOOLEAN DEFAULT true,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GeneratedPacket" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId" TEXT NOT NULL,
    "templateId"    TEXT REFERENCES "PacketTemplate"("id"),
    "packetType"    TEXT NOT NULL,
    "status"        TEXT DEFAULT 'draft',
    "fileUrl"       TEXT,
    "fileFormat"    TEXT DEFAULT 'pdf',
    "generatedBy"   TEXT,
    "generatedAt"   TIMESTAMPTZ DEFAULT now(),
    "metadata"      JSONB,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "GeneratedPacket_appointmentId_idx" ON "GeneratedPacket"("appointmentId");

-- Module 13: AI Sales Optimization
CREATE TABLE IF NOT EXISTS "SalesRecommendationRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"           TEXT NOT NULL,
    "category"       TEXT NOT NULL,
    "conditionJson"  JSONB,
    "recommendation" TEXT NOT NULL,
    "upsellAmount"   DOUBLE PRECISION DEFAULT 0,
    "priority"       INT DEFAULT 5,
    "isActive"       BOOLEAN DEFAULT true,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "OptionBundle" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"          TEXT NOT NULL,
    "tier"          TEXT DEFAULT 'better',
    "options"       JSONB NOT NULL,
    "bundlePrice"   DOUBLE PRECISION DEFAULT 0,
    "savingsAmount" DOUBLE PRECISION DEFAULT 0,
    "isActive"      BOOLEAN DEFAULT true,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "FinancingProfile" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "termMonths"  INT NOT NULL,
    "apr"         DOUBLE PRECISION DEFAULT 0,
    "promoType"   TEXT,
    "minAmount"   DOUBLE PRECISION,
    "isActive"    BOOLEAN DEFAULT true,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

-- Module 14: Field Shortcuts
CREATE TABLE IF NOT EXISTS "FieldShortcut" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "shortcutKey" TEXT NOT NULL UNIQUE,
    "category"    TEXT DEFAULT 'conversion',
    "description" TEXT,
    "actionsJson" JSONB NOT NULL,
    "isActive"    BOOLEAN DEFAULT true,
    "sortOrder"   INT DEFAULT 0,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PricingAdder" (
    "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"               TEXT NOT NULL,
    "adderType"          TEXT NOT NULL,
    "amount"             DOUBLE PRECISION DEFAULT 0,
    "pricingLogic"       TEXT DEFAULT 'flat',
    "firstUnitAmount"    DOUBLE PRECISION,
    "additionalAmount"   DOUBLE PRECISION,
    "isActive"           BOOLEAN DEFAULT true,
    "createdAt"          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "IncludedScopeRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "exteriorType"   TEXT NOT NULL,
    "includesTrim"   BOOLEAN DEFAULT false,
    "includesHeader" BOOLEAN DEFAULT false,
    "notes"          TEXT,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

-- Module 15: Quote Visualization
CREATE TABLE IF NOT EXISTS "ProposalVersion" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId"  TEXT NOT NULL,
    "versionNumber"  INT DEFAULT 1,
    "status"         TEXT DEFAULT 'draft',
    "totalPrice"     DOUBLE PRECISION DEFAULT 0,
    "optionsJson"    JSONB,
    "createdBy"      TEXT,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ProposalVersion_appointmentId_idx" ON "ProposalVersion"("appointmentId");

CREATE TABLE IF NOT EXISTS "ProposalOption" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "proposalId"  TEXT REFERENCES "ProposalVersion"("id") ON DELETE CASCADE,
    "tier"        TEXT DEFAULT 'good',
    "label"       TEXT NOT NULL,
    "totalPrice"  DOUBLE PRECISION DEFAULT 0,
    "optionsJson" JSONB,
    "isSelected"  BOOLEAN DEFAULT false,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "FinancingScenario" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "proposalId"     TEXT REFERENCES "ProposalVersion"("id") ON DELETE CASCADE,
    "profileId"      TEXT,
    "totalAmount"    DOUBLE PRECISION DEFAULT 0,
    "monthlyPayment" DOUBLE PRECISION DEFAULT 0,
    "termMonths"     INT,
    "apr"            DOUBLE PRECISION DEFAULT 0,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

-- Module 16: Window Knowledge Library
CREATE TABLE IF NOT EXISTS "WindowDefaultProfile" (
    "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"            TEXT NOT NULL,
    "productCategory" TEXT,
    "width"           DOUBLE PRECISION,
    "height"          DOUBLE PRECISION,
    "defaultsJson"    JSONB NOT NULL,
    "notes"           TEXT,
    "createdAt"       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SpecialtyShapeDefault" (
    "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "shapeType"    TEXT NOT NULL,
    "width"        DOUBLE PRECISION,
    "height"       DOUBLE PRECISION,
    "rise"         DOUBLE PRECISION,
    "radius"       DOUBLE PRECISION,
    "legHeight"    DOUBLE PRECISION,
    "geometryJson" JSONB,
    "notes"        TEXT,
    "createdAt"    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SashSplitPreset" (
    "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"         TEXT NOT NULL,
    "splitType"    TEXT NOT NULL,
    "topRatio"     DOUBLE PRECISION,
    "bottomRatio"  DOUBLE PRECISION,
    "notes"        TEXT,
    "createdAt"    TIMESTAMPTZ DEFAULT now()
);

-- Module 17: Specialty Shape Library
CREATE TABLE IF NOT EXISTS "SpecialtyShape" (
    "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"               TEXT NOT NULL,
    "shapeType"          TEXT NOT NULL UNIQUE,
    "category"           TEXT DEFAULT 'standard',
    "geometryJson"       JSONB,
    "validationJson"     JSONB,
    "pricingMultiplier"  DOUBLE PRECISION DEFAULT 1,
    "leadTimeAddDays"    INT DEFAULT 0,
    "isActive"           BOOLEAN DEFAULT true,
    "createdAt"          TIMESTAMPTZ DEFAULT now()
);

-- Module 18: Remake Analytics
CREATE TABLE IF NOT EXISTS "RemakeEvent" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId" TEXT NOT NULL,
    "openingId"     TEXT,
    "eventType"     TEXT NOT NULL,
    "reason"        TEXT,
    "severity"      TEXT DEFAULT 'medium',
    "costImpact"    DOUBLE PRECISION DEFAULT 0,
    "resolvedAt"    TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "RemakeEvent_appointmentId_idx" ON "RemakeEvent"("appointmentId");

CREATE TABLE IF NOT EXISTS "InstallIssue" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId" TEXT NOT NULL,
    "openingId"     TEXT,
    "issueType"     TEXT NOT NULL,
    "description"   TEXT,
    "severity"      TEXT DEFAULT 'medium',
    "resolvedAt"    TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CallbackLog" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId"  TEXT NOT NULL,
    "reason"         TEXT,
    "scheduledDate"  TIMESTAMPTZ,
    "completedDate"  TIMESTAMPTZ,
    "notes"          TEXT,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MeasurementRevisionHistory" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "appointmentId" TEXT NOT NULL,
    "openingId"     TEXT,
    "fieldName"     TEXT NOT NULL,
    "oldValue"      TEXT,
    "newValue"      TEXT,
    "reason"        TEXT,
    "revisedBy"     TEXT,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

-- Module 19: Sales Rep Performance
CREATE TABLE IF NOT EXISTS "RepPerformanceMetric" (
    "id"                      TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"                  TEXT NOT NULL,
    "periodStart"             TIMESTAMPTZ NOT NULL,
    "periodEnd"               TIMESTAMPTZ NOT NULL,
    "closeRate"               DOUBLE PRECISION,
    "avgDealSize"             DOUBLE PRECISION,
    "avgMarginPct"            DOUBLE PRECISION,
    "remakeRate"              DOUBLE PRECISION,
    "callbackRate"            DOUBLE PRECISION,
    "financingUsagePct"       DOUBLE PRECISION,
    "optionAttachRate"        DOUBLE PRECISION,
    "avgSpeedToProposalMin"   DOUBLE PRECISION,
    "configAccuracyPct"       DOUBLE PRECISION,
    "createdAt"               TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "RepPerformanceMetric_userId_idx" ON "RepPerformanceMetric"("userId");

CREATE TABLE IF NOT EXISTS "SalesActivityLog" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"        TEXT NOT NULL,
    "appointmentId" TEXT,
    "activityType"  TEXT NOT NULL,
    "details"       JSONB,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "SalesActivityLog_userId_idx" ON "SalesActivityLog"("userId");

CREATE TABLE IF NOT EXISTS "ProposalConversionEvent" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"        TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "proposalId"    TEXT,
    "eventType"     TEXT NOT NULL,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CoachingInsight" (
    "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"       TEXT NOT NULL,
    "insightType"  TEXT NOT NULL,
    "message"      TEXT NOT NULL,
    "priority"     INT DEFAULT 5,
    "acknowledged" BOOLEAN DEFAULT false,
    "createdAt"    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "CoachingInsight_userId_idx" ON "CoachingInsight"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 23: MANUFACTURER CONSTRAINT ENGINE (M1 from field intelligence)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ManufacturerProfile" (
    "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"      TEXT NOT NULL,
    "code"      TEXT NOT NULL UNIQUE,
    "isActive"  BOOLEAN DEFAULT true,
    "notes"     TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerSeries" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "manufacturerId" TEXT NOT NULL REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE,
    "name"           TEXT NOT NULL,
    "code"           TEXT NOT NULL,
    "isActive"       BOOLEAN DEFAULT true,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ManufacturerSeries_manufacturerId_idx" ON "ManufacturerSeries"("manufacturerId");

CREATE TABLE IF NOT EXISTS "ManufacturerSizeLimit" (
    "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"        TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "productCategory" TEXT,
    "minWidth"        DOUBLE PRECISION, "maxWidth" DOUBLE PRECISION,
    "minHeight"       DOUBLE PRECISION, "maxHeight" DOUBLE PRECISION,
    "maxUI"           DOUBLE PRECISION,
    "notes"           TEXT,
    "createdAt"       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerColorRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"       TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "colorName"      TEXT NOT NULL,
    "colorCode"      TEXT,
    "isInterior"     BOOLEAN DEFAULT true,
    "isExterior"     BOOLEAN DEFAULT true,
    "leadTimeDays"   INT DEFAULT 0,
    "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerGlassRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"       TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "glassPackage"   TEXT NOT NULL,
    "isAvailable"    BOOLEAN DEFAULT true,
    "leadTimeDays"   INT DEFAULT 0,
    "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerGridRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"       TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "gridStyle"      TEXT NOT NULL,
    "isAvailable"    BOOLEAN DEFAULT true,
    "upchargeAmount" DOUBLE PRECISION DEFAULT 0,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerMullRule" (
    "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"            TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "maxUnits"            INT DEFAULT 3,
    "maxCombinedWidth"    DOUBLE PRECISION,
    "requiresStructural"  BOOLEAN DEFAULT false,
    "notes"               TEXT,
    "createdAt"           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerDpRatingRule" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"    TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "dpRating"    INT NOT NULL,
    "windZone"    TEXT,
    "isAvailable" BOOLEAN DEFAULT true,
    "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ManufacturerLeadTimeRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "seriesId"       TEXT NOT NULL REFERENCES "ManufacturerSeries"("id") ON DELETE CASCADE,
    "conditionType"  TEXT NOT NULL,
    "conditionValue" TEXT,
    "addDays"        INT DEFAULT 0,
    "riskLevel"      TEXT DEFAULT 'standard',
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

-- Rough Opening Engine (M2)
CREATE TABLE IF NOT EXISTS "RoughOpeningProfile" (
    "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"             TEXT NOT NULL,
    "frameType"        TEXT NOT NULL,
    "widthAdd"         DOUBLE PRECISION DEFAULT 0,
    "heightAdd"        DOUBLE PRECISION DEFAULT 0,
    "shimAllowance"    DOUBLE PRECISION DEFAULT 0.25,
    "sealantAllowance" DOUBLE PRECISION DEFAULT 0.125,
    "trimWidth"        DOUBLE PRECISION,
    "headerHeight"     DOUBLE PRECISION,
    "notes"            TEXT,
    "isDefault"        BOOLEAN DEFAULT false,
    "createdAt"        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "InstallSurfaceRule" (
    "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "surfaceType"     TEXT NOT NULL,
    "profileId"       TEXT REFERENCES "RoughOpeningProfile"("id"),
    "additionalNotes" TEXT,
    "createdAt"       TIMESTAMPTZ DEFAULT now()
);

-- Install Complexity Scoring (M3)
CREATE TABLE IF NOT EXISTS "InstallComplexityRule" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "factorName"     TEXT NOT NULL,
    "conditionType"  TEXT NOT NULL,
    "conditionValue" TEXT,
    "points"         INT DEFAULT 1,
    "isActive"       BOOLEAN DEFAULT true,
    "createdAt"      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LaborHourProfile" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "complexityMin" INT NOT NULL,
    "complexityMax" INT NOT NULL,
    "baseHours"     DOUBLE PRECISION NOT NULL,
    "hourlyRate"    DOUBLE PRECISION DEFAULT 45,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ScaffoldRule" (
    "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "triggerCondition" TEXT NOT NULL,
    "addedCost"        DOUBLE PRECISION DEFAULT 0,
    "addedHours"       DOUBLE PRECISION DEFAULT 0,
    "notes"            TEXT,
    "createdAt"        TIMESTAMPTZ DEFAULT now()
);

-- Live Profit Engine (M4)
CREATE TABLE IF NOT EXISTS "CostProfile" (
    "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"              TEXT NOT NULL,
    "materialCostPct"   DOUBLE PRECISION DEFAULT 0.35,
    "laborCostPerHour"  DOUBLE PRECISION DEFAULT 45,
    "disposalFlat"      DOUBLE PRECISION DEFAULT 25,
    "fuelFlat"          DOUBLE PRECISION DEFAULT 15,
    "permitFlat"        DOUBLE PRECISION DEFAULT 0,
    "financingFeeRate"  DOUBLE PRECISION DEFAULT 0.03,
    "commissionRate"    DOUBLE PRECISION DEFAULT 0.08,
    "riskReserveRate"   DOUBLE PRECISION DEFAULT 0.02,
    "isDefault"         BOOLEAN DEFAULT false,
    "createdAt"         TIMESTAMPTZ DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MarginTarget" (
    "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "label"        TEXT NOT NULL,
    "greenMinPct"  DOUBLE PRECISION DEFAULT 25,
    "yellowMinPct" DOUBLE PRECISION DEFAULT 15,
    "isDefault"    BOOLEAN DEFAULT false,
    "createdAt"    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DiscountGuardrail" (
    "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "maxDiscountPct"        DOUBLE PRECISION DEFAULT 15,
    "requiresApproval"      BOOLEAN DEFAULT true,
    "approvalThresholdPct"  DOUBLE PRECISION DEFAULT 10,
    "notes"                 TEXT,
    "createdAt"             TIMESTAMPTZ DEFAULT now()
);

-- AI Error Prevention (M5)
CREATE TABLE IF NOT EXISTS "ValidationRule" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"          TEXT NOT NULL,
    "category"      TEXT NOT NULL,
    "conditionJson" JSONB,
    "message"       TEXT NOT NULL,
    "severity"      TEXT DEFAULT 'high',
    "isActive"      BOOLEAN DEFAULT true,
    "createdAt"     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AnomalyDetectionProfile" (
    "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "metricName"       TEXT NOT NULL,
    "minValue"         DOUBLE PRECISION,
    "maxValue"         DOUBLE PRECISION,
    "stdDevThreshold"  DOUBLE PRECISION DEFAULT 2,
    "message"          TEXT,
    "createdAt"        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "RemakeRiskPattern" (
    "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "patternName"      TEXT NOT NULL,
    "description"      TEXT,
    "triggerCondition" JSONB,
    "riskScore"        INT DEFAULT 5,
    "recommendation"   TEXT,
    "createdAt"        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 24: ROW LEVEL SECURITY — enable for all new tenant-scoped tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Company"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opening"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningPhoto"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signature"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HouseMap"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HouseMapMarker"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceSession"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceTranscript"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceExtractedEntity"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormInstance"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditorIssue"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RepPerformance"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormSketch"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMarker"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMarkerGroup"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMarkerLink"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessRule"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentTimelineEvent"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningSafetyGlazingReview"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemperedGlazingFlag"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiValidationWarning"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeasurementRule"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeasurementAdjustment"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkbookTemplate"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionImport"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionRecord"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingVersion"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingVersionItem"            ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 25: SERVICE ROLE BYPASS POLICIES (idempotent)
-- Allow the server-side Prisma client (service_role) full access
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Company', 'User', 'Customer', 'Appointment', 'Opening', 'OpeningPhoto',
    'QuoteLineItem', 'Contract', 'Signature', 'Payment',
    'HouseMap', 'HouseMapMarker', 'VoiceSession', 'VoiceTranscript', 'VoiceExtractedEntity',
    'FormInstance', 'AuditLog', 'AuditorIssue', 'RepPerformance',
    'FormSketch', 'SketchLayer', 'SketchMarker', 'SketchMarkerGroup', 'SketchMarkerGroupMember',
    'SketchMarkerLink', 'SketchMeasurementValidation', 'SketchPricingValidation',
    'SketchAiInterpretation', 'SketchWarningFlag', 'SketchCompletenessScore', 'InstallerClarityScore',
    'BusinessRule', 'BusinessRuleExecutionLog', 'AppointmentTimelineEvent',
    'OpeningSafetyGlazingReview', 'TemperedGlazingFlag', 'AiValidationWarning',
    'MeasurementRule', 'MeasurementAdjustment', 'MeasurementCapturePhoto', 'MeasurementPhotoRead',
    'MeasurementRuleExecutionLog', 'SpecialtyMeasurementSession', 'SpecialtyMeasurementValue',
    'SpecialtyMeasurementValidation', 'WorkbookTemplate', 'WorkbookTemplateVersion',
    'WorkbookFieldMapping', 'WorkbookFieldValue', 'WorkbookExportJob',
    'ReferenceDocument', 'DocumentAcknowledgment', 'LeadDisclosureReview',
    'FinanceOption', 'AppointmentFinanceSelection', 'CustomerDocumentPacket', 'DocumentExportLog',
    'CommissionImport', 'CommissionImportRow', 'CommissionRecord', 'CommissionRecordLink',
    'CommissionAdjustment', 'CommissionPayment',
    'PricingVersion', 'PricingVersionItem', 'PricingImport', 'PricingImportRow',
    'MissingPricingRule', 'PricingTable', 'PricingItem',
    'WalkthroughSession', 'WalkthroughRoom', 'WalkthroughRoomOpening', 'WalkthroughRoomNote',
    'OpeningTemplate', 'OpeningTemplateUsageLog', 'AiChatSession', 'AiChatMessage',
    'CallbackRiskScore', 'MobileRecording', 'MobileRecordingTranscript',
    'MobileRecordingFieldExtraction', 'MobileTextNote', 'MobileTextNoteExtraction',
    'MobileSyncQueue', 'MobileOfflineDraft', 'MobileConflict', 'MobileEditHistory',
    'MobileDevice', 'MobileSession', 'AiFieldSuggestion', 'AppointmentQualityScore',
    'FinalPacketCheck', 'VoiceFieldMapping'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "service_all_%s" ON "%s" FOR ALL USING (auth.role() = ''service_role'')',
        tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Admin bypass policy (idempotent)
DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Company', 'User', 'Customer', 'Appointment', 'Opening', 'OpeningPhoto',
    'QuoteLineItem', 'Contract', 'Signature', 'Payment', 'HouseMap', 'HouseMapMarker',
    'AuditLog', 'AuditorIssue', 'RepPerformance', 'BusinessRule', 'PricingVersion',
    'PricingVersionItem', 'PricingTable', 'PricingItem', 'CommissionImport', 'CommissionRecord'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "admin_all_%s" ON "%s" FOR ALL USING (auth.jwt() ->> ''email'' = ''nedpearson@gmail.com'')',
        tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 26: FINAL COLUMN GUARDS — Add any missing columns via ALTER TABLE
-- Safety net for tables that may have been created by earlier migrations
-- without all required columns
-- ─────────────────────────────────────────────────────────────────────────────

-- AiValidationWarning: Prisma schema has both 'category' and 'warningType' fields
-- older mobile migration only had warningType; newer Prisma model has category
ALTER TABLE "AiValidationWarning"
    ADD COLUMN IF NOT EXISTS "category"      TEXT,
    ADD COLUMN IF NOT EXISTS "warningType"   TEXT,
    ADD COLUMN IF NOT EXISTS "openingNumber" INTEGER,
    ADD COLUMN IF NOT EXISTS "sourceType"    TEXT DEFAULT 'ai',
    ADD COLUMN IF NOT EXISTS "sourcePhrase"  TEXT,
    ADD COLUMN IF NOT EXISTS "resolvedBy"    TEXT,
    ADD COLUMN IF NOT EXISTS "resolvedAt"    TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Opening: extra specialty shape columns added in Prisma schema
ALTER TABLE "Opening"
    ADD COLUMN IF NOT EXISTS "orielType"                 TEXT,
    ADD COLUMN IF NOT EXISTS "orielUpperSashHeight"      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "orielMeasurementBasis"     TEXT,
    ADD COLUMN IF NOT EXISTS "orielMeetingRailReference" TEXT,
    ADD COLUMN IF NOT EXISTS "orielConfirmed"            BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "orielNotes"                TEXT,
    ADD COLUMN IF NOT EXISTS "gridProfile"               TEXT,
    ADD COLUMN IF NOT EXISTS "gridNotes"                 TEXT,
    ADD COLUMN IF NOT EXISTS "gridConfirmed"             BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS "sdlSize"                   TEXT,
    ADD COLUMN IF NOT EXISTS "isSDL"                     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isGBG"                     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "gridRequiresAudit"         BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "exteriorSurface"           TEXT,
    ADD COLUMN IF NOT EXISTS "exteriorConditionNotes"    TEXT,
    ADD COLUMN IF NOT EXISTS "requiresTrimHeader"        BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "requiresSpecialHandling"   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "copiedFromOpeningId"       TEXT,
    ADD COLUMN IF NOT EXISTS "measurementConfirmed"      BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS "safetyConfirmed"           BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "shapeType"                 TEXT,
    ADD COLUMN IF NOT EXISTS "shapeOrientation"          TEXT,
    ADD COLUMN IF NOT EXISTS "shapeSpringlineHeight"     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeRise"                 DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeHighSide"             DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeLowSide"              DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "shapeSlopeDirection"       TEXT,
    ADD COLUMN IF NOT EXISTS "shapeAcrossFlats"          DOUBLE PRECISION;

-- Appointment: ensure all optional columns exist
ALTER TABLE "Appointment"
    ADD COLUMN IF NOT EXISTS "lockedAt"         TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lockedReason"     TEXT,
    ADD COLUMN IF NOT EXISTS "completionPct"    DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "pricingVersionId" TEXT,
    ADD COLUMN IF NOT EXISTS "estimatorNotes"   TEXT,
    ADD COLUMN IF NOT EXISTS "installerNotes"   TEXT,
    ADD COLUMN IF NOT EXISTS "officeNotes"      TEXT,
    ADD COLUMN IF NOT EXISTS "financingAmount"  DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "adminFee"         DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "poNumber"         TEXT,
    ADD COLUMN IF NOT EXISTS "accountNumber"    TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: WalkthroughSession + WalkthroughRoom tables (walkthrough.ts routes)
-- Added here as a safety net; full CREATE TABLE blocks are earlier in this file.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure WalkthroughSession exists (idempotent)
CREATE TABLE IF NOT EXISTS "WalkthroughSession" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT NOT NULL,
    "companyId"     TEXT,
    "userId"        TEXT,
    "status"        TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"   TIMESTAMP(3),
    "totalRooms"    INTEGER NOT NULL DEFAULT 0,
    "totalOpenings" INTEGER NOT NULL DEFAULT 0,
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalkthroughSession"
    ADD COLUMN IF NOT EXISTS "companyId"     TEXT,
    ADD COLUMN IF NOT EXISTS "totalRooms"    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "totalOpenings" INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "notes"         TEXT;

CREATE INDEX IF NOT EXISTS "WalkthroughSession_appointmentId_idx" ON "WalkthroughSession"("appointmentId");
CREATE INDEX IF NOT EXISTS "WalkthroughSession_companyId_idx"     ON "WalkthroughSession"("companyId");
CREATE INDEX IF NOT EXISTS "WalkthroughSession_status_idx"        ON "WalkthroughSession"("status");

CREATE TABLE IF NOT EXISTS "WalkthroughRoom" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId"     TEXT NOT NULL,
    "companyId"     TEXT,
    "roomName"      TEXT NOT NULL,
    "roomType"      TEXT,
    "floor"         INTEGER NOT NULL DEFAULT 1,
    "position"      INTEGER NOT NULL DEFAULT 0,
    "completedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoom_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalkthroughRoom"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT,
    ADD COLUMN IF NOT EXISTS "floor"     INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "position"  INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS "WalkthroughRoom_sessionId_idx"  ON "WalkthroughRoom"("sessionId");
CREATE INDEX IF NOT EXISTS "WalkthroughRoom_companyId_idx"  ON "WalkthroughRoom"("companyId");

CREATE TABLE IF NOT EXISTS "WalkthroughRoomOpening" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "roomId"        TEXT NOT NULL,
    "companyId"     TEXT,
    "openingId"     TEXT,
    "position"      INTEGER NOT NULL DEFAULT 0,
    "confirmedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoomOpening_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalkthroughRoomOpening"
    ADD COLUMN IF NOT EXISTS "companyId"   TEXT,
    ADD COLUMN IF NOT EXISTS "position"    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WalkthroughRoomOpening_roomId_idx"    ON "WalkthroughRoomOpening"("roomId");
CREATE INDEX IF NOT EXISTS "WalkthroughRoomOpening_openingId_idx" ON "WalkthroughRoomOpening"("openingId");

CREATE TABLE IF NOT EXISTS "WalkthroughRoomNote" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "roomId"    TEXT NOT NULL,
    "companyId" TEXT,
    "noteText"  TEXT NOT NULL,
    "noteType"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkthroughRoomNote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalkthroughRoomNote"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "WalkthroughRoomNote_roomId_idx" ON "WalkthroughRoomNote"("roomId");

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: OpeningTemplate + OpeningTemplateUsageLog (walkthrough.ts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OpeningTemplate" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId"       TEXT,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "productType"     TEXT,
    "windowType"      TEXT,
    "defaultWidth"    DOUBLE PRECISION,
    "defaultHeight"   DOUBLE PRECISION,
    "templateData"    JSONB,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "usageCount"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OpeningTemplate"
    ADD COLUMN IF NOT EXISTS "companyId"     TEXT,
    ADD COLUMN IF NOT EXISTS "productType"   TEXT,
    ADD COLUMN IF NOT EXISTS "windowType"    TEXT,
    ADD COLUMN IF NOT EXISTS "defaultWidth"  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "defaultHeight" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "templateData"  JSONB,
    ADD COLUMN IF NOT EXISTS "isActive"      BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS "OpeningTemplate_companyId_idx" ON "OpeningTemplate"("companyId");
CREATE INDEX IF NOT EXISTS "OpeningTemplate_isActive_idx"  ON "OpeningTemplate"("isActive");

CREATE TABLE IF NOT EXISTS "OpeningTemplateUsageLog" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "templateId"    TEXT NOT NULL,
    "openingId"     TEXT,
    "appointmentId" TEXT,
    "companyId"     TEXT,
    "userId"        TEXT,
    "usedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningTemplateUsageLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OpeningTemplateUsageLog"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT,
    ADD COLUMN IF NOT EXISTS "usedAt"    TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "OpeningTemplateUsageLog_templateId_idx"    ON "OpeningTemplateUsageLog"("templateId");
CREATE INDEX IF NOT EXISTS "OpeningTemplateUsageLog_appointmentId_idx" ON "OpeningTemplateUsageLog"("appointmentId");

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: AiChatSession + AiChatMessage (walkthrough.ts AI chat)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AiChatSession" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId" TEXT,
    "companyId"     TEXT,
    "userId"        TEXT,
    "sessionType"   TEXT NOT NULL DEFAULT 'general',
    "context"       JSONB,
    "status"        TEXT NOT NULL DEFAULT 'active',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiChatSession"
    ADD COLUMN IF NOT EXISTS "companyId"   TEXT,
    ADD COLUMN IF NOT EXISTS "sessionType" TEXT DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS "context"     JSONB,
    ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AiChatSession_appointmentId_idx" ON "AiChatSession"("appointmentId");
CREATE INDEX IF NOT EXISTS "AiChatSession_companyId_idx"     ON "AiChatSession"("companyId");
CREATE INDEX IF NOT EXISTS "AiChatSession_userId_idx"        ON "AiChatSession"("userId");

CREATE TABLE IF NOT EXISTS "AiChatMessage" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT,
    "role"      TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'assistant' | 'system'
    "content"   TEXT NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiChatMessage"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata"  JSONB;

CREATE INDEX IF NOT EXISTS "AiChatMessage_sessionId_idx" ON "AiChatMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "AiChatMessage_companyId_idx" ON "AiChatMessage"("companyId");

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: AppointmentQualityScore + CallbackRiskScore (mobile.ts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AppointmentQualityScore" (
    "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"      TEXT NOT NULL,
    "companyId"          TEXT,
    "overallScore"       DOUBLE PRECISION,
    "measurementScore"   DOUBLE PRECISION,
    "completenessScore"  DOUBLE PRECISION,
    "consistencyScore"   DOUBLE PRECISION,
    "photoScore"         DOUBLE PRECISION,
    "scoredAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoredBy"           TEXT DEFAULT 'ai',
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentQualityScore_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AppointmentQualityScore"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT;

CREATE INDEX IF NOT EXISTS "AppointmentQualityScore_appointmentId_idx" ON "AppointmentQualityScore"("appointmentId");
CREATE INDEX IF NOT EXISTS "AppointmentQualityScore_companyId_idx"     ON "AppointmentQualityScore"("companyId");

CREATE TABLE IF NOT EXISTS "CallbackRiskScore" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "appointmentId"   TEXT NOT NULL,
    "companyId"       TEXT,
    "riskScore"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel"       TEXT,            -- 'low' | 'medium' | 'high' | 'critical'
    "riskFactors"     JSONB,
    "scoredAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy"      TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallbackRiskScore_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CallbackRiskScore"
    ADD COLUMN IF NOT EXISTS "companyId"   TEXT,
    ADD COLUMN IF NOT EXISTS "riskScore"   DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "riskFactors" JSONB,
    ADD COLUMN IF NOT EXISTS "scoredAt"    TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "reviewedBy"  TEXT,
    ADD COLUMN IF NOT EXISTS "reviewedAt"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "CallbackRiskScore_appointmentId_idx" ON "CallbackRiskScore"("appointmentId");
CREATE INDEX IF NOT EXISTS "CallbackRiskScore_companyId_idx"     ON "CallbackRiskScore"("companyId");
CREATE INDEX IF NOT EXISTS "CallbackRiskScore_riskLevel_idx"     ON "CallbackRiskScore"("riskLevel");

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: MobileSyncQueue + MobileOfflineDraft (mobile.ts offline sync)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MobileSyncQueue" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId"     TEXT,
    "userId"        TEXT NOT NULL,
    "appointmentId" TEXT,
    "entityType"    TEXT NOT NULL,
    "entityId"      TEXT,
    "operation"     TEXT NOT NULL,   -- 'create' | 'update' | 'delete'
    "payload"       JSONB NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "retryCount"    INTEGER NOT NULL DEFAULT 0,
    "error"         TEXT,
    "processedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSyncQueue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MobileSyncQueue"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT;

CREATE INDEX IF NOT EXISTS "MobileSyncQueue_userId_idx"        ON "MobileSyncQueue"("userId");
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_appointmentId_idx" ON "MobileSyncQueue"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_status_idx"        ON "MobileSyncQueue"("status");
CREATE INDEX IF NOT EXISTS "MobileSyncQueue_companyId_idx"     ON "MobileSyncQueue"("companyId");

CREATE TABLE IF NOT EXISTS "MobileOfflineDraft" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId"     TEXT,
    "userId"        TEXT NOT NULL,
    "appointmentId" TEXT,
    "draftType"     TEXT NOT NULL,
    "draftData"     JSONB NOT NULL,
    "version"       INTEGER NOT NULL DEFAULT 1,
    "isConflicted"  BOOLEAN NOT NULL DEFAULT false,
    "conflictData"  JSONB,
    "syncedAt"      TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileOfflineDraft_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MobileOfflineDraft"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT;

CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_userId_idx"        ON "MobileOfflineDraft"("userId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_appointmentId_idx" ON "MobileOfflineDraft"("appointmentId");
CREATE INDEX IF NOT EXISTS "MobileOfflineDraft_companyId_idx"     ON "MobileOfflineDraft"("companyId");

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: RLS for new tables added above
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "WalkthroughSession"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoom"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoomOpening"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoomNote"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningTemplate"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningTemplateUsageLog"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatSession"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatMessage"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppointmentQualityScore"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallbackRiskScore"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileSyncQueue"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileOfflineDraft"       ENABLE ROW LEVEL SECURITY;

-- Service-role bypass policies for new tables
DO $$ DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'WalkthroughSession','WalkthroughRoom','WalkthroughRoomOpening','WalkthroughRoomNote',
        'OpeningTemplate','OpeningTemplateUsageLog','AiChatSession','AiChatMessage',
        'AppointmentQualityScore','CallbackRiskScore','MobileSyncQueue','MobileOfflineDraft'
    ]) LOOP
        EXECUTE format('
            DO $inner$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = ''public''
                    AND tablename = %L
                    AND policyname = ''service_role_bypass''
                ) THEN
                    EXECUTE $p$ CREATE POLICY service_role_bypass ON %I
                        USING (current_setting(''role'') = ''service_role'') $p$;
                END IF;
            END $inner$;
        ', t, t);
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION COMPLETE  (v2 – includes SketchMarker 35-field patch + 12 new tables)
-- Tables created / patched: 100+ (Prisma models + raw SQL route tables)
-- All operations are idempotent (IF NOT EXISTS / DO $$ exception handling)
-- Patch date: 2026-05-21  (triggered by API-Frontend-Mapper subagent findings)
-- ─────────────────────────────────────────────────────────────────────────────
