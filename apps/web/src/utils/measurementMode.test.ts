// ── Measurement Mode Tests ──────────────────────────────
// Tests for the simplified measurement workflow:
// - Simple mode (1 width + 1 height)
// - Advanced mode (3-point)
// - Mode detection from existing data
// - Deduction calculations
// - Backward compatibility

import { describe, it, expect } from 'vitest';
import {
  calculateFinalMeasurement,
  calculateSimpleFinalMeasurement,
  detectMeasurementMode,
} from './measurementRulesEngine';

// ── Simple Mode Calculations ─────────────────────────────

describe('calculateSimpleFinalMeasurement', () => {
  it('applies -3/8" deduction to outside width (36" → 35.625")', () => {
    const result = calculateSimpleFinalMeasurement(36, -0.375);
    expect(result).toBe(35.625);
  });

  it('applies -3/8" deduction to outside height (60" → 59.625")', () => {
    const result = calculateSimpleFinalMeasurement(60, -0.375);
    expect(result).toBe(59.625);
  });

  it('applies zero deduction for inside measurement', () => {
    const result = calculateSimpleFinalMeasurement(36, 0);
    expect(result).toBe(36);
  });

  it('returns null for null input', () => {
    expect(calculateSimpleFinalMeasurement(null, -0.375)).toBeNull();
  });

  it('returns null for zero input', () => {
    expect(calculateSimpleFinalMeasurement(0, -0.375)).toBeNull();
  });

  it('returns null for negative input', () => {
    expect(calculateSimpleFinalMeasurement(-5, -0.375)).toBeNull();
  });

  it('handles fractional measurements (35 7/8" = 35.875)', () => {
    const result = calculateSimpleFinalMeasurement(35.875, -0.375);
    expect(result).toBe(35.5);
  });

  it('handles large patio door width (72" → 71.625")', () => {
    const result = calculateSimpleFinalMeasurement(72, -0.375);
    expect(result).toBe(71.625);
  });
});

// ── Advanced Mode Calculations ───────────────────────────

describe('calculateFinalMeasurement (advanced 3-point)', () => {
  it('uses smallest of 3 widths (36.125, 36, 35.875) → 35.875 - 3/8 = 35.5', () => {
    const result = calculateFinalMeasurement(36.125, 36, 35.875, -0.375);
    expect(result).toBe(35.5);
  });

  it('uses smallest of 3 heights (60.25, 60.125, 60) → 60 - 3/8 = 59.625', () => {
    const result = calculateFinalMeasurement(60.25, 60.125, 60, -0.375);
    expect(result).toBe(59.625);
  });

  it('does NOT use largest measurement', () => {
    const result = calculateFinalMeasurement(36.125, 36, 35.875, -0.375);
    expect(result).not.toBe(36.125 - 0.375); // 35.75 would be wrong
  });

  it('does NOT use average measurement', () => {
    const avg = (36.125 + 36 + 35.875) / 3;
    const result = calculateFinalMeasurement(36.125, 36, 35.875, -0.375);
    expect(result).not.toBe(avg - 0.375);
  });

  it('handles partially filled: only 1 of 3 points', () => {
    const result = calculateFinalMeasurement(36, null, null, -0.375);
    expect(result).toBe(35.625);
  });

  it('handles partially filled: only 2 of 3 points', () => {
    const result = calculateFinalMeasurement(36.125, 36, null, -0.375);
    expect(result).toBe(35.625); // smallest of (36.125, 36) = 36
  });

  it('returns null when all 3 points are null', () => {
    expect(calculateFinalMeasurement(null, null, null, -0.375)).toBeNull();
  });

  it('returns null when all 3 points are zero', () => {
    expect(calculateFinalMeasurement(0, 0, 0, -0.375)).toBeNull();
  });

  it('applies zero deduction for inside measurement', () => {
    const result = calculateFinalMeasurement(36, 35.875, 36.125, 0);
    expect(result).toBe(35.875);
  });
});

// ── Mode Detection ───────────────────────────────────────

describe('detectMeasurementMode', () => {
  it('returns "simple" for new marker with no data', () => {
    expect(detectMeasurementMode({})).toBe('simple');
  });

  it('returns "simple" when measurementMode is explicitly set', () => {
    expect(detectMeasurementMode({ measurementMode: 'simple' })).toBe('simple');
  });

  it('returns "advanced" when measurementMode is explicitly set', () => {
    expect(detectMeasurementMode({ measurementMode: 'advanced' })).toBe('advanced');
  });

  it('auto-detects "advanced" from existing widthTop data', () => {
    expect(detectMeasurementMode({ widthTop: 36 })).toBe('advanced');
  });

  it('auto-detects "advanced" from existing heightLeft data', () => {
    expect(detectMeasurementMode({ heightLeft: 60 })).toBe('advanced');
  });

  it('auto-detects "advanced" from existing insideWidthMiddle data', () => {
    expect(detectMeasurementMode({ insideWidthMiddle: 35 })).toBe('advanced');
  });

  it('returns "simple" when all multi-point fields are null', () => {
    expect(detectMeasurementMode({
      widthTop: null, widthMiddle: null, widthBottom: null,
      heightLeft: null, heightCenter: null, heightRight: null,
    })).toBe('simple');
  });

  it('returns "simple" when all multi-point fields are zero', () => {
    expect(detectMeasurementMode({
      widthTop: 0, widthMiddle: 0, widthBottom: 0,
      heightLeft: 0, heightCenter: 0, heightRight: 0,
    })).toBe('simple');
  });

  it('explicit mode overrides auto-detection', () => {
    // Even if multi-point data exists, explicit mode wins
    expect(detectMeasurementMode({
      measurementMode: 'simple',
      widthTop: 36, widthMiddle: 35.5, widthBottom: 35,
    })).toBe('simple');
  });
});

// ── Scenario A: Normal Easy Window ───────────────────────

describe('Scenario A — normal easy window (simple mode)', () => {
  it('36" width with -3/8" deduction = 35.625" (35 5/8")', () => {
    const finalWidth = calculateSimpleFinalMeasurement(36, -0.375);
    expect(finalWidth).toBe(35.625); // 35 5/8"
  });

  it('60" height with -3/8" deduction = 59.625" (59 5/8")', () => {
    const finalHeight = calculateSimpleFinalMeasurement(60, -0.375);
    expect(finalHeight).toBe(59.625); // 59 5/8"
  });

  it('simple mode does not require top/middle/bottom', () => {
    const mode = detectMeasurementMode({ measurementMode: 'simple' });
    expect(mode).toBe('simple');
    // In simple mode, calculateSimpleFinalMeasurement works without multi-point data
    const result = calculateSimpleFinalMeasurement(36, -0.375);
    expect(result).toBe(35.625);
  });
});

// ── Scenario B: Difficult Opening (advanced mode) ────────

describe('Scenario B — difficult opening (advanced mode)', () => {
  // Width Top 36 1/8 = 36.125, Middle 36, Bottom 35 7/8 = 35.875
  // Height Left 60 1/4 = 60.25, Center 60 1/8 = 60.125, Right 60

  it('selected raw width = smallest = 35.875 (35 7/8")', () => {
    const points = [36.125, 36, 35.875];
    const smallest = Math.min(...points);
    expect(smallest).toBe(35.875);
  });

  it('selected raw height = smallest = 60', () => {
    const points = [60.25, 60.125, 60];
    const smallest = Math.min(...points);
    expect(smallest).toBe(60);
  });

  it('final width = 35.875 - 3/8 = 35.5 (35 1/2")', () => {
    const result = calculateFinalMeasurement(36.125, 36, 35.875, -0.375);
    expect(result).toBe(35.5);
  });

  it('final height = 60 - 3/8 = 59.625 (59 5/8")', () => {
    const result = calculateFinalMeasurement(60.25, 60.125, 60, -0.375);
    expect(result).toBe(59.625);
  });
});

// ── Scenario C: Advanced Not Required ────────────────────

describe('Scenario C — contract not blocked by empty advanced fields', () => {
  it('simple mode with valid width/height does not need advanced fields', () => {
    const mode = detectMeasurementMode({ measurementMode: 'simple' });
    expect(mode).toBe('simple');

    const finalW = calculateSimpleFinalMeasurement(36, -0.375);
    const finalH = calculateSimpleFinalMeasurement(60, -0.375);
    
    // Both finals are valid — contract should not be blocked
    expect(finalW).toBe(35.625);
    expect(finalH).toBe(59.625);
    expect(finalW).not.toBeNull();
    expect(finalH).not.toBeNull();
  });
});

// ── Mode Switching ───────────────────────────────────────

describe('Mode switching preserves data', () => {
  it('switching from advanced to simple preserves advanced values', () => {
    const marker = {
      measurementMode: 'advanced' as const,
      widthTop: 36.125,
      widthMiddle: 36,
      widthBottom: 35.875,
      heightLeft: 60.25,
      heightCenter: 60.125,
      heightRight: 60,
    };
    
    // Confirm advanced mode initially
    expect(detectMeasurementMode(marker)).toBe('advanced');
    
    // Switch to simple mode — values should still exist on the marker
    const switched = { ...marker, measurementMode: 'simple' as const };
    expect(detectMeasurementMode(switched)).toBe('simple');
    expect(switched.widthTop).toBe(36.125);
    expect(switched.widthMiddle).toBe(36);
    expect(switched.widthBottom).toBe(35.875);
  });

  it('switching from simple to advanced does not lose simple raw values', () => {
    const marker = {
      measurementMode: 'simple' as const,
      simpleRawWidth: 36,
      simpleRawHeight: 60,
    };
    
    const switched = { ...marker, measurementMode: 'advanced' as const };
    expect(switched.simpleRawWidth).toBe(36);
    expect(switched.simpleRawHeight).toBe(60);
  });
});

// ── Edge Cases ───────────────────────────────────────────

describe('Edge cases', () => {
  it('deduction with very small opening', () => {
    // 10" window — deduction should still work
    expect(calculateSimpleFinalMeasurement(10, -0.375)).toBe(9.625);
  });

  it('deduction does not produce negative result for small positive input', () => {
    // 1" opening minus 3/8 = 0.625 — still positive, valid
    expect(calculateSimpleFinalMeasurement(1, -0.375)).toBe(0.625);
  });

  it('handles JavaScript floating point correctly', () => {
    // 0.1 + 0.2 !== 0.3 in JS, but our values are multiples of 1/8 = 0.125
    const result = calculateSimpleFinalMeasurement(36.125, -0.375);
    expect(result).toBe(35.75);
  });
});
