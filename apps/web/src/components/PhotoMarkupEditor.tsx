import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

type ToolType = 'freehand' | 'arrow' | 'text' | 'rectangle' | 'circle';

const TOOL_LABELS: Record<ToolType, { icon: string; label: string }> = {
  freehand: { icon: '✏️', label: 'Draw' },
  arrow:    { icon: '➡️', label: 'Arrow' },
  text:     { icon: '📝', label: 'Text' },
  rectangle:{ icon: '▢', label: 'Rect' },
  circle:   { icon: '⭕', label: 'Circle' },
};

export function PhotoMarkupEditor({
  originalDataUrl,
  onSave,
  onCancel,
}: {
  originalDataUrl: string;
  onSave: (markedUpDataUrl: string) => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<Point | null>(null);
  const [color, setColor] = useState('#ef4444'); // default red
  const [brushSize, setBrushSize] = useState(4);
  const [hasEdits, setHasEdits] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>('freehand');

  // For shape tools: store the drag start point and a snapshot of the canvas before the drag
  const dragStartRef = useRef<Point | null>(null);
  const canvasSnapshotRef = useRef<ImageData | null>(null);

  // Dimensions used for drawing (CSS pixels, not physical)
  const displayDimsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Initialize canvas with the background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      initCanvas();
    };
    img.src = originalDataUrl;
  }, [originalDataUrl]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = bgImageRef.current;
    if (!canvas || !container || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions to fit within container while preserving aspect ratio
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;
    
    let width = img.width;
    let height = img.height;

    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = width * ratio;
    height = height * ratio;

    displayDimsRef.current = { width, height };

    // Set high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    
    // Draw background image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Setup drawing context
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasEdits(false);
  }, []);

  /** Save current canvas pixel data so we can restore it during shape preview */
  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // getImageData works in physical pixels
    canvasSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  /** Restore canvas to the last snapshot (used during shape drag preview) */
  const restoreSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvasSnapshotRef.current) {
      ctx.putImageData(canvasSnapshotRef.current, 0, 0);
      // Re-apply the DPR scale since putImageData resets the transform
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) {
        // touchEnd has no touches — use changedTouches
        const changed = (e as React.TouchEvent).changedTouches[0];
        if (!changed) return null;
        return {
          x: changed.clientX - rect.left,
          y: changed.clientY - rect.top,
        };
      }
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
  };

  // ─── Drawing helpers ────────────────────────────────────────────

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const headLen = Math.max(14, brushSize * 3);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Shaft
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.stroke();

    // Arrowhead triangle
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const drawRectangle = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.beginPath();
    ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.stroke();
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const rx = Math.abs(to.x - from.x) / 2;
    const ry = Math.abs(to.y - from.y) / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.stroke();
  };

  const placeText = (pos: Point) => {
    const text = prompt('Enter annotation text:');
    if (!text) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const fontSize = Math.max(16, brushSize * 4);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, pos.x, pos.y);
    setHasEdits(true);
  };

  // ─── Event handlers ─────────────────────────────────────────────

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    if (!pos) return;

    if (activeTool === 'text') {
      placeText(pos);
      return;
    }

    setIsDrawing(true);
    setLastPos(pos);
    dragStartRef.current = pos;

    // For shape tools take a snapshot so we can preview without accumulation
    if (activeTool !== 'freehand') {
      takeSnapshot();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const currentPos = getCoordinates(e);
    if (!currentPos) return;

    if (activeTool === 'freehand') {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
      setLastPos(currentPos);
      setHasEdits(true);
      return;
    }

    // Shape tools: restore snapshot then draw preview
    const start = dragStartRef.current;
    if (!start) return;

    restoreSnapshot();

    if (activeTool === 'arrow') {
      drawArrow(ctx, start, currentPos);
    } else if (activeTool === 'rectangle') {
      drawRectangle(ctx, start, currentPos);
    } else if (activeTool === 'circle') {
      drawCircle(ctx, start, currentPos);
    }
  };

  const endDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing && dragStartRef.current && activeTool !== 'freehand' && activeTool !== 'text') {
      // Finalize the shape: restore snapshot and draw final shape
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas && e) {
        const endPos = getCoordinates(e);
        const start = dragStartRef.current;
        if (endPos && start) {
          restoreSnapshot();
          if (activeTool === 'arrow') drawArrow(ctx, start, endPos);
          else if (activeTool === 'rectangle') drawRectangle(ctx, start, endPos);
          else if (activeTool === 'circle') drawCircle(ctx, start, endPos);
          setHasEdits(true);
        }
      }
    }

    setIsDrawing(false);
    setLastPos(null);
    dragStartRef.current = null;
    canvasSnapshotRef.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onSave(dataUrl);
  };

  // ─── Toolbar button style helper ───────────────────────────────

  const toolBtnStyle = (tool: ToolType): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: activeTool === tool ? 'var(--royal)' : 'none',
    color: activeTool === tool ? 'white' : 'var(--text)',
    border: activeTool === tool ? '1px solid var(--royal)' : '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    minWidth: 48,
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: 'var(--royal)', color: 'white'
      }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer' }}>
          Cancel
        </button>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Markup Photo</h3>
        <button 
          onClick={handleSave} 
          style={{ 
            background: 'var(--blue)', color: 'white', border: 'none', 
            borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
          }}
        >
          Done
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Color swatches */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#ffffff', '#000000'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '3px solid var(--royal)' : '1px solid var(--border)',
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

        {/* Tool buttons */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(Object.keys(TOOL_LABELS) as ToolType[]).map(tool => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              style={toolBtnStyle(tool)}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{TOOL_LABELS[tool].icon}</span>
              <span>{TOOL_LABELS[tool].label}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

        {/* Brush size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text)', whiteSpace: 'nowrap', fontWeight: 500 }}>Size</span>
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            style={{ width: 80, accentColor: 'var(--royal)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: 16, textAlign: 'center' }}>{brushSize}</span>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

        {/* Clear button */}
        <button onClick={initCanvas} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          Clear
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{ cursor: activeTool === 'text' ? 'text' : 'crosshair', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
