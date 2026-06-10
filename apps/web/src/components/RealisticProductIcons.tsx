import React, { ReactNode } from 'react';

export function getGlassIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 80 80",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  switch (type) {
    case 'LEE':
      return (
        <svg {...svgProps} aria-label="Low-E glass">
          <defs>
            <linearGradient id="leeFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="leeGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#6ee7b7" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.25" />
            </linearGradient>
            <filter id="leeShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#leeFrame)" filter="url(#leeShadow)" />
          {/* Glass with blue-green tint */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="url(#leeGlass)" />
          {/* Glass glare */}
          <path d="M 18 54 L 46 12 L 54 12 L 18 62 Z" fill="rgba(255,255,255,0.25)" />
          {/* Reflected rays (bouncing off glass) */}
          <line x1="30" y1="22" x2="22" y2="14" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="40" y1="26" x2="34" y2="16" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.5" />
          <line x1="50" y1="30" x2="46" y2="18" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.4" />
          {/* Ray arrow tips */}
          <path d="M 22 14 L 24 16 M 22 14 L 20 16" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.6" />
          {/* Epsilon symbol */}
          <text x="40" y="50" fontSize="14" fontWeight="bold" fill="#059669" textAnchor="middle" opacity="0.7">ε</text>
        </svg>
      );

    case 'Clear':
      return (
        <svg {...svgProps} aria-label="Clear glass">
          <defs>
            <linearGradient id="clFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="clGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.2" />
            </linearGradient>
            <filter id="clShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#clFrame)" filter="url(#clShadow)" />
          {/* Clear glass — almost transparent */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="url(#clGlass)" stroke="#e2e8f0" strokeWidth="0.5" />
          {/* Prominent glare lines to show clarity */}
          <path d="M 18 54 L 46 12 L 54 12 L 18 62 Z" fill="rgba(255,255,255,0.35)" />
          <path d="M 18 38 L 34 12 L 40 12 L 18 46 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      );

    case 'SolarZone':
      return (
        <svg {...svgProps} aria-label="SolarZone glass">
          <defs>
            <linearGradient id="szFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="szGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.25" />
            </linearGradient>
            <filter id="szShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#szFrame)" filter="url(#szShadow)" />
          {/* Green-tinted solar glass */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="url(#szGlass)" />
          {/* Glass glare */}
          <path d="M 18 54 L 46 12 L 54 12 L 18 62 Z" fill="rgba(255,255,255,0.2)" />
          {/* Sun rays being blocked */}
          <circle cx="56" cy="14" r="6" fill="#fbbf24" fillOpacity="0.5" />
          <line x1="56" y1="4" x2="56" y2="8" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="62" y1="8" x2="60" y2="11" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="64" y1="14" x2="62" y2="14" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.4" />
        </svg>
      );

    case 'SolarZone Elite':
      return (
        <svg {...svgProps} aria-label="SolarZone Elite glass">
          <defs>
            <linearGradient id="szeFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="szeGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.35" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="szeStar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="szeShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#szeFrame)" filter="url(#szeShadow)" />
          {/* Green-gold tinted glass */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="url(#szeGlass)" />
          {/* Glass glare */}
          <path d="M 18 54 L 46 12 L 54 12 L 18 62 Z" fill="rgba(255,255,255,0.2)" />
          {/* Premium gold star badge */}
          <circle cx="56" cy="58" r="10" fill="#1e293b" fillOpacity="0.6" />
          <path d="M 56 50 L 58 54 L 63 55 L 59 58 L 60 63 L 56 61 L 52 63 L 53 58 L 49 55 L 54 54 Z" fill="url(#szeStar)" filter="url(#starGlow)" />
        </svg>
      );

    default:
      return (
        <svg {...svgProps} aria-label="Glass type">
          <rect x="10" y="6" width="60" height="68" rx="2" fill="#e2e8f0" />
          <rect x="16" y="12" width="48" height="56" rx="1" fill="#dbeafe" fillOpacity="0.3" />
          <text x="40" y="48" fontSize="24" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}

export function getScreenIcon(type: string): ReactNode {
  const svgProps = {
    viewBox: "0 0 80 80",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  const meshPattern = (x: number, y: number, w: number, h: number) => {
    const lines: ReactNode[] = [];
    const spacing = 3;
    let key = 0;
    // Vertical mesh lines
    for (let i = x; i <= x + w; i += spacing) {
      lines.push(<line key={`v${key++}`} x1={i} y1={y} x2={i} y2={y + h} stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.5" />);
    }
    // Horizontal mesh lines
    for (let j = y; j <= y + h; j += spacing) {
      lines.push(<line key={`h${key++}`} x1={x} y1={j} x2={x + w} y2={j} stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.5" />);
    }
    return <>{lines}</>;
  };

  switch (type) {
    case 'Full Screen':
      return (
        <svg {...svgProps} aria-label="Full screen">
          <defs>
            <linearGradient id="fsFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter id="fsShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#fsFrame)" filter="url(#fsShadow)" />
          {/* Screen area — full opening */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="#e2e8f0" fillOpacity="0.15" />
          {/* Mesh pattern over entire glass area */}
          {meshPattern(16, 12, 48, 56)}
          {/* Screen frame border */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      );

    case 'Half Screen':
      return (
        <svg {...svgProps} aria-label="Half screen">
          <defs>
            <linearGradient id="hsFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="hsGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.25" />
            </linearGradient>
            <filter id="hsShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#hsFrame)" filter="url(#hsShadow)" />
          {/* Top half — clear glass */}
          <rect x="16" y="12" width="48" height="28" rx="1" fill="url(#hsGlass)" />
          {/* Glass glare on top half */}
          <path d="M 18 32 L 40 12 L 48 12 L 18 38 Z" fill="rgba(255,255,255,0.25)" />
          {/* Meeting rail divider */}
          <rect x="14" y="38" width="52" height="4" rx="1" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Bottom half — mesh screen */}
          <rect x="16" y="42" width="48" height="26" rx="1" fill="#e2e8f0" fillOpacity="0.15" />
          {meshPattern(16, 42, 48, 26)}
          {/* Screen frame border on bottom */}
          <rect x="16" y="42" width="48" height="26" rx="1" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      );

    case 'No Screen':
      return (
        <svg {...svgProps} aria-label="No screen">
          <defs>
            <linearGradient id="nsFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="nsGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
            </linearGradient>
            <filter id="nsShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {/* Frame */}
          <rect x="10" y="6" width="60" height="68" rx="2" fill="url(#nsFrame)" filter="url(#nsShadow)" />
          {/* All clear glass */}
          <rect x="16" y="12" width="48" height="56" rx="1" fill="url(#nsGlass)" />
          {/* Glass glare */}
          <path d="M 18 54 L 46 12 L 54 12 L 18 62 Z" fill="rgba(255,255,255,0.3)" />
          <path d="M 18 38 L 34 12 L 40 12 L 18 46 Z" fill="rgba(255,255,255,0.15)" />
        </svg>
      );

    default:
      return (
        <svg {...svgProps} aria-label="Screen type">
          <rect x="10" y="6" width="60" height="68" rx="2" fill="#e2e8f0" />
          <rect x="16" y="12" width="48" height="56" rx="1" fill="#dbeafe" fillOpacity="0.3" />
          <text x="40" y="48" fontSize="24" fontWeight="bold" fill="#94a3b8" textAnchor="middle">?</text>
        </svg>
      );
  }
}

export function getColorSwatchIcon(color: string, isInterior?: boolean): ReactNode {
  const svgProps = {
    viewBox: "0 0 60 60",
    style: { width: '100%', height: '100%', display: 'block' } as React.CSSProperties,
  };

  const colorMap: Record<string, { fill: string; border: string; label: string }> = {
    'White': { fill: '#ffffff', border: '#d1d5db', label: 'White' },
    'Almond': { fill: '#F5E6D3', border: '#d4c4b0', label: 'Almond' },
    'Clay': { fill: '#C4A882', border: '#a89070', label: 'Clay' },
    'Bronze': { fill: '#5C4033', border: '#3d2a20', label: 'Bronze' },
    'Black': { fill: '#1a1a1a', border: '#333333', label: 'Black' },
    'Woodgrain': { fill: '#8B6240', border: '#6d4c30', label: 'Woodgrain' },
    'Dark Chocolate': { fill: '#3C2415', border: '#2a1a0e', label: 'Dark Chocolate' },
    'Forest Green': { fill: '#2D5F2D', border: '#1e4a1e', label: 'Forest Green' },
  };

  const c = colorMap[color] || { fill: '#94a3b8', border: '#64748b', label: color || '?' };

  if (color === 'Woodgrain' && isInterior !== false) {
    return (
      <svg {...svgProps} aria-label="Woodgrain color">
        <defs>
          <linearGradient id="wgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a0764a" />
            <stop offset="50%" stopColor="#8B6240" />
            <stop offset="100%" stopColor="#6d4c30" />
          </linearGradient>
          <filter id="wgShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
          </filter>
        </defs>
        {/* Rounded rectangle swatch */}
        <rect x="8" y="8" width="44" height="44" rx="8" fill="url(#wgGrad)" filter="url(#wgShadow)" stroke={c.border} strokeWidth="1" />
        {/* Wood grain horizontal lines */}
        <line x1="12" y1="16" x2="48" y2="16" stroke="#6d4c30" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="12" y1="20" x2="48" y2="20" stroke="#5c3d25" strokeWidth="0.4" strokeOpacity="0.4" />
        <line x1="12" y1="25" x2="48" y2="25" stroke="#6d4c30" strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="12" y1="30" x2="48" y2="30" stroke="#5c3d25" strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="12" y1="34" x2="48" y2="34" stroke="#6d4c30" strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="12" y1="39" x2="48" y2="39" stroke="#5c3d25" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="12" y1="44" x2="48" y2="44" stroke="#6d4c30" strokeWidth="0.4" strokeOpacity="0.3" />
        {/* Knot detail */}
        <ellipse cx="30" cy="28" rx="3" ry="4" fill="#5c3d25" fillOpacity="0.3" />
        {/* Highlight */}
        <rect x="8" y="8" width="44" height="6" rx="8" fill="rgba(255,255,255,0.15)" />
      </svg>
    );
  }

  // Determine if we need light text on dark swatch
  const isDark = ['Bronze', 'Black', 'Dark Chocolate', 'Forest Green'].includes(color);

  return (
    <svg {...svgProps} aria-label={`${c.label} color`}>
      <defs>
        <filter id={`cs${color?.replace(/\s/g, '')}Shadow`} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
        </filter>
        <radialGradient id={`cs${color?.replace(/\s/g, '')}Sheen`} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? "0.15" : "0.3"} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Swatch rectangle */}
      <rect x="8" y="8" width="44" height="44" rx="8" fill={c.fill} filter={`url(#cs${color?.replace(/\s/g, '')}Shadow)`} stroke={c.border} strokeWidth="1" />
      {/* Sheen/highlight overlay */}
      <rect x="8" y="8" width="44" height="44" rx="8" fill={`url(#cs${color?.replace(/\s/g, '')}Sheen)`} />
    </svg>
  );
}
