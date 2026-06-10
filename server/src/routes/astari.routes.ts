/**
 * astari.routes.ts
 * All Astari API routes — mounted at /api/astari
 * Requires auth on every route via router-level requireAuth.
 * All userId/companyId resolved from JWT — never trusted from client.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  getAstariSummary,
  getCommands,
  runCommand,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  generateTasksFromContext,
  getWorkflows,
  createWorkflow,
  runWorkflow,
  getKnowledge,
  createKnowledgeItem,
  summarizeKnowledgeItem,
  getAstariAiUsage,
} from '../services/astari.service.js';

export const astariRoutes = Router();
astariRoutes.use(requireAuth);

// ─────────────────────────────────────────────────────────────────
// Helpers — resolve auth context safely
// ─────────────────────────────────────────────────────────────────

function getAuthCtx(req: AuthRequest): { userId: string; companyId?: string } {
  return {
    userId: req.user!.userId,
    companyId: (req.user as any).companyId,
  };
}

/** Resolve companyId from DB when not in JWT (same pattern as dashboard.ts) */
async function resolveCompanyId(userId: string): Promise<string | null> {
  const { prisma } = await import('../index.js');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return user?.companyId ?? null;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/summary
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/summary', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const summary = await getAstariSummary(userId, companyId);
    res.json(summary);
  } catch (err: any) {
    console.error('Astari summary error:', err?.message);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/commands
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/commands', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const commands = await getCommands(companyId, limit);
    res.json(commands);
  } catch (err: any) {
    console.error('Astari commands error:', err?.message);
    res.status(500).json({ error: 'Failed to load commands' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/command
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/command', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const { input } = req.body;
    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'input is required' });
    }
    const { command, aiResult } = await runCommand(userId, companyId, input.trim());
    if (aiResult.status === 'blocked') {
      return res.status(402).json({
        status: 'blocked',
        error: 'AI credit limit reached',
        upgradeUrl: aiResult.upgradeUrl,
        command,
      });
    }
    res.json(command);
  } catch (err: any) {
    console.error('Astari command error:', err?.message);
    res.status(500).json({ error: 'Command failed' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/tasks
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/tasks', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const tasks = await getTasks(companyId, req.query.status ? String(req.query.status) : undefined);
    res.json(tasks);
  } catch (err: any) {
    console.error('Astari tasks error:', err?.message);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/tasks
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/tasks', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const task = await createTask(userId, companyId, req.body);
    res.status(201).json(task);
  } catch (err: any) {
    console.error('Astari create task error:', err?.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/tasks/generate
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/tasks/generate', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const { context } = req.body;
    if (!context || typeof context !== 'string' || !context.trim()) {
      return res.status(400).json({ error: 'context is required' });
    }
    const { tasks, aiResult } = await generateTasksFromContext(userId, companyId, context.trim());
    if (aiResult.status === 'blocked') {
      return res.status(402).json({ status: 'blocked', error: 'AI credit limit reached', upgradeUrl: aiResult.upgradeUrl });
    }
    res.json(tasks);
  } catch (err: any) {
    console.error('Astari generate tasks error:', err?.message);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PATCH /api/astari/tasks/:id
// ─────────────────────────────────────────────────────────────────
astariRoutes.put('/tasks/:id', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const updated = await updateTask(String(req.params.id), companyId, req.body);
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('Astari update task error:', err?.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/astari/tasks/:id
// ─────────────────────────────────────────────────────────────────
astariRoutes.delete('/tasks/:id', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const ok = await deleteTask(String(req.params.id), companyId);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Astari delete task error:', err?.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/workflows
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/workflows', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const workflows = await getWorkflows(companyId);
    res.json(workflows);
  } catch (err: any) {
    console.error('Astari workflows error:', err?.message);
    res.status(500).json({ error: 'Failed to load workflows' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/workflows
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/workflows', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const workflow = await createWorkflow(userId, companyId, req.body);
    res.status(201).json(workflow);
  } catch (err: any) {
    console.error('Astari create workflow error:', err?.message);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/workflows/:id/run
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/workflows/:id/run', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const run = await runWorkflow(String(req.params.id), userId, companyId);
    if (!run) return res.status(404).json({ error: 'Workflow not found' });
    res.json(run);
  } catch (err: any) {
    console.error('Astari run workflow error:', err?.message);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/knowledge
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/knowledge', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const items = await getKnowledge(companyId, req.query.search ? String(req.query.search) : undefined);
    res.json(items);
  } catch (err: any) {
    console.error('Astari knowledge error:', err?.message);
    res.status(500).json({ error: 'Failed to load knowledge' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/knowledge
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/knowledge', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
    const item = await createKnowledgeItem(userId, companyId, req.body);
    res.status(201).json(item);
  } catch (err: any) {
    console.error('Astari create knowledge error:', err?.message);
    res.status(500).json({ error: 'Failed to create knowledge item' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/astari/knowledge/:id/summarize
// ─────────────────────────────────────────────────────────────────
astariRoutes.post('/knowledge/:id/summarize', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const result = await summarizeKnowledgeItem(String(req.params.id), userId, companyId);
    if (!result) return res.status(404).json({ error: 'Knowledge item not found' });
    if (result.aiResult.status === 'blocked') {
      return res.status(402).json({ status: 'blocked', error: 'AI credit limit reached', upgradeUrl: result.aiResult.upgradeUrl });
    }
    res.json(result.item);
  } catch (err: any) {
    console.error('Astari summarize error:', err?.message);
    res.status(500).json({ error: 'Failed to summarize' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/astari/ai-usage
// ─────────────────────────────────────────────────────────────────
astariRoutes.get('/ai-usage', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuthCtx(req);
    const companyId = await resolveCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company assigned' });
    const days = Math.min(Number(req.query.days) || 7, 365);
    const usage = await getAstariAiUsage(userId, companyId, days);
    res.json(usage);
  } catch (err: any) {
    console.error('Astari AI usage error:', err?.message);
    res.status(500).json({ error: 'Failed to load AI usage' });
  }
});
