import { Router } from 'express';
import { prisma } from '../index.js';

/**
 * External appointment import endpoint.
 *
 * Lets an automation (e.g. the Leads-System sync) push appointments in without a
 * user JWT. Authenticated by a shared secret in the `x-import-key` header that
 * must match process.env.IMPORT_API_KEY.
 *
 * Mount in server/src/index.ts:
 *   import { appointmentImportRoutes } from './routes/appointmentsImport.js';
 *   app.use('/api/import', appointmentImportRoutes);
 *
 * POST /api/import/appointments
 * Headers: x-import-key: <IMPORT_API_KEY>
 * Body: {
 *   repEmail: "npearson@winworldinfo.com",            // appointments assigned to this user
 *   defaultStatus?: "scheduled",                        // optional; defaults to "scheduled"
 *   appointments: [{
 *     firstName, lastName, phone?, email?, address?, city?, state?, zip?,
 *     wwCustomerId?,            // Window World account/customer ID -> Customer.customerId
 *     appointmentDate?,         // ISO string
 *     jobAddress?, jobCity?, jobState?, jobZip?,
 *     projectType?,             // defaults to "replacement"
 *     notes?
 *   }, ...]
 * }
 */

export const appointmentImportRoutes = Router();

interface ImportAppt {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  wwCustomerId?: string;
  appointmentDate?: string;
  jobAddress?: string;
  jobCity?: string;
  jobState?: string;
  jobZip?: string;
  projectType?: string;
  notes?: string;
}

function keyOk(req: any): boolean {
  const expected = process.env.IMPORT_API_KEY;
  if (!expected) return false; // fail closed if not configured
  const got = req.headers['x-import-key'];
  return typeof got === 'string' && got.length === expected.length && got === expected;
}

function sameDayRange(iso?: string): { start: Date; end: Date } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { start, end };
}

appointmentImportRoutes.post('/appointments', async (req, res) => {
  if (!keyOk(req)) {
    return res.status(401).json({ error: 'Invalid or missing x-import-key' });
  }

  const { repEmail, appointments, defaultStatus } = req.body as {
    repEmail?: string;
    appointments?: ImportAppt[];
    defaultStatus?: string;
  };

  if (!repEmail || !Array.isArray(appointments)) {
    return res.status(400).json({ error: 'repEmail and appointments[] are required' });
  }

  // Resolve the rep -> userId + companyId (appointments are owned by this rep)
  const rep = await prisma.user.findUnique({
    where: { email: repEmail },
    select: { id: true, companyId: true },
  });
  if (!rep) {
    return res.status(400).json({ error: `Rep not found for email ${repEmail}` });
  }

  const status = defaultStatus || 'scheduled';
  const results = { created: 0, duplicates: 0, errors: [] as Array<{ index: number; error: string }> };

  for (let i = 0; i < appointments.length; i++) {
    const a = appointments[i];
    try {
      const firstName = (a.firstName ?? '').trim() || 'Unknown';
      const lastName = (a.lastName ?? '').trim() || '';
      const phone = (a.phone ?? '').trim() || null;
      const email = (a.email ?? '').trim() || null;
      const address = (a.address ?? a.jobAddress ?? '').trim() || null;

      // 1) Upsert customer within the rep's company (match by phone, then email, then address)
      let customer = null as null | { id: string };
      if (phone || email || (address && address.length >= 5)) {
        customer = await prisma.customer.findFirst({
          where: {
            ...(rep.companyId ? { companyId: rep.companyId } : {}),
            OR: [
              ...(phone ? [{ phone }] : []),
              ...(email ? [{ email }] : []),
              ...(address && address.length >= 5
                ? [{ address: { equals: address, mode: 'insensitive' as const } }]
                : []),
            ],
          },
          select: { id: true },
        });
      }
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            firstName,
            lastName,
            phone,
            email,
            address,
            city: (a.city ?? a.jobCity ?? '').trim() || null,
            state: (a.state ?? a.jobState ?? 'LA').trim() || 'LA',
            zip: (a.zip ?? a.jobZip ?? '').trim() || null,
            customerId: (a.wwCustomerId ?? '').trim() || null,
            leadSource: 'leads-system-import',
            notes: a.notes ?? null,
            ...(rep.companyId ? { companyId: rep.companyId } : {}),
          },
          select: { id: true },
        });
      }

      // 2) Idempotency — skip if this customer already has an appointment that day
      const range = sameDayRange(a.appointmentDate);
      if (range) {
        const dupe = await prisma.appointment.findFirst({
          where: {
            customerId: customer.id,
            ...(rep.companyId ? { companyId: rep.companyId } : {}),
            appointmentDate: { gte: range.start, lt: range.end },
            status: { not: 'archived' },
          },
          select: { id: true },
        });
        if (dupe) {
          results.duplicates++;
          continue;
        }
      }

      // 3) Create the appointment for the rep
      await prisma.appointment.create({
        data: {
          customerId: customer.id,
          userId: rep.id,
          status,
          appointmentDate: a.appointmentDate ? new Date(a.appointmentDate) : null,
          jobAddress: (a.jobAddress ?? a.address ?? '').trim() || null,
          jobCity: (a.jobCity ?? a.city ?? '').trim() || null,
          jobState: (a.jobState ?? a.state ?? 'LA').trim() || 'LA',
          jobZip: (a.jobZip ?? a.zip ?? '').trim() || null,
          projectType: (a.projectType ?? 'replacement').trim() || 'replacement',
          notes: a.notes ?? null,
          ...(rep.companyId ? { companyId: rep.companyId } : {}),
        },
      });
      results.created++;
    } catch (err: any) {
      results.errors.push({ index: i, error: err?.message || String(err) });
    }
  }

  res.status(200).json({ repEmail, ...results });
});
