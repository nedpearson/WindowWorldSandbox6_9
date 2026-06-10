import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/sessionTracker';

export function ActiveWorkflowBanner() {
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for dismissed ID
    try {
      const stored = localStorage.getItem('wwa_dismissed_workflow');
      if (stored) setDismissedId(stored);
    } catch (e) { console.debug("[swallowed error]", e); }

    const fetchActive = async () => {
      try {
        const data = await api.getActiveWorkflow();
        if (data && data.active) {
          setWorkflow(data);
        } else {
          setWorkflow(null);
        }
      } catch (err) {
        console.error('Failed to fetch active workflow:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActive();
    
    // Set up a small poll or listen to window focus to keep it relatively fresh
    const onFocus = () => fetchActive();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading || !workflow) return null;
  
  // Don't show if user explicitly dismissed this specific appointment recently
  // unless the appointment was updated *after* they dismissed it. 
  // For simplicity, we just hide it if dismissedId matches current appointment.
  if (dismissedId === workflow.appointmentId) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedId(workflow.appointmentId);
    try {
      localStorage.setItem('wwa_dismissed_workflow', workflow.appointmentId);
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(workflow.resumeUrl);
  };

  return (
    <div
      onClick={handleResume}
      style={{
        margin: '1rem', padding: '0.875rem 1rem', borderRadius: 10, cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))',
        border: '1px solid rgba(34,197,94,0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.2s',
      }}
    >
      <div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#22c55e', marginBottom: '2px' }}>
          ▶ Resume: {workflow.customerName}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {workflow.stepLabel} · {workflow.summary}
          <span style={{ marginLeft: '0.375rem', opacity: 0.6 }}>
            · {timeAgo(new Date(workflow.updatedAt).getTime())}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleResume}
          style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#22c55e',
            background: 'rgba(34,197,94,0.15)', padding: '6px 12px', borderRadius: 6,
            border: 'none', cursor: 'pointer'
          }}
        >
          Resume →
        </button>
        <button
          onClick={handleDismiss}
          style={{
            fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)',
            background: 'transparent', padding: '4px', border: 'none',
            cursor: 'pointer', lineHeight: 1, opacity: 0.6
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
