// ═══════════════════════════════════════════════════════════
// Unified Intelligence Bar — Consolidates all panels
// above the opening table into ONE collapsible, tabbed
// component to eliminate cognitive overload.
//
// Before: 10+ separate panels stacking vertically
// After:  1 smart bar that shows ONLY what matters now
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { reviewJob, type EstimatorAlert } from '../utils/seniorEstimator';
import { runForgetNothing } from '../utils/forgetNothing';
import { api } from '../utils/api';

type IntelTab = 'status' | 'alerts' | 'checklist';

// ── Determine which tab should auto-show ─────────────────
function pickDefaultTab(openings: any[]): IntelTab | null {
  if (openings.length === 0) return null;

  // If there are critical alerts, show alerts
  const alerts = reviewJob(openings);
  if (alerts.some(a => a.severity === 'critical')) return 'alerts';

  // If forget-nothing has failures, show checklist
  const fn = runForgetNothing(openings);
  if (fn.failCount > 0) return 'checklist';

  // Otherwise show compact status (or nothing)
  return 'status';
}

// ── Main Component ───────────────────────────────────────
export function UnifiedIntelBar({
  openings,
  onUpdate,
  load,
}: {
  openings: any[];
  onUpdate: () => void;
  load: () => Promise<void>;
}) {
  const defaultTab = useMemo(() => pickDefaultTab(openings), [openings]);
  const [activeTab, setActiveTab] = useState<IntelTab | null>(defaultTab);
  const [collapsed, setCollapsed] = useState(false);

  const alerts = useMemo(() => reviewJob(openings), [openings]);
  const fnReport = useMemo(() => runForgetNothing(openings), [openings]);

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  // Counts for tab badges
  const alertCount = criticals.length + warnings.length;
  const failCount = fnReport.failCount;

  // Don't show if no data worth showing
  if (openings.length < 2) return null;

  const applyFix = async (fix: EstimatorAlert['fix']) => {
    if (!fix) return;
    for (const num of fix.targets) {
      const target = openings.find(o => o.openingNumber === num);
      if (target) await api.updateOpening(target.id, fix.fields).catch(() => {});
    }
    await load();
    onUpdate();
  };

  const applyForgetFix = async (fixes: { openingNumbers: number[]; field: string; value: any }[]) => {
    for (const fix of fixes) {
      for (const num of fix.openingNumbers) {
        const target = openings.find(o => o.openingNumber === num);
        if (target) await api.updateOpening(target.id, { [fix.field]: fix.value }).catch(() => {});
      }
    }
    await load();
    onUpdate();
  };

  // Overall health color
  const healthColor = criticals.length > 0 || failCount > 0 ? '#ef4444'
    : warnings.length > 0 || fnReport.warnCount > 0 ? '#f59e0b'
    : '#22c55e';

  return (
    <div style={{
      marginBottom: '0.5rem', borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${healthColor}22`,
      background: `${healthColor}06`,
    }}>
      {/* ── Header bar ────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 10px',
      }}>
        {/* Summary pill */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--text-primary)',
        }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: healthColor }}>
            {criticals.length > 0 ? '🔴' : failCount > 0 ? '🟡' : '✅'} Job Health
          </span>
          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
            {fnReport.score}% · {openings.length} openings
          </span>
        </button>

        {/* Tab pills */}
        {!collapsed && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <TabPill label="Status" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
            <TabPill label="Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')}
              badge={alertCount > 0 ? alertCount : undefined} badgeColor="#f59e0b" />
            <TabPill label="Checklist" active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')}
              badge={failCount > 0 ? failCount : undefined} badgeColor="#ef4444" />
          </div>
        )}

        <button onClick={() => setCollapsed(!collapsed)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.625rem',
        }}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {/* ── Content ───────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '0 10px 6px' }}>
          {/* Status: compact progress summary */}
          {activeTab === 'status' && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <StatusPill label="Measured" count={openings.filter(o => o.width > 0 && o.height > 0).length} total={openings.length} />
              <StatusPill label="Priced" count={openings.filter(o => o.totalPrice > 0).length} total={openings.length} />
              <StatusPill label="Complete" count={openings.filter(o => o.width > 0 && o.height > 0 && o.productCategory && o.interiorColor && o.totalPrice > 0).length} total={openings.length} />
              {criticals.length === 0 && failCount === 0 && (
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#22c55e', alignSelf: 'center', padding: '2px 6px', background: 'rgba(34,197,94,0.08)', borderRadius: 9999 }}>
                  ✓ Ready for proposal
                </span>
              )}
            </div>
          )}

          {/* Alerts: senior estimator findings */}
          {activeTab === 'alerts' && (
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {alertCount === 0 ? (
                <div style={{ fontSize: '0.625rem', color: '#22c55e', padding: '4px 0' }}>✓ No issues detected</div>
              ) : (
                [...criticals, ...warnings].map(a => (
                  <div key={a.id} style={{
                    padding: '3px 6px', marginBottom: 2, borderRadius: 5, fontSize: '0.5625rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
                    background: a.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)',
                    border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.08)'}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: a.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>{a.title}</span>
                      <span style={{ marginLeft: 4, color: 'var(--text-muted)' }}>{a.detail}</span>
                    </div>
                    {a.fix && (
                      <button onClick={() => applyFix(a.fix)} style={fixBtnStyle}>{a.fix.label}</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Checklist: forget-nothing items */}
          {activeTab === 'checklist' && (
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {fnReport.items.filter(i => i.status === 'fail' || i.status === 'warn').map(item => (
                <div key={item.id} style={{
                  padding: '3px 6px', marginBottom: 2, borderRadius: 5, fontSize: '0.5625rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
                  background: item.status === 'fail' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)',
                  border: `1px solid ${item.status === 'fail' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.08)'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: item.status === 'fail' ? '#ef4444' : '#f59e0b' }}>{item.label}</span>
                    <span style={{ marginLeft: 4, color: 'var(--text-muted)' }}>{item.detail}</span>
                  </div>
                  {item.fix && (
                    <button onClick={() => applyForgetFix([{
                      openingNumbers: item.openingNumbers,
                      field: item.fix!.field,
                      value: item.fix!.value,
                    }])} style={fixBtnStyle}>{item.fix.label}</button>
                  )}
                </div>
              ))}
              {fnReport.failCount === 0 && fnReport.warnCount === 0 && (
                <div style={{ fontSize: '0.625rem', color: '#22c55e', padding: '4px 0' }}>✓ All checks passed</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────
function TabPill({ label, active, onClick, badge, badgeColor }: {
  label: string; active: boolean; onClick: () => void;
  badge?: number; badgeColor?: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '2px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      color: active ? '#6366f1' : 'var(--text-muted)',
      fontSize: '0.5625rem', fontWeight: active ? 700 : 500,
      display: 'flex', alignItems: 'center', gap: '3px',
      transition: 'all 0.1s',
    }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 14, height: 14, borderRadius: 7, padding: '0 3px',
          background: badgeColor || '#6366f1', color: '#fff',
          fontSize: '0.4375rem', fontWeight: 800,
        }}>{badge}</span>
      )}
    </button>
  );
}

function StatusPill({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : 'var(--text-muted)';
  return (
    <div style={{
      padding: '2px 6px', borderRadius: 5, fontSize: '0.5625rem', fontWeight: 600,
      background: `${color}0a`, border: `1px solid ${color}18`, color,
      display: 'flex', alignItems: 'center', gap: '3px',
    }}>
      {pct === 100 ? '✓' : ''} {label}: {count}/{total}
    </div>
  );
}

const fixBtnStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: 4, fontSize: '0.5rem', fontWeight: 700,
  border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)',
  color: '#22c55e', cursor: 'pointer', whiteSpace: 'nowrap',
};
