import React from 'react';
import type { ShapeType } from '../utils/sketchSync';

export function getShapeIcon(shape: ShapeType | string, active: boolean = false) {
  const color = active ? '#3b82f6' : '#94a3b8';
  const bg = active ? 'rgba(59,130,246,0.1)' : 'transparent';
  const border = active ? '#3b82f6' : 'var(--border)';

  const wrapperProps = {
    viewBox: "0 0 100 100",
    fill: "none",
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { width: '100%', height: '100%' }
  };

  let path = '';
  switch (shape) {
    case 'circle_top':
    case 'half_round':
      // A rectangle with a half-circle on top
      path = "M 20 80 L 80 80 L 80 50 A 30 30 0 0 0 20 50 Z M 20 50 L 80 50";
      break;
    case 'arch':
      // An extended arch (rectangle with a soft arch on top)
      path = "M 20 80 L 80 80 L 80 40 Q 50 10 20 40 Z M 20 40 L 80 40";
      break;
    case 'quarter_arch':
      // Quarter arch (one side straight, one curved)
      path = "M 20 80 L 80 80 L 80 20 A 60 60 0 0 0 20 80 Z";
      break;
    case 'eyebrow':
      // Wide rectangle with a slight curve
      path = "M 10 80 L 90 80 L 90 50 Q 50 30 10 50 Z M 10 50 L 90 50";
      break;
    case 'extended_leg':
      // Half round with very long legs
      path = "M 20 90 L 80 90 L 80 40 A 30 30 0 0 0 20 40 Z M 20 40 L 80 40";
      break;
    case 'trapezoid':
      // Angled top
      path = "M 20 80 L 80 80 L 80 40 L 20 20 Z";
      break;
    case 'cathedral':
      // Pointed arch
      path = "M 20 80 L 80 80 L 80 50 Q 50 50 50 20 Q 50 50 20 50 Z M 20 50 L 80 50";
      break;
    case 'hexagon':
      path = "M 30 20 L 70 20 L 90 50 L 70 80 L 30 80 L 10 50 Z";
      break;
    case 'octagon':
      path = "M 35 15 L 65 15 L 85 35 L 85 65 L 65 85 L 35 85 L 15 65 L 15 35 Z";
      break;
    case 'pentagon':
      path = "M 50 10 L 90 40 L 80 90 L 20 90 L 10 40 Z";
      break;
    case 'triangle':
      path = "M 20 80 L 80 80 L 50 20 Z";
      break;
    case 'oval':
      path = "M 50 90 C 10 90 10 10 50 10 C 90 10 90 90 50 90 Z";
      break;
    case 'ellipse':
      path = "M 50 80 C 10 80 10 20 50 20 C 90 20 90 80 50 80 Z";
      break;
    case 'custom':
    case 'other':
      path = "M 30 30 L 70 30 L 70 70 L 30 70 Z M 40 40 L 60 60 M 60 40 L 40 60";
      break;
    default:
      // Fallback
      path = "M 20 80 L 80 80 L 80 20 L 20 20 Z";
      break;
  }

  return (
    <div style={{
      width: '100%', aspectRatio: '1', padding: '10%',
      border: `2px solid ${border}`, borderRadius: 12,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <svg {...wrapperProps}>
        <path d={path} />
      </svg>
    </div>
  );
}
