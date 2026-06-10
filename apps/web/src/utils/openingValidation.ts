// ── Opening Validation Engine ──────────────────────────
// Context-aware field validation, completion scoring, risk assessment,
// and next-best-action for every opening.
// Supports stage-based validation via validateOpeningWithStage().

import { resolveOpeningDefaults } from './openingDefaults';
import type { ValidationStage } from './openingDefaultTypes';

export interface ValidationResult {
  score: number; // 0-100
  status: 'incomplete' | 'needs_review' | 'high_risk' | 'complete' | 'ready';
  missingFields: { field: string; label: string; severity: 'required' | 'recommended' | 'optional' }[];
  warnings: { message: string; severity: 'critical' | 'warning' | 'info'; code: string }[];
  riskScore: number; // 0-10
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextAction: string | null;
  autoNotes: string[];
  requiresPhoto: boolean;
  photoReasons: string[];
  measurementConfirmed: boolean;
}

interface Opening {
  [key: string]: any;
}

// ── Context-aware required fields ──────────────────────
function getRequiredFields(opening: Opening, isBrickHouse: boolean): { field: string; label: string; severity: 'required' | 'recommended' | 'optional' }[] {
  const req: { field: string; label: string; severity: 'required' | 'recommended' | 'optional' }[] = [
    { field: 'width', label: 'Width', severity: 'required' },
    { field: 'height', label: 'Height', severity: 'required' },
    { field: 'measurementBasis', label: 'Measurement Basis', severity: 'required' },
    { field: 'roomLocation', label: 'Room / Location', severity: 'required' },
    { field: 'elevation', label: 'Elevation', severity: 'required' },
    { field: 'productCategory', label: 'Product Category', severity: 'required' },
    { field: 'interiorColor', label: 'Interior Color', severity: 'required' },
    { field: 'exteriorColor', label: 'Exterior Color', severity: 'required' },
    { field: 'gridStyle', label: 'Grid Style', severity: 'required' },
    { field: 'glassPackage', label: 'Glass Package', severity: 'required' },
    { field: 'removalType', label: 'Removal Type', severity: 'required' },
  ];

  // Brick house → require depth
  if (isBrickHouse) {
    req.push({ field: 'openingDepth', label: 'Opening Depth (brick)', severity: 'required' });
  }

  // Bathroom → tempered + obscure
  const room = (opening.roomLocation || '').toLowerCase();
  if (room.includes('bath') || room.includes('shower') || room.includes('tub')) {
    req.push({ field: 'temperedGlass', label: 'Tempered Glass (bathroom)', severity: 'required' });
    req.push({ field: 'obscureGlass', label: 'Obscure Glass (bathroom)', severity: 'recommended' });
  }

  // Specialty shapes
  const cat = opening.productCategory || '';
  if (cat === 'eyebrow') {
    req.push({ field: 'radius', label: 'Radius (eyebrow)', severity: 'required' });
    req.push({ field: 'legHeight', label: 'Leg Height', severity: 'required' });
  }
  if (cat === 'circle_top' || cat === 'quarter_arch') {
    req.push({ field: 'radius', label: 'Radius', severity: 'required' });
  }
  if (opening.oriel) {
    req.push({ field: 'orielUpperSashHeight', label: 'Oriel Top Sash Height', severity: 'required' });
  }

  // Stucco — also check exteriorSurface
  const extSurface = (opening.exteriorType || opening.exteriorSurface || '').toLowerCase();
  if (extSurface.includes('stucco')) {
    req.push({ field: 'cutbackType', label: 'Stucco Cutback', severity: 'required' });
  }

  // Pricing
  req.push({ field: 'totalPrice', label: 'Total Price', severity: 'recommended' });

  return req;
}

// ── Check if a field is filled ─────────────────────────
function isFilled(opening: Opening, field: string): boolean {
  const v = opening[field];
  if (v === undefined || v === null || v === '') return false;
  if (typeof v === 'number' && v === 0) {
    // width/height/price of 0 = not filled
    if (['width', 'height', 'totalPrice', 'openingDepth', 'radius', 'legHeight'].includes(field)) return false;
  }
  if (typeof v === 'string' && v === 'none') {
    // tempered/obscure "none" counts as filled (it's a deliberate choice)
    if (['temperedGlass', 'obscureGlass'].includes(field)) {
      // For bathroom, 'none' on tempered is NOT filled
      const room = (opening.roomLocation || '').toLowerCase();
      if (room.includes('bath') || room.includes('shower') || room.includes('tub')) {
        return field === 'obscureGlass'; // obscure none is ok, tempered none is not
      }
    }
    return true;
  }
  if (field === 'cutbackType' && typeof v === 'string' && v === 'Needs cutback selection') {
    return false;
  }
  if (field === 'measurementBasis' && typeof v === 'string' && v === 'needs_review') {
    return false;
  }
  return true;
}

// ── Risk score calculation ─────────────────────────────
function calculateRisk(opening: Opening, isBrickHouse: boolean): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  const cat = opening.productCategory || '';
  const w = opening.width || 0;
  const h = opening.height || 0;
  const ui = w + h;

  // Specialty shape
  if (['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(cat)) {
    score += 3; factors.push('Specialty shape');
  }

  // Oversized
  if (ui > 130) { score += 2; factors.push(`Oversized UI (${ui})`); }
  if (ui > 150) { score += 1; factors.push('Very large opening'); }

  // Brick variance
  if (isBrickHouse && (opening.openingVariance || 0) >= 0.5) {
    score += 2; factors.push('High brick variance');
  }

  // Low depth
  if (isBrickHouse && opening.openingDepth > 0 && opening.openingDepth < 3.25) {
    score += 3; factors.push('Insufficient depth');
  }

  // Oriel
  if (opening.oriel) { score += 1; factors.push('Oriel split'); }

  // Mulled
  if (opening.mullGroup) { score += 1; factors.push('Mull group'); }

  // Second floor
  if ((opening.floorNumber || 1) >= 2) { score += 1; factors.push('Upper floor'); }

  // Missing key data
  if (!opening.totalPrice || opening.totalPrice === 0) { score += 1; factors.push('No pricing'); }

  return { score: Math.min(10, score), factors };
}

// ── Requires photo check ───────────────────────────────
function checkPhotoRequired(opening: Opening, isBrickHouse: boolean): { required: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const cat = opening.productCategory || '';
  const ui = (opening.width || 0) + (opening.height || 0);

  if (['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(cat)) reasons.push('Specialty shape');
  if (ui > 130) reasons.push('Large UI unit');
  if (isBrickHouse && (opening.openingVariance || 0) >= 0.5) reasons.push('Severe brick variance');
  if (opening.mullGroup) reasons.push('Mull group');
  if (opening.needsVerification) reasons.push('Flagged for verification');

  return { required: reasons.length > 0, reasons };
}

// ── Outlier detection ──────────────────────────────────
function detectOutliers(opening: Opening, allOpenings: Opening[]): string[] {
  const warnings: string[] = [];
  const w = opening.width || 0;
  const h = opening.height || 0;
  if (w === 0 || h === 0) return warnings;

  // Statistical Outliers (95% Confidence Bounds)
  const calculateStats = (arr: number[]) => {
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);
    return { mean, stdDev };
  };

  const otherWidths = allOpenings.filter(o => o.id !== opening.id && o.width).map(o => o.width as number);
  const otherHeights = allOpenings.filter(o => o.id !== opening.id && o.height).map(o => o.height as number);

  if (otherWidths.length >= 4) {
    const { mean: avgW, stdDev: stdW } = calculateStats(otherWidths);
    // 95% confidence interval is approx mean ± 1.96 * stdDev
    const lowerBoundW = avgW - (1.96 * stdW);
    const upperBoundW = avgW + (1.96 * stdW);
    
    // Transposition check (e.g., 3 instead of 30)
    if (w > 0 && w < 10 && avgW > 20) {
      warnings.push(`Statistical Anomaly: Width ${w}" is suspiciously small (possible transposition error).`);
    } else if (w < lowerBoundW || w > upperBoundW) {
      warnings.push(`Statistical Anomaly: Width ${w}" falls outside 95% confidence bounds (avg: ${Math.round(avgW)}").`);
    }
  }

  if (otherHeights.length >= 4) {
    const { mean: avgH, stdDev: stdH } = calculateStats(otherHeights);
    const lowerBoundH = avgH - (1.96 * stdH);
    const upperBoundH = avgH + (1.96 * stdH);
    
    if (h > 0 && h < 10 && avgH > 20) {
      warnings.push(`Statistical Anomaly: Height ${h}" is suspiciously small (possible transposition error).`);
    } else if (h < lowerBoundH || h > upperBoundH) {
      warnings.push(`Statistical Anomaly: Height ${h}" falls outside 95% confidence bounds (avg: ${Math.round(avgH)}").`);
    }
  }

  // Check room consistency (color, grids)
  const sameRoom = allOpenings.filter(o => o.id !== opening.id && o.roomLocation === opening.roomLocation && o.roomLocation);
  if (sameRoom.length > 0) {
    const roomColors = sameRoom.map(o => o.interiorColor).filter(Boolean);
    if (roomColors.length > 0 && opening.interiorColor && !roomColors.includes(opening.interiorColor)) {
      warnings.push(`Color "${opening.interiorColor}" differs from other ${opening.roomLocation} windows (${roomColors[0]})`);
    }
    const roomGrids = sameRoom.map(o => o.gridStyle).filter(Boolean);
    if (roomGrids.length > 0 && opening.gridStyle && !roomGrids.includes(opening.gridStyle)) {
      warnings.push(`Grid style "${opening.gridStyle}" differs from other ${opening.roomLocation} windows`);
    }
  }

  // Elevation consistency
  const sameElev = allOpenings.filter(o => o.id !== opening.id && o.elevation === opening.elevation && o.elevation);
  if (sameElev.length > 0) {
    const elevColors = sameElev.map(o => o.exteriorColor).filter(Boolean);
    if (elevColors.length > 0 && opening.exteriorColor && !elevColors.includes(opening.exteriorColor)) {
      warnings.push(`Exterior color differs from other ${opening.elevation} elevation windows`);
    }
  }

  return warnings;
}

// ── Auto-generate manufacturer notes ───────────────────
function generateAutoNotes(opening: Opening, isBrickHouse: boolean): string[] {
  const notes: string[] = [];
  const cat = opening.productCategory || 'double_hung';
  const w = opening.width || 0;
  const h = opening.height || 0;
  const ui = w + h;

  // Base description
  if (w > 0 && h > 0) {
    let desc = `${w}x${h} ${cat.replace(/_/g, ' ')}`;
    if (opening.interiorColor && opening.exteriorColor) {
      desc += `, ${opening.interiorColor}/${opening.exteriorColor}`;
    }
    notes.push(desc);
  }

  // Brick house
  if (isBrickHouse) {
    notes.push('Brick replacement insert. Measure from outside.');
    if (opening.openingVariance && opening.openingVariance >= 0.25) {
      notes.push(`Uneven masonry opening (variance: ${opening.openingVariance}"). Verify depth before manufacturing.`);
    }
  }

  // Specialty
  if (cat === 'eyebrow' && opening.radius) {
    notes.push(`Eyebrow: rise ${opening.radius ? Math.round(w / 6) : '?'}", leg height ${opening.legHeight || '?'}".`);
  }
  if (opening.oriel) {
    notes.push('Oriel DH. Verify sash split ratio.');
  }

  // Tempered
  if (opening.temperedGlass && opening.temperedGlass !== 'none') {
    notes.push(`Tempered glass: ${opening.temperedGlass}.`);
  }

  // Obscure
  if (opening.obscureGlass && opening.obscureGlass !== 'none') {
    notes.push(`Obscure glass: ${opening.obscureGlass}.`);
  }

  return notes;
}

// ── Next best action ───────────────────────────────────
function getNextAction(opening: Opening, missingFields: { field: string; label: string; severity: string }[]): string | null {
  // Priority: required fields first, then recommended
  const required = missingFields.filter(f => f.severity === 'required');
  if (required.length > 0) return `Next: ${required[0].label}`;

  const recommended = missingFields.filter(f => f.severity === 'recommended');
  if (recommended.length > 0) return `Recommended: ${recommended[0].label}`;

  if (opening.needsVerification) return 'Confirm: measurements verified';

  return null;
}

// ── Main validation function ───────────────────────────
export function validateOpening(opening: Opening, allOpenings: Opening[], isBrickHouse: boolean): ValidationResult {
  const requiredFields = getRequiredFields(opening, isBrickHouse);
  const missing = requiredFields.filter(f => !isFilled(opening, f.field));
  const filledCount = requiredFields.length - missing.length;
  const score = requiredFields.length > 0 ? Math.round((filledCount / requiredFields.length) * 100) : 0;

  const { score: riskScore, factors: riskFactors } = calculateRisk(opening, isBrickHouse);
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    riskScore <= 2 ? 'low' : riskScore <= 4 ? 'medium' : riskScore <= 7 ? 'high' : 'critical';

  const warnings: ValidationResult['warnings'] = [];

  // Outlier detection
  const outliers = detectOutliers(opening, allOpenings);
  outliers.forEach(msg => warnings.push({ message: msg, severity: 'warning', code: 'outlier' }));

  // Risk factor warnings
  riskFactors.forEach(f => warnings.push({ message: f, severity: riskScore > 5 ? 'critical' : 'warning', code: 'risk' }));

  // Tempered detection
  const room = (opening.roomLocation || '').toLowerCase();
  if ((room.includes('bath') || room.includes('shower')) && (!opening.temperedGlass || opening.temperedGlass === 'none')) {
    warnings.push({ message: 'Bathroom — tempered glass likely required by code', severity: 'critical', code: 'tempered' });
  }

  // Depth warning
  if (isBrickHouse && (!opening.openingDepth || opening.openingDepth === 0)) {
    warnings.push({ message: 'Brick house — depth measurement required', severity: 'critical', code: 'depth' });
  }

  // Stucco removal detection
  const extSurface = (opening.exteriorType || opening.exteriorSurface || '').toLowerCase();
  const removalType = (opening.removalType || '').toUpperCase();
  if (extSurface.includes('stucco') && removalType === 'ALUM' && !opening.stuccoRemoval) {
    warnings.push({ message: 'Stucco + Aluminum removal detected. Confirm "Remove Aluminum from Stucco" add-on.', severity: 'warning', code: 'stucco_removal' });
  }

  // Glass restriction warning
  const glassVal = opening.glassPackage || opening.glassOption || '';
  if (glassVal && glassVal !== '' && glassVal !== 'LE' && glassVal !== 'LEE') {
    warnings.push({ message: `Glass "${glassVal}" is not a standard option. Only LE and LEE are available.`, severity: 'warning', code: 'glass_restriction' });
  }

  // Photo requirements
  const photo = checkPhotoRequired(opening, isBrickHouse);

  // Auto notes
  const autoNotes = generateAutoNotes(opening, isBrickHouse);

  // Status
  const requiredMissing = missing.filter(f => f.severity === 'required');
  let status: ValidationResult['status'];
  if (requiredMissing.length > 0) status = 'incomplete';
  else if (warnings.some(w => w.severity === 'critical')) status = 'high_risk';
  else if (missing.length > 0 || warnings.length > 0) status = 'needs_review';
  else if (riskScore <= 2) status = 'ready';
  else status = 'complete';

  const nextAction = getNextAction(opening, missing);

  return {
    score, status, missingFields: missing, warnings, riskScore, riskLevel,
    nextAction, autoNotes, requiresPhoto: photo.required, photoReasons: photo.reasons,
    measurementConfirmed: opening.measurementConfirmed || false,
  };
}

// ── Stage-aware validation ─────────────────────────────
// Applies WW defaults before validation so that at save_item stage,
// fields with standard defaults count as "filled" and don't block the rep.
export function validateOpeningWithStage(
  opening: Opening,
  allOpenings: Opening[],
  isBrickHouse: boolean,
  stage: ValidationStage = 'save_item',
): ValidationResult & { defaultsApplied: number } {
  // Apply defaults to a copy for validation purposes
  const resolverResult = resolveOpeningDefaults(opening, { stage });
  const openingWithDefaults = { ...opening, ...resolverResult.defaults };
  const result = validateOpening(openingWithDefaults, allOpenings, isBrickHouse);
  return {
    ...result,
    defaultsApplied: Object.keys(resolverResult.defaults).length,
  };
}

// ── Project-level health ───────────────────────────────
export interface ProjectHealth {
  totalOpenings: number;
  completedCount: number;
  incompleteCount: number;
  highRiskCount: number;
  avgScore: number;
  avgRisk: number;
  totalWarnings: number;
  missingPhotos: number;
  missingDepth: number;
  missingTempered: number;
  specialtyReview: number;
  submissionReady: boolean;
  submissionBlockers: string[];
}

export function calculateProjectHealth(openings: Opening[], isBrickHouse: boolean): ProjectHealth {
  if (openings.length === 0) {
    return {
      totalOpenings: 0, completedCount: 0, incompleteCount: 0, highRiskCount: 0,
      avgScore: 0, avgRisk: 0, totalWarnings: 0, missingPhotos: 0, missingDepth: 0,
      missingTempered: 0, specialtyReview: 0, submissionReady: false,
      submissionBlockers: ['No openings added'],
    };
  }

  const results = openings.map(o => validateOpening(o, openings, isBrickHouse));
  const blockers: string[] = [];

  const completedCount = results.filter(r => r.status === 'ready' || r.status === 'complete').length;
  const incompleteCount = results.filter(r => r.status === 'incomplete').length;
  const highRiskCount = results.filter(r => r.status === 'high_risk' || r.riskLevel === 'critical').length;
  const avgScore = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
  const avgRisk = Math.round((results.reduce((a, r) => a + r.riskScore, 0) / results.length) * 10) / 10;
  const totalWarnings = results.reduce((a, r) => a + r.warnings.length, 0);
  const missingPhotos = results.filter(r => r.requiresPhoto).length;
  const missingDepth = results.filter(r => r.missingFields.some(f => f.field === 'openingDepth')).length;
  const missingTempered = results.filter(r => r.warnings.some(w => w.code === 'tempered')).length;
  const specialtyReview = results.filter(r => ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(openings[results.indexOf(r)]?.productCategory)).length;

  if (incompleteCount > 0) blockers.push(`${incompleteCount} incomplete opening${incompleteCount > 1 ? 's' : ''}`);
  if (highRiskCount > 0) blockers.push(`${highRiskCount} high-risk opening${highRiskCount > 1 ? 's' : ''}`);
  if (missingDepth > 0 && isBrickHouse) blockers.push(`${missingDepth} missing depth measurement${missingDepth > 1 ? 's' : ''}`);
  if (missingTempered > 0) blockers.push(`${missingTempered} unresolved tempered requirement${missingTempered > 1 ? 's' : ''}`);

  return {
    totalOpenings: openings.length, completedCount, incompleteCount, highRiskCount,
    avgScore, avgRisk, totalWarnings, missingPhotos, missingDepth, missingTempered,
    specialtyReview, submissionReady: blockers.length === 0,
    submissionBlockers: blockers,
  };
}

// ── Quick Presets ───────────────────────────────────────
export const OPENING_PRESETS = [
  {
    id: 'std_dh', name: 'Standard DH', icon: '🪟', color: '#3fb950',
    fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'brick_dh', name: 'Brick Replacement', icon: '🧱', color: '#d2691e',
    fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false, measureFrom: 'outside', measurementStrategy: 'smallest' },
  },
  {
    id: 'bath', name: 'Bathroom Window', icon: '🚿', color: '#58a6ff',
    fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'full', obscureGlass: 'full', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'eyebrow_dh', name: 'Eyebrow DH', icon: '🌙', color: '#d29922',
    fields: { productCategory: 'eyebrow', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'oriel_dh', name: 'Oriel DH', icon: '📐', color: '#bc8cff',
    fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', oriel: true, temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'slider', name: 'Slider', icon: '↔️', color: '#f0883e',
    fields: { productCategory: 'slider', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'picture', name: 'Picture Window', icon: '🖼️', color: '#8b949e',
    fields: { productCategory: 'picture', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'No Screen', removalType: 'ALUM', foamEnhanced: false },
  },
  {
    id: 'casement', name: 'Casement', icon: '🚪', color: '#7ee787',
    fields: { productCategory: 'casement', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none', screenOption: 'Half Screen', removalType: 'ALUM', foamEnhanced: false },
  },
];
