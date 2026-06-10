import { useState } from 'react';
import { FractionInput } from './QuickMeasure';
import { TapeMeasurementCapture } from './TapeMeasurementCapture';
import { toFractionDisplay } from '../utils/measurementParser';
import {
  findMeasurementRule,
  applyMeasurementRule,
  MeasurementAdjustment,
  ExteriorType,
  InstallType,
} from '../utils/measurementRules';
import { TapePhotoRead } from '../utils/tapePhotoReader';

// ═══════════════════════════════════════════════════════════════
// ORIEL WINDOW MEASUREMENT MODE
// Business rule: ALWAYS measure the TOP SASH for Oriel windows.
// ═══════════════════════════════════════════════════════════════

interface OrielMeasurementProps {
  openingNumber: number;
  exteriorType?: string;
  installType?: string;
  onApprove: (data: OrielMeasurementResult) => void;
  onCancel: () => void;
}

export interface OrielMeasurementResult {
  topSashWidth: number;
  topSashHeight: number;
  overallWidth?: number;
  overallHeight?: number;
  topSashConfirmed: boolean;
  adjustment: MeasurementAdjustment;
  photoReads: TapePhotoRead[];
  internalNote: string;
  approved: boolean;
}

export function OrielMeasurementMode({ openingNumber, exteriorType, installType, onApprove, onCancel }: OrielMeasurementProps) {
  const [topSashWidth, setTopSashWidth] = useState(0);
  const [topSashHeight, setTopSashHeight] = useState(0);
  const [overallWidth, setOverallWidth] = useState(0);
  const [overallHeight, setOverallHeight] = useState(0);
  const [topSashConfirmed, setTopSashConfirmed] = useState(false);
  const [photoReads, setPhotoReads] = useState<TapePhotoRead[]>([]);
  const [captureMode, setCaptureMode] = useState<'top_sash_width' | 'top_sash_height' | null>(null);
  const [step, setStep] = useState<'instructions' | 'measure' | 'review'>('instructions');

  const rule = findMeasurementRule('oriel', exteriorType, installType);
  const adjustment = topSashWidth > 0
    ? applyMeasurementRule(topSashWidth, topSashHeight, rule)
    : null;

  const canProceedToReview = topSashConfirmed && topSashWidth > 0 && topSashHeight > 0;

  const handleApprove = () => {
    if (!adjustment) return;
    onApprove({
      topSashWidth,
      topSashHeight,
      overallWidth: overallWidth || undefined,
      overallHeight: overallHeight || undefined,
      topSashConfirmed,
      adjustment: { ...adjustment, approved: true, approvedAt: new Date() },
      photoReads,
      internalNote: 'Oriel measured by top sash.',
      approved: true,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 520, margin: '0 auto' }}>
      {/* Mode header */}
      <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.12))', borderRadius: 12, borderLeft: '4px solid var(--accent)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          🪟 Oriel Window Mode — Opening #{openingNumber}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Guided measurement for Oriel windows
        </div>
      </div>

      {/* STEP 1: Instructions */}
      {step === 'instructions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.07)', border: '2px solid var(--danger)', borderRadius: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>
              ⚠️ ORIEL MEASUREMENT RULE
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              For Oriel windows, always measure using the <u>TOP SASH</u>.
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
              • Do NOT measure the overall unit or the bottom sash<br />
              • Measure the top sash width and height only<br />
              • The top sash measurement IS the order measurement<br />
              • No standard deduction is applied to Oriel top sash
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 8, cursor: 'pointer', border: `2px solid ${topSashConfirmed ? 'var(--success)' : 'var(--border)'}` }}>
            <input
              type="checkbox"
              checked={topSashConfirmed}
              onChange={e => setTopSashConfirmed(e.target.checked)}
              style={{ width: 22, height: 22, accentColor: 'var(--success)', flexShrink: 0, marginTop: '0.125rem' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: topSashConfirmed ? 'var(--success)' : 'var(--text-primary)' }}>
                ✅ Top sash measurement confirmed
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                I understand I must measure the top sash only for this Oriel window.
              </div>
            </div>
          </label>

          <button
            onClick={() => setStep('measure')}
            disabled={!topSashConfirmed}
            style={{ padding: '1rem', background: topSashConfirmed ? 'var(--accent)' : 'var(--bg-secondary)', color: topSashConfirmed ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '1rem', cursor: topSashConfirmed ? 'pointer' : 'not-allowed' }}
          >
            Continue to Measurement →
          </button>
        </div>
      )}

      {/* STEP 2: Enter Measurements */}
      {step === 'measure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.08)', border: '1px solid var(--success)', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', color: 'var(--success)' }}>
            ✅ Top sash confirmed — enter top sash dimensions below
          </div>

          {/* Top Sash Inputs */}
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Top Sash Dimensions (Required)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <FractionInput label="Top Sash Width" value={topSashWidth} onChange={setTopSashWidth} placeholder="35 3/8" />
                <button
                  onClick={() => setCaptureMode('top_sash_width')}
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.375rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                >
                  📷 Capture Tape
                </button>
              </div>
              <div>
                <FractionInput label="Top Sash Height" value={topSashHeight} onChange={setTopSashHeight} placeholder="29 1/2" />
                <button
                  onClick={() => setCaptureMode('top_sash_height')}
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.375rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                >
                  📷 Capture Tape
                </button>
              </div>
            </div>
          </div>

          {/* Camera capture overlay */}
          {captureMode && (
            <TapeMeasurementCapture
              measurementType={captureMode}
              rule={rule}
              onApproved={(val, read) => {
                if (captureMode === 'top_sash_width') setTopSashWidth(val);
                if (captureMode === 'top_sash_height') setTopSashHeight(val);
                setPhotoReads(prev => [...prev, read]);
                setCaptureMode(null);
              }}
              onCancel={() => setCaptureMode(null)}
            />
          )}

          {/* Optional: overall unit */}
          <details style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
            <summary style={{ padding: '0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Optional: Overall Unit Dimensions (reference only)
            </summary>
            <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FractionInput label="Overall Width" value={overallWidth} onChange={setOverallWidth} placeholder="overall width" />
              <FractionInput label="Overall Height" value={overallHeight} onChange={setOverallHeight} placeholder="overall height" />
            </div>
          </details>

          <button
            onClick={() => setStep('review')}
            disabled={!canProceedToReview}
            style={{ padding: '1rem', background: canProceedToReview ? 'var(--accent)' : 'var(--bg-secondary)', color: canProceedToReview ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '1rem', cursor: canProceedToReview ? 'pointer' : 'not-allowed' }}
          >
            Review Measurement →
          </button>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 'review' && adjustment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem' }}>📐 Measurement Review — Opening #{openingNumber}</div>

          {/* Raw vs Adjusted */}
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {[
                { label: 'Top Sash Width', value: toFractionDisplay(topSashWidth) + '"', sub: 'measured' },
                { label: 'Takeoff', value: adjustment.widthTakeoff > 0 ? '−' + toFractionDisplay(adjustment.widthTakeoff) + '"' : 'None', sub: 'deduction' },
                { label: 'Order Width', value: toFractionDisplay(adjustment.adjustedWidth) + '"', sub: 'final', accent: true },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem 0.5rem', background: s.accent ? 'rgba(34,197,94,0.1)' : 'var(--bg-primary)', borderRadius: 8, border: s.accent ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem', color: s.accent ? 'var(--success)' : 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.25rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              {[
                { label: 'Top Sash Height', value: toFractionDisplay(topSashHeight) + '"', sub: 'measured' },
                { label: 'Takeoff', value: adjustment.heightTakeoff > 0 ? '−' + toFractionDisplay(adjustment.heightTakeoff) + '"' : 'None', sub: 'deduction' },
                { label: 'Order Height', value: toFractionDisplay(adjustment.adjustedHeight) + '"', sub: 'final', accent: true },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem 0.5rem', background: (s as any).accent ? 'rgba(34,197,94,0.1)' : 'var(--bg-primary)', borderRadius: 8, border: (s as any).accent ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem', color: (s as any).accent ? 'var(--success)' : 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.25rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{(s as any).sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rule */}
          {rule && (
            <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: 8, fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 600 }}>Rule Applied: {rule.name}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{rule.description}</div>
              {rule.status === 'needs_verification' && (
                <div style={{ color: 'var(--warning)', fontWeight: 700, marginTop: '0.25rem' }}>⚠️ NEEDS_VERIFICATION — confirm with Window World</div>
              )}
            </div>
          )}

          {/* Warnings */}
          {adjustment.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--warning)', padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>{w}</div>
          ))}

          {/* Internal note preview */}
          <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            📝 Internal note: "Oriel measured by top sash."
          </div>

          {/* Photo count */}
          {photoReads.length > 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--success)' }}>📷 {photoReads.length} tape photo(s) captured</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button onClick={() => setStep('measure')} style={{ padding: '0.875rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              ← Edit
            </button>
            <button onClick={handleApprove} style={{ padding: '0.875rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>
              ✅ Approve & Apply to Form
            </button>
          </div>
        </div>
      )}

      {/* Cancel */}
      {step !== 'review' && (
        <button onClick={onCancel} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem' }}>
          Cancel Oriel Mode
        </button>
      )}
    </div>
  );
}
