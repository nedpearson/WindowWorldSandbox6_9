// ═══════════════════════════════════════════════════════════════════
// reviewActions.ts — Review Action Endpoints
//
// POST  /api/review-actions/apply                       — general action dispatcher
// PATCH /api/review-actions/:appointmentId/signatures   — save all signatures
// POST  /api/review-actions/:appointmentId/confirm-job-level — confirm job-level price
// POST  /api/review-actions/:appointmentId/reconcile-openings — link sketch markers to openings
// ═══════════════════════════════════════════════════════════════════

import { Router, type Response } from 'express';
import { prisma } from '../index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { recalculatePricing } from '../services/pricingEngine.js';

export const reviewActionsRoutes = Router();
reviewActionsRoutes.use(requireAuth);

/** Resolve companyId from authenticated user. */
async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return user?.companyId ?? null;
}

/** Verify appointment belongs to company. Returns appointment with customer + signatures. */
async function getAppt(appointmentId: string, companyId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
    include: { openings: true, signatures: true, customer: true },
  });
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/review-actions/apply
// ─────────────────────────────────────────────────────────────────────
reviewActionsRoutes.post('/apply', async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId, issueId, issueType, actionType, payload } = req.body;
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);

    if (!companyId) return res.status(403).json({ error: 'User does not belong to a company' });
    if (!appointmentId || !actionType) {
      return res.status(400).json({ error: 'appointmentId and actionType are required' });
    }

    const appt = await getAppt(String(appointmentId), companyId);
    if (!appt) return res.status(404).json({ error: 'Appointment not found or access denied' });

    let updatedRecords: Record<string, unknown> = { appointmentId };
    let requiresRecalc = false;

    if (actionType === 'apply_product_option') {
      const { openingId, optionCode } = payload || {};
      if (optionCode === 'argon') {
        if (openingId) {
          await prisma.opening.update({ where: { id: String(openingId) }, data: { argon: true } });
          updatedRecords.openingId = openingId;
        } else {
          await prisma.opening.updateMany({ where: { appointmentId: String(appointmentId) }, data: { argon: true } });
          updatedRecords.allOpenings = true;
        }
        requiresRecalc = true;
      }

    } else if (actionType === 'apply_field_update') {
      const { target, fields, openingNumber } = payload || {};
      if (target === 'appointment') {
        await prisma.appointment.update({ where: { id: String(appointmentId) }, data: fields });
      } else if (target === 'opening' && openingNumber !== undefined) {
        const opening = await prisma.opening.findFirst({
          where: { appointmentId: String(appointmentId), openingNumber: Number(openingNumber) },
        });
        if (opening) {
          await prisma.opening.update({ where: { id: opening.id }, data: fields });
          updatedRecords.openingId = opening.id;
        }
      }
      requiresRecalc = true;

    } else if (actionType === 'set_fields') {
      // set_fields: { fields: {}, targetOpenings?: number[], target?: string }
      const { fields, targetOpenings, target } = payload || {};
      if (!fields || typeof fields !== 'object') { /* skip */ }
      if (target === 'appointment') {
        await prisma.appointment.update({ where: { id: String(appointmentId) }, data: fields });
      } else if (Array.isArray(targetOpenings) && targetOpenings.length > 0) {
        // Apply to specific opening numbers
        for (const openingNum of targetOpenings) {
          const op = await prisma.opening.findFirst({
            where: { appointmentId: String(appointmentId), openingNumber: Number(openingNum) },
          });
          if (op) await prisma.opening.update({ where: { id: op.id }, data: fields });
        }
        updatedRecords.targetOpenings = targetOpenings;
      } else {
        // Apply to all openings in appointment
        await prisma.opening.updateMany({ where: { appointmentId: String(appointmentId) }, data: fields });
        updatedRecords.allOpenings = true;
      }
      requiresRecalc = true;
    } else if (actionType === 'confirm_job_level_price'
            || (actionType === 'apply_quote_options' && payload?.action === 'confirm_job_level_price')) {
      await prisma.appointment.update({
        where: { id: String(appointmentId) },
        data: { jobLevelPriceConfirmed: true },
      });
      updatedRecords.jobLevelPriceConfirmed = true;

    } else if (actionType === 'apply_quote_options' && payload?.action === 'recalculate') {
      requiresRecalc = true;
    }
    // Other action types (route_focus, schedule_follow_up, escalate, dismiss_with_reason, etc.)
    // are client-side only — just log them.

    if (requiresRecalc) {
      try { await recalculatePricing(String(appointmentId)); } catch (e) {
        console.error('Pricing recalc error after review action:', e);
      }
    }

    await prisma.reviewActionLog.create({
      data: {
        companyId,
        userId,
        appointmentId: String(appointmentId),
        issueId: issueId ? String(issueId) : null,
        issueType: issueType ? String(issueType) : null,
        actionType: String(actionType),
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    if (issueId) {
      await prisma.finalReviewItem.updateMany({
        where: { id: String(issueId), appointmentId: String(appointmentId) },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: userId,
          resolutionAction: String(actionType),
          metadataJson: payload ? JSON.stringify(payload) : null,
        },
      });
    }

    res.json({ success: true, message: 'Action applied', updated: updatedRecords });

  } catch (error: any) {
    console.error('Error applying review action:', error);
    res.status(500).json({ error: error.message || 'Failed to apply action' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/review-actions/:appointmentId/signatures
// Body: { signatures: { ownerSignature?, estimatorSignature?, customerInitials?, signatureDate? } }
// ─────────────────────────────────────────────────────────────────────
reviewActionsRoutes.patch('/:appointmentId/signatures', async (req: AuthRequest, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);

    if (!companyId) return res.status(403).json({ error: 'User does not belong to a company' });

    const appt = await getAppt(appointmentId, companyId);
    if (!appt) return res.status(404).json({ error: 'Appointment not found or access denied' });

    const { signatures } = req.body as {
      signatures: {
        ownerSignature?: string;
        estimatorSignature?: string;
        customerInitials?: string;
        signatureDate?: string;
      };
    };

    if (!signatures || typeof signatures !== 'object') {
      return res.status(400).json({ error: 'signatures object is required' });
    }

    const ROLE_MAP: Record<string, string> = {
      ownerSignature: 'ownerSignature',
      estimatorSignature: 'estimatorSignature',
      customerInitials: 'customerInitials',
      signatureDate: 'signatureDate',
    };

    const savedRoles: string[] = [];

    for (const [key, signerRole] of Object.entries(ROLE_MAP)) {
      const signatureData = (signatures as Record<string, string | undefined>)[key];
      if (!signatureData) continue;

      // Upsert via deleteMany + create (Signature has no compound unique we can upsert on)
      await prisma.signature.deleteMany({ where: { appointmentId, signerRole } });
      await prisma.signature.create({
        data: {
          appointmentId,
          signerName:
            key === 'ownerSignature'
              ? `${appt.customer?.firstName ?? ''} ${appt.customer?.lastName ?? ''}`.trim() || 'Owner'
              : key === 'estimatorSignature'
              ? 'Estimator'
              : key,
          signerRole,
          signatureData,
          signedAt: new Date(),
        },
      });
      savedRoles.push(signerRole);
    }

    await prisma.reviewActionLog.create({
      data: {
        companyId,
        userId,
        appointmentId,
        actionType: 'signature_saved',
        payload: JSON.stringify({ savedRoles }),
      },
    });

    // Return the refreshed appointment so frontend can re-run validation
    const updated = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        signatures: true,
        lineItems: true,
      },
    });

    res.json({ success: true, savedRoles, appointment: updated });

  } catch (error: any) {
    console.error('Error saving signatures:', error);
    res.status(500).json({ error: error.message || 'Failed to save signatures' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/review-actions/:appointmentId/confirm-job-level
// ─────────────────────────────────────────────────────────────────────
reviewActionsRoutes.post('/:appointmentId/confirm-job-level', async (req: AuthRequest, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);

    if (!companyId) return res.status(403).json({ error: 'User does not belong to a company' });

    const appt = await getAppt(appointmentId, companyId);
    if (!appt) return res.status(404).json({ error: 'Appointment not found or access denied' });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { jobLevelPriceConfirmed: true },
    });

    await prisma.reviewActionLog.create({
      data: { companyId, userId, appointmentId, actionType: 'confirm_job_level_price', payload: null },
    });

    res.json({ success: true, jobLevelPriceConfirmed: true });

  } catch (error: any) {
    console.error('Error confirming job-level price:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm job-level price' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/review-actions/:appointmentId/reconcile-openings
// Links unlinked sketch markers to new pricing openings.
// ─────────────────────────────────────────────────────────────────────
reviewActionsRoutes.post('/:appointmentId/reconcile-openings', async (req: AuthRequest, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);

    if (!companyId) return res.status(403).json({ error: 'User does not belong to a company' });

    const appt = await getAppt(appointmentId, companyId);
    if (!appt) return res.status(404).json({ error: 'Appointment not found or access denied' });

    // Load sketches for this appointment, including their markers and marker links
    const sketches = await prisma.formSketch.findMany({
      where: { appointmentId },
    });

    if (sketches.length === 0) {
      return res.json({ success: true, created: 0, message: 'No sketch found for this appointment.' });
    }

    // Load all unlinked markers across all sketches for this appointment
    const unlinkedMarkers = await prisma.sketchMarker.findMany({
      where: {
        sketchId: { in: sketches.map(s => s.id) },
        markerType: { in: ['window', 'door'] },
        links: { none: {} },  // No SketchMarkerLink exists for this marker
      },
    });

    if (unlinkedMarkers.length === 0) {
      return res.json({
        success: true,
        created: 0,
        message: 'No unlinked sketch markers found. All markers are already linked to openings.',
      });
    }

    // Load all active openings for this appointment to check for re-linking candidates
    const activeOpenings = await prisma.opening.findMany({
      where: {
        appointmentId,
        deletedAt: null,
      },
    });

    const activeOpeningsMap = new Map<number, typeof activeOpenings[0]>();
    for (const op of activeOpenings) {
      activeOpeningsMap.set(op.openingNumber, op);
    }

    // Determine next opening number
    const existingOpenings = await prisma.opening.findMany({
      where: { appointmentId },
      orderBy: { openingNumber: 'desc' },
      take: 1,
    });
    let nextNum = (existingOpenings[0]?.openingNumber ?? 0) + 1;

    const createdIds: string[] = [];

    for (const marker of unlinkedMarkers) {
      let openingId: string;
      const markerNum = marker.markerNumber;

      if (markerNum !== null && activeOpeningsMap.has(markerNum)) {
        // Reuse existing active opening instead of creating a duplicate
        const existingOp = activeOpeningsMap.get(markerNum)!;
        openingId = existingOp.id;

        // Keep the opening details in sync with the marker if they were changed
        await prisma.opening.update({
          where: { id: openingId },
          data: {
            roomLocation: existingOp.roomLocation ?? marker.roomLocation ?? null,
            elevation: existingOp.elevation ?? marker.elevation ?? null,
            floorNumber: existingOp.floorNumber ?? marker.floorNumber ?? 1,
            width: existingOp.width ?? marker.width ?? null,
            height: existingOp.height ?? marker.height ?? null,
            unitedInches: existingOp.unitedInches ?? marker.unitedInches ?? null,
            productCategory: existingOp.productCategory ?? marker.windowType ?? null,
          },
        });
      } else {
        // Create new opening
        const newOpening = await prisma.opening.create({
          data: {
            appointmentId,
            openingNumber: nextNum++,
            companyId: companyId ?? undefined,
            roomLocation: marker.roomLocation ?? null,
            elevation: marker.elevation ?? null,
            floorNumber: marker.floorNumber ?? 1,
            width: marker.width ?? null,
            height: marker.height ?? null,
            unitedInches: marker.unitedInches ?? null,
            productType: marker.markerType === 'door' ? 'patio_door' : 'window',
            productCategory: marker.windowType ?? null,
          },
        });
        openingId = newOpening.id;
        createdIds.push(openingId);
      }

      // Create SketchMarkerLink (upsert by markerId unique)
      await prisma.sketchMarkerLink.upsert({
        where: { markerId: marker.id },
        create: {
          markerId: marker.id,
          openingId: openingId,
          companyId: companyId ?? undefined,
        },
        update: { openingId: openingId },
      });
    }

    // Recalculate pricing for the new openings
    try { await recalculatePricing(appointmentId); } catch (e) {
      console.error('Pricing recalc error after reconcile:', e);
    }

    await prisma.reviewActionLog.create({
      data: {
        companyId,
        userId,
        appointmentId,
        actionType: 'reconcile_openings',
        payload: JSON.stringify({ created: createdIds.length }),
      },
    });

    res.json({
      success: true,
      created: createdIds.length,
      message: `Created and linked ${createdIds.length} opening${createdIds.length !== 1 ? 's' : ''} from sketch markers.`,
    });

  } catch (error: any) {
    console.error('Error reconciling openings:', error);
    res.status(500).json({ error: error.message || 'Failed to reconcile openings' });
  }
});
