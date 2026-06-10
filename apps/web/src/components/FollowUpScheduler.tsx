import React, { useState, useEffect } from 'react';
import { toast } from '../components/Toast';
import { api } from '../utils/api';

interface FollowUpSchedulerProps {
  appointmentId: string;
  customerId: string;
  onScheduled: () => void;
  onBypass: () => void; // Called when "No follow up needed" is selected
}

type FollowUpType = 'call' | 'visit' | 'ready_to_sign' | 'remeasure' | 'no_follow_up_needed';

export function FollowUpScheduler({ appointmentId, customerId, onScheduled, onBypass }: FollowUpSchedulerProps) {
  const [loading, setLoading] = useState(false);
  const [existingFollowUp, setExistingFollowUp] = useState<any>(null);
  
  const [selectedType, setSelectedType] = useState<FollowUpType | null>(null);
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [notes, setNotes] = useState('');
  
  // Initialize date/time to tomorrow at 10 AM
  useEffect(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    tmrw.setHours(10, 0, 0, 0);
    setDateStr(tmrw.toISOString().split('T')[0]);
    setTimeStr('10:00');
    
    // Check if one already exists
    checkExisting();
  }, [appointmentId]);

  const checkExisting = async () => {
    try {
      const res = await api.get('/follow-ups');
      const all = res;
      const apptFollowUp = all.find((f: any) => f.appointmentId === appointmentId && f.status === 'scheduled');
      if (apptFollowUp) {
        setExistingFollowUp(apptFollowUp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
      
      const statusRes = await api.get('/notifications/status');
      if (!statusRes.configured || !statusRes.publicKey) return false;
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: statusRes.publicKey
      });
      
      await api.post('/notifications/subscribe', {
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys,
        userAgent: navigator.userAgent,
      });
      return true;
    } catch (e) {
      console.warn('Push subscribe failed, falling back to ICS:', e);
      return false;
    }
  };

  const handleSave = async () => {
    if (!selectedType) return toast.error('Please select an option');
    
    if (selectedType === 'no_follow_up_needed') {
      try {
        setLoading(true);
        await api.post('/follow-ups', {
          appointmentId, customerId, type: selectedType, title: 'No follow up needed',
          scheduledAt: new Date().toISOString()
        });
        toast.success('Noted: No follow-up needed');
        onBypass();
      } catch (e) {
        toast.error('Failed to save');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (selectedType === 'ready_to_sign') {
      try {
        setLoading(true);
        await api.post('/follow-ups', {
          appointmentId, customerId, type: selectedType, title: 'Customer ready to sign',
          scheduledAt: new Date().toISOString()
        });
        toast.success('Noted: Ready to sign');
        onBypass();
      } catch (e) {
        toast.error('Failed to save');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!dateStr || !timeStr) return toast.error('Please set date and time');

    const dt = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(dt.getTime())) return toast.error('Invalid date/time');

    try {
      setLoading(true);
      
      let pushEnabled = false;
      try {
        pushEnabled = await subscribeToPush();
      } catch (e) { console.debug("[swallowed error]", e); }

      const titles: Record<string, string> = {
        call: 'Follow-up Call',
        visit: 'Follow-up Visit',
        remeasure: 'Needs Remeasure',
      };

      const res = await api.post('/follow-ups', {
        appointmentId,
        customerId,
        type: selectedType,
        title: titles[selectedType] || 'Follow-up',
        scheduledAt: dt.toISOString(),
        reminderMinutesBefore: reminderMinutes,
        notificationEnabled: pushEnabled,
        notes,
      });

      toast.success('Follow-up scheduled!');
      setExistingFollowUp(res);
      onScheduled();
    } catch (e: any) {
      if (e.response?.status === 409) {
        toast.error('Follow-up already exists for this time');
      } else {
        toast.error('Failed to schedule follow-up');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIcs = () => {
    if (!existingFollowUp) return;
    const baseURL = window.location.origin.replace(':5173', ':3001');
    window.open(`${baseURL}/api/follow-ups/${existingFollowUp.id}/calendar.ics?token=${localStorage.getItem('token')}`, '_blank');
  };

  if (existingFollowUp) {
    return (
      <div className="card" style={{ padding: '1rem', border: '1px solid var(--success)', background: 'rgba(34,197,94,0.05)' }}>
        <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          ✅ Follow-up Scheduled
        </h3>
        <div style={{ marginBottom: '1rem' }}>
          <strong>{existingFollowUp.title}</strong><br/>
          {new Date(existingFollowUp.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleDownloadIcs}>
            📅 Add to Calendar
          </button>
          <button className="btn btn-primary" onClick={onScheduled}>
            Continue to Close →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1rem', border: '2px solid var(--primary)', background: 'var(--bg-card)' }}>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📅 Set Next Follow-Up
      </h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        When is the best time for me to follow up? (Required before closing)
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setSelectedType('call')}
          className={`btn ${selectedType === 'call' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
        >
          📞 Follow-up Call
        </button>
        <button 
          onClick={() => setSelectedType('visit')}
          className={`btn ${selectedType === 'visit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
        >
          🚗 Follow-up Visit
        </button>
        <button 
          onClick={() => setSelectedType('ready_to_sign')}
          className={`btn ${selectedType === 'ready_to_sign' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
        >
          ✍️ Customer Ready to Sign
        </button>
        <button 
          onClick={() => setSelectedType('remeasure')}
          className={`btn ${selectedType === 'remeasure' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
        >
          📏 Needs Remeasure
        </button>
        <button 
          onClick={() => setSelectedType('no_follow_up_needed')}
          className={`btn ${selectedType === 'no_follow_up_needed' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
        >
          🛑 No Follow-Up Needed
        </button>
      </div>

      {(selectedType === 'call' || selectedType === 'visit' || selectedType === 'remeasure') && (
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={dateStr} onChange={e => setDateStr(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Time</label>
              <input type="time" className="form-input" value={timeStr} onChange={e => setTimeStr(e.target.value)} />
            </div>
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Reminder</label>
            <select className="form-select" value={reminderMinutes} onChange={e => setReminderMinutes(Number(e.target.value))}>
              <option value={0}>At time of follow-up</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          <div>
            <label className="form-label">Notes (Optional)</label>
            <textarea 
              className="form-textarea" 
              rows={2} 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Call wife, bring remeasure tape"
            />
          </div>
        </div>
      )}

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '0.875rem' }}
        onClick={handleSave}
        disabled={loading || !selectedType}
      >
        {loading ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}
