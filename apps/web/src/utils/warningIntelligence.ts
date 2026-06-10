// ═══════════════════════════════════════════════════════════════
// Warning Intelligence — False Positive Prevention
// Post-processing pipeline that scores, deduplicates, suppresses,
// groups, and prioritizes warnings to eliminate noise.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, UnifiedSeverity, WarningCategory } from './centralValidationOrchestrator';

// ── Confidence & Intelligence Metadata ──────────────────────
export interface WarningIntelligence {
  confidence: number;          // 0.0–1.0
  confidenceLabel: string;     // 'certain' | 'high' | 'medium' | 'low'
  suppressed: boolean;
  suppressReason?: string;
  groupId?: string;            // warnings with same groupId are collapsed
  groupLabel?: string;
  priority: number;            // 0 = highest priority
  duplicateOf?: string;        // ID of the primary warning this duplicates
  contextNotes?: string;       // explains why confidence was adjusted
}

// ── Attach intelligence to warning ──────────────────────────
export type EnrichedWarning = UnifiedWarning & { intelligence: WarningIntelligence };

// ── Confidence label helper ─────────────────────────────────
function confidenceLabel(c: number): string {
  if (c >= 0.95) return 'certain';
  if (c >= 0.75) return 'high';
  if (c >= 0.50) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════
export function applyWarningIntelligence(
  warnings: UnifiedWarning[],
  openings: any[],
  opts: { maxVisibleWarnings?: number; suppressLowConfidence?: boolean } = {},
): EnrichedWarning[] {
  const { maxVisibleWarnings = 25, suppressLowConfidence = true } = opts;

  let enriched: EnrichedWarning[] = warnings.map(w => ({
    ...w,
    intelligence: {
      confidence: computeBaseConfidence(w),
      confidenceLabel: 'high',
      suppressed: false,
      priority: 0,
    },
  }));

  // Pipeline steps (order matters)
  enriched = applyContextualConfidence(enriched, openings);
  enriched = applySemanticDedup(enriched);
  enriched = applyConflictResolution(enriched);
  enriched = applyContextualSuppression(enriched, openings);
  enriched = applyGrouping(enriched);
  enriched = applyPrioritization(enriched);

  // Suppress low-confidence warnings presented as critical
  if (suppressLowConfidence) {
    enriched = demoteLowConfidenceCriticals(enriched);
  }

  // Update confidence labels
  for (const w of enriched) {
    w.intelligence.confidenceLabel = confidenceLabel(w.intelligence.confidence);
  }

  // Cap visible warnings to prevent overwhelm
  let visible = enriched.filter(w => !w.intelligence.suppressed);
  const suppressed = enriched.filter(w => w.intelligence.suppressed);

  if (visible.length > maxVisibleWarnings) {
    // Keep all critical/high, suppress excess info/warning
    const mustShow = visible.filter(w => w.severity === 'critical' || w.severity === 'high');
    const canSuppress = visible.filter(w => w.severity !== 'critical' && w.severity !== 'high');
    const remaining = maxVisibleWarnings - mustShow.length;
    const kept = canSuppress.slice(0, Math.max(0, remaining));
    const overflowSuppressed = canSuppress.slice(Math.max(0, remaining));
    for (const w of overflowSuppressed) {
      w.intelligence.suppressed = true;
      w.intelligence.suppressReason = `Suppressed to reduce noise (${visible.length} total, showing top ${maxVisibleWarnings})`;
    }
    visible = [...mustShow, ...kept];
  }

  return enriched;
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: Base Confidence Scoring
// ═══════════════════════════════════════════════════════════════
function computeBaseConfidence(w: UnifiedWarning): number {
  // Source-based confidence
  const sourceConf: Record<string, number> = {
    pricingValidation: 0.98,   // BTR book rules are definitive
    safetyGlazing: 0.85,       // rule-based but depends on field conditions
    businessRules: 0.95,       // explicit rule triggers
    openingValidation: 0.90,   // missing field checks are reliable
    measurementRules: 0.92,    // spec-based
    seniorEstimator: 0.65,     // heuristic/statistical — higher false positive rate
    sketchSync: 0.80,          // depends on sketch completeness
  };
  let conf = sourceConf[w.source] ?? 0.70;

  // Severity-based adjustment: critical from estimator should be lower confidence
  if (w.source === 'seniorEstimator' && w.severity === 'critical') conf *= 0.85;
  // Info-level from estimator are suggestions, not facts
  if (w.source === 'seniorEstimator' && (w.severity === 'info' || w.severity === 'warning')) conf *= 0.75;

  // "Suggestion" category words lower confidence
  if (w.detail.includes('Intentional?') || w.detail.includes('Verify') || w.detail.includes('unusual')) {
    conf *= 0.80;
  }

  return Math.round(conf * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Contextual Confidence Adjustment
// ═══════════════════════════════════════════════════════════════
function applyContextualConfidence(warnings: EnrichedWarning[], openings: any[]): EnrichedWarning[] {
  for (const w of warnings) {
    // Whole-inch warning on openings < 3 is likely noise (small job, rep is being careful)
    if (w.id.includes('typo-whole') && openings.length <= 2) {
      w.intelligence.confidence *= 0.5;
      w.intelligence.contextNotes = 'Small job — whole-inch warning less relevant';
    }

    // "Perfectly square" is common for picture windows
    if (w.id.includes('typo-square') && w.detail.includes('picture')) {
      w.intelligence.confidence *= 0.4;
      w.intelligence.contextNotes = 'Square picture windows are common';
    }

    // Room inconsistency on jobs with 1-2 openings per room is noise
    if (w.id.includes('room-') && w.category === 'consistency') {
      const openingNums = w.detail.match(/#\d+/g) || [];
      if (openingNums.length <= 2) {
        w.intelligence.confidence *= 0.7;
      }
    }

    // Missing elevation on a 1-opening job is minor
    if (w.id.includes('missing-elev') && openings.length <= 2) {
      w.intelligence.confidence *= 0.5;
      w.intelligence.contextNotes = 'Single-opening job — elevation less critical';
    }

    // Price anomaly with < 5 openings: not enough data for statistical checks
    if ((w.id.includes('price-high') || w.id.includes('price-low')) && openings.length < 5) {
      w.intelligence.confidence *= 0.4;
      w.intelligence.contextNotes = 'Too few openings for reliable price comparison — treating as advisory';
    }

    // Risk factor "No pricing" when job is still in early data entry
    if (w.id.includes('risk') && w.detail.includes('No pricing') && openings.some(o => !o.totalPrice)) {
      w.intelligence.confidence *= 0.3;
      w.intelligence.contextNotes = 'Pricing not yet entered — risk factor will clear once prices are set';
    }

    // Grid/screen consistency on jobs with < 4 openings is noise
    if ((w.id.includes('room-grid') || w.id.includes('scr-missing')) && openings.length < 4) {
      w.intelligence.confidence *= 0.6;
      w.intelligence.contextNotes = 'Small job — consistency checks are less meaningful';
    }

    // "Different product types" in same room is very common (e.g., DH + picture combo)
    if (w.id.includes('room-type')) {
      w.intelligence.confidence *= 0.5;
      w.intelligence.contextNotes = 'Mixed product types per room is a common design choice';
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: Semantic Deduplication
// ═══════════════════════════════════════════════════════════════
function applySemanticDedup(warnings: EnrichedWarning[]): EnrichedWarning[] {
  // Group warnings that say the same thing about the same opening from different engines
  const byOpField: Record<string, EnrichedWarning[]> = {};

  for (const w of warnings) {
    if (w.openingNumber === undefined) continue;
    // Create a semantic key: opening + category + affected field
    const field = w.fieldPath || w.explanation?.affectedField || w.category;
    const key = `${w.openingNumber}:${w.category}:${field}`;
    if (!byOpField[key]) byOpField[key] = [];
    byOpField[key].push(w);
  }

  for (const [, group] of Object.entries(byOpField)) {
    if (group.length <= 1) continue;

    // Keep the highest-confidence warning, suppress duplicates
    group.sort((a, b) => b.intelligence.confidence - a.intelligence.confidence);
    const primary = group[0];
    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      // Only suppress if titles/details are semantically similar
      if (isSemanticallyDuplicate(primary, dup)) {
        dup.intelligence.suppressed = true;
        dup.intelligence.suppressReason = `Duplicate of "${primary.title}" (${primary.source} has higher confidence)`;
        dup.intelligence.duplicateOf = primary.id;
      }
    }
  }

  return warnings;
}

function isSemanticallyDuplicate(a: EnrichedWarning, b: EnrichedWarning): boolean {
  // Same category, same opening, similar detail
  if (a.category !== b.category) return false;
  if (a.openingNumber !== b.openingNumber) return false;

  // Check for overlapping keywords
  const aWords = new Set(a.detail.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const bWords = new Set(b.detail.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  let overlap = 0;
  for (const w of aWords) { if (bWords.has(w)) overlap++; }
  const similarity = overlap / Math.max(aWords.size, bWords.size, 1);

  return similarity > 0.4;
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: Conflict Resolution
// ═══════════════════════════════════════════════════════════════
function applyConflictResolution(warnings: EnrichedWarning[]): EnrichedWarning[] {
  for (const w of warnings) {
    if (w.intelligence.suppressed) continue;

    // Conflict: "no screen" suggestion on a picture window that CAN'T have a screen
    if (w.id.includes('scr-missing') && w.openingNumber !== undefined) {
      const screenBlock = warnings.find(
        o => o.openingNumber === w.openingNumber && o.id.includes('SCR_PIC') && !o.intelligence.suppressed
      );
      if (screenBlock) {
        w.intelligence.suppressed = true;
        w.intelligence.suppressReason = 'Suppressed: picture window cannot have a screen, so "missing screen" is irrelevant';
      }
    }

    // Conflict: "unusual dimension" on a window already flagged as "too small" or "too large"
    if (w.id.includes('dim-') && w.source === 'seniorEstimator') {
      const geoBlock = warnings.find(
        o => o.openingNumber === w.openingNumber
          && (o.id.includes('geo-small') || o.id.includes('geo-big') || o.id.includes('SZ_MIN') || o.id.includes('SZ_MAX'))
          && !o.intelligence.suppressed
      );
      if (geoBlock) {
        w.intelligence.suppressed = true;
        w.intelligence.suppressReason = 'Suppressed: already flagged as a size violation by a more specific rule';
      }
    }

    // Conflict: "mixed colors" + "color outlier" on same set of openings
    if (w.id.includes('color-ext-outlier')) {
      const roomColor = warnings.find(
        o => o.id.includes('room-color') && !o.intelligence.suppressed
      );
      if (roomColor) {
        w.intelligence.suppressed = true;
        w.intelligence.suppressReason = 'Suppressed: room-level color warning already covers this';
        w.intelligence.duplicateOf = roomColor.id;
      }
    }

    // Conflict: "whole inch" warning on an opening already missing dimensions
    if (w.id.includes('typo-whole') && w.openingNumber !== undefined) {
      const missingDim = warnings.find(
        o => o.openingNumber === w.openingNumber
          && (o.id.includes('missing-width') || o.id.includes('missing-height'))
          && !o.intelligence.suppressed
      );
      if (missingDim) {
        w.intelligence.suppressed = true;
        w.intelligence.suppressReason = 'Suppressed: dimensions are missing — typo check irrelevant';
      }
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: Contextual Suppression
// ═══════════════════════════════════════════════════════════════
function applyContextualSuppression(warnings: EnrichedWarning[], openings: any[]): EnrichedWarning[] {
  const hasAnyDimensions = openings.some(o => o.width > 0 && o.height > 0);

  for (const w of warnings) {
    if (w.intelligence.suppressed) continue;

    // Suppress all dimension-related warnings if NO openings have dimensions yet
    if (!hasAnyDimensions && (w.category === 'measurement' || w.category === 'geometry' || w.category === 'consistency')) {
      if (w.source === 'seniorEstimator') {
        w.intelligence.suppressed = true;
        w.intelligence.suppressReason = 'Suppressed: no openings have dimensions yet — estimator checks are premature';
      }
    }

    // Suppress price anomalies when no prices exist
    const pricedCount = openings.filter(o => (o.totalPrice || 0) > 0).length;
    if (w.category === 'pricing' && w.source === 'seniorEstimator' && pricedCount < 3) {
      w.intelligence.suppressed = true;
      w.intelligence.suppressReason = 'Suppressed: fewer than 3 priced openings — price comparison unreliable';
    }

    // Suppress sketch warnings during early data entry (< 2 openings)
    if (w.category === 'sketch' && w.id.includes('missing_front_door') && openings.length === 0) {
      w.intelligence.suppressed = true;
      w.intelligence.suppressReason = 'Suppressed: no openings yet — sketch not started';
    }

    // Suppress low confidence (< 0.4) non-critical warnings
    if (w.intelligence.confidence < 0.4 && w.severity !== 'critical') {
      w.intelligence.suppressed = true;
      w.intelligence.suppressReason = `Suppressed: low confidence (${(w.intelligence.confidence * 100).toFixed(0)}%)`;
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: Grouping
// ═══════════════════════════════════════════════════════════════
function applyGrouping(warnings: EnrichedWarning[]): EnrichedWarning[] {
  // Group same-category warnings on the same opening
  for (const w of warnings) {
    if (w.intelligence.suppressed) continue;
    if (w.openingNumber !== undefined) {
      w.intelligence.groupId = `${w.openingNumber}:${w.category}`;
      w.intelligence.groupLabel = `Opening #${w.openingNumber} — ${w.category}`;
    }
  }

  // Group all tempered warnings into a single "Tempered Glass Review" group
  const temperedWarnings = warnings.filter(w => w.category === 'tempered' && !w.intelligence.suppressed);
  if (temperedWarnings.length >= 3) {
    for (const w of temperedWarnings) {
      w.intelligence.groupId = 'tempered-review';
      w.intelligence.groupLabel = `Tempered Glass Review (${temperedWarnings.length} openings)`;
    }
  }

  // Group all consistency warnings
  const consistencyWarnings = warnings.filter(w => w.category === 'consistency' && !w.intelligence.suppressed);
  if (consistencyWarnings.length >= 2) {
    for (const w of consistencyWarnings) {
      w.intelligence.groupId = 'consistency-review';
      w.intelligence.groupLabel = `Consistency Review (${consistencyWarnings.length} items)`;
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// STEP 7: Prioritization
// ═══════════════════════════════════════════════════════════════
function applyPrioritization(warnings: EnrichedWarning[]): EnrichedWarning[] {
  const sevWeight: Record<UnifiedSeverity, number> = { critical: 0, high: 100, warning: 200, info: 300 };
  const sourceWeight: Record<string, number> = {
    pricingValidation: 0,     // most actionable
    measurementRules: 5,
    safetyGlazing: 10,
    businessRules: 15,
    openingValidation: 20,
    sketchSync: 30,
    seniorEstimator: 50,       // least urgent (heuristic)
  };

  for (const w of warnings) {
    if (w.intelligence.suppressed) {
      w.intelligence.priority = 9999;
      continue;
    }

    let priority = sevWeight[w.severity] ?? 200;
    priority += sourceWeight[w.source] ?? 25;

    // Boost priority for blockers
    if (w.blocksSubmission) priority -= 50;

    // Lower priority for low-confidence
    if (w.intelligence.confidence < 0.6) priority += 100;

    // Boost priority for warnings with quick fixes (more actionable)
    if (w.recommendedFix) priority -= 20;

    w.intelligence.priority = Math.max(0, priority);
  }

  // Sort by priority (lower = more important)
  warnings.sort((a, b) => a.intelligence.priority - b.intelligence.priority);

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// STEP 8: Demote Low-Confidence Criticals
// ═══════════════════════════════════════════════════════════════
function demoteLowConfidenceCriticals(warnings: EnrichedWarning[]): EnrichedWarning[] {
  for (const w of warnings) {
    // A "critical" from the senior estimator with low confidence should NOT block submission
    if (w.severity === 'critical' && w.intelligence.confidence < 0.6 && w.source === 'seniorEstimator') {
      w.severity = 'warning';
      w.blocksSubmission = false;
      w.intelligence.contextNotes = (w.intelligence.contextNotes || '') +
        ' Demoted from critical to warning due to low confidence from heuristic engine.';
    }

    // Safety glazing with < 0.5 confidence should not block
    if (w.severity === 'critical' && w.intelligence.confidence < 0.5 && w.source === 'safetyGlazing') {
      w.severity = 'high';
      w.blocksSubmission = false;
      w.intelligence.contextNotes = (w.intelligence.contextNotes || '') +
        ' Demoted from critical to high: safety rule fired with low confidence — needs manual review.';
    }
  }

  return warnings;
}

// ── Summary stats ───────────────────────────────────────────
export function getIntelligenceSummary(warnings: EnrichedWarning[]): {
  total: number;
  visible: number;
  suppressed: number;
  byConfidence: Record<string, number>;
  avgConfidence: number;
  groupCount: number;
} {
  const visible = warnings.filter(w => !w.intelligence.suppressed);
  const suppressed = warnings.filter(w => w.intelligence.suppressed);
  const byConfidence: Record<string, number> = { certain: 0, high: 0, medium: 0, low: 0 };
  let confSum = 0;

  for (const w of warnings) {
    byConfidence[w.intelligence.confidenceLabel] = (byConfidence[w.intelligence.confidenceLabel] || 0) + 1;
    confSum += w.intelligence.confidence;
  }

  const groups = new Set(visible.map(w => w.intelligence.groupId).filter(Boolean));

  return {
    total: warnings.length,
    visible: visible.length,
    suppressed: suppressed.length,
    byConfidence,
    avgConfidence: warnings.length > 0 ? Math.round((confSum / warnings.length) * 100) : 0,
    groupCount: groups.size,
  };
}
