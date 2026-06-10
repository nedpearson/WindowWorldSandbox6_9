import { Router } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const measurementRulesRoutes = Router();

/** Resolve companyId for the authenticated user. */
async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return user?.companyId ?? null;
}

/** Build an OR filter that matches global rules and this user's company rules. */
function scopeWhere(companyId: string | null) {
  return companyId
    ? [{ companyId: null as string | null }, { companyId }]
    : [{ companyId: null as string | null }];
}

// ── GET /api/measurement-rules — list global + company rules ──────────────────
measurementRulesRoutes.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await getUserCompanyId(req.user!.userId);
    const rules = await prisma.measurementRule.findMany({
      where: { active: true, OR: scopeWhere(companyId) },
      orderBy: [{ windowType: 'asc' }, { name: 'asc' }],
    });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load measurement rules', details: err.message });
  }
});

// ── GET /api/measurement-rules/all — admin view including inactive ─────────────
measurementRulesRoutes.get('/all', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const companyId = await getUserCompanyId(req.user!.userId);
    const rules = await prisma.measurementRule.findMany({
      where: { OR: scopeWhere(companyId) },
      orderBy: [{ active: 'desc' }, { windowType: 'asc' }, { name: 'asc' }],
    });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load measurement rules', details: err.message });
  }
});

// ── GET /api/measurement-rules/:id ────────────────────────────────────────────
measurementRulesRoutes.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params['id']);
    const companyId = await getUserCompanyId(req.user!.userId);
    const rule = await prisma.measurementRule.findFirst({
      where: { id, OR: scopeWhere(companyId) },
    });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load rule', details: err.message });
  }
});

// ── POST /api/measurement-rules — create (admin/manager) ─────────────────────
measurementRulesRoutes.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const companyId = await getUserCompanyId(req.user!.userId);
    const {
      name, description, status, windowType, exteriorType, installType, removalType,
      widthTakeoffFraction, heightTakeoffFraction, widthTakeoffDecimal, heightTakeoffDecimal,
      minDeduction, maxDeduction, requiresConfirmation, requiresPhoto, requiresNote,
      severity, notes, version,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Rule name is required' });

    const rule = await prisma.measurementRule.create({
      data: {
        companyId,                                   // always server-side, never client-supplied
        name: name.trim(),
        description: description || null,
        status: status || 'needs_verification',
        windowType: windowType || null,
        exteriorType: exteriorType || null,
        installType: installType || null,
        removalType: removalType || null,
        widthTakeoffFraction: widthTakeoffFraction || null,
        heightTakeoffFraction: heightTakeoffFraction || null,
        widthTakeoffDecimal: parseFloat(widthTakeoffDecimal) || 0,
        heightTakeoffDecimal: parseFloat(heightTakeoffDecimal) || 0,
        minDeduction: minDeduction != null ? parseFloat(minDeduction) : null,
        maxDeduction: maxDeduction != null ? parseFloat(maxDeduction) : null,
        requiresConfirmation: requiresConfirmation ?? true,
        requiresPhoto: requiresPhoto ?? false,
        requiresNote: requiresNote ?? false,
        severity: severity || 'high',
        notes: notes || null,
        version: version ?? 1,
        createdBy: req.user!.userId,
        updatedBy: req.user!.userId,
        active: true,
      },
    });
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

// ── PATCH /api/measurement-rules/:id — update (admin/manager) ─────────────────
measurementRulesRoutes.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params['id']);
    const companyId = await getUserCompanyId(req.user!.userId);
    const existing = await prisma.measurementRule.findFirst({
      where: { id, OR: scopeWhere(companyId) },
    });
    if (!existing) return res.status(404).json({ error: 'Rule not found' });

    const allowed = [
      'name', 'description', 'status', 'windowType', 'exteriorType', 'installType',
      'removalType', 'widthTakeoffFraction', 'heightTakeoffFraction', 'widthTakeoffDecimal',
      'heightTakeoffDecimal', 'minDeduction', 'maxDeduction', 'requiresConfirmation',
      'requiresPhoto', 'requiresNote', 'severity', 'notes', 'version', 'active',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (data['widthTakeoffDecimal'] != null) data['widthTakeoffDecimal'] = parseFloat(data['widthTakeoffDecimal'] as string);
    if (data['heightTakeoffDecimal'] != null) data['heightTakeoffDecimal'] = parseFloat(data['heightTakeoffDecimal'] as string);
    data['updatedBy'] = req.user!.userId;

    const rule = await prisma.measurementRule.update({ where: { id }, data });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

// ── POST /api/measurement-rules/:id/verify — mark verified ────────────────────
measurementRulesRoutes.post('/:id/verify', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params['id']);
    const rule = await prisma.measurementRule.update({
      where: { id },
      data: { status: 'verified', updatedBy: req.user!.userId },
    });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify rule', details: err.message });
  }
});

// ── DELETE /api/measurement-rules/:id — retire (set active=false) ─────────────
measurementRulesRoutes.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params['id']);
    const companyId = await getUserCompanyId(req.user!.userId);
    const existing = await prisma.measurementRule.findFirst({
      where: { id, OR: scopeWhere(companyId) },
    });
    if (!existing) return res.status(404).json({ error: 'Rule not found' });

    // Soft-delete: retire instead of hard-delete to preserve history
    await prisma.measurementRule.update({
      where: { id },
      data: { active: false, status: 'inactive', updatedBy: req.user!.userId },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retire rule', details: err.message });
  }
});

// ── POST /api/measurement-rules/seed-defaults — one-time idempotent seed ──────
// Admin-only. Seeds the 9 standard Window World global measurement rules.
// Safe to call multiple times — skips any rule that already exists by name.
const DEFAULT_RULES = [
  { name: 'Oriel — Top Sash Measurement', description: 'Oriel windows must always be measured using the TOP SASH. No width/height deduction is applied — the top sash measurement IS the order measurement.', status: 'verified', windowType: 'oriel', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: true, requiresNote: true, severity: 'blocker', notes: 'Oriel: always use top sash measurement as-is for the order form.' },
  { name: 'Insert Install / Brick — Standard Takeoff', description: 'Standard insert into brick opening. Apply 1/4" takeoff to width and height. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: null, exteriorType: 'brick', installType: 'INT', widthTakeoffFraction: '1/4', widthTakeoffDecimal: 0.25, heightTakeoffFraction: '1/4', heightTakeoffDecimal: 0.25, requiresConfirmation: true, requiresPhoto: false, requiresNote: false, severity: 'high', notes: 'NEEDS_VERIFICATION: confirm brick insert takeoff with Window World.' },
  { name: 'Full Frame Install / Siding — No Deduction', description: 'Full frame replacement in siding opening. Measure rough opening width and height. No takeoff applied. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: null, exteriorType: 'siding', installType: 'EXT', widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: false, requiresNote: true, severity: 'medium', notes: 'NEEDS_VERIFICATION: confirm full-frame siding takeoff rules.' },
  { name: 'EXT Install / Brick — No Takeoff', description: 'EXT (exterior) install in brick. Measure from the existing frame. No standard deduction. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: null, exteriorType: 'brick', installType: 'EXT', widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: false, requiresNote: true, severity: 'medium', notes: 'NEEDS_VERIFICATION: confirm EXT brick measurement protocol.' },
  { name: 'Circle Top — Radius Measurement', description: 'Circle top windows require width, leg height, and rise measurement. Radius is computed as (rise/2) + (width²/8·rise).', status: 'verified', windowType: 'circle_top', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: true, requiresNote: false, severity: 'high', notes: 'Circle top: collect width, leg height, rise. App computes radius.' },
  { name: 'Eyebrow Window — Width + Rise + Leg Height', description: 'Eyebrow windows require width, rise (center height), and left/right leg heights. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: 'eyebrow', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: true, requiresNote: true, severity: 'high', notes: 'NEEDS_VERIFICATION: confirm eyebrow measurement set.' },
  { name: 'Arch / Half Round — Width + Height + Rise', description: 'Full arch/half-round: measure overall width and height. Rise = height. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: 'arch', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: true, requiresNote: false, severity: 'high', notes: 'NEEDS_VERIFICATION: confirm arch measurement protocol.' },
  { name: 'Quarter Arch — Width + Height + Leg Heights', description: 'Quarter arch: width, height, left leg height, right leg height required. NEEDS_VERIFICATION.', status: 'needs_verification', windowType: 'quarter_arch', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: true, requiresNote: true, severity: 'high', notes: 'NEEDS_VERIFICATION: confirm quarter arch dimension requirements.' },
  { name: 'Patio Door — Rough Opening Measurement', description: 'Patio doors: measure rough opening width and height. Confirm door swing direction and panel configuration.', status: 'needs_verification', windowType: 'patio_door', exteriorType: null, installType: null, widthTakeoffDecimal: 0, heightTakeoffDecimal: 0, requiresConfirmation: true, requiresPhoto: false, requiresNote: true, severity: 'high', notes: 'NEEDS_VERIFICATION: confirm patio door RO measurement protocol.' },
];

measurementRulesRoutes.post('/seed-defaults', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const rule of DEFAULT_RULES) {
    try {
      const exists = await prisma.measurementRule.findFirst({
        where: { name: rule.name, companyId: null } as any,
      });
      if (exists) {
        skipped.push(rule.name);
      } else {
        await prisma.measurementRule.create({
          data: {
            companyId: null,
            ...rule,
            version: 1,
            active: true,
            createdBy: req.user!.userId,
            updatedBy: req.user!.userId,
          } as any,
        });
        created.push(rule.name);
      }
    } catch (e: any) {
      errors.push(`${rule.name}: ${e.message}`);
    }
  }

  res.json({
    success: errors.length === 0,
    created,
    skipped,
    errors,
    summary: `Created ${created.length}, skipped ${skipped.length}${errors.length ? `, ${errors.length} error(s)` : ''}`,
  });
});
