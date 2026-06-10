// ═══════════════════════════════════════════════════════════
// BTR 2026 Pricing Guidelines — Knowledge Engine
// Source: _2026 BTR Pricing Guidelines.pdf (118 pages)
// ═══════════════════════════════════════════════════════════

// ── Series Definitions ──────────────────────────────────
export interface SeriesRule {
  series: string;
  page: number;
  hasExteriorColor: boolean;
  hasInteriorColor: boolean;
  hasSingleHung: boolean;
  hasRainGlass: boolean;
  hasVentStops: boolean;
  requiredGridType?: string;
  clayAvailable: boolean;
  notes: string[];
}

export const SERIES_RULES: SeriesRule[] = [
  {
    series: 'L2000', page: 13,
    hasExteriorColor: false, hasInteriorColor: false, hasSingleHung: false,
    hasRainGlass: true, hasVentStops: true, requiredGridType: 'B1',
    clayAvailable: false,
    notes: ['No exterior color option', 'No single hung option', 'Must use B1 contoured grids', 'Clay cannot be made']
  },
  {
    series: '03A0', page: 15,
    hasExteriorColor: true, hasInteriorColor: false, hasSingleHung: true,
    hasRainGlass: false, hasVentStops: false,
    clayAvailable: true,
    notes: ['No vent stops', 'No rain glass', 'Interior color not available on single hung or arch-tops', 'Must be written in specialty windows section of contract']
  },
  {
    series: '3000', page: 17,
    hasExteriorColor: true, hasInteriorColor: true, hasSingleHung: false,
    hasRainGlass: true, hasVentStops: true,
    clayAvailable: true,
    notes: ['50" max oriel on DH', '>50" oriel requires 03A0 single hung', 'Oriel measured from top of glass to top of meeting rail']
  },
  {
    series: '0700', page: 13,
    hasExteriorColor: false, hasInteriorColor: true, hasSingleHung: true,
    hasRainGlass: true, hasVentStops: true,
    clayAvailable: false,
    notes: ['No exterior color', 'Clay cannot be made']
  },
  {
    series: 'Wincore', page: 18,
    hasExteriorColor: true, hasInteriorColor: true, hasSingleHung: true,
    hasRainGlass: true, hasVentStops: true,
    clayAvailable: true,
    notes: ['Oriel measured from bottom of window to meeting rail', '$100 adder over 120 UI per contract', 'Contact pricing for Black on Black']
  },
];

// ── Screen Rules ────────────────────────────────────────
export interface ScreenRule {
  id: string; condition: string; result: string; page: number;
}

export const SCREEN_RULES: ScreenRule[] = [
  { id: 'SCR1', condition: 'picture_window', result: 'Full screens cannot be made on picture windows', page: 13 },
  { id: 'SCR2', condition: '3lite_slider', result: 'Full screens cannot be made on 3-lite sliders', page: 13 },
  { id: 'SCR3', condition: 'arch_top', result: 'Full screens cannot be made on arch-top windows', page: 13 },
  { id: 'SCR4', condition: 'exterior_color', result: 'Full screens come standard with exterior color. Half screens not available.', page: 13 },
  { id: 'SCR5', condition: 'picture_window_default', result: 'Picture windows do not include screens by default', page: 13 },
];

// ── Grid Rules ──────────────────────────────────────────
export interface GridRule {
  id: string; condition: string; requirement: string; page: number;
}

export const GRID_RULES: GridRule[] = [
  { id: 'GRD1', condition: 'exterior_color', requirement: 'Must use B1 contoured grids', page: 15 },
  { id: 'GRD2', condition: 'L2000_series', requirement: 'Must use B1 contoured grids', page: 13 },
  { id: 'GRD3', condition: 'diamond_pattern', requirement: 'Diamond grids must be A1 flat', page: 15 },
  { id: 'GRD4', condition: 'SDL', requirement: 'SDL grids require 7/8" or 1-1/4" designation', page: 61 },
  { id: 'GRD5', condition: 'SDL', requirement: 'SDL grids cannot be discounted', page: 61 },
  { id: 'GRD6', condition: 'SDL', requirement: 'SDL grids require double-check paper stapled to folder', page: 61 },
  { id: 'GRD7', condition: 'SDL', requirement: 'SDL grids have 10% commission', page: 61 },
];

// ── Grid Styles (p71) ───────────────────────────────────
export const GRID_STYLES = [
  { code: 'A1', name: 'Colonial Flat Full', type: 'flat' },
  { code: 'B1', name: 'Colonial Contour Full', type: 'contoured' },
  { code: 'C1', name: 'Colonial Brass Full', type: 'brass' },
  { code: 'D1', name: 'Diamond Full', type: 'flat', mustBeA1: true },
  { code: 'E1', name: 'Single Prairie Flat Full', type: 'flat' },
  { code: 'E4', name: 'Double Prairie Flat Full', type: 'flat' },
  { code: 'F1', name: 'Single Prairie Contour Full', type: 'contoured' },
  { code: 'F4', name: 'Double Prairie Contour Full', type: 'contoured' },
  { code: 'G1', name: 'Single Perimeter Contour Full', type: 'contoured' },
  { code: 'G2', name: 'Double Perimeter Contour Full', type: 'contoured' },
  { code: 'G3', name: 'Single Perimeter Flat Full', type: 'flat' },
  { code: 'G4', name: 'Double Perimeter Flat Full', type: 'flat' },
  { code: 'K1', name: 'Craftsman (Casement only)', type: 'flat' },
];

// ── Oriel Rules ─────────────────────────────────────────
export const ORIEL_RULES = {
  series3000: {
    maxOrielDH: 50, page: 17,
    measureMethod: 'top_of_glass_to_top_of_meeting_rail',
    overMaxAction: 'Must use 03A0 single hung',
  },
  wincore: {
    measureMethod: 'bottom_of_window_to_meeting_rail', page: 18,
  },
  standardSplit: '60/40',
};

// ── Color Rules ─────────────────────────────────────────
export const COLOR_RULES = {
  clayNotAvailable: ['L2000', '0700'],  // p70
  exteriorColorNotAvailable: ['L2000', '0700'], // p70
  exteriorColorNotOnClayVinyl: true, // p70
  interiorColorNotAvailable: ['L2000', '03A0_SH', 'S140', 'S144', 'S146'], // p70
};

// ── Special Shape Rules ─────────────────────────────────
export const SPECIAL_SHAPE_RULES = {
  overMaxUIAdder: 150, // p60
  overMaxDimensionThreshold: 84, // p60: any dimension over 84"
  overMaxUIDiscount: false, // Cannot be discounted to 80%
  trimRequired: 'radius_shapes', // p60: radius/arch shapes require trim
  trimNotRequired: 'polygon_shapes', // p60: polygon shapes don't need bent trim
  trimCannotBeDiscounted: true, // p60
  under24WideFrame: ['0700', 'casement'], // p60
  nailFinPricing: 'pricing_page', // p60: not contract $10
  page: 60,
};

// ── Pricing Constants ───────────────────────────────────
export const PRICING_CONSTANTS = {
  smallWindowUI: 83,
  smallWindowPrice: 285, // p13: UI 83 and below
  tapconCharge: 10, // p13: per unit
  wincoreUIAdder: { threshold: 120, amount: 100 }, // p18
  sdlWincorePerLite: 60, // p19
  acSashPrice: 90, // p103
  clearStoryFirst: 225, // p102
  clearStoryAdditional: 75, // p102
  secondFloorCharge: 10, // p102
  trimDiscountMin: 25, // p101
  trimCommissionFull: 5,
  trimCommissionDiscounted: 3,
};

// ── Tempered Glass Rules (p113-115) ─────────────────────
export const TEMPERED_RULES = {
  adjacentToDoor: {
    maxBottomEdge: 60, // inches from floor
    maxDistanceFromDoor: 24, // inches
    page: 114,
  },
  largePane: {
    minArea: 9, // sq ft
    maxBottomEdge: 18, // inches from floor
    minTopEdge: 36, // inches from floor
    maxWalkingSurface: 36, // inches from window
    page: 115,
  },
  stairway: {
    maxBottomEdge: 36, // inches from walking surface
    page: 117,
  },
  formula: 'Width(rounded up) × Height(rounded up) / 144 = sq ft (round up)',
  bottomSashEvenSplit: 'Divide total by 2',
  bottomSashOriel: 'Subtract oriel from height, use for formula',
  bottomSash6040: 'Overall height × 0.40 = bottom sash height',
};

// ── SGD Models (p66-68) ─────────────────────────────────
export const SGD_MODELS = {
  standard: ['6405', '6406', '6408', '6409', '6412', '6422'],
  custom: ['6402', '6403', '6404'],
  heightOptions: [80, 96], // 6'8" or 8'0"
  modelWidthMap: { '6405': 60, '6406': 72, '6408': 96, '6409': 108, '6412': 144 },
  sashOptions: ['3"', '5"', '7"_french'],
  blindsHeightOnly: 80, // 6'8" only
  blindsNotWithExteriorColor: true,
  blinds6408_6422RequireSash: '5"',
  operatingDirectionRequired: true,
  fieldReversible: false,
};

// ── Casement Rules (p30) ────────────────────────────────
export const CASEMENT_RULES = {
  doubleCasement0972: {
    minWidth: 32, maxWidth: 72, minHeight: 19, maxHeight: 79, maxUI: 150,
    note: 'Two 0971 casements fitting within these limits must be ordered as 0972 double casement',
    page: 30,
  },
  newConstructionFrame: { replacement: '0971/0951', newConstruction: '0171/0151', page: 30 },
};

// ── Contract Audit Checklist (p99) ──────────────────────
export const CONTRACT_AUDIT = {
  customerInfo: ['name', 'address', 'city_state_zip', 'phone', 'email', 'complete_job_yn', 'windows_remaining'],
  signatures: ['customer_signed_bottom', 'date_present', 'salesperson_signed_left', 'customer_initials_3_front', 'customer_initialed_back', 'maintenance_waiver_signed'],
  yearBuilt: { required: true, leadPaintBefore: 1978 },
  prohibitions: ['no_writing_on_contract', 'no_white_out', 'no_altered_terms', 'no_promissory_notes', 'credit_card_blacked_out'],
  page: 99,
};

// ── Order Form Audit (p100) ─────────────────────────────
export const ORDER_AUDIT = {
  customerInfo: ['name', 'address', 'city_state_zip', 'phone'],
  signatures: ['customer_signed_bottom'],
  required: ['diagram_present', 'estimator_name_phone', 'labor_section_completed'],
  lineItems: ['qty', 'models', 'vinyl_color', 'window_number', 'glass_option', 'options'],
  page: 100,
};

// ── Labor Rules (p101-102) ──────────────────────────────
export const LABOR_RULES = {
  trim: {
    requiredWhen: 'inside_set',
    exceptionExterior: 'wood',
    discountMin: 25,
    page: 101,
  },
  headerFlashing: {
    likelyWhen: 'siding_exterior',
    exceptionWhen: 'under_covering',
    questionIfMissing: true,
    page: 101,
  },
  removals: {
    alwaysAsk: true,
    exceptionsNoCharge: ['new_construction', 'customer_removes'],
    page: 102,
  },
};

// ── Wells Fargo Rules (p118) ────────────────────────────
export const FINANCING_RULES = {
  wellsFargo: {
    customerDeviceOnly: true,
    noMerchantDevice: true,
    page: 118,
  },
};
