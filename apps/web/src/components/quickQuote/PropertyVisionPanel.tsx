// ═══════════════════════════════════════════════════════════════
// PropertyVisionPanel — Thin wrapper around MapboxPropertyMap
// Used by Quick Quote to show the property map panel.
// ═══════════════════════════════════════════════════════════════

/// <reference types="vite/client" />

import { MapboxPropertyMap } from '../maps/MapboxPropertyMap';

interface AvailableViews {
  outline: boolean;
  aerial: boolean;
  street: boolean;
  aerialTilt: boolean;
}

interface PropertyVisionPanelProps {
  lat: number;
  lng: number;
  address: string;
  locationType?: string;
  availableViews: AvailableViews;
  warnings?: string[];
}

export function PropertyVisionPanel({ lat, lng, address, locationType, warnings = [] }: PropertyVisionPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Geocode quality warning */}
      {locationType && locationType !== 'ROOFTOP' && (
        <div style={{ background: 'rgba(245,158,11,0.08)', color: '#fcd34d', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠️ Address precision: <strong>{locationType}</strong> — map may not be centered on the exact structure. Confirm with aerial view.
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} style={{ background: 'rgba(100,116,139,0.1)', color: '#94a3b8', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', border: '1px solid rgba(100,116,139,0.2)' }}>
          ℹ️ {w}
        </div>
      ))}

      <MapboxPropertyMap
        lat={lat}
        lng={lng}
        address={address}
        mode="aerial"
        showTargetMarker
        showControls
        height={320}
      />

      <div style={{ background: 'rgba(59,130,246,0.08)', color: '#93c5fd', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', border: '1px solid rgba(59,130,246,0.15)' }}>
        💡 <strong>Can you clearly see windows from the aerial view?</strong> If not, window counts below are AI statistical estimates — verify on site.
      </div>
    </div>
  );
}
