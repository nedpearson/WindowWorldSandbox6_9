import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Self-Gen leads — self-generated leads a rep creates in the field.
 *
 * A self-gen lead is just a Customer tagged leadSource='self_gen' plus an
 * Appointment owned by the rep. This route gives a single quick-entry call and
 * a list/metric view so self-gen activity counts toward the rep's numbers
 * (mirrors the Leads-System "Self Gen" / SGSL concept).
 *
 * Mount in server/src/index.ts:
 *   import { selfGenRoutes } from './routes/selfGen.routes.js';
 *   app.use('/api/self-gen', selfGenRoutes);
 */

export const selfGenRoutes = Router();
selfGenRoutes.use(requireAuth);

const LEAD_SOURCE = 'self_gen';

// Quick-create a self-generated lead (customer + appointment) for the current rep
selfGenRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId ?? null;
    const {
      firstName, lastName, phone, email,
      address, city, state, zip,
      appointmentDate, projectType, notes,
    } = req.body;

    if (!firstName && !lastName && !phone) {
      return res.status(400).json({ error: 'At least a name or phone is required' });
    }

    // Reuse an existing customer in this company if it matches phone/email/address
    const addr = (address ?? '').trim();
    let customer = null as null | { id: string };
    if (phone || email || addr.length >= 5) {
      customer = await prisma.customer.findFirst({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
            ...(addr.length >= 5 ? [{ address: { equals: addr, mode: 'insensitive' as const } }] : []),
          ],
        },
        select: { id: true },
      });
    }
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: (firstName ?? '').trim() || 'Unknown',
          lastName: (lastName ?? '').trim() || '',
          phone: (phone ?? '').trim() || null,
          email: (email ?? '').trim() || null,
          address: addr || null,
          city: (city ?? '').trim() || null,
          state: (state ?? 'LA').trim() || 'LA',
          zip: (zip ?? '').trim() || null,
          leadSource: LEAD_SOURCE,
          notes: notes ?? null,
          ...(companyId ? { companyId } : {}),
        },
        select: { id: true },
      });
    } else {
      // Make sure an existing customer is tagged as self-gen for reporting
      await prisma.customer.update({ where: { id: customer.id }, data: { leadSource: LEAD_SOURCE } });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId,
        status: 'scheduled',
        appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
        jobAddress: addr || null,
        jobCity: (city ?? '').trim() || null,
        jobState: (state ?? 'LA').trim() || 'LA',
        jobZip: (zip ?? '').trim() || null,
        projectType: (projectType ?? 'replacement').trim() || 'replacement',
        notes: notes ?? null,
        ...(companyId ? { companyId } : {}),
      },
      include: { customer: true },
    });

    res.status(201).json(appointment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create self-gen lead', detail: err?.message });
  }
});

// List the current rep's self-gen leads (+ a simple metric) for a date range
selfGenRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { from, to } = req.query;

    const where: any = { customer: { leadSource: LEAD_SOURCE }, status: { not: 'archived' } };
    if (companyId) where.companyId = companyId;
    if (role !== 'admin' && role !== 'manager') where.userId = userId;
    if (from || to) {
      where.appointmentDate = {};
      if (from) where.appointmentDate.gte = new Date(String(from));
      if (to) where.appointmentDate.lte = new Date(String(to));
    }

    const leads = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'desc' },
      select: {
        id: true, status: true, appointmentDate: true, jobAddress: true, jobCity: true,
        totalAmount: true, projectType: true,
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    const sold = leads.filter(l => l.status === 'sold').length;
    res.json({ count: leads.length, sold, leads });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list self-gen leads', detail: err?.message });
  }
});
