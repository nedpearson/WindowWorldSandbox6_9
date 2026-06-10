// ═══════════════════════════════════════════════════════════════
// Pre-Submission Sweep — Complete project-wide validation
// Runs before proposal finalization or order submission.
// Merges centralValidationOrchestrator + validationEngine into
// a single readiness report with score, blockers, and fixes.
// ═══════════════════════════════════════════════════════════════

import { runFullValidation, type ProjectValidationReport, type UnifiedWarning } from './centralValidationOrchestrator';
import { getUnresolvedBlockers, getApprovedReviews, getReviewSummary } from './managerReview';
import type { SketchMarkerData, MarkerGroupData } from './sketchSync';
import type { OpeningSafetyReview } from './safetyGlazingRules';

// ── Types ────────────────────────────────────────────────────

export interface SweepCheckpoint {
  id: string;
  category: SweepCategory;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  severity: 'critical' | 'high' | 'warning' | 'info';
  detail: string;
  openingNumber?: number;
  /** If true, blocks submission unless manager-approved */
  blocksSubmission: boolean;
  /** Has a manager approved this specific issue? */
  managerApproved: boolean;
  /** Recommended fix action (legacy string) */
  fix?: string;
  /** Structured fix action for routing */
  fixAction?: {
    type: string;
    route?: string;
    tab?: string;
    section?: string;
    field?: string;
    openingId?: string;
    openingNumber?: number;
    markerId?: string;
    query?: Record<string, string>;
    instruction?: string;
  };
}

export type SweepCategory =
  | 'openings' | 'measurements' | 'specialty' | 'pricing'
  | 'mull' | 'tempered' | 'screen' | 'grid' | 'notes'
  | 'photos' | 'depth' | 'sketch' | 'contract' | 'signatures';

export interface ReadinessReport {
  /** Overall readiness 0-100 */
  score: number;
  /** Human-readable grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Ready for submission? */
  ready: boolean;
  /** All checkpoints */
  checkpoints: SweepCheckpoint[];
  /** Grouped by category */
  byCategory: Record<string, SweepCheckpoint[]>;
  /** Counts */
  counts: { total: number; pass: number; fail: number; warn: number; skip: number };
  /** Unresolved critical blockers (after manager approvals) */
  unresolvedCriticals: SweepCheckpoint[];
  /** Unresolved warnings */
  unresolvedWarnings: SweepCheckpoint[];
  /** Recommended fixes in priority order */
  recommendedFixes: { priority: number; label: string; detail: string; category: SweepCategory }[];
  /** Manager review summary */
  managerReviews: { pending: number; approved: number; rejected: number };
  /** Section completion from validation engine */
  sectionCompletion: Record<string, { total: number; filled: number; pct: number }>;
  /** Orchestrator report (full) */
  orchestratorReport: ProjectValidationReport;
  /** Timestamp */
  timestamp: number;
}

// ── Category labels for UI ──────────────────────────────────

export const SWEEP_CATEGORY_LABELS: Record<SweepCategory, { icon: string; label: string }> = {
  openings:   { icon: '🪟', label: 'Openings' },
  measurements: { icon: '📏', label: 'Measurements' },
  specialty:  { icon: '⬡', label: 'Specialty Shapes' },
  pricing:    { icon: '💰', label: 'Pricing' },
  mull:       { icon: '🔗', label: 'Mull Combinations' },
  tempered:   { icon: '🛡️', label: 'Tempered Glass' },
  screen:     { icon: '🪟', label: 'Screens' },
  grid:       { icon: '🔲', label: 'Grids' },
  notes:      { icon: '📝', label: 'Notes' },
  photos:     { icon: '📸', label: 'Photos' },
  depth:      { icon: '📐', label: 'Depth Measurements' },
  sketch:     { icon: '✏️', label: 'Sketch' },
  contract:   { icon: '📄', label: 'Contract' },
  signatures: { icon: '✍️', label: 'Signatures' },
};

// ── Main Sweep ──────────────────────────────────────────────

export function runPreSubmissionSweep(
  openings: any[],
  markers: SketchMarkerData[],
  groups: MarkerGroupData[],
  appointment: any,
  opts: { isBrickHouse?: boolean; safetyReviews?: OpeningSafetyReview[] } = {},
): ReadinessReport {
  const appointmentId = appointment?.id || '';
  const checkpoints: SweepCheckpoint[] = [];

  const orchReport = runFullValidation(openings, markers, groups, appointment, opts);

  // ── 1. Convert orchestrator warnings to checkpoints ───
  for (const w of orchReport.warnings) {
    const cat = mapWarningCategory(w.category);
    const approved = appointmentId ? getApprovedReviews(appointmentId).some(r => r.warningId === w.id) : false;
    checkpoints.push({
      id: `orch-${w.id}`,
      category: cat,
      label: w.title,
      status: w.blocksSubmission ? (approved ? 'warn' : 'fail') : w.severity === 'info' ? 'pass' : 'warn',
      severity: w.severity,
      detail: w.detail,
      openingNumber: w.openingNumber,
      blocksSubmission: w.blocksSubmission && !approved,
      managerApproved: approved,
      fix: w.suggestion || w.explanation?.howToFix,
      fixAction: buildFixAction(w),
    });
  }

  // ── 3. Additional sweep checks not covered by either engine ──

  // 3a. Every opening has a room location
  for (const op of openings) {
    if (!op.roomLocation || op.roomLocation.trim() === '') {
      addIfMissing(checkpoints, `sweep-room-${op.openingNumber}`, 'notes', {
        label: `Opening #${op.openingNumber}: Missing room location`,
        status: 'warn', severity: 'warning',
        detail: 'Room location helps installers find the correct opening on-site.',
        openingNumber: op.openingNumber,
        fix: 'Add a room name (e.g. "Master Bedroom", "Kitchen")',
      });
    }
  }

  // 3b. Every opening has installer notes if special conditions exist
  for (const op of openings) {
    const needsNotes = op.sillRepair || op.oriel || op.horizontalRR ||
      (op.floorNumber && op.floorNumber >= 2) || op.nailFin;
    if (needsNotes && !op.installNotes?.trim()) {
      addIfMissing(checkpoints, `sweep-install-notes-${op.openingNumber}`, 'notes', {
        label: `Opening #${op.openingNumber}: Special condition lacks installer notes`,
        status: 'warn', severity: 'warning',
        detail: `This opening has special conditions (${[op.sillRepair && 'sill repair', op.oriel && 'oriel', op.nailFin && 'nail fin'].filter(Boolean).join(', ')}) but no installer notes.`,
        openingNumber: op.openingNumber,
        fix: 'Add installer notes describing the special installation requirements',
      });
    }
  }

  // 3c. Depth measurement check for brick houses
  if (opts.isBrickHouse) {
    for (const op of openings) {
      if (!op.openingDepth || op.openingDepth <= 0) {
        addIfMissing(checkpoints, `sweep-depth-${op.openingNumber}`, 'depth', {
          label: `Opening #${op.openingNumber}: Missing brick depth measurement`,
          status: 'fail', severity: 'critical',
          detail: 'Brick replacement requires depth measurement for proper frame selection.',
          openingNumber: op.openingNumber,
          blocksSubmission: true,
          fix: 'Measure opening depth from interior frame to exterior brick face',
        });
      }
    }
  }

  // 3d. Photo requirements
  for (const op of openings) {
    const photos = appointment?.photos || [];
    const hasPhoto = photos.some((p: any) => p.openingNumber === op.openingNumber);
    const cat = (op.productCategory || '').toLowerCase();
    let needsPhoto = false;
    let reason = '';

    if (op.sillRepair) { needsPhoto = true; reason = 'Sill repair documentation'; }
    else if (op.oriel) { needsPhoto = true; reason = 'Oriel measurement confirmation'; }
    else if (cat.includes('patio')) { needsPhoto = true; reason = 'Patio door track/frame'; }
    else if (op.floorNumber && op.floorNumber >= 2) { needsPhoto = true; reason = 'Upper floor exterior access'; }

    if (needsPhoto && !hasPhoto) {
      addIfMissing(checkpoints, `sweep-photo-${op.openingNumber}`, 'photos', {
        label: `Opening #${op.openingNumber}: Required photo missing — ${reason}`,
        status: 'warn', severity: 'high',
        detail: `${reason} requires photo documentation for this opening.`,
        openingNumber: op.openingNumber,
        fix: 'Take a photo of the opening and attach it',
      });
    }
  }

  // 3e. Signature check
  const sigs = appointment?.signatures || [];
  if (sigs.length === 0) {
    addIfMissing(checkpoints, 'sweep-no-signatures', 'signatures', {
      label: 'No signatures collected',
      status: 'fail', severity: 'critical',
      detail: 'At least one customer signature is required before order submission.',
      blocksSubmission: true,
      fix: 'Collect customer signature on the contract',
    });
  }

  // 3f. Finance check
  const selectedFinance = appointment?.selectedFinance;
  const isFinanceRequired = appointment?.openings?.length > 0;
  
  if (isFinanceRequired && !selectedFinance && appointment?.paymentMethod !== 'cash') {
    addIfMissing(checkpoints, 'sweep-no-finance', 'pricing', {
      label: 'Missing Finance Option',
      status: 'fail', severity: 'critical',
      detail: 'A finance option or cash payment must be selected before contract generation.',
      blocksSubmission: true,
      fix: 'Select a finance option in the Proposal Builder',
      fixAction: { type: 'navigate', route: '/proposal' }
    });
  } else if (selectedFinance && selectedFinance.amountFinanced !== appointment?.totalContractAmount && appointment?.totalContractAmount > 0) {
    addIfMissing(checkpoints, 'sweep-stale-finance', 'pricing', {
      label: 'Stale Finance Calculation',
      status: 'fail', severity: 'critical',
      detail: `The selected finance calculation does not match the current contract total.`,
      blocksSubmission: true,
      fix: 'Recalculate the finance option in the Proposal Builder',
      fixAction: { type: 'navigate', route: '/proposal' }
    });
  }

  // 3g. Mullion Unmapped Check
  const unmappedMulls = groups.filter(g => g.groupType.startsWith('mull') && !g.pricingReviewed);
  if (unmappedMulls.length > 0) {
    addIfMissing(checkpoints, 'sweep-unmapped-mull', 'sketch', {
      label: 'Unmapped Sketch Mullions',
      status: 'fail', severity: 'critical',
      detail: `${unmappedMulls.length} mull groups in sketch have not been priced or reviewed.`,
      blocksSubmission: true,
      fix: 'Review pricing for the sketched mull groups',
      fixAction: { type: 'navigate', route: '/sketch' }
    });
  }

  // ── Build report ──────────────────────────────────────────
  const pass = checkpoints.filter(c => c.status === 'pass').length;
  const fail = checkpoints.filter(c => c.status === 'fail').length;
  const warn = checkpoints.filter(c => c.status === 'warn').length;
  const skip = checkpoints.filter(c => c.status === 'skip').length;
  const total = checkpoints.length;

  // Score: start at 100, subtract for issues
  let score = 100;
  for (const c of checkpoints) {
    if (c.status === 'fail' && !c.managerApproved) score -= c.severity === 'critical' ? 15 : 8;
    else if (c.status === 'warn') score -= c.severity === 'high' ? 4 : 2;
  }
  score = Math.max(0, Math.min(100, score));

  const grade: ReadinessReport['grade'] =
    score >= 95 ? 'A' : score >= 85 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';

  const unresolvedCriticals = checkpoints.filter(c => c.blocksSubmission && !c.managerApproved);
  const unresolvedWarnings = checkpoints.filter(c => c.status === 'warn' && !c.blocksSubmission);

  // Group by category
  const byCategory: Record<string, SweepCheckpoint[]> = {};
  for (const c of checkpoints) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  // Build recommended fixes in priority order
  const recommendedFixes = buildRecommendedFixes(checkpoints);

  // Manager review summary
  const reviewSummary = appointmentId ? getReviewSummary(appointmentId) : { pending: 0, approved: 0, rejected: 0, expired: 0, total: 0 };

  return {
    score,
    grade,
    ready: unresolvedCriticals.length === 0,
    checkpoints,
    byCategory,
    counts: { total, pass, fail, warn, skip },
    unresolvedCriticals,
    unresolvedWarnings,
    recommendedFixes,
    managerReviews: { pending: reviewSummary.pending, approved: reviewSummary.approved, rejected: reviewSummary.rejected },
    sectionCompletion: orchReport.sections,
    orchestratorReport: orchReport,
    timestamp: Date.now(),
  };
}

// ── Helpers ─────────────────────────────────────────────────

function mapWarningCategory(cat: string): SweepCategory {
  const map: Record<string, SweepCategory> = {
    measurement: 'measurements', screen: 'screen', grid: 'grid',
    tempered: 'tempered', color: 'openings', specialty: 'specialty',
    pricing: 'pricing', mull: 'mull', brick: 'depth', order: 'openings',
    sketch: 'sketch', egress: 'openings', consistency: 'openings', geometry: 'measurements',
  };
  return map[cat] || 'openings';
}

function mapEngineSeverity(sev: string): 'critical' | 'high' | 'warning' | 'info' {
  switch (sev) {
    case 'BLOCKER': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'warning';
    default: return 'info';
  }
}

function mapEngineSection(section: string): SweepCategory {
  const map: Record<string, SweepCategory> = {
    'Customer': 'contract', 'Job Info': 'contract', 'Sketch': 'sketch',
    'Openings': 'openings', 'Measurements': 'measurements', 'Pricing': 'pricing',
    'Photos': 'photos', 'Contract': 'contract', 'Signatures': 'signatures',
    'Product & Options': 'openings', 'Installation': 'openings',
  };
  return map[section] || 'openings';
}

function addIfMissing(
  checkpoints: SweepCheckpoint[],
  id: string,
  category: SweepCategory,
  data: Omit<SweepCheckpoint, 'id' | 'category' | 'blocksSubmission' | 'managerApproved'> & { blocksSubmission?: boolean },
) {
  if (checkpoints.some(c => c.id === id)) return;
  checkpoints.push({
    id,
    category,
    blocksSubmission: data.blocksSubmission ?? false,
    managerApproved: false,
    ...data,
  });
}

function buildRecommendedFixes(checkpoints: SweepCheckpoint[]): ReadinessReport['recommendedFixes'] {
  const PRIORITY_ORDER: SweepCategory[] = [
    'openings', 'measurements', 'depth', 'specialty', 'tempered',
    'mull', 'pricing', 'screen', 'grid', 'photos', 'notes',
    'sketch', 'contract', 'signatures',
  ];

  return checkpoints
    .filter(c => (c.status === 'fail' || c.status === 'warn') && c.fix && !c.managerApproved)
    .sort((a, b) => {
      // Critical first, then by category priority
      const sevOrder = { critical: 0, high: 1, warning: 2, info: 3 };
      const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return PRIORITY_ORDER.indexOf(a.category) - PRIORITY_ORDER.indexOf(b.category);
    })
    .map((c, i) => ({
      priority: i + 1,
      label: c.label,
      detail: c.fix!,
      category: c.category,
    }));
}

function buildFixAction(w: UnifiedWarning): SweepCheckpoint['fixAction'] {
  // If it's a sketch warning, route to sketch
  if (w.category === 'sketch') {
    return { type: 'sketch_marker', route: 'sketch', openingNumber: w.openingNumber };
  }
  
  if (w.category === 'pricing') {
    return { type: 'pricing_stale' };
  }
  
  // if it's order header (e.g. missing customer details)
  if (w.id.startsWith('header-')) {
    return { type: 'customer_details', tab: 'details', field: w.fieldPath };
  }
  
  if (w.openingNumber) {
    let section = 'product';
    let field = w.fieldPath?.split('.').pop();
    
    if (w.category === 'specialty' && (w.id.includes('oriel') || w.title.toLowerCase().includes('oriel') || w.title.toLowerCase().includes('sash'))) {
      return { type: 'oriel_upper_sash', tab: 'opening', openingNumber: w.openingNumber, section: 'options', field };
    }
    
    if (w.category === 'siding' || w.category === 'brick' || w.category === 'installation') {
      return { type: 'exterior_measurement_rule', tab: 'opening', openingNumber: w.openingNumber, section: 'install', field };
    }
    
    if (w.id.includes('removal') || w.id.includes('install')) {
      return { type: 'type_removed_installed', tab: 'opening', openingNumber: w.openingNumber, section: 'install', field };
    }
    
    if (w.category === 'color') {
      return { type: 'color_abbreviation', tab: 'opening', openingNumber: w.openingNumber, section: 'colors', field };
    }
    
    if (w.category === 'measurement' || w.category === 'geometry') {
      return { type: 'measurement', tab: 'opening', openingNumber: w.openingNumber, section: 'measurements', field };
    }
    
    if (field === 'model' || field === 'seriesModel') {
      return { type: 'model_number', tab: 'opening', openingNumber: w.openingNumber, section: 'product', field };
    }
    
    return { type: 'opening_details', tab: 'opening', openingNumber: w.openingNumber, section, field };
  }
  
  return { type: 'manual_instruction', instruction: w.suggestion || w.detail };
}

