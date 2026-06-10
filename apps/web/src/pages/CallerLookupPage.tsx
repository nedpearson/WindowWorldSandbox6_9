// Who's Calling — fast customer lookup by name or phone for inbound calls/texts.
// Uses existing endpoints: GET /customers/search?q=  and  GET /appointments?customerId=
// Styling: app design tokens (apps/web/src/styles/index.css) so it matches globally.
import { useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

interface Customer {
  id: string; firstName: string; lastName: string;
  phone: string | null; email: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  _count?: { appointments: number };
}
interface Appt {
  id: string; status: string; appointmentDate: string | null;
  jobAddress: string | null; totalAmount: number; projectType: string | null;
}

const card: CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 10px)', padding: 16, marginBottom: 14 };
const muted: CSSProperties = { color: 'var(--text-muted)', fontSize: 13 };
const input: CSSProperties = { width: '100%', height: 44, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16, background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const actBtn: CSSProperties = { flex: 1, minWidth: 90, textAlign: 'center', textDecoration: 'none', fontSize: 13, padding: '9px 8px', borderRadius: 9, border: '1px solid var(--border)', color: 'var(--text-primary)' };

const digits = (s: string) => (s || '').replace(/\D/g, '');
const initials = (c: Customer) => `${(c.firstName || ' ')[0]}${(c.lastName || ' ')[0]}`.toUpperCase();
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fullAddr = (c: Customer) => [c.address, c.city, c.state, c.zip].filter(Boolean).join(', ');

export function CallerLookupPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (term: string) => {
    setQ(term); setSelected(null);
    if (!term.trim()) { setResults([]); return; }
    try { setResults(await api.get('/customers/search?q=' + encodeURIComponent(term.trim()))); }
    catch { setResults([]); }
  }, []);

  const open = useCallback(async (c: Customer) => {
    setSelected(c); setAppts([]); setLoading(true);
    try { setAppts(await api.get('/appointments?customerId=' + c.id)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const tel = selected ? digits(selected.phone || '') : '';
  const latest = appts[0];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16, fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: 'var(--text-primary)' }}>Who's Calling</h1>
      <p style={{ ...muted, margin: '0 0 14px' }}>Search by name or phone the moment a call or text comes in.</p>

      <input style={{ ...input, marginBottom: 14 }} value={q} placeholder="Name or phone — e.g. 225-933 or Babin"
        onChange={e => search(e.target.value)} autoFocus />

      {!selected && (
        results.length === 0
          ? <div style={{ ...muted, textAlign: 'center', padding: '24px 0' }}>{q ? 'No match.' : 'Type a name or phone to find a customer.'}</div>
          : results.map(c => (
            <div key={c.id} onClick={() => open(c)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initials(c)}</div>
              <div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.firstName} {c.lastName}</div><div style={muted}>{c.phone || ''}{c.city ? ' · ' + c.city : ''}</div></div>
            </div>
          ))
      )}

      {selected && (
        <div>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>← Back to results</button>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{initials(selected)}</div>
              <div><div style={{ fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>{selected.firstName} {selected.lastName}</div><div style={muted}>{[selected.city, selected.state].filter(Boolean).join(', ')}</div></div>
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {([
                  ['Address', fullAddr(selected) || '—'],
                  ['Phone', selected.phone || '—'],
                  ['Email', selected.email || '—'],
                  ['Latest appt', loading ? 'loading…' : latest ? `${latest.status}${latest.appointmentDate ? ' · ' + new Date(latest.appointmentDate).toLocaleDateString() : ''}` : 'none'],
                  ['Quote', latest ? money(latest.totalAmount) : '—'],
                  ['Project', latest?.projectType || '—'],
                  ['Total appts', String(selected._count?.appointments ?? appts.length)],
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}><td style={{ ...muted, padding: '7px 0', width: '40%', borderTop: '1px solid var(--border)' }}>{k}</td><td style={{ padding: '7px 0', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {tel && <a style={{ ...actBtn, background: 'var(--accent)', color: '#fff', border: 'none' }} href={`tel:${tel}`}>Call</a>}
              {tel && <a style={actBtn} href={`sms:${tel}`}>Text</a>}
              {selected.email && <a style={actBtn} href={`mailto:${selected.email}`}>Email</a>}
              <a style={actBtn} href={`https://www.google.com/maps/place/${encodeURIComponent(fullAddr(selected))}`} target="_blank" rel="noopener">Map</a>
              {latest && <Link style={actBtn} to={`/appointments/${latest.id}`}>Open appt</Link>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
