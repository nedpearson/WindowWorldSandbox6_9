import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { generateWorkbookBuffer, type AppointmentExportData, type OpeningData } from '../workbookEngine.js';
import { generateSketchImage } from '../services/sketchRenderer.js';
import { generateAndStoreSketchExport, getLatestClientSketchBuffer } from '../services/sketchExport.service.js';
import { uploadBuffer, downloadFileAsBuffer, isStorageConfigured, BUCKETS } from '../services/storageService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

export const exportRoutes = Router();
exportRoutes.use(requireAuth);

// Export appointment as JSON
exportRoutes.get('/json/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const requestingUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, role: true } });
    if (!requestingUser) return res.status(401).json({ error: 'Unauthorized' });
    const isAdminOrManager = ['admin', 'manager', 'owner', 'super_admin'].includes(requestingUser.role || '');

    const appt = await prisma.appointment.findFirst({
      where: isAdminOrManager
        ? { id: req.params.appointmentId }
        : { id: req.params.appointmentId, userId },
      include: {
        customer: true, openings: true, lineItems: true,
        payments: true, signatures: true
      }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    // Extra company check: managers/admins can only see their own company's data
    if (isAdminOrManager) {
      if (requestingUser.companyId && appt.companyId && appt.companyId !== requestingUser.companyId) {
        return res.status(403).json({ error: 'Access denied (cross-tenant)' });
      }
    } else if (appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export openings as CSV
exportRoutes.get('/csv/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const requestingUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, role: true } });
    if (!requestingUser) return res.status(401).json({ error: 'Unauthorized' });
    const isAdminOrManager = ['admin', 'manager', 'owner', 'super_admin'].includes(requestingUser.role || '');

    const appt = await prisma.appointment.findFirst({
      where: isAdminOrManager
        ? { id: req.params.appointmentId }
        : { id: req.params.appointmentId, userId },
      include: { customer: true, openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } } }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    // Extra company-scope guard
    if (isAdminOrManager) {
      if (requestingUser.companyId && appt.companyId && appt.companyId !== requestingUser.companyId) {
        return res.status(403).json({ error: 'Access denied (cross-tenant)' });
      }
    } else if (appt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const headers = ['Opening#', 'Room', 'Elevation', 'Width', 'Height', 'UI', 'Product', 'Series', 'IntColor', 'ExtColor', 'Grid', 'GridProfile', 'GridVxH', 'ExteriorSurface', 'Glass', 'BasePrice', 'Total'];
    const rows = appt.openings.map(o => {
      const gridPattern = o.gridPattern || o.gridStyle || 'None';
      const gridVxH = gridPattern !== 'None' ? `${o.gridVerticalCount || 0}V x ${o.gridHorizontalCount || 0}H` : '';
      return [
        o.openingNumber, o.roomLocation || '', o.elevation || '', o.width || '', o.height || '',
        o.unitedInches || '', o.productCategory || '', o.seriesModel || '', o.interiorColor || '',
        o.exteriorColor || '', gridPattern, o.gridProfile || '', gridVxH,
        o.exteriorSurface || o.exteriorType || '', o.glassPackage || '', o.basePrice, o.totalPrice
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${appt.customer.lastName}_openings.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
});

// ═══════════════════════════════════════════════════
// Upload sketch PNG for contract generation
// Replaces local disk write — uploads to Supabase Storage instead
// Creates a SketchExport DB record for multi-device access
// ═══════════════════════════════════════════════════
exportRoutes.post('/sketch/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    const { imageData, transform } = req.body; // base64 data URL or raw base64
    if (!imageData) return res.status(400).json({ error: 'imageData is required' });

    // Verify appointment belongs to user's company
    const appt = await prisma.appointment.findFirst({
      where: companyId
        ? { id: req.params.appointmentId, companyId }
        : { id: req.params.appointmentId, userId },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const pngBuffer = Buffer.from(base64Data, 'base64');
    const appointmentId = req.params.appointmentId;
    const cId = companyId || appt.companyId || 'unknown';

    // Determine version
    const latest = await prisma.sketchExport.findFirst({
      where: { appointmentId, companyId: cId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const storagePath = `company/${cId}/appointments/${appointmentId}/sketch/sketch-v${nextVersion}.png`;

    if (isStorageConfigured()) {
      const { error } = await uploadBuffer(BUCKETS.SKETCH_EXPORTS, storagePath, pngBuffer, 'image/png');
      if (error) {
        console.error('[exports] Supabase sketch upload error:', error);
        // Fall back to local for dev
      } else {
        await prisma.sketchExport.create({
          data: {
            companyId: cId,
            appointmentId,
            createdByUserId: userId,
            storageBucket: BUCKETS.SKETCH_EXPORTS,
            storagePath,
            mimeType: 'image/png',
            version: nextVersion,
            sourceHash: 'client_upload',
            sourceUpdatedAt: new Date(),
            metadataJson: transform ? JSON.stringify({ transform }) : undefined,
          },
        });
        return res.json({ success: true, storagePath, version: nextVersion });
      }
    }

    // Local fallback for dev environments — ALWAYS create DB record so export can find it
    const sketchDir = path.resolve(__dirname2, '../../../data/sketches');
    if (!fs.existsSync(sketchDir)) fs.mkdirSync(sketchDir, { recursive: true });
    const sketchPath = path.join(sketchDir, `${appointmentId}.png`);
    fs.writeFileSync(sketchPath, pngBuffer);

    // Create DB record even for local fallback — so document generation can find it
    await prisma.sketchExport.create({
      data: {
        companyId: cId,
        appointmentId,
        createdByUserId: userId,
        storageBucket: BUCKETS.SKETCH_EXPORTS,
        storagePath: sketchPath,  // Local file path — readable by getLatestClientSketchBuffer
        mimeType: 'image/png',
        version: nextVersion,
        sourceHash: 'client_upload',
        sourceUpdatedAt: new Date(),
        metadataJson: transform ? JSON.stringify({ transform }) : undefined,
      },
    });
    res.json({ success: true, path: '[local-dev-only]', version: nextVersion });
  } catch (err: any) {
    console.error('Sketch upload error:', err);
    res.status(500).json({ error: 'Sketch upload failed', details: err?.message });
  }
});

// ═══════════════════════════════════════════════════
// GET /sketch/:appointmentId
// Get latest composed sketch image (either from Supabase/disk client upload
// or dynamically fallback rendered from DB markers).
// ═══════════════════════════════════════════════════
exportRoutes.get('/sketch/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    const appointmentId = req.params.appointmentId;

    // Verify appointment belongs to user's company
    const appt = await prisma.appointment.findFirst({
      where: companyId
        ? { id: appointmentId, companyId }
        : { id: appointmentId, userId },
      select: { id: true, companyId: true }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const cId = companyId || appt.companyId || 'unknown';

    // 1. Try to get latest client-uploaded sketch
    const { getLatestClientSketchBuffer } = await import('../services/sketchExport.service.js');
    let buffer = await getLatestClientSketchBuffer(appointmentId, cId);

    // 2. If no client upload, try to build composed sketch image from active markers
    if (!buffer) {
      const { buildWindowWorldOrderData } = await import('../workbookEngine.js');
      const { exportData, activeMarkers } = await buildWindowWorldOrderData(appointmentId, cId);
      const { buildComposedSketchImage } = await import('../services/sketchRenderer.js');
      const pngBuffer = await buildComposedSketchImage(exportData, activeMarkers, appointmentId, cId);
      if (pngBuffer) {
        buffer = pngBuffer;
      }
    }

    if (!buffer) {
      return res.status(404).json({ error: 'No sketch available' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err: any) {
    console.error('Failed to get sketch:', err);
    res.status(500).json({ error: 'Failed to get sketch', details: err?.message });
  }
});

// ═══════════════════════════════════════════════════
// Generate sketch PNG from DB markers and upload to Supabase Storage
// (Server-side generation fallback when no canvas PNG was uploaded from client)
// Creates a SketchExport DB record for multi-device access
// ═══════════════════════════════════════════════════
exportRoutes.post('/sketch/:appointmentId/generate-from-db', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    const appointmentId = req.params.appointmentId;
    const elevation = (req.body?.elevation || 'front') as any;

    // Verify access
    const appt = await prisma.appointment.findFirst({
      where: companyId
        ? { id: appointmentId, companyId }
        : { id: appointmentId, userId },
      select: { id: true, companyId: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const cId = companyId || appt.companyId || 'unknown';

    // Use the new sketch export service (uploads to Supabase, creates DB record)
    const result = await generateAndStoreSketchExport({
      appointmentId,
      companyId: cId,
      userId,
      elevation,
    });

    res.json({
      success: true,
      sketchExportId: result.sketchExportId,
      version: result.version,
      size: result.pngBuffer.length,
      signedUrl: result.signedUrl,
      wasAlreadyCurrent: result.wasAlreadyCurrent,
    });
  } catch (err: any) {
    console.error('generate-from-db error:', err);
    res.status(500).json({ error: 'Sketch generation failed', details: err?.message });
  }
});

// ═══════════════════════════════════════════════════
// Export filled Excel workbook (Contract + Order Form)
// ═══════════════════════════════════════════════════
exportRoutes.get('/excel/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const requestingUser = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, role: true } });
    if (!requestingUser) return res.status(401).json({ error: 'Unauthorized' });
    const isAdminOrManager = ['admin', 'manager', 'owner', 'super_admin'].includes(requestingUser.role || '');

    const appt = await prisma.appointment.findFirst({
      where: isAdminOrManager
        ? { id: req.params.appointmentId }
        : { id: req.params.appointmentId, userId },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        user: true,
      }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    // Extra company-scope guard for non-admins who don't own this appointment, and admins across tenants
    if (isAdminOrManager) {
      if (requestingUser.companyId && appt.companyId && appt.companyId !== requestingUser.companyId) {
        return res.status(403).json({ error: 'Access denied (cross-tenant)' });
      }
    } else if (appt.userId !== userId) {
      const apptOwner = await prisma.user.findUnique({ where: { id: appt.userId }, select: { companyId: true } });
      if (apptOwner?.companyId !== requestingUser.companyId) return res.status(403).json({ error: 'Access denied' });
    }

    // Read sourceType and sourceId from query
    const { sourceType, sourceId } = req.query;
    let quoteSource: { type: string; id: string } | undefined;
    if (sourceType && sourceId && typeof sourceType === 'string' && typeof sourceId === 'string') {
      quoteSource = { type: sourceType, id: sourceId };
    }

    // ── 1. Fetch unified order data adapter ────────────────────────────────────
    const { buildWindowWorldOrderData } = await import('../workbookEngine.js');
    const { exportData, activeMarkers } = await buildWindowWorldOrderData(req.params.appointmentId, requestingUser.companyId || 'any', quoteSource);

    // ── 2. Get sketch image ────────────────────────────────────────────────────
    let sketchBuffer: Buffer | undefined;
    try {
      const cId = requestingUser.companyId || '';
      const { buildComposedSketchImage } = await import('../services/sketchRenderer.js');
      const pngBuffer = await buildComposedSketchImage(exportData, activeMarkers, req.params.appointmentId, cId);
      
      if (pngBuffer) {
        sketchBuffer = pngBuffer;
        exportData.sketchImageBuffer = sketchBuffer;
        exportData.contractSketchImageBuffer = sketchBuffer;
      }
    } catch (sketchErr) {
      console.warn('[exports] Could not get sketch buffer:', sketchErr);
    }

    const buffer = await generateWorkbookBuffer(exportData);

    const fileName = `${appt.customer.lastName}_${appt.customer.firstName}_Contract.xlsx`;
    
    // Upload to Supabase and log in GeneratedDocument
    if (isStorageConfigured() && requestingUser.companyId) {
      const storagePath = `company/${requestingUser.companyId}/appointments/${req.params.appointmentId}/contract_${Date.now()}.xlsx`;
      const uploadResult = await uploadBuffer(BUCKETS.GENERATED_DOCUMENTS, storagePath, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      if (!uploadResult.error) {
        await prisma.generatedDocument.create({
          data: {
            companyId: requestingUser.companyId,
            appointmentId: req.params.appointmentId,
            customerId: appt.customerId,
            createdByUserId: userId,
            documentType: 'contract',
            status: 'ready',
            storageBucket: BUCKETS.GENERATED_DOCUMENTS,
            storagePath: storagePath,
            xlsxStoragePath: storagePath,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileName,
          }
        });
      } else {
        console.warn('[exports] Failed to upload generated contract to storage:', uploadResult.error);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Excel export failed', details: err?.message });
  }
});

// ── Helper: map removalType DB value → workbook typeRemoved code ──
function mapRemovalType(removalType: string | null | undefined): string {
  if (!removalType) return 'ALUM'; // default — standard aluminum window removal
  const r = removalType.toUpperCase();
  if (r === 'STORM') return 'STORM';
  if (r === 'STEEL') return 'STEEL';
  if (r === 'NONE' || r === 'NO_REMOVAL') return '';
  return 'ALUM'; // 'full_tearout', 'ALUM', and everything else → standard removal
}

// ── Helper: map app product category to Window World model number ──
function mapProductCategoryToModel(category: string | null, series: string | null): string {
  if (!category) return '';
  const s = series || '4000';
  const map: Record<string, string> = {
    'double_hung': s.includes('6000') ? '0601' : '3001',
    'picture': '3004',
    'slider': '3002',
    'casement': '0951',
    'awning': '0951',
    'patio_door': '6105',
    'circle_top': 'S105',
    'eyebrow': 'S110',
  };
  return map[category] || '';
}

// ── Helper: map glass package name to workbook code ──
function mapGlassPackage(pkg: string | null | undefined): string | undefined {
  if (!pkg) return undefined;
  if (pkg.toLowerCase().includes('elite')) return 'LEE';
  if (pkg.toLowerCase().includes('solar')) return 'LEE';
  if (pkg.toLowerCase().includes('low-e')) return 'LE';
  return undefined;
}

