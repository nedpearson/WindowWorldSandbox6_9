// ═══════════════════════════════════════════════════════════════
// Fix Prioritization Engine
// Determines the optimal order to fix validation warnings,
// maps dependency chains between rules, and re-validates
// dependents when a fix is applied.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, UnifiedSeverity, WarningCategory, RecommendedFix } from './centralValidationOrchestrator';

// ── Fix Priority Tiers ──────────────────────────────────────
export type FixTier =
  | 'critical_blocker'      // 1. blocks submission — must fix first
  | 'measurement'           // 2. dimensions drive everything downstream
  | 'geometry'              // 3. shape/size validation
  | 'safety'                // 4. tempered / egress / code
  | 'pricing'               // 5. pricing rule violations
  | 'cosmetic';             // 6. consistency, suggestions, info

export interface PrioritizedFix {
  rank: number;               // 1-based, lower = fix first
  tier: FixTier;
  tierLabel: string;
  tierIcon: string;
  warning: UnifiedWarning;
  dependents: string[];       // warning IDs that may auto-resolve
  dependsOn: string[];        // warning IDs that should be fixed first
  estimatedImpact: number;    // how many other warnings this might resolve (0–N)
  isNextUp: boolean;          // true if this is the single "fix this first" item
  recommendedFix?: RecommendedFix;
  fixInstruction: string;     // plain-English "do this to fix it"
}

export interface FixPlan {
  fixes: PrioritizedFix[];
  nextUp: PrioritizedFix | null;
  totalFixable: number;
  totalAutoResolvable: number;
  tiers: Record<FixTier, PrioritizedFix[]>;
  summary: string;            // "Fix 3 critical blockers first, then 2 measurements..."
}

// ── Tier configuration ──────────────────────────────────────
interface TierConfig {
  tier: FixTier;
  label: string;
  icon: string;
  rank: number;     // base rank (lower = higher priority)
  categories: WarningCategory[];
  severityBoost: Partial<Record<UnifiedSeverity, number>>;  // negative = higher priority
}

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'critical_blocker', label: 'Critical Blockers', icon: '🛑', rank: 0,
    categories: [],  // matched by severity, not category
    severityBoost: {},
  },
  {
    tier: 'measurement', label: 'Measurement Issues', icon: '📏', rank: 100,
    categories: ['measurement', 'brick', 'order'],
    severityBoost: { critical: -50, high: -20 },
  },
  {
    tier: 'geometry', label: 'Geometry Issues', icon: '📐', rank: 200,
    categories: ['geometry', 'specialty', 'mull'],
    severityBoost: { critical: -50, high: -20 },
  },
  {
    tier: 'safety', label: 'Safety & Tempered', icon: '🛡️', rank: 300,
    categories: ['tempered', 'egress'],
    severityBoost: { critical: -100, high: -30 },
  },
  {
    tier: 'pricing', label: 'Pricing Issues', icon: '💰', rank: 400,
    categories: ['pricing', 'screen', 'grid', 'color'],
    severityBoost: { critical: -50, high: -10 },
  },
  {
    tier: 'cosmetic', label: 'Recommendations', icon: '✨', rank: 500,
    categories: ['consistency', 'sketch'],
    severityBoost: {},
  },
];

// ── Dependency map ──────────────────────────────────────────
// "If you fix category X, it may auto-resolve warnings in category Y"
const DEPENDENCY_CHAINS: Array<{ upstream: string[]; downstream: string[] }> = [
  // Fixing dimensions resolves downstream geometry, pricing, screen, grid, specialty checks
  { upstream: ['measurement', 'order'], downstream: ['geometry', 'pricing', 'screen', 'grid', 'specialty', 'mull', 'consistency'] },
  // Fixing product type resolves screen, grid, pricing, tempered
  { upstream: ['order'], downstream: ['screen', 'grid', 'pricing', 'tempered', 'geometry'] },
  // Fixing geometry resolves specialty, mull
  { upstream: ['geometry'], downstream: ['specialty', 'mull'] },
  // Fixing color resolves grid type (B1 requirement)
  { upstream: ['color'], downstream: ['grid'] },
  // Fixing tempered resolves egress
  { upstream: ['tempered'], downstream: ['egress'] },
  // Fixing screen resolves consistency
  { upstream: ['screen'], downstream: ['consistency'] },
  // Fixing grid resolves consistency
  { upstream: ['grid'], downstream: ['consistency'] },
];

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════
export function buildFixPlan(warnings: UnifiedWarning[]): FixPlan {
  // 1. Classify each warning into a tier
  const fixes: PrioritizedFix[] = warnings.map(w => {
    const tier = classifyTier(w);
    const config = TIER_CONFIGS.find(t => t.tier === tier)!;
    const score = computeFixScore(w, config);
    const dependents = findDependents(w, warnings);
    const dependsOn = findDependencies(w, warnings);

    return {
      rank: 0,  // filled after sort
      tier,
      tierLabel: config.label,
      tierIcon: config.icon,
      warning: w,
      dependents: dependents.map(d => d.id),
      dependsOn: dependsOn.map(d => d.id),
      estimatedImpact: dependents.length,
      isNextUp: false,
      recommendedFix: w.recommendedFix,
      fixInstruction: buildFixInstruction(w),
      _score: score,
    } as PrioritizedFix & { _score: number };
  });

  // 2. Sort by score (lower = fix first)
  fixes.sort((a, b) => (a as any)._score - (b as any)._score);

  // 3. Assign ranks and mark nextUp
  for (let i = 0; i < fixes.length; i++) {
    fixes[i].rank = i + 1;
    delete (fixes[i] as any)._score;
  }
  if (fixes.length > 0) fixes[0].isNextUp = true;

  // 4. Group by tier
  const tiers: Record<FixTier, PrioritizedFix[]> = {
    critical_blocker: [], measurement: [], geometry: [],
    safety: [], pricing: [], cosmetic: [],
  };
  for (const f of fixes) {
    tiers[f.tier].push(f);
  }

  // 5. Count auto-resolvable
  const autoResolvable = new Set<string>();
  for (const f of fixes) {
    for (const d of f.dependents) autoResolvable.add(d);
  }
  // Only count dependents that are actually in the warning set
  const warningIds = new Set(warnings.map(w => w.id));
  const totalAutoResolvable = [...autoResolvable].filter(id => warningIds.has(id)).length;

  // 6. Build summary
  const summary = buildSummary(tiers);

  return {
    fixes,
    nextUp: fixes[0] || null,
    totalFixable: fixes.length,
    totalAutoResolvable,
    tiers,
    summary,
  };
}

// ── Classify a warning into a fix tier ──────────────────────
function classifyTier(w: UnifiedWarning): FixTier {
  // Any critical blocker, regardless of category
  if (w.blocksSubmission && w.severity === 'critical') return 'critical_blocker';

  // Missing required fields (width, height, productCategory) are measurement
  if (w.id.startsWith('missing-width') || w.id.startsWith('missing-height')) return 'measurement';
  if (w.id.startsWith('missing-product')) return 'measurement';

  // Category-based classification
  for (const config of TIER_CONFIGS) {
    if (config.tier === 'critical_blocker') continue; // already handled
    if (config.categories.includes(w.category)) return config.tier;
  }

  // Default: cosmetic
  return 'cosmetic';
}

// ── Compute a sort score (lower = higher priority) ──────────
function computeFixScore(w: UnifiedWarning, config: TierConfig): number {
  let score = config.rank;

  // Severity weight
  const sevWeight: Record<UnifiedSeverity, number> = { critical: 0, high: 10, warning: 30, info: 50 };
  score += sevWeight[w.severity];

  // Severity boost from tier config
  score += config.severityBoost[w.severity] || 0;

  // Blocker bonus: push to top
  if (w.blocksSubmission) score -= 200;

  // Quick fix bonus: easier to resolve = more actionable
  if (w.recommendedFix) score -= 15;

  // Opening number: lower openings first (natural flow)
  if (w.openingNumber !== undefined) score += w.openingNumber * 0.1;

  return score;
}

// ── Find warnings that may auto-resolve if this one is fixed ─
function findDependents(w: UnifiedWarning, all: UnifiedWarning[]): UnifiedWarning[] {
  const deps: UnifiedWarning[] = [];
  for (const chain of DEPENDENCY_CHAINS) {
    if (chain.upstream.includes(w.category)) {
      for (const other of all) {
        if (other.id === w.id) continue;
        if (other.openingNumber !== w.openingNumber && w.openingNumber !== undefined) continue;
        if (chain.downstream.includes(other.category)) {
          deps.push(other);
        }
      }
    }
  }
  return deps;
}

// ── Find warnings that should be fixed before this one ──────
function findDependencies(w: UnifiedWarning, all: UnifiedWarning[]): UnifiedWarning[] {
  const deps: UnifiedWarning[] = [];
  for (const chain of DEPENDENCY_CHAINS) {
    if (chain.downstream.includes(w.category)) {
      for (const other of all) {
        if (other.id === w.id) continue;
        if (other.openingNumber !== w.openingNumber && w.openingNumber !== undefined) continue;
        if (chain.upstream.includes(other.category)) {
          deps.push(other);
        }
      }
    }
  }
  return deps;
}

// ── Build fix instruction from warning context ──────────────
function buildFixInstruction(w: UnifiedWarning): string {
  // Use explanation if available
  if (w.explanation?.howToFix) return w.explanation.howToFix;

  // Use suggestion if available
  if (w.suggestion) return w.suggestion;

  // Build from recommendedFix
  if (w.recommendedFix && w.recommendedFix.payload?.fields) {
    const fields = Object.entries(w.recommendedFix.payload.fields)
      .map(([k, v]) => `${k} → ${v}`).join(', ');
    return `Apply quick fix: ${fields}`;
  }

  // Fallback
  return `Review and resolve: ${w.detail}`;
}

// ── Build summary string ────────────────────────────────────
function buildSummary(tiers: Record<FixTier, PrioritizedFix[]>): string {
  const parts: string[] = [];
  const labels: [FixTier, string][] = [
    ['critical_blocker', 'critical blocker'],
    ['measurement', 'measurement issue'],
    ['geometry', 'geometry issue'],
    ['safety', 'safety issue'],
    ['pricing', 'pricing issue'],
    ['cosmetic', 'recommendation'],
  ];

  for (const [tier, singular] of labels) {
    const count = tiers[tier].length;
    if (count === 0) continue;
    parts.push(`${count} ${singular}${count > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) return 'No issues to fix — order is clean.';
  return `Fix ${parts.join(', then ')}.`;
}

// ═══════════════════════════════════════════════════════════════
// INCREMENTAL RE-VALIDATION
// After applying a fix, determine which warnings need re-check.
// ═══════════════════════════════════════════════════════════════
export function getInvalidatedCategories(fixedWarning: UnifiedWarning): WarningCategory[] {
  const invalidated = new Set<WarningCategory>();
  for (const chain of DEPENDENCY_CHAINS) {
    if (chain.upstream.includes(fixedWarning.category)) {
      for (const cat of chain.downstream) {
        invalidated.add(cat as WarningCategory);
      }
    }
  }
  // Always re-check the fixed category itself
  invalidated.add(fixedWarning.category);
  return [...invalidated];
}

export function shouldRevalidateAll(fixedWarning: UnifiedWarning): boolean {
  // Measurement fixes cascade everywhere — always re-validate all
  return fixedWarning.category === 'measurement' || fixedWarning.category === 'order'
    || fixedWarning.id.startsWith('missing-width') || fixedWarning.id.startsWith('missing-height')
    || fixedWarning.id.startsWith('missing-product');
}

// ── "What should I fix first?" helper ───────────────────────
export function getNextFix(warnings: UnifiedWarning[]): {
  fix: PrioritizedFix | null;
  message: string;
  remaining: number;
} {
  const plan = buildFixPlan(warnings);
  if (!plan.nextUp) {
    return { fix: null, message: '✅ All clear — no issues to fix.', remaining: 0 };
  }

  const f = plan.nextUp;
  const impact = f.estimatedImpact > 0
    ? ` Fixing this may also resolve ${f.estimatedImpact} other warning${f.estimatedImpact > 1 ? 's' : ''}.`
    : '';
  const message = `${f.tierIcon} Fix first: ${f.warning.title}. ${f.fixInstruction}${impact}`;

  return { fix: f, message, remaining: plan.totalFixable };
}
