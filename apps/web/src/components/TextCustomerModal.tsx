// ─────────────────────────────────────────────────────────────────────────────
// TextCustomerModal.tsx
// Shown on desktop (or as a fallback on mobile) when the rep taps "💬 Text".
// On mobile the app opens the native SMS app directly; this modal is the
// desktop fallback and the "missing phone" / "invalid phone" UX on all platforms.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  normalizePhoneForSms,
  buildSmsLink,
  buildDefaultSmsMessage,
  detectPlatform,
} from '../utils/phoneUtils';

interface TextCustomerModalProps {
  appointment: any;    // full appointment object with .customer
  authUser?: any;      // logged-in rep (for message template)
  onClose: () => void;
  onGoToCustomer: () => void; // navigate to the Customer step to add/edit phone
}

export function TextCustomerModal({
  appointment,
  authUser,
  onClose,
  onGoToCustomer,
}: TextCustomerModalProps) {
  const customer = appointment?.customer;
  const rawPhone = customer?.phone || customer?.phone2 || '';
  const phoneResult = normalizePhoneForSms(rawPhone);

  const repName = authUser?.name || authUser?.email?.split('@')[0] || 'Your Rep';
  const address = [appointment?.jobAddress, appointment?.jobCity]
    .filter(Boolean)
    .join(', ') || customer?.address || '';

  const defaultMessage = buildDefaultSmsMessage({
    customerFirstName: customer?.firstName || 'there',
    repName,
    address,
  });

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<'phone' | 'msg' | null>(null);
  const platform = detectPlatform();

  const copyToClipboard = async (text: string, type: 'phone' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const openSms = () => {
    if (!phoneResult.isValid) return;
    const link = buildSmsLink({ phone: phoneResult.smsPhone, body: message });
    window.location.href = link;
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  };
  const modal: React.CSSProperties = {
    background: 'var(--card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '1.5rem',
    maxWidth: 420, width: '100%',
    boxShadow: 'var(--shadow)',
    display: 'flex', flexDirection: 'column', gap: '1.25rem',
  };
  const title: React.CSSProperties = {
    fontSize: '1.125rem', fontWeight: 800,
    color: 'var(--text)',
    margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem',
  };
  const label: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  };
  const value: React.CSSProperties = {
    fontSize: '1rem', fontWeight: 700, color: 'var(--text)',
  };
  const pill = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: 9999, border: 'none',
    cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
    background: bg, color,
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    transition: 'opacity 0.15s',
    ...extra,
  });
  const textarea: React.CSSProperties = {
    width: '100%', minHeight: 80,
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.625rem',
    color: 'var(--text)',
    fontSize: '0.85rem', fontFamily: 'inherit',
    resize: 'vertical', outline: 'none',
    boxSizing: 'border-box',
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal} role="dialog" aria-modal="true" aria-label="Text Customer">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={title}>💬 Text Customer</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', padding: '0 0.25rem', lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Customer info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div style={label}>Customer</div>
          <div style={value}>{customer?.firstName} {customer?.lastName}</div>
        </div>

        {/* Phone status */}
        {!rawPhone && (
          <div style={{
            padding: '1rem', borderRadius: 10,
            background: '#fdecec', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#a32d2d', fontWeight: 600 }}>
              📵 No phone number saved for this customer.
            </div>
            <button
              style={pill('#fdecec', '#a32d2d')}
              onClick={() => { onClose(); onGoToCustomer(); }}
            >
              ✏️ Add Phone Number
            </button>
          </div>
        )}

        {rawPhone && !phoneResult.isValid && (
          <div style={{
            padding: '1rem', borderRadius: 10,
            background: 'var(--amberbg)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--amber)', fontWeight: 600 }}>
              ⚠️ Customer phone number needs to be corrected before texting.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Saved: <code style={{ color: 'var(--amber)' }}>{rawPhone}</code>
            </div>
            <button
              style={pill('var(--amberbg)', 'var(--amber)')}
              onClick={() => { onClose(); onGoToCustomer(); }}
            >
              ✏️ Edit Customer Phone
            </button>
          </div>
        )}

        {rawPhone && phoneResult.isValid && (
          <>
            {/* Valid phone row */}
            <div>
              <div style={label}>Phone Number</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ ...value, letterSpacing: '0.05em' }}>{phoneResult.displayPhone}</span>
                <button
                  style={pill('var(--infobg)', 'var(--blue)', { fontSize: '0.7rem', padding: '0.25rem 0.6rem' })}
                  onClick={() => copyToClipboard(phoneResult.displayPhone, 'phone')}
                >
                  {copied === 'phone' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Message textarea */}
            <div>
              <div style={label}>Suggested Message</div>
              <textarea
                style={textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                style={pill('var(--ok)', '#fff', { justifyContent: 'center', padding: '0.65rem 1rem', fontSize: '0.9rem' })}
                onClick={openSms}
              >
                📱 Open Text App
                {platform === 'desktop' && (
                  <span style={{ fontSize: '0.65rem', opacity: 0.75, marginLeft: 4 }}>(may not work on desktop)</span>
                )}
              </button>
              <button
                style={pill('var(--bg)', 'var(--text)', { justifyContent: 'center' })}
                onClick={() => copyToClipboard(message, 'msg')}
              >
                {copied === 'msg' ? '✓ Message Copied!' : '📋 Copy Message'}
              </button>
              <button
                style={pill('var(--bg)', 'var(--muted)', { justifyContent: 'center', fontSize: '0.75rem' })}
                onClick={() => { onClose(); onGoToCustomer(); }}
              >
                ✏️ Edit Customer Phone
              </button>
            </div>

            {platform === 'desktop' && (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
                On desktop, copy the message and phone number, then open your messaging app manually.
                On iPhone or Android the "Open Text App" button will launch SMS directly.
              </div>
            )}
          </>
        )}

        {/* Cancel */}
        <button
          style={{ ...pill('transparent', 'var(--text)', { justifyContent: 'center', border: '1px solid var(--border)' }), marginTop: '-0.5rem' }}
          onClick={onClose}
        >
          Cancel
        </button>

      </div>
    </div>
  );
}
