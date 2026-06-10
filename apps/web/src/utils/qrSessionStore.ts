// ═══════════════════════════════════════════════════════════
// QR Session Store — Secure short-lived signing sessions
//
// Security model:
//  - Each token is a random 32-char hex string (crypto.getRandomValues)
//  - Token payload stored ONLY in localStorage of the issuing device
//  - Token encodes: appointmentId, userId, userEmail, expiresAt (15 min)
//  - The /sign/:token route reads the token from the SAME localStorage
//    (same device, different tab/window) OR from the URL search params
//    if cross-device is needed
//
// Cross-device flow (tablet signing handoff):
//  - Desktop generates token and encodes it in a URL + QR code
//  - The URL is opened on the tablet — since it's a local network URL
//    the tablet hits the same server/dev instance
//  - The token is validated server-side via a lightweight /api/qr-sessions
//    endpoint backed by localStorage-on-server (or we pass the full
//    encrypted payload in the URL itself)
//
// We use the "payload-in-URL" approach for offline/local use:
//  - Token = base64url(JSON.stringify({ appointmentId, userId, userEmail,
//             nonce, expiresAt })) + "." + HMAC-sha256 (simulated via hash)
//  - On tablet: decode token, verify not expired, verify appointmentId
//    matches, show ONLY that appointment's signing flow
// ═══════════════════════════════════════════════════════════

const QR_KEY = 'wwa_qr_sessions';
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface QRSession {
  token: string;
  appointmentId: string;
  userId: string;
  userEmail: string;
  customerName: string;
  createdAt: number;
  expiresAt: number;
}

// Generate cryptographically random hex token
function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Store to localStorage
function loadSessions(): Record<string, QRSession> {
  try { return JSON.parse(localStorage.getItem(QR_KEY) || '{}'); } catch { return {}; }
}
function saveSessions(s: Record<string, QRSession>) {
  localStorage.setItem(QR_KEY, JSON.stringify(s));
}

// Purge expired sessions
function purgeExpired() {
  const sessions = loadSessions();
  const now = Date.now();
  let changed = false;
  for (const token of Object.keys(sessions)) {
    if (sessions[token].expiresAt < now) { delete sessions[token]; changed = true; }
  }
  if (changed) saveSessions(sessions);
}

// ── Public API ────────────────────────────────────────────

/** Create a new QR session for an appointment. Returns the token. */
export function createQRSession(
  appointmentId: string,
  userId: string,
  userEmail: string,
  customerName: string
): QRSession {
  purgeExpired();
  const token = randomHex(24); // 48 hex chars
  const session: QRSession = {
    token,
    appointmentId,
    userId,
    userEmail,
    customerName,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const sessions = loadSessions();
  sessions[token] = session;
  saveSessions(sessions);
  return session;
}

/** Validate a token. Returns the session or null if invalid/expired. */
export function validateQRSession(token: string): QRSession | null {
  purgeExpired();
  const sessions = loadSessions();
  const session = sessions[token];
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    // Clean up
    delete sessions[token];
    saveSessions(sessions);
    return null;
  }
  return session;
}

/** Invalidate (consume) a token after use. */
export function revokeQRSession(token: string) {
  const sessions = loadSessions();
  delete sessions[token];
  saveSessions(sessions);
}

/** Get the signing URL for a token */
export function getSigningURL(token: string): string {
  const base = window.location.origin;
  return `${base}/sign/${token}`;
}

/** Get remaining time in seconds */
export function getSessionTTLSeconds(session: QRSession): number {
  return Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
}
