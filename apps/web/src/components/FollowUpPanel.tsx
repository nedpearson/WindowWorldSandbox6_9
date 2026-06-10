import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from './Toast';

interface FollowUpPanelProps {
  appointmentId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  followUpDate?: string | null;
  followUpOutcome?: string | null;
  onUpdate?: (patch: { followUpDate?: string | null; followUpOutcome?: string }) => void;
}

const OUTCOMES = [
  { value: 'called',        label: '📞 Called — spoke with customer',   color: '#22c55e' },
  { value: 'no_answer',     label: '📵 Called — no answer',              color: '#f59e0b' },
  { value: 'left_message',  label: '💬 Left voicemail/message',          color: '#3b82f6' },
  { value: 'meeting_set',   label: '📅 Meeting / revisit scheduled',     color: '#8b5cf6' },
  { value: 'sold',          label: '🏆 Sold — deal closed',              color: '#22c55e' },
  { value: 'lost',          label: '❌ Lost — not interested',            color: '#ef4444' },
];

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
  const label = diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `in ${diff}d`;
  const color = diff < 0 ? '#ef4444' : diff === 0 ? '#3b82f6' : '#22c55e';
  return { label, color, formatted: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) };
}

export function FollowUpPanel({
  appointmentId, customerId, customerName, customerPhone,
  followUpDate, followUpOutcome, onUpdate
}: FollowUpPanelProps) {
  const [saving, setSaving] = useState(false);
  const [localDate, setLocalDate] = useState(
    followUpDate ? new Date(followUpDate).toISOString().slice(0, 10) : ''
  );
  const [localOutcome, setLocalOutcome] = useState(followUpOutcome || '');
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  
  // Synthetic Follow-Up Intelligence
  const [aiDraft, setAiDraft] = useState('');
  const [optimalTime, setOptimalTime] = useState('');

  useEffect(() => {
    if (!expanded) return;
    if (localOutcome === 'sold' || localOutcome === 'lost') {
      setAiDraft('');
      setOptimalTime('');
      return;
    }
    
    // Auto-draft SMS based on outcome
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 'afternoon';
    const name = customerName?.split(' ')[0] || 'there';
    
    let draft = `Hi ${name}, this is your Window World rep. I'm following up on our recent appointment. Do you have any questions I can answer about the proposal?`;
    let optTime = 'Tomorrow afternoon (high response rate for post-appointment)';
    
    if (localOutcome === 'no_answer') {
      draft = `Hi ${name}, Window World here. I missed you on my call. Let me know when you have a moment to chat about your window project!`;
      optTime = 'Tomorrow at 4:30 PM (End of workday)';
    } else if (localOutcome === 'left_message') {
      draft = `Hi ${name}, this is Window World. I just left you a voicemail. Please call or text back when you're free.`;
      optTime = 'In 2 days at 10:00 AM';
    } else if (localOutcome === 'meeting_set') {
      draft = `Hi ${name}, great chatting with you today. Looking forward to our next meeting to finalize your project details!`;
      optTime = 'Morning of the scheduled meeting';
    }
    
    setAiDraft(draft);
    setOptimalTime(optTime);
    
    // Pre-fill next follow-up date if empty based on AI recommendation
    if (!localDate && !followUpDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + (localOutcome === 'left_message' ? 2 : 1));
      setLocalDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [localOutcome, expanded, customerName, localDate, followUpDate]);

  const dateInfo = fmtDate(localDate || followUpDate);
  const isOverdue = dateInfo && dateInfo.label.includes('overdue');

  const handleLog = async (outcome: string) => {
    setSaving(true);
    try {
      const outcomeLabel = OUTCOMES.find(o => o.value === outcome)?.label || outcome;
      // Log to timeline
      await api.addTimelineEvent(appointmentId, {
        eventType: 'follow_up',
        title: `Follow-up: ${outcomeLabel}`,
        description: note.trim() || undefined,
      });
      // Update appointment follow-up fields
      const patch: any = { followUpOutcome: outcome };
      if (outcome === 'meeting_set' || outcome === 'left_message') {
        // keep existing follow-up date or let rep set one
      } else if (outcome === 'sold' || outcome === 'lost') {
        patch.followUpDate = null; // clear — no more follow-up needed
        setLocalDate('');
      }
      await api.updateAppointment(appointmentId, patch);
      setLocalOutcome(outcome);
      setNote('');
      if (onUpdate) onUpdate(patch);
      toast.success(outcomeLabel);
    } catch (err: any) {
      toast.error(err.message || 'Failed to log follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDate = async () => {
    if (!localDate) return;
    setSaving(true);
    try {
      const patch = { followUpDate: new Date(localDate + 'T08:00:00').toISOString() };
      await api.updateAppointment(appointmentId, patch);
      if (onUpdate) onUpdate(patch);
      toast.success('Follow-up date set');
    } catch (err: any) {
      toast.error(err.message || 'Failed to set date');
    } finally {
      setSaving(false);
    }
  };

  const handleClearDate = async () => {
    setSaving(true);
    try {
      const patch = { followUpDate: null };
      await api.updateAppointment(appointmentId, patch);
      setLocalDate('');
      if (onUpdate) onUpdate(patch);
      toast.success('Follow-up cleared');
    } catch {
      toast.error('Failed to clear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.125rem' }}>📞</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Follow-Up</div>
            {dateInfo ? (
              <div style={{ fontSize: '0.75rem', color: dateInfo.color, fontWeight: 600 }}>
                {dateInfo.label} · {dateInfo.formatted}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No follow-up scheduled</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {localOutcome && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
              background: localOutcome === 'sold' ? 'rgba(34,197,94,0.15)' : localOutcome === 'lost' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
              color: localOutcome === 'sold' ? '#22c55e' : localOutcome === 'lost' ? '#ef4444' : '#3b82f6',
            }}>
              {OUTCOMES.find(o => o.value === localOutcome)?.label || localOutcome}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border)' }}>

          {/* Quick call button */}
          {customerPhone && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.875rem', marginTop: '0.875rem' }}>
              <a
                href={`tel:${customerPhone}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1rem', borderRadius: 9999,
                  background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                  color: '#22c55e', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                }}
              >
                📞 Call {customerName} — {customerPhone}
              </a>
              <a
                href={`sms:${customerPhone}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1rem', borderRadius: 9999,
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  color: '#3b82f6', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                }}
              >
                💬 Text
              </a>
            </div>
          )}

          {/* Log contact outcome */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Log Contact Result
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  disabled={saving}
                  onClick={() => handleLog(o.value)}
                  style={{
                    padding: '0.375rem 0.625rem', borderRadius: 8, fontSize: '0.75rem',
                    fontWeight: localOutcome === o.value ? 800 : 500,
                    background: localOutcome === o.value ? `${o.color}22` : 'var(--bg-primary)',
                    border: `1px solid ${localOutcome === o.value ? o.color : 'var(--border)'}`,
                    color: localOutcome === o.value ? o.color : 'var(--text-muted)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Synthetic Intelligence: Auto-Draft SMS */}
          {aiDraft && (
            <div style={{ marginBottom: '0.875rem', padding: '0.75rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6366f1' }}>🤖 AI Smart Follow-Up Draft</span>
                {customerPhone && (
                  <a href={`sms:${customerPhone}?body=${encodeURIComponent(aiDraft)}`} style={{ fontSize: '0.7rem', color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>
                    Send SMS ↗
                  </a>
                )}
              </div>
              <textarea
                value={aiDraft}
                onChange={e => setAiDraft(e.target.value)}
                rows={2}
                style={{
                  width: '100%', padding: '0.375rem 0.5rem',
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.8125rem',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: '0.875rem' }}>
            <textarea
              placeholder="Add a note (optional)…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8125rem',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Next follow-up date */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Next Follow-Up Date {optimalTime && <span style={{ color: '#6366f1', textTransform: 'none', fontStyle: 'italic', marginLeft: '0.375rem' }}>💡 AI: {optimalTime}</span>}
              </div>
              <input
                type="date"
                value={localDate}
                onChange={e => setLocalDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{
                  padding: '0.4375rem 0.625rem', background: 'var(--bg-primary)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text-primary)', fontSize: '0.8125rem', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-end', paddingBottom: '0' }}>
              <button
                className="btn btn-sm btn-primary"
                disabled={!localDate || saving}
                onClick={handleSetDate}
                style={{ marginTop: '1.375rem' }}
              >
                {saving ? '…' : 'Set Date'}
              </button>
              {(localDate || followUpDate) && (
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={saving}
                  onClick={handleClearDate}
                  style={{ marginTop: '1.375rem' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
