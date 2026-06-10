import React, { useRef, useEffect, useState } from 'react';

interface Point { x: number; y: number; }

interface CanvasMarkupProps {
  imageUrl: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  strokeColor?: string;
  strokeWidth?: number;
}

export function CanvasMarkup({
  imageUrl,
  onSave,
  onCancel,
  strokeColor = '#dc2626', // Bright red by default
  strokeWidth = 4,
}: CanvasMarkupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastPoint = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate aspect ratio to fit the container width
      const maxWidth = container.clientWidth;
      const scale = maxWidth / img.width;
      const width = maxWidth;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Setup drawing style
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl, strokeColor, strokeWidth]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPoint.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint.current) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pt = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    lastPoint.current = pt;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  const handleClear = () => {
    // Redraw the original image
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          border: '2px solid var(--border)',
          background: '#000',
          position: 'relative'
        }}
      >
        {!imageLoaded && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
            Loading image...
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ 
            display: imageLoaded ? 'block' : 'none', 
            width: '100%', 
            touchAction: 'none',
            cursor: 'crosshair'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {imageLoaded && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            pointerEvents: 'none'
          }}>
            Draw to highlight areas
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={handleClear} disabled={!imageLoaded}>
          Clear Drawing
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!imageLoaded}>
          Save Markup
        </button>
      </div>
    </div>
  );
}
