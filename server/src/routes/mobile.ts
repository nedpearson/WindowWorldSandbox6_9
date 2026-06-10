import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const mobileRoutes = Router();
mobileRoutes.use(requireAuth);

// ── Dashboard ───────────────────────────────────────────────

// Get optimized mobile dashboard payload
mobileRoutes.get('/field-dashboard', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = req.user?.companyId;
    const isManager = ['admin', 'manager', 'super_admin'].includes(req.user?.role ?? '');

    const baseWhere = isManager && companyId 
      ? { companyId, status: { not: 'archived' } }
      : { userId, status: { not: 'archived' } };

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const selectFields = {
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
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true, address: true, city: true }
      },
      _count: { select: { openings: true } },
      updatedAt: true
    };

    const [today, inProgress, recent] = await Promise.all([
      prisma.appointment.findMany({
        where: { ...baseWhere, appointmentDate: { gte: todayDate, lt: tomorrowDate } },
        select: selectFields,
        orderBy: { appointmentDate: 'asc' }
      }),
      prisma.appointment.findMany({
        where: { ...baseWhere, status: { in: ['draft', 'in_progress', 'needs_remeasure'] } },
        select: selectFields,
        orderBy: { updatedAt: 'desc' },
        take: 50
      }),
      prisma.appointment.findMany({
        where: baseWhere,
        select: selectFields,
        orderBy: { updatedAt: 'desc' },
        take: 15
      })
    ]);

    // Merge and deduplicate
    const merged = [...today, ...inProgress, ...recent];
    const uniqueMap = new Map();
    merged.forEach(a => uniqueMap.set(a.id, a));
    
    res.json(Array.from(uniqueMap.values()));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load dashboard', details: err.message });
  }
});

// ── Recordings ──────────────────────────────────────────────
// Create recording metadata — userId from JWT
mobileRoutes.post('/recordings', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { appointmentId, openingId } = req.body;
    const rec = await prisma.mobileRecording.create({
      data: { userId, appointmentId: appointmentId ?? null, openingId: openingId ?? null },
    });
    res.status(201).json(rec);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create recording', details: err.message });
  }
});

// Get recordings for appointment — verify appointment belongs to caller's company
mobileRoutes.get('/recordings/appointment/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const appointmentId = String(req.params.appointmentId);
    // Verify the caller has access to this appointment
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { userId: true, companyId: true }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    // Allow if same user OR same company (managers/admins) — use auth data from JWT middleware
    const companyId = req.user?.companyId;
    const isManager = ['admin', 'manager', 'super_admin'].includes(req.user?.role ?? '');
    const sameCompany = companyId && appt.companyId === companyId;
    if (!isManager && !sameCompany && appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const recs = await prisma.mobileRecording.findMany({
      where: { appointmentId },
      include: { transcripts: true, extractions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Update recording status — verify ownership before updating
mobileRoutes.put('/recordings/:id', async (req: AuthRequest, res) => {
  try {
    const callerId = req.user!.userId;
    const recordingId = String(req.params.id);
    const isManager = ['admin', 'manager', 'super_admin'].includes(req.user?.role ?? '');

    // Fetch recording to verify ownership
    const existing = await prisma.mobileRecording.findUnique({ where: { id: recordingId }, select: { userId: true } });
    if (!existing) return res.status(404).json({ error: 'Recording not found' });
    if (!isManager && existing.userId !== callerId) return res.status(403).json({ error: 'Access denied' });

    const { status, fileUrl, durationSecs } = req.body;
    const updated = await prisma.mobileRecording.update({
      where: { id: recordingId },
      data: {
        ...(status != null && { status }),
        ...(fileUrl != null && { fileUrl }),
        ...(durationSecs != null && { durationSecs }),
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Save transcript for a recording
mobileRoutes.post('/recordings/:id/transcripts', async (req, res) => {
  try {
    const { rawText, confidence = 0.85 } = req.body;
    const t = await prisma.mobileRecordingTranscript.create({
      data: { recordingId: req.params.id, text: rawText, confidence },
    });
    await prisma.mobileRecording.update({
      where: { id: req.params.id },
      data: { status: 'transcribing' },
    });
    res.status(201).json(t);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Text Notes ──────────────────────────────────────────

// Create text note — userId from JWT, not body
// NOTE: MobileTextNote table is not yet migrated. Drafts go to MobileOfflineDraft instead.
mobileRoutes.post('/notes', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { appointmentId, draftType = 'text_note', noteText } = req.body;
    // Store as a draft since MobileTextNote table is not yet migrated
    const existing: any[] = await (prisma as any).$queryRaw`
      SELECT id FROM "MobileOfflineDraft"
      WHERE "userId"=${userId} AND "appointmentId"=${appointmentId ?? null} AND "draftType"=${'text_note'}
      LIMIT 1
    `;
    if (existing.length > 0) {
      await (prisma as any).$queryRaw`
        UPDATE "MobileOfflineDraft"
        SET "draftData"=${JSON.stringify({ noteText })}::jsonb, "version"="version"+1, "updatedAt"=NOW()
        WHERE id=${existing[0].id}
      `;
      res.json({ id: existing[0].id, noteText, updated: true });
    } else {
      const draft = await (prisma as any).$queryRaw`
        INSERT INTO "MobileOfflineDraft" ("id","userId","appointmentId","draftType","draftData","version","isConflicted","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${'text_note'}, ${JSON.stringify({ noteText })}::jsonb, 1, false, NOW(), NOW())
        RETURNING *
      `;
      res.status(201).json(Array.isArray(draft) ? draft[0] : draft);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get notes for appointment
// NOTE: MobileTextNote table is not yet migrated. Returns drafts of type 'text_note'.
mobileRoutes.get('/notes/appointment/:appointmentId', async (req, res) => {
  try {
    const notes = await (prisma as any).$queryRaw`
      SELECT id, "draftData"->>'noteText' as "noteText", "createdAt", "updatedAt"
      FROM "MobileOfflineDraft"
      WHERE "appointmentId" = ${req.params.appointmentId} AND "draftType" = ${'text_note'}
      ORDER BY "createdAt" DESC
    `;
    res.json(notes);
  } catch (err: any) {
    // Gracefully return empty if table doesn't exist yet
    if (err.message?.includes('does not exist') || err.code === '42P01') {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Sync Queue ──────────────────────────────────────────

// Enqueue item — userId from JWT, not body
mobileRoutes.post('/sync-queue', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { appointmentId, entityType, entityId, operation, payload } = req.body;
    const item = await (prisma as any).$queryRaw`
      INSERT INTO "MobileSyncQueue" ("id","userId","appointmentId","entityType","entityId","operation","payload","status","createdAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${entityType}, ${entityId}, ${operation}, ${JSON.stringify(payload)}::jsonb, 'pending', NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(item) ? item[0] : item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get pending queue — only returns authenticated user's own queue items
mobileRoutes.get('/sync-queue/pending', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const items = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileSyncQueue"
      WHERE "userId" = ${userId} AND status = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT 50
    `;
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Flush/sync a batch — userId from JWT only
mobileRoutes.post('/sync-queue/flush', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const items: any[] = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileSyncQueue"
      WHERE "userId" = ${userId} AND status = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT 20
    `;

    const results = { synced: 0, failed: 0, conflicts: 0 };
    for (const item of items) {
      try {
        if (item.entityType === 'opening' && item.operation === 'update') {
          await prisma.opening.update({ where: { id: item.entityId }, data: item.payload });
        } else if (item.entityType === 'appointment' && item.operation === 'update') {
          await prisma.appointment.update({ where: { id: item.entityId }, data: item.payload });
        }
        await (prisma as any).$queryRaw`
          UPDATE "MobileSyncQueue" SET status='synced', "syncedAt"=NOW() WHERE id=${item.id}
        `;
        results.synced++;
      } catch {
        await (prisma as any).$queryRaw`
          UPDATE "MobileSyncQueue" SET status='failed', "retryCount"="retryCount"+1 WHERE id=${item.id}
        `;
        results.failed++;
      }
    }
    res.json({ ...results, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Flush failed', details: err.message });
  }
});

// ── Offline Drafts ──────────────────────────────────────

// Create/update draft — userId from JWT, not body
mobileRoutes.post('/drafts', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { appointmentId, draftType, draftData } = req.body;
    const existing: any[] = await (prisma as any).$queryRaw`
      SELECT id FROM "MobileOfflineDraft"
      WHERE "userId"=${userId} AND "appointmentId"=${appointmentId ?? null} AND "draftType"=${draftType}
      LIMIT 1
    `;
    if (existing.length > 0) {
      await (prisma as any).$queryRaw`
        UPDATE "MobileOfflineDraft"
        SET "draftData"=${JSON.stringify(draftData)}::jsonb, "version"="version"+1, "updatedAt"=NOW()
        WHERE id=${existing[0].id}
      `;
      res.json({ id: existing[0].id, updated: true });
    } else {
      const draft = await (prisma as any).$queryRaw`
        INSERT INTO "MobileOfflineDraft" ("id","userId","appointmentId","draftType","draftData","syncStatus","version","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${draftType}, ${JSON.stringify(draftData)}::jsonb, 'pending', 1, NOW(), NOW())
        RETURNING *
      `;
      res.status(201).json(Array.isArray(draft) ? draft[0] : draft);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get drafts — scoped to authenticated user + appointment
mobileRoutes.get('/drafts/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const drafts = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileOfflineDraft"
      WHERE "userId"=${userId} AND "appointmentId"=${req.params.appointmentId}
      ORDER BY "updatedAt" DESC
    `;
    res.json(drafts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Field Extractions Review ─────────────────────────────

// Get all pending extractions for appointment
mobileRoutes.get('/extractions/appointment/:appointmentId', async (req, res) => {
  try {
    const exts = await (prisma as any).$queryRaw`
      SELECT e.*, r."audioUrl", r.status as "recordingStatus"
      FROM "MobileRecordingFieldExtraction" e
      JOIN "MobileRecording" r ON r.id = e."recordingId"
      WHERE e."appointmentId" = ${req.params.appointmentId}
      ORDER BY e."confidenceScore" DESC, e."createdAt" DESC
    `;
    const textExts = await (prisma as any).$queryRaw`
      SELECT e.*, n."noteText" as "sourceText"
      FROM "MobileTextNoteExtraction" e
      JOIN "MobileTextNote" n ON n.id = e."noteId"
      WHERE n."appointmentId" = ${req.params.appointmentId}
      ORDER BY e."confidenceScore" DESC
    `;
    res.json({ recordingExtractions: exts, noteExtractions: textExts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Approve/reject extraction — appliedBy from JWT
mobileRoutes.put('/extractions/:id', async (req: AuthRequest, res) => {
  try {
    const { status, normalizedValue } = req.body;
    const appliedBy = req.user!.userId; // always from JWT
    await prisma.mobileRecordingFieldExtraction.update({
      where: { id: String(req.params.id) },
      data: {
        status: String(status),
        ...(normalizedValue != null && { normalizedValue: String(normalizedValue) }),
        appliedBy,
        approvedAt: new Date(),
      },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Apply all approved extractions to actual fields
mobileRoutes.post('/extractions/apply/:appointmentId', async (req, res) => {
  try {
    const apptId = req.params.appointmentId;
    const approved = await prisma.mobileRecordingFieldExtraction.findMany({
      where: { appointmentId: apptId, status: 'approved' },
    });

    const openingUpdates: Record<number, Record<string, any>> = {};
    const apptUpdates: Record<string, any> = {};
    let appliedCount = 0;

    for (const ext of approved) {
      if (ext.targetTable === 'Opening' && ext.openingNumber) {
        if (!openingUpdates[ext.openingNumber]) openingUpdates[ext.openingNumber] = {};
        const val = isNaN(Number(ext.normalizedValue)) ? ext.normalizedValue : Number(ext.normalizedValue);
        openingUpdates[ext.openingNumber][ext.targetField] = val;
      } else if (ext.targetTable === 'Appointment') {
        apptUpdates[ext.targetField] = ext.normalizedValue;
      }
    }

    const numbers = Object.keys(openingUpdates).map(Number);
    const existingOpenings = await prisma.opening.findMany({
      where: { appointmentId: apptId, openingNumber: { in: numbers } }
    });

    const updatePromises = [];
    for (const existing of existingOpenings) {
      if (openingUpdates[existing.openingNumber]) {
        updatePromises.push(
          prisma.opening.update({
            where: { id: existing.id },
            data: openingUpdates[existing.openingNumber]
          })
        );
        appliedCount++;
      }
    }
    if (updatePromises.length > 0) await Promise.all(updatePromises);

    if (Object.keys(apptUpdates).length > 0) {
      await prisma.appointment.update({ where: { id: apptId }, data: apptUpdates });
      appliedCount++;
    }

    await prisma.mobileRecordingFieldExtraction.updateMany({
      where: { appointmentId: apptId, status: 'approved' },
      data: { status: 'applied' },
    });

    res.json({ success: true, appliedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Apply failed', details: err.message });
  }
});

// AI Quality Score — verify appointment ownership before computing
mobileRoutes.post('/quality-score/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const apptId = String(req.params.appointmentId);
    const companyId = req.user?.companyId;
    const isManager = ['admin', 'manager', 'super_admin'].includes(req.user?.role ?? '');
    const apptCheck = await prisma.appointment.findFirst({
      where: { id: apptId, ...(!isManager ? { userId } : companyId ? { companyId } : {}) },
      select: { id: true },
    });
    if (!apptCheck) return res.status(404).json({ error: 'Appointment not found or access denied' });

    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { 
        openings: { include: { _count: { select: { photos: true } } } }, 
        _count: { select: { signatures: true } }
      }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const openings = appt.openings;
    const count = Math.max(openings.length, 1);

    let installerClarity = 0;
    let measConfidence = 0;
    let pricedCount = 0;

    for (const op of openings) {
      let ics = 0;
      if (op.roomLocation) ics += 20;
      if (op.elevation) ics += 20;
      if (op.width && op.height) ics += 20;
      if (op.installNotes && op.installNotes.length > 10) ics += 20;
      if (op._count?.photos > 0) ics += 20;
      installerClarity += ics;

      let mc = 0;
      if (op.width && op.width > 0) mc += 30;
      if (op.height && op.height > 0) mc += 30;
      if (!op.needsVerification) mc += 20;
      if (op.unitedInches && op.unitedInches > 0) mc += 20;
      measConfidence += mc;

      if ((op.totalPrice || 0) > 0) pricedCount++;
    }

    const installerClarityScore = Math.round(installerClarity / count);
    const measurementConfidenceScore = Math.round(measConfidence / count);
    const pricingConfidenceScore = Math.round((pricedCount / count) * 100);
    const contractAccuracyScore = Math.round(
      (((appt.depositAmount > 0 ? 1 : 0) + (appt.taxAmount > 0 ? 1 : 0) +
        (appt.totalAmount > 0 ? 1 : 0) + (appt._count?.signatures > 0 ? 1 : 0)) / 4) * 100
    );
    const sketchCompletenessScore = 0;

    const overallScore = Math.round((installerClarityScore + measurementConfidenceScore + pricingConfidenceScore + contractAccuracyScore + sketchCompletenessScore) / 5);

    const criticalIssues = openings.filter(o => !o.width || !o.height || !o.productCategory).length;
    const riskLevel = overallScore < 50 || criticalIssues > 0 ? 'HIGH_RISK' : overallScore < 75 ? 'REVIEW' : 'PASS';

    // Use Prisma — AppointmentQualityScore now has all required columns
    await prisma.appointmentQualityScore.create({
      data: {
        appointmentId: apptId,
        overallScore,
        installerClarityScore,
        measurementConfidenceScore,
        pricingConfidenceScore,
        contractAccuracyScore,
        sketchCompletenessScore,
        riskLevel,
        criticalIssueCount: criticalIssues,
        warningCount: 0,
      } as any,
    });

    res.json({ overallScore, installerClarityScore, measurementConfidenceScore, pricingConfidenceScore, contractAccuracyScore, sketchCompletenessScore, riskLevel, criticalIssues });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Final Packet Check — verify appointment ownership before returning sensitive data
mobileRoutes.post('/final-check/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const apptId = String(req.params.appointmentId);
    const companyId = req.user?.companyId;
    const isManager = ['admin', 'manager', 'super_admin'].includes(req.user?.role ?? '');
    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { customer: true, openings: true, signatures: true }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    const sameCompany = companyId && appt.companyId === companyId;
    if (!isManager && !sameCompany && appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const checks: { type: string; passed: boolean; level: string; msg: string }[] = [];
    const add = (type: string, passed: boolean, level: string, msg: string) =>
      checks.push({ type, passed, level, msg });

    add('customer_name', !!(appt.customer.firstName && appt.customer.lastName), 'critical', 'Customer name required');
    add('customer_phone', !!appt.customer.phone, 'critical', 'Customer phone required');
    add('job_address', !!appt.jobAddress, 'critical', 'Job address required');
    add('has_openings', appt.openings.length > 0, 'critical', 'At least one opening required');
    add('pricing_complete', appt.totalAmount > 0, 'critical', 'Total amount must be calculated');
    add('deposit_recorded', appt.depositAmount > 0, 'warning', 'Deposit should be recorded');
    add('signature', appt.signatures.length > 0, 'warning', 'Customer signature recommended');

    const missingMeasurements = appt.openings.filter(o => !o.width || !o.height).length;
    add('measurements', missingMeasurements === 0, 'critical', `${missingMeasurements} opening(s) missing measurements`);

    const missingProduct = appt.openings.filter(o => !o.productCategory).length;
    add('products', missingProduct === 0, 'critical', `${missingProduct} opening(s) missing product type`);

    const criticalFailed = checks.filter(c => !c.passed && c.level === 'critical').length;
    const canExport = criticalFailed === 0;

    res.json({ checks, canExport, criticalFailed, totalChecks: checks.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Check failed', details: err.message });
  }
});
