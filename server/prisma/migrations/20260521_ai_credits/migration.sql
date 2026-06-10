-- ═══════════════════════════════════════════════════════════════════════
-- AI Credit System Migration
-- Idempotent: safe to run multiple times
-- Apply in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "AiCreditAccount" (
  "id"                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"          TEXT        NOT NULL,
  "planName"           TEXT        NOT NULL DEFAULT 'starter',
  "monthlyCreditLimit" INTEGER     NOT NULL DEFAULT 1000,
  "monthlyCreditsUsed" INTEGER     NOT NULL DEFAULT 0,
  "bonusCredits"       INTEGER     NOT NULL DEFAULT 0,
  "hardLimitEnabled"   BOOLEAN     NOT NULL DEFAULT true,
  "resetDate"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiCreditAccount_companyId_key" ON "AiCreditAccount"("companyId");
CREATE INDEX IF NOT EXISTS "AiCreditAccount_companyId_idx" ON "AiCreditAccount"("companyId");
CREATE INDEX IF NOT EXISTS "AiCreditAccount_resetDate_idx" ON "AiCreditAccount"("resetDate");

CREATE TABLE IF NOT EXISTS "AiUsageEvent" (
  "id"               TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"        TEXT          NOT NULL,
  "userId"           TEXT          NOT NULL,
  "featureKey"       TEXT          NOT NULL,
  "provider"         TEXT          NOT NULL DEFAULT 'gemini',
  "model"            TEXT          NOT NULL,
  "inputTokens"      INTEGER,
  "outputTokens"     INTEGER,
  "imageCount"       INTEGER       NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION,
  "creditsUsed"      INTEGER       NOT NULL DEFAULT 0,
  "cacheHit"         BOOLEAN       NOT NULL DEFAULT false,
  "requestHash"      TEXT,
  "status"           TEXT          NOT NULL DEFAULT 'success',
  "errorMessage"     TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiUsageEvent_companyId_idx" ON "AiUsageEvent"("companyId");
CREATE INDEX IF NOT EXISTS "AiUsageEvent_userId_idx" ON "AiUsageEvent"("userId");
CREATE INDEX IF NOT EXISTS "AiUsageEvent_featureKey_idx" ON "AiUsageEvent"("featureKey");
CREATE INDEX IF NOT EXISTS "AiUsageEvent_requestHash_idx" ON "AiUsageEvent"("requestHash");
CREATE INDEX IF NOT EXISTS "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");

CREATE TABLE IF NOT EXISTS "AiFeatureLimit" (
  "id"                 TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "featureKey"         TEXT         NOT NULL,
  "displayName"        TEXT         NOT NULL,
  "monthlyLimit"       INTEGER,
  "dailyLimit"         INTEGER,
  "perRequestLimit"    INTEGER      NOT NULL DEFAULT 50,
  "creditsPerCall"     INTEGER      NOT NULL DEFAULT 5,
  "defaultModel"       TEXT,
  "fallbackModel"      TEXT,
  "requiresHumanClick" BOOLEAN      NOT NULL DEFAULT true,
  "cacheTtlSeconds"    INTEGER      NOT NULL DEFAULT 3600,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiFeatureLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiFeatureLimit_featureKey_key" ON "AiFeatureLimit"("featureKey");
CREATE INDEX IF NOT EXISTS "AiFeatureLimit_featureKey_idx" ON "AiFeatureLimit"("featureKey");

CREATE TABLE IF NOT EXISTS "AiCacheEntry" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"    TEXT         NOT NULL,
  "featureKey"   TEXT         NOT NULL,
  "requestHash"  TEXT         NOT NULL,
  "model"        TEXT         NOT NULL,
  "responseJson" JSONB        NOT NULL,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCacheEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiCacheEntry_companyId_featureKey_requestHash_key"
  ON "AiCacheEntry"("companyId", "featureKey", "requestHash");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_companyId_idx" ON "AiCacheEntry"("companyId");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_featureKey_idx" ON "AiCacheEntry"("featureKey");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_requestHash_idx" ON "AiCacheEntry"("requestHash");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_expiresAt_idx" ON "AiCacheEntry"("expiresAt");

CREATE TABLE IF NOT EXISTS "AiUpgradeLink" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "planName"      TEXT         NOT NULL,
  "stripePriceId" TEXT,
  "checkoutUrl"   TEXT,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUpgradeLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiUpgradeLink_planName_key" ON "AiUpgradeLink"("planName");

-- ── Enable RLS ───────────────────────────────────────────────────────
ALTER TABLE "AiCreditAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageEvent"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiFeatureLimit"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiCacheEntry"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUpgradeLink"   ENABLE ROW LEVEL SECURITY;

-- ── Service role bypass (Prisma backend) ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiCreditAccount' AND policyname = 'ai_credit_service_role') THEN
    CREATE POLICY "ai_credit_service_role" ON "AiCreditAccount" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiUsageEvent' AND policyname = 'ai_usage_service_role') THEN
    CREATE POLICY "ai_usage_service_role" ON "AiUsageEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiFeatureLimit' AND policyname = 'ai_feature_service_role') THEN
    CREATE POLICY "ai_feature_service_role" ON "AiFeatureLimit" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiCacheEntry' AND policyname = 'ai_cache_service_role') THEN
    CREATE POLICY "ai_cache_service_role" ON "AiCacheEntry" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiUpgradeLink' AND policyname = 'ai_upgrade_service_role') THEN
    CREATE POLICY "ai_upgrade_service_role" ON "AiUpgradeLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Seed default feature limits ──────────────────────────────────────
INSERT INTO "AiFeatureLimit" ("id", "featureKey", "displayName", "creditsPerCall", "cacheTtlSeconds", "requiresHumanClick")
VALUES
  (gen_random_uuid()::text, 'photo_analysis', 'Photo Analysis',          10, 86400, true),
  (gen_random_uuid()::text, 'voice_command',  'Voice Command',            5,    60, false),
  (gen_random_uuid()::text, 'visualizer',     'Live Exterior Visualizer',20,  3600, true),
  (gen_random_uuid()::text, 'proposal_gen',   'Proposal Generation',     15,  3600, true),
  (gen_random_uuid()::text, 'chat',           'AI Chat / Copilot',        3,   300, false),
  (gen_random_uuid()::text, 'doc_parse',      'Document Parsing',         8, 86400, true),
  (gen_random_uuid()::text, 'lead_score',     'Lead Scoring',             4,  3600, false),
  (gen_random_uuid()::text, 'measurement',    'Measurement Assistant',    5,  3600, false),
  (gen_random_uuid()::text, 'report_gen',     'Report Generation',       12,  3600, true)
ON CONFLICT ("featureKey") DO NOTHING;

-- ── Seed upgrade links (update checkoutUrl via admin UI or env) ──────
INSERT INTO "AiUpgradeLink" ("id", "planName", "checkoutUrl", "isActive")
VALUES
  (gen_random_uuid()::text, 'starter_500', 'https://buy.stripe.com/YOUR_REAL_CHECKOUT_LINK', true),
  (gen_random_uuid()::text, 'pro_2000',    NULL, true)
ON CONFLICT ("planName") DO NOTHING;
