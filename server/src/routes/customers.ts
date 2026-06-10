import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const customerRoutes = Router();
customerRoutes.use(requireAuth);

/** Resolve companyId for the authenticated user from the database. */
async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return user?.companyId ?? null;
}

// List customers (paginated) — scoped to the caller's company
customerRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    const take = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const skip = parseInt(req.query.offset as string) || 0;
    const where: any = companyId ? { companyId } : {};
    const customers = await prisma.customer.findMany({
      where,
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { appointments: true } } }
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Search customers — MUST be before /:id to avoid route shadowing
// GET /customers/search?q=John
customerRoutes.get('/search', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json([]);
    const customers = await prisma.customer.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { address: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 30,
      include: { _count: { select: { appointments: true } } }
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single customer — enforces same-company ownership
customerRoutes.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, ...(companyId ? { companyId } : {}) },
      include: { appointments: { orderBy: { createdAt: 'desc' } } }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer — tagged with calling user's companyId
customerRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    const { email, phone, address } = req.body;

    // Duplicate check scoped to same company -- skip if ?skipDuplicateCheck=1
    const skipCheck = req.query.skipDuplicateCheck === '1';
    const addressTrimmed = (address ?? '').trim();
    const hasAddress = addressTrimmed.length >= 5; // avoid false positives on empty/short values
    if (!skipCheck && (email || phone || hasAddress)) {
      const existing = await prisma.customer.findFirst({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
            ...(hasAddress ? [{ address: { equals: addressTrimmed, mode: 'insensitive' as const } }] : []),
          ]
        },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true, city: true },
      });
      if (existing) {
        // Build a human-readable match description
        const matchedFields: string[] = [];
        if (email && (existing as any).email?.toLowerCase() === email.toLowerCase()) matchedFields.push('email');
        if (phone && (existing as any).phone === phone) matchedFields.push('phone');
        if (hasAddress && (existing as any).address?.toLowerCase() === addressTrimmed.toLowerCase()) matchedFields.push('address');
        const matchLabel = matchedFields.length > 0 ? matchedFields.join(' and ') : 'email, phone, or address';

        return res.status(409).json({
          error: `A customer with this ${matchLabel} already exists`,
          matchedFields,
          existingId: existing.id,
          existingName: `${(existing as any).firstName ?? ''} ${(existing as any).lastName ?? ''}`.trim(),
          existingPhone: (existing as any).phone ?? '',
          existingEmail: (existing as any).email ?? '',
          existingAddress: (existing as any).address ?? '',
          existingCity: (existing as any).city ?? '',
        });
      }
    }

    const customer = await prisma.customer.create({
      data: { ...req.body, ...(companyId ? { companyId } : {}) }
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer — enforce same-company ownership
customerRoutes.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    // Verify ownership before update
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, ...(companyId ? { companyId } : {}) },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Search customers (legacy path param style — kept for backward compat)
customerRoutes.get('/search/:query', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = await getUserCompanyId(userId);
    const q = req.params.query;
    const customers = await prisma.customer.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { address: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});
