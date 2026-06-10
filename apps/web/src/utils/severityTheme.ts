// ═══════════════════════════════════════════════════════════════
// Severity Design System — Single Source of Truth
// All severity-related colors, icons, labels, borders, and
// animations are defined here. Every page and component
// MUST use this instead of hardcoding severity colors.
// ═══════════════════════════════════════════════════════════════

// ── Severity Levels ─────────────────────────────────────────
// These map 1:1 with UnifiedSeverity in the validation engine.
export type SeverityLevel = 'critical' | 'high' | 'warning' | 'info';

// ── Master Configuration ────────────────────────────────────
export interface SeverityTheme {
  /** Display label */
  label: string;
  /** Emoji/icon for inline display */
  icon: string;
  /** Primary accent color (text, borders) */
  color: string;
  /** Softer background fill */
  bg: string;
  /** Stronger background for emphasis */
  bgStrong: string;
  /** Border color for cards/pills */
  border: string;
  /** Pulsing glow for FAB/badges */
  glow: string;
  /** Left-border accent for cards (3px strip) */
  borderAccent: string;
  /** Numerical sort weight (lower = more urgent) */
  weight: number;
  /** Pulse animation name or 'none' */
  pulse: string;
  /** Short human-readable action expectation */
  actionLabel: string;
}

const SEVERITY_THEMES: Record<SeverityLevel, SeverityTheme> = {
  // ── 🔴 CRITICAL — Red ─────────────────────────────────────
  // Blocks submission / export. Must be resolved immediately.
  critical: {
    label: 'Critical',
    icon: '🛑',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    bgStrong: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.30)',
    glow: 'rgba(239,68,68,0.50)',
    borderAccent: '#ef4444',
    weight: 0,
    pulse: 'severityPulseCritical',
    actionLabel: 'Blocks Submission',
  },

  // ── 🟠 HIGH RISK — Orange ─────────────────────────────────
  // Requires confirmation/review. Likely causes remake or failure.
  high: {
    label: 'High Risk',
    icon: '⚠️',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    bgStrong: 'rgba(249,115,22,0.15)',
    border: 'rgba(249,115,22,0.30)',
    glow: 'rgba(249,115,22,0.40)',
    borderAccent: '#f97316',
    weight: 1,
    pulse: 'none',
    actionLabel: 'Review Required',
  },

  // ── 🟡 WARNING — Yellow ───────────────────────────────────
  // Recommended review. May impact quality or pricing accuracy.
  warning: {
    label: 'Warning',
    icon: '💡',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    bgStrong: 'rgba(234,179,8,0.15)',
    border: 'rgba(234,179,8,0.30)',
    glow: 'rgba(234,179,8,0.30)',
    borderAccent: '#eab308',
    weight: 2,
    pulse: 'none',
    actionLabel: 'Review Recommended',
  },

  // ── 🔵 INFO — Blue ────────────────────────────────────────
  // FYI / recommendation only. No action required.
  info: {
    label: 'Info',
    icon: 'ℹ️',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    bgStrong: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.25)',
    glow: 'rgba(59,130,246,0.30)',
    borderAccent: '#3b82f6',
    weight: 3,
    pulse: 'none',
    actionLabel: 'For Your Information',
  },
};

export default SEVERITY_THEMES;

// ── Convenience Getters ─────────────────────────────────────
export function getSeverityTheme(sev: SeverityLevel): SeverityTheme {
  return SEVERITY_THEMES[sev];
}

export function getSeverityColor(sev: SeverityLevel): string {
  return SEVERITY_THEMES[sev].color;
}

export function getSeverityWeight(sev: SeverityLevel): number {
  return SEVERITY_THEMES[sev].weight;
}

/** Sort array by severity (most urgent first) */
export function sortBySeverity<T>(items: T[], getSev: (item: T) => SeverityLevel): T[] {
  return [...items].sort((a, b) => SEVERITY_THEMES[getSev(a)].weight - SEVERITY_THEMES[getSev(b)].weight);
}

/** Map legacy severity names (BLOCKER, HIGH, MEDIUM, LOW) to unified levels */
export function normalizeLegacySeverity(legacy: string): SeverityLevel {
  switch (legacy.toUpperCase()) {
    case 'BLOCKER': case 'CRITICAL': return 'critical';
    case 'HIGH': case 'ERROR': return 'high';
    case 'MEDIUM': case 'WARNING': case 'WARN': return 'warning';
    case 'LOW': case 'INFO': case 'RECOMMENDATION': return 'info';
    default: return 'info';
  }
}

// ── React Inline Style Helpers ──────────────────────────────
/** Returns a card-style object for a severity-colored panel */
export function severityCardStyle(sev: SeverityLevel): React.CSSProperties {
  const t = SEVERITY_THEMES[sev];
  return {
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderLeft: `3px solid ${t.borderAccent}`,
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
  };
}

/** Returns a pill/badge-style object */
export function severityBadgeStyle(sev: SeverityLevel): React.CSSProperties {
  const t = SEVERITY_THEMES[sev];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: '0.65rem',
    fontWeight: 700,
    background: t.bg,
    color: t.color,
    border: `1px solid ${t.border}`,
  };
}

/** FAB (floating button) color based on highest severity in the set */
export function fabColorForSeverity(sev: SeverityLevel): {
  bg: string;
  shadow: string;
  animate: boolean;
} {
  const t = SEVERITY_THEMES[sev];
  return {
    bg: `linear-gradient(135deg, ${t.color}, ${t.color}dd)`,
    shadow: `0 4px 16px ${t.glow}`,
    animate: sev === 'critical',
  };
}

/** Determine the "worst" severity from a set */
export function worstSeverity(severities: SeverityLevel[]): SeverityLevel {
  if (severities.length === 0) return 'info';
  return severities.reduce((worst, sev) =>
    SEVERITY_THEMES[sev].weight < SEVERITY_THEMES[worst].weight ? sev : worst
  );
}
