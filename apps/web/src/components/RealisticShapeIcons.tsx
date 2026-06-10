import React from 'react';
import type { ShapeType } from '../utils/sketchSync';

export function RealisticShapeIcon({ shape, className = '' }: { shape: ShapeType | string; className?: string }) {
  // We use a responsive SVG viewBox (0 0 200 200) to give enough resolution for realistic details.
  const svgProps = {
    viewBox: "0 0 200 200",
    className,
    style: { width: '100%', height: '100%', display: 'block' }
  };

  // Common glass linear gradient reflecting the sky
  const defs = (
    <defs>
      <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="40%" stopColor="#bae6fd" />
        <stop offset="60%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
      <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
      <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
      </filter>
      <filter id="innerShadow">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="3" result="offset-blur"/>
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
        <feFlood floodColor="black" floodOpacity="0.2" result="color"/>
        <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
        <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
      </filter>
    </defs>
  );

  const getPath = (s: string) => {
    switch (s) {
      case 'arch':
        // A rectangle with a soft arch on top
        return "M 40 180 L 160 180 L 160 100 Q 100 20 40 100 Z";
      case 'eyebrow':
        // Wide rectangle with a slight curve
        return "M 20 180 L 180 180 L 180 120 Q 100 60 20 120 Z";
      case 'circle_top':
      case 'half_round':
        // A full half-circle (or resting on a small rectangle)
        return "M 40 180 L 160 180 L 160 100 A 60 60 0 0 0 40 100 Z";
      case 'quarter_arch':
        // Quarter arch (one side straight, one curved)
        return "M 40 180 L 160 180 L 160 60 A 120 120 0 0 0 40 180 Z";
      case 'extended_leg':
        // Half round with very long legs
        return "M 40 180 L 160 180 L 160 80 A 60 60 0 0 0 40 80 Z";
      case 'cathedral':
        // Pointed arch
        return "M 40 180 L 160 180 L 160 100 Q 100 100 100 30 Q 100 100 40 100 Z";
      case 'hexagon':
        return "M 60 30 L 140 30 L 180 100 L 140 170 L 60 170 L 20 100 Z";
      case 'octagon':
        return "M 70 30 L 130 30 L 170 70 L 170 130 L 130 170 L 70 170 L 30 130 L 30 70 Z";
      case 'triangle':
        return "M 40 180 L 160 180 L 100 30 Z";
      case 'trapezoid':
        return "M 40 180 L 160 180 L 160 100 L 40 40 Z";
      case 'oval':
      case 'ellipse':
        return "M 100 180 C 10 180 10 20 100 20 C 190 20 190 180 100 180 Z";
      case 'custom':
      case 'other':
        // A generic asymmetrical polygonal shape
        return "M 60 40 L 150 60 L 160 150 L 50 170 Z";
      default:
        // Fallback generic rectangle
        return "M 40 180 L 160 180 L 160 20 L 40 20 Z";
    }
  };

  const pathD = getPath(shape);

  // A helper function to draw simple grid lines inside the shape
  const renderGrids = () => {
    // Only add grids to some shapes to make it look realistic but not cluttered
    return (
      <g stroke="#ffffff" strokeWidth="3" opacity="0.8">
        <path d="M 100 20 L 100 180" clipPath="url(#glassClip)" />
        <path d="M 20 100 L 180 100" clipPath="url(#glassClip)" />
      </g>
    );
  };

  return (
    <svg {...svgProps}>
      {defs}
      <clipPath id="glassClip">
        <path d={pathD} />
      </clipPath>
      
      {/* Outer Drop Shadow + Frame */}
      <path 
        d={pathD} 
        fill="url(#frameGrad)" 
        filter="url(#dropShadow)" 
        stroke="#cbd5e1" 
        strokeWidth="1" 
      />
      
      {/* Glass (Inner shape) */}
      {/* We stroke the glass path with white to create the inner frame lip */}
      <path 
        d={pathD} 
        fill="url(#glassGrad)" 
        stroke="#ffffff" 
        strokeWidth="12" 
        filter="url(#innerShadow)"
      />
      
      {/* Glass reflection streak */}
      <path 
        d="M 20 180 L 180 20" 
        stroke="#ffffff" 
        strokeWidth="30" 
        opacity="0.1" 
        clipPath="url(#glassClip)" 
      />

      {/* Grid Lines */}
      {renderGrids()}
    </svg>
  );
}
