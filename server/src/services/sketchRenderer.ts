import { createCanvas } from '@napi-rs/canvas';
import { prisma } from '../index.js';

// ── Canvas dimensions (pixels) ──────────────────────────────────────────────
const W = 800;
const H = 500;

function markerColor(markerSymbol: string | null, markerType: string | null): string {
  const sym = (markerSymbol || markerType || '').toLowerCase();
  if (sym.includes('door') || sym.includes('patio')) return '#dc2626'; // RED
  if (sym.includes('picture') || sym.includes('fixed') || sym.includes('custom')) return '#0891b2'; // CYAN
  if (sym.includes('casement') || sym.includes('special')) return '#7c3aed'; // PURPLE
  return '#3b82f6'; // BLUE
}

function markerLabel(marker: any): string {
  if (marker.markerNumber != null) return `#${marker.markerNumber}`;
  if (marker.markerLabel) return marker.markerLabel.slice(0, 3);
  return '?';
}

function getMarkerTypeLabel(marker: any): string {
  const sym = (marker.markerSymbol || marker.markerType || '').toLowerCase();
  if (sym.includes('dh') || sym.includes('double_hung')) return 'DH';
  if (sym.includes('casement')) return 'CAS';
  if (sym.includes('picture') || sym.includes('fixed')) return 'PIC';
  if (sym.includes('awning')) return 'AWN';
  if (sym.includes('oriel')) return 'ORIEL';
  if (sym.includes('front_door') || sym.includes('entry')) return 'FD';
  if (sym.includes('patio_door') || sym.includes('sliding')) return 'PD';
  if (sym.includes('special') || sym.includes('shape')) return 'SS';
  if (sym.includes('slider') || sym.includes('sl')) return 'SLD';
  return (marker.markerSymbol || marker.markerType || 'W').toUpperCase().slice(0, 5);
}

// Excel B2:Q19 box aspect ratio is ~651x215. Let's make our export canvas match exactly
// so that it obscures the placeholder image completely.
const EXCEL_W = 1302; // 651 * 2 for high-res
const EXCEL_H = 430;  // 215 * 2 for high-res

/**
 * Builds the final, authoritative Excel sketch image.
 * Matches the B2:Q19 aspect ratio to obscure the gray map placeholder.
 * Draws the client upload (map+strokes) as background, then overlays fresh markers.
 */
export async function buildComposedSketchImage(
  exportData: any,
  activeMarkers: any[],
  appointmentId: string,
  companyId: string
): Promise<Buffer | null> {
  const { loadImage } = await import('@napi-rs/canvas');
  const canvas = createCanvas(EXCEL_W, EXCEL_H);
  const ctx = canvas.getContext('2d');

  // Fill with solid white to fully obscure any placeholder behind it
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, EXCEL_W, EXCEL_H);

  let bgImageLoaded = false;
  let clientBuffer: Buffer | null = null;
  let transform: any = null;

  try {
    const { getLatestClientSketchBuffer } = await import('./sketchExport.service.js');
    clientBuffer = await getLatestClientSketchBuffer(appointmentId, companyId);
    
    if (clientBuffer) {
      // Find transform from DB
      const latestSketch = await prisma.sketchExport.findFirst({
        where: { appointmentId, companyId, sourceHash: 'client_upload' },
        orderBy: { createdAt: 'desc' },
      });
      if (latestSketch && latestSketch.metadataJson) {
        try {
          const meta = typeof latestSketch.metadataJson === 'string' ? JSON.parse(latestSketch.metadataJson) : latestSketch.metadataJson;
          if (meta.transform) transform = meta.transform;
        } catch (e) { console.debug("[swallowed error]", e); }
      }
    }
  } catch (err) {
    console.warn('[sketchRenderer] Failed to load client buffer for composite:', err);
  }

  // Draw background image if available
  let drawScale = 1;
  let dx = 0;
  let dy = 0;
  let imgW = 0;
  let imgH = 0;
  if (clientBuffer) {
    try {
      const img = await loadImage(clientBuffer);
      // Calculate contain-fit to preserve strokes' aspect ratio
      drawScale = Math.min(EXCEL_W / img.width, EXCEL_H / img.height);
      imgW = img.width;
      imgH = img.height;
      const drawW = img.width * drawScale;
      const drawH = img.height * drawScale;
      dx = (EXCEL_W - drawW) / 2;
      dy = (EXCEL_H - drawH) / 2;
      
      ctx.drawImage(img, dx, dy, drawW, drawH);
      bgImageLoaded = true;
    } catch (e) { console.debug("[swallowed error]", e); }
  }

  const PAD = Math.round(EXCEL_H * 0.1);
  if (!bgImageLoaded) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.setLineDash([]);
    ctx.strokeRect(PAD, PAD, EXCEL_W - PAD * 2, EXCEL_H - PAD * 2);
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sketch pending — measurements loaded', EXCEL_W / 2, PAD / 2);
  }

  if (bgImageLoaded) {
    return canvas.toBuffer('image/png');
  }

  if (activeMarkers && activeMarkers.length > 0) {
    const validMarkers = activeMarkers.filter(m => m.markerNumber != null);
    
    if (bgImageLoaded && transform) {
      // We have the map and the transform, so draw markers at their accurate projected positions
      const zoom = transform.zoom || 1;
      const panX = transform.panX || 0;
      const panY = transform.panY || 0;
      const dpr = transform.dpr || 1;

      const toScreenX = (x: number) => {
        const pixelOnCanvasX = (x * zoom + panX) * dpr;
        return dx + (pixelOnCanvasX * drawScale);
      };
      const toScreenY = (y: number) => {
        const pixelOnCanvasY = (y * zoom + panY) * dpr;
        return dy + (pixelOnCanvasY * drawScale);
      };

      validMarkers.forEach((m) => {
        const cx = toScreenX(m.x);
        const cy = toScreenY(m.y);
        
        drawMarkerOnCanvasContext(ctx, m, cx, cy);
      });
    } else {
      // Fallback: draw across the bottom
      const rowH = 120;
      const spacing = 100;
      const totalW = validMarkers.length * spacing;
      const startX = Math.max(PAD, (EXCEL_W - totalW) / 2);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, EXCEL_H - rowH - 20, EXCEL_W, rowH + 20);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${validMarkers.length} Confirmed Opening${validMarkers.length !== 1 ? 's' : ''}`, 20, EXCEL_H - rowH - 30);

      validMarkers.forEach((m, idx) => {
        const cx = startX + (idx * spacing) + (spacing / 2);
        const cy = EXCEL_H - (rowH / 2) - 10;
        
        drawMarkerOnCanvasContext(ctx, m, cx, cy);
      });
    }
  }

  return canvas.toBuffer('image/png');
}

function drawMarkerOnCanvasContext(ctx: any, m: any, cx: number, cy: number) {
  const sym = (m.markerSymbol || m.markerType || '').toLowerCase();
  const bgCol = markerColor(m.markerSymbol, m.markerType);
  
  const mw = 40;
  const mh = 50;
  const mx = cx - mw / 2;
  const my = cy - mh / 2;

  // Marker Body
  ctx.fillStyle = bgCol;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, 4);
  ctx.fill();
  ctx.stroke();

  // Type Label (Top)
  const typeLabel = getMarkerTypeLabel(m);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeLabel, cx, my + 10);

  // Number (Bottom)
  const label = markerLabel(m);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(label, cx, my + mh - 14);
}

export async function generateSketchImage(
  appointmentId: string,
  elevation: 'front' | 'rear' | 'left' | 'right' | 'garage' | 'other' | 'all' = 'front',
  normalizedMarkers?: any[]
): Promise<Buffer | null> {
  try {
    if (normalizedMarkers) {
      if (normalizedMarkers.length === 0) {
        return renderPlaceholder('Sketch has no markers yet.');
      }
      return renderMarkers(normalizedMarkers, elevation);
    }

    const sketch = await prisma.formSketch.findFirst({
      where: { appointmentId },
      include: {
        markers: { orderBy: { markerNumber: 'asc' } },
      },
    });

    if (!sketch) {
      return renderPlaceholder('No sketch data for this appointment.');
    }

    const allMarkers = sketch.markers || [];
    const targetElev = elevation.toLowerCase();
    const markers = targetElev === 'all'
      ? allMarkers
      : allMarkers.filter((m: any) => {
          if (!m.elevation) return true;
          const eVal = m.elevation.trim().toLowerCase();
          return eVal === targetElev || eVal === '' || (targetElev === 'front' && eVal === 'front elevation');
        });

    if (markers.length === 0 && allMarkers.length > 0) {
      const frontMarkers = allMarkers.filter((m: any) => {
        if (!m.elevation) return true;
        const eVal = m.elevation.trim().toLowerCase();
        return eVal === 'front' || eVal === 'front elevation';
      });
      if (frontMarkers.length > 0) {
        return renderMarkers(frontMarkers, 'front');
      }
      return renderMarkers(allMarkers, 'all elevations');
    }

    if (markers.length === 0) {
      return renderPlaceholder('Sketch has no markers yet.');
    }

    return renderMarkers(markers, elevation);
  } catch (err) {
    console.error('[sketchRenderer] Failed to generate sketch image:', err);
    return null;
  }
}

async function renderPlaceholder(message: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.setLineDash([15, 15]);
  ctx.strokeRect(10, 10, W - 20, H - 20);

  ctx.fillStyle = '#4b5563';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('No sketch available.', W / 2, H / 2 - 20);
  
  ctx.font = '16px Arial, sans-serif';
  const line2 = message.length > 40 ? message.slice(0, 40) : message;
  ctx.fillText(line2, W / 2, H / 2 + 15);

  return canvas.toBuffer('image/png');
}

const RENDERER_VERSION = 'print-readable-final';

async function renderMarkers(markers: any[], elevLabel: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const xs: number[] = markers.map((m: any) => m.x || 0).filter((v: number) => isFinite(v));
  const ys: number[] = markers.map((m: any) => m.y || 0).filter((v: number) => isFinite(v));

  if (xs.length === 0 || ys.length === 0) {
    return renderPlaceholder('Marker positions not yet saved.');
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const PAD = 80;
  const drawW = W - PAD * 2;
  const drawH = H - PAD * 2 - 40;

  const rangeX = Math.max(maxX - minX, 20);
  const rangeY = Math.max(maxY - minY, 20);
  const scaleX = drawW / rangeX;
  const scaleY = drawH / rangeY;
  const scale = Math.min(scaleX, scaleY, 5);

  const toCanvasX = (nx: number) => Math.round(PAD + (nx - minX) * scale + drawW / 2 - (rangeX * scale) / 2);
  const toCanvasY = (ny: number) => Math.round(PAD + 40 + (ny - minY) * scale + drawH / 2 - (rangeY * scale) / 2);

  const houseX = PAD - 12;
  const houseY = PAD + 28;
  const houseW = W - PAD * 2 + 24;
  const houseH = H - PAD * 2 - 8;
  
  // Draw house outline border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14;
  ctx.setLineDash([]);
  ctx.strokeRect(houseX, houseY, houseW, houseH);

  // Draw texts
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Elevation: ${elevLabel.toUpperCase()}`, PAD, 16);

  ctx.textAlign = 'right';
  ctx.fillText(`${markers.length} opening${markers.length !== 1 ? 's' : ''}`, W - PAD, 16);

  ctx.fillStyle = '#4b5563';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText(RENDERER_VERSION, W - PAD, H - 24);

  // Draw markers
  for (const m of markers) {
    if (!isFinite(m.x) || !isFinite(m.y)) continue;
    const cx = toCanvasX(m.x);
    const cy = toCanvasY(m.y);

    const sym = (m.markerSymbol || m.markerType || '').toLowerCase();
    const isDoor = sym.includes('door') || sym.includes('patio');
    const isMull = sym.includes('mull') || sym.includes('twin') || sym.includes('triple');

    const mw = isMull ? 120 : (isDoor ? 80 : 80);
    const mh = isDoor ? 140 : 100;
    const mx = cx - mw / 2;
    const my = cy - mh / 2;

    const bgCol = markerColor(m.markerSymbol, m.markerType);

    // Marker Body
    ctx.fillStyle = bgCol;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 6);
    ctx.fill();
    ctx.stroke();

    // Marker Specific Lines
    ctx.strokeStyle = '#ffffff';
    if (sym.includes('dh') || sym.includes('sh') || sym.includes('double_hung') || sym.includes('single_hung')) {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 4, cy); ctx.lineTo(mx + mw - 4, cy); ctx.stroke();
    } else if (sym.includes('slider') || sym.includes('sl')) {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, my + 4); ctx.lineTo(cx, my + mh - 4); ctx.stroke();
    } else if (sym.includes('casement') || sym.includes('cas')) {
      // Triangle pointing left (hinged right)
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + mw - 6, my + 6); ctx.lineTo(mx + 8, cy); ctx.lineTo(mx + mw - 6, my + mh - 6); ctx.stroke();
      // Knob on the left
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(mx + 10, cy, 3, 0, Math.PI * 2); ctx.fill();
    } else if (sym.includes('picture') || sym.includes('fixed') || sym.includes('pic')) {
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(mx + 6, my + 6, mw - 12, mh - 12, 4); ctx.stroke(); ctx.setLineDash([]);
    } else if (sym.includes('awning') || sym.includes('awn')) {
      // V shape pointing down
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 6, my + 6); ctx.lineTo(cx, my + mh - 12); ctx.lineTo(mx + mw - 6, my + 6); ctx.stroke();
    } else if (sym.includes('oriel')) {
      // Dotted horizontal line at top third
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 4, my + mh / 3 + 4); ctx.lineTo(mx + mw - 4, my + mh / 3 + 4); ctx.stroke(); ctx.setLineDash([]);
    } else if (sym.includes('door') || sym.includes('entry') || sym.includes('patio')) {
      // Yellow knob on the right
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(mx + mw - 10, cy, 4, 0, Math.PI * 2); ctx.fill();
      // Yellow arrow above
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, my - 20);
      ctx.lineTo(cx - 6, my - 10);
      ctx.lineTo(cx - 2, my - 10);
      ctx.lineTo(cx - 2, my - 4);
      ctx.lineTo(cx + 2, my - 4);
      ctx.lineTo(cx + 2, my - 10);
      ctx.lineTo(cx + 6, my - 10);
      ctx.closePath();
      ctx.fill();
    } else {
      // Crosshair default
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 4, cy); ctx.lineTo(mx + mw - 4, cy); ctx.moveTo(cx, my + 4); ctx.lineTo(cx, my + mh - 4); ctx.stroke();
    }

    // Type Label (Top)
    const typeLabel = getMarkerTypeLabel(m);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeLabel, cx, my + 20);

    // Number (Bottom)
    const label = markerLabel(m);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText(label, cx, my + mh - 20);
  }

  return canvas.toBuffer('image/png');
}
