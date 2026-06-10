/**
 * Field Manual API — /api/field-manual
 *
 * Serves FieldManualCategories and FieldManualArticles.
 * All content is company-scoped (companyId from JWT).
 * Built-in (companyId=null) articles serve as the default library
 * available to all companies.
 *
 * Role access:
 *  - sales_rep, manager, admin: read published articles
 *  - manager, admin: create/edit draft articles
 *  - admin only: publish/archive articles
 */
import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

export const fieldManualRoutes = Router();
fieldManualRoutes.use(requireAuth);

// ── Helper ─────────────────────────────────────────────────────────────────
function getCompanyId(req: any): string | null {
  return (req as any).user?.companyId ?? null;
}
function getRole(req: any): string {
  return (req as any).user?.role ?? 'sales_rep';
}
function isManagerOrAdmin(req: any): boolean {
  const role = getRole(req);
  return role === 'admin' || role === 'manager' || role === 'sales_manager';
}
function isAdmin(req: any): boolean {
  return getRole(req) === 'admin';
}

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/field-manual/categories
fieldManualRoutes.get('/categories', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const categories = await prisma.fieldManualCategory.findMany({
      where: {
        active: true,
        OR: [
          { companyId: null },             // Built-in library
          { companyId: companyId ?? undefined }, // Company-specific
        ],
      },
      include: {
        _count: { select: { articles: { where: { status: 'published' } } } }
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
  }
});

// POST /api/field-manual/categories — manager/admin only
fieldManualRoutes.post('/categories', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const { slug, title, description, icon, sortOrder } = req.body;
    const cat = await prisma.fieldManualCategory.create({
      data: { slug, title, description, icon, sortOrder: sortOrder ?? 0, companyId },
    });
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create category', details: err.message });
  }
});

// ── Articles ────────────────────────────────────────────────────────────────

// GET /api/field-manual/articles — list with optional search/category/tag filters
fieldManualRoutes.get('/articles', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { category, search, tag, status: statusFilter } = req.query as Record<string, string>;

    // Managers can see drafts; sales reps only see published
    const allowedStatuses = isManagerOrAdmin(req)
      ? (statusFilter ? [statusFilter] : ['published', 'draft'])
      : ['published'];

    const articles = await prisma.fieldManualArticle.findMany({
      where: {
        status: { in: allowedStatuses },
        OR: [
          { companyId: null },
          { companyId: companyId ?? undefined },
        ],
        ...(category ? { category: { slug: category } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
            { bodyMarkdown: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true, slug: true, title: true, summary: true, status: true,
        bodyMarkdown: true, categoryId: true, tagsJson: true, version: true, updatedAt: true,
        doChooseJson: true, doNotChooseJson: true, requiredPhotosJson: true,
        requiredMeasurementsJson: true, chargeableOptionsJson: true,
        commonMistakesJson: true, installerNotesJson: true, contractNotesJson: true,
        videoAssetsJson: true,
        category: { select: { slug: true, title: true, icon: true } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { title: 'asc' }],
    });
    res.json(articles);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch articles', details: err.message });
  }
});

// GET /api/field-manual/articles/:slug — full article
fieldManualRoutes.get('/articles/:slug', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const article = await prisma.fieldManualArticle.findFirst({
      where: {
        slug: req.params.slug,
        OR: [
          { companyId: null },
          { companyId: companyId ?? undefined },
        ],
      },
      include: { category: true },
    });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (article.status !== 'published' && !isManagerOrAdmin(req)) {
      return res.status(403).json({ error: 'This article is not yet published' });
    }
    res.json(article);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch article', details: err.message });
  }
});

// POST /api/field-manual/articles — manager/admin only
fieldManualRoutes.post('/articles', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const { slug, title, summary, bodyMarkdown, categoryId, status,
      doChooseJson, doNotChooseJson, requiredPhotosJson, requiredMeasurementsJson,
      chargeableOptionsJson, managerReviewFlagsJson, commonMistakesJson,
      installerNotesJson, contractNotesJson, tagsJson, videoAssetsJson } = req.body;

    const article = await prisma.fieldManualArticle.create({
      data: {
        slug, title, summary, bodyMarkdown: bodyMarkdown ?? '',
        categoryId: categoryId ?? null,
        status: status ?? 'draft',
        companyId,
        createdByUserId: userId,
        doChooseJson, doNotChooseJson, requiredPhotosJson, requiredMeasurementsJson,
        chargeableOptionsJson, managerReviewFlagsJson, commonMistakesJson,
        installerNotesJson, contractNotesJson, tagsJson, videoAssetsJson,
      },
    });
    res.status(201).json(article);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create article', details: err.message });
  }
});

// PUT /api/field-manual/articles/:id — manager/admin only
fieldManualRoutes.put('/articles/:id', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const { id } = req.params;
    const { slug, title, summary, bodyMarkdown, categoryId, status,
      doChooseJson, doNotChooseJson, requiredPhotosJson, requiredMeasurementsJson,
      chargeableOptionsJson, managerReviewFlagsJson, commonMistakesJson,
      installerNotesJson, contractNotesJson, tagsJson, videoAssetsJson } = req.body;

    const existing = await prisma.fieldManualArticle.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Article not found' });

    // Admin can publish; manager can only keep as draft
    const safeStatus = isAdmin(req) ? (status ?? existing.status) : (status === 'published' ? 'published' : (status ?? existing.status));

    const updated = await prisma.fieldManualArticle.update({
      where: { id },
      data: {
        slug, title, summary, bodyMarkdown,
        categoryId, status: safeStatus,
        version: { increment: 1 },
        doChooseJson, doNotChooseJson, requiredPhotosJson, requiredMeasurementsJson,
        chargeableOptionsJson, managerReviewFlagsJson, commonMistakesJson,
        installerNotesJson, contractNotesJson, tagsJson, videoAssetsJson,
        approvedByUserId: safeStatus === 'published' ? (req as any).user?.userId : undefined,
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update article', details: err.message });
  }
});

// POST /api/field-manual/articles/:id/publish — admin only
fieldManualRoutes.post('/articles/:id/publish', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const updated = await prisma.fieldManualArticle.update({
      where: { id: req.params.id },
      data: { status: 'published', approvedByUserId: (req as any).user?.userId },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to publish article', details: err.message });
  }
});

// ── Training Assets ─────────────────────────────────────────────────────────

// GET /api/field-manual/assets — list approved training assets
fieldManualRoutes.get('/assets', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { category, type } = req.query as Record<string, string>;
    const assets = await prisma.trainingAsset.findMany({
      where: {
        approvedForTraining: true,
        OR: [
          { companyId: null },
          { companyId: companyId ?? undefined },
        ],
        ...(category ? { category } : {}),
        ...(type ? { sourceType: type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assets', details: err.message });
  }
});

// POST /api/field-manual/assets — admin/manager: import a new asset (pending approval)
fieldManualRoutes.post('/assets', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const {
      title, description, sourceType, sourceUrl, embedUrl, thumbnailUrl,
      attribution, copyrightNote, category, tagsJson, metadataJson,
    } = req.body;
    const asset = await prisma.trainingAsset.create({
      data: {
        companyId, title, description, sourceType, sourceUrl,
        embedUrl, thumbnailUrl, attribution, copyrightNote,
        category, tagsJson, metadataJson,
        createdByUserId: (req as any).user?.userId,
        approvedForTraining: isAdmin(req), // auto-approve if admin
      },
    });
    res.status(201).json(asset);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to import asset', details: err.message });
  }
});

// PUT /api/field-manual/assets/:id/approve — admin only
fieldManualRoutes.put('/assets/:id/approve', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const updated = await prisma.trainingAsset.update({
      where: { id: req.params.id },
      data: { approvedForTraining: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve asset', details: err.message });
  }
});

// ── Feature Links ─────────────────────────────────────────────────────────────
// Maps UI feature keys to manual articles for contextual HelpLink resolution.

// GET /api/field-manual/feature-links — all links visible to caller's company
fieldManualRoutes.get('/feature-links', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const links = await prisma.manualFeatureLink.findMany({
      where: { OR: [{ companyId: null }, { companyId: companyId ?? undefined }] },
      orderBy: { featureKey: 'asc' },
    });
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feature links', details: err.message });
  }
});

// GET /api/field-manual/help?featureKey=... — resolve one help link
fieldManualRoutes.get('/help', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const featureKey = String(req.query.featureKey ?? '');
    if (!featureKey) return res.status(400).json({ error: 'featureKey required' });

    const link = await prisma.manualFeatureLink.findFirst({
      where: {
        featureKey,
        OR: [{ companyId: null }, { companyId: companyId ?? undefined }],
      },
    });
    if (!link) return res.status(404).json({ error: 'No help link for this feature' });

    // If it maps to an article, include summary so the client can display a tooltip
    let article = null;
    if (link.articleSlug) {
      article = await prisma.fieldManualArticle.findFirst({
        where: {
          slug: link.articleSlug,
          status: 'published',
          OR: [{ companyId: null }, { companyId: companyId ?? undefined }],
        },
        select: { id: true, slug: true, title: true, summary: true },
      });
    }

    res.json({ link, article });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve help link', details: err.message });
  }
});

// POST /api/field-manual/feature-links — admin only: create/update mapping
fieldManualRoutes.post('/feature-links', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const companyId = getCompanyId(req);
    const { featureKey, routePattern, componentKey, articleSlug, lessonId, validationRuleId, helpLabel } = req.body;

    const link = await prisma.manualFeatureLink.upsert({
      where: { featureKey_companyId: { featureKey, companyId: companyId ?? '' } },
      create: { companyId, featureKey, routePattern, componentKey, articleSlug, lessonId, validationRuleId, helpLabel },
      update: { routePattern, componentKey, articleSlug, lessonId, validationRuleId, helpLabel },
    });
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upsert feature link', details: err.message });
  }
});

// GET /api/field-manual/search?q=... — full-text search across published articles
fieldManualRoutes.get('/search', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);

    const articles = await prisma.fieldManualArticle.findMany({
      where: {
        status: 'published',
        OR: [
          { companyId: null },
          { companyId: companyId ?? undefined },
        ],
        AND: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { bodyMarkdown: { contains: q, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        id: true, slug: true, title: true, summary: true,
        tagsJson: true, updatedAt: true,
        category: { select: { slug: true, title: true, icon: true } },
      },
      orderBy: { title: 'asc' },
      take: 40,
    });
    res.json(articles);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

