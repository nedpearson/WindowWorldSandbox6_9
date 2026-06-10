import React from 'react';

export function RealisticWindowTypeIcon({ type, className = '' }: { type: string; className?: string }) {
  const svgProps = {
    viewBox: "0 0 200 200",
    className,
    style: { width: '100%', height: '100%', display: 'block' }
  };

  const defs = (
    <defs>
      <linearGradient id="glassGradWT" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="40%" stopColor="#bae6fd" />
        <stop offset="60%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
      <linearGradient id="frameGradWT" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
      <filter id="dropShadowWT" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
      </filter>
      <filter id="innerShadowWT">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="3" result="offset-blur"/>
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
        <feFlood floodColor="black" floodOpacity="0.2" result="color"/>
        <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
        <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
      </filter>
    </defs>
  );

  const baseFrame = (
    <>
      <rect x="20" y="10" width="160" height="180" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
      <rect x="30" y="20" width="140" height="160" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
      {/* Glare line */}
      <path d="M 30 160 L 150 20 L 170 20 L 30 180 Z" fill="rgba(255,255,255,0.3)" />
      <path d="M 30 100 L 90 20 L 110 20 L 30 120 Z" fill="rgba(255,255,255,0.15)" />
    </>
  );

  switch (type.toLowerCase()) {
    case 'double_hung':
      return (
        <svg {...svgProps}>
          {defs}
          {baseFrame}
          {/* Meeting rail */}
          <rect x="25" y="95" width="150" height="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="30" y="105" width="140" height="4" fill="#cbd5e1" opacity="0.5" />
          {/* Upper sash frame inner */}
          <rect x="30" y="20" width="140" height="75" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {/* Lower sash frame inner */}
          <rect x="30" y="105" width="140" height="75" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        </svg>
      );
    case 'picture':
      return (
        <svg {...svgProps}>
          {defs}
          {baseFrame}
          <rect x="30" y="20" width="140" height="160" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        </svg>
      );
    case 'slider':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="10" y="30" width="180" height="140" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="20" y="40" width="160" height="120" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 20 140 L 120 40 L 140 40 L 20 160 Z" fill="rgba(255,255,255,0.3)" />
          {/* Vertical meeting rail */}
          <rect x="95" y="35" width="10" height="130" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          {/* Arrow indicating slide */}
          <path d="M 115 100 L 130 90 L 130 95 L 155 95 L 155 105 L 130 105 L 130 110 Z" fill="#94a3b8" opacity="0.6" />
        </svg>
      );
    case 'casement':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="40" y="10" width="120" height="180" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="50" y="20" width="100" height="160" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 50 160 L 150 20 L 150 40 L 50 180 Z" fill="rgba(255,255,255,0.3)" />
          <rect x="50" y="20" width="100" height="160" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {/* Crank handle cue */}
          <circle cx="95" cy="170" r="4" fill="#94a3b8" />
          <path d="M 95 170 L 105 175" stroke="#94a3b8" strokeWidth="2" />
          {/* Opening hinge lines */}
          <path d="M 50 20 L 150 100 L 50 180" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" opacity="0.4" />
        </svg>
      );
    case 'awning':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="20" y="40" width="160" height="120" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="30" y="50" width="140" height="100" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 30 130 L 110 50 L 130 50 L 30 150 Z" fill="rgba(255,255,255,0.3)" />
          <rect x="30" y="50" width="140" height="100" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="100" cy="140" r="4" fill="#94a3b8" />
          <path d="M 30 150 L 100 50 L 170 150" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" opacity="0.4" />
        </svg>
      );
    case 'patio_door':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="10" y="10" width="180" height="180" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="20" y="20" width="75" height="160" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <rect x="105" y="20" width="75" height="160" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <rect x="95" y="10" width="10" height="180" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="20" y="20" width="75" height="160" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <rect x="105" y="20" width="75" height="160" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {/* Handles */}
          <rect x="85" y="90" width="4" height="20" rx="2" fill="#94a3b8" />
          <rect x="110" y="90" width="4" height="20" rx="2" fill="#94a3b8" />
          <path d="M 120 100 L 140 95 L 140 105 Z" fill="#94a3b8" opacity="0.6" />
        </svg>
      );
    case 'bso':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="30" y="20" width="140" height="160" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" />
          {/* Bottom sash emphasis */}
          <rect x="25" y="95" width="150" height="90" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="35" y="105" width="130" height="70" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 35 150 L 80 105 L 100 105 L 35 170 Z" fill="rgba(255,255,255,0.3)" />
          <rect x="25" y="95" width="150" height="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      );
    case 'special_shape':
      return (
        <svg {...svgProps}>
          {defs}
          <path d="M 20 100 A 80 80 0 0 1 180 100 L 180 180 L 20 180 Z" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" stroke="#cbd5e1" strokeWidth="1" />
          <path d="M 30 100 A 70 70 0 0 1 170 100 L 170 170 L 30 170 Z" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 30 170 L 140 30 L 160 30 L 30 170 Z" fill="rgba(255,255,255,0.3)" />
        </svg>
      );
    case 'oriel':
      return (
        <svg {...svgProps}>
          {defs}
          {baseFrame}
          <rect x="25" y="70" width="150" height="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="30" y="80" width="140" height="4" fill="#cbd5e1" opacity="0.5" />
          <rect x="30" y="20" width="140" height="50" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <rect x="30" y="80" width="140" height="100" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        </svg>
      );
    case 'door_sidelight':
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="70" y="10" width="60" height="180" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="80" y="20" width="40" height="160" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <path d="M 80 160 L 120 120 L 120 140 L 80 180 Z" fill="rgba(255,255,255,0.3)" />
          <rect x="80" y="20" width="40" height="160" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {/* Visual cue for adjacent door */}
          <rect x="15" y="10" width="50" height="180" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" />
          <circle cx="55" cy="100" r="4" fill="#cbd5e1" />
        </svg>
      );
    case 'other':
    default:
      return (
        <svg {...svgProps}>
          {defs}
          <rect x="20" y="20" width="160" height="160" rx="4" fill="url(#frameGradWT)" filter="url(#dropShadowWT)" />
          <rect x="30" y="30" width="140" height="140" rx="2" fill="url(#glassGradWT)" filter="url(#innerShadowWT)" />
          <text x="100" y="110" fontSize="48" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}
