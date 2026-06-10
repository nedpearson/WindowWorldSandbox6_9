import { useState } from 'react';

interface AiCreditBannerProps {
  creditsUsed: number;
  creditLimit: number;
  upgradeUrl?: string;
  onDismiss?: () => void;
}

/**
 * Shows an amber warning at ≥80% usage and a red blocked banner at 100%.
 * Renders nothing below 80%.
 */
export function AiCreditBanner({ creditsUsed, creditLimit, upgradeUrl, onDismiss }: AiCreditBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const pct = creditLimit > 0 ? creditsUsed / creditLimit : 0;
  const isBlocked = pct >= 1;
  const isWarning = pct >= 0.8;
  if (!isWarning) return null;

  const bg     = isBlocked ? 'rgba(239,68,68,0.08)'  : 'rgba(245,158,11,0.08)';
  const border = isBlocked ? 'rgba(239,68,68,0.35)'  : 'rgba(245,158,11,0.35)';
  const color  = isBlocked ? 'var(--danger,#ef4444)' : 'var(--warning,#f59e0b)';
  const target = upgradeUrl || '/billing';

  return (
    <div style={{
      padding: '0.875rem 1rem',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 10,
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>
        {isBlocked ? '🚫' : '⚠️'}
      </span>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color, fontSize: '0.875rem' }}>
          {isBlocked
            ? "You've reached your AI credit limit for this month."
            : `AI credits at ${Math.round(pct * 100)}% — ${creditLimit - creditsUsed} remaining.`}
        </div>

        {isBlocked && (
          <div style={{ color: 'var(--text-secondary,#6b7280)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Advanced AI actions are paused until your credits reset or you upgrade.
            You can continue using all non-AI app features normally.
          </div>
        )}

        <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open(target, '_blank', 'noopener,noreferrer')}
            style={{
              padding: '0.375rem 0.875rem',
              background: color,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            💳 Get More AI Credits
          </button>
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={() => { setDismissed(true); onDismiss(); }}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted,#9ca3af)',
            fontSize: '1.125rem',
            lineHeight: 1,
            padding: '0.125rem',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
