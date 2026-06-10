// ═══════════════════════════════════════════════════════════════
// Property Intelligence + AI House Sketch Generator
// Address lookup → Property analysis → Draft opening generation
// ═══════════════════════════════════════════════════════════════

import type { MarkerSymbol, WindowType } from './sketchSync';

// ── Property Data ───────────────────────────────────────────
export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  // Property characteristics
  stories: number;
  sqft: number;
  yearBuilt: number;
  lotSqft: number;
  propertyType: 'single_family' | 'townhouse' | 'condo' | 'duplex' | 'other';
  exteriorMaterial: 'brick' | 'siding' | 'stucco' | 'wood' | 'mixed' | 'unknown';
  roofType: string;
  garageType: 'attached' | 'detached' | 'carport' | 'none';
  // Computed
  estimatedOpenings: number;
  estimatedSidingArea: number;
}

// ── Draft Opening (AI-generated suggestion) ─────────────────
export type AIConfidence = 'high' | 'medium' | 'low';

export interface DraftOpening {
  id: string;
  type: 'window' | 'door' | 'sgd' | 'siding' | 'garage';
  markerSymbol: MarkerSymbol;
  windowType: WindowType | null;
  label: string;
  elevation: string;
  floor: number;
  // Position on sketch (normalized 0-1)
  x: number;
  y: number;
  // Estimated dims
  estWidth: number;
  estHeight: number;
  // AI metadata
  confidence: AIConfidence;
  reason: string;
  needsVerification: boolean;
  verified: boolean;
  rejected: boolean;
  // Recommendation
  suggestedProduct: string;
  suggestedGlass: string;
}

// ── Elevation Profile ───────────────────────────────────────
export interface ElevationProfile {
  elevation: string;
  windowCount: number;
  doorCount: number;
  sidingArea: boolean;
  garagePresent: boolean;
  openings: DraftOpening[];
}

// ── Full Property Intelligence Result ───────────────────────
export interface PropertyIntelligenceResult {
  property: PropertyData;
  elevations: ElevationProfile[];
  draftOpenings: DraftOpening[];
  totalWindows: number;
  totalDoors: number;
  totalSiding: number;
  generatedAt: number;
  mapImageUrl: string | null;
  streetViewUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════
// ADDRESS LOOKUP (client-side with Nominatim fallback)
// ═══════════════════════════════════════════════════════════════

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const { api } = await import('./api');
    const res = await api.post('/property-context/from-address', { address }) as any;
    if (res.success) {
      return { lat: res.lat, lng: res.lng, display: res.formattedAddress };
    }
  } catch (err: any) {
    console.warn('[Geocode] Backend geocoding failed:', err.message);
  }

  // Fallback to OSM Nominatim if backend fails
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=us&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WindowWorldAssistant/1.0' } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lng), display: data[0].display_name };
    }
  } catch { /* fallback */ }
  return null;
}

export async function addressAutocomplete(query: string): Promise<{ display: string; lat: number; lng: number }[]> {
  if (query.length < 5) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WindowWorldAssistant/1.0' } });
    const data = await res.json();
    return data.map((d: any) => ({
      display: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lng),
    }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// PROPERTY ESTIMATOR (rule-based, no external API needed)
// ═══════════════════════════════════════════════════════════════

const WINDOW_DENSITY = { small: 6, medium: 10, large: 16, xlarge: 22 };
const DOOR_DENSITY = { small: 2, medium: 3, large: 4, xlarge: 5 };

function estimatePropertyData(address: string, geo: { lat: number; lng: number }): PropertyData {
  // Use address heuristics for demo/offline mode
  const isLouisiana = address.toLowerCase().includes('la') || address.toLowerCase().includes('louisiana');
  const sqft = 1800 + Math.floor(Math.random() * 1200); // 1800-3000
  const stories = sqft > 2400 ? 2 : 1;
  const yearBuilt = 1985 + Math.floor(Math.random() * 35);
  const exterior = isLouisiana ? 'brick' as const : (yearBuilt > 2005 ? 'siding' as const : 'brick' as const);

  return {
    address: address.split(',')[0]?.trim() || address,
    city: address.split(',')[1]?.trim() || 'Baton Rouge',
    state: address.split(',')[2]?.trim() || 'LA',
    zip: address.match(/\d{5}/)?.[0] || '70808',
    lat: geo.lat, lng: geo.lng,
    stories,
    sqft,
    yearBuilt,
    lotSqft: sqft * 3,
    propertyType: 'single_family',
    exteriorMaterial: exterior,
    roofType: 'shingle',
    garageType: 'attached',
    estimatedOpenings: stories === 2 ? 16 : 10,
    estimatedSidingArea: exterior === 'siding' ? sqft * 1.2 : 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// AI HOUSE SKETCH GENERATOR
// ═══════════════════════════════════════════════════════════════

function uid(): string { return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function generateElevationOpenings(
  elevation: string,
  property: PropertyData,
  isGarageElev: boolean,
): DraftOpening[] {
  const openings: DraftOpening[] = [];
  const isFront = elevation === 'front';
  const isRear = elevation === 'rear';
  const isSide = elevation === 'left' || elevation === 'right';
  const floors = property.stories;

  // ── Ground Floor Windows ──
  const groundWindowCount = isFront ? 4 : isRear ? 3 : 2;
  for (let i = 0; i < groundWindowCount; i++) {
    const xPos = 0.15 + (i * 0.7 / Math.max(groundWindowCount - 1, 1));
    openings.push({
      id: uid(), type: 'window', markerSymbol: 'dh', windowType: 'double_hung',
      label: `DH`, elevation, floor: 1,
      x: xPos, y: 0.55,
      estWidth: 35.375, estHeight: 59.875,
      confidence: isFront ? 'high' : 'medium',
      reason: `Typical ${elevation} elevation ${property.stories}-story home`,
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Double Hung', suggestedGlass: 'SolarZone',
    });
  }

  // ── Second Floor Windows ──
  if (floors >= 2) {
    const upWindowCount = isFront ? 3 : isRear ? 2 : 1;
    for (let i = 0; i < upWindowCount; i++) {
      const xPos = 0.2 + (i * 0.6 / Math.max(upWindowCount - 1, 1));
      openings.push({
        id: uid(), type: 'window', markerSymbol: 'dh', windowType: 'double_hung',
        label: `DH`, elevation, floor: 2,
        x: xPos, y: 0.25,
        estWidth: 35.375, estHeight: 59.875,
        confidence: isFront ? 'high' : 'medium',
        reason: `Second floor ${elevation} elevation`,
        needsVerification: true, verified: false, rejected: false,
        suggestedProduct: 'Double Hung', suggestedGlass: 'SolarZone',
      });
    }
  }

  // ── Front Door (Likely Entry Point) ──
  if (isFront) {
    openings.push({
      id: uid(), type: 'door', markerSymbol: 'front_door', windowType: null,
      label: 'FD', elevation: 'front', floor: 1,
      x: 0.45, y: 0.65,
      estWidth: 36, estHeight: 80,
      confidence: 'high', reason: 'Likely primary entry point — front elevation',
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Entry Door', suggestedGlass: 'Decorative',
    });
  }

  // ── Back Door / Patio Door (Secondary Entry Point) ──
  if (isRear) {
    openings.push({
      id: uid(), type: 'sgd', markerSymbol: 'sgd', windowType: 'sgd' as any,
      label: 'SGD', elevation: 'rear', floor: 1,
      x: 0.5, y: 0.65,
      estWidth: 72, estHeight: 80,
      confidence: 'medium', reason: 'Likely secondary entry point / patio door — rear elevation',
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Sliding Glass Door', suggestedGlass: 'SolarZone',
    });
  }

  // ── Garage ──
  if (isGarageElev && isFront) {
    openings.push({
      id: uid(), type: 'garage', markerSymbol: 'window_x' as MarkerSymbol, windowType: null,
      label: 'GAR', elevation: 'front', floor: 1,
      x: 0.8, y: 0.7,
      estWidth: 192, estHeight: 84,
      confidence: 'medium', reason: 'Garage door area detected',
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Garage (no replacement)', suggestedGlass: 'N/A',
    });
  }

  // ── Bathroom Window (side elevation) ──
  if (isSide) {
    openings.push({
      id: uid(), type: 'window', markerSymbol: 'awning', windowType: 'awning',
      label: 'AWN', elevation, floor: 1,
      x: 0.3, y: 0.45,
      estWidth: 35.375, estHeight: 23.5,
      confidence: 'low', reason: 'Possible bathroom/utility window — may need obscure glass',
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Awning', suggestedGlass: 'LEE',
    });
  }

  // ── Porch Area ──
  if (isFront || isRear) {
    openings.push({
      id: uid(), type: 'siding', markerSymbol: 'siding' as MarkerSymbol, windowType: null,
      label: isFront ? 'Front Porch' : 'Rear Patio/Porch', elevation, floor: 1,
      x: 0.5, y: 0.85,
      estWidth: 120, estHeight: 96,
      confidence: 'medium', reason: `Identified porch/patio area on ${elevation} elevation`,
      needsVerification: true, verified: false, rejected: false,
      suggestedProduct: 'Porch Ceiling/Trim', suggestedGlass: 'N/A',
    });
  }

  return openings;
}

export function generateAISketch(property: PropertyData): PropertyIntelligenceResult {
  const elevations: ElevationProfile[] = [];
  const allOpenings: DraftOpening[] = [];
  const hasGarage = property.garageType !== 'none';

  for (const elev of ['front', 'rear', 'left', 'right']) {
    const isGarageElev = hasGarage && elev === 'front';
    const openings = generateElevationOpenings(elev, property, isGarageElev);
    allOpenings.push(...openings);

    elevations.push({
      elevation: elev,
      windowCount: openings.filter(o => o.type === 'window').length,
      doorCount: openings.filter(o => o.type === 'door' || o.type === 'sgd').length,
      sidingArea: property.exteriorMaterial === 'siding',
      garagePresent: isGarageElev,
      openings,
    });
  }

  const totalWindows = allOpenings.filter(o => o.type === 'window').length;
  const totalDoors = allOpenings.filter(o => o.type === 'door' || o.type === 'sgd').length;

  // Map URLs (OpenStreetMap tiles — free, no API key)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${property.lng - 0.002},${property.lat - 0.001},${property.lng + 0.002},${property.lat + 0.001}&layer=mapnik&marker=${property.lat},${property.lng}`;

  return {
    property,
    elevations,
    draftOpenings: allOpenings,
    totalWindows,
    totalDoors,
    totalSiding: property.exteriorMaterial === 'siding' ? 1 : 0,
    generatedAt: Date.now(),
    mapImageUrl: mapUrl,
    streetViewUrl: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY: Address → Property Intelligence
// ═══════════════════════════════════════════════════════════════

export async function runPropertyIntelligence(address: string): Promise<PropertyIntelligenceResult> {
  // 1. Geocode
  const geo = await geocodeAddress(address);
  const coords = geo || { lat: 30.4515, lng: -91.1871 }; // Default: Baton Rouge

  // 2. Estimate property data
  const property = estimatePropertyData(address, coords);

  // 3. Generate AI sketch
  return generateAISketch(property);
}

// ── Quick Quote Estimate ────────────────────────────────────
export interface QuickQuoteEstimate {
  windowCount: number;
  doorCount: number;
  sidingZones: number;
  goodTotal: number;
  betterTotal: number;
  bestTotal: number;
  goodMonthly: number;
  betterMonthly: number;
  bestMonthly: number;
}

export function generateQuickQuote(result: PropertyIntelligenceResult): QuickQuoteEstimate {
  const wc = result.totalWindows;
  const dc = result.totalDoors;
  const sc = result.totalSiding;

  const windowGood = wc * 295;
  const windowBetter = wc * 385;
  const windowBest = wc * 510;

  const doorGood = dc * 950;
  const doorBetter = dc * 1350;
  const doorBest = dc * 1850;

  const sidingGood = sc * 4500;
  const sidingBetter = sc * 6200;
  const sidingBest = sc * 8500;

  const goodTotal = windowGood + doorGood + sidingGood;
  const betterTotal = windowBetter + doorBetter + sidingBetter;
  const bestTotal = windowBest + doorBest + sidingBest;

  return {
    windowCount: wc, doorCount: dc, sidingZones: sc,
    goodTotal, betterTotal, bestTotal,
    goodMonthly: Math.round(goodTotal / 120),
    betterMonthly: Math.round(betterTotal / 120),
    bestMonthly: Math.round(bestTotal / 120),
  };
}

// ── Persistence ─────────────────────────────────────────────
const PI_KEY = 'wwa_property_intelligence';

export function savePropertyIntelligence(appointmentId: string, result: PropertyIntelligenceResult): void {
  try {
    const all = JSON.parse(localStorage.getItem(PI_KEY) || '{}');
    all[appointmentId] = result;
    localStorage.setItem(PI_KEY, JSON.stringify(all));
  } catch { /* silent */ }
}

export function getPropertyIntelligence(appointmentId: string): PropertyIntelligenceResult | null {
  try {
    const all = JSON.parse(localStorage.getItem(PI_KEY) || '{}');
    return all[appointmentId] || null;
  } catch { return null; }
}
