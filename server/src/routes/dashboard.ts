import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointments,
      todayAppointments,
      draftCount,
      quotedCount,
      soldCount,
      needsRemeasure,
      totalCustomers,
      totalRevenue,
      followUpsDue
    ] = await Promise.all([
      prisma.appointment.count({ where: { userId } }),
      prisma.appointment.count({
        where: { userId, appointmentDate: { gte: today, lt: tomorrow } }
      }),
      prisma.appointment.count({ where: { userId, status: 'draft' } }),
      prisma.appointment.count({ where: { userId, status: 'quoted' } }),
      prisma.appointment.count({ where: { userId, status: 'sold' } }),
      prisma.appointment.count({ where: { userId, status: 'needs_remeasure' } }),
      // For customers, ideally we filter by those who have an appointment with this user
      prisma.customer.count({
        where: { appointments: { some: { userId } } }
      }),
      prisma.appointment.aggregate({
        _sum: { totalAmount: true },
        where: { userId, status: 'sold' }
      }),
      // Follow-ups due today or overdue (not yet sold/cancelled)
      prisma.appointment.count({
        where: {
          userId,
          followUpDate: { lte: tomorrow },
          status: { notIn: ['sold', 'cancelled'] }
        }
      })
    ]);

    res.json({
      totalAppointments,
      todayAppointments,
      draftCount,
      quotedCount,
      soldCount,
      needsRemeasure,
      totalCustomers,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      followUpsDue
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Recent activity — today's appointments first, then by last updated
dashboardRoutes.get('/recent', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's appointments separately so they always appear first
    const [todayAppts, recentAppts] = await Promise.all([
      prisma.appointment.findMany({
        where: { userId, appointmentDate: { gte: today, lt: tomorrow } },
        orderBy: { appointmentDate: 'asc' },
        include: {
          customer: true,
          _count: { select: { openings: true } }
        }
      }),
      prisma.appointment.findMany({
        where: { userId, NOT: { appointmentDate: { gte: today, lt: tomorrow } } },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: true,
          _count: { select: { openings: true } }
        }
      })
    ]);

    // Today first, then recent — deduplicate by id
    const seen = new Set<string>();
    const merged = [...todayAppts, ...recentAppts].filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    }).slice(0, 15);

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// ═══════════════════════════════════════════════════════════
// Manager Dashboard — Real data from DB
// Accessible by admin and manager roles
// ═══════════════════════════════════════════════════════════
dashboardRoutes.get('/manager', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  if (!userId || !['admin', 'manager', 'super_admin'].includes(role || '')) {
    return res.status(403).json({ error: 'Admin or manager role required.' });
  }

  try {
    // ── Resolve companyId from DB — JWT does NOT contain companyId ──
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    const companyId = userRecord?.companyId;
    const companyFilter = companyId ? { companyId } : {};

    const reps = await prisma.user.findMany({
      where: { role: 'sales_rep', ...companyFilter },
      select: {
        id: true,
        name: true,
        email: true,
        performance: true,
      },
    });

    // ── Fetch open (unresolved) auditor issues ──
    const issues = await prisma.auditorIssue.findMany({
      where: { resolved: false, appointment: companyFilter.companyId ? { companyId: companyFilter.companyId } : undefined },
      include: {
        user: { select: { id: true, name: true } },
        appointment: { include: { customer: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // ── Company-wide aggregates ──
    const [
      totalSoldRevenue,
      totalAppointments,
      soldCount,
      quotedCount,
      needsRemeasureCount,
      blockedIssueCount,
      totalIssueCount,
    ] = await Promise.all([
      prisma.appointment.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'sold', ...companyFilter },
      }),
      prisma.appointment.count({ where: companyFilter }),
      prisma.appointment.count({ where: { status: 'sold', ...companyFilter } }),
      prisma.appointment.count({ where: { status: 'quoted', ...companyFilter } }),
      prisma.appointment.count({ where: { status: 'needs_remeasure', ...companyFilter } }),
      prisma.auditorIssue.count({ where: { resolved: false, blocksProduction: true, appointment: companyFilter.companyId ? { companyId: companyFilter.companyId } : undefined } }),
      prisma.auditorIssue.count({ where: { resolved: false, appointment: companyFilter.companyId ? { companyId: companyFilter.companyId } : undefined } }),
    ]);

    // ── Per-rep appointment stats ──
    const repAppointmentStats = await prisma.appointment.groupBy({
      by: ['userId'],
      _sum: { totalAmount: true },
      _count: { id: true },
      where: { status: 'sold', ...companyFilter },
    });

    const repStatsMap = new Map(
      repAppointmentStats.map(s => [s.userId, { revenueSold: s._sum.totalAmount || 0, soldCount: s._count.id }])
    );

    // ── Per-rep issue counts ──
    // Note: auditorIssue lacks companyId directly, but we can filter by the users found in companyFilter
    const validRepIds = reps.map(r => r.id);
    const repIssueStats = await prisma.auditorIssue.groupBy({
      by: ['userId', 'severity'],
      _count: { id: true },
      where: { resolved: false, userId: { in: validRepIds } },
    });

    const repIssueMap = new Map<string, { openIssues: number; criticalIssues: number; businessRiskIssues: number }>();
    for (const stat of repIssueStats) {
      const existing = repIssueMap.get(stat.userId) || { openIssues: 0, criticalIssues: 0, businessRiskIssues: 0 };
      existing.openIssues += stat._count.id;
      if (stat.severity === 'Critical') existing.criticalIssues += stat._count.id;
      if (stat.severity === 'Business Risk') existing.businessRiskIssues += stat._count.id;
      repIssueMap.set(stat.userId, existing);
    }

    // ── Issue category counts for company-wide view ──
    const issueCategoryCounts = await prisma.auditorIssue.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { resolved: false, userId: { in: validRepIds } },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    // ── Jobs needing review (quoted but not sold, older than 2 days) ──
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const jobsNeedingReview = await prisma.appointment.count({
      where: {
        status: 'quoted',
        updatedAt: { lt: twoDaysAgo },
        ...companyFilter
      },
    });

    // ── Compute at-risk revenue (appointments with blocking issues that are quoted/in_progress) ──
    const atRiskAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['quoted', 'in_progress'] },
        auditorIssues: { some: { resolved: false, severity: { in: ['Critical', 'Business Risk'] } } },
        ...companyFilter
      },
      select: { totalAmount: true },
    });
    const revenueAtRisk = atRiskAppointments.reduce((s, a) => s + (a.totalAmount || 0), 0);

    // ── Build rep metrics ──
    const repMetrics = reps.map(rep => {
      const stats = repStatsMap.get(rep.id) || { revenueSold: 0, soldCount: 0 };
      const issueStat = repIssueMap.get(rep.id) || { openIssues: 0, criticalIssues: 0, businessRiskIssues: 0 };
      const perf = rep.performance;

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        performanceScore: perf?.performanceScore ?? 0,
        trainingScore: perf?.trainingScore ?? 0,
        manualCompletion: perf?.manualCompletionPct ?? 0,
        trainingScenariosPassed: perf?.scenariosPassed ?? 0,
        trainingScenariosFailed: perf?.scenariosFailed ?? 0,
        measurementErrorRate: perf?.measurementErrorRate ?? 0,
        contractErrorRate: perf?.contractErrorRate ?? 0,
        followUpCompliance: perf?.followUpComplianceRate ?? 0,
        quoteToCloseRate: perf?.quoteToCloseRate ?? 0,
        avgTimeToResolveHours: perf?.avgTimeToResolveHours ?? 0,
        revenueSold: stats.revenueSold,
        openIssues: issueStat.openIssues,
        criticalIssues: issueStat.criticalIssues,
        businessRiskIssues: issueStat.businessRiskIssues,
      };
    });

    // ── Format issues for frontend ──
    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      jobId: issue.appointmentId,
      customerName: issue.appointment
        ? `${issue.appointment.customer.firstName} ${issue.appointment.customer.lastName}`
        : 'Unknown',
      repId: issue.userId,
      repName: issue.user?.name || 'Unknown',
      severity: issue.severity,
      category: issue.category,
      auditor: issue.auditorSource,
      description: issue.description,
      correctiveAction: issue.correctiveAction,
      createdAt: issue.createdAt.toISOString(),
      blocksProduction: issue.blocksProduction,
    }));

    // ── Quote-to-close rate (company-wide) ──
    const closeRate = totalAppointments > 0
      ? Math.round((soldCount / Math.max(soldCount + quotedCount, 1)) * 1000) / 10
      : 0;

    res.json({
      companyWide: {
        revenueSold: totalSoldRevenue._sum.totalAmount || 0,
        revenueAtRisk,
        jobsNeedingReview,
        jobsBlocked: blockedIssueCount,
        revenueLeakageAlerts: issueCategoryCounts.find(c => c.category === 'Pricing')?._count.id || 0,
        avgQuoteToClose: closeRate,
        commonIssueCategories: issueCategoryCounts.map(c => ({
          category: c.category,
          count: c._count.id,
        })),
      },
      reps: repMetrics,
      recentIssues: formattedIssues,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch manager dashboard stats' });
  }
});
