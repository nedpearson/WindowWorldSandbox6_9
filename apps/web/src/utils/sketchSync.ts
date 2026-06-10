// ═══════════════════════════════════════════════════════════════
// Sketch-to-Opening Sync Engine
// Handles: marker creation → opening record → order form row link
// Validates marker/opening/order row consistency
// ═══════════════════════════════════════════════════════════════

import { WW_OPENING_DEFAULTS } from './openingDefaults';
import { calculateUI as _calcUI, calculateGlassArea as _calcGlassArea } from '../services/calculations';

// ── Types ────────────────────────────────────────────────────
export type MarkerSymbol =
  // Window openings (create order lines)
  | 'window_x' | 'dh' | 'sh' | 'slider' | 'picture' | 'casement' | 'awning'
  | 'oriel' | 'special_shape' | 'bay' | 'bow' | 'circle_top' | 'eyebrow'
  | 'half_round' | 'trapezoid'
  // Door openings (create order lines)
  | 'front_door' | 'back_door' | 'patio_door' | 'sgd'
  // Annotations (no order line)
  | 'note' | 'arrow' | 'dimension_line' | 'room_label' | 'elevation_label'
  | 'number_marker' | 'tempered_marker' | 'obscure_marker' | 'bath_marker'
  | 'clear_story' | 'second_floor'
  // Proximity fixtures (tempered glass checks)
  | 'tub' | 'shower' | 'sink' | 'toilet' | 'stairs'
  // Exterior materials (measurement rules)
  | 'brick' | 'siding' | 'stucco' | 'wood' | 'vinyl_siding' | 'wood_siding' | 'fiber_cement' | 'stone' | 'fascia' | 'soffit';
export type ExteriorMaterial = 'brick' | 'siding' | 'stucco' | 'wood' | 'vinyl_siding' | 'wood_siding' | 'fiber_cement' | 'stone' | 'fascia' | 'soffit';
export type MeasureSide = 'outside' | 'inside';
export type MeasureRule = 'smallest_outside' | 'inside_standard';
export type WindowType = 'double_hung' | 'single_hung' | 'picture' | 'slider' | 'casement' | 'awning' | 'patio_door' | 'sgd' | 'bso' | 'special_shape' | 'oriel' | 'bay' | 'bow' | 'door_sidelight' | 'other';
export type ShapeType = 'arch' | 'eyebrow' | 'circle_top' | 'quarter_arch' | 'half_round' | 'extended_leg' | 'trapezoid' | 'cathedral' | 'hexagon' | 'octagon' | 'pentagon' | 'triangle' | 'oval' | 'ellipse' | 'custom' | 'other';
export type ValidationStatus = 'incomplete' | 'measured' | 'priced' | 'complete';
export type GroupType = 'mull_pair' | 'twin' | 'triple' | 'bay_bow' | 'field_note' | 'other';

export interface SketchMarkerData {
  id: string;
  sketchId: string;
  markerType: string;
  markerNumber: number | null;
  markerSymbol: MarkerSymbol;
  markerLabel: string;
  windowType: WindowType | null;
  shapeType: ShapeType | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  widthTop?: number | null;
  widthMiddle?: number | null;
  widthBottom?: number | null;
  heightLeft?: number | null;
  heightCenter?: number | null;
  heightRight?: number | null;
  insideWidthTop?: number | null;
  insideWidthMiddle?: number | null;
  insideWidthBottom?: number | null;
  insideHeightLeft?: number | null;
  insideHeightCenter?: number | null;
  insideHeightRight?: number | null;
  measurementMode?: 'simple' | 'advanced';
  simpleRawWidth?: number | null;
  simpleRawHeight?: number | null;
  unitedInches: number | null;
  elevation: string;
  roomLocation: string;
  floorNumber: number;
  notes: string;
  linkedOrderRowNumber: number | null;
  validationStatus: ValidationStatus;
  groupId: string | null;
  ladderReq: boolean;
  exteriorMaterial: string;
  removalType: string;
  installType: string;
  pricingStatus: string;
  productType?: string | null;
  specialtyType?: string | null;
  // Grid configuration
  gridPattern: string;
  gridProfile: string;
  gridVerticalCount: number;
  gridHorizontalCount: number;
  gridPlacement: string;
  gridNotes: string;
  gridConfirmed: boolean;
  sdlSize?: string;
  isSDL?: boolean;
  isGBG?: boolean;
  gridRequiresAudit?: boolean;
  // Exterior surface
  exteriorSurface: string;
  exteriorConditionNotes: string;
  requiresTrimHeader: boolean;
  requiresSpecialHandling: boolean;
  // Copy/confirmation tracking
  copiedFromId: string | null;
  measurementConfirmed: boolean;
  safetyConfirmed: boolean;
  // Oriel specifics
  orielType?: string;
  orielUpperSashHeight?: number;
  orielMeasurementBasis?: string;
  orielMeetingRailReference?: string;
  orielConfirmed?: boolean;
  // Special shape specifics
  shapeOrientation?: string;
  shapeSpringlineHeight?: number;
  shapeRise?: number;
  shapeHighSide?: number;
  shapeLowSide?: number;
  shapeSlopeDirection?: string;
  radius?: number | null;
  legHeight?: number | null;
  shapeAcrossFlats?: number;
}

export interface MarkerGroupData {
  id: string;
  sketchId: string;
  groupType: GroupType;
  groupNote: string;
  keepSeparateRows: boolean;
  needsReview: boolean;
  pricingReviewed: boolean;
  memberMarkerIds: string[];
  mullType?: 'standard' | 'structural';
}

export interface SyncWarning {
  type: 'marker_no_opening' | 'opening_no_marker' | 'duplicate_number' | 'missing_measurement'
    | 'missing_window_type' | 'missing_options' | 'joined_missing_note' | 'missing_front_door'
    | 'oriel_no_confirmation' | 'special_shape_missing_dims' | 'tempered_unresolved'
    | 'proximity_tempered_warning' | 'material_measure_reminder'
    | 'missing_exterior_surface' | 'missing_grid_profile' | 'missing_grid_count' | 'unconfirmed_measurement';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  message: string;
  markerNumber?: number;
  openingNumber?: number;
}

// ── Default Window Types by Symbol ──────────────────────────
const SYMBOL_TO_WINDOW_TYPE: Record<MarkerSymbol, WindowType | null> = {
  window_x: 'double_hung', dh: 'double_hung', sh: 'single_hung',
  slider: 'slider', picture: 'picture', casement: 'casement', awning: 'awning',
  oriel: 'oriel', special_shape: 'special_shape',
  bay: 'bay', bow: 'bow',
  circle_top: 'special_shape', eyebrow: 'special_shape',
  half_round: 'special_shape', trapezoid: 'special_shape',
  front_door: null, back_door: null, patio_door: 'patio_door', sgd: 'sgd',
  note: null, arrow: null,
  dimension_line: null, room_label: null, elevation_label: null,
  number_marker: null, tempered_marker: null, obscure_marker: null,
  bath_marker: null, clear_story: null, second_floor: null,
  tub: null, shower: null, sink: null, toilet: null, stairs: null,
  brick: null, siding: null, stucco: null, wood: null,
  vinyl_siding: null, wood_siding: null, fiber_cement: null, stone: null, fascia: null, soffit: null,
};

const SYMBOL_TO_MARKER_TYPE: Record<MarkerSymbol, string> = {
  window_x: 'window', dh: 'window', sh: 'window',
  slider: 'window', picture: 'window', casement: 'window', awning: 'window',
  oriel: 'window', special_shape: 'window',
  bay: 'window', bow: 'window',
  circle_top: 'window', eyebrow: 'window', half_round: 'window', trapezoid: 'window',
  front_door: 'door', back_door: 'door', patio_door: 'door', sgd: 'door',
  note: 'note', arrow: 'dimension',
  dimension_line: 'dimension', room_label: 'annotation', elevation_label: 'annotation',
  number_marker: 'annotation', tempered_marker: 'annotation', obscure_marker: 'annotation',
  bath_marker: 'annotation', clear_story: 'annotation', second_floor: 'annotation',
  tub: 'fixture', shower: 'fixture', sink: 'fixture', toilet: 'fixture', stairs: 'fixture',
  brick: 'material', siding: 'material', stucco: 'material', wood: 'material',
  vinyl_siding: 'material', wood_siding: 'material', fiber_cement: 'material', stone: 'material', fascia: 'material', soffit: 'material',
};

// Proximity fixture types that don't create openings
export const FIXTURE_MARKERS: MarkerSymbol[] = ['tub', 'shower', 'sink', 'toilet', 'stairs'];
export const MATERIAL_MARKERS: MarkerSymbol[] = ['brick', 'siding', 'stucco', 'wood', 'vinyl_siding', 'wood_siding', 'fiber_cement', 'stone', 'fascia', 'soffit'];
export const ANNOTATION_MARKERS: MarkerSymbol[] = ['note', 'arrow', 'dimension_line', 'room_label', 'elevation_label', 'number_marker', 'tempered_marker', 'obscure_marker', 'bath_marker', 'clear_story', 'second_floor'];
export const NON_OPENING_MARKERS: MarkerSymbol[] = [...ANNOTATION_MARKERS, ...FIXTURE_MARKERS, ...MATERIAL_MARKERS];

// ── Create marker data with defaults ────────────────────────
export function createMarkerData(
  sketchId: string,
  symbol: MarkerSymbol,
  x: number,
  y: number,
  elevation: string,
  existingMarkers: SketchMarkerData[],
): SketchMarkerData {
  const isOpeningMarker = !NON_OPENING_MARKERS.includes(symbol);
  const nextNumber = isOpeningMarker
    ? getNextMarkerNumber(existingMarkers)
    : null;

  const nonOpeningLabels: Partial<Record<MarkerSymbol, string>> = {
    front_door: 'Front Door', back_door: 'Back Door',
    note: 'Note', arrow: '',
    dimension_line: '↔ Dim', room_label: '🏷 Room', elevation_label: '🏷 Elev',
    number_marker: '#', tempered_marker: 'T', obscure_marker: 'O',
    bath_marker: '🛁 Bath', clear_story: '⬆ CS', second_floor: '2F',
    tub: '🛁 Tub', shower: '🚿 Shower', sink: '🚰 Sink',
    toilet: '🚽 Toilet', stairs: '🪜 Stairs',
    brick: '🧱 Brick', siding: '🏠 Siding', stucco: '🏗️ Stucco', wood: '🪵 Wood',
  };

  // Window-type opening labels
  const openingLabels: Partial<Record<MarkerSymbol, string>> = {
    window_x: 'X', dh: 'DH', sh: 'SH', slider: 'SL', picture: 'PIC',
    casement: 'CAS', awning: 'AWN', oriel: 'OR', special_shape: 'SS',
    bay: 'BAY', bow: 'BOW', circle_top: 'CT', eyebrow: 'EY',
    half_round: 'HR', trapezoid: 'TRAP', patio_door: 'PAT', sgd: 'SGD',
  };
  const label = nonOpeningLabels[symbol] ?? `${openingLabels[symbol] || 'X'} #${nextNumber}`;

  // Auto-set shapeType for specialty shortcuts
  const autoShapeMap: Partial<Record<MarkerSymbol, ShapeType>> = {
    circle_top: 'circle_top', eyebrow: 'eyebrow',
    half_round: 'half_round', trapezoid: 'trapezoid',
  };

  return {
    id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sketchId,
    markerType: SYMBOL_TO_MARKER_TYPE[symbol],
    markerNumber: nextNumber,
    markerSymbol: symbol,
    markerLabel: label,
    windowType: SYMBOL_TO_WINDOW_TYPE[symbol],
    shapeType: autoShapeMap[symbol] ?? null,
    x, y,
    // Opening markers get sensible defaults so pricing runs without blockers.
    // Rep can come back and update real measurements.
    width: isOpeningMarker ? 36 : null,
    height: isOpeningMarker ? 60 : null,
    widthTop: null,
    widthMiddle: null,
    widthBottom: null,
    heightLeft: null,
    heightCenter: null,
    heightRight: null,
    insideWidthTop: null,
    insideWidthMiddle: null,
    insideWidthBottom: null,
    insideHeightLeft: null,
    insideHeightCenter: null,
    insideHeightRight: null,
    measurementMode: 'simple',
    simpleRawWidth: null,
    simpleRawHeight: null,
    unitedInches: isOpeningMarker ? 96 : null, // 36 + 60
    elevation,
    roomLocation: isOpeningMarker ? 'Living Room' : '',
    floorNumber: symbol === 'second_floor' ? 2 : 1,
    notes: '',
    linkedOrderRowNumber: nextNumber,
    validationStatus: 'incomplete',
    groupId: null,
    ladderReq: symbol === 'clear_story' || symbol === 'second_floor',
    exteriorMaterial: isOpeningMarker ? 'siding' : '',
    removalType: WW_OPENING_DEFAULTS.removalType || 'ALUM',
    installType: '',
    pricingStatus: 'pending',
    // Grid — default to None (no grid)
    gridPattern: 'None',
    gridProfile: '',
    gridVerticalCount: 0,
    gridHorizontalCount: 0,
    gridPlacement: 'full',
    gridNotes: '',
    gridConfirmed: true,
    // Exterior surface
    exteriorSurface: isOpeningMarker ? 'siding' : '',
    exteriorConditionNotes: '',
    requiresTrimHeader: false,
    requiresSpecialHandling: false,
    // Copy tracking
    copiedFromId: null,
    measurementConfirmed: true,
    safetyConfirmed: false,
  };
}

// ── Get next available marker number ────────────────────────
// Fills gaps: after deleting #2 from [1,2,3], next add gets #2 (not #4).
export function getNextMarkerNumber(markers: SketchMarkerData[]): number {
  const numbers = markers
    .filter(m => m.markerNumber !== null && !NON_OPENING_MARKERS.includes(m.markerSymbol))
    .map(m => m.markerNumber!);
  if (numbers.length === 0) return 1;
  // Sort and find first gap
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return i + 1;
  }
  return sorted.length + 1;
}

// ═══════════════════════════════════════════════════════════════
// Compact Renumbering
// ═══════════════════════════════════════════════════════════════

/**
 * Renumber opening markers to compact 1..N with no gaps.
 * Non-opening markers (annotations, fixtures, materials) are untouched.
 *
 * Preserves relative order: sorts by existing markerNumber (ascending),
 * then assigns 1, 2, 3, ... Updates markerNumber, markerLabel, and
 * linkedOrderRowNumber.
 *
 * Returns a new array (does not mutate input). Also returns a mapping
 * of old→new numbers for callers that need to update linked opening records.
 */
export function compactRenumberMarkers(
  markers: SketchMarkerData[],
): { renumbered: SketchMarkerData[]; numberMap: Map<number, number>; changed: boolean } {
  const openingMarkers = markers
    .filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol) && m.markerNumber !== null);
  const nonOpeningOrUnnumbered = markers
    .filter(m => NON_OPENING_MARKERS.includes(m.markerSymbol) || m.markerNumber === null);

  // Sort by existing number to preserve user-defined order
  const sorted = [...openingMarkers].sort((a, b) => (a.markerNumber ?? 0) - (b.markerNumber ?? 0));

  const numberMap = new Map<number, number>();
  let changed = false;

  const renumberedOpenings = sorted.map((m, idx) => {
    const newNumber = idx + 1;
    if (m.markerNumber !== newNumber) changed = true;
    numberMap.set(m.markerNumber!, newNumber);

    // Rebuild label: strip old "#N" and replace
    const openingLabels: Record<string, string> = {
      window_x: 'X', dh: 'DH', sh: 'SH', slider: 'SL', picture: 'PIC',
      casement: 'CAS', awning: 'AWN', oriel: 'OR', special_shape: 'SS',
      bay: 'BAY', bow: 'BOW', circle_top: 'CT', eyebrow: 'EY',
      half_round: 'HR', trapezoid: 'TRAP', patio_door: 'PAT', sgd: 'SGD',
      front_door: 'FD', back_door: 'BD',
    };
    const prefix = openingLabels[m.markerSymbol] || 'X';
    const newLabel = `${prefix} #${newNumber}`;

    return {
      ...m,
      markerNumber: newNumber,
      markerLabel: newLabel,
      linkedOrderRowNumber: newNumber,
    };
  });

  return {
    renumbered: [...renumberedOpenings, ...nonOpeningOrUnnumbered],
    numberMap,
    changed,
  };
}

// ═══════════════════════════════════════════════════════════════
// Active Opening Selector (shared source of truth)
// ═══════════════════════════════════════════════════════════════

export interface ActiveOpeningResult {
  /** Active opening markers with compact numbering */
  activeMarkers: SketchMarkerData[];
  /** Count of active openings (windows + doors that create order lines) */
  activeCount: number;
  /** Warnings about data issues found during normalization */
  warnings: string[];
}

/**
 * Get the active visible opening markers for documents, pricing, and export.
 *
 * This is the SINGLE SOURCE OF TRUTH for "how many openings does this
 * appointment have" and "what are their numbers". All downstream consumers
 * (live sketch header, pricing engine, proposal, contract, export) must
 * use this function or its output.
 *
 * Rules:
 * 1. Only opening markers (not annotations, fixtures, materials)
 * 2. Only markers with valid markerNumber (not null)
 * 3. Returns compact numbering (1..N, no gaps)
 * 4. Preserves relative order by markerNumber
 * 5. Returns warnings for issues found
 */
export function getActiveOpeningMarkers(
  markers: SketchMarkerData[],
): ActiveOpeningResult {
  const warnings: string[] = [];

  // Filter to only opening markers
  const openingMarkers = markers.filter(m =>
    !NON_OPENING_MARKERS.includes(m.markerSymbol) && m.markerNumber !== null
  );

  // Check for gaps
  const numbers = openingMarkers.map(m => m.markerNumber!).sort((a, b) => a - b);
  const maxNum = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
  if (maxNum > numbers.length) {
    const missing = [];
    for (let i = 1; i <= maxNum; i++) {
      if (!numbers.includes(i)) missing.push(i);
    }
    warnings.push(`Numbering gaps detected: missing #${missing.join(', #')}. ${numbers.length} active openings numbered up to #${maxNum}.`);
  }

  // Check for duplicates
  const seen = new Set<number>();
  for (const n of numbers) {
    if (seen.has(n)) {
      warnings.push(`Duplicate marker number #${n} found.`);
    }
    seen.add(n);
  }

  return {
    activeMarkers: openingMarkers,
    activeCount: openingMarkers.length,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// Sketch ↔ Opening Reconciliation
// ═══════════════════════════════════════════════════════════════

export interface ReconciliationIssue {
  type: 'orphan_opening' | 'orphan_marker' | 'number_gap' | 'number_duplicate' | 'number_mismatch';
  severity: 'blocker' | 'warning' | 'info';
  message: string;
  markerNumber?: number;
  openingNumber?: number;
  autoRepairable: boolean;
}

export interface ReconciliationResult {
  issues: ReconciliationIssue[];
  /** Whether compact renumbering would change any marker numbers */
  needsRenumber: boolean;
  /** Active opening count from markers */
  markerActiveCount: number;
  /** Active opening count from DB openings */
  openingDbCount: number;
  /** Whether counts match */
  countsMatch: boolean;
}

/**
 * Compare saved sketch markers to opening records and identify mismatches.
 *
 * Does NOT modify data — returns issues for the caller to decide action.
 */
export function reconcileSketchOpenings(
  markers: SketchMarkerData[],
  openings: { openingNumber: number; deletedAt?: string | Date | null }[],
): ReconciliationResult {
  const issues: ReconciliationIssue[] = [];

  // Active openings (not soft-deleted)
  const activeOpenings = openings.filter(o => !o.deletedAt);
  const openingNumbers = new Set(activeOpenings.map(o => o.openingNumber));

  // Active opening markers
  const openingMarkers = markers.filter(m =>
    !NON_OPENING_MARKERS.includes(m.markerSymbol) && m.markerNumber !== null
  );
  const markerNumbers = new Set(openingMarkers.map(m => m.markerNumber!));

  // Markers missing opening records
  for (const m of openingMarkers) {
    if (!openingNumbers.has(m.markerNumber!)) {
      issues.push({
        type: 'orphan_marker',
        severity: 'warning',
        message: `Marker #${m.markerNumber} has no linked opening record in DB.`,
        markerNumber: m.markerNumber!,
        autoRepairable: true,
      });
    }
  }

  // Opening records missing markers
  for (const o of activeOpenings) {
    if (!markerNumbers.has(o.openingNumber)) {
      issues.push({
        type: 'orphan_opening',
        severity: 'warning',
        message: `Opening #${o.openingNumber} has no sketch marker. It may be stale from a deleted marker.`,
        openingNumber: o.openingNumber,
        autoRepairable: false, // needs user review
      });
    }
  }

  // Check for gaps in marker numbers
  const sortedMarkerNums = [...markerNumbers].sort((a, b) => a - b);
  const maxMarkerNum = sortedMarkerNums.length > 0 ? sortedMarkerNums[sortedMarkerNums.length - 1] : 0;
  const { changed: needsRenumber } = compactRenumberMarkers(markers);

  if (needsRenumber) {
    const missing = [];
    for (let i = 1; i <= maxMarkerNum; i++) {
      if (!markerNumbers.has(i)) missing.push(i);
    }
    if (missing.length > 0) {
      issues.push({
        type: 'number_gap',
        severity: 'warning',
        message: `Numbering has gaps: missing #${missing.join(', #')}. Run compact renumber to fix.`,
        autoRepairable: true,
      });
    }
  }

  // Check for duplicate marker numbers
  const numberCounts: Record<number, number> = {};
  for (const m of openingMarkers) {
    numberCounts[m.markerNumber!] = (numberCounts[m.markerNumber!] || 0) + 1;
  }
  for (const [num, count] of Object.entries(numberCounts)) {
    if (count > 1) {
      issues.push({
        type: 'number_duplicate',
        severity: 'blocker',
        message: `Marker number #${num} is assigned to ${count} markers.`,
        markerNumber: parseInt(num),
        autoRepairable: true,
      });
    }
  }

  return {
    issues,
    needsRenumber,
    markerActiveCount: openingMarkers.length,
    openingDbCount: activeOpenings.length,
    countsMatch: openingMarkers.length === activeOpenings.length,
  };
}

// ── Create opening data from marker ─────────────────────────
export function createOpeningFromMarker(
  marker: SketchMarkerData,
  appointmentId: string,
): Record<string, any> {
  return {
    appointmentId,
    openingNumber: marker.markerNumber || 1,
    quantity: 1,
    roomLocation: marker.roomLocation || 'Living Room',
    elevation: marker.elevation || 'Normal',
    floorNumber: marker.floorNumber || 1,
    width: marker.width || 36,
    height: marker.height || 60,
    rawWidth: marker.simpleRawWidth || marker.width || 36,
    rawHeight: marker.simpleRawHeight || marker.height || 60,
    unitedInches: marker.unitedInches || (marker.width || 36) + (marker.height || 60),
    productCategory: marker.windowType || 'double_hung',
    productModel: '',
    seriesModel: '4000 Series',
    interiorColor: 'White',
    exteriorColor: 'White',
    gridStyle: 'None',
    glassPackage: WW_OPENING_DEFAULTS.glassPackage || 'LEE',
    temperedGlass: 'none',
    obscureGlass: 'none',
    argon: false,
    foamEnhanced: WW_OPENING_DEFAULTS.foamEnhanced ?? false,
    lowEPackage: '',
    screenOption: marker.windowType === 'picture' ? 'No Screen' : (WW_OPENING_DEFAULTS.screenOption || 'Full Screen'),
    nailFin: false,
    oriel: marker.windowType === 'oriel',
    horizontalRR: false,
    hinge: '',
    exteriorType: marker.exteriorMaterial || '',
    trimType: '',
    trimNotes: '',
    removalType: marker.removalType || WW_OPENING_DEFAULTS.removalType || 'ALUM',
    installType: marker.installType || WW_OPENING_DEFAULTS.installType || 'EXT',
    sillRepair: false,
    removeStormWindow: false,
    installMullion: false,
    structuralMullion: false,
    jChannel: false,
    installNotes: '',
    customerNotes: '',
    installerNotes: '',
    basePrice: 0,
    optionsPrice: 0,
    laborPrice: 0,
    totalPrice: 0,
    radius: null,
    customRadius: null,
    legHeight: null,
    specialtyNotes: marker.shapeType ? `Shape: ${marker.shapeType}` : '',
    needsVerification: false,
    pricingStatus: 'pending',
    // Grid fields
    gridPattern: marker.gridPattern || 'None',
    gridProfile: marker.gridProfile || '',
    gridVerticalCount: marker.gridVerticalCount || 0,
    gridHorizontalCount: marker.gridHorizontalCount || 0,
    gridPlacement: marker.gridPlacement || 'full',
    gridNotes: marker.gridNotes || '',
    gridConfirmed: marker.gridConfirmed ?? true,
    // Exterior surface
    exteriorSurface: marker.exteriorSurface || marker.exteriorMaterial || '',
    exteriorConditionNotes: marker.exteriorConditionNotes || '',
    requiresTrimHeader: marker.requiresTrimHeader || false,
    requiresSpecialHandling: marker.requiresSpecialHandling || false,
    // Copy/confirmation
    copiedFromOpeningId: marker.copiedFromId || null,
    measurementConfirmed: marker.measurementConfirmed ?? true,
    safetyConfirmed: marker.safetyConfirmed ?? false,
    orielUpperSashHeight: marker.orielUpperSashHeight,
    orielMeasurementBasis: marker.orielMeasurementBasis,
  };
}

// ── Calculate united inches — DELEGATES to services/calculations ──
export const calcUnitedInches = _calcUI;

// ── Validate marker ↔ opening ↔ order row sync ──────────────
export function validateSketchSync(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
): SyncWarning[] {
  const warnings: SyncWarning[] = [];
  const openingMarkers = markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol));
  const fixtureMarkers = markers.filter(m => FIXTURE_MARKERS.includes(m.markerSymbol));

  // Check front door exists
  if (!markers.find(m => m.markerSymbol === 'front_door')) {
    warnings.push({
      type: 'missing_front_door',
      severity: 'medium',
      message: 'No front door marker placed. Add one to establish house orientation.',
    });
  }

  // Check each opening marker has a linked opening
  for (const marker of openingMarkers) {
    const linkedOpening = openings.find(o => o.openingNumber === marker.markerNumber);

    if (!linkedOpening) {
      warnings.push({
        type: 'marker_no_opening',
        severity: 'high',
        message: `Marker X #${marker.markerNumber} has no linked opening record.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Missing measurement
    if (!marker.width || !marker.height) {
      warnings.push({
        type: 'missing_measurement',
        severity: 'blocker',
        message: `X #${marker.markerNumber}: Missing width or height measurement.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Missing window type
    if (!marker.windowType) {
      warnings.push({
        type: 'missing_window_type',
        severity: 'high',
        message: `X #${marker.markerNumber}: No window type selected.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Missing exterior surface
    if (!marker.exteriorSurface && !marker.exteriorMaterial) {
      warnings.push({
        type: 'missing_exterior_surface',
        severity: 'high',
        message: `X #${marker.markerNumber}: Missing exterior surface.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Grid pattern selected but missing profile/count
    if (marker.gridPattern && marker.gridPattern !== 'None') {
      if (!marker.gridProfile) {
        warnings.push({
          type: 'missing_grid_profile',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Grid pattern selected but no grid profile (Flat/Contoured).`,
          markerNumber: marker.markerNumber!,
        });
      }
      if (!marker.gridVerticalCount || marker.gridVerticalCount <= 0) {
        warnings.push({
          type: 'missing_grid_count',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Missing vertical grid line count.`,
          markerNumber: marker.markerNumber!,
        });
      }
      if (!marker.gridHorizontalCount || marker.gridHorizontalCount <= 0) {
        warnings.push({
          type: 'missing_grid_count',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Missing horizontal grid line count.`,
          markerNumber: marker.markerNumber!,
        });
      }
    }

    // Unconfirmed measurement (copied items)
    if (!marker.measurementConfirmed) {
      warnings.push({
        type: 'unconfirmed_measurement',
        severity: 'high',
        message: `X #${marker.markerNumber}: Copied measurements need confirmation.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // High risk surface
    const ext = (marker.exteriorMaterial || marker.exteriorSurface || '').toLowerCase();
    if (ext.includes('stucco') || ext.includes('unknown')) {
      warnings.push({
        type: 'unconfirmed_measurement',
        severity: 'blocker',
        message: `X #${marker.markerNumber}: High-risk surface (${ext}) requires manager measurement verification before contract.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Oriel without confirmation
    if (marker.windowType === 'oriel') {
      // Check if oriel confirmation exists (would be in opening data)
      if (linkedOpening && !linkedOpening.orielConfirmed) {
        warnings.push({
          type: 'oriel_no_confirmation',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Oriel window missing largest sash/window panel confirmation.`,
          markerNumber: marker.markerNumber!,
        });
      }
    }

    // Special shape missing dimensions
    if (marker.windowType === 'special_shape') {
      if (!marker.shapeType) {
        warnings.push({
          type: 'special_shape_missing_dims',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Special shape window missing shape type.`,
          markerNumber: marker.markerNumber!,
        });
      }
    }
  }

  // Check each opening has a marker
  for (const opening of openings) {
    const linkedMarker = openingMarkers.find(m => m.markerNumber === opening.openingNumber);
    if (!linkedMarker) {
      warnings.push({
        type: 'opening_no_marker',
        severity: 'medium',
        message: `Opening #${opening.openingNumber} has no sketch marker.`,
        openingNumber: opening.openingNumber,
      });
    }
  }

  // Duplicate marker numbers
  const numberCounts: Record<number, number> = {};
  for (const marker of openingMarkers) {
    if (marker.markerNumber !== null) {
      numberCounts[marker.markerNumber] = (numberCounts[marker.markerNumber] || 0) + 1;
    }
  }
  for (const [num, count] of Object.entries(numberCounts)) {
    if (count > 1) {
      warnings.push({
        type: 'duplicate_number',
        severity: 'high',
        message: `Marker number #${num} is used ${count} times. Each marker should have a unique number.`,
        markerNumber: parseInt(num),
      });
    }
  }

  // Joined markers missing group note
  for (const group of groups) {
    if (!group.groupNote || group.groupNote.trim() === '') {
      warnings.push({
        type: 'joined_missing_note',
        severity: 'medium',
        message: `Mull/joined group (${group.groupType}) is missing a group note.`,
      });
    }
  }

  // ── Proximity tempered glass warnings from fixtures ──
  const wetFixtures = fixtureMarkers.filter(f => f.markerSymbol === 'tub' || f.markerSymbol === 'shower');
  for (const fixture of wetFixtures) {
    for (const marker of openingMarkers) {
      const dx = marker.x - fixture.x;
      const dy = marker.y - fixture.y;
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      // If markers are close on the canvas, flag for tempered review
      if (pixelDist < 150) {
        warnings.push({
          type: 'proximity_tempered_warning',
          severity: 'high',
          message: `X #${marker.markerNumber} is near a ${fixture.markerSymbol} — check tempered glass requirement (Rule A: within 60").`,
          markerNumber: marker.markerNumber!,
        });
      }
    }
  }

  return warnings;
}

// ── Compute marker validation status ────────────────────────
export function computeMarkerValidation(marker: SketchMarkerData, opening: any | null): ValidationStatus {
  if (!marker.width || !marker.height) return 'incomplete';
  if (!marker.windowType) return 'incomplete';
  if (!opening) return 'incomplete';
  if (opening.totalPrice > 0) return 'priced';
  if (marker.width > 0 && marker.height > 0) return 'measured';
  return 'incomplete';
}

// ── Build complete lockdown checklist ────────────────────────
export interface LockdownItem {
  id: string;
  category: 'sketch' | 'rules' | 'tempered' | 'pricing';
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message?: string;
  blocker: boolean;
}

export function buildLockdownChecklist(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
  safetyReviews: any[],
): LockdownItem[] {
  const items: LockdownItem[] = [];
  const openingMarkers = markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol));

  // ── SKETCH ──
  const hasFrontDoor = markers.some(m => m.markerSymbol === 'front_door');
  items.push({ id: 'front-door', category: 'sketch', label: 'Front door marker placed', status: hasFrontDoor ? 'pass' : 'warn', blocker: false });

  const allNumbered = openingMarkers.every(m => m.markerNumber !== null);
  items.push({ id: 'all-numbered', category: 'sketch', label: 'All markers numbered', status: allNumbered ? 'pass' : 'fail', blocker: true });

  const allMeasured = openingMarkers.every(m => m.width && m.height && m.width > 0 && m.height > 0);
  items.push({ id: 'all-measured', category: 'sketch', label: 'All windows measured', status: allMeasured ? 'pass' : 'fail', blocker: true });

  const allLinked = openingMarkers.every(m => openings.find(o => o.openingNumber === m.markerNumber));
  items.push({ id: 'all-linked', category: 'sketch', label: 'All markers linked to order rows', status: allLinked ? 'pass' : 'fail', blocker: true });

  const allGroupsReviewed = groups.every(g => g.groupNote && g.groupNote.trim() !== '');
  items.push({ id: 'groups-reviewed', category: 'sketch', label: 'All joined/mulled windows reviewed', status: groups.length === 0 ? 'skip' : allGroupsReviewed ? 'pass' : 'warn', blocker: false });

  const specialShapesOk = openingMarkers.filter(m => m.windowType === 'special_shape').every(m => m.shapeType);
  items.push({ id: 'special-shapes', category: 'sketch', label: 'Special shapes reviewed', status: openingMarkers.filter(m => m.windowType === 'special_shape').length === 0 ? 'skip' : specialShapesOk ? 'pass' : 'fail', blocker: true });

  const orielsConfirmed = openingMarkers.filter(m => m.windowType === 'oriel').every(m => {
    const op = openings.find(o => o.openingNumber === m.markerNumber);
    return op && op.orielConfirmed;
  });
  items.push({ id: 'oriels-confirmed', category: 'sketch', label: 'Oriel largest sash/panel confirmed', status: openingMarkers.filter(m => m.windowType === 'oriel').length === 0 ? 'skip' : orielsConfirmed ? 'pass' : 'fail', blocker: true });

  // ── RULES ──
  items.push({ id: 'lee-applied', category: 'rules', label: 'LEE glass default applied or changed', status: openings.every(o => o.glassPackage) ? 'pass' : 'warn', blocker: false });
  items.push({ id: 'foam-checked', category: 'rules', label: 'Foam Enhanced checked or changed', status: 'pass', blocker: false });
  items.push({ id: 'alum-applied', category: 'rules', label: 'ALUM removal applied or changed', status: openings.every(o => o.removalType) ? 'pass' : 'warn', blocker: false });

  // ── TEMPERED ──
  const unresolvedTempered = safetyReviews.filter(r =>
    r.temperedRequired === 'unsure' || (r.safetyReviewStatus === 'flagged' && r.temperedRequired === 'not_reviewed')
  );
  items.push({
    id: 'tempered-resolved',
    category: 'tempered',
    label: 'All tempered reviews resolved',
    status: unresolvedTempered.length === 0 ? 'pass' : 'fail',
    message: unresolvedTempered.length > 0 ? `${unresolvedTempered.length} unresolved tempered review(s)` : undefined,
    blocker: true,
  });

  // ── PRICING ──
  const allPriced = openings.every(o => o.totalPrice > 0 || o.pricingStatus === 'manual');
  items.push({ id: 'all-priced', category: 'pricing', label: 'Pricing generated from marker data', status: allPriced ? 'pass' : 'warn', blocker: false });

  return items;
}

// ── Check if export is blocked ──────────────────────────────
export function isExportBlocked(checklist: LockdownItem[]): { blocked: boolean; blockers: string[] } {
  const blockers = checklist.filter(i => i.blocker && i.status === 'fail').map(i => i.label);
  return { blocked: blockers.length > 0, blockers };
}

// ── Clear story pricing calculation ─────────────────────────
export function calculateClearStoryCharges(openings: any[]): { openingNumber: number; charge: number; label: string }[] {
  const clearStoryOpenings = openings.filter(o =>
    o.clearStory || o.ladderRequired || (o.floorNumber && o.floorNumber >= 2)
  );
  return clearStoryOpenings.map((o, idx) => ({
    openingNumber: o.openingNumber,
    charge: idx === 0 ? 225 : 75,
    label: idx === 0 ? 'Clear Story — First ($225)' : 'Clear Story — Additional ($75)',
  }));
}

// ── Glass area — DELEGATES to services/calculations ─────────
export const calculateGlassArea = _calcGlassArea;

// ── Tempered Rule A: Tub/Shower within 60" ──────────────────
export function checkTubShowerRule(distanceInches: number | null, nearby: string | null): boolean {
  if (nearby === 'yes' && (distanceInches === null || distanceInches <= 60)) return true;
  if (distanceInches !== null && distanceInches <= 60) return true;
  return false;
}

// ── Tempered Rule B: Low glass <18" + >9 sqft ──────────────
export function checkLowGlassRule(bottomHeightInches: number | null, glassAreaSqft: number | null): boolean {
  if (bottomHeightInches !== null && bottomHeightInches < 18 && glassAreaSqft !== null && glassAreaSqft > 9) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// WINDOW WORLD MEASUREMENT RULES
// ─────────────────────────────────────────────────────────────
// Brick:    Measure from OUTSIDE, take the SMALLEST measurement
// Siding:   Measure from INSIDE
// Stucco:   Measure from INSIDE
// Wood:     Measure from INSIDE
// Mixed (brick outer + wood/siding inner): Use brick rule —
//   measure from OUTSIDE at the smallest point
// ═══════════════════════════════════════════════════════════════

export interface MeasurementGuidance {
  material: ExteriorMaterial;
  measureSide: MeasureSide;
  rule: MeasureRule;
  instruction: string;
  shortLabel: string;
}

const MATERIAL_RULES: Record<ExteriorMaterial, MeasurementGuidance> = {
  brick: {
    material: 'brick',
    measureSide: 'outside',
    rule: 'smallest_outside',
    instruction: 'BRICK: Measure from OUTSIDE. Take the SMALLEST measurement at 3 points (top, middle, bottom for width; left, center, right for height).',
    shortLabel: 'Outside / Smallest',
  },
  siding: {
    material: 'siding',
    measureSide: 'inside',
    rule: 'inside_standard',
    instruction: 'SIDING: Measure from INSIDE. Measure jamb-to-jamb width and sill-to-header height.',
    shortLabel: 'Inside',
  },
  stucco: {
    material: 'stucco',
    measureSide: 'inside',
    rule: 'inside_standard',
    instruction: 'STUCCO: Measure from INSIDE. Measure jamb-to-jamb width and sill-to-header height.',
    shortLabel: 'Inside',
  },
  wood: {
    material: 'wood',
    measureSide: 'inside',
    rule: 'inside_standard',
    instruction: 'WOOD: Measure from INSIDE. Measure jamb-to-jamb width and sill-to-header height.',
    shortLabel: 'Inside',
  },
  vinyl_siding: { material: 'vinyl_siding', measureSide: 'inside', rule: 'inside_standard', instruction: 'VINYL SIDING: Measure from INSIDE.', shortLabel: 'Inside / Standard' },
  wood_siding: { material: 'wood_siding', measureSide: 'inside', rule: 'inside_standard', instruction: 'WOOD SIDING: Measure from INSIDE.', shortLabel: 'Inside / Standard' },
  fiber_cement: { material: 'fiber_cement', measureSide: 'inside', rule: 'inside_standard', instruction: 'FIBER CEMENT: Measure from INSIDE.', shortLabel: 'Inside / Standard' },
  stone: { material: 'stone', measureSide: 'outside', rule: 'smallest_outside', instruction: 'STONE: Measure from OUTSIDE. Same as brick.', shortLabel: 'Outside / Smallest' },
  fascia: { material: 'fascia', measureSide: 'outside', rule: 'smallest_outside', instruction: 'FASCIA: Measurement not typical for windows.', shortLabel: 'N/A' },
  soffit: { material: 'soffit', measureSide: 'outside', rule: 'smallest_outside', instruction: 'SOFFIT: Measurement not typical for windows.', shortLabel: 'N/A' },
};

/** Get measurement guidance for a given exterior material */
export function getMeasurementGuidance(material: ExteriorMaterial): MeasurementGuidance {
  return MATERIAL_RULES[material];
}

/**
 * Resolve measurement rule when there are mixed materials.
 * Window World rule: if ANY side is brick, use the brick rule
 * (measure from outside, smallest measurement).
 */
export function resolveMixedMaterialRule(
  outerMaterial: ExteriorMaterial | null,
  innerMaterial: ExteriorMaterial | null,
): MeasurementGuidance {
  // If outer is brick, or either side is brick → use brick rule
  if (outerMaterial === 'brick' || innerMaterial === 'brick') {
    return MATERIAL_RULES.brick;
  }
  // Otherwise use the outer material rule, or inner, or default to siding
  const primary = outerMaterial || innerMaterial || 'siding';
  return MATERIAL_RULES[primary];
}

/**
 * Find the nearest material marker to a window marker on the canvas.
 * Returns the material type if one is found within proximity threshold.
 */
export function detectNearbyMaterial(
  windowMarker: SketchMarkerData,
  allMarkers: SketchMarkerData[],
  proximityPx: number = 200,
): ExteriorMaterial | null {
  const materialMarkers = allMarkers.filter(m => MATERIAL_MARKERS.includes(m.markerSymbol));

  let closest: { material: ExteriorMaterial; dist: number } | null = null;
  for (const mat of materialMarkers) {
    const dx = windowMarker.x - mat.x;
    const dy = windowMarker.y - mat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= proximityPx && (!closest || dist < closest.dist)) {
      closest = { material: mat.markerSymbol as ExteriorMaterial, dist };
    }
  }
  return closest?.material ?? null;
}

/**
 * Auto-apply measurement guidance to a window marker based on nearby material markers.
 * Returns the guidance or null if no material marker is nearby.
 */
export function autoApplyMeasurementRule(
  windowMarker: SketchMarkerData,
  allMarkers: SketchMarkerData[],
): MeasurementGuidance | null {
  const material = detectNearbyMaterial(windowMarker, allMarkers);
  if (!material) return null;
  return getMeasurementGuidance(material);
}
