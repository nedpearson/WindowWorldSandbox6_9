// ═══════════════════════════════════════════════════════════════
// Validation History Tracker
// Records the lifecycle of every warning: appearance, resolution,
// overrides, field changes, and audit trail. Persists per
// appointment for QA review, manager audit, and rep training.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, UnifiedSeverity, WarningCategory } from './centralValidationOrchestrator';
import type { RuleConflict } from './ruleConflictDetector';

// ── Event Types ─────────────────────────────────────────────
export type HistoryEventType =
  | 'appeared'          // warning first detected
  | 'resolved'          // warning no longer fires (data was fixed)
  | 'overridden'        // rep/manager overrode the warning
  | 'acknowledged'      // rep acknowledged the warning
  | 'escalated'         // severity increased
  | 'demoted'           // severity decreased (intelligence demotion)
  | 'suppressed'        // hidden by intelligence pipeline
  | 'unsuppressed'      // previously suppressed, now visible again
  | 'field_changed'     // the affected field value changed
  | 'conflict_detected' // this warning is part of a conflict
  | 'conflict_resolved' // conflict involving this warning was resolved
  | 'reappeared';       // warning resolved then came back

export interface HistoryEvent {
  id: string;
  warningId: string;
  eventType: HistoryEventType;
  timestamp: string;           // ISO
  userId?: string;
  userName?: string;
  userRole?: 'rep' | 'manager' | 'admin' | 'system';
  // Warning snapshot at time of event
  severity: UnifiedSeverity;
  category: WarningCategory;
  title: string;
  detail: string;
  openingNumber?: number;
  // Change tracking
  fieldPath?: string;
  previousValue?: any;
  currentValue?: any;
  // Override/escalation metadata
  overrideReason?: string;
  managerApproval?: { managerId: string; managerName: string };
  // Conflict reference
  conflictId?: string;
  // Notes
  notes?: string;
}

// ── Warning Lifecycle State ─────────────────────────────────
export type WarningStatus = 'active' | 'resolved' | 'overridden' | 'suppressed';

export interface WarningLifecycle {
  warningId: string;
  status: WarningStatus;
  firstSeen: string;
  lastSeen: string;
  resolvedAt?: string;
  resolvedBy?: string;
  overriddenAt?: string;
  overriddenBy?: string;
  overrideReason?: string;
  appearanceCount: number;     // how many times it appeared/reappeared
  events: HistoryEvent[];
  // Snapshot of warning when first seen
  originalWarning: {
    severity: UnifiedSeverity;
    category: WarningCategory;
    title: string;
    detail: string;
    openingNumber?: number;
  };
}

// ── Project Validation History ──────────────────────────────
export interface ValidationHistory {
  appointmentId: string;
  warnings: Record<string, WarningLifecycle>;
  timeline: HistoryEvent[];  // all events in chronological order
  snapshots: ValidationSnapshot[];
  lastUpdated: string;
}

export interface ValidationSnapshot {
  timestamp: string;
  userId?: string;
  activeCount: number;
  resolvedCount: number;
  overriddenCount: number;
  criticalCount: number;
  totalOpenings: number;
  trigger: 'manual' | 'auto_save' | 'field_change' | 'submission_attempt';
}

// ── Create empty history ────────────────────────────────────
export function createHistory(appointmentId: string): ValidationHistory {
  return {
    appointmentId,
    warnings: {},
    timeline: [],
    snapshots: [],
    lastUpdated: new Date().toISOString(),
  };
}

// ── Generate event ID ───────────────────────────────────────
let eventSeq = 0;
function nextEventId(): string {
  return `evt-${Date.now()}-${++eventSeq}`;
}

// ── Record a new validation run ─────────────────────────────
export function recordValidationRun(
  history: ValidationHistory,
  currentWarnings: UnifiedWarning[],
  userId?: string,
  trigger: ValidationSnapshot['trigger'] = 'auto_save',
): ValidationHistory {
  const now = new Date().toISOString();
  const updated = deepClone(history);
  const currentIds = new Set(currentWarnings.map(w => w.id));

  // 1. Detect NEW warnings (appeared)
  for (const w of currentWarnings) {
    const existing = updated.warnings[w.id];
    if (!existing) {
      // Brand new warning
      const lifecycle: WarningLifecycle = {
        warningId: w.id,
        status: 'active',
        firstSeen: now,
        lastSeen: now,
        appearanceCount: 1,
        events: [],
        originalWarning: {
          severity: w.severity,
          category: w.category,
          title: w.title,
          detail: w.detail,
          openingNumber: w.openingNumber,
        },
      };
      const event = makeEvent(w, 'appeared', now, userId);
      lifecycle.events.push(event);
      updated.timeline.push(event);
      updated.warnings[w.id] = lifecycle;
    } else {
      // Warning already known
      existing.lastSeen = now;

      if (existing.status === 'resolved') {
        // REAPPEARED after being resolved
        existing.status = 'active';
        existing.appearanceCount++;
        existing.resolvedAt = undefined;
        existing.resolvedBy = undefined;
        const event = makeEvent(w, 'reappeared', now, userId);
        event.notes = `Warning reappeared after being resolved. Appearance #${existing.appearanceCount}.`;
        existing.events.push(event);
        updated.timeline.push(event);
      }

      // Check if severity changed
      const lastEvent = existing.events[existing.events.length - 1];
      if (lastEvent && lastEvent.severity !== w.severity) {
        const eventType: HistoryEventType = severityRank(w.severity) < severityRank(lastEvent.severity) ? 'escalated' : 'demoted';
        const event = makeEvent(w, eventType, now, undefined, 'system');
        event.previousValue = lastEvent.severity;
        event.currentValue = w.severity;
        event.notes = `Severity changed from ${lastEvent.severity} to ${w.severity}`;
        existing.events.push(event);
        updated.timeline.push(event);
      }
    }
  }

  // 2. Detect RESOLVED warnings (were active, no longer present)
  for (const [id, lifecycle] of Object.entries(updated.warnings)) {
    if (lifecycle.status === 'active' && !currentIds.has(id)) {
      lifecycle.status = 'resolved';
      lifecycle.resolvedAt = now;
      lifecycle.resolvedBy = userId;
      const event: HistoryEvent = {
        id: nextEventId(),
        warningId: id,
        eventType: 'resolved',
        timestamp: now,
        userId,
        userRole: userId ? 'rep' : 'system',
        severity: lifecycle.originalWarning.severity,
        category: lifecycle.originalWarning.category,
        title: lifecycle.originalWarning.title,
        detail: lifecycle.originalWarning.detail,
        openingNumber: lifecycle.originalWarning.openingNumber,
        notes: 'Warning no longer detected — the underlying issue was fixed.',
      };
      lifecycle.events.push(event);
      updated.timeline.push(event);
    }
  }

  // 3. Take snapshot
  const activeCount = Object.values(updated.warnings).filter(w => w.status === 'active').length;
  const resolvedCount = Object.values(updated.warnings).filter(w => w.status === 'resolved').length;
  const overriddenCount = Object.values(updated.warnings).filter(w => w.status === 'overridden').length;
  const criticalCount = currentWarnings.filter(w => w.severity === 'critical').length;

  updated.snapshots.push({
    timestamp: now,
    userId,
    activeCount,
    resolvedCount,
    overriddenCount,
    criticalCount,
    totalOpenings: new Set(currentWarnings.map(w => w.openingNumber).filter(n => n !== undefined)).size,
    trigger,
  });

  updated.lastUpdated = now;
  return updated;
}

// ── Record a field change ───────────────────────────────────
export function recordFieldChange(
  history: ValidationHistory,
  warningId: string,
  fieldPath: string,
  previousValue: any,
  currentValue: any,
  userId?: string,
): ValidationHistory {
  const updated = deepClone(history);
  const lifecycle = updated.warnings[warningId];
  if (!lifecycle) return updated;

  const event: HistoryEvent = {
    id: nextEventId(),
    warningId,
    eventType: 'field_changed',
    timestamp: new Date().toISOString(),
    userId,
    userRole: userId ? 'rep' : 'system',
    severity: lifecycle.originalWarning.severity,
    category: lifecycle.originalWarning.category,
    title: lifecycle.originalWarning.title,
    detail: lifecycle.originalWarning.detail,
    openingNumber: lifecycle.originalWarning.openingNumber,
    fieldPath,
    previousValue,
    currentValue,
    notes: `${fieldPath}: "${previousValue}" → "${currentValue}"`,
  };

  lifecycle.events.push(event);
  updated.timeline.push(event);
  updated.lastUpdated = event.timestamp;
  return updated;
}

// ── Record an override ──────────────────────────────────────
export function recordOverride(
  history: ValidationHistory,
  warningId: string,
  reason: string,
  userId: string,
  userName: string,
  userRole: 'rep' | 'manager' | 'admin',
  managerApproval?: { managerId: string; managerName: string },
): ValidationHistory {
  const updated = deepClone(history);
  const lifecycle = updated.warnings[warningId];
  if (!lifecycle) return updated;

  lifecycle.status = 'overridden';
  lifecycle.overriddenAt = new Date().toISOString();
  lifecycle.overriddenBy = userName;
  lifecycle.overrideReason = reason;

  const event: HistoryEvent = {
    id: nextEventId(),
    warningId,
    eventType: 'overridden',
    timestamp: lifecycle.overriddenAt,
    userId,
    userName,
    userRole,
    severity: lifecycle.originalWarning.severity,
    category: lifecycle.originalWarning.category,
    title: lifecycle.originalWarning.title,
    detail: lifecycle.originalWarning.detail,
    openingNumber: lifecycle.originalWarning.openingNumber,
    overrideReason: reason,
    managerApproval,
    notes: managerApproval
      ? `Overridden by ${userName} (${userRole}) with manager approval from ${managerApproval.managerName}. Reason: "${reason}"`
      : `Overridden by ${userName} (${userRole}). Reason: "${reason}"`,
  };

  lifecycle.events.push(event);
  updated.timeline.push(event);
  updated.lastUpdated = event.timestamp;
  return updated;
}

// ── Record conflict events ──────────────────────────────────
export function recordConflict(
  history: ValidationHistory,
  conflict: RuleConflict,
  resolved: boolean,
  userId?: string,
): ValidationHistory {
  const updated = deepClone(history);
  const now = new Date().toISOString();
  const eventType: HistoryEventType = resolved ? 'conflict_resolved' : 'conflict_detected';

  for (const wId of [conflict.warningA.id, conflict.warningB.id]) {
    const lifecycle = updated.warnings[wId];
    if (!lifecycle) continue;

    const event: HistoryEvent = {
      id: nextEventId(),
      warningId: wId,
      eventType,
      timestamp: now,
      userId,
      userRole: userId ? 'rep' : 'system',
      severity: lifecycle.originalWarning.severity,
      category: lifecycle.originalWarning.category,
      title: lifecycle.originalWarning.title,
      detail: lifecycle.originalWarning.detail,
      openingNumber: lifecycle.originalWarning.openingNumber,
      conflictId: conflict.id,
      notes: resolved
        ? `Conflict "${conflict.conflictType}" resolved. Applied: ${conflict.resolution.recommendation.slice(0, 80)}`
        : `Conflict detected: ${conflict.description.slice(0, 120)}`,
    };

    lifecycle.events.push(event);
    updated.timeline.push(event);
  }

  updated.lastUpdated = now;
  return updated;
}

// ── Query helpers ───────────────────────────────────────────
export function getOpeningTimeline(history: ValidationHistory, openingNumber: number): HistoryEvent[] {
  return history.timeline
    .filter(e => e.openingNumber === openingNumber)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getWarningTimeline(history: ValidationHistory, warningId: string): HistoryEvent[] {
  return history.warnings[warningId]?.events || [];
}

export function getActiveWarnings(history: ValidationHistory): WarningLifecycle[] {
  return Object.values(history.warnings).filter(w => w.status === 'active');
}

export function getResolvedWarnings(history: ValidationHistory): WarningLifecycle[] {
  return Object.values(history.warnings).filter(w => w.status === 'resolved');
}

export function getOverriddenWarnings(history: ValidationHistory): WarningLifecycle[] {
  return Object.values(history.warnings).filter(w => w.status === 'overridden');
}

export function getManagerAuditTrail(history: ValidationHistory): HistoryEvent[] {
  return history.timeline.filter(e =>
    e.eventType === 'overridden' || e.eventType === 'escalated' ||
    e.managerApproval !== undefined
  );
}

export function getReappearances(history: ValidationHistory): WarningLifecycle[] {
  return Object.values(history.warnings).filter(w => w.appearanceCount > 1);
}

// ── Persistence ─────────────────────────────────────────────
const STORAGE_PREFIX = 'ww_val_history_';

export function saveHistory(history: ValidationHistory): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${history.appointmentId}`, JSON.stringify(history));
  } catch { /* quota — silent */ }
}

export function loadHistory(appointmentId: string): ValidationHistory | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${appointmentId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Format audit report ─────────────────────────────────────
export function formatAuditReport(history: ValidationHistory): string[] {
  const lines: string[] = [
    `═══ Validation Audit — Appointment ${history.appointmentId} ═══`,
    `Last updated: ${new Date(history.lastUpdated).toLocaleString()}`,
    `Total warnings tracked: ${Object.keys(history.warnings).length}`,
    `Active: ${getActiveWarnings(history).length}  |  Resolved: ${getResolvedWarnings(history).length}  |  Overridden: ${getOverriddenWarnings(history).length}`,
    `Snapshots: ${history.snapshots.length}`,
    '',
  ];

  const overrides = getOverriddenWarnings(history);
  if (overrides.length > 0) {
    lines.push('── OVERRIDES ──');
    for (const o of overrides) {
      lines.push(`  [${o.overriddenAt ? new Date(o.overriddenAt).toLocaleString() : '?'}] "${o.originalWarning.title}" — by ${o.overriddenBy || '?'}: "${o.overrideReason || 'No reason'}"`);
    }
    lines.push('');
  }

  const reappearances = getReappearances(history);
  if (reappearances.length > 0) {
    lines.push('── REAPPEARANCES (potential training issues) ──');
    for (const r of reappearances) {
      lines.push(`  "${r.originalWarning.title}" — appeared ${r.appearanceCount}x (first: ${new Date(r.firstSeen).toLocaleString()})`);
    }
  }

  return lines;
}

// ── Internal helpers ────────────────────────────────────────
function makeEvent(
  w: UnifiedWarning, type: HistoryEventType, timestamp: string,
  userId?: string, role?: 'rep' | 'manager' | 'admin' | 'system',
): HistoryEvent {
  return {
    id: nextEventId(),
    warningId: w.id,
    eventType: type,
    timestamp,
    userId,
    userRole: role || (userId ? 'rep' : 'system'),
    severity: w.severity,
    category: w.category,
    title: w.title,
    detail: w.detail,
    openingNumber: w.openingNumber,
  };
}

function severityRank(s: UnifiedSeverity): number {
  return { critical: 0, high: 1, warning: 2, info: 3 }[s];
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
