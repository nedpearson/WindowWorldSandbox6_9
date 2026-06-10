import { useState } from 'react';
import { QuoteHealth, HealthIssue } from '../utils/quoteHealth';

export function QuoteHealthWidget({
  health,
  onFixIssue,
}: {
  health: QuoteHealth;
  onFixIssue?: (issue: HealthIssue) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!health) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical': return 'var(--danger)';
      case 'Needs Review': return 'var(--warning)';
      case 'Healthy': return 'var(--success)';
      case 'Export Ready': return 'var(--primary)';
      default: return 'var(--text-muted)';
    }
  };

  const color = getStatusColor(health.status);

  return (
    <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem', borderLeft: `4px solid ${color}` }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: color, color: '#fff', fontWeight: 800,
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.125rem'
          }}>
            {health.score}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Quote Health: {health.status}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {health.issues.length} flags ({health.missingBlockers} critical)
            </div>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && health.issues.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {health.issues.map((issue, i) => (
            <div key={i} style={{
              padding: '0.5rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)', borderLeft: `3px solid ${issue.type === 'error' ? 'var(--danger)' : issue.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {issue.type === 'error' ? '🔴' : issue.type === 'warning' ? '🟠' : '🔵'} {issue.message}
                </div>
                {issue.openingNumber && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Opening #{issue.openingNumber} {issue.field ? `· Field: ${issue.field}` : ''}
                  </div>
                )}
              </div>
              {issue.actionRequired && onFixIssue && (
                <button 
                  className="btn btn-sm" 
                  style={{ background: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                  onClick={(e) => { e.stopPropagation(); onFixIssue(issue); }}
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
