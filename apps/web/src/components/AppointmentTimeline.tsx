import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  createdAt: string;
  user?: { name: string };
}

export function AppointmentTimeline({ appointmentId }: { appointmentId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId) loadEvents();
  }, [appointmentId]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/appointments/${appointmentId}/timeline`);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Timeline is supplemental — degrade gracefully, don't block the page
      setError('Timeline unavailable');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':       return '📅';
      case 'updated':       return '✏️';
      case 'status_change': return '🔄';
      case 'signoff':       return '✅';
      case 'pricing_run':   return '💰';
      case 'locked':        return '🔒';
      case 'exported':      return '📄';
      default:              return '📋';
    }
  };

  if (loading) return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Appointment Timeline</h3>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading timeline...</div>
    </div>
  );

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        Appointment Timeline &amp; Audit
      </h3>

      {error && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
          ⚠ {error}
        </div>
      )}

      {events.length === 0 && !error && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No timeline events yet. Events are recorded as the appointment progresses.
        </div>
      )}

      {events.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'var(--border)' }} />

          {events.map((ev, i) => (
            <div key={ev.id} style={{ position: 'relative', marginBottom: i === events.length - 1 ? 0 : '1.5rem' }}>
              <div style={{ position: 'absolute', left: '-1.5rem', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-primary)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', zIndex: 2 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.25rem', marginTop: '-0.125rem' }}>{getEventIcon(ev.eventType)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ev.description}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {new Date(ev.createdAt).toLocaleString()} {ev.user ? `· by ${ev.user.name}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
