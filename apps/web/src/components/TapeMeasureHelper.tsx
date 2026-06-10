import React from 'react';

const FRACTIONS = [
  { label: '1/8', dec: 0.125 },
  { label: '1/4', dec: 0.25 },
  { label: '3/8', dec: 0.375 },
  { label: '1/2', dec: 0.5 },
  { label: '5/8', dec: 0.625 },
  { label: '3/4', dec: 0.75 },
  { label: '7/8', dec: 0.875 },
];

export function TapeMeasureHelper({ 
  onSelectFraction 
}: { 
  onSelectFraction: (dec: number, label: string) => void 
}) {
  return (
    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Tape Reading Help (Quick Fractions)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {FRACTIONS.map(f => (
          <button
            key={f.label}
            onClick={(e) => { e.preventDefault(); onSelectFraction(f.dec, f.label); }}
            style={{
              padding: '0.4rem 0.6rem',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              flex: '1 1 calc(25% - 0.4rem)'
            }}
          >
            +{f.label}"
          </button>
        ))}
      </div>
    </div>
  );
}

export function formatFraction(decimal: number | null): string {
  if (decimal === null || isNaN(decimal)) return '';
  const whole = Math.floor(decimal);
  const frac = decimal - whole;
  if (frac === 0) return `${whole}`;
  
  // Find nearest fraction 
  let closest = FRACTIONS[0];
  let minDiff = Math.abs(frac - FRACTIONS[0].dec);
  for (let i = 1; i < FRACTIONS.length; i++) {
    const diff = Math.abs(frac - FRACTIONS[i].dec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = FRACTIONS[i];
    }
  }
  
  if (minDiff < 0.05) {
    if (whole === 0) return closest.label;
    return `${whole} ${closest.label}`;
  }
  return decimal.toFixed(3);
}
