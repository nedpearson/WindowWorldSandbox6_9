import { useRef, useEffect, useState, useCallback } from 'react';

// ── Canvas Signature Pad ──────────────────────────────────
interface Point { x: number; y: number; }

export function SignaturePad({
  onSave,
  onClear,
  height = 180,
  label = 'Sign Here',
  existingDataUrl,
  isInitials = false,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  height?: number;
  label?: string;
  existingDataUrl?: string;
  isInitials?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const [isEmpty, setIsEmpty] = useState(!existingDataUrl);
  const [saved, setSaved] = useState(!!existingDataUrl);

  // Init canvas and draw existing sig
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = isInitials ? 3 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.offsetWidth, height);
      img.src = existingDataUrl;
    }
  }, [height, isInitials]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    setSaved(false);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pt = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
  };

  const endDraw = () => { drawing.current = false; };

  const handleSave = () => {
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL('image/png'));
    setSaved(true);
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.offsetWidth, height);
    setIsEmpty(true);
    setSaved(false);
    onClear();
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Signature canvas */}
      <div style={{
        border: `2px solid ${saved ? 'var(--ok)' : isEmpty ? 'var(--border)' : 'var(--blue)'}`,
        borderRadius: 8, overflow: 'hidden', background: '#fff',
        position: 'relative', cursor: 'crosshair',
        boxShadow: saved ? '0 0 0 3px rgba(25,135,84,0.15)' : '0 0 0 3px rgba(13,110,253,0.08)',
        transition: 'all 0.2s',
      }}>
        {isEmpty && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', color: 'rgba(0,0,0,0.2)', fontSize: isInitials ? '1.5rem' : '1.125rem',
            fontStyle: 'italic', fontFamily: 'Georgia, serif',
          }}>
            {label}
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        {/* Signature line */}
        <div style={{ position: 'absolute', bottom: 28, left: '10%', right: '10%', height: 1, background: 'rgba(0,0,0,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 8, left: '10%', fontSize: 10, color: 'rgba(0,0,0,0.4)', pointerEvents: 'none', fontFamily: 'sans-serif' }}>
          {isInitials ? 'Initials' : 'Signature'}
        </div>
      </div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button onClick={handleClear} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer' }}>
          Clear
        </button>
        <button onClick={handleSave} disabled={isEmpty}
          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, background: isEmpty ? 'var(--border)' : 'var(--blue)', border: 'none', borderRadius: 8, color: isEmpty ? 'var(--muted)' : 'white', cursor: isEmpty ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {saved ? '✓ Saved' : `Save ${isInitials ? 'Initials' : 'Signature'}`}
        </button>
      </div>
      {saved && (
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--ok)', marginTop: '0.25rem', fontWeight: 600 }}>
          ✓ Captured successfully
        </div>
      )}
    </div>
  );
}
