// ─────────────────────────────────────────────────────────────────────────────
// DefaultsSummaryBar.tsx — Summary bar for opening default status
//
// Shows counts of defaulted, overridden, and needs-review fields with
// action buttons: Apply Suggested Defaults, Confirm All, Reset to Suggested.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { FieldStatus } from '../utils/openingDefaultTypes';

interface DefaultsSummaryBarProps {
  fieldStatus: Record<string, FieldStatus>;
  onApplyDefaults?: () => void;
  onConfirmAll?: () => void;
  onResetAll?: () => void;
}

export default function DefaultsSummaryBar({
  fieldStatus,
  onApplyDefaults,
  onConfirmAll,
  onResetAll,
}: DefaultsSummaryBarProps) {
  const entries = Object.values(fieldStatus);
  const defaultedCount = entries.filter(s => s === 'defaulted' || s === 'suggested').length;
  const reviewCount = entries.filter(s => s === 'needs_review').length;
  const overriddenCount = entries.filter(s => s === 'overridden').length;

  if (defaultedCount === 0 && reviewCount === 0 && overriddenCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 8,
        backgroundColor: reviewCount > 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(59, 130, 246, 0.06)',
        border: `1px solid ${reviewCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'}`,
        fontSize: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* Status counts */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
        {defaultedCount > 0 && (
          <span style={{ color: '#2563eb', fontWeight: 500 }}>
            💡 {defaultedCount} suggested
          </span>
        )}
        {overriddenCount > 0 && (
          <span style={{ color: '#d97706', fontWeight: 500 }}>
            ✏️ {overriddenCount} overridden
          </span>
        )}
        {reviewCount > 0 && (
          <span style={{ color: '#dc2626', fontWeight: 500 }}>
            ⚠️ {reviewCount} needs review
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {defaultedCount > 0 && onApplyDefaults && (
          <SummaryButton label="Apply Suggested" onClick={onApplyDefaults} color="#2563eb" />
        )}
        {defaultedCount > 0 && onConfirmAll && (
          <SummaryButton label="Confirm All" onClick={onConfirmAll} color="#16a34a" />
        )}
        {overriddenCount > 0 && onResetAll && (
          <SummaryButton label="Reset to Suggested" onClick={onResetAll} color="#6b7280" />
        )}
      </div>
    </div>
  );
}

function SummaryButton({
  label,
  onClick,
  color,
}: {
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${color}33`,
        backgroundColor: `${color}0a`,
        color,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
