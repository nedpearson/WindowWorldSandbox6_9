// ═══════════════════════════════════════════════════════════════
// ReadinessGate — Visual pre-submission sweep dashboard
// Shows project readiness score, checkpoint grid, unresolved
// blockers, and recommended fix list. Blocks export when not ready.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  runPreSubmissionSweep,
  SWEEP_CATEGORY_LABELS,
  type ReadinessReport,
  type SweepCheckpoint,
  type SweepCategory,
} from '../utils/preSubmissionSweep';
import { SEVERITY_CONFIG } from '../utils/centralValidationOrchestrator';
import type { SketchMarkerData, MarkerGroupData } from '../utils/sketchSync';
import type { OpeningSafetyReview } from '../utils/safetyGlazingRules';

// ── Score ring colors ────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 95) return 'var(--success, #22c55e)';
  if (score >= 85) return 'var(--sev-info)';
  if (score >= 70) return 'var(--sev-warning)';
  if (score >= 50) return 'var(--sev-high)';
  return 'var(--sev-critical)';
}

// ═════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════

export function ReadinessGate({
  openings, markers, groups, appointment,
  isBrickHouse = false, safetyReviews,
  onProceed, onGoFix,
}: {
  openings: any[];
  markers: SketchMarkerData[];
  groups: MarkerGroupData[];
  appointment: any;
  isBrickHouse?: boolean;
  safetyReviews?: OpeningSafetyReview[];
  onProceed: () => void;
  onGoFix: (category: string) => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const report = useMemo(() => runPreSubmissionSweep(
    openings, markers, groups, appointment,
    { isBrickHouse, safetyReviews },
  ), [openings, markers, groups, appointment, isBrickHouse, safetyReviews]);

  const color = scoreColor(report.score);
  const cats = Object.keys(report.byCategory) as SweepCategory[];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* ── Score Hero ────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.25rem',
        padding: '1.25rem', borderRadius: 16, marginBottom: '1rem',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}>
        {/* Score ring */}
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={`${(report.score / 100) * 213.6} 213.6`}
              strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{report.score}</span>
            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2px' }}>
            {report.ready ? '✅ Ready for Submission' : '🚫 Not Ready'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Grade {report.grade} · {report.counts.pass} passed · {report.counts.fail} failed · {report.counts.warn} warnings
          </div>
          {report.managerReviews.approved > 0 && (
            <div style={{ fontSize: '0.6rem', color: 'var(--sev-info)', marginTop: '2px' }}>
              🔒 {report.managerReviews.approved} manager approval{report.managerReviews.approved !== 1 ? 's' : ''}
            </div>
          )}
          {report.managerReviews.pending > 0 && (
            <div style={{ fontSize: '0.6rem', color: 'var(--sev-warning)', marginTop: '2px' }}>
              ⏳ {report.managerReviews.pending} pending manager review{report.managerReviews.pending !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Unresolved Criticals Banner ───────────────── */}
      {report.unresolvedCriticals.length > 0 && (
        <div className="sev-blocked-banner" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
          <div style={{ fontWeight: 800, marginBottom: '4px' }}>
            🛑 {report.unresolvedCriticals.length} Critical Blocker{report.unresolvedCriticals.length !== 1 ? 's' : ''}
          </div>
          {report.unresolvedCriticals.slice(0, 5).map(c => (
            <div key={c.id} style={{ fontSize: '0.6rem', marginTop: '2px', opacity: 0.9 }}>
              • {c.label}{c.openingNumber !== undefined ? ` (#${c.openingNumber})` : ''}
            </div>
          ))}
          {report.unresolvedCriticals.length > 5 && (
            <div style={{ fontSize: '0.55rem', marginTop: '3px', opacity: 0.7 }}>
              +{report.unresolvedCriticals.length - 5} more...
            </div>
          )}
        </div>
      )}

      {/* ── Category Grid ─────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.5rem', marginBottom: '1rem',
      }}>
        {cats.map(cat => {
          const items = report.byCategory[cat];
          const catLabel = SWEEP_CATEGORY_LABELS[cat] || { icon: '📋', label: cat };
          const fails = items.filter(i => i.status === 'fail' && !i.managerApproved).length;
          const warns = items.filter(i => i.status === 'warn').length;
          const allPass = fails === 0 && warns === 0;

          return (
            <button key={cat} onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
              style={{
                padding: '0.6rem', borderRadius: 10, border: '1px solid var(--border)',
                background: expandedCat === cat ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}>{catLabel.icon}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>{catLabel.label}</div>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: '2px',
                color: allPass ? 'var(--success)' : fails > 0 ? 'var(--sev-critical)' : 'var(--sev-warning)' }}>
                {allPass ? '✓ Pass' : fails > 0 ? `${fails} fail` : `${warns} warn`}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Expanded Category Detail ───────────────────── */}
      {expandedCat && report.byCategory[expandedCat] && (
        <div style={{
          marginBottom: '1rem', borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--bg-card)', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8rem' }}>
            {(SWEEP_CATEGORY_LABELS[expandedCat as SweepCategory] || { icon: '', label: expandedCat }).icon}{' '}
            {(SWEEP_CATEGORY_LABELS[expandedCat as SweepCategory] || { label: expandedCat }).label}
          </div>
          {report.byCategory[expandedCat].map(c => (
            <div key={c.id} className={`sev-card sev-card-${c.severity}`}
              style={{ margin: '0.25rem 0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>
                  {SEVERITY_CONFIG[c.severity].icon} {c.label}
                </span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {c.managerApproved && (
                    <span className="sev-badge sev-badge-info" style={{ fontSize: '0.45rem' }}>✅ MGR OK</span>
                  )}
                  {c.blocksSubmission && (
                    <span className="sev-badge sev-badge-critical" style={{ fontSize: '0.45rem' }}>BLOCKS</span>
                  )}
                </div>
              </div>
              {c.fix && (
                <div style={{ marginTop: '3px', color: 'var(--success)', fontSize: '0.55rem' }}>
                  🔧 {c.fix}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Recommended Fixes ─────────────────────────── */}
      {report.recommendedFixes.length > 0 && (
        <div style={{
          marginBottom: '1rem', borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--bg-card)', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8rem' }}>
            🔧 Recommended Fixes ({report.recommendedFixes.length})
          </div>
          {report.recommendedFixes.slice(0, 10).map((fix, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.5rem', padding: '0.4rem 0.75rem',
              borderBottom: '1px solid var(--border)', fontSize: '0.6rem', alignItems: 'center',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < 3 ? 'var(--sev-critical-bg)' : 'rgba(255,255,255,0.06)',
                color: i < 3 ? 'var(--sev-critical)' : 'var(--text-muted)',
                fontWeight: 800, fontSize: '0.5rem',
              }}>{fix.priority}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{fix.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>{fix.detail}</div>
              </div>
              <button onClick={() => onGoFix(fix.category)} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: '0.5rem', fontWeight: 700,
                border: '1px solid var(--border)', background: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>Fix →</button>
            </div>
          ))}
        </div>
      )}



      {/* ── Action Buttons ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button disabled={!report.ready} onClick={onProceed} style={{
          flex: 1, padding: '0.875rem', borderRadius: 10, border: 'none',
          cursor: report.ready ? 'pointer' : 'not-allowed',
          background: report.ready ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(148,163,184,0.2)',
          color: report.ready ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.9rem',
          opacity: report.ready ? 1 : 0.5,
        }}>
          {report.ready ? '📄 Proceed to Export' : `🔒 ${report.unresolvedCriticals.length} Blocker${report.unresolvedCriticals.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
