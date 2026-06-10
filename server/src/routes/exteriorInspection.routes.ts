import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { InstallMethodAdvisorService } from '../services/installMethodAdvisor.service.js';

export const exteriorInspectionRoutes = Router();
exteriorInspectionRoutes.use(requireAuth);

// POST /api/exterior-inspections
exteriorInspectionRoutes.post('/', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { appointmentId, customerId, status } = req.body;
    
    // Check if exists
    let inspection = await prisma.exteriorInspection.findFirst({
      where: { appointmentId, userId: authReq.user.userId }
    });

    if (!inspection) {
      inspection = await prisma.exteriorInspection.create({
        data: {
          companyId: (authReq.user as any).companyId || 'ww-demo',
          userId: authReq.user.userId,
          appointmentId,
          customerId,
          status: status || 'pending'
        }
      });
    }

    res.json(inspection);
  } catch (err: any) {
    console.error('Error creating exterior inspection:', err);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

// GET /api/exterior-inspections/appointment/:appointmentId
exteriorInspectionRoutes.get('/appointment/:appointmentId', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const inspection = await prisma.exteriorInspection.findFirst({
      where: { appointmentId: req.params.appointmentId, userId: authReq.user.userId }
    });
    res.json(inspection || { error: 'Not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// POST /api/exterior-inspections/:id/openings
exteriorInspectionRoutes.post('/:id/openings', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const inspection = await prisma.exteriorInspection.findUnique({
      where: { id: req.params.id }
    });

    if (!inspection || inspection.userId !== authReq.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { elevation, openingLabel, existingWindowType, exteriorSurface, existingInstallStyle, homeownerFinishPreference } = req.body;

    // Use Advisor
    const advice = InstallMethodAdvisorService.advise({
      exteriorSurface,
      existingInstallStyle,
      homeownerFinishPreference
    });

    const opening = await prisma.exteriorInspectionOpening.create({
      data: {
        companyId: inspection.companyId,
        inspectionId: inspection.id,
        elevation,
        openingLabel,
        existingWindowType,
        exteriorSurface,
        existingInstallStyle,
        finishPreference: homeownerFinishPreference,
        recommendedInstallMethod: advice.recommendedMethod,
        costEffectiveRecommendation: advice.costEffectiveMethod,
        premiumFinishRecommendation: advice.premiumFinishMethod,
        laborFlagsJson: advice.laborFlags,
        notes: advice.talkingPoints.join(' | ')
      }
    });

    // Create Final Review items for labor flags
    for (const flag of advice.laborFlags) {
      await prisma.finalReviewItem.create({
        data: {
          companyId: inspection.companyId,
          appointmentId: inspection.appointmentId,
          sourceType: 'exterior-inspection',
          sourceId: opening.id,
          severity: 'Review Later',
          category: 'Labor',
          message: flag,
          status: 'pending'
        }
      });
    }

    res.json(opening);
  } catch (err: any) {
    console.error('Error creating inspection opening:', err);
    res.status(500).json({ error: 'Failed to create inspection opening' });
  }
});
