import React, { useState } from 'react';
import { api } from '../utils/api';

/**
 * SpecialShapeTrimCard
 *
 * Shown inside the opening editor whenever the opening is a radius/arch
 * special shape that requires trim per BTR guidelines (p60).
 *
 * Rules enforced:
 *   Rule A — Special Shape Trim Required
 *   - Radius shapes: circle top, eyebrow, arch-top, half-round, quarter-arch, etc.
 *   - Polygon shapes (octagon, hexagon, etc.) do NOT show this card.
 *
 * The card:
 *   - Shows what trim is required
 *   - Shows whether it has been selected/priced
 *   - Allows the rep to confirm or ask for manager review
 *   - Saves immediately to backend on action
 */

interface Props {
  opening: any;
  appointmentId: string;
  onUpdate: (updated: Partial<any>) => void;
}

export function SpecialShapeTrimCard({ opening, appointmentId, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelected  = !!opening.specialShapeTrimSelected;
  const hasPrice    = typeof opening.specialShapeTrimPrice === 'number' && opening.specialShapeTrimPrice > 0;
  const missingPrice = !hasPrice;

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const existing = opening.installerNotes || '';
      await api.updateOpening(opening.id, {
        specialShapeTrimSelected: true,
        installerNotes: [
          existing,
          'SPECIAL SHAPE TRIM REQUIRED — included in quote.',
        ].filter(Boolean).join(' | '),
      });
      onUpdate({ specialShapeTrimSelected: true });
    } catch {
      setError('Save failed. Retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: 10,
      padding: '0.875rem 1rem',
      marginTop: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ef4444' }}>
          Special Shape Trim Required
        </span>
        {isSelected && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
            Confirmed
          </span>
        )}
      </div>

      {/* Message */}
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        This opening is a radius/arch shape. Per BTR guidelines (p60), special shape trim is required
        and must appear in pricing, proposal, order form, and installer notes.
      </p>

      {/* Price status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={missingPrice ? '#f97316' : '#22c55e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {missingPrice
            ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            : <><polyline points="20 6 9 17 4 12"/></>
          }
        </svg>
        <span style={{ color: missingPrice ? '#f97316' : 'var(--text-secondary)' }}>
          {missingPrice
            ? 'Price not set — add special shape trim price in Admin or contact your manager'
            : `Trim price: $${opening.specialShapeTrimPrice!.toFixed(2)}`
          }
        </span>
      </div>

      {/* Photo tips */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 6,
        padding: '0.5rem 0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Photo tips:</strong>{' '}
        Straight-on exterior shot showing the shape opening, close-up of existing trim/surround, any depth or return detail relevant to trim installation.
      </div>

      {/* Error */}
      {error && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444' }}>{error}</p>
      )}

      {/* Actions */}
      {!isSelected && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <button
            id={`special-shape-trim-confirm-${opening.id}`}
            onClick={handleConfirm}
            disabled={saving}
            style={{
              padding: '0.375rem 0.875rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Confirm Trim Required'}
          </button>
        </div>
      )}
    </div>
  );
}
