import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { timeAgo } from '../utils/sessionTracker';
import { useAuthStore } from '../store';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    draft: 'badge-draft', in_progress: 'badge-progress', quoted: 'badge-quoted',
    sold: 'badge-sold', cancelled: 'badge-danger', needs_remeasure: 'badge-warning'
  };
  return map[s] || 'badge-draft';
};

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const navigate = useNavigate();

  const activeRequestRef = React.useRef<number>(0);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch(console.error);
    api.get('/follow-ups').then((r: any) => setFollowUps(r)).catch(console.error);

    const loadRecent = async () => {
      if (!user) return;
      const currentRequestId = ++activeRequestRef.current;

      try {
        const { getAllCachedAppointments } = await import('../lib/syncEngine');
        const cached = await getAllCachedAppointments(user.id, user.companyId || undefined);
        if (cached.length > 0 && activeRequestRef.current === currentRequestId) {
          setRecent(cached);
        }
      } catch (e) { console.error(e); }

      try {
        const freshRecent = await api.dashboardRecent();
        if (activeRequestRef.current === currentRequestId) {
          setRecent(freshRecent);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    loadRecent();
  }, [user]);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Separate today's appointments from recent
  const todayStr = new Date().toDateString();
  const todayAppts = recent.filter((a: any) => a.appointmentDate && new Date(a.appointmentDate).toDateString() === todayStr);
  const otherRecent = recent.filter((a: any) => !a.appointmentDate || new Date(a.appointmentDate).toDateString() !== todayStr);

  // Find appointments that need form completion (not sold/cancelled)
  const activeAppts = recent.filter((a: any) => !['sold', 'cancelled'].includes(a.status));
  const incompleteAppts = activeAppts.filter((a: any) => (a.completionPct || 0) < 100);

  const startRoute = () => {
    if (todayAppts.length === 0) {
      alert("No appointments scheduled for today.");
      return;
    }
    
    // Sort chronologically if time is available
    const sortedAppts = [...todayAppts].sort((a: any, b: any) => {
      const timeA = new Date(a.appointmentDate).getTime();
      const timeB = new Date(b.appointmentDate).getTime();
      return timeA - timeB;
    });

    const dest = sortedAppts[sortedAppts.length - 1];
    const waypoints = sortedAppts.slice(0, -1);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location`;
    
    if (dest?.address) {
      url += `&destination=${encodeURIComponent(dest.address)}`;
    }
    
    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map(w => encodeURIComponent(w.address)).join('|');
      url += `&waypoints=${waypointsStr}`;
    }

    window.open(url, '_blank');
  };

  return (
    <div className="fade-in">

      {/* ═══ PRIMARY CTA ═══ */}
      <div style={{
        marginBottom: '1.5rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>🎯 Your Day at a Glance</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {incompleteAppts.length > 0
                ? `${incompleteAppts.length} appointment${incompleteAppts.length > 1 ? 's' : ''} need completion`
                : 'All appointments are up to date'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/appointments')}
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>
              📋 Continue Workflow →
            </button>
            <button className="btn btn-secondary" onClick={startRoute} disabled={todayAppts.length === 0}>
              🗺️ Start Route
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/appointments')}>
              + New Appointment
            </button>
          </div>
        </div>

        {/* Quick links to incomplete appointments */}
        {incompleteAppts.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {incompleteAppts.slice(0, 5).map((a: any) => (
              <button key={a.id} className="btn btn-sm"
                style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)' }}
                onClick={() => navigate(`/appointments/${a.id}`)}>
                {a.customer.firstName} {a.customer.lastName}
                <span style={{ marginLeft: '0.375rem', fontSize: '0.625rem', color: 'var(--amber)' }}>
                  {a._count?.openings || 0} items captured
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats ? (
        <div className="stats-grid">
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?date=today')}>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.todayAppointments}</div>
            <div className="stat-label">Today's Appts</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?status=draft')}>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.draftCount}</div>
            <div className="stat-label">Drafts</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?status=quoted')}>
            <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.quotedCount}</div>
            <div className="stat-label">Quoted</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?status=sold')}>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.soldCount}</div>
            <div className="stat-label">🎉 Deals Closed</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?status=needs_remeasure')}>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.needsRemeasure}</div>
            <div className="stat-label">Needs Remeasure</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments?status=sold')}>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(stats.totalRevenue)}</div>
            <div className="stat-label">Total Revenue (Sold)</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }}
            onClick={() => navigate('/appointments?followUp=due')}>
            <div className="stat-value" style={{ color: (stats.followUpsDue || 0) > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
              {stats.followUpsDue || 0}
            </div>
            <div className="stat-label">Follow-Ups Due</div>
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
              <div className="stat-value loading" style={{ height: 32 }}>—</div>
              <div className="stat-label loading">Loading</div>
            </div>
          ))}
        </div>
      )}

      {/* Follow-Ups Section */}
      {followUps.filter(f => f.status === 'scheduled').length > 0 && (
        <div className="card" style={{ marginTop: '1rem', border: '1px solid var(--warning)' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⏰ Upcoming Follow-Ups
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {followUps.filter(f => f.status === 'scheduled').map(f => {
              const due = new Date(f.scheduledAt).getTime() < Date.now();
              return (
                <div key={f.id} 
                  className="card"
                  onClick={() => f.appointmentId ? navigate(`/appointments/${f.appointmentId}`) : null}
                  style={{
                    padding: '0.75rem', 
                    cursor: f.appointmentId ? 'pointer' : 'default',
                    borderLeft: `4px solid ${due ? 'var(--danger)' : 'var(--warning)'}`
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: due ? 'var(--danger)' : 'var(--text-primary)' }}>{f.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(f.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {f.notes && <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{f.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 style={{ margin: 0 }}>📅 Today's Schedule</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/appointments?date=today')}>View All</button>
        </div>
        {todayAppts.length === 0 ? (
          <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No appointments scheduled for today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todayAppts.map((a: any) => (
              <div key={a.id}
                onClick={() => navigate(`/appointments/${a.id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 0.875rem', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.06))',
                  border: '1px solid rgba(59,130,246,0.25)', transition: 'all 0.15s',
                }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {a.customer.firstName} {a.customer.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {a.appointmentDate && new Date(a.appointmentDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {a.jobAddress && ` · ${a.jobAddress}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <span className={`badge ${statusBadge(a.status)}`}>{a.status.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>Open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {otherRecent.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
          <div className="card-grid">
            {otherRecent.map((a: any) => (
              <div key={a.id} className="card" style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/appointments/${a.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3>{a.customer.firstName} {a.customer.lastName}</h3>
                  <span className={`badge ${statusBadge(a.status)}`}>{a.status.replace('_', ' ')}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {a.jobAddress || 'No address'} · {a._count?.openings || 0} window{(a._count?.openings || 0) === 1 ? '' : 's'}
                </p>
                {a.totalAmount > 0 && (
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', marginTop: '0.5rem' }}>
                    {fmt(a.totalAmount)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Quick Reference Training Section ── */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>📚 Quick Reference — 6 Things Every Rep Needs to Know</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: '🪟', term: 'Opening', def: 'One window space in the wall. Each opening gets measured and priced separately.' },
            { icon: '📐', term: 'United Inches', def: 'Width + Height of a window. Used to determine the price tier from the catalog.' },
            { icon: '🧱', term: 'Brick Measurement', def: 'Measure the brick-to-brick opening, then subtract 1" on each side for the frame.' },
            { icon: '🔥', term: 'Tempered Glass', def: 'Required within 18" of a door or floor. The system flags these automatically.' },
            { icon: '💳', term: 'Financing', def: 'Always present the monthly payment first — it makes the total feel more manageable.' },
            { icon: '✍️', term: 'Signatures', def: 'You need both the proposal signature AND the credit application before leaving.' },
          ].map(({ icon, term, def }) => (
            <div key={term} style={{
              padding: '0.875rem 1rem', borderRadius: 10,
              background: 'var(--bg)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>{icon}</span><span>{term}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{def}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
