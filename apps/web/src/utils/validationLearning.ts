// ═══════════════════════════════════════════════════════════════
// Validation Learning System
// Aggregates warning outcomes across appointments to identify
// patterns: commonly overridden rules, frequent mistakes,
// remake causes, and coaching opportunities. Feeds back into
// confidence scoring and smart defaults.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedSeverity, WarningCategory } from './centralValidationOrchestrator';

// ── Outcome Tracking ────────────────────────────────────────
export type WarningOutcome = 'fixed' | 'overridden' | 'ignored' | 'escalated' | 'reappeared';

export interface WarningOutcomeRecord {
  warningId: string;              // rule ID pattern (e.g. 'pricing-SCR_PIC')
  rulePattern: string;            // normalized pattern for grouping
  category: WarningCategory;
  severity: UnifiedSeverity;
  outcome: WarningOutcome;
  timestamp: string;
  userId?: string;
  appointmentId: string;
  openingNumber?: number;
  overrideReason?: string;
  timeToResolveMs?: number;       // how long from appearance to resolution
  fieldPath?: string;
  previousValue?: any;
  fixedValue?: any;
}

// ── Aggregated Pattern Stats ────────────────────────────────
export interface RulePatternStats {
  rulePattern: string;
  category: WarningCategory;
  severity: UnifiedSeverity;
  totalOccurrences: number;
  outcomes: Record<WarningOutcome, number>;
  overrideRate: number;           // 0.0–1.0
  ignoreRate: number;
  fixRate: number;
  reappearanceRate: number;
  avgTimeToResolveMs: number;
  commonOverrideReasons: Array<{ reason: string; count: number }>;
  commonFixValues: Array<{ field: string; value: any; count: number }>;
  lastSeen: string;
  // Derived intelligence
  confidenceAdjustment: number;   // -0.3 to +0.3 — applied to base confidence
  suggestedSeverity?: UnifiedSeverity;
  coachingFlag: boolean;          // true if this pattern indicates a training gap
  coachingNote?: string;
}

// ── Rep Performance Profile ─────────────────────────────────
export interface RepProfile {
  userId: string;
  totalAppointments: number;
  totalWarnings: number;
  overrideCount: number;
  overrideRate: number;
  fixCount: number;
  fixRate: number;
  ignoreCount: number;
  avgTimeToResolveMs: number;
  commonMistakes: Array<{ rulePattern: string; count: number }>;
  strengths: string[];
  coachingAreas: string[];
  lastUpdated: string;
}

// ── Learning Database ───────────────────────────────────────
export interface LearningDatabase {
  version: number;
  outcomes: WarningOutcomeRecord[];
  patternStats: Record<string, RulePatternStats>;
  repProfiles: Record<string, RepProfile>;
  smartDefaults: Record<string, any>;
  lastUpdated: string;
  totalAppointments: number;
}

// ── Create empty database ───────────────────────────────────
export function createLearningDb(): LearningDatabase {
  return {
    version: 1,
    outcomes: [],
    patternStats: {},
    repProfiles: {},
    smartDefaults: {},
    lastUpdated: new Date().toISOString(),
    totalAppointments: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// RECORD OUTCOMES
// ═══════════════════════════════════════════════════════════════

export function recordOutcome(db: LearningDatabase, record: WarningOutcomeRecord): LearningDatabase {
  const updated = deepClone(db);
  updated.outcomes.push(record);

  // Update pattern stats
  const pattern = record.rulePattern;
  if (!updated.patternStats[pattern]) {
    updated.patternStats[pattern] = createEmptyStats(pattern, record.category);
  }
  const stats = updated.patternStats[pattern];
  stats.totalOccurrences++;
  stats.outcomes[record.outcome] = (stats.outcomes[record.outcome] || 0) + 1;
  stats.lastSeen = record.timestamp;

  if (record.overrideReason) {
    const existing = stats.commonOverrideReasons.find(r => r.reason === record.overrideReason);
    if (existing) existing.count++;
    else stats.commonOverrideReasons.push({ reason: record.overrideReason, count: 1 });
    stats.commonOverrideReasons.sort((a, b) => b.count - a.count);
  }

  if (record.outcome === 'fixed' && record.fieldPath && record.fixedValue !== undefined) {
    const key = `${record.fieldPath}:${record.fixedValue}`;
    const existing = stats.commonFixValues.find(f => `${f.field}:${f.value}` === key);
    if (existing) existing.count++;
    else stats.commonFixValues.push({ field: record.fieldPath, value: record.fixedValue, count: 1 });
    stats.commonFixValues.sort((a, b) => b.count - a.count);
  }

  if (record.timeToResolveMs !== undefined) {
    const prevTotal = stats.avgTimeToResolveMs * (stats.totalOccurrences - 1);
    stats.avgTimeToResolveMs = (prevTotal + record.timeToResolveMs) / stats.totalOccurrences;
  }

  // Recalculate rates
  recalcRates(stats);

  // Update rep profile
  if (record.userId) {
    updateRepProfile(updated, record);
  }

  updated.lastUpdated = record.timestamp;
  return updated;
}

export function recordAppointmentComplete(db: LearningDatabase): LearningDatabase {
  const updated = deepClone(db);
  updated.totalAppointments++;
  updated.lastUpdated = new Date().toISOString();
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// PATTERN ANALYSIS
// ═══════════════════════════════════════════════════════════════

export function analyzePatterns(db: LearningDatabase): void {
  for (const stats of Object.values(db.patternStats)) {
    recalcRates(stats);

    // ── Confidence adjustment ─────────────────────────────
    // High override rate → lower confidence (the rule fires but reps override it)
    // High fix rate → higher confidence (the rule fires and reps fix it)
    // High ignore rate → lower confidence (reps don't trust it)
    stats.confidenceAdjustment = 0;

    if (stats.totalOccurrences >= 5) {
      if (stats.overrideRate > 0.5) {
        stats.confidenceAdjustment = -0.2;  // frequently overridden → reduce trust
      } else if (stats.overrideRate > 0.3) {
        stats.confidenceAdjustment = -0.1;
      }

      if (stats.ignoreRate > 0.6) {
        stats.confidenceAdjustment = Math.min(stats.confidenceAdjustment, -0.15);
      }

      if (stats.fixRate > 0.8) {
        stats.confidenceAdjustment = 0.1;   // almost always fixed → very reliable
      }

      if (stats.reappearanceRate > 0.3) {
        stats.confidenceAdjustment = Math.max(stats.confidenceAdjustment, 0.05);
        stats.coachingFlag = true;
        stats.coachingNote = `This warning reappears ${(stats.reappearanceRate * 100).toFixed(0)}% of the time after being "fixed". Reps may need training on the root cause.`;
      }
    }

    // ── Severity suggestion ───────────────────────────────
    if (stats.totalOccurrences >= 10) {
      if (stats.overrideRate > 0.7 && stats.severity !== 'info') {
        stats.suggestedSeverity = 'info'; // almost always overridden → demote
      }
      if (stats.fixRate > 0.9 && stats.severity === 'info') {
        stats.suggestedSeverity = 'warning'; // info that's always fixed → promote
      }
    }

    // ── Coaching flags ────────────────────────────────────
    if (stats.totalOccurrences >= 3) {
      if (stats.ignoreRate > 0.5) {
        stats.coachingFlag = true;
        stats.coachingNote = stats.coachingNote || `Ignored ${(stats.ignoreRate * 100).toFixed(0)}% of the time. Consider: is this rule too aggressive, or do reps not understand its importance?`;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════

export function getTopOverriddenRules(db: LearningDatabase, limit = 10): RulePatternStats[] {
  return Object.values(db.patternStats)
    .filter(s => s.totalOccurrences >= 3)
    .sort((a, b) => b.overrideRate - a.overrideRate)
    .slice(0, limit);
}

export function getTopIgnoredRules(db: LearningDatabase, limit = 10): RulePatternStats[] {
  return Object.values(db.patternStats)
    .filter(s => s.totalOccurrences >= 3)
    .sort((a, b) => b.ignoreRate - a.ignoreRate)
    .slice(0, limit);
}

export function getFrequentMistakes(db: LearningDatabase, limit = 10): RulePatternStats[] {
  return Object.values(db.patternStats)
    .filter(s => s.totalOccurrences >= 3 && s.fixRate > 0.5)
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
    .slice(0, limit);
}

export function getRemakeCauses(db: LearningDatabase, limit = 10): RulePatternStats[] {
  // Reappearances + high fix rate = the thing keeps coming back = potential remake
  return Object.values(db.patternStats)
    .filter(s => s.reappearanceRate > 0.2 && s.totalOccurrences >= 3)
    .sort((a, b) => b.reappearanceRate - a.reappearanceRate)
    .slice(0, limit);
}

export function getCoachingOpportunities(db: LearningDatabase): RulePatternStats[] {
  return Object.values(db.patternStats)
    .filter(s => s.coachingFlag)
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

export function getConfidenceAdjustment(db: LearningDatabase, rulePattern: string): number {
  return db.patternStats[rulePattern]?.confidenceAdjustment || 0;
}

export function getSmartDefault(db: LearningDatabase, rulePattern: string, fieldPath: string): any | undefined {
  const stats = db.patternStats[rulePattern];
  if (!stats || stats.commonFixValues.length === 0) return undefined;
  const top = stats.commonFixValues.find(f => f.field === fieldPath);
  return top && top.count >= 3 ? top.value : undefined;
}

export function getRepProfile(db: LearningDatabase, userId: string): RepProfile | undefined {
  return db.repProfiles[userId];
}

// ═══════════════════════════════════════════════════════════════
// SMART DEFAULTS GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateSmartDefaults(db: LearningDatabase): Record<string, any> {
  const defaults: Record<string, any> = {};

  for (const [pattern, stats] of Object.entries(db.patternStats)) {
    if (stats.totalOccurrences < 5 || stats.fixRate < 0.6) continue;

    for (const fix of stats.commonFixValues) {
      if (fix.count >= 3) {
        const key = `${pattern}:${fix.field}`;
        defaults[key] = fix.value;
      }
    }
  }

  db.smartDefaults = defaults;
  return defaults;
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'ww_validation_learning';

export function saveLearningDb(db: LearningDatabase): void {
  try {
    // Trim to last 500 outcomes to stay within storage limits
    const trimmed = { ...db, outcomes: db.outcomes.slice(-500) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota — silent */ }
}

export function loadLearningDb(): LearningDatabase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════════

export function generateInsightsReport(db: LearningDatabase): string[] {
  const lines: string[] = [
    `═══ Validation Learning Insights ═══`,
    `Total appointments: ${db.totalAppointments}`,
    `Total outcomes tracked: ${db.outcomes.length}`,
    `Unique rule patterns: ${Object.keys(db.patternStats).length}`,
    '',
  ];

  const overridden = getTopOverriddenRules(db, 5);
  if (overridden.length > 0) {
    lines.push('── TOP OVERRIDDEN RULES (consider reducing severity) ──');
    for (const r of overridden) {
      lines.push(`  ${r.rulePattern}: ${(r.overrideRate * 100).toFixed(0)}% override rate (${r.totalOccurrences} occurrences)`);
      if (r.commonOverrideReasons[0]) {
        lines.push(`    Most common reason: "${r.commonOverrideReasons[0].reason}"`);
      }
    }
    lines.push('');
  }

  const mistakes = getFrequentMistakes(db, 5);
  if (mistakes.length > 0) {
    lines.push('── FREQUENT MISTAKES (high fix rate = real issues) ──');
    for (const m of mistakes) {
      lines.push(`  ${m.rulePattern}: ${(m.fixRate * 100).toFixed(0)}% fix rate, ${m.totalOccurrences} occurrences`);
    }
    lines.push('');
  }

  const remakes = getRemakeCauses(db, 5);
  if (remakes.length > 0) {
    lines.push('── POTENTIAL REMAKE CAUSES (high reappearance rate) ──');
    for (const r of remakes) {
      lines.push(`  ${r.rulePattern}: reappears ${(r.reappearanceRate * 100).toFixed(0)}% of the time`);
    }
    lines.push('');
  }

  const coaching = getCoachingOpportunities(db);
  if (coaching.length > 0) {
    lines.push('── COACHING OPPORTUNITIES ──');
    for (const c of coaching) {
      lines.push(`  ${c.rulePattern}: ${c.coachingNote || 'Needs review'}`);
    }
  }

  return lines;
}

// ── Internal helpers ────────────────────────────────────────

function createEmptyStats(pattern: string, category: WarningCategory): RulePatternStats {
  return {
    rulePattern: pattern,
    category,
    severity: 'warning',
    totalOccurrences: 0,
    outcomes: { fixed: 0, overridden: 0, ignored: 0, escalated: 0, reappeared: 0 },
    overrideRate: 0,
    ignoreRate: 0,
    fixRate: 0,
    reappearanceRate: 0,
    avgTimeToResolveMs: 0,
    commonOverrideReasons: [],
    commonFixValues: [],
    lastSeen: new Date().toISOString(),
    confidenceAdjustment: 0,
    coachingFlag: false,
  };
}

function recalcRates(stats: RulePatternStats): void {
  const total = stats.totalOccurrences || 1;
  stats.overrideRate = (stats.outcomes.overridden || 0) / total;
  stats.ignoreRate = (stats.outcomes.ignored || 0) / total;
  stats.fixRate = (stats.outcomes.fixed || 0) / total;
  stats.reappearanceRate = (stats.outcomes.reappeared || 0) / total;
}

function updateRepProfile(db: LearningDatabase, record: WarningOutcomeRecord): void {
  const userId = record.userId!;
  if (!db.repProfiles[userId]) {
    db.repProfiles[userId] = {
      userId,
      totalAppointments: 0,
      totalWarnings: 0,
      overrideCount: 0,
      overrideRate: 0,
      fixCount: 0,
      fixRate: 0,
      ignoreCount: 0,
      avgTimeToResolveMs: 0,
      commonMistakes: [],
      strengths: [],
      coachingAreas: [],
      lastUpdated: record.timestamp,
    };
  }

  const profile = db.repProfiles[userId];
  profile.totalWarnings++;
  profile.lastUpdated = record.timestamp;

  if (record.outcome === 'overridden') profile.overrideCount++;
  if (record.outcome === 'fixed') profile.fixCount++;
  if (record.outcome === 'ignored') profile.ignoreCount++;

  if (record.timeToResolveMs !== undefined) {
    const prevTotal = profile.avgTimeToResolveMs * (profile.totalWarnings - 1);
    profile.avgTimeToResolveMs = (prevTotal + record.timeToResolveMs) / profile.totalWarnings;
  }

  profile.overrideRate = profile.overrideCount / (profile.totalWarnings || 1);
  profile.fixRate = profile.fixCount / (profile.totalWarnings || 1);

  // Track common mistakes
  if (record.outcome === 'fixed') {
    const existing = profile.commonMistakes.find(m => m.rulePattern === record.rulePattern);
    if (existing) existing.count++;
    else profile.commonMistakes.push({ rulePattern: record.rulePattern, count: 1 });
    profile.commonMistakes.sort((a, b) => b.count - a.count);
  }

  // Derive strengths and coaching areas
  if (profile.totalWarnings >= 10) {
    profile.strengths = [];
    profile.coachingAreas = [];

    if (profile.fixRate > 0.8) profile.strengths.push('High fix rate — resolves issues quickly');
    if (profile.overrideRate < 0.1) profile.strengths.push('Rarely overrides — follows validation guidance');
    if (profile.avgTimeToResolveMs < 30000) profile.strengths.push('Fast resolution time');

    if (profile.overrideRate > 0.4) profile.coachingAreas.push('High override rate — may be bypassing important checks');
    if (profile.ignoreCount / (profile.totalWarnings || 1) > 0.3) profile.coachingAreas.push('Ignores warnings frequently — review validation understanding');
    if (profile.commonMistakes.length > 0 && profile.commonMistakes[0].count >= 5) {
      profile.coachingAreas.push(`Frequent mistake: ${profile.commonMistakes[0].rulePattern} (${profile.commonMistakes[0].count}x)`);
    }
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
