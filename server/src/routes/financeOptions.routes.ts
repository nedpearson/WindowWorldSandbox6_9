/**
 * financeOptions.routes.ts
 * Finance catalog + proposal financing selection API routes.
 *
 * All routes require auth. companyId is always resolved from DB.
 *
 * Routes:
 *   POST /api/finance-options/import-local          (admin only)
 *   GET  /api/finance-options                       (all roles — company scoped)
 *   GET  /api/finance-options/:id
 *   POST /api/finance-options/calculate             (all roles)
 *   PATCH /api/finance-options/:id/toggle           (manager/admin)
 *   POST /api/finance-options/appointment/:id/select  (sales_rep+)
 *   GET  /api/finance-options/appointment/:id/selection
 *   DELETE /api/finance-options/appointment/:id/selection
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import {
  importFinanceOptions,
  isAllowedFinancePath,
} from '../services/financeOptionsImport.service.js';
import {
  calculateFinancing,
  calculateAllOptions,
  verifyAgainstSpreadsheet,
  type FinanceOptionSnapshot,
} from '../services/financeCalculator.service.js';

const prisma = new PrismaClient();
export const financeOptionsRoutes = Router();
financeOptionsRoutes.use(requireAuth);

// ── Helper: resolve companyId from DB ─────────────────────────
async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return user?.companyId ?? null;
}

// ── Helper: map DB row to FinanceOptionSnapshot ───────────────
function toSnapshot(opt: {
  planKey: string;
  displayName: string | null;
  name: string;
  formulaType: string;
  termMonths: number;
  apr: number;
  monthlyPaymentFactor: unknown;
  minimumAmount: unknown;
  maximumAmount: unknown;
  downPaymentPercent: unknown;
  downPaymentAmount: unknown;
  disclosureText: string | null;
  promoType: string;
}): FinanceOptionSnapshot {
  return {
    planKey: opt.planKey,
    displayName: opt.displayName ?? opt.name,
    formulaType: opt.formulaType as FinanceOptionSnapshot['formulaType'],
    termMonths: opt.termMonths,
    apr: opt.apr,
    monthlyPaymentFactor: opt.monthlyPaymentFactor != null ? Number(opt.monthlyPaymentFactor) : null,
    minimumAmount: opt.minimumAmount != null ? Number(opt.minimumAmount) : null,
    maximumAmount: opt.maximumAmount != null ? Number(opt.maximumAmount) : null,
    downPaymentPercent: opt.downPaymentPercent != null ? Number(opt.downPaymentPercent) : null,
    downPaymentAmount: opt.downPaymentAmount != null ? Number(opt.downPaymentAmount) : null,
    disclosureText: opt.disclosureText,
    promoType: opt.promoType,
  };
}

// ── POST /import-local (admin/dev only — local server path) ───
financeOptionsRoutes.post('/import-local', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Admin role required for local import' });
    }

    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });
    if (!isAllowedFinancePath(filePath)) {
      return res.status(403).json({
        error: 'File path not in allowed list. Add the path to ALLOWED_IMPORT_PATHS in financeOptionsImport.service.ts.',
      });
    }

    const companyId = await getCompanyId(userId);
    const summary = await importFinanceOptions(filePath, userId, companyId);

    res.json({
      ok: true,
      ...summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Finance import error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── POST /import-upload (admin only — file upload for production) ──
// Accepts raw .xlsx binary body (Content-Type: application/octet-stream)
// Writes to /tmp/finance-options-import.xlsx then runs the import pipeline.
import { writeFile } from 'fs/promises';
financeOptionsRoutes.post('/import-upload', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Admin role required' });
    }

    // Collect raw body chunks
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const fileBuffer = Buffer.concat(chunks);
    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: 'No file data received' });
    }

    // Save to /tmp path (already in the security allowlist)
    const tmpPath = '/tmp/finance-options-import.xlsx';
    await writeFile(tmpPath, fileBuffer);

    const companyId = await getCompanyId(userId);
    const summary = await importFinanceOptions(tmpPath, userId, companyId);

    res.json({ ok: true, ...summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Finance upload import error:', msg);
    res.status(500).json({ error: msg });
  }
});



// ── GET / — list company finance options ──────────────────────
financeOptionsRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const companyId = await getCompanyId(userId);
    const { active, limit = '100', offset = '0' } = req.query as Record<string, string>;

    const where = {
      AND: [
        {
          OR: [
            { companyId: companyId ?? undefined },
            { companyId: null },
          ],
        },
        active === 'false' ? {} : { isActive: true },
      ],
    };

    const [options, total] = await Promise.all([
      prisma.financeOption.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { termMonths: 'asc' }],
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
      }),
      prisma.financeOption.count({ where }),
    ]);

    res.json({ total, items: options });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Finance catalog list error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── GET /:id — single finance option ──────────────────────────
financeOptionsRoutes.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const companyId = await getCompanyId(userId);

    const option = await prisma.financeOption.findFirst({
      where: {
        id,
        OR: [
          { companyId: companyId ?? undefined },
          { companyId: null },
        ],
      },
    });

    if (!option) return res.status(404).json({ error: 'Finance option not found' });
    res.json(option);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── POST /calculate — compute monthly payment ─────────────────
financeOptionsRoutes.post('/calculate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { projectAmount, financeOptionId, planKey, downPaymentAmount, calculateAll } = req.body;

    const amount = parseFloat(projectAmount) || 0;
    if (amount <= 0) return res.status(400).json({ error: 'projectAmount must be > 0' });

    const companyId = await getCompanyId(userId);

    // calculateAll: return all eligible options for this amount
    if (calculateAll) {
      const options = await prisma.financeOption.findMany({
        where: {
          isActive: true,
          OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
        },
        orderBy: [{ sortOrder: 'asc' }, { termMonths: 'asc' }],
      });
      const snapshots = options.map(toSnapshot);
      const results = calculateAllOptions(amount, snapshots);
      const verification = verifyAgainstSpreadsheet(snapshots);
      return res.json({ results, verification });
    }

    // Single option calculation
    let option = null;
    if (financeOptionId) {
      option = await prisma.financeOption.findFirst({
        where: {
          id: financeOptionId,
          OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
        },
      });
    } else if (planKey) {
      option = await prisma.financeOption.findFirst({
        where: {
          planKey,
          OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
        },
      });
    }

    if (!option) return res.status(404).json({ error: 'Finance option not found' });

    const snapshot = toSnapshot(option);
    const result = calculateFinancing({
      projectAmount: amount,
      option: snapshot,
      downPaymentOverride: downPaymentAmount != null ? parseFloat(downPaymentAmount) : undefined,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Finance calculate error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── PATCH /:id/toggle — enable/disable (manager/admin) ────────
financeOptionsRoutes.patch('/:id/toggle', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!['admin', 'super_admin', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Manager role required' });
    }

    const { id } = req.params;
    const companyId = await getCompanyId(userId);

    const option = await prisma.financeOption.findFirst({
      where: {
        id,
        OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
      },
    });
    if (!option) return res.status(404).json({ error: 'Finance option not found' });

    const updated = await prisma.financeOption.update({
      where: { id },
      data: { isActive: !option.isActive },
    });

    res.json({ ok: true, isActive: updated.isActive });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── POST /appointment/:id/select — save selection ─────────────
financeOptionsRoutes.post('/appointment/:id/select', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const appointmentId = req.params.id;
    const companyId = await getCompanyId(userId);

    // Verify the user has access to this appointment
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, userId: true, companyId: true, totalAmount: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const role = (req as any).user?.role;
    const isAdminOrManager = ['admin', 'super_admin', 'manager'].includes(role);
    if (!isAdminOrManager && appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      financeOptionId,
      planKey,
      projectAmount,
      downPaymentAmount,
      discussed = false,
      inPacket = true,
      notes,
    } = req.body;

    // Resolve the finance option
    let option = null;
    if (financeOptionId) {
      option = await prisma.financeOption.findFirst({
        where: {
          id: financeOptionId,
          OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
        },
      });
    } else if (planKey) {
      option = await prisma.financeOption.findFirst({
        where: {
          planKey,
          OR: [{ companyId: companyId ?? undefined }, { companyId: null }],
        },
      });
    }
    if (!option) return res.status(404).json({ error: 'Finance option not found' });

    // Calculate the financing
    const amount = parseFloat(projectAmount) || appt.totalAmount || 0;
    const snapshot = toSnapshot(option);
    const calcResult = calculateFinancing({
      projectAmount: amount,
      option: snapshot,
      downPaymentOverride: downPaymentAmount != null ? parseFloat(downPaymentAmount) : undefined,
    });

    // Upsert AppointmentFinanceSelection
    const selection = await prisma.appointmentFinanceSelection.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        companyId,
        financeOptionId: option.id,
        jobAmount: calcResult.projectAmount,
        downPaymentAmount: calcResult.downPaymentAmount,
        amountFinanced: calcResult.financedAmount,
        monthlyPayment: calcResult.estimatedMonthlyPayment,
        termMonths: calcResult.termMonths,
        aprPercent: calcResult.aprPercent,
        totalPayments: calcResult.totalPayments,
        totalInterest: calcResult.totalInterest,
        disclosureText: calcResult.disclosureText,
        discussed,
        inPacket,
        selectedBy: userId,
        notes,
      },
      update: {
        financeOptionId: option.id,
        jobAmount: calcResult.projectAmount,
        downPaymentAmount: calcResult.downPaymentAmount,
        amountFinanced: calcResult.financedAmount,
        monthlyPayment: calcResult.estimatedMonthlyPayment,
        termMonths: calcResult.termMonths,
        aprPercent: calcResult.aprPercent,
        totalPayments: calcResult.totalPayments,
        totalInterest: calcResult.totalInterest,
        disclosureText: calcResult.disclosureText,
        discussed,
        inPacket,
        selectedBy: userId,
        notes,
        selectedAt: new Date(),
      },
      include: { financeOption: true },
    });

    res.json({ ok: true, selection, calculation: calcResult });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Finance selection error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── GET /appointment/:id/selection ────────────────────────────
financeOptionsRoutes.get('/appointment/:id/selection', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const appointmentId = req.params.id;

    // Verify access
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { userId: true, companyId: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const role = (req as any).user?.role;
    const isAdminOrManager = ['admin', 'super_admin', 'manager'].includes(role);
    if (!isAdminOrManager && appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const selection = await prisma.appointmentFinanceSelection.findUnique({
      where: { appointmentId },
      include: { financeOption: true },
    });

    if (!selection) return res.json(null);
    res.json(selection);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /appointment/:id/selection ─────────────────────────
financeOptionsRoutes.delete('/appointment/:id/selection', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const appointmentId = req.params.id;

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { userId: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const role = (req as any).user?.role;
    const isAdminOrManager = ['admin', 'super_admin', 'manager'].includes(role);
    if (!isAdminOrManager && appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = await prisma.appointmentFinanceSelection.findUnique({
      where: { appointmentId },
    });
    if (!existing) return res.status(404).json({ error: 'No finance selection for this appointment' });

    await prisma.appointmentFinanceSelection.delete({ where: { appointmentId } });
    res.json({ ok: true, deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
