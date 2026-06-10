// ═══════════════════════════════════════════════════════════════
// Window World — Business Rules Engine
// Centralized, configurable rules system for form validation,
// auto-population, smart warnings, and pricing adjustments.
// ═══════════════════════════════════════════════════════════════

import { SPECIALTY_SHAPES } from './formFieldDefs';
import { SHAPE_TYPE_MAP } from './productModels';

export type RuleSeverity = 'blocker' | 'high' | 'medium' | 'low' | 'info';
export type RuleTrigger =
  | 'product_type_change' | 'color_change' | 'exterior_type_change'
  | 'clear_story_toggle' | 'abbreviation_entry' | 'oriel_toggle'
  | 'opening_save' | 'form_validate' | 'pre_export'
  | 'shape_change' | 'measurement_method_change' | 'exterior_surface_change';

// ═══════════════════════════════════════════════════════════════
// HELPER PREDICATES
// Shared across rules so trigger conditions are consistent.
// ═══════════════════════════════════════════════════════════════

/** Returns true if this opening is any special/custom/geometric shape. */
export function isSpecialShape(opening: any): boolean {
  const cat  = (opening.productCategory || '').toUpperCase();
  const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
  const shape = (opening.shapeType || '').toLowerCase();

  // Direct match against expanded SPECIALTY_SHAPES list (case-insensitive)
  if (SPECIALTY_SHAPES.some(s => s.toUpperCase() === cat)) return true;
  if (SPECIALTY_SHAPES.some(s => s.toUpperCase() === model)) return true;

  // Pattern matches for flexible field entries
  const catLower = cat.toLowerCase();
  if (
    catLower.includes('shape') || catLower.includes('arch') ||
    catLower.includes('eyebrow') || catLower.includes('circle') ||
    catLower.includes('half_round') || catLower.includes('trapezoid') ||
    catLower.includes('octagon') || catLower.includes('hexagon') ||
    catLower.includes('geometric') || catLower.includes('custom') ||
    catLower.includes('ellipse') || catLower.includes('oval') ||
    catLower.includes('pentagon') || catLower.includes('triangle') ||
    catLower.includes('cathedral')
  ) return true;

  // Shape type directly set
  if (shape && shape !== '' && shape !== 'none') return true;

  return false;
}

/**
 * Returns true if this opening's special shape requires trim.
 * Per BTR guidelines (p60): only RADIUS shapes require special shape trim;
 * polygon shapes (hex, oct, pentagon, triangle, trapezoid) do NOT.
 */
export function specialShapeRequiresTrim(opening: any): boolean {
  if (!isSpecialShape(opening)) return false;

  const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
  const cat   = (opening.productCategory || '').toLowerCase();

  // Check SHAPE_TYPE_MAP (S-series): only radius = requires trim
  const key = model as keyof typeof SHAPE_TYPE_MAP;
  if (SHAPE_TYPE_MAP[key]) {
    return SHAPE_TYPE_MAP[key] === 'radius';
  }

  // Polygon types — do NOT require trim
  const polygonPatterns = ['hexagon', 'octagon', 'pentagon', 'triangle', 'trapezoid', 'cathedral', 'geometric'];
  if (polygonPatterns.some(p => cat.includes(p))) return false;

  // Radius-type descriptive names
  const radiusPatterns = ['circle', 'arch', 'eyebrow', 'half_round', 'ellipse', 'oval', 'quarter_arch', 'full_circle', 'circle_top', 'CT', 'EY', 'HR', 'extended_leg'];
  if (radiusPatterns.some(p => cat.toLowerCase().includes(p.toLowerCase()))) return true;

  // Default: if unclear, require trim (safer)
  return true;
}

/** Returns true if exterior surface is siding/wood/hardie/composite. */
export function isSidingExterior(opening: any): boolean {
  const surf = (opening.exteriorSurface || '').toLowerCase();
  const type = (opening.exteriorType || opening.installType || '').toLowerCase();
  const sidingTerms = ['siding', 'wood', 'hardie', 'composite', 'vinyl_siding', 'wood_siding', 'fiber_cement', 't1_11', 'lap_siding'];
  return sidingTerms.some(t => surf.includes(t) || type.includes(t));
}

/** Returns true if the measurement method used was outside (from exterior). */
export function isOutsideMeasure(opening: any): boolean {
  const method = (opening.measurementMethod || '').toLowerCase();
  return method === 'outside' || method === 'outside_measure' || opening.outsideMeasureUsed === true;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  triggerCondition: (opening: any, context: RuleContext) => boolean;
  actions: RuleAction[];
  severity: RuleSeverity;
  autoApply: boolean;
  requiresConfirmation: boolean;
  active: boolean;
  category: string;
  triggers: RuleTrigger[];
}

export interface RuleAction {
  type: 'set_field' | 'add_warning' | 'add_note' | 'add_price' | 'expand_abbreviation' | 'require_confirmation' | 'flag_field';
  field?: string;
  value?: any;
  message?: string;
  priceLabel?: string;
  priceAmount?: number;
  pricingLogic?: 'fixed' | 'first_plus_additional';
  firstAmount?: number;
  additionalAmount?: number;
}

export interface RuleContext {
  allOpenings: any[];
  appointment?: any;
  openingIndex?: number;
  /** For abbreviation rules */
  inputText?: string;
  /** Counts for pricing logic */
  clearStoryCount?: number;
  clearStoryIndex?: number;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  autoApplied: boolean;
  requiresConfirmation: boolean;
  actions: AppliedAction[];
  openingNumber?: number;
  category: string;
}

export interface AppliedAction {
  type: RuleAction['type'];
  field?: string;
  value?: any;
  message: string;
  priceAmount?: number;
  applied: boolean;
  confirmed: boolean;
}

// ═══════════════════════════════════════════════════════════════
// WINDOW WORLD BUSINESS RULES
// ═══════════════════════════════════════════════════════════════

export const WINDOW_WORLD_RULES: BusinessRule[] = [
  // ─── RULE 1: PICTURE WINDOW — NO SCREEN ─────────────────
  {
    id: 'ww-picture-no-screen',
    name: 'Picture Window — No Screen',
    description: 'Picture windows should have no screen by default. If a screen is selected, show a confirmation warning.',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      return cat.includes('picture') || cat === 'pic';
    },
    actions: [
      { type: 'set_field', field: 'screenOption', value: 'No Screen', message: 'Picture window: auto-set to No Screen' },
      { type: 'add_note', message: 'PIC NO SCREEN' },
      { type: 'add_warning', message: 'Picture windows normally have no screen. Confirm if override is intentional.' },
    ],
    severity: 'medium',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },

  // ─── RULE 2: DIFFERENT COLOR WINDOW ─────────────────────
  {
    id: 'ww-different-color',
    name: 'Different Color Window',
    description: 'If window color differs from standard White/White, flag the color difference and remind to mark out the other color on the order form.',
    triggerCondition: (opening) => {
      const int = (opening.interiorColor || opening.intColor || '').toLowerCase();
      const ext = (opening.exteriorColor || opening.extColor || '').toLowerCase();
      const defaultColor = 'white';
      return (int !== defaultColor && int !== '') || (ext !== defaultColor && ext !== '');
    },
    actions: [
      { type: 'flag_field', field: 'interiorColor', message: 'Non-standard color selected' },
      { type: 'flag_field', field: 'exteriorColor', message: 'Non-standard color selected' },
      { type: 'add_warning', message: 'Different color selected. Mark out the other color on the order form if applicable.' },
      { type: 'require_confirmation', message: 'Color marked/confirmed' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save'],
  },

  // ─── RULE 3: SIDING OR WOOD EXTERIOR ────────────────────
  {
    id: 'ww-siding-wood-exterior',
    name: 'Siding/Wood Exterior — Vinyl Trim + Header',
    description: 'If exterior type is siding or wood, automatically require vinyl trim and header.',
    triggerCondition: (opening) => {
      const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();
      return ext.includes('siding') || ext.includes('wood') || ext.includes('vinyl siding');
    },
    actions: [
      { type: 'set_field', field: 'trimRequired', value: true, message: 'Vinyl trim required for siding/wood exterior' },
      { type: 'set_field', field: 'headerRequired', value: true, message: 'Header required for siding/wood exterior' },
      { type: 'add_note', message: 'Siding/wood exterior: vinyl trim required; header required.' },
      { type: 'add_warning', message: 'Siding/wood exterior detected. Verify vinyl trim and header are included in pricing.' },
    ],
    severity: 'high',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['exterior_type_change', 'opening_save'],
  },

  // ─── RULE 4: CLEAR STORY ────────────────────────────────
  {
    id: 'ww-clear-story',
    name: 'Clear Story — Ladder Access + Pricing',
    description: 'Clear story windows require ladder access. First clear story = $225, each additional = $75.',
    triggerCondition: (opening) => {
      return !!(
        opening.clearStory || opening.ladderRequired ||
        (opening.floorNumber && opening.floorNumber >= 2) ||
        (opening.installNotes || '').toLowerCase().includes('clear story') ||
        (opening.installNotes || '').toLowerCase().includes('ladder')
      );
    },
    actions: [
      { type: 'add_note', message: 'Clear story / ladder access required.' },
      { type: 'add_price', priceLabel: 'Clear Story Charge', pricingLogic: 'first_plus_additional', firstAmount: 225, additionalAmount: 75, message: 'Clear story charge: first = $225, additional = $75 each' },
      { type: 'add_warning', message: 'Require exterior photo if possible for clear story opening.' },
    ],
    severity: 'high',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['clear_story_toggle', 'opening_save'],
  },

  // ─── RULE 5: BSO ABBREVIATION ───────────────────────────
  {
    id: 'ww-bso-expansion',
    name: 'BSO — Bottom Sash Only',
    description: 'When "BSO" is entered, expand to "Bottom Sash Only" and show helper label.',
    triggerCondition: (opening, ctx) => {
      const text = (ctx.inputText || opening.notes || opening.installNotes || opening.model || '').toUpperCase();
      return text.includes('BSO');
    },
    actions: [
      { type: 'expand_abbreviation', field: 'notes', value: 'Bottom Sash Only', message: 'BSO = Bottom Sash Only' },
      { type: 'add_warning', message: 'BSO = Bottom Sash Only. Verify this is the intended configuration.' },
    ],
    severity: 'info',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'abbreviations',
    triggers: ['abbreviation_entry', 'opening_save'],
  },

  // ─── RULE 6: ORIEL WINDOW ──────────────────────────────
  {
    id: 'ww-oriel-top-sash',
    name: 'Oriel — Top Sash Measurement',
    description: 'Oriel window measurements must be based on the top sash. Require confirmation.',
    triggerCondition: (opening) => {
      if (opening.orielConfirmed || (opening.orielUpperSashHeight && parseFloat(opening.orielUpperSashHeight) > 0)) {
        return false;
      }
      return !!(
        opening.oriel ||
        (opening.productCategory || '').toLowerCase().includes('oriel') ||
        (opening.model || '').toLowerCase().includes('oriel')
      );
    },
    actions: [
      { type: 'require_confirmation', message: 'Oriel measurement must be based on top sash. Confirm top sash measurement used.' },
      { type: 'add_warning', message: 'Confirm oriel measurement used top sash.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['oriel_toggle', 'opening_save', 'pre_export'],
  },

  // ─── ADDITIONAL ERROR PREVENTION RULES ─────────────────
  {
    id: 'ww-impossible-dimensions',
    name: 'Impossible Dimensions Check',
    description: 'Catch impossible or suspicious window dimensions',
    triggerCondition: (opening) => {
      const w = parseFloat(opening.width) || 0;
      const h = parseFloat(opening.height) || 0;
      if (w <= 0 || h <= 0) return false;
      return w > 120 || h > 120 || w < 8 || h < 8 || (w > h * 4) || (h > w * 6);
    },
    actions: [
      { type: 'add_warning', message: 'Dimensions appear unusual. Verify width and height are correct and not swapped.' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['opening_save', 'form_validate'],
  },

  {
    id: 'ww-picture-screen-override',
    name: 'Picture Window Screen Override Warning',
    description: 'Warn if a picture window has a screen selected (override scenario)',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      const screen = (opening.screenOption || '').toLowerCase();
      return (cat.includes('picture') || cat === 'pic') && screen !== 'no screen' && screen !== '' && screen !== 'none';
    },
    actions: [
      { type: 'add_warning', message: 'Picture windows normally have no screen. Confirm screen override is intentional.' },
      { type: 'require_confirmation', message: 'Picture window screen override confirmed' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },

  // ─── RULE A: SPECIAL SHAPE TRIM REQUIRED ────────────────
  {
    id: 'ww-special-shape-trim-required',
    name: 'Special Shape — Trim Required',
    description: 'Radius special shape windows (circle tops, eyebrows, arch-tops, etc.) require special shape trim. Polygon shapes (octagon, hexagon, etc.) do not. Per BTR p60.',
    triggerCondition: (opening) => specialShapeRequiresTrim(opening),
    actions: [
      {
        type: 'set_field',
        field: 'specialShapeTrimRequired',
        value: true,
        message: 'Special shape trim is required for this opening (radius shape). Verify exterior condition and confirm trim details.',
      },
      {
        type: 'add_warning',
        message: 'Special shape trim is required for this opening and has been noted. Verify exterior condition and confirm trim details.',
      },
      {
        type: 'add_note',
        message: 'SPECIAL SHAPE TRIM REQUIRED — radius/arch shape. Confirm trim is included in pricing.',
      },
    ],
    severity: 'blocker',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['shape_change', 'product_type_change', 'opening_save', 'pre_export'],
  },

  // ─── RULE B: SIDING OUTSIDE MEASURE — CUTBACK LIKELY ────
  {
    id: 'ww-siding-outside-measure-cutback',
    name: 'Siding + Outside Measure — Cutback Likely',
    description: 'Outside measure on siding almost always requires a cutback. Flag for rep confirmation and photo documentation.',
    triggerCondition: (opening) => isSidingExterior(opening) && isOutsideMeasure(opening),
    actions: [
      {
        type: 'set_field',
        field: 'cutbackLikely',
        value: true,
        message: 'Outside measure on siding usually requires cutback. Confirm with photos and installer/manager guidance.',
      },
      {
        type: 'add_warning',
        message: 'Outside measure on siding — cutback likely. Confirm cutback decision and take photo of exterior trim/siding condition.',
      },
      {
        type: 'require_confirmation',
        message: 'Cutback decision confirmed (Add / Not Needed / Manager Review)',
      },
    ],
    severity: 'high',
    autoApply: true, // auto-set cutbackLikely flag; decision still required from rep
    requiresConfirmation: true,
    active: true,
    category: 'installation',
    triggers: ['measurement_method_change', 'exterior_surface_change', 'opening_save', 'pre_export'],
  },

  // ─── RULE C: SIDING OUTSIDE MEASURE — HEADER REQUIRED ──
  {
    id: 'ww-siding-outside-measure-header',
    name: 'Siding + Outside Measure — Header Required',
    description: 'Header/header flashing is always required when exterior is siding and outside measure is used. Per BTR p101.',
    triggerCondition: (opening) => isSidingExterior(opening) && isOutsideMeasure(opening),
    actions: [
      {
        type: 'set_field',
        field: 'headerRequired',
        value: true,
        message: 'Header is required for this siding/outside-measure condition and has been noted.',
      },
      {
        type: 'set_field',
        field: 'headerSelected',
        value: true,
        message: 'Header auto-selected for siding + outside measure opening.',
      },
      {
        type: 'add_note',
        message: 'HDR FLASH REQUIRED — siding exterior + outside measure.',
      },
      {
        type: 'add_warning',
        message: 'Header is required for this siding/outside-measure condition and has been added. Verify header flashing is included in pricing.',
      },
    ],
    severity: 'blocker',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['measurement_method_change', 'exterior_surface_change', 'opening_save', 'pre_export'],
  },

  // ─── RULE D: SIDING OUTSIDE MEASURE — TRIM DECISION ────
  {
    id: 'ww-siding-outside-measure-trim',
    name: 'Siding + Outside Measure — Trim Decision Required',
    description: 'Siding + outside measure may require trim depending on field condition. Rep must make a deliberate decision.',
    triggerCondition: (opening) => {
      // Only fire if a trim decision has NOT been recorded yet
      return isSidingExterior(opening) && isOutsideMeasure(opening) && !opening.trimDecision;
    },
    actions: [
      {
        type: 'set_field',
        field: 'trimRequiredReview',
        value: true,
        message: 'Does this opening need trim due to outside measure/cutback/exterior finish?',
      },
      {
        type: 'require_confirmation',
        message: 'Select trim decision: Add Trim | Not Needed | Manager Review',
      },
      {
        type: 'add_warning',
        message: 'Trim decision needed: Does this siding/outside-measure opening require trim? Choose: Add Trim / Not Needed (with reason) / Manager Review.',
      },
    ],
    severity: 'high',
    autoApply: true, // auto-set trimRequiredReview flag; actual decision is a guided question
    requiresConfirmation: true,
    active: true,
    category: 'installation',
    triggers: ['measurement_method_change', 'exterior_surface_change', 'opening_save', 'pre_export'],
  },

  {
    id: 'ww-patio-door-labor',
    name: 'Patio Door — Labor Review',
    description: 'Patio doors require labor/pricing review',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      return cat.includes('patio') || cat.includes('sliding door') || cat.includes('french door');
    },
    actions: [
      { type: 'add_note', message: 'Verify track/frame condition.' },
      { type: 'add_warning', message: 'Patio door detected. Verify labor pricing and track condition.' },
    ],
    severity: 'medium',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },

  // ─── RULE E: ORIEL UPPER SASH HEIGHT REQUIRED ────────────
  {
    id: 'ww-oriel-upper-sash',
    name: 'Oriel — Upper Sash Height Required',
    description: 'Oriel windows must have an upper sash height specified.',
    triggerCondition: (opening) => {
      const isOriel = opening.oriel || (opening.productCategory || '').toLowerCase().includes('oriel') || (opening.model || '').toLowerCase().includes('oriel');
      return isOriel && (!opening.orielUpperSashHeight || parseFloat(opening.orielUpperSashHeight) <= 0);
    },
    actions: [
      { type: 'add_warning', message: 'Oriel windows must have an upper sash height specified.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['oriel_toggle', 'opening_save', 'pre_export'],
  },

  // ─── RULE F: BRICK EXTERIOR — OUTSIDE MEASURE REQUIRED ────
  {
    id: 'ww-brick-measure',
    name: 'Brick Exterior — Outside Measure Required',
    description: 'Brick is measured brick-to-brick, so it must be outside measure.',
    triggerCondition: (opening) => {
      const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();
      const method = (opening.measurementMethod || '').toLowerCase();
      const isBrick = ext.includes('brick');
      const isInsideMeasure = method === 'inside' || method === 'inside_measure' || opening.insideMeasureUsed === true;
      return isBrick && isInsideMeasure;
    },
    actions: [
      { type: 'add_warning', message: 'Brick is measured brick-to-brick. Measurement method must be outside.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['measurement_method_change', 'exterior_surface_change', 'opening_save', 'pre_export'],
  },

  // ─── RULE G: SIDING/WOOD EXTERIOR — INSIDE MEASURE REQUIRED ────
  {
    id: 'ww-siding-measure',
    name: 'Siding/Wood/Stucco Exterior — Inside Measure Required',
    description: 'Wood/Siding/Stucco are inside measure (whatever touches the window is what you measure).',
    triggerCondition: (opening) => {
      const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();
      const isSidingOrStucco = ext.includes('siding') || ext.includes('wood') || ext.includes('stucco') || ext.includes('vinyl siding');
      return isSidingOrStucco && isOutsideMeasure(opening);
    },
    actions: [
      { type: 'add_warning', message: 'Wood/Siding/Stucco must use inside measure. Confirm measurement method.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['measurement_method_change', 'exterior_surface_change', 'opening_save', 'pre_export'],
  },

  // ═══════════════════════════════════════════════════════════════
  // BTR 2026 PRICING GUIDELINES RULES
  // Source: 2026 BTR Pricing Guidelines (authoritative)
  // ═══════════════════════════════════════════════════════════════

  // ─── BTR-H: CLAY NOT AVAILABLE IN L200/0700 (BTR p.71) ────
  {
    id: 'btr-no-clay-L200-0700',
    name: 'BTR: Clay Not Available in L-2000/0700',
    description: 'Clay vinyl cannot be made in L-2000 (FUSION) & 0700 series. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const color = (opening.interiorColor || opening.vinylColor || '').toLowerCase();
      return (model.startsWith('L2') || model.startsWith('07')) && color === 'clay';
    },
    actions: [
      { type: 'add_warning', message: 'Clay vinyl is NOT available in L-2000 (FUSION) & 0700 series. Change color to White or Beige.' },
      { type: 'flag_field', field: 'interiorColor', message: 'Clay not available for this series (BTR p.71)' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-I: NO EXTERIOR COLOR ON L200/0700 (BTR p.71) ────
  {
    id: 'btr-no-ext-color-L200-0700',
    name: 'BTR: No Exterior Color on L-2000/0700',
    description: 'Exterior color option is not available in L-2000 (FUSION) & 0700 series. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const extColor = (opening.exteriorColor || '').toLowerCase();
      return (model.startsWith('L2') || model.startsWith('07')) && extColor !== '' && extColor !== 'white';
    },
    actions: [
      { type: 'add_warning', message: 'Exterior color is NOT available on L-2000 (FUSION) & 0700 series. Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'exteriorColor', message: 'Exterior color not available for this series' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-J: NO INTERIOR COLOR ON L200 (BTR p.71) ────
  {
    id: 'btr-no-int-color-L200',
    name: 'BTR: No Interior Color on L-2000',
    description: 'Interior color option is not available in L-2000 (FUSION) series. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const intColor = (opening.interiorColor || '').toLowerCase();
      return model.startsWith('L2') && intColor !== '' && intColor !== 'white';
    },
    actions: [
      { type: 'add_warning', message: 'Interior color is NOT available on L-2000 (FUSION) series. Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'interiorColor', message: 'Interior color not available for L-2000' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-K: NO INT COLOR ON 03A0-SH, ARCH-TOPS (BTR p.71) ────
  {
    id: 'btr-no-int-color-03A0-SH-archtops',
    name: 'BTR: No Interior Color on 03A0-SH & Arch-Tops',
    description: 'Interior color not available on 03A0 Single Hung, S140, S144, S146. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const intColor = (opening.interiorColor || '').toLowerCase();
      const noIntColorModels = ['03A0', 'S140', 'S144', 'S146'];
      return noIntColorModels.includes(model) && intColor !== '' && intColor !== 'white';
    },
    actions: [
      { type: 'add_warning', message: 'Interior color is NOT available on 03A0 Single Hung or arch-top windows (S140, S144, S146). Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'interiorColor', message: 'Interior color not available for this model' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-L: EXT COLOR REQUIRES B1 CONTOURED GRIDS (BTR p.71) ────
  {
    id: 'btr-ext-color-requires-B1',
    name: 'BTR: Exterior Color Requires B1 Contoured Grids',
    description: 'Windows with exterior color must have B1 CONTOURED grids. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const extColor = (opening.exteriorColor || '').toLowerCase();
      const grid = (opening.gridStyle || '').toLowerCase();
      const gridProfile = (opening.gridProfile || '').toLowerCase();
      const hasExtColor = extColor !== '' && extColor !== 'white';
      const hasGrid = grid !== '' && grid !== 'none' && grid !== 'standard';
      const isNotB1 = gridProfile !== 'contoured' && gridProfile !== 'b1';
      return hasExtColor && hasGrid && isNotB1;
    },
    actions: [
      { type: 'add_warning', message: 'Windows with exterior color MUST have B1 CONTOURED grids. Change grid profile to Contoured (B1). Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'gridProfile', message: 'Must be B1 Contoured with exterior color' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-M: L200 REQUIRES B1 CONTOURED GRIDS (BTR p.13) ────
  {
    id: 'btr-L200-requires-B1',
    name: 'BTR: L-2000 Must Have B1 Contoured Grids',
    description: 'L-2000 series must have B1 CONTOURED grids. Per BTR 2026 p.13.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const grid = (opening.gridStyle || '').toLowerCase();
      const gridProfile = (opening.gridProfile || '').toLowerCase();
      const hasGrid = grid !== '' && grid !== 'none' && grid !== 'standard';
      const isNotB1 = gridProfile !== 'contoured' && gridProfile !== 'b1';
      return model.startsWith('L2') && hasGrid && isNotB1;
    },
    actions: [
      { type: 'add_warning', message: 'L-2000 series MUST have B1 CONTOURED grids. Change grid profile to Contoured (B1). Per BTR 2026 p.13.' },
      { type: 'flag_field', field: 'gridProfile', message: 'L-2000 requires B1 Contoured grids' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['opening_save', 'pre_export'],
  },

  // ─── BTR-N: DIAMOND GRIDS MUST BE A1 FLAT (BTR p.71) ────
  {
    id: 'btr-diamond-must-be-A1',
    name: 'BTR: Diamond Grids Must Be A1 Flat',
    description: 'Diamond grids must be A1 FLAT. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const grid = (opening.gridStyle || '').toLowerCase();
      const gridProfile = (opening.gridProfile || '').toLowerCase();
      return grid.includes('diamond') && gridProfile !== 'flat' && gridProfile !== 'a1';
    },
    actions: [
      { type: 'add_warning', message: 'Diamond grids must be A1 FLAT. Change grid profile to Flat (A1). Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'gridProfile', message: 'Diamond grids must be A1 Flat' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['opening_save', 'pre_export'],
  },

  // ─── BTR-O: 50" MAX ORIEL ON DH (BTR p.17) ────
  {
    id: 'btr-50in-max-oriel-DH',
    name: 'BTR: 50" Max Oriel on DH Windows (3000)',
    description: '50" max oriel on DH windows. >50" oriel only on single hung (03A0). Per BTR 2026 p.17.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const cat = (opening.productCategory || '').toLowerCase();
      const isOriel = opening.oriel && opening.orielUpperSashHeight;
      const isDH = cat.includes('double_hung') || cat.includes('double hung');
      return isOriel && isDH && parseFloat(opening.orielUpperSashHeight) > 50 && !model.startsWith('03A');
    },
    actions: [
      { type: 'add_warning', message: '50" max oriel on DH windows. Oriel >50" only available on single hung (03A0). Per BTR 2026 p.17.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'measurement_validation',
    triggers: ['oriel_toggle', 'opening_save', 'pre_export'],
  },

  // ─── BTR-P: FULL SCREEN RESTRICTIONS (BTR p.13) ────
  {
    id: 'btr-full-screen-restrictions',
    name: 'BTR: Full Screen Not Available on Certain Types',
    description: 'Full screen cannot be made on picture windows, 3-lite sliders, or arch-top windows. Per BTR 2026 p.13.',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || '').toLowerCase();
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const screen = (opening.screenOption || '').toLowerCase();
      const isFull = screen === 'full' || screen === 'full screen';
      const restrictedTypes = cat.includes('picture') || cat.includes('3-lite') || cat.includes('3_lite') || cat.includes('slider_3lite');
      const isArchTop = ['S140', 'S144', 'S146'].includes(model);
      return isFull && (restrictedTypes || isArchTop);
    },
    actions: [
      { type: 'add_warning', message: 'Full screen CANNOT be made on picture windows, 3-lite sliders, or arch-top windows. Per BTR 2026 p.13.' },
      { type: 'flag_field', field: 'screenOption', message: 'Full screen not available for this type' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-Q: 03A0 SH MUST BE IN SPECIALTY SECTION (BTR p.15) ────
  {
    id: 'btr-03A0-specialty-section',
    name: 'BTR: 03A0 Single Hung — Write in Specialty Section',
    description: 'All 03A0 single hung windows must be written in the specialty windows section of the contract. Per BTR 2026 p.15.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      return model === '03A0';
    },
    actions: [
      { type: 'add_warning', message: '03A0 Single Hung must be written in the SPECIALTY WINDOWS section of the contract, not the standard windows section. Per BTR 2026 p.15.' },
      { type: 'add_note', message: '03A0 SH → SPECIALTY WINDOWS section on contract.' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-R: NO EXT COLOR ON CLAY VINYL (BTR p.71) ────
  {
    id: 'btr-no-ext-color-clay-vinyl',
    name: 'BTR: No Exterior Color on Clay Vinyl',
    description: 'Exterior color is not available on clay vinyl windows. Per BTR 2026 p.71.',
    triggerCondition: (opening) => {
      const vinyl = (opening.vinylColor || opening.interiorColor || '').toLowerCase();
      const extColor = (opening.exteriorColor || '').toLowerCase();
      return vinyl === 'clay' && extColor !== '' && extColor !== 'white' && extColor !== 'clay';
    },
    actions: [
      { type: 'add_warning', message: 'Exterior color is NOT available on clay vinyl windows. Per BTR 2026 p.71.' },
      { type: 'flag_field', field: 'exteriorColor', message: 'Exterior color not available with clay vinyl' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save', 'pre_export'],
  },

  // ─── BTR-S: NO VENT STOPS ON 03A0 (BTR p.15) ────
  {
    id: 'btr-no-vent-stops-03A0',
    name: 'BTR: No Vent Stops on 03A0',
    description: 'Vent stops are not available on 03A0 series. Per BTR 2026 p.15.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      return model.startsWith('03A') && opening.ventStops === true;
    },
    actions: [
      { type: 'add_warning', message: 'Vent stops are NOT available on 03A0 series. Per BTR 2026 p.15.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['opening_save', 'pre_export'],
  },

  // ─── BTR-T: NO RAIN GLASS ON 03A0 (BTR p.15) ────
  {
    id: 'btr-no-rain-glass-03A0',
    name: 'BTR: No Rain Glass on 03A0',
    description: 'Rain glass is not available on 03A0 series. Per BTR 2026 p.15.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const glass = (opening.glassPackage || opening.glassOption || '').toLowerCase();
      return model.startsWith('03A') && glass.includes('rain');
    },
    actions: [
      { type: 'add_warning', message: 'Rain glass is NOT available on 03A0 series. Per BTR 2026 p.15.' },
      { type: 'flag_field', field: 'glassPackage', message: 'Rain glass not available for 03A0' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['opening_save', 'pre_export'],
  },

  // ─── BTR-U: CASEMENT MULL → 0972 (BTR p.30) ────
  {
    id: 'btr-casement-mull-0972',
    name: 'BTR: Twin 0971 Casements Must Order as 0972',
    description: 'Any mull of two 0971 casements fitting within 32-72W × 19-79H (max UI 150) must be ordered as 0972. Per BTR 2026 p.30.',
    triggerCondition: (opening) => {
      const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
      const isMull = opening.mullGroup || opening.isMulled;
      return model === '0971' && isMull;
    },
    actions: [
      { type: 'add_warning', message: 'Two mulled 0971 casements fitting within 32-72W × 19-79H (max UI 150) must be ordered as 0972 (double casement). Per BTR 2026 p.30.' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'product_defaults',
    triggers: ['opening_save', 'pre_export'],
  },
];

// ═══════════════════════════════════════════════════════════════
// ABBREVIATION MAP
// ═══════════════════════════════════════════════════════════════
export const ABBREVIATION_MAP: Record<string, string> = {
  'BSO': 'Bottom Sash Only',
  'DH': 'Double Hung',
  'PIC': 'Picture Window',
  'SL': 'Slider',
  'CAS': 'Casement',
  'AWN': 'Awning',
  'PD': 'Patio Door',
  'CS': 'Clear Story',
  'NF': 'Nail Fin',
  'FS': 'Full Screen',
  'HS': 'Half Screen',
  'VT': 'Vinyl Trim',
  'HDR': 'Header',
  'HDR FLASH': 'Header Flashing',
  'CUTBACK': 'Cutback Required',
  'SSTRIM': 'Special Shape Trim',
  'OUTSIDE': 'Outside Measure',
  'SZ': 'SolarZone',
  'SZE': 'SolarZone Elite',
  'COL': 'Colonial Grid',
  'TG': 'Tempered Glass',
  'OG': 'Obscure Glass',
  'FE': 'Foam Enhanced',
};

// ═══════════════════════════════════════════════════════════════
// AUTO-GENERATED OPENING NAMES
// ═══════════════════════════════════════════════════════════════
export function generateOpeningName(opening: any): string {
  const parts: string[] = [];
  if (opening.roomLocation) parts.push(opening.roomLocation);
  if (opening.elevation) parts.push(capitalize(opening.elevation));
  if (opening.position) parts.push(opening.position);
  if (parts.length === 0) {
    const cat = (opening.productCategory || opening.model || 'Window').toLowerCase();
    if (cat.includes('patio') || cat.includes('door')) parts.push('Patio Door');
    else if (cat.includes('picture')) parts.push('Picture Window');
    else if (cat.includes('casement')) parts.push('Casement');
    else if (cat.includes('awning')) parts.push('Awning');
    else parts.push('Window');
  }
  if (opening.floorNumber && opening.floorNumber >= 2) {
    parts.push(opening.floorNumber === 2 ? '2nd Floor' : `${opening.floorNumber}th Floor`);
  }
  if (opening.clearStory) parts.push('Clear Story');
  return parts.join(' ') || `Window ${opening.openingNumber || ''}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════
// RULE ENGINE — Evaluate rules against an opening
// ═══════════════════════════════════════════════════════════════
export function evaluateRules(
  opening: any,
  context: RuleContext,
  triggers: RuleTrigger[] = ['opening_save'],
): RuleResult[] {
  const results: RuleResult[] = [];

  for (const rule of WINDOW_WORLD_RULES) {
    if (!rule.active) continue;
    if (!rule.triggers.some(t => triggers.includes(t))) continue;

    try {
      if (!rule.triggerCondition(opening, context)) continue;
    } catch { continue; }

    const appliedActions: AppliedAction[] = rule.actions.map(action => {
      let message = action.message || '';

      // Calculate pricing for clear story
      if (action.pricingLogic === 'first_plus_additional' && rule.id === 'ww-clear-story') {
        const csOpenings = context.allOpenings.filter(o =>
          o.clearStory || o.ladderRequired || (o.floorNumber && o.floorNumber >= 2)
        );
        const idx = csOpenings.findIndex(o =>
          (o.openingNumber || o.id) === (opening.openingNumber || opening.id)
        );
        const amount = idx === 0 ? (action.firstAmount || 225) : (action.additionalAmount || 75);
        message = `Clear story charge: ${idx === 0 ? 'first' : 'additional'} = $${amount}`;
        return { type: action.type, field: action.field, value: amount, message, priceAmount: amount, applied: rule.autoApply, confirmed: false };
      }

      return { type: action.type, field: action.field, value: action.value, message, priceAmount: action.priceAmount, applied: rule.autoApply, confirmed: false };
    });

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      autoApplied: rule.autoApply,
      requiresConfirmation: rule.requiresConfirmation,
      actions: appliedActions,
      openingNumber: opening.openingNumber,
      category: rule.category,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// APPLY AUTO-ACTIONS to an opening (mutates a copy)
// ═══════════════════════════════════════════════════════════════
export function applyAutoRules(opening: any, context: RuleContext): { updated: any; results: RuleResult[] } {
  const results = evaluateRules(opening, context, ['opening_save']);
  const updated = { ...opening };

  for (const result of results) {
    if (!result.autoApplied) continue;
    for (const action of result.actions) {
      if (action.type === 'set_field' && action.field) {
        (updated as any)[action.field] = action.value;
        action.applied = true;
      }
      if (action.type === 'expand_abbreviation' && action.field) {
        const current = (updated as any)[action.field] || '';
        if (current.toUpperCase().includes('BSO')) {
          (updated as any)[action.field] = current.replace(/\bBSO\b/gi, 'Bottom Sash Only');
          action.applied = true;
        }
      }
    }
  }

  return { updated, results };
}

// ═══════════════════════════════════════════════════════════════
// SMART INSTALL NOTES — auto-generate based on opening details
// ═══════════════════════════════════════════════════════════════
export function generateSmartInstallNotes(opening: any): { note: string; reason: string; severity: RuleSeverity }[] {
  const notes: { note: string; reason: string; severity: RuleSeverity }[] = [];
  const cat = (opening.productCategory || opening.model || '').toLowerCase();
  const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();

  if (opening.clearStory || opening.ladderRequired || (opening.floorNumber && opening.floorNumber >= 2)) {
    notes.push({ note: 'Ladder access required.', reason: 'Second floor / clear story opening', severity: 'high' });
  }
  if (ext.includes('siding') || ext.includes('wood')) {
    notes.push({ note: 'Vinyl trim required. Header required.', reason: 'Siding/wood exterior', severity: 'high' });
  }
  // Rule A: special shape trim
  if (specialShapeRequiresTrim(opening)) {
    const trimNote = opening.specialShapeTrimSelected
      ? 'SPECIAL SHAPE TRIM — included in quote.'
      : 'SPECIAL SHAPE TRIM REQUIRED — confirm trim is priced and included.';
    notes.push({ note: trimNote, reason: 'Radius/arch special shape requires trim per BTR p60', severity: opening.specialShapeTrimSelected ? 'low' : 'high' });
  }
  // Rule C: header required
  if (opening.headerRequired || opening.headerSelected) {
    notes.push({ note: 'HDR FLASH REQUIRED — siding exterior + outside measure.', reason: 'Header required for siding/outside measure per BTR p101', severity: 'high' });
  }
  // Rule B: cutback
  if (opening.cutbackSelected) {
    notes.push({ note: 'CUTBACK CONFIRMED — outside measure on siding; cutback included in quote.', reason: 'Outside measure on siding', severity: 'medium' });
  } else if (opening.cutbackLikely && !opening.cutbackSelected && opening.cutbackReviewStatus !== 'not_needed') {
    notes.push({ note: 'OUTSIDE MEASURE ON SIDING — cutback likely. Confirm with manager.', reason: 'Outside measure on siding', severity: 'high' });
  }
  // Rule D: trim decision
  if (opening.trimDecision === 'add_trim') {
    notes.push({ note: 'TRIM — added per field condition (siding/outside measure).', reason: 'Trim required per trim decision', severity: 'medium' });
  } else if (opening.trimDecision === 'not_needed') {
    const reason = opening.trimDecisionReason ? ` Reason: ${opening.trimDecisionReason}` : '';
    notes.push({ note: `TRIM NOT NEEDED — existing trim remains.${reason}`, reason: 'Trim decision: not needed', severity: 'low' });
  } else if (opening.trimDecision === 'manager_review') {
    notes.push({ note: 'TRIM — manager review required before final contract.', reason: 'Trim decision escalated', severity: 'high' });
  }
  if (opening.sillRepair) {
    notes.push({ note: 'Verify sill condition and repair as needed.', reason: 'Sill damage flagged', severity: 'medium' });
  }
  if (cat.includes('picture')) {
    notes.push({ note: 'Picture window; no screen unless manually overridden.', reason: 'Picture window type', severity: 'low' });
  }
  if (cat.includes('patio') || cat.includes('door')) {
    notes.push({ note: 'Verify track/frame condition.', reason: 'Patio door', severity: 'medium' });
  }
  if (opening.oriel) {
    notes.push({ note: 'Oriel — measurement must be based on top sash.', reason: 'Oriel window', severity: 'high' });
  }
  if ((opening.roomLocation || '').toLowerCase().match(/bath|shower/)) {
    notes.push({ note: 'Bathroom — verify tempered glass requirement.', reason: 'Bathroom location', severity: 'medium' });
  }

  // ── BTR 2026 Notes ──
  const model = (opening.seriesModel || opening.productModel || '').toUpperCase();
  if (model === '03A0') {
    notes.push({ note: '03A0 SH → write in SPECIALTY WINDOWS section on contract.', reason: 'BTR 2026 p.15', severity: 'high' });
  }
  if (opening.tapcon) {
    notes.push({ note: 'TAPCON $10/unit — concrete attachment.', reason: 'BTR 2026 tapcon charge', severity: 'medium' });
  }
  const ui = (parseFloat(opening.width) || 0) + (parseFloat(opening.height) || 0);
  if (model.startsWith('88') && ui > 120) {
    notes.push({ note: 'WINCORE $100 ADDER — window UI > 120.', reason: 'BTR 2026 p.19', severity: 'high' });
  }
  if (ui <= 83 && (cat.includes('slider') || cat.includes('picture'))) {
    notes.push({ note: 'SMALL WINDOW $285 MINIMUM — UI ≤ 83.', reason: 'BTR 2026 p.13/15/17', severity: 'medium' });
  }

  return notes;
}

// ═══════════════════════════════════════════════════════════════
// ONE-TAP PACKAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export interface QuickPackage {
  id: string;
  label: string;
  icon: string;
  description: string;
  applyFields: Record<string, any>;
  targetFilter?: (opening: any) => boolean;
  category: string;
}

export const QUICK_PACKAGES: QuickPackage[] = [
  { id: 'color-white-all', label: 'White Int/Ext — All', icon: '⬜', description: 'Apply white interior/exterior to all openings', applyFields: { interiorColor: 'White', exteriorColor: 'White' }, category: 'color' },
  { id: 'screen-half-all', label: 'Half Screen — All', icon: '🪟', description: 'Apply half screen to all openings', applyFields: { screenOption: 'Half Screen', fullScreen: false }, category: 'screen' },
  { id: 'screen-half-dh', label: 'Half Screen — Double Hungs', icon: '🪟', description: 'Apply half screen to all double hung windows', applyFields: { screenOption: 'Half Screen', fullScreen: false }, targetFilter: (o) => (o.productCategory || o.model || '').toLowerCase().includes('double_hung'), category: 'screen' },
  { id: 'grid-colonial-all', label: 'Colonial Grids — All', icon: '🔲', description: 'Apply colonial grids to all openings', applyFields: { gridStyle: 'Colonial', gridFull: true }, category: 'grid' },
  { id: 'grid-colonial-front', label: 'Colonial Grids — Front', icon: '🔲', description: 'Apply colonial grids to front-facing openings', applyFields: { gridStyle: 'Colonial', gridFull: true }, targetFilter: (o) => (o.elevation || '').toLowerCase() === 'front', category: 'grid' },
  { id: 'grid-none-all', label: 'No Grids — All', icon: '⬜', description: 'Remove grids from all openings', applyFields: { gridStyle: 'None', gridPattern: '', gridFull: false, gridSpec: false }, category: 'grid' },
  { id: 'floor-2-selected', label: 'Mark Second Floor', icon: '🏠', description: 'Mark selected openings as second floor', applyFields: { floorNumber: 2 }, category: 'floor' },
  { id: 'brick-install', label: 'Brick Install Package', icon: '🧱', description: 'Apply brick exterior install package', applyFields: { exteriorType: 'Brick', installType: 'brick' }, category: 'install' },
  { id: 'siding-install', label: 'Siding/Wood Exterior', icon: '🪵', description: 'Apply siding/wood exterior with vinyl trim + header', applyFields: { exteriorType: 'Siding', installType: 'siding', trimRequired: true, headerRequired: true }, category: 'install' },
  { id: 'no-screen-pic', label: 'No Screen — Pictures', icon: '🚫', description: 'Set no screen for all picture windows', applyFields: { screenOption: 'No Screen', fullScreen: false }, targetFilter: (o) => (o.productCategory || o.model || '').toLowerCase().includes('picture'), category: 'screen' },
  { id: 'foam-all', label: 'Foam Enhanced — All', icon: '🫧', description: 'Apply foam enhanced to all openings', applyFields: { foamEnhanced: true }, category: 'options' },
  { id: 'nailfin-all', label: 'Nail Fin — All', icon: '🔩', description: 'Apply nail fin to all openings', applyFields: { nailFin: true }, category: 'options' },
];
