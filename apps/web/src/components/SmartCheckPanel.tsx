// ═══════════════════════════════════════════════════════════════════════════
// SmartCheckPanel.tsx — Compact collapsible Field Intelligence QA panel
//
// Used in:
// - MobileFieldPage: checklist tab (full mode), pricing tab (compact)
// - FinalReviewPage: pre-submit gate (full mode)
// - SketchFieldPage: opening panel (compact mode)
//
// BOUNDARY RULE:
// - All suggestions require explicit user action to apply.
// - The panel never silently modifies measurements, pricing, or contracts.
// - A crash in this panel must NEVER crash the parent page (ErrorBoundary wraps it).
// - All buttons that lead to data changes open a confirmation dialog first.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type {
  FieldIntelligenceFinding,
  FieldIntelligenceReport,
  FindingSeverity,
} from '../lib/fieldIntelligence/types';
import { markFindingStatus } from '../lib/fieldIntelligence/offlineCache';
import { toast } from './Toast';
import { api } from '../utils/api';

// ── Error Boundary ────────────────────────────────────────────────────────

interface EBState { hasError: boolean; error?: Error }

class SmartCheckErrorBoundary extends Component<
  { children: ReactNode; compact: boolean },
  EBState
> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[SmartCheckPanel] caught error:', err, info);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>
            ⚠️ Smart Check unavailable
          </div>
        );
      }
      return (
        <div style={{
          padding: '1rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8rem', color: 'var(--danger)',
        }}>
          ⚠️ Smart Check encountered an error. Your data is safe. Reload to try again.
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Severity Config ───────────────────────────────────────────────────────

const SEV_CONFIG: Record<FindingSeverity, { color: string; bg: string; icon: string; label: string }> = {
  blocking: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴', label: 'Blocking' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡', label: 'Review' },
  info:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '🔵', label: 'Tip' },
};

// ── Confirm Dialog ────────────────────────────────────────────────────────

interface ConfirmAction {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
}

function ConfirmDialog({
  action,
  onClose,
}: {
  action: ConfirmAction;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await action.onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.5rem',
        maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 800 }}>
          {action.title}
        </h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {action.description}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', fontWeight: 600,
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', fontWeight: 700,
              background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Applying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Finding Card ──────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onStatusChange,
  onIgnore,
}: {
  finding: FieldIntelligenceFinding;
  onStatusChange: (id: string, status: FieldIntelligenceFinding['status'], reason?: string) => void;
  onIgnore: (finding: FieldIntelligenceFinding) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV_CONFIG[finding.severity];
  const isResolved = finding.status !== 'open';

  return (
    <div
      style={{
        padding: '0.625rem 0.75rem',
        borderRadius: 8,
        border: `1px solid ${sev.color}30`,
        background: isResolved ? 'rgba(255,255,255,0.02)' : sev.bg,
        marginBottom: '0.5rem',
        opacity: isResolved ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontSize: '0.75rem', flexShrink: 0, marginTop: 1 }}>{sev.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {finding.title}
          </div>
          {isResolved && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {finding.status === 'applied' ? '✓ Applied'
                : finding.status === 'ignored' ? '✕ Ignored'
                : finding.status === 'reviewed' ? '👁 Reviewed'
                : '📋 Manager review'}
            </div>
          )}
        </div>
        <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 0.5rem' }}>
            {finding.message}
          </p>

          {finding.suggestedAction && (
            <div style={{
              fontSize: '0.7rem', color: '#3b82f6', padding: '0.375rem 0.5rem',
              background: 'rgba(59,130,246,0.08)', borderRadius: 6, marginBottom: '0.5rem',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>
              💡 {finding.suggestedAction}
            </div>
          )}

          {/* Action buttons — all require user intent */}
          {!isResolved && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              <button
                id={`fi-reviewed-${finding.id}`}
                onClick={() => onStatusChange(finding.id, 'reviewed')}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
                }}
              >
                👁 Mark Reviewed
              </button>
              <button
                id={`fi-ignore-${finding.id}`}
                onClick={() => onIgnore(finding)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                }}
              >
                ✕ Ignore
              </button>
              <button
                id={`fi-manager-${finding.id}`}
                onClick={() => onStatusChange(finding.id, 'manager_review')}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
                  background: 'transparent', color: 'var(--warning)',
                  border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer',
                }}
              >
                📋 Needs Manager
              </button>
            </div>
          )}

          {/* Confidence indicator for AI findings */}
          {finding.confidence != null && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
              Source: {finding.source.replace(/_/g, ' ')} · Confidence: {Math.round(finding.confidence * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ignore Dialog ─────────────────────────────────────────────────────────

function IgnoreDialog({
  finding,
  onConfirm,
  onClose,
}: {
  finding: FieldIntelligenceFinding;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.5rem',
        maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800 }}>Ignore this finding?</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.4 }}>
          "{finding.title}" — please provide a brief reason. This is saved for audit purposes.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Customer confirmed this is intentional, manager approved override..."
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            padding: '0.5rem', borderRadius: 6, fontSize: '0.85rem',
            background: 'var(--bg-input)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', marginBottom: '1rem',
          }}
          onFocus={e => setTimeout(() => e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120)}
        />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', fontWeight: 600,
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 7, fontSize: '0.875rem', fontWeight: 700,
              background: reason.trim() ? '#ef4444' : 'rgba(239,68,68,0.3)',
              color: '#fff', border: 'none',
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >Ignore Finding</button>
        </div>
      </div>
    </div>
  );
}

// ── Status Ring ───────────────────────────────────────────────────────────

function StatusRing({ counts }: { counts: FieldIntelligenceReport['counts'] }) {
  const color = counts.blocking > 0 ? '#ef4444'
    : counts.warning > 0 ? '#f59e0b'
    : counts.total === 0 ? '#22c55e'
    : '#3b82f6';

  const label = counts.blocking > 0 ? `${counts.blocking} blocking`
    : counts.warning > 0 ? `${counts.warning} to review`
    : counts.total === 0 ? 'All clear'
    : `${counts.info} tips`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0,
      }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

// ── Main SmartCheckPanel ──────────────────────────────────────────────────

export interface SmartCheckPanelProps {
  report: FieldIntelligenceReport | null;
  loading?: boolean;
  /** Compact mode: shows just the status ring + collapse toggle */
  compact?: boolean;
  /** Call this to trigger a fresh Smart Check run */
  onRunCheck?: () => void;
  /** Called after user applies/ignores a finding */
  onFindingResolved?: (finding: FieldIntelligenceFinding) => void;
  appointmentId?: string;
  /** Filter to only show findings for a specific opening */
  filterOpeningId?: string;
  /** Show offline-safe badge */
  isOffline?: boolean;
}

function SmartCheckPanelInner({
  report,
  loading = false,
  compact = false,
  onRunCheck,
  onFindingResolved,
  appointmentId,
  filterOpeningId,
  isOffline = false,
}: SmartCheckPanelProps) {
  const [collapsed, setCollapsed] = useState(compact);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [ignoreFinding, setIgnoreFinding] = useState<FieldIntelligenceFinding | null>(null);
  const [localReport, setLocalReport] = useState(report);

  useEffect(() => { setLocalReport(report); }, [report]);

  const findings = localReport?.findings ?? [];
  const displayFindings = filterOpeningId
    ? findings.filter(f => f.openingId === filterOpeningId || f.openingId == null)
    : findings;
  const openFindings = displayFindings.filter(f => f.status === 'open');
  const counts = localReport?.counts ?? { blocking: 0, warning: 0, info: 0, total: 0 };
  const displayCounts = filterOpeningId
    ? { blocking: openFindings.filter(f => f.severity === 'blocking').length,
        warning: openFindings.filter(f => f.severity === 'warning').length,
        info: openFindings.filter(f => f.severity === 'info').length,
        total: openFindings.length }
    : counts;

  const handleStatusChange = useCallback(async (
    id: string,
    status: FieldIntelligenceFinding['status'],
    reason?: string,
  ) => {
    await markFindingStatus(id, status, reason);
    setLocalReport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.map(f =>
          f.id === id ? { ...f, status, resolvedAt: Date.now(), overrideReason: reason } : f
        ),
        counts: {
          ...prev.counts,
          total: Math.max(0, prev.counts.total - 1),
        },
      };
    });
    const resolved = findings.find(f => f.id === id);
    if (resolved) {
      onFindingResolved?.(resolved);

      // Log to server audit trail (best-effort, non-blocking)
      if (appointmentId) {
        api.post?.(`/api/review-actions`, {
          appointmentId,
          issueId: id,
          issueType: 'field_intelligence_finding',
          actionType: status,
          payload: JSON.stringify({ reason }),
        }).catch(() => {});
      }
    }
    toast.success(
      status === 'reviewed' ? 'Marked as reviewed'
        : status === 'manager_review' ? 'Escalated to manager review'
        : status === 'ignored' ? 'Finding ignored'
        : 'Finding updated',
    );
  }, [findings, onFindingResolved, appointmentId]);

  const handleIgnoreConfirm = useCallback(async (reason: string) => {
    if (!ignoreFinding) return;
    await handleStatusChange(ignoreFinding.id, 'ignored', reason);
    setIgnoreFinding(null);
  }, [ignoreFinding, handleStatusChange]);

  // ── Compact mode ──────────────────────────────────────────────────────
  if (compact && collapsed) {
    return (
      <button
        id="smart-check-compact-btn"
        onClick={() => setCollapsed(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${displayCounts.blocking > 0 ? 'rgba(239,68,68,0.3)' : displayCounts.warning > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Smart Check</span>
        {loading
          ? <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>…</span>
          : <StatusRing counts={displayCounts} />}
      </button>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────
  return (
    <>
      {confirmAction && (
        <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      )}
      {ignoreFinding && (
        <IgnoreDialog
          finding={ignoreFinding}
          onConfirm={handleIgnoreConfirm}
          onClose={() => setIgnoreFinding(null)}
        />
      )}

      <div style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '0.75rem',
        marginBottom: compact ? 0 : '0.75rem',
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: openFindings.length > 0 ? '0.625rem' : 0,
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)', flex: 1 }}>
            🔍 Smart Check
          </div>
          {isOffline && (
            <span style={{
              fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4,
              background: 'rgba(245,158,11,0.15)', color: 'var(--warning)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>offline</span>
          )}
          {localReport && <StatusRing counts={displayCounts} />}
          {onRunCheck && (
            <button
              id="smart-check-run-btn"
              onClick={onRunCheck}
              disabled={loading}
              style={{
                padding: '0.25rem 0.6rem', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.3)', cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1, minHeight: 28,
              }}
            >
              {loading ? '…' : '▶ Run'}
            </button>
          )}
          {compact && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}
            >✕</button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
            Running Smart Check…
          </div>
        )}

        {/* All clear */}
        {!loading && localReport && displayCounts.total === 0 && (
          <div style={{
            fontSize: '0.75rem', color: '#22c55e', padding: '0.375rem 0.5rem',
            background: 'rgba(34,197,94,0.08)', borderRadius: 6,
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            ✅ All checks passed
          </div>
        )}

        {/* Next best actions */}
        {!loading && localReport && localReport.nextBestActions.length > 0 && (
          <div style={{ marginBottom: '0.625rem' }}>
            {localReport.nextBestActions.map((action, i) => (
              <div key={i} style={{
                fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '0.25rem 0',
                lineHeight: 1.4,
              }}>{action}</div>
            ))}
          </div>
        )}

        {/* Blocking findings */}
        {openFindings.filter(f => f.severity === 'blocking').length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
              🔴 Blocking ({openFindings.filter(f => f.severity === 'blocking').length})
            </div>
            {openFindings.filter(f => f.severity === 'blocking').map(f => (
              <FindingCard key={f.id} finding={f} onStatusChange={handleStatusChange} onIgnore={setIgnoreFinding} />
            ))}
          </>
        )}

        {/* Warning findings */}
        {openFindings.filter(f => f.severity === 'warning').length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem', marginTop: '0.375rem' }}>
              🟡 Review ({openFindings.filter(f => f.severity === 'warning').length})
            </div>
            {openFindings.filter(f => f.severity === 'warning').map(f => (
              <FindingCard key={f.id} finding={f} onStatusChange={handleStatusChange} onIgnore={setIgnoreFinding} />
            ))}
          </>
        )}

        {/* Info findings */}
        {openFindings.filter(f => f.severity === 'info').length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem', marginTop: '0.375rem' }}>
              🔵 Tips ({openFindings.filter(f => f.severity === 'info').length})
            </div>
            {openFindings.filter(f => f.severity === 'info').map(f => (
              <FindingCard key={f.id} finding={f} onStatusChange={handleStatusChange} onIgnore={setIgnoreFinding} />
            ))}
          </>
        )}

        {/* Resolved summary */}
        {displayFindings.filter(f => f.status !== 'open').length > 0 && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {displayFindings.filter(f => f.status !== 'open').length} finding{displayFindings.filter(f => f.status !== 'open').length > 1 ? 's' : ''} resolved
          </div>
        )}

        {/* No report yet */}
        {!loading && !localReport && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
            Tap Run to check this appointment for issues.
          </div>
        )}
      </div>
    </>
  );
}

export function SmartCheckPanel(props: SmartCheckPanelProps) {
  return (
    <SmartCheckErrorBoundary compact={props.compact ?? false}>
      <SmartCheckPanelInner {...props} />
    </SmartCheckErrorBoundary>
  );
}
