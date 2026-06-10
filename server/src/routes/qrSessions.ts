import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

// ── In-memory QR session store ──────────────────────────────
// Tokens are short-lived (15 min). Server-side store means ANY device
// that hits the same server can validate — fixes cross-device scanning.
interface QRSessionRecord {
  token: string;
  appointmentId: string;
  userId: string;
  userEmail: string;
  customerName: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, QRSessionRecord>();

// Purge expired sessions every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions.entries()) {
    if (s.expiresAt < now) sessions.delete(token);
  }
}, 5 * 60 * 1000);

// ── Router ──────────────────────────────────────────────────
export const qrSessionRoutes = Router();

// POST /api/qr-sessions — create a new session (rep's device, requires auth)
qrSessionRoutes.post('/', requireAuth, (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { appointmentId, userEmail, customerName } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId required' });

    // Generate cryptographically random token (24 hex chars = 12 bytes = 96-bit entropy)
    // Shorter token = shorter URL = less dense QR = easier for iPad cameras to scan
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    const token = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

    const now = Date.now();
    const session: QRSessionRecord = {
      token,
      appointmentId,
      userId,
      userEmail: userEmail || '',
      customerName: customerName || 'Customer',
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000, // 15 minutes
    };
    sessions.set(token, session);

    res.status(201).json({
      token,
      expiresAt: session.expiresAt,
      signingUrl: `/sign/${token}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create QR session', details: err.message });
  }
});

// GET /api/qr-sessions/:token — validate a token (tablet's device, NO auth required)
// This endpoint is intentionally public so the customer's tablet can hit it
// without being logged in. It returns only the appointmentId + customerName —
// no sensitive rep/company data.
qrSessionRoutes.get('/:token', (req, res) => {
  try {
    const token = String(req.params.token);
    const session = sessions.get(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    if (session.expiresAt < Date.now()) {
      sessions.delete(token);
      return res.status(410).json({ error: 'Session expired' });
    }

    // Return minimal data — only what SigningPage needs
    res.json({
      appointmentId: session.appointmentId,
      customerName: session.customerName,
      expiresAt: session.expiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to validate session', details: err.message });
  }
});

// DELETE /api/qr-sessions/:token — revoke after signing completes (auth required)
qrSessionRoutes.delete('/:token', requireAuth, (req, res) => {
  const token = String(req.params.token);
  sessions.delete(token);
  res.json({ success: true });
});
