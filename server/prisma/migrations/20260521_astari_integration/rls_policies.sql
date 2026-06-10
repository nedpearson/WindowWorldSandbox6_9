-- ================================================================
-- Astari RLS Policies
-- Apply in Supabase SQL Editor (not via prisma migrate deploy)
-- Idempotent: safe to re-run
-- ================================================================

-- Enable RLS on all Astari tables
ALTER TABLE "AstariCommand"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AstariTask"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AstariWorkflow"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AstariWorkflowStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AstariKnowledgeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AstariActionRun"    ENABLE ROW LEVEL SECURITY;

-- ── AstariCommand ──────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariCommand' AND policyname = 'astari_command_company_select'
  ) THEN
    CREATE POLICY astari_command_company_select ON "AstariCommand"
      FOR SELECT USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariCommand' AND policyname = 'astari_command_company_insert'
  ) THEN
    CREATE POLICY astari_command_company_insert ON "AstariCommand"
      FOR INSERT WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariCommand' AND policyname = 'astari_command_company_update'
  ) THEN
    CREATE POLICY astari_command_company_update ON "AstariCommand"
      FOR UPDATE USING ("companyId" = get_user_company_id());
  END IF;
END $$;

-- ── AstariTask ────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariTask' AND policyname = 'astari_task_company_select'
  ) THEN
    CREATE POLICY astari_task_company_select ON "AstariTask"
      FOR SELECT USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariTask' AND policyname = 'astari_task_company_insert'
  ) THEN
    CREATE POLICY astari_task_company_insert ON "AstariTask"
      FOR INSERT WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariTask' AND policyname = 'astari_task_company_update'
  ) THEN
    CREATE POLICY astari_task_company_update ON "AstariTask"
      FOR UPDATE USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariTask' AND policyname = 'astari_task_company_delete'
  ) THEN
    CREATE POLICY astari_task_company_delete ON "AstariTask"
      FOR DELETE USING (
        "createdById" = auth.uid()::TEXT
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

-- ── AstariWorkflow ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflow' AND policyname = 'astari_workflow_company_select'
  ) THEN
    CREATE POLICY astari_workflow_company_select ON "AstariWorkflow"
      FOR SELECT USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflow' AND policyname = 'astari_workflow_company_insert'
  ) THEN
    CREATE POLICY astari_workflow_company_insert ON "AstariWorkflow"
      FOR INSERT WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflow' AND policyname = 'astari_workflow_company_update'
  ) THEN
    CREATE POLICY astari_workflow_company_update ON "AstariWorkflow"
      FOR UPDATE USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

-- ── AstariWorkflowStep ────────────────────────────────────────────
-- Steps inherit access via workflow ownership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflowStep' AND policyname = 'astari_step_via_workflow_select'
  ) THEN
    CREATE POLICY astari_step_via_workflow_select ON "AstariWorkflowStep"
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM "AstariWorkflow" wf
          WHERE wf.id = "workflowId"
          AND (wf."companyId" = get_user_company_id() OR user_is_admin_or_manager())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflowStep' AND policyname = 'astari_step_via_workflow_insert'
  ) THEN
    CREATE POLICY astari_step_via_workflow_insert ON "AstariWorkflowStep"
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM "AstariWorkflow" wf
          WHERE wf.id = "workflowId"
          AND wf."companyId" = get_user_company_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariWorkflowStep' AND policyname = 'astari_step_via_workflow_update'
  ) THEN
    CREATE POLICY astari_step_via_workflow_update ON "AstariWorkflowStep"
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM "AstariWorkflow" wf
          WHERE wf.id = "workflowId"
          AND (wf."companyId" = get_user_company_id() OR user_is_admin_or_manager())
        )
      );
  END IF;
END $$;

-- ── AstariKnowledgeItem ───────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariKnowledgeItem' AND policyname = 'astari_knowledge_company_select'
  ) THEN
    CREATE POLICY astari_knowledge_company_select ON "AstariKnowledgeItem"
      FOR SELECT USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariKnowledgeItem' AND policyname = 'astari_knowledge_company_insert'
  ) THEN
    CREATE POLICY astari_knowledge_company_insert ON "AstariKnowledgeItem"
      FOR INSERT WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariKnowledgeItem' AND policyname = 'astari_knowledge_company_update'
  ) THEN
    CREATE POLICY astari_knowledge_company_update ON "AstariKnowledgeItem"
      FOR UPDATE USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

-- ── AstariActionRun ───────────────────────────────────────────────
-- Read-only for users (audit log) — no UPDATE/DELETE by users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariActionRun' AND policyname = 'astari_actionrun_company_select'
  ) THEN
    CREATE POLICY astari_actionrun_company_select ON "AstariActionRun"
      FOR SELECT USING (
        "companyId" = get_user_company_id()
        OR user_is_admin_or_manager()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'AstariActionRun' AND policyname = 'astari_actionrun_company_insert'
  ) THEN
    -- Service role inserts only; users cannot directly insert action runs
    CREATE POLICY astari_actionrun_company_insert ON "AstariActionRun"
      FOR INSERT WITH CHECK ("companyId" = get_user_company_id());
  END IF;
END $$;
