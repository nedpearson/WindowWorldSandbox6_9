// ═══════════════════════════════════════════════════════════════
// MapboxPropertyMap -- Canonical map component for Window World Assistant
// Token loaded at runtime from /api/config/public (Railway-safe).
// No hardcoded tokens. No atob/base64 fallbacks. No Google Maps.
// No fake placeholders. No Express/backend code in this file.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { resolveMapboxToken } from '../../utils/mapboxToken';

// Re-export so existing imports from this file continue to work
export { resolveMapboxToken } from '../../utils/mapboxToken';

export type MapMode = 'outline' | 'aerial' | 'streets';

interface MapboxPropertyMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  mode?: MapMode;
  showTargetMarker?: boolean;
  showControls?: boolean;
  height?: number | string;
  onReady?: () => void;
  onError?: (err: string) => void;
}

export interface MapboxPropertyMapRef {
  getCanvasImage: () => string | null;
  getCenter: () => { lat: number; lng: number } | null;
  getZoom: () => number | null;
}

const STYLES: Record<MapMode, string> = {
  outline: 'mapbox://styles/mapbox/light-v11',
  aerial:  'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
};

const MODE_LABELS: Record<MapMode, string> = {
  outline: 'Outline',
  aerial:  'Aerial',
  streets: 'Street Map',
};

const MODE_ZOOM: Record<MapMode, number> = {
  outline: 20,
  aerial:  19,
  streets: 17,
};

// How long to wait for the Mapbox 'load' event before showing an error
const MAP_LOAD_TIMEOUT_MS = 8000;

// ── Component ─────────────────────────────────────────────────────────────────
export const MapboxPropertyMap = forwardRef<MapboxPropertyMapRef, MapboxPropertyMapProps>((
{
  lat,
  lng,
  address,
  mode: initialMode = 'aerial',
  showTargetMarker = true,
  showControls = true,
  height = 320,
  onReady,
  onError,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markerRef    = useRef<mapboxgl.Marker | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode]               = useState<MapMode>(initialMode);
  const [mapReady, setMapReady]       = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [token, setToken]             = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getCanvasImage: () => {
      if (!mapRef.current) return null;
      return mapRef.current.getCanvas().toDataURL('image/png');
    },
    getCenter: () => {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return { lat: c.lat, lng: c.lng };
    },
    getZoom: () => {
      if (!mapRef.current) return null;
      return mapRef.current.getZoom();
    },
  }));

  // Resolve token on mount
  useEffect(() => {
    resolveMapboxToken().then(t => {
      setToken(t);
      setTokenLoading(false);
    });
  }, []);

  // Sync mode prop to local state
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // ── Place / update marker helper ──────────────────────────────────────────
  const placeMarker = useCallback((map: mapboxgl.Map, lngVal: number, latVal: number) => {
    // Remove any existing marker first
    markerRef.current?.remove();
    markerRef.current = null;

    if (!showTargetMarker) return;

    const el = document.createElement('div');
    el.style.cssText = [
      'width:14px', 'height:14px', 'border-radius:50%',
      'background:#ef4444', 'border:2.5px solid #fff',
      'box-shadow:0 0 0 2px rgba(239,68,68,0.4)', 'cursor:pointer',
    ].join(';');

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([lngVal, latVal])
      .setPopup(
        new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<div style="font-size:0.75rem;font-weight:700;color:#1e293b">📍 Target Address${
            address ? `<br><span style="font-weight:400;color:#475569">${address}</span>` : ''
          }</div>`
        )
      )
      .addTo(map);
  }, [showTargetMarker, address]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Use null-check (not falsy) so lat=0 / lng=0 are valid coordinates
    if (!token || lat == null || lng == null || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES[initialMode],
      center: [lng, lat],
      zoom: MODE_ZOOM[initialMode],
      preserveDrawingBuffer: true,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // ── 8-second hard timeout — never leave the user with an infinite spinner ──
    timeoutRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const errMsg = 'Map could not load. Check Mapbox token/domain restrictions or network connection.';
      setLoadError(errMsg);
      onError?.(errMsg);
    }, MAP_LOAD_TIMEOUT_MS);

    map.on('load', () => {
      // Cancel the timeout — load succeeded
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setMapReady(true);
      onReady?.();
      placeMarker(map, lng, lat);
      // Circle only for non-outline modes (outline = building footprint view)
      if (initialMode !== 'outline') addCircle(map, lng, lat);
    });

    // Isolate the building at the center coordinate once tiles are rendered.
    // If this fails for any reason, we must NOT block mapReady.
    map.once('idle', () => {
      const m = mapRef.current;
      if (!m) return;
      try {
        const pt = m.project([lng, lat]);
        const layers = m.getStyle()?.layers || [];
        const buildingLayers = layers.filter(l => l.id.includes('building'));

        if (buildingLayers.length > 0) {
          const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
            [pt.x - 40, pt.y - 40],
            [pt.x + 40, pt.y + 40],
          ];
          const features = m.queryRenderedFeatures(bbox, { layers: buildingLayers.map(l => l.id) });
          if (features.length > 0) {
            const target = features[0];
            const filterVal = target.id ?? target.properties?.osm_id ?? target.properties?.id;
            if (filterVal !== undefined && filterVal !== null) {
              buildingLayers.forEach(layer => {
                try {
                  const prop = target.id !== undefined ? ['id'] : ['get', target.properties?.osm_id ? 'osm_id' : 'id'];
                  m.setFilter(layer.id, ['==', prop, filterVal]);
                } catch { /* setFilter failed — continue */ }
              });
            }
          }
        }
      } catch (err) {
        // Building isolation is best-effort — never blocks usability
        console.warn('[MapboxPropertyMap] Building isolation skipped:', err);
      }
    });

    map.on('error', (e) => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      const msg = (e.error as Error | undefined)?.message ?? 'Map failed to load';
      setLoadError(msg);
      onError?.(msg);
    });
  }, [token, lat, lng, initialMode, onError]);

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  // Handle center coordinate changes dynamically without recreating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lat == null || lng == null) return;
    map.flyTo({ center: [lng, lat], duration: 800 });
    placeMarker(map, lng, lat);
    if (mode !== 'outline') addCircle(map, lng, lat);
  }, [lat, lng, mapReady, mode, placeMarker]);

  // ── Switch map style when mode changes ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lat == null || lng == null) return;
    map.setStyle(STYLES[mode]);
    map.once('style.load', () => {
      // Re-add the target marker after style reload (style wipe removes it)
      placeMarker(map, lng, lat);
      if (mode !== 'outline') addCircle(map, lng, lat);
    });
    map.setZoom(MODE_ZOOM[mode]);
  }, [mode, mapReady, lat, lng, placeMarker]);

  const recenter = useCallback(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    mapRef.current.flyTo({ center: [lng, lat], zoom: MODE_ZOOM[mode], duration: 800 });
  }, [lat, lng, mode]);

  // ── Render states ─────────────────────────────────────────────────────────

  if (lat == null || lng == null) {
    return (
      <div style={emptyStyle(height)}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏠</div>
        <div style={{ fontWeight: 700, color: '#fca5a5' }}>Address location unavailable</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', maxWidth: 400 }}>
          Address location unavailable. Confirm the address or sketch manually.
        </div>
      </div>
    );
  }

  if (tokenLoading) {
    return (
      <div style={emptyStyle(height)}>
        <div style={spinnerStyle} />
        <style>{SPIN_CSS}</style>
        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.75rem' }}>Loading map…</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={emptyStyle(height)}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
        <div style={{ fontWeight: 700, color: '#fca5a5' }}>Map Setup Required</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', maxWidth: 400 }}>
          Map Setup Required — Mapbox public token is not configured.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={emptyStyle(height)}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <div style={{ fontWeight: 700, color: '#fca5a5' }}>Map could not load</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', maxWidth: 400 }}>
          Map could not load. Check Mapbox token, domain restrictions, or network.
        </div>
        <button
          onClick={() => { setLoadError(''); setMapReady(false); }}
          style={{ marginTop: '1rem', padding: '0.4rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <style>{SPIN_CSS}</style>

      {showControls && (
        <div style={{ display: 'flex', gap: '0.25rem', background: '#0f172a', padding: '0.2rem', borderRadius: '8px', border: '1px solid #334155' }}>
          {(['outline', 'aerial', 'streets'] as MapMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={tabStyle(mode === m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
          <button onClick={recenter} style={tabStyle(false)} title="Recenter on property">
            ⊕ Recenter
          </button>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', height, borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', zIndex: 5 }}>
            <div style={spinnerStyle} />
          </div>
        )}

        {mapReady && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(15,23,42,0.8)', color: '#94a3b8', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
            {MODE_LABELS[mode]}
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.7rem', color: '#64748b', padding: '0.35rem 0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
        ℹ️ Nearby structures may be visible. Use the red target marker and aerial view to confirm the correct house.
      </div>
    </div>
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function addCircle(map: mapboxgl.Map, lng: number, lat: number) {
  if (map.getSource('target-radius')) return;
  const pts = 64, R = 6371000, r = 15;
  const coords: [number, number][] = Array.from({ length: pts }, (_, i) => {
    const a = (i * 2 * Math.PI) / pts;
    return [
      lng + (r * Math.cos(a) / R) * (180 / Math.PI) / Math.cos((lat * Math.PI) / 180),
      lat + (r * Math.sin(a) / R) * (180 / Math.PI),
    ];
  });
  coords.push(coords[0]);
  const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
  map.addSource('target-radius', { type: 'geojson', data: geojson });
  map.addLayer({ id: 'target-radius-fill',   type: 'fill', source: 'target-radius', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'target-radius-stroke', type: 'line', source: 'target-radius', paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-opacity': 0.7 } });
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: 'none',
    background: active ? '#3b82f6' : 'transparent',
    color: active ? '#fff' : '#94a3b8',
    fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

function emptyStyle(h: number | string): React.CSSProperties {
  return {
    width: '100%', height: h, borderRadius: '10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(15,23,42,0.5)', border: '1px solid #334155',
    textAlign: 'center', padding: '2rem',
  };
}

const SPIN_CSS = '@keyframes mbSpin{100%{transform:rotate(360deg)}}';

const spinnerStyle: React.CSSProperties = {
  width: 24, height: 24,
  border: '3px solid rgba(255,255,255,0.15)',
  borderTopColor: '#3b82f6',
  borderRadius: '50%',
  animation: 'mbSpin 1s linear infinite',
};
