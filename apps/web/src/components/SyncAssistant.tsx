// ═══════════════════════════════════════════════════════════════════════════
// SyncAssistant.tsx — Human-friendly sync status explanation widget
//
// Separate from SyncStatusBar (which shows sync dots/counts).
// This widget explains WHAT is pending, WHY it matters, and WHAT to do.
//
// Shows:
// - How many items are pending sync
// - How many photos are pending or failed
// - Pricing cache age
// - Conflict count
// - Human-friendly messages for each issue
// - Retry button for failed photo uploads
// - "What is safe offline" disclosure
//
// BOUNDARY RULE: Widget is read-only advisory. It does NOT trigger sync,
// retry uploads, or resolve conflicts automatically. All actions are
// explicit user taps.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { getSyncStateSummary, getOfflineSafeActions, getOnlineRequiredActions } from '../lib/fieldIntelligence/syncQA';
import type { SyncStateSummary } from '../lib/fieldIntelligence/syncQA';
import { toast } from './Toast';

interface SyncAssistantProps {
  appointmentId: string;
  isOnline: boolean;
  onRetryPhotos?: () => void;
  onOpenConflicts?: () => void;
  compact?: boolean;
}

function SyncDot({ ok }: { ok: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: ok ? '#22c55e' : '#ef4444',
      boxShadow: `0 0 4px ${ok ? '#22c55e' : '#ef4444'}80`,
    }} />
  );
}

export function SyncAssistant({
  appointmentId,
  isOnline,
  onRetryPhotos,
  onOpenConflicts,
  compact = false,
}: SyncAssistantProps) {
  const [summary, setSummary] = useState<SyncStateSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showOfflineHelp, setShowOfflineHelp] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await getSyncStateSummary(appointmentId);
      setSummary(s);
    } catch {
      // Non-fatal
    }
  }, [appointmentId]);

  useEffect(() => {
    refresh();
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!summary) return null;

  const hasBlockingIssues = summary.failedPhotos > 0 || summary.conflicts > 0;
  const hasPendingItems = summary.pendingOutbox > 0 || summary.pendingPhotos > 0 || summary.pendingSignatures > 0;
  const allGood = !hasBlockingIssues && !hasPendingItems;

  const headerColor = hasBlockingIssues ? '#ef4444' : hasPendingItems ? '#f59e0b' : '#22c55e';
  const headerIcon = hasBlockingIssues ? '⚠️' : hasPendingItems ? '🔄' : '✅';
  const headerText = hasBlockingIssues
    ? `${summary.failedPhotos > 0 ? `${summary.failedPhotos} upload failed` : ''}${summary.conflicts > 0 ? ` · ${summary.conflicts} conflict${summary.conflicts > 1 ? 's' : ''}` : ''}`
    : hasPendingItems
      ? `${summary.pendingOutbox + summary.pendingPhotos + summary.pendingSignatures} pending sync`
      : isOnline ? 'Synced' : 'Saved offline';

  // ── Compact mode ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        id="sync-assistant-compact-btn"
        onClick={() => setShowDetails(d => !d)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '0.25rem 0',
        }}
      >
        <SyncDot ok={allGood} />
        <span style={{ fontSize: '0.72rem', color: headerColor, fontWeight: 600 }}>{headerText}</span>
      </button>
    );
  }

  // ── Full widget ───────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${headerColor}30`,
      borderRadius: 10, padding: '0.75rem',
      marginBottom: '0.75rem',
    }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        onClick={() => setShowDetails(d => !d)}
      >
        <SyncDot ok={allGood} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {headerIcon} {headerText}
          </div>
          {!isOnline && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Offline — changes saved locally
            </div>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {showDetails ? '▾' : '▸'}
        </span>
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div style={{ marginTop: '0.625rem', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
          {/* Status rows */}
          {summary.pendingOutbox > 0 && (
            <SyncRow
              icon="📝"
              color="#3b82f6"
              message={`${summary.pendingOutbox} change${summary.pendingOutbox > 1 ? 's' : ''} saved locally — will sync when connected`}
            />
          )}
          {summary.pendingPhotos > 0 && (
            <SyncRow
              icon="📷"
              color="#f59e0b"
              message={`${summary.pendingPhotos} photo${summary.pendingPhotos > 1 ? 's' : ''} queued for upload`}
            />
          )}
          {summary.failedPhotos > 0 && (
            <SyncRow
              icon="⚠️"
              color="#ef4444"
              message={`${summary.failedPhotos} photo upload${summary.failedPhotos > 1 ? 's' : ''} failed`}
              action={onRetryPhotos ? (
                <button
                  id="sync-retry-photos-btn"
                  onClick={(e) => { e.stopPropagation(); onRetryPhotos(); toast.info('Retrying photo uploads…'); }}
                  style={{
                    padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                  }}
                >Retry</button>
              ) : undefined}
            />
          )}
          {summary.pendingSignatures > 0 && (
            <SyncRow
              icon="✍️"
              color="#f59e0b"
              message={`${summary.pendingSignatures} signature${summary.pendingSignatures > 1 ? 's' : ''} saved offline — will upload when connected`}
            />
          )}
          {summary.conflicts > 0 && (
            <SyncRow
              icon="⚡"
              color="#ef4444"
              message={`${summary.conflicts} sync conflict${summary.conflicts > 1 ? 's' : ''} need review`}
              action={onOpenConflicts ? (
                <button
                  id="sync-open-conflicts-btn"
                  onClick={(e) => { e.stopPropagation(); onOpenConflicts(); }}
                  style={{
                    padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                  }}
                >Review</button>
              ) : undefined}
            />
          )}
          {summary.pricingCacheAgeHours != null && summary.pricingCacheAgeHours >= 24 && (
            <SyncRow
              icon="💰"
              color={summary.pricingCacheAgeHours >= 48 ? '#f59e0b' : '#3b82f6'}
              message={`Pricing cached ${summary.pricingCacheAgeHours}h ago — online revalidation recommended`}
            />
          )}
          {allGood && (
            <div style={{ fontSize: '0.75rem', color: 'var(--ok)', padding: '0.25rem 0' }}>
              ✅ All changes synced. Safe to proceed.
            </div>
          )}

          {/* Offline safe help */}
          <button
            onClick={() => setShowOfflineHelp(h => !h)}
            style={{
              marginTop: '0.5rem', background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.65rem', cursor: 'pointer',
              textDecoration: 'underline', padding: 0,
            }}
          >
            {showOfflineHelp ? '▾ Hide offline guide' : '▸ What is safe to do offline?'}
          </button>

          {showOfflineHelp && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--ok)', marginBottom: '0.25rem' }}>
                ✅ Safe offline:
              </div>
              {getOfflineSafeActions().map((a, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '1px 0' }}>• {a}</div>
              ))}
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--amber)', margin: '0.5rem 0 0.25rem' }}>
                ⚠️ Requires internet:
              </div>
              {getOnlineRequiredActions().map((a, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '1px 0' }}>• {a}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SyncRow({
  icon, color, message, action,
}: {
  icon: string;
  color: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.25rem 0', fontSize: '0.72rem', color: 'var(--text-secondary)',
    }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, lineHeight: 1.35 }}>{message}</span>
      {action}
    </div>
  );
}
