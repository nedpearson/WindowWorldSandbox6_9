import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { determineActiveStep } from '../utils/workflowState';
import { toast } from '../components/Toast';

export function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '');
  const [customerIdFilter, setCustomerIdFilter] = useState(searchParams.get('customerId') || '');
  const [followUpFilter, setFollowUpFilter] = useState(searchParams.get('followUp') || '');
  const [search, setSearch] = useState('');
  // Debounced search — only fires API after 350ms of no typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  }, []);
  const [showNew, setShowNew] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '', customerId: '' });
  const [newAppt, setNewAppt] = useState({ jobAddress: '', projectType: 'replacement', appointmentDate: '', poNumber: '' });
  const [creating, setCreating] = useState(false);
  // Duplicate customer conflict -- set when server returns 409
  const [dupConflict, setDupConflict] = useState<{
    existingId: string;
    existingName: string;
    existingPhone: string;
    existingEmail: string;
    existingAddress: string;
    existingCity: string;
    matchedFields: string[];
  } | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    // Sync state with URL params on navigation
    setFilter(searchParams.get('status') || 'all');
    setDateFilter(searchParams.get('date') || '');
    setCustomerIdFilter(searchParams.get('customerId') || '');
    setFollowUpFilter(searchParams.get('followUp') || '');
  }, [location.search]);

  const load = () => {
    const params: Record<string, string> = {};
    if (filter !== 'all') params.status = filter;
    if (dateFilter === 'today') params.date = new Date().toISOString().split('T')[0];
    if (debouncedSearch) params.search = debouncedSearch;
    if (customerIdFilter) params.customerId = customerIdFilter;
    if (followUpFilter) params.followUp = followUpFilter;
    api.getAppointments(params).then(setAppointments).catch((err: any) => {
      toast.error(err?.message || 'Failed to load appointments — check your connection and try again.');
    });
  };

  useEffect(() => { load(); }, [filter, dateFilter, debouncedSearch, customerIdFilter, followUpFilter]);

  const openNewForm = () => {
    setEditingApptId(null);
    setNewCust({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '', customerId: '' });
    setNewAppt({ jobAddress: '', projectType: 'replacement', appointmentDate: '', poNumber: '' });
    setDupConflict(null);
    setShowNew(true);
  };

  const openEditForm = (a: any) => {
    setEditingApptId(a.id);
    setNewCust({
      firstName: a.customer?.firstName || '',
      lastName: a.customer?.lastName || '',
      phone: a.customer?.phone || '',
      email: a.customer?.email || '',
      address: a.customer?.address || '',
      city: a.customer?.city || '',
      state: a.customer?.state || 'LA',
      zip: a.customer?.zip || '',
      customerId: a.customer?.customerId || '',
    });
    setNewAppt({
      jobAddress: a.jobAddress || '',
      projectType: a.projectType || 'replacement',
      appointmentDate: a.appointmentDate && !isNaN(new Date(a.appointmentDate).getTime()) 
        ? new Date(a.appointmentDate).toISOString().slice(0, 16) 
        : '',
      poNumber: a.poNumber || '',
    });
    setDupConflict(null);
    setShowNew(true);
  };

  const saveAppointment = async (force = false) => {
    setCreating(true);
    setDupConflict(null);
    try {
      if (editingApptId) {
        const existingAppt = appointments.find(a => a.id === editingApptId);
        if (!existingAppt) throw new Error('Appointment not found');
        const customerId = existingAppt.customer?.id || existingAppt.customerId;
        
        if (customerId) {
          await api.updateCustomer(customerId, newCust);
        }
        
        const updatedAppt = await api.updateAppointment(editingApptId, {
          jobAddress: newAppt.jobAddress,
          jobCity: newCust.city,
          jobState: newCust.state,
          jobZip: newCust.zip,
          poNumber: newAppt.poNumber,
          appointmentDate: newAppt.appointmentDate ? new Date(newAppt.appointmentDate).toISOString() : new Date().toISOString(),
          projectType: newAppt.projectType,
        });
        
        const fullUpdatedAppt = {
          ...existingAppt,
          ...updatedAppt,
          customer: {
            ...existingAppt.customer,
            ...newCust
          }
        };
        
        setAppointments(prev => prev.map(a => a.id === editingApptId ? fullUpdatedAppt : a));
        toast.success('Appointment updated');
        setShowNew(false);
        setEditingApptId(null);
        return;
      }

      const cust = force
        ? await api.createCustomerForce(newCust)
        : await api.createCustomer(newCust);
      const appt = await api.createAppointment({
        customerId: cust.id, userId: user!.id,
        jobAddress: newAppt.jobAddress || newCust.address,
        jobCity: newCust.city,
        jobState: newCust.state,
        jobZip: newCust.zip,
        poNumber: newAppt.poNumber,
        appointmentDate: newAppt.appointmentDate ? new Date(newAppt.appointmentDate).toISOString() : new Date().toISOString(),
        projectType: newAppt.projectType,
      });
      navigate(`/appointments/${appt.id}`);
    } catch (err: any) {
      if (err?.status === 409 && err?.body?.existingId) {
        // Duplicate detected -- show inline conflict banner, do NOT close the form
        setDupConflict({
          existingId: err.body.existingId,
          existingName: err.body.existingName ?? 'Unknown',
          existingPhone: err.body.existingPhone ?? '',
          existingEmail: err.body.existingEmail ?? '',
          existingAddress: err.body.existingAddress ?? '',
          existingCity: err.body.existingCity ?? '',
          matchedFields: err.body.matchedFields ?? [],
        });
      } else {
        toast.error(err?.message || 'Failed to save appointment');
      }
    } finally {
      setCreating(false);
    }
  };

  const createForExistingCustomer = async (customerId: string) => {
    setCreating(true);
    try {
      const appt = await api.createAppointment({
        customerId, userId: user!.id,
        jobAddress: newAppt.jobAddress || newCust.address,
        appointmentDate: newAppt.appointmentDate ? new Date(newAppt.appointmentDate).toISOString() : new Date().toISOString(),
        projectType: newAppt.projectType,
      });
      navigate(`/appointments/${appt.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create appointment for existing customer');
    } finally {
      setCreating(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      toast.success('Appointment deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete appointment');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: 'badge-draft', in_progress: 'badge-progress', quoted: 'badge-quoted', sold: 'badge-sold', cancelled: 'badge-danger', needs_remeasure: 'badge-warning' };
    return map[s] || 'badge-draft';
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="fade-in">
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h1>📅 Appointments</h1>
        <button className="btn btn-primary" onClick={openNewForm}>+ New Appointment</button>
      </div>

      {/* Follow-up filter banner */}
      {followUpFilter === 'due' && (
        <div style={{
          marginBottom: '1rem', padding: '0.625rem 1rem',
          background: 'var(--sev-warning-bg)', border: '1px solid var(--sev-warning-bdr)',
          borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--sev-warning)', fontWeight: 600 }}>
            📞 Follow-ups due — {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} need contact
          </span>
          <button onClick={() => { setFollowUpFilter(''); navigate('/appointments'); }}
            style={{ background: 'none', border: 'none', color: 'var(--sev-warning)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            Clear ✕
          </button>
        </div>
      )}

      {/* Customer filter banner */}
      {customerIdFilter && appointments[0]?.customer && (
        <div style={{
          marginBottom: '1rem', padding: '0.625rem 1rem',
          background: 'var(--sev-info-bg)', border: '1px solid var(--sev-info-bdr)',
          borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--sev-info)', fontWeight: 600 }}>
            👤 Showing appointments for {appointments[0].customer.firstName} {appointments[0].customer.lastName}
          </span>
          <button onClick={() => { setCustomerIdFilter(''); navigate('/appointments'); }}
            style={{ background: 'none', border: 'none', color: 'var(--sev-info)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            Clear ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Today quick-filter */}
        <button className={`btn btn-sm ${dateFilter === 'today' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setDateFilter(dateFilter === 'today' ? '' : 'today');
            setFilter('all');
            navigate(dateFilter === 'today' ? '/appointments' : '/appointments?date=today');
          }}>
          📅 Today
        </button>
        {['all', 'draft', 'in_progress', 'quoted', 'sold', 'needs_remeasure'].map(s => (
          <button key={s} className={`btn btn-sm ${(filter === s && !dateFilter) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setFilter(s);
              setDateFilter('');
              navigate(s === 'all' ? '/appointments' : `/appointments?status=${s}`);
            }}>
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s === 'needs_remeasure' ? 'Needs Remeasure' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <input className="form-input" placeholder="Search by name or address..." value={search}
        onChange={e => handleSearchChange(e.target.value)} style={{ marginBottom: '1rem', maxWidth: 400 }} />

      <div className="card-grid">
        {appointments.map((a: any) => {
          const apptDate = a.appointmentDate ? new Date(a.appointmentDate) : null;
          const isToday = apptDate && apptDate.toDateString() === new Date().toDateString();
          const isPast = apptDate && apptDate < new Date() && !isToday;
          const isConfirming = confirmDeleteId === a.id;
          const isDeleting = deletingId === a.id;
          return (
            <div key={a.id} className="card" style={{
              cursor: 'pointer',
              borderColor: isConfirming ? 'rgba(239,68,68,0.6)' : isToday ? 'rgba(59,130,246,0.5)' : undefined,
              background: isConfirming
                ? 'linear-gradient(135deg, rgba(239,68,68,0.08), var(--bg-card))'
                : isToday ? 'linear-gradient(135deg, rgba(59,130,246,0.07), var(--bg-card))' : undefined,
              position: 'relative',
              transition: 'border-color 0.2s, background 0.2s',
            }}
              onClick={() => {
                if (isConfirming) { setConfirmDeleteId(null); return; }
                const activeStep = determineActiveStep(a);
                // Pass the appointment data in navigation state so the detail page
                // can render the header instantly without waiting for the API.
                navigate(`/appointments/${a.id}#${activeStep}`, { state: { appointment: a } });
              }}>

              {/* ── Delete controls ── */}
              <div
                style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '0.4rem', alignItems: 'center', zIndex: 2 }}
                onClick={e => e.stopPropagation()}
              >
                {isConfirming ? (
                  <>
                    <button
                      onClick={() => deleteAppointment(a.id)}
                      disabled={isDeleting}
                      style={{
                        padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700,
                        background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                      }}
                    >
                      {isDeleting ? '…' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{
                        padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
                        background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openEditForm(a)}
                      title="Edit appointment"
                      style={{
                        width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                        border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(a.id)}
                      title="Delete appointment"
                      style={{
                        width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', paddingRight: isConfirming ? 0 : '2rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{a.customer.firstName} {a.customer.lastName}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>Cust ID: {a.customer?.customerId || a.customer?.id?.slice(-6) || 'N/A'}</span>
                    <span>Job #: {a.poNumber || a.id?.slice(-6) || 'N/A'}</span>
                    {a.customer?.email && <span>✉️ {a.customer.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  {isToday && <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '1px 6px', borderRadius: 9999 }}>TODAY</span>}
                  <span className={`badge ${statusBadge(a.status)}`}>{a.status.replace('_', ' ')}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                📍 {a.jobAddress || a.customer?.address || 'No address'}
                {(a.jobCity || a.customer?.city) ? `, ${a.jobCity || a.customer?.city}` : ''}
                {(a.jobState || a.customer?.state) ? `, ${a.jobState || a.customer?.state}` : ''}
              </p>
              <p style={{ fontSize: '0.8125rem', color: isPast ? 'var(--danger)' : 'var(--text-muted)' }}>
                {a._count?.openings || 0} openings
                {apptDate && ` · ${apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
              </p>
              {a.totalAmount > 0 && (
                <p style={{ fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>{fmt(a.totalAmount)}</p>
              )}
            </div>
          );
        })}
        {appointments.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📋</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>No appointments match your filters</p>
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingApptId ? 'Edit Appointment' : 'New Appointment'}</h2>

            {/* ── Duplicate conflict banner ── */}
            {dupConflict && (
              <div style={{
                marginBottom: '1.25rem',
                padding: '1rem 1.125rem',
                borderRadius: 10,
                border: '1.5px solid var(--sev-critical-bdr)',
                background: 'var(--sev-critical-bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🚩</span>
                  <span style={{ fontWeight: 700, color: 'var(--sev-critical)', fontSize: '0.9rem' }}>Duplicate Customer Detected</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
                  A customer with this {dupConflict.matchedFields.length > 0 ? dupConflict.matchedFields.join(' and ') : 'info'} already exists:
                </p>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.6 }}>
                  <div><strong>{dupConflict.existingName || 'Unknown'}</strong></div>
                  {dupConflict.existingPhone && <div style={{ color: dupConflict.matchedFields.includes('phone') ? 'var(--danger)' : 'var(--muted)' }}>☎ {dupConflict.existingPhone}{dupConflict.matchedFields.includes('phone') ? ' ← match' : ''}</div>}
                  {dupConflict.existingEmail && <div style={{ color: dupConflict.matchedFields.includes('email') ? 'var(--danger)' : 'var(--muted)' }}>✉ {dupConflict.existingEmail}{dupConflict.matchedFields.includes('email') ? ' ← match' : ''}</div>}
                  {dupConflict.existingAddress && <div style={{ color: dupConflict.matchedFields.includes('address') ? 'var(--danger)' : 'var(--muted)' }}>📍 {dupConflict.existingAddress}{dupConflict.existingCity ? `, ${dupConflict.existingCity}` : ''}{dupConflict.matchedFields.includes('address') ? ' ← match' : ''}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {dupConflict.existingId && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
                      disabled={creating}
                      onClick={() => createForExistingCustomer(dupConflict.existingId)}
                    >
                      {creating ? '...' : 'Book Appt for Existing Customer'}
                    </button>
                  )}
                  {dupConflict.existingId && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
                      onClick={() => navigate(`/customers/${dupConflict.existingId}`)}
                    >
                      View Customer Record
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
                    disabled={creating}
                    onClick={() => saveAppointment(true)}
                  >
                    {creating ? '...' : 'Create as New Anyway'}
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.25rem' }}
                    onClick={() => setDupConflict(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Customer Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={newCust.firstName} onChange={e => setNewCust({ ...newCust, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={newCust.lastName} onChange={e => setNewCust({ ...newCust, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">WW Customer ID</label>
              <input className="form-input" placeholder="e.g. lpb1ds" value={newCust.customerId} onChange={e => setNewCust({ ...newCust, customerId: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={newCust.city} onChange={e => setNewCust({ ...newCust, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={newCust.state} onChange={e => setNewCust({ ...newCust, state: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">ZIP</label>
                <input className="form-input" value={newCust.zip} onChange={e => setNewCust({ ...newCust, zip: e.target.value })} />
              </div>
            </div>

            <h3 style={{ margin: '1.25rem 0 0.75rem', color: 'var(--accent)' }}>Appointment</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date/Time</label>
                <input className="form-input" type="datetime-local" value={newAppt.appointmentDate} onChange={e => setNewAppt({ ...newAppt, appointmentDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Project Type</label>
                <select className="form-select" value={newAppt.projectType} onChange={e => setNewAppt({ ...newAppt, projectType: e.target.value })}>
                  <option value="replacement">Replacement</option>
                  <option value="new_construction">New Construction</option>
                  <option value="remodel">Remodel</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Job # / PO Number</label>
                <input className="form-input" placeholder="e.g. pqwe7i" value={newAppt.poNumber} onChange={e => setNewAppt({ ...newAppt, poNumber: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => saveAppointment(false)}
                disabled={!newCust.firstName || !newCust.lastName || creating}
              >
                {creating ? 'Saving...' : editingApptId ? 'Save Changes' : 'Create Appointment'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowNew(false); setDupConflict(null); setEditingApptId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
