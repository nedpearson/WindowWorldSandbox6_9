import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeWindowPhotoForMeasurement } from '../services/photoMeasurementAnalysis.service.js';
import { calculateCushMeasure } from '../utils/cushMeasureCalc.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import type { Response } from 'express';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/measurements/photo-analysis
router.post('/photo-analysis', async (req, res) => {
  try {
    const { appointmentId, openingId, photoId, actualWidth, actualHeight, exteriorType, installType, imageUrlOrStoragePath } = req.body;

    if (!appointmentId || !photoId) {
      return res.status(400).json({ error: 'appointmentId and photoId are required' });
    }

    // 1. Run AI analysis
    const analysis = await analyzeWindowPhotoForMeasurement({
      appointmentId,
      openingId,
      photoId,
      imageUrlOrStoragePath,
      knownMeasurements: actualWidth && actualHeight ? { width: actualWidth, height: actualHeight } : undefined,
      exteriorType,
      installType
    });

    // 2. Fetch Cush Measure Rule to know we have it
    const rule = await prisma.measurementRule.findFirst({
      where: { name: 'Cush Measure' }
    });

    let revisedMeasurement = null;
    let actualMeasurement = null;

    if (actualWidth && actualHeight) {
      actualMeasurement = { width: actualWidth, height: actualHeight };
      const calcResult = calculateCushMeasure({
        actualWidth,
        actualHeight,
        exteriorType: analysis.exteriorTypeSuggestion || exteriorType
      });

      revisedMeasurement = {
        width: calcResult.revisedWidth,
        height: calcResult.revisedHeight
      };

      // Ensure Pro Tips mention the Cush Measure outcome
      analysis.measurementTips.push(`For ${calcResult.isBrick ? 'brick' : 'non-brick'}, Cush Measure deducted ${calcResult.deductionPerSide} inch per side.`);
    }

    // 3. Upsert MeasurementAdjustment
    let adjustmentId = 'new';
    if (openingId) {
      const opening = await prisma.opening.findUnique({ where: { id: openingId } });
      if (opening) {
        const adj = await prisma.measurementAdjustment.create({
          data: {
            appointmentId,
            openingId,
            openingNumber: opening.openingNumber,
            sourceType: 'ai_photo',
            rawWidth: actualWidth,
            rawHeight: actualHeight,
            adjWidth: revisedMeasurement?.width,
            adjHeight: revisedMeasurement?.height,
            widthTakeoff: revisedMeasurement ? (actualWidth - revisedMeasurement.width) : 0,
            heightTakeoff: revisedMeasurement ? (actualHeight - revisedMeasurement.height) : 0,
            ruleId: rule?.id,
            ruleStatus: 'pending_verification',
            confidence: analysis.confidence,
            approved: false,
            metadata: {
              photoId,
              suggestions: analysis.fieldPrefill,
              proTips: analysis.measurementTips
            }
          }
        });
        adjustmentId = adj.id;
      }
    }

    return res.json({
      success: true,
      analysisId: adjustmentId,
      suggestions: analysis.fieldPrefill,
      measurementRule: rule ? {
        name: rule.name,
        deductionPerSide: analysis.exteriorTypeSuggestion?.includes('brick') ? 0.5 : 0.375,
        totalWidthDeduction: analysis.exteriorTypeSuggestion?.includes('brick') ? 1.0 : 0.75,
        totalHeightDeduction: analysis.exteriorTypeSuggestion?.includes('brick') ? 1.0 : 0.75
      } : null,
      actualMeasurement,
      revisedMeasurement,
      proTips: analysis.measurementTips,
      tapeReading: analysis.tapeReading,
      confidence: analysis.confidence,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Photo analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze photo' });
  }
});

// POST /api/measurements/:measurementId/verify-ai-suggestions
router.patch('/:measurementId/verify-ai-suggestions', async (req, res) => {
  try {
    const { measurementId } = req.params;
    const { actualWidth, actualHeight, revisedWidth, revisedHeight, acceptedSuggestions, userId } = req.body;

    const adj = await prisma.measurementAdjustment.findUnique({
      where: { id: measurementId }
    });

    if (!adj) {
      return res.status(404).json({ error: 'Measurement adjustment not found' });
    }

    // 1. Mark adjustment as approved
    await prisma.measurementAdjustment.update({
      where: { id: measurementId },
      data: {
        rawWidth: actualWidth,
        rawHeight: actualHeight,
        adjWidth: revisedWidth,
        adjHeight: revisedHeight,
        approved: true,
        approvedBy: userId || 'system',
        approvedAt: new Date(),
        ruleStatus: 'verified'
      }
    });

    // 2. Update the actual Opening with the finalized revised measurements and suggestions
    if (adj.openingId) {
      const updateData: any = {
        width: revisedWidth,
        height: revisedHeight,
        measurementConfirmed: true
      };
      if (acceptedSuggestions) {
        if (acceptedSuggestions.windowType) updateData.windowType = acceptedSuggestions.windowType;
        if (acceptedSuggestions.exteriorType) {
          updateData.exteriorType = acceptedSuggestions.exteriorType;
          updateData.exteriorSurface = acceptedSuggestions.exteriorType;
        }
        if (acceptedSuggestions.gridOption && acceptedSuggestions.gridOption !== 'none') {
          updateData.gridPattern = acceptedSuggestions.gridOption;
          updateData.gridStyle = acceptedSuggestions.gridOption;
        }
      }
      
      await prisma.opening.update({
        where: { id: adj.openingId },
        data: updateData
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Verify suggestions error:', error);
    res.status(500).json({ error: 'Failed to verify suggestions' });
  }
});

// ── POST /api/measurements/multi-point ──────────────────────────────────────
//
// Save a full multi-point measurement session for an opening.
// Performs idempotency dedup via idempotencyKey.
// Updates Opening.width/height with the final adjusted values.
//
// Body: { appointmentId, openingId, widthTop, widthMiddle, widthBottom,
//         heightLeft, heightCenter, heightRight, adjWidth, adjHeight,
//         widthTakeoff, heightTakeoff, ruleId, sizingMethod,
//         smallestWidthPoint, smallestHeightPoint, widthVarianceInches,
//         heightVarianceInches, obstructionDetected, obstructionType,
//         obstructionNotes, manualOverride, overrideReason, idempotencyKey }
//
router.post('/multi-point', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const companyId = req.user!.companyId;
    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    const {
      appointmentId,
      openingId,
      openingNumber,
      widthTop,
      widthMiddle,
      widthBottom,
      heightLeft,
      heightCenter,
      heightRight,
      adjWidth,
      adjHeight,
      widthTakeoff = 0,
      heightTakeoff = 0,
      ruleId,
      sizingMethod = 'smallest_opening',
      smallestWidthPoint,
      smallestHeightPoint,
      widthVarianceInches,
      heightVarianceInches,
      obstructionDetected = false,
      obstructionType,
      obstructionNotes,
      manualOverride = false,
      overrideReason,
      idempotencyKey,
    } = req.body;

    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

    // Validate appointment access
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, user: { companyId } },
      select: { id: true },
    });
    if (!appt) return res.status(403).json({ error: 'Access denied to appointment' });

    // Idempotency dedup — compare metadata JSON to avoid processing duplicates
    if (idempotencyKey) {
      const existing = await prisma.measurementAdjustment.findFirst({
        where: {
          metadata: {
            equals: { idempotencyKey } as Prisma.InputJsonValue,
          },
        },
      });
      if (existing) return res.status(200).json(existing);
    }

    // Resolve openingNumber if we only have openingId
    let resolvedOpeningNumber = openingNumber;
    if (!resolvedOpeningNumber && openingId) {
      const op = await prisma.opening.findUnique({ where: { id: openingId }, select: { openingNumber: true } });
      resolvedOpeningNumber = op?.openingNumber ?? 1;
    }

    // needsReview = any axis has variance > 1/4"
    const TOLERANCE = 0.25;
    const needsVerification =
      (widthVarianceInches !== undefined && widthVarianceInches !== null && widthVarianceInches > TOLERANCE) ||
      (heightVarianceInches !== undefined && heightVarianceInches !== null && heightVarianceInches > TOLERANCE) ||
      manualOverride;

    // Upsert MeasurementAdjustment (one per openingId)
    let adj;
    if (openingId) {
      adj = await prisma.measurementAdjustment.upsert({
        where: {
          // There's no unique constraint — use findFirst+create pattern
          id: (await prisma.measurementAdjustment.findFirst({
            where: { openingId, appointmentId },
            select: { id: true },
          }))?.id ?? 'new-will-create',
        },
        update: {
          widthTop: widthTop ?? undefined,
          widthMiddle: widthMiddle ?? undefined,
          widthBottom: widthBottom ?? undefined,
          heightLeft: heightLeft ?? undefined,
          heightCenter: heightCenter ?? undefined,
          heightRight: heightRight ?? undefined,
          rawWidth: smallestWidthPoint ? (widthTop !== undefined ? widthTop : null) : undefined,
          rawHeight: smallestHeightPoint ? (heightLeft !== undefined ? heightLeft : null) : undefined,
          adjWidth: adjWidth ?? undefined,
          adjHeight: adjHeight ?? undefined,
          widthTakeoff,
          heightTakeoff,
          ruleId: ruleId ?? undefined,
          ruleStatus: 'verified',
          approved: true,
          approvedBy: userId,
          approvedAt: new Date(),
          overrideReason: overrideReason ?? undefined,
          sizingMethod,
          smallestWidthPoint: smallestWidthPoint ?? undefined,
          smallestHeightPoint: smallestHeightPoint ?? undefined,
          measurementConfirmed: true,
          obstructionDetected,
          obstructionType: obstructionType ?? undefined,
          obstructionNotes: obstructionNotes ?? undefined,
          widthVarianceInches: widthVarianceInches ?? undefined,
          heightVarianceInches: heightVarianceInches ?? undefined,
          manualOverride,
          warnings: needsVerification
            ? ['Opening varies > 1/4" — review before contract']
            : [],
          metadata: idempotencyKey ? { idempotencyKey } : undefined,
        },
        create: {
          appointmentId,
          openingId,
          openingNumber: resolvedOpeningNumber ?? 1,
          sourceType: manualOverride ? 'manual' : 'bluetooth_ble',
          widthTop: widthTop ?? undefined,
          widthMiddle: widthMiddle ?? undefined,
          widthBottom: widthBottom ?? undefined,
          heightLeft: heightLeft ?? undefined,
          heightCenter: heightCenter ?? undefined,
          heightRight: heightRight ?? undefined,
          adjWidth: adjWidth ?? undefined,
          adjHeight: adjHeight ?? undefined,
          widthTakeoff,
          heightTakeoff,
          ruleId: ruleId ?? undefined,
          ruleStatus: 'verified',
          approved: true,
          approvedBy: userId,
          approvedAt: new Date(),
          overrideReason: overrideReason ?? undefined,
          sizingMethod,
          smallestWidthPoint: smallestWidthPoint ?? undefined,
          smallestHeightPoint: smallestHeightPoint ?? undefined,
          measurementConfirmed: true,
          obstructionDetected,
          obstructionType: obstructionType ?? undefined,
          obstructionNotes: obstructionNotes ?? undefined,
          widthVarianceInches: widthVarianceInches ?? undefined,
          heightVarianceInches: heightVarianceInches ?? undefined,
          manualOverride,
          warnings: needsVerification
            ? ['Opening varies > 1/4" — review before contract']
            : [],
          metadata: idempotencyKey ? { idempotencyKey } : undefined,
        },
      });
    } else {
      // No openingId — create without upsert
      adj = await prisma.measurementAdjustment.create({
        data: {
          appointmentId,
          openingNumber: resolvedOpeningNumber ?? 1,
          sourceType: 'manual',
          widthTop: widthTop ?? undefined,
          widthMiddle: widthMiddle ?? undefined,
          widthBottom: widthBottom ?? undefined,
          heightLeft: heightLeft ?? undefined,
          heightCenter: heightCenter ?? undefined,
          heightRight: heightRight ?? undefined,
          adjWidth: adjWidth ?? undefined,
          adjHeight: adjHeight ?? undefined,
          widthTakeoff,
          heightTakeoff,
          ruleId: ruleId ?? undefined,
          ruleStatus: 'verified',
          sizingMethod,
          smallestWidthPoint: smallestWidthPoint ?? undefined,
          smallestHeightPoint: smallestHeightPoint ?? undefined,
          measurementConfirmed: true,
          obstructionDetected,
          widthVarianceInches: widthVarianceInches ?? undefined,
          heightVarianceInches: heightVarianceInches ?? undefined,
          manualOverride,
          warnings: needsVerification ? ['Opening varies > 1/4"'] : [],
          metadata: idempotencyKey ? { idempotencyKey } : undefined,
        },
      });
    }

    // Update Opening with final adjusted width/height
    // width/height = final order dimensions (after deduction).
    // rawWidth/rawHeight = smallest raw measurement (before deduction) — for audit.
    if (openingId && adjWidth != null && adjHeight != null) {
      await prisma.opening.update({
        where: { id: openingId },
        data: {
          // final adjusted = what gets ordered
          width: adjWidth,
          height: adjHeight,
          // raw = smallest captured measurement before deduction
          rawWidth: (widthTop !== undefined && widthMiddle !== undefined && widthBottom !== undefined)
            ? Math.min(
                ...[widthTop, widthMiddle, widthBottom].filter((v): v is number => v != null && v > 0)
              )
            : undefined,
          rawHeight: (heightLeft !== undefined && heightCenter !== undefined && heightRight !== undefined)
            ? Math.min(
                ...[heightLeft, heightCenter, heightRight].filter((v): v is number => v != null && v > 0)
              )
            : undefined,
          widthDeductionInches: widthTakeoff,
          heightDeductionInches: heightTakeoff,
          widthRuleApplied: ruleId,
          heightRuleApplied: ruleId,
          measurementMethod: sizingMethod,
          measurementConfirmed: true,
          needsVerification,
        },
      });
    }

    res.status(201).json({ success: true, adjustmentId: adj.id, needsVerification });
  } catch (err: any) {
    console.error('multi-point save error:', err);
    res.status(500).json({ error: 'Failed to save multi-point measurement', details: err.message });
  }
});

// ── GET /api/measurements/opening/:openingId/multi-point ─────────────────────
//
// Fetch the latest multi-point measurement session for an opening.
//
router.get('/opening/:openingId/multi-point', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) return res.status(403).json({ error: 'User has no company' });

    const adj = await prisma.measurementAdjustment.findFirst({
      where: { openingId: String(req.params.openingId) },
      orderBy: { createdAt: 'desc' },
    });

    if (!adj) return res.status(404).json({ error: 'No multi-point session found' });

    res.json(adj);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch multi-point session' });
  }
});

export default router;
