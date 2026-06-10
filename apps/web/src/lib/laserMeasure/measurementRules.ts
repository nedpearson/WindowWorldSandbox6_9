/**
 * measurementRules.ts
 *
 * Frontend measurement rule engine.
 *
 * Provides a rule-based system for applying measurement adjustments
 * (e.g. subtract 3/8" for replacement window deduction) before the
 * final measurement is entered on the order.
 *
 * Rules are fetched from the server when online and cached in memory.
 * A hardcoded default rule ensures the 3/8" deduction always works offline.
 *
 * Rule selection is based on:
 *   productType | exteriorSurface | installType
 *
 * Usage:
 *   const rule = getApplicableRule({ productType: 'window', installType: 'replacement' });
 *   const { adjustedInches, displayAdjusted } = applyRule(rawInches, rule);
 */

import { toFractionDisplay } from './normalizeLaserMeasurement';

// ── Rule types ───────────────────────────────────────────────────────────────

export interface MeasurementRule {
  ruleId: string;
  name: string;
  description: string;
  operation: 'subtract' | 'add' | 'none';
  /** Amount to add/subtract, in decimal inches */
  amountInches: number;
  /** Human-readable display of the amount, e.g. "3/8" */
  amountDisplay: string;
  appliesTo: {
    productType?: string | string[];
    exteriorSurface?: string | string[];
    installType?: string | string[];
    openingType?: string | string[];
  };
  /** Rounding to nearest fraction of an inch (1/16 = 0.0625, 1/8 = 0.125, etc.) */
  roundingInches?: number;
  enabled: boolean;
  notes?: string;
}

export interface AppliedRuleResult {
  rawInches: number;
  adjustedInches: number;
  deductionInches: number;
  displayRaw: string;
  displayAdjusted: string;
  displayDeduction: string;
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  operation: MeasurementRule['operation'];
}

// ── Default built-in rule ────────────────────────────────────────────────────
//
// Window World standard deduction: subtract 3/8" (0.375") from the rough
// opening measurement for replacement window width and height.
// This is the universal default when no server rule overrides.

export const DEFAULT_REPLACEMENT_DEDUCTION_RULE: MeasurementRule = {
  ruleId: 'replacement_window_standard_deduction',
  name: 'Standard Replacement Window Deduction',
  description: 'Subtract 3/8" from rough opening for replacement window order size.',
  operation: 'subtract',
  amountInches: 0.375,   // 3/8"
  amountDisplay: '3/8',
  appliesTo: {
    productType: ['window'],
    installType: ['replacement'],
  },
  roundingInches: 1 / 16, // 1/16" precision
  enabled: true,
  notes: 'Window World standard: order is 3/8" smaller than measured opening each direction.',
};

/** No-adjustment rule for products/installs that don't need a deduction */
export const NO_DEDUCTION_RULE: MeasurementRule = {
  ruleId: 'no_deduction',
  name: 'No Deduction',
  description: 'Use the measurement exactly as captured — no adjustment applied.',
  operation: 'none',
  amountInches: 0,
  amountDisplay: '0',
  appliesTo: {},
  enabled: true,
};

// ── In-memory rule cache ──────────────────────────────────────────────────────

let _cachedRules: MeasurementRule[] | null = null;

/**
 * Load active rules from the server (online only).
 * Falls back silently to built-in defaults if the request fails.
 */
export async function loadRulesFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/measurement-rules', {
      headers: { Authorization: `Bearer ${localStorage.getItem('wwa_auth_token') || ''}` },
    });
    if (!res.ok) return;
    const serverRules: any[] = await res.json();
    // Map server rule shape to our MeasurementRule type
    _cachedRules = serverRules
      .filter(r => r.active)
      .map(r => ({
        ruleId: r.id,
        name: r.name,
        description: r.description || '',
        operation: r.actionType === 'deduct' ? 'subtract' : r.actionType === 'add' ? 'add' : 'none',
        amountInches: (r.widthTakeoffDecimal ?? 0) || 0,
        amountDisplay: r.widthTakeoffFraction || String(r.widthTakeoffDecimal ?? 0),
        appliesTo: {
          productType: r.windowType ? [r.windowType] : undefined,
          exteriorSurface: r.exteriorType ? [r.exteriorType] : undefined,
          installType: r.installType ? [r.installType] : undefined,
        },
        enabled: r.active,
        notes: r.notes,
      } satisfies MeasurementRule));
  } catch {
    // Silent failure — built-in defaults will be used
  }
}

// ── Rule selection ────────────────────────────────────────────────────────────

function matchesField(
  ruleValue: string | string[] | undefined,
  candidate: string | undefined,
): boolean {
  if (!ruleValue || !candidate) return true; // undefined = matches all
  const values = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
  return values.some(v => v.toLowerCase() === candidate.toLowerCase());
}

export interface RuleContext {
  productType?: string;
  exteriorSurface?: string;
  installType?: string;
  openingType?: string;
}

/**
 * Return the best applicable rule for the given opening context.
 * Priority:
 *   1. Server-loaded rules (most specific match first)
 *   2. Built-in default deduction (replacement window)
 *   3. No-deduction rule (fallback)
 */
export function getApplicableRule(ctx: RuleContext): MeasurementRule {
  // 1. Server rules (if loaded)
  if (_cachedRules && _cachedRules.length > 0) {
    // Sort: more specific rules first (more appliesTo fields set)
    const sorted = [..._cachedRules].sort((a, b) => {
      const scoreA = Object.values(a.appliesTo).filter(v => v != null).length;
      const scoreB = Object.values(b.appliesTo).filter(v => v != null).length;
      return scoreB - scoreA;
    });
    for (const rule of sorted) {
      if (!rule.enabled) continue;
      if (
        matchesField(rule.appliesTo.productType, ctx.productType) &&
        matchesField(rule.appliesTo.exteriorSurface, ctx.exteriorSurface) &&
        matchesField(rule.appliesTo.installType, ctx.installType) &&
        matchesField(rule.appliesTo.openingType, ctx.openingType)
      ) {
        return rule;
      }
    }
  }

  // 2. Default deduction for replacement windows
  if (
    (!ctx.productType || ctx.productType === 'window') &&
    (!ctx.installType || ctx.installType === 'replacement')
  ) {
    return DEFAULT_REPLACEMENT_DEDUCTION_RULE;
  }

  // 3. No deduction
  return NO_DEDUCTION_RULE;
}

// ── Rule application ──────────────────────────────────────────────────────────

/**
 * Apply a measurement rule to a raw measurement in inches.
 * Returns both raw and adjusted values with display strings.
 */
export function applyRule(rawInches: number, rule: MeasurementRule): AppliedRuleResult {
  let adjustedInches = rawInches;
  let deductionInches = 0;

  if (rule.operation === 'subtract' && rule.amountInches > 0) {
    adjustedInches = rawInches - rule.amountInches;
    deductionInches = rule.amountInches;
  } else if (rule.operation === 'add' && rule.amountInches > 0) {
    adjustedInches = rawInches + rule.amountInches;
    deductionInches = -rule.amountInches;
  }

  // Apply rounding if specified
  if (rule.roundingInches && rule.roundingInches > 0) {
    adjustedInches = Math.round(adjustedInches / rule.roundingInches) * rule.roundingInches;
  }

  // Clamp to non-negative
  adjustedInches = Math.max(0, adjustedInches);

  return {
    rawInches,
    adjustedInches,
    deductionInches,
    displayRaw: `${toFractionDisplay(rawInches)}"`,
    displayAdjusted: `${toFractionDisplay(adjustedInches)}"`,
    displayDeduction: deductionInches > 0
      ? `−${toFractionDisplay(deductionInches)}"`
      : deductionInches < 0
        ? `+${toFractionDisplay(-deductionInches)}"`
        : 'none',
    ruleId: rule.ruleId,
    ruleName: rule.name,
    ruleDescription: rule.description,
    operation: rule.operation,
  };
}

/**
 * Quick helper: get adjusted inches for a raw reading in a given context.
 * Returns null if no deduction applies.
 */
export function getAdjustedInches(rawInches: number, ctx: RuleContext): number | null {
  const rule = getApplicableRule(ctx);
  if (rule.operation === 'none' || rule.amountInches === 0) return null;
  const result = applyRule(rawInches, rule);
  return result.adjustedInches;
}

// ── Multi-Point Measurement Logic ─────────────────────────────────────────────
//
// Supports capturing width at Top/Middle/Bottom and height at Left/Center/Right.
// The SMALLEST valid measurement is selected as the raw value before deduction.
// This ensures the replacement window fits even in an out-of-square opening.

export type WidthPoint = 'widthTop' | 'widthMiddle' | 'widthBottom';
export type HeightPoint = 'heightLeft' | 'heightCenter' | 'heightRight';

export interface SmallestSelection {
  /** The smallest valid value in inches, or null if no valid values */
  value: number | null;
  /** Which point was selected (e.g. 'widthBottom') */
  point: string | null;
}

/**
 * Select the smallest valid measurement from an array of {key, value} pairs.
 * Ignores null and zero values.
 *
 * @example
 * selectSmallestOpening([
 *   { key: 'widthTop', value: 36.125 },
 *   { key: 'widthMiddle', value: 36.0 },
 *   { key: 'widthBottom', value: 35.875 },
 * ])
 * // => { value: 35.875, point: 'widthBottom' }
 */
export function selectSmallestOpening(
  candidates: { key: string; value: number | null }[]
): SmallestSelection {
  const valid = candidates.filter(c => c.value !== null && c.value > 0) as {
    key: string;
    value: number;
  }[];

  if (valid.length === 0) return { value: null, point: null };

  const smallest = valid.reduce((min, c) => (c.value < min.value ? c : min), valid[0]);
  return { value: smallest.value, point: smallest.key };
}

/**
 * Compute the spread (max - min) across valid point measurements.
 * Returns null if fewer than 2 valid values exist.
 *
 * Used to trigger the variation warning when spread > VARIATION_TOLERANCE_INCHES.
 */
export function computeVariance(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v > 0);
  if (valid.length < 2) return null;
  return Math.max(...valid) - Math.min(...valid);
}

/** 1/4" hardcoded tolerance — opening flagged as out-of-square above this. */
export const VARIATION_TOLERANCE_INCHES = 0.25;

export interface MultiPointRuleResult {
  // Width
  widthTop: number | null;
  widthMiddle: number | null;
  widthBottom: number | null;
  smallestWidthInches: number | null;
  smallestWidthPoint: string | null;
  widthVarianceInches: number | null;
  widthNeedsReview: boolean;
  finalWidthInches: number | null;
  widthDeductionInches: number;
  displayFinalWidth: string;

  // Height
  heightLeft: number | null;
  heightCenter: number | null;
  heightRight: number | null;
  smallestHeightInches: number | null;
  smallestHeightPoint: string | null;
  heightVarianceInches: number | null;
  heightNeedsReview: boolean;
  finalHeightInches: number | null;
  heightDeductionInches: number;
  displayFinalHeight: string;

  // Rule info
  ruleId: string;
  ruleName: string;
  displayDeduction: string;
}

/**
 * Apply the smallest-opening rule to a full set of multi-point captures.
 *
 * Steps:
 *   1. Select smallest valid width (top/middle/bottom)
 *   2. Select smallest valid height (left/center/right)
 *   3. Compute spread (variance) for review warning
 *   4. Apply deduction rule to each smallest value
 *   5. Return final adjusted width + height + audit data
 *
 * @example
 * applyRuleToMultiPoint({
 *   widthTop: 36.125, widthMiddle: 36.0, widthBottom: 35.875,
 *   heightLeft: 60.25, heightCenter: 60.125, heightRight: 60.0,
 *   ctx: { productType: 'window', installType: 'replacement' }
 * })
 * // Width: smallest = 35.875 (Bottom) → -3/8" = 35.5
 * // Height: smallest = 60.0 (Right)   → -3/8" = 59.625
 */
export function applyRuleToMultiPoint(params: {
  widthTop?: number | null;
  widthMiddle?: number | null;
  widthBottom?: number | null;
  heightLeft?: number | null;
  heightCenter?: number | null;
  heightRight?: number | null;
  ctx?: RuleContext;
  rule?: MeasurementRule;
}): MultiPointRuleResult {
  const {
    widthTop = null,
    widthMiddle = null,
    widthBottom = null,
    heightLeft = null,
    heightCenter = null,
    heightRight = null,
    ctx = {},
  } = params;

  const rule = params.rule ?? getApplicableRule(ctx);

  // Width: select smallest
  const widthSel = selectSmallestOpening([
    { key: 'widthTop', value: widthTop },
    { key: 'widthMiddle', value: widthMiddle },
    { key: 'widthBottom', value: widthBottom },
  ]);
  const widthVariance = computeVariance([widthTop, widthMiddle, widthBottom]);
  const widthNeedsReview = widthVariance !== null && widthVariance > VARIATION_TOLERANCE_INCHES;

  // Height: select smallest
  const heightSel = selectSmallestOpening([
    { key: 'heightLeft', value: heightLeft },
    { key: 'heightCenter', value: heightCenter },
    { key: 'heightRight', value: heightRight },
  ]);
  const heightVariance = computeVariance([heightLeft, heightCenter, heightRight]);
  const heightNeedsReview = heightVariance !== null && heightVariance > VARIATION_TOLERANCE_INCHES;

  // Apply deduction to smallest values
  const widthResult = widthSel.value !== null ? applyRule(widthSel.value, rule) : null;
  const heightResult = heightSel.value !== null ? applyRule(heightSel.value, rule) : null;

  return {
    widthTop,
    widthMiddle,
    widthBottom,
    smallestWidthInches: widthSel.value,
    smallestWidthPoint: widthSel.point,
    widthVarianceInches: widthVariance,
    widthNeedsReview,
    finalWidthInches: widthResult?.adjustedInches ?? null,
    widthDeductionInches: widthResult?.deductionInches ?? 0,
    displayFinalWidth: widthResult?.displayAdjusted ?? '—',

    heightLeft,
    heightCenter,
    heightRight,
    smallestHeightInches: heightSel.value,
    smallestHeightPoint: heightSel.point,
    heightVarianceInches: heightVariance,
    heightNeedsReview,
    finalHeightInches: heightResult?.adjustedInches ?? null,
    heightDeductionInches: heightResult?.deductionInches ?? 0,
    displayFinalHeight: heightResult?.displayAdjusted ?? '—',

    ruleId: rule.ruleId,
    ruleName: rule.name,
    displayDeduction: widthResult?.displayDeduction ?? 'none',
  };
}
