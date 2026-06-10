import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const followUpsRoutes = Router();

followUpsRoutes.use(requireAuth);

// GET /api/follow-ups
followUpsRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    if (!userId || !companyId) return res.status(401).json({ error: 'Unauthorized' });

    const followUps = await prisma.followUp.findMany({
      where: { companyId, userId },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(followUps);
  } catch (error: any) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/follow-ups
followUpsRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.companyId;
    if (!userId || !companyId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      customerId, appointmentId, proposalId, type, title, notes,
      scheduledAt, reminderMinutesBefore, notificationEnabled,
    } = req.body;

    if (!type || !scheduledAt || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent exact duplicates
    if (appointmentId) {
      const existing = await prisma.followUp.findFirst({
        where: {
          appointmentId,
          type,
          scheduledAt: new Date(scheduledAt),
        }
      });
      if (existing) {
        return res.status(409).json({ error: 'Duplicate follow-up already exists for this appointment' });
      }
    }

    const reminderAt = reminderMinutesBefore
      ? new Date(new Date(scheduledAt).getTime() - reminderMinutesBefore * 60000)
      : null;

    const followUp = await prisma.followUp.create({
      data: {
        companyId,
        userId,
        customerId,
        appointmentId,
        proposalId,
        type,
        title,
        notes,
        scheduledAt: new Date(scheduledAt),
        reminderAt,
        reminderMinutesBefore,
        notificationEnabled,
        status: 'scheduled',
      }
    });

    // Update appointment if relevant
    if (appointmentId && type !== 'no_follow_up_needed') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          followUpDate: new Date(scheduledAt),
        }
      });
    }

    res.status(201).json(followUp);
  } catch (error: any) {
    console.error('Error creating follow-up:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/follow-ups/:id
followUpsRoutes.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId;
    
    // Verify ownership
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const { status, scheduledAt, reminderMinutesBefore, notes, completedAt } = req.body;
    
    const updates: any = { status, notes, completedAt: completedAt ? new Date(completedAt) : undefined };
    if (scheduledAt) {
      updates.scheduledAt = new Date(scheduledAt);
      if (reminderMinutesBefore !== undefined) {
        updates.reminderMinutesBefore = reminderMinutesBefore;
        updates.reminderAt = reminderMinutesBefore ? new Date(new Date(scheduledAt).getTime() - reminderMinutesBefore * 60000) : null;
      } else if (existing.reminderMinutesBefore) {
        updates.reminderAt = new Date(new Date(scheduledAt).getTime() - existing.reminderMinutesBefore * 60000);
      }
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: updates,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating follow-up:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/follow-ups/:id/calendar.ics
followUpsRoutes.get('/:id/calendar.ics', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId;
    
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        customer: true,
        appointment: true,
      }
    });

    if (!followUp || followUp.companyId !== companyId) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const startDate = new Date(followUp.scheduledAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour
    
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let address = 'Window World Appointment';
    if (followUp.appointment?.jobAddress) {
      address = `${followUp.appointment.jobAddress}, ${followUp.appointment.jobCity || ''}, ${followUp.appointment.jobState || ''}`;
    }

    // Build standard ICS file format manually to avoid large dependencies
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Window World//Assistant//EN',
      'BEGIN:VEVENT',
      `UID:${followUp.id}@windowworldassistant.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${followUp.title}`,
      `LOCATION:${address.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${(followUp.notes || '').replace(/\n/g, '\\n')}`,
    ];

    if (followUp.reminderMinutesBefore) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${followUp.title}`,
        `TRIGGER:-PT${followUp.reminderMinutesBefore}M`,
        'END:VALARM'
      );
    }

    lines.push('END:VEVENT', 'END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="followup_${id}.ics"`);
    res.send(icsContent);

    // Mark as ICS generated
    await prisma.followUp.update({
      where: { id },
      data: { icsGenerated: true }
    });

  } catch (error: any) {
    console.error('Error generating ICS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
