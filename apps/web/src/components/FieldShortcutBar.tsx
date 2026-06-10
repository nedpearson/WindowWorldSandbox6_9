import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface FieldShortcutBarProps {
  onApply: (actions: Record<string, any>) => void;
}

export function FieldShortcutBar({ onApply }: FieldShortcutBarProps) {
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    api.getFieldShortcuts().then(setShortcuts).catch(() => {});
  }, []);

  const categories = ['all', ...new Set(shortcuts.map(s => s.category))];
  const filtered = activeCategory === 'all' ? shortcuts : shortcuts.filter(s => s.category === activeCategory);

  return (
    <div style={{ background: 'var(--bg-secondary, #161b22)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color, #30363d)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>⚡ Quick Actions</h4>
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: activeCategory === cat ? '#58a6ff' : 'var(--bg-tertiary, #0d1117)',
            color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
          }}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
        {filtered.map(s => (
          <button key={s.key} onClick={() => onApply(s.actions)} style={{
            padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color, #30363d)', cursor: 'pointer',
            background: 'var(--bg-tertiary, #0d1117)', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#58a6ff'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-color, #30363d)'; }}
          >
            <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
            <span>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default FieldShortcutBar;
