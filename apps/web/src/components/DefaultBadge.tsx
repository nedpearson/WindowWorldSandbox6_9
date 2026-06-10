// ─────────────────────────────────────────────────────────────────────────────
// DefaultBadge.tsx — Inline badge showing field default/override/review status
//
// Displays a small pill badge next to opening fields to indicate:
//   - Suggested (blue) — default value auto-applied
//   - Defaulted (gray) — standard default, confirmed
//   - Overridden (amber) — user changed from default
//   - Confirmed (green) — user explicitly accepted suggestion
//   - Needs Review (red/orange) — ambiguous, requires decision
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { FieldStatus } from '../utils/openingDefaultTypes';

interface DefaultBadgeProps {
  status: FieldStatus;
  /** Optional callback when user clicks "Reset to Suggested" */
  onReset?: () => void;
  /** If true, shows a compact version without text */
  compact?: boolean;
}

const STATUS_CONFIG: Record<FieldStatus, { label: string; bg: string; text: string; icon: string }> = {
  defaulted: {
    label: 'Defaulted',
    bg: 'rgba(107, 114, 128, 0.15)',
    text: '#6b7280',
    icon: '⚙️',
  },
  suggested: {
    label: 'Suggested',
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#2563eb',
    icon: '💡',
  },
  overridden: {
    label: 'Overridden',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#d97706',
    icon: '✏️',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'rgba(34, 197, 94, 0.12)',
    text: '#16a34a',
    icon: '✓',
  },
  needs_review: {
    label: 'Needs Review',
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#dc2626',
    icon: '⚠️',
  },
};

export default function DefaultBadge({ status, onReset, compact = false }: DefaultBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0 : 4,
        padding: compact ? '1px 5px' : '2px 8px',
        borderRadius: 9999,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        lineHeight: '16px',
        backgroundColor: config.bg,
        color: config.text,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        letterSpacing: 0.2,
      }}
    >
      {!compact && <span style={{ fontSize: 10 }}>{config.icon}</span>}
      <span>{compact ? config.icon : config.label}</span>
      {onReset && status === 'overridden' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          style={{
            marginLeft: 4,
            padding: '0 3px',
            border: 'none',
            background: 'transparent',
            color: config.text,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            opacity: 0.7,
            lineHeight: '14px',
          }}
          title="Reset to Suggested"
        >
          ↩
        </button>
      )}
    </span>
  );
}
