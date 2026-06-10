// server/src/services/btrRulesEngine.ts
//
// BTR 2026 Rules Evaluation Engine
// Loads structured rules from reference data and evaluates against openings.
// Used by pricingEngine.ts to flag violations as AuditorIssues.
//

import { readFileSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────────────

export interface BTRRule {
  id: string;
  sourceDocument: string;
  sourcePage: number;
  sourceSection: string;
  effectiveYear: number;
  market: string;
  description: string;
  appliesTo: string[];
  severity: 'blocker' | 'warning' | 'info';
  active: boolean;
  calculationType: string;
  ruleType: string;
  validationMessage: string;
  conditions: Record<string, any>;
  action: Record<string, any>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  passes: boolean;
  message: string;
  severity: 'blocker' | 'warning' | 'info';
  sourcePage: number;
  sourceSection: string;
  suggestedAction?: string;
}

export interface OpeningForRuleEval {
  openingNumber: number;
  width?: number;
  height?: number;
  productType?: string;
  productCategory?: string;
  productModel?: string;
  seriesModel?: string;
  interiorColor?: string;
  exteriorColor?: string;
  vinylColor?: string;
  gridStyle?: string;
  gridProfile?: string;
  screenOption?: string;
  temperedGlass?: string;
  obscureGlass?: string;
  foamEnhanced?: boolean;
  argon?: boolean;
  oriel?: boolean;
  orielUpperSashHeight?: number;
  isSDL?: boolean;
  sdlSize?: string;
  specialtyShape?: string;
  nailFin?: boolean;
  removalType?: string;
  installType?: string;
  exteriorType?: string;
  exteriorSurface?: string;
  requiresTrimHeader?: boolean;
  legHeight?: number;
  customRadius?: number;
  hinge?: string;
  quantity?: number;
}

// ── Data Loading ──────────────────────────────────────────────

let _rules: BTRRule[] | null = null;
let _productModels: any = null;
let _colorOptions: any = null;
let _gridStyles: any = null;
let _pricingTables: any = null;

function getDataDir(): string {
  // Try multiple strategies for locating the data directory.
  // 1. __dirname (available in CJS / Jest via Babel transform)
  // 2. Relative to process.cwd() (fallback for any environment)
  try {
    // When running via tsx/node ESM build, __dirname may be defined by the bundler
    // eslint-disable-next-line no-undef
    if (typeof __dirname !== 'undefined') {
      return join(__dirname, '..', '..', 'reference', 'window-world', 'data');
    }
  } catch { /* ignore */ }

  // Fallback: relative to working directory
  return join(process.cwd(), 'server', 'reference', 'window-world', 'data');
}

function loadJSON(filename: string): any {
  try {
    const dataDir = getDataDir();
    const raw = readFileSync(join(dataDir, filename), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[BTR Rules] Could not load ${filename}:`, (err as Error).message);
    return null;
  }
}

export function loadRules(): BTRRule[] {
  if (!_rules) {
    const data = loadJSON('rules.json');
    _rules = Array.isArray(data) ? data : (data?.rules || []);
  }
  return _rules!;
}

export function loadProductModels(): any {
  if (!_productModels) _productModels = loadJSON('productModels.json');
  return _productModels;
}

export function loadColorOptions(): any {
  if (!_colorOptions) _colorOptions = loadJSON('colorOptions.json');
  return _colorOptions;
}

export function loadGridStyles(): any {
  if (!_gridStyles) _gridStyles = loadJSON('gridStyles.json');
  return _gridStyles;
}

export function loadPricingTables(): any {
  if (!_pricingTables) _pricingTables = loadJSON('pricingTables.json');
  return _pricingTables;
}

// ── Helpers ──────────────────────────────────────────────────

function getSeriesFromModel(model?: string): string | null {
  if (!model) return null;
  if (model.startsWith('L2')) return 'L200';
  if (model.startsWith('03A')) return '03A0';
  if (model.startsWith('30')) return '3000';
  if (model.startsWith('09')) return 'CASEMENT';
  if (model.startsWith('097')) return 'CASEMENT';
  if (model.startsWith('095')) return 'AWNING';
  if (model.startsWith('88')) return 'WINCORE_BOB';
  if (model.startsWith('77')) return 'WINCORE_IMPACT';
  if (model.startsWith('64')) return 'SGD';
  if (model.startsWith('S1')) return 'SPECIAL_SHAPE';
  if (model === '09C7') return 'BASEMENT';
  return null;
}

function matchesAppliesTo(rule: BTRRule, opening: OpeningForRuleEval): boolean {
  if (!rule.appliesTo || rule.appliesTo.length === 0) return true;
  
  const model = opening.seriesModel || opening.productModel || '';
  const series = getSeriesFromModel(model);
  const category = opening.productCategory || '';
  const productType = opening.productType || '';
  
  return rule.appliesTo.some(target => {
    // Direct model match
    if (target === model) return true;
    // Series match
    if (target === series) return true;
    // Category match (e.g., 'double_hung', 'slider')
    if (target.toLowerCase() === category.toLowerCase()) return true;
    // Product type match (e.g., 'window', 'patio_door')
    if (target.toLowerCase() === productType.toLowerCase()) return true;
    // Wildcard
    if (target === '*' || target === 'all') return true;
    return false;
  });
}

// ── Core Evaluation ──────────────────────────────────────────

/**
 * Evaluate a single rule against an opening.
 */
export function evaluateRule(opening: OpeningForRuleEval, rule: BTRRule): RuleEvaluationResult {
  // Skip inactive rules
  if (!rule.active) {
    return { ruleId: rule.id, passes: true, message: '', severity: rule.severity, sourcePage: rule.sourcePage, sourceSection: rule.sourceSection };
  }

  // Skip rules that don't apply to this opening
  if (!matchesAppliesTo(rule, opening)) {
    return { ruleId: rule.id, passes: true, message: '', severity: rule.severity, sourcePage: rule.sourcePage, sourceSection: rule.sourceSection };
  }

  const conds = rule.conditions || {};
  const ui = (opening.width || 0) + (opening.height || 0);
  let passes = true;
  let message = '';

  // ── Restriction evaluations ──
  if (rule.calculationType === 'restriction') {
    // Color restrictions
    if (rule.ruleType === 'color_restriction') {
      if (conds.field === 'exteriorColor' && opening.exteriorColor && opening.exteriorColor !== 'white' && opening.exteriorColor !== 'White') {
        passes = false;
        message = rule.validationMessage;
      }
      if (conds.field === 'interiorColor' && opening.interiorColor && opening.interiorColor !== 'white' && opening.interiorColor !== 'White') {
        passes = false;
        message = rule.validationMessage;
      }
      if (conds.field === 'vinylColor' && conds.excludedColor === 'clay') {
        if (opening.vinylColor?.toLowerCase() === 'clay' || opening.interiorColor?.toLowerCase() === 'clay') {
          passes = false;
          message = rule.validationMessage;
        }
      }
    }

    // Product type restrictions
    if (rule.ruleType === 'product_restriction') {
      if (conds.restrictedType === 'single_hung' && (opening.productCategory?.toLowerCase().includes('single_hung') || opening.productCategory?.toLowerCase().includes('single hung'))) {
        passes = false;
        message = rule.validationMessage;
      }
    }

    // Screen restrictions
    if (rule.ruleType === 'screen_restriction') {
      if (conds.restrictedOption === 'full_screen') {
        const cat = opening.productCategory?.toLowerCase() || '';
        const isRestricted = conds.restrictedTypes?.some((t: string) => cat.includes(t.toLowerCase()));
        if (isRestricted && (opening.screenOption === 'Full' || opening.screenOption === 'full')) {
          passes = false;
          message = rule.validationMessage;
        }
      }
    }

    // Grid restrictions
    if (rule.ruleType === 'grid_restriction') {
      if (conds.requiredProfile === 'B1_contoured') {
        if (opening.gridStyle && opening.gridStyle !== 'None' && opening.gridStyle !== 'none') {
          if (opening.gridProfile !== 'Contoured' && opening.gridProfile !== 'B1') {
            passes = false;
            message = rule.validationMessage;
          }
        }
      }
      if (conds.requiredProfile === 'A1_flat') {
        if (opening.gridStyle?.toLowerCase().includes('diamond')) {
          if (opening.gridProfile !== 'Flat' && opening.gridProfile !== 'A1') {
            passes = false;
            message = rule.validationMessage;
          }
        }
      }
    }

    // Oriel max restriction
    if (rule.ruleType === 'oriel_restriction') {
      if (opening.oriel && opening.orielUpperSashHeight) {
        const maxOriel = conds.maxOrielInches || 50;
        if (opening.orielUpperSashHeight > maxOriel) {
          passes = false;
          message = rule.validationMessage;
        }
      }
    }

    // Size limitation checks
    if (rule.ruleType === 'size_limitation') {
      if (conds.maxUI && ui > conds.maxUI) {
        passes = false;
        message = rule.validationMessage;
      }
      if (conds.maxWidth && (opening.width || 0) > conds.maxWidth) {
        passes = false;
        message = rule.validationMessage;
      }
      if (conds.maxHeight && (opening.height || 0) > conds.maxHeight) {
        passes = false;
        message = rule.validationMessage;
      }
    }

    // Rain glass restriction
    if (rule.ruleType === 'glass_restriction') {
      // Currently no rain glass field, but ready for it
    }

    // Vent stop restriction
    if (rule.ruleType === 'feature_restriction') {
      // Vent stops - no field currently, but ready
    }
  }

  // ── Validation evaluations ──
  if (rule.calculationType === 'validation') {
    // Casement mull rule
    if (rule.ruleType === 'mull_conversion') {
      // This is informational — checked during order generation
      // If two 0971s are mulled within the size range, should be 0972
      passes = true; // Will be checked at order generation time
      message = rule.validationMessage;
    }

    // SDL must specify size
    if (rule.ruleType === 'sdl_size_required') {
      if (opening.isSDL && !opening.sdlSize) {
        passes = false;
        message = rule.validationMessage;
      }
    }

    // SGD operating direction required
    if (rule.ruleType === 'operating_direction_required') {
      // Check if SGD has hinge/direction specified
      if (!opening.hinge) {
        passes = false;
        message = rule.validationMessage;
      }
    }
  }

  // ── Adder evaluations (pricing rules) ──
  if (rule.calculationType === 'adder') {
    // These don't "fail" — they generate pricing adders
    // The pricing service handles the actual charge
    passes = true;

    if (rule.ruleType === 'tapcon_adder') {
      message = rule.validationMessage;
    }
    if (rule.ruleType === 'large_window_adder') {
      if (ui > (conds.uiThreshold || 120)) {
        message = `${rule.validationMessage} — UI=${ui} exceeds ${conds.uiThreshold || 120}`;
      }
    }
    if (rule.ruleType === 'small_window_minimum') {
      if (ui <= (conds.maxUI || 83)) {
        message = `${rule.validationMessage} — UI=${ui} qualifies for $${conds.minimumPrice || 285} minimum`;
      }
    }
    if (rule.ruleType === 'over_max_ui_adder') {
      // Check if opening exceeds model's max UI
      message = rule.validationMessage;
    }
  }

  // ── Override evaluations ──
  if (rule.calculationType === 'override') {
    // ST auto-upgrade
    if (rule.ruleType === 'auto_upgrade') {
      if ((opening.width || 0) > (conds.widthThreshold || 48) || (opening.height || 0) > (conds.heightThreshold || 84)) {
        passes = true; // Not a failure, but an informational note
        message = rule.validationMessage;
      }
    }

    // Contract section placement
    if (rule.ruleType === 'contract_section') {
      passes = true;
      message = rule.validationMessage;
    }
  }

  // ── Commission rules ──
  if (rule.calculationType === 'commission') {
    passes = true;
    message = rule.validationMessage;
  }

  return {
    ruleId: rule.id,
    passes,
    message,
    severity: rule.severity,
    sourcePage: rule.sourcePage,
    sourceSection: rule.sourceSection,
    suggestedAction: !passes ? (rule.action?.suggestedAction || rule.action?.correction || undefined) : undefined,
  };
}

/**
 * Evaluate all active rules against an opening.
 * Returns only failing or informational results.
 */
export function evaluateAllRules(opening: OpeningForRuleEval): RuleEvaluationResult[] {
  const rules = loadRules();
  const results: RuleEvaluationResult[] = [];

  for (const rule of rules) {
    const result = evaluateRule(opening, rule);
    if (!result.passes || result.message) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Get only the rules applicable to a specific opening based on its model/series.
 */
export function getApplicableRules(opening: OpeningForRuleEval): BTRRule[] {
  const rules = loadRules();
  return rules.filter(rule => rule.active && matchesAppliesTo(rule, opening));
}

/**
 * Get rules that block production for an opening.
 */
export function getBlockers(opening: OpeningForRuleEval): RuleEvaluationResult[] {
  return evaluateAllRules(opening).filter(r => !r.passes && r.severity === 'blocker');
}

/**
 * Get rules that generate warnings for an opening.
 */
export function getWarnings(opening: OpeningForRuleEval): RuleEvaluationResult[] {
  return evaluateAllRules(opening).filter(r => !r.passes && r.severity === 'warning');
}

/**
 * Look up a specific product model's specifications.
 */
export function getModelSpecs(modelId: string): any | null {
  const data = loadProductModels();
  if (!data?.series) return null;
  
  for (const series of data.series) {
    for (const model of series.models || []) {
      if (model.id === modelId || model.model === modelId) {
        return { ...model, series: series.id, seriesName: series.name };
      }
    }
  }
  return null;
}

/**
 * Check if a color is available for a given series/model.
 */
export function isColorAvailable(
  colorType: 'vinyl' | 'interior' | 'exterior',
  colorId: string,
  seriesId: string,
  modelId?: string
): { available: boolean; message?: string } {
  const colorData = loadColorOptions();
  if (!colorData?.restrictions) return { available: true };

  for (const restriction of colorData.restrictions) {
    if (restriction.type !== colorType) continue;
    
    if (restriction.excludedSeries?.includes(seriesId)) {
      return { available: false, message: restriction.message };
    }
    if (modelId && restriction.excludedModels?.includes(modelId)) {
      return { available: false, message: restriction.message };
    }
  }

  return { available: true };
}

/**
 * Check if a grid style is valid for a given context.
 */
export function isGridStyleValid(
  gridStyleId: string,
  seriesId: string,
  hasExteriorColor: boolean
): { valid: boolean; message?: string; requiredStyle?: string } {
  const gridData = loadGridStyles();
  if (!gridData?.restrictions) return { valid: true };

  for (const restriction of gridData.restrictions) {
    // Series-specific restrictions
    if (restriction.series?.includes(seriesId)) {
      if (gridStyleId !== restriction.requiredStyle) {
        return { valid: false, message: restriction.message, requiredStyle: restriction.requiredStyle };
      }
    }

    // Exterior color grid requirement
    if (restriction.condition === 'hasExteriorColor' && hasExteriorColor) {
      if (gridStyleId !== restriction.requiredStyle) {
        return { valid: false, message: restriction.message, requiredStyle: restriction.requiredStyle };
      }
    }

    // Diamond must be A1
    if (restriction.pattern === 'diamond' && gridStyleId?.toLowerCase().includes('diamond')) {
      if (gridStyleId !== restriction.requiredStyle) {
        return { valid: false, message: restriction.message, requiredStyle: restriction.requiredStyle };
      }
    }
  }

  return { valid: true };
}

/**
 * Get BTR pricing for a special shape by model and UI.
 */
export function getSpecialShapePricing(modelId: string, ui: number): any | null {
  const pricing = loadPricingTables();
  if (!pricing?.specialShapes?.models?.[modelId]) return null;

  const modelPricing = pricing.specialShapes.models[modelId];
  for (const tier of modelPricing.tiers) {
    const [minStr, maxStr] = tier.uiRange.replace('Min-', '0-').split('-').map((s: string) => parseInt(s));
    if (ui >= minStr && ui <= maxStr) {
      return { ...tier, modelId, overMaxAdder: pricing.specialShapes.overMaxUIAdder };
    }
  }

  // Over max UI — return the last tier price + $150 adder
  const lastTier = modelPricing.tiers[modelPricing.tiers.length - 1];
  return {
    ...lastTier,
    modelId,
    overMaxUI: true,
    overMaxAdder: pricing.specialShapes.overMaxUIAdder || 150,
    noDiscountOnOverMax: pricing.specialShapes.noDiscountOnOverMax || true,
  };
}

/**
 * Get BTR pricing for casement by model and UI.
 */
export function getCasementPricing(modelId: string, ui: number, color: string = 'white'): number | null {
  const pricing = loadPricingTables();
  if (!pricing?.casement?.models?.[modelId]) return null;

  const modelPricing = pricing.casement.models[modelId];
  const isBeige = color.toLowerCase() !== 'white';
  
  for (const tier of modelPricing.tiers) {
    if (ui >= tier.uiMin && ui <= tier.uiMax) {
      return isBeige ? tier.beigeClassicClay : tier.white;
    }
  }

  return null;
}

/**
 * Get BTR pricing for garden window by width and height ranges.
 */
export function getGardenWindowPricing(width: number, height: number, color: string = 'white'): number | null {
  const pricing = loadPricingTables();
  if (!pricing?.gardenWindow?.basePricing) return null;

  // Determine height range
  const heightKey = height <= 47 ? 'height_32_to_47' : 'height_47_1_8_to_60';
  const heightPricing = pricing.gardenWindow.basePricing[heightKey];
  if (!heightPricing) return null;

  // Determine width range
  let widthKey: string;
  if (width <= 37) widthKey = '24_to_37';
  else if (width <= 49) widthKey = '37_1_8_to_49';
  else if (width <= 59) widthKey = '49_1_8_to_59';
  else widthKey = '59_1_8_to_72';

  const widthPricing = heightPricing[widthKey];
  if (!widthPricing) return null;

  return color.toLowerCase() === 'white' ? widthPricing.white : widthPricing.beige;
}

// ── Cache clearing (for testing) ──────────────────────────────

export function clearCache(): void {
  _rules = null;
  _productModels = null;
  _colorOptions = null;
  _gridStyles = null;
  _pricingTables = null;
}
