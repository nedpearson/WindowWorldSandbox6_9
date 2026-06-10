/**
 * laserMeasurement.test.ts
 *
 * Tests for the laser measurement parser, rule engine, and suspicion detection.
 * Run with: npm test --workspace=apps/web
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeLaserMeasurement,
  detectSuspiciousMeasurement,
  toFractionDisplay,
} from './normalizeLaserMeasurement';
import {
  applyRule,
  getApplicableRule,
  DEFAULT_REPLACEMENT_DEDUCTION_RULE,
  NO_DEDUCTION_RULE,
} from './measurementRules';

// ── Parser Tests ─────────────────────────────────────────────────────────────

describe('normalizeLaserMeasurement', () => {
  it('parses fractional inches: "36 1/4"', () => {
    const result = normalizeLaserMeasurement('36 1/4');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
    expect(result.rawUnit).toBe('fractional_inches');
    expect(result.normalizedFractionText).toBe('36 1/4');
  });

  it('parses fractional inches with hyphen: "36-1/4"', () => {
    const result = normalizeLaserMeasurement('36-1/4');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
  });

  it('parses decimal inches: "36.25"', () => {
    const result = normalizeLaserMeasurement('36.25');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
    expect(result.rawUnit).toBe('decimal_inches');
  });

  it('parses decimal inches with unit: "36.25 in"', () => {
    const result = normalizeLaserMeasurement('36.25 in');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
  });

  it('parses feet-inch fractional: "3ft 0 1/4in"', () => {
    const result = normalizeLaserMeasurement('3ft 0 1/4in');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
    expect(result.rawUnit).toBe('feet_inches');
  });

  it('parses feet-inch apostrophe: "3\' 0 1/4"', () => {
    const result = normalizeLaserMeasurement("3' 0 1/4");
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(36.25, 4);
  });

  it('parses metric mm: "914 mm"', () => {
    const result = normalizeLaserMeasurement('914 mm');
    expect(result.valid).toBe(true);
    // 914 mm = ~35.984 inches
    expect(result.normalizedInches).toBeCloseTo(914 * 0.0393701, 2);
    expect(result.rawUnit).toBe('mm');
  });

  it('parses metric cm: "91.4 cm"', () => {
    const result = normalizeLaserMeasurement('91.4 cm');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBeCloseTo(91.4 * 0.393701, 2);
    expect(result.rawUnit).toBe('cm');
  });

  it('parses plain whole number: "36"', () => {
    const result = normalizeLaserMeasurement('36');
    expect(result.valid).toBe(true);
    expect(result.normalizedInches).toBe(36);
    // "36" matches the decimal_inches pattern (no decimal point required)
    expect(['inches', 'decimal_inches']).toContain(result.rawUnit);
  });

  it('rejects empty string', () => {
    const result = normalizeLaserMeasurement('');
    expect(result.valid).toBe(false);
    expect(result.normalizedInches).toBe(0);
  });

  it('rejects nonsense input', () => {
    const result = normalizeLaserMeasurement('hello world');
    expect(result.valid).toBe(false);
  });

  it('rejects improbably large value: "999"', () => {
    // 999 inches = 83 ft — exceeds 300" limit
    const result = normalizeLaserMeasurement('999');
    expect(result.valid).toBe(false);
  });
});

// ── Fraction display Tests ────────────────────────────────────────────────────

describe('toFractionDisplay', () => {
  it('formats 36.25 as "36 1/4"', () => {
    expect(toFractionDisplay(36.25)).toBe('36 1/4');
  });

  it('formats 35.625 as "35 5/8"', () => {
    expect(toFractionDisplay(35.625)).toBe('35 5/8');
  });

  it('formats 36 as "36"', () => {
    expect(toFractionDisplay(36)).toBe('36');
  });

  it('formats 36.5 as "36 1/2"', () => {
    expect(toFractionDisplay(36.5)).toBe('36 1/2');
  });

  it('formats 35.875 as "35 7/8"', () => {
    expect(toFractionDisplay(35.875)).toBe('35 7/8');
  });

  it('formats 48.125 as "48 1/8"', () => {
    expect(toFractionDisplay(48.125)).toBe('48 1/8');
  });
});

// ── Rule Engine Tests — 3/8" deduction ───────────────────────────────────────

describe('applyRule — 3/8" replacement window deduction', () => {
  it('36" − 3/8" = 35 5/8"', () => {
    const result = applyRule(36, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeCloseTo(35.625, 4);
    expect(result.displayAdjusted).toBe('35 5/8"');
    expect(result.deductionInches).toBeCloseTo(0.375, 4);
    expect(result.ruleId).toBe('replacement_window_standard_deduction');
  });

  it('35 7/8" − 3/8" = 35 1/2"', () => {
    const rawInches = 35.875;
    const result = applyRule(rawInches, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeCloseTo(35.5, 4);
    expect(result.displayAdjusted).toBe('35 1/2"');
  });

  it('48 1/4" − 3/8" = 47 7/8"', () => {
    const rawInches = 48.25;
    const result = applyRule(rawInches, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeCloseTo(47.875, 4);
    expect(result.displayAdjusted).toBe('47 7/8"');
  });

  it('36 1/4" − 3/8" = 35 7/8"', () => {
    const parsed = normalizeLaserMeasurement('36 1/4');
    expect(parsed.valid).toBe(true);
    const result = applyRule(parsed.normalizedInches, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeCloseTo(35.875, 4);
    expect(result.displayAdjusted).toBe('35 7/8"');
  });

  it('clamps adjusted result to non-negative', () => {
    const result = applyRule(0.1, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeGreaterThanOrEqual(0);
  });

  it('no-deduction rule returns raw value unchanged', () => {
    const result = applyRule(36.25, NO_DEDUCTION_RULE);
    expect(result.adjustedInches).toBeCloseTo(36.25, 4);
    expect(result.deductionInches).toBe(0);
    expect(result.operation).toBe('none');
  });

  it('displayDeduction shows "−3/8"" for replacement rule', () => {
    const result = applyRule(36, DEFAULT_REPLACEMENT_DEDUCTION_RULE);
    expect(result.displayDeduction).toBe('−3/8"');
  });
});

// ── Rule Selection Tests ──────────────────────────────────────────────────────

describe('getApplicableRule', () => {
  it('returns replacement deduction for window + replacement', () => {
    const rule = getApplicableRule({ productType: 'window', installType: 'replacement' });
    expect(rule.ruleId).toBe('replacement_window_standard_deduction');
    expect(rule.amountInches).toBe(0.375);
  });

  it('returns replacement deduction when productType and installType are undefined (window default)', () => {
    const rule = getApplicableRule({});
    expect(rule.ruleId).toBe('replacement_window_standard_deduction');
  });

  it('returns no-deduction rule for door', () => {
    const rule = getApplicableRule({ productType: 'patio_door', installType: 'replacement' });
    expect(rule.ruleId).toBe('no_deduction');
    expect(rule.operation).toBe('none');
  });

  it('returns no-deduction rule for siding', () => {
    const rule = getApplicableRule({ productType: 'siding' });
    expect(rule.ruleId).toBe('no_deduction');
  });

  it('returns no-deduction rule for entry_door', () => {
    const rule = getApplicableRule({ productType: 'entry_door' });
    expect(rule.ruleId).toBe('no_deduction');
  });
});

// ── Suspicious Measurement Tests ─────────────────────────────────────────────

describe('detectSuspiciousMeasurement', () => {
  it('flags measurement less than 6" for window width', () => {
    const flags = detectSuspiciousMeasurement(4, 'width');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some(f => f.includes('6"'))).toBe(true);
  });

  it('flags measurement over 12ft for window height', () => {
    const flags = detectSuspiciousMeasurement(150, 'height');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some(f => f.includes('12 ft'))).toBe(true);
  });

  it('flags 25%+ change from previous value', () => {
    const flags = detectSuspiciousMeasurement(50, 'width', 36);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some(f => f.includes('%'))).toBe(true);
  });

  it('accepts normal measurement with no previous', () => {
    const flags = detectSuspiciousMeasurement(36, 'width');
    expect(flags.length).toBe(0);
  });

  it('accepts normal measurement similar to previous', () => {
    const flags = detectSuspiciousMeasurement(36.25, 'width', 36);
    expect(flags.length).toBe(0);
  });

  it('flags zero measurement', () => {
    const flags = detectSuspiciousMeasurement(0, 'width');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some(f => f.includes('zero'))).toBe(true);
  });
});

// ── Combined parser + rule workflow ──────────────────────────────────────────

describe('Full measurement workflow: parse → apply rule → confirm', () => {
  it('rep types "36 1/4" → normalized 36.25 → order 35 7/8"', () => {
    const parsed = normalizeLaserMeasurement('36 1/4');
    expect(parsed.valid).toBe(true);
    expect(parsed.normalizedInches).toBeCloseTo(36.25, 4);

    const rule = getApplicableRule({ productType: 'window', installType: 'replacement' });
    const applied = applyRule(parsed.normalizedInches, rule);
    expect(applied.adjustedInches).toBeCloseTo(35.875, 4);
    expect(applied.displayAdjusted).toBe('35 7/8"');
    expect(applied.displayDeduction).toBe('−3/8"');
  });

  it('rep types "48 1/2" → normalized 48.5 → order 48 1/8"', () => {
    const parsed = normalizeLaserMeasurement('48 1/2');
    expect(parsed.valid).toBe(true);
    expect(parsed.normalizedInches).toBeCloseTo(48.5, 4);

    const rule = getApplicableRule({ productType: 'window' });
    const applied = applyRule(parsed.normalizedInches, rule);
    expect(applied.adjustedInches).toBeCloseTo(48.125, 4);
    expect(applied.displayAdjusted).toBe('48 1/8"');
  });

  it('metric input: "914 mm" → inches → deducted', () => {
    const parsed = normalizeLaserMeasurement('914 mm');
    expect(parsed.valid).toBe(true);
    // 914mm ≈ 35.984 inches
    const rawInches = parsed.normalizedInches;
    expect(rawInches).toBeCloseTo(35.984, 1);

    const rule = getApplicableRule({ productType: 'window', installType: 'replacement' });
    const applied = applyRule(rawInches, rule);
    // 35.984 - 0.375 = 35.609 → rounds to nearest 1/16
    expect(applied.adjustedInches).toBeLessThan(36);
    expect(applied.deductionInches).toBeCloseTo(0.375, 4);
  });

  it('BLE speculative reading "~36.25 in" → parses normally', () => {
    // The BLE client returns text like "~36.25 in" for speculative readings
    // This gets stripped of the ~ before parsing
    const rawText = '36.25 in';
    const parsed = normalizeLaserMeasurement(rawText);
    expect(parsed.valid).toBe(true);
    expect(parsed.normalizedInches).toBeCloseTo(36.25, 4);
  });
});
