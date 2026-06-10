// Job Visits — log required field visits (when / where / what learned) with a weekly goal.
// Backend: server/src/routes/jobVisits.routes.ts  ->  /api/job-visits
// Styling: app design tokens so it matches globally.
import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { api } from '../utils/api';

interface Visit {
  id: string; siteName: string | null; address: string | null; city: string | null;
  visitedAt: string; learned: string | null;
}

const card: CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 10px)', padding: 16, marginBottom: 14 };
const muted: CSSProperties = { color: 'var(--text-muted)', fontSize: 13 };
const input: CSSProperties = { width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, marginBottom: 10, background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const btn: CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 600 };

const startOfWeek = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d; };
const fmt = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

export function JobVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [form, setForm] = useState({ siteName: '', address: '', city: '', learned: '' });
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem('wwa_visit_goal') || 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/job-visits'); setVisits(res.visits || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const thisWeek = visits.filter(v => new Date(v.visitedAt) >= startOfWeek()).length;
  const set = (k: string, val: string) => setForm(f => ({ ...f, [k]: val }));

  const save = async () => {
    if (!form.siteName && !form.address) return;
    setSaving(true);
    try { await api.post('/job-visits', form); setForm({ siteName: '', address: '', city: '', learned: '' }); load(); }
    finally { setSaving(false); }
  };
  const saveNote = async (id: string, learned: string) => { try { await api.put('/job-visits/' + id, { learned }); } catch { /* ignore */ } };
  const remove = async (id: string) => { try { await api.delete('/job-visits/' + id); load(); } catch { /* ignore */ } };
  const setGoalVal = (n: number) => { setGoal(n); localStorage.setItem('wwa_visit_goal', String(n)); };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16, fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: 'var(--text-primary)' }}>Job Visits</h1>
      <p style={{ ...muted, margin: '0 0 14px' }}>Log each required job-site visit — when, where, and what you learned.</p>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)' }}>{thisWeek}</span>
          <span style={muted}>of</span>
          <input type="number" min={1} max={50} value={goal} onChange={e => setGoalVal(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            style={{ width: 52, height: 30, padding: '0 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
          <span style={muted}>visits this week</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', background: 'var(--success)', width: Math.min(100, Math.round(thisWeek / goal * 100)) + '%' }} />
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary)' }}>Log a visit</h3>
        <input style={input} placeholder="Site / customer name" value={form.siteName} onChange={e => set('siteName', e.target.value)} />
        <input style={input} placeholder="Address" value={form.address} onChange={e => set('address', e.target.value)} />
        <input style={input} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
        <textarea style={{ ...input, height: 64, padding: 10 }} placeholder="What did you learn?" value={form.learned} onChange={e => set('learned', e.target.value)} />
        <button style={{ ...btn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save visit (stamps now)'}</button>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary)' }}>Recent visits</h3>
        {visits.length === 0 ? (
          <div style={{ ...muted, padding: '12px 0' }}>No visits logged yet.</div>
        ) : visits.map(v => (
          <div key={v.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.siteName || v.address}</span>
              <span style={{ ...muted, marginLeft: 'auto' }}>{fmt(v.visitedAt)}</span>
              <button onClick={() => remove(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>delete</button>
            </div>
            {v.address && <div style={muted}>{v.address}{v.city ? ', ' + v.city : ''}</div>}
            <textarea defaultValue={v.learned || ''} placeholder="What did you learn?" onBlur={e => saveNote(v.id, e.target.value)}
              style={{ ...input, marginTop: 6, marginBottom: 0, height: 48, padding: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
