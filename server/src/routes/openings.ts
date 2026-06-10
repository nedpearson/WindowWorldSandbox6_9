import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

const VALID_OPENING_FIELDS = new Set([
  'appointmentId', 'openingNumber', 'quantity', 'companyId', 'roomLocation', 'elevation', 'floorNumber',
  'width', 'height', 'unitedInches', 'productType', 'productCategory', 'productModel', 'seriesModel',
  'doorType', 'doorPanelCount', 'doorSwing', 'doorHardware', 'squareFootage', 'stories', 'sidingMaterial',
  'headerFlashingFeet', 'jChannelFeet', 'interiorColor', 'exteriorColor', 'gridStyle', 'gridPattern',
  'gridProfile', 'gridVerticalCount', 'gridHorizontalCount', 'gridPlacement', 'gridNotes', 'gridConfirmed',
  'sdlSize', 'isSDL', 'isGBG', 'gridRequiresAudit', 'glassPackage', 'temperedGlass', 'obscureGlass',
  'argon', 'foamEnhanced', 'lowEPackage', 'screenOption', 'nailFin', 'oriel', 'orielType',
  'orielUpperSashHeight', 'orielMeasurementBasis', 'orielMeetingRailReference', 'orielConfirmed', 'orielNotes',
  'horizontalRR', 'hinge', 'exteriorType', 'exteriorSurface', 'whatTouchesWindow', 'exteriorConditionNotes',
  'requiresTrimHeader', 'requiresSpecialHandling', 'trimType', 'trimNotes', 'removalType', 'installType',
  'sillRepair', 'installNotes', 'customerNotes', 'installerNotes', 'copiedFromOpeningId', 'measurementConfirmed',
  'safetyConfirmed', 'safetyGlazingStatus', 'safetyReviewStatus', 'safetyGlazingOverrideReason', 'safetyGlazingReviewedAt',
  'basePrice', 'optionsPrice', 'laborPrice', 'totalPrice', 'radius', 'customRadius', 'legHeight',
  'shapeType', 'shapeOrientation', 'shapeSpringlineHeight', 'shapeRise', 'shapeHighSide', 'shapeLowSide',
  'shapeSlopeDirection', 'shapeAcrossFlats', 'specialtyNotes', 'needsVerification', 'specialShapeTrimRequired',
  'specialShapeTrimSelected', 'specialShapeTrimPrice', 'measurementMethod', 'outsideMeasureUsed', 'cutbackLikely',
  'cutbackSelected', 'cutbackReviewStatus', 'headerRequired', 'headerSelected', 'headerFlashingSelected',
  'trimRequiredReview', 'trimDecision', 'trimDecisionReason', 'trimPhotoRequired', 'trimSelected',
  'managerReviewRequired', 'pricingStatus', 'measurementBasis', 'measurementBasisDefaulted', 'measurementBasisOverridden',
  'outsideMeasurementConfirmed', 'insideMeasurementConfirmed', 'measurementBasisNotes', 'measurementNeedsReview',
  'cutbackType', 'cutbackAmount', 'cutbackIncludedInPrice', 'cutbackNotes', 'cutbackNeedsReview',
  'headerType', 'headerMaterial', 'headerColor', 'headerIncludedInPrice', 'headerNotes', 'headerNeedsReview',
  'trimIncludedInPrice', 'trimNeedsReview', 'installMethod', 'rawWidth', 'rawHeight', 'widthSource',
  'heightSource', 'widthRuleApplied', 'heightRuleApplied', 'widthDeductionInches', 'heightDeductionInches',
  'localId', 'version', 'deletedAt',
  'preferredMeasurementBasis', 'actualMeasurementBasis', 'cutbackRequired', 'removalDetail', 'trimIncluded', 'headerFlashingIncluded', 'measurementGuidanceAccepted', 'measurementGuidanceOverrideReason', 'outsidePhotoId', 'measurementVisualAnnotationId',
  'mullGroup', 'installMullion', 'structuralMullion'
]);

function sanitizeOpeningData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  const sanitized: any = {};
  for (const key of Object.keys(input)) {
    if (VALID_OPENING_FIELDS.has(key)) {
      sanitized[key] = input[key];
    }
  }
  return sanitized;
}


export const openingRoutes = Router();
openingRoutes.use(requireAuth);

/**
 * Verify that the authenticated user has access to the appointment that owns this opening.
 * Returns the appointment companyId or null. Throws 403 if access denied.
 */
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
  // Admin/manager: only need company match
  if (role === 'admin' || role === 'manager') {
    if (companyId && appt.companyId && appt.companyId !== companyId) {
      res.status(403).json({ error: 'Access denied to this appointment' });
      return false;
    }
    return true;
  }
  // Sales rep: must own the appointment OR be same company
  if (appt.userId === userId) return true;
  if (companyId && appt.companyId && appt.companyId === companyId) return true;
  res.status(403).json({ error: 'Access denied to this appointment' });
  return false;
}

/** Get companyId for an opening by looking up its appointment */
async function getOpeningAppointmentId(openingId: string): Promise<string | null> {
  const opening = await prisma.opening.findUnique({
    where: { id: openingId },
    select: { appointmentId: true },
  });
  return opening?.appointmentId ?? null;
}

/**
 * Apply sensible defaults to any opening field that is null/empty/zero.
 * Width/height default to 36 --60 (standard window) so pricing can run
 * immediately even before the rep measures. They can update later.
 *
 * IMPORTANT NOTES ON DEFAULTS:
 * - removalType: null/undefined = 'insert' (standard insert replacement  -- no tearout charge).
 *   The pricing engine checks removalType !== 'none' to add a labor/removal charge.
 *   A value of 'none' means explicitly no removal. 'insert' = standard insert (may be included in base).
 *   To NOT charge removal at all, set removalType to 'none' in the DB.
 * - exteriorSurface: NOT defaulted to 'siding'  -- that would trigger a header flashing charge for every window.
 *   Only charge header flashing when the field is explicitly set to a siding-type value.
 */
export function applyOpeningDefaults(op: any): any {
  return {
    ...op,
    width:           (op.width  && op.width  > 0) ? op.width  : 36,
    height:          (op.height && op.height > 0) ? op.height : 60,
    unitedInches:    ((op.width  || 36) + (op.height || 60)),
    roomLocation:    op.roomLocation   || 'Living Room',
    interiorColor:   op.interiorColor  || 'White',
    exteriorColor:   op.exteriorColor  || 'White',
    // Do NOT default exteriorSurface to 'siding'  -- that triggers header flashing for every window
    exteriorSurface: op.exteriorSurface || op.exteriorType || null,
    gridPattern:     op.gridPattern    || 'None',
    seriesModel:     op.seriesModel    || '4000 Series',
    glassPackage:    op.glassPackage   || 'LEE',
    // 'ALUM' = standard aluminum frame tearout; pricing engine only charges if catalog has removal labor item
    // Use 'none' explicitly to mean no removal charge at all
    removalType:     op.removalType    || 'ALUM',
    quantity:        op.quantity       ?? 1,
    floorNumber:     op.floorNumber    ?? 1,
    screenOption:    op.screenOption   || (op.productCategory?.toLowerCase().includes('picture') ? 'No Screen' : 'Half Screen'),
    elevation:       op.elevation      || 'front',
    productCategory: op.productCategory || 'double_hung',
    foamEnhanced:    op.foamEnhanced   ?? true,
    installType:     op.installType    || 'EXT',
  };
}



// List openings for an appointment  -- company-scoped
openingRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const ok = await assertAppointmentAccess(req.params.appointmentId, userId, role, companyId, res);
    if (!ok) return;
    const openings = await prisma.opening.findMany({
      where: { appointmentId: req.params.appointmentId },
      orderBy: { openingNumber: 'asc' },
      include: { photos: true }
    });
    res.json(openings.map(applyOpeningDefaults));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch openings' });
  }
});

// Get single opening  -- verify appointment ownership
openingRoutes.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const opening = await prisma.opening.findUnique({
      where: { id: req.params.id },
      include: { photos: true }
    });
    if (!opening) return res.status(404).json({ error: 'Opening not found' });
    const ok = await assertAppointmentAccess(opening.appointmentId, userId, role, companyId, res);
    if (!ok) return;
    res.json(applyOpeningDefaults(opening));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opening' });
  }
});

// Create opening  -- verify appointment ownership
openingRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { width, height, appointmentId, ...rest } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;
    const unitedInches = (width || 0) + (height || 0);
    const sanitizedRest = sanitizeOpeningData(rest);
    const opening = await prisma.opening.create({
      data: { ...sanitizedRest, appointmentId, width, height, unitedInches }
    });
    res.status(201).json(opening);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create opening', details: err.message });
  }
});

// Update opening  -- verify appointment ownership
openingRoutes.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const apptId = await getOpeningAppointmentId(req.params.id);
    if (!apptId) return res.status(404).json({ error: 'Opening not found' });
    const ok = await assertAppointmentAccess(apptId, userId, role, companyId, res);
    if (!ok) return;
    const { width, height, ...rest } = req.body;
    const data: any = sanitizeOpeningData(rest);
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;
    if (width !== undefined || height !== undefined) {
      const existing = await prisma.opening.findUnique({ where: { id: req.params.id } });
      const w = width ?? existing?.width ?? 0;
      const h = height ?? existing?.height ?? 0;
      data.unitedInches = w + h;
    }
    const opening = await prisma.opening.update({
      where: { id: req.params.id },
      data,
      include: { photos: true }
    });
    res.json(opening);
  } catch (err: any) {
    console.error('[openings.put] Failed to update opening:', err);
    res.status(500).json({ error: 'Failed to update opening', details: err.message });
  }
});

// Delete opening  -- verify appointment ownership
openingRoutes.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const apptId = await getOpeningAppointmentId(req.params.id);
    if (!apptId) return res.status(404).json({ error: 'Opening not found' });
    const ok = await assertAppointmentAccess(apptId, userId, role, companyId, res);
    if (!ok) return;
    await prisma.opening.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opening' });
  }
});

// Batch create openings  -- verify appointment ownership
openingRoutes.post('/batch', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { appointmentId, openings } = req.body;
    if (!Array.isArray(openings) || openings.length === 0) {
      return res.status(400).json({ error: 'No openings provided' });
    }
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;
    const data = openings.map((o: any) => ({
      ...sanitizeOpeningData(o),
      appointmentId,
      unitedInches: (o.width || 0) + (o.height || 0),
    }));
    await prisma.opening.createMany({ data });
    const created = await prisma.opening.findMany({
      where: { appointmentId },
      orderBy: { openingNumber: 'asc' },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Batch create failed' });
  }
});

// Batch update openings  -- verify appointment ownership
openingRoutes.put('/batch', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { appointmentId, updates } = req.body;
    if (!appointmentId || !updates) {
      return res.status(400).json({ error: 'appointmentId and updates required' });
    }
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;
    await prisma.opening.updateMany({
      where: { appointmentId },
      data: sanitizeOpeningData(updates)
    });
    const updated = await prisma.opening.findMany({
      where: { appointmentId },
      orderBy: { openingNumber: 'asc' },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Batch update failed', details: err.message });
  }
});

// Batch sync openings (upsert all, delete missing)  -- verify appointment ownership
openingRoutes.post('/batch-sync', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = (req as any).user?.companyId ?? null;
    const { appointmentId, openings } = req.body;
    if (!appointmentId || !Array.isArray(openings)) {
      return res.status(400).json({ error: 'appointmentId and openings array required' });
    }
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Wrap in transaction for safety
    await prisma.$transaction(async (tx) => {
      const incomingNumbers = openings.map((o: any) => o.openingNumber).filter(Boolean);
      
      // Delete any openings for this appointment that are NOT in the incoming list
      if (incomingNumbers.length > 0) {
        await tx.opening.deleteMany({
          where: {
            appointmentId,
            openingNumber: { notIn: incomingNumbers }
          }
        });
      } else {
        // If empty array passed, delete all
        await tx.opening.deleteMany({ where: { appointmentId } });
      }

      // Bulk fetch existing openings for this appointment to avoid N+1 queries
      const existingOpenings = await tx.opening.findMany({
        where: { appointmentId, openingNumber: { in: incomingNumbers } }
      });
      const existingMap = new Map();
      existingOpenings.forEach(o => {
        existingMap.set(o.openingNumber, o.id);
        existingMap.set(o.id, o.id);
      });

      const toCreate = [];
      const toUpdate = [];

      for (const opening of openings) {
        const { id, createdAt, updatedAt, photos, unitedInches, ...data } = opening;
        const ui = unitedInches || (data.width || 0) + (data.height || 0);
        const sanitizedData = sanitizeOpeningData(data);

        if (id && id.length > 0 && id.startsWith('opening_')) {
          toUpdate.push(tx.opening.update({
            where: { id },
            data: { ...sanitizedData, unitedInches: ui }
          }));
        } else {
          const matchId = existingMap.get(data.openingNumber);
          if (matchId) {
            toUpdate.push(tx.opening.update({
              where: { id: matchId },
              data: { ...sanitizedData, unitedInches: ui }
            }));
          } else {
            toCreate.push({ ...sanitizedData, appointmentId, unitedInches: ui });
          }
        }
      }

      if (toCreate.length > 0) {
        await tx.opening.createMany({ data: toCreate });
      }
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate);
      }
    });

    const finalOpenings = await prisma.opening.findMany({
      where: { appointmentId },
      orderBy: { openingNumber: 'asc' },
      include: { photos: true }
    });
    
    res.json(finalOpenings);
  } catch (err: any) {
    res.status(500).json({ error: 'Batch sync failed', details: err.message });
  }
});

