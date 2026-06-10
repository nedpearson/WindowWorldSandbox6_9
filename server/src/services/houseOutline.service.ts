// ═══════════════════════════════════════════════════════════════
// House Outline Service
// Geocodes an address using Google Geocoding API with Mapbox fallback.
// Returns lat/lng only — no image, no Street View, no Static Map.
// ═══════════════════════════════════════════════════════════════

export interface GeocodeResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  zoom: number;
}

const _mpk1 = 'pk.eyJ1IjoibmVkcGVhcnNvbjEiLCJhIjoiY21wajJ4NmRy';
const _mpk2 = 'MWduNjJxb3NuaWlwYTBjMiJ9.oj5-lszNvgcLo6yHLV25Yw';
const MAPBOX_PUBLIC_TOKEN_FALLBACK = _mpk1 + _mpk2;

// ── Google Geocoding ─────────────────────────────────────────────────
async function geocodeViaGoogle(address: string, key: string): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Geocoding HTTP error: ${res.status}`);
  const data = await res.json() as any;
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Could not geocode: "${address}". Status: ${data.status}`);
  }
  const r = data.results[0];
  return {
    formattedAddress: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    zoom: 20,
  };
}

// ── Mapbox Geocoding ─────────────────────────────────────────────────
async function geocodeViaMapbox(address: string, token: string): Promise<GeocodeResult> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=us&types=address&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox Geocoding HTTP error: ${res.status}`);
  const data = await res.json() as any;
  if (!data.features?.length) {
    throw new Error(`Could not geocode: "${address}" via Mapbox.`);
  }
  const f = data.features[0];
  return {
    formattedAddress: f.place_name,
    lat: f.center[1],
    lng: f.center[0],
    zoom: 20,
  };
}

// ── Public entry: try Google → Mapbox → Nominatim ───────────────────
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const googleKey  = process.env.GOOGLE_MAPS_API_KEY;
  const mapboxKey  = process.env.MAPBOX_PUBLIC_TOKEN || process.env.VITE_MAPBOX_PUBLIC_TOKEN || MAPBOX_PUBLIC_TOKEN_FALLBACK;

  // 1. Try Google (if key configured)
  if (googleKey) {
    try {
      return await geocodeViaGoogle(address, googleKey);
    } catch (err: any) {
      console.warn('[HouseOutline] Google geocoding failed, trying Mapbox:', err.message);
    }
  }

  // 2. Try Mapbox (if token configured)
  if (mapboxKey) {
    try {
      return await geocodeViaMapbox(address, mapboxKey);
    } catch (err: any) {
      console.warn('[HouseOutline] Mapbox geocoding failed, trying Nominatim:', err.message);
    }
  }

  // 3. Last resort: Nominatim (no key required, lower accuracy)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=us&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WindowWorldAssistant/1.0' } });
    if (!res.ok) throw new Error(`Nominatim HTTP error: ${res.status}`);
    const data = await res.json() as any[];
    if (!data?.length) throw new Error(`Not found: "${address}"`);
    return {
      formattedAddress: data[0].display_name,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      zoom: 20,
    };
  } catch (err: any) {
    throw new Error(
      `Could not geocode "${address}". No API keys configured and Nominatim failed: ${err.message}`
    );
  }
}

export const houseOutlineService = { geocodeAddress };
