// ═══════════════════════════════════════════════════════════
// Customer Conversation Mode
// Simplifies the UI when presenting to homeowners.
// Hides internal complexity, emphasizes proposals,
// financing, and visual comparisons.
// ═══════════════════════════════════════════════════════════

import { useState, createContext, useContext } from 'react';

// ── Context ──────────────────────────────────────────────
interface CustomerModeCtx {
  enabled: boolean;
  toggle: () => void;
}

const CustomerModeContext = createContext<CustomerModeCtx>({ enabled: false, toggle: () => {} });

export function useCustomerMode() {
  return useContext(CustomerModeContext);
}

export function CustomerModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <CustomerModeContext.Provider value={{ enabled, toggle: () => setEnabled(e => !e) }}>
      {children}
    </CustomerModeContext.Provider>
  );
}

// ── Toggle Button ────────────────────────────────────────
export function CustomerModeToggle() {
  const { enabled, toggle } = useCustomerMode();

  return (
    <button onClick={toggle} title={enabled ? 'Switch to Rep Mode' : 'Switch to Customer Mode'}
      style={{
        padding: '4px 10px', borderRadius: 9999, border: 'none', cursor: 'pointer',
        background: enabled
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'rgba(255,255,255,0.06)',
        color: enabled ? '#fff' : 'var(--text-muted)',
        fontSize: '0.6875rem', fontWeight: 700,
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
      {enabled ? '🏠 Customer View' : '👤 Customer Mode'}
    </button>
  );
}

// ── Customer-facing tab filter ───────────────────────────
// Only show tabs relevant to the homeowner conversation
export const CUSTOMER_TABS = [
  { icon: '🏠', label: 'Your Home', repStep: 0 },   // maps to Customer step
  { icon: '🪟', label: 'Windows', repStep: 2 },      // maps to Review step (Windows & Price)
  { icon: '💰', label: 'Investment', repStep: 2 },    // maps to Review step (Pricing)
  { icon: '📄', label: 'Proposal', repStep: 2 },      // maps to Review step
  { icon: '💳', label: 'Financing', repStep: 2 },     // maps to Review step (finance panel)
  { icon: '✍️', label: 'Agreement', repStep: 3 },     // maps to Workbook step
];

// ── Customer-facing Project Summary ──────────────────────
export function CustomerProjectSummary({
  appointment, total,
}: {
  appointment: any;
  total: number;
}) {
  const openings = appointment.openings || [];
  const rooms = new Set(openings.map((o: any) => o.roomLocation).filter(Boolean));
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))',
      border: '1px solid rgba(99,102,241,0.15)',
      borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Your Window Replacement Project
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
        {appointment.jobAddress || 'Your Home'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={summaryCard}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1' }}>{openings.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Windows</div>
        </div>
        <div style={summaryCard}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{rooms.size}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Rooms</div>
        </div>
        <div style={summaryCard}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>{fmt(total)}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Investment</div>
        </div>
      </div>
    </div>
  );
}

// ── Customer-facing Window Summary ───────────────────────
export function CustomerWindowList({ openings }: { openings: any[] }) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Group by room
  const roomMap = new Map<string, any[]>();
  for (const o of openings) {
    const room = o.roomLocation || 'Other Areas';
    if (!roomMap.has(room)) roomMap.set(room, []);
    roomMap.get(room)!.push(o);
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Your New Windows</h2>
      {Array.from(roomMap.entries()).map(([room, ops]) => (
        <div key={room} style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.5rem' }}>
            {room}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {ops.map((o: any) => (
              <div key={o.id} style={{
                padding: '1rem', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {formatProductName(o.productCategory)}
                  </span>
                  <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.875rem' }}>
                    {fmt(o.totalPrice || 0)}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {o.width && o.height ? `${Math.round(o.width)}" × ${Math.round(o.height)}"` : ''}
                  {o.interiorColor ? ` · ${o.interiorColor}` : ''}
                  {o.gridStyle && o.gridStyle !== 'None' ? ` · ${o.gridStyle} grids` : ''}
                </div>
                {/* Feature highlights — friendly language */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {o.glassPackage && o.glassPackage !== 'Clear' && (
                    <span style={featureChip}>☀️ Energy Efficient</span>
                  )}
                  {o.argon && <span style={featureChip}>🌡️ Argon Gas</span>}
                  {o.foamEnhanced && <span style={featureChip}>🔇 Noise Reducing</span>}
                  {o.temperedGlass === 'full' && <span style={featureChip}>🛡️ Safety Glass</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Customer Financing Display ───────────────────────────
export function CustomerFinancingDisplay({
  total, selectedPlan, onSelect,
}: {
  total: number;
  selectedPlan?: string;
  onSelect: (plan: string) => void;
}) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const plans = [
    { id: 'cash', label: 'Pay in Full', monthly: 0, term: '', savings: total * 0.05, note: 'Save 5% with full payment' },
    { id: '12mo', label: '12 Months', monthly: total / 12, term: '12 months', savings: 0, note: 'Same as cash — 0% interest' },
    { id: '60mo', label: '60 Months', monthly: total * 0.0199, term: '60 months', savings: 0, note: 'Low monthly payment' },
    { id: '120mo', label: '120 Months', monthly: total * 0.0129, term: '120 months', savings: 0, note: 'Lowest payment option' },
  ];

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Payment Options</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {plans.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)} style={{
            padding: '1.25rem', borderRadius: 14, cursor: 'pointer',
            border: selectedPlan === p.id ? '2px solid #6366f1' : '1px solid var(--border)',
            background: selectedPlan === p.id
              ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06))'
              : 'var(--bg-card)',
            textAlign: 'left', transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.375rem' }}>{p.label}</div>
            {p.monthly > 0 ? (
              <>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>
                  {fmt(p.monthly)}<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/mo</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{p.note}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e' }}>
                  {fmt(total - p.savings)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginTop: '0.25rem' }}>
                  Save {fmt(p.savings)}!
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────
function formatProductName(cat: string): string {
  const names: Record<string, string> = {
    double_hung: 'Double Hung Window',
    slider: 'Sliding Window',
    picture: 'Picture Window',
    casement: 'Casement Window',
    awning: 'Awning Window',
    patio_door: 'Patio Door',
    eyebrow: 'Eyebrow Window',
    circle_top: 'Circle Top Window',
    quarter_arch: 'Quarter Arch Window',
    custom_shape: 'Custom Shape',
  };
  return names[cat] || cat?.replace(/_/g, ' ') || 'Window';
}

const summaryCard: React.CSSProperties = {
  padding: '1rem', borderRadius: 12, textAlign: 'center',
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
};

const featureChip: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 9999,
  background: 'rgba(99,102,241,0.08)', color: '#a5b4fc',
  fontSize: '0.6875rem', fontWeight: 600,
};
