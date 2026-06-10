import { useState, useEffect, useRef } from 'react';
import { getOfflineDb } from '../lib/offlineDb';
import { api } from '../utils/api';

// ── Safe currency formatter — guards against undefined/null/NaN ───────────────
const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

function AiQuickAdd({ appointmentId, onComplete }: { appointmentId: string; onComplete: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await api.parseLineItems({ appointmentId, text });
      setText('');
      onComplete(); // Recalculate
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {loading && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: '2px', background: 'var(--accent)',
            animation: 'loadingBar 1s infinite linear', width: '30%'
          }} />
        )}
        <style>{`@keyframes loadingBar { 0% { left: -30%; } 100% { left: 100%; } }`}</style>
        <span style={{ padding: '0 0.75rem', fontSize: '1.25rem' }}>✨</span>
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='AI Quick Add (e.g. "2 window removals and 50 ft j-channel")'
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.75rem 0', fontSize: '0.875rem' }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !text.trim()}
          style={{
            background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6,
            padding: '0.5rem 1rem', margin: '0.25rem', fontWeight: 600, cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !text.trim() ? 0.5 : 1
          }}
        >
          Add
        </button>
      </div>
    </form>
  );
}

export function PricingReview({ appointment, onRecalculate, onSave, onAddProjectItem, onOpeningClick, highlightOpeningNumber }: { appointment: any; onRecalculate: () => void; onSave: (u: any) => void; onAddProjectItem?: (type: string) => void; onOpeningClick?: (opening: any, field?: string) => void; highlightOpeningNumber?: number }) {
  const [a, setA] = useState(appointment);
  const [recalcing, setRecalcing] = useState(false);
  const [staleCacheWarning, setStaleCacheWarning] = useState(false);

  // Sync local state when parent re-renders with fresh appointment data
  useEffect(() => { setA(appointment); }, [appointment]);

  // Auto-scroll to highlighted opening when highlightOpeningNumber changes
  useEffect(() => {
    if (highlightOpeningNumber != null) {
      const el = document.getElementById(`pricing-opening-${highlightOpeningNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightOpeningNumber]);

  // Check pricing cache staleness
  useEffect(() => {
    getOfflineDb().pricing_cache.where('cacheType').equals('pricing_version').first().then(entry => {
      if (entry) {
        const isStale = (Date.now() - entry.fetchedAt) > 24 * 60 * 60 * 1000;
        setStaleCacheWarning(isStale);
      }
    }).catch(err => console.warn('Failed to check pricing cache age', err));
  }, []);

  const upd = (f: string, v: number | null) => { const n = { ...a, [f]: v }; setA(n); };
  const save = () => onSave({ 
    discount: a.discount ?? null, 
    depositAmount: a.depositAmount ?? null, 
    financingAmount: a.financingAmount ?? null,
    qa2Price1: a.qa2Price1 ?? null,
    qa2Price2: a.qa2Price2 ?? null,
    qa2Price3: a.qa2Price3 ?? null,
    qa2CommissionOverride: a.qa2CommissionOverride ?? null,
    qa2BonusAmount: a.qa2BonusAmount ?? null
  });
  const handleRecalculate = async () => {
    setRecalcing(true);
    try { await Promise.resolve(onRecalculate()); } finally { setRecalcing(false); }
  };

  const openingsTotal = (appointment.openings || []).reduce((s: number, o: any) => s + (Number(o.totalPrice) || 0), 0);
  const manualLineItemsTotal = (appointment.lineItems || []).filter((li: any) => !['product', 'option', 'labor'].includes(li.category)).reduce((s: number, li: any) => s + (Number(li.totalPrice) || 0), 0);
  const isDataMissing = (appointment.openings || []).length === 0;
  const subtotal = isDataMissing ? (Number(appointment.subtotal) || Number(appointment.totalAmount) || 0) : openingsTotal + manualLineItemsTotal;
  const discounted = subtotal - (Number(a.discount) || 0);
  // No tax — Window World does not charge sales tax
  // Admin fee is calculated server side and on final contract only, do not show in field UI
  const total = isDataMissing ? (Number(appointment.totalAmount) || 0) : discounted;
  const balance = total - (Number(a.depositAmount) || 0);

  const hasUnpricedOpenings = (appointment.openings || []).length > 0 && openingsTotal === 0;

  return (
    <div>
      {/* Stale Cache Warning */}
      {staleCacheWarning && (
        <div style={{
          background: '#fdecec', border: '1px solid #a32d2d',
          borderRadius: 12, padding: '1rem', marginBottom: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#a32d2d' }}>⚠ Offline Pricing is Stale</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Pricing cache is older than 24 hours. Draft quote requires cloud verification before final contract.</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a32d2d', padding: '4px 8px', background: 'rgba(163,45,45,0.08)', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
            Status: DRAFT OFFLINE
          </div>
        </div>
      )}

      {/* Unpriced windows banner */}
      {hasUnpricedOpenings && (
        <div style={{
          background: 'var(--amberbg)', border: '1px solid var(--amber)',
          borderRadius: 12, padding: '1rem', marginBottom: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--amber)' }}>⚠ Windows need pricing</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>You have {appointment.openings.length} window{appointment.openings.length !== 1 ? 's' : ''} with no price yet. Tap Calculate to get prices.</div>
          <button
            onClick={handleRecalculate}
            disabled={recalcing}
            style={{
              padding: '0.75rem', background: 'var(--amber)', color: 'white',
              border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {recalcing ? '⏳ Calculating…' : '💰 Calculate Prices'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>💰 Review Price</h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleRecalculate}
          disabled={recalcing}
        >
          {recalcing ? '⏳' : '🔄'} Recalculate
        </button>
      </div>

      <AiQuickAdd appointmentId={appointment.id} onComplete={handleRecalculate} />

      {/* ── Project Type Selection Cards ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Add to Project</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <button 
            onClick={() => onAddProjectItem?.('window')}
            style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem' }}>🪟</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Windows</span>
          </button>
          <button 
            onClick={() => onAddProjectItem?.('patio_door')}
            style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem' }}>🚪</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Doors</span>
          </button>
          <button 
            onClick={() => onAddProjectItem?.('siding')}
            style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem' }}>🏠</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Siding</span>
          </button>
          <button 
            onClick={() => onAddProjectItem?.('other')}
            style={{ padding: '0.75rem 0.5rem', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem' }}>➕</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)' }}>Other</span>
          </button>
        </div>
      </div>

      {/* Opening summary */}
      {(appointment.openings || []).length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Project Openings</h3>
          {(appointment.openings || []).map((o: any) => {
            const openingLineItems = (appointment.lineItems || []).filter((li: any) => li.openingNumber === o.openingNumber);
            return (
              <div key={o.id} id={`pricing-opening-${o.openingNumber}`} data-opening-number={o.openingNumber} onClick={() => onOpeningClick?.(o)} style={{
                padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8125rem',
                cursor: onOpeningClick ? 'pointer' : undefined,
                ...(o.openingNumber === highlightOpeningNumber ? {
                  border: '2px solid var(--blue)',
                  boxShadow: '0 0 12px rgba(59,130,246,0.4)',
                  borderRadius: 8,
                  transition: 'all 0.3s',
                } : {}),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>#{o.openingNumber}</span>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{o.roomLocation || (o.productType === 'siding' ? 'Siding Project' : 'No room')}</span>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {o.productType === 'siding' ? o.sidingMaterial?.replace(/_/g, ' ') || 'Siding' : (o.productCategory === 'special_shape' && o.shapeType ? `Shape: ${o.shapeType.replace(/_/g, ' ')}` : o.productCategory?.replace(/_/g, ' '))}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: Number(o.totalPrice) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {Number(o.totalPrice) > 0 ? fmt(o.totalPrice) : '—'}
                  </span>
                </div>
                
                {/* Breakdown of charges */}
                {openingLineItems.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                    {openingLineItems.map((li: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        <span>{li.label.replace(`#${o.openingNumber} `, '')}</span>
                        <span>{fmt(li.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.625rem', fontWeight: 700 }}>
            <span>Subtotal</span><span>{fmt(openingsTotal)}</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Quote Total</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {manualLineItemsTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
              <span>Additional Line Items</span><span>{fmt(manualLineItemsTotal)}</span>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <PriceField
              label="Discount"
              value={a.discount ?? null}
              onChange={v => upd('discount', v)}
              onBlur={save}
            />
          </div>
          <hr style={{ border: 'none', borderTop: '2px solid var(--accent)', margin: '0.25rem 0', gridColumn: '1 / -1' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.375rem', fontWeight: 800, gridColumn: '1 / -1' }}>
            <span>Total</span><span style={{ color: 'var(--success)' }}>{fmt(total)}</span>
          </div>
          <PriceField
            label="Deposit"
            value={a.depositAmount ?? null}
            onChange={v => upd('depositAmount', v)}
            onBlur={save}
          />
          <PriceField
            label="Financing"
            value={a.financingAmount ?? null}
            onChange={v => upd('financingAmount', v)}
            onBlur={save}
          />
          <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '0.25rem 0', gridColumn: '1 / -1' }} />
          <h4 style={{ margin: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>QA 2 / Manager Overrides</h4>
          <PriceField
            label="QA 2 Price 1"
            value={a.qa2Price1 ?? null}
            onChange={v => upd('qa2Price1', v)}
            onBlur={save}
          />
          <PriceField
            label="QA 2 Price 2"
            value={a.qa2Price2 ?? null}
            onChange={v => upd('qa2Price2', v)}
            onBlur={save}
          />
          <PriceField
            label="QA 2 Price 3"
            value={a.qa2Price3 ?? null}
            onChange={v => upd('qa2Price3', v)}
            onBlur={save}
          />
          <PriceField
            label="Commission Override"
            value={a.qa2CommissionOverride ?? null}
            onChange={v => upd('qa2CommissionOverride', v)}
            onBlur={save}
          />
          <PriceField
            label="Bonus Amount"
            value={a.qa2BonusAmount ?? null}
            onChange={v => upd('qa2BonusAmount', v)}
            onBlur={save}
          />
          <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '0.25rem 0', gridColumn: '1 / -1' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, gridColumn: '1 / -1' }}>
            <span>Balance Due</span><span style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>{fmt(balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Safe currency price input ──────────────────────────────────────────────────
// - Keeps raw string while editing so the field is always controlled (no flicker).
// - Converts to number|null on blur; propagates null for blank, not 0.
// - Never sends NaN into React state, API payloads, or pricing calculations.
// - Full width on mobile with min-width:0 to prevent horizontal overflow.
// - Uses inputMode='decimal' so mobile shows the numeric keyboard with decimal point.
interface PriceFieldProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onBlur: () => void;
  error?: string;
}
function PriceField({ label, value, onChange, onBlur, error }: PriceFieldProps) {
  // Raw string tracks what the user is typing — keeps the input truly controlled.
  const [raw, setRaw] = useState<string>(() =>
    value != null && !Number.isNaN(value) ? String(value) : ''
  );

  // Sync down when parent resets the value (e.g. after save / recalculate)
  useEffect(() => {
    setRaw(value != null && !Number.isNaN(value) ? String(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip currency symbols and commas; allow digits, dot, leading minus
    const cleaned = e.target.value.replace(/[^0-9.\-]/g, '');
    setRaw(cleaned);
    if (cleaned === '' || cleaned === '-') {
      onChange(null); // blank = no value, not 0
    } else {
      const num = parseFloat(cleaned);
      if (!Number.isNaN(num)) onChange(num);
      // If still NaN (e.g. '..'), don't update parent — keep last valid value
    }
  };

  const handleBlur = () => {
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      // Normalize: trim trailing dot, standardise the display string
      setRaw(String(num));
      onChange(num);
    } else {
      setRaw('');
      onChange(null);
    }
    onBlur();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      width: '100%',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        <label style={{ fontWeight: 600, fontSize: '0.9375rem', flexShrink: 0 }}>{label}</label>
      <input
        className="form-input"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        style={{
          width: '100%',
          flex: '1 1 160px',
          minWidth: 0,
          boxSizing: 'border-box',
          textAlign: 'right',
          borderColor: error ? '#a32d2d' : undefined,
        }}
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={(e) => {
          // Scroll the input into view above the virtual keyboard on iOS/Android.
          // 'nearest' avoids jumping if already fully visible.
          setTimeout(() => e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120);
        }}
      />
      </div>
      {error && (
        <div style={{ fontSize: '0.75rem', color: '#a32d2d', marginTop: '0.125rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
