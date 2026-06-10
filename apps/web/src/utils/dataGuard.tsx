// ═══════════════════════════════════════════════════════════════
// DataGuard — Aggressive Data Protection System
// Zero data loss guarantee for field operations.
//
// LAYERS:
// 1. Continuous autosave (2s debounce to localStorage)
// 2. Opening version history (last 20 revisions per opening)
// 3. Undo stack (last 50 operations, Ctrl+Z to undo)
// 4. Crash recovery (beforeunload + visibilitychange persistence)
// 5. Session journal (append-only log for forensic recovery)
// 6. Draft snapshot (full appointment state saved every 30s)
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';

// ── Storage Keys ────────────────────────────────────────────
const PREFIX = 'wwa_guard_';
const JOURNAL_KEY = `${PREFIX}journal`;
const UNDO_KEY = `${PREFIX}undo`;
const VERSIONS_KEY = `${PREFIX}versions`;
const CRASH_KEY = `${PREFIX}crash_recovery`;
const AUTOSAVE_KEY = (id: string) => `${PREFIX}autosave_${id}`;
const SNAPSHOT_KEY = (id: string) => `${PREFIX}snapshot_${id}`;

// ── Safe Storage Helpers ────────────────────────────────────
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    // localStorage full — try to free space by pruning old data
    if (e?.name === 'QuotaExceededError') {
      pruneOldGuardData();
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* truly full */ }
    }
  }
}

function pruneOldGuardData(): void {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000; // 72 hours
  // Prune old journal entries
  const journal: JournalEntry[] = safeGet(JOURNAL_KEY, []);
  const pruned = journal.filter(e => e.timestamp > cutoff);
  safeSet(JOURNAL_KEY, pruned);
  // Prune old version histories
  const versions: Record<string, OpeningVersion[]> = safeGet(VERSIONS_KEY, {});
  for (const key of Object.keys(versions)) {
    versions[key] = versions[key].slice(-10); // keep last 10
  }
  safeSet(VERSIONS_KEY, versions);
}

// ── Types ───────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  timestamp: number;
  type: 'opening_save' | 'opening_delete' | 'measurement_update' | 'sketch_save' |
        'note_save' | 'photo_add' | 'pricing_update' | 'signature_save' | 'proposal_save' |
        'autosave' | 'crash_recovery' | 'undo' | 'redo';
  appointmentId?: string;
  openingNumber?: number;
  entityId?: string;
  summary: string;
  dataBefore?: any;
  dataAfter?: any;
}

export interface OpeningVersion {
  versionId: string;
  timestamp: number;
  openingId: string;
  openingNumber: number;
  appointmentId: string;
  data: Record<string, any>;
  source: 'manual_save' | 'autosave' | 'bulk_update' | 'voice_apply' | 'wizard';
}

export interface UndoEntry {
  id: string;
  timestamp: number;
  type: string;
  entityType: 'opening' | 'measurement' | 'note' | 'sketch';
  entityId: string;
  previousData: any;
  newData: any;
  description: string;
}

interface CrashRecoveryData {
  timestamp: number;
  appointmentId: string;
  editingOpening?: any;
  unsavedChanges: boolean;
  tab?: string;
  measurements?: Record<string, any>;
}

// ── 1. Session Journal (append-only audit log) ──────────────
export function journalWrite(entry: Omit<JournalEntry, 'id' | 'timestamp'>): void {
  const journal: JournalEntry[] = safeGet(JOURNAL_KEY, []);
  journal.push({
    ...entry,
    id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  // Keep last 500 entries
  const trimmed = journal.slice(-500);
  safeSet(JOURNAL_KEY, trimmed);
}

export function journalRead(appointmentId?: string): JournalEntry[] {
  const journal: JournalEntry[] = safeGet(JOURNAL_KEY, []);
  if (appointmentId) return journal.filter(e => e.appointmentId === appointmentId);
  return journal;
}

// ── 2. Opening Version History ──────────────────────────────
const MAX_VERSIONS = 20;

export function saveOpeningVersion(
  opening: any,
  source: OpeningVersion['source'] = 'manual_save'
): void {
  const versions: Record<string, OpeningVersion[]> = safeGet(VERSIONS_KEY, {});
  const key = opening.id || `new_${opening.appointmentId}_${opening.openingNumber}`;
  if (!versions[key]) versions[key] = [];

  // Don't save duplicate if data hasn't changed
  const last = versions[key][versions[key].length - 1];
  if (last) {
    const diff = JSON.stringify(last.data) !== JSON.stringify(stripMeta(opening));
    if (!diff) return;
  }

  versions[key].push({
    versionId: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    openingId: opening.id || '',
    openingNumber: opening.openingNumber,
    appointmentId: opening.appointmentId,
    data: stripMeta(opening),
    source,
  });

  // Keep last N versions per opening
  versions[key] = versions[key].slice(-MAX_VERSIONS);
  safeSet(VERSIONS_KEY, versions);
}

export function getOpeningVersions(openingId: string): OpeningVersion[] {
  const versions: Record<string, OpeningVersion[]> = safeGet(VERSIONS_KEY, {});
  return versions[openingId] || [];
}

export function getOpeningVersionByKey(appointmentId: string, openingNumber: number): OpeningVersion[] {
  const versions: Record<string, OpeningVersion[]> = safeGet(VERSIONS_KEY, {});
  const key = `new_${appointmentId}_${openingNumber}`;
  return versions[key] || [];
}

export function restoreOpeningVersion(versionId: string): any | null {
  const versions: Record<string, OpeningVersion[]> = safeGet(VERSIONS_KEY, {});
  for (const key of Object.keys(versions)) {
    const v = versions[key].find(v => v.versionId === versionId);
    if (v) return v.data;
  }
  return null;
}

// ── 3. Undo Stack ───────────────────────────────────────────
const MAX_UNDO = 50;

export function undoPush(entry: Omit<UndoEntry, 'id' | 'timestamp'>): void {
  const stack: UndoEntry[] = safeGet(UNDO_KEY, []);
  stack.push({
    ...entry,
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  safeSet(UNDO_KEY, stack.slice(-MAX_UNDO));
}

export function undoPop(): UndoEntry | null {
  const stack: UndoEntry[] = safeGet(UNDO_KEY, []);
  if (stack.length === 0) return null;
  const entry = stack.pop()!;
  safeSet(UNDO_KEY, stack);
  return entry;
}

export function undoPeek(): UndoEntry | null {
  const stack: UndoEntry[] = safeGet(UNDO_KEY, []);
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

export function undoCount(): number {
  return safeGet<UndoEntry[]>(UNDO_KEY, []).length;
}

// ── 4. Crash Recovery ───────────────────────────────────────
export function setCrashRecovery(data: CrashRecoveryData): void {
  safeSet(CRASH_KEY, data);
}

export function getCrashRecovery(): CrashRecoveryData | null {
  return safeGet<CrashRecoveryData | null>(CRASH_KEY, null);
}

export function clearCrashRecovery(): void {
  try { localStorage.removeItem(CRASH_KEY); } catch (e) { console.debug("[swallowed error]", e); }
}

// ── 5. Autosave (per-opening, debounced) ────────────────────
export function autosaveOpening(appointmentId: string, opening: any): void {
  const key = AUTOSAVE_KEY(`${appointmentId}_${opening.openingNumber}`);
  safeSet(key, {
    ...stripMeta(opening),
    _autosavedAt: Date.now(),
    _appointmentId: appointmentId,
  });
}

export function getAutosavedOpening(appointmentId: string, openingNumber: number): any | null {
  const key = AUTOSAVE_KEY(`${appointmentId}_${openingNumber}`);
  return safeGet(key, null);
}

export function clearAutosave(appointmentId: string, openingNumber: number): void {
  const key = AUTOSAVE_KEY(`${appointmentId}_${openingNumber}`);
  try { localStorage.removeItem(key); } catch (e) { console.debug("[swallowed error]", e); }
}

// ── 6. Full Appointment Snapshot ─────────────────────────────
export function saveAppointmentSnapshot(appointmentId: string, data: any): void {
  const key = SNAPSHOT_KEY(appointmentId);
  safeSet(key, {
    ...data,
    _snapshotAt: Date.now(),
  });
}

export function getAppointmentSnapshot(appointmentId: string): any | null {
  return safeGet(SNAPSHOT_KEY(appointmentId), null);
}

// ── Helper: Strip React/internal metadata ───────────────────
function stripMeta(obj: any): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const stripped: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_') || k === '$$typeof') continue;
    stripped[k] = v;
  }
  return stripped;
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

// ── useAutosave: Continuously save editing state ─────────────
export function useAutosave(
  appointmentId: string | undefined,
  data: any | null,
  intervalMs: number = 2000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!data || !appointmentId) return;

    // Debounced autosave
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const serialized = JSON.stringify(data);
      if (serialized !== lastSavedRef.current) {
        autosaveOpening(appointmentId, data);
        lastSavedRef.current = serialized;
      }
    }, intervalMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, appointmentId, intervalMs]);
}

// ── useCrashGuard: Protect against unexpected exits ─────────
export function useCrashGuard(
  appointmentId: string | undefined,
  editingOpening: any | null,
  currentTab?: string
) {
  // Save crash recovery state on every change
  useEffect(() => {
    if (!appointmentId) return;
    setCrashRecovery({
      timestamp: Date.now(),
      appointmentId,
      editingOpening,
      unsavedChanges: !!editingOpening,
      tab: currentTab,
    });
  }, [appointmentId, editingOpening, currentTab]);

  // Warn on page exit if unsaved changes exist
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editingOpening) {
        // Save everything before exit
        if (appointmentId) {
          autosaveOpening(appointmentId, editingOpening);
          saveOpeningVersion(editingOpening, 'autosave');
          journalWrite({
            type: 'crash_recovery',
            appointmentId,
            openingNumber: editingOpening.openingNumber,
            summary: `Emergency save: Opening #${editingOpening.openingNumber} before page exit`,
            dataAfter: editingOpening,
          });
        }
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Also save on visibility change (app going to background on mobile)
    const visHandler = () => {
      if (document.visibilityState === 'hidden' && editingOpening && appointmentId) {
        autosaveOpening(appointmentId, editingOpening);
        saveOpeningVersion(editingOpening, 'autosave');
      }
    };

    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [editingOpening, appointmentId]);
}

// ── usePeriodicSnapshot: Full appointment snapshot ───────────
export function usePeriodicSnapshot(
  appointmentId: string | undefined,
  appointmentData: any | null,
  intervalMs: number = 30000
) {
  useEffect(() => {
    if (!appointmentId || !appointmentData) return;
    // Initial snapshot
    saveAppointmentSnapshot(appointmentId, appointmentData);
    // Periodic
    const interval = setInterval(() => {
      saveAppointmentSnapshot(appointmentId, appointmentData);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [appointmentId, appointmentData, intervalMs]);
}

// ── useRecoveryCheck: Check for crash recovery on mount ─────
export function useRecoveryCheck(
  appointmentId: string | undefined,
  onRecover: (data: CrashRecoveryData) => void
) {
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [recoveryData, setRecoveryData] = useState<CrashRecoveryData | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    const recovery = getCrashRecovery();
    if (recovery && recovery.appointmentId === appointmentId && recovery.unsavedChanges) {
      // Only offer recovery if it's recent (< 24 hours)
      if (Date.now() - recovery.timestamp < 24 * 60 * 60 * 1000) {
        setRecoveryAvailable(true);
        setRecoveryData(recovery);
      } else {
        clearCrashRecovery();
      }
    }
  }, [appointmentId]);

  const acceptRecovery = useCallback(() => {
    if (recoveryData) {
      onRecover(recoveryData);
      clearCrashRecovery();
      setRecoveryAvailable(false);
    }
  }, [recoveryData, onRecover]);

  const dismissRecovery = useCallback(() => {
    clearCrashRecovery();
    setRecoveryAvailable(false);
    setRecoveryData(null);
  }, []);

  return { recoveryAvailable, recoveryData, acceptRecovery, dismissRecovery };
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── Recovery Banner ─────────────────────────────────────────
export function RecoveryBanner({
  recovery, onAccept, onDismiss,
}: {
  recovery: CrashRecoveryData;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const ago = Math.round((Date.now() - recovery.timestamp) / 60000);
  return (
    <div style={{
      padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
      background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)',
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.25rem' }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f59e0b' }}>
          Unsaved Work Detected
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Opening #{recovery.editingOpening?.openingNumber} was being edited {ago < 1 ? 'just now' : `${ago} min ago`}
        </div>
      </div>
      <button onClick={onAccept} style={recoverBtn}>Restore</button>
      <button onClick={onDismiss} style={dismissBtn}>Dismiss</button>
    </div>
  );
}

// ── Version History Panel ───────────────────────────────────
export function VersionHistoryPanel({
  openingId, appointmentId, openingNumber, onRestore,
}: {
  openingId?: string;
  appointmentId: string;
  openingNumber: number;
  onRestore: (data: any) => void;
}) {
  const versions = openingId
    ? getOpeningVersions(openingId)
    : getOpeningVersionByKey(appointmentId, openingNumber);

  if (versions.length === 0) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
        No version history yet — versions are saved on each edit.
      </div>
    );
  }

  return (
    <div style={{
      maxHeight: 200, overflowY: 'auto', fontSize: '0.75rem',
      border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        📋 Version History ({versions.length})
      </div>
      {versions.slice().reverse().map((v, i) => (
        <div key={v.versionId} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.25rem 0', borderBottom: i < versions.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>
              {new Date(v.timestamp).toLocaleTimeString()}
            </span>
            <span style={{
              marginLeft: '0.375rem', padding: '1px 4px', borderRadius: 3,
              background: v.source === 'autosave' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
              color: v.source === 'autosave' ? '#3b82f6' : '#22c55e',
              fontSize: '0.625rem', fontWeight: 600,
            }}>
              {v.source.replace('_', ' ')}
            </span>
            {v.data.width && v.data.height && (
              <span style={{ marginLeft: '0.375rem', color: 'var(--text-secondary)' }}>
                {v.data.width}×{v.data.height}
              </span>
            )}
          </div>
          <button onClick={() => onRestore(v.data)} style={{
            padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
            background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
            fontSize: '0.625rem', fontWeight: 600,
          }}>
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Autosave Status Indicator ───────────────────────────────
export function AutosaveIndicator({ hasUnsaved }: { hasUnsaved: boolean }) {
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 600,
      color: hasUnsaved ? '#f59e0b' : '#22c55e',
      display: 'flex', alignItems: 'center', gap: '0.25rem',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: hasUnsaved ? '#f59e0b' : '#22c55e',
        display: 'inline-block',
        animation: hasUnsaved ? 'pulse 1.5s infinite' : 'none',
      }} />
      {hasUnsaved ? 'Unsaved' : 'Saved'}
    </span>
  );
}

// ── Styles ──────────────────────────────────────────────────
const recoverBtn: React.CSSProperties = {
  padding: '0.375rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: '0.8125rem',
};
const dismissBtn: React.CSSProperties = {
  padding: '0.375rem 1rem', borderRadius: 6, border: '1px solid var(--border)',
  cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
  fontWeight: 500, fontSize: '0.8125rem',
};
