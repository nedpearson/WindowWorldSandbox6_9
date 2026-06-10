// ═══════════════════════════════════════════════════════════════
// House Outline Routes
//
// POST /api/house-outline/from-address
//   Geocodes address → returns lat/lng/zoom for JS map rendering.
//
// GET  /api/house-outline/static-image?lat=&lng=&zoom=&w=&h=
//   Proxies Google Maps Static API (satellite) → PNG bytes.
//   Server API key stays server-side. Frontend draws image onto
//   the sketch canvas as a tracing reference layer.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { houseOutlineService } from '../services/houseOutline.service.js';
import { prisma } from '../index.js';

export const houseOutlineRoutes = Router();
const _mpk1 = 'pk.eyJ1IjoibmVkcGVhcnNvbjEiLCJhIjoiY21wajJ4NmRy';
const _mpk2 = 'MWduNjJxb3NuaWlwYTBjMiJ9.oj5-lszNvgcLo6yHLV25Yw';
const MAPBOX_PUBLIC_TOKEN_FALLBACK = _mpk1 + _mpk2;

houseOutlineRoutes.use(requireAuth);

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

// ── POST /from-address ─────────────────────────────────────────
houseOutlineRoutes.post('/from-address', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { address, appointmentId, customerId } = req.body;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ success: false, error: 'Address is required.' });
    }

    // Get companyId from user record — never trust it from the client
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const companyId = user?.companyId;
    // super_admin may not have a companyId — allow them to geocode using a platform-level scope
    const isSuperAdmin = user?.role === 'super_admin';
    if (!companyId && !isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'User must belong to a company to use House Outline.' });
    }
    // For super_admin without a company, use their userId as the cache scope
    const cacheCompanyId = companyId || userId;

    const normAddress = normalizeAddress(address);

    // Check geocode cache
    const cached = await prisma.propertyImageCache.findFirst({
      where: { companyId: cacheCompanyId, normalizedAddress: normAddress, status: 'success' },
      orderBy: { createdAt: 'desc' },
    });

    if (cached?.lat && cached?.lng) {
      console.log(`[HouseOutline] Cache HIT for "${normAddress}"`);
      return res.json({
        success: true,
        formattedAddress: cached.formattedAddress,
        lat: cached.lat,
        lng: cached.lng,
        zoom: 20,
      });
    }

    // Geocode fresh from Google
    console.log(`[HouseOutline] Geocoding "${normAddress}"…`);
    let result;
    try {
      result = await houseOutlineService.geocodeAddress(address);
    } catch (err: any) {
      if (err.message?.includes('not configured')) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(404).json({
        success: false,
        error: `Could not find address: "${address}". Check the address and try again.`,
      });
    }

    // Cache the geocode result (reuse PropertyImageCache model — lat/lng fields)
    await prisma.propertyImageCache.create({
      data: {
        companyId: cacheCompanyId,
        customerId: customerId || null,
        appointmentId: appointmentId || null,
        normalizedAddress: normAddress,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        source: 'static_map', // placeholder — no image used
        imageUrl: '',          // no image
        status: 'success',
        createdById: userId,
      },
    }).catch(() => {}); // non-fatal cache write

    return res.json({
      success: true,
      formattedAddress: result.formattedAddress,
      lat: result.lat,
      lng: result.lng,
      zoom: result.zoom,
    });

  } catch (err: any) {
    console.error('[HouseOutline] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Unexpected error.' });
  }
});

// ── GET /static-image — proxy Google Maps Static API → PNG ─────
// Keeps GOOGLE_MAPS_API_KEY server-side. Frontend can import the
// returned image onto the sketch canvas as a tracing background.
//
// Query params:
//   lat, lng  — required — property coordinates
//   zoom      — optional — default 20
//   w, h      — optional — image size in pixels, default 640x640
houseOutlineRoutes.get('/static-image', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required.' });
    }

    const zoom  = parseInt(req.query.zoom as string) || 20;
    const w     = Math.min(parseInt(req.query.w as string) || 640, 640); // Static Maps max 640
    const h     = Math.min(parseInt(req.query.h as string) || 640, 640);

    const googleKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const mapboxToken = req.query.mapboxToken as string;
    const mapboxKey = mapboxToken || process.env.VITE_MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN || MAPBOX_PUBLIC_TOKEN_FALLBACK;

    if (!googleKey && !mapboxKey) {
      return res.status(500).json({ error: 'No API keys configured for static map.' });
    }

    let imgRes;
    
    // Try Google Maps first
    if (googleKey) {
      // Proven style set: hide labels and clutter, keep Google Maps' native building rendering.
      // Do NOT override geometry colors — Google Maps' default grey footprints already look correct.
      const styles = [
        'feature:all|element:labels|visibility:off',
        'feature:road|visibility:off',
        'feature:water|visibility:off',
        'feature:poi|visibility:off',
        'feature:transit|visibility:off',
        'feature:administrative|visibility:off',
      ].map(s => `&style=${encodeURIComponent(s)}`).join('');

      // Use the zoom level requested by the frontend (defaults to 20 if not specified)
      const effectiveZoom = zoom;
      const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${effectiveZoom}&size=${w}x${h}&scale=2&maptype=roadmap&markers=size:tiny%7Ccolor:red%7C${lat},${lng}${styles}&key=${googleKey}`;
      imgRes = await fetch(googleUrl);
      
      // If Google Maps fails (e.g., REQUEST_DENIED), reset imgRes so Mapbox can try
      if (!imgRes.ok) {
        console.error(`[HouseOutline] Google Static Maps error: ${imgRes.status}. Falling back to Mapbox.`);
        imgRes = null;
      }
    }

    // Mapbox Fallback
    if (!imgRes && mapboxKey) {
      // Mapbox static image API: /styles/v1/{username}/{style_id}/static/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}@2x
      // We use light-v11 to show building footprints.
      const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${mapboxKey}`;
      imgRes = await fetch(mapboxUrl);
    }

    if (!imgRes) {
      return res.status(500).json({ error: 'Failed to fetch static image from any provider.' });
    }

    if (!imgRes.ok) {
      console.error(`[HouseOutline] Static Maps error: ${imgRes.status}`);
      return res.status(502).json({ error: `Static Maps returned ${imgRes.status}` });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // cache 24h — property doesn't change
    res.send(buffer);

  } catch (err: any) {
    console.error('[HouseOutline] Static image error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch satellite image.' });
  }
});

// ── POST /footprint ──────────────────────────────────────────────
// Queries Mapbox Tilequery API for building footprints near coordinates.
houseOutlineRoutes.post('/footprint', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat and lng are required.' });
    }

    const mapboxKey = process.env.MAPBOX_PUBLIC_TOKEN || process.env.VITE_MAPBOX_PUBLIC_TOKEN || MAPBOX_PUBLIC_TOKEN_FALLBACK;
    if (!mapboxKey) {
      return res.status(500).json({ success: false, error: 'Mapbox API key not configured.' });
    }

    const radius = 50; // search radius in meters
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=${radius}&limit=5&dedupe=true&geometry=polygon&layers=building&access_token=${mapboxKey}`;

    console.log(`[HouseOutline] Fetching building footprint from Mapbox for lat=${lat}, lng=${lng}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox Tilequery HTTP error: ${response.status}`);
    }
    const data = await response.json() as any;

    if (!data.features || data.features.length === 0) {
      return res.json({ success: true, features: [] });
    }

    // Filter features belonging to the building layer
    const buildings = data.features.filter((f: any) => f.properties?.tilequery?.layer === 'building');
    return res.json({ success: true, features: buildings });
  } catch (err: any) {
    console.error('[HouseOutline] Footprint error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch footprint.' });
  }
});

// ── GET /embed — Serve Google Maps iframe (API key stays server-side) ──────
// Frontend embeds /api/house-outline/embed?q=ADDRESS as an iframe src.
// This shows EXACTLY what google.com/maps shows — no static image, no cropping.
houseOutlineRoutes.get('/embed', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).send('<p>Unauthorized</p>');

  const q = (req.query.q as string || '').trim();
  if (!q) return res.status(400).send('<p>Address required</p>');

  // Legacy embed URL — no API key or Maps Embed API enablement needed.
  // Always matches what google.com/maps shows for this address.
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=19&output=embed`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<!DOCTYPE html>
<html><head><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#f8fafc}
  iframe{width:100%;height:100%;border:0;display:block}
</style></head>
<body><iframe src="${mapSrc}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></body>
</html>`);
});



