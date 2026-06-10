import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TabletSigningMode } from '../components/TabletSigningMode';
import { api } from '../utils/api';

// ══════════════════════════════════════════════════════════
// ISOLATED SIGNING PAGE — /sign/:token
//
// Fix: validates token against the SERVER (GET /api/qr-sessions/:token)
// instead of the rep's browser localStorage. This means any device
// (iPad, phone, second laptop) that scans the QR code will be able
// to validate the session — the token only needs to exist on the server.
//
// Security properties:
//  - Token must match a live server session (not expired, not revoked)
//  - Returns ONLY appointmentId + customerName — no sensitive rep data
//  - Renders ONLY TabletSigningMode for that appointment
//  - No sidebar, no nav, no other data
//  - On completion or manual exit: revokes token server-side immediately
//  - If token invalid/expired: shows error with NO appointment data
// ══════════════════════════════════════════════════════════

type PageState = 'validating' | 'valid' | 'expired' | 'invalid' | 'done';

export function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('validating');
  const [appointment, setAppointment] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); setErrorMsg('No token provided.'); return; }

    // Validate token against the server — works from any device
    fetch(`/api/qr-sessions/${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.status === 404 || res.status === 410) {
          setState('expired');
          setErrorMsg('This signing link has expired or is invalid. Please ask the rep to generate a new QR code.');
          return;
        }
        if (!res.ok) {
          setState('invalid');
          setErrorMsg('Could not validate session. Please ask the rep to generate a new QR code.');
          return;
        }
        const session = await res.json();

        // Load ONLY this appointment — never expose other appointments
        api.getAppointment(session.appointmentId)
          .then(data => {
            if (data.id !== session.appointmentId) {
              setState('invalid');
              setErrorMsg('Session mismatch. Please ask the rep to generate a new QR code.');
              return;
            }
            setAppointment(data);
            setState('valid');
          })
          .catch(() => {
            setState('invalid');
            setErrorMsg('Could not load appointment. Ensure you are connected to the same network.');
          });
      })
      .catch(() => {
        setState('invalid');
        setErrorMsg('Network error validating session. Ensure the device has internet access.');
      });
  }, [token]);

  const handleDone = () => {
    // Revoke token server-side (fire and forget — customer device has no auth token)
    if (token) {
      fetch(`/api/qr-sessions/${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => {});
    }
    setState('done');
  };

  // ── Error / expired / done states ────────────────────────
  if (state === 'validating') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }}>🔐</div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>Validating secure session…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '4rem' }}>✅</div>
        <h1 style={{ color: 'var(--ok)', fontSize: '1.5rem', textAlign: 'center' }}>Signing Complete</h1>
        <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '0.9375rem' }}>
          All signatures have been captured. Please return the device to the sales representative.
        </p>
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(25,135,84,0.08)', border: '1px solid var(--ok)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
          🔒 This session has been closed. No appointment data is accessible.
        </div>
      </div>
    );
  }

  if (state === 'expired' || state === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>⏰</div>
        <h1 style={{ color: '#a32d2d', fontSize: '1.375rem', textAlign: 'center' }}>
          {state === 'expired' ? 'QR Code Expired' : 'Invalid Session'}
        </h1>
        <p style={{ color: 'var(--muted)', textAlign: 'center', maxWidth: 380, fontSize: '0.9375rem', lineHeight: 1.6 }}>
          {errorMsg}
        </p>
        <div style={{ padding: '0.75rem 1.25rem', background: '#fdecec', border: '1px solid #a32d2d', borderRadius: 8, fontSize: '0.75rem', color: '#a32d2d', textAlign: 'center' }}>
          🔒 For security, no appointment data is displayed on this screen.
        </div>
      </div>
    );
  }

  // ── Valid: render ONLY the signing mode ───────────────────
  if (state === 'valid' && appointment) {
    return (
      // Full-screen signing mode with no surrounding chrome
      // onClose triggers token revocation + done state
      <TabletSigningMode
        appointment={appointment}
        onClose={handleDone}
      />
    );
  }

  return null;
}
