// ═══════════════════════════════════════════════════════════════
// Tests — Measurement Rule Engine, Oriel, Specialty, Photo Read
// ═══════════════════════════════════════════════════════════════

import { describe, test, expect } from 'vitest';

import {
  findMeasurementRule,
  applyMeasurementRule,
  getSpecialtyDimensionSet,
  computeCircleTopRadius,
  checkMeasurementExportReadiness,
  MEASUREMENT_RULES,
  MeasurementAdjustment,
  MeasurementRule,
} from '../utils/measurementRules';

import { parseMeasurement, toFractionDisplay } from '../utils/measurementParser';

// ─── RULE MATCHING ───────────────────────────────────────────
describe('Measurement Rule Matching', () => {
  test('Finds oriel rule for oriel window type', () => {
    const rule = findMeasurementRule('oriel');
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe('mr-oriel-top-sash');
  });

  test('Finds circle top rule', () => {
    const rule = findMeasurementRule('circle_top');
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe('mr-circle-top-radius');
  });

  test('Finds brick insert rule with install type INT + brick exterior', () => {
    const rule = findMeasurementRule(undefined, 'brick', 'INT');
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe('mr-insert-brick-std');
  });

  test('Returns null when no matching rule', () => {
    const rule = findMeasurementRule('custom_alien_shape', 'moon', 'ZERO_G');
    expect(rule).toBeNull();
  });

  test('Prefers more specific rule (windowType > exteriorType > installType)', () => {
    const orielRule = findMeasurementRule('oriel', 'brick', 'INT');
    // Oriel rule (score 3) should beat brick+INT rule (score 3 too — but oriel is more explicit)
    expect(orielRule!.id).toBe('mr-oriel-top-sash');
  });
});

// ─── RULE APPLICATION ────────────────────────────────────────
describe('Measurement Rule Application', () => {
  test('No rule → no deduction, warning added', () => {
    const adj = applyMeasurementRule(36, 60, null);
    expect(adj.adjustedWidth).toBe(36);
    expect(adj.adjustedHeight).toBe(60);
    expect(adj.widthTakeoff).toBe(0);
    expect(adj.warnings.length).toBeGreaterThan(0);
    expect(adj.ruleStatus).toBe('needs_verification');
  });

  test('Oriel rule → zero deduction (top sash IS the order size)', () => {
    const orielRule = findMeasurementRule('oriel');
    const adj = applyMeasurementRule(35.375, 29.5, orielRule);
    expect(adj.widthTakeoff).toBe(0);
    expect(adj.heightTakeoff).toBe(0);
    expect(adj.adjustedWidth).toBe(35.375);
    expect(adj.adjustedHeight).toBe(29.5);
    expect(adj.requiresConfirmation).toBe(true);
    expect(adj.requiresPhoto).toBe(true);
  });

  test('Brick insert rule → 1/4" takeoff each dim', () => {
    const brickRule = findMeasurementRule(undefined, 'brick', 'INT');
    const adj = applyMeasurementRule(36, 60, brickRule!);
    expect(adj.widthTakeoff).toBe(0.25);
    expect(adj.heightTakeoff).toBe(0.25);
    expect(adj.adjustedWidth).toBe(35.75);
    expect(adj.adjustedHeight).toBe(59.75);
  });

  test('NEEDS_VERIFICATION rule adds warning', () => {
    const brickRule = findMeasurementRule(undefined, 'brick', 'INT');
    const adj = applyMeasurementRule(36, 60, brickRule!);
    expect(adj.ruleStatus).toBe('needs_verification');
    expect(adj.warnings.some(w => w.includes('NEEDS_VERIFICATION'))).toBe(true);
  });

  test('Adjustment starts unapproved', () => {
    const rule = findMeasurementRule('oriel');
    const adj = applyMeasurementRule(36, 48, rule);
    expect(adj.approved).toBe(false);
    expect(adj.approvedAt).toBeUndefined();
  });

  test('Cannot produce negative final dimension', () => {
    const rule = { ...MEASUREMENT_RULES[0], widthTakeoffDecimal: 999 };
    const adj = applyMeasurementRule(10, 10, rule);
    expect(adj.adjustedWidth).toBeGreaterThanOrEqual(0);
  });

  test('actionType "warn" does not deduct and adds warning', () => {
    const rule: MeasurementRule = {
      id: 'test-warn-rule',
      name: 'Test Warn Rule',
      description: 'Trigger alert warning',
      status: 'verified',
      actionType: 'warn',
      widthTakeoffDecimal: 2.5,
      heightTakeoffDecimal: 2.5,
      requiresConfirmation: false,
      requiresPhoto: false,
      requiresNote: false,
      severity: 'medium',
      version: 1,
    };
    const adj = applyMeasurementRule(36, 60, rule);
    expect(adj.adjustedWidth).toBe(36);
    expect(adj.adjustedHeight).toBe(60);
    expect(adj.widthTakeoff).toBe(0);
    expect(adj.warnings.some(w => w.includes('[Warning]'))).toBe(true);
  });

  test('actionType "block" does not deduct and adds blocker warning', () => {
    const rule: MeasurementRule = {
      id: 'test-block-rule',
      name: 'Test Block Rule',
      description: 'Prevent export',
      status: 'verified',
      actionType: 'block',
      widthTakeoffDecimal: 2.5,
      heightTakeoffDecimal: 2.5,
      requiresConfirmation: false,
      requiresPhoto: false,
      requiresNote: false,
      severity: 'blocker',
      version: 1,
    };
    const adj = applyMeasurementRule(36, 60, rule);
    expect(adj.adjustedWidth).toBe(36);
    expect(adj.adjustedHeight).toBe(60);
    expect(adj.widthTakeoff).toBe(0);
    expect(adj.warnings.some(w => w.includes('[BLOCKER]'))).toBe(true);
  });

  test('actionType "require_photo" sets requiresPhoto to true', () => {
    const rule: MeasurementRule = {
      id: 'test-photo-rule',
      name: 'Test Photo Rule',
      description: 'Require photo',
      status: 'verified',
      actionType: 'require_photo',
      widthTakeoffDecimal: 0,
      heightTakeoffDecimal: 0,
      requiresConfirmation: false,
      requiresPhoto: false,
      requiresNote: false,
      severity: 'medium',
      version: 1,
    };
    const adj = applyMeasurementRule(36, 60, rule);
    expect(adj.requiresPhoto).toBe(true);
    expect(adj.warnings.some(w => w.includes('Photo verification required'))).toBe(true);
  });

  test('actionType "require_note" sets requiresNote/warning', () => {
    const rule: MeasurementRule = {
      id: 'test-note-rule',
      name: 'Test Note Rule',
      description: 'Require note',
      status: 'verified',
      actionType: 'require_note',
      widthTakeoffDecimal: 0,
      heightTakeoffDecimal: 0,
      requiresConfirmation: false,
      requiresPhoto: false,
      requiresNote: false,
      severity: 'medium',
      version: 1,
    };
    const adj = applyMeasurementRule(36, 60, rule);
    expect(adj.warnings.some(w => w.includes('Install note required'))).toBe(true);
  });
});

// ─── SPECIALTY DIMENSION SETS ────────────────────────────────
describe('Specialty Dimension Sets', () => {
  test('Circle top has width, legHeight, rise as required', () => {
    const spec = getSpecialtyDimensionSet('circle_top');
    expect(spec).not.toBeNull();
    const keys = spec!.requiredDimensions.map(d => d.key);
    expect(keys).toContain('width');
    expect(keys).toContain('legHeight');
    expect(keys).toContain('rise');
  });

  test('Circle top has computed radius field', () => {
    const spec = getSpecialtyDimensionSet('circle_top');
    expect(spec!.computedFields?.some(cf => cf.key === 'radius')).toBe(true);
  });

  test('Eyebrow has left and right leg heights', () => {
    const spec = getSpecialtyDimensionSet('eyebrow');
    const keys = spec!.requiredDimensions.map(d => d.key);
    expect(keys).toContain('legHeightLeft');
    expect(keys).toContain('legHeightRight');
  });

  test('Quarter arch has left and right leg heights', () => {
    const spec = getSpecialtyDimensionSet('quarter_arch');
    const keys = spec!.requiredDimensions.map(d => d.key);
    expect(keys).toContain('legHeightLeft');
    expect(keys).toContain('legHeightRight');
  });

  test('Oriel requires orielUpperSashHeight', () => {
    const spec = getSpecialtyDimensionSet('oriel');
    const keys = spec!.requiredDimensions.map(d => d.key);
    expect(keys).toContain('orielUpperSashHeight');
  });

  test('Unknown window type returns null', () => {
    const spec = getSpecialtyDimensionSet('alien_portal');
    expect(spec).toBeNull();
  });

  test('Picture window has no required photos', () => {
    const spec = getSpecialtyDimensionSet('picture');
    expect(spec!.requiredPhotos.length).toBe(0);
  });

  test('Circle top requires 3 photos', () => {
    const spec = getSpecialtyDimensionSet('circle_top');
    expect(spec!.requiredPhotos.length).toBeGreaterThanOrEqual(3);
  });

  test('Circle top requires sketch marker', () => {
    const spec = getSpecialtyDimensionSet('circle_top');
    expect(spec!.requiresSketchMarker).toBe(true);
  });

  test('Picture does NOT require sketch marker', () => {
    const spec = getSpecialtyDimensionSet('picture');
    expect(spec!.requiresSketchMarker).toBe(false);
  });
});

// ─── COMPUTED FIELDS ─────────────────────────────────────────
describe('Circle Top Radius Computation', () => {
  test('Computes radius for half-circle: width=48, rise=24 → radius=24', () => {
    const r = computeCircleTopRadius(48, 24);
    expect(Math.round(r)).toBe(24);
  });

  test('Computes radius for standard circle top: width=36, rise=9', () => {
    const r = computeCircleTopRadius(36, 9);
    // (9/2) + (36^2 / (8*9)) = 4.5 + 18 = 22.5
    expect(r).toBeCloseTo(22.5, 1);
  });

  test('Returns 0 if rise is 0', () => {
    expect(computeCircleTopRadius(36, 0)).toBe(0);
  });

  test('Returns 0 if width is 0', () => {
    expect(computeCircleTopRadius(0, 9)).toBe(0);
  });
});

// ─── EXPORT READINESS ────────────────────────────────────────
describe('Measurement Export Readiness', () => {
  test('No openings = no blockers', () => {
    const result = checkMeasurementExportReadiness([], {});
    expect(result.blocked).toBe(false);
  });

  test('Oriel without top sash confirmation blocks export', () => {
    const openings = [{ openingNumber: 1, model: 'Oriel Window', productCategory: 'oriel', topSashConfirmed: false }];
    const result = checkMeasurementExportReadiness(openings, {});
    expect(result.blocked).toBe(true);
    expect(result.blockers.some(b => b.includes('top sash'))).toBe(true);
  });

  test('Oriel WITH top sash confirmation AND required dimensions is not blocked', () => {
    const openings = [{ openingNumber: 1, model: 'Oriel Window', productCategory: 'oriel', topSashConfirmed: true, orielUpperSashHeight: 29.5 }];
    const result = checkMeasurementExportReadiness(openings, {});
    expect(result.blocked).toBe(false);
  });

  test('Missing required specialty dimension blocks export', () => {
    const openings = [{ openingNumber: 2, productCategory: 'circle_top', width: 48 }]; // missing legHeight and rise
    const result = checkMeasurementExportReadiness(openings, {});
    expect(result.blocked).toBe(true);
    expect(result.blockers.some(b => b.includes('Leg Height') || b.includes('Rise'))).toBe(true);
  });

  test('Unapproved adjustment blocks export', () => {
    const openings = [{ openingNumber: 3, model: 'DH', productCategory: 'double_hung' }];
    const adj: MeasurementAdjustment = {
      rawWidth: 36, rawHeight: 60,
      adjustedWidth: 35.75, adjustedHeight: 59.75,
      widthTakeoff: 0.25, heightTakeoff: 0.25,
      ruleId: 'mr-insert-brick-std', ruleName: 'Brick Insert',
      ruleStatus: 'needs_verification',
      requiresConfirmation: true, requiresPhoto: false,
      notes: [], warnings: [],
      approved: false,
    };
    const result = checkMeasurementExportReadiness(openings, { 3: adj });
    expect(result.blocked).toBe(true);
    expect(result.blockers.some(b => b.includes('not approved'))).toBe(true);
  });

  test('Approved adjustment with verified rule clears export', () => {
    const openings = [{ openingNumber: 1, productCategory: 'oriel', topSashConfirmed: true, orielUpperSashHeight: 29.5 }];
    const adj: MeasurementAdjustment = {
      rawWidth: 35.375, rawHeight: 29.5,
      adjustedWidth: 35.375, adjustedHeight: 29.5,
      widthTakeoff: 0, heightTakeoff: 0,
      ruleId: 'mr-oriel-top-sash', ruleName: 'Oriel Top Sash',
      ruleStatus: 'verified',
      requiresConfirmation: true, requiresPhoto: true,
      notes: [], warnings: [],
      approved: true, approvedAt: new Date(),
    };
    const result = checkMeasurementExportReadiness(openings, { 1: adj });
    expect(result.blocked).toBe(false);
  });

  test('No rule + no override = warning but not blocker', () => {
    const openings = [{ openingNumber: 1, productCategory: 'double_hung', width: 36, height: 48 }];
    const adj: MeasurementAdjustment = {
      rawWidth: 36, rawHeight: 48,
      adjustedWidth: 36, adjustedHeight: 48,
      widthTakeoff: 0, heightTakeoff: 0,
      ruleStatus: 'needs_verification',
      requiresConfirmation: false, requiresPhoto: false,
      notes: [], warnings: [],
      approved: true,
    };
    const result = checkMeasurementExportReadiness(openings, { 1: adj });
    expect(result.warnings.some(w => w.includes('No measurement rule'))).toBe(true);
    expect(result.blocked).toBe(false);
  });
});

// ─── MEASUREMENT PARSER ──────────────────────────────────────
describe('Measurement Parser — Tape Formats', () => {
  test('Parses "35 3/8"', () => {
    const r = parseMeasurement('35 3/8');
    expect(r.valid).toBe(true);
    expect(r.inches).toBeCloseTo(35.375, 2);
    expect(r.display).toBe('35 3/8');
  });

  test('Parses "35-3/8"', () => {
    const r = parseMeasurement('35-3/8');
    expect(r.valid).toBe(true);
    expect(r.inches).toBeCloseTo(35.375, 2);
  });

  test('Parses "35.375"', () => {
    const r = parseMeasurement('35.375');
    expect(r.valid).toBe(true);
    expect(r.inches).toBeCloseTo(35.375, 2);
  });

  test('Parses "59 7/8"', () => {
    const r = parseMeasurement('59 7/8');
    expect(r.valid).toBe(true);
    expect(r.inches).toBeCloseTo(59.875, 2);
  });

  test('Parses voice: "thirty five and three eighths"', () => {
    const r = parseMeasurement('thirty five and three eighths');
    expect(r.valid).toBe(true);
    expect(r.inches).toBeCloseTo(35.375, 1);
  });

  test('toFractionDisplay rounds to nearest 1/8"', () => {
    expect(toFractionDisplay(35.375)).toBe('35 3/8');
    expect(toFractionDisplay(59.875)).toBe('59 7/8');
    expect(toFractionDisplay(36)).toBe('36');
  });

  test('Invalid input returns valid=false', () => {
    const r = parseMeasurement('not a measurement');
    expect(r.valid).toBe(false);
  });

  test('Parses 23/3/8 typo correctly as 23 3/8', () => {
    const r = parseMeasurement('23/3/8');
    expect(r.valid).toBe(true);
    expect(r.inches).toBe(23.375);
    expect(r.display).toBe('23 3/8');
  });

  test('Parses 72 0/8 correctly as 72', () => {
    const r = parseMeasurement('72 0/8');
    expect(r.valid).toBe(true);
    expect(r.inches).toBe(72);
    expect(r.display).toBe('72');
  });

  test('Rejects 55 1/16 since it is not in eighths', () => {
    const r = parseMeasurement('55 1/16');
    expect(r.valid).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  test('Rejects 55 9/8 since numerator >= denominator', () => {
    const r = parseMeasurement('55 9/8');
    expect(r.valid).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
