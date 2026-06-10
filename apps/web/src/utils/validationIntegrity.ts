// ═══════════════════════════════════════════════════════════════
// Validation Integrity Checker
// Ensures no validation warnings are hidden, no data mismatches
// exist, and all warnings are visible, synchronized, actionable,
// and explainable. Runs as a post-validation pass.
// ═══════════════════════════════════════════════════════════════

import type {
  UnifiedWarning, ProjectValidationReport, WarningCategory,
} from './centralValidationOrchestrator';

// ── Integrity Issue Types ───────────────────────────────────
export type IntegrityIssueKind =
  | 'hidden_warning'         // warning exists but has no UI path to see it
  | 'silent_save_failure'    // data saved without validation running
  | 'sketch_order_mismatch' // sketch markers don't match order openings
  | 'stale_warning'         // warning references data that no longer exists
  | 'orphan_opening'        // opening with no sketch marker
  | 'orphan_marker'         // sketch marker with no opening
  | 'price_without_dims'    // opening has price but no valid dimensions
  | 'dims_without_product'  // opening has dimensions but no product type
  | 'unexplained_warning'   // warning has no explanation metadata
  | 'unactionable_warning'  // warning has no fix instruction or quick fix
  | 'suppressed_critical'   // critical warning hidden by intelligence
  | 'conflict_unresolved'   // detected conflict with no resolution path
  | 'blocker_without_detail'// submission blocker with empty/vague detail
  | 'duplicate_opening_num' // two openings share the same number
  | 'zero_price_complete'   // fully configured opening with $0 price
  | 'missing_sync_timestamp'; // validation timestamp is stale (>60s old)

export interface IntegrityIssue {
  kind: IntegrityIssueKind;
  severity: 'error' | 'warning' | 'info';
  message: string;
  context: Record<string, any>;
  recommendation: string;
}

export interface IntegrityReport {
  passed: boolean;
  issues: IntegrityIssue[];
  checks: IntegrityCheckResult[];
  timestamp: string;
  summary: string;
}

interface IntegrityCheckResult {
  name: string;
  passed: boolean;
  issueCount: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN CHECKER
// ═══════════════════════════════════════════════════════════════
export function runIntegrityCheck(
  report: ProjectValidationReport,
  openings: any[],
  markers: any[],
): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  const checks: IntegrityCheckResult[] = [];

  const run = (name: string, fn: () => IntegrityIssue[]) => {
    const found = fn();
    issues.push(...found);
    checks.push({ name, passed: found.length === 0, issueCount: found.length });
  };

  run('Sketch/Order Synchronization', () => checkSketchOrderSync(openings, markers));
  run('Opening Data Completeness', () => checkOpeningCompleteness(openings));
  run('Warning Explainability', () => checkWarningExplainability(report.warnings));
  run('Warning Actionability', () => checkWarningActionability(report.warnings));
  run('Suppressed Critical Audit', () => checkSuppressedCriticals(report));
  run('Blocker Detail Quality', () => checkBlockerDetails(report));
  run('Conflict Resolution Status', () => checkConflictResolution(report));
  run('Stale Warning Detection', () => checkStaleWarnings(report, openings));
  run('Duplicate Opening Numbers', () => checkDuplicateOpenings(openings));
  run('Validation Freshness', () => checkTimestamp(report));

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;

  return {
    passed: errorCount === 0,
    issues,
    checks,
    timestamp: new Date().toISOString(),
    summary: errorCount === 0 && warnCount === 0
      ? '✅ All integrity checks passed — no hidden failures.'
      : `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''} found.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL CHECKS
// ═══════════════════════════════════════════════════════════════

function checkSketchOrderSync(openings: any[], markers: any[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const openingNums = new Set(openings.map(o => o.openingNumber));
  const markerNums = new Set(
    markers.filter(m => m.markerNumber != null).map(m => m.markerNumber)
  );

  // Openings without markers
  for (const o of openings) {
    if (!markerNums.has(o.openingNumber)) {
      issues.push({
        kind: 'orphan_opening',
        severity: 'warning',
        message: `Opening #${o.openingNumber} has no sketch marker — it won't appear on the house sketch.`,
        context: { openingNumber: o.openingNumber },
        recommendation: 'Add a marker on the sketch canvas for this opening, or verify it was intentionally entered without a sketch reference.',
      });
    }
  }

  // Markers without openings
  for (const m of markers) {
    if (m.markerNumber != null && !openingNums.has(m.markerNumber)) {
      issues.push({
        kind: 'orphan_marker',
        severity: 'warning',
        message: `Sketch marker #${m.markerNumber} has no matching opening in the order form.`,
        context: { markerNumber: m.markerNumber },
        recommendation: 'Either create an opening for this marker or remove the marker from the sketch.',
      });
    }
  }

  // Count mismatch
  if (openings.length > 0 && markers.length > 0 && openings.length !== markers.filter(m => m.markerNumber != null).length) {
    issues.push({
      kind: 'sketch_order_mismatch',
      severity: 'warning',
      message: `Count mismatch: ${openings.length} openings vs ${markers.filter(m => m.markerNumber != null).length} sketch markers.`,
      context: { openingCount: openings.length, markerCount: markers.filter(m => m.markerNumber != null).length },
      recommendation: 'Ensure every opening has a corresponding sketch marker and vice versa.',
    });
  }

  return issues;
}

function checkOpeningCompleteness(openings: any[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const o of openings) {
    const n = o.openingNumber;

    // Price without dimensions
    if (o.totalPrice > 0 && (!o.width || !o.height)) {
      issues.push({
        kind: 'price_without_dims',
        severity: 'error',
        message: `Opening #${n} has a price ($${o.totalPrice}) but missing dimensions. The price cannot be accurate.`,
        context: { openingNumber: n, price: o.totalPrice, width: o.width, height: o.height },
        recommendation: 'Enter the measured width and height before finalizing the price.',
      });
    }

    // Dimensions without product type
    if (o.width > 0 && o.height > 0 && !o.productCategory) {
      issues.push({
        kind: 'dims_without_product',
        severity: 'error',
        message: `Opening #${n} has dimensions (${o.width}×${o.height}) but no product type selected.`,
        context: { openingNumber: n, width: o.width, height: o.height },
        recommendation: 'Select a product type (Double Hung, Slider, Picture, etc.) for this opening.',
      });
    }

    // Zero price on fully-configured opening
    if (o.width > 0 && o.height > 0 && o.productCategory && o.totalPrice === 0) {
      issues.push({
        kind: 'zero_price_complete',
        severity: 'error',
        message: `Opening #${n} is fully configured but has $0 price. Pricing may have failed silently.`,
        context: { openingNumber: n, product: o.productCategory },
        recommendation: 'Run pricing calculation or manually enter the price. A $0 price indicates a pricing engine failure.',
      });
    }
  }

  return issues;
}

function checkWarningExplainability(warnings: UnifiedWarning[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const w of warnings) {
    if (!w.explanation && (w.severity === 'critical' || w.severity === 'high')) {
      issues.push({
        kind: 'unexplained_warning',
        severity: 'warning',
        message: `${w.severity.toUpperCase()} warning "${w.title}" has no explainability metadata. The rep won't understand why this triggered.`,
        context: { warningId: w.id, severity: w.severity, title: w.title },
        recommendation: `Add an entry in ruleExplainability.ts for pattern "${w.id}" with whatIsWrong, whyItMatters, howToFix, and consequence.`,
      });
    }

    // Vague detail check
    const vaguePatterns = ['invalid configuration', 'error detected', 'issue found', 'check this'];
    if (vaguePatterns.some(p => w.detail.toLowerCase().includes(p))) {
      issues.push({
        kind: 'unexplained_warning',
        severity: 'warning',
        message: `Warning "${w.title}" has a vague detail: "${w.detail}". This is not actionable.`,
        context: { warningId: w.id, detail: w.detail },
        recommendation: 'Replace with a specific description: what is wrong, what values are involved, and what should be changed.',
      });
    }
  }

  return issues;
}

function checkWarningActionability(warnings: UnifiedWarning[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const w of warnings) {
    const hasAction = w.recommendedFix || w.suggestion || w.explanation?.howToFix;
    if (!hasAction && w.severity !== 'info') {
      issues.push({
        kind: 'unactionable_warning',
        severity: 'info',
        message: `Warning "${w.title}" has no quick fix, suggestion, or howToFix instruction.`,
        context: { warningId: w.id, severity: w.severity },
        recommendation: 'Add a recommendedFix, suggestion, or howToFix in the rule explainability registry.',
      });
    }
  }

  return issues;
}

function checkSuppressedCriticals(report: ProjectValidationReport): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // Check if intelligence suppressed any critical warnings
  if (report.intelligence.suppressed > 0) {
    // We can't access suppressed warnings directly from the report (they're filtered out),
    // but we can check if the intelligence pipeline removed criticals by comparing counts
    const visibleCriticals = report.counts.critical;
    // If intelligence total > visible + suppressed doesn't add up, flag it
    if (report.intelligence.total > report.intelligence.visible && visibleCriticals === 0 && report.intelligence.suppressed > 0) {
      issues.push({
        kind: 'suppressed_critical',
        severity: 'info',
        message: `Intelligence pipeline suppressed ${report.intelligence.suppressed} warning(s). Verify none are critical safety issues.`,
        context: { suppressed: report.intelligence.suppressed, visible: report.intelligence.visible },
        recommendation: 'Review the intelligence pipeline suppression rules if this appointment has safety-critical openings.',
      });
    }
  }

  return issues;
}

function checkBlockerDetails(report: ProjectValidationReport): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const blocker of report.submissionBlockers) {
    if (!blocker || blocker.length < 10) {
      issues.push({
        kind: 'blocker_without_detail',
        severity: 'error',
        message: `Submission blocker has insufficient detail: "${blocker || '(empty)'}". The rep cannot understand what to fix.`,
        context: { blocker },
        recommendation: 'Ensure every submission blocker has a clear, specific detail string explaining what needs to change.',
      });
    }
  }

  return issues;
}

function checkConflictResolution(report: ProjectValidationReport): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const c of report.conflicts) {
    if (c.resolution.strategy === 'manual_review' && !c.resolution.autoFixable) {
      issues.push({
        kind: 'conflict_unresolved',
        severity: 'warning',
        message: `Rule conflict "${c.conflictType}" requires manual review: ${c.description.slice(0, 100)}`,
        context: { conflictId: c.id, type: c.conflictType, opening: c.openingNumber },
        recommendation: c.resolution.recommendation,
      });
    }
  }

  return issues;
}

function checkStaleWarnings(report: ProjectValidationReport, openings: any[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const openingNums = new Set(openings.map(o => o.openingNumber));

  for (const w of report.warnings) {
    if (w.openingNumber !== undefined && !openingNums.has(w.openingNumber)) {
      issues.push({
        kind: 'stale_warning',
        severity: 'error',
        message: `Warning "${w.title}" references opening #${w.openingNumber} which no longer exists. This is a stale warning.`,
        context: { warningId: w.id, openingNumber: w.openingNumber },
        recommendation: 'Re-run validation to clear stale warnings. The opening may have been deleted.',
      });
    }
  }

  return issues;
}

function checkDuplicateOpenings(openings: any[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const seen = new Map<number, number>();

  for (const o of openings) {
    const n = o.openingNumber;
    if (seen.has(n)) {
      issues.push({
        kind: 'duplicate_opening_num',
        severity: 'error',
        message: `Duplicate opening number #${n} found. Two openings share the same number, which will cause data corruption.`,
        context: { openingNumber: n },
        recommendation: 'Renumber one of the duplicate openings to ensure each has a unique number.',
      });
    }
    seen.set(n, (seen.get(n) || 0) + 1);
  }

  return issues;
}

function checkTimestamp(report: ProjectValidationReport): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const age = Date.now() - report.timestamp;
  const maxAge = 60_000; // 60 seconds

  if (age > maxAge) {
    issues.push({
      kind: 'missing_sync_timestamp',
      severity: 'warning',
      message: `Validation report is ${Math.round(age / 1000)}s old. Data may have changed since last validation.`,
      context: { ageMs: age, timestamp: report.timestamp },
      recommendation: 'Trigger a re-validation to ensure warnings reflect current data.',
    });
  }

  return issues;
}
