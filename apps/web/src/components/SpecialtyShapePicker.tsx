import React, { useState } from 'react';
import type { ShapeType } from '../utils/sketchSync';
import { RealisticShapeIcon } from './RealisticShapeIcons';

export const SHAPE_TYPES: { value: ShapeType; label: string; helper?: string }[] = [
  { value: 'arch', label: 'Arch', helper: 'Curved top' },
  { value: 'eyebrow', label: 'Eyebrow', helper: 'Shallow curve' },
  { value: 'circle_top', label: 'Circle Top', helper: 'Half circle' },
  { value: 'quarter_arch', label: 'Quarter Arch', helper: 'One curved corner' },
  { value: 'half_round', label: 'Half Round', helper: 'Full half circle' },
  { value: 'extended_leg', label: 'Extended-Leg', helper: 'Arch with tall sides' },
  { value: 'cathedral', label: 'Cathedral', helper: 'Pointed peak' },
  { value: 'hexagon', label: 'Hexagon', helper: '6 sides' },
  { value: 'octagon', label: 'Octagon', helper: '8 sides' },
  { value: 'triangle', label: 'Triangle', helper: '3 sides' },
  { value: 'trapezoid', label: 'Trapezoid', helper: 'Sloped side/top' },
  { value: 'oval', label: 'Oval', helper: 'Elliptical' },
  { value: 'custom', label: 'Custom', helper: 'Requires notes/photo' },
  { value: 'other', label: 'Other', helper: 'Requires notes/photo' },
];

export function getMeasurementGuidance(shape: ShapeType | string | null): string[] | null {
  if (!shape) return null;
  switch (shape) {
    case 'arch': return ['Width', 'Leg Height (if applicable)', 'Rise or Radius'];
    case 'eyebrow': return ['Width', 'Height', 'Rise'];
    case 'circle_top': return ['Width', 'Height / Radius', 'Add note if specific'];
    case 'quarter_arch': return ['Width', 'Height', 'Left/Right Orientation'];
    case 'half_round': return ['Width', 'Radius / Rise'];
    case 'extended_leg': return ['Width', 'Leg Height', 'Arch Rise'];
    case 'cathedral': return ['Width', 'High Point Height', 'Side Height'];
    case 'hexagon':
    case 'octagon': return ['Across Flats (Width)', 'Height'];
    case 'triangle': return ['Base Width', 'Height', 'Orientation / Pitch'];
    case 'trapezoid': return ['Top Width', 'Bottom Width', 'Left Height', 'Right Height', 'Slope Direction'];
    case 'oval':
    case 'ellipse': return ['Width', 'Height'];
    case 'custom':
    case 'other': return ['Width', 'Height', 'Add detailed notes', 'Photo highly recommended', 'Manager review likely needed'];
    default: return null;
  }
}

interface SpecialtyShapePickerProps {
  value: ShapeType | null;
  onChange: (shape: ShapeType) => void;
  error?: boolean;
}

export function SpecialtyShapePicker({ value, onChange, error }: SpecialtyShapePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedShape = SHAPE_TYPES.find(s => s.value === value);
  const guidance = getMeasurementGuidance(value);

  return (
    <div className="specialty-shape-picker" style={{ width: '100%' }}>
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
              <RealisticShapeIcon shape={value} />
            </div>
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--muted)' }}>
              ⬡
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: value ? 'var(--text)' : 'var(--muted)', fontSize: '1.1rem' }}>
              {selectedShape ? selectedShape.label : 'Select Shape...'}
            </div>
            {selectedShape && selectedShape.helper && (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{selectedShape.helper}</div>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem' }}>
          {value ? 'Change Shape' : 'Select'}
        </div>
      </div>

      {/* Measurement Guidance Tip */}
      {guidance && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--sev-info-bg)', borderRadius: 8, borderLeft: '3px solid var(--sev-info)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sev-info)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            Required Measurements
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
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Select Specialty Shape</h2>
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
                {SHAPE_TYPES.map(s => {
                  const isSelected = s.value === value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => { onChange(s.value); setIsOpen(false); }}
                      style={{
                        background: isSelected ? 'rgba(13, 110, 253, 0.08)' : 'var(--bg)',
                        border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                        borderRadius: 16, padding: '1rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                        boxShadow: isSelected ? '0 0 0 2px rgba(13, 110, 253, 0.15)' : 'none'
                      }}
                      aria-label={`Select ${s.label}`}
                      aria-pressed={isSelected}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', marginBottom: '0.75rem' }}>
                        <RealisticShapeIcon shape={s.value} />
                      </div>
                      <div style={{ fontWeight: 600, color: isSelected ? 'var(--blue)' : 'var(--text)', fontSize: '0.9rem' }}>
                        {s.label}
                      </div>
                      {s.helper && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.2 }}>
                          {s.helper}
                        </div>
                      )}
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
