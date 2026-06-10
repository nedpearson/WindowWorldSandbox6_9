// ═══════════════════════════════════════════════════════════
// Forget Nothing UI — Silent checklist rendered as
// a compact summary bar + expandable detail panel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { runForgetNothing, type ForgetNothingReport, type CheckItem } from '../utils/forgetNothing';

// ── Score Ring ────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dashoffset 0.4s' }}
      />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="11" fontWeight="800">{score}</text>
    </svg>
  );
}

// ── Status Icon ──────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pass': return <span style={{ color: '#22c55e' }}>✓</span>;
    case 'fail': return <span style={{ color: '#ef4444' }}>✕</span>;
    case 'warn': return <span style={{ color: '#f59e0b' }}>⚠</span>;
    default: return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
}

// ── Main Panel ───────────────────────────────────────────
export function ForgetNothingPanel({
  openings,
  onFixAll,
}: {
  openings: any[];
  onFixAll?: (fixes: { openingNumbers: number[]; field: string; value: any }[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPassed, setShowPassed] = useState(false);

  const report = useMemo(() => runForgetNothing(openings), [openings]);

  if (openings.length === 0) return null;

  const failures = report.items.filter(i => i.status === 'fail');
  const warnings = report.items.filter(i => i.status === 'warn');
  const passes = report.items.filter(i => i.status === 'pass');

  return (
    <div style={{
      marginBottom: '0.75rem', borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${report.readyToSubmit ? 'rgba(34,197,94,0.2)' : report.readyToPropose ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.25)'}`,
      background: report.readyToSubmit ? 'rgba(34,197,94,0.03)' : report.readyToPropose ? 'rgba(245,158,11,0.03)' : 'rgba(239,68,68,0.03)',
    }}>
      {/* Summary bar */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ScoreRing score={report.score} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
              📋 Forget Nothing
            </div>
            <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
              {failures.length > 0 && <span style={{ color: '#ef4444' }}>✕ {failures.length} missing</span>}
              {warnings.length > 0 && <span style={{ color: '#f59e0b' }}>⚠ {warnings.length} check</span>}
              <span style={{ color: '#22c55e' }}>✓ {passes.length} ok</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {report.readyToSubmit && (
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 9999 }}>
              Ready to Submit
            </span>
          )}
          {report.readyToPropose && !report.readyToSubmit && (
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 9999 }}>
              Ready to Propose
            </span>
          )}
          {!report.readyToPropose && (
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 9999 }}>
              Not Ready
            </span>
          )}
          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{expanded ? '▴' : '▾'}</span>
        </div>
      </button>

      {/* Expanded checklist */}
      {expanded && (
        <div style={{ padding: '0 10px 8px' }}>
          {/* Failures first */}
          {failures.map(item => (
            <CheckRow key={item.id} item={item} onFixAll={onFixAll} />
          ))}
          {/* Warnings */}
          {warnings.map(item => (
            <CheckRow key={item.id} item={item} onFixAll={onFixAll} />
          ))}
          {/* Passes (toggle) */}
          {passes.length > 0 && (
            <button onClick={() => setShowPassed(!showPassed)} style={{
              width: '100%', padding: '3px', background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.5625rem', cursor: 'pointer',
            }}>
              {showPassed ? '▴ Hide passed' : `▾ Show ${passes.length} passed checks`}
            </button>
          )}
          {showPassed && passes.map(item => (
            <CheckRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Check Row ────────────────────────────────────────────
function CheckRow({
  item, onFixAll,
}: {
  item: CheckItem;
  onFixAll?: (fixes: { openingNumbers: number[]; field: string; value: any }[]) => void;
}) {
  return (
    <div style={{
      padding: '3px 6px', marginBottom: 2, borderRadius: 5, fontSize: '0.625rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
      background: item.status === 'fail' ? 'rgba(239,68,68,0.06)' : item.status === 'warn' ? 'rgba(245,158,11,0.04)' : 'rgba(34,197,94,0.04)',
      border: `1px solid ${item.status === 'fail' ? 'rgba(239,68,68,0.12)' : item.status === 'warn' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)'}`,
    }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', flex: 1 }}>
        <StatusIcon status={item.status} />
        <div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</span>
          <span style={{ marginLeft: 4, color: 'var(--text-muted)' }}>{item.detail}</span>
        </div>
      </div>
      {item.fix && onFixAll && (
        <button onClick={() => onFixAll([{
          openingNumbers: item.openingNumbers,
          field: item.fix!.field,
          value: item.fix!.value,
        }])} style={{
          padding: '2px 6px', borderRadius: 4, fontSize: '0.5625rem', fontWeight: 700,
          border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)',
          color: '#22c55e', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {item.fix.label}
        </button>
      )}
    </div>
  );
}

// ── Pre-Submission Gate ──────────────────────────────────
// Show this as a blocking modal before proposal/submission
export function PreSubmissionGate({
  openings, onProceed, onCancel, mode,
}: {
  openings: any[];
  onProceed: () => void;
  onCancel: () => void;
  mode: 'proposal' | 'submission';
}) {
  const report = useMemo(() => runForgetNothing(openings), [openings]);
  const canProceed = mode === 'proposal' ? report.readyToPropose : report.readyToSubmit;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem',
    }}>
      <div className="card" style={{ maxWidth: 500, width: '100%', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <ScoreRing score={report.score} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>
              {canProceed ? `✅ Ready for ${mode === 'proposal' ? 'Proposal' : 'Submission'}` : `⚠️ Not Ready`}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {report.failCount} failures · {report.warnCount} warnings · {report.passCount} passed
            </p>
          </div>
        </div>

        {/* Show failures and warnings */}
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: '1rem' }}>
          {report.items.filter(i => i.status === 'fail' || i.status === 'warn').map(item => (
            <div key={item.id} style={{
              padding: '4px 8px', marginBottom: 3, borderRadius: 6, fontSize: '0.6875rem',
              background: item.status === 'fail' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.06)',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <StatusIcon status={item.status} />
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{item.detail}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canProceed && (
            <button className="btn btn-primary" onClick={onProceed}>
              Continue to {mode === 'proposal' ? 'Proposal' : 'Submission'} →
            </button>
          )}
          <button className="btn btn-secondary" onClick={onCancel}>
            {canProceed ? 'Go Back' : 'Fix Issues'}
          </button>
        </div>
      </div>
    </div>
  );
}
