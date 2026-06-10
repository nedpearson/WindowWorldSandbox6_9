import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { calculateProposalTotals } from '../services/pricingService.js';

export const pricingVersionRoutes = Router();

// All pricing-version routes require a valid JWT
pricingVersionRoutes.use(requireAuth);

// Get active published version
pricingVersionRoutes.get('/active', async (_req, res) => {
  try {
    const version = await prisma.pricingVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    if (!version) return res.status(404).json({ error: 'No active pricing version' });
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active pricing' });
  }
});

// List all versions
pricingVersionRoutes.get('/', async (_req, res) => {
  try {
    const versions = await prisma.pricingVersion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } }
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Pricing Import routes (MUST be before /:id to avoid shadowing) ──
pricingVersionRoutes.post('/imports', async (req, res) => {
  try {
    const imp = await prisma.pricingImport.create({ data: req.body });
    res.status(201).json(imp);
  } catch (err) {
    res.status(500).json({ error: 'Import create failed' });
  }
});

pricingVersionRoutes.get('/imports', async (_req, res) => {
  try {
    const imports = await prisma.pricingImport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { rows: true } } }
    });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

pricingVersionRoutes.get('/imports/:id', async (req, res) => {
  try {
    const imp = await prisma.pricingImport.findUnique({
      where: { id: req.params.id },
      include: { rows: { orderBy: { rowNumber: 'asc' } } }
    });
    if (!imp) return res.status(404).json({ error: 'Not found' });
    res.json(imp);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Parse CSV pricing import
pricingVersionRoutes.post('/imports/:id/parse-csv', async (req, res) => {
  try {
    const { csvData } = req.body;
    const lines = csvData.split('\n').filter((l: string) => l.trim());
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c: string) => c.trim());
      const row: any = { importId: req.params.id, rowNumber: i, rawData: lines[i] };

      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const v = cells[j] || '';
        if (h.includes('category') || h.includes('type')) row.category = v;
        if (h.includes('product') || h.includes('window')) row.productCategory = v;
        if (h.includes('series') || h.includes('model')) row.seriesModel = v;
        if (h.includes('label') || h.includes('description') || h.includes('name')) row.label = v;
        if (h.includes('min') && h.includes('ui') || h.includes('min') && h.includes('inch')) row.unitedInchesMin = parseFloat(v) || null;
        if (h.includes('max') && h.includes('ui') || h.includes('max') && h.includes('inch')) row.unitedInchesMax = parseFloat(v) || null;
        if (h.includes('price') && !h.includes('type')) row.price = parseFloat(v.replace('$', '').replace(',', '')) || null;
        if (h.includes('price') && h.includes('type')) row.priceType = v;
      }

      row.confidence = row.price && row.label ? 0.8 : 0.3;
      row.needsVerification = row.confidence < 0.7;
      rows.push(row);
    }

    const created = await prisma.pricingImportRow.createMany({ data: rows });
    await prisma.pricingImport.update({
      where: { id: req.params.id },
      data: { status: 'parsed', parsedRowCount: rows.length }
    });

    res.json({ count: created.count, rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Parse failed', details: err.message });
  }
});

// Convert import to version — admin only
pricingVersionRoutes.post('/imports/:id/to-version', requireAdmin, async (req, res) => {
  try {
    const imp = await prisma.pricingImport.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!imp) return res.status(404).json({ error: 'Not found' });

    const rows = await prisma.pricingImportRow.findMany({
      where: { importId: imp.id, status: { not: 'rejected' } }
    });

    const version = await prisma.pricingVersion.create({
      data: {
        name: req.body.name || `Import: ${imp.fileName}`,
        importId: imp.id,
        items: {
          createMany: {
            data: rows.map((r: any, i: number) => ({
              category: r.category || 'product',
              productCategory: r.productCategory,
              seriesModel: r.seriesModel,
              label: r.label || `Row ${r.rowNumber}`,
              unitedInchesMin: r.unitedInchesMin,
              unitedInchesMax: r.unitedInchesMax,
              price: r.price || 0,
              priceType: r.priceType || 'flat',
              confidence: r.confidence,
              needsVerification: r.needsVerification,
              sortOrder: i
            }))
          }
        }
      },
      include: { items: true }
    });

    await prisma.pricingImport.update({ where: { id: imp.id }, data: { status: 'applied' } });
    res.json(version);
  } catch (err: any) {
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});

// Get version with items — MUST be after all static routes
pricingVersionRoutes.get('/:id', async (req, res) => {
  try {
    const v = await prisma.pricingVersion.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Create version from import — admin only
pricingVersionRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, importId, items, notes } = req.body;
    const version = await prisma.pricingVersion.create({
      data: {
        name,
        importId,
        notes,
        items: items ? { createMany: { data: items } } : undefined
      },
      include: { items: true }
    });
    res.status(201).json(version);
  } catch (err: any) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

// Publish version — admin only
pricingVersionRoutes.post('/:id/publish', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Use authenticated userId from JWT — never trust req.body.userId
    const publishedBy = req.user!.userId;
    await prisma.pricingVersion.updateMany({
      where: { status: 'published' },
      data: { status: 'archived' }
    });
    const v = await prisma.pricingVersion.update({
      where: { id: String(req.params.id) },
      data: { status: 'published', publishedAt: new Date(), publishedBy }
    });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Publish failed' });
  }
});

// ── Centralized Pricing Engine ──────────────────────────
pricingVersionRoutes.post('/calculate', async (req, res) => {
  try {
    const { openings, taxRate = 0.0945, adminFee = 0, discount = 0 } = req.body;

    // Get active version
    const version = await prisma.pricingVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      include: { items: true }
    });

    if (!version) {
      return res.json({ error: 'No published pricing version', lineItems: [], missingRules: [], totals: { subtotal: 0, tax: 0, total: 0 } });
    }

    const { lineItems, missingRules } = calculateProposalTotals(openings, version);

    const subtotal = lineItems.reduce((s, li) => s + li.totalPrice, 0);
    const discounted = subtotal - discount;
    // Window World is tax-exempt — no sales tax
    const total = discounted + adminFee;

    // Log missing rules — strip frontend-only fields not in DB model
    if (missingRules.length > 0) {
      try {
        await prisma.missingPricingRule.createMany({
          data: missingRules.map(mr => ({
            optionLabel: mr.label,
            description: mr.description
          })),
          skipDuplicates: true
        });
      } catch (logErr) {
        console.error('Failed to log missing pricing rules:', logErr);
      }
    }

    res.json({
      pricingVersionId: version.id,
      pricingVersionName: version.name,
      lineItems,
      missingRules,
      totals: { subtotal, discount, discounted, total, adminFee }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Calculate failed', details: err.message });
  }
});

// (Import routes moved above /:id to prevent route shadowing)
