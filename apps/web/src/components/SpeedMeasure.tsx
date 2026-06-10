// ═══════════════════════════════════════════════════════════
// Speed Measure — Maximum speed measurement entry
// Custom keypad, fraction quick-buttons, auto-advance,
// common dimension presets, floating measurement pad
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { parseMeasurement, FRACTION_BUTTONS, toFractionDisplay } from '../utils/measurementParser';

// ── Common residential window sizes (width × height) ─────
const COMMON_SIZES = [
  { label: '24×36', w: 24, h: 36 },
  { label: '28×54', w: 28, h: 54 },
  { label: '30×48', w: 30, h: 48 },
  { label: '32×52', w: 32, h: 52 },
  { label: '32×60', w: 32, h: 60 },
  { label: '35×47', w: 35.375, h: 47.375 },
  { label: '35×59', w: 35.375, h: 59.375 },
  { label: '35×71', w: 35.375, h: 71.375 },
  { label: '36×60', w: 36, h: 60 },
  { label: '46×46', w: 46, h: 46 },
  { label: '46×60', w: 46, h: 60 },
  { label: '70×47', w: 70, h: 47 },
];

// ── Floating Measurement Pad ─────────────────────────────
// A draggable, always-on-top measurement entry pad
export function FloatingMeasurePad({
  width, height,
  onWidthChange, onHeightChange,
  onSaveAndNext,
  openingNumber,
  roomLocation,
}: {
  width: number;
  height: number;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onSaveAndNext: () => void;
  openingNumber: number;
  roomLocation: string;
}) {
  const [activeField, setActiveField] = useState<'width' | 'height'>('width');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when switching fields
  useEffect(() => {
    const current = activeField === 'width' ? width : height;
    setInput(current > 0 ? toFractionDisplay(current) : '');
    inputRef.current?.focus();
  }, [activeField]);

  const applyValue = useCallback((text: string) => {
    const parsed = parseMeasurement(text);
    if (parsed.valid) {
      if (activeField === 'width') onWidthChange(parsed.inches);
      else onHeightChange(parsed.inches);
    }
  }, [activeField, onWidthChange, onHeightChange]);

  const handleKeyTap = (key: string) => {
    const newInput = input + key;
    setInput(newInput);
    applyValue(newInput);
  };

  const handleFraction = (frac: string, decimal: number) => {
    const whole = parseInt(input) || 0;
    const newVal = whole + decimal;
    const display = `${whole} ${frac}`;
    setInput(display);
    if (activeField === 'width') onWidthChange(newVal);
    else onHeightChange(newVal);
    // Auto-advance: after entering fraction for width, jump to height
    if (activeField === 'width') {
      setTimeout(() => setActiveField('height'), 100);
    }
  };

  const handleClear = () => {
    setInput('');
    if (activeField === 'width') onWidthChange(0);
    else onHeightChange(0);
  };

  const handleBackspace = () => {
    const newInput = input.slice(0, -1);
    setInput(newInput);
    if (newInput) applyValue(newInput);
    else {
      if (activeField === 'width') onWidthChange(0);
      else onHeightChange(0);
    }
  };

  const ui = (width || 0) + (height || 0);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '2px solid var(--accent)',
      borderRadius: 14, padding: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      width: '100%', maxWidth: 320,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)' }}>
          📏 #{openingNumber} · {roomLocation || 'New'}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 800, color: ui > 0 ? 'var(--accent)' : 'var(--text-muted)',
          fontFamily: 'monospace',
        }}>
          UI: {ui}"
        </span>
      </div>

      {/* W × H Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
        <button onClick={() => setActiveField('width')} style={{
          padding: '6px', borderRadius: 8, border: `2px solid ${activeField === 'width' ? 'var(--accent)' : 'var(--border)'}`,
          background: activeField === 'width' ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
          color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 800, fontSize: '1.125rem',
          textAlign: 'center', cursor: 'pointer',
        }}>
          {width > 0 ? toFractionDisplay(width) : '—'}"
          <div style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>WIDTH</div>
        </button>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)' }}>×</span>
        <button onClick={() => setActiveField('height')} style={{
          padding: '6px', borderRadius: 8, border: `2px solid ${activeField === 'height' ? 'var(--accent)' : 'var(--border)'}`,
          background: activeField === 'height' ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
          color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 800, fontSize: '1.125rem',
          textAlign: 'center', cursor: 'pointer',
        }}>
          {height > 0 ? toFractionDisplay(height) : '—'}"
          <div style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>HEIGHT</div>
        </button>
      </div>

      {/* Hidden text input for keyboard fallback */}
      <input ref={inputRef} value={input} onChange={e => { setInput(e.target.value); applyValue(e.target.value); }}
        onKeyDown={e => {
          if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (activeField === 'width') setActiveField('height');
            else onSaveAndNext();
          }
        }}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />

      {/* Number Pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '4px' }}>
        {[7,8,9].map(n => (
          <button key={n} onClick={() => handleKeyTap(String(n))} style={numBtnStyle}>{n}</button>
        ))}
        <button onClick={handleBackspace} style={{ ...numBtnStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>⌫</button>
        {[4,5,6].map(n => (
          <button key={n} onClick={() => handleKeyTap(String(n))} style={numBtnStyle}>{n}</button>
        ))}
        <button onClick={handleClear} style={{ ...numBtnStyle, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>C</button>
        {[1,2,3].map(n => (
          <button key={n} onClick={() => handleKeyTap(String(n))} style={numBtnStyle}>{n}</button>
        ))}
        <button onClick={() => {
          if (activeField === 'width') setActiveField('height');
          else onSaveAndNext();
        }} style={{
          ...numBtnStyle,
          background: activeField === 'width' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
          color: activeField === 'width' ? '#3b82f6' : '#22c55e',
          fontWeight: 800, fontSize: '0.625rem',
        }}>
          {activeField === 'width' ? 'H →' : 'Save ⏩'}
        </button>
        <button onClick={() => handleKeyTap('0')} style={{ ...numBtnStyle, gridColumn: 'span 2' }}>0</button>
        <button onClick={() => handleKeyTap('.')} style={numBtnStyle}>.</button>
      </div>

      {/* Fraction Quick Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
        {FRACTION_BUTTONS.map(f => (
          <button key={f.value} onClick={() => handleFraction(f.value, f.decimal)} style={{
            padding: '5px 2px', borderRadius: 5, border: '1px solid var(--border)',
            background: 'rgba(139,92,246,0.06)', color: '#c4b5fd',
            fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer',
          }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Common Sizes Quick Pick ──────────────────────────────
export function CommonSizePicker({
  onSelect, recentSizes,
}: {
  onSelect: (w: number, h: number) => void;
  recentSizes?: { w: number; h: number }[];
}) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div style={{
      display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '0.5rem',
      padding: '4px 6px', borderRadius: 6,
      background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)',
    }}>
      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '2px' }}>
        📐 Sizes
      </span>
      {/* Recent sizes first */}
      {(recentSizes || []).slice(0, 3).map((s, i) => (
        <button key={`recent-${i}`} onClick={() => onSelect(s.w, s.h)} style={{
          padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.2)',
          background: 'rgba(34,197,94,0.08)', color: '#22c55e',
          fontSize: '0.5625rem', fontWeight: 700, cursor: 'pointer',
        }}>
          {Math.round(s.w)}×{Math.round(s.h)}
        </button>
      ))}
      {/* Common sizes */}
      {(showAll ? COMMON_SIZES : COMMON_SIZES.slice(0, 4)).map(s => (
        <button key={s.label} onClick={() => onSelect(s.w, s.h)} style={{
          padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
          fontSize: '0.5625rem', fontWeight: 600, cursor: 'pointer',
        }}>
          {s.label}
        </button>
      ))}
      {!showAll && (
        <button onClick={() => setShowAll(true)} style={{
          padding: '2px 6px', borderRadius: 4, border: '1px dashed var(--border)',
          background: 'none', color: 'var(--text-muted)', fontSize: '0.5625rem', cursor: 'pointer',
        }}>+{COMMON_SIZES.length - 4}</button>
      )}
    </div>
  );
}

// ── Rapid Room Walkthrough Mode ──────────────────────────
// Enter dimensions for all openings in a room without leaving the view
export function RapidMeasureStrip({
  openings, onUpdateDims,
}: {
  openings: any[];
  onUpdateDims: (openingId: string, width: number, height: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const unmeasured = openings.filter(o => !o.width || o.width === 0);
  if (unmeasured.length === 0) return null;

  const current = unmeasured[activeIdx] || unmeasured[0];
  const [wInput, setWInput] = useState('');
  const [hInput, setHInput] = useState('');
  const wRef = useRef<HTMLInputElement>(null);

  useEffect(() => { wRef.current?.focus(); }, [activeIdx]);

  const submit = () => {
    const w = parseMeasurement(wInput);
    const h = parseMeasurement(hInput);
    if (w.valid && h.valid) {
      onUpdateDims(current.id, w.inches, h.inches);
      setWInput('');
      setHInput('');
      if (activeIdx < unmeasured.length - 1) setActiveIdx(activeIdx + 1);
    }
  };

  return (
    <div style={{
      padding: '8px 10px', borderRadius: 8, marginBottom: '0.75rem',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))',
      border: '1px solid rgba(99,102,241,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6366f1' }}>
          ⚡ Rapid Measure — {unmeasured.length} remaining
        </span>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
          #{current.openingNumber} · {current.roomLocation || 'Unnamed'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <input ref={wRef} value={wInput} onChange={e => setWInput(e.target.value)}
          placeholder="W" style={{
            width: 80, padding: '6px', borderRadius: 6, border: '2px solid var(--accent)',
            background: 'var(--bg-input)', color: 'var(--text-primary)',
            fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', textAlign: 'center',
          }}
          onKeyDown={e => { if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); document.getElementById('rapid-h')?.focus(); } }}
        />
        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>×</span>
        <input id="rapid-h" value={hInput} onChange={e => setHInput(e.target.value)}
          placeholder="H" style={{
            width: 80, padding: '6px', borderRadius: 6, border: '2px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-primary)',
            fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', textAlign: 'center',
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        />
        <button onClick={submit} style={{
          padding: '6px 12px', borderRadius: 6, border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
        }}>
          Next ⏩
        </button>
        {/* Fraction pills */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          {FRACTION_BUTTONS.slice(0, 4).map(f => (
            <button key={f.value} onClick={() => {
              const target = document.activeElement?.id === 'rapid-h' ? 'h' : 'w';
              if (target === 'w') {
                const whole = parseInt(wInput) || 0;
                setWInput(`${whole} ${f.value}`);
              } else {
                const whole = parseInt(hInput) || 0;
                setHInput(`${whole} ${f.value}`);
              }
            }} style={{
              padding: '3px 5px', borderRadius: 4, border: '1px solid rgba(139,92,246,0.2)',
              background: 'rgba(139,92,246,0.08)', color: '#c4b5fd',
              fontSize: '0.5625rem', fontWeight: 700, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────
const numBtnStyle: React.CSSProperties = {
  padding: '10px 4px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg-input)', color: 'var(--text-primary)',
  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
  transition: 'all 0.1s',
};
