import React, { ReactNode } from 'react';

export function getRemovalTypeIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'ALUM':
      return (
        <svg {...svgProps} aria-label="Aluminum frame removal">
          <defs>
            <linearGradient id="alumFrameG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="30%" stopColor="#b0b8c4" />
              <stop offset="60%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
            <linearGradient id="alumHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
            </linearGradient>
            <filter id="alumShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2" />
            </filter>
            <linearGradient id="alumGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* Outer frame */}
          <rect x="12" y="8" width="76" height="84" rx="2" fill="url(#alumFrameG)" filter="url(#alumShadow)" />
          {/* Inner glass */}
          <rect x="20" y="16" width="60" height="68" rx="1" fill="url(#alumGlass)" />
          {/* Highlight strip */}
          <rect x="12" y="8" width="76" height="8" rx="2" fill="url(#alumHighlight)" />
          {/* Crossbar */}
          <rect x="12" y="46" width="76" height="8" rx="1" fill="url(#alumFrameG)" />
          <line x1="12" y1="47" x2="88" y2="47" stroke="#e5e7eb" strokeWidth="0.5" strokeOpacity="0.5" />
          {/* Weathering lines */}
          <line x1="14" y1="30" x2="18" y2="30" stroke="#6b7280" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="14" y1="35" x2="17" y2="35" stroke="#6b7280" strokeWidth="0.5" strokeOpacity="0.3" />
          <line x1="82" y1="65" x2="86" y2="65" stroke="#6b7280" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="83" y1="70" x2="86" y2="70" stroke="#6b7280" strokeWidth="0.5" strokeOpacity="0.3" />
          {/* Oxidation spots */}
          <circle cx="16" cy="80" r="1.5" fill="#9ca3af" fillOpacity="0.4" />
          <circle cx="84" cy="15" r="1" fill="#9ca3af" fillOpacity="0.3" />
          {/* Glass glare */}
          <path d="M 22 70 L 60 16 L 68 16 L 22 78 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );

    case 'WOOD':
      return (
        <svg {...svgProps} aria-label="Wood frame removal">
          <defs>
            <linearGradient id="woodFrameG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a0764a" />
              <stop offset="50%" stopColor="#8b6240" />
              <stop offset="100%" stopColor="#6d4c30" />
            </linearGradient>
            <linearGradient id="woodGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="woodShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Outer frame */}
          <rect x="12" y="8" width="76" height="84" rx="2" fill="url(#woodFrameG)" filter="url(#woodShadow)" />
          {/* Inner glass */}
          <rect x="22" y="18" width="56" height="64" rx="1" fill="url(#woodGlass)" />
          {/* Wood grain lines */}
          <line x1="14" y1="12" x2="14" y2="90" stroke="#6d4c30" strokeWidth="0.6" strokeOpacity="0.4" />
          <line x1="17" y1="10" x2="17" y2="88" stroke="#5c3d25" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="85" y1="12" x2="85" y2="90" stroke="#6d4c30" strokeWidth="0.6" strokeOpacity="0.4" />
          <line x1="82" y1="10" x2="82" y2="88" stroke="#5c3d25" strokeWidth="0.4" strokeOpacity="0.3" />
          {/* Horizontal grain on top/bottom rails */}
          <line x1="22" y1="12" x2="78" y2="12" stroke="#6d4c30" strokeWidth="0.5" strokeOpacity="0.3" />
          <line x1="22" y1="14" x2="78" y2="14" stroke="#5c3d25" strokeWidth="0.4" strokeOpacity="0.2" />
          <line x1="22" y1="86" x2="78" y2="86" stroke="#6d4c30" strokeWidth="0.5" strokeOpacity="0.3" />
          <line x1="22" y1="88" x2="78" y2="88" stroke="#5c3d25" strokeWidth="0.4" strokeOpacity="0.2" />
          {/* Knot */}
          <ellipse cx="16" cy="55" rx="2" ry="3" fill="#5c3d25" fillOpacity="0.5" />
          {/* Glass glare */}
          <path d="M 24 68 L 58 18 L 66 18 L 24 76 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );

    case 'VINYL':
      return (
        <svg {...svgProps} aria-label="Vinyl frame removal">
          <defs>
            <linearGradient id="vinylFrameG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="vinylGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="vinylShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
            <filter id="vinylInner">
              <feOffset dx="1" dy="1" />
              <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="#94a3b8" floodOpacity="0.15" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>
          </defs>
          {/* Outer frame */}
          <rect x="12" y="8" width="76" height="84" rx="3" fill="url(#vinylFrameG)" filter="url(#vinylShadow)" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Inner glass */}
          <rect x="22" y="18" width="56" height="64" rx="2" fill="url(#vinylGlass)" filter="url(#vinylInner)" />
          {/* Frame depth lines */}
          <rect x="18" y="14" width="64" height="72" rx="2" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
          {/* Subtle bevel highlight */}
          <line x1="13" y1="9" x2="87" y2="9" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="13" y1="9" x2="13" y2="91" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
          {/* Glass glare */}
          <path d="M 24 68 L 58 18 L 66 18 L 24 76 Z" fill="rgba(255,255,255,0.3)" />
        </svg>
      );

    case 'STEEL':
      return (
        <svg {...svgProps} aria-label="Steel frame removal">
          <defs>
            <linearGradient id="steelFrameG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <radialGradient id="rivetG" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </radialGradient>
            <linearGradient id="steelGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="steelShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>
          {/* Thick outer frame */}
          <rect x="10" y="6" width="80" height="88" rx="1" fill="url(#steelFrameG)" filter="url(#steelShadow)" />
          {/* Inner glass */}
          <rect x="24" y="20" width="52" height="60" rx="1" fill="url(#steelGlass)" />
          {/* Frame depth */}
          <rect x="20" y="16" width="60" height="68" fill="none" stroke="#334155" strokeWidth="2" />
          {/* Rivets/bolts */}
          <circle cx="16" cy="14" r="3" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="84" cy="14" r="3" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="16" cy="86" r="3" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="84" cy="86" r="3" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="16" cy="50" r="2.5" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="84" cy="50" r="2.5" fill="url(#rivetG)" stroke="#334155" strokeWidth="0.5" />
          {/* Metallic highlight line */}
          <line x1="11" y1="7" x2="89" y2="7" stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.4" />
          {/* Glass glare */}
          <path d="M 26 66 L 56 20 L 64 20 L 26 74 Z" fill="rgba(255,255,255,0.15)" />
        </svg>
      );

    case 'STORM':
      return (
        <svg {...svgProps} aria-label="Storm window removal">
          <defs>
            <linearGradient id="stormFrame1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="stormGlass1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="stormGlass2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.4" />
            </linearGradient>
            <filter id="stormShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Back pane (larger, offset) */}
          <rect x="8" y="6" width="70" height="78" rx="2" fill="url(#stormFrame1)" filter="url(#stormShadow)" />
          <rect x="14" y="12" width="58" height="66" rx="1" fill="url(#stormGlass1)" />
          <path d="M 16 64 L 52 12 L 60 12 L 16 72 Z" fill="rgba(255,255,255,0.2)" />
          {/* Front pane (overlapping) */}
          <rect x="22" y="16" width="70" height="78" rx="2" fill="url(#stormFrame1)" filter="url(#stormShadow)" opacity="0.95" />
          <rect x="28" y="22" width="58" height="66" rx="1" fill="url(#stormGlass2)" />
          <path d="M 30 74 L 66 22 L 74 22 L 30 82 Z" fill="rgba(255,255,255,0.25)" />
          {/* Gap indicator between panes */}
          <line x1="20" y1="90" x2="24" y2="90" stroke="#94a3b8" strokeWidth="1" />
          <text x="22" y="98" fontSize="6" fill="#94a3b8" textAnchor="middle">2×</text>
        </svg>
      );

    case 'none':
      return (
        <svg {...svgProps} aria-label="No removal needed">
          <defs>
            <filter id="noRemShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>
          {/* Dashed outline */}
          <rect x="15" y="12" width="70" height="76" rx="4" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6,4" filter="url(#noRemShadow)" />
          {/* Ø symbol */}
          <circle cx="50" cy="50" r="18" fill="none" stroke="#64748b" strokeWidth="2.5" />
          <line x1="37" y1="37" x2="63" y2="63" stroke="#64748b" strokeWidth="2.5" />
        </svg>
      );

    case 'other':
    default:
      return (
        <svg {...svgProps} aria-label="Other removal type">
          <defs>
            <linearGradient id="otherRemFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <filter id="otherRemShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          <rect x="15" y="10" width="70" height="80" rx="3" fill="url(#otherRemFrame)" filter="url(#otherRemShadow)" />
          <rect x="23" y="18" width="54" height="64" rx="2" fill="#dbeafe" fillOpacity="0.3" />
          <text x="50" y="58" fontSize="36" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}

export function getInstallTypeIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'EXT':
      return (
        <svg {...svgProps} aria-label="Exterior install">
          <defs>
            <linearGradient id="extSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
            <linearGradient id="extWall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <linearGradient id="extFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="extGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
            </linearGradient>
            <filter id="extShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Sky background */}
          <rect x="35" y="15" width="40" height="60" fill="url(#extSky)" />
          {/* Wall cross-section — left */}
          <rect x="5" y="10" width="30" height="80" fill="url(#extWall)" />
          {/* Wall cross-section — right */}
          <rect x="75" y="10" width="20" height="80" fill="url(#extWall)" />
          {/* Wall face line (exterior face) */}
          <line x1="5" y1="10" x2="5" y2="90" stroke="#57534e" strokeWidth="2" />
          {/* Window frame flush with exterior */}
          <rect x="32" y="18" width="46" height="54" rx="2" fill="url(#extFrame)" filter="url(#extShadow)" />
          <rect x="36" y="22" width="38" height="46" rx="1" fill="url(#extGlass)" />
          {/* Frame flush line at exterior face */}
          <line x1="32" y1="18" x2="32" y2="72" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Arrow pointing outward */}
          <path d="M 50 82 L 50 92 M 44 88 L 50 95 L 56 88" stroke="#3b82f6" strokeWidth="2" fill="none" />
          <text x="50" y="78" fontSize="6" fill="#3b82f6" textAnchor="middle" fontWeight="bold">EXT</text>
          {/* Glass glare */}
          <path d="M 38 56 L 58 22 L 64 22 L 38 62 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );

    case 'INT':
      return (
        <svg {...svgProps} aria-label="Interior install">
          <defs>
            <linearGradient id="intInterior" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="intWall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="intFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="intGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="intShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Interior warm background */}
          <rect x="35" y="15" width="40" height="60" fill="url(#intInterior)" />
          {/* Wall cross-section — left */}
          <rect x="5" y="10" width="30" height="80" fill="url(#intWall)" />
          {/* Wall cross-section — right */}
          <rect x="75" y="10" width="20" height="80" fill="url(#intWall)" />
          {/* Interior face line */}
          <line x1="95" y1="10" x2="95" y2="90" stroke="#92400e" strokeWidth="2" />
          {/* Window frame set back from exterior */}
          <rect x="40" y="18" width="46" height="54" rx="2" fill="url(#intFrame)" filter="url(#intShadow)" />
          <rect x="44" y="22" width="38" height="46" rx="1" fill="url(#intGlass)" />
          {/* Frame set-back line */}
          <line x1="86" y1="18" x2="86" y2="72" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Arrow pointing inward */}
          <path d="M 50 82 L 50 92 M 44 88 L 50 95 L 56 88" stroke="#f59e0b" strokeWidth="2" fill="none" transform="rotate(180 50 88.5)" />
          <text x="50" y="98" fontSize="6" fill="#f59e0b" textAnchor="middle" fontWeight="bold">INT</text>
          {/* Glass glare */}
          <path d="M 46 56 L 66 22 L 72 22 L 46 62 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );

    case 'replacement':
      return (
        <svg {...svgProps} aria-label="Replacement / pocket install">
          <defs>
            <linearGradient id="repOldFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="repNewFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            <linearGradient id="repGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
            <filter id="repShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Old outer frame (larger, worn) */}
          <rect x="10" y="8" width="80" height="84" rx="3" fill="url(#repOldFrame)" filter="url(#repShadow)" />
          <rect x="14" y="12" width="72" height="76" fill="none" stroke="#57534e" strokeWidth="1" strokeDasharray="4,2" />
          {/* Weathering on old frame */}
          <line x1="12" y1="25" x2="16" y2="25" stroke="#57534e" strokeWidth="0.5" strokeOpacity="0.5" />
          <line x1="84" y1="40" x2="88" y2="40" stroke="#57534e" strokeWidth="0.5" strokeOpacity="0.5" />
          {/* New inner frame (clean, white) */}
          <rect x="20" y="18" width="60" height="64" rx="2" fill="url(#repNewFrame)" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="26" y="24" width="48" height="52" rx="1" fill="url(#repGlass)" />
          {/* New frame highlight */}
          <line x1="21" y1="19" x2="79" y2="19" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
          {/* Glass glare */}
          <path d="M 28 62 L 56 24 L 64 24 L 28 70 Z" fill="rgba(255,255,255,0.25)" />
          {/* Label */}
          <text x="50" y="96" fontSize="5" fill="#94a3b8" textAnchor="middle">POCKET</text>
        </svg>
      );

    case 'full_frame':
      return (
        <svg {...svgProps} aria-label="Full frame install">
          <defs>
            <linearGradient id="ffFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            <linearGradient id="ffGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="ffWall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <filter id="ffShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Torn-out wall edges (jagged) */}
          <path d="M 8 8 L 18 8 L 16 15 L 20 20 L 17 28 L 20 35 L 16 42 L 20 50 L 17 58 L 20 65 L 16 72 L 20 78 L 18 85 L 16 92 L 8 92 Z" fill="url(#ffWall)" />
          <path d="M 92 8 L 82 8 L 84 15 L 80 20 L 83 28 L 80 35 L 84 42 L 80 50 L 83 58 L 80 65 L 84 72 L 80 78 L 82 85 L 84 92 L 92 92 Z" fill="url(#ffWall)" />
          {/* Top wall */}
          <rect x="8" y="4" width="84" height="6" fill="url(#ffWall)" />
          {/* Bottom wall */}
          <rect x="8" y="90" width="84" height="6" fill="url(#ffWall)" />
          {/* Full opening */}
          <rect x="18" y="8" width="64" height="84" fill="#1e293b" />
          {/* New frame fills entire opening */}
          <rect x="18" y="8" width="64" height="84" rx="2" fill="url(#ffFrame)" filter="url(#ffShadow)" />
          <rect x="26" y="16" width="48" height="68" rx="1" fill="url(#ffGlass)" />
          {/* Frame highlight */}
          <line x1="19" y1="9" x2="81" y2="9" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
          {/* Glass glare */}
          <path d="M 28 70 L 56 16 L 64 16 L 28 78 Z" fill="rgba(255,255,255,0.25)" />
          {/* Full frame arrows on sides */}
          <path d="M 12 50 L 6 50 M 9 46 L 4 50 L 9 54" stroke="#ef4444" strokeWidth="1.5" fill="none" />
          <path d="M 88 50 L 94 50 M 91 46 L 96 50 L 91 54" stroke="#ef4444" strokeWidth="1.5" fill="none" />
        </svg>
      );

    case 'new_construction':
      return (
        <svg {...svgProps} aria-label="New construction install">
          <defs>
            <linearGradient id="ncStud" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d4a76a" />
              <stop offset="50%" stopColor="#c4975a" />
              <stop offset="100%" stopColor="#b8894e" />
            </linearGradient>
            <linearGradient id="ncFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            <linearGradient id="ncGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="ncFin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <filter id="ncShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Wall studs behind */}
          <rect x="6" y="5" width="10" height="90" rx="1" fill="url(#ncStud)" />
          <rect x="84" y="5" width="10" height="90" rx="1" fill="url(#ncStud)" />
          {/* Stud grain lines */}
          <line x1="8" y1="8" x2="8" y2="92" stroke="#b8894e" strokeWidth="0.4" strokeOpacity="0.5" />
          <line x1="86" y1="8" x2="86" y2="92" stroke="#b8894e" strokeWidth="0.4" strokeOpacity="0.5" />
          {/* Header stud */}
          <rect x="6" y="5" width="88" height="8" rx="1" fill="url(#ncStud)" />
          {/* Sill stud */}
          <rect x="6" y="87" width="88" height="8" rx="1" fill="url(#ncStud)" />
          {/* Opening */}
          <rect x="16" y="13" width="68" height="74" fill="#0f172a" />
          {/* Window frame */}
          <rect x="20" y="17" width="60" height="66" rx="2" fill="url(#ncFrame)" filter="url(#ncShadow)" />
          <rect x="28" y="25" width="44" height="50" rx="1" fill="url(#ncGlass)" />
          {/* Nail fin flanges — left */}
          <rect x="14" y="17" width="6" height="66" fill="url(#ncFin)" stroke="#94a3b8" strokeWidth="0.5" />
          {/* Nail fin flanges — right */}
          <rect x="80" y="17" width="6" height="66" fill="url(#ncFin)" stroke="#94a3b8" strokeWidth="0.5" />
          {/* Nail dots on fins */}
          <circle cx="17" cy="30" r="1.2" fill="#64748b" />
          <circle cx="17" cy="50" r="1.2" fill="#64748b" />
          <circle cx="17" cy="70" r="1.2" fill="#64748b" />
          <circle cx="83" cy="30" r="1.2" fill="#64748b" />
          <circle cx="83" cy="50" r="1.2" fill="#64748b" />
          <circle cx="83" cy="70" r="1.2" fill="#64748b" />
          {/* Glass glare */}
          <path d="M 30 62 L 54 25 L 62 25 L 30 70 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );

    case 'other':
    default:
      return (
        <svg {...svgProps} aria-label="Other install type">
          <defs>
            <linearGradient id="otherInstFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <filter id="otherInstShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          <rect x="15" y="10" width="70" height="80" rx="3" fill="url(#otherInstFrame)" filter="url(#otherInstShadow)" />
          <rect x="23" y="18" width="54" height="64" rx="2" fill="#dbeafe" fillOpacity="0.3" />
          <text x="50" y="58" fontSize="36" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}
