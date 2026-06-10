/**
 * ════════════════════════════════════════════════════════════════
 * Sketch Export Service — Multi-Tenant, Supabase-Backed
 * ════════════════════════════════════════════════════════════════
 *
 * Generates a sketch PNG from DB marker data and stores it in
 * Supabase Storage (sketch-exports bucket), then creates/updates
 * a SketchExport DB record.
 *
 * Storage path:
 *   sketch-exports / company/{companyId}/appointments/{appointmentId}/sketch/sketch-v{version}.png
 *
 * Tenant isolation:
 *   - companyId is ALWAYS derived server-side (from auth JWT)
 *   - Never trusted from client request body
 *   - Every query scoped by companyId + appointmentId
 *
 * Falls back to local disk (data/sketches/) when Supabase is not
 * configured (dev/CI environments). Logs a warning in that case.
 * ════════════════════════════════════════════════════════════════
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { prisma } from '../index.js';
import { generateSketchImage } from './sketchRenderer.js';
import {
  uploadBuffer,
  downloadFileAsBuffer,
  getSignedUrl,
  isStorageConfigured,
  BUCKETS,
} from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Local fallback directory (used only when Supabase is not configured)
const LOCAL_SKETCH_DIR = path.resolve(__dirname, '../../../data/sketches');

// ── Types ────────────────────────────────────────────────────────────────────

export interface SketchExportResult {
  sketchExportId: string;
  storagePath: string;
  storageBucket: string;
  version: number;
  /** Signed URL valid for 1 hour, or null if storage not configured */
  signedUrl: string | null;
  /** Local fallback path (only set when Supabase not configured) */
  localFallbackPath: string | null;
  /** Buffer of the PNG — always returned for in-memory use by order form generator */
  pngBuffer: Buffer;
  wasAlreadyCurrent: boolean;
}

export interface GenerateSketchExportOptions {
  appointmentId: string;
  companyId: string;       // derived from auth JWT, never from client body
  userId: string;          // derived from auth JWT
  elevation?: 'front' | 'rear' | 'left' | 'right' | 'garage' | 'other' | 'all';
  forceRegenerate?: boolean;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generate and store a sketch PNG export for an appointment.
 *
 * If a recent SketchExport already exists and forceRegenerate is false,
 * returns the existing one (downloading the PNG from Supabase if needed).
 *
 * Creates/increments a SketchExport DB row on each new generation.
 * Always returns pngBuffer for immediate use by the order form generator.
 */
export async function generateAndStoreSketchExport(
  opts: GenerateSketchExportOptions
): Promise<SketchExportResult> {
  const { appointmentId, companyId, userId, elevation = 'front', forceRegenerate = false } = opts;

  // ── 1. Verify appointment belongs to company ──────────────────────────────
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
    select: { id: true, companyId: true, updatedAt: true, customerId: true },
  });
  if (!appt) {
    throw new Error(`[SketchExport] Appointment ${appointmentId} not found for company ${companyId}`);
  }

  // ── 2. Try to use latest client-uploaded sketch (most authoritative source) ──
  // The client uploads a composite PNG of the actual canvas (strokes + markers + house outline).
  // This is always preferred over the simplified server-side renderer.
  if (!forceRegenerate) {
    const clientBuffer = await getLatestClientSketchBuffer(appointmentId, companyId);
    if (clientBuffer) {
      // Find the matching SketchExport record to return full metadata
      const existing = await prisma.sketchExport.findFirst({
        where: { appointmentId, companyId, sourceHash: 'client_upload' },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        const signedUrl = isStorageConfigured()
          ? await getSignedUrl(existing.storageBucket as any, existing.storagePath)
          : null;
        console.log(`[SketchExport] Using client-uploaded sketch for appointment ${appointmentId} (v${existing.version})`);
        return {
          sketchExportId: existing.id,
          storagePath: existing.storagePath,
          storageBucket: existing.storageBucket,
          version: existing.version,
          signedUrl,
          localFallbackPath: isStorageConfigured() ? null : existing.storagePath,
          pngBuffer: clientBuffer,
          wasAlreadyCurrent: true,
        };
      }
    }
  }

  // ── 3. Fallback: render sketch PNG from DB markers (simplified renderer) ──
  // This runs only when no client-uploaded canvas image exists.
  console.log(`[SketchExport] No client-uploaded sketch found for ${appointmentId} — falling back to DB marker renderer`);
  
  const { normalizeSketchForDocumentExport } = await import('./printSafeSketchRenderer.js');
  
  const sketch = await prisma.formSketch.findFirst({
    where: { appointmentId },
    include: {
      markers: {
        include: {
          links: {
            include: {
              opening: true
            }
          }
        }
      }
    }
  });

  const openings = await prisma.opening.findMany({
    where: { appointmentId, deletedAt: null }
  });

  const { activeMarkers } = normalizeSketchForDocumentExport(appt, sketch, openings);

  let pngBuffer = await generateSketchImage(appointmentId, 'all', activeMarkers);
  if (!pngBuffer) {
    // Generate a "no sketch" placeholder PNG
    pngBuffer = await generateSketchImage(appointmentId, 'all');
    if (!pngBuffer) {
      // Should never happen — generateSketchImage always returns a placeholder
      throw new Error('[SketchExport] Sketch renderer returned null even for placeholder');
    }
  }

  // ── 4. Determine version number ───────────────────────────────────────────
  const latestExport = await prisma.sketchExport.findFirst({
    where: { appointmentId, companyId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latestExport?.version ?? 0) + 1;

  // ── 5. Upload to Supabase Storage (or local fallback) ────────────────────
  const storageBucket = BUCKETS.SKETCH_EXPORTS;
  const storagePath = `company/${companyId}/appointments/${appointmentId}/sketch/sketch-v${nextVersion}.png`;
  let signedUrl: string | null = null;
  let localFallbackPath: string | null = null;

  if (isStorageConfigured()) {
    const { path: uploadedPath, error } = await uploadBuffer(
      storageBucket,
      storagePath,
      pngBuffer,
      'image/png'
    );
    if (error) {
      console.error('[SketchExport] Supabase upload failed:', error);
      // Fall through to local fallback
    } else {
      signedUrl = await getSignedUrl(storageBucket, uploadedPath || storagePath);
    }
  }

  if (!signedUrl) {
    // Local disk fallback (dev environments without Supabase, or on upload failure)
    console.warn('[SketchExport] Using local disk fallback — sketch will NOT be accessible on other devices');
    if (!fs.existsSync(LOCAL_SKETCH_DIR)) {
      fs.mkdirSync(LOCAL_SKETCH_DIR, { recursive: true });
    }
    const localPath = path.join(LOCAL_SKETCH_DIR, `${appointmentId}.png`);
    fs.writeFileSync(localPath, pngBuffer);
    localFallbackPath = localPath;
  }

  // ── 6. Create SketchExport DB row ─────────────────────────────────────────
  const sketchExportRecord = await prisma.sketchExport.create({
    data: {
      companyId,
      appointmentId,
      createdByUserId: userId,
      storageBucket,
      storagePath: localFallbackPath ?? storagePath,
      mimeType: 'image/png',
      widthPx: 800,
      heightPx: 500,
      version: nextVersion,
      sourceUpdatedAt: appt.updatedAt,
    },
  });

  return {
    sketchExportId: sketchExportRecord.id,
    storagePath: sketchExportRecord.storagePath,
    storageBucket,
    version: nextVersion,
    signedUrl,
    localFallbackPath,
    pngBuffer,
    wasAlreadyCurrent: false,
  };
}

/**
 * Get the latest client-uploaded sketch PNG buffer for an appointment.
 *
 * The client (SketchFieldPage) uploads a composite canvas screenshot
 * containing the actual hand-drawn strokes, house outline, and markers
 * via POST /api/exports/sketch/:appointmentId. This is the authoritative
 * source for document sketch images.
 *
 * Returns the PNG buffer, or null if no client upload exists.
 */
export async function getLatestClientSketchBuffer(
  appointmentId: string,
  companyId: string
): Promise<Buffer | null> {
  try {
    const existing = await prisma.sketchExport.findFirst({
      where: { appointmentId, companyId, sourceHash: 'client_upload' },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) return null;

    // Try to download from Supabase Storage
    if (isStorageConfigured()) {
      const buf = await downloadFileAsBuffer(existing.storageBucket as any, existing.storagePath);
      if (buf && buf.length > 100) {  // Sanity check: real PNGs are > 100 bytes
        return buf;
      }
    }

    // Try local fallback path
    if (existing.storagePath) {
      let resolvedPath = existing.storagePath;
      if (!fs.existsSync(resolvedPath)) {
        const filename = path.basename(existing.storagePath);
        const fallbackLocalPath = path.join(LOCAL_SKETCH_DIR, filename);
        if (fs.existsSync(fallbackLocalPath)) {
          resolvedPath = fallbackLocalPath;
        }
      }

      if (fs.existsSync(resolvedPath)) {
        const buf = fs.readFileSync(resolvedPath);
        if (buf && buf.length > 100) {
          return buf;
        }
      }
    }

    return null;
  } catch (err) {
    console.error('[SketchExport] getLatestClientSketchBuffer error:', err);
    return null;
  }
}

/**
 * Quick helper: generate sketch and return only the PNG buffer.
 * Used by workbookEngine when no storage is needed.
 */
export async function getSketchBuffer(
  appointmentId: string,
  companyId: string,
  userId: string
): Promise<Buffer | null> {
  try {
    const result = await generateAndStoreSketchExport({ appointmentId, companyId, userId });
    return result.pngBuffer;
  } catch {
    return generateSketchImage(appointmentId, 'front');
  }
}
