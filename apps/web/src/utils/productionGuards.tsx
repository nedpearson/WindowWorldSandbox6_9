// ═══════════════════════════════════════════════════════════════
// Production Guards — Error detection, network resilience, 
// duplicate prevention, and save-state management for the 
// ONE official workflow.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { journalWrite } from './dataGuard';

// ── Error Log (Admin-safe, localStorage backed) ─────────────

const ERROR_LOG_KEY = 'wwa_error_log';
const MAX_ERROR_LOG = 200;

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  category: 'save' | 'network' | 'contract' | 'pricing' | 'pdf' | 'upload' | 'permission' | 'validation' | 'route' | 'sketch' | 'general';
  message: string;
  technicalDetail?: string;
  userId?: string;
  appointmentId?: string;
  step?: string;
  resolved?: boolean;
}

export function logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    const log: ErrorLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push({
      ...entry,
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log.slice(-MAX_ERROR_LOG)));
  } catch { /* storage full — silently skip */ }
}

export function getErrorLog(filter?: { category?: string; appointmentId?: string }): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    let log: ErrorLogEntry[] = raw ? JSON.parse(raw) : [];
    if (filter?.category) log = log.filter(e => e.category === filter.category);
    if (filter?.appointmentId) log = log.filter(e => e.appointmentId === filter.appointmentId);
    return log;
  } catch { return []; }
}

export function clearErrorLog(): void {
  try { localStorage.removeItem(ERROR_LOG_KEY); } catch (e) { console.debug("[swallowed error]", e); }
}

// ── Network / Offline Guard ─────────────────────────────────

export function useNetworkGuard() {
  const [online, setOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<number>(Date.now());

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setLastOnline(Date.now()); };
    const handleOffline = () => {
      setOnline(false);
      logError({
        level: 'warn', category: 'network',
        message: 'Device went offline',
        technicalDetail: `Last online: ${new Date(lastOnline).toISOString()}`,
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastOnline]);

  return { online, lastOnline };
}

// ── Save State Machine ──────────────────────────────────────

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'retrying';

export function useSaveGuard() {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const guardedSave = useCallback(async (
    saveFn: () => Promise<any>,
    opts?: { appointmentId?: string; step?: string; silent?: boolean }
  ): Promise<boolean> => {
    if (saveState === 'saving') return false; // prevent double submission

    setSaveState('saving');
    setErrorMsg(null);
    retryCountRef.current = 0;

    const attemptSave = async (): Promise<boolean> => {
      try {
        await saveFn();
        setSaveState('saved');
        setLastSaved(Date.now());
        // Auto-reset to idle after 3 seconds
        setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 3000);
        return true;
      } catch (err: any) {
        retryCountRef.current++;
        const msg = err?.message || 'Save failed';

        if (retryCountRef.current < MAX_RETRIES) {
          setSaveState('retrying');
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * retryCountRef.current));
          return attemptSave();
        }

        setSaveState('failed');
        setErrorMsg(msg);
        logError({
          level: 'error', category: 'save',
          message: `Save failed after ${MAX_RETRIES} attempts: ${msg}`,
          technicalDetail: err?.stack,
          appointmentId: opts?.appointmentId,
          step: opts?.step,
        });
        return false;
      }
    };

    return attemptSave();
  }, [saveState]);

  const retry = useCallback(async (saveFn: () => Promise<any>) => {
    retryCountRef.current = 0;
    return guardedSave(saveFn);
  }, [guardedSave]);

  return { saveState, lastSaved, errorMsg, guardedSave, retry };
}

// ── Duplicate Submission Guard ──────────────────────────────

const SUBMISSION_KEYS = new Set<string>();

export function useSubmissionGuard() {
  const [submitting, setSubmitting] = useState(false);

  const guardedSubmit = useCallback(async (
    key: string,
    submitFn: () => Promise<any>,
  ): Promise<boolean> => {
    // Idempotency check
    if (SUBMISSION_KEYS.has(key) || submitting) {
      logError({
        level: 'warn', category: 'general',
        message: `Duplicate submission blocked: ${key}`,
      });
      return false;
    }

    SUBMISSION_KEYS.add(key);
    setSubmitting(true);

    try {
      await submitFn();
      return true;
    } catch (err: any) {
      SUBMISSION_KEYS.delete(key); // Allow retry on failure
      logError({
        level: 'error', category: 'save',
        message: `Submission failed: ${err?.message}`,
        technicalDetail: err?.stack,
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  return { submitting, guardedSubmit };
}

// ── Unsaved Changes Navigation Blocker ──────────────────────

export function useUnsavedChangesGuard(hasUnsaved: boolean, message?: string) {
  useEffect(() => {
    if (!hasUnsaved) return;

    const msg = message || 'You have unsaved changes. Are you sure you want to leave?';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = msg;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved, message]);
}

// ── API Call with Retry & Logging ───────────────────────────

export async function guardedApiCall<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number;
    category?: ErrorLogEntry['category'];
    context?: string;
    appointmentId?: string;
  } = {}
): Promise<T> {
  const { retries = 2, category = 'network', context = 'API call', appointmentId } = opts;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  logError({
    level: 'error',
    category,
    message: `${context} failed after ${retries + 1} attempts`,
    technicalDetail: lastError?.stack || lastError?.message,
    appointmentId,
  });

  throw lastError;
}

// ── Step Completion Guard ───────────────────────────────────

export interface StepGuardResult {
  complete: boolean;
  missing: { field: string; label: string; severity: 'critical' | 'warning' }[];
  percentage: number;
}

export function checkStepCompletion(step: number, appointment: any): StepGuardResult {
  const missing: StepGuardResult['missing'] = [];

  switch (step) {
    case 0: // Customer
      if (!appointment?.customer?.firstName) missing.push({ field: 'customer.firstName', label: 'Customer first name', severity: 'critical' });
      if (!appointment?.customer?.lastName) missing.push({ field: 'customer.lastName', label: 'Customer last name', severity: 'critical' });
      if (!appointment?.customer?.phone && !appointment?.customer?.email) missing.push({ field: 'customer.phone', label: 'Phone or email', severity: 'critical' });
      if (!appointment?.customer?.address && !appointment?.jobAddress) missing.push({ field: 'customer.address', label: 'Address', severity: 'critical' });
      break;

    case 1: // Project
      if (!appointment?.jobAddress) missing.push({ field: 'jobAddress', label: 'Job address', severity: 'critical' });
      if (!appointment?.exteriorType) missing.push({ field: 'exteriorType', label: 'Exterior type', severity: 'warning' });
      break;

    case 2: // Sketch
      // Sketch is validated by sketch page itself
      break;

    case 3: // Automated Pricing
      if (!appointment?.openings?.length) missing.push({ field: 'openings', label: 'At least one opening', severity: 'critical' });
      const incompleteOpenings = (appointment?.openings || []).filter((o: any) => !o.width || !o.height);
      if (incompleteOpenings.length > 0) {
        missing.push({ field: 'openings.measurements', label: `${incompleteOpenings.length} openings missing measurements`, severity: 'critical' });
      }
      if ((appointment?.totalAmount || 0) <= 0) missing.push({ field: 'totalAmount', label: 'Quote total', severity: 'warning' });
      break;

    case 4: // Validation
      // Validation step is informational
      break;

    case 5: // Fix Issues
      // Fix step shows issues to resolve
      break;

    case 6: // Review & Submit
      if (!appointment?.customer?.firstName) missing.push({ field: 'customer', label: 'Customer data', severity: 'critical' });
      if (!appointment?.openings?.length) missing.push({ field: 'openings', label: 'No openings defined', severity: 'critical' });
      if ((appointment?.totalAmount || 0) <= 0) missing.push({ field: 'totalAmount', label: 'Quote total missing', severity: 'critical' });
      break;
  }

  const total = missing.length + 1; // +1 to avoid division by zero
  const filled = total - missing.length;
  return {
    complete: missing.length === 0,
    missing,
    percentage: Math.round((filled / total) * 100),
  };
}

// ── Contract Generation Guard ───────────────────────────────

export interface ContractGuardResult {
  canGenerate: boolean;
  blockers: string[];
  warnings: string[];
}

export function checkContractReadiness(appointment: any): ContractGuardResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Customer data
  if (!appointment?.customer?.firstName || !appointment?.customer?.lastName) {
    blockers.push('Customer name is missing');
  }
  if (!appointment?.customer?.phone && !appointment?.customer?.email) {
    blockers.push('Customer contact info is missing');
  }
  if (!appointment?.jobAddress && !appointment?.customer?.address) {
    blockers.push('Job address is missing');
  }

  // Openings
  if (!appointment?.openings?.length) {
    blockers.push('No openings defined — add at least one opening');
  } else {
    const unmeasured = appointment.openings.filter((o: any) => !o.width || !o.height);
    if (unmeasured.length > 0) {
      blockers.push(`${unmeasured.length} opening(s) missing measurements`);
    }
  }

  // Pricing
  if ((appointment?.totalAmount || 0) <= 0) {
    blockers.push('Quote total is $0 — run Automated Pricing first');
  }

  // Warnings (non-blocking)
  const noProduct = (appointment?.openings || []).filter((o: any) => !o.productLine);
  if (noProduct.length > 0) {
    warnings.push(`${noProduct.length} opening(s) missing product selection`);
  }

  const noColor = (appointment?.openings || []).filter((o: any) => !o.interiorColor && !o.exteriorColor);
  if (noColor.length > 0) {
    warnings.push(`${noColor.length} opening(s) missing color selection`);
  }

  return {
    canGenerate: blockers.length === 0,
    blockers,
    warnings,
  };
}

// ── Offline Save Queue ──────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'wwa_offline_queue';

interface QueuedSave {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  body: any;
  appointmentId?: string;
}

export function queueOfflineSave(save: Omit<QueuedSave, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedSave[] = raw ? JSON.parse(raw) : [];
    queue.push({
      ...save,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch { /* full */ }
}

export function getOfflineQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearOfflineQueue(): void {
  try { localStorage.removeItem(OFFLINE_QUEUE_KEY); } catch (e) { console.debug("[swallowed error]", e); }
}

export async function flushOfflineQueue(
  executeFn: (save: QueuedSave) => Promise<void>
): Promise<{ flushed: number; failed: number }> {
  const queue = getOfflineQueue();
  let flushed = 0, failed = 0;

  for (const save of queue) {
    try {
      await executeFn(save);
      flushed++;
    } catch {
      failed++;
    }
  }

  if (failed === 0) clearOfflineQueue();
  return { flushed, failed };
}

// ── UI Components ───────────────────────────────────────────

export function NetworkBanner() {
  const { online } = useNetworkGuard();
  if (online) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      color: '#fff', padding: '0.5rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 2px 12px rgba(220,38,38,0.4)',
    }}>
      <span>📡</span>
      <span>You are offline — changes will be saved locally and synced when reconnected</span>
    </div>
  );
}

export function SaveStateIndicator({ state, lastSaved, errorMsg, onRetry }: {
  state: SaveState;
  lastSaved: number | null;
  errorMsg: string | null;
  onRetry?: () => void;
}) {
  const labels: Record<SaveState, { icon: string; text: string; color: string }> = {
    idle: { icon: '', text: '', color: 'transparent' },
    saving: { icon: '💾', text: 'Saving...', color: '#3b82f6' },
    saved: { icon: '✅', text: 'Saved', color: '#22c55e' },
    failed: { icon: '❌', text: 'Save failed', color: '#ef4444' },
    retrying: { icon: '🔄', text: 'Retrying...', color: '#f59e0b' },
  };

  const l = labels[state];
  if (state === 'idle') return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.375rem',
      fontSize: '0.7rem', fontWeight: 700, color: l.color,
      padding: '0.25rem 0.5rem', borderRadius: 6,
      background: `${l.color}15`, border: `1px solid ${l.color}30`,
      transition: 'all 0.2s',
    }}>
      <span>{l.icon}</span>
      <span>{l.text}</span>
      {state === 'failed' && onRetry && (
        <button onClick={onRetry} style={{
          marginLeft: '0.25rem', padding: '2px 6px', borderRadius: 4,
          border: `1px solid ${l.color}`, background: 'transparent',
          color: l.color, fontSize: '0.65rem', fontWeight: 700,
          cursor: 'pointer',
        }}>
          Retry
        </button>
      )}
      {lastSaved && state === 'saved' && (
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
          {new Date(lastSaved).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
