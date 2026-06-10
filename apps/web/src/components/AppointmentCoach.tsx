import { useMemo, useState } from 'react';
import { runAppointmentCoach, type CoachResult, type CoachItem, type CoachCategory } from '../utils/appointmentCoach';

const SEV = {
  critical: { icon: '🛑', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Critical' },
  warning:  { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Warning' },
  info:     { icon: 'ℹ️', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'Info' },
  tip:      { icon: '💡', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'Tip' },
};

const CAT_ICONS: Record<CoachCategory, string> = {
  installer: '🔧', measurement: '📏', pricing: '💰', sketch: '✏️',
  photo: '📸', contract: '📜', forgotten: '💡',
};

const RISK_BADGE = {
  PASS:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '✅ PASS' },
  REVIEW:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '🟡 REVIEW RECOMMENDED' },
  HIGH_RISK: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '🔴 HIGH RISK' },
};

function ScoreGauge({ value, label, size = 56 }: { value: number; label: string; size?: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ marginTop: -size + 4, height: size - 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 50 ? '1rem' : '0.75rem', fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

export function AppointmentCoach({ appointment, onJumpToStep }: { appointment: any; onJumpToStep: (step: number) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<CoachCategory | 'all'>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const coach: CoachResult = useMemo(() => runAppointmentCoach(appointment), [appointment]);
  const riskBadge = RISK_BADGE[coach.overallRisk];

  const filteredItems = useMemo(() => {
    let items = coach.items.filter(i => !dismissed.has(i.id));
    if (filter !== 'all') items = items.filter(i => i.category === filter);
    return items;
  }, [coach.items, filter, dismissed]);

  const criticalCount = coach.items.filter(i => i.severity === 'critical').length;
  const warningCount = coach.items.filter(i => i.severity === 'warning').length;

  // Floating button
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="coach-fab" title="Appointment Coach">
        <span style={{ fontSize: '1.25rem' }}>🧑‍🏫</span>
        {criticalCount > 0 && <span className="coach-fab-badge" style={{ background: '#ef4444' }}>{criticalCount}</span>}
        {criticalCount === 0 && warningCount > 0 && <span className="coach-fab-badge" style={{ background: '#f59e0b' }}>{warningCount}</span>}
      </button>
    );
  }

  return (
    <div className="coach-panel">
      {/* Header */}
      <div className="coach-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🧑‍🏫</span>
          <h3 style={{ fontSize: '0.9375rem' }}>Appointment Coach</h3>
        </div>
        <button className="btn btn-sm" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', padding: '0.25rem' }}>✕</button>
      </div>

      {/* Overall risk */}
      <div style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)', background: riskBadge.bg, marginBottom: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: riskBadge.color }}>{riskBadge.label}</div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>Appointment Score: {coach.appointmentScore}%</div>
      </div>

      {/* Score gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', marginBottom: '0.75rem' }}>
        <ScoreGauge value={coach.installerClarityScore} label="Installer Clarity" size={52} />
        <ScoreGauge value={coach.measurementConfidenceScore} label="Measurement" size={52} />
        <ScoreGauge value={coach.pricingConfidenceScore} label="Pricing" size={52} />
        <ScoreGauge value={coach.contractAccuracyScore} label="Contract" size={52} />
      </div>

      {/* Opening risk cards */}
      {coach.openingScores.some(o => o.riskFlags.length > 0) && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>High-Risk Openings</div>
          {coach.openingScores.filter(o => o.riskFlags.length > 0).slice(0, 5).map(o => (
            <div key={o.openingNumber} style={{ padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${o.installerClarity < 50 ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <strong>#{o.openingNumber} {o.room}</strong>
                <span style={{ color: o.installerClarity < 50 ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: '0.6875rem' }}>
                  IC:{o.installerClarity}% MC:{o.measurementConfidence}%
                </span>
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 2 }}>{o.riskFlags.join(' · ')}</div>
              {o.photoRequired.length > 0 && (
                <div style={{ fontSize: '0.625rem', color: '#06b6d4', marginTop: 2 }}>📸 {o.photoRequired.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {(['all', 'installer', 'measurement', 'pricing', 'photo', 'sketch', 'contract', 'forgotten'] as const).map(cat => {
          const count = cat === 'all' ? coach.items.length : coach.items.filter(i => i.category === cat).length;
          if (cat !== 'all' && count === 0) return null;
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '2px 6px', borderRadius: 4, fontSize: '0.5625rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: filter === cat ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              color: filter === cat ? 'white' : 'var(--text-muted)',
            }}>
              {cat === 'all' ? '🔍' : CAT_ICONS[cat]} {cat === 'all' ? `All (${count})` : `${cat} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="coach-items">
        {filteredItems.map(item => {
          const sev = SEV[item.severity];
          return (
            <div key={item.id} style={{ display: 'flex', gap: '0.375rem', padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: sev.bg, borderRadius: 'var(--radius-sm)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.75rem', flexShrink: 0, marginTop: 1 }}>{sev.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.6875rem', color: sev.color, lineHeight: 1.3 }}>{item.message}</div>
                {item.detail && <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 1 }}>{item.detail}</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.125rem', flexShrink: 0 }}>
                <button onClick={() => onJumpToStep(item.jumpStep)} style={{ padding: '1px 4px', fontSize: '0.5625rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--accent)', cursor: 'pointer' }}>Fix</button>
                <button onClick={() => setDismissed(s => new Set([...s, item.id]))} style={{ padding: '1px 4px', fontSize: '0.5625rem', background: 'none', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-muted)', cursor: 'pointer' }}>✓</button>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {dismissed.size > 0 ? '✅ All items reviewed' : '✅ No issues found'}
          </div>
        )}
      </div>

      {/* Commonly forgotten */}
      {coach.commonlyForgotten.length > 0 && filter === 'all' && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(148,163,184,0.06)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>💡 YOU COMMONLY FORGET:</div>
          {coach.commonlyForgotten.map((f, i) => (
            <div key={i} style={{ fontSize: '0.625rem', color: '#f59e0b', padding: '1px 0' }}>• {f}</div>
          ))}
        </div>
      )}
    </div>
  );
}
