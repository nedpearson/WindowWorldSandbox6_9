import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendCustomerEmail } from '../services/emailService.js';
import { prisma } from '../index.js';

const router = Router();

// POST /api/communications/email
router.post('/email', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, bodyText, bodyHtml, attachments, customerId, companyId } = req.body;
    
    if (!to || !subject || !customerId) {
      res.status(400).json({ error: 'Missing required fields: to, subject, customerId' });
      return;
    }

    const userId = (req as any).user.id;

    // Verify customer belongs to the user's company if companyId is set
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const result = await sendCustomerEmail({
      to,
      subject,
      bodyText,
      bodyHtml,
      attachments,
      customerId,
      companyId: companyId || customer.companyId || undefined,
      sentByUserId: userId
    });

    if (result.success) {
      res.status(200).json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: 'Failed to send email', details: result.error });
    }
  } catch (error: any) {
    console.error('[Communications Route] Error sending email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/communications/emails/:customerId
router.get('/emails/:customerId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.params.customerId as string;
    
    const emails = await prisma.emailLog.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        sentBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(emails);
  } catch (error) {
    console.error('[Communications Route] Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

export default router;
