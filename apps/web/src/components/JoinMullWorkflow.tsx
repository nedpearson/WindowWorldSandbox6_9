// ═══════════════════════════════════════════════════════════════
// Join/Mull Workflow — Group 2+ Markers
// Tap markers → confirm group → set type → generate connector
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { SketchMarkerData, MarkerGroupData, GroupType } from '../utils/sketchSync';

const GROUP_TYPES: { value: GroupType; label: string; icon: string; description: string }[] = [
  { value: 'mull_pair', label: 'Mull Pair', icon: '🔗', description: 'Two windows joined together (mulled)' },
  { value: 'twin', label: 'Twin', icon: '🪟🪟', description: 'Two identical windows side by side' },
  { value: 'triple', label: 'Triple', icon: '🪟🪟🪟', description: 'Three windows grouped together' },
  { value: 'bay_bow', label: 'Bay / Bow', icon: '🏠', description: 'Bay or bow window configuration' },
  { value: 'field_note', label: 'Field Note', icon: '📝', description: 'Grouped for field reference only' },
  { value: 'other', label: 'Other', icon: '❓', description: 'Custom grouping' },
];

interface JoinMullWorkflowProps {
  selectedMarkers: SketchMarkerData[];
  onConfirm: (group: Omit<MarkerGroupData, 'id'>) => void;
  onCancel: () => void;
}

export function JoinMullWorkflow({
  selectedMarkers,
  onConfirm,
  onCancel,
}: JoinMullWorkflowProps) {
  const [groupType, setGroupType] = useState<GroupType>('mull_pair');
  const [groupNote, setGroupNote] = useState('');
  const [keepSeparateRows, setKeepSeparateRows] = useState(true);
  const [mullType, setMullType] = useState<'standard' | 'structural'>('standard');

  if (selectedMarkers.length < 2) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '3px solid #f59e0b',
        borderRadius: '16px 16px 0 0', padding: '1rem', zIndex: 1001,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700, marginBottom: '0.5rem' }}>
          🔗 JOIN / MULL MODE
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Tap 2 or more window markers to join them. Selected: {selectedMarkers.length}
        </div>
        {selectedMarkers.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
            {selectedMarkers.map(m => (
              <span key={m.id} style={{
                padding: '0.25rem 0.625rem', borderRadius: 9999,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b',
              }}>X #{m.markerNumber}</span>
            ))}
          </div>
        )}
        <button onClick={onCancel} style={{
          display: 'block', margin: '0 auto', padding: '0.5rem 1.5rem',
          borderRadius: 8, border: '1px solid var(--border)',
          background: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem',
        }}>Cancel Join Mode</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--bg-card)', borderTop: '3px solid #f59e0b',
      borderRadius: '16px 16px 0 0', padding: '1rem', zIndex: 1001,
      maxHeight: '70vh', overflowY: 'auto',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.25s ease-out',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
        🔗 Join {selectedMarkers.length} Markers
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        Joining: {selectedMarkers.map(m => `X #${m.markerNumber}`).join(', ')}
      </div>

      {/* Group type selector */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
          Group Type
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
          {GROUP_TYPES.map(gt => (
            <button key={gt.value} onClick={() => setGroupType(gt.value)}
              style={{
                padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${groupType === gt.value ? '#f59e0b' : 'var(--border)'}`,
                background: groupType === gt.value ? 'rgba(245,158,11,0.1)' : 'transparent',
                textAlign: 'center',
              }}>
              <div style={{ fontSize: '1.1rem' }}>{gt.icon}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: groupType === gt.value ? '#f59e0b' : 'var(--text-muted)' }}>
                {gt.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mull Type selector */}
      {groupType === 'mull_pair' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Mullion Type & Pricing
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMullType('standard')}
              style={{
                padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${mullType === 'standard' ? '#f59e0b' : 'var(--border)'}`,
                background: mullType === 'standard' ? 'rgba(245,158,11,0.1)' : 'transparent',
                textAlign: 'center', color: mullType === 'standard' ? '#f59e0b' : 'var(--text-muted)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Standard Mull</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>$85.00</div>
            </button>
            <button
              type="button"
              onClick={() => setMullType('structural')}
              style={{
                padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${mullType === 'structural' ? '#f59e0b' : 'var(--border)'}`,
                background: mullType === 'structural' ? 'rgba(245,158,11,0.1)' : 'transparent',
                textAlign: 'center', color: mullType === 'structural' ? '#f59e0b' : 'var(--text-muted)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Structural Mull</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>$150.00</div>
            </button>
          </div>
        </div>
      )}

      {/* Group note */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
          Group Note
        </div>
        <textarea className="form-input" rows={2} value={groupNote}
          onChange={e => setGroupNote(e.target.value)}
          placeholder="e.g. Kitchen window pair, living room bay..." />
      </div>

      {/* Keep separate rows */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={keepSeparateRows}
          onChange={e => setKeepSeparateRows(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#f59e0b' }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Keep separate order form rows (recommended)
        </span>
      </label>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => {
          onConfirm({
            sketchId: selectedMarkers[0].sketchId,
            groupType,
            groupNote,
            keepSeparateRows,
            needsReview: true,
            pricingReviewed: false,
            memberMarkerIds: selectedMarkers.map(m => m.id),
            mullType: groupType === 'mull_pair' ? mullType : undefined,
          });
        }} style={{
          flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#000', fontWeight: 800, fontSize: '0.875rem',
        }}>
          🔗 Confirm Join
        </button>
        <button onClick={onCancel} style={{
          padding: '0.75rem 1.25rem', borderRadius: 10,
          border: '1px solid var(--border)', background: 'none',
          cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600,
        }}>Cancel</button>
      </div>
    </div>
  );
}

export { GROUP_TYPES };
