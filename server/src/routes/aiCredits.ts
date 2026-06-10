import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AI_CONFIG } from '../config/aiModels.js';
import {
  checkCreditBalance,
  getUsageSummary,
  addBonusCredits,
  resetMonthlyCredits,
  isSuperAdmin,
} from '../services/aiGateway.js';

export const aiCreditRoutes = Router();
aiCreditRoutes.use(requireAuth);

// ── GET /api/ai-credits/status — current user's credit balance ─────────
aiCreditRoutes.get('/status', async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../index.js');
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || userId;
    const [balance, superAdmin] = await Promise.all([
      checkCreditBalance(companyId, userId, 'general'),
      isSuperAdmin(userId),
    ]);
    return res.json({
      companyId,
      ...balance,
      isSuperAdmin: superAdmin,
      upgradeUrl: AI_CONFIG.upgradeUrl,
      creditsEnabled: AI_CONFIG.creditsEnabled,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch credit status' });
  }
});

// ── GET /api/ai-credits/usage — usage events scoped to role ───────────
aiCreditRoutes.get('/usage', async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../index.js');
    const userId = req.user!.userId;
    const days = Math.min(parseInt((req.query.days as string) || '30', 10), 90);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });
    const companyId = user?.companyId || userId;
    const isAdmin = ['admin', 'manager', 'super_admin'].includes(user?.role || '');
    const summary = await getUsageSummary(companyId, isAdmin ? undefined : userId, days);
    return res.json(summary);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ── GET /api/ai-credits/upgrade — public upgrade URL ─────────────────
// requireAuth is still applied (keep authenticated to prevent probing)
aiCreditRoutes.get('/upgrade', (_req, res) => {
  return res.json({
    upgradeUrl: AI_CONFIG.upgradeUrl,
    stripePriceId: AI_CONFIG.stripePriceId,
    stripeBillingUrl: AI_CONFIG.stripeBillingUrl,
  });
});

// ── POST /api/ai-credits/admin/add-bonus — admin/manager only ────────
aiCreditRoutes.post('/admin/add-bonus', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { companyId, credits } = req.body;
    if (!companyId || typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({ error: 'companyId and positive credits number required' });
    }
    const { prisma } = await import('../index.js');
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }});
    const superAdmin = await isSuperAdmin(req.user!.userId);
    if (!superAdmin && user?.companyId !== companyId) {
      return res.status(403).json({ error: 'Cannot add credits to another company' });
    }
    await addBonusCredits(companyId, Number(credits), req.user!.userId);
    return res.json({ success: true, creditsAdded: credits });
  } catch {
    return res.status(500).json({ error: 'Failed to add bonus credits' });
  }
});

// ── POST /api/ai-credits/admin/reset — admin/manager only ────────────
aiCreditRoutes.post('/admin/reset', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId required' });
    const { prisma } = await import('../index.js');
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }});
    const superAdmin = await isSuperAdmin(req.user!.userId);
    if (!superAdmin && user?.companyId !== companyId) {
      return res.status(403).json({ error: 'Cannot reset credits for another company' });
    }
    await resetMonthlyCredits(companyId as string, req.user!.userId);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to reset credits' });
  }
});

// ── GET /api/ai-credits/admin/dashboard — full admin view ────────────
aiCreditRoutes.get('/admin/dashboard', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../index.js');
    const userId = req.user!.userId;
    const [superAdmin, user] = await Promise.all([
      isSuperAdmin(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
    ]);
    const companyId = user?.companyId || userId;

    let summaries;
    if (superAdmin) {
      // Super admin sees all companies that have credit accounts
      const accounts = await prisma.aiCreditAccount.findMany({
        select: { companyId: true },
        take: 50,
      });
      summaries = await Promise.all(
        accounts.map((a: { companyId: string }) => getUsageSummary(a.companyId, undefined, 30))
      );
    } else {
      summaries = [await getUsageSummary(companyId, undefined, 30)];
    }

    return res.json({ summaries, upgradeUrl: AI_CONFIG.upgradeUrl });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ── GET /api/ai-credits/admin/export-csv — usage CSV export ──────────
aiCreditRoutes.get('/admin/export-csv', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../index.js');
    const userId = req.user!.userId;
    const days = Math.min(parseInt((req.query.days as string) || '30', 10), 365);
    const since = new Date(Date.now() - days * 86_400_000);

    const [superAdmin, user] = await Promise.all([
      isSuperAdmin(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
    ]);
    const companyId = user?.companyId || userId;

    // Super admin can export all companies; normal admin exports own company only
    const where: Record<string, any> = {
      createdAt: { gte: since },
      ...(superAdmin ? {} : { companyId }),
    };

    const events = await (prisma as any).aiUsageEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: {
        createdAt: true,
        companyId: true,
        userId: true,
        featureKey: true,
        model: true,
        creditsUsed: true,
        cacheHit: true,
        status: true,
        provider: true,
        imageCount: true,
        errorMessage: true,
      },
    });

    // Build CSV
    const headers = [
      'date', 'companyId', 'userId', 'feature', 'model',
      'creditsUsed', 'cacheHit', 'status', 'provider', 'imageCount', 'errorMessage',
    ];
    const escape = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = events.map((e: any) => [
      new Date(e.createdAt).toISOString(),
      e.companyId,
      e.userId,
      e.featureKey,
      e.model,
      e.creditsUsed,
      e.cacheHit ? 'true' : 'false',
      e.status,
      e.provider || '',
      e.imageCount ?? 0,
      e.errorMessage || '',
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `ai-usage-${companyId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

