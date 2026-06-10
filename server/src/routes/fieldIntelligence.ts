import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

// Helper to extract string from Express v5 req.params
function paramString(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}

export const fieldIntelligenceRoutes = Router();
fieldIntelligenceRoutes.use(requireAuth);

// GET /api/field-intelligence/appointment/:appointmentId
fieldIntelligenceRoutes.get('/appointment/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const appointmentId = paramString(req.params.appointmentId);
    const { prisma } = await import('../index.js');

    // Derive companyId from user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    // Verify appointment ownership
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { user: { select: { companyId: true } } },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    const apptCompanyId = (appt as any).user?.companyId;
    if (apptCompanyId && apptCompanyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const findings = await prisma.fieldIntelligenceFinding.findMany({
      where: {
        appointmentId,
        companyId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return res.json({ findings });
  } catch (err: any) {
    console.error('[fieldIntelligence] GET error:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

// PATCH /api/field-intelligence/findings/:id
fieldIntelligenceRoutes.patch('/findings/:id', async (req: AuthRequest, res) => {
  try {
    const id = paramString(req.params.id);
    const { status, overrideReason } = req.body;

    const ALLOWED_STATUSES = ['open', 'applied', 'ignored', 'reviewed', 'manager_review'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { prisma } = await import('../index.js');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    const finding = await prisma.fieldIntelligenceFinding.findUnique({ where: { id } });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if (finding.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.fieldIntelligenceFinding.update({
      where: { id },
      data: {
        status,
        resolvedAt: status !== 'open' ? new Date() : null,
        resolvedBy: status !== 'open' ? req.user!.userId : null,
      },
    });

    return res.json({ success: true, finding: updated });
  } catch (err: any) {
    console.error('[fieldIntelligence] PATCH error:', err?.message);
    return res.status(500).json({ error: 'Failed to update finding' });
  }
});

// POST /api/field-intelligence/findings/:id/apply (safe actions only)
fieldIntelligenceRoutes.post('/findings/:id/apply', async (req: AuthRequest, res) => {
  const ALLOWED_APPLY_ACTIONS = [
    'recalculate_pricing',
    'mark_reviewed',
    'escalate_to_manager',
  ];

  try {
    const id = paramString(req.params.id);
    const { action, reason } = req.body;

    if (!ALLOWED_APPLY_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Action "${action}" is not allowed. Permitted: ${ALLOWED_APPLY_ACTIONS.join(', ')}`,
      });
    }

    const { prisma } = await import('../index.js');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    const finding = await prisma.fieldIntelligenceFinding.findUnique({ where: { id } });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if (finding.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    let result: any = {};

    if (action === 'recalculate_pricing' && finding.appointmentId) {
      result = { delegateTo: `/api/appointments/${finding.appointmentId}/recalculate`, method: 'POST' };
    } else if (action === 'mark_reviewed') {
      await prisma.fieldIntelligenceFinding.update({
        where: { id },
        data: { status: 'reviewed', resolvedAt: new Date(), resolvedBy: String(req.user!.userId) },
      });
      result = { status: 'reviewed' };
    } else if (action === 'escalate_to_manager') {
      await prisma.fieldIntelligenceFinding.update({
        where: { id },
        data: { status: 'manager_review', resolvedAt: new Date(), resolvedBy: String(req.user!.userId) },
      });
      result = { status: 'manager_review' };
    }

    return res.json({ success: true, action, result });
  } catch (err: any) {
    console.error('[fieldIntelligence] apply error:', err?.message);
    return res.status(500).json({ error: 'Failed to apply action' });
  }
});
