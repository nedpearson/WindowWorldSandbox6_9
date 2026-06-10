import { useState, useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store';
import { ActiveWorkflowBanner } from './workflow/ActiveWorkflowBanner';
import { OfflineReadyBadge } from './OfflineReadyBadge';
import { BRAND } from '../config/brand';
import { UpdateBanner } from './UpdateBanner';

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const canGoBack = location.pathname !== '/';

  // Build the mobile URL — context-aware:
  // • On /appointments/:id → link directly to /mobile/field/:id (opens field app for that appointment)
  // • Everywhere else     → link to /mobile (home screen)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseHost = isLocalhost && lanIp
    ? `http://${lanIp}:${window.location.port || 80}`
    : `${window.location.protocol}//${window.location.host}`;

  // Link directly to the mobile path — NetworkFirst SW ensures fresh code is always served when online.
  // Timestamp param prevents any residual SW URL-level caching.
  const mobileBase = '/mobile';
  const mobileUrl = `${baseHost}${mobileBase}?v=${Date.now()}`;
  const qrLabel = '📱 Open Field App on Phone';

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager' || user?.role === 'super_admin';

  // Support iPad/tablet detection (same logic as App.tsx)
  const isTouchDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (window.innerWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  // Links for Sales Reps (non-admin)
  const repLinks = [
    { to: '/', label: '🏠 Today', end: true },
    { to: '/appointments', label: '📅 Appointments' },
    { to: '/customers', label: '👤 Customers' },
    { to: '/commissions', label: '💰 My Money' },
    { to: '/manual', label: '📖 Field Manual' },
  ];
  if ((window as any).electronAPI) {
    repLinks.push({ to: '/surface-settings', label: '💻 Surface Settings' });
  }

  // Links for Operations / Installers / Managers (admin/manager)
  const opsLinks = [
    { to: '/manager-dashboard', label: '📊 Operations Dashboard', end: true },
    { to: '/office', label: '🏢 Office Queue' },
    { to: '/appointments', label: '📅 Appointments' },
    { to: '/customers', label: '👤 Customers' },
    { to: '/finance-options', label: '💳 Finance Catalog' },
  ];

  // System settings/configuration links for admins
  const systemSettingsLinks = [
    { to: '/pricing-import', label: '📦 Pricing Import' },
    { to: '/rules', label: '⚡ Rule Engine' },
    { to: '/measurement-rules', label: '📐 Measurement Rules' },
    { to: '/analytics', label: '📊 Knowledge Base' },
  ];

  // Fetch the real LAN IP when the QR panel is first opened (only locally)
  useEffect(() => {
    if (!showQR || lanIp !== null || !isLocalhost) return; // only fetch once, and only on localhost
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(data => {
        if (data.ip && data.ip !== 'localhost') setLanIp(data.ip);
        else setIpError(true);
      })
      .catch(() => setIpError(true));
  }, [showQR, lanIp, isLocalhost]);

  return (
    <div className="app-layout-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <UpdateBanner />
      {/* Top Bar (every page) */}
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-tile">🪟</div>
          <div>
            <div className="top-bar-title">{BRAND.appName}</div>
            <div className="top-bar-subtitle">
              {user?.role === 'admin' || user?.role === 'owner' ? '⚙️ Admin' : user?.role === 'manager' ? '🛡️ Manager' : user?.role === 'super_admin' ? '👑 Super Admin' : '🔧 Sales Rep'}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <OfflineReadyBadge />
          <span className="rep-info">{user?.name}</span>
          <button className="open-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>Open</button>
        </div>
      </header>

      <div className="app-layout" style={{ flex: 1, display: 'flex' }}>
        {/* Overlay */}
        {sidebarOpen && <div className="overlay open" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <span style={{ fontSize: '1.5rem' }}>🪟</span>
            <div>
              <h1 style={{ margin: 0 }}>{BRAND.appName}</h1>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role === 'admin' || user?.role === 'owner' ? '⚙️ Admin' : user?.role === 'manager' ? '🛡️ Manager' : user?.role === 'super_admin' ? '👑 Super Admin' : '🔧 Sales Rep'}
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {/* Sales Rep Sidebar */}
            {!isAdmin && repLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end || l.to === '/'} onClick={() => setSidebarOpen(false)}>
                {l.label}
              </NavLink>
            ))}

            {/* Operations / Installers Sidebar */}
            {isAdmin && (
              <>
                {opsLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end || l.to === '/manager-dashboard'} onClick={() => setSidebarOpen(false)}>
                    {l.label}
                  </NavLink>
                ))}
                
                <div style={{ borderTop: '1px solid var(--border)', margin: '0.5rem 1rem', opacity: 0.3 }} />
                <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none',
                  border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
                  fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>⚙️ System Settings</span>
                  <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {showAdvanced && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '0.5rem' }}>
                    {systemSettingsLinks.map((l) => (
                      <NavLink key={l.to} to={l.to} onClick={() => setSidebarOpen(false)} style={{ fontSize: '0.8125rem', padding: '0.375rem 1rem' }}>
                        {l.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </nav>

          {/* ── Field App access ── */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
            {isTouchDevice ? (
              <a href="/mobile" onClick={() => setSidebarOpen(false)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', padding: '0.75rem',
                background: 'var(--blue)',
                color: '#fff', borderRadius: 8, textDecoration: 'none',
                fontSize: '0.9375rem', fontWeight: 800,
                boxShadow: '0 2px 12px rgba(13,110,253,0.2)',
              }}>
                📱 Open Field App
              </a>
            ) : (
              <>
                <button onClick={() => setShowQR(v => !v)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: showQR ? 'rgba(13,110,253,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showQR ? 'rgba(13,110,253,0.35)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer',
                  color: showQR ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  <span>{qrLabel}</span>
                  <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>{showQR ? '▲' : '▼'}</span>
                </button>
                {showQR && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'white', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                    {isLocalhost && !lanIp && !ipError && (
                      <div style={{ height: 172, width: 172, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>Finding network IP…</div>
                    )}
                    {isLocalhost && ipError && (
                      <div style={{ width: 172, color: '#ef4444', fontSize: '0.6875rem', textAlign: 'center', lineHeight: 1.5 }}>
                        Could not detect LAN IP.<br />Run <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, color: '#0f172a' }}>ipconfig</code> and enter it:<br />
                        <input style={{ marginTop: 6, width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', color: '#0f172a', textAlign: 'center' }} placeholder="192.168.x.x" onChange={e => { if (e.target.value.match(/^\d+\.\d+\.\d+\.\d+$/)) setLanIp(e.target.value); }} />
                      </div>
                    )}
                    {(!isLocalhost || lanIp) && (
                      <>
                        <QRCodeSVG value={mobileUrl} size={172} bgColor="#ffffff" fgColor="#000000" level="M" includeMargin={false} />
                        <div style={{ fontSize: '0.5625rem', color: '#475569', textAlign: 'center', wordBreak: 'break-all', maxWidth: 172, lineHeight: 1.4, fontWeight: 600 }}>{mobileUrl}</div>
                      </>
                    )}
                    {isLocalhost && <div style={{ fontSize: '0.5625rem', color: '#94a3b8', textAlign: 'center' }}>📶 Same Wi-Fi required</div>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* User / Sign Out */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {user?.name}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content fade-in" style={{
            overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative',
          }}>
          {isAdmin ? null : <ActiveWorkflowBanner />}
          {/* Global back button — desktop */}
          {canGoBack && (
            <button
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                marginBottom: '1rem', padding: '0.375rem 0.875rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-secondary)', fontSize: '0.8125rem',
                fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}>
              ← Back
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
