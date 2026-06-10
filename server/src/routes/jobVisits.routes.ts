import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Job-site visits — logs a rep's required field visits (when / where / what learned).
 * Requires the JobSiteVisit model (see JobSiteVisit.prisma.txt) + migration.
 *
 * Mount in server/src/index.ts:
 *   import { jobVisitRoutes } from './routes/jobVisits.routes.js';
 *   app.use('/api/job-visits', jobVisitRoutes);
 */

export const jobVisitRoutes = Router();
jobVisitRoutes.use(requireAuth);

// List the rep's visits (optional ?from / ?to ISO range) + a count
jobVisitRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { from, to } = req.query;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') where.userId = userId;
    if (from || to) {
      where.visitedAt = {};
      if (from) where.visitedAt.gte = new Date(String(from));
      if (to) where.visitedAt.lte = new Date(String(to));
    }

    const visits = await prisma.jobSiteVisit.findMany({
      where,
      orderBy: { visitedAt: 'desc' },
      take: 500,
    });
    res.json({ count: visits.length, visits });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list job visits', detail: err?.message });
  }
});

// Log a visit (stamps visitedAt now unless provided)
jobVisitRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId ?? null;
    const { siteName, address, city, state, zip, customerId, visitedAt, learned } = req.body;

    if (!siteName && !address) {
      return res.status(400).json({ error: 'siteName or address is required' });
    }

    const visit = await prisma.jobSiteVisit.create({
      data: {
        userId,
        ...(companyId ? { companyId } : {}),
        customerId: customerId || null,
        siteName: (siteName ?? '').trim() || null,
        address: (address ?? '').trim() || null,
        city: (city ?? '').trim() || null,
        state: (state ?? 'LA').trim() || 'LA',
        zip: (zip ?? '').trim() || null,
        visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
        learned: learned ?? null,
      },
    });
    res.status(201).json(visit);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to log job visit', detail: err?.message });
  }
});

// Update notes / details on a visit (own visits only unless admin/manager)
jobVisitRoutes.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const where: any = { id: req.params.id };
    if (role !== 'admin' && role !== 'manager') where.userId = userId;
    const exists = await prisma.jobSiteVisit.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Visit not found' });

    const { learned, siteName, address, city, state, zip, visitedAt } = req.body;
    const visit = await prisma.jobSiteVisit.update({
      where: { id: req.params.id },
      data: {
        ...(learned !== undefined ? { learned } : {}),
        ...(siteName !== undefined ? { siteName } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(zip !== undefined ? { zip } : {}),
        ...(visitedAt !== undefined ? { visitedAt: new Date(visitedAt) } : {}),
      },
    });
    res.json(visit);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update job visit', detail: err?.message });
  }
});

// Delete a visit (own visits only unless admin/manager)
jobVisitRoutes.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const where: any = { id: req.params.id };
    if (role !== 'admin' && role !== 'manager') where.userId = userId;
    const exists = await prisma.jobSiteVisit.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Visit not found' });
    await prisma.jobSiteVisit.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete job visit', detail: err?.message });
  }
});
