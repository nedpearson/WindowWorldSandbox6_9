import { useState } from 'react';
import { FractionInput } from './QuickMeasure';
import { TapeMeasurementCapture } from './TapeMeasurementCapture';
import { toFractionDisplay } from '../utils/measurementParser';
import {
  getSpecialtyDimensionSet,
  SpecialtyDimensionSet,
  computeCircleTopRadius,
  findMeasurementRule,
  applyMeasurementRule,
} from '../utils/measurementRules';
import { TapePhotoRead, MEASUREMENT_TYPE_LABELS } from '../utils/tapePhotoReader';
import { MeasurementType } from '../utils/measurementRules';

// ═══════════════════════════════════════════════════════════════
// SPECIALTY WINDOW MEASUREMENT MODE
// Guides rep through required dimensions for non-rectangular
// window types: circle top, eyebrow, arch, quarter arch, etc.
// ═══════════════════════════════════════════════════════════════

interface SpecialtyMeasurementProps {
  windowType: string;
  openingNumber: number;
  exteriorType?: string;
  installType?: string;
  onApprove: (data: SpecialtyMeasurementResult) => void;
  onCancel: () => void;
}

export interface SpecialtyMeasurementResult {
  windowType: string;
  dimensions: Record<string, number>;
  computedDimensions?: Record<string, number>;
  adjustment: any;
  photoReads: TapePhotoRead[];
  missingRequired: string[];
  approved: boolean;
  orderFormNotes: string;
}

// Window type selector used from outside
export const SPECIALTY_WINDOW_TYPE_OPTIONS = [
  { value: 'oriel',         label: '🪟 Oriel Window',         icon: '🪟' },
  { value: 'circle_top',    label: '⌒ Circle Top / Extended Leg', icon: '⌒' },
  { value: 'eyebrow',       label: '⌢ Eyebrow Window',        icon: '⌢' },
  { value: 'arch',          label: '⌣ Full Arch / Half Round', icon: '⌣' },
  { value: 'quarter_arch',  label: '◜ Quarter Arch',           icon: '◜' },
  { value: 'picture',       label: '🖼️ Picture / Fixed',       icon: '🖼️' },
  { value: 'patio_door',    label: '🚪 Patio / Sliding Door',  icon: '🚪' },
  { value: 'custom_shape',  label: '✦ Custom Shape',           icon: '✦' },
];

export function SpecialtyMeasurementMode({ windowType, openingNumber, exteriorType, installType, onApprove, onCancel }: SpecialtyMeasurementProps) {
  const spec: SpecialtyDimensionSet | null = getSpecialtyDimensionSet(windowType);
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [captureMode, setCaptureMode] = useState<{ key: string; type: MeasurementType } | null>(null);
  const [photoReads, setPhotoReads] = useState<TapePhotoRead[]>([]);
  const [step, setStep] = useState<'measure' | 'review'>('measure');

  const rule = findMeasurementRule(windowType, exteriorType, installType);

  // Compute derived fields
  const computedDimensions: Record<string, number> = {};
  if (windowType === 'circle_top' && dimensions.width && dimensions.rise) {
    computedDimensions.radius = computeCircleTopRadius(dimensions.width, dimensions.rise);
  }

  // Validate required fields
  const missingRequired = spec
    ? spec.requiredDimensions.filter(d => !dimensions[d.key]).map(d => d.label)
    : [];

  const canReview = missingRequired.length === 0;

  const setDim = (key: string, val: number) => setDimensions(prev => ({ ...prev, [key]: val }));

  const handleApprove = () => {
    const width = dimensions.width || dimensions.topSashWidth || 0;
    const height = dimensions.height || dimensions.topSashHeight || 0;
    const adjustment = applyMeasurementRule(width, height, rule);

    onApprove({
      windowType,
      dimensions,
      computedDimensions: Object.keys(computedDimensions).length > 0 ? computedDimensions : undefined,
      adjustment: { ...adjustment, approved: true, approvedAt: new Date() },
      photoReads,
      missingRequired,
      approved: true,
      orderFormNotes: spec?.orderFormNotes || '',
    });
  };

  if (!spec) {
    return (
      <div style={{ padding: '1rem', color: 'var(--danger)', textAlign: 'center' }}>
        Unknown specialty window type: {windowType}. Select a type from the Opening Wizard.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))', borderRadius: 12, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.125rem' }}>
          {spec.icon} {spec.label} Measurement Mode
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Opening #{openingNumber}</div>
        {spec.status === 'needs_verification' && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
            ⚠️ Measurement rules for this shape are NEEDS_VERIFICATION — confirm with Window World
          </div>
        )}
      </div>

      {/* Camera capture panel */}
      {captureMode && (
        <TapeMeasurementCapture
          measurementType={captureMode.type}
          rule={rule}
          onApproved={(val, read) => {
            setDim(captureMode.key, val);
            setPhotoReads(prev => [...prev, read]);
            setCaptureMode(null);
          }}
          onCancel={() => setCaptureMode(null)}
        />
      )}

      {/* Measurement Step */}
      {step === 'measure' && !captureMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Required Dimensions */}
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Required Dimensions
            </div>
            {spec.requiredDimensions.map(dim => (
              <div key={dim.key} style={{ marginBottom: '0.875rem' }}>
                {dim.hint && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.25rem', fontWeight: 600 }}>
                    💡 {dim.hint}
                  </div>
                )}
                <FractionInput
                  label={`${dim.label} *`}
                  value={dimensions[dim.key] || 0}
                  onChange={val => setDim(dim.key, val)}
                />
                <button
                  onClick={() => setCaptureMode({ key: dim.key, type: (dim.key.toLowerCase().includes('width') ? 'width' : dim.key.toLowerCase().includes('height') ? 'height' : dim.key.toLowerCase().includes('rise') ? 'rise' : dim.key.toLowerCase().includes('radius') ? 'radius' : 'leg_height') as MeasurementType })}
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.375rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px dashed var(--accent)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                >
                  📷 Capture Tape for {dim.label}
                </button>
              </div>
            ))}
          </div>

          {/* Computed Fields */}
          {spec.computedFields && spec.computedFields.length > 0 && (
            <div style={{ padding: '0.875rem', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>⚙️ Auto-Computed</div>
              {spec.computedFields.map(cf => (
                <div key={cf.key} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>{cf.label}:</strong>{' '}
                  {computedDimensions[cf.key] ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                      {toFractionDisplay(computedDimensions[cf.key])}"
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Enter required dimensions above</span>
                  )}
                  {' — '}<span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{cf.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Optional Dimensions */}
          {spec.optionalDimensions.length > 0 && (
            <details style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
              <summary style={{ padding: '0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Optional Dimensions ({spec.optionalDimensions.length})
              </summary>
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {spec.optionalDimensions.map(dim => (
                  <FractionInput
                    key={dim.key}
                    label={dim.label}
                    value={dimensions[dim.key] || 0}
                    onChange={val => setDim(dim.key, val)}
                  />
                ))}
              </div>
            </details>
          )}

          {/* Photo requirements */}
          {spec.requiredPhotos.length > 0 && (
            <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem' }}>📷 Required Photos</div>
              {spec.requiredPhotos.map((p, i) => {
                const captured = photoReads.length > i;
                return (
                  <div key={i} style={{ fontSize: '0.8125rem', color: captured ? 'var(--success)' : 'var(--text-secondary)', marginBottom: '0.125rem' }}>
                    {captured ? '✅' : '○'} {p}
                  </div>
                );
              })}
            </div>
          )}

          {/* Missing required */}
          {missingRequired.length > 0 && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(239,68,68,0.06)', borderRadius: 6, borderLeft: '3px solid var(--danger)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>Missing required:</div>
              {missingRequired.map((f, i) => (
                <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}>• {f}</div>
              ))}
            </div>
          )}

          <button
            onClick={() => setStep('review')}
            disabled={!canReview}
            style={{ padding: '1rem', background: canReview ? 'var(--accent)' : 'var(--bg-secondary)', color: canReview ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '1rem', cursor: canReview ? 'pointer' : 'not-allowed' }}
          >
            Review Measurements →
          </button>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem' }}>📐 Review — {spec.label} — Opening #{openingNumber}</div>

          {/* All dimensions */}
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
            {[...spec.requiredDimensions, ...spec.optionalDimensions].map(dim => {
              const val = dimensions[dim.key];
              if (!val) return null;
              return (
                <div key={dim.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{dim.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{toFractionDisplay(val)}"</span>
                </div>
              );
            })}
            {Object.entries(computedDimensions).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>{k} (computed)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{toFractionDisplay(v)}"</span>
              </div>
            ))}
          </div>

          {spec.orderFormNotes && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              📝 Order form note: "{spec.orderFormNotes}"
            </div>
          )}

          {rule?.status === 'needs_verification' && (
            <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 700 }}>
              ⚠️ Applied rule is NEEDS_VERIFICATION — confirm with Window World before finalizing.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button onClick={() => setStep('measure')} style={{ padding: '0.875rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              ← Edit
            </button>
            <button onClick={handleApprove} style={{ padding: '0.875rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
              ✅ Approve & Apply
            </button>
          </div>
        </div>
      )}

      <button onClick={onCancel} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem' }}>
        Cancel Specialty Mode
      </button>
    </div>
  );
}
