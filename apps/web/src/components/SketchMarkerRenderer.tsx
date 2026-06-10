// ═══════════════════════════════════════════════════════════════
// Sketch Marker Renderer
// Renders typed markers (X, door, patio, shape, oriel, note, arrow,
// tub, shower, sink, toilet, stairs) on the sketch canvas with validation badges
// ═══════════════════════════════════════════════════════════════

import type { SketchMarkerData, ValidationStatus, MarkerSymbol } from '../utils/sketchSync';
import { FIXTURE_MARKERS, MATERIAL_MARKERS, ANNOTATION_MARKERS } from '../utils/sketchSync';

// Deprecated fixed sizes:
// const MARKER_SIZE = 28;
// const SMALL_MARKER_SIZE = 20;

export interface MarkerRenderOptions {
  size: number;
  smallSize: number;
  isCompact: boolean;
  isSelected?: boolean;
  isJoinSelected?: boolean;
  textColor?: string;
  labelVisibilityMode?: 'full' | 'number_only' | 'none';
  isPrintMode?: boolean;
}

const VALIDATION_COLORS: Record<ValidationStatus, string> = {
  incomplete: '#ef4444',
  measured: '#ef4444', // Treat measured as incomplete (needs details)
  priced: '#ef4444',   // Treat priced as incomplete (needs details)
  complete: '#22c55e',
};

const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  incomplete: '!',
  measured: '!',
  priced: '!',
  complete: '✓',
};

// Symbol → color config
const SYM_COLORS: Partial<Record<MarkerSymbol, { c: string; a: string }>> = {
  window_x: { c:'#3b82f6', a:'#2563eb' }, dh: { c:'#3b82f6', a:'#2563eb' },
  sh: { c:'#2563eb', a:'#1d4ed8' }, slider: { c:'#0284c7', a:'#0369a1' },
  picture: { c:'#0891b2', a:'#0e7490' }, casement: { c:'#7c3aed', a:'#6d28d9' },
  awning: { c:'#9333ea', a:'#7e22ce' }, bay: { c:'#059669', a:'#047857' },
  bow: { c:'#10b981', a:'#059669' }, circle_top: { c:'#047857', a:'#065f46' },
  eyebrow: { c:'#047857', a:'#065f46' }, half_round: { c:'#047857', a:'#065f46' },
  trapezoid: { c:'#047857', a:'#065f46' }, sgd: { c:'#6d28d9', a:'#5b21b6' },
  back_door: { c:'#b91c1c', a:'#991b1b' },
};

const SHAPE_DRAW_SYMBOLS = new Set<string>([
  'window_x','dh','sh','slider','picture','casement','awning',
  'bay','bow','circle_top','eyebrow','half_round','trapezoid','sgd',
]);

function drawNumberBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  num: number | null,
  options?: MarkerRenderOptions,
) {
  const label = `#${num ?? '?'}`;
  ctx.save();
  
  const fontSize = Math.max(15, (options?.size || 28) * 0.6);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const paddingX = fontSize * 0.4;
  const badgeW = Math.max(fontSize * 1.6, textWidth + paddingX * 2);
  const badgeH = fontSize * 1.3;
  
  // Badge background - Stark black with bright yellow border for maximum contrast
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = Math.max(2, (options?.size || 28) * 0.07);
  
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 4);
  } else {
    ctx.rect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();
  
  // White text centered in the badge
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  
  ctx.restore();
}

export function drawMarkerOnCanvas(
  ctx: CanvasRenderingContext2D,
  marker: SketchMarkerData,
  options: MarkerRenderOptions
) {
  const { x, y, markerSymbol, markerNumber, markerLabel, validationStatus } = marker;
  const isSelected = !!options.isSelected;
  const isJoinSelected = !!options.isJoinSelected;
  const isCompact = options.isCompact;
  // Expand the marker visually if it is selected
  const r = (isSelected && isCompact) ? options.size * 1.7 : options.size;
  const SMALL_MARKER_SIZE = (isSelected && isCompact) ? options.smallSize * 1.5 : options.smallSize;

  ctx.save();
  if (isSelected || isJoinSelected) {
    ctx.shadowColor = isJoinSelected ? '#f59e0b' : '#3b82f6';
    ctx.shadowBlur = 12;
  }

  if (SHAPE_DRAW_SYMBOLS.has(markerSymbol)) {
    const col = SYM_COLORS[markerSymbol] || { c:'#3b82f6', a:'#2563eb' };
    const fill = isSelected ? col.a : col.c;
    drawShapeMarker(ctx, x, y, r, markerNumber, markerSymbol, fill, validationStatus, options);
  } else {
    switch (markerSymbol) {
      case 'front_door': drawFrontDoor(ctx, x, y, r, markerNumber, isSelected, validationStatus, 'FD', options); break;
      case 'back_door': drawFrontDoor(ctx, x, y, r, markerNumber, isSelected, validationStatus, 'BD', options); break;
      case 'patio_door': drawPatioDoor(ctx, x, y, r, markerNumber, isSelected, validationStatus, options); break;
      case 'special_shape': drawSpecialShape(ctx, x, y, r, markerNumber, isSelected, validationStatus, options); break;
      case 'oriel': drawOriel(ctx, x, y, r, markerNumber, isSelected, validationStatus, options); break;
      case 'note': drawNote(ctx, x, y, SMALL_MARKER_SIZE, markerLabel); break;
      case 'arrow': break;
      default:
        if (FIXTURE_MARKERS.includes(markerSymbol)) {
          drawFixtureMarker(ctx, x, y, SMALL_MARKER_SIZE + 4, markerSymbol, markerLabel, isSelected);
        } else if (MATERIAL_MARKERS.includes(markerSymbol as any)) {
          drawMaterialMarker(ctx, x, y, SMALL_MARKER_SIZE + 6, markerSymbol, markerLabel, isSelected);
        } else if (ANNOTATION_MARKERS.includes(markerSymbol)) {
          drawAnnotationMarker(ctx, x, y, SMALL_MARKER_SIZE, markerSymbol, markerLabel, isSelected);
        }
        break;
    }
  }

  ctx.restore();

  // If not compact (or if selected), draw room location
  if (marker.roomLocation && !isCompact && markerSymbol !== 'note' && markerSymbol !== 'arrow'
    && !MATERIAL_MARKERS.includes(markerSymbol as any) && !ANNOTATION_MARKERS.includes(markerSymbol)) {
    ctx.save();
    ctx.fillStyle = options.textColor || '#64748b';
    const fontSize = Math.max(9, r * 0.4);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(marker.roomLocation.slice(0, 14), x, y + r + fontSize * 1.5);
    ctx.restore();
  }

  // If marker has notes, draw a 📝 badge at the top right
  if (marker.notes && marker.notes.trim().length > 0 && markerSymbol !== 'note') {
    ctx.save();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + r + 2, y - r - 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    const noteSize = Math.max(10, r * 0.35);
    ctx.font = `${noteSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📝', x + r + 2, y - r - 2);
    ctx.restore();
  }
}

// ── Shape-specific marker drawing ───────────────────────────
function drawShapeMarker(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  num: number | null, sym: string, fill: string, status: ValidationStatus,
  options: MarkerRenderOptions,
) {
  const w = r * 1.4, h = r * 1.7;
  const L = cx - w/2, T = cy - h/2, R = cx + w/2, B = cy + h/2;

  // Background rect (shared by most)
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;

  switch (sym) {
    case 'dh': // Double Hung — two sashes with rail
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(L+2, cy); ctx.lineTo(R-2, cy); ctx.stroke(); // rail
      ctx.beginPath(); ctx.moveTo(cx, T+4); ctx.lineTo(cx, T+8); ctx.stroke(); // top lock
      ctx.beginPath(); ctx.moveTo(cx, B-8); ctx.lineTo(cx, B-4); ctx.stroke(); // bot lock
      break;

    case 'sh': // Single Hung — top fixed, bottom operable
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(L+2, cy); ctx.lineTo(R-2, cy); ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(L+4, T+h*0.25); ctx.lineTo(R-4, T+h*0.25); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx, B-8); ctx.lineTo(cx, B-4); ctx.stroke();
      break;

    case 'slider': // Slider — vertical divider, arrows
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, T+3); ctx.lineTo(cx, B-3); ctx.stroke();
      // arrows
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx-6, cy); ctx.lineTo(L+4, cy-3); ctx.moveTo(cx-6, cy); ctx.lineTo(L+4, cy+3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+6, cy); ctx.lineTo(R-4, cy-3); ctx.moveTo(cx+6, cy); ctx.lineTo(R-4, cy+3); ctx.stroke();
      break;

    case 'picture': // Picture — single fixed pane
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.setLineDash([2, 2]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(L+4, T+4, w-8, h-8, 1); ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 'casement': // Casement — hinge on side, triangle opening indicator
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L+2, T+3); ctx.lineTo(R-6, cy); ctx.lineTo(L+2, B-3); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L+5, cy, 2, 0, Math.PI*2); ctx.fill();
      break;

    case 'awning': // Awning — top-hinged, triangle down
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L+3, T+3); ctx.lineTo(cx, B-4); ctx.lineTo(R-3, T+3); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, B-5, 2, 0, Math.PI*2); ctx.fill();
      break;

    case 'bay': { // Bay — 3 angled panels
      const bw = w * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx-bw, B); ctx.lineTo(cx-bw, T+6); ctx.lineTo(cx-bw/2, T);
      ctx.lineTo(cx+bw/2, T); ctx.lineTo(cx+bw, T+6); ctx.lineTo(cx+bw, B);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx-bw/2, T); ctx.lineTo(cx-bw/2, B); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+bw/2, T); ctx.lineTo(cx+bw/2, B); ctx.stroke();
      break;
    }

    case 'bow': { // Bow — curved top, 4 mullions
      ctx.beginPath();
      ctx.moveTo(L, B); ctx.lineTo(L, cy-4);
      ctx.quadraticCurveTo(cx, T-6, R, cy-4);
      ctx.lineTo(R, B); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const px = L + (w * i / 4);
        ctx.beginPath(); ctx.moveTo(px, T + 4); ctx.lineTo(px, B); ctx.stroke();
      }
      break;
    }

    case 'circle_top': // Circle Top — rect + semicircle
      ctx.beginPath();
      ctx.moveTo(L, B); ctx.lineTo(L, cy-2);
      ctx.arc(cx, cy-2, w/2, Math.PI, 0);
      ctx.lineTo(R, B); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L+1, cy-2); ctx.lineTo(R-1, cy-2); ctx.stroke();
      break;

    case 'eyebrow': // Eyebrow — rect + shallow arch
      ctx.beginPath();
      ctx.moveTo(L, B); ctx.lineTo(L, cy-4);
      ctx.quadraticCurveTo(cx, T-2, R, cy-4);
      ctx.lineTo(R, B); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L+1, cy); ctx.lineTo(R-1, cy); ctx.stroke();
      break;

    case 'half_round': // Half Round — just semicircle
      ctx.beginPath();
      ctx.arc(cx, cy+4, w/2, Math.PI, 0); ctx.lineTo(R, cy+4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy-w/2+4); ctx.lineTo(cx, cy+4); ctx.stroke();
      break;

    case 'trapezoid': // Trapezoid
      ctx.beginPath();
      ctx.moveTo(cx-w*0.3, T); ctx.lineTo(cx+w*0.3, T);
      ctx.lineTo(R, B); ctx.lineTo(L, B); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;

    case 'sgd': // SGD — wide rect, vertical divider, arrow
      { const sw = w * 1.4;
      ctx.beginPath(); ctx.roundRect(cx-sw/2, T, sw, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, T+3); ctx.lineTo(cx, B-3); ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx-8, cy); ctx.lineTo(cx-sw/2+5, cy-3); ctx.moveTo(cx-8, cy); ctx.lineTo(cx-sw/2+5, cy+3); ctx.stroke();
      break; }

    default: // window_x fallback
      ctx.beginPath(); ctx.roundRect(L, T, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L+4, T+4); ctx.lineTo(R-4, B-4); ctx.moveTo(R-4, T+4); ctx.lineTo(L+4, B-4); ctx.stroke();
      break;
  }

  // Number badge below shape
  drawNumberBadge(ctx, cx, B + 10, num, options);

  // Type label inside (small)
  const labelMap: Record<string, string> = {
    dh:'DH', sh:'SH', slider:'SL', picture:'PIC', casement:'CAS', awning:'AWN',
    bay:'BAY', bow:'BOW', circle_top:'CT', eyebrow:'EY', half_round:'HR',
    trapezoid:'TR', sgd:'SGD', window_x:'',
  };
  const lbl = labelMap[sym] || '';
  const showLabel = options.labelVisibilityMode === 'full' || (options.isSelected) || (!options.labelVisibilityMode && !options.isCompact);
  if (lbl && showLabel) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const lblSize = Math.max(11, options.size * 0.4);
    ctx.font = `bold ${lblSize}px Arial, sans-serif`;
    ctx.fillText(lbl, cx, B - options.size * 0.2);
  }

  // Only draw validation badges if NOT in print mode
  if (!options.isPrintMode) {
    drawValidationBadge(ctx, R, T, status, options);
  }
}

// ── Annotation marker ───────────────────────────────────────
function drawAnnotationMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  symbol: MarkerSymbol, label: string, selected: boolean,
) {
  const colors: Partial<Record<MarkerSymbol, string>> = {
    tempered_marker: '#ef4444', obscure_marker: '#8b5cf6',
    bath_marker: '#0ea5e9', clear_story: '#f97316', second_floor: '#d97706',
    dimension_line: '#64748b', room_label: '#059669', elevation_label: '#2563eb',
    number_marker: '#3b82f6',
  };
  const color = colors[symbol] || '#64748b';

  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = selected ? color : `${color}cc`;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${r * 0.85}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 3), x, y);
}

// ── Window X marker ─────────────────────────────────────────
function drawWindowX(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number | null,
  selected: boolean,
  status: ValidationStatus,
  options: MarkerRenderOptions,
) {
  // Circle background
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#2563eb' : '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // X inside
  const s = r * 0.5;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s);
  ctx.lineTo(x + s, y + s);
  ctx.moveTo(x + s, y - s);
  ctx.lineTo(x - s, y + s);
  ctx.stroke();

  // Number badge
  drawNumberBadge(ctx, x, y + r + 14, num, options);

  // Validation badge
  drawValidationBadge(ctx, x + r - 4, y - r + 4, status);
}

// ── Front door marker ───────────────────────────────────────
function drawFrontDoor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number | null,
  selected: boolean,
  status: ValidationStatus,
  doorLabel: string = 'DOOR',
  options: MarkerRenderOptions,
) {
  // Door shape (rectangle with arc)
  const w = r * 1.2;
  const h = r * 1.6;

  ctx.fillStyle = selected ? '#dc2626' : '#b91c1c';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, [6, 6, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Door handle
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x + w / 4, y + 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  const doorLblSize = Math.max(11, (options?.size || r) * 0.4);
  ctx.font = `bold ${doorLblSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(doorLabel, x, y - h / 4);

  // Arrow pointing up (orientation)
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 8);
  ctx.lineTo(x, y - h / 2 - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - h / 2 - 15);
  ctx.lineTo(x, y - h / 2 - 20);
  ctx.lineTo(x + 5, y - h / 2 - 15);
  ctx.stroke();

  // Number
  if (num != null) {
    drawNumberBadge(ctx, x, y + h / 2 + 14, num, options);
  }

  // Validation badge
  drawValidationBadge(ctx, x + w / 2 - 4, y - h / 2 + 4, status);
}

// ── Patio door marker ───────────────────────────────────────
function drawPatioDoor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number | null,
  selected: boolean,
  status: ValidationStatus,
  options: MarkerRenderOptions,
) {
  const w = r * 2;
  const h = r * 1.4;

  ctx.fillStyle = selected ? '#7c3aed' : '#6d28d9';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Sliding divider
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 + 4);
  ctx.lineTo(x, y + h / 2 - 4);
  ctx.stroke();

  // Arrows showing slide direction
  const arrowSize = Math.max(11, (options?.size || r) * 0.4);
  ctx.font = `${arrowSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('↔', x, y - 2);

  // Number
  if (num != null) {
    drawNumberBadge(ctx, x, y + h / 2 + 14, num, options);
  }

  drawValidationBadge(ctx, x + w / 2 - 4, y - h / 2 + 4, status);
}

// ── Special shape marker ────────────────────────────────────
function drawSpecialShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number | null,
  selected: boolean,
  status: ValidationStatus,
  options?: MarkerRenderOptions,
) {
  // Hexagon
  ctx.fillStyle = selected ? '#2563eb' : '#3b82f6';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Number badge
  if (num != null) {
    drawNumberBadge(ctx, x, y + r + 14, num, options);
  }

  drawValidationBadge(ctx, x + r - 2, y - r + 2, status);
}

// ── Oriel marker ────────────────────────────────────────────
function drawOriel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number | null,
  selected: boolean,
  status: ValidationStatus,
  options?: MarkerRenderOptions,
) {
  // Double rectangle (top/bottom sash visual)
  const w = r * 1.4;
  const h = r * 1.8;
  ctx.fillStyle = selected ? '#2563eb' : '#3b82f6'; ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Divider line (top/bottom sash)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 3, y - 2);
  ctx.lineTo(x + w / 2 - 3, y - 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  const orielLblSize = Math.max(11, (options?.size || r) * 0.4);
  ctx.font = `bold ${orielLblSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORIEL', x, y);
  
  // Number badge
  if (num != null) {
    drawNumberBadge(ctx, x, y + h / 2 + 14, num, options);
  }

  drawValidationBadge(ctx, x + w / 2, y - h / 2, status);
}

// ── Note marker ─────────────────────────────────────────────
function drawNote(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  label: string,
) {
  ctx.fillStyle = 'rgba(245,158,11,0.9)';
  ctx.beginPath();
  ctx.roundRect(x - 2, y - r / 2, Math.max(r * 3, (label?.length || 4) * 6 + 12), r, 4);
  ctx.fill();

  ctx.fillStyle = '#000';
  const noteLblSize = Math.max(12, r * 0.6);
  ctx.font = `${noteLblSize}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📝 ${label || 'Note'}`, x + 4, y);
}

// ── Fixture / proximity marker ──────────────────────────────
const FIXTURE_ICON: Record<string, string> = {
  tub: '🛁',
  shower: '🚿',
  sink: '🚰',
  toilet: '🚽',
  stairs: '🪜',
};

const FIXTURE_COLOR: Record<string, string> = {
  tub: '#0ea5e9',
  shower: '#06b6d4',
  sink: '#8b5cf6',
  toilet: '#a78bfa',
  stairs: '#f97316',
};

function drawFixtureMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  symbol: MarkerSymbol,
  label: string,
  selected: boolean,
) {
  const color = FIXTURE_COLOR[symbol] || '#64748b';
  const icon = FIXTURE_ICON[symbol] || '⚠';

  // Dashed proximity radius (visual cue for 60" check zone)
  if (symbol === 'tub' || symbol === 'shower' || symbol === 'stairs') {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Main circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = selected ? color : `${color}cc`;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();

  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = `${r}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y);

  // Label below
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + r + 10);
}

// ── Exterior material marker ───────────────────────────────
const MATERIAL_ICON: Record<string, string> = {
  brick: '🧱',
  siding: '🏠',
  stucco: '🏗️',
  wood: '🪵',
};

const MATERIAL_COLOR: Record<string, string> = {
  brick: '#dc2626',
  siding: '#2563eb',
  stucco: '#d97706',
  wood: '#92400e',
};

const MATERIAL_MEASURE_LABEL: Record<string, string> = {
  brick: '→ OUTSIDE / Smallest',
  siding: '→ INSIDE',
  stucco: '→ INSIDE',
  wood: '→ INSIDE',
};

function drawMaterialMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  symbol: MarkerSymbol,
  label: string,
  selected: boolean,
) {
  const color = MATERIAL_COLOR[symbol] || '#64748b';
  const icon = MATERIAL_ICON[symbol] || '🏠';
  const measureLabel = MATERIAL_MEASURE_LABEL[symbol] || '';

  // Dashed material zone radius
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = `${color}44`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Rounded rectangle background
  const w = r * 2.5;
  const h = r * 1.6;
  ctx.fillStyle = selected ? color : `${color}cc`;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Icon + label
  ctx.fillStyle = '#fff';
  ctx.font = `${r * 0.85}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x - w / 5, y);

  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(symbol.charAt(0).toUpperCase() + symbol.slice(1), x + w / 6, y);

  // Measurement instruction below
  ctx.fillStyle = symbol === 'brick' ? '#fca5a5' : '#93c5fd';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(measureLabel, x, y + h / 2 + 12);
}

// ── Validation badge ────────────────────────────────────────
function drawValidationBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  status: ValidationStatus,
  options?: MarkerRenderOptions,
) {
  const r = Math.max(7, (options?.size || 28) * 0.25);
  ctx.fillStyle = VALIDATION_COLORS[status];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, (options?.size || 28) * 0.05);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  const vSize = Math.max(7, r * 0.8);
  ctx.font = `bold ${vSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(VALIDATION_LABELS[status], x, y);
}

// ── Draw join/mull connector line between markers ───────────
export function drawGroupConnector(
  ctx: CanvasRenderingContext2D,
  markers: SketchMarkerData[],
  groupType: string,
  groupLabel?: string,
) {
  if (markers.length < 2) return;

  const isMull = groupType.toLowerCase().startsWith('mull');

  ctx.save();
  if (isMull) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
  }

  // Draw technical bracket outside the markers
  const first = markers[0];
  const last = markers[markers.length - 1];
  let dx = last.x - first.x;
  let dy = last.y - first.y;
  let len = Math.hypot(dx, dy);
  if (len < 1) { dx = 1; dy = 0; len = 1; }
  
  // Normal vector
  const nx = -dy / len;
  const ny = dx / len;
  
  // Offset from the wall (upwards/outwards relative to the drawn line)
  // Default to 45px offset
  const OFFSET = 50;

  ctx.beginPath();
  // Draw legs from each marker out to the parallel bracket line
  for (const m of markers) {
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + nx * OFFSET, m.y + ny * OFFSET);
  }
  // Draw the parallel bracket line connecting the first and last leg
  ctx.moveTo(first.x + nx * OFFSET, first.y + ny * OFFSET);
  ctx.lineTo(last.x + nx * OFFSET, last.y + ny * OFFSET);
  ctx.stroke();

  // Group label at midpoint of the bracket line
  const midX = (first.x + last.x) / 2 + nx * OFFSET;
  const midY = (first.y + last.y) / 2 + ny * OFFSET;
  ctx.setLineDash([]);

  const textLabel = groupLabel || (isMull ? 'MULL' : `🔗 ${groupType.replace('_', ' ').toUpperCase()}`);

  const fontSize = Math.max(10, Math.abs(len) * 0.05 + 10);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const textWidth = ctx.measureText(textLabel).width;
  const paddingX = fontSize * 0.8;
  const paddingY = fontSize * 0.3;
  const rectW = textWidth + paddingX * 2;
  const rectH = fontSize * 1.4 + paddingY * 2;

  if (isMull) {
    // White background with dark border
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(midX - rectW / 2, midY - rectH / 2, rectW, rectH, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#333333';
  } else {
    // Amber background
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.beginPath();
    ctx.roundRect(midX - rectW / 2, midY - rectH / 2, rectW, rectH, 4);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textLabel, midX, midY);

  ctx.restore();
}

// ── Hit test: is a point inside a marker? ───────────────────
// Touch devices need at least 44px hit area per WCAG guidelines
const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const TOUCH_TOLERANCE = 44;

export function hitTestMarker(
  marker: SketchMarkerData,
  px: number, py: number,
  tolerance: number = IS_TOUCH ? TOUCH_TOLERANCE : 28 + 4, // default fallback
): boolean {
  const dx = px - marker.x;
  const dy = py - marker.y;
  return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}

export { VALIDATION_COLORS };
