import { useState, useEffect } from 'react';
import { useUpdateStore } from '../store/updateStore';
import { triggerAppUpdate, getUnsyncedOutboxCount } from '../services/updateService';

export function UpdateBanner() {
  const { updateAvailable, serverManifest, checkUpdates } = useUpdateStore();
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check for updates on mount
  useEffect(() => {
    checkUpdates();
    // Re-check every 2 minutes when online
    const timer = setInterval(() => {
      if (navigator.onLine) {
        checkUpdates();
      }
    }, 120000);
    return () => clearInterval(timer);
  }, [checkUpdates]);

  if (!updateAvailable || !serverManifest) return null;

  const handleUpdateClick = async () => {
    setUpdating(true);
    setErrorMsg(null);
    try {
      const unsyncedCount = await getUnsyncedOutboxCount();
      if (unsyncedCount > 0) {
        const confirmMsg = `You have ${unsyncedCount} unsynced field data item(s). Sync before updating. Do you want to proceed anyway?`;
        const confirmed = window.confirm(confirmMsg);
        if (!confirmed) {
          setUpdating(false);
          return;
        }
      }

      // Run update (with force if confirmed)
      const res = await triggerAppUpdate(true);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update.');
        setUpdating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setUpdating(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(245,158,11,0.1)',
      borderBottom: '1px solid rgba(245,158,11,0.3)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px',
      position: 'relative',
      zIndex: 9999,
      fontFamily: 'var(--font)',
      fontSize: '0.875rem',
      color: '#fbbf24',
      fontWeight: 600,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <span>
        🚀 Update Available: A new version ({serverManifest.version}) of {serverManifest.appName} is ready!
      </span>
      <button
        onClick={handleUpdateClick}
        disabled={updating}
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 700,
          fontFamily: 'var(--font)',
          fontSize: '0.8125rem',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 5px rgba(37,99,235,0.3)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'}
      >
        {updating ? 'Updating...' : 'Update Now'}
      </button>
      {errorMsg && (
        <span style={{ color: 'var(--danger, #dc3545)', marginLeft: '10px' }}>
          ⚠️ Error: {errorMsg}
        </span>
      )}
    </div>
  );
}
