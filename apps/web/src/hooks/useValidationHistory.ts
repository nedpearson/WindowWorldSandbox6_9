// ═══════════════════════════════════════════════════════════════
// useValidationHistory — React hook for history tracking
// Persists and manages the full validation lifecycle timeline.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  createHistory, loadHistory, saveHistory,
  recordValidationRun, recordFieldChange, recordOverride, recordConflict,
  getOpeningTimeline, getWarningTimeline, getActiveWarnings,
  getResolvedWarnings, getOverriddenWarnings, getManagerAuditTrail,
  getReappearances, formatAuditReport,
  type ValidationHistory, type HistoryEvent, type WarningLifecycle,
} from '../utils/validationHistory';
import type { UnifiedWarning } from '../utils/centralValidationOrchestrator';
import type { RuleConflict } from '../utils/ruleConflictDetector';

interface UseValidationHistoryOptions {
  appointmentId: string;
  userId?: string;
  autoPersist?: boolean;
}

export function useValidationHistory(opts: UseValidationHistoryOptions) {
  const { appointmentId, userId, autoPersist = true } = opts;

  const [history, setHistory] = useState<ValidationHistory>(() =>
    loadHistory(appointmentId) || createHistory(appointmentId)
  );

  // Persist on change
  useEffect(() => {
    if (autoPersist) saveHistory(history);
  }, [history, autoPersist]);

  const trackRun = useCallback((warnings: UnifiedWarning[], trigger: 'manual' | 'auto_save' | 'field_change' | 'submission_attempt' = 'auto_save') => {
    setHistory(prev => recordValidationRun(prev, warnings, userId, trigger));
  }, [userId]);

  const trackFieldChange = useCallback((warningId: string, field: string, prev: any, curr: any) => {
    setHistory(h => recordFieldChange(h, warningId, field, prev, curr, userId));
  }, [userId]);

  const trackOverride = useCallback((warningId: string, reason: string, userName: string, role: 'rep' | 'manager' | 'admin', mgr?: { managerId: string; managerName: string }) => {
    setHistory(h => recordOverride(h, warningId, reason, userId || 'unknown', userName, role, mgr));
  }, [userId]);

  const trackConflict = useCallback((conflict: RuleConflict, resolved: boolean) => {
    setHistory(h => recordConflict(h, conflict, resolved, userId));
  }, [userId]);

  const openingTimeline = useCallback((n: number) => getOpeningTimeline(history, n), [history]);
  const warningTimeline = useCallback((id: string) => getWarningTimeline(history, id), [history]);

  const active = useMemo(() => getActiveWarnings(history), [history]);
  const resolved = useMemo(() => getResolvedWarnings(history), [history]);
  const overridden = useMemo(() => getOverriddenWarnings(history), [history]);
  const managerTrail = useMemo(() => getManagerAuditTrail(history), [history]);
  const reappearances = useMemo(() => getReappearances(history), [history]);
  const auditReport = useMemo(() => formatAuditReport(history), [history]);

  return {
    history,
    trackRun, trackFieldChange, trackOverride, trackConflict,
    openingTimeline, warningTimeline,
    active, resolved, overridden, managerTrail, reappearances,
    auditReport,
    totalTracked: Object.keys(history.warnings).length,
    snapshotCount: history.snapshots.length,
  };
}
