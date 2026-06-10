// ═══════════════════════════════════════════════════════════════
// WindowSuggestionReview
// Shows numbered window suggestions (W1, W2, W3...).
// Every suggestion is clearly labeled "Suggested — verify on site."
// Supports Verify / Edit / Remove / Add Missing.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';

export interface WindowSuggestion {
  id: string;
  label: string;
  elevation: string;
  suggestedType: string;
  confidence: number;
  sourceType: string;
  sourceRef: string;
  status: 'suggested' | 'verified' | 'removed' | 'manual';
  notes?: string;
  limitations?: string[];
}

interface WindowSuggestionReviewProps {
  suggestions: WindowSuggestion[];
  aiUsed: boolean;
  fallbackUsed: boolean;
  limitations: string[];
  onVerify: (id: string) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onEditType: (id: string, newType: string) => void;
  onEditElevation: (id: string, elevation: string) => void;
  onAddManual: (elevation: string, type: string, notes: string) => void;
  isLoading?: boolean;
}

const WINDOW_TYPES = [
  'double_hung', 'casement', 'awning', 'slider', 'bay', 'picture',
  'fixed', 'front_door', 'sliding_glass_door', 'unknown'
];
const ELEVATIONS = ['1st_story', '2nd_story', 'unknown'];

function confidenceColor(c: number): string {
  return c >= 0.75 ? '#22c55e' : c >= 0.5 ? '#f59e0b' : '#ef4444';
}
function confidenceLabel(c: number): string {
  return c >= 0.75 ? 'High' : c >= 0.5 ? 'Medium' : 'Low';
}
function typeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function elevLabel(e: string): string {
  return e.replace(/\b\w/g, c => c.toUpperCase());
}

export function WindowSuggestionReview({
  suggestions, aiUsed, fallbackUsed, limitations,
  onVerify, onRemove, onRestore, onEditType, onEditElevation, onAddManual,
  isLoading = false,
}: WindowSuggestionReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newElev, setNewElev] = useState('1st_story');
  const [newType, setNewType] = useState('double_hung');
  const [newNotes, setNewNotes] = useState('');
  const [activeElev, setActiveElev] = useState<string>('all');

  const elevations = ['all', ...Array.from(new Set(suggestions.map(s => s.elevation).filter(Boolean)))];
  const filtered = activeElev === 'all' ? suggestions : suggestions.filter(s => s.elevation === activeElev);
  const active = filtered.filter(s => s.status !== 'removed');
  const removed = filtered.filter(s => s.status === 'removed');

  const verifiedCount = suggestions.filter(s => s.status === 'verified' || s.status === 'manual').length;
  const suggestedCount = suggestions.filter(s => s.status === 'suggested').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Source / AI disclaimer banner */}
      <div style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--amber)', background: 'var(--amberbg)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '0.25rem' }}>
          {aiUsed && !fallbackUsed ? '🤖 AI Window Analysis' : fallbackUsed ? '📊 Statistical Estimate' : '📊 Estimate'}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {fallbackUsed
            ? 'No real imagery was analyzed. These are statistical estimates based on typical single-family homes. Verify every opening on site.'
            : 'Suggestions are based on Mapbox property map data. Confidence reflects estimate quality. Verify every opening on site before quoting.'}
        </div>
        {limitations.length > 0 && (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem', fontSize: '0.68rem', color: 'var(--muted)' }}>
            {limitations.map((l, i) => <li key={i} style={{ marginBottom: '0.15rem' }}>{l}</li>)}
          </ul>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatChip label="Total" value={suggestions.filter(s => s.status !== 'removed').length} />
        <StatChip label="Verified" value={verifiedCount} color="var(--ok)" />
        <StatChip label="Pending" value={suggestedCount} color="var(--amber)" />
        <StatChip label="Removed" value={removed.length} color="#a32d2d" />
      </div>

      {/* Elevation filter tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
        {elevations.map(e => (
          <button key={e} onClick={() => setActiveElev(e)} style={{
            padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
            background: activeElev === e ? 'var(--blue)' : 'var(--bg)',
            color: activeElev === e ? '#fff' : 'var(--muted)',
            border: activeElev === e ? 'none' : '1px solid var(--border)',
          }}>
            {e === 'all' ? 'All Elevations' : `${elevLabel(e)} (${suggestions.filter(s => s.elevation === e && s.status !== 'removed').length})`}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'mapSpin 1s linear infinite', margin: '0 auto 0.75rem' }} />
          Analyzing property imagery...
        </div>
      )}

      {/* Suggestion cards */}
      {!isLoading && active.map(s => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          editing={editingId === s.id}
          onVerify={() => onVerify(s.id)}
          onRemove={() => onRemove(s.id)}
          onEditStart={() => setEditingId(s.id)}
          onEditCancel={() => setEditingId(null)}
          onEditType={(t) => { onEditType(s.id, t); setEditingId(null); }}
          onEditElev={(e) => { onEditElevation(s.id, e); setEditingId(null); }}
        />
      ))}

      {!isLoading && active.length === 0 && !showAddForm && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
          No active suggestions for this elevation.
        </div>
      )}

      {/* Removed items (collapsed) */}
      {removed.length > 0 && (
        <details style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.4rem' }}>{removed.length} removed window(s) — click to show</summary>
          {removed.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', borderRadius: '6px', background: '#fdecec', border: '1px solid #a32d2d', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--muted)' }}>{s.label}</span>
              <span style={{ color: 'var(--muted)' }}>{typeLabel(s.suggestedType)} · {elevLabel(s.elevation)}</span>
              <button onClick={() => onRestore(s.id)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.68rem', cursor: 'pointer' }}>↩ Restore</button>
            </div>
          ))}
        </details>
      )}

      {/* Add manual window */}
      {!isLoading && (
        <div>
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
              + Add Missing Window
            </button>
          ) : (
            <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Add Missing Window</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Elevation</label>
                  <select value={newElev} onChange={e => setNewElev(e.target.value)} style={selectStyle}>
                    {ELEVATIONS.map(e => <option key={e} value={e}>{elevLabel(e)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} style={selectStyle}>
                    {WINDOW_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
              </div>
              <input
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                style={{ ...selectStyle, width: '100%', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { onAddManual(newElev, newType, newNotes); setShowAddForm(false); setNewNotes(''); }} style={saveBtnStyle}>
                  Save Window
                </button>
                <button onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Suggestion Card ──────────────────────────────────────────

function SuggestionCard({ suggestion: s, editing, onVerify, onRemove, onEditStart, onEditCancel, onEditType, onEditElev }: {
  suggestion: WindowSuggestion;
  editing: boolean;
  onVerify: () => void;
  onRemove: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditType: (t: string) => void;
  onEditElev: (e: string) => void;
}) {
  const [editType, setEditType] = useState(s.suggestedType);
  const [editElev, setEditElev] = useState(s.elevation);
  const confC = confidenceColor(s.confidence);
  const isVerified = s.status === 'verified' || s.status === 'manual';

  return (
    <div style={{
      padding: '0.625rem 0.75rem', borderRadius: '8px',
      border: `1px solid ${isVerified ? 'var(--ok)' : 'var(--border)'}`,
      background: isVerified ? 'rgba(25,135,84,0.06)' : 'var(--card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {/* Label badge */}
        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', minWidth: '2.5rem' }}>{s.label}</span>
        {isVerified && <span style={{ fontSize: '0.65rem', background: 'rgba(25,135,84,0.12)', color: 'var(--ok)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED</span>}
        {s.status === 'manual' && <span style={{ fontSize: '0.65rem', background: 'var(--infobg)', color: 'var(--blue)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>MANUAL</span>}
        <span style={{ fontSize: '0.65rem', background: `${confC}15`, color: confC, padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
          {confidenceLabel(s.confidence)}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto' }}>{elevLabel(s.elevation)} · {s.sourceType?.replace(/_/g, ' ')}</span>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <select value={editType} onChange={e => setEditType(e.target.value)} style={selectStyle}>
            {WINDOW_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
          <select value={editElev} onChange={e => setEditElev(e.target.value)} style={selectStyle}>
            {ELEVATIONS.map(e => <option key={e} value={e}>{elevLabel(e)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => { onEditType(editType); onEditElev(editElev); }} style={saveBtnStyle}>Save</button>
            <button onClick={onEditCancel} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{typeLabel(s.suggestedType)}</div>
          {s.notes && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{s.notes}</div>}
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {!isVerified && (
              <button onClick={onVerify} style={{ ...actionBtnStyle, background: 'rgba(25,135,84,0.08)', color: 'var(--ok)', borderColor: 'rgba(25,135,84,0.2)' }}>
                ✓ Verify
              </button>
            )}
            {isVerified && (
              <button onClick={onVerify} style={{ ...actionBtnStyle, background: 'rgba(25,135,84,0.04)', color: 'var(--ok)', borderColor: 'transparent', cursor: 'default' }} disabled>
                ✓ Verified
              </button>
            )}
            <button onClick={onEditStart} style={actionBtnStyle}>✎ Edit</button>
            <button onClick={onRemove} style={{ ...actionBtnStyle, background: '#fdecec', color: '#a32d2d', borderColor: '#fdecec' }}>
              ✕ Remove
            </button>
          </div>
          <div style={{ fontSize: '0.63rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
            Planning estimate — verify on site before final quote.
          </div>
        </>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.72rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.25rem', textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.78rem' };
const saveBtnStyle: React.CSSProperties = { flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' };
const cancelBtnStyle: React.CSSProperties = { padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer' };
const actionBtnStyle: React.CSSProperties = { padding: '0.25rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' };
