// ═══════════════════════════════════════════════════════════
// Rep Autopilot — Predictive field filling engine
// Analyzes existing openings to anticipate what the rep wants next.
// Reduces typing, taps, repetitive entry, and decision fatigue.
// ═══════════════════════════════════════════════════════════

import { detectJobDefaults } from './repMemory';

// ── Types ────────────────────────────────────────────────
export interface AutopilotSuggestion {
  id: string;
  label: string;
  detail: string;
  icon: string;
  fields: Record<string, any>;
  confidence: number; // 0-1
  category: 'room' | 'elevation' | 'neighbor' | 'duplicate' | 'safety' | 'pattern';
}

// ── Room-based safety rules ──────────────────────────────
const BATHROOM_KEYWORDS = ['bath', 'shower', 'powder', 'restroom', 'lavatory', 'half bath', 'master bath', 'guest bath'];
const WET_ROOM_KEYWORDS = [...BATHROOM_KEYWORDS, 'laundry', 'utility', 'mudroom'];

function isBathroom(room: string): boolean {
  const lower = (room || '').toLowerCase();
  return BATHROOM_KEYWORDS.some(kw => lower.includes(kw));
}

function isWetRoom(room: string): boolean {
  const lower = (room || '').toLowerCase();
  return WET_ROOM_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Predict fields for a new opening ─────────────────────
export function predictNewOpening(
  existingOpenings: any[],
  newOpeningNumber: number,
  roomLocation?: string,
  elevation?: string,
): Record<string, any> {
  if (existingOpenings.length === 0) return {};

  const predicted: Record<string, any> = {};

  // 1. Job-level majority defaults (color, grid, glass, removal)
  const jobDefaults = detectJobDefaults(existingOpenings);
  Object.assign(predicted, jobDefaults);

  // 2. Previous opening carry-forward (most recent)
  const prev = existingOpenings[existingOpenings.length - 1];
  if (prev) {
    // Carry forward fields that are almost always the same within a job
    const carryFields = ['seriesModel', 'interiorColor', 'exteriorColor', 'gridStyle',
      'glassPackage', 'screenOption', 'removalType', 'foamEnhanced', 'argon'];
    for (const f of carryFields) {
      if (prev[f] !== undefined && prev[f] !== null && predicted[f] === undefined) {
        predicted[f] = prev[f];
      }
    }
  }

  // 3. Same-room neighbors — predict dimensions
  if (roomLocation) {
    const roomOpenings = existingOpenings.filter(o =>
      o.roomLocation && o.roomLocation.toLowerCase() === roomLocation.toLowerCase()
    );
    if (roomOpenings.length > 0) {
      // Most common dimensions in this room
      const widths = roomOpenings.map(o => o.width).filter(Boolean);
      const heights = roomOpenings.map(o => o.height).filter(Boolean);
      if (widths.length > 0) predicted._suggestedWidth = mode(widths);
      if (heights.length > 0) predicted._suggestedHeight = mode(heights);

      // Most common product type in this room
      const cats = roomOpenings.map(o => o.productCategory).filter(Boolean);
      if (cats.length > 0) predicted.productCategory = mode(cats);
    }
  }

  // 4. Same-elevation neighbors — predict dimensions
  if (elevation) {
    const elevOpenings = existingOpenings.filter(o =>
      o.elevation && o.elevation.toLowerCase() === (elevation || '').toLowerCase()
    );
    if (elevOpenings.length > 0 && !predicted._suggestedWidth) {
      const widths = elevOpenings.map(o => o.width).filter(Boolean);
      const heights = elevOpenings.map(o => o.height).filter(Boolean);
      if (widths.length > 0) predicted._suggestedWidth = mode(widths);
      if (heights.length > 0) predicted._suggestedHeight = mode(heights);
    }
  }

  // 5. Safety auto-suggestions for bathrooms
  if (roomLocation && isBathroom(roomLocation)) {
    predicted.temperedGlass = 'full';
    predicted.obscureGlass = 'full';
    predicted._safetySuggestion = 'Bathroom — tempered & obscure auto-applied';
  }

  return predicted;
}

// ── Generate contextual suggestions for an opening being edited ──
export function generateAutopilotSuggestions(
  currentOpening: any,
  allOpenings: any[],
): AutopilotSuggestion[] {
  const suggestions: AutopilotSuggestion[] = [];
  if (!currentOpening) return suggestions;

  const room = currentOpening.roomLocation || '';
  const elev = currentOpening.elevation || '';

  // ── Same-room openings ──
  const roomSiblings = allOpenings.filter(o =>
    o.id !== currentOpening.id &&
    o.roomLocation && room &&
    o.roomLocation.toLowerCase() === room.toLowerCase()
  );

  if (roomSiblings.length > 0) {
    const rep = roomSiblings[0];
    const diff = countDifferences(currentOpening, rep);
    if (diff > 2) {
      suggestions.push({
        id: 'match-room',
        label: `Match ${room}`,
        detail: `Same options as Opening #${rep.openingNumber}`,
        icon: '🏠',
        fields: extractMatchFields(rep),
        confidence: 0.85,
        category: 'room',
      });
    }
  }

  // ── Same-elevation openings ──
  const elevSiblings = allOpenings.filter(o =>
    o.id !== currentOpening.id &&
    o.elevation && elev &&
    o.elevation.toLowerCase() === elev.toLowerCase()
  );

  if (elevSiblings.length > 0 && roomSiblings.length === 0) {
    const rep = elevSiblings[0];
    suggestions.push({
      id: 'match-elevation',
      label: `Match ${elev} side`,
      detail: `Same options as Opening #${rep.openingNumber}`,
      icon: '🧭',
      fields: extractMatchFields(rep),
      confidence: 0.7,
      category: 'elevation',
    });
  }

  // ── Neighbor dimension suggestion ──
  const prev = allOpenings.find(o => o.openingNumber === currentOpening.openingNumber - 1);
  if (prev && prev.width > 0 && prev.height > 0 &&
      (!currentOpening.width || currentOpening.width === 0)) {
    suggestions.push({
      id: 'same-dims',
      label: `Same size as #${prev.openingNumber}`,
      detail: `${prev.width}" × ${prev.height}"`,
      icon: '📐',
      fields: { width: prev.width, height: prev.height },
      confidence: 0.6,
      category: 'neighbor',
    });
  }

  // ── Bathroom safety ──
  if (isBathroom(room)) {
    if (currentOpening.temperedGlass !== 'full') {
      suggestions.push({
        id: 'tempered-bath',
        label: 'Tempered glass',
        detail: 'Bathroom — code requirement near wet area',
        icon: '🛡️',
        fields: { temperedGlass: 'full' },
        confidence: 0.95,
        category: 'safety',
      });
    }
    if (currentOpening.obscureGlass !== 'full') {
      suggestions.push({
        id: 'obscure-bath',
        label: 'Obscure glass',
        detail: 'Bathroom — privacy',
        icon: '🫧',
        fields: { obscureGlass: 'full' },
        confidence: 0.9,
        category: 'safety',
      });
    }
  }

  // ── Wet room tempered check ──
  if (isWetRoom(room) && !isBathroom(room) && currentOpening.temperedGlass !== 'full') {
    suggestions.push({
      id: 'tempered-wet',
      label: 'Check tempered',
      detail: `${room} — verify if within 60" of water source`,
      icon: '💧',
      fields: { temperedGlass: 'full' },
      confidence: 0.5,
      category: 'safety',
    });
  }

  // ── One-tap duplicate ──
  if (currentOpening.width > 0 && currentOpening.height > 0) {
    suggestions.push({
      id: 'dup-next',
      label: 'Duplicate this opening',
      detail: 'Create identical copy as next opening',
      icon: '📋',
      fields: { ...extractFullClone(currentOpening) },
      confidence: 0.5,
      category: 'duplicate',
    });
  }

  // ── Pattern detection: same product type repeating ──
  if (allOpenings.length >= 3) {
    const lastThree = allOpenings.slice(-3);
    const allSameType = lastThree.every(o => o.productCategory === lastThree[0].productCategory);
    if (allSameType && currentOpening.productCategory !== lastThree[0].productCategory) {
      suggestions.push({
        id: 'pattern-type',
        label: `${lastThree[0].productCategory?.replace(/_/g, ' ')}`,
        detail: 'Last 3 openings are this type',
        icon: '🔮',
        fields: { productCategory: lastThree[0].productCategory },
        confidence: 0.65,
        category: 'pattern',
      });
    }
  }

  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ── Helpers ──────────────────────────────────────────────
function mode<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  let best: T = arr[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

function extractMatchFields(opening: any): Record<string, any> {
  const fields: Record<string, any> = {};
  const keep = ['interiorColor', 'exteriorColor', 'gridStyle', 'gridPattern',
    'glassPackage', 'screenOption', 'removalType', 'seriesModel',
    'temperedGlass', 'obscureGlass', 'argon', 'foamEnhanced', 'nailFin'];
  for (const k of keep) {
    if (opening[k] !== undefined && opening[k] !== null) fields[k] = opening[k];
  }
  return fields;
}

function extractFullClone(opening: any): Record<string, any> {
  const fields: Record<string, any> = {};
  const keep = ['width', 'height', 'productCategory', 'seriesModel',
    'interiorColor', 'exteriorColor', 'gridStyle', 'gridPattern',
    'glassPackage', 'temperedGlass', 'obscureGlass', 'argon',
    'foamEnhanced', 'nailFin', 'oriel', 'horizontalRR', 'sillRepair',
    'screenOption', 'removalType', 'installType', 'roomLocation',
    'elevation', 'floorNumber'];
  for (const k of keep) {
    if (opening[k] !== undefined && opening[k] !== null) fields[k] = opening[k];
  }
  return fields;
}

function countDifferences(a: any, b: any): number {
  const fields = ['interiorColor', 'exteriorColor', 'gridStyle', 'glassPackage',
    'screenOption', 'removalType', 'seriesModel'];
  let diff = 0;
  for (const f of fields) {
    if (a[f] !== b[f]) diff++;
  }
  return diff;
}
