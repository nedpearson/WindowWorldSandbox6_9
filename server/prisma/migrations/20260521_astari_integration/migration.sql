-- ================================================================
-- Astari AI Command Center Integration Migration
-- Date: 20260521
-- ================================================================

-- AstariCommand
CREATE TABLE IF NOT EXISTS "AstariCommand" (
  "id"          TEXT        NOT NULL,
  "companyId"   TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "input"       TEXT        NOT NULL,
  "output"      TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'pending',
  "featureKey"  TEXT        NOT NULL DEFAULT 'astari.command',
  "creditsUsed" INTEGER     NOT NULL DEFAULT 0,
  "cached"      BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariCommand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AstariCommand_companyId_idx"  ON "AstariCommand"("companyId");
CREATE INDEX IF NOT EXISTS "AstariCommand_userId_idx"     ON "AstariCommand"("userId");
CREATE INDEX IF NOT EXISTS "AstariCommand_createdAt_idx"  ON "AstariCommand"("createdAt");

-- AstariTask
CREATE TABLE IF NOT EXISTS "AstariTask" (
  "id"           TEXT        NOT NULL,
  "companyId"    TEXT        NOT NULL,
  "createdById"  TEXT        NOT NULL,
  "assignedToId" TEXT,
  "title"        TEXT        NOT NULL,
  "description"  TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'todo',
  "priority"     TEXT        NOT NULL DEFAULT 'medium',
  "dueDate"      TIMESTAMPTZ,
  "tags"         TEXT[]      NOT NULL DEFAULT '{}',
  "aiGenerated"  BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AstariTask_companyId_idx"   ON "AstariTask"("companyId");
CREATE INDEX IF NOT EXISTS "AstariTask_createdById_idx" ON "AstariTask"("createdById");
CREATE INDEX IF NOT EXISTS "AstariTask_status_idx"      ON "AstariTask"("status");
CREATE INDEX IF NOT EXISTS "AstariTask_priority_idx"    ON "AstariTask"("priority");
CREATE INDEX IF NOT EXISTS "AstariTask_createdAt_idx"   ON "AstariTask"("createdAt");

-- AstariWorkflow
CREATE TABLE IF NOT EXISTS "AstariWorkflow" (
  "id"          TEXT        NOT NULL,
  "companyId"   TEXT        NOT NULL,
  "createdById" TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'draft',
  "triggerType" TEXT        NOT NULL DEFAULT 'manual',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AstariWorkflow_companyId_idx"   ON "AstariWorkflow"("companyId");
CREATE INDEX IF NOT EXISTS "AstariWorkflow_createdById_idx" ON "AstariWorkflow"("createdById");
CREATE INDEX IF NOT EXISTS "AstariWorkflow_status_idx"      ON "AstariWorkflow"("status");
CREATE INDEX IF NOT EXISTS "AstariWorkflow_createdAt_idx"   ON "AstariWorkflow"("createdAt");

-- AstariWorkflowStep
CREATE TABLE IF NOT EXISTS "AstariWorkflowStep" (
  "id"         TEXT        NOT NULL,
  "workflowId" TEXT        NOT NULL,
  "stepOrder"  INTEGER     NOT NULL,
  "name"       TEXT        NOT NULL,
  "actionType" TEXT        NOT NULL DEFAULT 'ai_prompt',
  "config"     JSONB       NOT NULL DEFAULT '{}',
  "status"     TEXT        NOT NULL DEFAULT 'pending',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariWorkflowStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AstariWorkflowStep_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "AstariWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AstariWorkflowStep_workflowId_idx" ON "AstariWorkflowStep"("workflowId");

-- AstariKnowledgeItem
CREATE TABLE IF NOT EXISTS "AstariKnowledgeItem" (
  "id"          TEXT        NOT NULL,
  "companyId"   TEXT        NOT NULL,
  "createdById" TEXT        NOT NULL,
  "title"       TEXT        NOT NULL,
  "content"     TEXT        NOT NULL,
  "summary"     TEXT,
  "tags"        TEXT[]      NOT NULL DEFAULT '{}',
  "sourceType"  TEXT        NOT NULL DEFAULT 'manual',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariKnowledgeItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AstariKnowledgeItem_companyId_idx"   ON "AstariKnowledgeItem"("companyId");
CREATE INDEX IF NOT EXISTS "AstariKnowledgeItem_createdById_idx" ON "AstariKnowledgeItem"("createdById");
CREATE INDEX IF NOT EXISTS "AstariKnowledgeItem_createdAt_idx"   ON "AstariKnowledgeItem"("createdAt");

-- AstariActionRun
CREATE TABLE IF NOT EXISTS "AstariActionRun" (
  "id"           TEXT        NOT NULL,
  "companyId"    TEXT        NOT NULL,
  "userId"       TEXT        NOT NULL,
  "workflowId"   TEXT,
  "actionType"   TEXT        NOT NULL,
  "status"       TEXT        NOT NULL DEFAULT 'running',
  "input"        JSONB       NOT NULL DEFAULT '{}',
  "output"       JSONB,
  "durationMs"   INTEGER,
  "errorMessage" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AstariActionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AstariActionRun_companyId_idx"  ON "AstariActionRun"("companyId");
CREATE INDEX IF NOT EXISTS "AstariActionRun_userId_idx"     ON "AstariActionRun"("userId");
CREATE INDEX IF NOT EXISTS "AstariActionRun_workflowId_idx" ON "AstariActionRun"("workflowId");
CREATE INDEX IF NOT EXISTS "AstariActionRun_status_idx"     ON "AstariActionRun"("status");
CREATE INDEX IF NOT EXISTS "AstariActionRun_createdAt_idx"  ON "AstariActionRun"("createdAt");
