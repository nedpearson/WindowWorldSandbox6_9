// ═══════════════════════════════════════════════════════════
// FieldModeToggle — Outdoor/Sunlight mode toggle
// Switches between dark (indoor) and high-contrast (outdoor)
// mode. Persists preference to localStorage.
// Also handles orientation change stability and auto-detect.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wwa_field_mode';

// ── Hook: useFieldMode ──────────────────────────────────
export function useFieldMode() {
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    if (active) {
      document.body.classList.add('field-mode');
    } else {
      document.body.classList.remove('field-mode');
    }
    try { localStorage.setItem(STORAGE_KEY, String(active)); } catch (e) { console.debug("[swallowed error]", e); }
  }, [active]);

  // Auto-detect: if ambient light sensor available, enable in bright conditions
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-ignore — AmbientLightSensor API
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          // illuminance > 10000 lux = direct sunlight
          if (sensor.illuminance > 10000 && !active) {
            setActive(true);
          }
        });
        sensor.start();
        return () => sensor.stop();
      } catch { /* sensor not available */ }
    }
  }, []);

  const toggle = useCallback(() => setActive(prev => !prev), []);

  return { fieldMode: active, toggleFieldMode: toggle, setFieldMode: setActive };
}

// ── Hook: useOrientationStability ────────────────────────
export function useOrientationStability() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const handler = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setOrientation(newOrientation);
    };

    // Use screen.orientation API if available (more reliable)
    if ('orientation' in screen) {
      screen.orientation.addEventListener('change', handler);
    }
    // Fallback to resize
    window.addEventListener('resize', handler);

    return () => {
      if ('orientation' in screen) {
        screen.orientation.removeEventListener('change', handler);
      }
      window.removeEventListener('resize', handler);
    };
  }, []);

  return orientation;
}

// ── Toggle Button Component ──────────────────────────────
export function FieldModeToggle({
  fieldMode, onToggle, compact = false,
}: {
  fieldMode: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        onClick={onToggle}
        title={fieldMode ? 'Switch to Indoor Mode' : 'Switch to Outdoor Mode'}
        style={{
          background: fieldMode ? '#fff3cd' : 'rgba(59,130,246,0.1)',
          border: fieldMode ? '2px solid #ffc107' : '1px solid var(--border)',
          borderRadius: 8,
          padding: '0.375rem 0.5rem',
          cursor: 'pointer',
          fontSize: '1.125rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          minHeight: 36,
          minWidth: 36,
          justifyContent: 'center',
        }}
      >
        {fieldMode ? '☀️' : '🌙'}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.625rem 1rem', borderRadius: 8,
        background: fieldMode ? '#fff3cd' : 'var(--bg-card)',
        border: fieldMode ? '2px solid #ffc107' : '1px solid var(--border)',
        color: fieldMode ? '#856404' : 'var(--text-primary)',
        cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
        width: '100%', justifyContent: 'flex-start',
        minHeight: 48,
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{fieldMode ? '☀️' : '🌙'}</span>
      <span>{fieldMode ? 'Outdoor Mode ON' : 'Indoor Mode'}</span>
      <span style={{
        marginLeft: 'auto', fontSize: '0.625rem', fontWeight: 500,
        color: fieldMode ? '#856404' : 'var(--text-muted)',
      }}>
        {fieldMode ? 'High contrast · Large targets' : 'Standard theme'}
      </span>
    </button>
  );
}

// ── Orientation Indicator ────────────────────────────────
export function OrientationIndicator() {
  const orientation = useOrientationStability();

  return (
    <span style={{
      fontSize: '0.625rem', color: 'var(--text-muted)',
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    }}>
      {orientation === 'landscape' ? '📐' : '📱'}
      {orientation}
    </span>
  );
}
