import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { VISUALIZER_CATALOG, buildVisualizerPrompt, saveVisualizerImage, type VisualizerOptions } from '../services/aiVisualizer.js';

export const visualizerRoutes = Router();
visualizerRoutes.use(requireAuth);

// ── Get product catalog for visualizer ──
visualizerRoutes.get('/catalog', (_req, res) => {
  res.json(VISUALIZER_CATALOG);
});

// ── Generate AI preview — routes through credit gateway ──────────────
visualizerRoutes.post('/generate/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const { imageData, options } = req.body as { imageData: string; options: VisualizerOptions };
    if (!imageData) return res.status(400).json({ error: 'imageData (base64) is required' });
    if (!options?.category) return res.status(400).json({ error: 'options.category is required' });

    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.userId;

    const { prisma } = await import('../index.js');
    const { callAI } = await import('../services/aiGateway.js');
    const { AI_MODELS } = await import('../config/aiModels.js');

    // Resolve companyId server-side
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });
    const companyId = (userRecord?.companyId ?? userId) as string;

    // Validate appointment ownership
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { user: { select: { companyId: true } } },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const isAdminOrManager = ['admin', 'manager', 'super_admin'].includes(userRecord?.role || '');
    if (!isAdminOrManager) {
      const apptCompanyId = (appt as any).user?.companyId;
      if (!companyId || !apptCompanyId || companyId !== apptCompanyId) {
        return res.status(403).json({ error: 'Access denied to this appointment' });
      }
    }

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const prompt = buildVisualizerPrompt(options);

    // Route through AI gateway for credit enforcement, caching, and usage logging
    const gatewayResult = await callAI({
      feature: 'visualizer_preview',
      userId,
      companyId,
      input: prompt,
      imageBase64: base64,
      imageMimeType: 'image/jpeg',
      forceModel: AI_MODELS.imageAnalysisModel || 'gemini-2.0-flash-exp',
      // Cache key includes appointment + options so identical requests are cached
      cacheKey: `${appointmentId}:${JSON.stringify(options)}`,
    });

    if (gatewayResult.status === 'blocked') {
      return res.status(402).json({
        status: 'blocked',
        error: gatewayResult.error,
        upgradeUrl: gatewayResult.upgradeUrl,
      });
    }

    if (gatewayResult.status === 'unavailable') {
      // Graceful fallback: tell frontend to use overlay mode
      return res.json({ status: 'fallback', prompt, error: 'AI visualizer not configured.' });
    }

    if (gatewayResult.status === 'error') {
      return res.status(500).json({ error: 'Generation failed. Please try again.' });
    }

    // Gateway result for image generation returns the raw text/json —
    // For the visualizer we need the actual Gemini image response.
    // Fall back to direct Gemini image generation (not JSON mode) since
    // the gateway uses JSON response mode which doesn't support IMAGE modality.
    // We still went through the gateway for: credit check, caching of prompt, logging.
    // Now call the image-specific path for the actual image bytes.
    const { generateVisualizerPreview } = await import('../services/aiVisualizer.js');
    const result = await generateVisualizerPreview(base64, options);

    if (result.status === 'success' && result.generatedImageBase64) {
      const savedPath = saveVisualizerImage(appointmentId, result.generatedImageBase64);
      return res.json({
        status: 'success',
        generatedImage: `data:image/png;base64,${result.generatedImageBase64}`,
        savedPath,
        prompt: result.prompt,
        cached: gatewayResult.cached,
        creditsUsed: gatewayResult.creditsUsed,
      });
    }

    return res.json({ ...result, cached: false });
  } catch (err: any) {
    console.error('[visualizer] Generate error:', err?.message);
    return res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
});

// ── Save original photo (authenticated + ownership-validated) ────────
visualizerRoutes.post('/photo/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const { imageData, photoType, openingId, sketchObjectId, elevation, markerNumber } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'imageData (base64 string) is required' });
    }

    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.userId;

    const { prisma } = await import('../index.js');

    // Resolve companyId server-side — never trust client
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });
    const userCompanyId = (requestingUser?.companyId ?? null) as string | null;

    // Validate appointment ownership — prevent cross-company spoofing
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { userId: true, user: { select: { companyId: true } } },
    });

    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const apptCompanyId = (appt as any).user?.companyId;
    const isAdminOrManager = ['admin', 'manager', 'super_admin'].includes(requestingUser?.role || '');

    if (!isAdminOrManager) {
      if (!userCompanyId || !apptCompanyId || userCompanyId !== apptCompanyId) {
        return res.status(403).json({ error: 'Access denied to this appointment' });
      }
    }

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Try cloud storage first
    const { isStorageConfigured, uploadVisualizerImage } = await import('../services/storageService.js');
    
    let savedPath = '';
    let publicUrl = '';

    if (isStorageConfigured()) {
      const uploadResult = await uploadVisualizerImage(
        userCompanyId || 'default_company',
        appointmentId,
        base64,
        photoType || 'original'
      );
      savedPath = uploadResult.path;
      publicUrl = uploadResult.url || '';
    } else {
      // Fallback to local
      savedPath = saveVisualizerImage(appointmentId, base64, photoType || 'original');
      publicUrl = savedPath;
    }

    const photo = await prisma.openingPhoto.create({
      data: {
        appointmentId,
        openingId: (openingId as string) || undefined,
        sketchObjectId: (sketchObjectId as string) || undefined,
        elevation: (elevation as string) || undefined,
        markerNumber: markerNumber ? Number(markerNumber) : undefined,
        photoType: (photoType as string) || 'other',
        storagePath: savedPath,
        originalUrl: publicUrl || savedPath,
        companyId: userCompanyId || undefined,
        uploadedBy: userId,
      },
    });

    return res.json({ success: true, path: savedPath, photoId: photo.id, url: publicUrl });
  } catch (err: any) {
    console.error('[visualizer] Photo save error:', err?.message);
    return res.status(500).json({ error: 'Photo save failed' });
  }
});
