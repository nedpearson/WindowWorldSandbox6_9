import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { getOfflineDb, checkStorageQuota, backupLocalData } from '../lib/offlineDb';
import { downloadLocalAiModels, isLocalAiInstalled } from '../lib/localAi';
import { warmOfflineCaches, warmDateRange } from '../lib/cacheWarmer';

const LOCAL_DATA_PATH = '%APPDATA%\\WindowWorldAssistant\\';
const PHOTOS_SUBPATH = 'Photos';
const DOCUMENTS_SUBPATH = 'Documents';

export function SurfaceProSettingsPage() {
  const [dbStatus, setDbStatus] = useState<any>({ usedMb: 0, quotaMb: 0, pct: 0, pendingSync: 0 });
  const [aiStatus, setAiStatus] = useState(isLocalAiInstalled() ? 'Installed' : 'Not Installed');
  const [aiProgress, setAiProgress] = useState(0);
  const [appVersion, setAppVersion] = useState('Unknown');
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<{ usageMb: number; quotaMb: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const auth = useAuthStore(state => state.user);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    async function loadStats() {
      const quota = await checkStorageQuota();
      const pendingCount = await getOfflineDb().sync_outbox.count();
      setDbStatus({ ...quota, pendingSync: pendingCount });
      
      if ((window as any).electronAPI) {
        const version = await (window as any).electronAPI.getAppVersion();
        setAppVersion(version);
        
        (window as any).electronAPI.onUpdateAvailable((info: any) => {
          setUpdateAvailable(info);
        });
      }

      // Fetch browser storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageEstimate({
            usageMb: Math.round((estimate.usage || 0) / (1024 * 1024) * 10) / 10,
            quotaMb: Math.round((estimate.quota || 0) / (1024 * 1024) * 10) / 10,
          });
        } catch {
          // Storage API not available
        }
      }
    }
    loadStats();
    
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadAi = async () => {
    setAiStatus('Downloading...');
    try {
      await downloadLocalAiModels(setAiProgress);
      setAiStatus('Installed');
    } catch (e) {
      setAiStatus('Failed to install');
    }
  };

  const handleUpdate = async () => {
    if (dbStatus.pendingSync > 0) {
      alert('You have unsynced field data. Sync before updating.');
      return;
    }
    (window as any).electronAPI.installUpdate();
  };

  const handleDownloadToday = async () => {
    if (!auth) return;
    setDownloadStatus('Downloading today...');
    const { status } = await warmOfflineCaches(auth.id || '', auth.companyId || '', p => setDownloadStatus(p.step));
    setDownloadStatus(status === 'ready' ? 'Finished.' : 'Download failed.');
  };

  const handleDownloadRange = async () => {
    if (!auth || !dateFrom || !dateTo) return;
    setDownloadStatus('Downloading range...');
    const { status } = await warmDateRange(auth.id || '', auth.companyId || '', new Date(dateFrom).toISOString(), new Date(dateTo).toISOString(), p => setDownloadStatus(p.step));
    setDownloadStatus(status === 'ready' ? 'Finished.' : 'Download failed.');
  };

  const handleBackup = async () => {
    setDownloadStatus('Backing up local data...');
    const ok = await backupLocalData();
    setDownloadStatus(ok ? 'Backup saved.' : 'Backup failed.');
  };

  const handleOpenFolder = (subfolder: string) => {
    const fullPath = `${LOCAL_DATA_PATH}${subfolder}`;
    if ((window as any).electronAPI?.openPath) {
      (window as any).electronAPI.openPath(fullPath);
    } else {
      alert(`Folder path:\n${fullPath}\n\nOpen this path in File Explorer manually. (electronAPI not available outside Electron.)`);
    }
  };

  const handleClearCache = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the local cache?\n\n' +
      'This will remove cached assets and temporary data. ' +
      'Your synced field data will NOT be affected, but you may need to re-download offline data.\n\n' +
      'The app will reload after clearing.'
    );
    if (!confirmed) return;

    setClearingCache(true);
    try {
      // Clear Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // Clear localStorage (except auth tokens)
      const authToken = localStorage.getItem('auth-token');
      const authUser = localStorage.getItem('auth-storage');
      localStorage.clear();
      if (authToken) localStorage.setItem('auth-token', authToken);
      if (authUser) localStorage.setItem('auth-storage', authUser);

      // Reload
      window.location.reload();
    } catch (err) {
      console.error('[SurfaceProSettings] Failed to clear cache:', err);
      setClearingCache(false);
      alert('Failed to clear cache. See console for details.');
    }
  };

  const isDesktop = !!(window as any).electronAPI;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text-primary)' }}>Surface Pro Settings</h1>
      
      {/* 1. Offline Storage */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--royal)' }}>Desktop Installation & Offline Storage</h2>
            <p style={{ margin: '0.25rem 0' }}><strong>Database Status:</strong> Active (IndexedDB / SQLite)</p>
            <p style={{ margin: '0.25rem 0' }}><strong>Storage Used:</strong> {dbStatus.usedMb} MB / {dbStatus.quotaMb} MB ({dbStatus.pct}%)</p>
            <p style={{ margin: '0.25rem 0' }}><strong>Pending Sync Items:</strong> {dbStatus.pendingSync}</p>
            {isDesktop && <p style={{ margin: '0.25rem 0' }}><strong>Photo Path:</strong> Documents/WW Customers/Photos</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {deferredPrompt && (
              <button 
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') setDeferredPrompt(null);
                }}
                className="btn btn-success"
              >
                💻 Install App to Desktop
              </button>
            )}
            <button onClick={handleBackup} className="btn btn-primary">
              Backup Local Data
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Offline Data Download</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ensure all assigned jobs are downloaded before going offline.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button onClick={handleDownloadToday} className="btn btn-secondary" style={{ background: '#1e293b', color: '#fff', border: 'none' }}>
              Download Today's Jobs
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.875rem', background: 'var(--card)', color: 'var(--text-primary)' }} />
              <span>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.875rem', background: 'var(--card)', color: 'var(--text-primary)' }} />
              <button onClick={handleDownloadRange} className="btn btn-secondary" style={{ background: '#1e293b', color: '#fff', border: 'none' }}>
                Download Range
              </button>
            </div>
          </div>
          {downloadStatus && <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--blue)' }}>{downloadStatus}</p>}
        </div>
      </section>

      {/* 2. Sync */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--royal)' }}>Sync Engine</h2>
        <p>The app automatically syncs when online.</p>
        <p style={{ marginTop: '0.5rem' }}><strong>Conflicts:</strong> Handled automatically via Server Wins merging.</p>
      </section>

      {/* 3. Local AI */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--royal)' }}>Local AI (Offline Vision & Analysis)</h2>
        <p><strong>Status:</strong> {aiStatus}</p>
        {aiStatus.includes('Downloading') && <progress value={aiProgress} max="100" style={{ width: '100%', marginTop: '0.5rem' }} />}
        {aiStatus !== 'Installed' && !aiStatus.includes('Downloading') && (
          <button 
            onClick={handleDownloadAi}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Download Local AI Pack
          </button>
        )}
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Local AI allows photo classification without internet service.</p>
      </section>

      {/* 4. Updates */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--royal)' }}>Updates</h2>
        <p><strong>Current Version:</strong> {appVersion}</p>
        {updateAvailable ? (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--amberbg, #fef3c7)', border: '1px solid var(--warning)', borderRadius: '8px' }}>
            <p style={{ fontWeight: 700, color: 'var(--warning)' }}>Update Available: {updateAvailable.version}</p>
            {dbStatus.pendingSync > 0 ? (
              <p style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '0.5rem' }}>⚠️ Warning: You have unsynced data. You must sync before updating.</p>
            ) : (
              <button onClick={handleUpdate} className="btn btn-success" style={{ marginTop: '0.5rem' }}>Install Update</button>
            )}
          </div>
        ) : (
          <button 
            onClick={() => isDesktop && (window as any).electronAPI.checkForUpdates()}
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Check for Updates
          </button>
        )}
      </section>

      {/* 5. Documents */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--royal)' }}>Documents & Templates</h2>
        <p style={{ margin: '0.25rem 0' }}><strong>Sales Email Used:</strong> npearson@winworldinfo.com</p>
        <p style={{ margin: '0.25rem 0' }}>Local Contract & Order Form Templates are bundled in the application.</p>
      </section>

      {/* 6. Local File Management */}
      <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--royal)' }}>📁 Local File Management</h2>

        {/* Data path */}
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Local Data Path:</strong>{' '}
          <code style={{ background: 'var(--card)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
            {LOCAL_DATA_PATH}
          </code>
        </p>

        {/* Folder buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            onClick={() => handleOpenFolder(PHOTOS_SUBPATH)}
            className="btn btn-secondary"
            style={{ background: '#1e293b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📷 Open Photos Folder
          </button>
          <button
            onClick={() => handleOpenFolder(DOCUMENTS_SUBPATH)}
            className="btn btn-secondary"
            style={{ background: '#1e293b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📄 Open Documents Folder
          </button>
        </div>
        {!isDesktop && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Folder opening requires the Electron desktop app. In the browser, the path will be shown for manual navigation.
          </p>
        )}

        {/* Storage usage */}
        {storageEstimate && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Browser Storage Usage</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  background: 'var(--border, #e2e8f0)',
                  borderRadius: '8px',
                  height: '12px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    background: storageEstimate.quotaMb > 0 && (storageEstimate.usageMb / storageEstimate.quotaMb) > 0.8
                      ? 'var(--danger, #dc3545)'
                      : 'var(--blue, #0d6efd)',
                    height: '100%',
                    width: `${storageEstimate.quotaMb > 0 ? Math.min((storageEstimate.usageMb / storageEstimate.quotaMb) * 100, 100) : 0}%`,
                    borderRadius: '8px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {storageEstimate.usageMb} MB / {storageEstimate.quotaMb} MB
              </span>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Includes IndexedDB, Service Worker caches, and local storage.
            </p>
          </div>
        )}

        {/* Clear cache */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Cache Management</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Clear cached assets and temporary data. Synced field data is preserved, but offline downloads will need to be re-fetched.
          </p>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="btn btn-secondary"
            style={{
              background: 'var(--danger, #dc3545)',
              color: '#fff',
              border: 'none',
              opacity: clearingCache ? 0.6 : 1,
              cursor: clearingCache ? 'not-allowed' : 'pointer',
            }}
          >
            {clearingCache ? 'Clearing...' : '🗑️ Clear Local Cache'}
          </button>
        </div>
      </section>
    </div>
  );
}

