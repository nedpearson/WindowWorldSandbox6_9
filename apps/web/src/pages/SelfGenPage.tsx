// Self Gen — quick entry + tracking for self-generated leads.
// A self-gen lead = Customer (leadSource: 'self_gen') + Appointment owned by the rep.
// Backend: server/src/routes/selfGen.routes.ts  ->  /api/self-gen
// Styling: uses the app's global design tokens (apps/web/src/styles/index.css) so it
// matches the rest of the app automatically in any theme.
import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

interface SelfGenLead {
  id: string;
  status: string;
  appointmentDate: string | null;
  jobAddress: string | null;
  jobCity: string | null;
  totalAmount: number;
  projectType: string | null;
  customer: { id: string; firstName: string; lastName: string; phone: string | null };
}

const card: CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 10px)', padding: 16, marginBottom: 16 };
const label: CSSProperties = { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 };
const input: CSSProperties = { width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, marginBottom: 10, background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const btn: CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 600 };

const empty = { firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '', appointmentDate: '', projectType: 'replacement', notes: '' };

export function SelfGenPage() {
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [leads, setLeads] = useState<SelfGenLead[]>([]);
  const [sold, setSold] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/self-gen');
      setLeads(res.leads || []);
      setSold(res.sold || 0);
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr(null); setMsg(null);
    if (!form.firstName && !form.lastName && !form.phone) { setErr('Add at least a name or phone.'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.appointmentDate) payload.appointmentDate = new Date(payload.appointmentDate).toISOString();
      else delete payload.appointmentDate;
      await api.post('/self-gen', payload);
      setMsg(`Self-gen lead saved: ${form.firstName} ${form.lastName}`.trim());
      setForm({ ...empty });
      load();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 16, fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: 'var(--text-primary)' }}>Self Gen</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px' }}>
        Log a lead you generated yourself. It creates the customer and an appointment under your name and counts toward your self-gen numbers.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ ...card, flex: 1, marginBottom: 0 }}><div style={label}>Self-gen leads</div><div style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)' }}>{leads.length}</div></div>
        <div style={{ ...card, flex: 1, marginBottom: 0 }}><div style={label}>Sold</div><div style={{ fontSize: 26, fontWeight: 600, color: 'var(--success)' }}>{sold}</div></div>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>First name</label><input style={input} value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div><label style={label}>Last name</label><input style={input} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
          <div><label style={label}>Phone</label><input style={input} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div><label style={label}>Email</label><input style={input} value={form.email} onChange={e => set('email', e.target.value)} /></div>
        </div>
        <label style={label}>Address</label><input style={input} value={form.address} onChange={e => set('address', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div><label style={label}>City</label><input style={input} value={form.city} onChange={e => set('city', e.target.value)} /></div>
          <div><label style={label}>State</label><input style={input} value={form.state} onChange={e => set('state', e.target.value)} /></div>
          <div><label style={label}>ZIP</label><input style={input} value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>Appointment date/time</label><input style={input} type="datetime-local" value={form.appointmentDate} onChange={e => set('appointmentDate', e.target.value)} /></div>
          <div><label style={label}>Project type</label>
            <select style={input} value={form.projectType} onChange={e => set('projectType', e.target.value)}>
              <option value="replacement">Replacement</option>
              <option value="new_construction">New construction</option>
              <option value="siding">Siding</option>
              <option value="doors">Doors</option>
            </select>
          </div>
        </div>
        <label style={label}>Notes</label>
        <textarea style={{ ...input, height: 70, padding: 10 }} value={form.notes} onChange={e => set('notes', e.target.value)} />

        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        {msg && <div style={{ color: 'var(--success)', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
        <button style={{ ...btn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Save self-gen lead'}</button>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary)' }}>Your self-gen leads</h3>
        {leads.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>None yet — log one above.</div>
        ) : leads.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <Link to={`/appointments/${l.id}`} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>{l.customer.firstName} {l.customer.lastName}</Link>
            <span style={{ color: 'var(--text-muted)' }}>{l.jobCity || ''}</span>
            <span style={{ marginLeft: 'auto', color: l.status === 'sold' ? 'var(--success)' : 'var(--text-muted)' }}>{l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
