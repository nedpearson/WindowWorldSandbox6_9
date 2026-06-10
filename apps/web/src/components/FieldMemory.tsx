// ═══════════════════════════════════════════════════════════
// Field Memory UI — Visual house walkthrough guide
// Room heatmap, opening status strip, elevation progress
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  analyzeOpening, getRoomProgress, getElevationProgress,
  getStatusColor, getStatusBg, getStatusIcon,
  type OpeningStatus,
} from '../utils/fieldMemory';

// ── Room Heatmap — shows progress per room ───────────────
export function RoomHeatmap({
  openings, onSelectRoom,
}: {
  openings: any[];
  onSelectRoom?: (room: string) => void;
}) {
  const rooms = getRoomProgress(openings);
  if (rooms.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem',
      padding: '8px', borderRadius: 8,
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
        🏠 Rooms
      </span>
      {rooms.map(room => (
        <button key={room.name} onClick={() => onSelectRoom?.(room.name)} style={{
          padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${getStatusColor(room.overallPct)}30`,
          background: getStatusBg(room.overallPct),
          color: getStatusColor(room.overallPct),
          fontSize: '0.65rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '3px',
          transition: 'all 0.15s',
        }}>
          <span>{room.name}</span>
          <span style={{ opacity: 0.7 }}>{room.measuredCount}/{room.totalCount}</span>
          {room.warningCount > 0 && <span>⚠️</span>}
        </button>
      ))}
    </div>
  );
}

// ── Elevation Progress Bar — shows measurement coverage ──
export function ElevationStrip({ openings }: { openings: any[] }) {
  const elevs = getElevationProgress(openings);
  if (elevs.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: '6px', marginBottom: '0.75rem', alignItems: 'center',
    }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
        🧭
      </span>
      {elevs.map(e => (
        <div key={e.name} style={{
          flex: 1, minWidth: 0, borderRadius: 6, overflow: 'hidden',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
        }}>
          <div style={{
            width: `${e.pct}%`, minWidth: e.pct > 0 ? 20 : 0,
            height: 20, borderRadius: 5,
            background: `linear-gradient(90deg, ${getStatusColor(e.pct)}30, ${getStatusColor(e.pct)}50)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: getStatusColor(e.pct),
            whiteSpace: 'nowrap', padding: '0 4px',
            transition: 'width 0.3s',
          }}>
            {e.name} {e.measuredCount}/{e.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Opening Status Strip — compact inline badges ─────────
export function OpeningStatusStrip({
  openings, onSelectOpening,
}: {
  openings: any[];
  onSelectOpening?: (opening: any) => void;
}) {
  if (openings.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '0.5rem',
    }}>
      {openings.map(o => {
        const status = analyzeOpening(o);
        return (
          <button key={o.id} onClick={() => onSelectOpening?.(o)}
            title={`#${o.openingNumber} ${o.roomLocation || 'Unnamed'} — ${status.completionPct}% ${status.missing.length > 0 ? '· Missing: ' + status.missing.join(', ') : ''}`}
            style={{
              width: 24, height: 24, borderRadius: 4, border: 'none',
              background: getStatusBg(status.completionPct),
              color: getStatusColor(status.completionPct),
              fontSize: '0.5625rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'all 0.15s',
            }}>
            {status.isHighRisk ? '!' : o.openingNumber}
            {/* Photo indicator */}
            {status.hasPhoto && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 6, height: 6, borderRadius: '50%',
                background: '#3b82f6',
              }} />
            )}
            {/* Warning dot */}
            {status.hasWarning && !status.isHighRisk && (
              <span style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 6, height: 6, borderRadius: '50%',
                background: '#f59e0b',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Status Badge — compact badge for a single opening ────
export function StatusBadge({ opening }: { opening: any }) {
  const status = analyzeOpening(opening);

  return (
    <div style={{
      display: 'inline-flex', gap: '3px', alignItems: 'center',
    }}>
      {/* Completion ring */}
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `2px solid ${getStatusColor(status.completionPct)}`,
        background: status.completionPct >= 80 ? `${getStatusColor(status.completionPct)}20` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.5rem', fontWeight: 800, color: getStatusColor(status.completionPct),
      }}>
        {status.completionPct >= 80 ? '✓' : `${status.completionPct}`}
      </span>
      {/* Contextual indicators */}
      {!status.measured && <span title="No measurements" style={{ fontSize: '0.625rem' }}>📏</span>}
      {status.hasPhoto && <span title="Has photo" style={{ fontSize: '0.625rem' }}>📷</span>}
      {status.isHighRisk && <span title={status.riskReasons.join(', ')} style={{ fontSize: '0.625rem' }}>🔴</span>}
      {status.needsVerification && <span title="Needs verification" style={{ fontSize: '0.625rem' }}>⚠️</span>}
    </div>
  );
}

// ── Walkthrough Summary — top-level house overview ───────
export function WalkthroughSummary({
  openings, onSelectOpening,
}: {
  openings: any[];
  onSelectOpening?: (opening: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rooms = getRoomProgress(openings);
  const totalMeasured = openings.filter(o => o.width > 0 && o.height > 0).length;
  const totalWarnings = openings.filter(o => analyzeOpening(o).hasWarning).length;
  const totalPhotos = openings.filter(o => analyzeOpening(o).hasPhoto).length;

  if (openings.length === 0) return null;

  return (
    <div style={{
      marginBottom: '0.75rem', borderRadius: 10,
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Compact summary bar */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.6875rem' }}>
          <span style={{ fontWeight: 700 }}>🏠 Field Progress</span>
          <span style={{ color: getStatusColor(Math.round((totalMeasured / openings.length) * 100)), fontWeight: 700 }}>
            📐 {totalMeasured}/{openings.length}
          </span>
          {totalPhotos > 0 && <span style={{ color: '#3b82f6' }}>📷 {totalPhotos}</span>}
          {totalWarnings > 0 && <span style={{ color: '#f59e0b' }}>⚠️ {totalWarnings}</span>}
        </div>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
          {expanded ? '▴' : '▾'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 10px 10px' }}>
          {/* Opening status strip */}
          <OpeningStatusStrip openings={openings} onSelectOpening={onSelectOpening} />

          {/* Elevation bars */}
          <ElevationStrip openings={openings} />

          {/* Room-by-room detail */}
          {rooms.map(room => (
            <div key={room.name} style={{
              padding: '6px 8px', marginBottom: '4px', borderRadius: 6,
              background: getStatusBg(room.overallPct),
              border: `1px solid ${getStatusColor(room.overallPct)}20`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                  {room.name}
                </span>
                <span style={{ marginLeft: '6px', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                  {room.openings.map(o => `#${o.openingNumber}`).join(', ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.625rem' }}>
                <span style={{ color: getStatusColor(room.overallPct), fontWeight: 700 }}>
                  {room.measuredCount}/{room.totalCount} measured
                </span>
                {room.warningCount > 0 && (
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                    ⚠ {room.warningCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
