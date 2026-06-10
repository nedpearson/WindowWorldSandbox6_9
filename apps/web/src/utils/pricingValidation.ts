// ═══════════════════════════════════════════════════════════
// BTR Pricing Guidelines — Validation Engine
// Validates window configurations against 2026 BTR rules
// ═══════════════════════════════════════════════════════════

import {
  SERIES_RULES, SCREEN_RULES, GRID_RULES, GRID_STYLES, ORIEL_RULES,
  COLOR_RULES, SPECIAL_SHAPE_RULES, PRICING_CONSTANTS, TEMPERED_RULES,
  SGD_MODELS, CASEMENT_RULES, CONTRACT_AUDIT, ORDER_AUDIT, LABOR_RULES,
  FINANCING_RULES,
} from './pricingRules';
import {
  L200_MODELS, A03_MODELS, S3000_MODELS, AWNING_MODELS, CASEMENT_MODELS,
  SPECIAL_SHAPE_MINMAX, SHAPE_TYPE_MAP,
} from './productModels';

// ── Types ────────────────────────────────────────────────
export type Severity = 'critical' | 'warning' | 'info' | 'suggestion';

export interface ValidationResult {
  id: string;
  severity: Severity;
  category: string;
  message: string;
  source: string; // page reference
  suggestion?: string;
  overrideAllowed: boolean;
  requiresManagerReview: boolean;
}

export interface WindowConfig {
  series?: string;
  model?: string;
  productCategory?: string;
  width?: number;
  height?: number;
  orielSize?: number;
  hasOriel?: boolean;
  screenType?: string;
  gridType?: string;
  gridPattern?: string;
  isSDL?: boolean;
  sdlSize?: string;
  vinylColor?: string;
  exteriorColor?: string;
  interiorColor?: string;
  isSpecialShape?: boolean;
  specialShapeType?: string;
  installType?: string;
  exteriorType?: string;
  hasTrim?: boolean;
  hasHeaderFlashing?: boolean;
  hasRemoval?: boolean;
  removalType?: string;
  isNewConstruction?: boolean;
  isClearStory?: boolean;
  floorToBottom?: number;
  nearDoor?: boolean;
  distanceFromDoor?: number;
  nearStairway?: boolean;
  temperedSash?: string;
  roomType?: string;
  nailFins?: boolean;
}

// ── Main Validation ──────────────────────────────────────
export function validateWindowConfiguration(config: WindowConfig): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(...validateSeries(config));
  results.push(...validateScreen(config));
  results.push(...validateGrid(config));
  results.push(...validateOriel(config));
  results.push(...validateColor(config));
  results.push(...validateSpecialShape(config));
  results.push(...validateTempered(config));
  results.push(...validatePricing(config));
  results.push(...validateSizeLimits(config));
  return results;
}

// ── Size Limits Validation (from product model specs) ────
function validateSizeLimits(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  if (!c.model || !c.width || !c.height) return r;
  const w = c.width, h = c.height, ui = w + h;

  // Find matching model across all series
  const allModels = [...L200_MODELS, ...A03_MODELS, ...S3000_MODELS, ...AWNING_MODELS, ...CASEMENT_MODELS];
  const match = allModels.find(m => m.model === c.model) as any;
  if (match) {
    // Standard props or fall back to goldMinW/goldMaxW etc. for tiered models
    const minW = match.minW ?? match.goldMinW;
    const maxW = match.maxW ?? match.goldMaxW;
    const minH = match.minH ?? match.goldMinH;
    const maxH = match.maxH ?? match.goldMaxH;
    const mxUI = match.maxUI ?? match.goldMaxUI;
    if (minW !== undefined && w < minW) r.push({ id: 'SZ_MINW', severity: 'critical', category: 'Size',
      message: `${c.model} min width is ${minW}". Current: ${w}".`, source: 'Spec Sheet',
      overrideAllowed: false, requiresManagerReview: false });
    if (maxW !== undefined && w > maxW) r.push({ id: 'SZ_MAXW', severity: 'critical', category: 'Size',
      message: `${c.model} max width is ${maxW}". Current: ${w}".`, source: 'Spec Sheet',
      overrideAllowed: false, requiresManagerReview: false });
    if (minH !== undefined && h < minH) r.push({ id: 'SZ_MINH', severity: 'critical', category: 'Size',
      message: `${c.model} min height is ${minH}". Current: ${h}".`, source: 'Spec Sheet',
      overrideAllowed: false, requiresManagerReview: false });
    if (maxH !== undefined && h > maxH) r.push({ id: 'SZ_MAXH', severity: 'critical', category: 'Size',
      message: `${c.model} max height is ${maxH}". Current: ${h}".`, source: 'Spec Sheet',
      overrideAllowed: false, requiresManagerReview: false });
    if (mxUI && ui > mxUI) r.push({ id: 'SZ_UI', severity: 'critical', category: 'Size',
      message: `${c.model} max UI is ${mxUI}. Current: ${ui}.`, source: 'Spec Sheet',
      suggestion: 'Reduce dimensions or select a different model.',
      overrideAllowed: false, requiresManagerReview: false });
  }

  // Special shape size validation
  if (c.isSpecialShape && c.model) {
    const ss = SPECIAL_SHAPE_MINMAX.find(s => s.model === c.model);
    if (ss && ss.extrusions.length > 0) {
      const ext = ss.extrusions[0]; // use Mezzo as primary
      if (typeof ext.minW === 'number' && w < ext.minW) r.push({ id: 'SS_MINW', severity: 'critical', category: 'Special Shape',
        message: `${c.model} min width is ${ext.minW}". Current: ${w}".`, source: 'Page 33',
        overrideAllowed: false, requiresManagerReview: false });
      if (typeof ext.maxW === 'number' && w > ext.maxW) r.push({ id: 'SS_MAXW', severity: 'critical', category: 'Special Shape',
        message: `${c.model} max width is ${ext.maxW}". Current: ${w}".`, source: 'Page 33',
        overrideAllowed: false, requiresManagerReview: false });
      if (typeof ext.minH === 'number' && h < ext.minH) r.push({ id: 'SS_MINH', severity: 'critical', category: 'Special Shape',
        message: `${c.model} min height is ${ext.minH}". Current: ${h}".`, source: 'Page 33',
        overrideAllowed: false, requiresManagerReview: false });
      if (typeof ext.maxH === 'number' && h > ext.maxH) r.push({ id: 'SS_MAXH', severity: 'critical', category: 'Special Shape',
        message: `${c.model} max height is ${ext.maxH}". Current: ${h}".`, source: 'Page 33',
        overrideAllowed: false, requiresManagerReview: false });
      if (ext.maxUI && ui > ext.maxUI) r.push({ id: 'SS_UI', severity: 'critical', category: 'Special Shape',
        message: `${c.model} max UI is ${ext.maxUI}. Current: ${ui}.`, source: 'Page 33',
        overrideAllowed: false, requiresManagerReview: false });
    }
  }

  return r;
}

// ── Series Validation ────────────────────────────────────
function validateSeries(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  if (!c.series) return r;
  const s = SERIES_RULES.find(s => s.series === c.series);
  if (!s) return r;

  if (c.exteriorColor && !s.hasExteriorColor) {
    r.push({ id: 'SER_EXT', severity: 'critical', category: 'Series',
      message: `${c.series} does not support exterior color.`,
      source: `Page ${s.page}`, suggestion: 'Remove exterior color or change series.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.interiorColor && !s.hasInteriorColor) {
    r.push({ id: 'SER_INT', severity: 'critical', category: 'Series',
      message: `${c.series} does not support interior color.`,
      source: `Page ${s.page}`, suggestion: 'Remove interior color or change series.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.productCategory === 'single_hung' && !s.hasSingleHung) {
    r.push({ id: 'SER_SH', severity: 'critical', category: 'Series',
      message: `${c.series} does not have a single hung option. Use 03A0.`,
      source: `Page ${s.page}`, suggestion: 'Change to 03A0 series.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.productCategory === 'rain_glass' && !s.hasRainGlass) {
    r.push({ id: 'SER_RAIN', severity: 'critical', category: 'Series',
      message: `${c.series} does not support rain glass.`,
      source: `Page ${s.page}`, overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.vinylColor === 'clay' && !s.clayAvailable) {
    r.push({ id: 'SER_CLAY', severity: 'critical', category: 'Series',
      message: `Clay vinyl is not available in ${c.series}.`,
      source: 'Page 70', suggestion: 'Change vinyl color or series.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  return r;
}

// ── Screen Validation ────────────────────────────────────
function validateScreen(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  if (c.screenType !== 'full') return r;

  const cat = c.productCategory?.toLowerCase() || '';
  if (cat.includes('picture')) {
    r.push({ id: 'SCR_PIC', severity: 'critical', category: 'Screen',
      message: 'Full screens cannot be made on picture windows.',
      source: 'Page 13', suggestion: 'Remove screen or change to half screen.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (cat.includes('3lite') || cat.includes('3-lite') || cat.includes('three_lite')) {
    r.push({ id: 'SCR_3L', severity: 'critical', category: 'Screen',
      message: 'Full screens cannot be made on 3-lite sliders.',
      source: 'Page 13', suggestion: 'Remove full screen.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (cat.includes('arch')) {
    r.push({ id: 'SCR_ARCH', severity: 'critical', category: 'Screen',
      message: 'Full screens cannot be made on arch-top windows.',
      source: 'Page 13', suggestion: 'Remove full screen.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.exteriorColor && c.screenType !== 'full') {
    r.push({ id: 'SCR_EXT', severity: 'info', category: 'Screen',
      message: 'Exterior color windows come standard with full screens. Half screens not available.',
      source: 'Page 13', overrideAllowed: false, requiresManagerReview: false });
  }
  return r;
}

// ── Grid Validation ──────────────────────────────────────
function validateGrid(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];

  if (c.exteriorColor && c.gridType && c.gridType !== 'B1') {
    r.push({ id: 'GRD_EXT', severity: 'critical', category: 'Grid',
      message: 'Exterior color windows must have B1 contoured grids.',
      source: 'Page 15', suggestion: 'Change grid to B1 contoured.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.series === 'L2000' && c.gridType && c.gridType !== 'B1') {
    r.push({ id: 'GRD_L2K', severity: 'critical', category: 'Grid',
      message: 'L2000 series must have B1 contoured grids.',
      source: 'Page 13', suggestion: 'Change grid to B1 contoured.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.gridPattern === 'diamond' && c.gridType !== 'A1') {
    r.push({ id: 'GRD_DIA', severity: 'critical', category: 'Grid',
      message: 'Diamond grids must be A1 flat.',
      source: 'Page 15', suggestion: 'Change grid type to A1 flat.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.isSDL && !c.sdlSize) {
    r.push({ id: 'GRD_SDL', severity: 'critical', category: 'Grid',
      message: 'SDL grids require 7/8" or 1-1/4" designation.',
      source: 'Page 61', suggestion: 'Specify SDL grid size: 7/8" or 1-1/4".',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.isSDL) {
    r.push({ id: 'GRD_SDL_CHK', severity: 'warning', category: 'Grid',
      message: 'SDL grids require double-check paper stapled to folder front.',
      source: 'Page 61', overrideAllowed: false, requiresManagerReview: true });
  }
  return r;
}

// ── Oriel Validation ─────────────────────────────────────
function validateOriel(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  if (!c.hasOriel || !c.orielSize) return r;

  if (c.series === '3000' && c.productCategory === 'double_hung' && c.orielSize > 50) {
    r.push({ id: 'ORI_3K', severity: 'critical', category: 'Oriel',
      message: `3000 Series DH has 50" max oriel. Current: ${c.orielSize}".`,
      source: 'Page 17',
      suggestion: 'Oriel over 50" can only be made as Single Hung 03A0.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.series === '3000') {
    r.push({ id: 'ORI_3K_MEAS', severity: 'info', category: 'Oriel',
      message: '3000 Series: Oriel measured from top of glass to top of meeting rail.',
      source: 'Page 17', overrideAllowed: true, requiresManagerReview: false });
  }
  if (c.series === 'Wincore') {
    r.push({ id: 'ORI_WIN_MEAS', severity: 'info', category: 'Oriel',
      message: 'Wincore: Oriel measured from bottom of window to meeting rail.',
      source: 'Page 18', overrideAllowed: true, requiresManagerReview: false });
  }
  return r;
}

// ── Color Validation ─────────────────────────────────────
function validateColor(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];

  if (c.vinylColor === 'clay' && c.exteriorColor) {
    r.push({ id: 'CLR_CLAY_EXT', severity: 'critical', category: 'Color',
      message: 'Exterior color is not available on clay vinyl windows.',
      source: 'Page 70', overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.interiorColor && c.series === '03A0' && c.productCategory === 'single_hung') {
    r.push({ id: 'CLR_03A0_SH', severity: 'critical', category: 'Color',
      message: 'Interior color not available on 03A0 single hung.',
      source: 'Page 70', overrideAllowed: false, requiresManagerReview: false });
  }
  const archModels = ['S140', 'S144', 'S146'];
  if (c.interiorColor && c.model && archModels.includes(c.model)) {
    r.push({ id: 'CLR_ARCH', severity: 'critical', category: 'Color',
      message: `Interior color not available on arch-top model ${c.model}.`,
      source: 'Page 70', overrideAllowed: false, requiresManagerReview: false });
  }
  return r;
}

// ── Special Shape Validation ─────────────────────────────
function validateSpecialShape(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  if (!c.isSpecialShape) return r;
  const w = c.width || 0, h = c.height || 0;
  const ui = w + h;

  if (w > 84 || h > 84) {
    r.push({ id: 'SS_DIM', severity: 'warning', category: 'Special Shape',
      message: `Dimension over 84" (${w > 84 ? 'width' : 'height'}=${w > 84 ? w : h}"). Full max UI price + $150 adder required. Not eligible for 80% discount.`,
      source: 'Page 60', suggestion: 'Charge full max UI price + $150 adder.',
      overrideAllowed: false, requiresManagerReview: true });
  }
  const isRadius = ['circle_top', 'quarter_arch', 'eyebrow', 'half_eyebrow', 'ellipse', 'full_circle', 'oval', 'extended_leg_eyebrow'].includes(c.specialShapeType || '');
  if (isRadius && !c.hasTrim && !c.nailFins) {
    r.push({ id: 'SS_TRIM', severity: 'critical', category: 'Special Shape',
      message: 'Radius/arch special shapes require trim (unless integrated nail fins).',
      source: 'Page 60', suggestion: 'Add special shape trim charge.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (w < 24 && c.isSpecialShape) {
    r.push({ id: 'SS_NARROW', severity: 'info', category: 'Special Shape',
      message: 'Under 24" wide — can use 0700 or casement frame.',
      source: 'Page 60', overrideAllowed: true, requiresManagerReview: false });
  }
  r.push({ id: 'SS_NAIL', severity: 'info', category: 'Special Shape',
    message: 'Nail fins on special shapes are charged per pricing page, not contract $10.',
    source: 'Page 60', overrideAllowed: true, requiresManagerReview: false });

  return r;
}

// ── Tempered Validation ──────────────────────────────────
function validateTempered(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  const bottom = c.floorToBottom || 999;

  if (c.nearDoor && bottom < 60 && (c.distanceFromDoor || 999) <= 24) {
    r.push({ id: 'TMP_DOOR', severity: 'critical', category: 'Tempered',
      message: 'Window within 24" of door with bottom edge < 60" from floor requires tempered glass.',
      source: 'Page 114', suggestion: 'Add tempered glass.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.width && c.height) {
    const sqft = (Math.ceil(c.width) * Math.ceil(c.height)) / 144;
    if (sqft > 9 && bottom < 18 && (c.height + bottom) > 36) {
      r.push({ id: 'TMP_LARGE', severity: 'critical', category: 'Tempered',
        message: `Large pane (${sqft.toFixed(1)} sq ft) with bottom < 18" from floor requires tempered glass.`,
        source: 'Page 115', suggestion: 'Add tempered glass.',
        overrideAllowed: false, requiresManagerReview: false });
    }
  }
  if (c.nearStairway && bottom < 36) {
    r.push({ id: 'TMP_STAIR', severity: 'critical', category: 'Tempered',
      message: 'Window adjacent to stairway with bottom < 36" from walking surface requires tempered glass.',
      source: 'Page 117', suggestion: 'Add tempered glass.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  if (c.roomType === 'bathroom') {
    r.push({ id: 'TMP_BATH', severity: 'warning', category: 'Tempered',
      message: 'Bathroom window — verify tempering requirements per local code.',
      source: 'Page 113', overrideAllowed: true, requiresManagerReview: false });
  }
  return r;
}

// ── Pricing Validation ───────────────────────────────────
function validatePricing(c: WindowConfig): ValidationResult[] {
  const r: ValidationResult[] = [];
  const w = c.width || 0, h = c.height || 0, ui = w + h;

  if (ui > 0 && ui <= PRICING_CONSTANTS.smallWindowUI) {
    const cat = c.productCategory?.toLowerCase() || '';
    if (cat.includes('slider') || cat.includes('picture')) {
      r.push({ id: 'PRC_SMALL', severity: 'info', category: 'Pricing',
        message: `UI ${ui} (≤83) — small window price: $${PRICING_CONSTANTS.smallWindowPrice}.`,
        source: 'Page 13', overrideAllowed: true, requiresManagerReview: false });
    }
  }
  if (c.series === 'Wincore' && ui >= PRICING_CONSTANTS.wincoreUIAdder.threshold) {
    r.push({ id: 'PRC_WIN_UI', severity: 'warning', category: 'Pricing',
      message: `Wincore window UI ${ui} ≥ 120 — $100 large window adder required.`,
      source: 'Page 18', suggestion: 'Add $100 large window adder.',
      overrideAllowed: false, requiresManagerReview: false });
  }
  return r;
}


