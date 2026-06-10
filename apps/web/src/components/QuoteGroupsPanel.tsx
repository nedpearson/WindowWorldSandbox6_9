import { useState, useEffect } from 'react';
import { getOfflineDb } from '../lib/offlineDb';
import type { CachedQuoteGroup, CachedQuoteGroupOpening } from '../lib/offlineDb';
import { toast } from './Toast';

interface QuoteGroupsPanelProps {
  appointmentId: string;
  onClose: () => void;
  onCombineGroups: () => void;
}

export function QuoteGroupsPanel({ appointmentId, onClose, onCombineGroups }: QuoteGroupsPanelProps) {
  const [groups, setGroups] = useState<(CachedQuoteGroup & { openingCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, [appointmentId]);

  const loadGroups = async () => {
    try {
      const db = getOfflineDb();
      const allGroups = await db.quote_groups.where('appointmentId').equals(appointmentId).toArray();
      const groupsWithCounts = await Promise.all(
        allGroups.map(async (g) => {
          const count = await db.quote_group_openings.where('quoteGroupId').equals(g.id).count();
          return { ...g, openingCount: count };
        })
      );
      setGroups(groupsWithCounts.sort((a, b) => a.createdAt - b.createdAt));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load quote groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote group?')) return;
    try {
      const db = getOfflineDb();
      await db.quote_groups.delete(id);
      await db.quote_group_openings.where('quoteGroupId').equals(id).delete();
      setGroups(prev => prev.filter(g => g.id !== id));
      toast.success('Quote group deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quote group');
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 340,
      background: 'var(--card)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: 'var(--shadow)',
      animation: 'slideInRight 0.2s ease-out'
    }}>
      <div style={{
        padding: '1rem', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>Quote Groups</h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer'
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {loading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '2rem' }}>
            No quote groups yet.<br /><br />
            Select openings on the sketch and click "Save Quote Group".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map(g => (
              <div key={g.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>{g.name}</h3>
                  <button onClick={() => handleDelete(g.id)} style={{
                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem'
                  }}>🗑</button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  {g.openingCount} openings selected
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ok)', fontWeight: 600 }}>
                    {g.pricingStatus === 'needs_review' ? 'Price pending...' : `$${g.total.toFixed(2)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button 
          onClick={onCombineGroups}
          disabled={groups.length < 1}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none',
            background: groups.length < 1 ? 'var(--border)' : 'var(--blue)', 
            color: groups.length < 1 ? 'var(--muted)' : '#fff', fontWeight: 700, cursor: groups.length < 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Combine Quotes
        </button>
      </div>
    </div>
  );
}
