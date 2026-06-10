import React from 'react';

export function RealisticGridPatternIcon({ pattern, className = '' }: { pattern: string; className?: string }) {
  const svgProps = {
    viewBox: "0 0 200 200",
    className,
    style: { width: '100%', height: '100%', display: 'block' }
  };

  const defs = (
    <defs>
      <linearGradient id="glassGradGrid" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="40%" stopColor="#bae6fd" />
        <stop offset="60%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
      <linearGradient id="frameGradGrid" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
      <filter id="dropShadowGrid" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
      </filter>
      <filter id="innerShadowGrid">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="3" result="offset-blur"/>
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
        <feFlood floodColor="black" floodOpacity="0.2" result="color"/>
        <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
        <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
      </filter>
    </defs>
  );

  // A standard rectangular window frame
  const framePath = "M 30 180 L 170 180 L 170 20 L 30 20 Z";

  const renderInternalGrids = () => {
    let internalPath = '';
    const strokeWidth = 8; // realistic muntin thickness

    switch (pattern.toLowerCase()) {
      case 'none':
        return null;
      case 'colonial':
        // 3V x 2H
        internalPath = "M 76 20 L 76 180 M 123 20 L 123 180 M 30 73 L 170 73 M 30 126 L 170 126";
        break;
      case 'prairie':
        // Perimeter offset (e.g. 20px from edge)
        internalPath = "M 50 20 L 50 180 M 150 20 L 150 180 M 30 40 L 170 40 M 30 160 L 170 160";
        break;
      case 'diamond':
        // Diagonal diamond lattice
        internalPath = "M 100 20 L 30 90 M 170 20 L 30 160 M 170 90 L 100 160 M 30 20 L 100 90 M 30 90 L 170 20 M 100 160 L 170 90 M 30 160 L 170 20";
        break;
      case 'perimeter':
        // Similar to prairie but distinct? Usually just lines near edge
        internalPath = "M 45 20 L 45 180 M 155 20 L 155 180 M 30 40 L 170 40 M 30 160 L 170 160";
        break;
      case 'craftsman':
        // Top section with vertical dividers, lower pane clear
        internalPath = "M 30 70 L 170 70 M 76 20 L 76 70 M 123 20 L 123 70";
        break;
      case 'farmhouse':
        // 2V x 2H or single cross
        internalPath = "M 100 20 L 100 180 M 30 100 L 170 100";
        break;
      case 'custom':
      case 'other':
        // A generic mixed pattern
        internalPath = "M 100 20 L 100 80 M 30 80 L 170 80 M 30 130 L 170 130 M 70 80 L 70 180";
        break;
      default:
        return null;
    }

    return (
      <g stroke="#ffffff" strokeWidth={strokeWidth} filter="url(#dropShadowGrid)" strokeLinecap="square">
        <path d={internalPath} clipPath="url(#glassClipGrid)" />
      </g>
    );
  };

  return (
    <svg {...svgProps}>
      {defs}
      <clipPath id="glassClipGrid">
        <path d={framePath} />
      </clipPath>
      
      {/* Outer Drop Shadow + Frame */}
      <path 
        d={framePath} 
        fill="url(#frameGradGrid)" 
        filter="url(#dropShadowGrid)" 
        stroke="#cbd5e1" 
        strokeWidth="1" 
      />
      
      {/* Glass (Inner shape) */}
      <path 
        d={framePath} 
        fill="url(#glassGradGrid)" 
        stroke="#ffffff" 
        strokeWidth="16" 
        filter="url(#innerShadowGrid)"
      />
      
      {/* Glass reflection streak */}
      <path 
        d="M 10 190 L 190 10" 
        stroke="#ffffff" 
        strokeWidth="40" 
        opacity="0.15" 
        clipPath="url(#glassClipGrid)" 
      />

      {/* Grid Lines */}
      {renderInternalGrids()}
    </svg>
  );
}
