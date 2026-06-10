import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const propertyContextRoutes = Router();

// We can allow without auth for Quick Quote since it's a lead generation tool,
// but for safety let's use the standard auth or at least an API key if it was public.
// Quick Quote creates a demo user if none exists in the frontend.
// The user prompt said: "Backend geocodes through /api/property-context/from-address."

propertyContextRoutes.post('/from-address', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { address, mapboxToken } = req.body;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ success: false, error: 'Address is required.' });
    }

    const googleKey = req.body.googleKey || process.env.GOOGLE_MAPS_API_KEY;
    const mapboxKey = mapboxToken || process.env.VITE_MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN;

    if (!googleKey && !mapboxKey) {
      return res.status(500).json({ success: false, error: 'Neither GOOGLE_MAPS_API_KEY nor MAPBOX_PUBLIC_TOKEN is configured.' });
    }

    let location = null;
    let formattedAddress = address;
    let locationType = 'APPROXIMATE';
    let errorMessage = 'Could not locate this address.';

    // Try Google Maps first if key is available
    if (googleKey) {
      try {
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.searchParams.append('address', address);
        url.searchParams.append('key', googleKey);
        
        const geoRes = await fetch(url.toString());
        const geoData = await geoRes.json();

        if (geoRes.ok && geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
          location = geoData.results[0].geometry.location;
          locationType = geoData.results[0].geometry.location_type;
          formattedAddress = geoData.results[0].formatted_address;
        } else {
          errorMessage = `Google Maps failed: ${geoData.status || 'Unknown Error'}`;
        }
      } catch (err: any) {
        errorMessage = `Google Maps API error: ${err.message}`;
      }
    }

    // Fallback to Mapbox if Google failed or wasn't configured
    if (!location && mapboxKey) {
      try {
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`);
        url.searchParams.append('access_token', mapboxKey);
        url.searchParams.append('types', 'address,poi');
        
        const geoRes = await fetch(url.toString());
        const geoData = await geoRes.json();

        if (geoRes.ok && geoData.features && geoData.features.length > 0) {
          const [lng, lat] = geoData.features[0].center;
          location = { lat, lng };
          formattedAddress = geoData.features[0].place_name;
          locationType = geoData.features[0].properties?.accuracy === 'rooftop' ? 'ROOFTOP' : 'APPROXIMATE';
        } else {
          errorMessage += ` | Mapbox failed to locate address.`;
        }
      } catch (err: any) {
        errorMessage += ` | Mapbox API error: ${err.message}`;
      }
    }

    // Ultimate Fallback: OpenStreetMap Nominatim (Free, No API Key Required)
    if (!location) {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.append('format', 'json');
        url.searchParams.append('q', address);
        url.searchParams.append('limit', '1');
        
        // Nominatim requires a user-agent
        const geoRes = await fetch(url.toString(), {
          headers: { 'User-Agent': 'WindowWorldAssistant/1.0' }
        });
        const geoData = await geoRes.json();

        if (geoRes.ok && geoData && geoData.length > 0) {
          location = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
          formattedAddress = geoData[0].display_name;
          locationType = 'APPROXIMATE';
          // Clear error message since this succeeded
          errorMessage = '';
        } else {
          errorMessage += ` | OpenStreetMap failed to locate address.`;
        }
      } catch (err: any) {
        errorMessage += ` | OpenStreetMap API error: ${err.message}`;
      }
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        error: errorMessage,
      });
    }

    return res.json({
      success: true,
      lat: location.lat,
      lng: location.lng,
      formattedAddress,
      locationType,
    });
  } catch (error: any) {
    console.error('[PropertyContext] Geocoding error:', error.message);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred during geocoding.' });
  }
});
