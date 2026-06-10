import React from 'react';

export function getGridPatternIcon(pattern: string, active: boolean = false) {
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

  const framePath = "M 20 20 L 80 20 L 80 80 L 20 80 Z";
  let internalPath = '';

  switch (pattern.toLowerCase()) {
    case 'none':
      // Just the frame
      break;
    case 'colonial':
      // Standard 3V x 2H example
      internalPath = "M 40 20 L 40 80 M 60 20 L 60 80 M 20 40 L 80 40 M 20 60 L 80 60";
      break;
    case 'prairie':
      // Perimeter offset
      internalPath = "M 30 20 L 30 80 M 70 20 L 70 80 M 20 30 L 80 30 M 20 70 L 80 70";
      break;
    case 'diamond':
      // Diagonal lines
      internalPath = "M 50 20 L 20 50 M 80 20 L 20 80 M 80 50 L 50 80 M 20 20 L 80 80 M 50 20 L 80 50 M 20 50 L 50 80";
      break;
    case 'perimeter':
      // Like prairie but maybe simpler or just the frame edge
      internalPath = "M 35 20 L 35 80 M 65 20 L 65 80 M 20 35 L 80 35 M 20 65 L 80 65";
      break;
    case 'craftsman':
      // Only top third has grids
      internalPath = "M 40 20 L 40 40 M 60 20 L 60 40 M 20 40 L 80 40";
      break;
    case 'farmhouse':
      // Simple cross (2V x 2H) or single vertical, single horizontal
      internalPath = "M 50 20 L 50 80 M 20 50 L 80 50";
      break;
    case 'custom':
    case 'other':
      // A generic mixed pattern
      internalPath = "M 50 20 L 50 50 M 20 50 L 80 50 M 20 80 L 80 20";
      break;
    default:
      // Fallback
      internalPath = "M 50 20 L 50 80 M 20 50 L 80 50";
      break;
  }

  return (
    <div style={{
      width: '100%', aspectRatio: '1', padding: '10%',
      border: `2px solid ${border}`, borderRadius: 12,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <svg {...wrapperProps}>
        <path d={framePath} />
        {internalPath && <path d={internalPath} strokeWidth={2} />}
      </svg>
    </div>
  );
}
