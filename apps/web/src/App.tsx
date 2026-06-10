import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AdminRoute } from './components/AdminRoute';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from './utils/api';

const Layout = lazy(() => import('./components/Layout').then(m => ({ default: m.Layout })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NetworkBanner = lazy(() => import('./utils/productionGuards').then(m => ({ default: m.NetworkBanner })));
const OfflineBanner = lazy(() => import('./components/SyncStatusBar').then(m => ({ default: m.OfflineBanner })));
const RootCausePanel = lazy(() => import('./components/diagnostics/RootCausePanel').then(m => ({ default: m.RootCausePanel })));
const CopilotButton = lazy(() => import('./components/CopilotButton').then(m => ({ default: m.CopilotButton })));

// ── Astari AI Command Center Module (Hidden) ─────────────────
// Disabled in UI — backend services still used

// ═══════════════════════════════════════════════════════════════
// CODE-SPLIT ROUTES — Every non-critical page is lazy-loaded.
// Only LoginPage + DashboardPage are eagerly imported for fast
// initial paint. All others are split into separate JS chunks.
// ═══════════════════════════════════════════════════════════════

// ── Desktop Layout Pages (named exports → wrapped for lazy) ──
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const AppointmentDetailPage = lazy(() => import('./pages/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage })));

const PricingImportPage = lazy(() => import('./pages/PricingImportPage').then(m => ({ default: m.PricingImportPage })));
const RuleEngineAdminPage = lazy(() => import('./pages/RuleEngineAdminPage').then(m => ({ default: m.RuleEngineAdminPage })));
const MeasurementRulesAdminPage = lazy(() => import('./pages/MeasurementRulesAdminPage').then(m => ({ default: m.MeasurementRulesAdminPage })));
const OfficeQueuePage = lazy(() => import('./pages/OfficeQueuePage').then(m => ({ default: m.OfficeQueuePage })));
const CommissionsPage = lazy(() => import('./pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const SelfGenPage = lazy(() => import('./pages/SelfGenPage').then(m => ({ default: m.SelfGenPage })));
const CallerLookupPage = lazy(() => import('./pages/CallerLookupPage').then(m => ({ default: m.CallerLookupPage })));
const JobVisitsPage = lazy(() => import('./pages/JobVisitsPage').then(m => ({ default: m.JobVisitsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const FinanceOptionsPage = lazy(() => import('./pages/FinanceOptionsPage'));

// ── Desktop Layout Pages (already default exports) ───────────
const ProfitabilityPage = lazy(() => import('./pages/ProfitabilityPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const QuickQuotePage = lazy(() => import('./pages/QuickQuotePage'));
const ProductTalkPage = lazy(() => import('./pages/ProductTalkPage').then(m => ({ default: m.ProductTalkPage })));
const ExteriorInspectionPage = lazy(() => import('./pages/ExteriorInspectionPage').then(m => ({ default: m.ExteriorInspectionPage })));
const FinalReviewPage = lazy(() => import('./pages/FinalReviewPage').then(m => ({ default: m.FinalReviewPage })));

// ── Isolated Pages (no Layout wrapper) ───────────────────────
const SigningPage = lazy(() => import('./pages/SigningPage').then(m => ({ default: m.SigningPage })));
const MobileHomePage = lazy(() => import('./pages/MobileHomePage').then(m => ({ default: m.MobileHomePage })));
const SketchFieldPage = lazy(() => import('./pages/SketchFieldPage'));

const ManualPage = lazy(() => import('./pages/ManualPage').then(m => ({ default: m.ManualPage })));
const ManagerDashboardPage = lazy(() => import('./pages/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const SurfaceProSettingsPage = lazy(() => import('./pages/SurfaceProSettingsPage').then(m => ({ default: m.SurfaceProSettingsPage })));

// ── Consistent page-level loading skeleton ───────────────────
function PageLoader() {
  return (
    <div className="fade-in" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ height: 24, borderRadius: 8, background: 'var(--bg-card)', width: '40%', animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: 120, borderRadius: 12, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );
}

// Fullscreen loader for immersive pages (sketch, mobile)
function FullScreenLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary, #0d1117)',
      flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '2rem' }}>🪟</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)', fontFamily: 'system-ui, sans-serif' }}>Loading…</div>
    </div>
  );
}

// ── Suspense wrappers with context-labeled error boundaries ──
function LazyPage({ children, context }: { children: React.ReactNode; context?: string }) {
  return <ErrorBoundary context={context || 'Page'}><Suspense fallback={<PageLoader />}>{children}</Suspense></ErrorBoundary>;
}
function LazyFullScreen({ children, context }: { children: React.ReactNode; context?: string }) {
  return <ErrorBoundary context={context || 'Full Screen'}><Suspense fallback={<FullScreenLoader />}>{children}</Suspense></ErrorBoundary>;
}

// ── /update — Emergency PWA reset page ───────────────────────────────────
// Open https://yourapp.com/update in Safari to nuke all SW caches and reload.
// Works even when the PWA shortcut is stuck on a stale cached version because
// the server always serves fresh HTML which loads this component.
function ForceUpdatePage() {
  useEffect(() => {
    // Read ?then= to know where to redirect after clearing caches
    // Default to /mobile (never the desktop dashboard)
    const dest = new URLSearchParams(window.location.search).get('then') || '/mobile';
    async function nuke() {
      try {
        // 1. Unregister every service worker registration
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        // 2. Delete every Cache Storage cache
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } finally {
        // 3. Hard-navigate to destination — browser fetches everything fresh
        window.location.replace(dest);
      }
    }
    nuke();
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '1rem',
      background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🔄</div>
      <div style={{ fontWeight: 700 }}>Clearing cache and updating…</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>You'll be redirected automatically.</div>
    </div>
  );
}

// Redirect component for old mobile links to point to the unified Appointment flow
function MobileOrderRedirect() {
  const { appointmentId } = useParams();
  const location = useLocation();
  return <Navigate to={`/appointments/${appointmentId}${location.hash}`} replace />;
}

import { useDiagnosticRecorder } from './hooks/useDiagnosticRecorder';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  
  useDiagnosticRecorder();

  // Wait for Zustand persist to rehydrate from localStorage before rendering.
  // Without this, the app flashes a blank black screen on direct URL navigation.
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (synchronous storage), mark immediately
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // ── Offline bootstrap: bind reconnect drain once on mount ─────────────────────────
  useEffect(() => {
    import('./lib/syncEngine').then(m => m.bindReconnectDrain()).catch(console.error);
  }, []);

  // ── On login: register device, warm all offline caches ─────────────────────────
  useEffect(() => {
    if (!user) return;

    // Warm up ALL offline caches in background — never block rendering
    if (navigator.onLine) {
      import('./lib/cacheWarmer').then(({ warmOfflineCaches }) => {
        warmOfflineCaches(user.id, user.companyId ?? '', undefined).catch(() => {});
      });
      // Also drain any pending outbox items from previous offline session
      import('./lib/syncEngine').then(({ drainOutbox }) => {
        drainOutbox().catch((err) => {
          console.error('[App] Background outbox drain failed:', err);
        });
      });
    }

    import('./lib/offlineDb').then(({ getOrCreateDeviceId, detectPlatformType, updateDeviceMeta }) => {
      const deviceId = getOrCreateDeviceId();
      const platform = detectPlatformType();

      // Register device (fire-and-forget)
      api.post('/sync/register-device', { deviceId, platform }).catch(() => {});
      // Update local device_meta with latest userId/companyId
      updateDeviceMeta({
        deviceId,
        platform,
        userId: user.id,
        companyId: user.companyId ?? '',
        lastSyncAt: Date.now(),
      }).catch(() => {});
    }).catch(console.error);

  }, [user?.id]);


  // Allow /update before auth so users can force-refresh even when logged out
  if (window.location.pathname === '/update') return <ForceUpdatePage />;

  if (!hydrated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary, #0d1117)', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>🪟</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #6b7280)', fontFamily: 'system-ui, sans-serif' }}>Loading…</div>
    </div>
  );

  // Remember the path so we can redirect back after login on mobile.
  // Use pathname only (no ?v= cache-bust params) so redirect is clean.
  const intendedPath = window.location.pathname;
  // Support iPad/tablet touch capability detection
  const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     (window.innerWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  // If on a touch device and heading to the desktop root, send to field app instead
  const loginRedirect = intendedPath === '/' && isMobileUA ? '/mobile' : intendedPath;

  if (!user) return <Suspense fallback={<FullScreenLoader />}><LoginPage redirectTo={loginRedirect} /></Suspense>;

  // Logged-in iPad user who somehow landed on desktop root → push to field app
  // Use React Navigate instead of window.location.replace to avoid reload loop
  if (isMobileUA && intendedPath === '/') {
    return <Navigate to="/mobile" replace />;
  }


  return (
    <ErrorBoundary context="Application Root">
      <ToastProvider>
        <Suspense fallback={null}>
          <RootCausePanel />
          <CopilotButton />
          {/* Mobile pages have their own offline indicators — skip global banners */}
          {!intendedPath.startsWith('/mobile') && <OfflineBanner />}
          {!intendedPath.startsWith('/mobile') && <NetworkBanner />}
        </Suspense>
        <Routes>
          {/* Isolated pages — no Layout, fullscreen loader */}
          <Route path="/sign/:token" element={<LazyFullScreen context="Customer Signing"><SigningPage /></LazyFullScreen>} />
          <Route path="/mobile" element={<LazyFullScreen context="Mobile Home"><MobileHomePage /></LazyFullScreen>} />
          {/* Old mobile order form -> redirect into canonical sketch flow */}
          <Route path="/mobile/order/:appointmentId" element={<MobileOrderRedirect />} />
          <Route path="/mobile/field/:appointmentId" element={<MobileOrderRedirect />} />
          <Route path="/appointments/:appointmentId/sketch" element={<LazyFullScreen context="Sketch Canvas"><SketchFieldPage /></LazyFullScreen>} />


          {/* Main app with sidebar */}
          <Route path="/*" element={
            <Suspense fallback={<FullScreenLoader />}>
              <Layout>
                <Routes>
                  {/* ── All authenticated users ── */}
                  <Route path="/" element={<LazyPage><DashboardPage /></LazyPage>} />
                <Route path="/appointments" element={<LazyPage context="Appointments"><AppointmentsPage /></LazyPage>} />
                <Route path="/appointments/:id" element={<LazyPage context="Appointment Detail"><AppointmentDetailPage /></LazyPage>} />
                <Route path="/customers" element={<LazyPage context="Customers"><CustomersPage /></LazyPage>} />
                <Route path="/whos-calling" element={<LazyPage context="Who's Calling"><CallerLookupPage /></LazyPage>} />
                <Route path="/self-gen" element={<LazyPage context="Self Gen"><SelfGenPage /></LazyPage>} />
                <Route path="/job-visits" element={<LazyPage context="Job Visits"><JobVisitsPage /></LazyPage>} />
                <Route path="/reports" element={<LazyPage context="Reports"><ReportsPage /></LazyPage>} />
                <Route path="/commissions" element={<LazyPage><CommissionsPage /></LazyPage>} />
                <Route path="/product-talk" element={<LazyPage context="Product Talk"><ProductTalkPage /></LazyPage>} />
                <Route path="/exterior-inspection" element={<LazyPage context="Exterior Inspection"><ExteriorInspectionPage /></LazyPage>} />
                <Route path="/final-review" element={<LazyPage context="Final Review"><FinalReviewPage /></LazyPage>} />
                <Route path="/quick-quote" element={<LazyPage context="Quick Quote AI"><QuickQuotePage /></LazyPage>} />
                <Route path="/manual" element={<LazyPage><ManualPage /></LazyPage>} />

                {/* ── Admin / Manager only routes ── */}
                <Route path="/analytics" element={<AdminRoute><LazyPage><AnalyticsPage /></LazyPage></AdminRoute>} />
                <Route path="/profitability" element={<AdminRoute><LazyPage><ProfitabilityPage /></LazyPage></AdminRoute>} />

                <Route path="/pricing-import" element={<AdminRoute><LazyPage><PricingImportPage /></LazyPage></AdminRoute>} />
                <Route path="/rules" element={<AdminRoute><LazyPage><RuleEngineAdminPage /></LazyPage></AdminRoute>} />
                <Route path="/measurement-rules" element={<AdminRoute><LazyPage><MeasurementRulesAdminPage /></LazyPage></AdminRoute>} />
                <Route path="/office" element={<AdminRoute><LazyPage><OfficeQueuePage /></LazyPage></AdminRoute>} />
                <Route path="/finance-options" element={<AdminRoute><LazyPage context="Finance Options"><FinanceOptionsPage /></LazyPage></AdminRoute>} />
                <Route path="/manager-dashboard" element={<AdminRoute><LazyPage><ManagerDashboardPage /></LazyPage></AdminRoute>} />
                <Route path="/surface-settings" element={<LazyPage><SurfaceProSettingsPage /></LazyPage>} />
                
                {/* ── HIDDEN / DEPRECATED AI MODULES ── */}
                <Route path="/field-simulation" element={<Navigate to="/manager-dashboard" replace />} />
                <Route path="/ai-usage" element={<Navigate to="/manager-dashboard" replace />} />
                <Route path="/astari/*" element={<Navigate to="/manager-dashboard" replace />} />
                <Route path="/qa" element={<Navigate to="/manager-dashboard" replace />} />

                {/* ── OLD ROUTE REDIRECTS — No competing workflows ── */}
                <Route path="/forms" element={<Navigate to="/appointments" replace />} />
                <Route path="/forms/order/:appointmentId" element={<Navigate to="/appointments" replace />} />
                <Route path="/proposals" element={<Navigate to="/appointments" replace />} />
                <Route path="/specialty" element={<Navigate to="/appointments" replace />} />
                <Route path="/quote-builder" element={<Navigate to="/appointments" replace />} />
                <Route path="/contract-builder" element={<Navigate to="/appointments" replace />} />
                <Route path="/contract" element={<Navigate to="/appointments" replace />} />
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
            </Suspense>
          } />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
}
