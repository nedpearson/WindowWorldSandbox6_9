import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from './Toast';
import { api } from '../utils/api';

interface Entity {
  id?: string;
  entityType: string;
  fieldName: string;
  fieldValue: string;
  openingNumber?: number;
  confidence: number;
  status: string;
}

export function VoiceAssistant({ appointmentId, userId, onApplied }: { appointmentId: string; userId: string; onApplied: () => void }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Create session
    const session = await api.post('/voice/sessions', { appointmentId, userId, status: 'recording' });
    setSessionId(session.id);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setShowDrawer(true);
    setEntities([]);
  }, [appointmentId, userId]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  const parseTranscript = useCallback(async () => {
    if (!transcript.trim() || !sessionId) return;
    setParsing(true);
    try {
      // Save transcript
      await api.post('/voice/transcripts', {
        voiceSessionId: sessionId,
        rawText: transcript,
        provider: 'web_speech',
        confidence: 0.85
      });
      // Parse
      const result = await api.post('/voice/parse', {
        voiceSessionId: sessionId,
        text: transcript
      });
      setEntities(result.entities || []);
    } catch (err) {
      console.error('Parse error:', err);
    } finally {
      setParsing(false);
    }
  }, [transcript, sessionId]);

  const updateEntity = (idx: number, updates: Partial<Entity>) => {
    const updated = [...entities];
    updated[idx] = { ...updated[idx], ...updates };
    setEntities(updated);
  };

  const acceptAll = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/voice/sessions/${sessionId}/accept-all`, {});
      setEntities(entities.map(e => ({ ...e, status: 'accepted' })));
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  const rejectEntity = (idx: number) => {
    updateEntity(idx, { status: 'rejected' });
    if (entities[idx].id) {
      api.put(`/voice/entities/${entities[idx].id}`, { status: 'rejected' }).catch(() => {});
    }
  };

  const acceptEntity = (idx: number) => {
    updateEntity(idx, { status: 'accepted' });
    if (entities[idx].id) {
      api.put(`/voice/entities/${entities[idx].id}`, { status: 'accepted' }).catch(() => {});
    }
  };

  const applyToAppointment = async () => {
    if (!sessionId) return;
    setApplying(true);
    try {
      // First accept all pending
      await acceptAll();
      // Then apply
      await api.post(`/voice/apply/${sessionId}`, {});
      onApplied();
      setShowDrawer(false);
      setTranscript('');
      setEntities([]);
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplying(false);
    }
  };

  const confidenceColor = (c: number) => c >= 0.8 ? 'var(--success)' : c >= 0.5 ? 'var(--warning)' : 'var(--error)';

  return (
    <>
      {/* Floating mic button */}
      <button
        className={`voice-mic-btn ${recording ? 'recording' : ''}`}
        onClick={recording ? stopRecording : startRecording}
        title={recording ? 'Stop recording' : 'Start voice input'}
      >
        {recording ? (
          <span className="mic-pulse">⏹</span>
        ) : (
          <span>🎤</span>
        )}
      </button>

      {/* Voice Drawer */}
      {showDrawer && (
        <div className="voice-drawer">
          <div className="voice-drawer-header">
            <h3>🎤 Voice Assistant</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDrawer(false)}>✕</button>
          </div>

          {/* Transcript */}
          <div className="voice-transcript-panel">
            <label className="form-label">Transcript</label>
            <textarea
              className="form-textarea"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={4}
              placeholder={recording ? 'Listening...' : 'Speak or type appointment details...'}
              style={{ fontFamily: 'monospace' }}
            />
            {recording && (
              <div className="recording-indicator">
                <span className="recording-dot" /> Recording...
              </div>
            )}
          </div>

          {/* Parse button */}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0' }}>
            <button className="btn btn-primary" onClick={parseTranscript} disabled={parsing || !transcript.trim()}>
              {parsing ? '⏳ Parsing...' : '🔍 Parse Fields'}
            </button>
            {entities.length > 0 && (
              <>
                <button className="btn btn-success" onClick={acceptAll}>✅ Accept All</button>
                <button className="btn btn-primary" onClick={applyToAppointment} disabled={applying}>
                  {applying ? '⏳ Applying...' : '📝 Apply to Appointment'}
                </button>
              </>
            )}
          </div>

          {/* Extracted entities */}
          {entities.length > 0 && (
            <div className="voice-entities">
              <h4 style={{ marginBottom: '0.5rem' }}>Extracted Fields ({entities.length})</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>#</th>
                      <th>Field</th>
                      <th>Value</th>
                      <th>Conf</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((e, i) => (
                      <tr key={i} style={{ opacity: e.status === 'rejected' ? 0.4 : 1 }}>
                        <td>
                          <span className="badge" style={{ background: e.entityType === 'customer' ? 'var(--accent)' : e.entityType === 'measurement' ? 'var(--info)' : 'var(--success)', color: '#fff', fontSize: '0.625rem' }}>
                            {e.entityType}
                          </span>
                        </td>
                        <td>{e.openingNumber || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{e.fieldName}</td>
                        <td>
                          <input
                            className="form-input"
                            value={e.fieldValue}
                            onChange={ev => updateEntity(i, { fieldValue: ev.target.value })}
                            style={{ minWidth: 100, padding: '0.25rem 0.5rem' }}
                          />
                        </td>
                        <td>
                          <span style={{ color: confidenceColor(e.confidence), fontWeight: 700 }}>
                            {Math.round(e.confidence * 100)}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${e.status === 'accepted' ? 'badge-success' : e.status === 'rejected' ? 'badge-danger' : 'badge-progress'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-success btn-sm" onClick={() => acceptEntity(i)} style={{ marginRight: '0.25rem' }}>✓</button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectEntity(i)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing field warnings */}
          {entities.length > 0 && entities.some(e => e.confidence < 0.5) && (
            <div className="warning-list" style={{ marginTop: '0.75rem' }}>
              <li className="warning-item">⚠ Some fields have low confidence — review before applying</li>
            </div>
          )}
        </div>
      )}
    </>
  );
}

