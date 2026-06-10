// ─────────────────────────────────────────────────────────────────────────────
// ConflictResolutionModal.tsx — Shows local vs cloud values, lets rep resolve
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { getOfflineDb, type ConflictRecord } from '../lib/offlineDb';
import { resolveConflict } from '../lib/syncEngine';
import { useAuthStore } from '../store';

interface ConflictResolutionModalProps {
  onClose: () => void;
}

export function ConflictResolutionModal({ onClose }: ConflictResolutionModalProps) {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [resolving, setResolving] = useState<number | null>(null);
  const authUser = useAuthStore(s => s.user);

  const load = async () => {
    const db = getOfflineDb();
    const all = await db.sync_conflicts
      .filter(c => !c.resolution)
      .toArray();
    setConflicts(all);
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (id: number, resolution: 'keep_local' | 'keep_cloud') => {
    setResolving(id);
    try {
      await resolveConflict(id, resolution, authUser?.id || 'unknown');
      await load();
    } finally {
      setResolving(null);
    }
  };

  const formatValue = (raw: string): string => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  };

  const modal: React.CSSProperties = {
    background: 'var(--card)',
    borderRadius: 16, border: '1px solid var(--border)',
    padding: '1.5rem', maxWidth: 600, width: '100%', maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow)',
    display: 'flex', flexDirection: 'column', gap: '1rem',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--amber)' }}>
            ⚡ Sync Conflicts ({conflicts.length})
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.25rem' }}>×</button>
        </div>

        {conflicts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ok)', padding: '2rem', fontSize: '0.9rem' }}>
            ✓ No conflicts — all data is in sync.
          </div>
        )}

        {conflicts.map(c => (
          <div key={c.id} style={{
            background: 'var(--amberbg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)' }}>
              {c.entityType} / {c.entityLocalId}
              {c.fieldName && ` → ${c.fieldName}`}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'var(--infobg)', borderRadius: 8, padding: '0.625rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--blue)', marginBottom: '0.25rem' }}>
                  📱 Your version (offline)
                </div>
                <pre style={{ fontSize: '0.65rem', color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflow: 'auto' }}>
                  {formatValue(c.localValue)}
                </pre>
              </div>
              <div style={{ background: '#f3e8ff', borderRadius: 8, padding: '0.625rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7e22ce', marginBottom: '0.25rem' }}>
                  ☁️ Cloud version
                </div>
                <pre style={{ fontSize: '0.65rem', color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflow: 'auto' }}>
                  {formatValue(c.cloudValue)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                disabled={resolving === c.id}
                onClick={() => handleResolve(c.id!, 'keep_local')}
                style={{
                  padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  background: 'var(--blue)', color: '#fff',
                  fontSize: '0.75rem', fontWeight: 700, opacity: resolving === c.id ? 0.5 : 1,
                }}
              >
                📱 Keep Mine
              </button>
              <button
                disabled={resolving === c.id}
                onClick={() => handleResolve(c.id!, 'keep_cloud')}
                style={{
                  padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  background: '#7e22ce', color: '#fff',
                  fontSize: '0.75rem', fontWeight: 700, opacity: resolving === c.id ? 0.5 : 1,
                }}
              >
                ☁️ Use Cloud
              </button>
            </div>
          </div>
        ))}

        <button onClick={onClose} style={{
          padding: '8px', borderRadius: 9999, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
