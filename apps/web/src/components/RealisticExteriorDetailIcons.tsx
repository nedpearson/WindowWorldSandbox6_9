import React, { ReactNode } from 'react';

export function getTrimIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'Vinyl trim':
      return (
        <svg {...svgProps} aria-label="Vinyl trim">
          <defs>
            <linearGradient id="vtFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="vtTrim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#f8fafc" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="vtGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="vtShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Wall background */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="#a8a29e" />
          {/* J-channel trim — outer profile (around window) */}
          <rect x="14" y="12" width="72" height="76" rx="2" fill="url(#vtTrim)" filter="url(#vtShadow)" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Trim profile detail — lip/channel lines */}
          <rect x="14" y="12" width="72" height="3" fill="#f1f5f9" />
          <rect x="14" y="85" width="72" height="3" fill="#e2e8f0" />
          <rect x="14" y="12" width="3" height="76" fill="#f8fafc" />
          <rect x="83" y="12" width="3" height="76" fill="#e2e8f0" />
          {/* Bevel highlight on trim */}
          <line x1="15" y1="13" x2="85" y2="13" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.9" />
          <line x1="15" y1="13" x2="15" y2="87" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7" />
          {/* Window frame inside trim */}
          <rect x="20" y="18" width="60" height="64" rx="1" fill="url(#vtFrame)" />
          {/* Glass */}
          <rect x="26" y="24" width="48" height="52" rx="1" fill="url(#vtGlass)" />
          {/* Glass glare */}
          <path d="M 28 62 L 54 24 L 62 24 L 28 70 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );

    case 'Custom trim':
      return (
        <svg {...svgProps} aria-label="Custom trim">
          <defs>
            <linearGradient id="ctTrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f5f0e8" />
              <stop offset="100%" stopColor="#d4c8b8" />
            </linearGradient>
            <linearGradient id="ctGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="ctShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Wall background */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="#a8a29e" />
          {/* Decorative molding trim — ornate profile */}
          <rect x="12" y="10" width="76" height="80" rx="3" fill="url(#ctTrim)" filter="url(#ctShadow)" />
          {/* Crown molding top */}
          <path d="M 12 10 Q 12 7 15 7 L 85 7 Q 88 7 88 10" fill="url(#ctTrim)" stroke="#c4b8a8" strokeWidth="0.5" />
          {/* Decorative groove lines */}
          <line x1="16" y1="15" x2="16" y2="86" stroke="#c4b8a8" strokeWidth="1" />
          <line x1="19" y1="15" x2="19" y2="86" stroke="#c4b8a8" strokeWidth="0.5" />
          <line x1="84" y1="15" x2="84" y2="86" stroke="#c4b8a8" strokeWidth="1" />
          <line x1="81" y1="15" x2="81" y2="86" stroke="#c4b8a8" strokeWidth="0.5" />
          {/* Inner window */}
          <rect x="24" y="20" width="52" height="60" rx="1" fill="url(#ctGlass)" />
          {/* Glass glare */}
          <path d="M 26 66 L 56 20 L 64 20 L 26 74 Z" fill="rgba(255,255,255,0.2)" />
          {/* Question mark overlay */}
          <circle cx="50" cy="48" r="14" fill="rgba(0,0,0,0.3)" />
          <text x="50" y="54" fontSize="20" fontWeight="bold" fill="#ffffff" textAnchor="middle">?</text>
        </svg>
      );

    case 'None':
    default:
      return (
        <svg {...svgProps} aria-label="No trim">
          <defs>
            <linearGradient id="ntWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="ntFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="ntGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="ntShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#ntWall)" />
          {/* Bare frame edge — no trim, gap visible */}
          <rect x="20" y="16" width="60" height="68" rx="1" fill="#1e293b" />
          {/* Frame */}
          <rect x="22" y="18" width="56" height="64" rx="1" fill="url(#ntFrame)" filter="url(#ntShadow)" />
          {/* Glass */}
          <rect x="28" y="24" width="44" height="52" rx="1" fill="url(#ntGlass)" />
          {/* Gap lines between frame and wall */}
          <line x1="20" y1="16" x2="20" y2="84" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="80" y1="16" x2="80" y2="84" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          {/* Glass glare */}
          <path d="M 30 62 L 54 24 L 62 24 L 30 70 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );
  }
}

export function getHeaderIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'New header':
      return (
        <svg {...svgProps} aria-label="New header">
          <defs>
            <linearGradient id="nhWood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e8c874" />
              <stop offset="50%" stopColor="#d4a64a" />
              <stop offset="100%" stopColor="#c49638" />
            </linearGradient>
            <linearGradient id="nhWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="nhFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="nhGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="nhShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>
          {/* Wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#nhWall)" />
          {/* Opening */}
          <rect x="18" y="22" width="64" height="68" fill="#1e293b" />
          {/* New header beam — golden fresh lumber */}
          <rect x="10" y="10" width="80" height="14" rx="1" fill="url(#nhWood)" filter="url(#nhShadow)" stroke="#c49638" strokeWidth="0.5" />
          {/* Wood grain on header */}
          <line x1="12" y1="14" x2="88" y2="14" stroke="#c49638" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="12" y1="17" x2="88" y2="17" stroke="#b8894e" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="12" y1="20" x2="88" y2="20" stroke="#c49638" strokeWidth="0.3" strokeOpacity="0.3" />
          {/* "NEW" label stamp */}
          <rect x="35" y="12" width="30" height="10" rx="2" fill="none" stroke="#22c55e" strokeWidth="1" />
          <text x="50" y="20" fontSize="7" fontWeight="bold" fill="#22c55e" textAnchor="middle">NEW</text>
          {/* Window frame */}
          <rect x="22" y="28" width="56" height="58" rx="1" fill="url(#nhFrame)" />
          <rect x="28" y="34" width="44" height="46" rx="1" fill="url(#nhGlass)" />
          {/* Glass glare */}
          <path d="M 30 66 L 54 34 L 62 34 L 30 74 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );

    case 'Reuse header':
      return (
        <svg {...svgProps} aria-label="Reuse existing header">
          <defs>
            <linearGradient id="rhWood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a89078" />
              <stop offset="50%" stopColor="#8b7560" />
              <stop offset="100%" stopColor="#7a6450" />
            </linearGradient>
            <linearGradient id="rhWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="rhFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="rhGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="rhShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#rhWall)" />
          {/* Opening */}
          <rect x="18" y="22" width="64" height="68" fill="#1e293b" />
          {/* Existing header beam — gray-brown worn */}
          <rect x="10" y="10" width="80" height="14" rx="1" fill="url(#rhWood)" filter="url(#rhShadow)" />
          {/* Wear marks */}
          <line x1="20" y1="13" x2="24" y2="14" stroke="#6b5a48" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="55" y1="16" x2="60" y2="15" stroke="#6b5a48" strokeWidth="0.6" strokeOpacity="0.3" />
          <line x1="70" y1="12" x2="75" y2="13" stroke="#6b5a48" strokeWidth="0.7" strokeOpacity="0.4" />
          {/* Grain */}
          <line x1="12" y1="15" x2="88" y2="15" stroke="#7a6450" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="12" y1="18" x2="88" y2="18" stroke="#6b5a48" strokeWidth="0.3" strokeOpacity="0.25" />
          {/* Recycle arrow icon */}
          <path d="M 46 14 A 5 5 0 1 1 54 14" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
          <path d="M 53 12 L 55 14 L 53 16" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
          {/* Window frame */}
          <rect x="22" y="28" width="56" height="58" rx="1" fill="url(#rhFrame)" />
          <rect x="28" y="34" width="44" height="46" rx="1" fill="url(#rhGlass)" />
          {/* Glass glare */}
          <path d="M 30 66 L 54 34 L 62 34 L 30 74 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );

    case 'None':
    default:
      return (
        <svg {...svgProps} aria-label="No header">
          <defs>
            <linearGradient id="noHdWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            <linearGradient id="noHdStud" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d4a76a" />
              <stop offset="100%" stopColor="#c4975a" />
            </linearGradient>
            <linearGradient id="noHdFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="noHdGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="noHdShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#noHdWall)" />
          {/* Opening — no header, just studs */}
          <rect x="18" y="8" width="64" height="82" fill="#1e293b" />
          {/* Studs on sides */}
          <rect x="10" y="5" width="10" height="90" fill="url(#noHdStud)" />
          <rect x="80" y="5" width="10" height="90" fill="url(#noHdStud)" />
          {/* No header — dashed line where it would be */}
          <line x1="18" y1="14" x2="82" y2="14" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,3" />
          {/* Window frame */}
          <rect x="24" y="20" width="52" height="64" rx="1" fill="url(#noHdFrame)" filter="url(#noHdShadow)" />
          <rect x="30" y="26" width="40" height="52" rx="1" fill="url(#noHdGlass)" />
          {/* Glass glare */}
          <path d="M 32 64 L 52 26 L 60 26 L 32 72 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );
  }
}

export function getCutbackIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'Standard stucco cutback':
      return (
        <svg {...svgProps} aria-label="Standard stucco cutback">
          <defs>
            <linearGradient id="scStucco" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <linearGradient id="scFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="scGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="scShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
            <filter id="stuccoTex">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
              <feDiffuseLighting in="noise" lightingColor="#d6d3d1" surfaceScale="1" result="lit">
                <feDistantLight azimuth="45" elevation="60" />
              </feDiffuseLighting>
              <feComposite operator="in" in="lit" in2="SourceGraphic" />
            </filter>
          </defs>
          {/* Stucco wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#scStucco)" />
          {/* Stucco texture dots */}
          <circle cx="15" cy="20" r="0.8" fill="#b8b0a8" />
          <circle cx="30" cy="12" r="0.6" fill="#b8b0a8" />
          <circle cx="75" cy="15" r="0.7" fill="#b8b0a8" />
          <circle cx="85" cy="50" r="0.8" fill="#b8b0a8" />
          <circle cx="12" cy="75" r="0.6" fill="#b8b0a8" />
          <circle cx="80" cy="85" r="0.7" fill="#b8b0a8" />
          {/* Cutback reveal — recessed area around window */}
          <rect x="16" y="14" width="68" height="72" rx="1" fill="#78716c" />
          {/* Cut edge highlight */}
          <line x1="16" y1="14" x2="84" y2="14" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="16" y1="14" x2="16" y2="86" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="84" y1="14" x2="84" y2="86" stroke="#a8a29e" strokeWidth="1" />
          <line x1="16" y1="86" x2="84" y2="86" stroke="#a8a29e" strokeWidth="1" />
          {/* Window frame in cutback */}
          <rect x="22" y="20" width="56" height="60" rx="1" fill="url(#scFrame)" filter="url(#scShadow)" />
          <rect x="28" y="26" width="44" height="48" rx="1" fill="url(#scGlass)" />
          {/* Glass glare */}
          <path d="M 30 60 L 54 26 L 62 26 L 30 68 Z" fill="rgba(255,255,255,0.2)" />
          {/* Dimension arrows showing cutback depth */}
          <line x1="16" y1="92" x2="22" y2="92" stroke="#3b82f6" strokeWidth="1" />
          <path d="M 16 90 L 16 94" stroke="#3b82f6" strokeWidth="0.8" />
          <path d="M 22 90 L 22 94" stroke="#3b82f6" strokeWidth="0.8" />
        </svg>
      );

    case 'Custom cutback':
      return (
        <svg {...svgProps} aria-label="Custom cutback">
          <defs>
            <linearGradient id="ccStucco" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <linearGradient id="ccFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="ccGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="ccShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Stucco wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#ccStucco)" />
          {/* Cutback reveal */}
          <rect x="16" y="14" width="68" height="72" rx="1" fill="#78716c" />
          <line x1="16" y1="14" x2="84" y2="14" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="16" y1="14" x2="16" y2="86" stroke="#d6d3d1" strokeWidth="1.5" />
          {/* Window frame */}
          <rect x="22" y="20" width="56" height="60" rx="1" fill="url(#ccFrame)" filter="url(#ccShadow)" />
          <rect x="28" y="26" width="44" height="48" rx="1" fill="url(#ccGlass)" />
          {/* Glass glare */}
          <path d="M 30 60 L 54 26 L 62 26 L 30 68 Z" fill="rgba(255,255,255,0.2)" />
          {/* Question mark overlay */}
          <circle cx="50" cy="48" r="14" fill="rgba(0,0,0,0.35)" />
          <text x="50" y="54" fontSize="20" fontWeight="bold" fill="#ffffff" textAnchor="middle">?</text>
        </svg>
      );

    case 'No cutback':
      return (
        <svg {...svgProps} aria-label="No cutback">
          <defs>
            <linearGradient id="ncbStucco" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <linearGradient id="ncbFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="ncbGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="ncbShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Stucco wall — flush right to frame */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#ncbStucco)" />
          {/* Texture dots */}
          <circle cx="12" cy="25" r="0.7" fill="#b8b0a8" />
          <circle cx="85" cy="40" r="0.6" fill="#b8b0a8" />
          <circle cx="15" cy="80" r="0.8" fill="#b8b0a8" />
          <circle cx="82" cy="78" r="0.6" fill="#b8b0a8" />
          {/* Window frame — stucco flush to edges */}
          <rect x="20" y="18" width="60" height="64" rx="1" fill="url(#ncbFrame)" filter="url(#ncbShadow)" />
          <rect x="26" y="24" width="48" height="52" rx="1" fill="url(#ncbGlass)" />
          {/* No gap between stucco and frame — flush lines */}
          <line x1="20" y1="18" x2="20" y2="82" stroke="#a8a29e" strokeWidth="1" />
          <line x1="80" y1="18" x2="80" y2="82" stroke="#a8a29e" strokeWidth="1" />
          <line x1="20" y1="18" x2="80" y2="18" stroke="#a8a29e" strokeWidth="1" />
          <line x1="20" y1="82" x2="80" y2="82" stroke="#a8a29e" strokeWidth="1" />
          {/* Glass glare */}
          <path d="M 28 62 L 54 24 L 62 24 L 28 70 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );

    case 'Needs cutback selection':
      return (
        <svg {...svgProps} aria-label="Needs cutback selection">
          <defs>
            <linearGradient id="ncsStucco" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#a8a29e" />
            </linearGradient>
            <linearGradient id="ncsFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="ncsGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="ncsShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Stucco wall */}
          <rect x="5" y="5" width="90" height="90" rx="2" fill="url(#ncsStucco)" />
          {/* Opening */}
          <rect x="20" y="18" width="60" height="64" fill="#1e293b" />
          {/* Window frame */}
          <rect x="24" y="22" width="52" height="56" rx="1" fill="url(#ncsFrame)" filter="url(#ncsShadow)" />
          <rect x="30" y="28" width="40" height="44" rx="1" fill="url(#ncsGlass)" />
          {/* Glass glare */}
          <path d="M 32 58 L 52 28 L 60 28 L 32 66 Z" fill="rgba(255,255,255,0.15)" />
          {/* Warning exclamation */}
          <circle cx="50" cy="48" r="15" fill="#f59e0b" fillOpacity="0.9" />
          <text x="50" y="54" fontSize="22" fontWeight="bold" fill="#ffffff" textAnchor="middle">!</text>
        </svg>
      );

    default:
      return (
        <svg {...svgProps} aria-label="Cutback type">
          <rect x="15" y="10" width="70" height="80" rx="3" fill="#a8a29e" />
          <rect x="23" y="18" width="54" height="64" rx="2" fill="#dbeafe" fillOpacity="0.3" />
          <text x="50" y="58" fontSize="36" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}
