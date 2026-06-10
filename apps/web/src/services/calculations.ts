// ═══════════════════════════════════════════════════════════════
// Client-Side Calculations — Mirrors server calculationEngine.ts
// ═══════════════════════════════════════════════════════════════
//
// RULES:
// 1. These are the ONLY client-side calculation functions.
//    Do NOT inline math (width + height) anywhere else.
// 2. For server-authoritative calculations (pricing, profitability),
//    call the API via api.ts — do NOT reimplement here.
// 3. These exist for instant UI feedback; the server is the authority.
// ═══════════════════════════════════════════════════════════════

import type { UITier } from '../types';

// ─── UI Tiers (identical to server) ─────────────────────────
export const UI_TIERS: UITier[] = [
  { label: '0–70 UI', min: 0, max: 70, index: 0 },
  { label: '71–90 UI', min: 71, max: 90, index: 1 },
  { label: '91–110 UI', min: 91, max: 110, index: 2 },
  { label: '111–130 UI', min: 111, max: 130, index: 3 },
  { label: '131–150 UI', min: 131, max: 150, index: 4 },
  { label: '151+ UI', min: 151, max: Infinity, index: 5 },
];

/**
 * Calculate United Inches from width and height.
 * This is the ONLY place this calculation should exist client-side.
 */
export function calculateUI(width: number, height: number): number {
  return Math.round((width + height) * 100) / 100;
}

/**
 * Get the pricing tier for a given UI value.
 */
export function calculateUITier(ui: number): UITier {
  for (const tier of UI_TIERS) {
    if (ui >= tier.min && ui <= tier.max) return tier;
  }
  return UI_TIERS[UI_TIERS.length - 1];
}

/**
 * Calculate glass area in square feet from width/height in inches.
 */
export function calculateGlassArea(widthInches: number, heightInches: number): number {
  return Math.round((widthInches * heightInches) / 144 * 100) / 100;
}

/**
 * Calculate eyebrow rise (width / 6 is industry standard).
 */
export function calculateEyebrowRise(width: number): number {
  return Math.round((width / 6) * 100) / 100;
}

/**
 * Calculate leg height from total height minus rise.
 */
export function calculateLegHeight(totalHeight: number, rise: number): number {
  return Math.round((totalHeight - rise) * 100) / 100;
}

/**
 * Calculate half-round radius.
 */
export function calculateHalfRoundRadius(width: number): number {
  return Math.round((width / 2) * 100) / 100;
}

/**
 * Calculate oriel sash split.
 */
export function calculateOrielSplit(
  height: number,
  splitType: '1/3_over_2/3' | '2/3_over_1/3' | '1/2_over_1/2' | 'custom',
  customTopRatio?: number,
): { topSash: number; bottomSash: number } {
  let topRatio: number;
  switch (splitType) {
    case '1/3_over_2/3': topRatio = 1 / 3; break;
    case '2/3_over_1/3': topRatio = 2 / 3; break;
    case '1/2_over_1/2': topRatio = 0.5; break;
    case 'custom': topRatio = customTopRatio ?? 0.5; break;
    default: topRatio = 1 / 3;
  }
  const topSash = Math.round(height * topRatio * 8) / 8;
  const bottomSash = Math.round((height - topSash) * 8) / 8;
  return { topSash, bottomSash };
}

/**
 * Quick check: is tempered glass likely required?
 * For display-only in the UI. The server calculateTemperedRules is authoritative.
 */
export function quickTemperedCheck(ctx: {
  roomLocation?: string;
  tubOrShowerNearby?: boolean;
  distanceToTubInches?: number;
  bottomGlassHeightInches?: number;
  glassAreaSqft?: number;
  nearStairs?: boolean;
  nearDoor?: boolean;
  width?: number;
  height?: number;
}): { likely: boolean; reason?: string } {
  // Rule A: Tub/shower within 60"
  if (ctx.tubOrShowerNearby && (ctx.distanceToTubInches === undefined || ctx.distanceToTubInches <= 60)) {
    return { likely: true, reason: 'Within 60" of tub/shower' };
  }
  // Rule B: Low glass + large area
  const area = ctx.glassAreaSqft ?? (ctx.width && ctx.height ? calculateGlassArea(ctx.width, ctx.height) : 0);
  if ((ctx.bottomGlassHeightInches ?? 999) < 18 && area > 9) {
    return { likely: true, reason: 'Low glass + large area' };
  }
  // Rule C: Near stairs
  if (ctx.nearStairs) return { likely: true, reason: 'Near stairs/landing' };
  // Rule D: Near door
  if (ctx.nearDoor) return { likely: true, reason: 'Near door' };
  // Bathroom hint
  const room = (ctx.roomLocation || '').toLowerCase();
  if (room.match(/bath|shower/)) return { likely: false, reason: 'Bathroom — verify manually' };

  return { likely: false };
}

/**
 * Calculate mull group dimensions.
 */
export function calculateMullGroupDimensions(
  units: { width: number; height: number }[],
  mullBarWidth: number = 0.75,
): { totalWidth: number; totalHeight: number; combinedUI: number; perUnitUI: number[]; mullBars: number } {
  if (units.length === 0) return { totalWidth: 0, totalHeight: 0, combinedUI: 0, perUnitUI: [], mullBars: 0 };
  const mullBars = units.length - 1;
  const totalWidth = units.reduce((sum, u) => sum + u.width, 0) + mullBars * mullBarWidth;
  const totalHeight = Math.max(...units.map(u => u.height));
  const perUnitUI = units.map(u => calculateUI(u.width, u.height));
  const combinedUI = calculateUI(totalWidth, totalHeight);
  return { totalWidth, totalHeight, combinedUI, perUnitUI, mullBars };
}
