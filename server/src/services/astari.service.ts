/**
 * astari.service.ts
 * Business logic for the Astari AI Command Center.
 * All AI calls route through the shared callAI() gateway.
 * All data is scoped to companyId resolved from JWT — never client-supplied.
 */
import { prisma } from '../index.js';
import { callAI, isSuperAdmin } from './aiGateway.js';
import type { AiCallResult } from './aiGateway.js';

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────

export async function getAstariSummary(userId: string, companyId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    commandsToday,
    tasksOpen,
    tasksInProgress,
    workflowsActive,
    knowledgeItems,
    creditsToday,
    recentCommands,
    recentTasks,
  ] = await Promise.all([
    prisma.astariCommand.count({
      where: { companyId, createdAt: { gte: todayStart } },
    }),
    prisma.astariTask.count({ where: { companyId, status: 'todo' } }),
    prisma.astariTask.count({ where: { companyId, status: 'in_progress' } }),
    prisma.astariWorkflow.count({ where: { companyId, status: 'active' } }),
    prisma.astariKnowledgeItem.count({ where: { companyId } }),
    prisma.aiUsageEvent.aggregate({
      where: {
        companyId,
        featureKey: { startsWith: 'astari.' },
        createdAt: { gte: todayStart },
      },
      _sum: { creditsUsed: true },
    }),
    prisma.astariCommand.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.astariTask.findMany({
      where: { companyId, status: { not: 'done' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    commandsToday,
    tasksOpen,
    tasksInProgress,
    workflowsActive,
    knowledgeItems,
    creditsUsedToday: creditsToday._sum.creditsUsed ?? 0,
    recentCommands,
    recentTasks,
  };
}

// ─────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────

export async function getCommands(companyId: string, limit = 20) {
  return prisma.astariCommand.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
}

export async function runCommand(
  userId: string,
  companyId: string,
  input: string,
): Promise<{ command: any; aiResult: AiCallResult }> {
  // Create command record in pending state
  const command = await prisma.astariCommand.create({
    data: {
      companyId,
      userId,
      input,
      output: null,
      status: 'running',
      featureKey: 'astari.command',
      creditsUsed: 0,
      cached: false,
    },
  });

  // Call AI gateway — credit-checked, cached, deduped
  const aiResult = await callAI({
    feature: 'astari.command',
    userId,
    companyId,
    input,
    systemPrompt:
      'You are Astari, a business AI assistant for Window World sales teams. ' +
      'Answer concisely. Help with tasks, workflows, knowledge retrieval, and team coordination.',
  });

  // Update record with result
  const updated = await prisma.astariCommand.update({
    where: { id: command.id },
    data: {
      output:
        aiResult.status === 'blocked'
          ? null
          : (aiResult.rawText ?? JSON.stringify(aiResult.result) ?? null),
      status:
        aiResult.status === 'success' || aiResult.status === 'cached'
          ? 'done'
          : aiResult.status === 'blocked'
          ? 'error'
          : 'error',
      creditsUsed: aiResult.creditsUsed,
      cached: aiResult.cached,
    },
  });

  return { command: updated, aiResult };
}

// ─────────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────────

export async function getTasks(companyId: string, status?: string) {
  return prisma.astariTask.findMany({
    where: {
      companyId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createTask(
  userId: string,
  companyId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    assignedToId?: string;
    tags?: string[];
  },
) {
  return prisma.astariTask.create({
    data: {
      companyId,
      createdById: userId,
      title: data.title,
      description: data.description ?? null,
      priority: (data.priority as any) ?? 'medium',
      status: (data.status as any) ?? 'todo',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedToId: data.assignedToId ?? null,
      tags: data.tags ?? [],
      aiGenerated: false,
    },
  });
}

export async function updateTask(
  id: string,
  companyId: string,
  data: Partial<{ title: string; description: string; status: string; priority: string; dueDate: string; assignedToId: string; tags: string[] }>,
) {
  // Verify ownership
  const task = await prisma.astariTask.findFirst({ where: { id, companyId } });
  if (!task) return null;

  return prisma.astariTask.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status as any } : {}),
      ...(data.priority !== undefined ? { priority: data.priority as any } : {}),
      ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
    },
  });
}

export async function deleteTask(id: string, companyId: string) {
  const task = await prisma.astariTask.findFirst({ where: { id, companyId } });
  if (!task) return false;
  await prisma.astariTask.delete({ where: { id } });
  return true;
}

export async function generateTasksFromContext(
  userId: string,
  companyId: string,
  context: string,
): Promise<{ tasks: any[]; aiResult: AiCallResult }> {
  const aiResult = await callAI({
    feature: 'astari.task.plan',
    userId,
    companyId,
    input: context,
    systemPrompt:
      'You are a task planning AI for a Window World sales team. ' +
      'Given context, generate a JSON array of tasks. Each task must have: title (string), description (string), priority ("low"|"medium"|"high"|"critical"). ' +
      'Return ONLY a valid JSON array, no markdown fences, no explanation.',
  });

  if (aiResult.status === 'blocked') return { tasks: [], aiResult };

  let taskDefs: Array<{ title: string; description?: string; priority?: string }> = [];
  try {
    const raw = aiResult.rawText ?? '';
    const cleaned = raw.replace(/```[a-z]*\n?/g, '').trim();
    taskDefs = JSON.parse(cleaned);
    if (!Array.isArray(taskDefs)) taskDefs = [];
  } catch {
    taskDefs = [];
  }

  const created = await Promise.all(
    taskDefs.slice(0, 10).map(t =>
      prisma.astariTask.create({
        data: {
          companyId,
          createdById: userId,
          title: String(t.title || 'Untitled Task').slice(0, 200),
          description: t.description ? String(t.description).slice(0, 1000) : null,
          priority: (['low', 'medium', 'high', 'critical'].includes(t.priority ?? '') ? t.priority : 'medium') as any,
          status: 'todo',
          tags: [],
          aiGenerated: true,
        },
      }),
    ),
  );

  return { tasks: created, aiResult };
}

// ─────────────────────────────────────────────────────────────────
// Workflows
// ─────────────────────────────────────────────────────────────────

export async function getWorkflows(companyId: string) {
  return prisma.astariWorkflow.findMany({
    where: { companyId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkflow(
  userId: string,
  companyId: string,
  data: { name: string; description?: string; triggerType?: string; status?: string },
) {
  return prisma.astariWorkflow.create({
    data: {
      companyId,
      createdById: userId,
      name: data.name,
      description: data.description ?? null,
      triggerType: (data.triggerType as any) ?? 'manual',
      status: (data.status as any) ?? 'draft',
    },
    include: { steps: true },
  });
}

export async function runWorkflow(
  workflowId: string,
  userId: string,
  companyId: string,
): Promise<any> {
  const workflow = await prisma.astariWorkflow.findFirst({
    where: { id: workflowId, companyId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  if (!workflow) return null;

  const run = await prisma.astariActionRun.create({
    data: {
      companyId,
      userId,
      workflowId,
      actionType: 'workflow',
      status: 'running',
      input: { workflowId, workflowName: workflow.name },
    },
  });

  // Execute AI-powered steps
  let lastOutput: Record<string, unknown> = {};
  const startMs = Date.now();

  try {
    for (const step of workflow.steps) {
      if (step.actionType === 'ai_prompt') {
        const cfg = step.config as Record<string, unknown>;
        const aiResult = await callAI({
          feature: 'astari.action.run',
          userId,
          companyId,
          input: String(cfg.prompt ?? step.name),
          systemPrompt: 'You are Astari, a business process automation AI.',
        });
        lastOutput = { stepId: step.id, result: aiResult.rawText ?? aiResult.result };
        await prisma.astariWorkflowStep.update({
          where: { id: step.id },
          data: { status: aiResult.status === 'blocked' ? 'skipped' : 'done' },
        });
      }
    }

    return prisma.astariActionRun.update({
      where: { id: run.id },
      data: {
        status: 'done',
        output: JSON.parse(JSON.stringify(lastOutput)) as any,
        durationMs: Date.now() - startMs,
      },
    });
  } catch (err: any) {
    return prisma.astariActionRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        errorMessage: err?.message ?? 'Unknown error',
        durationMs: Date.now() - startMs,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Knowledge
// ─────────────────────────────────────────────────────────────────

export async function getKnowledge(companyId: string, search?: string) {
  return prisma.astariKnowledgeItem.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { summary: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function createKnowledgeItem(
  userId: string,
  companyId: string,
  data: { title: string; content: string; tags?: string[]; sourceType?: string },
) {
  return prisma.astariKnowledgeItem.create({
    data: {
      companyId,
      createdById: userId,
      title: data.title,
      content: data.content,
      summary: null,
      tags: data.tags ?? [],
      sourceType: (data.sourceType as any) ?? 'manual',
    },
  });
}

export async function summarizeKnowledgeItem(
  id: string,
  userId: string,
  companyId: string,
): Promise<{ item: any; aiResult: AiCallResult } | null> {
  const item = await prisma.astariKnowledgeItem.findFirst({ where: { id, companyId } });
  if (!item) return null;

  const aiResult = await callAI({
    feature: 'astari.knowledge.summarize',
    userId,
    companyId,
    input: item.content.slice(0, 4000),
    systemPrompt:
      'Summarize the following business document in 2-3 sentences, focusing on key actionable information. Return only the summary text.',
    cacheKey: id,
  });

  if (aiResult.status === 'blocked') return { item, aiResult };

  const summary = aiResult.rawText ?? null;
  const updated = await prisma.astariKnowledgeItem.update({
    where: { id },
    data: { summary },
  });

  return { item: updated, aiResult };
}

// ─────────────────────────────────────────────────────────────────
// AI Usage (Astari-specific feature keys only)
// ─────────────────────────────────────────────────────────────────

export async function getAstariAiUsage(
  userId: string,
  companyId: string,
  days = 7,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [events, superAdmin] = await Promise.all([
    prisma.aiUsageEvent.findMany({
      where: {
        ...(await isSuperAdmin(userId) ? {} : { companyId }),
        featureKey: { startsWith: 'astari.' },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    isSuperAdmin(userId),
  ]);

  const totalCommands = events.length;
  const totalCreditsUsed = events.reduce((sum, e) => sum + (e.creditsUsed ?? 0), 0);
  const cacheHits = events.filter(e => e.cacheHit).length;
  const cacheHitRate = totalCommands > 0 ? cacheHits / totalCommands : 0;

  // Group by feature
  const featureMap: Record<string, { count: number; creditsUsed: number; cacheHits: number }> = {};
  for (const e of events) {
    if (!featureMap[e.featureKey]) featureMap[e.featureKey] = { count: 0, creditsUsed: 0, cacheHits: 0 };
    featureMap[e.featureKey].count++;
    featureMap[e.featureKey].creditsUsed += e.creditsUsed ?? 0;
    if (e.cacheHit) featureMap[e.featureKey].cacheHits++;
  }
  const byFeature = Object.entries(featureMap).map(([featureKey, stats]) => ({ featureKey, ...stats }));

  // Group by day
  const dayMap: Record<string, { creditsUsed: number; commandCount: number }> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { creditsUsed: 0, commandCount: 0 };
    dayMap[day].creditsUsed += e.creditsUsed ?? 0;
    dayMap[day].commandCount++;
  }
  const byDay = Object.entries(dayMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCommands,
    totalCreditsUsed,
    cacheHitRate,
    byFeature,
    byDay,
    isSuperAdmin: superAdmin,
  };
}
