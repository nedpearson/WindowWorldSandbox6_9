import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import type { User } from '../types';

// ═══════════════════════════════════════════════════════════════
// Measurement Rules Admin Dashboard — DB-backed, Office Mode
// ═══════════════════════════════════════════════════════════════

type DbStatus = 'verified' | 'needs_verification' | 'draft' | 'inactive';

interface DbRule {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  windowType?: string | null;
  exteriorType?: string | null;
  installType?: string | null;
  removalType?: string | null;
  widthTakeoffFraction?: string | null;
  heightTakeoffFraction?: string | null;
  widthTakeoffDecimal: number;
  heightTakeoffDecimal: number;
  requiresConfirmation: boolean;
  requiresPhoto: boolean;
  requiresNote: boolean;
  severity: string;
  notes?: string | null;
  version: number;
  active: boolean;
  companyId?: string | null;
}

const STATUS_INFO: Record<string, { bg: string; color: string; label: string }> = {
  verified:           { bg: 'rgba(34,197,94,0.12)',   color: 'var(--success)',      label: '✅ Verified' },
  needs_verification: { bg: 'rgba(245,158,11,0.12)',  color: 'var(--warning)',      label: '⚠️ Needs Verification' },
  draft:              { bg: 'rgba(139,92,246,0.12)',   color: 'var(--primary)',      label: '📝 Draft' },
  inactive:           { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)',   label: '— Inactive' },
};

function formatTakeoff(fraction: string | null | undefined, decimal: number): string {
  if (fraction) return `−${fraction}" (${decimal}")`;
  if (!decimal || decimal === 0) return 'None';
  if (decimal === 0.25) return '−1/4" (0.25")';
  if (decimal === 0.5)  return '−1/2" (0.5")';
  if (decimal === 0.75) return '−3/4" (0.75")';
  return `−${decimal}"`;
}

const WRITE_ROLES = ['admin', 'manager', 'super_admin', 'owner'];

const EMPTY_FORM = {
  name: '',
  description: '',
  windowType: '',
  exteriorType: '',
  installType: '',
  widthTakeoffDecimal: 0,
  heightTakeoffDecimal: 0,
  status: 'needs_verification' as string,
  requiresConfirmation: true,
  requiresPhoto: false,
  requiresNote: false,
  severity: 'high',
  notes: '',
};

export function MeasurementRulesAdminPage() {
  const user = useAuthStore((s: { user: User | null }) => s.user);
  const canEdit = WRITE_ROLES.includes(user?.role ?? '');

  const [rules, setRules] = useState<DbRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<DbRule | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Admin/manager see all (including inactive), others see active only
      const data = await api.getMeasurementRules(canEdit);
      setRules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load measurement rules');
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? rules : rules.filter(r => r.status === filter);
  const needsVerif = rules.filter(r => r.status === 'needs_verification').length;

  // ── Status toggle ─────────────────────────────────────────────
  const handleToggleStatus = async (rule: DbRule, newStatus: string) => {
    if (!canEdit) return;
    try {
      const updated: DbRule = await api.updateMeasurementRule(rule.id, { status: newStatus });
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      showToast(`Rule status updated to ${newStatus}`);
    } catch (e: any) {
      showToast('Failed to update status: ' + (e?.message || ''));
    }
  };

  // ── Verify shortcut ───────────────────────────────────────────
  const handleVerify = async (rule: DbRule) => {
    if (!canEdit) return;
    try {
      const updated: DbRule = await api.verifyMeasurementRule(rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      showToast('Rule verified ✅');
    } catch (e: any) {
      showToast('Failed to verify: ' + (e?.message || ''));
    }
  };

  // ── Retire (soft-delete) ──────────────────────────────────────
  const handleDelete = async (rule: DbRule) => {
    if (!canEdit) return;
    if (!confirm(`Retire rule "${rule.name}"? It will be hidden but not permanently deleted.`)) return;
    try {
      await api.deleteMeasurementRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      showToast('Rule retired');
    } catch (e: any) {
      showToast('Failed to retire rule: ' + (e?.message || ''));
    }
  };

  // ── Save edited rule ──────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editing || !canEdit) return;
    setSaving(true);
    try {
      const updated: DbRule = await api.updateMeasurementRule(editing.id, {
        name:                 editing.name,
        description:          editing.description,
        status:               editing.status,
        widthTakeoffDecimal:  editing.widthTakeoffDecimal,
        heightTakeoffDecimal: editing.heightTakeoffDecimal,
        requiresConfirmation: editing.requiresConfirmation,
        requiresPhoto:        editing.requiresPhoto,
        requiresNote:         editing.requiresNote,
        severity:             editing.severity,
        notes:                editing.notes,
        windowType:           editing.windowType || null,
        exteriorType:         editing.exteriorType || null,
        installType:          editing.installType || null,
      });
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditing(null);
      showToast('Rule saved ✅');
    } catch (e: any) {
      showToast('Failed to save: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // ── Seed defaults ─────────────────────────────────────────────
  const handleSeedDefaults = async () => {
    if (!canEdit) return;
    if (!confirm('Seed the 9 default Window World measurement rules into the database? This is safe to run multiple times — it skips any that already exist.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/measurement-rules/seed-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      showToast(data.summary || 'Seed complete');
      await load();
    } catch (e: any) {
      showToast('Seed failed: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!canEdit) return;
    if (!form.name.trim()) { showToast('Rule name is required'); return; }
    setSaving(true);
    try {
      const created: DbRule = await api.createMeasurementRule({
        ...form,
        windowType:   form.windowType || null,
        exteriorType: form.exteriorType || null,
        installType:  form.installType || null,
      });
      setRules(prev => [...prev, created]);
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
      showToast('Rule created ✅');
    } catch (e: any) {
      showToast('Failed to create rule: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // ── Batch verify all active rules ─────────────────────────────
  const handleVerifyAll = async () => {
    if (!canEdit) return;
    const unverified = rules.filter(r => r.status !== 'verified' && r.active);
    if (unverified.length === 0) { showToast('All rules are already verified ✅'); return; }
    if (!confirm(`Mark all ${unverified.length} unverified rules as Verified?`)) return;
    setSaving(true);
    try {
      const updated = await Promise.all(
        unverified.map(r => api.updateMeasurementRule(r.id, { status: 'verified' }) as Promise<DbRule>)
      );
      setRules(prev => prev.map(r => {
        const u = updated.find((u: DbRule) => u.id === r.id);
        return u ? u : r;
      }));
      showToast(`${updated.length} rule${updated.length > 1 ? 's' : ''} verified ✅`);
    } catch (e: any) {
      showToast('Batch verify failed: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 600, fontSize: '0.875rem' }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>📐 Measurement Rules</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Configure takeoff/deduction rules for all window types. All NEEDS_VERIFICATION rules must be confirmed by Window World before field use.
        </p>
      </div>

      {needsVerif > 0 && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10 }}>
          <strong style={{ color: 'var(--warning)' }}>⚠️ {needsVerif} rule{needsVerif > 1 ? 's' : ''} need verification</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
            — Review and mark verified after confirming values with Window World.
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {(['all', 'verified', 'needs_verification', 'draft'] as const).map(s => {
          const count = s === 'all' ? rules.length : rules.filter(r => r.status === s).length;
          const info = s === 'all'
            ? { bg: 'var(--bg-secondary)', color: 'var(--text-primary)', label: 'All Rules' }
            : (STATUS_INFO[s] ?? { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', label: s });
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '0.75rem', background: filter === s ? info.color + '22' : 'var(--bg-secondary)', border: `2px solid ${filter === s ? info.color : 'transparent'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: info.color }}>{count}</div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{info.label}</div>
            </button>
          );
        })}
      </div>

      {/* Rule table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700 }}>
            Measurement Rules ({loading ? '…' : filtered.length})
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canEdit && rules.filter(r => r.status !== 'verified' && r.active).length > 0 && !loading && (
              <button
                id="verify-all-rules-btn"
                onClick={handleVerifyAll}
                disabled={saving}
                className="btn btn-sm"
                style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.75rem' }}
                title="Mark all unverified rules as Verified"
              >
                ✅ Verify All ({rules.filter(r => r.status !== 'verified' && r.active).length})
              </button>
            )}
            {canEdit && rules.length === 0 && !loading && (
              <button
                id="seed-default-rules-btn"
                onClick={handleSeedDefaults}
                disabled={saving}
                className="btn btn-sm"
                style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '0.75rem' }}
                title="Seed the 9 default Window World measurement rules into the database"
              >
                🌱 Seed Default Rules
              </button>
            )}
            <button
              id="add-measurement-rule-btn"
              onClick={() => { if (canEdit) { setShowAdd(true); setForm({ ...EMPTY_FORM }); } }}
              disabled={!canEdit}
              title={canEdit ? 'Add a new measurement rule' : 'Admin or manager role required'}
              className="btn btn-sm btn-primary"
              style={{ opacity: canEdit ? 1 : 0.45, cursor: canEdit ? 'pointer' : 'not-allowed' }}
            >
              + Add Rule{!canEdit ? ' (Read Only)' : ''}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading rules…
          </div>
        )}
        {!loading && error && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
            {error} — <button onClick={load} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Retry</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No rules found.{filter !== 'all' && ' Try "All Rules" filter.'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Rule</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Window / Exterior</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Width Takeoff</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Height Takeoff</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rule => {
                const statusInfo = STATUS_INFO[rule.status] ?? STATUS_INFO['draft'];
                return (
                  <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)', opacity: rule.active ? 1 : 0.5 }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700 }}>{rule.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: 260 }}>{rule.description}</div>
                      {!rule.active && <div style={{ fontSize: '0.625rem', color: 'var(--error)', fontWeight: 700 }}>RETIRED</div>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem' }}>
                        {rule.windowType && <span className="badge" style={{ marginRight: '0.25rem' }}>{rule.windowType}</span>}
                        {rule.exteriorType && <span className="badge">{rule.exteriorType}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {rule.installType && `Install: ${rule.installType}`}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                      {formatTakeoff(rule.widthTakeoffFraction, rule.widthTakeoffDecimal)}
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                      {formatTakeoff(rule.heightTakeoffFraction, rule.heightTakeoffDecimal)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: 999, background: statusInfo.bg, color: statusInfo.color, fontWeight: 700, fontSize: '0.6875rem' }}>
                        {statusInfo.label}
                      </span>
                      {rule.requiresConfirmation && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Req. confirmation</div>}
                      {rule.requiresPhoto && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Req. photo</div>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexDirection: 'column' }}>
                        {canEdit && rule.status === 'needs_verification' && (
                          <button
                            onClick={() => handleVerify(rule)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
                          >
                            ✅ Mark Verified
                          </button>
                        )}
                        {canEdit && rule.status === 'verified' && (
                          <button
                            onClick={() => handleToggleStatus(rule, 'needs_verification')}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem' }}
                          >
                            ⚠️ Needs Review
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setEditing(rule)}
                            style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem' }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {canEdit && rule.active && (
                          <button
                            onClick={() => handleDelete(rule)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem' }}
                          >
                            🗑 Retire
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}
        >
          <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 14, width: '90%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* ✕ close button */}
            <button
              onClick={() => setEditing(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1 }}
              title="Close"
            >
              ×
            </button>
            <h3 style={{ margin: '0 0 1rem', paddingRight: '2rem' }}>Edit Rule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="form-group">
                <span className="form-label">Rule Name *</span>
                <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="form-group">
                <span className="form-label">Description</span>
                <textarea className="form-input" rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <label className="form-group">
                  <span className="form-label">Window Type</span>
                  <input className="form-input" value={editing.windowType || ''} onChange={e => setEditing({ ...editing, windowType: e.target.value })} placeholder="oriel, arch…" />
                </label>
                <label className="form-group">
                  <span className="form-label">Exterior Type</span>
                  <input className="form-input" value={editing.exteriorType || ''} onChange={e => setEditing({ ...editing, exteriorType: e.target.value })} placeholder="brick, siding…" />
                </label>
                <label className="form-group">
                  <span className="form-label">Install Type</span>
                  <select className="form-input" value={editing.installType || ''} onChange={e => setEditing({ ...editing, installType: e.target.value })}>
                    <option value="">Any</option>
                    <option value="INT">INT (Insert)</option>
                    <option value="EXT">EXT (Full Frame)</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label className="form-group">
                  <span className="form-label">Width Takeoff (inches)</span>
                  <input className="form-input" type="number" step="0.0625" min="0" value={editing.widthTakeoffDecimal || 0}
                    onChange={e => setEditing({ ...editing, widthTakeoffDecimal: parseFloat(e.target.value) || 0 })} />
                </label>
                <label className="form-group">
                  <span className="form-label">Height Takeoff (inches)</span>
                  <input className="form-input" type="number" step="0.0625" min="0" value={editing.heightTakeoffDecimal || 0}
                    onChange={e => setEditing({ ...editing, heightTakeoffDecimal: parseFloat(e.target.value) || 0 })} />
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Status</span>
                <select className="form-input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as DbStatus })}>
                  <option value="verified">✅ Verified</option>
                  <option value="needs_verification">⚠️ Needs Verification</option>
                  <option value="draft">📝 Draft</option>
                  <option value="inactive">— Inactive</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={editing.requiresConfirmation} onChange={e => setEditing({ ...editing, requiresConfirmation: e.target.checked })} />
                  Req. Confirmation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={editing.requiresPhoto} onChange={e => setEditing({ ...editing, requiresPhoto: e.target.checked })} />
                  Req. Photo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={editing.requiresNote} onChange={e => setEditing({ ...editing, requiresNote: e.target.checked })} />
                  Req. Note
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Notes</span>
                <textarea className="form-input" rows={2} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleSaveEdit} className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Rule'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule modal */}
      {showAdd && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 14, width: '90%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* ✕ close button */}
            <button
              onClick={() => setShowAdd(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1 }}
              title="Close"
            >
              ×
            </button>
            <h3 style={{ margin: '0 0 1rem', paddingRight: '2rem' }}>➕ Add Measurement Rule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="form-group">
                <span className="form-label">Rule Name *</span>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Insert Install / Brick — Standard Takeoff" />
              </label>
              <label className="form-group">
                <span className="form-label">Description</span>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <label className="form-group">
                  <span className="form-label">Window Type</span>
                  <input className="form-input" value={form.windowType} onChange={e => setForm({ ...form, windowType: e.target.value })} placeholder="oriel, arch…" />
                </label>
                <label className="form-group">
                  <span className="form-label">Exterior Type</span>
                  <input className="form-input" value={form.exteriorType} onChange={e => setForm({ ...form, exteriorType: e.target.value })} placeholder="brick, siding…" />
                </label>
                <label className="form-group">
                  <span className="form-label">Install Type</span>
                  <select className="form-input" value={form.installType} onChange={e => setForm({ ...form, installType: e.target.value })}>
                    <option value="">Any</option>
                    <option value="INT">INT (Insert)</option>
                    <option value="EXT">EXT (Full Frame)</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label className="form-group">
                  <span className="form-label">Width Takeoff (inches)</span>
                  <input className="form-input" type="number" step="0.0625" min="0" value={form.widthTakeoffDecimal}
                    onChange={e => setForm({ ...form, widthTakeoffDecimal: parseFloat(e.target.value) || 0 })} />
                </label>
                <label className="form-group">
                  <span className="form-label">Height Takeoff (inches)</span>
                  <input className="form-input" type="number" step="0.0625" min="0" value={form.heightTakeoffDecimal}
                    onChange={e => setForm({ ...form, heightTakeoffDecimal: parseFloat(e.target.value) || 0 })} />
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Status</span>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="needs_verification">⚠️ Needs Verification</option>
                  <option value="verified">✅ Verified</option>
                  <option value="draft">📝 Draft</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.requiresConfirmation} onChange={e => setForm({ ...form, requiresConfirmation: e.target.checked })} />
                  Req. Confirmation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.requiresPhoto} onChange={e => setForm({ ...form, requiresPhoto: e.target.checked })} />
                  Req. Photo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.requiresNote} onChange={e => setForm({ ...form, requiresNote: e.target.checked })} />
                  Req. Note
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Notes</span>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleCreate} className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Rule'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
