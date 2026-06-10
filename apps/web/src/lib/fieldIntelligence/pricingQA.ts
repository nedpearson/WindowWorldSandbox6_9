// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/pricingQA.ts — Deterministic pricing QA checks
//
// OFFLINE-SAFE: All checks run from local data and cached pricing snapshot.
//
// BOUNDARY RULE: These functions detect issues only. They NEVER modify pricing,
// commission calculations, or contract totals. All math is done by the
// deterministic pricing engine — not by these functions.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding } from './types';

// Max age before pricing cache is considered stale (24h in ms)
const PRICING_CACHE_STALE_MS = 24 * 60 * 60 * 1000;
// Max age before it's a hard warning (48h)
const PRICING_CACHE_WARN_MS = 48 * 60 * 60 * 1000;

/** Simple djb2 hash — works with any Unicode string */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function makeId(appointmentId: string, key: string): string {
  return `pqa_${djb2Hash(`pqa:${appointmentId}:${key}`)}`;
}

// ── QA 2 Price Field Validation ───────────────────────────────────────────

/**
 * Check that QA 2 / commission price fields are valid numbers or null.
 * NaN or Infinity must never reach the pricing engine.
 */
export function checkQA2PriceFields(
  appointmentId: string,
  priceFields: {
    qa2Price1?: number | null;
    qa2Price2?: number | null;
    qa2Price3?: number | null;
    qa2CommissionOverride?: number | null;
    qa2BonusAmount?: number | null;
  },
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  const fields: [string, number | null | undefined][] = [
    ['qa2Price1', priceFields.qa2Price1],
    ['qa2Price2', priceFields.qa2Price2],
    ['qa2Price3', priceFields.qa2Price3],
    ['qa2CommissionOverride', priceFields.qa2CommissionOverride],
    ['qa2BonusAmount', priceFields.qa2BonusAmount],
  ];

  for (const [field, value] of fields) {
    if (value === null || value === undefined) continue;
    if (!isFinite(value) || isNaN(value)) {
      findings.push({
        id: makeId(appointmentId, `qa2:${field}`),
        severity: 'blocking',
        category: 'pricing',
        source: 'pricing_qa',
        appointmentId,
        title: `QA Price field invalid: ${field}`,
        message: `The QA 2 price field "${field}" contains an invalid value (${value}). NaN and Infinity values will corrupt pricing calculations and API payloads.`,
        suggestedAction: `Clear or re-enter the value for "${field}". Use 0 or leave blank to exclude it.`,
        requiresApproval: true,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { field, value: String(value) },
      });
    } else if (value < 0) {
      findings.push({
        id: makeId(appointmentId, `qa2:neg:${field}`),
        severity: 'warning',
        category: 'pricing',
        source: 'pricing_qa',
        appointmentId,
        title: `QA Price field negative: ${field}`,
        message: `The QA 2 price field "${field}" is negative (${value.toFixed(2)}). Confirm this is an intended credit or adjustment.`,
        suggestedAction: `Review the value for "${field}" and confirm the negative amount is intentional.`,
        requiresApproval: false,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { field, value },
      });
    }
  }

  return findings;
}

// ── Dimension Source Check ────────────────────────────────────────────────

/**
 * Verify that pricing uses the adjusted (deducted) dimension, not the raw BT reading.
 * The raw reading is stored in LaserMeasurementCapture.rawValueText / normalizedInches.
 * The adjusted value is in MeasurementAdjustment.adjWidth / adjHeight.
 */
export function checkPricingDimensionSource(
  appointmentId: string,
  openings: {
    id: string;
    openingNumber?: number;
    width?: number | null;  // finalWidth (after deduction)
    height?: number | null; // finalHeight (after deduction)
    rawBtWidth?: number | null;   // raw BT capture (before deduction)
    rawBtHeight?: number | null;
  }[],
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  for (const op of openings) {
    const n = op.openingNumber ?? 0;
    const DEDUCTION = 3 / 8;

    // If stored finalWidth equals the raw BT reading exactly (no deduction applied)
    if (
      op.rawBtWidth != null && op.width != null &&
      Math.abs(op.width - op.rawBtWidth) < 0.01
    ) {
      findings.push({
        id: makeId(appointmentId, `dim:width:${op.id}`),
        severity: 'blocking',
        category: 'pricing',
        source: 'pricing_qa',
        appointmentId,
        openingId: op.id,
        openingNumber: n,
        title: `Opening ${n}: Raw Bluetooth width used for pricing`,
        message: `Opening ${n} final width (${op.width}") matches the raw Bluetooth reading. The 3/8" deduction appears not applied. ` +
          `Pricing must use adjusted width (${(op.rawBtWidth - DEDUCTION).toFixed(4)}"), not the raw reading.`,
        suggestedAction: `Re-open Opening ${n} measurement panel and apply the deduction rule.`,
        requiresApproval: true,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { field: 'width', rawBt: op.rawBtWidth, stored: op.width },
      });
    }

    if (
      op.rawBtHeight != null && op.height != null &&
      Math.abs(op.height - op.rawBtHeight) < 0.01
    ) {
      findings.push({
        id: makeId(appointmentId, `dim:height:${op.id}`),
        severity: 'blocking',
        category: 'pricing',
        source: 'pricing_qa',
        appointmentId,
        openingId: op.id,
        openingNumber: n,
        title: `Opening ${n}: Raw Bluetooth height used for pricing`,
        message: `Opening ${n} final height (${op.height}") matches the raw Bluetooth reading. The 3/8" deduction appears not applied.`,
        suggestedAction: `Re-open Opening ${n} measurement panel and apply the deduction rule.`,
        requiresApproval: true,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { field: 'height', rawBt: op.rawBtHeight, stored: op.height },
      });
    }
  }

  return findings;
}

// ── Pricing Staleness Check ───────────────────────────────────────────────

/**
 * Warn if the pricing cache is stale and final contract is being prepared.
 */
export function checkPricingCacheAge(
  appointmentId: string,
  pricingCachedAt: number | null | undefined,
): FieldIntelligenceFinding[] {
  if (!pricingCachedAt) return [];

  const ageMs = Date.now() - pricingCachedAt;
  if (ageMs < PRICING_CACHE_STALE_MS) return [];

  const ageHours = Math.round(ageMs / (60 * 60 * 1000));
  const severity = ageMs >= PRICING_CACHE_WARN_MS ? 'warning' : 'info';

  return [{
    id: makeId(appointmentId, `stale:${pricingCachedAt}`),
    severity,
    category: 'pricing',
    source: 'pricing_qa',
    appointmentId,
    title: `Pricing cached ${ageHours}h ago — may be stale`,
    message: `Pricing rules were last refreshed ${ageHours} hours ago. ` +
      (ageMs >= PRICING_CACHE_WARN_MS
        ? `Final contract pricing should be recalculated from fresh rules before signing.`
        : `Pricing appears recent, but online revalidation is recommended before contract.`),
    suggestedAction: `Go online and tap "Recalculate" to refresh pricing from the latest rules.`,
    requiresApproval: ageMs >= PRICING_CACHE_WARN_MS,
    status: 'open',
    createdAt: Date.now(),
    metadataJson: { cachedAt: pricingCachedAt, ageHours },
  }];
}

// ── Finance Option Missing ────────────────────────────────────────────────

export function checkFinanceOptionPresence(
  appointmentId: string,
  appointment: {
    financeOptionId?: string | null;
    totalAmount?: number | null;
    financeRequested?: boolean;
  },
): FieldIntelligenceFinding[] {
  if (!appointment.financeRequested) return [];
  if (appointment.financeOptionId) return [];

  return [{
    id: makeId(appointmentId, 'finance:missing'),
    severity: 'warning',
    category: 'pricing',
    source: 'pricing_qa',
    appointmentId,
    title: `Finance option not selected`,
    message: `Customer requested financing but no finance option has been selected. ` +
      `The monthly payment cannot be presented in the proposal without a finance option.`,
    suggestedAction: `Go to the Pricing tab → Finance Options and select the appropriate plan.`,
    requiresApproval: false,
    status: 'open',
    createdAt: Date.now(),
    metadataJson: {},
  }];
}

// ── Full Pricing Analysis ─────────────────────────────────────────────────

export function analyzePricing(
  appointmentId: string,
  data: {
    qa2PriceFields?: Parameters<typeof checkQA2PriceFields>[1];
    openings?: Parameters<typeof checkPricingDimensionSource>[1];
    pricingCachedAt?: number | null;
    financeOption?: Parameters<typeof checkFinanceOptionPresence>[1];
  },
): FieldIntelligenceFinding[] {
  return [
    ...(data.qa2PriceFields ? checkQA2PriceFields(appointmentId, data.qa2PriceFields) : []),
    ...(data.openings ? checkPricingDimensionSource(appointmentId, data.openings) : []),
    ...(data.pricingCachedAt !== undefined ? checkPricingCacheAge(appointmentId, data.pricingCachedAt) : []),
    ...(data.financeOption ? checkFinanceOptionPresence(appointmentId, data.financeOption) : []),
  ];
}
