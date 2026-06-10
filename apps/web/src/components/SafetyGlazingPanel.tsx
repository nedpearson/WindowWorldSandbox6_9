import { useState } from 'react';
import {
  OpeningSafetyReview,
  TemperedDecision,
  SafetyReviewStatus,
  CATEGORY_LABELS,
  DISCLAIMER_TEXT,
} from '../utils/safetyGlazingRules';

// ─── PER-OPENING SAFETY REVIEW PANEL ────────────────────────
interface SafetyGlazingPanelProps {
  review: OpeningSafetyReview;
  openingNumber: number;
  onChange: (updated: OpeningSafetyReview) => void;
  compact?: boolean;
}

export function SafetyGlazingPanel({ review, openingNumber, onChange, compact = false }: SafetyGlazingPanelProps) {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideText, setOverrideText] = useState(review.overrideReason || '');
  const [expanded, setExpanded] = useState(!compact || review.flags.length > 0);

  const hasHighFlags = review.flags.some(f => f.severity === 'high');
  const hasMediumFlags = review.flags.some(f => f.severity === 'medium');
  const isFlagged = review.flags.length > 0;

  const getBadgeStyle = (): { bg: string; color: string; label: string } => {
    if (!isFlagged) return { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', label: '— No Flag' };
    if (review.safetyReviewStatus === 'reviewed' && review.temperedRequired === 'yes') return { bg: 'rgba(34,197,94,0.15)', color: 'var(--success)', label: '✓ Tempered Confirmed' };
    if (review.safetyReviewStatus === 'reviewed' && review.temperedRequired === 'no') return { bg: 'rgba(245,158,11,0.15)', color: 'var(--warning)', label: '⚠ Not Tempered (Override)' };
    if (review.temperedRequired === 'unsure') return { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger)', label: '🔴 Unsure — Review Required' };
    if (review.safetyReviewStatus === 'override') return { bg: 'rgba(245,158,11,0.15)', color: 'var(--warning)', label: '⚠ Override Logged' };
    if (hasHighFlags) return { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger)', label: '🔴 Safety Review Needed' };
    return { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning)', label: '🟡 Review Recommended' };
  };

  const badge = getBadgeStyle();

  const setDecision = (decision: TemperedDecision, status: SafetyReviewStatus) => {
    const isOverride = decision === 'no' && isFlagged;
    if (isOverride) {
      setShowOverrideInput(true);
    }
    onChange({
      ...review,
      temperedRequired: decision,
      safetyReviewStatus: status,
      reviewedAt: new Date(),
    });
  };

  const confirmOverride = () => {
    if (!overrideText.trim()) return;
    onChange({
      ...review,
      safetyReviewStatus: 'override',
      overrideReason: overrideText,
      temperedRequired: 'no',
      reviewedAt: new Date(),
    });
    setShowOverrideInput(false);
  };

  if (compact && !isFlagged) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: 999, background: badge.bg, color: badge.color, fontSize: '0.75rem', fontWeight: 600 }}>
        {badge.label}
      </div>
    );
  }

  return (
    <div style={{
      border: `1px solid ${hasHighFlags && review.safetyReviewStatus === 'not_started' ? 'var(--danger)' : hasMediumFlags ? 'var(--warning)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      marginTop: '1rem',
    }}>
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1rem' }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Safety Glazing Review — Opening #{openingNumber}
            </div>
            <div style={{ fontSize: '0.75rem', color: badge.color }}>{badge.label}</div>
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '1rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Disclaimer */}
          <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(59,130,246,0.06)', borderRadius: 6, borderLeft: '3px solid var(--accent)', fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {DISCLAIMER_TEXT}
          </div>

          {/* Flags */}
          {review.flags.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                🚨 Flagged Safety Glazing Situations:
              </div>
              {review.flags.map((flag, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                  padding: '0.5rem 0.75rem', marginBottom: '0.375rem',
                  background: flag.severity === 'high' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                  borderRadius: 6, borderLeft: `3px solid ${flag.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                      {CATEGORY_LABELS[flag.category]} — {flag.ruleName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                      {flag.flagReason}
                    </div>
                    {flag.sourcePhrase && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem', fontStyle: 'italic' }}>
                        Source: "{flag.sourcePhrase}"
                      </div>
                    )}
                    {flag.requiresPhoto && flag.photoHint && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--primary)', marginTop: '0.125rem' }}>
                        📷 Photo suggested: {flag.photoHint}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.625rem', fontWeight: 700,
                    background: flag.severity === 'high' ? 'var(--danger)' : 'var(--warning)', color: '#fff',
                  }}>
                    {flag.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Review reminder */}
          <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--warning)', textAlign: 'center' }}>
            ⚠️ Review tempered/safety glass before finalizing this opening.
          </div>

          {/* Decision buttons */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.625rem', color: 'var(--text-primary)' }}>
              Tempered Glass Required?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                { decision: 'yes' as TemperedDecision, label: '✅ Yes — Tempered', status: 'reviewed' as SafetyReviewStatus, bg: 'rgba(34,197,94,0.15)', activeBg: 'rgba(34,197,94,0.3)', color: 'var(--success)' },
                { decision: 'no' as TemperedDecision, label: '✗ Not Tempered', status: 'reviewed' as SafetyReviewStatus, bg: 'rgba(239,68,68,0.1)', activeBg: 'rgba(239,68,68,0.25)', color: 'var(--danger)' },
                { decision: 'unsure' as TemperedDecision, label: '❓ Unsure', status: 'unsure' as SafetyReviewStatus, bg: 'rgba(245,158,11,0.1)', activeBg: 'rgba(245,158,11,0.3)', color: 'var(--warning)' },
              ].map(opt => (
                <button
                  key={opt.decision}
                  onClick={() => setDecision(opt.decision, opt.status)}
                  style={{
                    padding: '0.75rem 0.5rem', borderRadius: 8, border: `2px solid ${review.temperedRequired === opt.decision ? opt.color : 'transparent'}`,
                    background: review.temperedRequired === opt.decision ? opt.activeBg : opt.bg,
                    color: opt.color, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tempered Full / Half checkboxes */}
          {review.temperedRequired === 'yes' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Tempered Coverage:
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { field: 'temperedFull', label: 'Tempered Full (Full Lit)' },
                  { field: 'temperedHalf', label: 'Tempered Half (S / U OTA)' },
                ].map(cb => (
                  <label key={cb.field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={review[cb.field as keyof OpeningSafetyReview] as boolean}
                      onChange={e => onChange({ ...review, [cb.field]: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--success)' }}
                    />
                    {cb.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Override input */}
          {showOverrideInput && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
                ⚠️ Override Reason Required
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                This opening has a safety glazing flag. Choosing "Not Tempered" requires a documented reason.
              </p>
              <textarea
                value={overrideText}
                onChange={e => setOverrideText(e.target.value)}
                placeholder="e.g. Customer confirmed window is not in a hazardous location per local code official review..."
                style={{ width: '100%', minHeight: 80, padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={confirmOverride}
                  disabled={!overrideText.trim()}
                  style={{ flex: 1, padding: '0.625rem', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: overrideText.trim() ? 'pointer' : 'not-allowed', opacity: overrideText.trim() ? 1 : 0.5 }}
                >
                  Log Override & Confirm
                </button>
                <button
                  onClick={() => { setShowOverrideInput(false); }}
                  style={{ padding: '0.625rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reviewed status */}
          {review.safetyReviewStatus === 'override' && review.overrideReason && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,0.08)', borderRadius: 6, borderLeft: '3px solid var(--warning)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <strong>Override Logged:</strong> {review.overrideReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MOBILE OPENING CARD BADGE ───────────────────────────────
export function SafetyGlazingBadge({ review, onQuickMark }: {
  review: OpeningSafetyReview;
  onQuickMark: (decision: TemperedDecision) => void;
}) {
  const [open, setOpen] = useState(false);
  const isFlagged = review.flags.length > 0;
  if (!isFlagged && review.safetyReviewStatus === 'not_started') return null;

  const getBadgeColor = () => {
    if (review.safetyReviewStatus === 'reviewed' && review.temperedRequired === 'yes') return 'var(--success)';
    if (review.safetyReviewStatus === 'override') return 'var(--warning)';
    if (review.temperedRequired === 'unsure' || review.safetyReviewStatus === 'flagged') return 'var(--danger)';
    if (review.flags.some(f => f.severity === 'high')) return 'var(--danger)';
    return 'var(--warning)';
  };

  const getLabel = () => {
    if (review.temperedRequired === 'yes') return 'Tempered ✓';
    if (review.safetyReviewStatus === 'override') return 'Not Tempered ⚠';
    if (review.temperedRequired === 'unsure') return 'Unsure ❓';
    return '🛡️ Review';
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.375rem 0.75rem', borderRadius: 999, border: `2px solid ${getBadgeColor()}`,
          background: `${getBadgeColor()}22`, color: getBadgeColor(),
          fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
        }}
      >
        {getLabel()}
      </button>

      {open && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Safety Glazing
          </div>
          {review.flaggedReasons.map((r, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {r}</div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginTop: '0.25rem' }}>
            <button onClick={() => { onQuickMark('yes'); setOpen(false); }} style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
              Mark Tempered Full
            </button>
            <button onClick={() => { onQuickMark('yes'); setOpen(false); }} style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
              Mark Tempered Half
            </button>
            <button onClick={() => { onQuickMark('no'); setOpen(false); }} style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
              Not Tempered
            </button>
            <button onClick={() => { onQuickMark('unsure'); setOpen(false); }} style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
              Unsure / Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
