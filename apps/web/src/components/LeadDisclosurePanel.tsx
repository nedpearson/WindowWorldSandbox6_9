import { useState } from 'react';
import { isLeadDisclosureRequired } from '../config/referenceDocuments';

interface Props {
  pre1978Status?: string;
  homeBuiltYear?: number | null;
  onStatusChange?: (status: string) => void;
  onAcknowledge?: (key: string, value: boolean) => void;
  acknowledgments?: Record<string, boolean>;
  compact?: boolean;
}

export function LeadDisclosurePanel({
  pre1978Status = 'unknown', homeBuiltYear, onStatusChange, onAcknowledge,
  acknowledgments = {}, compact = false,
}: Props) {
  const required = isLeadDisclosureRequired(homeBuiltYear, pre1978Status);
  const [expanded, setExpanded] = useState(required && !compact);

  const openDocument = () => {
    window.open(`/api/documents/view/lead_paint_disclosure?token=${localStorage.getItem('wwa_token') || ''}`, '_blank');
  };

  // Compact mode — just a status badge
  if (compact) {
    if (!required) return null;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.75rem', borderRadius: 6,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        fontSize: '0.8125rem',
      }}>
        <span>⚠️</span>
        <span style={{ fontWeight: 600, color: '#ef4444' }}>Pre-1978 Home — Lead Disclosure Required</span>
        {!acknowledgments['lead_disclosure_provided'] && (
          <span style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 700 }}>NOT PROVIDED</span>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{
      borderColor: required ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)',
      background: required ? 'rgba(239,68,68,0.03)' : 'rgba(34,197,94,0.02)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {required ? '⚠️' : '✅'} Lead-Based Paint Disclosure
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            color: required ? '#ef4444' : '#22c55e',
            background: required ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          }}>
            {required ? 'REQUIRED' : 'Not Required'}
          </span>
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          {/* Pre-1978 status selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>Was this home built before 1978?</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              {(['yes', 'no', 'unknown'] as const).map(val => (
                <button key={val}
                  className={`btn btn-sm ${pre1978Status === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onStatusChange?.(val)}
                  style={pre1978Status === val ? {
                    background: val === 'yes' ? '#ef4444' : val === 'no' ? '#22c55e' : '#f59e0b',
                    border: 'none', color: 'white',
                  } : {}}>
                  {val === 'yes' ? '🔴 Yes' : val === 'no' ? '🟢 No' : '🟡 Unknown'}
                </button>
              ))}
            </div>
          </div>

          {required && (
            <>
              {/* Warning banner */}
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 6,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ef4444', margin: 0 }}>
                  ⚠ Federal law requires disclosure of lead-based paint hazards for homes built before 1978.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem', marginBottom: 0 }}>
                  The EPA "Renovate Right" pamphlet must be provided to the homeowner before any renovation work begins.
                  This appointment cannot be exported until lead disclosure is acknowledged.
                </p>
              </div>

              {/* Document button */}
              <button className="btn btn-sm" onClick={openDocument}
                style={{ marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 600 }}>
                📄 Open Lead-Based Paint Disclosure PDF
              </button>

              {/* Acknowledgment checklist */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 6,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={acknowledgments['lead_disclosure_provided'] || false}
                    onChange={e => onAcknowledge?.('lead_disclosure_provided', e.target.checked)}
                  />
                  Lead disclosure pamphlet provided to homeowner
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={acknowledgments['lead_disclosure_reviewed'] || false}
                    onChange={e => onAcknowledge?.('lead_disclosure_reviewed', e.target.checked)}
                  />
                  Disclosure reviewed with customer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={acknowledgments['lead_disclosure_acknowledged'] || false}
                    onChange={e => onAcknowledge?.('lead_disclosure_acknowledged', e.target.checked)}
                  />
                  Customer acknowledged lead paint disclosure
                </label>
              </div>
            </>
          )}

          {!required && (
            <p style={{ fontSize: '0.8125rem', color: '#22c55e' }}>
              ✅ This home was built after 1978 — lead-based paint disclosure is not required.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
