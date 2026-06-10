// ═══════════════════════════════════════════════════════════════
// HouseOutlineMap — Property Reference Panel for Sketch page
//
// Shows Google Static Maps building footprint. User can drag
// corner/edge handles to crop the exact area they want, then
// click "Apply to Canvas" to paste as sketch background.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  address?: string;
  appointmentId?: string;
  customerId?: string;
  onReady?: () => void;
  onManualSketch?: () => void;
  onImportImage?: (dataUrl: string) => void;
  onAutoOutline?: (points: { x: number, y: number }[], source: string) => void;
  autoApplyOnLoad?: boolean;
  onGeoReady?: (imageUrl: string) => void;  // fired with satellite URL as soon as geocoding succeeds
  autoLoad?: boolean;
}

interface GeoResult { lat: number; lng: number; formattedAddress: string; }

// Normalized crop rect (0–1 relative to image)
interface Crop { x: number; y: number; w: number; h: number; }

type Handle = 'tl'|'tc'|'tr'|'ml'|'mr'|'bl'|'bc'|'br'|'move';

const HANDLE_SIZE = 14;        // slightly larger for easier mobile tapping
const MIN_CROP = 40;           // px minimum crop dimension
const isMobileScreen = () => typeof window !== 'undefined' && window.innerWidth < 440;
const DISPLAY_W = typeof window !== 'undefined' && window.innerWidth < 400 ? window.innerWidth - 32 : 380;
const DISPLAY_H = typeof window !== 'undefined' && window.innerWidth < 400 ? window.innerWidth - 32 : 380;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

const HANDLE_CURSORS: Record<Handle, string> = {
  tl: 'nw-resize', tc: 'n-resize', tr: 'ne-resize',
  ml: 'w-resize',                  mr: 'e-resize',
  bl: 'sw-resize', bc: 's-resize', br: 'se-resize',
  move: 'move',
};

function projectFootprintCoords(
  polygonCoordinates: [number, number][],
  centerLat: number,
  centerLng: number,
  zoom: number,
  crop: Crop,
  bgMapW: number,
  bgMapH: number,
  naturalWidth: number,
  naturalHeight: number
) {
  const latLngToMercator = (lat: number, lng: number, z: number) => {
    const x = (lng + 180) / 360 * Math.pow(2, z) * 256;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z) * 256;
    return { x, y };
  };

  const centerMerc = latLngToMercator(centerLat, centerLng, zoom);

  return polygonCoordinates.map(([lng, lat]) => {
    const ptMerc = latLngToMercator(lat, lng, zoom);
    const dx = ptMerc.x - centerMerc.x;
    const dy = ptMerc.y - centerMerc.y;

    const dx_natural = dx * 2;
    const dy_natural = dy * 2;

    const x_natural = naturalWidth / 2 + dx_natural;
    const y_natural = naturalHeight / 2 + dy_natural;

    const cropCenterX = (crop.x + crop.w / 2) * naturalWidth;
    const cropCenterY = (crop.y + crop.h / 2) * naturalHeight;
    const cropW = crop.w * naturalWidth;
    const cropH = crop.h * naturalHeight;

    const logicalX = 50 + ((x_natural - cropCenterX) / cropW) * bgMapW;
    const logicalY = 50 + ((y_natural - cropCenterY) / cropH) * bgMapH;

    return { x: logicalX, y: logicalY };
  });
}

export function HouseOutlineMap({ address, appointmentId, customerId, onManualSketch, onImportImage, onAutoOutline, autoApplyOnLoad, onGeoReady }: Props) {
  const [query, setQuery]         = useState('');
  const [geo, setGeo]             = useState<GeoResult | null>(null);
  const [imageUrl, setImageUrl]   = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [capturing, setCapturing] = useState(false);
  const [crop, setCrop]           = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [mapZoom, setMapZoom]     = useState(20);

  const [detectingOutline, setDetectingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const dragRef      = useRef<{
    handle: Handle;
    startX: number; startY: number;
    startCrop: Crop;
  } | null>(null);

  const getToken = () => localStorage.getItem('wwa_token') || '';

  const buildImageUrl = useCallback((lat: number, lng: number, zoomLevel: number) =>
    `/api/house-outline/static-image?lat=${lat}&lng=${lng}&zoom=${zoomLevel}&w=600&h=840&token=${encodeURIComponent(getToken())}&cb=${Date.now()}`,
  []);

  const handleGeocode = useCallback(async (addr: string) => {
    if (!addr.trim()) return;
    setLoading(true); setError(''); setImageUrl(''); setGeo(null);
    setImageLoaded(false); setCrop({ x: 0, y: 0, w: 1, h: 1 });
    try {
      const token = getToken();
      const res = await fetch('/api/house-outline/from-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: addr, appointmentId, customerId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Geocoding failed');
      const g: GeoResult = { lat: data.lat, lng: data.lng, formattedAddress: data.formattedAddress };
      setGeo(g);
      const url = buildImageUrl(g.lat, g.lng, mapZoom);
      setImageUrl(url);
      onGeoReady?.(url);  // let parent use the URL directly (e.g. as CSS background)
    } catch (err: any) {
      setError(err.message || 'Could not find address');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, customerId, buildImageUrl]);

  useEffect(() => {
    if (address) { setQuery(address); handleGeocode(address); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Handle zoom changes without re-geocoding
  useEffect(() => {
    if (geo) {
      setImageUrl(buildImageUrl(geo.lat, geo.lng, mapZoom));
      setImageLoaded(false);
    }
  }, [mapZoom, geo, buildImageUrl]);

  // ── Crop drag logic ─────────────────────────────────────────────────────────
  const hitHandle = useCallback((px: number, py: number): Handle | null => {
    const cx = crop.x * DISPLAY_W;
    const cy = crop.y * DISPLAY_H;
    const cw = crop.w * DISPLAY_W;
    const ch = crop.h * DISPLAY_H;
    const hs = HANDLE_SIZE + 10; // larger hit area for mobile fingers

    const handles: [Handle, number, number][] = [
      ['tl', cx,        cy       ], ['tc', cx+cw/2,   cy       ], ['tr', cx+cw,    cy       ],
      ['ml', cx,        cy+ch/2  ],                                ['mr', cx+cw,    cy+ch/2  ],
      ['bl', cx,        cy+ch    ], ['bc', cx+cw/2,   cy+ch    ], ['br', cx+cw,    cy+ch    ],
    ];
    for (const [name, hx, hy] of handles) {
      if (Math.abs(px - hx) < hs && Math.abs(py - hy) < hs) return name;
    }
    // Inside crop area → move
    if (px > cx && px < cx+cw && py > cy && py < cy+ch) return 'move';
    return null;
  }, [crop]);

  // ── Mouse down (desktop) ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const handle = hitHandle(px, py);
    if (!handle) return;
    e.preventDefault();
    dragRef.current = { handle, startX: px, startY: py, startCrop: { ...crop } };
    setIsDragging(true);
  }, [hitHandle, crop]);

  // ── Touch start (mobile) ──
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const px = touch.clientX - rect.left;
    const py = touch.clientY - rect.top;
    const handle = hitHandle(px, py);
    if (!handle) return;
    e.preventDefault(); // prevent scroll when dragging a handle
    dragRef.current = { handle, startX: px, startY: py, startCrop: { ...crop } };
    setIsDragging(true);
  }, [hitHandle, crop]);

  useEffect(() => {
    // Shared move handler — works for both Mouse and Touch events
    const applyMove = (clientX: number, clientY: number) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const dx = (px - dragRef.current.startX) / DISPLAY_W;
      const dy = (py - dragRef.current.startY) / DISPLAY_H;
      const sc = dragRef.current.startCrop;
      const minW = MIN_CROP / DISPLAY_W;
      const minH = MIN_CROP / DISPLAY_H;

      setCrop(() => {
        let { x, y, w, h } = sc;
        const handle = dragRef.current!.handle;

        if (handle === 'move') {
          x = clamp(sc.x + dx, 0, 1 - sc.w);
          y = clamp(sc.y + dy, 0, 1 - sc.h);
        }
        if (handle === 'tl' || handle === 'ml' || handle === 'bl') {
          const newX = clamp(sc.x + dx, 0, sc.x + sc.w - minW);
          w = sc.w + (sc.x - newX); x = newX;
        }
        if (handle === 'tr' || handle === 'mr' || handle === 'br') {
          w = clamp(sc.w + dx, minW, 1 - sc.x);
        }
        if (handle === 'tl' || handle === 'tc' || handle === 'tr') {
          const newY = clamp(sc.y + dy, 0, sc.y + sc.h - minH);
          h = sc.h + (sc.y - newY); y = newY;
        }
        if (handle === 'bl' || handle === 'bc' || handle === 'br') {
          h = clamp(sc.h + dy, minH, 1 - sc.y);
        }
        return { x, y, w: clamp(w, minW, 1), h: clamp(h, minH, 1) };
      });
    };

    const onMouseMove = (e: MouseEvent) => applyMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      e.preventDefault(); // prevent page scroll while dragging
      applyMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onUp = () => { 
      dragRef.current = null; 
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, []);

  // Dynamic cursor on the container
  const [cursor, setCursor] = useState('crosshair');
  const onMouseMoveContainer = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const h = hitHandle(e.clientX - rect.left, e.clientY - rect.top);
    setCursor(h ? HANDLE_CURSORS[h] : 'crosshair');
  }, [hitHandle]);

  // ── Capture ─────────────────────────────────────────────────────────────────
  // Apply → close immediately. No intermediate state, no "Start Drawing" delay.
  const handleCapture = useCallback(async () => {
    if (!imgRef.current || !onImportImage) return;
    const img = imgRef.current;
    if (!img.complete || !img.naturalWidth) return;
    setCapturing(true);
    try {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const srcX = Math.round(crop.x * nw);
      const srcY = Math.round(crop.y * nh);
      const srcW = Math.round(crop.w * nw);
      const srcH = Math.round(crop.h * nh);

      const offscreen = document.createElement('canvas');
      offscreen.width  = srcW;
      offscreen.height = srcH;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      const dataUrl = offscreen.toDataURL('image/png');
      // Apply the image and close the panel immediately — no delay, no extra steps
      onImportImage(dataUrl);
      onManualSketch?.();
    } finally {
      setCapturing(false);
    }
  }, [crop, onImportImage, onManualSketch]);

  const handleAutoOutline = async () => {
    if (!geo) return;
    setDetectingOutline(true);
    setOutlineError('');
    try {
      const token = getToken();
      const res = await fetch('/api/house-outline/footprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat: geo.lat, lng: geo.lng })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to detect footprint.');

      const buildings = data.features || [];
      if (buildings.length === 0) {
        throw new Error('No automatic outline found. Use Straight Line tool to trace.');
      }

      // Find the closest building footprint
      const building = buildings[0];
      if (!building || !building.geometry || !building.geometry.coordinates) {
        throw new Error('No automatic outline found. Use Straight Line tool to trace.');
      }

      let coords: [number, number][] = [];
      const geom = building.geometry;
      if (geom.type === 'Polygon') {
        coords = geom.coordinates[0];
      } else if (geom.type === 'MultiPolygon') {
        coords = geom.coordinates[0][0];
      }

      if (!coords || coords.length < 3) {
        throw new Error('No automatic outline found. Use Straight Line tool to trace.');
      }

      // Project coordinates using natural width and height
      const img = imgRef.current;
      const naturalW = img?.naturalWidth || 1280;
      const naturalH = img?.naturalHeight || 1280;

      const projected = projectFootprintCoords(
        coords,
        geo.lat,
        geo.lng,
        mapZoom,
        crop,
        900,
        900 * (naturalH / naturalW),
        naturalW,
        naturalH
      );

      if (onAutoOutline) {
        onAutoOutline(projected, 'mapbox');
      }
    } catch (err: any) {
      setOutlineError(err.message || 'Error detecting outline.');
    } finally {
      setDetectingOutline(false);
    }
  };


  // Handle positions in px for rendering
  const cx = crop.x * DISPLAY_W;
  const cy = crop.y * DISPLAY_H;
  const cw = crop.w * DISPLAY_W;
  const ch = crop.h * DISPLAY_H;

  const handles: [Handle, number, number][] = [
    ['tl', cx,      cy     ], ['tc', cx+cw/2, cy     ], ['tr', cx+cw,  cy     ],
    ['ml', cx,      cy+ch/2],                            ['mr', cx+cw,  cy+ch/2],
    ['bl', cx,      cy+ch  ], ['bc', cx+cw/2, cy+ch  ], ['br', cx+cw,  cy+ch  ],
  ];

  const S = {
    wrap: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
    row:  { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    input: {
      flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.875rem',
      border: '1px solid var(--border)', borderRadius: '6px',
      background: 'var(--card)', color: 'var(--text)', outline: 'none',
    } as React.CSSProperties,
    btn: (primary?: boolean): React.CSSProperties => ({
      padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
      border: primary ? 'none' : '1px solid var(--border)', borderRadius: '6px',
      cursor: 'pointer',
      background: primary ? 'var(--blue)' : 'var(--card)',
      color: primary ? '#fff' : 'var(--text)', whiteSpace: 'nowrap' as const,
    }),
  };

  return (
    <div style={S.wrap}>
      {/* Address search */}
      <div style={S.row}>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGeocode(query)}
          placeholder="Enter property address…" style={S.input} />
        <button onClick={() => handleGeocode(query)} disabled={loading || !query.trim()} style={S.btn(true)}>
          {loading ? '…' : 'Find'}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</div>}
      {geo && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>📍 {geo.formattedAddress}</div>}

      {imageUrl && (
        <>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
            🖱 Drag the <strong style={{ color: 'var(--muted)' }}>corner &amp; edge handles</strong> to crop · Drag inside to move selection
          </div>

          {/* ── Crop canvas ─────────────────────────────────── */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: `${DISPLAY_W}px`,
              height: `${DISPLAY_H}px`,
              margin: '0 auto',
              cursor,
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: '#f8fafc',
              flexShrink: 0,
              userSelect: 'none',
              touchAction: 'none', // prevent scroll interference during touch crop
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMoveContainer}
            onTouchStart={onTouchStart}
          >
            {/* Hidden natural-size img for canvas capture — no crossOrigin to avoid CORS on auth'd URL */}
            <img ref={imgRef} src={imageUrl} alt=""
              style={{ display: 'none' }}
             onLoad={() => {
               setImageLoaded(true);
               // If autoApplyOnLoad is set, push the full image to canvas immediately
               if (autoApplyOnLoad && onImportImage) {
                 // Use a tiny delay so imgRef is fully settled
                 setTimeout(() => {
                   const img = imgRef.current;
                   if (!img || !img.complete || !img.naturalWidth) return;
                   const offscreen = document.createElement('canvas');
                   offscreen.width = img.naturalWidth;
                   offscreen.height = img.naturalHeight;
                   const ctx2d = offscreen.getContext('2d');
                   if (!ctx2d) return;
                   ctx2d.drawImage(img, 0, 0);
                   onImportImage(offscreen.toDataURL('image/png'));
                   // Let parent decide whether to close the panel
                 }, 80);
               }
             }} />

            {/* Visible display image */}
            <img src={imageUrl} alt="Property outline"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />

            {imageLoaded && (
              <>
                {/* Dark overlay outside crop */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    <mask id="crop-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect x={cx} y={cy} width={cw} height={ch} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#crop-mask)" />
                  {/* Crop border */}
                  <rect x={cx} y={cy} width={cw} height={ch}
                    fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" />
                  {/* Rule-of-thirds grid */}
                  <line x1={cx + cw/3} y1={cy} x2={cx + cw/3} y2={cy+ch} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1={cx + 2*cw/3} y1={cy} x2={cx + 2*cw/3} y2={cy+ch} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1={cx} y1={cy + ch/3} x2={cx+cw} y2={cy + ch/3} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1={cx} y1={cy + 2*ch/3} x2={cx+cw} y2={cy + 2*ch/3} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                </svg>

                {/* Handles */}
                {handles.map(([name, hx, hy]) => (
                  <div key={name} style={{
                    position: 'absolute',
                    left:   hx - HANDLE_SIZE / 2,
                    top:    hy - HANDLE_SIZE / 2,
                    width:  HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    background: '#fff',
                    border: '2.5px solid #3b82f6',
                    borderRadius: '3px',
                    cursor: HANDLE_CURSORS[name],
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }} />
                ))}
              </>
            )}
          </div>

          {/* Crop info and Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setMapZoom(z => Math.max(17, z - 1))} style={{...S.btn(false), padding: '0.2rem 0.5rem'}} title="Zoom Out">➖</button>
              <span style={{ fontWeight: 600, minWidth: '4rem', textAlign: 'center' }}>Zoom: {mapZoom}</span>
              <button onClick={() => setMapZoom(z => Math.min(21, z + 1))} style={{...S.btn(false), padding: '0.2rem 0.5rem'}} title="Zoom In">➕</button>
            </div>
            <div>
              Crop: {Math.round(crop.w * 100)}% × {Math.round(crop.h * 100)}%
              &nbsp;·&nbsp;
              <button onClick={() => setCrop({ x: 0, y: 0, w: 1, h: 1 })}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                Reset
              </button>
            </div>
          </div>

          {/* Apply & Auto-Outline buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {onImportImage && (
              <button onClick={handleCapture} disabled={capturing || !imageLoaded}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700,
                  border: 'none', borderRadius: '8px',
                  cursor: capturing ? 'not-allowed' : 'pointer',
                  background: '#10b981',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                }}>
                {capturing ? '⏳ Syncing…' : '✓ Auto-Applied to Canvas'}
              </button>
            )}

            {onAutoOutline && (
              <button onClick={handleAutoOutline} disabled={detectingOutline || !imageLoaded}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700,
                  border: 'none', borderRadius: '8px',
                  cursor: detectingOutline ? 'not-allowed' : 'pointer',
                  background: 'var(--blue)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.15)',
                }}>
                {detectingOutline ? '⏳ Detecting Footprint…' : '🏠 Auto Outline from Map'}
              </button>
            )}

            {outlineError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.25rem', textAlign: 'center', fontWeight: 'bold' }}>
                ⚠️ {outlineError}
              </div>
            )}
          </div>
        </>
      )}

      {!imageUrl && !loading && (
        <div style={{
          background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)',
          padding: '2rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem',
        }}>
          Property image will auto-load from the appointment address.
        </div>
      )}

      {onManualSketch && (
        <button onClick={onManualSketch} style={S.btn(false)}>Skip — Sketch Manually</button>
      )}
    </div>
  );
}
