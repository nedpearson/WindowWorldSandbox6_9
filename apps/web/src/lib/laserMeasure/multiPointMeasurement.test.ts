/**
 * multiPointMeasurement.test.ts
 *
 * Unit tests for the multi-point measurement pure functions:
 *   - selectSmallestOpening
 *   - computeVariance
 *   - applyRuleToMultiPoint
 *   - VARIATION_TOLERANCE_INCHES
 *
 * These functions are the heart of the smallest-opening rule:
 * "When measuring a replacement window, always order to the smallest
 * valid measurement after applying the configured deduction."
 */

import { describe, it, expect } from 'vitest';
import {
  selectSmallestOpening,
  computeVariance,
  applyRuleToMultiPoint,
  VARIATION_TOLERANCE_INCHES,
  type SmallestSelection,
} from './measurementRules';

// ── selectSmallestOpening ─────────────────────────────────────────────────────

describe('selectSmallestOpening', () => {
  it('picks the smallest from [36 1/8, 36, 35 7/8]', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: 36.125 },  // 36 1/8
      { key: 'widthMiddle', value: 36.0   },
      { key: 'widthBottom', value: 35.875 },  // 35 7/8 ← smallest
    ]);
    expect(result.value).toBeCloseTo(35.875);
    expect(result.point).toBe('widthBottom');
  });

  it('picks the smallest from [60 1/4, 60 1/8, 60]', () => {
    const result = selectSmallestOpening([
      { key: 'heightLeft',   value: 60.25  },  // 60 1/4
      { key: 'heightCenter', value: 60.125 },  // 60 1/8
      { key: 'heightRight',  value: 60.0   },  // 60 ← smallest
    ]);
    expect(result.value).toBeCloseTo(60.0);
    expect(result.point).toBe('heightRight');
  });

  it('ignores null values', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: null  },
      { key: 'widthMiddle', value: 36.0 },
      { key: 'widthBottom', value: null  },
    ]);
    expect(result.value).toBeCloseTo(36.0);
    expect(result.point).toBe('widthMiddle');
  });

  it('ignores zero values', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: 0    },
      { key: 'widthMiddle', value: 36.0 },
    ]);
    expect(result.value).toBeCloseTo(36.0);
    expect(result.point).toBe('widthMiddle');
  });

  it('returns null when all values are null', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: null },
      { key: 'widthMiddle', value: null },
      { key: 'widthBottom', value: null },
    ]);
    expect(result.value).toBeNull();
    expect(result.point).toBeNull();
  });

  it('returns the single value when only one is present', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: null  },
      { key: 'widthMiddle', value: null  },
      { key: 'widthBottom', value: 35.5  }, // 35 1/2 — only capture
    ]);
    expect(result.value).toBeCloseTo(35.5);
    expect(result.point).toBe('widthBottom');
  });

  it('handles all three equal values — returns first', () => {
    const result = selectSmallestOpening([
      { key: 'widthTop',    value: 36.0 },
      { key: 'widthMiddle', value: 36.0 },
      { key: 'widthBottom', value: 36.0 },
    ]);
    expect(result.value).toBeCloseTo(36.0);
    // First wins when all equal (reduce keeps current min if equal)
    expect(result.point).toBe('widthTop');
  });
});

// ── computeVariance ───────────────────────────────────────────────────────────

describe('computeVariance', () => {
  it('computes 36 1/8 - 35 7/8 = 1/4"', () => {
    const v = computeVariance([36.125, 36.0, 35.875]);
    expect(v).toBeCloseTo(0.25);
  });

  it('computes 60 1/4 - 60 = 1/4"', () => {
    const v = computeVariance([60.25, 60.125, 60.0]);
    expect(v).toBeCloseTo(0.25);
  });

  it('returns null with only one valid value', () => {
    const v = computeVariance([36.0, null, null]);
    expect(v).toBeNull();
  });

  it('returns null with all null values', () => {
    const v = computeVariance([null, null, null]);
    expect(v).toBeNull();
  });

  it('ignores null values when computing spread', () => {
    // Only two valid values: 36.5 and 35.5 — spread = 1.0"
    const v = computeVariance([36.5, null, 35.5]);
    expect(v).toBeCloseTo(1.0);
  });

  it('returns 0 when all values are identical', () => {
    const v = computeVariance([36.0, 36.0, 36.0]);
    expect(v).toBeCloseTo(0);
  });
});

// ── VARIATION_TOLERANCE_INCHES constant ───────────────────────────────────────

describe('VARIATION_TOLERANCE_INCHES', () => {
  it('is 0.25" (1/4")', () => {
    expect(VARIATION_TOLERANCE_INCHES).toBeCloseTo(0.25);
  });
});

// ── applyRuleToMultiPoint ─────────────────────────────────────────────────────

describe('applyRuleToMultiPoint', () => {
  // ── Standard replacement window scenario ──────────────────────────────────

  it('full scenario: width [36 1/8, 36, 35 7/8] → final 35 1/2"', () => {
    const result = applyRuleToMultiPoint({
      widthTop:    36.125,  // 36 1/8
      widthMiddle: 36.0,
      widthBottom: 35.875,  // 35 7/8 ← smallest
      ctx: { productType: 'window', installType: 'replacement' },
    });
    // smallest = 35.875
    expect(result.smallestWidthInches).toBeCloseTo(35.875);
    expect(result.smallestWidthPoint).toBe('widthBottom');
    // deduction = 3/8" = 0.375
    expect(result.widthDeductionInches).toBeCloseTo(0.375);
    // final = 35.875 - 0.375 = 35.5
    expect(result.finalWidthInches).toBeCloseTo(35.5);
  });

  it('full scenario: height [60 1/4, 60 1/8, 60] → final 59 5/8"', () => {
    const result = applyRuleToMultiPoint({
      heightLeft:   60.25,   // 60 1/4
      heightCenter: 60.125,  // 60 1/8
      heightRight:  60.0,    // 60 ← smallest
      ctx: { productType: 'window', installType: 'replacement' },
    });
    expect(result.smallestHeightInches).toBeCloseTo(60.0);
    expect(result.smallestHeightPoint).toBe('heightRight');
    expect(result.heightDeductionInches).toBeCloseTo(0.375);
    // final = 60.0 - 0.375 = 59.625 = 59 5/8
    expect(result.finalHeightInches).toBeCloseTo(59.625);
  });

  it('full combined scenario matches expected final dimensions', () => {
    const result = applyRuleToMultiPoint({
      widthTop:    36.125,
      widthMiddle: 36.0,
      widthBottom: 35.875,
      heightLeft:   60.25,
      heightCenter: 60.125,
      heightRight:  60.0,
      ctx: { productType: 'window', installType: 'replacement' },
    });
    expect(result.finalWidthInches).toBeCloseTo(35.5);      // 35 1/2
    expect(result.finalHeightInches).toBeCloseTo(59.625);   // 59 5/8
  });

  // ── Variation warnings ────────────────────────────────────────────────────

  it('fires widthNeedsReview when variance > 1/4"', () => {
    // variance = 36.5 - 35.875 = 0.625" > 0.25" → needs review
    const result = applyRuleToMultiPoint({
      widthTop:    36.5,
      widthMiddle: 36.0,
      widthBottom: 35.875,
    });
    expect(result.widthVarianceInches).toBeCloseTo(0.625);
    expect(result.widthNeedsReview).toBe(true);
  });

  it('does NOT fire widthNeedsReview when variance = exactly 1/4"', () => {
    // variance = 36.125 - 35.875 = 0.25" — exactly at threshold (not above)
    const result = applyRuleToMultiPoint({
      widthTop:    36.125,  // 36 1/8
      widthMiddle: 36.0,
      widthBottom: 35.875,  // 35 7/8
    });
    expect(result.widthVarianceInches).toBeCloseTo(0.25);
    // variance is NOT > 0.25, so needsReview = false
    expect(result.widthNeedsReview).toBe(false);
  });

  it('does NOT fire heightNeedsReview when variance = 0"', () => {
    const result = applyRuleToMultiPoint({
      heightLeft:   60.0,
      heightCenter: 60.0,
      heightRight:  60.0,
    });
    expect(result.heightVarianceInches).toBeCloseTo(0);
    expect(result.heightNeedsReview).toBe(false);
  });

  it('fires heightNeedsReview when variance > 1/4"', () => {
    const result = applyRuleToMultiPoint({
      heightLeft:   61.0,   // 1" off
      heightCenter: 60.5,
      heightRight:  60.0,
    });
    expect(result.heightVarianceInches).toBeCloseTo(1.0);
    expect(result.heightNeedsReview).toBe(true);
  });

  // ── Partial captures ──────────────────────────────────────────────────────

  it('single width point: uses that point, no variance', () => {
    const result = applyRuleToMultiPoint({
      widthBottom: 35.875,
      ctx: { productType: 'window', installType: 'replacement' },
    });
    expect(result.smallestWidthPoint).toBe('widthBottom');
    expect(result.smallestWidthInches).toBeCloseTo(35.875);
    expect(result.widthVarianceInches).toBeNull();
    expect(result.widthNeedsReview).toBe(false);
    expect(result.finalWidthInches).toBeCloseTo(35.5); // - 3/8"
  });

  it('no captures: returns null for all computed values', () => {
    const result = applyRuleToMultiPoint({});
    expect(result.smallestWidthInches).toBeNull();
    expect(result.smallestHeightInches).toBeNull();
    expect(result.finalWidthInches).toBeNull();
    expect(result.finalHeightInches).toBeNull();
    expect(result.widthVarianceInches).toBeNull();
    expect(result.heightVarianceInches).toBeNull();
    expect(result.widthNeedsReview).toBe(false);
    expect(result.heightNeedsReview).toBe(false);
  });

  // ── Rule passthrough ──────────────────────────────────────────────────────

  it('ruleId and ruleName are present in result', () => {
    const result = applyRuleToMultiPoint({
      widthMiddle: 36.0,
      ctx: { productType: 'window', installType: 'replacement' },
    });
    expect(result.ruleId).toBeTruthy();
    expect(result.ruleName).toBeTruthy();
  });
});
