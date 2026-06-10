import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  triggerField: string;
  triggerValue: string;
  actionType: string;       // set_field | warn | require_confirmation
  actionField?: string;
  actionValue?: string;
  message?: string;
  severity?: string;        // info | warning | error
  isActive: boolean;
}

const EMPTY_RULE: Omit<BusinessRule, 'id'> = {
  name: '',
  description: '',
  triggerField: '',
  triggerValue: '',
  actionType: 'set_field',
  actionField: '',
  actionValue: '',
  message: '',
  severity: 'warning',
  isActive: true,
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  set_field: 'Set Field',
  warn: 'Show Warning',
  require_confirmation: 'Require Confirmation',
};

const COMMON_FIELDS = [
  'exteriorType', 'installType', 'roomLocation', 'glassOption', 'productCategory',
  'hinge', 'gridStyle', 'removalType', 'floorNumber', 'foamEnhanced',
];

function ActionBadge({ rule }: { rule: BusinessRule }) {
  if (rule.actionType === 'set_field') return (
    <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontSize: '0.75rem' }}>
      SET {rule.actionField} = {rule.actionValue}
    </span>
  );
  if (rule.actionType === 'warn') return (
    <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: '0.75rem' }}>
      WARN: {rule.message}
    </span>
  );
  if (rule.actionType === 'require_confirmation') return (
    <span className="badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontSize: '0.75rem' }}>
      CONFIRM: SET {rule.actionField} = {rule.actionValue}
    </span>
  );
  return null;
}

export function RuleEngineAdminPage() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/rules');
      setRules(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setRules([]);
      setError(err.message || 'Failed to load rules. Check server connection.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ ...EMPTY_RULE, id: '' } as BusinessRule);
    setIsNew(true);
    setError('');
  };

  const openEdit = (rule: BusinessRule) => {
    setEditing({ ...rule });
    setIsNew(false);
    setError('');
  };

  const closeModal = () => { setEditing(null); setIsNew(false); setError(''); };

  const upd = (field: string, value: any) => setEditing(prev => prev ? { ...prev, [field]: value } : prev);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setError('Rule name is required'); return; }
    if (!editing.triggerField.trim()) { setError('Trigger field is required'); return; }
    if (!editing.triggerValue.trim()) { setError('Trigger value is required'); return; }
    if (editing.actionType === 'warn' && !editing.message?.trim()) { setError('Warning message is required'); return; }
    if (editing.actionType !== 'warn' && !editing.actionField?.trim()) { setError('Action field is required'); return; }

    setSaving(true);
    setError('');
    try {
      const { id, ...payload } = editing;
      if (isNew) {
        const created = await api.post('/rules', payload);
        setRules(prev => [...prev, created]);
        showToast('✅ Rule created');
      } else {
        const updated = await api.put(`/rules/${id}`, payload);
        setRules(prev => prev.map(r => r.id === id ? updated : r));
        showToast('✅ Rule updated');
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    }
    setSaving(false);
  };

  const toggleActive = async (rule: BusinessRule) => {
    try {
      const updated = await api.put(`/rules/${rule.id}`, { ...rule, isActive: !rule.isActive });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: updated.isActive } : r));
      showToast(updated.isActive ? '✅ Rule enabled' : '⏸ Rule disabled');
    } catch {
      showToast('❌ Could not toggle rule');
    }
  };

  const deleteRule = async (rule: BusinessRule) => {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/rules/${rule.id}`);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      showToast('🗑 Rule deleted');
    } catch {
      showToast('❌ Delete failed');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
      <div>⚡ Loading Rule Engine…</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem', position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>⚡ Custom Rule Engine</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configure Window World intelligence rules for the field app.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Rule</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '0.875rem 1rem', width: 60 }}>Status</th>
              <th style={{ padding: '0.875rem 1rem' }}>Rule Name</th>
              <th style={{ padding: '0.875rem 1rem' }}>Trigger</th>
              <th style={{ padding: '0.875rem 1rem' }}>Action</th>
              <th style={{ padding: '0.875rem 1rem', textAlign: 'right', width: 160 }}>Controls</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No rules configured. Click <strong>+ New Rule</strong> to add one.
                </td>
              </tr>
            )}
            {rules.map(rule => (
              <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Status dot — click to toggle */}
                <td style={{ padding: '1rem' }}>
                  <button
                    title={rule.isActive ? 'Click to disable' : 'Click to enable'}
                    onClick={() => toggleActive(rule)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'block', width: 14, height: 14, borderRadius: '50%', background: rule.isActive ? 'var(--success)' : 'var(--text-muted)', transition: 'background 0.2s', boxShadow: rule.isActive ? '0 0 6px rgba(34,197,94,0.5)' : 'none' }}
                  />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{rule.name}</div>
                  {rule.description && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>{rule.description}</div>}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge" style={{ fontSize: '0.75rem' }}>IF {rule.triggerField} = {rule.triggerValue}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <ActionBadge rule={rule} />
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(rule)}>✏️ Edit</button>
                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => deleteRule(rule)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / Create Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1875rem', fontWeight: 700 }}>
                {isNew ? '+ New Rule' : `✏️ Edit: ${editing.name}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Name */}
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Rule Name *
                <input
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                  value={editing.name}
                  onChange={e => upd('name', e.target.value)}
                  placeholder="e.g. Brick → EXT Install"
                />
              </label>

              {/* Description */}
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Description
                <input
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                  value={editing.description || ''}
                  onChange={e => upd('description', e.target.value)}
                  placeholder="Brief explanation for field reps"
                />
              </label>

              {/* Trigger */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--accent)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trigger Condition</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Field *
                    <input
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 4 }}
                      list="trigger-field-options"
                      value={editing.triggerField}
                      onChange={e => upd('triggerField', e.target.value)}
                      placeholder="e.g. exteriorType"
                    />
                    <datalist id="trigger-field-options">
                      {COMMON_FIELDS.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </label>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Value *
                    <input
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 4 }}
                      value={editing.triggerValue}
                      onChange={e => upd('triggerValue', e.target.value)}
                      placeholder="e.g. Brick"
                    />
                  </label>
                </div>
              </div>

              {/* Action */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--accent)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</div>

                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Action Type *
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                    value={editing.actionType}
                    onChange={e => upd('actionType', e.target.value)}
                  >
                    {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>

                {editing.actionType !== 'warn' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Set Field *
                      <input
                        className="form-input"
                        style={{ display: 'block', width: '100%', marginTop: 4 }}
                        list="action-field-options"
                        value={editing.actionField || ''}
                        onChange={e => upd('actionField', e.target.value)}
                        placeholder="e.g. installType"
                      />
                      <datalist id="action-field-options">
                        {COMMON_FIELDS.map(f => <option key={f} value={f} />)}
                      </datalist>
                    </label>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Set Value *
                      <input
                        className="form-input"
                        style={{ display: 'block', width: '100%', marginTop: 4 }}
                        value={editing.actionValue || ''}
                        onChange={e => upd('actionValue', e.target.value)}
                        placeholder="e.g. EXT"
                      />
                    </label>
                  </div>
                )}

                {editing.actionType === 'warn' && (
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginTop: '0.75rem' }}>
                    Warning Message *
                    <textarea
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 4, resize: 'vertical', minHeight: 64 }}
                      value={editing.message || ''}
                      onChange={e => upd('message', e.target.value)}
                      placeholder="Message shown to the field rep when this rule fires"
                    />
                  </label>
                )}
              </div>

              {/* Active toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={e => upd('isActive', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                Rule is active (applies to all field reps)
              </label>

              {/* Error */}
              {error && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.8125rem' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : isNew ? 'Create Rule' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
