// ─────────────────────────────────────────────────────────────────────────────
// manualCache.ts — Offline field manual + training text cache
//
// Caches:
//   - Field manual categories + articles (text only)
//   - Training paths, lessons (text + quiz questions)
//   - Training progress (queued to sync_outbox when offline)
//
// YouTube video URLs are stored with requiresInternet=true — the UI shows
// "Video requires internet connection" instead of attempting playback.
//
// TTL: 7 days for static content, training progress always synced.
// ─────────────────────────────────────────────────────────────────────────────

import { getOfflineDb } from './offlineDb';
import { api } from '../utils/api';

const MANUAL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function setManualEntry(cacheType: string, entityId: string, data: any, requiresInternet = false): Promise<void> {
  const db = getOfflineDb();
  // Remove old version
  await db.field_manual_cache
    .where('entityId').equals(entityId)
    .and(e => e.cacheType === cacheType)
    .delete();
  await db.field_manual_cache.add({
    cacheType: cacheType as any,
    entityId,
    dataJson: JSON.stringify(data),
    requiresInternet,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + MANUAL_TTL_MS,
  });
}

async function getManualEntry(cacheType: string, entityId: string): Promise<any | null> {
  const db = getOfflineDb();
  const entry = await db.field_manual_cache
    .where('entityId').equals(entityId)
    .and(e => e.cacheType === cacheType)
    .first();
  if (!entry) return null;
  return JSON.parse(entry.dataJson);
}

async function getAllManualEntries(cacheType: string): Promise<any[]> {
  const db = getOfflineDb();
  const entries = await db.field_manual_cache
    .where('cacheType').equals(cacheType)
    .filter(e => !e.requiresInternet)
    .toArray();
  return entries.map(e => {
    try { return JSON.parse(e.dataJson); } catch { return null; }
  }).filter(Boolean);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function refreshManualCache(): Promise<void> {
  try {
    // Field manual categories
    const categories = await api.get('/field-manual/categories').catch(() => null);
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await setManualEntry('category', cat.id, cat);
      }
    }

    // Field manual articles
    const articles = await api.get('/field-manual/articles').catch(() => null);
    if (Array.isArray(articles)) {
      for (const article of articles) {
        // YouTube videos — store reference but mark as requiring internet
        const hasVideo = Boolean(article.videoUrl || article.youtubeUrl);
        await setManualEntry('article', article.id, {
          ...article,
          // Strip video URL from cached content — only text available offline
          _offlineNote: hasVideo ? 'Video requires internet connection' : undefined,
        }, hasVideo);
      }
    }

    // Training paths
    const paths = await api.get('/training/paths').catch(() => null);
    if (Array.isArray(paths)) {
      for (const path of paths) {
        await setManualEntry('training_path', path.id, path);
      }
    }

    // Training lessons
    if (Array.isArray(paths)) {
      for (const path of paths) {
        const pathLessons = await api.get(`/training/paths/${path.id}/lessons`).catch(() => null);
        if (Array.isArray(pathLessons)) {
          for (const lesson of pathLessons) {
            const hasVideo = Boolean(lesson.videoUrl || lesson.youtubeUrl);
            await setManualEntry('training_lesson', lesson.id, {
              ...lesson,
              _offlineNote: hasVideo ? 'Video requires internet connection' : undefined,
            }, false); // store even if has video so text/quiz still works offline
          }
        }
      }
    }
  } catch (err) {
    console.warn('[manualCache] Refresh failed — using existing cache', err);
  }
}

export async function getCachedManualArticles(): Promise<any[]> {
  return getAllManualEntries('article');
}

export async function getCachedManualCategories(): Promise<any[]> {
  return getAllManualEntries('category');
}

export async function getCachedTrainingPaths(): Promise<any[]> {
  return getAllManualEntries('training_path');
}

export async function getCachedTrainingLesson(lessonId: string): Promise<any | null> {
  return getManualEntry('training_lesson', lessonId);
}

export async function isManualCacheAvailable(): Promise<boolean> {
  const db = getOfflineDb();
  const count = await db.field_manual_cache.count();
  return count > 0;
}
