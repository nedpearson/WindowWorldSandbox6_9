import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { runFullValidation } from '../utils/centralValidationOrchestrator';
import { runAppointmentCoach } from '../utils/appointmentCoach';

type ReviewStatus = 'all' | 'needs_review' | 'missing_info' | 'ready_ordering' | 'needs_remeasure' | 'ready_production';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  needs_review:     { label: 'Needs Review',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🔍' },
  missing_info:     { label: 'Missing Information',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: '❌' },
  ready_ordering:   { label: 'Ready for Ordering',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '📋' },
  needs_remeasure:  { label: 'Needs Remeasure',      color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '📏' },
  ready_production: { label: 'Ready for Production', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: '✅' },
};

function getOfficeStatus(appt: any): string {
  const v = runFullValidation(appt.openings || [], [], [], appt);
  const coach = runAppointmentCoach(appt);
  if (v.counts.critical > 0 || coach.overallRisk === 'HIGH_RISK') return 'missing_info';
  if (coach.openingScores.some(o => o.measurementConfidence < 50)) return 'needs_remeasure';
  if (v.counts.high > 0 || coach.overallRisk === 'REVIEW') return 'needs_review';
  if (v.submissionBlocked === false && v.counts.critical === 0) return 'ready_production';
  return 'ready_ordering';
}

export function OfficeQueuePage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<ReviewStatus>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAppointments();
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('OfficeQueue load error:', err);
        setLoadError(err?.message || 'Failed to load appointments. Is the server running?');
      }
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(() => {
    return appointments.map(a => {
      const status = getOfficeStatus(a);
      const v = runFullValidation(a.openings || [], [], [], a);
      const coach = runAppointmentCoach(a);
      return { ...a, officeStatus: status, validation: v, coach };
    });
  }, [appointments]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== 'all') list = list.filter(a => a.officeStatus === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.customer?.firstName?.toLowerCase().includes(q) ||
        a.customer?.lastName?.toLowerCase().includes(q) ||
        a.customer?.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of enriched) counts[a.officeStatus] = (counts[a.officeStatus] || 0) + 1;
    return counts;
  }, [enriched]);

  if (loading) return <div className="loading" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading office queue...</div>;

  if (loadError) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Could Not Load Queue</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{loadError}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1>🏢 Office Processing Queue</h1>
      </div>

      {/* Status summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key as ReviewStatus)}
            className="stat-card" style={{ cursor: 'pointer', borderColor: filter === key ? cfg.color : 'var(--border)', transition: 'all 0.2s' }}>
            <div className="stat-value" style={{ color: cfg.color, fontSize: '1.75rem' }}>{statusCounts[key] || 0}</div>
            <div className="stat-label">{cfg.icon} {cfg.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by customer name or address..." style={{ marginBottom: '1rem', maxWidth: 400 }} />

      {/* Queue table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th><th>Customer</th><th>Address</th><th>Openings</th>
              <th>Completion</th><th>Installer Clarity</th><th>Measurement</th><th>Issues</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const cfg = STATUS_CFG[a.officeStatus] || STATUS_CFG.needs_review;
              return (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/appointments/${a.id}`)}>
                  <td>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td><strong>{a.customer?.firstName} {a.customer?.lastName}</strong></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{a.customer?.address || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{a.openings?.length || 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${a.validation.overallPct}%`, height: '100%', background: a.validation.overallPct >= 90 ? '#22c55e' : a.validation.overallPct >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 32 }}>{a.validation.overallPct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: a.coach.installerClarityScore >= 70 ? '#22c55e' : a.coach.installerClarityScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {a.coach.installerClarityScore}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: a.coach.measurementConfidenceScore >= 70 ? '#22c55e' : a.coach.measurementConfidenceScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {a.coach.measurementConfidenceScore}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.validation.blockers > 0 && <span style={{ padding: '0.125rem 0.375rem', borderRadius: 4, fontSize: '0.625rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', marginRight: 4 }}>{a.validation.blockers} 🛑</span>}
                    {a.validation.high > 0 && <span style={{ padding: '0.125rem 0.375rem', borderRadius: 4, fontSize: '0.625rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{a.validation.high} ⚠</span>}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); navigate(`/appointments/${a.id}`); }}>Review →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No appointments match the selected filter</p>
        </div>
      )}
    </div>
  );
}
