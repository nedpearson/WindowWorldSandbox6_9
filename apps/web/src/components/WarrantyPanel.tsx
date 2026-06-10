import { useState } from 'react';
import { WARRANTY_SUMMARY, REFERENCE_DOCUMENTS } from '../config/referenceDocuments';

interface Props {
  appointmentId: string;
  glassBreakageSelected?: boolean;
  onAcknowledge?: (key: string, value: boolean) => void;
  acknowledgments?: Record<string, boolean>;
}

export function WarrantyPanel({ appointmentId, glassBreakageSelected, onAcknowledge, acknowledgments = {} }: Props) {
  const [expanded, setExpanded] = useState(false);
  const w = WARRANTY_SUMMARY;

  const openDocument = (key: string) => {
    window.open(`/api/documents/view/${key}?token=${localStorage.getItem('wwa_token') || ''}`, '_blank');
  };

  return (
    <div className="card" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🛡️ {w.title}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          {/* Coverage table */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Coverage Summary</h4>
            {w.coverageAreas.map(area => (
              <div key={area.area} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
              }}>
                <div>
                  <strong>{area.area}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{area.details}</span>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: '0.75rem',
                  color: area.coverage.includes('if selected') 
                    ? (glassBreakageSelected ? '#22c55e' : '#f59e0b')
                    : '#22c55e',
                  background: area.coverage.includes('if selected')
                    ? (glassBreakageSelected ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)')
                    : 'rgba(34,197,94,0.1)',
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {area.coverage.includes('if selected')
                    ? (glassBreakageSelected ? '✅ Selected' : '⚠ Not Selected')
                    : area.coverage}
                </span>
              </div>
            ))}
          </div>

          {/* Coverage begins */}
          <div style={{
            padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.08)',
            borderRadius: 6, fontSize: '0.8125rem', marginBottom: '1rem',
          }}>
            <strong>Coverage Begins:</strong> {w.coverageBegins}
          </div>

          {/* Important exclusions */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8125rem', color: '#f59e0b', marginBottom: '0.375rem' }}>⚠ Important Exclusions</h4>
            <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', margin: 0 }}>
              {w.importantExclusions.map((exc, i) => (
                <li key={i} style={{ marginBottom: '0.125rem' }}>{exc}</li>
              ))}
            </ul>
          </div>

          {/* Document buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => openDocument('lifetime_warranty')}>
              📄 View Lifetime Warranty PDF
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => openDocument('window_warranty')}>
              📄 View Product Warranty PDF
            </button>
          </div>

          {/* Acknowledgment checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="checkbox"
                checked={acknowledgments['warranty_reviewed'] || false}
                onChange={e => onAcknowledge?.('warranty_reviewed', e.target.checked)}
              />
              Warranty reviewed with customer
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="checkbox"
                checked={acknowledgments['warranty_in_packet'] || false}
                onChange={e => onAcknowledge?.('warranty_in_packet', e.target.checked)}
              />
              Include warranty PDF in customer packet
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
