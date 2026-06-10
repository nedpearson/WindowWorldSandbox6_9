// ═══════════════════════════════════════════════════════════════
// Property Vision Service
// Geocodes address, checks Street View availability,
// returns availableViews map. Never exposes API keys.
// ═══════════════════════════════════════════════════════════════

export interface AvailableViews {
  outline: boolean;
  aerial: boolean;
  street: boolean;
  streetHeadings: number[]; // available heading angles
  aerialTilt: boolean;
}

export interface PropertyVisionProfileData {
  formattedAddress: string;
  lat: number;
  lng: number;
  locationType: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  availableViews: AvailableViews;
  warnings: string[];
}

const STREET_VIEW_RADIUS = 50; // meters

export async function buildPropertyVisionProfile(address: string): Promise<PropertyVisionProfileData> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured on the server.');
  }

  // 1. Geocode
  const geoUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  geoUrl.searchParams.set('address', address);
  geoUrl.searchParams.set('key', apiKey);

  const geoRes = await fetch(geoUrl.toString());
  const geoData = await geoRes.json() as any;

  if (geoData.status !== 'OK' || !geoData.results?.length) {
    throw new Error(`Could not geocode address: ${geoData.status || 'unknown error'}`);
  }

  const result = geoData.results[0];
  const { lat, lng } = result.geometry.location;
  const locationType: string = result.geometry.location_type;
  const formattedAddress: string = result.formatted_address;

  const confidence = locationType === 'ROOFTOP' ? 'high'
    : locationType === 'RANGE_INTERPOLATED' ? 'medium'
    : locationType === 'GEOMETRIC_CENTER' ? 'low'
    : 'unknown';

  const warnings: string[] = [];
  if (locationType !== 'ROOFTOP') {
    warnings.push(`Geocode precision is ${locationType}. Imagery may not center on the exact structure.`);
  }

  // 2. Check Street View availability at multiple headings
  const streetCheckUrl = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  streetCheckUrl.searchParams.set('location', `${lat},${lng}`);
  streetCheckUrl.searchParams.set('radius', String(STREET_VIEW_RADIUS));
  streetCheckUrl.searchParams.set('key', apiKey);

  let streetAvailable = false;
  const streetHeadings: number[] = [];

  try {
    const svRes = await fetch(streetCheckUrl.toString());
    const svData = await svRes.json() as any;
    if (svData.status === 'OK') {
      streetAvailable = true;
      // Provide standard headings for front/left-angle/right-angle views
      streetHeadings.push(0, 90, 270); // approximate front, left, right
    } else {
      warnings.push('Street View imagery is not available within 50m of this address.');
    }
  } catch {
    warnings.push('Could not check Street View availability.');
  }

  const availableViews: AvailableViews = {
    outline: true, // always available via Maps JS
    aerial: true,  // always available via Maps JS satellite
    street: streetAvailable,
    streetHeadings,
    aerialTilt: false, // 45° tilt is deprecated/unreliable; hide by default
  };

  return {
    formattedAddress,
    lat,
    lng,
    locationType,
    confidence: confidence as 'high' | 'medium' | 'low' | 'unknown',
    availableViews,
    warnings,
  };
}
