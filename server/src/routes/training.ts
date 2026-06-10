/**
 * Training Mode API — /api/training
 *
 * Serves TrainingPaths, TrainingLessons, TrainingProgress, Questions, and Reviews.
 * Role access:
 *  - Any authenticated user: read paths/lessons, save their own progress
 *  - Manager/Admin: view all users' progress, assign paths
 *  - Admin: create/edit paths and lessons, manage question bank
 */
import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

export const trainingRoutes = Router();
trainingRoutes.use(requireAuth);

function getCompanyId(req: any): string | null { return (req as any).user?.companyId ?? null; }
function getRole(req: any): string { return (req as any).user?.role ?? 'sales_rep'; }
function isManagerOrAdmin(req: any): boolean {
  const r = getRole(req);
  return r === 'admin' || r === 'manager' || r === 'sales_manager';
}
function isAdmin(req: any): boolean { return getRole(req) === 'admin'; }

// ── Paths ────────────────────────────────────────────────────────────────────

// GET /api/training/paths
trainingRoutes.get('/paths', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.userId;
    const paths = await prisma.trainingPath.findMany({
      where: {
        active: true,
        OR: [{ companyId: null }, { companyId: companyId ?? undefined }],
      },
      include: {
        lessons: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { lessons: { where: { active: true } } } },
        progress: userId ? { where: { userId, lessonId: null }, select: { status: true, score: true } } : false,
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(paths);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch training paths', details: err.message });
  }
});

// GET /api/training/paths/:id
trainingRoutes.get('/paths/:id', async (req, res) => {
  try {
    const path = await prisma.trainingPath.findUnique({
      where: { id: req.params.id },
      include: {
        lessons: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!path) return res.status(404).json({ error: 'Training path not found' });
    res.json(path);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch path', details: err.message });
  }
});

// POST /api/training/paths — admin only
trainingRoutes.post('/paths', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const companyId = getCompanyId(req);
    const { slug, title, description, roleTarget, required, sortOrder, iconEmoji, estimatedMinutes } = req.body;
    const path = await prisma.trainingPath.create({
      data: { slug, title, description, roleTarget: roleTarget ?? 'sales_rep', required: required ?? false,
        sortOrder: sortOrder ?? 0, iconEmoji, estimatedMinutes: estimatedMinutes ?? 30, companyId },
    });
    res.status(201).json(path);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create training path', details: err.message });
  }
});

// ── Lessons ───────────────────────────────────────────────────────────────────

// GET /api/training/paths/:pathId/lessons
trainingRoutes.get('/paths/:pathId/lessons', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const lessons = await prisma.trainingLesson.findMany({
      where: { trainingPathId: req.params.pathId, active: true },
      include: {
        progress: { where: { userId }, select: { status: true, score: true, completedAt: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(lessons);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch lessons', details: err.message });
  }
});

// GET /api/training/lessons/:id — full lesson with questions
trainingRoutes.get('/lessons/:id', async (req, res) => {
  try {
    const lesson = await prisma.trainingLesson.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { where: { active: true }, orderBy: { createdAt: 'asc' } },
        path: { select: { title: true, slug: true } },
      },
    });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch lesson', details: err.message });
  }
});

// POST /api/training/lessons — admin only
trainingRoutes.post('/lessons', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const companyId = getCompanyId(req);
    const { trainingPathId, title, summary, lessonType, bodyMarkdown,
      assetIdsJson, quizJson, scenarioJson, sortOrder, passingScore, durationMinutes } = req.body;
    const lesson = await prisma.trainingLesson.create({
      data: { companyId, trainingPathId, title, summary, lessonType: lessonType ?? 'article',
        bodyMarkdown, assetIdsJson, quizJson, scenarioJson,
        sortOrder: sortOrder ?? 0, passingScore: passingScore ?? 70, durationMinutes: durationMinutes ?? 5 },
    });
    res.status(201).json(lesson);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create lesson', details: err.message });
  }
});

// ── Progress ──────────────────────────────────────────────────────────────────

// GET /api/training/progress/me — my progress
trainingRoutes.get('/progress/me', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const progress = await prisma.trainingProgress.findMany({
      where: { userId, OR: [{ companyId: null }, { companyId: companyId ?? undefined }] },
      include: { path: { select: { title: true, slug: true } } },
    });
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch progress', details: err.message });
  }
});

// GET /api/training/progress/user/:userId — manager view of a rep's progress
trainingRoutes.get('/progress/user/:userId', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const progress = await prisma.trainingProgress.findMany({
      where: {
        userId: req.params.userId,
        OR: [{ companyId: null }, { companyId: companyId ?? undefined }],
      },
      include: {
        path: { select: { title: true, slug: true } },
        lesson: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user progress', details: err.message });
  }
});

// GET /api/training/progress/company — manager view of all reps
trainingRoutes.get('/progress/company', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const progress = await prisma.trainingProgress.findMany({
      where: { OR: [{ companyId: null }, { companyId: companyId ?? undefined }] },
      include: {
        path: { select: { title: true, slug: true, required: true } },
        lesson: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch company progress', details: err.message });
  }
});

// POST /api/training/progress — save/update lesson progress
trainingRoutes.post('/progress', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const { trainingPathId, lessonId, status, score, timeSpentSec, metadataJson } = req.body;

    if (!trainingPathId) return res.status(400).json({ error: 'trainingPathId required' });

    // Upsert: one record per user+path+lesson combo
    const existing = await prisma.trainingProgress.findFirst({
      where: { userId, trainingPathId, lessonId: lessonId ?? null },
    });

    const isPassed = status === 'passed' || status === 'completed';
    const data = {
      userId, companyId, trainingPathId, lessonId: lessonId ?? null,
      status, score: score ?? null, timeSpentSec: timeSpentSec ?? 0,
      metadataJson,
      attempts: existing ? existing.attempts + 1 : 1,
      completedAt: isPassed ? new Date() : null,
    };

    const progress = existing
      ? await prisma.trainingProgress.update({ where: { id: existing.id }, data })
      : await prisma.trainingProgress.create({ data });

    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save progress', details: err.message });
  }
});

// ── Questions ─────────────────────────────────────────────────────────────────

// GET /api/training/questions?lessonId=...
trainingRoutes.get('/questions', async (req, res) => {
  try {
    const { lessonId, tag, difficulty } = req.query as Record<string, string>;
    const companyId = getCompanyId(req);
    const questions = await prisma.trainingQuestionBank.findMany({
      where: {
        active: true,
        OR: [{ companyId: null }, { companyId: companyId ?? undefined }],
        ...(lessonId ? { lessonId } : {}),
        ...(difficulty ? { difficulty } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(questions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch questions', details: err.message });
  }
});

// POST /api/training/questions — admin only
trainingRoutes.post('/questions', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin required' });
  try {
    const companyId = getCompanyId(req);
    const { lessonId, questionType, questionText, imageAssetId, videoAssetId,
      optionsJson, correctAnswerJson, explanationMarkdown, difficulty, tagsJson } = req.body;
    const q = await prisma.trainingQuestionBank.create({
      data: { companyId, lessonId, questionType: questionType ?? 'multiple_choice', questionText,
        imageAssetId, videoAssetId, optionsJson, correctAnswerJson,
        explanationMarkdown, difficulty: difficulty ?? 'intermediate', tagsJson },
    });
    res.status(201).json(q);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create question', details: err.message });
  }
});

// ── Manager Reviews ────────────────────────────────────────────────────────────

// GET /api/training/reviews — manager view of pending reviews
trainingRoutes.get('/reviews', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const companyId = getCompanyId(req);
    const reviews = await prisma.managerTrainingReview.findMany({
      where: { OR: [{ companyId: null }, { companyId: companyId ?? undefined }] },
      include: { path: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
});

// POST /api/training/reviews — request manager review on completion
trainingRoutes.post('/reviews', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    const { trainingPathId, reviewerUserId, notes } = req.body;
    const review = await prisma.managerTrainingReview.create({
      data: { companyId, userId, trainingPathId,
        reviewerUserId: reviewerUserId ?? null, notes, status: 'pending' },
    });
    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create review request', details: err.message });
  }
});

// PUT /api/training/reviews/:id — manager approve/reject
trainingRoutes.put('/reviews/:id', async (req, res) => {
  if (!isManagerOrAdmin(req)) return res.status(403).json({ error: 'Manager or Admin required' });
  try {
    const { status, notes, score } = req.body;
    const updated = await prisma.managerTrainingReview.update({
      where: { id: req.params.id },
      data: {
        reviewerUserId: (req as any).user?.userId,
        status, notes, score,
        approvedAt: status === 'approved' ? new Date() : null,
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update review', details: err.message });
  }
});
