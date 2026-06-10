// Reports — field-activity report (appointments, closed, self-gen, visits, be-backs).
// Backend: server/src/routes/reports.routes.ts -> /api/reports/field-activity
// Styling: app design tokens so it matches globally.
import { useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { api } from '../utils/api';

interface Summary { appointments: number; closed: number; selfGen: number; beBacks: number; jobVisits: number; totalSold: number; }
interface Appt { id: string; appointmentDate: string | null; status: string; jobCity: string | null; totalAmount: number; customer?: { firstName: string; lastName: string }; }

const card: CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 10px)', padding: 16, marginBottom: 14 };
const muted: CSSProperties = { color: 'var(--text-muted)', fontSize: 13 };
const input: CSSProperties = { height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const btn: CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 };
const ghost: CSSProperties = { ...btn, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReportsPage() {
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/field-activity?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`);
      setSummary(res.summary); setAppts(res.appointments || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [from, to]);

  const downloadCsv = useCallback(async () => {
    const token = localStorage.getItem('wwa_token') || '';
    const res = await fetch(`/api/reports/field-activity?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `field-activity-${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [from, to]);

  const cards: [string, string][] = summary ? [
    ['Appointments', String(summary.appointments)],
    ['Closed', String(summary.closed)],
    ['Self-Gen', String(summary.selfGen)],
    ['Be-Backs', String(summary.beBacks)],
    ['Job Visits', String(summary.jobVisits)],
    ['Total Sold', money(summary.totalSold)],
  ] : [];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 16, fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: 'var(--text-primary)' }}>Reports</h1>
      <p style={{ ...muted, margin: '0 0 14px' }}>Field activity for a date range — appointments, closed, self-gen, job visits, and be-backs. Export to hand in.</p>

      <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div><label style={{ ...muted, display: 'block', marginBottom: 4 }}>From</label><input style={input} type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><label style={{ ...muted, display: 'block', marginBottom: 4 }}>To</label><input style={input} type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <button style={btn} onClick={run}>{loading ? 'Running…' : 'Run report'}</button>
        <button style={ghost} onClick={downloadCsv} disabled={!summary}>Download CSV / Excel</button>
      </div>

      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
            {cards.map(([k, v]) => (
              <div key={k} style={{ ...card, marginBottom: 0 }}><div style={muted}>{k}</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div></div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary)' }}>Appointments</h3>
            {appts.length === 0 ? <div style={muted}>None in range.</div> : appts.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: 13, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 78 }}>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : ''}</span>
                <span style={{ color: 'var(--text-primary)' }}>{a.customer?.firstName} {a.customer?.lastName}</span>
                <span style={{ color: 'var(--text-muted)' }}>{a.jobCity || ''}</span>
                <span style={{ marginLeft: 'auto', color: a.status === 'sold' ? 'var(--success)' : 'var(--text-muted)' }}>{a.status}</span>
                <span style={{ color: 'var(--text-primary)', minWidth: 80, textAlign: 'right' }}>{money(a.totalAmount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
