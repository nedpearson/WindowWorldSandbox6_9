// ═══════════════════════════════════════════════════════════════
// Google Property Image Service
// Address → Geocode → Street View (preferred) → Static Map fallback
// All Google API calls are backend-only. No keys exposed to frontend.
// ═══════════════════════════════════════════════════════════════

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface StreetViewMetadata {
  available: boolean;
  lat?: number;
  lng?: number;
  panoId?: string;
}

export interface PropertyImageResult {
  source: 'street_view' | 'static_map';
  imageUrl: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      'Google Maps is not configured. Add GOOGLE_MAPS_API_KEY to the server environment to enable house images.'
    );
  }
  return key;
}

// ── 1. Geocode ──────────────────────────────────────────────────
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = getApiKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
  const data = await res.json() as any;
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Could not geocode address "${address}". Status: ${data.status}`);
  }
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
  };
}

// ── 2. Street View Metadata ─────────────────────────────────────
export async function getStreetViewMetadata(lat: number, lng: number): Promise<StreetViewMetadata> {
  const key = getApiKey();
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=50&source=outdoor&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return { available: false };
  const data = await res.json() as any;
  if (data.status !== 'OK') return { available: false };
  return {
    available: true,
    lat: data.location?.lat,
    lng: data.location?.lng,
    panoId: data.pano_id,
  };
}

// ── 3. Street View Image URL ────────────────────────────────────
// Returns a direct Google Street View Static API URL.
// The URL contains the API key — never return this raw URL to the frontend.
// Instead, proxy it or return a pre-signed blob.
export function buildStreetViewUrl(lat: number, lng: number): string {
  const key = getApiKey();
  return (
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=800x500&location=${lat},${lng}` +
    `&radius=50&source=outdoor&fov=90&pitch=10` +
    `&key=${key}`
  );
}

// ── 4. Static Map URL (building footprint style) ─────────────────
// Styled to show only grey building footprints on a white background.
// No roads, no labels, no pin. Used as fallback when Street View is unavailable.
export function buildStaticMapUrl(lat: number, lng: number): string {
  const key = getApiKey();

  // Style rules: hide everything except building footprints (grey on white)
  const styles = [
    'feature:all|element:geometry|color:0xffffff',        // white base
    'feature:all|element:labels|visibility:off',           // no labels
    'feature:road|element:geometry|visibility:off',        // no roads
    'feature:transit|visibility:off',                      // no transit
    'feature:poi|visibility:off',                          // no POIs
    'feature:administrative|element:geometry|visibility:off', // no borders
    'feature:water|element:geometry|color:0xffffff',       // white water
    'feature:landscape.man_made|element:geometry|color:0xcccccc', // grey buildings
    'feature:landscape.natural|element:geometry|color:0xffffff',  // white nature
  ].map(s => `style=${s.replace(/\|/g, '%7C')}`).join('&');

  // Zoom 20 (~75m frame) fits most residential properties
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=20&size=640x640&maptype=roadmap` +
    `&${styles}&key=${key}`
  );
}

// ── 5. Main: get the best available property image ──────────────
// Decision: Street View if available (frontal house photo),
// Static Map footprint sketch as fallback.
export async function getBestPropertyImage(address: string): Promise<PropertyImageResult> {
  const geo = await geocodeAddress(address);
  const svMeta = await getStreetViewMetadata(geo.lat, geo.lng);

  if (svMeta.available) {
    return {
      source: 'street_view',
      imageUrl: buildStreetViewUrl(geo.lat, geo.lng),
      lat: geo.lat,
      lng: geo.lng,
      formattedAddress: geo.formattedAddress,
    };
  }

  // Fallback: static map footprint
  return {
    source: 'static_map',
    imageUrl: buildStaticMapUrl(geo.lat, geo.lng),
    lat: geo.lat,
    lng: geo.lng,
    formattedAddress: geo.formattedAddress,
  };
}

export const googlePropertyImageService = {
  geocodeAddress,
  getStreetViewMetadata,
  buildStreetViewUrl,
  buildStaticMapUrl,
  getBestPropertyImage,
};
