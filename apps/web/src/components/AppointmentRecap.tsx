import { useState } from 'react';
import { QuoteHealth } from '../utils/quoteHealth';
import { AppointmentTimeline } from './AppointmentTimeline';

export function AppointmentRecap({
  appointment,
  openings,
  health,
  onSignoff,
}: {
  appointment: any;
  openings: any[];
  health: QuoteHealth;
  onSignoff: () => void;
}) {
  const [signature, setSignature] = useState('');

  const validOpenings = openings.filter(o => o.qty > 0 || o.model);
  const isHealthy = health.score >= 85 && health.missingBlockers === 0;

  return (
    <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
      <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem', background: 'var(--bg-primary)' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Job Recap: {appointment.customerName}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {appointment.address}, {appointment.city} {appointment.state} {appointment.zip}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Items</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{validOpenings.length}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Price</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              ${(appointment.totalAmount || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Health Score</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isHealthy ? 'var(--success)' : 'var(--danger)' }}>
              {health.score}/100
            </div>
          </div>
        </div>

        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Product Breakdown</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {appointment.lineItems && appointment.lineItems.length > 0 ? (
            // New Itemized Breakdown
            appointment.lineItems.map((li: any, idx: number) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{li.label}</span>
                  {li.category && <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', padding: '0.125rem 0.375rem', background: 'var(--bg-secondary)', borderRadius: 4, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{li.category}</span>}
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${(li.totalPrice || 0).toFixed(2)}</span>
              </li>
            ))
          ) : (
            // Legacy Fallback Breakdown
            Array.from(new Set(validOpenings.map(o => o.model || o.productCategory))).map(model => (
              <li key={model} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>{model}</span>
                <span>{validOpenings.filter(o => (o.model || o.productCategory) === model).reduce((sum, o) => sum + (Number(o.qty) || 1), 0)} units</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem', background: 'var(--bg-secondary)' }}>
        <h3 style={{ marginBottom: '1rem' }}>Customer Signoff</h3>
        {!isHealthy ? (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontWeight: 600 }}>
            ⚠️ Cannot sign off until all critical missing fields are resolved.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              By signing below, the customer acknowledges that all measurements, grid patterns, glass options, and product choices have been reviewed and approved.
            </p>
            <div style={{ background: '#fff', border: '2px dashed var(--border)', height: 120, borderRadius: 'var(--radius)', position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Type customer name to sign..."
                value={signature}
                onChange={e => setSignature(e.target.value)}
                style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', width: 'calc(100% - 2rem)', border: 'none', borderBottom: '1px solid #000', background: 'transparent', fontSize: '1.25rem', fontFamily: 'cursive', outline: 'none' }}
              />
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}
              disabled={!signature || signature.length < 3}
              onClick={onSignoff}
            >
              Confirm & Lock Order
            </button>
          </div>
        )}
      </div>

      <AppointmentTimeline appointmentId={appointment.id} />
    </div>
  );
}
