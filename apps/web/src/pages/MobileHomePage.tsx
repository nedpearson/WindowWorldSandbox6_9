import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { determineActiveStep } from '../utils/workflowState';
import { useMobileStore } from '../store/mobileStore';
import { toast } from '../components/Toast';
import { getOfflineDb, cacheCustomer } from '../lib/offlineDb';
import { getAllCachedAppointments, cacheAppointment, enqueueOutboxItem } from '../lib/syncEngine';
import { OfflineReadyBadge } from '../components/OfflineReadyBadge';
import { SyncAssistant } from '../components/SyncAssistant';
import { UpdateBanner } from '../components/UpdateBanner';


// Detect mobile/touch devices by viewport width, user agent, or touch capability
function isMobile(): boolean {
  return window.innerWidth <= 1024 || 
         /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
}

interface NewApptForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  customerId: string;
  poNumber: string;
  appointmentDate: string;
  projectType: string;
}

// ── ApptCard must be defined OUTSIDE MobileHomePage ───────────────────────────
// Defining it inside would cause React to see a new component function on every
// swipeMap state change → unmount+remount every card → break all touch/click events.
interface ApptCardProps {
  a: any;
  highlight?: boolean;
  needsSync: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const statusColor: Record<string, string> = {
  draft: '#5f5e5a', in_progress: '#0c447c', quoted: '#9a6700',
  sold: '#0f6e56', needs_remeasure: '#9a6700', cancelled: '#a32d2d',
};
const completionColor = (pct: number) =>
  pct >= 80 ? '#0f6e56' : pct >= 50 ? '#9a6700' : '#a32d2d';

function ApptCard({ a, highlight, needsSync, onArchive, onDelete, onEdit }: ApptCardProps) {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const navigatingRef = useRef(false);

  const call = (phone: string) => { window.location.href = `tel:${phone.replace(/\D/g, '')}`; };
  const navigateTo = (address: string) => {
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const startJob = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Prevent double-tap navigation on laggy mobile devices
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    // Reset after 1.5s in case navigation was somehow aborted
    setTimeout(() => { navigatingRef.current = false; }, 1500);
    try {
      if (!a?.id) {
        toast.error('Invalid appointment ID');
        navigatingRef.current = false;
        return;
      }
      const activeStep = determineActiveStep(a);
      if (activeStep && typeof activeStep === 'string') {
        navigate(`/mobile/field/${a.id}#${activeStep}`, { state: { appointment: a } });
      } else {
        navigate(`/mobile/field/${a.id}`, { state: { appointment: a } });
      }
    } catch (err) {
      console.error('Failed to determine active step:', err);
      navigatingRef.current = false;
      if (!a?.id) {
        toast.error('Cannot start job: appointment ID missing');
        return;
      }
      navigate(`/mobile/field/${a.id}`, { state: { appointment: a } });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Ignore clicks if they happened on a button
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (showActions) {
      setShowActions(false);
    } else {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      setTimeout(() => { navigatingRef.current = false; }, 1500);
      navigate(`/mobile/field/${a.id}`, { state: { appointment: a } });
    }
  };

  return (
    <div style={{ position: 'relative', marginBottom: '0.75rem', borderRadius: 16, overflow: 'hidden' }}>
      <div
        onClick={handleCardClick}
        style={{
          background: '#fff',
          border: `1px solid ${highlight ? 'var(--royal)' : 'var(--border)'}`,
          borderRadius: 16, padding: '1rem',
          cursor: 'pointer',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1, paddingRight: '0.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {a.customer?.firstName && a.customer?.lastName
                ? `${a.customer.firstName} ${a.customer.lastName}`
                : a.customer?.name
                ? a.customer.name
                : a.customer?.phone
                ? a.customer.phone
                : a.jobAddress
                ? a.jobAddress
                : `Appointment ${a.id?.slice(-4) || 'Unknown'}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              {a.appointmentDate && !isNaN(new Date(a.appointmentDate).getTime())
                ? new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'No time set'}
              {` · Cust ID: ${a.customer?.customerId || a.customer?.id?.slice(-6) || 'N/A'} · Job #: ${a.poNumber || a.id?.slice(-6) || 'N/A'}`}
              {a.customer?.email && ` · ✉️ ${a.customer.email}`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                borderRadius: 9999, background: `${statusColor[a.status || 'draft'] || '#64748b'}22`,
                color: statusColor[a.status || 'draft'] || '#64748b', textTransform: 'capitalize',
              }}>
                {(a.status || 'draft').replace('_', ' ')}
              </span>
              <div style={{
                fontSize: '0.625rem', fontWeight: 800, padding: '0.125rem 0.375rem',
                borderRadius: 9999, background: `${completionColor(a.completionPct || 0)}22`,
                color: completionColor(a.completionPct || 0),
              }}>
                {Math.round(a.completionPct || 0)}%
              </div>
            </div>
            {/* Context Menu Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
              style={{
                background: showActions ? 'rgba(0,0,0,0.05)' : 'transparent',
                border: 'none', borderRadius: '50%', width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⋮</span>
            </button>
          </div>
        </div>

        {/* Address */}
        {(a.jobAddress || a.jobCity || a.customer?.address || a.customer?.city || a.jobState || a.customer?.state) ? (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <span>📍</span> {a.jobAddress || a.customer?.address || 'Address not set'}{(a.jobCity || a.customer?.city) ? `, ${a.jobCity || a.customer?.city}` : ''}{(a.jobState || a.customer?.state) ? `, ${a.jobState || a.customer?.state}` : ''}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.25rem' }}>
            <span>📍</span> Address not set
          </div>
        )}

        {/* Action Row - Toggled via Menu */}
        {showActions && (
          <div style={{
            marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)',
            display: 'flex', gap: '0.5rem', justifyContent: 'flex-end',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setShowActions(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: 'var(--blue)', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer', minWidth: 44, minHeight: 44,
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); setShowActions(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer', minWidth: 44, minHeight: 44,
              }}
            >
              📦 Archive
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setShowActions(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#ef4444', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer', minWidth: 44, minHeight: 44,
              }}
            >
              🗑 Delete
            </button>
          </div>
        )}

        {/* Normal Action Bar */}
        {!showActions && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={startJob}
              style={{
                flex: 1, padding: '0.75rem', background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.875rem',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.375rem',
                minHeight: 44,
              }}
            >
              {a.status === 'draft' ? 'Start Job 🚀' : 'Continue ➡'}
            </button>
            {needsSync && (
              <div style={{
                width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8, color: '#ef4444',
              }}>
                <span style={{ fontSize: '1.25rem' }}>!</span>
              </div>
            )}
            {a.customer?.phone && (
              <button
                onClick={(e) => { e.stopPropagation(); call(a.customer.phone); }}
                style={{
                  width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', border: '1px solid #cfe0ff', borderRadius: 8,
                  color: 'var(--blue)', minHeight: 44, cursor: 'pointer',
                }}
              >
                📞
              </button>
            )}
            {(a.jobAddress || a.customer?.address) && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateTo(a.jobAddress || a.customer.address); }}
                style={{
                  width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', border: '1px solid #cfe0ff', borderRadius: 8,
                  color: 'var(--blue)', minHeight: 44, cursor: 'pointer',
                }}
              >
                🗺️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────

export function MobileHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isOnline = useMobileStore(s => s.isOnline);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewApptForm>({
    firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '',
    customerId: '', poNumber: '',
    appointmentDate: new Date().toISOString().slice(0, 16),
    projectType: 'replacement',
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const activeRequestRef = useRef<number>(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!user) return; // Wait for user to be loaded
    
    const currentRequestId = ++activeRequestRef.current;
    const currentCacheKey = `appointmentsList:${user.companyId}:${user.id}`;
    
    // Step 1: Load from Dexie cache IMMEDIATELY — zero network wait
    // This ensures the field app never shows a blank screen, even offline
    try {
      const cached = await getAllCachedAppointments(user.id, user.companyId || undefined);
      if (cached.length > 0) {
        if (activeRequestRef.current === currentRequestId) {
          setAppointments(cached);
          setLoading(false); // show cached data right away
        }
      } else {
        if (activeRequestRef.current === currentRequestId) {
          setAppointments([]); // ensure no stale cache from another user is shown
          setLoading(true); // if no valid cache, show loading
        }
      }
    } catch { /* ignore cache errors — network fetch will follow */ }

    // Step 2: Fetch fresh data from server in background
    if (!navigator.onLine) return; // don't attempt network when offline
    try {
      const finalAppointments = await api.getMobileFieldDashboard();
      if (signal?.aborted) return;
      if (activeRequestRef.current !== currentRequestId) return; // Race condition guard
      
      const activeUser = useAuthStore.getState().user;
      const activeCacheKey = activeUser ? `appointmentsList:${activeUser.companyId}:${activeUser.id}` : null;
      if (activeCacheKey !== currentCacheKey) return; // Stale fetch response

      setAppointments(finalAppointments);
      setError('');

      // Cache successful results into Dexie appointments_cache
      for (const appt of finalAppointments) {
        if (appt?.id) {
          await cacheAppointment(appt);
          if (appt.customer) await cacheCustomer(appt.customer);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (activeRequestRef.current !== currentRequestId) return;
      
      // Network failed — already showing cached data, just clear loading
      // Only show error if we have no cached data at all
      setAppointments(prev => {
        if (prev.length === 0) {
          setError('⚠️ Offline — no cached appointments found');
        }
        return prev;
      });
    } finally {
      if (!signal?.aborted && activeRequestRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Today's appointments
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => {
    if (!a.appointmentDate) return false;
    const d = new Date(a.appointmentDate);
    if (isNaN(d.getTime())) return false;
    return d.toDateString() === today;
  }).sort((a, b) => new Date(a.appointmentDate || 0).getTime() - new Date(b.appointmentDate || 0).getTime());

  // In-progress / incomplete
  const inProgress = appointments.filter(a =>
    ['draft', 'in_progress', 'needs_remeasure'].includes(a.status || 'draft') &&
    (!a.appointmentDate || new Date(a.appointmentDate).toDateString() !== today)
  ).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  // Needing sync — check Dexie sync_outbox for pending/failed items per appointment
  const [needsSyncIds, setNeedsSyncIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    getOfflineDb().sync_outbox
      .where('status').anyOf(['pending', 'failed', 'conflict'])
      .toArray()
      .then(items => {
        if (cancelled) return;
        const ids = new Set(items.map(i => i.appointmentId).filter((id): id is string => Boolean(id)));
        setNeedsSyncIds(ids);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [appointments]);

  const openNewForm = () => {
    setEditingApptId(null);
    setForm({
      firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '',
      customerId: '', poNumber: '',
      appointmentDate: new Date().toISOString().slice(0, 16),
      projectType: 'replacement',
    });
    setShowNew(true);
  };

  const openEditForm = (a: any) => {
    setEditingApptId(a.id);
    setForm({
      firstName: a.customer?.firstName || '',
      lastName: a.customer?.lastName || '',
      phone: a.customer?.phone || '',
      email: a.customer?.email || '',
      address: a.jobAddress || a.customer?.address || '',
      city: a.jobCity || a.customer?.city || '',
      state: a.jobState || a.customer?.state || 'LA',
      zip: a.jobZip || a.customer?.zip || '',
      customerId: a.customer?.customerId || '',
      poNumber: a.poNumber || '',
      appointmentDate: a.appointmentDate && !isNaN(new Date(a.appointmentDate).getTime()) 
        ? new Date(a.appointmentDate).toISOString().slice(0, 16) 
        : new Date().toISOString().slice(0, 16),
      projectType: a.projectType || 'replacement',
    });
    setShowNew(true);
  };

  const saveAppointment = async () => {
    if (!form.firstName || !form.lastName) return;
    setCreating(true);
    try {
      const companyId = user?.companyId ?? '';
      const userId = user?.id ?? '';

      if (editingApptId) {
        const existingAppt = appointments.find(a => a.id === editingApptId);
        if (!existingAppt) throw new Error('Appointment not found');
        const customerId = existingAppt.customer?.id || existingAppt.customerId;

        if (!navigator.onLine) {
           if (customerId && !customerId.startsWith('local_')) {
              await enqueueOutboxItem({
                companyId, userId, entityType: 'customer', entityLocalId: customerId, operation: 'update',
                payload: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email, address: form.address, city: form.city, state: form.state, zip: form.zip, customerId: form.customerId }
              });
           }
           await enqueueOutboxItem({
             companyId, userId, entityType: 'appointment', entityLocalId: editingApptId, appointmentId: editingApptId, operation: 'update',
             payload: { jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip, poNumber: form.poNumber, appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(), projectType: form.projectType }
           });

           const updatedAppt = {
             ...existingAppt,
             jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip,
             poNumber: form.poNumber,
             appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(),
             projectType: form.projectType,
             customer: { ...existingAppt.customer, firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email, address: form.address, city: form.city, state: form.state, zip: form.zip, customerId: form.customerId },
             updatedAt: new Date().toISOString(),
           };
           await cacheAppointment(updatedAppt);
           setAppointments(prev => prev.map(a => a.id === editingApptId ? updatedAppt : a));
           toast.info('☁️ Saved offline — will sync when connected');
        } else {
          if (customerId) {
            await api.updateCustomer(customerId, { firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email, address: form.address, city: form.city, state: form.state, zip: form.zip, customerId: form.customerId });
          }
          const updatedAppt = await api.updateAppointment(editingApptId, {
            jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip,
            poNumber: form.poNumber,
            appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(),
            projectType: form.projectType,
          });
          const fullUpdatedAppt = { ...existingAppt, ...updatedAppt, customer: { ...existingAppt.customer, firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email, address: form.address, city: form.city, state: form.state, zip: form.zip, customerId: form.customerId } };
          await cacheAppointment(fullUpdatedAppt);
          setAppointments(prev => prev.map(a => a.id === editingApptId ? fullUpdatedAppt : a));
          toast.success('Appointment updated');
        }
        setShowNew(false);
        setEditingApptId(null);
        return;
      }

      if (!navigator.onLine) {
        // Fully offline create — enqueue with dependency graph
        const localCustId = `local_customer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const localApptId = `local_appointment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const now = Date.now();

        // Enqueue customer create (no dependency)
        await enqueueOutboxItem({
          companyId, userId,
          entityType: 'customer',
          entityLocalId: localCustId,
          operation: 'create',
          payload: {
            firstName: form.firstName, lastName: form.lastName,
            phone: form.phone, email: form.email, address: form.address,
            city: form.city, zip: form.zip, state: form.state,
            customerId: form.customerId,
            localId: localCustId,
          },
        });

        // Enqueue appointment create (depends on customer sync first)
        await enqueueOutboxItem({
          companyId, userId,
          entityType: 'appointment',
          entityLocalId: localApptId,
          appointmentId: localApptId,
          operation: 'create',
          dependsOn: localCustId, // wait for customer to sync
          payload: {
            customerId: localCustId, // will be remapped to cloud ID after customer syncs
            userId,
            jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip,
            poNumber: form.poNumber,
            appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(),
            projectType: form.projectType,
            status: 'draft',
            localId: localApptId,
          },
        });

        // Add to local appointments_cache so it shows up immediately
        const localApptObj = {
          id: localApptId,
          companyId, userId,
          status: 'draft',
          jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip,
          poNumber: form.poNumber,
          appointmentDate: form.appointmentDate,
          customer: {
            id: localCustId,
            firstName: form.firstName, lastName: form.lastName,
            phone: form.phone, email: form.email, address: form.address,
            city: form.city, state: form.state, zip: form.zip,
            customerId: form.customerId,
          },
          openings: [],
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        };
        await cacheAppointment(localApptObj);

        setShowNew(false);
        setAppointments(prev => [localApptObj, ...prev]);
        toast.info('☁️ Saved offline — will sync when connected');
        navigate(`/mobile/field/${localApptId}`, { state: { appointment: localApptObj } });
        return;
      }

      // Online path — create customer + appointment directly
      const cust = await api.createCustomer({
        firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email,
        address: form.address, city: form.city, zip: form.zip, state: form.state,
        customerId: form.customerId,
      });
      const appt = await api.createAppointment({
        customerId: cust.id, userId: user!.id,
        jobAddress: form.address, jobCity: form.city, jobState: form.state, jobZip: form.zip,
        poNumber: form.poNumber,
        appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(),
        projectType: form.projectType,
      });
      setShowNew(false);
      navigate(`/mobile/field/${appt.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };



  const archiveAppointment = useCallback(async (id: string) => {
    if (!navigator.onLine) { toast.error('No internet — archive when back online.'); return; }
    try {
      await api.archiveAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      getOfflineDb().appointments_cache.delete(id).catch(() => {});
      toast.success('Appointment archived.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive');
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    if (!navigator.onLine) { toast.error('No internet — delete when back online.'); return; }
    // Permanent action — require explicit confirmation
    if (!window.confirm('Permanently delete this appointment? This cannot be undone.')) return;
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      getOfflineDb().appointments_cache.delete(id).catch(() => {});
      toast.success('Appointment deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: 'var(--bg)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    }}>
      <UpdateBanner />
      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '0.875rem 1rem',
        paddingTop: 'max(0.875rem, env(safe-area-inset-top))',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🪟 Field App
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <OfflineReadyBadge />
            {/* SyncAssistant — compact sync status explanation */}
            <SyncAssistant
              appointmentId={'home'}
              isOnline={navigator.onLine}
              compact
            />
            {/* Sync dot from live Dexie outbox status */}
            <span
              title={needsSyncIds.size > 0 ? `${needsSyncIds.size} pending sync` : 'All synced'}
              style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                background: needsSyncIds.size > 0 ? '#f59e0b' : '#22c55e',
              }}
            />
            {/* Update button — clears PWA cache inline, works from any version */}
            <button
              onClick={async () => {
                const { triggerAppUpdate, getUnsyncedOutboxCount } = await import('../services/updateService');
                const unsyncedCount = await getUnsyncedOutboxCount();
                if (unsyncedCount > 0) {
                  const confirmed = window.confirm(`You have ${unsyncedCount} unsynced field data item(s). Sync before updating. Proceed anyway?`);
                  if (!confirmed) return;
                }
                await triggerAppUpdate(true);
              }}
              title="Clear cache and reload latest version"
              style={{
                fontSize: '0.6875rem', padding: '0.25rem 0.5rem',
                background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)',
                borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              🔄 Clear Cache
            </button>
            {installPrompt && (
              <button
                onClick={() => installPrompt.prompt()}
                style={{
                  fontSize: '0.6875rem', padding: '0.25rem 0.5rem', background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer',
                }}
              >
                ⬇ Install
              </button>
            )}

            <button
              onClick={() => { navigate('/'); }}
              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Desktop
            </button>
            <button
              onClick={() => { useAuthStore.getState().logout(); }}
              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Sync warning banner */}
      {!isOnline && (
        <div style={{
          background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)',
          padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--warning)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          📵 Working Offline — Showing cached appointments. Changes save locally.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--warning)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* NEW APPOINTMENT */}
        <button
          onClick={openNewForm}
          style={{
            width: '100%', padding: '1rem', marginBottom: '1.25rem',
            background: 'var(--blue)',
            color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>+</span> New Appointment
        </button>

        {/* TODAY */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Today</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{todayAppts.length} appt{todayAppts.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem' }}>
                  <div style={{ height: 16, borderRadius: 6, background: 'var(--bg-secondary)', width: '50%', marginBottom: '0.75rem', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-secondary)', width: '70%', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 36, borderRadius: 10, background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : todayAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {!isOnline ? 'No appointments cached on this device. Connect to internet to load appointments.' : 'No appointments scheduled for today'}
            </div>
          ) : (
            todayAppts.map(a => (
              <ApptCard
                key={a.id}
                a={a}
                highlight
                needsSync={needsSyncIds.has(a.id)}
                onArchive={() => archiveAppointment(a.id)}
                onDelete={() => deleteAppointment(a.id)}
                onEdit={() => openEditForm(a)}
              />
            ))
          )}
        </div>

        {/* IN PROGRESS */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Drafts & In Progress</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inProgress.length}</span>
            </div>
            {inProgress.map(a => (
              <ApptCard
                key={a.id}
                a={a}
                needsSync={needsSyncIds.has(a.id)}
                onArchive={() => archiveAppointment(a.id)}
                onDelete={() => deleteAppointment(a.id)}
                onEdit={() => openEditForm(a)}
              />
            ))}
          </div>
        )}

        {/* ALL RECENT */}
        {appointments.filter(a => !todayAppts.includes(a) && !inProgress.includes(a)).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 15).length > 0 && (
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent</h2>
            </div>
            {appointments.filter(a => !todayAppts.includes(a) && !inProgress.includes(a)).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 15).map(a => (
              <ApptCard
                key={a.id}
                a={a}
                needsSync={needsSyncIds.has(a.id)}
                onArchive={() => archiveAppointment(a.id)}
                onDelete={() => deleteAppointment(a.id)}
                onEdit={() => openEditForm(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* NEW APPOINTMENT SHEET */}
      {showNew && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}
        >
          <div style={{
            width: '100%', background: 'var(--bg-secondary)',
            borderRadius: '20px 20px 0 0', padding: '1.5rem',
            maxHeight: '90dvh', overflowY: 'auto',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{editingApptId ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button onClick={() => { setShowNew(false); setEditingApptId(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
              {[
                { key: 'firstName', label: 'First Name *', type: 'text' },
                { key: 'lastName', label: 'Last Name *', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{f.label}</div>
                  <input
                    type={f.type} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input type="tel" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <input type="email" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Customer ID</div>
              <input type="text" placeholder="e.g. lpb1ds" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
              <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.8fr', gap: '0.625rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>City</div>
                <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
                <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ZIP</div>
                <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} />
              </div>
            </div>

            {/* Appointment */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Appointment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date & Time</div>
                <input type="datetime-local" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Job # / PO Number</div>
                <input type="text" placeholder="e.g. pqwe7i" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                  value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Project Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['replacement', 'new_construction', 'remodel'].map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, projectType: t }))}
                    style={{
                      padding: '0.625rem', borderRadius: 8, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                      border: `1px solid ${form.projectType === t ? 'var(--blue)' : 'var(--border)'}`,
                      background: form.projectType === t ? 'var(--infobg)' : 'var(--card)',
                      color: form.projectType === t ? 'var(--blue)' : 'var(--muted)',
                    }}>
                    {t === 'replacement' ? 'Replace' : t === 'new_construction' ? 'New' : 'Remodel'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveAppointment}
              disabled={!form.firstName || !form.lastName || creating}
              style={{
                width: '100%', padding: '1rem', background: 'var(--blue)', color: 'white',
                border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                opacity: (!form.firstName || !form.lastName || creating) ? 0.5 : 1,
              }}
            >
              {creating ? 'Saving…' : editingApptId ? '✓ Save Changes' : '✓ Create Appointment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
