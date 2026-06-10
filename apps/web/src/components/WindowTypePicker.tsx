import React, { useState } from 'react';
import { RealisticWindowTypeIcon } from './RealisticWindowTypeIcons';
import type { WindowType } from '../utils/sketchSync';

export const WINDOW_TYPES: { value: WindowType; label: string; helper: string }[] = [
  { value: 'double_hung', label: 'Double Hung', helper: 'Standard two-sash' },
  { value: 'picture', label: 'Picture', helper: 'Fixed, no screen' },
  { value: 'slider', label: 'Slider', helper: 'Horizontal sliding' },
  { value: 'casement', label: 'Casement', helper: 'Side-hinged crank' },
  { value: 'awning', label: 'Awning', helper: 'Top-hinged' },
  { value: 'patio_door', label: 'Patio Door', helper: 'Sliding door' },
  { value: 'bso', label: 'BSO', helper: 'Bottom sash only' },
  { value: 'special_shape', label: 'Special Shape', helper: 'Requires shape pick' },
  { value: 'oriel', label: 'Oriel', helper: 'Unequal sashes' },
  { value: 'door_sidelight', label: 'Door Sidelight', helper: 'Tall narrow glass' },
  { value: 'other', label: 'Other', helper: 'Custom / Notes required' },
];

export function getWindowTypeGuidance(type: WindowType | null): string[] | null {
  if (!type) return null;
  switch (type) {
    case 'double_hung': return ['Verify standard width/height'];
    case 'picture': return ['Picture windows do not include screens by default'];
    case 'slider': return ['Verify orientation/handing if required'];
    case 'casement': return ['Verify handing (Left/Right hinge)'];
    case 'awning': return ['Verify hinge/crank clearances'];
    case 'bso': return ['Apply bottom-sash-only measurement rules'];
    case 'special_shape': return ['Must select specific Specialty Shape', 'Provide extended leg/radius dimensions if applicable'];
    case 'oriel': return ['Provide specific upper/lower sash drop dimensions'];
    case 'other': return ['Detailed notes required', 'Manager review recommended'];
    default: return null;
  }
}

interface WindowTypePickerProps {
  value: WindowType | null;
  onChange: (type: WindowType) => void;
  error?: boolean;
}

export function WindowTypePicker({ value, onChange, error }: WindowTypePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedType = WINDOW_TYPES.find(wt => wt.value === value) || null;
  const guidance = getWindowTypeGuidance(value);

  return (
    <div className="window-type-picker" style={{ width: '100%' }}>
      {/* Trigger Button / Preview */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem', borderRadius: '0.5rem',
          background: 'var(--card)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          cursor: 'pointer', transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {value ? (
            <div style={{ width: 48, height: 48 }}>
              <RealisticWindowTypeIcon type={value} />
            </div>
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--muted)' }}>
              ?
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: value ? 'var(--text)' : 'var(--muted)', fontSize: '1.1rem' }}>
              {selectedType ? selectedType.label : 'Select Window Type...'}
            </div>
            {selectedType && selectedType.helper && (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{selectedType.helper}</div>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem' }}>
          {value ? 'Change Type' : 'Select'}
        </div>
      </div>

      {/* Measurement Guidance Tip */}
      {guidance && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--sev-info-bg)', borderRadius: 8, borderLeft: '3px solid var(--sev-info)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sev-info)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            Type Guidance
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text)', fontSize: '0.875rem' }}>
            {guidance.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {/* Modal / Bottom Sheet Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 99999,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            style={{
              background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.08)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Select Window Type</h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 18, color: 'var(--text)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Grid */}
            <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '1rem' 
              }}>
                {WINDOW_TYPES.map(wt => {
                  const isSelected = wt.value === value;
                  return (
                    <button
                      key={wt.value}
                      onClick={() => { onChange(wt.value); setIsOpen(false); }}
                      style={{
                        background: isSelected ? 'rgba(13, 110, 253, 0.08)' : 'var(--bg)',
                        border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                        borderRadius: 16, padding: '1rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                        boxShadow: isSelected ? '0 0 0 2px rgba(13, 110, 253, 0.15)' : 'none'
                      }}
                      aria-label={`Select ${wt.label}`}
                      aria-pressed={isSelected}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', marginBottom: '0.75rem' }}>
                        <RealisticWindowTypeIcon type={wt.value} />
                      </div>
                      <div style={{ fontWeight: 600, color: isSelected ? 'var(--blue)' : 'var(--text)', fontSize: '0.95rem' }}>{wt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{wt.helper}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
