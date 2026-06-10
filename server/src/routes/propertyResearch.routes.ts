import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { propertyResearchService } from '../services/propertyResearch/propertyResearch.service.js';

const router = Router();

// ── 404 helper — routes planned but persistence not yet implemented ───────────
function notYetAvailable(res: any, feature: string) {
  return res.status(404).json({
    error: 'Not available',
    message: `${feature} requires a saved research profile. Use POST /from-address first.`,
  });
}

// POST /api/property-research/from-address
// Geocodes the address and returns lat/lng + research providers.
router.post('/from-address', requireAuth, async (req, res) => {
  try {
    const { address, lat, lng } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const results = await propertyResearchService.runFullResearch(address, lat, lng);

    // Return lat/lng so the frontend does not have to fall back to 0,0.
    const resolvedLat = (results as any)?.lat ?? lat ?? null;
    const resolvedLng = (results as any)?.lng ?? lng ?? null;

    res.json({
      address,
      lat: resolvedLat,
      lng: resolvedLng,
      providers: results,
      confidence: resolvedLat != null ? 'high' : 'low',
      warnings: resolvedLat == null ? ['Could not resolve coordinates for this address'] : [],
      status: 'success',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Sub-routes — planned; returns 404 until PropertyResearchProfile is persisted ─
router.get('/:id', requireAuth, (_req, res) => notYetAvailable(res, 'Property research by ID'));
router.post('/:id/refresh', requireAuth, (_req, res) => notYetAvailable(res, 'Property research refresh'));
router.get('/:id/sources', requireAuth, (_req, res) => notYetAvailable(res, 'Property research sources'));
router.post('/:id/analyze-images', requireAuth, (_req, res) => notYetAvailable(res, 'Image analysis'));
router.post('/:id/fuse-openings', requireAuth, (_req, res) => notYetAvailable(res, 'Opening fusion'));
router.get('/:id/opening-suggestions', requireAuth, (_req, res) => notYetAvailable(res, 'Opening suggestions'));
router.patch('/opening-suggestions/:suggestionId', requireAuth, (_req, res) => notYetAvailable(res, 'Opening suggestion update'));
router.post('/:id/opening-suggestions', requireAuth, (_req, res) => notYetAvailable(res, 'Opening suggestion creation'));
router.delete('/opening-suggestions/:suggestionId', requireAuth, (_req, res) => notYetAvailable(res, 'Opening suggestion deletion'));

export const propertyResearchRoutes = router;
