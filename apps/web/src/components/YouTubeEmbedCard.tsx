/**
 * YouTubeEmbedCard — Responsive YouTube video embed component
 *
 * Handles:
 *  - youtube.com/watch?v=ID  → embedded iframe
 *  - youtu.be/ID             → embedded iframe
 *  - youtube.com/embed/ID    → embedded iframe
 *  - youtube.com/results?... → external link card (search results, not embeddable)
 *  - youtube.com/c/channel   → external link card
 *  - null / invalid          → safe fallback
 *
 * Does NOT download or rehost videos.
 * All playback is via official YouTube embed API.
 */

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Utility: extract video ID from any YouTube URL format
// ---------------------------------------------------------------------------

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Standard watch URL: youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    // Short URL: youtu.be/ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }
    // Embed URL: youtube.com/embed/ID
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) {
      const id = u.pathname.replace('/embed/', '').split('/')[0];
      return id || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility: is this a YouTube search or channel URL (not embeddable)?
// ---------------------------------------------------------------------------

function isYouTubeSearchOrChannel(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('youtube.com') && u.hostname !== 'youtu.be') return false;
    return (
      u.pathname.startsWith('/results') ||
      u.pathname.startsWith('/channel') ||
      u.pathname.startsWith('/c/') ||
      u.pathname.startsWith('/@') ||
      u.pathname.startsWith('/user/')
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface YouTubeEmbedCardProps {
  /** Title shown as iframe title and card heading */
  title: string;
  /** Any YouTube URL format — will be parsed automatically */
  url: string | null | undefined;
  /** Optional pre-computed embed URL (takes priority if valid) */
  embedUrl?: string | null;
  /** Optional attribution text */
  attribution?: string | null;
  /** If true, shows a compact link-card even for embeddable videos */
  forceLinkCard?: boolean;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(71,85,105,0.3)',
  background: 'rgba(15,23,42,0.6)',
  overflow: 'hidden',
  marginBottom: '1rem',
};

const iframeWrapStyle: React.CSSProperties = {
  position: 'relative',
  paddingBottom: '56.25%', // 16:9
  height: 0,
  overflow: 'hidden',
  background: '#000',
};

const iframeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 'none',
};

const footerStyle: React.CSSProperties = {
  padding: '0.625rem 0.875rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const linkCardStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  borderRadius: 10,
  border: '1px solid rgba(59,130,246,0.3)',
  background: 'rgba(59,130,246,0.06)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};

// ---------------------------------------------------------------------------
// Thumbnail with lazy-load play overlay
// ---------------------------------------------------------------------------

function ThumbnailPlayer({ videoId, title, onPlay }: { videoId: string; title: string; onPlay: () => void }) {
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <div
      onClick={onPlay}
      style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        background: '#000',
        cursor: 'pointer',
      }}
    >
      <img
        src={thumbUrl}
        alt={title}
        loading="lazy"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
      />
      {/* Play button overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'transform 0.15s',
          }}
        >
          {/* SVG play triangle */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function YouTubeEmbedCard({ title, url, embedUrl, attribution, forceLinkCard }: YouTubeEmbedCardProps) {
  const [playing, setPlaying] = useState(false);

  // Resolve video ID from embedUrl first, then url
  const videoId = extractYouTubeVideoId(embedUrl) ?? extractYouTubeVideoId(url);
  const isSearchOrChannel = isYouTubeSearchOrChannel(url) && !videoId;
  const hasValidEmbed = !!videoId && !forceLinkCard;

  const openUrl = embedUrl ?? url ?? null;
  const watchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : (url ?? null);

  // ---------------------------------------------------------------------------
  // A) Embeddable video
  // ---------------------------------------------------------------------------
  if (hasValidEmbed) {
    const embedSrc = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

    return (
      <div style={containerStyle}>
        {playing ? (
          <div style={iframeWrapStyle}>
            <iframe
              src={embedSrc}
              title={title}
              style={iframeStyle}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <ThumbnailPlayer videoId={videoId} title={title} onPlay={() => setPlaying(true)} />
        )}
        <div style={footerStyle}>
          <div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>{title}</div>
            {attribution && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>{attribution}</div>
            )}
          </div>
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: '#3b82f6',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Open on YouTube
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // B) Search / channel / non-embeddable link card
  // ---------------------------------------------------------------------------
  if (isSearchOrChannel || url) {
    return (
      <a
        href={openUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={linkCardStyle}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)')}
      >
        {/* YouTube logo icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: '#ff0000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="16" viewBox="0 0 22 16" fill="white">
            <path d="M21.54 2.5A2.78 2.78 0 0 0 19.58.5C17.87 0 11 0 11 0S4.13 0 2.42.5A2.78 2.78 0 0 0 .46 2.5 29.37 29.37 0 0 0 0 8a29.37 29.37 0 0 0 .46 5.5A2.78 2.78 0 0 0 2.42 15.5C4.13 16 11 16 11 16s6.87 0 8.58-.5a2.78 2.78 0 0 0 1.96-2C22 12.16 22 8 22 8a29.37 29.37 0 0 0-.46-5.5zM8.75 11.39V4.61L14.5 8l-5.75 3.39z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
            {title}
          </div>
          {attribution && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{attribution}</div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
            {isSearchOrChannel ? 'Open YouTube search results' : 'Open on YouTube'}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={{ flexShrink: 0 }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    );
  }

  // ---------------------------------------------------------------------------
  // C) Invalid / null URL — safe fallback
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        padding: '0.875rem 1rem',
        borderRadius: 8,
        border: '1px solid rgba(71,85,105,0.25)',
        background: 'rgba(71,85,105,0.08)',
        fontSize: '0.875rem',
        color: '#64748b',
        marginBottom: '1rem',
      }}
    >
      {title} (video unavailable)
    </div>
  );
}

export default YouTubeEmbedCard;
