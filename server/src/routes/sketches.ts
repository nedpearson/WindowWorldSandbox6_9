import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { uploadBuffer, isStorageConfigured, BUCKETS } from '../services/storageService.js';

export const sketchRoutes = Router();
sketchRoutes.use(requireAuth);

/** Resolve companyId for the authenticated user. */
async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return user?.companyId ?? null;
}

/**
 * Verify the authenticated user has access to the appointment that owns this sketch.
 * Returns true if allowed; sends 403/404 and returns false otherwise.
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
  if (role === 'admin' || role === 'manager') {
    if (companyId && appt.companyId && appt.companyId !== companyId) {
      res.status(403).json({ error: 'Access denied to this appointment' });
      return false;
    }
    return true;
  }
  if (appt.userId === userId) return true;
  if (companyId && appt.companyId && appt.companyId === companyId) return true;
  res.status(403).json({ error: 'Access denied to this appointment' });
  return false;
}

/**
 * Verify the authenticated user has access to a sketch by looking up its appointment.
 */
async function assertSketchAccess(
  sketchId: string,
  userId: string,
  role: string,
  companyId: string | null,
  res: any
): Promise<boolean> {
  const sketch = await prisma.formSketch.findUnique({
    where: { id: sketchId },
    select: { appointmentId: true },
  });
  if (!sketch) {
    res.status(404).json({ error: 'Sketch not found' });
    return false;
  }
  return assertAppointmentAccess(sketch.appointmentId, userId, role, companyId, res);
}

/**
 * Verify the authenticated user has access to a marker's sketch.
 */
async function assertMarkerAccess(
  markerId: string,
  userId: string,
  role: string,
  companyId: string | null,
  res: any
): Promise<boolean> {
  const marker = await prisma.sketchMarker.findUnique({
    where: { id: markerId },
    select: { sketchId: true },
  });
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' });
    return false;
  }
  return assertSketchAccess(marker.sketchId, userId, role, companyId, res);
}

/**
 * Verify the authenticated user has access to a group's sketch.
 */
async function assertGroupAccess(
  groupId: string,
  userId: string,
  role: string,
  companyId: string | null,
  res: any
): Promise<boolean> {
  const group = await prisma.sketchMarkerGroup.findUnique({
    where: { id: groupId },
    select: { sketchId: true },
  });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return false;
  }
  return assertSketchAccess(group.sketchId, userId, role, companyId, res);
}

// Get sketches by appointment ID — company-scoped
sketchRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const ok = await assertAppointmentAccess(req.params.appointmentId, userId, role, companyId, res);
    if (!ok) return;
    const sketches = await prisma.formSketch.findMany({
      where: { appointmentId: req.params.appointmentId },
      include: {
        layers: true,
        markers: {
          include: {
            links: true,
            group: true,
          }
        },
        markerGroups: {
          include: { markers: true, members: true }
        },
        validations: true,
        pricingValidations: true,
        aiInterpretations: true,
        warnings: true,
        scores: true,
        clarityScores: true
      }
    });
    res.json(sketches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sketches' });
  }
});

// Create a new sketch — verify appointment ownership
sketchRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const { appointmentId, name } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });
    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;
    const sketch = await prisma.formSketch.create({
      data: { appointmentId, name },
      include: { layers: true, markers: true }
    });
    res.status(201).json(sketch);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sketch' });
  }
});

// Update a sketch properties — verify sketch ownership
sketchRoutes.put('/:sketchId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const ok = await assertSketchAccess(req.params.sketchId, userId, role, companyId, res);
    if (!ok) return;

    const {
      name,
      sketchSourceMode,
      backgroundVisualId,
      mapOutlineEnabled,
      manualDrawingEnabled,
      streetViewReferenceEnabled,
      exportBackgroundEnabled,
      canvasData
    } = req.body;

    const sketch = await prisma.formSketch.update({
      where: { id: req.params.sketchId },
      data: {
        ...(name !== undefined && { name }),
        ...(sketchSourceMode !== undefined && { sketchSourceMode }),
        ...(backgroundVisualId !== undefined && { backgroundVisualId }),
        ...(mapOutlineEnabled !== undefined && { mapOutlineEnabled }),
        ...(manualDrawingEnabled !== undefined && { manualDrawingEnabled }),
        ...(streetViewReferenceEnabled !== undefined && { streetViewReferenceEnabled }),
        ...(exportBackgroundEnabled !== undefined && { exportBackgroundEnabled }),
        ...(canvasData !== undefined && { canvasData })
      }
    });
    res.json(sketch);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update sketch: ' + (err.message || 'Unknown Server Error') });
  }
});

// Sync markers for a sketch — verify sketch ownership
sketchRoutes.post('/:sketchId/markers', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const { markers, markerGroups } = req.body;
    const sketchId = req.params.sketchId;
    const ok = await assertSketchAccess(sketchId, userId, role, companyId, res);
    if (!ok) return;
    
    // Sync Groups first to satisfy Foreign Key constraints
    if (markerGroups && markerGroups.length > 0) {
      for (const g of markerGroups) {
        await prisma.sketchMarkerGroup.upsert({
          where: { id: g.id },
          create: {
            id: g.id,
            sketchId,
            groupType: g.groupType || 'mull_pair',
            groupNote: g.groupNote || null,
            keepSeparateRows: g.keepSeparateRows ?? true,
            needsReview: g.needsReview ?? true,
            pricingReviewed: g.pricingReviewed ?? false,
          },
          update: {
            groupType: g.groupType || 'mull_pair',
            groupNote: g.groupNote || null,
            keepSeparateRows: g.keepSeparateRows ?? true,
          }
        });
      }
      
      const incomingGroupIds = markerGroups.map((g: any) => g.id).filter(Boolean);
      await prisma.sketchMarkerGroup.deleteMany({
        where: { sketchId, id: { notIn: incomingGroupIds } }
      });
    } else if (markerGroups && markerGroups.length === 0) {
      await prisma.sketchMarkerGroup.deleteMany({ where: { sketchId } });
    }

    // Sync Markers
    if (markers && markers.length > 0) {
      for (const m of markers) {
        const data = {
          sketchId,
          markerType: m.markerType || 'window',
          markerNumber: m.markerNumber || null,
          markerSymbol: m.markerSymbol || null,
          markerLabel: m.markerLabel || null,
          windowType: m.windowType || m.productType || null,
          shapeType: m.shapeType || null,
          x: m.x,
          y: m.y,
          width: m.width || null,
          height: m.height || null,
          unitedInches: m.unitedInches || null,
          elevation: m.elevation || null,
          roomLocation: m.roomLocation || null,
          floorNumber: m.floorNumber || 1,
          productType: m.productType || null,
          specialtyType: m.specialtyType || null,
          ladderReq: m.ladderReq || false,
          removalType: m.removalType || null,
          installType: m.installType || null,
          exteriorMaterial: m.exteriorMaterial || null,
          notes: m.notes || null,
          pricingStatus: m.pricingStatus || null,
          linkedOrderRowNumber: m.linkedOrderRowNumber || null,
          validationStatus: m.validationStatus || 'incomplete',
          groupId: m.groupId || null,
        };
        
        await prisma.sketchMarker.upsert({
          where: { id: m.id },
          create: { ...data, id: m.id },
          update: data
        });
      }
      
      const incomingIds = markers.map((m: any) => m.id).filter(Boolean);
      await prisma.sketchMarker.deleteMany({
        where: { sketchId, id: { notIn: incomingIds } }
      });
      
      // Update Group Members
      if (markerGroups && markerGroups.length > 0) {
        await prisma.sketchMarkerGroupMember.deleteMany({ where: { groupId: { in: markerGroups.map((g: any) => g.id) } } });
        for (const g of markerGroups) {
          const members = markers.filter((m: any) => m.groupId === g.id);
          for (let i = 0; i < members.length; i++) {
            await prisma.sketchMarkerGroupMember.create({
              data: { groupId: g.id, markerId: members[i].id, position: i }
            });
          }
        }
      }
    } else if (markers && markers.length === 0) {
      await prisma.sketchMarker.deleteMany({ where: { sketchId } });
    }

    const updatedMarkers = await prisma.sketchMarker.findMany({
      where: { sketchId },
      include: { links: true, group: true },
    });
    res.json(updatedMarkers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync markers: ' + (err.message || 'Unknown Server Error') });
  }
});

// Create marker group (join/mull) — verify sketch ownership
sketchRoutes.post('/:sketchId/groups', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const { groupType, groupNote, keepSeparateRows, memberMarkerIds } = req.body;
    const sketchId = req.params.sketchId;
    const ok = await assertSketchAccess(sketchId, userId, role, companyId, res);
    if (!ok) return;

    const group = await prisma.sketchMarkerGroup.create({
      data: {
        sketchId,
        groupType: groupType || 'mull_pair',
        groupNote: groupNote || null,
        keepSeparateRows: keepSeparateRows ?? true,
        needsReview: true,
        pricingReviewed: false,
      },
    });

    // Link markers to group
    if (memberMarkerIds && memberMarkerIds.length > 0) {
      await prisma.sketchMarker.updateMany({
        where: { id: { in: memberMarkerIds }, sketchId },
        data: { groupId: group.id },
      });
      for (let i = 0; i < memberMarkerIds.length; i++) {
        await prisma.sketchMarkerGroupMember.create({
          data: { groupId: group.id, markerId: memberMarkerIds[i], position: i },
        });
      }
    }

    const fullGroup = await prisma.sketchMarkerGroup.findUnique({
      where: { id: group.id },
      include: { markers: true, members: true },
    });
    res.status(201).json(fullGroup);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create marker group' });
  }
});

// Get groups for a sketch — verify sketch ownership
sketchRoutes.get('/:sketchId/groups', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const ok = await assertSketchAccess(req.params.sketchId, userId, role, companyId, res);
    if (!ok) return;
    const groups = await prisma.sketchMarkerGroup.findMany({
      where: { sketchId: req.params.sketchId },
      include: { markers: true, members: true },
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Delete a group — verify group ownership
sketchRoutes.delete('/groups/:groupId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const ok = await assertGroupAccess(req.params.groupId, userId, role, companyId, res);
    if (!ok) return;
    await prisma.sketchMarker.updateMany({
      where: { groupId: req.params.groupId },
      data: { groupId: null },
    });
    await prisma.sketchMarkerGroupMember.deleteMany({ where: { groupId: req.params.groupId } });
    await prisma.sketchMarkerGroup.delete({ where: { id: req.params.groupId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Upload rendered sketch PNG for Order Form Excel insertion
// Stores to Supabase Storage (private bucket) + creates SketchExport DB record
sketchRoutes.post('/upload-for-export', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    const pathMod = await import('path');
    const fs = await import('fs');
    const { fileURLToPath } = await import('url');
    const __filename3 = fileURLToPath(import.meta.url);
    const __dirname3 = pathMod.dirname(__filename3);

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const bodyStr = body.toString('latin1');
        const appointmentIdMatch = bodyStr.match(/name="appointmentId"\r\n\r\n([^\r\n]+)/);
        // Sanitize appointmentId to prevent path traversal
        const appointmentId = (appointmentIdMatch?.[1] || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');

        const pngStart = body.indexOf(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
        if (pngStart < 0) {
          return res.status(400).json({ error: 'No PNG data found' });
        }

        const boundaryMatch = bodyStr.match(/^--([\S]+)/);
        const boundary = boundaryMatch ? `--${boundaryMatch[1]}` : '';
        const endBoundary = Buffer.from(`\r\n${boundary}`);
        let pngEnd = body.indexOf(endBoundary, pngStart);
        if (pngEnd < 0) pngEnd = body.length;

        const pngData = body.subarray(pngStart, pngEnd);

        // Verify appointment access and get companyId
        const appt = await prisma.appointment.findFirst({
          where: companyId
            ? { id: appointmentId, companyId }
            : { id: appointmentId, userId },
          select: { id: true, companyId: true },
        });
        const cId = companyId || appt?.companyId || 'unknown';

        if (isStorageConfigured()) {
          // Determine version
          const latest = await prisma.sketchExport.findFirst({
            where: { appointmentId, companyId: cId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latest?.version ?? 0) + 1;
          const storagePath = `company/${cId}/appointments/${appointmentId}/sketch/sketch-v${nextVersion}.png`;

          const { error } = await uploadBuffer(BUCKETS.SKETCH_EXPORTS, storagePath, pngData, 'image/png');
          if (!error) {
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
              },
            });
            return res.json({ success: true, storagePath, version: nextVersion, size: pngData.length });
          }
          console.error('[sketches] Supabase upload failed, falling back to local');
        }

        // Local fallback for dev environments (no Supabase configured)
        const sketchDir = pathMod.resolve(__dirname3, '../../../data/sketches');
        if (!fs.existsSync(sketchDir)) fs.mkdirSync(sketchDir, { recursive: true });
        const filePath = pathMod.join(sketchDir, `${appointmentId}.png`);
        const resolvedPath = pathMod.resolve(filePath);
        if (!resolvedPath.startsWith(pathMod.resolve(sketchDir))) {
          return res.status(400).json({ error: 'Invalid file path' });
        }
        fs.writeFileSync(filePath, pngData);
        res.json({ success: true, path: '[local-dev-only]', size: pngData.length });
      } catch (innerErr: any) {
        console.error('Sketch upload inner error:', innerErr);
        res.status(500).json({ error: 'Failed to upload sketch', details: innerErr?.message });
      }
    });
  } catch (err: any) {
    console.error('Sketch upload error:', err);
    res.status(500).json({ error: 'Failed to upload sketch' });
  }
});

// ── Individual marker CRUD ────────────────────────────────────────────────────

// Update a single marker by ID — verify ownership through sketch → appointment
sketchRoutes.put('/markers/:markerId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const { markerId } = req.params;
    const ok = await assertMarkerAccess(markerId, userId, role, companyId, res);
    if (!ok) return;

    const {
      markerType, markerNumber, markerSymbol, markerLabel,
      windowType, shapeType, shapeOrientation, shapeRise, shapeDiameter, shapeCustomNote,
      x, y, width, height, unitedInches,
      widthTop, widthMiddle, widthBottom,
      heightLeft, heightCenter, heightRight,
      elevation, roomLocation, floorNumber,
      productType, specialtyType, ladderReq,
      removalType, installType,
      exteriorMaterial, exteriorSurface, exteriorColor, interiorColor,
      glassPackage, screenOption, foamEnhanced, temperedGlass, obscureGlass, nailFin,
      gridPattern, gridProfile, gridVerticalCount, gridHorizontalCount,
      gridPlacement, gridStyle, sdlSize, isSDL, isGBG,
      orielType, orielUpperSashHeight, orielMeasurementBasis, orielConfirmed,
      notes, pricingStatus, validationStatus, measurementVerified, hasPhoto,
      linkedOrderRowNumber, groupId,
    } = req.body;

    const updated = await prisma.sketchMarker.update({
      where: { id: markerId },
      data: {
        ...(markerType !== undefined && { markerType }),
        ...(markerNumber !== undefined && { markerNumber }),
        ...(markerSymbol !== undefined && { markerSymbol }),
        ...(markerLabel !== undefined && { markerLabel }),
        ...(windowType !== undefined && { windowType }),
        ...(shapeType !== undefined && { shapeType }),
        ...(shapeOrientation !== undefined && { shapeOrientation }),
        ...(shapeRise !== undefined && { shapeRise }),
        ...(shapeDiameter !== undefined && { shapeDiameter }),
        ...(shapeCustomNote !== undefined && { shapeCustomNote }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(unitedInches !== undefined && { unitedInches }),
        ...(widthTop !== undefined && { widthTop }),
        ...(widthMiddle !== undefined && { widthMiddle }),
        ...(widthBottom !== undefined && { widthBottom }),
        ...(heightLeft !== undefined && { heightLeft }),
        ...(heightCenter !== undefined && { heightCenter }),
        ...(heightRight !== undefined && { heightRight }),
        ...(elevation !== undefined && { elevation }),
        ...(roomLocation !== undefined && { roomLocation }),
        ...(floorNumber !== undefined && { floorNumber }),
        ...(productType !== undefined && { productType }),
        ...(specialtyType !== undefined && { specialtyType }),
        ...(ladderReq !== undefined && { ladderReq }),
        ...(removalType !== undefined && { removalType }),
        ...(installType !== undefined && { installType }),
        ...(exteriorMaterial !== undefined && { exteriorMaterial }),
        ...(exteriorSurface !== undefined && { exteriorSurface }),
        ...(exteriorColor !== undefined && { exteriorColor }),
        ...(interiorColor !== undefined && { interiorColor }),
        ...(glassPackage !== undefined && { glassPackage }),
        ...(screenOption !== undefined && { screenOption }),
        ...(foamEnhanced !== undefined && { foamEnhanced }),
        ...(temperedGlass !== undefined && { temperedGlass }),
        ...(obscureGlass !== undefined && { obscureGlass }),
        ...(nailFin !== undefined && { nailFin }),
        ...(gridPattern !== undefined && { gridPattern }),
        ...(gridProfile !== undefined && { gridProfile }),
        ...(gridVerticalCount !== undefined && { gridVerticalCount }),
        ...(gridHorizontalCount !== undefined && { gridHorizontalCount }),
        ...(gridPlacement !== undefined && { gridPlacement }),
        ...(gridStyle !== undefined && { gridStyle }),
        ...(sdlSize !== undefined && { sdlSize }),
        ...(isSDL !== undefined && { isSDL }),
        ...(isGBG !== undefined && { isGBG }),
        ...(orielType !== undefined && { orielType }),
        ...(orielUpperSashHeight !== undefined && { orielUpperSashHeight }),
        ...(orielMeasurementBasis !== undefined && { orielMeasurementBasis }),
        ...(orielConfirmed !== undefined && { orielConfirmed }),
        ...(notes !== undefined && { notes }),
        ...(pricingStatus !== undefined && { pricingStatus }),
        ...(validationStatus !== undefined && { validationStatus }),
        ...(measurementVerified !== undefined && { measurementVerified }),
        ...(hasPhoto !== undefined && { hasPhoto }),
        ...(linkedOrderRowNumber !== undefined && { linkedOrderRowNumber }),
        ...(groupId !== undefined && { groupId }),
        updatedAt: new Date(),
      },
      include: { links: true, group: true },
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Marker not found' });
    }
    console.error('Marker update error:', err);
    res.status(500).json({ error: 'Failed to update marker' });
  }
});

// Delete a single marker by ID — verify ownership through sketch → appointment
sketchRoutes.delete('/markers/:markerId', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const companyId = await getUserCompanyId(userId);
    const { markerId } = req.params;
    const ok = await assertMarkerAccess(markerId, userId, role, companyId, res);
    if (!ok) return;

    // Remove group membership first (FK safety)
    await prisma.sketchMarkerGroupMember.deleteMany({ where: { markerId } });
    // Remove any opening link
    await prisma.sketchMarkerLink.deleteMany({ where: { markerId } });
    await prisma.sketchMarker.delete({ where: { id: markerId } });

    res.json({ success: true, deletedId: markerId });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Marker not found' });
    }
    console.error('Marker delete error:', err);
    res.status(500).json({ error: 'Failed to delete marker' });
  }
});
