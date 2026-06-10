// ═══════════════════════════════════════════════════════════════
// useEscalation — React hook for validation escalation state
// Manages overrides, acknowledgements, and submission gates.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  createEscalationState, loadEscalationState, saveEscalationState,
  createOverride, createAcknowledgement,
  applyOverride, applyAcknowledgement, applyManagerApproval,
  checkSubmissionGates, toEscalationLevel, isWarningResolved,
  formatOverrideAuditLog,
  type EscalationState, type EscalationLevel, type OverrideRecord,
  type SubmissionGateResult,
} from '../utils/validationEscalation';

interface UseEscalationOptions {
  appointmentId: string;
  userId: string;
  userRole: 'rep' | 'manager' | 'admin';
  autoPersist?: boolean;
}

export interface UseEscalationReturn {
  state: EscalationState;
  /** Override a warning (validates permissions) */
  override: (warningId: string, level: EscalationLevel, title: string, detail: string, reason: string, openingNumber?: number) => string | null;
  /** Acknowledge a warning */
  acknowledge: (warningId: string, level: EscalationLevel) => void;
  /** Confirm a warning (for high_risk+) */
  confirm: (warningId: string, level: EscalationLevel) => void;
  /** Apply manager approval to a pending override */
  approveAsManager: (warningId: string, managerName: string) => void;
  /** Check if a specific warning is resolved */
  isResolved: (warningId: string, severity: string) => boolean;
  /** Run submission gate check against current warnings */
  checkGates: (warnings: Array<{ id: string; severity: string; title: string; detail: string }>) => SubmissionGateResult;
  /** Get override record for a warning */
  getOverride: (warningId: string) => OverrideRecord | undefined;
  /** Get formatted audit log */
  auditLog: string[];
  /** Total overrides count */
  overrideCount: number;
}

export function useEscalation(opts: UseEscalationOptions): UseEscalationReturn {
  const { appointmentId, userId, userRole, autoPersist = true } = opts;

  const [state, setState] = useState<EscalationState>(() => {
    return loadEscalationState(appointmentId) || createEscalationState(appointmentId);
  });

  // Persist on change
  useEffect(() => {
    if (autoPersist) saveEscalationState(state);
  }, [state, autoPersist]);

  const override = useCallback((
    warningId: string, level: EscalationLevel, title: string, detail: string, reason: string, openingNumber?: number,
  ): string | null => {
    const { override: rec, error } = createOverride(warningId, level, title, detail, userId, userRole, reason, openingNumber, appointmentId);
    if (error) return error;
    setState(prev => applyOverride(prev, rec));
    return null;
  }, [userId, userRole, appointmentId]);

  const acknowledge = useCallback((warningId: string, level: EscalationLevel) => {
    const ack = createAcknowledgement(warningId, level, userId, false);
    setState(prev => applyAcknowledgement(prev, ack));
  }, [userId]);

  const confirmFn = useCallback((warningId: string, level: EscalationLevel) => {
    const ack = createAcknowledgement(warningId, level, userId, true);
    setState(prev => applyAcknowledgement(prev, ack));
  }, [userId]);

  const approveAsManager = useCallback((warningId: string, managerName: string) => {
    setState(prev => applyManagerApproval(prev, warningId, userId, managerName));
  }, [userId]);

  const isResolved = useCallback((warningId: string, severity: string): boolean => {
    return isWarningResolved(warningId, toEscalationLevel(severity), state);
  }, [state]);

  const checkGates = useCallback((warnings: Array<{ id: string; severity: string; title: string; detail: string }>) => {
    return checkSubmissionGates(warnings, state);
  }, [state]);

  const getOverride = useCallback((warningId: string) => {
    return state.overrides[warningId];
  }, [state]);

  const auditLog = useMemo(() => formatOverrideAuditLog(state.overrides), [state.overrides]);
  const overrideCount = useMemo(() => Object.keys(state.overrides).length, [state.overrides]);

  return {
    state, override, acknowledge, confirm: confirmFn, approveAsManager,
    isResolved, checkGates, getOverride, auditLog, overrideCount,
  };
}
