import { useState, useEffect, useCallback } from 'react';
import { FractionInput } from './QuickMeasure';
import { toFractionDisplay } from '../utils/measurementParser';

interface BrickMeasurementProps {
  opening: any;
  onUpdate: (fields: Record<string, any>) => void;
  isBrickHouse: boolean;
}

interface MeasurementSet {
  widthTop: number; widthMiddle: number; widthBottom: number;
  heightLeft: number; heightCenter: number; heightRight: number;
  depth: number;
}

const MIN_DEPTH_SLIM = 2.875; // 5000 Series
const MIN_DEPTH_CLASSIC = 3.25; // 4000/6000 Series
const VARIANCE_WARNING = 0.25; // 1/4" variance triggers warning
const VARIANCE_CRITICAL = 0.5; // 1/2" variance is critical

function getSmallest(...values: number[]): number {
  const valid = values.filter(v => v > 0);
  return valid.length > 0 ? Math.min(...valid) : 0;
}

function getVariance(...values: number[]): number {
  const valid = values.filter(v => v > 0);
  if (valid.length < 2) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

function fmtFrac(n: number): string {
  return n > 0 ? toFractionDisplay(n) + '"' : '—';
}

export function BrickMeasurementPanel({ opening, onUpdate, isBrickHouse }: BrickMeasurementProps) {
  const [expanded, setExpanded] = useState(isBrickHouse);
  const [m, setM] = useState<MeasurementSet>({
    widthTop: opening.measurementTop || 0,
    widthMiddle: opening.measurementMiddle || 0,
    widthBottom: opening.measurementBottom || 0,
    heightLeft: opening.measurementLeft || 0,
    heightCenter: opening.measurementCenter || 0,
    heightRight: opening.measurementRight || 0,
    depth: opening.openingDepth || 0,
  });

  const smallestWidth = getSmallest(m.widthTop, m.widthMiddle, m.widthBottom);
  const smallestHeight = getSmallest(m.heightLeft, m.heightCenter, m.heightRight);
  const widthVariance = getVariance(m.widthTop, m.widthMiddle, m.widthBottom);
  const heightVariance = getVariance(m.heightLeft, m.heightCenter, m.heightRight);
  const depthOk = m.depth === 0 || m.depth >= MIN_DEPTH_CLASSIC;
  const depthFitsSlim = m.depth > 0 && m.depth >= MIN_DEPTH_SLIM && m.depth < MIN_DEPTH_CLASSIC;
  const ui = smallestWidth + smallestHeight;

  // Warnings
  const warnings: { message: string; severity: 'warning' | 'critical' | 'info' }[] = [];

  if (widthVariance >= VARIANCE_CRITICAL)
    warnings.push({ message: `Width variance ${fmtFrac(widthVariance)} — brick opening highly uneven. Verify measurements.`, severity: 'critical' });
  else if (widthVariance >= VARIANCE_WARNING)
    warnings.push({ message: `Width variance ${fmtFrac(widthVariance)} — typical for brick. Smallest value will be used.`, severity: 'warning' });

  if (heightVariance >= VARIANCE_CRITICAL)
    warnings.push({ message: `Height variance ${fmtFrac(heightVariance)} — opening may be out of square.`, severity: 'critical' });
  else if (heightVariance >= VARIANCE_WARNING)
    warnings.push({ message: `Height variance ${fmtFrac(heightVariance)} — typical for brick. Smallest value will be used.`, severity: 'warning' });

  if (m.depth > 0) {
    if (m.depth < MIN_DEPTH_SLIM) {
      warnings.push({ message: `Depth ${fmtFrac(m.depth)} is below absolute minimum 2.875". No replacement insert will fit.`, severity: 'critical' });
    } else if (m.depth < MIN_DEPTH_CLASSIC) {
      warnings.push({ message: `Depth ${fmtFrac(m.depth)} fits Slim-Line 5000 series (2.875" req) but NOT Classic 4000/6000 (3.25" req).`, severity: 'warning' });
    }
  }

  if (smallestWidth > 0 && smallestHeight > 0 && widthVariance + heightVariance >= 0.75)
    warnings.push({ message: 'Opening appears significantly out of square. Possible brickmould interference.', severity: 'critical' });

  if (smallestWidth >= 48 || smallestHeight >= 72)
    warnings.push({ message: 'Large opening — visible glass reduction from frame thickness may be significant.', severity: 'info' });

  // Auto-update parent when smallest values change
  const propagate = useCallback(() => {
    const updates: Record<string, any> = {
      measurementTop: m.widthTop, measurementMiddle: m.widthMiddle, measurementBottom: m.widthBottom,
      measurementLeft: m.heightLeft, measurementCenter: m.heightCenter, measurementRight: m.heightRight,
      openingDepth: m.depth,
      openingVariance: Math.max(widthVariance, heightVariance),
      measurementStrategy: 'smallest',
      measureFrom: 'outside',
    };
    if (smallestWidth > 0) updates.width = smallestWidth;
    if (smallestHeight > 0) updates.height = smallestHeight;
    if (warnings.some(w => w.severity === 'critical')) {
      updates.depthWarning = m.depth > 0 && m.depth < MIN_DEPTH_CLASSIC;
      updates.outOfSquareWarning = widthVariance + heightVariance >= 0.75;
      updates.frameClearanceWarning = smallestWidth >= 48 || smallestHeight >= 72;
      updates.needsVerification = true;
    }
    onUpdate(updates);
  }, [m, smallestWidth, smallestHeight, widthVariance, heightVariance]);

  useEffect(() => {
    if (smallestWidth > 0 || smallestHeight > 0) propagate();
  }, [smallestWidth, smallestHeight, m.depth]);

  const upd = (field: keyof MeasurementSet, value: number) => {
    setM(prev => ({ ...prev, [field]: value }));
  };

  const isSmallestW = (v: number) => v > 0 && v === smallestWidth;
  const isSmallestH = (v: number) => v > 0 && v === smallestHeight;

  return (
    <div style={{
      background: isBrickHouse ? 'rgba(210,105,30,0.06)' : 'var(--bg-input)',
      border: `1px solid ${isBrickHouse ? 'rgba(210,105,30,0.25)' : 'var(--border)'}`,
      borderRadius: '10px', marginTop: '8px',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px', cursor: 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🧱</span>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isBrickHouse ? '#d2691e' : 'var(--text-primary)' }}>
            Brick House Measurement Mode
          </span>
          {isBrickHouse && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, background: 'rgba(210,105,30,0.15)',
              color: '#d2691e', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase',
            }}>
              Active
            </span>
          )}
          {smallestWidth > 0 && smallestHeight > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}>
              → {fmtFrac(smallestWidth)} × {fmtFrac(smallestHeight)} (UI: {ui})
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* Brick house info banner */}
          {isBrickHouse && (
            <div style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '0.7rem',
              background: 'rgba(210,105,30,0.08)', border: '1px solid rgba(210,105,30,0.15)',
              marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              <strong style={{ color: '#d2691e' }}>Brick Replacement Rules:</strong> Measure from <strong>outside</strong>. Use <strong>smallest</strong> measurement. Do NOT deduct — manufacturer handles production deductions. Verify depth ≥ 3 1/4".
            </div>
          )}

          {/* WIDTH — 3 measurement points */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ↔ Width — Measure Between Side Jambs
              {smallestWidth > 0 && (
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 800,
                  color: '#3fb950', background: 'rgba(63,185,80,0.1)', padding: '1px 6px',
                  borderRadius: '4px',
                }}>
                  Use: {fmtFrac(smallestWidth)}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <MeasurePoint label="Top" value={m.widthTop} onChange={v => upd('widthTop', v)}
                isSmallest={isSmallestW(m.widthTop)} placeholder="36 1/8" />
              <MeasurePoint label="Middle" value={m.widthMiddle} onChange={v => upd('widthMiddle', v)}
                isSmallest={isSmallestW(m.widthMiddle)} placeholder="35 15/16" />
              <MeasurePoint label="Bottom" value={m.widthBottom} onChange={v => upd('widthBottom', v)}
                isSmallest={isSmallestW(m.widthBottom)} placeholder="36" />
            </div>
            {widthVariance > 0 && (
              <VarianceBadge variance={widthVariance} label="Width" />
            )}
          </div>

          {/* HEIGHT — 3 measurement points */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ↕ Height — Sill to Top Jamb
              {smallestHeight > 0 && (
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 800,
                  color: '#3fb950', background: 'rgba(63,185,80,0.1)', padding: '1px 6px',
                  borderRadius: '4px',
                }}>
                  Use: {fmtFrac(smallestHeight)}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <MeasurePoint label="Left" value={m.heightLeft} onChange={v => upd('heightLeft', v)}
                isSmallest={isSmallestH(m.heightLeft)} placeholder="59 7/8" />
              <MeasurePoint label="Center" value={m.heightCenter} onChange={v => upd('heightCenter', v)}
                isSmallest={isSmallestH(m.heightCenter)} placeholder="59 3/4" />
              <MeasurePoint label="Right" value={m.heightRight} onChange={v => upd('heightRight', v)}
                isSmallest={isSmallestH(m.heightRight)} placeholder="59 13/16" />
            </div>
            {heightVariance > 0 && (
              <VarianceBadge variance={heightVariance} label="Height" />
            )}
          </div>

          {/* DEPTH */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
            }}>
              📏 Opening Depth — Inside Trim to Outside Blind Stop (min 3 1/4")
            </div>
            <div style={{ maxWidth: '200px' }}>
              <FractionInput label="" value={m.depth} onChange={v => upd('depth', v)} placeholder="3 1/2" />
            </div>
            {m.depth > 0 && (
              <div style={{
                marginTop: '4px', fontSize: '0.7rem', fontWeight: 600,
                color: depthOk ? '#3fb950' : (depthFitsSlim ? '#d2a8ff' : '#f85149'),
              }}>
                {depthOk ? '✅' : (depthFitsSlim ? '⚠️' : '🛑')} {fmtFrac(m.depth)} — {depthOk ? 'Sufficient for Classic/Standard replacement' : (depthFitsSlim ? 'Only fits Slim-Line 5000 Series (2.875" req)' : 'Below 2.875" absolute minimum')}
              </div>
            )}
          </div>

          {/* RESULTS SUMMARY */}
          {smallestWidth > 0 && smallestHeight > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
              padding: '10px', background: 'rgba(63,185,80,0.06)', borderRadius: '8px',
              border: '1px solid rgba(63,185,80,0.15)', marginBottom: '10px',
            }}>
              <ResultCard label="Final Width" value={fmtFrac(smallestWidth)} color="#3fb950" />
              <ResultCard label="Final Height" value={fmtFrac(smallestHeight)} color="#3fb950" />
              <ResultCard label="UI" value={`${ui}`} color="#58a6ff" />
              <ResultCard label="Depth" value={m.depth > 0 ? fmtFrac(m.depth) : 'Not measured'} color={depthOk ? '#58a6ff' : (depthFitsSlim ? '#d2a8ff' : '#f85149')} />
            </div>
          )}

          {/* WARNINGS */}
          {warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {warnings.map((w, i) => (
                <div key={i} style={{
                  padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 500,
                  background: w.severity === 'critical' ? 'rgba(248,81,73,0.08)' : w.severity === 'warning' ? 'rgba(210,153,34,0.08)' : 'rgba(88,166,255,0.08)',
                  border: `1px solid ${w.severity === 'critical' ? 'rgba(248,81,73,0.2)' : w.severity === 'warning' ? 'rgba(210,153,34,0.2)' : 'rgba(88,166,255,0.2)'}`,
                  color: w.severity === 'critical' ? '#f85149' : w.severity === 'warning' ? '#d29922' : '#58a6ff',
                }}>
                  {w.severity === 'critical' ? '🛑' : w.severity === 'warning' ? '⚠️' : 'ℹ️'} {w.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeasurePoint({ label, value, onChange, isSmallest, placeholder }: {
  label: string; value: number; onChange: (v: number) => void; isSmallest: boolean; placeholder: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontSize: '0.6rem', fontWeight: 700, color: isSmallest ? '#3fb950' : 'var(--text-muted)',
        textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px',
      }}>
        {label}
        {isSmallest && <span style={{ fontSize: '0.55rem', background: 'rgba(63,185,80,0.15)', padding: '0 4px', borderRadius: '3px' }}>✓ SMALLEST</span>}
      </div>
      <FractionInput label="" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function VarianceBadge({ variance, label }: { variance: number; label: string }) {
  const severity = variance >= VARIANCE_CRITICAL ? 'critical' : variance >= VARIANCE_WARNING ? 'warning' : 'ok';
  const colors = { critical: '#f85149', warning: '#d29922', ok: '#3fb950' };
  return (
    <div style={{
      marginTop: '4px', fontSize: '0.65rem', fontWeight: 600,
      color: colors[severity], display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      {severity === 'critical' ? '🛑' : severity === 'warning' ? '⚠️' : '✅'}
      {label} variance: {fmtFrac(variance)}
      {severity === 'ok' && ' — within tolerance'}
      {severity === 'warning' && ' — typical for brick'}
      {severity === 'critical' && ' — highly uneven, verify'}
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

export default BrickMeasurementPanel;
