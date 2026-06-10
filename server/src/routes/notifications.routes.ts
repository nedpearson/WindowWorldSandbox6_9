import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';
import webpush from 'web-push';

export const notificationsRoutes = Router();

notificationsRoutes.use(requireAuth);

// Check if VAPID keys are configured
const isPushConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@windowworldassistant.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  } catch (e) {
    console.warn('⚠️ Web Push config error:', e);
  }
}

// GET /api/notifications/status
notificationsRoutes.get('/status', (req, res) => {
  res.json({
    configured: isPushConfigured,
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
});

// POST /api/notifications/subscribe
notificationsRoutes.post('/subscribe', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    if (!userId || !companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { endpoint, keys, userAgent, deviceLabel } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        companyId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        deviceLabel,
        active: true,
      },
      create: {
        userId,
        companyId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        deviceLabel,
        active: true,
      }
    });

    res.status(201).json({ success: true, id: sub.id });
  } catch (error: any) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/unsubscribe
notificationsRoutes.post('/unsubscribe', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { endpoint } = req.body;

    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
