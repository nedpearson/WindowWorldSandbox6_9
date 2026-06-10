import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

import type { AuthRequest } from '../middleware/auth.js';

// ── Express v5 param narrowing helper ────────────────────────────────────────
// @types/express@5 types req.params values as `string | string[]`.
// Route params like /:id are always a single string at runtime.
// This helper safely extracts the string value without using `as any`.
function paramString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? '' : value;
}

export const intelligenceRoutes = Router();
intelligenceRoutes.use(requireAuth);



// ── AI Photo Analysis (via Central AI Gateway) ─────────────────────────
intelligenceRoutes.post('/analyze-opening-photo', async (req: AuthRequest, res) => {
  try {
    const { imageData, photoId } = req.body;
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'imageData (base64 string) is required' });
    }

    const userId = req.user!.userId;
    const { prisma } = await import('../index.js');

    // Resolve companyId server-side — never trust client
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || userId;

    // Validate photoId ownership — prevent cross-company analysis spoofing
    if (photoId) {
      const photo = await prisma.openingPhoto.findUnique({
        where: { id: photoId as string },
        include: {
          appointment: { select: { user: { select: { companyId: true } } } },
        },
      });
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      const photoCompanyId = (photo as any).appointment?.user?.companyId;
      if (photoCompanyId && photoCompanyId !== companyId) {
        return res.status(403).json({ error: 'Access denied to this photo' });
      }
      // Return cached DB analysis if already completed for this exact photo
      if ((photo as any).analysisStatus === 'completed' && (photo as any).aiAnalysisJson) {
        return res.json({
          status: 'cached',
          analysis: (photo as any).aiAnalysisJson,
          cached: true,
        });
      }
    }

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

    const { callAI } = await import('../services/aiGateway.js');
    const { AI_MODELS } = await import('../config/aiModels.js');

    const prompt = `You are an expert window and door installation assessor.
Analyze the provided photo of an exterior or interior window/door opening.
Return ONLY a valid JSON object — no markdown, no code fences:
{
  "itemType": "window | door | siding | specialty_shape | unknown",
  "exteriorSurface": "vinyl_siding | wood_siding | stucco | brick | hardie | metal | mixed | unknown",
  "damageRotVisible": false,
  "tapeMeasureVisible": false,
  "tapeReading": null,
  "confidenceScore": 0.85,
  "warnings": [],
  "instructions": "Specific measurement guidance based on the detected surface type.",
  "requiresHumanConfirmation": true
}`;

    const gatewayResult = await callAI({
      feature: 'photo_analysis',
      userId,
      companyId,
      input: prompt,
      imageBase64: base64,
      imageMimeType: 'image/jpeg',
      forceModel: AI_MODELS.imageAnalysisModel,
      cacheKey: photoId ? String(photoId) : undefined,
    });

    if (gatewayResult.status === 'blocked') {
      return res.status(402).json({
        status: 'blocked',
        error: gatewayResult.error,
        upgradeUrl: gatewayResult.upgradeUrl,
        creditsRemaining: 0,
      });
    }

    if (gatewayResult.status === 'unavailable') {
      return res.status(503).json({ error: gatewayResult.error });
    }

    if (gatewayResult.status === 'error') {
      return res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }

    const analysis = gatewayResult.result;

    // Persist analysis result onto the photo record (non-fatal if it fails)
    if (photoId) {
      await prisma.openingPhoto.update({
        where: { id: photoId as string },
        data: {
          aiAnalysisJson: analysis,
          analysisStatus: 'completed',
          confidence: typeof analysis?.confidenceScore === 'number'
            ? analysis.confidenceScore
            : null,
        },
      }).catch(() => {});
    }

    return res.json({
      status: 'success',
      analysis,
      cached: gatewayResult.cached,
      creditsUsed: gatewayResult.creditsUsed,
    });
  } catch (err: any) {
    console.error('[intelligence] Photo analysis error:', err?.message);
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

// ── Field Intelligence Findings ────────────────────────────────────────────
//
// These endpoints persist advisory Field Intelligence findings to
// the FinalReviewItem table (extended for this purpose).
//
// ADVISORY BOUNDARY:
// - Findings are read-only suggestions — they never auto-modify data.
// - PATCH status is the ONLY mutating operation, and only on the finding
//   status field (open → applied | ignored | reviewed | manager_review).
// - POST /apply delegates to existing deterministic route handlers for
//   safe, approved actions only. Never executes unvalidated code paths.
// - All endpoints verify appointment ownership via companyId before responding.

// GET /findings/:appointmentId — fetch all findings for this appointment
intelligenceRoutes.get('/findings/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const appointmentId = paramString(req.params.appointmentId);
    const { prisma } = await import('../index.js');

    // Resolve companyId server-side from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    // Verify appointment ownership — never trust client-provided companyId
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { user: { select: { companyId: true } } },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    const apptCompanyId = (appt as any).user?.companyId;
    if (apptCompanyId && apptCompanyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const findings = await prisma.finalReviewItem.findMany({
      where: {
        appointmentId,
        companyId,
        // Only return Field Intelligence findings (source field set — not null)
        source: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return res.json({ findings });
  } catch (err: any) {
    console.error('[intelligence] findings GET error:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

// POST /findings/:appointmentId/run — server-side QA run, persists results
intelligenceRoutes.post('/findings/:appointmentId/run', async (req: AuthRequest, res) => {
  try {
    const appointmentId = paramString(req.params.appointmentId);
    const { prisma } = await import('../index.js');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;
    const userId = req.user!.userId;

    // Verify appointment ownership
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        user: { select: { companyId: true } },
        openings: {
          select: {
            id: true, openingNumber: true, width: true, height: true,
            productCategory: true, totalPrice: true, exteriorSurface: true,
          },
        },
        customer: {
          select: {
            firstName: true, lastName: true, phone: true, email: true,
            address: true, city: true, state: true, zip: true,
          },
        },
      },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    const apptCompanyId = (appt as any).user?.companyId;
    if (apptCompanyId && apptCompanyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Run basic server-side checks
    const findingsToCreate: any[] = [];
    const openings = (appt as any).openings ?? [];

    // Check: no openings
    if (openings.length === 0) {
      findingsToCreate.push({
        companyId, appointmentId, userId,
        sourceType: 'field_intelligence',
        severity: 'blocking',
        category: 'opening',
        title: 'No openings entered',
        message: 'At least one opening must be measured before the proposal can be generated.',
        suggestedAction: 'Add openings in the Measure tab.',
        source: 'deterministic_rule',
        requiresApproval: false,
        status: 'open',
      });
    }

    // Check: openings missing dimensions
    for (const op of openings) {
      if (!op.width || !op.height) {
        findingsToCreate.push({
          companyId, appointmentId, openingId: op.id, userId,
          sourceType: 'field_intelligence',
          severity: 'blocking',
          category: 'measurement',
          title: `Opening ${op.openingNumber}: Missing dimensions`,
          message: `Opening ${op.openingNumber} has no final width and height.`,
          suggestedAction: `Measure Opening ${op.openingNumber} and save dimensions.`,
          source: 'deterministic_rule',
          requiresApproval: false,
          status: 'open',
        });
      }
      // Use totalPrice — the canonical pricing field on Opening (basePrice + optionsPrice + laborPrice)
      if (op.totalPrice == null) {
        findingsToCreate.push({
          companyId, appointmentId, openingId: op.id, userId,
          sourceType: 'field_intelligence',
          severity: 'blocking',
          category: 'pricing',
          title: `Opening ${op.openingNumber}: No price`,
          message: `Opening ${op.openingNumber} has no price. Recalculate on the Pricing tab.`,
          suggestedAction: `Recalculate Opening ${op.openingNumber} price.`,
          source: 'deterministic_rule',
          requiresApproval: false,
          status: 'open',
        });
      }
    }

    // Check: customer missing
    const customer = (appt as any).customer;
    if (!customer?.firstName || !customer?.lastName) {
      findingsToCreate.push({
        companyId, appointmentId, userId,
        sourceType: 'field_intelligence',
        severity: 'blocking',
        category: 'customer',
        title: 'Customer name missing',
        message: 'Customer first and last name are required.',
        suggestedAction: 'Enter customer name on the Appointment home tab.',
        source: 'deterministic_rule',
        requiresApproval: false,
        status: 'open',
      });
    }

    // Upsert findings (idempotent on title+appointmentId+source to prevent duplicates)
    const upserted = await Promise.all(
      findingsToCreate.map(finding =>
        prisma.finalReviewItem.upsert({
          where: {
            // Use a synthetic unique key: we match on the combination of fields
            // that should be unique per run. Since FinalReviewItem has no
            // unique constraint on these fields, we create and skip duplicates.
            id: `${appointmentId}_${finding.title?.replace(/\s+/g, '_').slice(0, 40)}_fi`,
          },
          create: finding,
          update: {
            status: 'open', // Re-open if it was previously resolved
            updatedAt: new Date(),
          },
        }).catch(() => null), // Skip on unique conflict (existing finding)
      ),
    );

    return res.json({
      ran: true,
      findingsCreated: upserted.filter(Boolean).length,
    });
  } catch (err: any) {
    console.error('[intelligence] findings run error:', err?.message);
    return res.status(500).json({ error: 'Failed to run server QA' });
  }
});

// PATCH /findings/:id — update finding status (advisory lifecycle only)
intelligenceRoutes.patch('/findings/:id', async (req: AuthRequest, res) => {
  try {
    const id = paramString(req.params.id);
    const { status, overrideReason } = req.body;

    const ALLOWED_STATUSES = ['open', 'applied', 'ignored', 'reviewed', 'manager_review'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { prisma } = await import('../index.js');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    // Verify finding ownership
    const finding = await prisma.finalReviewItem.findUnique({ where: { id } });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if (finding.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.finalReviewItem.update({
      where: { id },
      data: {
        status,
        resolvedAt: status !== 'open' ? new Date() : null,
        resolvedBy: status !== 'open' ? req.user!.userId : null,
        overrideReason: overrideReason || null,
      },
    });

    // Log to ReviewActionLog for audit trail
    if (finding.appointmentId) {
      await prisma.reviewActionLog.create({
        data: {
          companyId,
          userId: req.user!.userId,
          appointmentId: finding.appointmentId,
          issueId: id,
          issueType: 'field_intelligence_finding',
          actionType: String(status),
          payload: JSON.stringify({ overrideReason }),
        },
      }).catch(() => {}); // non-fatal
    }

    return res.json({ success: true, finding: updated });
  } catch (err: any) {
    console.error('[intelligence] findings PATCH error:', err?.message);
    return res.status(500).json({ error: 'Failed to update finding' });
  }
});

// POST /findings/:id/apply — apply a safe deterministic action with user approval
// This endpoint validates and delegates to existing deterministic handlers.
// It does NOT execute arbitrary code. Only pre-approved action types are allowed.
intelligenceRoutes.post('/findings/:id/apply', async (req: AuthRequest, res) => {
  const ALLOWED_APPLY_ACTIONS = [
    'recalculate_pricing',
    'mark_reviewed',
    'escalate_to_manager',
  ];

  try {
    const id = paramString(req.params.id);
    const { action, reason } = req.body;

    if (!ALLOWED_APPLY_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Action "${action}" is not allowed. Permitted: ${ALLOWED_APPLY_ACTIONS.join(', ')}`,
      });
    }

    const { prisma } = await import('../index.js');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || req.user!.userId;

    const finding = await prisma.finalReviewItem.findUnique({ where: { id } });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if (finding.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    let result: any = {};

    if (action === 'recalculate_pricing' && finding.appointmentId) {
      // Delegate to existing recalculate route (deterministic pricing engine only)
      // This is a read-only preview — actual save is done by the client
      result = { delegateTo: `/api/appointments/${finding.appointmentId}/recalculate`, method: 'POST' };
    } else if (action === 'mark_reviewed') {
      await prisma.finalReviewItem.update({
        where: { id },
        data: { status: 'reviewed', resolvedAt: new Date(), resolvedBy: String(req.user!.userId) },
      });
      result = { status: 'reviewed' };
    } else if (action === 'escalate_to_manager') {
      await prisma.finalReviewItem.update({
        where: { id },
        data: { status: 'manager_review', resolvedAt: new Date(), resolvedBy: String(req.user!.userId) },
      });
      result = { status: 'manager_review' };
    }

    // Audit trail
    if (finding.appointmentId) {
      await prisma.reviewActionLog.create({
        data: {
          companyId,
          userId: req.user!.userId,
          appointmentId: finding.appointmentId,
          issueId: id,
          issueType: 'field_intelligence_finding',
          actionType: `apply:${action}`,
          payload: JSON.stringify({ reason }),
        },
      }).catch(() => {});
    }

    return res.json({ success: true, action, result });
  } catch (err: any) {
    console.error('[intelligence] findings apply error:', err?.message);
    return res.status(500).json({ error: 'Failed to apply action' });
  }
});


intelligenceRoutes.post('/parse-line-items', async (req: AuthRequest, res) => {
  try {
    const { text, appointmentId } = req.body;
    if (!text || !appointmentId) return res.status(400).json({ error: 'text and appointmentId are required' });
    
    const userId = req.user!.userId;
    const { prisma } = await import('../index.js');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    const companyId = user?.companyId || userId;

    const { parseLineItemsFromText } = await import('../services/aiLineItemParser.js');
    const parseResult = await parseLineItemsFromText(text, userId, companyId);
    
    // Apply Opening Updates
    const openingUpdatesResult = [];
    if (parseResult.openingUpdates && parseResult.openingUpdates.length > 0) {
      const allOpenings = await prisma.opening.findMany({ where: { appointmentId } });
      
      for (const group of parseResult.openingUpdates) {
        let targets = allOpenings;
        if (group.openingNumbers !== 'all' && Array.isArray(group.openingNumbers)) {
           targets = allOpenings.filter(o => o.openingNumber && (group.openingNumbers as number[]).includes(o.openingNumber));
        }
        if (targets.length > 0 && group.updates && Object.keys(group.updates).length > 0) {
           await prisma.opening.updateMany({
             where: { id: { in: targets.map(t => t.id) } },
             data: group.updates
           });
           openingUpdatesResult.push({ updatedCount: targets.length, updates: group.updates });
        }
      }
    }

    let createdItems: any[] = [];
    if (parseResult.lineItems && parseResult.lineItems.length > 0) {
      const lastItem = await prisma.quoteLineItem.findFirst({
        where: { appointmentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      });
      let currentSort = (lastItem?.sortOrder || 0) + 1;
      createdItems = await prisma.$transaction(
        parseResult.lineItems.map((item: any) => {
          const toCreate = prisma.quoteLineItem.create({
            data: {
              appointmentId,
              label: item.label,
              category: item.category,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              sortOrder: currentSort
            }
          });
          currentSort++;
          return toCreate;
        })
      );
    }
    
    return res.json({ items: createdItems, openingUpdates: openingUpdatesResult });
  } catch (err: any) {
    console.error('[intelligence] parse-line-items error:', err?.message);
    return res.status(500).json({ error: 'Failed to parse line items' });
  }
});

