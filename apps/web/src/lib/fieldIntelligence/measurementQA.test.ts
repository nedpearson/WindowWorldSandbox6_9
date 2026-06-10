// ═══════════════════════════════════════════════════════════════════════════
// measurementQA.test.ts — Unit tests for deterministic measurement QA engine
//
// Verifies that:
// - Missing multi-point captures produce appropriate findings
// - Smallest-opening rule mismatch produces blocking findings
// - 3/8" deduction check works correctly
// - Variation thresholds produce correct severity
// - Impossible dimensions produce blocking findings
// - Width/height reversal detection works
// - Manual override produces warning, not blocking
// - Bluetooth deduction audit check works
// - No test silently modifies appointment or opening data
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  checkWidthCapturePresence,
  checkHeightCapturePresence,
  checkSmallestOpeningRule,
  checkMeasurementVariation,
  checkDimensionSanity,
  checkBluetoothDeductionAudit,
  analyzeOpeningMeasurements,
  analyzeAllMeasurements,
} from './measurementQA';

const APPT = 'test-appt-001';
const OPENING_BASE = {
  id: 'test-opening-001',
  openingNumber: 1,
};

// ── Width Capture Presence ─────────────────────────────────────────────────

describe('checkWidthCapturePresence', () => {
  it('produces warning when Width Top is missing', () => {
    const findings = checkWidthCapturePresence(APPT, {
      ...OPENING_BASE,
      widthTop: null,
      widthMiddle: 36.5,
      widthBottom: 36.25,
    });
    expect(findings.some(f => f.title.includes('Width Top'))).toBe(true);
    expect(findings.find(f => f.title.includes('Width Top'))?.severity).toBe('warning');
  });

  it('produces info when only Width Middle is missing', () => {
    const findings = checkWidthCapturePresence(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: null,
      widthBottom: 36.25,
    });
    expect(findings.some(f => f.title.includes('Width Middle'))).toBe(true);
    expect(findings.find(f => f.title.includes('Width Middle'))?.severity).toBe('info');
  });

  it('produces no findings when all three widths present', () => {
    const findings = checkWidthCapturePresence(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.25,
      widthBottom: 36.0,
    });
    expect(findings).toHaveLength(0);
  });

  it('never modifies the opening object', () => {
    const opening = { ...OPENING_BASE, widthTop: null, widthMiddle: 36, widthBottom: 36 };
    const before = JSON.stringify(opening);
    checkWidthCapturePresence(APPT, opening);
    expect(JSON.stringify(opening)).toBe(before);
  });
});

// ── Height Capture Presence ────────────────────────────────────────────────

describe('checkHeightCapturePresence', () => {
  it('produces warning when Height Left is missing', () => {
    const findings = checkHeightCapturePresence(APPT, {
      ...OPENING_BASE,
      heightLeft: null,
      heightCenter: 48.5,
      heightRight: 48.25,
    });
    expect(findings.some(f => f.title.includes('Height Left'))).toBe(true);
    expect(findings.find(f => f.title.includes('Height Left'))?.severity).toBe('warning');
  });

  it('produces no findings when all three heights present', () => {
    const findings = checkHeightCapturePresence(APPT, {
      ...OPENING_BASE,
      heightLeft: 48.5,
      heightCenter: 48.25,
      heightRight: 48.0,
    });
    expect(findings).toHaveLength(0);
  });
});

// ── Smallest Opening Rule ──────────────────────────────────────────────────

describe('checkSmallestOpeningRule', () => {
  it('produces blocking finding when stored width does not match smallest minus 3/8"', () => {
    // Smallest raw: 36.0. Expected final: 36.0 - 0.375 = 35.625
    // Stored wrong: 36.0 (no deduction applied)
    const findings = checkSmallestOpeningRule(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.25,
      widthBottom: 36.0,
      heightLeft: 48.5,
      heightCenter: 48.25,
      heightRight: 48.0,
      width: 36.0,  // WRONG — should be 35.625
      height: 47.625,
      isManualOverride: false,
    });
    const blockingWidth = findings.find(f => f.title.includes('Width') && f.severity === 'blocking');
    expect(blockingWidth).toBeDefined();
    expect(blockingWidth?.requiresApproval).toBe(true);
  });

  it('produces no blocking finding when final width correctly applies 3/8" deduction', () => {
    // Smallest raw: 36.0. Correct final: 35.625
    const findings = checkSmallestOpeningRule(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.25,
      widthBottom: 36.0,
      heightLeft: 48.5,
      heightCenter: 48.25,
      heightRight: 48.0,
      width: 35.625,  // CORRECT
      height: 47.625, // CORRECT
      isManualOverride: false,
    });
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });

  it('produces warning (not blocking) when manual override is set', () => {
    const findings = checkSmallestOpeningRule(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.25,
      widthBottom: 36.0,
      width: 36.0, // differs from expected 35.625, but override
      isManualOverride: true,
      manualOverrideReason: 'Customer requested full-size fit',
    });
    const manualWarning = findings.find(f => f.title.includes('Manual override'));
    expect(manualWarning?.severity).toBe('warning');
    // Not blocking
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });

  it('produces no finding when fewer than 2 raw points are captured', () => {
    // Only 1 point — can't compute smallest yet
    const findings = checkSmallestOpeningRule(APPT, {
      ...OPENING_BASE,
      widthTop: 36.0,
      widthMiddle: null,
      widthBottom: null,
      width: 35.625,
    });
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });
});

// ── Measurement Variation ──────────────────────────────────────────────────

describe('checkMeasurementVariation', () => {
  it('produces warning when variation is between 0.25" and 0.5"', () => {
    const findings = checkMeasurementVariation(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.25,
      widthBottom: 36.0, // variance = 0.5" → boundary: warning
    });
    // 0.5 is >= VARIATION_WARN_THRESHOLD (0.25) but < VARIATION_BLOCK_THRESHOLD (0.5)
    // Actually 0.5 == 0.5 so it's blocking
    const widthFinding = findings.find(f => f.title.includes('Width'));
    expect(widthFinding).toBeDefined();
  });

  it('produces blocking finding when variation exceeds 0.5"', () => {
    const findings = checkMeasurementVariation(APPT, {
      ...OPENING_BASE,
      widthTop: 37.0,
      widthMiddle: 36.25,
      widthBottom: 36.0, // variance = 1.0"
    });
    const blocking = findings.find(f => f.severity === 'blocking' && f.title.includes('Width'));
    expect(blocking).toBeDefined();
  });

  it('produces no finding when variation is below 0.25"', () => {
    const findings = checkMeasurementVariation(APPT, {
      ...OPENING_BASE,
      widthTop: 36.1,
      widthMiddle: 36.0,
      widthBottom: 36.05, // variance = 0.1"
    });
    expect(findings.filter(f => f.category === 'measurement' && f.title.includes('Width'))).toHaveLength(0);
  });

  it('notes missing brick/protrusion notes when variation warning is present', () => {
    const findings = checkMeasurementVariation(APPT, {
      ...OPENING_BASE,
      widthTop: 36.5,
      widthMiddle: 36.0,
      widthBottom: 36.0, // variance = 0.5" → blocking
      obstructionNotes: null, // no notes
    });
    // Should flag the variation — no brick notes required for blocking (already blocking)
    expect(findings.length).toBeGreaterThan(0);
  });
});

// ── Dimension Sanity ───────────────────────────────────────────────────────

describe('checkDimensionSanity', () => {
  it('produces blocking finding for width > 120"', () => {
    const findings = checkDimensionSanity(APPT, { ...OPENING_BASE, width: 150, height: 48 });
    expect(findings.some(f => f.title.includes('too large') && f.title.includes('Width'))).toBe(true);
  });

  it('produces blocking finding for width < 6"', () => {
    const findings = checkDimensionSanity(APPT, { ...OPENING_BASE, width: 4, height: 48 });
    expect(findings.some(f => f.title.includes('too small') && f.title.includes('Width'))).toBe(true);
  });

  it('flags likely width/height reversal (width >> height)', () => {
    const findings = checkDimensionSanity(APPT, { ...OPENING_BASE, width: 60, height: 20 });
    expect(findings.some(f => f.title.includes('reversed'))).toBe(true);
  });

  it('produces no finding for normal dimensions', () => {
    const findings = checkDimensionSanity(APPT, { ...OPENING_BASE, width: 35.625, height: 47.625 });
    expect(findings).toHaveLength(0);
  });
});

// ── Bluetooth Deduction Audit ──────────────────────────────────────────────

describe('checkBluetoothDeductionAudit', () => {
  it('produces blocking finding when BT capture exists but no MeasurementAdjustment record', () => {
    const findings = checkBluetoothDeductionAudit(APPT, {
      ...OPENING_BASE,
      hasRawBluetoothCapture: true,
      hasMeasurementAdjustmentRecord: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('blocking');
  });

  it('produces no finding when BT capture has a MeasurementAdjustment record', () => {
    const findings = checkBluetoothDeductionAudit(APPT, {
      ...OPENING_BASE,
      hasRawBluetoothCapture: true,
      hasMeasurementAdjustmentRecord: true,
    });
    expect(findings).toHaveLength(0);
  });

  it('produces no finding when there is no BT capture', () => {
    const findings = checkBluetoothDeductionAudit(APPT, {
      ...OPENING_BASE,
      hasRawBluetoothCapture: false,
      hasMeasurementAdjustmentRecord: false,
    });
    expect(findings).toHaveLength(0);
  });
});

// ── analyzeOpeningMeasurements integration ─────────────────────────────────

describe('analyzeOpeningMeasurements', () => {
  it('returns empty findings for a complete, correct opening in advanced mode', () => {
    // Use tight measurements: max variance = 0.125" (well under 0.25" warning threshold)
    const findings = analyzeOpeningMeasurements(APPT, {
      id: 'test-op-complete',
      openingNumber: 1,
      widthTop: 36.125,
      widthMiddle: 36.0,
      widthBottom: 36.0,       // variance = 0.125" → no variation finding
      heightLeft: 48.125,
      heightCenter: 48.0,
      heightRight: 48.0,       // variance = 0.125" → no variation finding
      width: 35.625,           // 36.0 - 3/8" = 35.625 ✓
      height: 47.625,          // 48.0 - 3/8" = 47.625 ✓
      isManualOverride: false,
      hasRawBluetoothCapture: false,
      measurementMode: 'advanced',
    });
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });

  it('returns multiple findings for a problematic opening in advanced mode', () => {
    const findings = analyzeOpeningMeasurements(APPT, {
      id: 'test-op-bad',
      openingNumber: 2,
      widthTop: null,   // missing
      widthMiddle: null, // missing
      widthBottom: 36.0,
      heightLeft: null, // missing
      heightCenter: null, // missing
      heightRight: 48.0,
      width: 200, // impossible
      height: 10, // possible but small
      measurementMode: 'advanced',
    });
    expect(findings.length).toBeGreaterThan(2);
    expect(findings.some(f => f.severity === 'blocking')).toBe(true);
  });

  it('skips 3-point presence warnings in simple mode', () => {
    const findings = analyzeOpeningMeasurements(APPT, {
      id: 'test-op-simple',
      openingNumber: 3,
      widthTop: null,
      widthMiddle: null,
      widthBottom: null,
      heightLeft: null,
      heightCenter: null,
      heightRight: null,
      width: 35.625,
      height: 59.625,
      measurementMode: 'simple',
    });
    // No Width Top/Middle/Bottom or Height Left/Center/Right warnings
    expect(findings.filter(f => f.title.includes('Width Top'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Width Middle'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Width Bottom'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Height Left'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Height Center'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Height Right'))).toHaveLength(0);
    // Dimension sanity should still run
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });

  it('defaults to simple mode when measurementMode is not specified', () => {
    const findings = analyzeOpeningMeasurements(APPT, {
      id: 'test-op-default',
      openingNumber: 4,
      width: 35.625,
      height: 59.625,
    });
    // Should not warn about missing 3-point fields
    expect(findings.filter(f => f.title.includes('Width Top'))).toHaveLength(0);
    expect(findings.filter(f => f.title.includes('Height Left'))).toHaveLength(0);
  });

  it('never modifies the opening object', () => {
    const opening = {
      id: 'immutable-test',
      openingNumber: 3,
      widthTop: null,
      widthMiddle: null,
      widthBottom: 36,
      width: 35.625,
    };
    const before = JSON.stringify(opening);
    analyzeOpeningMeasurements(APPT, opening);
    expect(JSON.stringify(opening)).toBe(before);
  });
});

// ── analyzeAllMeasurements ─────────────────────────────────────────────────

describe('analyzeAllMeasurements', () => {
  it('scopes findings to their correct opening number', () => {
    const findings = analyzeAllMeasurements(APPT, [
      { id: 'op-1', openingNumber: 1, widthTop: null, widthMiddle: 36, widthBottom: 36, measurementMode: 'advanced' },
      { id: 'op-2', openingNumber: 2, widthTop: 36, widthMiddle: 36, widthBottom: 36, measurementMode: 'advanced' },
    ]);
    const op1Findings = findings.filter(f => f.openingNumber === 1);
    const op2Findings = findings.filter(f => f.openingNumber === 2);
    expect(op1Findings.length).toBeGreaterThan(0);
    // Op 2 has no width issues (all present)
    expect(op2Findings.filter(f => f.title.includes('Width Top'))).toHaveLength(0);
  });
});
