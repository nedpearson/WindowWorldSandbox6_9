import { useState, useEffect } from 'react';
import { getOfflineDb } from '../lib/offlineDb';
import type { CachedQuoteGroup, CachedQuoteGroupOpening } from '../lib/offlineDb';
import { toast } from './Toast';

interface CombinedQuoteBuilderProps {
  appointmentId: string;
  onClose: () => void;
}

export function CombinedQuoteBuilder({ appointmentId, onClose }: CombinedQuoteBuilderProps) {
  const [groups, setGroups] = useState<(CachedQuoteGroup & { openings: CachedQuoteGroupOpening[] })[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  const loadData = async () => {
    try {
      const db = getOfflineDb();
      const allGroups = await db.quote_groups.where('appointmentId').equals(appointmentId).toArray();
      const groupsWithOpenings = await Promise.all(
        allGroups.map(async (g) => {
          const openings = await db.quote_group_openings.where('quoteGroupId').equals(g.id).toArray();
          return { ...g, openings };
        })
      );
      setGroups(groupsWithOpenings);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load quote groups');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Calculate unique openings
  const uniqueOpeningIds = new Set<string>();
  let duplicateCount = 0;
  for (const gid of selectedGroupIds) {
    const group = groups.find(g => g.id === gid);
    if (group) {
      for (const op of group.openings) {
        if (uniqueOpeningIds.has(op.openingId)) {
          duplicateCount++;
        } else {
          uniqueOpeningIds.add(op.openingId);
        }
      }
    }
  }

  const handleCreateCombinedQuote = async () => {
    if (selectedGroupIds.length === 0) return;
    const name = prompt('Name this Combined Quote: (e.g. "Full Package - Master & Front")');
    if (!name) return;

    try {
      const db = getOfflineDb();
      const id = `local_cq_${Date.now()}`;
      await db.combined_quotes.put({
        id,
        localId: id,
        appointmentId,
        name,
        status: 'draft',
        subtotal: 0, discount: 0, tax: 0, total: 0, pricingStatus: 'needs_review',
        useForContract: true,
        syncStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (let i = 0; i < selectedGroupIds.length; i++) {
        await db.combined_quote_groups.put({
          id: `local_cqg_${Date.now()}_${i}`,
          combinedQuoteId: id,
          quoteGroupId: selectedGroupIds[i],
          sortOrder: i,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Sync outbox
      await (await import('../lib/syncEngine')).enqueueOutboxItem({
        companyId: '', userId: '',
        entityType: 'combined_quote',
        entityLocalId: id,
        operation: 'create',
        payload: {
          name,
          appointmentId,
          useForContract: true,
          quoteGroupIds: selectedGroupIds,
        }
      });

      toast.success('Combined Quote created');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create Combined Quote');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
        width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow)', overflow: 'hidden'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Combine Quotes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Select multiple quote groups to bundle them into one contract. Duplicates will be automatically removed.
          </p>
          
          {loading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groups.map(g => (
                <label key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  background: selectedGroupIds.includes(g.id) ? 'var(--infobg)' : 'var(--card)',
                  border: `1px solid ${selectedGroupIds.includes(g.id) ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input 
                    type="checkbox" 
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>{g.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{g.openings.length} openings</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedGroupIds.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Package Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Unique Openings:</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{uniqueOpeningIds.size}</span>
              </div>
              {duplicateCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--amber)', fontSize: '0.85rem' }}>
                  <span>Duplicates Removed:</span>
                  <span style={{ fontWeight: 600 }}>{duplicateCount}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem', borderRadius: 8, background: 'var(--border)', border: 'none', color: 'var(--text)', fontWeight: 600, cursor: 'pointer'
          }}>Cancel</button>
          <button 
            onClick={handleCreateCombinedQuote}
            disabled={selectedGroupIds.length < 2}
            style={{
              flex: 2, padding: '0.75rem', borderRadius: 8, background: selectedGroupIds.length < 2 ? 'var(--border)' : 'var(--blue)', 
              border: 'none', color: selectedGroupIds.length < 2 ? 'var(--muted)' : '#fff', fontWeight: 600, cursor: selectedGroupIds.length < 2 ? 'not-allowed' : 'pointer'
            }}
          >
            Create Combined Quote
          </button>
        </div>
      </div>
    </div>
  );
}
