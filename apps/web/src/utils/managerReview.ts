// ═══════════════════════════════════════════════════════════════
// Manager Review Engine
// Tracks escalation of critical/high-risk validation warnings
// that require manager approval before submission can proceed.
// Provides full audit trail with reviewer, timestamp, resolution,
// override notes, and configuration snapshot.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, UnifiedSeverity } from './centralValidationOrchestrator';

// ── Types ────────────────────────────────────────────────────

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type EscalationReason =
  | 'oversized_specialty'
  | 'unsupported_mull'
  | 'high_risk_geometry'
  | 'pricing_override'
  | 'manual_discount'
  | 'conflicting_rules'
  | 'tempered_override'
  | 'measurement_exception'
  | 'custom';

export interface ManagerReviewRequest {
  /** Unique review ID */
  id: string;
  /** Appointment / project this review belongs to */
  appointmentId: string;
  /** The warning that triggered escalation */
  warningId: string;
  /** Snapshot of the warning at escalation time */
  warningSnapshot: UnifiedWarning;
  /** Why this was escalated */
  escalationReason: EscalationReason;
  /** Free-text detail from the rep */
  repNotes: string;
  /** Severity at time of escalation */
  severity: UnifiedSeverity;
  /** Opening number if applicable */
  openingNumber?: number;
  /** Configuration snapshot at escalation time (opening data, pricing, etc.) */
  configSnapshot: Record<string, any>;
  /** Current review status */
  status: ReviewStatus;
  /** Who created the escalation */
  requestedBy: { id: string; name: string; email: string };
  /** When the escalation was created */
  requestedAt: string;
  /** Review response (populated on approve/reject) */
  resolution?: ReviewResolution;
  /** Expiry timestamp (24h from request) */
  expiresAt: string;
}

export interface ReviewResolution {
  /** Who resolved the review */
  reviewer: { id: string; name: string; email: string };
  /** When it was resolved */
  resolvedAt: string;
  /** Approval or rejection */
  decision: 'approved' | 'rejected';
  /** Manager's notes/justification */
  notes: string;
  /** If approved: what configuration was approved */
  approvedConfiguration?: Record<string, any>;
  /** If rejected: what the manager recommends instead */
  rejectionReason?: string;
  /** If approved: any conditions on the approval */
  conditions?: string;
}

export interface ReviewAuditEntry {
  /** Unique audit log ID */
  id: string;
  /** The review request ID */
  reviewId: string;
  /** Event type */
  event: 'created' | 'approved' | 'rejected' | 'expired' | 'reopened' | 'notes_added';
  /** Who performed the action */
  actor: { id: string; name: string };
  /** When the event occurred */
  timestamp: string;
  /** Additional context */
  detail: string;
  /** Previous state */
  previousStatus?: ReviewStatus;
  /** New state */
  newStatus?: ReviewStatus;
}

export interface ManagerReviewState {
  /** All review requests for the current session */
  reviews: ManagerReviewRequest[];
  /** Full audit trail */
  auditLog: ReviewAuditEntry[];
}

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY = 'wwa_manager_reviews';
const REVIEW_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Which severities require manager review when overridden */
export const MANAGER_REVIEW_SEVERITIES: UnifiedSeverity[] = ['critical', 'high'];

/** Escalation reason labels for the UI */
export const ESCALATION_LABELS: Record<EscalationReason, { icon: string; label: string; description: string }> = {
  oversized_specialty:   { icon: '📐', label: 'Oversized Specialty',   description: 'Unit exceeds maximum size limits for the selected product type' },
  unsupported_mull:      { icon: '🔗', label: 'Unsupported Mull',      description: 'Mull/join configuration is not supported by manufacturer' },
  high_risk_geometry:    { icon: '📏', label: 'High-Risk Geometry',     description: 'Opening dimensions or aspect ratio create structural risk' },
  pricing_override:      { icon: '💰', label: 'Pricing Override',       description: 'Manual pricing adjustment outside verified price list' },
  manual_discount:       { icon: '🏷️', label: 'Manual Discount',        description: 'Discount applied outside standard discount schedule' },
  conflicting_rules:     { icon: '⚡', label: 'Conflicting Rules',      description: 'Two or more business rules are in direct conflict' },
  tempered_override:     { icon: '🛡️', label: 'Tempered Override',      description: 'Safety glazing requirement has been overridden' },
  measurement_exception: { icon: '📏', label: 'Measurement Exception',  description: 'Dimensions fall outside standard manufacturing tolerances' },
  custom:                { icon: '📝', label: 'Custom Escalation',      description: 'Manual escalation with custom justification' },
};

// ── UUID generator ──────────────────────────────────────────

function uid(): string {
  return `mr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Persistence ─────────────────────────────────────────────

function loadState(): ManagerReviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reviews: [], auditLog: [] };
    return JSON.parse(raw);
  } catch {
    return { reviews: [], auditLog: [] };
  }
}

function saveState(state: ManagerReviewState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full — silently degrade */ }
}

// ── Core Operations ─────────────────────────────────────────

/**
 * Create a new manager review request for a critical/high warning.
 */
export function createReviewRequest(
  appointmentId: string,
  warning: UnifiedWarning,
  reason: EscalationReason,
  repNotes: string,
  requestedBy: { id: string; name: string; email: string },
  configSnapshot: Record<string, any> = {},
): ManagerReviewRequest {
  const state = loadState();
  const now = new Date().toISOString();

  const request: ManagerReviewRequest = {
    id: uid(),
    appointmentId,
    warningId: warning.id,
    warningSnapshot: { ...warning },
    escalationReason: reason,
    repNotes,
    severity: warning.severity,
    openingNumber: warning.openingNumber,
    configSnapshot,
    status: 'pending',
    requestedBy,
    requestedAt: now,
    expiresAt: new Date(Date.now() + REVIEW_EXPIRY_MS).toISOString(),
  };

  state.reviews.push(request);
  state.auditLog.push({
    id: uid(),
    reviewId: request.id,
    event: 'created',
    actor: { id: requestedBy.id, name: requestedBy.name },
    timestamp: now,
    detail: `Escalated: ${ESCALATION_LABELS[reason].label} — "${warning.title}"`,
    newStatus: 'pending',
  });

  saveState(state);
  return request;
}

/**
 * Manager approves a review request.
 */
export function approveReview(
  reviewId: string,
  reviewer: { id: string; name: string; email: string },
  notes: string,
  approvedConfiguration?: Record<string, any>,
  conditions?: string,
): ManagerReviewRequest | null {
  const state = loadState();
  const review = state.reviews.find(r => r.id === reviewId);
  if (!review || review.status !== 'pending') return null;

  const now = new Date().toISOString();
  const previousStatus = review.status;

  review.status = 'approved';
  review.resolution = {
    reviewer,
    resolvedAt: now,
    decision: 'approved',
    notes,
    approvedConfiguration,
    conditions,
  };

  state.auditLog.push({
    id: uid(),
    reviewId,
    event: 'approved',
    actor: { id: reviewer.id, name: reviewer.name },
    timestamp: now,
    detail: `Manager approved: ${notes}${conditions ? ` (Conditions: ${conditions})` : ''}`,
    previousStatus,
    newStatus: 'approved',
  });

  saveState(state);
  return review;
}

/**
 * Manager rejects a review request.
 */
export function rejectReview(
  reviewId: string,
  reviewer: { id: string; name: string; email: string },
  notes: string,
  rejectionReason?: string,
): ManagerReviewRequest | null {
  const state = loadState();
  const review = state.reviews.find(r => r.id === reviewId);
  if (!review || review.status !== 'pending') return null;

  const now = new Date().toISOString();
  const previousStatus = review.status;

  review.status = 'rejected';
  review.resolution = {
    reviewer,
    resolvedAt: now,
    decision: 'rejected',
    notes,
    rejectionReason,
  };

  state.auditLog.push({
    id: uid(),
    reviewId,
    event: 'rejected',
    actor: { id: reviewer.id, name: reviewer.name },
    timestamp: now,
    detail: `Manager rejected: ${rejectionReason || notes}`,
    previousStatus,
    newStatus: 'rejected',
  });

  saveState(state);
  return review;
}

/**
 * Expire stale reviews past their 24h window.
 */
export function expireStaleReviews(): number {
  const state = loadState();
  const now = Date.now();
  let expired = 0;

  for (const review of state.reviews) {
    if (review.status === 'pending' && new Date(review.expiresAt).getTime() < now) {
      review.status = 'expired';
      state.auditLog.push({
        id: uid(),
        reviewId: review.id,
        event: 'expired',
        actor: { id: 'system', name: 'System' },
        timestamp: new Date().toISOString(),
        detail: 'Review expired (24h limit reached)',
        previousStatus: 'pending',
        newStatus: 'expired',
      });
      expired++;
    }
  }

  if (expired > 0) saveState(state);
  return expired;
}

// ── Query Helpers ───────────────────────────────────────────

/** Get all reviews for an appointment */
export function getReviewsForAppointment(appointmentId: string): ManagerReviewRequest[] {
  const state = loadState();
  return state.reviews.filter(r => r.appointmentId === appointmentId);
}

/** Get pending reviews for an appointment */
export function getPendingReviews(appointmentId: string): ManagerReviewRequest[] {
  expireStaleReviews();
  return getReviewsForAppointment(appointmentId).filter(r => r.status === 'pending');
}

/** Get approved reviews for an appointment */
export function getApprovedReviews(appointmentId: string): ManagerReviewRequest[] {
  return getReviewsForAppointment(appointmentId).filter(r => r.status === 'approved');
}

/** Check if a warning has already been escalated (any status) */
export function isWarningEscalated(appointmentId: string, warningId: string): ManagerReviewRequest | undefined {
  return getReviewsForAppointment(appointmentId).find(
    r => r.warningId === warningId && (r.status === 'pending' || r.status === 'approved'),
  );
}

/** Check if a warning has an active approval (unblocks submission) */
export function isWarningApproved(appointmentId: string, warningId: string): boolean {
  return getReviewsForAppointment(appointmentId).some(
    r => r.warningId === warningId && r.status === 'approved',
  );
}

/** Get the full audit log for an appointment */
export function getAuditLog(appointmentId: string): ReviewAuditEntry[] {
  const state = loadState();
  const reviewIds = new Set(state.reviews.filter(r => r.appointmentId === appointmentId).map(r => r.id));
  return state.auditLog.filter(e => reviewIds.has(e.reviewId)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/** Get the full audit log for a single review */
export function getReviewAuditLog(reviewId: string): ReviewAuditEntry[] {
  const state = loadState();
  return state.auditLog.filter(e => e.reviewId === reviewId).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/** Summary stats for an appointment's reviews */
export function getReviewSummary(appointmentId: string): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
} {
  const reviews = getReviewsForAppointment(appointmentId);
  return {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    expired: reviews.filter(r => r.status === 'expired').length,
  };
}

/**
 * Check if submission is still blocked after considering manager approvals.
 * Returns warnings that block submission AND are NOT approved by a manager.
 */
export function getUnresolvedBlockers(
  appointmentId: string,
  warnings: UnifiedWarning[],
): UnifiedWarning[] {
  return warnings.filter(w => {
    if (!w.blocksSubmission) return false;
    // If a manager approved this specific warning, it's unblocked
    if (isWarningApproved(appointmentId, w.id)) return false;
    return true;
  });
}

/** Determine the escalation reason from a warning automatically */
export function inferEscalationReason(warning: UnifiedWarning): EscalationReason {
  const t = (warning.title + ' ' + warning.detail).toLowerCase();

  if (t.includes('oversiz') || t.includes('exceed') || t.includes('maximum')) return 'oversized_specialty';
  if (t.includes('mull') || t.includes('join')) return 'unsupported_mull';
  if (t.includes('geometry') || t.includes('aspect') || t.includes('ratio')) return 'high_risk_geometry';
  if (t.includes('pric') && (t.includes('override') || t.includes('manual'))) return 'pricing_override';
  if (t.includes('discount')) return 'manual_discount';
  if (t.includes('conflict')) return 'conflicting_rules';
  if (t.includes('tempered') || t.includes('safety glazing')) return 'tempered_override';
  if (t.includes('measurement') || t.includes('tolerance') || t.includes('dimension')) return 'measurement_exception';

  return 'custom';
}
