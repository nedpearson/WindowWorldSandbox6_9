import { useMemo } from 'react';
import { validateOpening, validateOpeningWithStage, calculateProjectHealth, OPENING_PRESETS, type ValidationResult, type ProjectHealth } from '../utils/openingValidation';

// ── Opening Validation Badge (inline on cards) ─────────
export function OpeningBadge({ opening, allOpenings, isBrick }: { opening: any; allOpenings: any[]; isBrick: boolean }) {
  const v = useMemo(() => validateOpeningWithStage(opening, allOpenings, isBrick, 'save_item'), [opening, allOpenings, isBrick]);

  const statusColors: Record<string, string> = {
    ready: '#3fb950', complete: '#3fb950', needs_review: '#d29922',
    high_risk: '#f85149', incomplete: '#8b949e',
  };
  const statusIcons: Record<string, string> = {
    ready: '✅', complete: '✅', needs_review: '⚠️', high_risk: '🛑', incomplete: '⬜',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {/* Score badge */}
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
        background: `${statusColors[v.status]}15`, color: statusColors[v.status],
        border: `1px solid ${statusColors[v.status]}30`,
      }}>
        {statusIcons[v.status]} {v.score}%
      </span>

      {/* Risk badge */}
      {v.riskLevel !== 'low' && (
        <span style={{
          fontSize: '0.55rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px',
          background: v.riskLevel === 'critical' ? 'rgba(248,81,73,0.12)' : 'rgba(210,153,34,0.12)',
          color: v.riskLevel === 'critical' ? '#f85149' : '#d29922',
        }}>
          RISK: {v.riskLevel.toUpperCase()}
        </span>
      )}

      {/* Warning count */}
      {v.warnings.length > 0 && (
        <span style={{ fontSize: '0.55rem', color: '#d29922' }}>
          {v.warnings.length}⚠
        </span>
      )}

      {/* Missing count */}
      {v.missingFields.filter(f => f.severity === 'required').length > 0 && (
        <span style={{ fontSize: '0.55rem', color: '#f85149' }}>
          {v.missingFields.filter(f => f.severity === 'required').length} missing
        </span>
      )}

      {/* Photo required */}
      {v.requiresPhoto && (
        <span style={{ fontSize: '0.55rem', color: '#58a6ff' }}>📷</span>
      )}
    </div>
  );
}

// ── Next Action Banner (inside opening editor) ─────────
export function NextActionBanner({ opening, allOpenings, isBrick }: { opening: any; allOpenings: any[]; isBrick: boolean }) {
  const v = useMemo(() => validateOpeningWithStage(opening, allOpenings, isBrick, 'save_item'), [opening, allOpenings, isBrick]);

  if (!v.nextAction && v.warnings.length === 0 && v.autoNotes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
      {/* Next action */}
      {v.nextAction && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          👉 {v.nextAction}
        </div>
      )}

      {/* Critical warnings */}
      {v.warnings.filter(w => w.severity === 'critical').map((w, i) => (
        <div key={i} style={{
          padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem',
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)',
          color: '#f85149',
        }}>
          🛑 {w.message}
        </div>
      ))}

      {/* Info warnings */}
      {v.warnings.filter(w => w.severity === 'warning').slice(0, 2).map((w, i) => (
        <div key={i} style={{
          padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem',
          background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.2)',
          color: '#d29922',
        }}>
          ⚠️ {w.message}
        </div>
      ))}

      {/* Auto notes preview */}
      {v.autoNotes.length > 0 && (
        <div style={{
          padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}>
          <strong>Auto Notes:</strong> {v.autoNotes.join(' | ')}
        </div>
      )}

      {/* Photo requirement */}
      {v.requiresPhoto && (
        <div style={{
          padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem',
          background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)',
          color: '#58a6ff',
        }}>
          📷 Photo required: {v.photoReasons.join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Project Health Bar (persistent) ────────────────────
export function ProjectHealthBar({ openings, isBrick, onJumpToOpening }: { openings: any[]; isBrick: boolean; onJumpToOpening?: (idx: number) => void }) {
  const health = useMemo(() => calculateProjectHealth(openings, isBrick), [openings, isBrick]);

  if (openings.length === 0) return null;

  const pct = health.avgScore;
  const barColor = pct >= 80 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';

  return (
    <div style={{
      padding: '10px 14px', borderRadius: '10px',
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          📊 Project Health — {health.totalOpenings} Opening{health.totalOpenings !== 1 ? 's' : ''}
        </div>
        <div style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
          background: health.submissionReady ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)',
          color: health.submissionReady ? '#3fb950' : '#f85149',
        }}>
          {health.submissionReady ? '✅ Ready to Submit' : `🛑 ${health.submissionBlockers.length} Blocker${health.submissionBlockers.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
        <HealthStat label="Complete" value={health.completedCount} total={health.totalOpenings} color="#3fb950" />
        <HealthStat label="Incomplete" value={health.incompleteCount} total={health.totalOpenings} color={health.incompleteCount > 0 ? '#f85149' : '#3fb950'} />
        <HealthStat label="High Risk" value={health.highRiskCount} total={health.totalOpenings} color={health.highRiskCount > 0 ? '#f85149' : '#3fb950'} />
        <HealthStat label="Warnings" value={health.totalWarnings} color={health.totalWarnings > 0 ? '#d29922' : '#3fb950'} />
        {isBrick && <HealthStat label="Missing Depth" value={health.missingDepth} color={health.missingDepth > 0 ? '#f85149' : '#3fb950'} />}
        <HealthStat label="Avg Score" value={`${health.avgScore}%`} color={barColor} />
      </div>

      {/* Blockers */}
      {!health.submissionReady && health.submissionBlockers.length > 0 && (
        <div style={{ marginTop: '6px', fontSize: '0.65rem', color: '#f85149' }}>
          {health.submissionBlockers.map((b, i) => <div key={i}>• {b}</div>)}
        </div>
      )}
    </div>
  );
}

function HealthStat({ label, value, total, color }: { label: string; value: number | string; total?: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px' }}>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color }}>
        {value}{total !== undefined ? <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/{total}</span> : null}
      </div>
    </div>
  );
}

// ── Quick Preset Picker (for new openings) ─────────────
export function PresetPicker({ onApply }: { onApply: (fields: Record<string, any>) => void }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
        ⚡ Quick Presets
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {OPENING_PRESETS.map(p => (
          <button key={p.id} type="button" onClick={() => onApply(p.fields)} style={{
            padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600,
            border: `1px solid ${p.color}30`, background: `${p.color}10`,
            color: p.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            {p.icon} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export { validateOpening, validateOpeningWithStage, calculateProjectHealth, OPENING_PRESETS };
export type { ValidationResult, ProjectHealth };
