// ═══════════════════════════════════════════════════════════════
// Rule Conflict Detector & Resolver
// Identifies contradictory validation warnings and recommends
// the safest resolution path for each conflict.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, WarningCategory } from './centralValidationOrchestrator';

// ── Conflict Types ──────────────────────────────────────────
export interface RuleConflict {
  id: string;
  conflictType: ConflictType;
  warningA: UnifiedWarning;
  warningB: UnifiedWarning;
  field: string;
  openingNumber?: number;
  description: string;
  resolution: ConflictResolution;
}

export type ConflictType =
  | 'grid_color'          // grid type vs. exterior color
  | 'grid_pattern'        // grid pattern vs. grid type
  | 'screen_product'      // screen type vs. product type
  | 'tempered_override'   // tempered required vs. customer decline
  | 'color_series'        // color vs. series availability
  | 'oriel_series'        // oriel size vs. series limits
  | 'specialty_trim'      // specialty trim vs. shape type
  | 'mull_size'           // mull combination vs. max size
  | 'mull_color'          // mull color mismatch
  | 'size_product'        // dimensions vs. product type constraints
  | 'pricing_discount'    // pricing conflict (discount vs. restriction)
  | 'generic';

export interface ConflictResolution {
  strategy: 'prefer_a' | 'prefer_b' | 'safest_config' | 'manual_review';
  recommendation: string;
  safestConfig: Record<string, any>;
  alternativeConfigs?: Array<{ label: string; config: Record<string, any>; risk: string }>;
  autoFixable: boolean;
}

// ── Conflict Pattern Definitions ────────────────────────────
interface ConflictPattern {
  type: ConflictType;
  /** Match: both warnings must satisfy their respective matcher */
  matchA: (w: UnifiedWarning) => boolean;
  matchB: (w: UnifiedWarning) => boolean;
  /** Must be same opening */
  sameOpening: boolean;
  /** Build the resolution */
  resolve: (a: UnifiedWarning, b: UnifiedWarning) => ConflictResolution;
  describe: (a: UnifiedWarning, b: UnifiedWarning) => string;
}

const CONFLICT_PATTERNS: ConflictPattern[] = [

  // ── Grid Type vs Exterior Color ───────────────────────────
  // Rule A: "Exterior color requires B1 grids"
  // Rule B: "Diamond pattern requires A1 grids"
  {
    type: 'grid_color',
    matchA: w => (w.category === 'grid' || w.category === 'color') && /B1|contour/i.test(w.detail),
    matchB: w => w.category === 'grid' && /A1|flat|diamond/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Grid conflict on #${a.openingNumber}: exterior color requires B1 contoured grids, but the selected pattern (diamond) requires A1 flat grids. These cannot coexist.`,
    resolve: () => ({
      strategy: 'safest_config',
      recommendation: 'Change grid pattern from Diamond to a B1-compatible pattern (Colonial, Prairie, or Perimeter). Exterior color cannot use A1 flat grids.',
      safestConfig: { gridType: 'B1', gridPattern: 'Colonial' },
      alternativeConfigs: [
        { label: 'Remove exterior color', config: { exteriorColor: 'White', gridType: 'A1', gridPattern: 'Diamond' }, risk: 'Loses exterior color — visible change from curb' },
        { label: 'Remove grids entirely', config: { gridStyle: 'None', gridType: undefined, gridPattern: undefined }, risk: 'Customer may want grids — verify' },
      ],
      autoFixable: true,
    }),
  },

  // ── Grid Type vs Series (L2000) ───────────────────────────
  {
    type: 'grid_pattern',
    matchA: w => w.category === 'grid' && /L2000|Fusion|must.*B1/i.test(w.detail),
    matchB: w => w.category === 'grid' && /A1|flat/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Grid conflict on #${a.openingNumber}: L2000/Fusion series only supports B1 contoured grids, but A1 flat is selected.`,
    resolve: () => ({
      strategy: 'prefer_a',
      recommendation: 'Change grid type to B1 Contoured. L2000/Fusion series cannot accept A1 flat grids due to frame profile design.',
      safestConfig: { gridType: 'B1' },
      autoFixable: true,
    }),
  },

  // ── Screen vs Product Type ────────────────────────────────
  // Rule A: "Picture window can't have screen"
  // Rule B: "Operable window should have screen" (estimator)
  {
    type: 'screen_product',
    matchA: w => w.category === 'screen' && /picture|cannot|can't/i.test(w.detail),
    matchB: w => w.category === 'screen' && /missing|no screen|should have/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Screen conflict on #${a.openingNumber}: one rule says this window can't have a screen, another suggests it should. Product type determines which is correct.`,
    resolve: (a) => ({
      strategy: 'prefer_a',
      recommendation: 'This is a picture window (fixed, non-operable). Screens are not applicable. Remove the screen suggestion.',
      safestConfig: { screenOption: 'No Screen' },
      autoFixable: true,
    }),
  },

  // ── Tempered Required vs Customer Override ────────────────
  {
    type: 'tempered_override',
    matchA: w => w.category === 'tempered' && w.severity === 'critical' && /required|code|must/i.test(w.detail),
    matchB: w => w.category === 'tempered' && /customer|decline|override|waive/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Tempered glass conflict on #${a.openingNumber}: building code requires tempered glass, but a customer override/decline is recorded. Code requirements cannot be waived.`,
    resolve: () => ({
      strategy: 'prefer_a',
      recommendation: 'Building code requirements supersede customer preferences. Tempered glass must be installed. The customer cannot waive safety code compliance.',
      safestConfig: { temperedGlass: 'full' },
      autoFixable: true,
    }),
  },

  // ── Color vs Series Availability ──────────────────────────
  {
    type: 'color_series',
    matchA: w => w.category === 'color' && /clay.*not.*available|not.*support.*clay/i.test(w.detail),
    matchB: w => w.category === 'color' && /clay.*select|vinyl.*clay/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Color conflict on #${a.openingNumber}: Clay vinyl is selected but not available in this series. Must change either the color or the series.`,
    resolve: () => ({
      strategy: 'safest_config',
      recommendation: 'Change vinyl color to White (compatible with all series), or switch to a series that supports Clay (3000/4000).',
      safestConfig: { vinylColor: 'White' },
      alternativeConfigs: [
        { label: 'Switch to 4000 Series', config: { seriesModel: '4000 Series' }, risk: 'Price may change' },
        { label: 'Switch to 3000 Series', config: { seriesModel: '3000 Series' }, risk: 'Price and features may change' },
      ],
      autoFixable: true,
    }),
  },

  // ── Oriel Size vs Series ──────────────────────────────────
  {
    type: 'oriel_series',
    matchA: w => w.category === 'specialty' && /oriel.*3000.*50|3000.*oriel.*max/i.test(w.detail),
    matchB: w => w.category === 'specialty' && /oriel.*size|oriel.*measurement/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Oriel conflict on #${a.openingNumber}: 3000 Series DH oriel exceeds the 50" maximum, but the oriel measurement is entered. Must change series to accommodate.`,
    resolve: () => ({
      strategy: 'safest_config',
      recommendation: 'Change to 03A0 Single Hung, which supports oriel sizes above 50". The 3000 Series DH balance system cannot handle the weight.',
      safestConfig: { seriesModel: '03A0 Single Hung' },
      autoFixable: true,
    }),
  },

  // ── Specialty Trim vs Shape Type ──────────────────────────
  {
    type: 'specialty_trim',
    matchA: w => w.category === 'specialty' && /trim.*required|bent.*trim|radius.*trim/i.test(w.detail),
    matchB: w => w.category === 'specialty' && /polygon|no.*trim|trim.*not/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Trim conflict on #${a.openingNumber}: one rule requires bent trim (for radius/arch shapes), another says trim is not needed (polygon shapes). Verify the actual shape type.`,
    resolve: () => ({
      strategy: 'manual_review',
      recommendation: 'Verify the shape type: Radius/arch shapes (circle top, quarter arch, eyebrow) require bent trim. Polygon shapes (octagon, trapezoid) do NOT require bent trim. Confirm with the homeowner.',
      safestConfig: { trimRequired: true },
      alternativeConfigs: [
        { label: 'Polygon — no trim needed', config: { trimRequired: false }, risk: 'If shape is actually radius, installation will be incomplete' },
      ],
      autoFixable: false,
    }),
  },

  // ── Mull Size Conflict ────────────────────────────────────
  {
    type: 'mull_size',
    matchA: w => (w.category === 'mull' || w.category === 'measurement') && /mull.*exceed|combined.*too.*large|mull.*max/i.test(w.detail),
    matchB: w => (w.category === 'mull' || w.category === 'measurement') && /mull.*struct|mull.*bar|reinforc/i.test(w.detail),
    sameOpening: false, // mulls span multiple openings
    describe: (a, b) => `Mull size conflict: the combined mulled unit exceeds maximum dimensions, but structural mull reinforcement is also flagged. The unit may be too large even with reinforcement.`,
    resolve: () => ({
      strategy: 'manual_review',
      recommendation: 'Review the combined mulled dimensions against manufacturer max UI chart. If the unit exceeds limits even with a structural mull bar, the openings must be split into separate frames.',
      safestConfig: {},
      alternativeConfigs: [
        { label: 'Split into separate frames', config: { mullGroup: undefined }, risk: 'Changes appearance — visible mull line becomes a frame-to-frame joint' },
        { label: 'Add structural mull bar', config: { structuralMull: true }, risk: 'Added cost. Still may not resolve if max UI is exceeded' },
      ],
      autoFixable: false,
    }),
  },

  // ── Mull Color Mismatch ───────────────────────────────────
  {
    type: 'mull_color',
    matchA: w => w.category === 'consistency' && /mull.*color|color.*mull/i.test(w.detail),
    matchB: w => w.category === 'color' && /different|mismatch/i.test(w.detail),
    sameOpening: false,
    describe: (a, b) => `Mull color conflict: mulled windows have different colors, creating a visible mismatch at the mull joint.`,
    resolve: () => ({
      strategy: 'safest_config',
      recommendation: 'All windows in a mull group must have the same interior and exterior color. Standardize colors across all mulled openings.',
      safestConfig: {},
      autoFixable: false,
    }),
  },

  // ── Size vs Product Type ──────────────────────────────────
  {
    type: 'size_product',
    matchA: w => w.category === 'measurement' && /min.*width|min.*height|too.*small/i.test(w.detail),
    matchB: w => w.category === 'measurement' && /max.*width|max.*height|too.*large|exceed/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Contradictory size warnings on #${a.openingNumber}: flagged as both too small AND too large. This likely indicates a measurement entry error or incorrect product type selection.`,
    resolve: () => ({
      strategy: 'manual_review',
      recommendation: 'Re-verify the field measurements. If dimensions are correct, the selected product type is wrong — choose a type that fits the measured size range.',
      safestConfig: {},
      autoFixable: false,
    }),
  },

  // ── Pricing Discount vs Restriction ───────────────────────
  {
    type: 'pricing_discount',
    matchA: w => w.category === 'pricing' && /no.*discount|not.*eligible|full.*price/i.test(w.detail),
    matchB: w => w.category === 'pricing' && /discount.*applied|80%|standard.*discount/i.test(w.detail),
    sameOpening: true,
    describe: (a, b) => `Pricing conflict on #${a.openingNumber}: one rule says this unit is not eligible for the standard discount, but the discount appears to be applied.`,
    resolve: () => ({
      strategy: 'prefer_a',
      recommendation: 'Remove the discount. Certain configurations (special shapes >84", SDL grids, structural mulls) are not eligible for the standard 80% discount per BTR pricing rules.',
      safestConfig: {},
      autoFixable: false,
    }),
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN DETECTOR
// ═══════════════════════════════════════════════════════════════
export function detectConflicts(warnings: UnifiedWarning[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const seen = new Set<string>();

  for (const pattern of CONFLICT_PATTERNS) {
    const matchesA = warnings.filter(w => pattern.matchA(w));
    const matchesB = warnings.filter(w => pattern.matchB(w));

    for (const a of matchesA) {
      for (const b of matchesB) {
        if (a.id === b.id) continue;

        // Same-opening check
        if (pattern.sameOpening && a.openingNumber !== b.openingNumber) continue;
        // Different-opening is ok for cross-opening patterns (mulls, consistency)

        const conflictId = [a.id, b.id].sort().join('::');
        if (seen.has(conflictId)) continue;
        seen.add(conflictId);

        conflicts.push({
          id: `conflict-${pattern.type}-${conflictId}`,
          conflictType: pattern.type,
          warningA: a,
          warningB: b,
          field: a.fieldPath || a.explanation?.affectedField || a.category,
          openingNumber: a.openingNumber,
          description: pattern.describe(a, b),
          resolution: pattern.resolve(a, b),
        });
      }
    }
  }

  return conflicts;
}

// ── Auto-resolve conflicts that are safe to fix ─────────────
export function autoResolveConflicts(
  openings: any[],
  conflicts: RuleConflict[],
): { updatedOpenings: any[]; resolved: RuleConflict[]; needsReview: RuleConflict[] } {
  let updated = openings.map(o => ({ ...o }));
  const resolved: RuleConflict[] = [];
  const needsReview: RuleConflict[] = [];

  for (const c of conflicts) {
    if (c.resolution.autoFixable && c.openingNumber !== undefined) {
      const idx = updated.findIndex(o => o.openingNumber === c.openingNumber);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...c.resolution.safestConfig };
        resolved.push(c);
      } else {
        needsReview.push(c);
      }
    } else {
      needsReview.push(c);
    }
  }

  return { updatedOpenings: updated, resolved, needsReview };
}

// ── Format conflict for UI display ──────────────────────────
export function formatConflictSummary(conflicts: RuleConflict[]): string[] {
  return conflicts.map(c => {
    const fix = c.resolution.autoFixable ? ' [Auto-fixable]' : ' [Manual review required]';
    return `⚡ ${c.conflictType.replace(/_/g, ' ').toUpperCase()}: ${c.description}${fix}`;
  });
}
