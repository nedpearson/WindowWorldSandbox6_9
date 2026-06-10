// ═══════════════════════════════════════════════════════════
// Photo Organizer — Hierarchical photo organization
// Groups photos by customer/appointment/opening, generates
// thumbnails, tracks storage usage, and migrates legacy
// localStorage analysis data to IndexedDB.
// ═══════════════════════════════════════════════════════════

import { getOfflineDb } from '../lib/offlineDb';

// ── Types ────────────────────────────────────────────────

export interface PhotoRecord {
  localId: string;
  appointmentId: string;
  openingId?: string;
  photoType: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  cloudUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

export interface PhotoGalleryData {
  appointmentId: string;
  totalCount: number;
  byOpening: Record<string, { openingNumber?: number; photos: PhotoRecord[] }>;
  unassigned: PhotoRecord[];
}

// ── Helpers ──────────────────────────────────────────────

const UNASSIGNED_KEY = '_unassigned';

/**
 * Map a raw PhotoBlobQueueItem to the lighter PhotoRecord shape.
 * Strips the heavy `blob` field so callers can hold arrays in state.
 */
function toPhotoRecord(item: any): PhotoRecord {
  return {
    localId: item.localId,
    appointmentId: item.appointmentId,
    openingId: item.openingId || undefined,
    photoType: item.photoType,
    fileName: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    status: item.status,
    cloudUrl: item.cloudUrl || undefined,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
  };
}

/**
 * Format byte count into a human-readable string (KB / MB / GB).
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── getPhotosByOpening ───────────────────────────────────

/**
 * Returns photos for an appointment grouped by openingId.
 * Photos without an openingId are placed under the `_unassigned` key.
 */
export async function getPhotosByOpening(
  appointmentId: string
): Promise<Record<string, PhotoRecord[]>> {
  const db = getOfflineDb();
  const items = await db.photo_blob_queue
    .where('appointmentId')
    .equals(appointmentId)
    .toArray();

  const grouped: Record<string, PhotoRecord[]> = {};

  for (const item of items) {
    const key = item.openingId || UNASSIGNED_KEY;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(toPhotoRecord(item));
  }

  return grouped;
}

// ── getPhotoGallery ──────────────────────────────────────

/**
 * Returns a structured gallery object for an appointment, with photos
 * organized by opening and a separate unassigned bucket.
 */
export async function getPhotoGallery(
  appointmentId: string
): Promise<PhotoGalleryData> {
  const grouped = await getPhotosByOpening(appointmentId);

  const byOpening: Record<string, { openingNumber?: number; photos: PhotoRecord[] }> = {};
  let unassigned: PhotoRecord[] = [];

  // Track opening number assignment (simple numeric sort by key order)
  let openingIdx = 1;

  for (const [key, photos] of Object.entries(grouped)) {
    if (key === UNASSIGNED_KEY) {
      unassigned = photos;
    } else {
      byOpening[key] = {
        openingNumber: openingIdx++,
        photos,
      };
    }
  }

  const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return {
    appointmentId,
    totalCount,
    byOpening,
    unassigned,
  };
}

// ── assignPhotoToOpening ─────────────────────────────────

/**
 * Updates a photo_blob_queue record to link a photo to an opening.
 */
export async function assignPhotoToOpening(
  localId: string,
  openingId: string
): Promise<void> {
  const db = getOfflineDb();
  const item = await db.photo_blob_queue
    .where('localId')
    .equals(localId)
    .first();

  if (item?.id !== undefined) {
    await db.photo_blob_queue.update(item.id, { openingId });
  }
}

// ── getPhotoThumbnail ────────────────────────────────────

/**
 * Generates a data URL thumbnail from a Blob by downscaling via canvas.
 * @param blob   The source image blob.
 * @param maxSize  Maximum dimension (width or height) in pixels. Default 150.
 * @returns A data:image/jpeg;base64,... string.
 */
export async function getPhotoThumbnail(
  blob: Blob,
  maxSize: number = 150
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const { width, height } = img;
        const scale = Math.min(maxSize / width, maxSize / height, 1);
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = url;
  });
}

// ── getTotalStorageUsage ─────────────────────────────────

/**
 * Returns storage stats for all photos, optionally filtered by appointmentId.
 */
export async function getTotalStorageUsage(
  appointmentId?: string
): Promise<{ count: number; totalBytes: number; formattedSize: string }> {
  const db = getOfflineDb();

  let items;
  if (appointmentId) {
    items = await db.photo_blob_queue
      .where('appointmentId')
      .equals(appointmentId)
      .toArray();
  } else {
    items = await db.photo_blob_queue.toArray();
  }

  const totalBytes = items.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);

  return {
    count: items.length,
    totalBytes,
    formattedSize: formatBytes(totalBytes),
  };
}

// ── migrateLocalStorageAnalysis ──────────────────────────

/**
 * Migrates photo analysis data from localStorage key `wwa_photo_analysis`
 * to the IndexedDB `photo_analysis_results` table.
 * Returns the count of records migrated.
 */
export async function migrateLocalStorageAnalysis(): Promise<number> {
  const raw = localStorage.getItem('wwa_photo_analysis');
  if (!raw) return 0;

  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
  } catch {
    return 0;
  }

  const db = getOfflineDb();
  let migrated = 0;

  for (const entry of parsed) {
    if (!entry.photoId || !entry.appointmentId) continue;

    const existing = await db.photo_analysis_results
      .where('photoId')
      .equals(entry.photoId)
      .first();

    if (!existing) {
      await db.photo_analysis_results.put({
        id: entry.photoId,
        appointmentId: entry.appointmentId,
        photoId: entry.photoId,
        recognizedMaterialsJson: JSON.stringify(entry.recognizedMaterials || []),
        safetyHazardsJson: JSON.stringify(entry.safetyHazards || []),
        createdAt: entry.createdAt || Date.now(),
      });
      migrated++;
    }
  }

  // Remove from localStorage after successful migration
  if (migrated > 0) {
    localStorage.removeItem('wwa_photo_analysis');
  }

  return migrated;
}
