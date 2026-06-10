import { useState, useRef, useEffect, useCallback } from 'react';
import {
  parseMeasurement, parseWxH, validateMeasurement,
  FRACTION_BUTTONS, toFractionDisplay,
} from '../utils/measurementParser';

// ─── FRACTION KEYPAD INPUT ──────────────────────────────
export function FractionInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (inches: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ? toFractionDisplay(value) : '');
  const [showKeypad, setShowKeypad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastNotifiedValue = useRef(value);

  useEffect(() => {
    if (value !== lastNotifiedValue.current) {
      setText(value ? toFractionDisplay(value) : '');
      lastNotifiedValue.current = value;
    }
  }, [value]);

  const handleTextChange = (raw: string) => {
    setText(raw);
    const parsed = parseMeasurement(raw);
    if (parsed.valid) {
      lastNotifiedValue.current = parsed.inches;
      onChange(parsed.inches);
    } else if (raw === '') {
      lastNotifiedValue.current = 0;
      onChange(0);
    }
  };

  const handleBlur = () => {
    if (value) {
      setText(toFractionDisplay(value));
    } else {
      setText('');
    }
  };

  const appendFraction = (frac: string, decimal: number) => {
    const current = text.replace(/\s+\d+\/\d+$/, '').trim();
    const whole = parseInt(current) || 0;
    const newVal = whole + decimal;
    setText(`${whole} ${frac}`);
    lastNotifiedValue.current = newVal;
    onChange(newVal);
    setShowKeypad(false);
    inputRef.current?.focus();
  };

  const handleNumberKey = (n: number) => {
    const newText = text + n;
    setText(newText);
    const parsed = parseMeasurement(newText);
    if (parsed.valid) {
      lastNotifiedValue.current = parsed.inches;
      onChange(parsed.inches);
    }
  };

  const handleClear = () => { 
    setText(''); 
    lastNotifiedValue.current = 0;
    onChange(0); 
  };
  const handleBackspace = () => {
    const newText = text.slice(0, -1);
    setText(newText);
    const parsed = parseMeasurement(newText);
    if (parsed.valid) {
      lastNotifiedValue.current = parsed.inches;
      onChange(parsed.inches);
    } else if (!newText) {
      lastNotifiedValue.current = 0;
      onChange(0);
    }
  };

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <input ref={inputRef} className="form-input" value={text}
          onChange={e => handleTextChange(e.target.value)}
          onFocus={() => setShowKeypad(true)}
          onBlur={handleBlur}
          placeholder={placeholder || 'e.g. 35 3/8'}
          style={{ flex: 1, fontWeight: 600, fontSize: '1rem', fontFamily: 'monospace' }}
        />
        <button type="button" onClick={() => setShowKeypad(!showKeypad)}
          style={{ padding: '0.375rem 0.625rem', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-sm)', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}>
          ⅛
        </button>
      </div>

      {/* Inline fraction bar (always visible when keypad off) */}
      {!showKeypad && (
        <div style={{ display: 'flex', gap: '0.125rem', marginTop: '0.25rem' }}>
          {FRACTION_BUTTONS.map(f => (
            <button key={f.value} type="button" onClick={() => appendFraction(f.value, f.decimal)}
              className="frac-chip">{f.label}</button>
          ))}
        </div>
      )}

      {/* Full keypad */}
      {showKeypad && (
        <div className="measure-keypad">
          <div className="keypad-grid">
            {[7,8,9,4,5,6,1,2,3].map(n => (
              <button key={n} type="button" onClick={() => handleNumberKey(n)} className="keypad-btn">{n}</button>
            ))}
            <button type="button" onClick={handleClear} className="keypad-btn keypad-fn">C</button>
            <button type="button" onClick={() => handleNumberKey(0)} className="keypad-btn">0</button>
            <button type="button" onClick={handleBackspace} className="keypad-btn keypad-fn">⌫</button>
          </div>
          <div className="keypad-fractions">
            {FRACTION_BUTTONS.map(f => (
              <button key={f.value} type="button" onClick={() => appendFraction(f.value, f.decimal)}
                className="keypad-btn keypad-frac">{f.label}<span style={{ fontSize: '0.5rem', opacity: 0.6 }}>{f.value}</span></button>
            ))}
          </div>
          <button type="button" onClick={() => setShowKeypad(false)}
            style={{ width: '100%', padding: '0.375rem', background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'white', fontWeight: 700, cursor: 'pointer', marginTop: '0.25rem' }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── QUICK WxH VOICE/TEXT ENTRY ─────────────────────────
export function QuickWxH({
  width,
  height,
  onWidthChange,
  onHeightChange,
  productCategory,
  measurementBasis,
  onBasisChange,
  rawWidth,
  rawHeight,
  onRawWidthChange,
  onRawHeightChange,
  deduction = 0.375,
}: {
  width: number;
  height: number;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  productCategory: string;
  measurementBasis?: string;
  onBasisChange?: (v: string) => void;
  rawWidth?: number;
  rawHeight?: number;
  onRawWidthChange?: (v: number) => void;
  onRawHeightChange?: (v: number) => void;
  deduction?: number;
}) {
  const [voiceText, setVoiceText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const warnings = validateMeasurement(width, height, productCategory);

  const handleVoiceParse = () => {
    if (!voiceText.trim()) return;
    const { width: w, height: h } = parseWxH(voiceText);
    if (w.valid) onWidthChange(w.inches);
    if (h.valid) onHeightChange(h.inches);
    setVoiceText('');
    setShowVoice(false);
  };

  const isOutside = measurementBasis === 'outside';
  const needsCushion = measurementBasis === 'Opening' || isOutside;
  let orderW = width;
  let orderH = height;
  let measuredW = rawWidth || width;
  let measuredH = rawHeight || height;

  if (needsCushion && (!rawWidth || rawWidth === width)) {
    orderW -= deduction;
    orderH -= deduction;
  }

  return (
    <div>
      {/* Voice/text entry bar */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <button type="button" onClick={() => setShowVoice(!showVoice)}
          style={{ padding: '0.375rem 0.75rem', background: showVoice ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: showVoice ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          📏 Quick: "W x H"
        </button>
        {showVoice && (
          <>
            <input className="form-input" value={voiceText} onChange={e => setVoiceText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVoiceParse()}
              placeholder='Type: 35 3/8 x 59 7/8  or  "thirty five by sixty"'
              style={{ flex: 1, fontSize: '0.8125rem' }} autoFocus />
            <button type="button" onClick={handleVoiceParse} className="btn btn-sm btn-primary">Parse</button>
          </>
        )}
        {/* United Inches display */}
        <div style={{ padding: '0.375rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          UI: {measuredW + measuredH}"
        </div>
      </div>

      {onBasisChange && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Basis:</label>
            <select className="form-select" style={{ padding: '0.25rem 1.5rem 0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minHeight: '24px' }} value={measurementBasis || 'Exact'} onChange={e => onBasisChange(e.target.value)}>
              <option value="Exact">Exact (Net)</option>
              <option value="Opening">Opening (-3/8" Cushion)</option>
              <option value="outside">Outside (Siding, -3/8" Cushion)</option>
            </select>
          </div>
          {/* We now show the comparison in the dual-input UI below instead of just read-only text here */}
        </div>
      )}

      {/* Fraction inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
           <FractionInput label={needsCushion ? "Measured Width" : "Width (inches)"} value={measuredW} onChange={(v) => {
             if (onRawWidthChange) onRawWidthChange(v);
             if (needsCushion) onWidthChange(v - deduction);
             else onWidthChange(v);
           }} placeholder="35 3/8" />
           <FractionInput label={needsCushion ? "Measured Height" : "Height (inches)"} value={measuredH} onChange={(v) => {
             if (onRawHeightChange) onRawHeightChange(v);
             if (needsCushion) onHeightChange(v - deduction);
             else onHeightChange(v);
           }} placeholder="59 7/8" />
         </div>
         
         {needsCushion && (
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-sm)' }}>
           <FractionInput label="Order Width (Net)" value={orderW} onChange={(v) => {
             onWidthChange(v);
             if (onRawWidthChange) onRawWidthChange(v + deduction);
           }} />
           <FractionInput label="Order Height (Net)" value={orderH} onChange={(v) => {
             onHeightChange(v);
             if (onRawHeightChange) onRawHeightChange(v + deduction);
           }} />
         </div>
         )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginTop: '0.375rem' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.6875rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0' }}>
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SAME-AS-PREVIOUS BUTTONS ───────────────────────────
export function SameAsPrevious({
  previousOpening,
  currentOpening,
  onApply,
}: {
  previousOpening: any | null;
  currentOpening: any;
  onApply: (fields: Record<string, any>) => void;
}) {
  if (!previousOpening) return null;

  const buttons = [
    { label: 'Same Width', icon: '↔', action: () => onApply({ width: previousOpening.width }), show: previousOpening.width > 0 },
    { label: 'Same Height', icon: '↕', action: () => onApply({ height: previousOpening.height }), show: previousOpening.height > 0 },
    { label: 'Same W×H', icon: '⬜', action: () => onApply({ width: previousOpening.width, height: previousOpening.height }), show: previousOpening.width > 0 && previousOpening.height > 0 },
    { label: 'Same Config', icon: '📋', action: () => onApply({
      productCategory: previousOpening.productCategory, seriesModel: previousOpening.seriesModel,
      interiorColor: previousOpening.interiorColor, exteriorColor: previousOpening.exteriorColor,
      gridStyle: previousOpening.gridStyle, gridPattern: previousOpening.gridPattern,
      glassPackage: previousOpening.glassPackage, screenOption: previousOpening.screenOption,
      removalType: previousOpening.removalType, temperedGlass: previousOpening.temperedGlass,
    }), show: true },
    { label: 'Same All', icon: '⚡', action: () => {
      const { id, openingNumber, roomLocation, elevation, appointmentId, ...rest } = previousOpening;
      onApply(rest);
    }, show: true },
  ];

  return (
    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.25rem' }}>
        SAME AS #{previousOpening.openingNumber}:
      </span>
      {buttons.filter(b => b.show).map(b => (
        <button key={b.label} type="button" onClick={b.action} className="smart-chip" style={{ fontSize: '0.625rem' }}>
          {b.icon} {b.label}
        </button>
      ))}
    </div>
  );
}


