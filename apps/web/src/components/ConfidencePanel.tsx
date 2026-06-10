// ═══════════════════════════════════════════════════════════
// Rep Confidence Panel — Inline confidence feedback
// Shows validated items, explanations, tips, reassurance
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { getConfidenceFeedback, type ConfidenceItem } from '../utils/repConfidence';

// ── Confidence Panel (inside opening edit modal) ─────────
export function ConfidencePanel({
  opening, allOpenings,
}: {
  opening: any;
  allOpenings: any[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const items = useMemo(() => getConfidenceFeedback(opening, allOpenings), [opening, allOpenings]);

  if (items.length === 0) return null;

  const validated = items.filter(i => i.type === 'validated');
  const explained = items.filter(i => i.type === 'explained');
  const tips = items.filter(i => i.type === 'tip');
  const reassurance = items.filter(i => i.type === 'reassurance');

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {/* Validated items — compact green row */}
      {validated.length > 0 && (
        <div style={{
          display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px',
          padding: '4px 6px', borderRadius: 6,
          background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)',
        }}>
          {validated.map(item => (
            <span key={item.id} style={{
              fontSize: '0.5625rem', fontWeight: 600, color: '#22c55e',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}>
              {item.icon} {item.message}
            </span>
          ))}
        </div>
      )}

      {/* Explained warnings — expandable with WHY */}
      {explained.map(item => (
        <div key={item.id} style={{
          padding: '4px 8px', marginBottom: 3, borderRadius: 6,
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)',
        }}>
          <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)',
          }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {item.icon} {item.message}
            </span>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
              {expandedId === item.id ? '▴' : 'Why?'}
            </span>
          </button>
          {expandedId === item.id && (
            <div style={{ marginTop: '4px', fontSize: '0.625rem', lineHeight: 1.5 }}>
              {item.detail && (
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>{item.detail}</p>
              )}
              {item.whyItMatters && (
                <p style={{ color: '#f59e0b', margin: 0, fontWeight: 600 }}>
                  💰 Why it matters: {item.whyItMatters}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Tips — blue contextual coaching */}
      {tips.map(item => (
        <div key={item.id} style={{
          padding: '4px 8px', marginBottom: 3, borderRadius: 6,
          background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)',
        }}>
          <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)',
          }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {item.icon} {item.message}
            </span>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
              {expandedId === item.id ? '▴' : 'Learn'}
            </span>
          </button>
          {expandedId === item.id && (
            <div style={{ marginTop: '4px', fontSize: '0.625rem', lineHeight: 1.5 }}>
              {item.detail && (
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>{item.detail}</p>
              )}
              {item.whyItMatters && (
                <p style={{ color: '#3b82f6', margin: 0, fontWeight: 600 }}>
                  💡 Pro tip: {item.whyItMatters}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Reassurance — subtle green encouragement */}
      {reassurance.map(item => (
        <div key={item.id} style={{
          padding: '3px 8px', marginBottom: 2, borderRadius: 6,
          fontSize: '0.5625rem', color: '#22c55e', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {item.icon} {item.message}
        </div>
      ))}
    </div>
  );
}

// ── Opening Completion Indicator ─────────────────────────
// Shows a visual progress indicator for the current opening
export function OpeningCompletionBar({ opening }: { opening: any }) {
  const checks = [
    { label: 'Dims', done: opening.width > 0 && opening.height > 0 },
    { label: 'Room', done: !!opening.roomLocation },
    { label: 'Product', done: !!opening.productCategory },
    { label: 'Colors', done: !!opening.interiorColor },
    { label: 'Price', done: opening.totalPrice > 0 },
  ];
  const doneCount = checks.filter(c => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <div style={{
      display: 'flex', gap: '3px', alignItems: 'center', marginBottom: '0.75rem',
    }}>
      {checks.map(c => (
        <div key={c.label} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: c.done ? '#22c55e' : 'rgba(255,255,255,0.08)',
          transition: 'background 0.2s',
        }} title={`${c.label}: ${c.done ? '✓' : '—'}`} />
      ))}
      <span style={{
        fontSize: '0.5625rem', fontWeight: 700, marginLeft: '4px',
        color: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--text-muted)',
      }}>
        {pct}%
      </span>
    </div>
  );
}
