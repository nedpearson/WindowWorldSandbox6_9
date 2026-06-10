-- ═══════════════════════════════════════════════════════
-- SALES REP FIELD ASSISTANT — Walkthrough, Templates,
-- AI Chat, Scoring, Feedback tables
-- ═══════════════════════════════════════════════════════

-- ─── Walkthrough Sessions ────────────────────────────
CREATE TABLE IF NOT EXISTS "WalkthroughSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "appointmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "currentRoom" TEXT,
  "completedRooms" JSONB NOT NULL DEFAULT '[]',
  "totalRooms" INTEGER NOT NULL DEFAULT 0,
  "completionPct" FLOAT NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalkthroughSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WalkthroughSession_appointmentId_idx" ON "WalkthroughSession"("appointmentId");

-- ─── Walkthrough Rooms ───────────────────────────────
CREATE TABLE IF NOT EXISTS "WalkthroughRoom" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "roomName" TEXT NOT NULL,
  "roomType" TEXT NOT NULL DEFAULT 'other',
  "floorNumber" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "openingCount" INTEGER NOT NULL DEFAULT 0,
  "completionPct" FLOAT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalkthroughRoom_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalkthroughRoom_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WalkthroughSession"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "WalkthroughRoom_sessionId_idx" ON "WalkthroughRoom"("sessionId");
CREATE INDEX IF NOT EXISTS "WalkthroughRoom_appointmentId_idx" ON "WalkthroughRoom"("appointmentId");

-- ─── Walkthrough Room Openings ───────────────────────
CREATE TABLE IF NOT EXISTS "WalkthroughRoomOpening" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "roomId" TEXT NOT NULL,
  "openingId" TEXT,
  "openingNumber" INTEGER,
  "productType" TEXT,
  "width" FLOAT,
  "height" FLOAT,
  "notes" TEXT,
  "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
  "hasSketchMarker" BOOLEAN NOT NULL DEFAULT false,
  "hasMeasurement" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalkthroughRoomOpening_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalkthroughRoomOpening_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WalkthroughRoom"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "WalkthroughRoomOpening_roomId_idx" ON "WalkthroughRoomOpening"("roomId");

-- ─── Walkthrough Room Notes ──────────────────────────
CREATE TABLE IF NOT EXISTS "WalkthroughRoomNote" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "roomId" TEXT NOT NULL,
  "noteType" TEXT NOT NULL DEFAULT 'text',
  "noteText" TEXT,
  "audioUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalkthroughRoomNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalkthroughRoomNote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WalkthroughRoom"("id") ON DELETE CASCADE
);

-- ─── Opening Templates ──────────────────────────────
CREATE TABLE IF NOT EXISTS "OpeningTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'standard',
  "productCategory" TEXT,
  "interiorColor" TEXT,
  "exteriorColor" TEXT,
  "gridStyle" TEXT,
  "temperedGlass" TEXT,
  "obscureGlass" TEXT,
  "screenOption" TEXT,
  "foamEnhanced" BOOLEAN DEFAULT false,
  "installNotes" TEXT,
  "removalType" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningTemplate_pkey" PRIMARY KEY ("id")
);

-- ─── Opening Template Usage Logs ─────────────────────
CREATE TABLE IF NOT EXISTS "OpeningTemplateUsageLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "templateId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "openingId" TEXT,
  "userId" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningTemplateUsageLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpeningTemplateUsageLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpeningTemplate"("id") ON DELETE CASCADE
);

-- ─── AI Chat Sessions ────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiChatSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "appointmentId" TEXT,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiChatSession_appointmentId_idx" ON "AiChatSession"("appointmentId");

-- ─── AI Chat Messages ────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiChatMessage" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "content" TEXT NOT NULL,
  "actionItems" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiChatSession"("id") ON DELETE CASCADE
);

-- ─── Callback Risk Scores ────────────────────────────
CREATE TABLE IF NOT EXISTS "CallbackRiskScore" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "appointmentId" TEXT NOT NULL,
  "overallRisk" FLOAT NOT NULL DEFAULT 0,
  "measurementRisk" FLOAT NOT NULL DEFAULT 0,
  "sketchRisk" FLOAT NOT NULL DEFAULT 0,
  "pricingRisk" FLOAT NOT NULL DEFAULT 0,
  "notesRisk" FLOAT NOT NULL DEFAULT 0,
  "signatureRisk" FLOAT NOT NULL DEFAULT 0,
  "riskLevel" TEXT NOT NULL DEFAULT 'REVIEW',
  "blockers" JSONB NOT NULL DEFAULT '[]',
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallbackRiskScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CallbackRiskScore_appointmentId_idx" ON "CallbackRiskScore"("appointmentId");

-- ─── RLS ─────────────────────────────────────────────
ALTER TABLE "WalkthroughSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoomOpening" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalkthroughRoomNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningTemplateUsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallbackRiskScore" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_WalkthroughSession" ON "WalkthroughSession" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_WalkthroughRoom" ON "WalkthroughRoom" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_WalkthroughRoomOpening" ON "WalkthroughRoomOpening" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_WalkthroughRoomNote" ON "WalkthroughRoomNote" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_OpeningTemplate" ON "OpeningTemplate" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_OpeningTemplateUsageLog" ON "OpeningTemplateUsageLog" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_AiChatSession" ON "AiChatSession" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_AiChatMessage" ON "AiChatMessage" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "admin_CallbackRiskScore" ON "CallbackRiskScore" FOR ALL USING (auth.jwt() ->> 'email' = 'nedpearson@gmail.com');
CREATE POLICY "service_WalkthroughSession" ON "WalkthroughSession" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_OpeningTemplate" ON "OpeningTemplate" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_CallbackRiskScore" ON "CallbackRiskScore" FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed default templates ─────────────────────────
INSERT INTO "OpeningTemplate" ("id","name","description","category","productCategory","interiorColor","exteriorColor","gridStyle","temperedGlass","screenOption","installNotes","isDefault") VALUES
  (gen_random_uuid()::text, 'Standard White DH', 'Standard white double hung, no grids', 'standard', 'double_hung', 'White', 'White', 'none', 'none', 'Half', '', true),
  (gen_random_uuid()::text, 'Bathroom Obscure', 'Bathroom obscure glass, tempered', 'bathroom', 'double_hung', 'White', 'White', 'none', 'full', 'Half', 'Bathroom - obscure + tempered required', true),
  (gen_random_uuid()::text, 'Colonial Grid Package', 'Colonial grids, white', 'grids', 'double_hung', 'White', 'White', 'Colonial', 'none', 'Half', '', true),
  (gen_random_uuid()::text, 'Patio Slider', 'Patio sliding door', 'doors', 'patio_door', 'White', 'White', 'none', 'full', 'Full', 'Verify track/threshold condition', true),
  (gen_random_uuid()::text, '2nd Floor Package', 'Second floor, ladder required', 'specialty', 'double_hung', 'White', 'White', 'none', 'none', 'Half', 'SECOND FLOOR - Ladder/scaffold required. Verify access.', true),
  (gen_random_uuid()::text, 'Brick Exterior', 'Brick exterior install', 'specialty', 'double_hung', 'White', 'White', 'none', 'none', 'Half', 'BRICK EXTERIOR - Verify return depth and brickmold condition', true)
ON CONFLICT DO NOTHING;
