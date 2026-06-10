// ─────────────────────────────────────────────────────────────────────────────
// SyncStatusBar.tsx — Global offline/sync status indicator
//
// Displays: Online/Offline badge, last sync time, pending count, Sync Now,
// View Conflicts button. Adapts between compact (iPhone) and full (iPad/desktop).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { subscribeSyncState, drainOutbox, drainPhotoQueue, drainWithPull, type SyncEngineState } from '../lib/syncEngine';
import { SmartCheckPanel } from './SmartCheckPanel';
import { useSmartCheck } from '../hooks/useSmartCheck';

interface SyncStatusBarProps {
  appointmentId?: string;
  compact?: boolean;    // iPhone: show minimal indicator
  className?: string;
  onViewConflicts?: () => void;
}

const STATUS_CONFIG: Record<SyncEngineState['status'], { color: string; bg: string; label: string; icon: string }> = {
  idle:    { color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  label: 'Synced',          icon: '✓' },
  syncing: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', label: 'Syncing…',        icon: '⟳' },
  pending: { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', label: 'Pending Changes', icon: '↑' },
  failed:  { color: '#f87171', bg: 'rgba(239,68,68,0.12)',  label: 'Sync Failed',     icon: '✕' },
  conflict:{ color: '#fb923c', bg: 'rgba(249,115,22,0.12)', label: 'Conflict',        icon: '⚡' },
  offline: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',label: 'Offline',         icon: '✈' },
};

function formatRelativeTime(ts?: number): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function SyncStatusBar({ appointmentId, compact = false, className = '', onViewConflicts }: SyncStatusBarProps) {
  const [state, setState] = useState<SyncEngineState>({
    status: navigator.onLine ? 'idle' : 'offline',
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
  });
  const [syncing, setSyncing] = useState(false);

  const { report: smartCheckReport, loading: smartCheckLoading, runCheck: runSmartCheck, handleFindingResolved } = useSmartCheck(appointmentId, {
    stage: 'full_details',
  });

  useEffect(() => {
    const unsub = subscribeSyncState(setState);
    return unsub;
  }, []);

  const cfg = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.idle;

  const handleSyncNow = async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      await drainWithPull(); // pull remote changes first, then drain outbox
      await drainPhotoQueue();
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    // Reset failed items to pending so they get retried
    const { getOfflineDb } = await import('../lib/offlineDb');
    const db = getOfflineDb();
    await db.sync_outbox
      .where('status').equals('failed')
      .modify({ status: 'pending', retryCount: 0, nextRetryAt: undefined, lastError: undefined });
    try {
      await drainWithPull();
      await drainPhotoQueue();
    } finally {
      setSyncing(false);
    }
  };

  const isOffline = state.status === 'offline' || !navigator.onLine;
  const hasPending = state.pendingCount > 0;
  const hasConflicts = state.conflictCount > 0;
  const hasFailed = state.failedCount > 0;

  // ── iPhone compact mode ──────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={className}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '4px 8px',
          background: cfg.bg,
          borderRadius: 20,
          border: `1px solid ${cfg.color}30`,
        }}
      >
        <span style={{ fontSize: '0.65rem', color: cfg.color, fontWeight: 800 }}>
          {state.status === 'syncing' ? '⟳' : cfg.icon} {isOffline ? 'Offline' : hasPending ? `${state.pendingCount} pending` : 'Synced'}
        </span>
      </div>
    );
  }

  // ── Full mode (iPad / desktop / appointment page) ─────────────────────────
  return (
    <div
      className={className}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        padding: '6px 10px',
        background: cfg.bg,
        borderRadius: 10,
        border: `1px solid ${cfg.color}30`,
        fontSize: '0.7rem',
      }}
    >
      {/* Smart Check Panel for Sync (only if appointmentId provided and findings exist) */}
      {appointmentId && smartCheckReport && smartCheckReport.findings.some((f: any) => f.category === 'sync' && f.status === 'open') && (
        <div style={{ width: '100%', marginBottom: '0.25rem' }}>
          <SmartCheckPanel
            report={smartCheckReport}
            loading={smartCheckLoading}
            compact={true}
            appointmentId={appointmentId}
            onRunCheck={runSmartCheck}
            onFindingResolved={handleFindingResolved}
          />
        </div>
      )}

      {/* Status badge */}
      <span style={{ color: cfg.color, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          background: `${cfg.color}25`, fontSize: '0.6rem',
          animation: state.status === 'syncing' ? 'spin 1s linear infinite' : undefined,
        }}>
          {cfg.icon}
        </span>
        {cfg.label}
      </span>

      {/* Last sync */}
      <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
        {isOffline ? 'No connection' : `Last sync: ${formatRelativeTime(state.lastSyncAt)}`}
      </span>

      {/* Pending count */}
      {hasPending && (
        <span style={{
          padding: '1px 6px', borderRadius: 9999,
          background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
          fontSize: '0.65rem', fontWeight: 700,
        }}>
          {state.pendingCount} pending
        </span>
      )}

      {/* Conflict badge */}
      {hasConflicts && (
        <button
          onClick={onViewConflicts}
          style={{
            padding: '1px 8px', borderRadius: 9999,
            background: 'rgba(249,115,22,0.15)', color: '#fb923c',
            border: 'none', cursor: 'pointer',
            fontSize: '0.65rem', fontWeight: 700,
          }}
        >
          ⚡ {state.conflictCount} conflict{state.conflictCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Failed count + Retry */}
      {hasFailed && (
        <button
          onClick={handleRetryFailed}
          disabled={syncing || isOffline}
          style={{
            padding: '1px 8px', borderRadius: 9999,
            background: 'rgba(239,68,68,0.15)', color: '#f87171',
            border: 'none', cursor: (syncing || isOffline) ? 'default' : 'pointer',
            fontSize: '0.65rem', fontWeight: 700, opacity: (syncing || isOffline) ? 0.6 : 1,
          }}
        >
          ✕ {state.failedCount} failed — Retry
        </button>
      )}

      {/* Sync Now */}
      {!isOffline && hasPending && !hasFailed && (
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          style={{
            padding: '2px 8px', borderRadius: 9999,
            background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
            border: 'none', cursor: syncing ? 'default' : 'pointer',
            fontSize: '0.65rem', fontWeight: 700, opacity: syncing ? 0.6 : 1,
          }}
        >
          {syncing ? '⟳ Syncing…' : '↑ Sync Now'}
        </button>
      )}

      {/* Photo upload progress */}
      {state.photoUploadProgress !== undefined && state.photoUploadProgress >= 0 && (
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '4px 0', fontSize: '0.65rem',
        }}>
          <span style={{ color: '#60a5fa', fontWeight: 700, whiteSpace: 'nowrap' }}>
            📸 Uploading photos...
          </span>
          <div style={{
            flex: 1, height: 6, borderRadius: 3,
            background: 'rgba(59,130,246,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${state.photoUploadProgress}%`,
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {state.photoUploadProgress}%
          </span>
        </div>
      )}

      {/* Offline banner text */}
      {isOffline && (
        <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontStyle: 'italic' }}>
          Working offline — changes saved locally
        </span>
      )}
    </div>
  );
}

// ── Offline banner (full-width, shown at top of page when offline) ────────────

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(148,163,184,0.2)',
      padding: '6px 1rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontSize: '0.75rem', color: '#94a3b8',
    }}>
      <span style={{ fontSize: '0.9rem' }}>✈</span>
      <strong style={{ color: '#e2e8f0' }}>Offline Mode</strong>
      — Your changes are saved locally and will sync when you reconnect.
    </div>
  );
}
