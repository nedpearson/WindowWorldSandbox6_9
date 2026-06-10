/**
 * laserMeasurements.routes.ts
 *
 * API routes for Bosch GLM165-27G laser measurement capture.
 *
 * Routes:
 *   POST /api/laser-measurements
 *     Save a new laser measurement capture (actual + adjusted)
 *
 *   GET /api/laser-measurements/:appointmentId
 *     List all laser captures for an appointment
 *
 *   PATCH /api/laser-measurements/:id/confirm
 *     Confirm a pending capture (sets confirmedByUserId, confirmedAt)
 *
 *   GET /api/laser-measurements/device-profile/bosch-glm165-27g
 *     Return device profile for UI (read-only, no auth needed)
 *
 * All routes (except device-profile) require auth and enforce company scoping.
 * companyId and userId are derived from the session — never trusted from client.
 */

import { Router, type Response } from 'express';
import { prisma } from '../index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const laserMeasurementsRoutes = Router();

// Device profile — no auth required
laserMeasurementsRoutes.get('/device-profile/bosch-glm165-27g', (_req, res) => {
  res.json({
    brand: 'Bosch',
    model: 'GLM165-27G',
    researchStatus: 'community_only',
    hidSupported: false,
    bleSupported: 'experimental',
    measureOnImportSupported: true,
    manualEntrySupported: true,
    recommendedPrimary: 'manual',
    notes: [
      'HID keyboard mode is NOT supported by the Bosch GLM165-27G.',
      'Web Bluetooth BLE is experimental — protocol is community-derived, not Bosch-official.',
      'iPhone/iPad do not support Web Bluetooth (WebKit restriction).',
      'Primary workflow: rep reads laser display and types into Manual Entry.',
      'See docs/bosch-glm165-27g-bluetooth-research.md for full research.',
    ],
  });
});

// All routes below require auth
laserMeasurementsRoutes.use(requireAuth);

/** Verify appointment access */
async function assertAppointmentAccess(
  appointmentId: string,
  userId: string,
  role: string,
  companyId: string,
  res: Response,
): Promise<boolean> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { userId: true, companyId: true },
  });
  if (!appt) { res.status(404).json({ error: 'Appointment not found' }); return false; }
  if (role === 'admin' || role === 'manager') {
    if (appt.companyId && appt.companyId !== companyId) {
      res.status(403).json({ error: 'Access denied' }); return false;
    }
    return true;
  }
  if (appt.userId === userId || appt.companyId === companyId) return true;
  res.status(403).json({ error: 'Access denied' }); return false;
}

/**
 * POST /api/laser-measurements
 * Save a laser measurement capture.
 * Body: { appointmentId, openingId?, rawValueText, assignedField, captureMode,
 *         normalizedInches, adjustedOrderInches?, ruleApplied?, ... }
 */
laserMeasurementsRoutes.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const companyId = req.user!.companyId;

    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    const {
      appointmentId,
      openingId,
      customerId,
      rawValueText,
      rawUnit,
      rawValueNumeric,
      normalizedInches,
      normalizedFractionText,
      assignedField,
      measurementContext,
      captureMode = 'manual',
      deviceModel = 'GLM165-27G',
      deviceName,
      deviceIdHash,
      ruleApplied,
      deductionInches,
      adjustedOrderInches,
      adjustedOrderFractionText,
      confidence = 1.0,
      isSuspicious = false,
      suspicionReasons = [],
      rawPayloadText,
      metadataJson,
      idempotencyKey,  // client-generated key for offline dedup
    } = req.body;

    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });
    if (!rawValueText) return res.status(400).json({ error: 'rawValueText is required' });
    if (normalizedInches === undefined) return res.status(400).json({ error: 'normalizedInches is required' });

    const ok = await assertAppointmentAccess(appointmentId, userId, role, companyId, res);
    if (!ok) return;

    // Idempotency check: if a capture with this key already exists, return it
    if (idempotencyKey) {
      const existing = await prisma.laserMeasurementCapture.findFirst({
        where: { companyId, metadataJson: { path: ['idempotencyKey'], equals: idempotencyKey } },
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    // Validate opening belongs to appointment if provided
    if (openingId) {
      const opening = await prisma.opening.findFirst({
        where: { id: openingId, appointmentId },
      });
      if (!opening) return res.status(404).json({ error: 'Opening not found for this appointment' });
    }

    const capture = await prisma.laserMeasurementCapture.create({
      data: {
        companyId,
        appointmentId,
        openingId: openingId || null,
        customerId: customerId || null,
        userId,
        deviceBrand: 'Bosch',
        deviceModel: deviceModel || 'GLM165-27G',
        deviceName: deviceName || null,
        deviceIdHash: deviceIdHash || null,
        captureMode,
        rawPayloadText: rawPayloadText || null,
        rawValueText,
        rawUnit: rawUnit || 'unknown',
        rawValueNumeric: rawValueNumeric ?? null,
        normalizedInches,
        normalizedFractionText: normalizedFractionText || null,
        assignedField: assignedField || null,
        measurementContext: measurementContext || null,
        ruleApplied: ruleApplied || null,
        deductionInches: deductionInches ?? null,
        adjustedOrderInches: adjustedOrderInches ?? null,
        adjustedOrderFractionText: adjustedOrderFractionText || null,
        confidence,
        needsUserConfirmation: false, // already confirmed before API call
        confirmedByUserId: userId,
        confirmedAt: new Date(),
        isSuspicious,
        suspicionReasons,
        // Store idempotency key in metadataJson for dedup on retry
        metadataJson: metadataJson
          ? { ...(typeof metadataJson === 'object' ? metadataJson : {}), idempotencyKey: idempotencyKey || null }
          : idempotencyKey ? { idempotencyKey } : null,
      },
    });

    res.status(201).json(capture);
  } catch (err: any) {
    console.error('Laser measurement save error:', err);
    res.status(500).json({ error: 'Failed to save laser measurement', details: err.message });
  }
});

/**
 * GET /api/laser-measurements/:appointmentId
 * List all captures for an appointment, ordered by capture time.
 */
laserMeasurementsRoutes.get('/:appointmentId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const companyId = req.user!.companyId;
    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    const ok = await assertAppointmentAccess(String(req.params.appointmentId), userId, role, companyId, res);
    if (!ok) return;

    const captures = await prisma.laserMeasurementCapture.findMany({
      where: { appointmentId: String(req.params.appointmentId) },
      orderBy: { capturedAt: 'desc' },
    });

    res.json(captures);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch laser measurements' });
  }
});

/**
 * PATCH /api/laser-measurements/:id/confirm
 * Confirm a pending capture.
 */
laserMeasurementsRoutes.patch('/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const companyId = req.user!.companyId;
    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    // Find and verify company ownership
    const existing = await prisma.laserMeasurementCapture.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ error: 'Capture not found' });
    if (existing.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.laserMeasurementCapture.update({
      where: { id: String(req.params.id) },
      data: {
        needsUserConfirmation: false,
        confirmedByUserId: userId,
        confirmedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to confirm capture', details: err.message });
  }
});

/**
 * GET /api/laser-measurements/opening/:openingId
 * List all captures for a specific opening.
 */
laserMeasurementsRoutes.get('/opening/:openingId', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    const captures = await prisma.laserMeasurementCapture.findMany({
      where: {
        openingId: String(req.params.openingId),
        companyId,
      },
      orderBy: { capturedAt: 'desc' },
      take: 50,
    });

    res.json(captures);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch captures for opening' });
  }
});
