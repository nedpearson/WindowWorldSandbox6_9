import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../index.js';
import {
  checkCreditBalance,
  getUsageSummary,
  addBonusCredits,
  resetMonthlyCredits,
  isSuperAdmin,
} from '../services/aiGateway.js';

export const aiUsageRoutes = Router();
aiUsageRoutes.use(requireAuth);

// Helper to determine if user is a sales rep (must scope reading queries to themselves)
async function isSalesRepUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  return !['admin', 'manager', 'super_admin'].includes(user?.role || '');
}

// Helper to resolve user company ID
async function getUserCompanyId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true }
  });
  return user?.companyId || userId;
}

// 1. GET /api/ai-usage/summary
aiUsageRoutes.get('/summary', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    const superAdmin = await isSuperAdmin(userId);
    const isSalesRep = await isSalesRepUser(userId);
    
    // Summary filtered by userId if sales rep
    const summary = await getUsageSummary(companyId, isSalesRep ? userId : undefined, 30);
    
    return res.json({
      ...summary,
      isSuperAdmin: superAdmin,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch usage summary', details: err.message });
  }
});

// 2. GET /api/ai-usage/events
aiUsageRoutes.get('/events', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    const isSalesRep = await isSalesRepUser(userId);
    
    const events = await prisma.aiUsageEvent.findMany({
      where: {
        companyId,
        ...(isSalesRep ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch AI usage events', details: err.message });
  }
});

// 3. GET /api/ai-usage/by-feature
aiUsageRoutes.get('/by-feature', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    const isSalesRep = await isSalesRepUser(userId);

    const events = await prisma.aiUsageEvent.findMany({
      where: {
        companyId,
        ...(isSalesRep ? { userId } : {}),
      },
      select: {
        featureKey: true,
        creditsUsed: true,
        cacheHit: true,
      }
    });

    const byFeature: Record<string, { calls: number; credits: number; cacheHits: number }> = {};
    for (const e of events) {
      const fk = e.featureKey || 'unknown';
      if (!byFeature[fk]) byFeature[fk] = { calls: 0, credits: 0, cacheHits: 0 };
      byFeature[fk].calls++;
      byFeature[fk].credits += e.creditsUsed || 0;
      if (e.cacheHit) byFeature[fk].cacheHits++;
    }

    return res.json(byFeature);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch events grouped by feature', details: err.message });
  }
});

// 4. GET /api/ai-usage/by-user
aiUsageRoutes.get('/by-user', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    const isSalesRep = await isSalesRepUser(userId);

    const events = await prisma.aiUsageEvent.findMany({
      where: {
        companyId,
        ...(isSalesRep ? { userId } : {}),
      },
      select: {
        userId: true,
        creditsUsed: true,
      }
    });

    const byUserMap: Record<string, { calls: number; credits: number }> = {};
    for (const e of events) {
      const uid = e.userId || 'unknown';
      if (!byUserMap[uid]) byUserMap[uid] = { calls: 0, credits: 0 };
      byUserMap[uid].calls++;
      byUserMap[uid].credits += e.creditsUsed || 0;
    }

    const byUser = Object.entries(byUserMap).map(([uid, data]) => ({
      userId: uid,
      ...data,
    }));

    return res.json(byUser);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch events grouped by user', details: err.message });
  }
});

// 5. GET /api/ai-usage/feature-limits
aiUsageRoutes.get('/feature-limits', async (req: AuthRequest, res) => {
  try {
    const limits = await prisma.aiFeatureLimit.findMany();
    return res.json(limits);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch feature limits', details: err.message });
  }
});

// 6. PATCH /api/ai-usage/feature-limits/:id (requireAdmin)
aiUsageRoutes.patch('/feature-limits/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { monthlyLimit, dailyLimit, perRequestLimit, creditsPerCall, defaultModel, cacheTtlSeconds, requiresHumanClick } = req.body;
    
    const updated = await prisma.aiFeatureLimit.update({
      where: { id: String(id) },
      data: {
        ...(monthlyLimit !== undefined && { monthlyLimit: monthlyLimit === null ? null : Number(monthlyLimit) }),
        ...(dailyLimit !== undefined && { dailyLimit: dailyLimit === null ? null : Number(dailyLimit) }),
        ...(perRequestLimit !== undefined && { perRequestLimit: Number(perRequestLimit) }),
        ...(creditsPerCall !== undefined && { creditsPerCall: Number(creditsPerCall) }),
        ...(defaultModel !== undefined && { defaultModel }),
        ...(cacheTtlSeconds !== undefined && { cacheTtlSeconds: Number(cacheTtlSeconds) }),
        ...(requiresHumanClick !== undefined && { requiresHumanClick: Boolean(requiresHumanClick) }),
        updatedAt: new Date(),
      }
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update feature limit', details: err.message });
  }
});

// 7. POST /api/ai-usage/credits/add (requireAdmin)
aiUsageRoutes.post('/credits/add', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { companyId, credits } = req.body;
    if (!companyId || typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({ error: 'companyId and positive credits number are required' });
    }
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!superAdmin && requestingUser?.companyId !== companyId) {
      return res.status(403).json({ error: 'Cannot add credits to another company' });
    }

    await addBonusCredits(companyId, credits, userId);
    return res.json({ success: true, companyId, creditsAdded: credits });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add credits', details: err.message });
  }
});

// 8. POST /api/ai-usage/credits/reset (requireAdmin)
aiUsageRoutes.post('/credits/reset', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!superAdmin && requestingUser?.companyId !== companyId) {
      return res.status(403).json({ error: 'Cannot reset credits for another company' });
    }

    await resetMonthlyCredits(companyId, userId);
    return res.json({ success: true, companyId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset credits', details: err.message });
  }
});
