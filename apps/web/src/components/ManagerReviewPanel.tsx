// ═══════════════════════════════════════════════════════════════
// Manager Review Panel — UI for escalation, approval, and audit
// Provides three modes:
//   1. EscalateButton — inline on WarningCard for reps
//   2. ManagerReviewPanel — full panel for manager workflow
//   3. ReviewAuditTimeline — audit trail timeline
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createReviewRequest,
  approveReview,
  rejectReview,
  getReviewsForAppointment,
  getPendingReviews,
  getApprovedReviews,
  getAuditLog,
  getReviewAuditLog,
  getReviewSummary,
  isWarningEscalated,
  inferEscalationReason,
  ESCALATION_LABELS,
  type ManagerReviewRequest,
  type ReviewAuditEntry,
  type EscalationReason,
  type ReviewStatus,
} from '../utils/managerReview';
import { SEVERITY_CONFIG, type UnifiedWarning } from '../utils/centralValidationOrchestrator';
import { useAuthStore } from '../store';

// ── Status Badge Config ──────────────────────────────────────
const STATUS_CONFIG: Record<ReviewStatus, { icon: string; label: string; className: string }> = {
  pending:  { icon: '⏳', label: 'Pending Review', className: 'sev-badge-warning' },
  approved: { icon: '✅', label: 'Approved',        className: 'sev-badge-info' },
  rejected: { icon: '❌', label: 'Rejected',        className: 'sev-badge-critical' },
  expired:  { icon: '⌛', label: 'Expired',         className: 'sev-badge-warning' },
};

// ═════════════════════════════════════════════════════════════
// 1. ESCALATE BUTTON — Inline on WarningCard
// ═════════════════════════════════════════════════════════════

export function EscalateButton({ warning, appointmentId, onEscalated }: {
  warning: UnifiedWarning;
  appointmentId: string;
  onEscalated?: (request: ManagerReviewRequest) => void;
}) {
  const user = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState<EscalationReason>(inferEscalationReason(warning));

  // Check if already escalated
  const existing = isWarningEscalated(appointmentId, warning.id);
  if (existing) {
    const cfg = STATUS_CONFIG[existing.status];
    return (
      <span className={`sev-badge ${cfg.className}`} style={{ fontSize: '0.5rem' }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  }

  // Only critical/high warnings can be escalated
  if (warning.severity !== 'critical' && warning.severity !== 'high') return null;

  if (!showForm) {
    return (
      <button
        className="btn btn-sm btn-secondary"
        onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
        style={{ color: 'var(--sev-high)', borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)' }}
      >
        🔒 Escalate to Manager
      </button>
    );
  }

  const handleSubmit = () => {
    if (!user) return;
    const request = createReviewRequest(
      appointmentId,
      warning,
      reason,
      notes,
      { id: user.id, name: user.name, email: user.email },
      { warningDetail: warning.detail, openingNumber: warning.openingNumber },
    );
    setShowForm(false);
    setNotes('');
    onEscalated?.(request);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      marginTop: '6px', padding: '8px', borderRadius: 8,
      background: 'var(--sev-high-bg)', border: '1px solid var(--sev-high-bdr)',
    }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sev-high)', marginBottom: '6px' }}>
        🔒 Escalate to Manager
      </div>

      {/* Reason picker */}
      <select
        value={reason}
        onChange={e => setReason(e.target.value as EscalationReason)}
        style={{
          width: '100%', padding: '4px 6px', fontSize: '0.6rem', borderRadius: 4,
          background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)',
          marginBottom: '4px',
        }}
      >
        {Object.entries(ESCALATION_LABELS).map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>

      {/* Rep notes */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Why does this need manager approval? What did you observe on-site?"
        rows={2}
        style={{
          width: '100%', padding: '4px 6px', fontSize: '0.6rem', borderRadius: 4,
          background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)',
          resize: 'vertical', marginBottom: '4px',
        }}
      />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={handleSubmit} disabled={!notes.trim()} style={{
          padding: '4px 12px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700,
          border: 'none', cursor: notes.trim() ? 'pointer' : 'not-allowed',
          background: notes.trim() ? 'var(--sev-high)' : 'rgba(148,163,184,0.3)',
          color: '#fff',
        }}>
          📤 Submit for Review
        </button>
        <button onClick={() => setShowForm(false)} style={{
          padding: '4px 12px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700,
          border: '1px solid var(--border)', background: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 2. MANAGER REVIEW PANEL — Full workflow for managers
// ═════════════════════════════════════════════════════════════

export function ManagerReviewPanel({ appointmentId, visible = true, onClose }: {
  appointmentId: string;
  visible?: boolean;
  onClose?: () => void;
}) {
  const user = useAuthStore(s => s.user);
  const [reviews, setReviews] = useState<ManagerReviewRequest[]>([]);
  const [tab, setTab] = useState<'pending' | 'resolved' | 'audit'>('pending');
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setReviews(getReviewsForAppointment(appointmentId));
    setRefreshKey(k => k + 1);
  }, [appointmentId]);

  useEffect(() => { if (visible) refresh(); }, [visible, refresh]);

  const summary = useMemo(() => getReviewSummary(appointmentId), [appointmentId, refreshKey]);
  const auditEntries = useMemo(() => getAuditLog(appointmentId), [appointmentId, refreshKey]);

  if (!visible) return null;

  const pending = reviews.filter(r => r.status === 'pending');
  const resolved = reviews.filter(r => r.status !== 'pending');

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
      background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
      zIndex: 260, display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.3s ease',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>🔒 Manager Review</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {summary.pending > 0 ? `${summary.pending} pending review${summary.pending !== 1 ? 's' : ''}` : 'No pending reviews'}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
          }}>✕</button>
        )}
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: '4px', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'pending', icon: '⏳', count: summary.pending, color: 'var(--sev-warning)' },
          { key: 'approved', icon: '✅', count: summary.approved, color: 'var(--success)' },
          { key: 'rejected', icon: '❌', count: summary.rejected, color: 'var(--sev-critical)' },
          { key: 'expired', icon: '⌛', count: summary.expired, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.key} style={{
            flex: 1, textAlign: 'center', padding: '4px', borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{s.icon} {s.key}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'pending', label: `⏳ Pending (${summary.pending})` },
          { key: 'resolved', label: `📋 Resolved (${summary.approved + summary.rejected})` },
          { key: 'audit', label: `📜 Audit Log` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '0.5rem', fontSize: '0.65rem', fontWeight: 700,
            border: 'none', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            background: tab === t.key ? 'rgba(59,130,246,0.08)' : 'transparent',
            color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {tab === 'pending' && (
          pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              ✅ No pending reviews
            </div>
          ) : (
            pending.map(r => (
              <ReviewCard key={r.id} review={r} isManager={true} onAction={refresh} />
            ))
          )
        )}

        {tab === 'resolved' && (
          resolved.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No resolved reviews yet
            </div>
          ) : (
            resolved.map(r => (
              <ReviewCard key={r.id} review={r} isManager={false} onAction={refresh} />
            ))
          )
        )}

        {tab === 'audit' && (
          <ReviewAuditTimeline entries={auditEntries} />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 3. REVIEW CARD — Individual review with approve/reject
// ═════════════════════════════════════════════════════════════

function ReviewCard({ review, isManager, onAction }: {
  review: ManagerReviewRequest;
  isManager: boolean;
  onAction: () => void;
}) {
  const user = useAuthStore(s => s.user);
  const [managerNotes, setManagerNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [showActions, setShowActions] = useState(false);

  const sev = SEVERITY_CONFIG[review.severity];
  const escLabel = ESCALATION_LABELS[review.escalationReason];
  const statusCfg = STATUS_CONFIG[review.status];
  const timeAgo = getTimeAgo(review.requestedAt);

  const handleApprove = () => {
    if (!user || !managerNotes.trim()) return;
    approveReview(
      review.id,
      { id: user.id, name: user.name, email: user.email },
      managerNotes,
      review.configSnapshot,
      conditions || undefined,
    );
    setManagerNotes('');
    setConditions('');
    setShowActions(false);
    onAction();
  };

  const handleReject = () => {
    if (!user || !managerNotes.trim()) return;
    rejectReview(
      review.id,
      { id: user.id, name: user.name, email: user.email },
      managerNotes,
      managerNotes,
    );
    setManagerNotes('');
    setShowActions(false);
    onAction();
  };

  return (
    <div className={`sev-card sev-card-${review.severity}`} style={{
      marginBottom: '0.5rem', padding: '0.75rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: sev.color, marginBottom: '2px' }}>
            {sev.icon} {review.warningSnapshot.title}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            {review.warningSnapshot.detail}
          </div>
        </div>
        <span className={`sev-badge ${statusCfg.className}`} style={{ fontSize: '0.5rem', flexShrink: 0 }}>
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      {/* Metadata */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <span className="sev-badge sev-badge-high" style={{ fontSize: '0.5rem' }}>
          {escLabel.icon} {escLabel.label}
        </span>
        {review.openingNumber !== undefined && (
          <span style={{
            fontSize: '0.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3,
            background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)',
          }}>
            Opening #{review.openingNumber}
          </span>
        )}
        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
          {timeAgo} by {review.requestedBy.name}
        </span>
      </div>

      {/* Rep notes */}
      {review.repNotes && (
        <div style={{
          padding: '4px 8px', borderRadius: 4, fontSize: '0.6rem',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', marginBottom: '6px', fontStyle: 'italic',
        }}>
          💬 Rep: "{review.repNotes}"
        </div>
      )}

      {/* Resolution info (if resolved) */}
      {review.resolution && (
        <div style={{
          padding: '6px 8px', borderRadius: 6, fontSize: '0.6rem', marginBottom: '4px',
          background: review.resolution.decision === 'approved' ? 'rgba(34,197,94,0.08)' : 'var(--sev-critical-bg)',
          border: `1px solid ${review.resolution.decision === 'approved' ? 'rgba(34,197,94,0.2)' : 'var(--sev-critical-bdr)'}`,
        }}>
          <div style={{ fontWeight: 700, color: review.resolution.decision === 'approved' ? 'var(--success)' : 'var(--sev-critical)', marginBottom: '2px' }}>
            {review.resolution.decision === 'approved' ? '✅ Approved' : '❌ Rejected'} by {review.resolution.reviewer.name}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{review.resolution.notes}</div>
          {review.resolution.conditions && (
            <div style={{ color: 'var(--sev-warning)', marginTop: '2px' }}>
              ⚠ Conditions: {review.resolution.conditions}
            </div>
          )}
          {review.resolution.rejectionReason && (
            <div style={{ color: 'var(--sev-critical)', marginTop: '2px' }}>
              Reason: {review.resolution.rejectionReason}
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: '0.5rem' }}>
            {new Date(review.resolution.resolvedAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* Manager action buttons */}
      {isManager && review.status === 'pending' && (
        <>
          {!showActions ? (
            <button onClick={() => setShowActions(true)} style={{
              width: '100%', padding: '6px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700,
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)', cursor: 'pointer', marginTop: '4px',
            }}>
              📝 Review This Item
            </button>
          ) : (
            <div style={{
              marginTop: '6px', padding: '8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            }}>
              <textarea
                value={managerNotes}
                onChange={e => setManagerNotes(e.target.value)}
                placeholder="Manager notes (required)..."
                rows={2}
                style={{
                  width: '100%', padding: '6px', fontSize: '0.6rem', borderRadius: 4,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', resize: 'vertical', marginBottom: '4px',
                }}
              />
              <input
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                placeholder="Conditions (optional, e.g. 'Must install with header reinforcement')"
                style={{
                  width: '100%', padding: '6px', fontSize: '0.6rem', borderRadius: 4,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', marginBottom: '6px',
                }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={handleApprove} disabled={!managerNotes.trim()} style={{
                  flex: 1, padding: '6px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, border: 'none',
                  background: managerNotes.trim() ? 'var(--success)' : 'rgba(148,163,184,0.3)', color: '#fff',
                  cursor: managerNotes.trim() ? 'pointer' : 'not-allowed',
                }}>
                  ✅ Approve
                </button>
                <button onClick={handleReject} disabled={!managerNotes.trim()} style={{
                  flex: 1, padding: '6px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, border: 'none',
                  background: managerNotes.trim() ? 'var(--sev-critical)' : 'rgba(148,163,184,0.3)', color: '#fff',
                  cursor: managerNotes.trim() ? 'pointer' : 'not-allowed',
                }}>
                  ❌ Reject
                </button>
                <button onClick={() => { setShowActions(false); setManagerNotes(''); }} style={{
                  padding: '6px 10px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700,
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 4. AUDIT TIMELINE
// ═════════════════════════════════════════════════════════════

export function ReviewAuditTimeline({ entries }: { entries: ReviewAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        📜 No audit history yet
      </div>
    );
  }

  const eventConfig: Record<string, { icon: string; color: string }> = {
    created:     { icon: '📤', color: 'var(--sev-high)' },
    approved:    { icon: '✅', color: 'var(--success)' },
    rejected:    { icon: '❌', color: 'var(--sev-critical)' },
    expired:     { icon: '⌛', color: 'var(--text-muted)' },
    reopened:    { icon: '🔄', color: 'var(--sev-info)' },
    notes_added: { icon: '📝', color: 'var(--sev-warning)' },
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      {/* Timeline rail */}
      <div style={{
        position: 'absolute', left: 8, top: 4, bottom: 4, width: 2,
        background: 'var(--border)',
      }} />

      {entries.map(entry => {
        const cfg = eventConfig[entry.event] || { icon: '📋', color: 'var(--text-muted)' };
        return (
          <div key={entry.id} style={{ position: 'relative', marginBottom: '12px', paddingLeft: '12px' }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -16, top: 2, width: 14, height: 14, borderRadius: '50%',
              background: 'var(--bg-secondary)', border: `2px solid ${cfg.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem',
            }}>
              {cfg.icon}
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color }}>
                {entry.event.charAt(0).toUpperCase() + entry.event.slice(1).replace('_', ' ')}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                {entry.detail}
              </div>
              <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {entry.actor.name} · {new Date(entry.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Floating Manager Review FAB ────────────────────────────
export function ManagerReviewFAB({ appointmentId, onClick }: {
  appointmentId: string;
  onClick: () => void;
}) {
  const summary = useMemo(() => getReviewSummary(appointmentId), [appointmentId]);
  if (summary.pending === 0) return null;

  return (
    <button onClick={onClick} className="validation-fab validation-fab-high" style={{ bottom: 140 }}>
      <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>🔒</span>
      <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>{summary.pending}</span>
    </button>
  );
}

// ── Utility ─────────────────────────────────────────────────

function getTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
