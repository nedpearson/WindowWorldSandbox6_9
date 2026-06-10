/**
 * Standalone Print-Safe SVG Sketch Renderer
 * 
 * Generates a standalone, print-safe, high-contrast SVG representation
 * of sketch markers, drawing strokes, and house outline.
 * 
 * No browser CSS, React runtime, or external image dependencies.
 */

import { prisma } from '../index.js';

export interface SketchMarkerData {
  id: string;
  markerType: string;
  markerNumber?: number | null;
  markerSymbol?: string | null;
  markerLabel?: string | null;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  elevation?: string | null;
  links?: { openingId?: string | null; opening?: { deletedAt?: Date | string | null } | null }[] | null;
}

export interface SketchStrokePoint {
  x: number;
  y: number;
}

export interface SketchStrokeData {
  points: SketchStrokePoint[];
  color?: string;
  width?: number;
  opacity?: number;
}

export function normalizeStrokeForPrint(stroke: SketchStrokeData): SketchStrokeData {
  return {
    ...stroke,
    color: '#000000',
    width: 10,
    opacity: 1
  };
}

export interface GeneratePrintSafeSvgOptions {
  markers: SketchMarkerData[];
  strokes?: SketchStrokeData[];
  houseOutline?: SketchStrokePoint[];
  elevation?: string;
  width?: number;
  height?: number;
}

/**
 * Escapes special characters for safe use in SVG text.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getMarkerTypeLabel(m: SketchMarkerData): string {
  const sym = (m.markerSymbol || m.markerType || '').toLowerCase();
  if (sym.includes('dh') || sym.includes('double_hung')) return 'DH';
  if (sym.includes('casement')) return 'CAS';
  if (sym.includes('picture') || sym.includes('fixed')) return 'PIC';
  if (sym.includes('awning')) return 'AWN';
  if (sym.includes('oriel')) return 'ORIEL';
  if (sym.includes('front_door') || sym.includes('entry_door')) return 'FD';
  if (sym.includes('patio_door') || sym.includes('sliding_door')) return 'PD';
  if (sym.includes('special') || sym.includes('shape')) return 'SS';
  if (sym.includes('slider')) return 'SLD';
  return (m.markerSymbol || m.markerType || 'W').toUpperCase().slice(0, 5);
}

function getMarkerFillColor(m: SketchMarkerData): string {
  const sym = (m.markerSymbol || m.markerType || '').toLowerCase();
  if (sym.includes('door') || sym.includes('patio')) {
    if (sym === 'front_door' || sym.includes('entry')) return '#DC2626'; // Front door (Green in live, Red here for print safety)
    return '#DC2626'; // other door
  }
  if (sym.includes('picture') || sym.includes('fixed') || sym.includes('custom')) return '#0891B2'; // picture/custom
  if (sym.includes('casement') || sym.includes('special')) return '#7C3AED'; // casement/special shape
  return '#3B82F6'; // default window
}

export function generatePrintSafeSketchSvg(opts: GeneratePrintSafeSvgOptions): string {
  const {
    markers = [],
    strokes = [],
    houseOutline = [],
    elevation = 'front',
    width = 900,
    height = 500,
  } = opts;

  // Outlier filter (Phase 5): ignore stray dots placed extremely far from markers.
  const markerXs = markers.map(m => m.x).filter(isFinite);
  const markerYs = markers.map(m => m.y).filter(isFinite);
  const minMarkerX = markerXs.length > 0 ? Math.min(...markerXs) : 0;
  const maxMarkerX = markerXs.length > 0 ? Math.max(...markerXs) : 100;
  const minMarkerY = markerYs.length > 0 ? Math.min(...markerYs) : 0;
  const maxMarkerY = markerYs.length > 0 ? Math.max(...markerYs) : 100;

  const isSafePoint = (px: number, py: number) => {
    if (markers.length > 0) {
      const minSafeX = Math.min(-100, minMarkerX - 150);
      const maxSafeX = Math.max(200, maxMarkerX + 150);
      const minSafeY = Math.min(-100, minMarkerY - 150);
      const maxSafeY = Math.max(200, maxMarkerY + 150);
      return px >= minSafeX && px <= maxSafeX && py >= minSafeY && py <= maxSafeY;
    }
    return px >= -200 && px <= 300 && py >= -200 && py <= 300;
  };

  // 1. Gather all coordinates to compute bounds
  let xs: number[] = [];
  let ys: number[] = [];

  for (const m of markers) {
    if (isFinite(m.x)) xs.push(m.x);
    if (isFinite(m.y)) ys.push(m.y);
  }

  if (Array.isArray(strokes)) {
    for (const stroke of strokes) {
      const points = Array.isArray(stroke) ? stroke : (stroke.points || []);
      for (const p of points) {
        const px = Array.isArray(p) ? p[0] : p.x;
        const py = Array.isArray(p) ? p[1] : p.y;
        if (isFinite(px) && isFinite(py) && isSafePoint(px, py)) {
          xs.push(px);
          ys.push(py);
        }
      }
    }
  }

  if (Array.isArray(houseOutline)) {
    for (const p of houseOutline) {
      const px = Array.isArray(p) ? p[0] : p.x;
      const py = Array.isArray(p) ? p[1] : p.y;
      if (isFinite(px) && isFinite(py) && isSafePoint(px, py)) {
        xs.push(px);
        ys.push(py);
      }
    }
  }

  // Fallbacks if no bounds
  if (xs.length === 0) xs = [0, 100];
  if (ys.length === 0) ys = [0, 100];

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);

  // Validation: detect far-away stray dots or invalid numbers
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY) || rangeX > 100000 || rangeY > 100000) {
    throw new Error('Sketch bounds computation failed: coordinates are invalid or contain extreme outliers.');
  }

  // 2. Coordinate mapping and scaling
  const PAD = 50;
  const drawW = width - PAD * 2;
  const drawH = height - PAD * 2;

  const scaleX = drawW / rangeX;
  const scaleY = drawH / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const toCanvasX = (x: number) => PAD + (x - minX) * scale + (drawW - rangeX * scale) / 2;
  const toCanvasY = (y: number) => PAD + (y - minY) * scale + (drawH - rangeY * scale) / 2;

  // SVG rendering starts
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff;" data-sketch-export-version="print-readable-v3">\n`;
  svg += `  <!-- sketch-export-version: print-readable-v3 -->\n`;

  // Draw houseOutline if present
  if (Array.isArray(houseOutline) && houseOutline.length > 0) {
    let d = '';
    let first = true;
    for (let i = 0; i < houseOutline.length; i++) {
      const p = houseOutline[i];
      const px = Array.isArray(p) ? p[0] : p.x;
      const py = Array.isArray(p) ? p[1] : p.y;
      if (!isSafePoint(px, py)) continue;
      const tx = toCanvasX(px);
      const ty = toCanvasY(py);
      if (first) {
        d += `M ${tx} ${ty}`;
        first = false;
      }
      else d += ` L ${tx} ${ty}`;
    }
    if (d) {
      svg += `  <!-- House Outline -->\n`;
      svg += `  <path d="${d}" stroke="#000000" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="1" />\n`;
    }
  }

  // Draw strokes if present
  if (Array.isArray(strokes) && strokes.length > 0) {
    svg += `  <!-- Hand-drawn strokes -->\n`;
    for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
      const stroke = normalizeStrokeForPrint(strokes[sIdx]);
      const points = Array.isArray(stroke) ? stroke : (stroke.points || []);
      if (points.length < 2) continue;

      let d = '';
      let first = true;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const px = Array.isArray(p) ? p[0] : p.x;
        const py = Array.isArray(p) ? p[1] : p.y;
        if (!isSafePoint(px, py)) continue;
        const tx = toCanvasX(px);
        const ty = toCanvasY(py);
        if (first) {
          d += `M ${tx} ${ty}`;
          first = false;
        }
        else d += ` L ${tx} ${ty}`;
      }

      if (d) {
        svg += `  <path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${stroke.opacity || 1}" />\n`;
      }
    }
  }

  // Draw active markers on top (Phase 3 Sizing & Formatting)
  svg += `  <!-- Active Markers -->\n`;
  const mw = 60;
  const mh = 78;

  for (const m of markers) {
    const cx = toCanvasX(m.x);
    const cy = toCanvasY(m.y);
    const mx = cx - mw / 2;
    const my = cy - mh / 2;

    const fillColor = getMarkerFillColor(m);
    const typeLabel = escapeXml(getMarkerTypeLabel(m));
    const numberText = m.markerNumber != null ? `#${m.markerNumber}` : '?';

    const mId = escapeXml(m.id);
    const opId = escapeXml(m.links?.[0]?.openingId || '');
    const opNum = m.markerNumber != null ? String(m.markerNumber) : '';

    svg += `  <g data-marker-id="${mId}" data-opening-id="${opId}" data-opening-number="${opNum}">\n`;
    
    // Outer border rect (width 60, height 78, stroke-width 3, bold black border)
    svg += `    <rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="4" fill="${fillColor}" stroke="#000000" stroke-width="3" />\n`;

    // Pane visual inside window markers
    if (m.markerType === 'window') {
      svg += `    <line x1="${mx}" y1="${cy}" x2="${mx + mw}" y2="${cy}" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />\n`;
      svg += `    <line x1="${cx}" y1="${my}" x2="${cx}" y2="${my + mh}" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />\n`;
    }

    // Bold type label centered (at least 20px, bold 900 white)
    svg += `    <text x="${cx}" y="${my + 39}" font-family="Inter, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${typeLabel}</text>\n`;

    // Marker opening number rendered below marker on a rounded white card backing (58x34) (Phase 4 & 5)
    const badgeW = 58;
    const badgeH = 34;
    const badgeX = cx - badgeW / 2;
    const badgeY = my + mh + 6;
    
    svg += `    <g data-opening-number-label="${opNum}">\n`;
    svg += `      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="6" fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />\n`;
    svg += `      <text x="${cx}" y="${badgeY + badgeH / 2}" font-family="Inter, sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle" dominant-baseline="middle">${escapeXml(numberText)}</text>\n`;
    svg += `    </g>\n`;
    
    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

export function normalizeSketchForDocumentExport(
  appointment: any,
  sketch: any,
  openings: any[]
): {
  activeMarkers: SketchMarkerData[];
  strokes: SketchStrokeData[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; rangeX: number; rangeY: number };
  openings: any[];
  warnings: string[];
} {
  const warnings: string[] = [];

  // 1. Gather all active markers from sketch
  const rawMarkers = sketch?.markers || [];
  const activeMarkersRaw = rawMarkers.filter((m: any) => {
    const isReal = m.markerType === 'window' || m.markerType === 'door';
    if (!isReal) return false;
    const linkedOp = m.links?.[0]?.opening;
    if (linkedOp && linkedOp.deletedAt !== null) return false;
    return true;
  });

  // Sort them by their existing markerNumber, then y, then x, then id to make it fully deterministic
  const activeMarkers = [...activeMarkersRaw].sort((a: any, b: any) => {
    if (a.markerNumber != null && b.markerNumber != null) {
      return a.markerNumber - b.markerNumber;
    }
    if (a.markerNumber != null) return -1;
    if (b.markerNumber != null) return 1;
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });

  // 2. Map marker numbers to a dense 1..N sequence for document export.
  const openingIdToSeqMap = new Map<string, number>();
  
  const normalizedActiveMarkers: SketchMarkerData[] = activeMarkers.map((m: any, index: number) => {
    const seqNum = index + 1;
    
    // Track linked openingId
    const opId = m.links?.[0]?.openingId;
    if (opId) {
      openingIdToSeqMap.set(opId, seqNum);
    }

    return {
      id: m.id,
      markerType: m.markerType,
      markerNumber: seqNum,
      markerSymbol: m.markerSymbol,
      markerLabel: `#${seqNum}`,
      x: m.x,
      y: m.y,
      width: m.width,
      height: m.height,
      elevation: m.elevation,
      links: m.links
    };
  });

  // 3. Normalize openings
  // For each opening, if it's linked to an active marker, override its openingNumber with the sequential number.
  // If it's not linked, warn/keep its number.
  const normalizedOpenings = openings.map((op: any) => {
    const seqNum = openingIdToSeqMap.get(op.id);
    if (seqNum !== undefined) {
      return {
        ...op,
        openingNumber: seqNum
      };
    } else {
      warnings.push(`Opening ID ${op.id} is not linked to any active sketch marker.`);
      return op;
    }
  }).sort((a: any, b: any) => (a.openingNumber || 0) - (b.openingNumber || 0));

  // 4. Calculate bounds
  let xs: number[] = [];
  let ys: number[] = [];

  for (const m of normalizedActiveMarkers) {
    if (isFinite(m.x)) xs.push(m.x);
    if (isFinite(m.y)) ys.push(m.y);
  }

  // Fallbacks if no bounds
  if (xs.length === 0) xs = [0, 100];
  if (ys.length === 0) ys = [0, 100];

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);

  return {
    activeMarkers: normalizedActiveMarkers,
    strokes: [],
    bounds: { minX, maxX, minY, maxY, rangeX, rangeY },
    openings: normalizedOpenings,
    warnings
  };
}

export async function validateSketchForExport(appointmentId: string, companyId: string): Promise<{
  success: boolean;
  code?: string;
  issues?: { severity: string; field: string; message: string }[];
  activeMarkers?: SketchMarkerData[];
  svgString?: string;
}> {
  // Query sketch with markers and opening links
  const sketch = await prisma.formSketch.findFirst({
    where: { appointmentId },
    include: {
      markers: {
        include: {
          links: {
            include: {
              opening: true
            }
          }
        }
      }
    }
  });

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, ...(companyId && companyId !== 'any' && { companyId }) },
    select: { id: true, companyId: true }
  });

  if (!appt) {
    return {
      success: false,
      code: 'SKETCH_EXPORT_RENDER_FAILED',
      issues: [
        {
          severity: 'blocking',
          field: 'sketchExport',
          message: 'Sketch export failed: appointment not found.'
        }
      ]
    };
  }

  const rawActiveMarkers = sketch
    ? sketch.markers.filter((m: any) => m.markerType === 'window' || m.markerType === 'door')
    : [];

  const activeMarkers = sketch
    ? sketch.markers.filter((m: any) => {
        const isReal = m.markerType === 'window' || m.markerType === 'door';
        if (!isReal) return false;
        const linkedOp = m.links?.[0]?.opening;
        if (linkedOp && linkedOp.deletedAt !== null) return false;
        return true;
      })
    : [];

  // Exclude deleted markers / active visible openings mismatch check
  if (rawActiveMarkers.length > 0 && activeMarkers.length === 0) {
    return {
      success: false,
      code: 'SKETCH_EXPORT_RENDER_FAILED',
      issues: [
        {
          severity: 'blocking',
          field: 'sketchExport',
          message: 'Sketch export failed: active openings exist in Sketch Canvas but export normalization produced 0 markers.'
        }
      ]
    };
  }

  if (activeMarkers.length > 0) {
    // Check openings count match
    const openings = await prisma.opening.findMany({
      where: { appointmentId, deletedAt: null }
    });

    if (openings.length !== activeMarkers.length) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_RENDER_FAILED',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: `Sketch export failed: Active openings count (${openings.length}) does not match sketch markers count (${activeMarkers.length}).`
          }
        ]
      };
    }

    // Call normalization
    const { activeMarkers: normalizedMarkers } = normalizeSketchForDocumentExport(appt, sketch, openings);

    // Generate the standalone SVG
    let svgString = '';
    try {
      svgString = generatePrintSafeSketchSvg({
        markers: normalizedMarkers,
        strokes: [],
        houseOutline: []
      });
    } catch (err: any) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_RENDER_FAILED',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: `Sketch export failed: ${err.message}`
          }
        ]
      };
    }

    // SVG validations
    const groupMatches = svgString.match(/<g data-marker-id=/g) || [];
    const groupCount = groupMatches.length;
    if (groupCount !== normalizedMarkers.length) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_NOT_READABLE',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: `Sketch export failed: ${normalizedMarkers.length} active markers were found but ${groupCount} marker icons rendered into the export SVG.`
          }
        ]
      };
    }

    // Check SVG contains marker number text
    for (const m of normalizedMarkers) {
      if (m.markerNumber != null) {
        const numText = `#${m.markerNumber}`;
        if (!svgString.includes(numText)) {
          return {
            success: false,
            code: 'SKETCH_EXPORT_NOT_READABLE',
            issues: [
              {
                severity: 'blocking',
                field: 'sketchExport',
                message: `Sketch export failed: SVG is missing marker number text: ${numText}`
              }
            ]
          };
        }
      }
    }

    // Validate drawing paths in SVG (Phase 6)
    const pathRegex = /<path([^>]+)>/g;
    let pathMatch;
    while ((pathMatch = pathRegex.exec(svgString)) !== null) {
      const attrs = pathMatch[1];
      
      const strokeMatch = /stroke\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (strokeMatch && strokeMatch[1].toLowerCase() !== '#000000') {
        return {
          success: false,
          code: 'SKETCH_EXPORT_NOT_READABLE',
          issues: [{
            severity: 'blocking',
            field: 'sketchExport',
            message: `Sketch export failed: path has stroke ${strokeMatch[1]} but must be #000000.`
          }]
        };
      }

      const widthMatch = /stroke-width\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (widthMatch) {
        const wVal = parseFloat(widthMatch[1]);
        if (wVal < 10) {
          return {
            success: false,
            code: 'SKETCH_EXPORT_NOT_READABLE',
            issues: [{
              severity: 'blocking',
              field: 'sketchExport',
              message: `Sketch export failed: path has stroke-width ${wVal} which is less than 10.`
            }]
          };
        }
      }

      const opacityMatch = /opacity\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (opacityMatch) {
        const oVal = parseFloat(opacityMatch[1]);
        if (oVal < 1) {
          return {
            success: false,
            code: 'SKETCH_EXPORT_NOT_READABLE',
            issues: [{
              severity: 'blocking',
              field: 'sketchExport',
              message: `Sketch export failed: path has opacity ${oVal} which is less than 1.`
            }]
          };
        }
      }
    }

    // Validate that it has version comment
    if (!svgString.includes('print-readable-v3')) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_NOT_READABLE',
        issues: [{
          severity: 'blocking',
          field: 'sketchExport',
          message: 'Sketch export failed: SVG is missing print-readable-v3 version metadata.'
        }]
      };
    }

    // Validate that it has data-opening-number-label groups
    if (!svgString.includes('data-opening-number-label=')) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_NOT_READABLE',
        issues: [{
          severity: 'blocking',
          field: 'sketchExport',
          message: 'Sketch export failed: SVG is missing data-opening-number-label backing groups.'
        }]
      };
    }

    // Validate text sizes in SVG (Phase 6)
    const textRegex = /<text([^>]+)>([^<]*)<\/text>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(svgString)) !== null) {
      const attrs = textMatch[1];
      const content = textMatch[2];
      
      const isNumberText = content.trim().startsWith('#');
      const fontSizeMatch = /font-size\s*=\s*["']([^"']+)["']/i.exec(attrs);
      const fillMatch = /fill\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (fontSizeMatch) {
        const sizeVal = parseFloat(fontSizeMatch[1]);
        if (isNumberText) {
          if (sizeVal < 28) {
            return {
              success: false,
              code: 'SKETCH_EXPORT_NOT_READABLE',
              issues: [{
                severity: 'blocking',
                field: 'sketchExport',
                message: `Sketch export failed: marker number text has font-size ${sizeVal} which is less than 28.`
              }]
            };
          }
          if (fillMatch && fillMatch[1].toLowerCase() !== '#000000') {
            return {
              success: false,
              code: 'SKETCH_EXPORT_NOT_READABLE',
              issues: [{
                severity: 'blocking',
                field: 'sketchExport',
                message: `Sketch export failed: marker number text has fill ${fillMatch[1]} but must be #000000.`
              }]
            };
          }
        } else {
          // It's a type label
          if (sizeVal < 20) {
            return {
              success: false,
              code: 'SKETCH_EXPORT_NOT_READABLE',
              issues: [{
                severity: 'blocking',
                field: 'sketchExport',
                message: `Sketch export failed: marker type text has font-size ${sizeVal} which is less than 20.`
              }]
            };
          }
        }
      }
    }

    // No light/white strokes on path tags (representing drawing strokes)
    if (/<path[^>]*stroke\s*=\s*["']#(?:fff(?:fff)?|FFF(?:FFF)?)["']/i.test(svgString) || /<path[^>]*stroke\s*=\s*["']white["']/i.test(svgString)) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_NOT_READABLE',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: 'Sketch export failed: SVG contains invalid light/white strokes on white background.'
          }
        ]
      };
    }

    // No NaN
    if (svgString.includes('NaN')) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_RENDER_FAILED',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: 'Sketch export failed: SVG contains invalid NaN coordinates.'
          }
        ]
      };
    }

    // No empty SVG
    if (!svgString || svgString.trim().length === 0) {
      return {
        success: false,
        code: 'SKETCH_EXPORT_RENDER_FAILED',
        issues: [
          {
            severity: 'blocking',
            field: 'sketchExport',
            message: 'Sketch export failed: SVG is empty.'
          }
        ]
      };
    }

    return {
      success: true,
      activeMarkers: normalizedMarkers,
      svgString
    };
  }

  return { success: true };
}
