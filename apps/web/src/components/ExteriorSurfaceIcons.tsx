import React from 'react';

export function getExteriorSurfaceIcon(surface: string, active: boolean = false) {
  const color = active ? '#3b82f6' : '#94a3b8';
  const borderColor = active ? '#3b82f6' : 'var(--border)';

  const wrapperProps = {
    viewBox: "0 0 100 100",
    style: { width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden' }
  };

  let content = null;

  switch (surface.toLowerCase()) {
    case 'brick':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#b91c1c" />
          {/* Mortar lines */}
          <path d="M 0 25 L 100 25 M 0 50 L 100 50 M 0 75 L 100 75" stroke="#fcd34d" strokeWidth="3" />
          <path d="M 25 0 L 25 25 M 75 0 L 75 25 M 50 25 L 50 50 M 25 50 L 25 75 M 75 50 L 75 75 M 50 75 L 50 100" stroke="#fcd34d" strokeWidth="3" />
        </svg>
      );
      break;
    case 'vinyl siding':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#e2e8f0" />
          <path d="M 0 20 L 100 20 M 0 40 L 100 40 M 0 60 L 100 60 M 0 80 L 100 80" stroke="#94a3b8" strokeWidth="4" />
          <path d="M 0 22 L 100 22 M 0 42 L 100 42 M 0 62 L 100 62 M 0 82 L 100 82" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        </svg>
      );
      break;
    case 'wood siding':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#b45309" />
          <path d="M 0 25 L 100 25 M 0 50 L 100 50 M 0 75 L 100 75" stroke="#78350f" strokeWidth="4" />
          <path d="M 10 10 Q 30 15 50 10 T 90 15 M 20 35 Q 40 30 60 40 T 90 35 M 10 60 Q 30 65 50 55 T 90 60" stroke="#92400e" strokeWidth="2" fill="none" />
        </svg>
      );
      break;
    case 'hardie / fiber cement':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#64748b" />
          <path d="M 0 33 L 100 33 M 0 66 L 100 66" stroke="#475569" strokeWidth="6" />
        </svg>
      );
      break;
    case 'metal':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#cbd5e1" />
          <path d="M 20 0 L 20 100 M 40 0 L 40 100 M 60 0 L 60 100 M 80 0 L 80 100" stroke="#94a3b8" strokeWidth="6" />
        </svg>
      );
      break;
    case 'stucco':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#fde68a" />
          <circle cx="20" cy="20" r="2" fill="#d97706" opacity="0.5" />
          <circle cx="50" cy="15" r="1.5" fill="#d97706" opacity="0.4" />
          <circle cx="80" cy="30" r="2.5" fill="#d97706" opacity="0.6" />
          <circle cx="30" cy="50" r="2" fill="#d97706" opacity="0.5" />
          <circle cx="70" cy="60" r="1.5" fill="#d97706" opacity="0.4" />
          <circle cx="15" cy="80" r="2.5" fill="#d97706" opacity="0.6" />
          <circle cx="50" cy="85" r="2" fill="#d97706" opacity="0.5" />
          <circle cx="85" cy="80" r="1.5" fill="#d97706" opacity="0.4" />
        </svg>
      );
      break;
    case 'existing trim':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#1e293b" />
          <rect x="20" y="20" width="60" height="60" fill="none" stroke="#f8fafc" strokeWidth="12" />
        </svg>
      );
      break;
    case 'existing header':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#1e293b" />
          <rect x="10" y="10" width="80" height="25" fill="#f8fafc" />
          <rect x="10" y="35" width="80" height="55" fill="none" stroke="#f8fafc" strokeWidth="4" />
        </svg>
      );
      break;
    case 'mixed material':
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="#b91c1c" />
          <polygon points="0,0 100,0 100,100 0,0" fill="#e2e8f0" />
          <line x1="0" y1="0" x2="100" y2="100" stroke="#94a3b8" strokeWidth="4" />
        </svg>
      );
      break;
    default:
      content = (
        <svg {...wrapperProps}>
          <rect width="100" height="100" fill="transparent" />
          <circle cx="50" cy="40" r="15" fill="none" stroke={color} strokeWidth="6" />
          <rect x="47" y="65" width="6" height="6" fill={color} />
        </svg>
      );
      break;
  }

  return (
    <div style={{
      width: '100%', aspectRatio: '1',
      border: `2px solid ${borderColor}`, borderRadius: 12,
      background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px'
    }}>
      {content}
    </div>
  );
}
