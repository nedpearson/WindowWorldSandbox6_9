import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

/**
 * Field-activity report — what a rep hands in: appointments, closed, self-gen,
 * job-site visits, and be-backs over a date range. JSON for the screen, CSV for export.
 *
 * Mount in server/src/index.ts:
 *   import { reportRoutes } from './routes/reports.routes.js';
 *   app.use('/api/reports', reportRoutes);
 *
 * GET /api/reports/field-activity?from=ISO&to=ISO&format=json|csv
 *   (admins/managers see the company; reps see their own)
 */

export const reportRoutes = Router();
reportRoutes.use(requireAuth);

function csvCell(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(headers: string[], rows: any[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
}

reportRoutes.get('/field-activity', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const isMgr = role === 'admin' || role === 'manager' || role === 'super_admin';

    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const format = String(req.query.format || 'json');

    const scope: any = {};
    if (companyId) scope.companyId = companyId;
    if (!isMgr) scope.userId = userId;

    const appts = await prisma.appointment.findMany({
      where: { ...scope, status: { not: 'archived' }, appointmentDate: { gte: from, lte: to } },
      orderBy: { appointmentDate: 'asc' },
      include: { customer: { select: { firstName: true, lastName: true, phone: true, leadSource: true } } },
    });

    let visits: any[] = [];
    try {
      visits = await (prisma as any).jobSiteVisit.findMany({
        where: { ...scope, visitedAt: { gte: from, lte: to } },
        orderBy: { visitedAt: 'asc' },
      });
    } catch { /* JobSiteVisit model may not be migrated yet */ }

    const closed = appts.filter(a => a.status === 'sold');
    const selfGen = appts.filter(a => a.customer?.leadSource === 'self_gen');
    const beBacks = appts.filter(a => a.followUpDate && !['sold', 'cancelled'].includes(a.status));
    const totalSold = closed.reduce((s, a) => s + (a.totalAmount || 0), 0);

    const summary = {
      range: { from: from.toISOString(), to: to.toISOString() },
      appointments: appts.length,
      closed: closed.length,
      selfGen: selfGen.length,
      beBacks: beBacks.length,
      jobVisits: visits.length,
      totalSold,
    };

    if (format === 'csv') {
      const apptRows = appts.map(a => [
        a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : '',
        `${a.customer?.firstName ?? ''} ${a.customer?.lastName ?? ''}`.trim(),
        a.customer?.phone ?? '', a.jobAddress ?? '', a.jobCity ?? '',
        a.status, a.projectType ?? '', a.totalAmount ?? 0,
        a.customer?.leadSource === 'self_gen' ? 'self-gen' : '',
        a.followUpDate ? new Date(a.followUpDate).toLocaleDateString() : '',
      ]);
      const visitRows = visits.map(v => [
        v.visitedAt ? new Date(v.visitedAt).toLocaleString() : '',
        v.siteName ?? '', v.address ?? '', v.city ?? '', (v.learned ?? '').replace(/\n/g, ' '),
      ]);
      const csv =
        `Field Activity Report,${from.toLocaleDateString()} - ${to.toLocaleDateString()}\n` +
        `Appointments,${summary.appointments},Closed,${summary.closed},Self-Gen,${summary.selfGen},Be-Backs,${summary.beBacks},Job Visits,${summary.jobVisits},Total Sold,$${totalSold.toFixed(2)}\n\n` +
        `APPOINTMENTS\n` +
        toCsv(['Date', 'Customer', 'Phone', 'Address', 'City', 'Status', 'Project', 'Amount', 'Source', 'Follow-Up'], apptRows) +
        `\n\nJOB VISITS\n` +
        toCsv(['When', 'Site', 'Address', 'City', 'What I Learned'], visitRows) + '\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="field-activity-${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    }

    res.json({
      summary,
      appointments: appts,
      jobVisits: visits,
      closed, selfGen, beBacks,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to build report', detail: err?.message });
  }
});
