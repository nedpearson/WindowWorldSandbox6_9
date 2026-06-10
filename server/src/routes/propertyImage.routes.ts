// ═══════════════════════════════════════════════════════════════
// Property Image Routes
// POST /api/property-image/from-address  — fetch + cache image metadata
// GET  /api/property-image/proxy/:cacheId — stream image bytes (no key exposed)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { googlePropertyImageService } from '../services/googlePropertyImage.service.js';
import { prisma } from '../index.js';

export const propertyImageRoutes = Router();
propertyImageRoutes.use(requireAuth);

// ── Helpers ──────────────────────────────────────────────────────

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.companyId ?? null;
}

// ── POST /from-address ────────────────────────────────────────────
// Geocodes address, fetches best image, caches result, returns proxy URL.
propertyImageRoutes.post('/from-address', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { address, appointmentId, customerId } = req.body;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ success: false, error: 'Address is required.' });
    }

    const companyId = await getCompanyId(userId);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'User must belong to a company.' });
    }

    const normAddress = normalizeAddress(address);

    // Check cache (valid static_map rows only — street_view rows are proxied fresh each time)
    const cached = await prisma.propertyImageCache.findFirst({
      where: { companyId, normalizedAddress: normAddress, status: 'success' },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      console.log(`[PropertyImage] Cache HIT for "${normAddress}"`);
      return res.json({
        success: true,
        source: cached.source,
        address,
        formattedAddress: cached.formattedAddress,
        lat: cached.lat,
        lng: cached.lng,
        // Return proxy URL — never expose raw Google URL with key
        imageUrl: `/api/property-image/proxy/${cached.id}`,
        warnings: [],
      });
    }

    // Cache miss — fetch from Google
    console.log(`[PropertyImage] Cache MISS for "${normAddress}", fetching…`);
    let result;
    try {
      result = await googlePropertyImageService.getBestPropertyImage(address);
    } catch (googleErr: any) {
      console.error('[PropertyImage] Google API error:', googleErr.message);
      if (googleErr.message?.includes('not configured')) {
        return res.status(500).json({ success: false, error: googleErr.message });
      }
      return res.status(404).json({
        success: false,
        error: 'Could not find a property image for this address. Try a different address or sketch manually.',
        fallback: 'manual_sketch',
      });
    }

    // Save to cache — store the raw Google URL in DB (server-side only, never sent to client)
    const cacheRow = await prisma.propertyImageCache.create({
      data: {
        companyId,
        customerId: customerId || null,
        appointmentId: appointmentId || null,
        normalizedAddress: normAddress,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        source: result.source,
        imageUrl: result.imageUrl,   // raw Google URL stored in DB only
        status: 'success',
        createdById: userId,
      },
    });

    return res.json({
      success: true,
      source: result.source,
      address,
      formattedAddress: result.formattedAddress,
      lat: result.lat,
      lng: result.lng,
      // Return proxy URL — the client never sees the Google API key
      imageUrl: `/api/property-image/proxy/${cacheRow.id}`,
      warnings: [],
    });

  } catch (err: any) {
    console.error('[PropertyImage] Unexpected error:', err.message);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred.' });
  }
});

// ── GET /proxy/:cacheId ───────────────────────────────────────────
// Streams the Google image bytes to the client.
// The raw Google URL (with API key) is retrieved from the DB and never exposed.
propertyImageRoutes.get('/proxy/:cacheId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const companyId = await getCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'Forbidden.' });

    const cacheRow = await prisma.propertyImageCache.findFirst({
      where: { id: String(req.params.cacheId), companyId },  // company-scoped: no cross-tenant leakage
    });

    if (!cacheRow?.imageUrl) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Fetch image bytes from Google (server-side)
    const imgRes = await fetch(cacheRow.imageUrl);
    if (!imgRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch image from Google.' });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h in browser
    res.setHeader('X-Image-Source', cacheRow.source);

    // Stream the image bytes
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.send(buffer);

  } catch (err: any) {
    console.error('[PropertyImage] Proxy error:', err.message);
    res.status(500).json({ error: 'Image proxy error.' });
  }
});
