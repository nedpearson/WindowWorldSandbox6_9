/**
 * HelpLink.tsx
 * Contextual help icon -- opens the Field Manual to a specific article.
 *
 * Usage:
 *   <HelpLink articleId="lib-tempered-glass" label="Tempered glass rules" />
 *
 * Clicking opens /manual?article=<articleId> in the same window (on the manual page
 * the ?article= param auto-selects and scrolls to that chapter).
 *
 * ENCODING: ASCII only. No emoji literals.
 */

import React from 'react';

interface HelpLinkProps {
  /** ID of the ManualChapter to open (matches ManualChapter.id) */
  articleId: string;
  /** Tooltip text shown on hover */
  label?: string;
  /** 'sm' = 14px icon, 'md' = 16px icon */
  size?: 'sm' | 'md';
  /** Optional inline style overrides for the wrapper */
  style?: React.CSSProperties;
}

/**
 * Small ? icon button that deep-links into the Field Manual at a specific article.
 * Does not require any router dependency -- uses window.location.href directly.
 * Designed to be placed inline next to field labels in forms.
 */
export function HelpLink({ articleId, label = 'Learn more in Field Manual', size = 'sm', style }: HelpLinkProps) {
  const dim = size === 'md' ? 18 : 14;
  const btnSize = size === 'md' ? 22 : 18;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const base = window.location.origin;
      window.location.href = `${base}/manual?article=${encodeURIComponent(articleId)}`;
    } catch {
      // fallback -- no-op if location access fails
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: btnSize,
        height: btnSize,
        borderRadius: '50%',
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.3)',
        color: '#60a5fa',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
        lineHeight: 1,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        verticalAlign: 'middle',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.25)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.6)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.12)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.3)';
      }}
    >
      {/* Inline question-mark SVG -- no emoji, no external font */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  );
}

export default HelpLink;
