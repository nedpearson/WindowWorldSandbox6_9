// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/measurementQA.ts — Deterministic measurement QA checks
//
// OFFLINE-SAFE: No API calls. No AI. All checks run from local data.
//
// BOUNDARY RULE: These functions return FieldIntelligenceFinding[] only.
// They NEVER modify appointments, openings, or any cached data.
// Every suggested change requires user approval through SmartCheckPanel.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding, FindingSeverity } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

const DEDUCTION_INCHES = 3 / 8; // 3/8" standard Window World deduction
const VARIATION_WARN_THRESHOLD = 0.25;  // > 1/4" → review warning
const VARIATION_BLOCK_THRESHOLD = 0.5;  // > 1/2" → blocking
const MAX_REASONABLE_DIMENSION = 120;   // inches — > 10' is suspicious
const MIN_REASONABLE_DIMENSION = 6;     // inches — < 6" is suspicious for a window

// ── Helper ────────────────────────────────────────────────────────────────

function makeFinding(
  appointmentId: string,
  openingId: string | undefined,
  openingNumber: number | undefined,
  category: FieldIntelligenceFinding['category'],
  severity: FindingSeverity,
  title: string,
  message: string,
  suggestedAction?: string,
  metadata?: Record<string, unknown>,
): FieldIntelligenceFinding {
  // Stable ID: deterministic hash so same finding isn't duplicated on re-run
  const idBase = `mqa:${appointmentId}:${openingId ?? 'appt'}:${title.slice(0, 60)}`;
  const id = `mqa_${djb2Hash(idBase)}`;
  return {
    id,
    severity,
    category,
    source: 'deterministic_rule',
    appointmentId,
    openingId,
    openingNumber,
    title,
    message,
    suggestedAction,
    requiresApproval: severity !== 'info',
    status: 'open',
    createdAt: Date.now(),
    metadataJson: metadata,
  };
}

/** Simple djb2 hash — works with any Unicode string, no btoa char restriction */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // force unsigned 32-bit
  }
  return hash.toString(36).padStart(7, '0');
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '–';
  // Format as whole + fractional inches: 35 3/8"
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac === 0) return `${whole}"`;
  // Approximate common fractions
  const eighths = Math.round(frac * 8);
  const fracMap: Record<number, string> = { 1: '1/8', 2: '1/4', 3: '3/8', 4: '1/2', 5: '5/8', 6: '3/4', 7: '7/8' };
  return `${whole} ${fracMap[eighths] ?? frac.toFixed(3)}"`;
}

// ── Multi-Point Presence Checks ───────────────────────────────────────────

/**
 * Check that width multi-point captures exist (Top, Middle, Bottom).
 * Returns one finding per missing capture point.
 */
export function checkWidthCapturePresence(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    widthTop?: number | null;
    widthMiddle?: number | null;
    widthBottom?: number | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const { id, openingNumber } = opening;
  const n = openingNumber ?? 0;

  if (!opening.widthTop) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'warning',
      `Opening ${n}: Width Top missing`,
      `Opening ${n} has no Width Top measurement. Brick, siding, or trim at the top may differ — the top reading is required for smallest-opening selection.`,
      `Capture Width Top for Opening ${n} using Bluetooth laser or manual entry.`,
      { field: 'widthTop', openingNumber: n },
    ));
  }
  if (!opening.widthMiddle) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'info',
      `Opening ${n}: Width Middle missing`,
      `Opening ${n} has no Width Middle measurement. Middle reading helps detect obstructions and framing irregularities.`,
      `Capture Width Middle for Opening ${n}.`,
      { field: 'widthMiddle', openingNumber: n },
    ));
  }
  if (!opening.widthBottom) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'warning',
      `Opening ${n}: Width Bottom missing`,
      `Opening ${n} has no Width Bottom measurement. The sill reading is critical for replacement window fit.`,
      `Capture Width Bottom for Opening ${n} using Bluetooth laser or manual entry.`,
      { field: 'widthBottom', openingNumber: n },
    ));
  }
  return findings;
}

/**
 * Check that height multi-point captures exist (Left, Center, Right).
 */
export function checkHeightCapturePresence(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    heightLeft?: number | null;
    heightCenter?: number | null;
    heightRight?: number | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const { id, openingNumber } = opening;
  const n = openingNumber ?? 0;

  if (!opening.heightLeft) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'warning',
      `Opening ${n}: Height Left missing`,
      `Opening ${n} is missing the Height Left measurement. Out-of-square frames are common in older homes — all three height points are needed.`,
      `Capture Height Left for Opening ${n}.`,
      { field: 'heightLeft', openingNumber: n },
    ));
  }
  if (!opening.heightCenter) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'info',
      `Opening ${n}: Height Center missing`,
      `Opening ${n} has no Height Center measurement.`,
      `Capture Height Center for Opening ${n}.`,
      { field: 'heightCenter', openingNumber: n },
    ));
  }
  if (!opening.heightRight) {
    findings.push(makeFinding(
      appointmentId, id, n, 'measurement', 'warning',
      `Opening ${n}: Height Right missing`,
      `Opening ${n} is missing the Height Right measurement.`,
      `Capture Height Right for Opening ${n}.`,
      { field: 'heightRight', openingNumber: n },
    ));
  }
  return findings;
}

// ── Smallest-Opening Rule Check ───────────────────────────────────────────

/**
 * Verify that the stored finalWidth matches the smallest raw width minus deduction.
 * If not, return a blocking finding.
 */
export function checkSmallestOpeningRule(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    widthTop?: number | null;
    widthMiddle?: number | null;
    widthBottom?: number | null;
    heightLeft?: number | null;
    heightCenter?: number | null;
    heightRight?: number | null;
    width?: number | null;   // finalWidth stored in DB
    height?: number | null;  // finalHeight stored in DB
    isManualOverride?: boolean;
    manualOverrideReason?: string | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const { id, openingNumber } = opening;
  const n = openingNumber ?? 0;

  // Compute smallest raw widths
  const rawWidths = [opening.widthTop, opening.widthMiddle, opening.widthBottom]
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const rawHeights = [opening.heightLeft, opening.heightCenter, opening.heightRight]
    .filter((v): v is number => typeof v === 'number' && v > 0);

  if (rawWidths.length >= 2) {
    const smallestRaw = Math.min(...rawWidths);
    const expectedFinal = Math.round((smallestRaw - DEDUCTION_INCHES) * 8) / 8;
    const storedFinal = opening.width;

    if (storedFinal != null && Math.abs(storedFinal - expectedFinal) > 0.01) {
      if (opening.isManualOverride) {
        // Manual override — warn but don't block (user consciously chose this)
        findings.push(makeFinding(
          appointmentId, id, n, 'measurement', 'warning',
          `Opening ${n}: Manual override differs from smallest-opening rule`,
          `Opening ${n} has a manual width of ${fmt(storedFinal)}, but smallest raw width minus 3/8" = ${fmt(expectedFinal)}. ` +
          `Manual override reason: "${opening.manualOverrideReason || 'not provided'}". ` +
          `All raw captures are preserved. Review before contract.`,
          `Verify that the manual override is intentional and document the reason clearly.`,
          { storedFinal, expectedFinal, smallestRaw, field: 'width' },
        ));
      } else {
        findings.push(makeFinding(
          appointmentId, id, n, 'measurement', 'blocking',
          `Opening ${n}: Width does not match smallest-opening rule`,
          `Opening ${n} stored final width is ${fmt(storedFinal)}, but smallest raw width (${fmt(smallestRaw)}) minus 3/8" = ${fmt(expectedFinal)}. ` +
          `Pricing and contract use the wrong dimension.`,
          `Recalculate Opening ${n} width using smallest-opening rule.`,
          { storedFinal, expectedFinal, smallestRaw, field: 'width' },
        ));
      }
    }
  }

  if (rawHeights.length >= 2) {
    const smallestRaw = Math.min(...rawHeights);
    const expectedFinal = Math.round((smallestRaw - DEDUCTION_INCHES) * 8) / 8;
    const storedFinal = opening.height;

    if (storedFinal != null && Math.abs(storedFinal - expectedFinal) > 0.01) {
      if (opening.isManualOverride) {
        findings.push(makeFinding(
          appointmentId, id, n, 'measurement', 'warning',
          `Opening ${n}: Manual override differs from smallest-opening height rule`,
          `Opening ${n} has a manual height of ${fmt(storedFinal)}, but smallest raw height minus 3/8" = ${fmt(expectedFinal)}.`,
          `Verify that the manual override is intentional.`,
          { storedFinal, expectedFinal, smallestRaw, field: 'height' },
        ));
      } else {
        findings.push(makeFinding(
          appointmentId, id, n, 'measurement', 'blocking',
          `Opening ${n}: Height does not match smallest-opening rule`,
          `Opening ${n} stored final height is ${fmt(storedFinal)}, but smallest raw height (${fmt(smallestRaw)}) minus 3/8" = ${fmt(expectedFinal)}.`,
          `Recalculate Opening ${n} height using smallest-opening rule.`,
          { storedFinal, expectedFinal, smallestRaw, field: 'height' },
        ));
      }
    }
  }

  return findings;
}

// ── Variation Check ───────────────────────────────────────────────────────

export function checkMeasurementVariation(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    widthTop?: number | null;
    widthMiddle?: number | null;
    widthBottom?: number | null;
    heightLeft?: number | null;
    heightCenter?: number | null;
    heightRight?: number | null;
    obstructionNotes?: string | null;
    exteriorSurface?: string | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const { id, openingNumber } = opening;
  const n = openingNumber ?? 0;

  const rawWidths = [opening.widthTop, opening.widthMiddle, opening.widthBottom]
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const rawHeights = [opening.heightLeft, opening.heightCenter, opening.heightRight]
    .filter((v): v is number => typeof v === 'number' && v > 0);

  const isBrick = (opening.exteriorSurface ?? '').toLowerCase().includes('brick');

  if (rawWidths.length >= 2) {
    const variance = Math.max(...rawWidths) - Math.min(...rawWidths);
    if (variance >= VARIATION_BLOCK_THRESHOLD) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Width variance exceeds 1/2" — review required`,
        `Opening ${n} width readings vary ${fmt(variance)} (${rawWidths.map(fmt).join(', ')}). ` +
        `This is unusually high — possible brick protrusion, structural bowing, or measurement error. ` +
        `Contract cannot proceed without manager review.`,
        `Photo-document the obstruction, mark brick/protrusion notes, then have manager approve before contract.`,
        { variance, values: rawWidths, field: 'width' },
      ));
    } else if (variance >= VARIATION_WARN_THRESHOLD) {
      const hasNotes = Boolean(opening.obstructionNotes?.trim());
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'warning',
        `Opening ${n}: Width varies ${fmt(variance)}${isBrick ? ' (brick)' : ''} — smallest selected`,
        `Opening ${n} width readings vary ${fmt(variance)} (${rawWidths.map(fmt).join(', ')}). ` +
        `Smallest width selected per Window World rule.${!hasNotes ? ' No obstruction note was recorded.' : ''}`,
        hasNotes
          ? `Review obstruction notes and confirm smallest-opening selection is correct.`
          : `Add a brick/protrusion/obstruction note for Opening ${n} before contract.`,
        { variance, values: rawWidths, isBrick, hasBrickNote: hasNotes, field: 'width' },
      ));
    }
  }

  if (rawHeights.length >= 2) {
    const variance = Math.max(...rawHeights) - Math.min(...rawHeights);
    if (variance >= VARIATION_BLOCK_THRESHOLD) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Height variance exceeds 1/2" — out-of-square`,
        `Opening ${n} height readings vary ${fmt(variance)} (${rawHeights.map(fmt).join(', ')}). ` +
        `Opening may be severely out of square. Requires manager review before contract.`,
        `Photo-document the out-of-square condition and escalate for manager approval.`,
        { variance, values: rawHeights, field: 'height' },
      ));
    } else if (variance >= VARIATION_WARN_THRESHOLD) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'warning',
        `Opening ${n}: Height varies ${fmt(variance)} — smallest selected`,
        `Opening ${n} height readings vary ${fmt(variance)} (${rawHeights.map(fmt).join(', ')}). ` +
        `Smallest height selected per Window World rule.`,
        `Review obstruction notes and confirm smallest-opening selection is correct for Opening ${n}.`,
        { variance, values: rawHeights, field: 'height' },
      ));
    }
  }

  return findings;
}

// ── Dimension Sanity Check ────────────────────────────────────────────────

export function checkDimensionSanity(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    width?: number | null;
    height?: number | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const { id, openingNumber } = opening;
  const n = openingNumber ?? 0;
  const w = opening.width;
  const h = opening.height;

  if (w != null && w > 0) {
    if (w > MAX_REASONABLE_DIMENSION) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Width ${fmt(w)} seems too large`,
        `Opening ${n} final width of ${fmt(w)} exceeds ${MAX_REASONABLE_DIMENSION}". Verify this is not a data entry error.`,
        `Re-measure Opening ${n} width and correct if needed.`,
        { field: 'width', value: w },
      ));
    } else if (w < MIN_REASONABLE_DIMENSION) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Width ${fmt(w)} seems too small`,
        `Opening ${n} final width of ${fmt(w)} is less than ${MIN_REASONABLE_DIMENSION}". Verify correct opening was measured.`,
        `Verify Opening ${n} measurement or correct the entry.`,
        { field: 'width', value: w },
      ));
    }
  }

  if (h != null && h > 0) {
    if (h > MAX_REASONABLE_DIMENSION) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Height ${fmt(h)} seems too large`,
        `Opening ${n} final height of ${fmt(h)} exceeds ${MAX_REASONABLE_DIMENSION}". Verify this is correct.`,
        `Re-measure Opening ${n} height and correct if needed.`,
        { field: 'height', value: h },
      ));
    } else if (h < MIN_REASONABLE_DIMENSION) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'blocking',
        `Opening ${n}: Height ${fmt(h)} seems too small`,
        `Opening ${n} final height of ${fmt(h)} is less than ${MIN_REASONABLE_DIMENSION}".`,
        `Verify Opening ${n} measurement.`,
        { field: 'height', value: h },
      ));
    }
  }

  // Width/height likely reversed: typical residential window is taller than wide
  // Flag if width > height * 2 for a non-picture-window / non-wide-window
  if (w != null && h != null && w > 0 && h > 0) {
    if (h < w * 0.4 && h < 36) {
      findings.push(makeFinding(
        appointmentId, id, n, 'measurement', 'warning',
        `Opening ${n}: Width and height may be reversed`,
        `Opening ${n} width ${fmt(w)} is much larger than height ${fmt(h)}. ` +
        `For replacement windows, width is usually less than height. ` +
        `Verify the measurements were entered in the correct fields.`,
        `Confirm width and height are not swapped for Opening ${n}.`,
        { field: 'orientation', width: w, height: h },
      ));
    }
  }

  return findings;
}

// ── Bluetooth Deduction Audit ─────────────────────────────────────────────

/**
 * If a raw Bluetooth/laser reading is recorded but no MeasurementAdjustment
 * record exists, flag it — the 3/8" deduction may not have been applied.
 */
export function checkBluetoothDeductionAudit(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    hasRawBluetoothCapture?: boolean;
    hasMeasurementAdjustmentRecord?: boolean;
  },
): FieldIntelligenceFinding[] {
  if (!opening.hasRawBluetoothCapture) return [];
  if (opening.hasMeasurementAdjustmentRecord) return [];

  const n = opening.openingNumber ?? 0;
  return [
    makeFinding(
      appointmentId, opening.id, n, 'measurement', 'blocking',
      `Opening ${n}: Bluetooth reading present but no deduction applied`,
      `Opening ${n} has a raw Bluetooth laser measurement, but no MeasurementAdjustment record was created. ` +
      `The 3/8" deduction may not have been applied. Pricing and contract may use the wrong dimension.`,
      `Re-open Opening ${n} in the measurement panel and confirm the deduction has been applied.`,
      { field: 'bluetooth_deduction', openingNumber: n },
    ),
  ];
}

// ── Full Opening Analysis ─────────────────────────────────────────────────

/**
 * Run ALL measurement QA checks on a single opening.
 * Returns a flat array of all findings.
 */
export function analyzeOpeningMeasurements(
  appointmentId: string,
  opening: {
    id: string;
    openingNumber?: number;
    widthTop?: number | null;
    widthMiddle?: number | null;
    widthBottom?: number | null;
    heightLeft?: number | null;
    heightCenter?: number | null;
    heightRight?: number | null;
    width?: number | null;
    height?: number | null;
    isManualOverride?: boolean;
    manualOverrideReason?: string | null;
    obstructionNotes?: string | null;
    exteriorSurface?: string | null;
    hasRawBluetoothCapture?: boolean;
    hasMeasurementAdjustmentRecord?: boolean;
    measurementMode?: 'simple' | 'advanced';
  },
): FieldIntelligenceFinding[] {
  const mode = opening.measurementMode ?? 'simple';
  return [
    // Skip 3-point presence checks in simple mode — only width/height is required
    ...(mode === 'advanced' ? checkWidthCapturePresence(appointmentId, opening) : []),
    ...(mode === 'advanced' ? checkHeightCapturePresence(appointmentId, opening) : []),
    ...checkSmallestOpeningRule(appointmentId, opening),
    ...checkMeasurementVariation(appointmentId, opening),
    ...checkDimensionSanity(appointmentId, opening),
    ...checkBluetoothDeductionAudit(appointmentId, opening),
  ];
}

/**
 * Run measurement QA across all openings in an appointment.
 */
export function analyzeAllMeasurements(
  appointmentId: string,
  openings: Parameters<typeof analyzeOpeningMeasurements>[1][],
): FieldIntelligenceFinding[] {
  return openings.flatMap(op => analyzeOpeningMeasurements(appointmentId, op));
}
