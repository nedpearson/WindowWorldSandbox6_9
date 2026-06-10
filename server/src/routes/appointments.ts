import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { applyOpeningDefaults } from './openings.js';
import { recalculatePricing } from '../services/pricingEngine.js';
import { Prisma } from '@prisma/client';
import { syntheticIntelligenceOrchestrator } from '../services/syntheticIntelligenceOrchestrator.js';

export const appointmentRoutes = Router();
appointmentRoutes.use(requireAuth);

// List appointments (with filters + pagination)
appointmentRoutes.get('/', async (req, res) => {
  try {
    const { status, date, search, customerId, followUp } = req.query;
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    // companyId is now pre-resolved by requireAuth middleware — no extra DB round-trip
    const companyId = (req as any).user?.companyId ?? null;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') {
      where.userId = userId;
    }
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Number(req.query.offset) || 0;

    if (status && status !== 'all') {
      const statusList = (status as string).split(',').map(s => s.trim());
      where.status = { in: statusList };
    } else if (!status) {
      where.status = { not: 'archived' };
    }
    if (customerId) where.customerId = String(customerId);
    if (followUp === 'due') {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      where.followUpDate = { lte: endOfToday };
      where.status = { notIn: ['sold', 'cancelled'] };
    }
    if (date) {
      const d = new Date(date as string);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.appointmentDate = { gte: start, lt: end };
    }
    if (search) {
      where.OR = [
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { jobAddress: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Determine fields to select
    const isFieldMode = req.query.field === '1';
    const selectFields: any = isFieldMode
      ? {
          id: true,
          companyId: true,
          userId: true,
          status: true,
          appointmentDate: true,
          jobAddress: true,
          jobCity: true,
          jobState: true,
          jobZip: true,
          totalAmount: true,
          completionPct: true,
          updatedAt: true,
          projectType: true,
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true, city: true, state: true, zip: true } },
          _count: { select: { openings: true } },
        }
      : {
          id: true,
          status: true,
          appointmentDate: true,
          jobAddress: true,
          jobCity: true,
          totalAmount: true,
          completionPct: true,
          updatedAt: true,
          followUpDate: true,
          projectType: true,
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { openings: true } },
        };

    const appointments = await prisma.appointment.findMany({
      where,
      take,
      skip,
      select: selectFields,
      orderBy: isFieldMode 
        ? [
            { appointmentDate: 'asc' }, // primary sort for today/dated appts
            { updatedAt: 'desc' }       // secondary sort for in_progress/recent
          ]
        : { updatedAt: 'desc' }
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment (full detail) — openings include photos for the field app
appointmentRoutes.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const where: any = { id: req.params.id };
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') {
      where.userId = userId;
    }
    const appointment = await prisma.appointment.findFirst({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' }, include: { photos: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        contracts: { orderBy: { version: 'desc' } },
        signatures: true,
        payments: { orderBy: { paidAt: 'desc' } },
        formSketches: {
          include: {
            markers: true,
            markerGroups: { include: { members: true } }
          }
        }
      }
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Apply sensible defaults to openings for frontend consistency
    (appointment as any).openings = (appointment as any).openings.map(applyOpeningDefaults);

    // ── Synthetic AI Layer: Attach Background Intelligence ──
    const preVisitPropertyProfile = await prisma.preVisitPropertyProfile.findFirst({
      where: { appointmentId: appointment.id },
      orderBy: { createdAt: 'desc' }
    });
    
    const syntheticInferences = await prisma.syntheticInference.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { createdAt: 'desc' }
    });

    (appointment as any).preVisitPropertyProfile = preVisitPropertyProfile;
    (appointment as any).syntheticInferences = syntheticInferences;

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Get appointment summary only (lightweight — for list cards and quick preview)
appointmentRoutes.get('/:id/summary', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const where: any = { id: req.params.id };
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') where.userId = userId;

    const appointment = await prisma.appointment.findFirst({
      where,
      select: {
        id: true, status: true, appointmentDate: true,
        jobAddress: true, jobCity: true, totalAmount: true,
        completionPct: true, updatedAt: true, projectType: true,
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { openings: true } },
      }
    });
    if (!appointment) return res.status(404).json({ error: 'Not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment summary' });
  }
});

// Get appointment timeline events — company-scoped
appointmentRoutes.get('/:id/timeline', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const where: any = { id: req.params.id };
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') where.userId = userId;

    const exists = await prisma.appointment.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Appointment not found' });

    const events = await prisma.appointmentTimelineEvent.findMany({
      where: { appointmentId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Post a timeline event
appointmentRoutes.post('/:id/timeline', async (req, res) => {
  try {
    const userIdReq = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const where: any = { id: req.params.id };
    if (role !== 'admin' && role !== 'manager') where.userId = userIdReq;

    const exists = await prisma.appointment.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Appointment not found' });

    const { eventType, title, description } = req.body;
    const event = await prisma.appointmentTimelineEvent.create({
      data: {
        appointmentId: req.params.id,
        eventType: eventType || 'updated',
        title,
        description,
        userId: userIdReq || null,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create timeline event' });
  }
});



// Create appointment — userId MUST come from JWT, not request body
appointmentRoutes.post('/', async (req, res) => {
  try {
    const callerUserId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId ?? null;
    const { customerId, userId: _ignoredBodyUserId, ...rest } = req.body;

    const custExists = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!custExists) {
      return res.status(400).json({ error: `Customer ID ${customerId} not found in database.` });
    }
    if (companyId && custExists.companyId && custExists.companyId !== companyId) {
      return res.status(403).json({ error: 'Customer belongs to another company.' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId,
        userId: callerUserId,
        ...rest,
        ...(companyId ? { companyId } : {}),
      },
      include: { customer: true, user: { select: { id: true, name: true } } }
    });

    // ── Synthetic AI Layer: Trigger Background Property Intelligence ──
    syntheticIntelligenceOrchestrator.triggerPropertyIntelligence(appointment.id).catch(err => {
      console.error('[SyntheticAI] Background orchestrator failed:', err);
    });

    res.status(201).json(appointment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create appointment', details: err.message });
  }
});

// Update appointment
appointmentRoutes.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const where: any = { id: req.params.id };
    if (role !== 'admin' && role !== 'manager') {
      where.userId = userId;
    }
    const exists = await prisma.appointment.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Appointment not found' });

    const scalarData: any = {};
    for (const [key, val] of Object.entries(req.body)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === '_count') continue;
      // Allow primitive values and null, discard arrays/objects
      if ((val === null || typeof val !== 'object') && Object.keys(Prisma.AppointmentScalarFieldEnum).includes(key)) {
        scalarData[key] = val;
      }
    }

    // Sanitize numeric fields (like qa2Price) to prevent Prisma 500 errors if client bypassed validation
    const sanitizeNumeric = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const parsed = parseFloat(String(val));
      return isFinite(parsed) ? parsed : null;
    };

    if ('qa2Price1' in scalarData) scalarData.qa2Price1 = sanitizeNumeric(scalarData.qa2Price1);
    if ('qa2Price2' in scalarData) scalarData.qa2Price2 = sanitizeNumeric(scalarData.qa2Price2);
    if ('qa2Price3' in scalarData) scalarData.qa2Price3 = sanitizeNumeric(scalarData.qa2Price3);
    if ('qa2CommissionOverride' in scalarData) scalarData.qa2CommissionOverride = sanitizeNumeric(scalarData.qa2CommissionOverride);
    if ('qa2BonusAmount' in scalarData) scalarData.qa2BonusAmount = sanitizeNumeric(scalarData.qa2BonusAmount);

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: scalarData,
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        formSketches: {
          include: {
            markers: true,
            markerGroups: { include: { members: true } }
          }
        }
      }
    });

    (appointment as any).openings = (appointment as any).openings.map(applyOpeningDefaults);

    res.json(appointment);
  } catch (err: any) {
    console.error('[appointments] PUT error:', err?.message);
    res.status(500).json({ error: 'Failed to update appointment', detail: err?.message });
  }
});


// Archive appointment (soft-delete — sets status to 'archived')
appointmentRoutes.patch('/:id/archive', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const isSuperAdmin = role === 'super_admin';
    const isAdminOrManager = role === 'admin' || role === 'manager' || isSuperAdmin;

    const ownershipWhere: any = { id: req.params.id };
    if (isSuperAdmin) {
      // Super admin can act on any appointment
    } else if (isAdminOrManager && companyId) {
      ownershipWhere.companyId = companyId;
    } else {
      ownershipWhere.userId = userId;
    }

    const exists = await prisma.appointment.findFirst({ where: ownershipWhere });
    if (!exists) return res.status(404).json({ error: 'Appointment not found or you do not have permission to archive it' });
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'archived' },
    });
    res.json(updated);
  } catch (err: any) {
    console.error('[appointments] ARCHIVE error:', err?.message);
    res.status(500).json({ error: 'Failed to archive appointment', detail: err?.message });
  }
});


// Hard-delete appointment — nullifies non-cascade child relations first to avoid FK errors
appointmentRoutes.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const isSuperAdmin = role === 'super_admin';
    const isAdminOrManager = role === 'admin' || role === 'manager' || isSuperAdmin;

    const ownershipWhere: any = { id: req.params.id };
    if (isSuperAdmin) {
      // Super admin can delete any appointment
    } else if (isAdminOrManager && companyId) {
      ownershipWhere.companyId = companyId;
    } else {
      ownershipWhere.userId = userId;
    }

    const exists = await prisma.appointment.findFirst({ where: ownershipWhere });
    if (!exists) return res.status(404).json({ error: 'Appointment not found or you do not have permission to delete it' });
    await prisma.voiceSession.updateMany({
      where: { appointmentId: req.params.id },
      data: { appointmentId: null },
    });
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[appointments] DELETE error:', err?.message);
    res.status(500).json({ error: 'Failed to delete appointment', detail: err?.message });
  }
});


// Recalculate appointment totals
appointmentRoutes.post('/:id/recalculate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const where: any = { id: req.params.id };
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') where.userId = userId;

    const exists = await prisma.appointment.findFirst({ where });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    const updated = await recalculatePricing(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Not found during recalculation' });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Recalculation failed', details: err.message });
  }
});
