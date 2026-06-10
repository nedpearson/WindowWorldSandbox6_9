import React, { useState } from 'react';
import type { VisualOptionPickerProps } from './visualOptionTypes';
import { VisualOptionCard } from './VisualOptionCard';

export function VisualOptionPicker({
  options,
  value,
  onChange,
  title,
  mode = 'bottomSheet',
  error = false,
  columns,
  placeholder,
  changeLabel,
}: VisualOptionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value) || null;

  // ── Inline mode ──────────────────────────────────────────────────────────
  if (mode === 'inline') {
    return (
      <div
        style={{
          width: '100%',
          border: error ? '1px solid #ef4444' : '1px solid transparent',
          borderRadius: 12,
          padding: error ? 4 : 0,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: columns || 'repeat(auto-fill, minmax(65px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {options.map((opt) => (
            <VisualOptionCard
              key={opt.value}
              option={opt}
              isSelected={opt.value === value}
              onClick={() => onChange(opt.value)}
              size="compact"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── BottomSheet mode ─────────────────────────────────────────────────────
  const placeholderText = placeholder || `Select ${title}...`;
  const changeLabelText = changeLabel || (value ? `Change ${title}` : 'Select');

  return (
    <div style={{ width: '100%' }}>
      {/* Trigger Button / Preview */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: 'var(--bg-input, rgba(255,255,255,0.05))',
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedOption ? (
            <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedOption.icon}
            </div>
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#94a3b8',
              }}
            >
              ?
            </div>
          )}
          <div>
            <div
              style={{
                fontWeight: 600,
                color: selectedOption ? '#fff' : '#94a3b8',
                fontSize: '1.1rem',
              }}
            >
              {selectedOption ? selectedOption.label : placeholderText}
            </div>
            {selectedOption?.helper && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {selectedOption.helper}
              </div>
            )}
          </div>
        </div>
        <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.875rem' }}>
          {changeLabelText}
        </div>
      </div>

      {/* Modal / Bottom Sheet Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: '#1e293b',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                {title}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  color: '#fff',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Grid */}
            <div
              style={{
                overflowY: 'auto',
                padding: '1.5rem',
                flex: 1,
                paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns || 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '1rem',
                }}
              >
                {options.map((opt) => (
                  <VisualOptionCard
                    key={opt.value}
                    option={opt}
                    isSelected={opt.value === value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    size="large"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
