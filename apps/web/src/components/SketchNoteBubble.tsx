// ═══════════════════════════════════════════════════════════════
// Sketch Note Bubble — Canvas rendering utilities for quick notes
// Used by SketchFieldPage.tsx to draw resizable note annotations
// ═══════════════════════════════════════════════════════════════

export interface SketchAnnotation {
  id: string;
  appointmentId: string;
  sketchId?: string;
  markerId?: string;
  openingId?: string;
  type: 'note';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'clean' | 'dirty' | 'pending';
  variant?: 'bubble' | 'text';
}

export interface NoteHitResult {
  annotationId: string;
  handle?: 'nw' | 'ne' | 'sw' | 'se' | 'body';
}

const DEFAULT_NOTE_COLOR = '#FFEB3B';
const DEFAULT_NOTE_WIDTH = 120;
const DEFAULT_NOTE_HEIGHT = 60;
const HANDLE_SIZE = 8;
const HANDLE_HIT_SIZE = 22; // Touch-friendly hit area
const LEADER_LINE_DASH = [4, 4];
const NOTE_BORDER_RADIUS = 6;
const NOTE_FONT_SIZE = 11;
const NOTE_FONT = `${NOTE_FONT_SIZE}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const NOTE_PRINT_FONT_SIZE = 13;
const NOTE_PRINT_FONT = `bold ${NOTE_PRINT_FONT_SIZE}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

/**
 * Create a new annotation with sensible defaults.
 */
export function createAnnotation(
  appointmentId: string,
  x: number,
  y: number,
  sketchId?: string,
  markerId?: string,
  variant: 'bubble' | 'text' = 'bubble',
): SketchAnnotation {
  return {
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    appointmentId,
    sketchId,
    markerId,
    type: 'note',
    text: '',
    x,
    y,
    width: DEFAULT_NOTE_WIDTH,
    height: DEFAULT_NOTE_HEIGHT,
    color: DEFAULT_NOTE_COLOR,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: 'dirty',
    variant,
  };
}

/**
 * Draw a single note bubble on the canvas.
 */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: SketchAnnotation,
  transform: { panX: number; panY: number; zoom: number },
  unit: number,
  offsetX: number,
  offsetY: number,
  isSelected: boolean,
  isPrintMode: boolean,
): void {
  const { x, y, width, height, text, color } = annotation;
  const zoom = transform.zoom;

  // Convert logical coords to screen coords
  const sx = (x * unit + offsetX + transform.panX) * zoom;
  const sy = (y * unit + offsetY + transform.panY) * zoom;
  const sw = (width / 100) * unit * zoom;
  const sh = (height / 100) * unit * zoom;

  ctx.save();

  // Background & Border (skip for pure text mode unless selected)
  const isPureText = annotation.variant === 'text';
  if (!isPureText || isSelected) {
    const fillColor = isPureText ? 'rgba(255, 255, 255, 0.4)' : (color || DEFAULT_NOTE_COLOR);
    const bgAlpha = isPureText ? (isSelected ? 1 : 0) : (isPrintMode ? 0.95 : 0.9);
    
    if (bgAlpha > 0) {
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = bgAlpha;
      roundRect(ctx, sx, sy, sw, sh, NOTE_BORDER_RADIUS * zoom);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    if (!isPureText || isSelected) {
      ctx.strokeStyle = isSelected ? '#1976D2' : '#B0A000';
      ctx.lineWidth = isSelected ? (isPureText ? 1.5 : 2.5) : 1;
      
      if (isPureText && isSelected) {
        ctx.setLineDash([4, 4]);
      }
      
      roundRect(ctx, sx, sy, sw, sh, NOTE_BORDER_RADIUS * zoom);
      ctx.stroke();
      
      if (isPureText && isSelected) {
        ctx.setLineDash([]);
      }
    }
  }

  // Note text
  if (text) {
    ctx.fillStyle = '#212121';
    ctx.font = isPrintMode ? NOTE_PRINT_FONT : NOTE_FONT;
    ctx.textBaseline = 'top';
    const padding = 6 * zoom;
    const maxWidth = sw - padding * 2;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = (isPrintMode ? NOTE_PRINT_FONT_SIZE : NOTE_FONT_SIZE) * 1.3 * zoom;
    for (let i = 0; i < lines.length; i++) {
      const ly = sy + padding + i * lineHeight;
      if (ly + lineHeight > sy + sh) break; // Don't overflow
      ctx.fillText(lines[i], sx + padding, ly);
    }
  } else if (!isPrintMode) {
    // Placeholder text
    ctx.fillStyle = isPureText ? '#666666' : '#9E9E9E';
    ctx.font = NOTE_FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(isPureText ? 'Tap to edit text...' : 'Tap to add note...', sx + sw / 2, sy + sh / 2);
    ctx.textAlign = 'left';
  }

  // Resize handles (only when selected and not print mode)
  if (isSelected && !isPrintMode) {
    const handleColor = '#1976D2';
    const handles = getHandlePositions(sx, sy, sw, sh);
    for (const [, hx, hy] of handles) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeStyle = handleColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  ctx.restore();
}

/**
 * Draw a leader line from the note to its associated marker.
 */
export function drawLeaderLine(
  ctx: CanvasRenderingContext2D,
  annotation: SketchAnnotation,
  markerX: number,
  markerY: number,
  transform: { panX: number; panY: number; zoom: number },
  unit: number,
  offsetX: number,
  offsetY: number,
): void {
  const zoom = transform.zoom;
  const noteCenterX = (annotation.x * unit + offsetX + transform.panX) * zoom + ((annotation.width / 100) * unit * zoom) / 2;
  const noteCenterY = (annotation.y * unit + offsetY + transform.panY) * zoom + ((annotation.height / 100) * unit * zoom) / 2;
  const msx = (markerX * unit + offsetX + transform.panX) * zoom;
  const msy = (markerY * unit + offsetY + transform.panY) * zoom;

  ctx.save();
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 1.5;
  ctx.setLineDash(LEADER_LINE_DASH);
  ctx.beginPath();
  ctx.moveTo(noteCenterX, noteCenterY);
  ctx.lineTo(msx, msy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Hit-test a screen coordinate against all annotations.
 * Returns the annotation ID and which handle was hit.
 */
export function hitTestAnnotations(
  annotations: SketchAnnotation[],
  screenX: number,
  screenY: number,
  transform: { panX: number; panY: number; zoom: number },
  unit: number,
  offsetX: number,
  offsetY: number,
  selectedId?: string | null,
): NoteHitResult | null {
  // Check selected annotation first (for resize handles)
  const sorted = selectedId
    ? [...annotations].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0))
    : annotations;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const ann = sorted[i];
    const zoom = transform.zoom;
    const sx = (ann.x * unit + offsetX + transform.panX) * zoom;
    const sy = (ann.y * unit + offsetY + transform.panY) * zoom;
    const sw = (ann.width / 100) * unit * zoom;
    const sh = (ann.height / 100) * unit * zoom;

    // Check resize handles first (only for selected annotation)
    if (ann.id === selectedId) {
      const handles = getHandlePositions(sx, sy, sw, sh);
      for (const [name, hx, hy] of handles) {
        if (
          Math.abs(screenX - hx) < HANDLE_HIT_SIZE &&
          Math.abs(screenY - hy) < HANDLE_HIT_SIZE
        ) {
          return { annotationId: ann.id, handle: name as 'nw' | 'ne' | 'sw' | 'se' };
        }
      }
    }

    // Check body
    if (screenX >= sx && screenX <= sx + sw && screenY >= sy && screenY <= sy + sh) {
      return { annotationId: ann.id, handle: 'body' };
    }
  }

  return null;
}

/**
 * Find the nearest marker within associationRadius logical units.
 */
export function findNearestMarker(
  noteX: number,
  noteY: number,
  markers: Array<{ id: string; x: number; y: number }>,
  maxDistance: number = 50,
): string | undefined {
  let nearest: string | undefined;
  let minDist = Infinity;
  for (const m of markers) {
    const dist = Math.sqrt((noteX - m.x) ** 2 + (noteY - m.y) ** 2);
    if (dist < maxDistance && dist < minDist) {
      minDist = dist;
      nearest = m.id;
    }
  }
  return nearest;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHandlePositions(sx: number, sy: number, sw: number, sh: number): [string, number, number][] {
  return [
    ['nw', sx, sy],
    ['ne', sx + sw, sy],
    ['sw', sx, sy + sh],
    ['se', sx + sw, sy + sh],
  ];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
