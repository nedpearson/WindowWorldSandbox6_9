import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from './Toast';
import { useNavigate } from 'react-router-dom';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  createdAt: string;
  pdfSignedUrl?: string;
  xlsxSignedUrl?: string;
  storagePath: string;
  storageBucket: string;
}

interface Email {
  id: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  createdAt: string;
  status: string;
  attachments?: any[];
}

export function CustomerCRMView({ customer, onClose, handleNewAppointment }: { customer: any; onClose: () => void; handleNewAppointment: (id: string) => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'appointments' | 'documents' | 'emails'>('appointments');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Email form
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (tab === 'documents') {
      loadDocuments();
    } else if (tab === 'emails') {
      loadEmails();
      if (documents.length === 0) loadDocuments(); // Load docs for attachments
    } else if (tab === 'appointments') {
      loadAppointments();
    }
  }, [tab]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomerDocuments(customer.id);
      setDocuments(res.documents || []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await api.getEmailLogs(customer.id);
      setEmails(data);
    } catch {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointments({ customerId: customer.id });
      setAppointments(res.appointments || res || []);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error('Subject and Body are required');
      return;
    }
    
    setSending(true);
    try {
      const attachments = documents
        .filter(d => selectedAttachments.includes(d.id))
        .map(d => ({
          filename: d.fileName,
          storagePath: d.storagePath,
          bucket: d.storageBucket
        }));

      await api.sendEmail({
        customerId: customer.id,
        to: customer.email,
        subject: emailSubject,
        bodyText: emailBody,
        attachments
      });

      toast.success('Email sent successfully');
      setEmailSubject('');
      setEmailBody('');
      setSelectedAttachments([]);
      loadEmails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.03))',
      border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16,
      padding: '1.5rem', marginTop: '0.5rem',
      animation: 'fade-in 0.2s ease-out',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{customer.firstName} {customer.lastName}</div>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {customer.phone && <span>📞 {customer.phone}</span>}
            {customer.email && <span>✉️ {customer.email}</span>}
            {customer.address && <span>📍 {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
        {(['appointments', 'documents', 'emails'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: tab === t ? 700 : 500,
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: '300px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : tab === 'appointments' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Quotes & Appointments</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleNewAppointment(customer.id)}>+ New Quote</button>
            </div>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No quotes yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointments.map(a => (
                  <div key={a.id} onClick={() => navigate(`/appointments/${a.id}`)}
                    style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Quote #{a.id.slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created {fmt(a.createdAt)}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      ${(a.totalAmount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'documents' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Generated Documents</h3>
            </div>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No documents saved</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {documents.map(d => (
                  <div key={d.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.5rem' }}>{d.documentType === 'contract' ? '📄' : '📝'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.fileName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(d.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {d.pdfSignedUrl && <a href={d.pdfSignedUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>View PDF</a>}
                      {d.xlsxSignedUrl && <a href={d.xlsxSignedUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Download Excel</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'emails' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Email Composer */}
            <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Compose Email</h3>
              {!customer.email && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                  Customer has no email address. Please update their info.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subject</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Body</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
                </div>
                {documents.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Attachments</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {documents.map(d => (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedAttachments.includes(d.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAttachments(p => [...p, d.id]);
                              else setSelectedAttachments(p => p.filter(id => id !== d.id));
                            }} />
                          📄 {d.fileName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" onClick={handleSendEmail} disabled={sending || !customer.email}>
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>

            {/* Email History */}
            <div>
              <h3 style={{ margin: '0 0 1rem 0' }}>Email History</h3>
              {emails.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No emails sent to this customer.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {emails.map(e => (
                    <div key={e.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{e.subject}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(e.createdAt)}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{e.bodyText}</div>
                      {e.attachments && e.attachments.length > 0 && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {e.attachments.map((a: any, i) => (
                            <span key={i} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: 9999 }}>
                              📎 {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {e.status === 'failed' && (
                        <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>Failed to send</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
