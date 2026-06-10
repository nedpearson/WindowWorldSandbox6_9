import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const finalReviewRoutes = Router();
finalReviewRoutes.use(requireAuth);

// GET /api/appointments/:appointmentId/final-review
finalReviewRoutes.get('/appointment/:appointmentId', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Basic authorization logic here: we should verify the user owns the appointment
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId }
    });
    if (!appt || appt.userId !== authReq.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const items = await prisma.finalReviewItem.findMany({
      where: { appointmentId: req.params.appointmentId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (err: any) {
    console.error('Error fetching final review items:', err);
    res.status(500).json({ error: 'Failed to fetch review items' });
  }
});

// POST /api/final-review/items
finalReviewRoutes.post('/items', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { appointmentId, severity, category, message, sourceType, sourceId } = req.body;
    
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });
    
    if (!appt || appt.userId !== authReq.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const item = await prisma.finalReviewItem.create({
      data: {
        companyId: (authReq.user as any).companyId || 'ww-demo',
        appointmentId,
        severity,
        category,
        message,
        sourceType,
        sourceId
      }
    });

    res.json(item);
  } catch (err: any) {
    console.error('Error creating final review item:', err);
    res.status(500).json({ error: 'Failed to create review item' });
  }
});

// PATCH /api/final-review/items/:id
finalReviewRoutes.patch('/items/:id', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const item = await prisma.finalReviewItem.findUnique({
      where: { id: req.params.id }
    });

    if (!item) return res.status(404).json({ error: 'Not found' });
    
    if (item.appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: item.appointmentId }
      });
      if (!appt || appt.userId !== authReq.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    const { status } = req.body;
    
    const updated = await prisma.finalReviewItem.update({
      where: { id: req.params.id },
      data: {
        status,
        resolvedAt: status === 'resolved' ? new Date() : null
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating final review item:', err);
    res.status(500).json({ error: 'Failed to update review item' });
  }
});
