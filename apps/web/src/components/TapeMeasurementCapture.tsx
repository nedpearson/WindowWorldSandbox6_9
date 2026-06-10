import { useState, useRef } from 'react';
import { FractionInput } from './QuickMeasure';
import { toFractionDisplay } from '../utils/measurementParser';
import {
  TapePhotoRead,
  processTapePhoto,
  approvePhotoRead,
  getConfidenceLabel,
  MEASUREMENT_TYPE_LABELS,
} from '../utils/tapePhotoReader';
import {
  MeasurementType,
  MeasurementAdjustment,
  MeasurementRule,
  applyMeasurementRule,
} from '../utils/measurementRules';

// ─── CAMERA CAPTURE BUTTON ───────────────────────────────────
function CameraButton({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) onCapture(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '1.25rem 1rem', background: 'rgba(59,130,246,0.08)', border: '2px dashed var(--accent)',
          borderRadius: 12, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700,
          gap: '0.375rem', width: '100%',
        }}
      >
        <span style={{ fontSize: '2rem' }}>📷</span>
        <span style={{ fontSize: '0.875rem' }}>Capture Tape Measurement</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 400 }}>
          Take photo of measuring tape
        </span>
      </button>
    </>
  );
}

// ─── TAPE PHOTO REVIEW CARD ──────────────────────────────────
interface TapePhotoReviewProps {
  read: TapePhotoRead;
  rule: MeasurementRule | null;
  onApprove: (finalValue: number) => void;
  onReject: () => void;
  onRetake: () => void;
}

function TapePhotoReview({ read, rule, onApprove, onReject, onRetake }: TapePhotoReviewProps) {
  const [correctedValue, setCorrectedValue] = useState(read.detectedDecimal || 0);
  const confInfo = getConfidenceLabel(read.confidence);

  const adj: MeasurementAdjustment = applyMeasurementRule(correctedValue, 0, rule);
  const finalValue = adj.adjustedWidth;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
          📷 {MEASUREMENT_TYPE_LABELS[read.measurementType]} — Tape Read
        </div>
        <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: confInfo.color + '22', color: confInfo.color, fontWeight: 700 }}>
          {confInfo.label}
        </span>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Photo preview */}
        {read.photoDataUrl && (
          <img
            src={read.photoDataUrl}
            alt="Tape measurement"
            style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        )}

        {/* Detected value */}
        <div style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            AI Detected
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 800, color: confInfo.color }}>
            {read.detectedFraction || read.rawAiText || '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Raw text: "{read.rawAiText}"
          </div>
          {read.candidates && read.candidates.length > 1 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Other readings:</span>
              {read.candidates.slice(1).map((c, i) => (
                <button key={i}
                  onClick={() => setCorrectedValue(parseFloat(c))}
                  style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rep correction */}
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {confInfo.requiresManualEntry ? '⚠️ Manual Entry Required' : '✏️ Correct Value If Needed'}
          </div>
          <FractionInput
            label={`${MEASUREMENT_TYPE_LABELS[read.measurementType]} (verify & correct)`}
            value={correctedValue}
            onChange={setCorrectedValue}
          />
        </div>

        {/* Deduction panel */}
        {correctedValue > 0 && (
          <div style={{ padding: '0.875rem', background: 'rgba(59,130,246,0.06)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>📐 Measurement Adjustment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              {[
                { label: 'Raw', value: toFractionDisplay(correctedValue) + '"', color: 'var(--text-secondary)' },
                { label: 'Takeoff', value: adj.widthTakeoff > 0 ? '−' + toFractionDisplay(adj.widthTakeoff) + '"' : '—', color: 'var(--warning)' },
                { label: 'Order Size', value: toFractionDisplay(finalValue) + '"', color: 'var(--success)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {rule && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Rule: {rule.name}
                {rule.status === 'needs_verification' && <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>⚠️ NEEDS_VERIFICATION</span>}
              </div>
            )}
            {adj.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.25rem' }}>{w}</div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          <button
            onClick={() => onApprove(finalValue)}
            disabled={!correctedValue}
            style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', border: '2px solid var(--success)', borderRadius: 8, fontWeight: 800, cursor: correctedValue ? 'pointer' : 'not-allowed', opacity: correctedValue ? 1 : 0.5 }}
          >
            ✅ Approve & Apply
          </button>
          <button
            onClick={onRetake}
            style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            🔄 Retake
          </button>
          <button
            onClick={onReject}
            style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            ✕ Discard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN TAPE MEASUREMENT CAPTURE WIDGET ───────────────────
interface TapeMeasurementCaptureProps {
  measurementType: MeasurementType;
  rule: MeasurementRule | null;
  onApproved: (finalValue: number, read: TapePhotoRead) => void;
  onCancel?: () => void;
}

export function TapeMeasurementCapture({ measurementType, rule, onApproved, onCancel }: TapeMeasurementCaptureProps) {
  const [phase, setPhase] = useState<'capture' | 'processing' | 'review' | 'done'>('capture');
  const [read, setRead] = useState<TapePhotoRead | null>(null);
  const [error, setError] = useState('');

  const handlePhotoCapture = async (dataUrl: string) => {
    setPhase('processing');
    setError('');
    try {
      const result = await processTapePhoto(dataUrl, measurementType);
      setRead(result);
      setPhase('review');
    } catch {
      setError('Failed to process photo. Please try again or enter manually.');
      setPhase('capture');
    }
  };

  if (phase === 'processing') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        <div style={{ fontWeight: 700 }}>Reading tape measurement...</div>
        <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>AI analyzing photo</div>
      </div>
    );
  }

  if (phase === 'review' && read) {
    return (
      <TapePhotoReview
        read={read}
        rule={rule}
        onApprove={(finalValue) => { onApproved(finalValue, read); setPhase('done'); }}
        onRetake={() => { setRead(null); setPhase('capture'); }}
        onReject={() => { setRead(null); setPhase('capture'); }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
        📷 Capture {MEASUREMENT_TYPE_LABELS[measurementType]} Tape
      </div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0.625rem', background: 'rgba(245,158,11,0.06)', borderRadius: 6, borderLeft: '3px solid var(--warning)' }}>
        ⚠️ AI reads the tape then shows you the result. You must approve before it applies to the order form. Always verify the detected value.
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error}</div>}
      <CameraButton onCapture={handlePhotoCapture} />
      {onCancel && (
        <button onClick={onCancel} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem' }}>
          Cancel
        </button>
      )}
    </div>
  );
}
