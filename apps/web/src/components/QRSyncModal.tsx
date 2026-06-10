import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// ── Countdown ring ────────────────────────────────────────
function CountdownRing({ totalSeconds, remaining }: { totalSeconds: number; remaining: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const pct = remaining / totalSeconds;
  const color = remaining > 180 ? '#22c55e' : remaining > 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={60} height={60} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={30} cy={30} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
      <text x={30} y={30} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={9} fontWeight={700} style={{ transform: 'rotate(90deg)', transformOrigin: '30px 30px' }}>
        {remaining > 60 ? `${Math.floor(remaining / 60)}m` : `${remaining}s`}
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// QR SYNC MODAL
//
// Fix: sessions are now registered SERVER-SIDE so any device
// (iPad, phone, second laptop) that hits /sign/:token can
// validate against the server instead of the rep's localStorage.
// ══════════════════════════════════════════════════════════
export function QRSyncModal({
  appointment,
  userId,
  userEmail,
  onClose,
}: {
  appointment: any;
  userId: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [token, setToken] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [ttl, setTtl] = useState(900); // 15 min
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [signingUrl, setSigningUrl] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<number>(0);

  const customerName = `${appointment.customer?.firstName || ''} ${appointment.customer?.lastName || ''}`.trim() || 'Customer';

  const generateSession = async () => {
    setError('');
    setExpired(false);
    setQrDataUrl('');
    try {
      // Register session on server — any device can now validate this token
      const jwtToken = localStorage.getItem('wwa_token') || '';
      const res = await fetch('/api/qr-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          userEmail,
          customerName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to create session');
      }
      const data = await res.json();
      const newToken = data.token as string;
      const url = `${window.location.origin}/sign/${newToken}`;

      setToken(newToken);
      setSigningUrl(url);
      expiresAtRef.current = data.expiresAt as number;
      setTtl(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));

      // Level M (not H) keeps density low and scannable on iPad cameras.
      // 400px source = crisp on Retina; pure black/white = max camera contrast.
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 3,
        width: 400,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR code');
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!token) return;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
      setTtl(remaining);
      if (remaining <= 0) {
        setExpired(true);
        clearInterval(timerRef.current!);
      }
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [token]);

  // Generate on mount
  useEffect(() => { generateSession(); }, []);

  // Cleanup on close — revoke server-side session
  const handleClose = async () => {
    if (token) {
      const jwtToken = localStorage.getItem('wwa_token') || '';
      fetch(`/api/qr-sessions/${token}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` },
      }).catch(() => {});
    }
    onClose();
  };

  const handleRefresh = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Revoke old token silently
    if (token) {
      const jwtToken = localStorage.getItem('wwa_token') || '';
      fetch(`/api/qr-sessions/${token}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` },
      }).catch(() => {});
    }
    setToken('');
    generateSession();
  };

  const handleCopy = () => {
    if (!signingUrl) return;
    navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
    }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '1.5rem', maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', margin: '1rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>📱 Customer Signing QR</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Hand the tablet to <strong style={{ color: 'var(--text-primary)' }}>{customerName}</strong> to sign
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Security notice */}
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>🔒</span>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Token scoped to <strong>this appointment only</strong> (ID: {appointment.id?.slice(0, 8)}…). 
            Auto-expires in 15 minutes. Shows <strong>only the signing screen</strong> — no other data accessible.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.75rem', color: '#ef4444' }}>
            ⚠️ {error} — <button onClick={handleRefresh} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem' }}>Retry</button>
          </div>
        )}

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {expired ? (
            <div style={{ width: 280, height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 12, border: '2px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏰</div>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>QR Code Expired</div>
              <button onClick={handleRefresh} className="btn btn-primary btn-sm">Generate New Code</button>
            </div>
          ) : qrDataUrl ? (
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.15)' }}>
              <img src={qrDataUrl} alt="Signing QR Code" style={{ display: 'block', width: 300, height: 300, imageRendering: 'pixelated' }} />
            </div>
          ) : !error ? (
            <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generating…</div>
            </div>
          ) : null}

          {/* Countdown */}
          {!expired && token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CountdownRing totalSeconds={900} remaining={ttl} />
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: ttl > 60 ? 'var(--text-primary)' : '#ef4444' }}>
                  {ttl > 0 ? `Expires in ${Math.floor(ttl / 60)}:${String(ttl % 60).padStart(2, '0')}` : 'Expired'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Scan with iPad or phone camera</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Primary: open signing page directly on this device ── */}
        {signingUrl && !expired && (
          <div style={{ marginTop: '1rem' }}>
            <a href={signingUrl} target="_blank" rel="noopener noreferrer" onClick={handleClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.875rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: '1rem', fontWeight: 800, boxShadow: '0 4px 16px rgba(59,130,246,0.4)' }}>
              ✍️ Open Signing Page
            </a>
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Tap above if on this iPad · or have customer scan QR with their phone
            </div>
          </div>
        )}

        {/* URL box */}
        {signingUrl && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SIGNING URL</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{signingUrl}</div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={handleCopy} className="btn btn-sm btn-secondary" style={{ flex: 1 }}>
            {copied ? '✓ Copied!' : '📋 Copy URL'}
          </button>
          <button onClick={handleRefresh} className="btn btn-sm btn-secondary">
            🔄 Refresh
          </button>
          <button onClick={handleClose} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
            Done
          </button>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Two ways to open:</strong><br />
          <strong style={{ color: '#93c5fd' }}>📱 This iPad:</strong> Tap <em>Open Signing Page</em> — opens in a new tab for the customer<br />
          <strong style={{ color: '#93c5fd' }}>📷 Customer's phone:</strong> Open camera app → point at QR → tap the link
        </div>
      </div>
    </div>
  );
}

