import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { generateContractPDFBuffer, generateOrderFormPDFBuffer } from '../services/pdfService.js';
import { uploadFile, getSignedUrl, BUCKETS, isStorageConfigured, uploadBuffer } from '../services/storageService.js';
import { generateSketchImage } from '../services/sketchRenderer.js';
import { generateAndStoreSketchExport } from '../services/sketchExport.service.js'; // used in sketch/export endpoint
import { generateOrderForm } from '../services/orderFormGeneration.service.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

export const documentRoutes = Router();
documentRoutes.use(requireAuth);

/** Resolve companyId from req.user (set by auth middleware) — no DB round trip needed */
function getCompanyId(req: any): string | null {
  return (req as any).user?.companyId ?? null;
}

/** Verify user has access to the appointment */
async function assertAppointmentAccess(
  appointmentId: string,
  userId: string,
  role: string,
  companyId: string | null,
  res: any
): Promise<boolean> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { userId: true, companyId: true },
  });
  if (!appt) {
    res.status(404).json({ error: 'Appointment not found' });
    return false;
  }
  if (role === 'admin' || role === 'manager') {
    if (companyId && appt.companyId && appt.companyId !== companyId) {
      res.status(403).json({ error: 'Access denied' });
      return false;
    }
    return true;
  }
  if (appt.userId === userId) return true;
  if (companyId && appt.companyId && appt.companyId === companyId) return true;
  res.status(403).json({ error: 'Access denied' });
  return false;
}

// ── 0. Reference Documents ──
const DOCUMENTS: Record<string, { fileName: string; contentType: string }> = {
  'window_warranty': { fileName: 'AM-WWi-239_Window Warranty Rev 08.24 (1).pdf', contentType: 'application/pdf' },
  'lifetime_warranty': { fileName: 'WW All Inclusive Lifetime Warranty.pdf', contentType: 'application/pdf' },
  'lead_paint_disclosure': { fileName: 'Lead Base Paint Disclosure.pdf', contentType: 'application/pdf' },
  'finance_options': { fileName: 'Finance Options.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

documentRoutes.get('/view/:key', (req, res) => {
  const doc = DOCUMENTS[req.params.key];
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const projectRoot = path.resolve(__dirname2, '../../..');
  const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document file not found on server' });
  }

  res.setHeader('Content-Type', doc.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

documentRoutes.get('/download/:key', (req, res) => {
  const doc = DOCUMENTS[req.params.key];
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const projectRoot = path.resolve(__dirname2, '../../..');
  const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document file not found on server' });
  }

  res.setHeader('Content-Type', doc.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

documentRoutes.get('/list', (_req, res) => {
  const projectRoot = path.resolve(__dirname2, '../../..');
  const docs = Object.entries(DOCUMENTS).map(([key, doc]) => {
    const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    return { key, fileName: doc.fileName, contentType: doc.contentType, available: exists, fileSize: size };
  });
  res.json(docs);
});


// ── 1. List Generated Documents for Appointment ──
documentRoutes.get('/appointment/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = getCompanyId(req);
    const ok = await assertAppointmentAccess(req.params.id, userId, role, companyId, res);
    if (!ok) return;

    const instances = await prisma.formInstance.findMany({
      where: { appointmentId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    
    const documents = instances.map(f => ({
      id: f.id,
      type: f.formType,
      status: f.status,
      title: f.formType === 'order_form' ? 'Order Form' : f.formType === 'contract' ? 'Customer Contract' : 'Proposal',
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      viewUrl: f.pdfUrl ? `/api/documents/${f.id}/view-url` : null,
      canDownload: !!f.pdfUrl,
      canShare: !!f.pdfUrl,
    }));
    
    res.json(documents);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
  }
});

// ── 2. Generate Document ──
documentRoutes.post('/:type/:appointmentId/generate', async (req, res) => {
  try {
    const { type, appointmentId } = req.params;
    const { sourceType, sourceId } = req.body || {};
    
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(401).json({ error: 'Unauthorized: missing companyId in session' });
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Fetch appointment data
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, companyId },   // company scope enforced here
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        quoteGroups: { include: { openings: true } },
        combinedQuotes: { include: { quoteGroups: { include: { quoteGroup: { include: { openings: true } } } } } }
      }
    });
    
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // ── Apply Source Filtering ──
    if (sourceType === 'quote_group' && sourceId) {
      const group = appointment.quoteGroups.find((g: any) => g.id === sourceId);
      if (group) {
        const validOpeningIds = new Set(group.openings.map((q: any) => q.openingId));
        appointment.openings = appointment.openings.filter((o: any) => validOpeningIds.has(o.id));
        appointment.subtotal = group.subtotal;
        appointment.totalAmount = group.total;
        appointment.balanceDue = group.total - (appointment.depositAmount || 0);
        appointment.discount = group.discount;
      }
    } else if (sourceType === 'combined_quote' && sourceId) {
      const combined = appointment.combinedQuotes.find((c: any) => c.id === sourceId);
      if (combined) {
        const validOpeningIds = new Set<string>();
        for (const cqg of combined.quoteGroups) {
          if (cqg.quoteGroup && cqg.quoteGroup.openings) {
            for (const qgo of cqg.quoteGroup.openings) {
              validOpeningIds.add(qgo.openingId);
            }
          }
        }
        appointment.openings = appointment.openings.filter((o: any) => validOpeningIds.has(o.id));
        appointment.subtotal = combined.subtotal;
        appointment.totalAmount = combined.total;
        appointment.balanceDue = combined.total - (appointment.depositAmount || 0);
        appointment.discount = combined.discount;
      }
    }

    // ── Pre-generation validation: return structured issues ──
    const issues: { label: string; detail: string; field?: string; category?: string; openingNumber?: number; fix?: string }[] = [];

    if (!appointment.customer) {
      issues.push({ label: 'No customer linked', detail: 'Appointment has no associated customer record.', category: 'contract', fix: 'Link a customer to this appointment before generating documents.' });
    } else {
      if (!appointment.customer.firstName && !appointment.customer.lastName) {
        issues.push({ label: 'Missing customer name', detail: 'Customer first and last name are both empty.', field: 'customer.name', category: 'contract', fix: 'Enter the customer name in the Customer Info tab.' });
      }
    }

    if (!appointment.openings || appointment.openings.length === 0) {
      issues.push({ label: 'No openings', detail: 'At least one opening is required to generate a document.', category: 'openings', fix: 'Add openings in the Measure tab.' });
    } else {
      // NaN rejection: validate numeric fields on each opening
      for (const op of appointment.openings) {
        if (op.width != null && (isNaN(Number(op.width)) || Number(op.width) <= 0)) {
          issues.push({ label: `Opening #${op.openingNumber}: invalid width`, detail: `Width is ${op.width} — must be a positive number.`, openingNumber: op.openingNumber ?? undefined, category: 'measurements', fix: 'Re-enter the width for this opening.' });
        }
        if (op.height != null && (isNaN(Number(op.height)) || Number(op.height) <= 0)) {
          issues.push({ label: `Opening #${op.openingNumber}: invalid height`, detail: `Height is ${op.height} — must be a positive number.`, openingNumber: op.openingNumber ?? undefined, category: 'measurements', fix: 'Re-enter the height for this opening.' });
        }
      }

      // Check for numbering gaps: highest number should equal count
      const openingNums = appointment.openings.map((o: any) => o.openingNumber as number).sort((a: number, b: number) => a - b);
      const maxNum = openingNums[openingNums.length - 1];
      if (maxNum > openingNums.length) {
        const missing = [];
        for (let i = 1; i <= maxNum; i++) {
          if (!openingNums.includes(i)) missing.push(i);
        }
        issues.push({
          label: 'Opening numbering has gaps',
          detail: `${openingNums.length} openings numbered up to #${maxNum}. Missing: #${missing.join(', #')}. Sketch renumber needed.`,
          category: 'numbering',
          fix: 'Open the Sketch Canvas and delete/re-add the affected openings, or use Repair Sketch Numbering.',
        });
      }

      // Check for duplicate opening numbers
      const numCounts: Record<number, number> = {};
      for (const n of openingNums) {
        numCounts[n] = (numCounts[n] || 0) + 1;
      }
      for (const [num, count] of Object.entries(numCounts)) {
        if (count > 1) {
          issues.push({
            label: `Duplicate opening #${num}`,
            detail: `Opening number ${num} appears ${count} times. Each opening must have a unique number.`,
            category: 'numbering',
            fix: 'Fix duplicate opening numbers in the Sketch Canvas.',
          });
        }
      }
    }

    if (issues.length > 0) {
      return res.status(400).json({
        error: 'Document generation blocked by validation issues',
        code: 'VALIDATION_FAILED',
        issues,
      });
    }

    // Sketch-to-document validation
    const { validateSketchForExport, normalizeSketchForDocumentExport } = await import('../services/printSafeSketchRenderer.js');
    const sketchValResult = await validateSketchForExport(appointmentId, companyId);
    if (!sketchValResult.success) {
      return res.status(400).json({
        success: false,
        code: sketchValResult.code || 'SKETCH_EXPORT_RENDER_FAILED',
        issues: sketchValResult.issues
      });
    }

    // Load sketch and normalize openings/markers for document export
    const sketch = await prisma.formSketch.findFirst({
      where: { appointmentId },
      include: {
        markers: {
          include: {
            links: {
              include: {
                opening: true
              }
            }
          }
        }
      }
    });
    
    const { activeMarkers, openings: normalizedOpenings } = normalizeSketchForDocumentExport(appointment, sketch, appointment.openings);
    appointment.openings = normalizedOpenings;

    // Try to use the client-uploaded sketch first (which includes freehand drawings and perfectly laid out markers).
    // The frontend now uploads a high-quality, print-readable, inverted-color PNG composite.
    let sketchBuffer: Buffer | undefined;
    try {
      const { getLatestClientSketchBuffer } = await import('../services/sketchExport.service.js');
      const clientBuffer = await getLatestClientSketchBuffer(appointmentId, companyId);
      
      if (clientBuffer) {
        sketchBuffer = clientBuffer;
        console.log(`[documents] Using high-quality client-uploaded sketch for ${appointmentId}, size=${clientBuffer.length}`);
      } else {
        // Fallback: Generate server-side print-readable-final renderer
        const pngBuffer = await generateSketchImage(appointmentId, 'all', activeMarkers);
        if (pngBuffer) sketchBuffer = pngBuffer;
        console.log(`[documents] Generated fallback server-side sketch for ${appointmentId}, markers=${activeMarkers.length}, size=${pngBuffer?.length ?? 0}`);
      }
    } catch (sketchErr) {
      console.warn('[documents] Sketch retrieval/render failed:', sketchErr);
    }
    
    // Generate PDF Buffer using in-memory sketch (no temp file needed for pdfService)
    let pdfBuffer: Buffer;
    let sketchTempPath: string | undefined;
    if (sketchBuffer) {
      // pdfService needs a file path — write to os.tmpdir() only (not project disk)
      const os = await import('os');
      const pathMod = await import('path');
      const fsMod = await import('fs');
      sketchTempPath = pathMod.join(os.tmpdir(), `sketch-${appointmentId}-${Date.now()}.png`);
      fsMod.writeFileSync(sketchTempPath, sketchBuffer);
    }
    try {
      if (type === 'contract' || type === 'proposal') {
        pdfBuffer = await generateContractPDFBuffer(appointment, sketchTempPath);
      } else if (type === 'order_form' || type === 'order') {
        pdfBuffer = await generateOrderFormPDFBuffer(appointment, sketchTempPath);
      } else {
        return res.status(400).json({ error: 'Invalid document type' });
      }
    } finally {
      // Always clean up temp file
      if (sketchTempPath) {
        try { (await import('fs')).unlinkSync(sketchTempPath); } catch { /* ignore */ }
      }
    }
    
    // Upload to Supabase — tenant-scoped path
    const timestamp = Date.now();
    const formType = type === 'order' ? 'order_form' : type;
    const storagePath = `company/${companyId}/appointments/${appointmentId}/documents/${formType}_${timestamp}.pdf`;
    
    let uploadedPath: string | null = null;
    let storageUploadFailed = false;
    try {
      const { path: uPath, error } = await uploadFile(
        BUCKETS.GENERATED_DOCUMENTS,
        storagePath,
        pdfBuffer.toString('base64'),
        'application/pdf'
      );
      if (error) {
        console.error('[documents] Storage upload failed (non-fatal):', error.message);
        storageUploadFailed = true;
      } else {
        uploadedPath = uPath;
      }
    } catch (storageErr: any) {
      console.error('[documents] Storage upload exception (non-fatal):', storageErr?.message);
      storageUploadFailed = true;
    }
    
    // Create GeneratedDocument record (new multi-tenant system)
    const genDoc = await prisma.generatedDocument.create({
      data: {
        companyId,
        appointmentId,
        customerId: appointment.customerId,
        createdByUserId: userId,
        documentType: formType,
        status: storageUploadFailed ? 'generated_no_upload' : 'ready',
        storageBucket: BUCKETS.GENERATED_DOCUMENTS,
        storagePath: uploadedPath || storagePath,
        pdfStoragePath: uploadedPath || storagePath,
        mimeType: 'application/pdf',
        fileName: `${formType}_${timestamp}.pdf`,
        version: 1,
      },
    });

    // Also update FormInstance for backward compat with old frontend
    const existing = await prisma.formInstance.findFirst({
      where: { appointmentId, formType }
    });
    if (existing) {
      await prisma.formInstance.update({
        where: { id: existing.id },
        data: { pdfUrl: uploadedPath || storagePath, status: 'ready', updatedAt: new Date() }
      });
    } else {
      await prisma.formInstance.create({
        data: { appointmentId, formType, status: 'ready', pdfUrl: uploadedPath || storagePath }
      });
    }
    
    res.json({ success: true, documentId: genDoc.id, storageUploadFailed });
  } catch (err: any) {
    console.error('Document generation failed:', err);
    res.status(500).json({ error: 'Generation failed', details: err.message });
  }
});

// ── 3. Get Signed URL for Viewing ──
documentRoutes.get('/:id/view-url', async (req, res) => {
  try {
    const instance = await prisma.formInstance.findUnique({ where: { id: req.params.id } });
    if (!instance || !instance.pdfUrl) return res.status(404).json({ error: 'Document not ready' });
    
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = getCompanyId(req);
    const ok = await assertAppointmentAccess(instance.appointmentId, userId, role, companyId, res);
    if (!ok) return;
    
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: require('ws') as any }, global: { fetch: fetch } }
    );
    
    const { data, error } = await supabase.storage
      .from(BUCKETS.GENERATED_DOCUMENTS)
      .createSignedUrl(instance.pdfUrl, 3600);
      
    if (error || !data) throw new Error('Could not sign URL');
    
    res.json({ url: data.signedUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get view URL', details: err.message });
  }
});

// ═══════════════════════════════════════════════════
// NEW MULTI-TENANT ROUTES — Supabase-backed, tenant-isolated
// ═══════════════════════════════════════════════════

/**
 * POST /api/appointments/:appointmentId/sketch/export
 * Render sketch from DB markers and upload to Supabase Storage.
 * Creates or refreshes a SketchExport DB record.
 * Returns: { sketchExportId, version, signedUrl }
 */
documentRoutes.post('/appointment/:appointmentId/sketch/export', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized: missing companyId in session' });

    const { appointmentId } = req.params;
    const forceRegenerate = req.body?.forceRegenerate === true;

    // Verify access
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    const result = await generateAndStoreSketchExport({
      appointmentId,
      companyId,
      userId,
      elevation: req.body?.elevation || 'front',
      forceRegenerate,
    });

    res.json({
      sketchExportId: result.sketchExportId,
      version: result.version,
      signedUrl: result.signedUrl,
      wasAlreadyCurrent: result.wasAlreadyCurrent,
      localFallbackPath: result.localFallbackPath ? '[local-dev-only]' : null,
    });
  } catch (err: any) {
    console.error('[documents] sketch/export error:', err);
    res.status(500).json({ error: 'Sketch export failed', details: err?.message });
  }
});

/**
 * POST /api/appointments/:appointmentId/documents/order-form/generate
 * Generate order form (XLSX + PDF), upload to Supabase Storage,
 * create GeneratedDocument DB record.
 * Returns: { documentId, xlsxSignedUrl, pdfSignedUrl, version }
 * Also streams XLSX as HTTP response (for immediate download compatibility).
 */
documentRoutes.post('/appointment/:appointmentId/documents/order-form/generate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized: missing companyId in session' });

    const { appointmentId } = req.params;
    const forceRegenerate = req.body?.forceRegenerate === true;
    const docType = (req.body?.documentType as any) || 'order_form';

    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    const result = await generateOrderForm({
      appointmentId,
      companyId,
      userId,
      documentType: docType,
      forceRegenerate,
    });

    // ── Determine best response format ─────────────────────────────────
    // Priority: 1) JSON with valid signed URLs  2) Direct buffer download
    const wantsJson = req.headers.accept?.includes('application/json') || req.query.format === 'json';
    const hasSignedUrls = !!(result.xlsxSignedUrl || result.pdfSignedUrl);
    const hasBuffer = !!(result.pdfBuffer || result.xlsxBuffer);

    // Case 1: JSON requested AND signed URLs are available → ideal path
    if (wantsJson && hasSignedUrls) {
      return res.json({
        success: true,
        status: 'ready',
        documentId: result.documentId,
        documentType: result.documentType,
        version: result.version,
        downloadUrl: result.pdfSignedUrl || result.xlsxSignedUrl,
        xlsxSignedUrl: result.xlsxSignedUrl,
        pdfSignedUrl: result.pdfSignedUrl,
        fileName: result.fileName,
        contentType: result.pdfSignedUrl ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sketchExportId: result.sketchExportId,
        generatedAt: result.generatedAt ? result.generatedAt.toISOString() : new Date().toISOString(),
      });
    }

    // Case 2: No signed URLs but we have a buffer → stream it directly
    // This handles: storage not configured, storage upload failed, dev mode
    if (hasBuffer) {
      const preferPdf = !!(result.pdfBuffer);
      const buf = preferPdf ? result.pdfBuffer! : result.xlsxBuffer!;
      const ct = preferPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext = preferPdf ? '.pdf' : '.xlsx';
      const dlName = result.fileName.endsWith(ext) ? result.fileName : result.fileName.replace(/\.[^.]+$/, ext);

      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${dlName}"`);
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('X-Document-Id', result.documentId);
      res.setHeader('X-Document-Status', result.status);
      if (result.xlsxSignedUrl) res.setHeader('X-Xlsx-Signed-Url', result.xlsxSignedUrl);
      if (result.pdfSignedUrl) res.setHeader('X-Pdf-Signed-Url', result.pdfSignedUrl);
      return res.send(buf);
    }

    // Case 3: No buffer and no signed URLs → generation genuinely failed
    return res.status(500).json({
      success: false,
      code: 'DOCUMENT_GENERATION_FAILED',
      error: 'Document generation produced no output. Both PDF and XLSX generation failed.',
      documentId: result.documentId,
      details: 'Neither PDF nor XLSX buffer was created. Check server logs for generation errors.',
    });
  } catch (err: any) {
    console.error('[documents] order-form/generate error:', err);
    res.status(500).json({
      success: false,
      code: 'DOCUMENT_GENERATION_FAILED',
      error: 'Order form generation failed',
      details: err?.message,
    });
  }
});

/**
 * GET /api/appointments/:appointmentId/documents
 * List all GeneratedDocument records for an appointment.
 * Returns documents scoped to authenticated user's company.
 * Includes fresh signed URLs.
 */
documentRoutes.get('/appointment/:appointmentId/documents', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId } = req.params;
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Check if the sketch has been updated since the documents were generated
    const sketch = await prisma.formSketch.findFirst({
      where: { appointmentId },
      select: { updatedAt: true }
    });

    if (sketch) {
      await prisma.generatedDocument.updateMany({
        where: {
          appointmentId,
          companyId,
          status: 'ready',
          createdAt: { lt: sketch.updatedAt }
        },
        data: {
          status: 'stale'
        }
      });
    }

    const docs = await prisma.generatedDocument.findMany({
      where: { appointmentId, companyId },
      orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
    });

    // Generate fresh signed URLs for each document
    const docsWithUrls = await Promise.all(docs.map(async (doc) => {
      let xlsxSignedUrl: string | null = null;
      let pdfSignedUrl:  string | null = null;
      try {
        if (doc.xlsxStoragePath) {
          xlsxSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.xlsxStoragePath);
        }
        if (doc.pdfStoragePath) {
          pdfSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.pdfStoragePath);
        }
      } catch { /* continue */ }
      return { ...doc, xlsxSignedUrl, pdfSignedUrl };
    }));

    res.json({ documents: docsWithUrls });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list documents', details: err?.message });
  }
});

/**
 * GET /api/documents/customer/:customerId/documents
 * List all GeneratedDocument records for a customer.
 * Returns documents scoped to authenticated user's company.
 * Includes fresh signed URLs.
 */
documentRoutes.get('/customer/:customerId/documents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId } = req.params;
    
    // Ensure customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const docs = await prisma.generatedDocument.findMany({
      where: { customerId, companyId },
      orderBy: [{ createdAt: 'desc' }],
      include: { appointment: { select: { id: true } } }
    });

    // Generate fresh signed URLs for each document
    const docsWithUrls = await Promise.all(docs.map(async (doc) => {
      let xlsxSignedUrl: string | null = null;
      let pdfSignedUrl:  string | null = null;
      try {
        if (doc.xlsxStoragePath) {
          xlsxSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.xlsxStoragePath);
        }
        if (doc.pdfStoragePath) {
          pdfSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.pdfStoragePath);
        }
      } catch { /* continue */ }
      return { ...doc, xlsxSignedUrl, pdfSignedUrl };
    }));

    res.json({ documents: docsWithUrls });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list customer documents', details: err?.message });
  }
});

/**
 * GET /api/documents/:documentId
 * Get a single GeneratedDocument with fresh signed URLs.
 * Enforces company-level tenant isolation.
 */
documentRoutes.get('/doc/:documentId', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    let doc = await prisma.generatedDocument.findFirst({
      where: { id: req.params.documentId, companyId }, // companyId enforces tenant isolation
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Check sketch freshness
    const sketch = await prisma.formSketch.findFirst({
      where: { appointmentId: doc.appointmentId },
      select: { updatedAt: true }
    });

    if (sketch && sketch.updatedAt > doc.createdAt && doc.status === 'ready') {
      doc = await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { status: 'stale' }
      });
    }

    let xlsxSignedUrl: string | null = null;
    let pdfSignedUrl:  string | null = null;
    if (doc.xlsxStoragePath) {
      xlsxSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.xlsxStoragePath);
    }
    if (doc.pdfStoragePath) {
      pdfSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.pdfStoragePath);
    }

    res.json({ ...doc, xlsxSignedUrl, pdfSignedUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get document', details: err?.message });
  }
});

/**
 * GET /api/documents/:documentId/download
 * Redirect to signed URL for document download.
 * Enforces company-level tenant isolation before issuing URL.
 */
documentRoutes.get('/doc/:documentId/download', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await prisma.generatedDocument.findFirst({
      where: { id: req.params.documentId, companyId },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Prefer PDF, fall back to XLSX
    const storagePath = doc.pdfStoragePath || doc.xlsxStoragePath || doc.storagePath;
    if (!storagePath) return res.status(404).json({ error: 'No stored file for this document' });

    const signedUrl = await getSignedUrl(doc.storageBucket as any, storagePath, 300); // 5-min URL
    if (!signedUrl) return res.status(500).json({ error: 'Could not generate download URL' });

    res.redirect(302, signedUrl);
  } catch (err: any) {
    res.status(500).json({ error: 'Download failed', details: err?.message });
  }
});

/**
 * POST /api/documents/:documentId/regenerate
 * Regenerate an existing document (increments version).
 * Enforces company-level tenant isolation.
 */
documentRoutes.post('/doc/:documentId/regenerate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.generatedDocument.findFirst({
      where: { id: req.params.documentId, companyId },
    });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    // Verify appointment access
    const ok = await assertAppointmentAccess(existing.appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Mark existing as stale
    await prisma.generatedDocument.update({
      where: { id: existing.id },
      data: { status: 'stale' },
    });

    // Generate fresh
    const result = await generateOrderForm({
      appointmentId: existing.appointmentId,
      companyId,
      userId,
      documentType: existing.documentType as any,
      forceRegenerate: true,
    });

    res.json({
      documentId: result.documentId,
      version: result.version,
      status: result.status,
      xlsxSignedUrl: result.xlsxSignedUrl,
      pdfSignedUrl: result.pdfSignedUrl,
      replacedDocumentId: existing.id,
    });
  } catch (err: any) {
    console.error('[documents] regenerate error:', err);
    res.status(500).json({ error: 'Regeneration failed', details: err?.message });
  }
});

function runFullValidation(openings: any[], markers: any[], groups: any[], appt: any) {
  const warnings: any[] = [];
  let submissionBlocked = false;

  if (!appt.customer) {
    submissionBlocked = true;
    warnings.push({
      id: 'no-customer',
      severity: 'critical',
      category: 'customer',
      title: 'No customer linked',
      detail: 'Appointment has no associated customer record.',
      blocksSubmission: true
    });
  } else if (!appt.customer.firstName && !appt.customer.lastName) {
    submissionBlocked = true;
    warnings.push({
      id: 'missing-customer-name',
      severity: 'critical',
      category: 'customer',
      title: 'Missing customer name',
      detail: 'Customer first and last name are both empty.',
      blocksSubmission: true
    });
  }

  if (openings.length === 0) {
    submissionBlocked = true;
    warnings.push({
      id: 'no-openings',
      severity: 'critical',
      category: 'order',
      title: 'No openings entered',
      detail: 'At least one window/door opening is required.',
      blocksSubmission: true
    });
  } else {
    for (const op of openings) {
      if (op.width == null || isNaN(Number(op.width)) || Number(op.width) <= 0) {
        submissionBlocked = true;
        warnings.push({
          id: `width-${op.openingNumber}`,
          severity: 'critical',
          category: 'measurements',
          title: `Opening #${op.openingNumber}: invalid width`,
          detail: `Width is ${op.width} — must be a positive number.`,
          blocksSubmission: true
        });
      }
      if (op.height == null || isNaN(Number(op.height)) || Number(op.height) <= 0) {
        submissionBlocked = true;
        warnings.push({
          id: `height-${op.openingNumber}`,
          severity: 'critical',
          category: 'measurements',
          title: `Opening #${op.openingNumber}: invalid height`,
          detail: `Height is ${op.height} — must be a positive number.`,
          blocksSubmission: true
        });
      }
    }

    const openingNums = openings.map((o: any) => o.openingNumber as number).sort((a: number, b: number) => a - b);
    const maxNum = openingNums[openingNums.length - 1];
    if (maxNum > openingNums.length) {
      submissionBlocked = true;
      const missing = [];
      for (let i = 1; i <= maxNum; i++) {
        if (!openingNums.includes(i)) missing.push(i);
      }
      warnings.push({
        id: 'numbering-gaps',
        severity: 'critical',
        category: 'numbering',
        title: 'Opening numbering has gaps',
        detail: `${openingNums.length} openings numbered up to #${maxNum}. Missing: #${missing.join(', #')}.`,
        blocksSubmission: true
      });
    }

    const numCounts: Record<number, number> = {};
    for (const n of openingNums) {
      numCounts[n] = (numCounts[n] || 0) + 1;
    }
    for (const [num, count] of Object.entries(numCounts)) {
      if (count > 1) {
        submissionBlocked = true;
        warnings.push({
          id: `duplicate-number-${num}`,
          severity: 'critical',
          category: 'numbering',
          title: `Duplicate opening #${num}`,
          detail: `Opening number ${num} appears ${count} times.`,
          blocksSubmission: true
        });
      }
    }
  }

  return {
    submissionBlocked,
    warnings
  };
}

/**
 * GET /api/documents/appointment/:appointmentId/workbook
 * Get current workbook status and metadata.
 */
documentRoutes.get('/appointment/:appointmentId/workbook', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId } = req.params;
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Fetch the latest GeneratedDocument of type 'workbook'
    let doc = await prisma.generatedDocument.findFirst({
      where: { appointmentId, companyId, documentType: 'workbook' },
      orderBy: { version: 'desc' },
    });

    if (!doc) {
      return res.json({ status: 'not_generated', document: null, xlsxSignedUrl: null });
    }

    // Check sketch and openings freshness
    const [appt, sketch, openings] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { updatedAt: true }
      }),
      prisma.formSketch.findFirst({
        where: { appointmentId },
        select: { updatedAt: true }
      }),
      prisma.opening.findMany({
        where: { appointmentId, deletedAt: null },
        select: { updatedAt: true }
      })
    ]);

    const apptUpdated = appt?.updatedAt ? new Date(appt.updatedAt).getTime() : 0;
    const sketchUpdated = sketch?.updatedAt ? new Date(sketch.updatedAt).getTime() : 0;
    const maxOpeningUpdated = openings.reduce((max, o) => {
      const t = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
      return Math.max(max, t);
    }, 0);

    const docCreated = new Date(doc.createdAt).getTime();

    let status = doc.status;
    if (apptUpdated > docCreated || sketchUpdated > docCreated || maxOpeningUpdated > docCreated) {
      if (status !== 'stale_needs_regeneration' && status !== 'edited_externally') {
        status = 'stale_needs_regeneration';
        doc = await prisma.generatedDocument.update({
          where: { id: doc.id },
          data: { status: 'stale_needs_regeneration' }
        });
      }
    }

    let xlsxSignedUrl: string | null = null;
    if (doc.xlsxStoragePath) {
      try {
        xlsxSignedUrl = await getSignedUrl(doc.storageBucket as any, doc.xlsxStoragePath);
      } catch (err) {
        console.warn('Failed to sign URL for workbook:', err);
      }
    }

    res.json({ status, document: doc, xlsxSignedUrl });
  } catch (err: any) {
    console.error('[documents] get workbook status error:', err);
    res.status(500).json({ error: 'Failed to get workbook status', details: err?.message });
  }
});

/**
 * POST /api/documents/appointment/:appointmentId/workbook/generate
 * Generate Excel workbook (draft or final).
 */
documentRoutes.post('/appointment/:appointmentId/workbook/generate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId } = req.params;
    const isFinal = req.body?.isFinal === true;

    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Fetch appointment and run validation checks
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { openings: { where: { deletedAt: null } } }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const report = runFullValidation(appt.openings, [], [], appt);

    if (isFinal && report.submissionBlocked) {
      return res.status(400).json({
        error: 'Cannot generate final workbook while critical blockers remain.',
        code: 'VALIDATION_FAILED',
        report
      });
    }

    // Call generateOrderForm to generate XLSX
    const result = await generateOrderForm({
      appointmentId,
      companyId,
      userId,
      documentType: 'workbook',
      forceRegenerate: true
    });

    const status = isFinal ? 'final_generated' : 'draft_generated';
    
    // Update the GeneratedDocument status
    const doc = await prisma.generatedDocument.update({
      where: { id: result.documentId },
      data: { status }
    });

    res.json({
      success: true,
      documentId: doc.id,
      status,
      version: doc.version,
      xlsxSignedUrl: result.xlsxSignedUrl,
      fileName: doc.fileName
    });
  } catch (err: any) {
    console.error('[documents] generate workbook error:', err);
    res.status(500).json({ error: 'Workbook generation failed', details: err?.message });
  }
});

/**
 * POST /api/documents/appointment/:appointmentId/workbook/upload
 * Save externally edited workbook file.
 */
documentRoutes.post('/appointment/:appointmentId/workbook/upload', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId } = req.params;
    const { fileName, fileData } = req.body; // fileData is base64 string
    if (!fileData) return res.status(400).json({ error: 'fileData is required' });

    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const buffer = Buffer.from(fileData, 'base64');
    const timestamp = Date.now();
    const storagePath = `company/${companyId}/appointments/${appointmentId}/documents/workbook-edited_${timestamp}.xlsx`;

    let uploadedPath: string | null = null;
    if (isStorageConfigured()) {
      const { path: uPath, error } = await uploadBuffer(
        BUCKETS.GENERATED_DOCUMENTS,
        storagePath,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      if (error) {
        console.error('[documents] Edited workbook upload failed:', error.message);
      } else {
        uploadedPath = uPath;
      }
    }

    // Find the latest workbook to increment version
    const latestDoc = await prisma.generatedDocument.findFirst({
      where: { appointmentId, companyId, documentType: 'workbook' },
      orderBy: { version: 'desc' },
      select: { version: true }
    });
    const nextVersion = (latestDoc?.version ?? 0) + 1;

    // Create GeneratedDocument for edited workbook
    const doc = await prisma.generatedDocument.create({
      data: {
        companyId,
        appointmentId,
        customerId: appt.customerId,
        createdByUserId: userId,
        documentType: 'workbook',
        status: 'edited_externally',
        storageBucket: BUCKETS.GENERATED_DOCUMENTS,
        storagePath: uploadedPath || storagePath,
        xlsxStoragePath: uploadedPath || storagePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: fileName || `workbook-edited_${timestamp}.xlsx`,
        version: nextVersion,
      }
    });

    res.json({
      success: true,
      documentId: doc.id,
      status: 'edited_externally',
      version: doc.version
    });
  } catch (err: any) {
    console.error('[documents] upload edited workbook error:', err);
    res.status(500).json({ error: 'Workbook upload failed', details: err?.message });
  }
});

/**
 * POST /api/documents/appointment/:appointmentId/workbook/finalize
 * Mark workbook as final.
 */
documentRoutes.post('/appointment/:appointmentId/workbook/finalize', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const role = (req as any).user?.role;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId } = req.params;
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Fetch latest GeneratedDocument of type 'workbook'
    const doc = await prisma.generatedDocument.findFirst({
      where: { appointmentId, companyId, documentType: 'workbook' },
      orderBy: { version: 'desc' }
    });

    if (!doc) return res.status(404).json({ error: 'No generated workbook found to finalize' });

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { openings: { where: { deletedAt: null } } }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const report = runFullValidation(appt.openings, [], [], appt);
    if (report.submissionBlocked) {
      return res.status(400).json({
        error: 'Cannot finalize workbook while critical blockers remain.',
        code: 'VALIDATION_FAILED',
        report
      });
    }

    const updated = await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: { status: 'final_generated' }
    });

    res.json({
      success: true,
      documentId: updated.id,
      status: 'final_generated'
    });
  } catch (err: any) {
    console.error('[documents] finalize workbook error:', err);
    res.status(500).json({ error: 'Failed to finalize workbook', details: err?.message });
  }
});
