import { useState, useEffect } from 'react';
import { runAppointmentCoach } from '../utils/appointmentCoach';
import { runFullValidation } from '../utils/centralValidationOrchestrator';

// ── Local-storage backed office notes & flags ─────────────
const STORE_KEY = 'wwa_office_data';

export interface OfficeFlag {
  openingNumber: number;
  type: 'redline' | 'photo_request' | 'measurement_request' | 'clarification';
  note: string;
  resolved: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface OfficeNote {
  id: string;
  text: string;
  author: string;
  layer: 'customer' | 'installer' | 'office';
  createdAt: number;
}

export interface ApprovalState {
  officeApproved: boolean;
  officeApprovedBy?: string;
  officeApprovedAt?: number;
  remeasureRequired: boolean;
  remeasureApproved: boolean;
  managerApprovalRequired: boolean;
  managerApproved: boolean;
  managerApprovedBy?: string;
  status: 'needs_review' | 'missing_info' | 'ready_ordering' | 'needs_remeasure' | 'ready_production';
  changeLog: ChangeEntry[];
}

export interface ChangeEntry {
  field: string;
  oldValue: string;
  newValue: string;
  by: string;
  at: number;
}

interface OfficeStore {
  [appointmentId: string]: {
    flags: OfficeFlag[];
    notes: OfficeNote[];
    approval: ApprovalState;
  };
}

function loadStore(): OfficeStore {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}
function saveStore(s: OfficeStore) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

export function getOfficeData(appointmentId: string) {
  const s = loadStore();
  if (!s[appointmentId]) {
    s[appointmentId] = {
      flags: [],
      notes: [],
      approval: {
        officeApproved: false, remeasureRequired: false, remeasureApproved: false,
        managerApprovalRequired: false, managerApproved: false,
        status: 'needs_review', changeLog: [],
      },
    };
    saveStore(s);
  }
  return s[appointmentId];
}

export function saveOfficeData(appointmentId: string, data: ReturnType<typeof getOfficeData>) {
  const s = loadStore();
  s[appointmentId] = data;
  saveStore(s);
}

// ── Flag type config ──────────────────────────────────────
const FLAG_CFG = {
  redline:             { label: 'Redline / Unclear', color: '#ef4444', icon: '🔴' },
  photo_request:       { label: 'Photo Required',    color: '#8b5cf6', icon: '📸' },
  measurement_request: { label: 'Measurement Check', color: '#f59e0b', icon: '📏' },
  clarification:       { label: 'Clarification',     color: '#06b6d4', icon: '💬' },
};

// ══════════════════════════════════════════════════════════
// OFFICE REVIEW PANEL — integrated into AppointmentDetailPage
// ══════════════════════════════════════════════════════════
export function OfficeReviewPanel({ appointment, currentUserName = 'Office Staff' }: {
  appointment: any;
  currentUserName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'flags' | 'notes' | 'approval' | 'packet'>('flags');
  const [data, setData] = useState(() => getOfficeData(appointment.id));

  // Flag form
  const [flagOpening, setFlagOpening] = useState(1);
  const [flagType, setFlagType] = useState<OfficeFlag['type']>('redline');
  const [flagNote, setFlagNote] = useState('');

  // Note form
  const [noteText, setNoteText] = useState('');
  const [noteLayer, setNoteLayer] = useState<OfficeNote['layer']>('office');

  const coach = runAppointmentCoach(appointment);
  const openings = appointment.openings || [];
  const validation = runFullValidation(openings, [], [], appointment);

  const persist = (updated: typeof data) => {
    setData(updated);
    saveOfficeData(appointment.id, updated);
  };

  // ── Add flag ─────────────────────────────────────────
  const addFlag = () => {
    if (!flagNote.trim()) return;
    const updated = { ...data, flags: [...data.flags, {
      openingNumber: flagOpening, type: flagType, note: flagNote.trim(),
      resolved: false, createdAt: Date.now(),
    }]};
    persist(updated);
    setFlagNote('');
  };

  const resolveFlag = (idx: number) => {
    const flags = [...data.flags];
    flags[idx] = { ...flags[idx], resolved: true, resolvedAt: Date.now() };
    persist({ ...data, flags });
  };

  // ── Add note ─────────────────────────────────────────
  const addNote = () => {
    if (!noteText.trim()) return;
    const updated = { ...data, notes: [...data.notes, {
      id: `n_${Date.now()}`, text: noteText.trim(), author: currentUserName,
      layer: noteLayer, createdAt: Date.now(),
    }]};
    persist(updated);
    setNoteText('');
  };

  // ── Approval actions ──────────────────────────────────
  const approveOffice = () => {
    const approval = { ...data.approval, officeApproved: true, officeApprovedBy: currentUserName, officeApprovedAt: Date.now(), status: 'ready_ordering' as const };
    persist({ ...data, approval });
  };

  const approveManager = () => {
    const approval = { ...data.approval, managerApproved: true, managerApprovedBy: currentUserName, status: 'ready_production' as const };
    persist({ ...data, approval });
  };

  const setStatus = (status: ApprovalState['status']) => {
    persist({ ...data, approval: { ...data.approval, status } });
  };

  const openFlags = data.flags.filter(f => !f.resolved);
  const totalFlags = data.flags.length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="office-fab" title="Office Processing Mode">
        <span style={{ fontSize: '1.25rem' }}>🏢</span>
        {openFlags.length > 0 && (
          <span className="coach-fab-badge" style={{ background: '#ef4444' }}>{openFlags.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="office-panel">
      {/* Header */}
      <div className="coach-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem' }}>🏢</span>
          <h3 style={{ fontSize: '0.9375rem' }}>Office Review</h3>
          <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 9999, fontWeight: 700,
            background: data.approval.status === 'ready_production' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
            color: data.approval.status === 'ready_production' ? '#22c55e' : '#f59e0b' }}>
            {data.approval.status.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
        {([['flags', `🔴 Flags (${openFlags.length})`], ['notes', '📝 Notes'], ['approval', '✅ Approval'], ['packet', '🖨 Packet']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.375rem 0.25rem', fontSize: '0.625rem', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 4,
            background: tab === t ? 'var(--accent)' : 'var(--bg-input)', color: tab === t ? 'white' : 'var(--text-muted)',
          }}>{label}</button>
        ))}
      </div>

      {/* ── FLAGS TAB ─────────────────────────────────── */}
      {tab === 'flags' && (
        <div>
          {/* Add flag form */}
          <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.04)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', border: '1px solid rgba(239,68,68,0.1)' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>ADD REDLINE / FLAG</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginBottom: '0.375rem' }}>
              <select value={flagOpening} onChange={e => setFlagOpening(+e.target.value)}
                style={{ padding: '0.25rem', fontSize: '0.6875rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}>
                {openings.map((o: any) => <option key={o.openingNumber} value={o.openingNumber}>#{o.openingNumber} {o.roomLocation || 'Opening'}</option>)}
                <option value={0}>General</option>
              </select>
              <select value={flagType} onChange={e => setFlagType(e.target.value as any)}
                style={{ padding: '0.25rem', fontSize: '0.6875rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}>
                {Object.entries(FLAG_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <textarea value={flagNote} onChange={e => setFlagNote(e.target.value)}
              placeholder="Describe the issue..." rows={2}
              style={{ width: '100%', padding: '0.375rem', fontSize: '0.6875rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={addFlag} className="btn btn-sm" style={{ marginTop: '0.25rem', background: '#ef4444', color: 'white', border: 'none', fontSize: '0.6875rem' }}>
              🔴 Add Flag
            </button>
          </div>

          {/* Coach-generated high-risk flags */}
          {coach.openingScores.filter(o => o.riskFlags.length > 0).slice(0, 3).map(o => (
            <div key={o.openingNumber} style={{ padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#ef4444' }}>🤖 Auto-flag: #{o.openingNumber} {o.room}</div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 1 }}>{o.riskFlags.join(' · ')}</div>
            </div>
          ))}

          {/* Manual flags */}
          {data.flags.length === 0 && coach.openingScores.filter(o => o.riskFlags.length > 0).length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No flags yet</div>
          )}
          {data.flags.map((f, idx) => {
            const cfg = FLAG_CFG[f.type];
            return (
              <div key={idx} style={{ padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: f.resolved ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${f.resolved ? 'var(--border)' : cfg.color}`, opacity: f.resolved ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.5625rem', color: cfg.color, fontWeight: 700 }}>{cfg.icon} {cfg.label} — #{f.openingNumber === 0 ? 'General' : f.openingNumber}</span>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-primary)', marginTop: 2 }}>{f.note}</div>
                  </div>
                  {!f.resolved && (
                    <button onClick={() => resolveFlag(idx)} style={{ fontSize: '0.5rem', padding: '2px 6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, color: '#22c55e', cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Resolve</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOTES TAB ─────────────────────────────────── */}
      {tab === 'notes' && (
        <div>
          {/* Layer filter chips */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {(['office', 'installer', 'customer'] as const).map(layer => {
              const cfg = { office: { color: '#8b5cf6', label: '🏢 Office Only' }, installer: { color: '#06b6d4', label: '🔧 Installer' }, customer: { color: '#22c55e', label: '👤 Customer' } }[layer];
              return (
                <button key={layer} onClick={() => setNoteLayer(layer)} style={{ padding: '2px 8px', fontSize: '0.5625rem', fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: noteLayer === layer ? cfg.color : 'var(--bg-input)', color: noteLayer === layer ? 'white' : 'var(--text-muted)' }}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder={`Add ${noteLayer} note...`} rows={2}
              style={{ flex: 1, padding: '0.375rem', fontSize: '0.6875rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', resize: 'vertical' }} />
            <button onClick={addNote} className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-end', fontSize: '0.6875rem' }}>Add</button>
          </div>
          <div className="coach-items">
            {(['office', 'installer', 'customer'] as const).map(layer => {
              const layerNotes = data.notes.filter(n => n.layer === layer);
              if (layerNotes.length === 0) return null;
              const cfg = { office: { color: '#8b5cf6', label: '🏢 Office Only' }, installer: { color: '#06b6d4', label: '🔧 Installer' }, customer: { color: '#22c55e', label: '👤 Customer' } }[layer];
              return (
                <div key={layer} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: cfg.color, marginBottom: '0.25rem' }}>{cfg.label}</div>
                  {layerNotes.map(n => (
                    <div key={n.id} style={{ padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${cfg.color}` }}>
                      <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{n.author} · {new Date(n.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.6875rem', marginTop: 1 }}>{n.text}</div>
                    </div>
                  ))}
                </div>
              );
            })}
            {data.notes.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No notes yet</div>}
          </div>
        </div>
      )}

      {/* ── APPROVAL TAB ──────────────────────────────── */}
      {tab === 'approval' && (
        <div>
          {/* Status override */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>PROCESSING STATUS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {(['needs_review', 'missing_info', 'ready_ordering', 'needs_remeasure', 'ready_production'] as const).map(s => {
                const colors: Record<string, string> = { needs_review: '#f59e0b', missing_info: '#ef4444', ready_ordering: '#3b82f6', needs_remeasure: '#f97316', ready_production: '#22c55e' };
                return (
                  <button key={s} onClick={() => setStatus(s)} style={{ padding: '3px 8px', fontSize: '0.5625rem', fontWeight: 700, border: `1px solid ${colors[s]}`, borderRadius: 4, cursor: 'pointer', background: data.approval.status === s ? colors[s] : 'transparent', color: data.approval.status === s ? 'white' : colors[s] }}>
                    {s.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Approval steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Validation summary */}
            <div style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${validation.counts.critical > 0 ? '#ef4444' : '#22c55e'}` }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>VALIDATION</div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                <span style={{ color: validation.counts.critical > 0 ? '#ef4444' : '#22c55e' }}>🛑 {validation.counts.critical} Blockers</span>
                <span style={{ color: validation.counts.high > 0 ? '#f59e0b' : '#22c55e' }}>⚠ {validation.counts.high} High</span>
                <span style={{ color: 'var(--text-muted)' }}>📊 {validation.overallPct}%</span>
              </div>
            </div>

            {/* Office approval */}
            <div style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${data.approval.officeApproved ? '#22c55e' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>📋 Office Approval</div>
                  {data.approval.officeApproved && <div style={{ fontSize: '0.5625rem', color: '#22c55e' }}>✓ Approved by {data.approval.officeApprovedBy}</div>}
                </div>
                {!data.approval.officeApproved
                  ? <button onClick={approveOffice} className="btn btn-sm" disabled={validation.counts.critical > 0} style={{ fontSize: '0.625rem', background: '#22c55e', color: 'white', border: 'none', opacity: validation.counts.critical > 0 ? 0.5 : 1 }}>Approve</button>
                  : <span style={{ color: '#22c55e', fontSize: '1rem' }}>✓</span>}
              </div>
            </div>

            {/* Remeasure */}
            <div style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${coach.measurementConfidenceScore < 60 ? '#f59e0b' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>📏 Remeasure Check</div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>Confidence: {coach.measurementConfidenceScore}%</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={data.approval.remeasureRequired} onChange={e => persist({ ...data, approval: { ...data.approval, remeasureRequired: e.target.checked } })} />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Required</span>
                </label>
              </div>
            </div>

            {/* Manager approval */}
            <div style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${data.approval.managerApproved ? '#22c55e' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>👔 Manager Approval</div>
                  {data.approval.managerApproved && <div style={{ fontSize: '0.5625rem', color: '#22c55e' }}>✓ Approved by {data.approval.managerApprovedBy}</div>}
                  {!data.approval.managerApproved && <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>Required for pricing overrides</div>}
                </div>
                {!data.approval.managerApproved
                  ? <button onClick={approveManager} className="btn btn-sm" style={{ fontSize: '0.625rem', background: '#8b5cf6', color: 'white', border: 'none' }}>Manager Approve</button>
                  : <span style={{ color: '#22c55e', fontSize: '1rem' }}>✓</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PACKET TAB ────────────────────────────────── */}
      {tab === 'packet' && (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Generate a print-friendly processing packet
          </div>
          {[
            { label: '📋 Opening Schedule', desc: 'All openings with dimensions, product, price' },
            { label: '🗺 Sketch / Elevation Map', desc: 'House layout with opening markers' },
            { label: '💰 Pricing Summary', desc: 'Itemized totals with options breakdown' },
            { label: '📝 Change Log', desc: `${data.approval.changeLog.length} changes recorded` },
            { label: '🔴 Flags & Redlines', desc: `${totalFlags} flags (${openFlags.length} open)` },
            { label: '🏢 Office Notes', desc: `${data.notes.filter(n => n.layer === 'office').length} office-only notes` },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0.5rem', marginBottom: '0.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>✓</span>
            </div>
          ))}
          <button onClick={() => {
            import('../utils/pdfGenerator').then(m => m.generateContractPDF(appointment));
          }} className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
            📄 Download Processing Packet (PDF)
          </button>
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
            Generates standardized non-UI contract PDF
          </div>
        </div>
      )}
    </div>
  );
}
