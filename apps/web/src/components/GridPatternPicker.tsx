import React, { useState } from 'react';
import { RealisticGridPatternIcon } from './RealisticGridPatternIcons';

export const GRID_PATTERNS = [
  { value: 'None', label: 'None', helper: 'Clear glass' },
  { value: 'Colonial', label: 'Colonial', helper: 'Classic divided panes' },
  { value: 'Prairie', label: 'Prairie', helper: 'Border lines near edge' },
  { value: 'Diamond', label: 'Diamond', helper: 'Diagonal pattern' },
  { value: 'Perimeter', label: 'Perimeter', helper: 'Outer edge only' },
  { value: 'Craftsman', label: 'Craftsman', helper: 'Top sash band only' },
  { value: 'Farmhouse', label: 'Farmhouse', helper: 'Simple 2x2 cross' },
  { value: 'Custom', label: 'Custom', helper: 'Requires notes' },
  { value: 'Other', label: 'Other', helper: 'Unknown pattern' },
];

export const GRID_PROFILES = ['Flat', 'Contoured', 'SDL', 'GBG'];

export function getGridMeasurementGuidance(pattern: string | null): string[] | null {
  if (!pattern || pattern === 'None') return null;
  switch (pattern.toLowerCase()) {
    case 'colonial': return ['Verify Vertical (V-Lines) and Horizontal (H-Lines)', 'Check profile type'];
    case 'prairie': 
    case 'perimeter': return ['Verify perimeter distance/offset if custom', 'Check profile type'];
    case 'diamond': return ['Note: Custom sizing may be required for diamond lattices', 'Manager review recommended'];
    case 'craftsman': return ['Verify top-band grid configuration', 'Check if lower sash has grids'];
    case 'custom':
    case 'other': return ['Add detailed grid notes', 'Photo highly recommended', 'Manager review strongly recommended'];
    default: return ['Verify V-Lines and H-Lines', 'Check profile type'];
  }
}

/**
 * Client-side BTR 2026 grid rules validation.
 */
export function validateGridConfig(
  pattern: string | null,
  profile: string | null,
  vCount: number,
  hCount: number,
  sdlSize: string | null,
  exteriorColor?: string | null,
  seriesModel?: string | null
): { valid: boolean; message?: string; suggestion?: { profile?: string; sdlSize?: string } } {
  if (!pattern || pattern === 'None') {
    return { valid: true };
  }

  // 1. Exterior color grid requirement (exterior color requires Contoured/B1)
  const extColor = (exteriorColor || '').toUpperCase();
  const hasExteriorColor = extColor && extColor !== 'WHITE' && extColor !== 'BEIGE' && extColor !== 'CLAY';
  if (hasExteriorColor && profile !== 'Contoured' && profile !== 'SDL') {
    return {
      valid: false,
      message: `BTR Rule: Exterior color (${exteriorColor}) requires Contoured grids.`,
      suggestion: { profile: 'Contoured' }
    };
  }

  // 2. Diamond must be Flat (A1)
  if (pattern.toLowerCase() === 'diamond' && profile !== 'Flat') {
    return {
      valid: false,
      message: 'BTR Rule: Diamond grids must be FLAT.',
      suggestion: { profile: 'Flat' }
    };
  }

  // 3. SDL validation: require size
  if (profile === 'SDL') {
    if (!sdlSize) {
      return {
        valid: false,
        message: 'SDL profile selected. You must specify the SDL size.',
        suggestion: { sdlSize: '7/8"' }
      };
    }
  }

  // 4. Counts check
  if (vCount <= 0 && hCount <= 0) {
    return {
      valid: false,
      message: 'Grid pattern active but bars counts are 0. Set at least 1 bar.'
    };
  }

  return { valid: true };
}

interface GridPatternPickerProps {
  value: string | null; // pattern
  profile: string | null;
  vCount: number;
  hCount: number;
  sdlSize: string | null;
  exteriorColor?: string | null;
  seriesModel?: string | null;
  onChange: (updates: {
    gridPattern: string;
    gridStyle: string;
    gridProfile?: string;
    gridVerticalCount?: number;
    gridHorizontalCount?: number;
    sdlSize?: string;
    isSDL?: boolean;
    isGBG?: boolean;
  }) => void;
  error?: boolean;
}

export function GridPatternPicker({
  value,
  profile,
  vCount,
  hCount,
  sdlSize,
  exteriorColor,
  seriesModel,
  onChange,
  error
}: GridPatternPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedPattern = GRID_PATTERNS.find(p => p.value === value) || (value && value !== 'None' ? { value, label: value, helper: '' } : null);
  const guidance = getGridMeasurementGuidance(value);

  // Validate current configuration
  const validation = validateGridConfig(value, profile, vCount, hCount, sdlSize, exteriorColor, seriesModel);

  // Contract format string
  const contractFormat = value && value !== 'None' ? `${vCount}V × ${hCount}H` : 'No Grids';

  const handleProfileChange = (newProfile: string) => {
    const isSdl = newProfile === 'SDL';
    const isGbg = newProfile === 'GBG';
    onChange({
      gridPattern: value || 'Colonial',
      gridStyle: newProfile,
      gridProfile: newProfile,
      isSDL: isSdl,
      isGBG: isGbg,
      sdlSize: isSdl ? (sdlSize || '7/8"') : '',
    });
  };

  const handlePatternChange = (newPattern: string) => {
    if (newPattern === 'None') {
      onChange({
        gridPattern: 'None',
        gridStyle: 'None',
        gridProfile: '',
        gridVerticalCount: 0,
        gridHorizontalCount: 0,
        sdlSize: '',
        isSDL: false,
        isGBG: false,
      });
      return;
    }

    // Default V/H lines by pattern
    let newV = vCount || 2;
    let newH = hCount || 2;
    let newProfile = profile || 'Flat';
    let defaultPlacement = 'full';

    if (newPattern === 'Craftsman') {
      newV = 2;
      newH = 1;
      defaultPlacement = 'top_sash';
    } else if (newPattern === 'Farmhouse') {
      newV = 1;
      newH = 1;
    }

    // Diamond must be flat
    if (newPattern.toLowerCase() === 'diamond') {
      newProfile = 'Flat';
    }

    onChange({
      gridPattern: newPattern,
      gridStyle: newProfile,
      gridProfile: newProfile,
      gridVerticalCount: newV,
      gridHorizontalCount: newH,
      isSDL: newProfile === 'SDL',
      isGBG: newProfile === 'GBG',
    });
  };

  return (
    <div className="grid-pattern-picker" style={{ width: '100%' }}>
      {/* Pattern Trigger Button */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem', borderRadius: '0.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${error || !validation.valid ? 'var(--danger, #ef4444)' : 'rgba(255, 255, 255, 0.1)'}`,
          cursor: 'pointer', transition: 'all 0.2s',
          marginBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {value && value !== 'None' ? (
            <div style={{ width: 44, height: 44, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, overflow: 'hidden' }}>
              <RealisticGridPatternIcon pattern={value} />
            </div>
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color: '#94a3b8' }}>
              ⊞
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: value && value !== 'None' ? '#f8fafc' : '#94a3b8', fontSize: '0.95rem' }}>
              {selectedPattern ? selectedPattern.label : 'Select Grid Pattern...'}
            </div>
            {selectedPattern && selectedPattern.helper && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{selectedPattern.helper}</div>
            )}
          </div>
        </div>
        <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem' }}>
          {value && value !== 'None' ? 'Change Pattern' : 'Select'}
        </div>
      </div>

      {/* Grid Settings Panel (If grids enabled) */}
      {value && value !== 'None' && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          {/* Grid Profile Chips */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              Grid Profile
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {GRID_PROFILES.map(p => {
                const isSelected = profile === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProfileChange(p)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: `1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: isSelected ? '#60a5fa' : '#94a3b8'
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SDL Size selector */}
          {profile === 'SDL' && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                SDL Size
              </div>
              <select
                className="form-input"
                value={sdlSize || ''}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: `1px solid ${!sdlSize ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  padding: '0.4rem 0.5rem',
                  borderRadius: 6,
                  fontSize: '0.85rem'
                }}
                onChange={e => onChange({
                  gridPattern: value,
                  gridStyle: 'SDL',
                  gridProfile: 'SDL',
                  isSDL: true,
                  sdlSize: e.target.value
                })}
              >
                <option value="">Select Size...</option>
                <option value='7/8"'>7/8"</option>
                <option value='1-1/4"'>1-1/4"</option>
              </select>
            </div>
          )}

          {/* V/H Bar Counts with Friendly Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                Across (Vertical Bars)
              </div>
              <input
                type="number"
                min={0}
                className="form-input"
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 6,
                  fontSize: '0.85rem'
                }}
                value={vCount ?? ''}
                onChange={e => onChange({
                  gridPattern: value,
                  gridStyle: profile || 'Flat',
                  gridVerticalCount: parseInt(e.target.value) || 0
                })}
                placeholder="2"
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                Up-Down (Horizontal Bars)
              </div>
              <input
                type="number"
                min={0}
                className="form-input"
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 6,
                  fontSize: '0.85rem'
                }}
                value={hCount ?? ''}
                onChange={e => onChange({
                  gridPattern: value,
                  gridStyle: profile || 'Flat',
                  gridHorizontalCount: parseInt(e.target.value) || 0
                })}
                placeholder="2"
              />
            </div>
          </div>

          {/* Contract Format Display */}
          <div style={{
            fontSize: '0.75rem',
            color: '#38bdf8',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.25rem',
            borderTop: '1px dashed rgba(255,255,255,0.05)'
          }}>
            <span>Contract Format:</span>
            <span style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
              {contractFormat}
            </span>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {!validation.valid && validation.message && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.6rem 0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 8,
          borderLeft: '3px solid #ef4444',
          fontSize: '0.8rem',
          color: '#fca5a5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div>{validation.message}</div>
          {validation.suggestion && (
            <button
              type="button"
              onClick={() => {
                const updates: any = {
                  gridPattern: value || 'Colonial',
                  gridStyle: profile || 'Flat'
                };
                if (validation.suggestion?.profile) {
                  updates.gridProfile = validation.suggestion.profile;
                  updates.gridStyle = validation.suggestion.profile;
                  updates.isSDL = validation.suggestion.profile === 'SDL';
                  updates.isGBG = validation.suggestion.profile === 'GBG';
                }
                if (validation.suggestion?.sdlSize) {
                  updates.sdlSize = validation.suggestion.sdlSize;
                  updates.isSDL = true;
                }
                onChange(updates);
              }}
              style={{
                flexShrink: 0,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            >
              Fix
            </button>
          )}
        </div>
      )}

      {/* Measurement Guidance */}
      {guidance && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Grid Guidance
          </div>
          <ul style={{ margin: 0, paddingLeft: '1rem', color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.3 }}>
            {guidance.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {/* Modal Selection Dialog */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)', zIndex: 99999,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            style={{
              background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>Select Grid Pattern</h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: 32, height: 32, borderRadius: 16, color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Grid */}
            <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                gap: '0.75rem' 
              }}>
                {GRID_PATTERNS.map(p => {
                  const isSelected = p.value === value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => { handlePatternChange(p.value); setIsOpen(false); }}
                      style={{
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: 12, padding: '0.75rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                      }}
                      aria-label={`Select ${p.label}`}
                      aria-pressed={isSelected}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 6, overflow: 'hidden' }}>
                        <RealisticGridPatternIcon pattern={p.value} />
                      </div>
                      <div style={{ fontWeight: 600, color: isSelected ? '#60a5fa' : '#f8fafc', fontSize: '0.85rem' }}>
                        {p.label}
                      </div>
                      {p.helper && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.2 }}>
                          {p.helper}
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

