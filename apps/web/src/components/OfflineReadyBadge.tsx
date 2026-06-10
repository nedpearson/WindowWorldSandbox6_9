import { useEffect, useState } from 'react';
import { getOfflineReadyStatus, warmOfflineCaches, type OfflineReadyStatus } from '../lib/cacheWarmer';
import { useAuthStore } from '../store';

const STATUS_CONFIG: Record<OfflineReadyStatus, { icon: string; label: string; color: string; bg: string }> = {
  not_ready:           { icon: '🔴', label: 'Not Offline Ready', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  warming:             { icon: '🟡', label: 'Syncing data…',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ready:               { icon: '🟢', label: 'Offline Ready',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  ready_with_warnings: { icon: '🟠', label: 'Offline Ready*',    color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  failed:              { icon: '❌', label: 'Sync Failed',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export function OfflineReadyBadge({ onWarm }: { onWarm?: () => void }) {
  const user = useAuthStore(s => s.user);
  const [status, setStatus] = useState<OfflineReadyStatus>('not_ready');
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    getOfflineReadyStatus().then(s => setStatus(s.status));
  }, []);

  const cfg = STATUS_CONFIG[status];

  const handleWarm = async () => {
    if (!user?.companyId || warming) return;
    setWarming(true);
    setStatus('warming');
    try {
      const result = await warmOfflineCaches(user.id, user.companyId, p => setStatus(p.status));
      setStatus(result.status);
    } finally {
      setWarming(false);
    }
    onWarm?.();
  };

  return (
    <button
      onClick={status !== 'ready' ? handleWarm : undefined}
      title={status === 'not_ready' ? 'Tap to download offline data' : cfg.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.25rem 0.6rem', borderRadius: 12, border: 'none', cursor: status !== 'ready' ? 'pointer' : 'default',
        background: cfg.bg, color: cfg.color, fontSize: '0.6875rem', fontWeight: 700,
        transition: 'opacity 0.2s',
      }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </button>
  );
}
