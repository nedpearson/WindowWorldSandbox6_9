import { useMemo, useState } from 'react';
import type { SketchMarkerData } from '../utils/sketchSync';

interface Props {
  openings: any[];
  markers: SketchMarkerData[];
}

export function LiveEstimateWidget({ openings, markers }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { totalEstimate, monthlyEstimate, windowCount, doorCount, sidingCount } = useMemo(() => {
    let wCount = 0;
    let dCount = 0;
    let sCount = 0;
    let base = 0;

    openings.forEach(op => {
      if (['double_hung', 'single_hung', 'picture', 'slider', 'casement'].includes(op.productCategory || '')) {
        wCount++;
        base += 650; // Mock average
      } else if (['entry_door', 'patio_door', 'sgd', 'front_door', 'back_door'].includes(op.productCategory || '')) {
        dCount++;
        base += 1500;
      }
    });

    markers.forEach(m => {
      if (m.markerSymbol === 'siding' || m.markerSymbol === 'vinyl_siding' || m.markerSymbol === 'wood_siding') {
        sCount++;
        base += 8500; // Mock siding zone average
      }
    });

    const monthly = base > 0 ? (base * 1.2) / 60 : 0; // Rough 60mo financing mock

    return {
      totalEstimate: base,
      monthlyEstimate: monthly,
      windowCount: wCount,
      doorCount: dCount,
      sidingCount: sCount
    };
  }, [openings, markers]);

  if (totalEstimate === 0) return null;

  // ── Collapsed: Compact pill in bottom-left above canvas ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'absolute',
          bottom: 56,
          left: 12,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 0.7rem',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(59,130,246,0.5)',
          borderRadius: 20,
          color: '#fff',
          zIndex: 15,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
          fontFamily: '"Inter", sans-serif',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--blue)' }}>
          ${totalEstimate.toLocaleString()}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted, #9aa1ad)' }}>
          est.
        </span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted, #9aa1ad)' }}>▲</span>
      </button>
    );
  }

  // ── Expanded: Bottom sheet style ──
  return (
    <div style={{
      position: 'absolute',
      bottom: 56,
      left: 12,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: 14,
      padding: '0.75rem',
      color: 'white',
      width: 220,
      zIndex: 15,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontFamily: '"Inter", sans-serif',
      animation: 'fadeInEstimate 0.15s ease-out',
    }}>
      <style>{`@keyframes fadeInEstimate { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }`}</style>

      {/* Header with close */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', marginBottom: '0.4rem',
        }}
      >
        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted, #9aa1ad)' }}>
          Live Estimate
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9aa1ad)' }}>▼</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>
          ${totalEstimate.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #9aa1ad)', paddingBottom: '0.15rem' }}>est.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #9aa1ad)' }}>Financing</div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
          ${Math.round(monthlyEstimate)}<span style={{ fontSize: '0.6rem', color: 'var(--text-muted, #9aa1ad)', fontWeight: 400 }}>/mo</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.6rem', color: 'var(--text-muted, #9aa1ad)', flexWrap: 'wrap' }}>
        {windowCount > 0 && <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>🪟 {windowCount} Windows</span>}
        {doorCount > 0 && <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>🚪 {doorCount} Doors</span>}
        {sidingCount > 0 && <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>🏠 Siding</span>}
      </div>
    </div>
  );
}
