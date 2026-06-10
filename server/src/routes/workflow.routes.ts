import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const workflowRoutes = Router();
workflowRoutes.use(requireAuth);

// Helper to determine the resume step and URL
function getWorkflowDetails(appointment: any) {
  const openings = appointment.openings || [];
  
  // Base step logic
  let stepId = 'customer';
  let stepLabel = 'Customer Info';
  let resumeUrl = `/appointments/${appointment.id}`;
  
  if (openings.length === 0) {
    if (appointment.jobAddress) {
      stepId = 'sketch';
      stepLabel = 'Draw the Layout';
      resumeUrl = `/appointments/${appointment.id}/sketch`;
    } else {
      stepId = 'house';
      stepLabel = 'About the House';
      resumeUrl = `/appointments/${appointment.id}`;
    }
  } else {
    const unpriced = openings.filter((o: any) => !o.totalPrice || o.totalPrice === 0);
    const incomplete = openings.filter((o: any) => !o.roomLocation || !o.width || !o.height || !o.productCategory);
    
    if (incomplete.length > 0 || unpriced.length > 0) {
      stepId = 'windows';
      stepLabel = 'Enter Windows & Price';
      resumeUrl = `/appointments/${appointment.id}?step=3`;
    } else if (!appointment.proposalSent && appointment.status !== 'quoted') {
      stepId = 'proposal';
      stepLabel = 'Close the Sale';
      resumeUrl = `/appointments/${appointment.id}?step=6`;
    } else {
      stepId = 'follow_up';
      stepLabel = 'Follow-up';
      resumeUrl = `/appointments/${appointment.id}`;
    }
  }

  const incompleteCount = openings.filter((o: any) => !o.roomLocation || !o.width || !o.height || !o.productCategory).length;
  let summary = `${openings.length} opening${openings.length === 1 ? '' : 's'}`;
  if (incompleteCount > 0) summary += ` (${incompleteCount} incomplete)`;

  return { stepId, stepLabel, resumeUrl, summary };
}

// GET /api/workflow/active
workflowRoutes.get('/active', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const activeAppt = await prisma.appointment.findFirst({
      where: {
        userId: authReq.user.userId,
        status: { notIn: ['sold', 'cancelled', 'completed'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
        openings: true,
      },
    });

    if (!activeAppt) {
      return res.json({ active: false });
    }

    const details = getWorkflowDetails(activeAppt);

    res.json({
      active: true,
      customerId: activeAppt.customerId,
      appointmentId: activeAppt.id,
      customerName: `${activeAppt.customer?.firstName || ''} ${activeAppt.customer?.lastName || ''}`.trim(),
      address: activeAppt.jobAddress || activeAppt.customer?.address || 'No Address',
      step: details.stepId,
      stepLabel: details.stepLabel,
      summary: details.summary,
      updatedAt: activeAppt.updatedAt,
      resumeUrl: details.resumeUrl
    });
  } catch (err: any) {
    console.error('Error fetching active workflow:', err);
    res.status(500).json({ error: 'Failed to fetch active workflow' });
  }
});

// PUT /api/workflow/ping/:id
// Explicitly bump the updatedAt timestamp to keep the workflow fresh when moving between tabs
workflowRoutes.put('/ping/:id', async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const id = authReq.params.id as string;
    
    // Verify ownership
    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt || appt.userId !== authReq.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true, updatedAt: updated.updatedAt });
  } catch (err: any) {
    console.error('Error pinging workflow:', err);
    res.status(500).json({ error: 'Failed to ping workflow' });
  }
});
