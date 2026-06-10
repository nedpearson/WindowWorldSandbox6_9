import React from 'react';
import type { VisualOption } from './visualOptionTypes';

const BADGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  default:      { label: 'Default',  bg: 'rgba(59,130,246,0.25)',  color: '#93c5fd' },
  included:     { label: 'Included', bg: 'rgba(34,197,94,0.2)',    color: '#86efac' },
  'adds-price': { label: '+$',       bg: 'rgba(234,179,8,0.2)',    color: '#fde68a' },
  'needs-review': { label: '⚠️',    bg: 'rgba(239,68,68,0.2)',    color: '#fca5a5' },
};

interface VisualOptionCardProps {
  option: VisualOption;
  isSelected: boolean;
  onClick: () => void;
  size: 'compact' | 'large';
}

export function VisualOptionCard({ option, isSelected, onClick, size }: VisualOptionCardProps) {
  const isCompact = size === 'compact';

  const badge = option.badge ? BADGE_CONFIG[option.badge] : null;

  return (
    <button
      onClick={option.disabled ? undefined : onClick}
      disabled={option.disabled}
      style={{
        position: 'relative',
        background: isSelected
          ? 'rgba(59,130,246,0.15)'
          : 'var(--bg-card, rgba(255,255,255,0.05))',
        border: `2px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
        borderRadius: isCompact ? 12 : 16,
        padding: isCompact ? '0.5rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center' as const,
        boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
        opacity: option.disabled ? 0.4 : 1,
        minHeight: isCompact ? 44 : undefined,
      }}
      aria-label={`Select ${option.label}`}
      aria-pressed={isSelected}
    >
      {/* Badge */}
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: isCompact ? 2 : 6,
            right: isCompact ? 2 : 6,
            fontSize: isCompact ? '0.55rem' : '0.65rem',
            fontWeight: 700,
            lineHeight: 1,
            padding: isCompact ? '2px 4px' : '3px 6px',
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
            whiteSpace: 'nowrap' as const,
          }}
        >
          {badge.label}
        </span>
      )}

      {/* Icon */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          marginBottom: isCompact ? '0.35rem' : '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {option.icon}
      </div>

      {/* Label */}
      <div
        style={{
          fontWeight: 600,
          color: isSelected ? '#3b82f6' : '#fff',
          fontSize: isCompact ? '0.7rem' : '0.95rem',
          lineHeight: 1.2,
        }}
      >
        {option.label}
      </div>

      {/* Helper */}
      {option.helper && (
        <div
          style={{
            fontSize: isCompact ? '0.6rem' : '0.75rem',
            color: '#94a3b8',
            marginTop: isCompact ? '0.15rem' : '0.25rem',
            lineHeight: 1.2,
          }}
        >
          {option.helper}
        </div>
      )}
    </button>
  );
}
