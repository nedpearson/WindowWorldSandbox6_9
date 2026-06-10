/**
 * ════════════════════════════════════════════════════════════════
 * Window World Assistant — Storage Service
 * ════════════════════════════════════════════════════════════════
 *
 * Wraps Supabase Storage for all server-side file operations.
 * Uses the SERVICE ROLE key — NEVER expose this key to the client.
 *
 * Required environment variables:
 *   SUPABASE_URL              – e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY – service_role JWT (server-side only)
 *
 * Optional (for signed URL expiry defaults):
 *   STORAGE_SIGNED_URL_EXPIRY – seconds (default: 3600 = 1 hour)
 *
 * Storage path conventions:
 *   opening-photos      → {companyId}/{appointmentId}/{openingId}_{filename}
 *   visualizer-images   → {companyId}/{appointmentId}/{suffix}_{timestamp}.png
 *   generated-documents → {companyId}/{appointmentId}/{exportType}_{timestamp}.pdf
 *   contract-templates  → global/{filename}  OR  {companyId}/{filename}
 *   product-images      → {category}/{productId}.{ext}
 * ════════════════════════════════════════════════════════════════
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import ws from 'ws';

// ── Singleton Supabase client (service role) ─────────────────────────────────
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[StorageService] Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set both in your .env file before using cloud storage features.'
    );
  }

  _client = createClient(url, key, {
    auth: {
      // Service role bypasses RLS — safe only on the server
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Required for Node 20 environments (like Cloud Run or Alpine 20)
      fetch: fetch,
    },
    realtime: {
      transport: ws as any,
    }
  });

  return _client;
}

// ── Default signed-URL expiry: 1 hour (or from env) ─────────────────────────
const DEFAULT_EXPIRY = parseInt(process.env.STORAGE_SIGNED_URL_EXPIRY ?? '3600', 10);

// ── Bucket name constants ────────────────────────────────────────────────────
export const BUCKETS = {
  OPENING_PHOTOS:       'opening-photos',
  VISUALIZER_IMAGES:    'visualizer-images',
  GENERATED_DOCUMENTS:  'generated-documents',
  CONTRACT_TEMPLATES:   'contract-templates',
  PRODUCT_IMAGES:       'product-images',
  SKETCH_EXPORTS:       'sketch-exports',      // NEW: rendered sketch PNGs
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

// ─────────────────────────────────────────────────────────────────────────────
// uploadFile
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Upload a base64-encoded file to a Supabase Storage bucket.
 *
 * @param bucket      Bucket name (use BUCKETS.* constants)
 * @param path        Storage path, e.g. "{companyId}/{appointmentId}/{filename}"
 * @param base64Data  Raw base64 string (no data-URI prefix)
 * @param contentType MIME type, e.g. "image/jpeg"
 * @returns           { path, error } — path is the stored object path on success
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  base64Data: string,
  contentType: string
): Promise<{ path: string; error: any }> {
  try {
    const client = getClient();

    // Convert base64 → binary Buffer → Uint8Array for Supabase
    const buffer = Buffer.from(base64Data, 'base64');
    const uint8 = new Uint8Array(buffer);

    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, uint8, {
        contentType,
        upsert: true,       // overwrite if same path (idempotent retries)
        duplex: 'half',
      });

    if (error) {
      console.error(`[StorageService] uploadFile error — bucket=${bucket} path=${path}`, error);
      return { path: '', error };
    }

    return { path: data.path, error: null };
  } catch (err: any) {
    console.error('[StorageService] uploadFile threw:', err);
    return { path: '', error: err };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadBuffer — upload a raw Buffer (instead of base64)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Upload a raw Buffer to a Supabase Storage bucket.
 * Preferred over uploadFile() when you already have a Buffer in memory
 * (avoids base64 encode/decode round-trip).
 *
 * @param bucket      Bucket name (use BUCKETS.* constants)
 * @param storagePath Storage path
 * @param buffer      Raw data Buffer
 * @param contentType MIME type, e.g. "image/png"
 * @returns           { path, error }
 */
export async function uploadBuffer(
  bucket: BucketName,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ path: string; error: any }> {
  try {
    const client = getClient();
    const uint8 = new Uint8Array(buffer);
    const { data, error } = await client.storage
      .from(bucket)
      .upload(storagePath, uint8, { contentType, upsert: true, duplex: 'half' });
    if (error) {
      console.error(`[StorageService] uploadBuffer error — bucket=${bucket} path=${storagePath}`, error);
      return { path: '', error };
    }
    return { path: data.path, error: null };
  } catch (err: any) {
    console.error('[StorageService] uploadBuffer threw:', err);
    return { path: '', error: err };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// downloadFileAsBuffer — download from Storage as Buffer
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Download an object from Supabase Storage as a Buffer.
 * Used by orderFormGeneration to download the sketch PNG without a temp file.
 *
 * @param bucket  Bucket name
 * @param path    Object path within the bucket
 * @returns       Buffer on success, null on error
 */
export async function downloadFileAsBuffer(
  bucket: BucketName,
  storagePath: string
): Promise<Buffer | null> {
  try {
    const client = getClient();
    const { data, error } = await client.storage.from(bucket).download(storagePath);
    if (error || !data) {
      console.error(`[StorageService] downloadFileAsBuffer error — bucket=${bucket} path=${storagePath}`, error);
      return null;
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error('[StorageService] downloadFileAsBuffer threw:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getSignedUrl
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generate a time-limited signed URL for a private bucket object.
 *
 * @param bucket    Bucket name
 * @param path      Object path within the bucket
 * @param expiresIn Seconds until URL expires (default: STORAGE_SIGNED_URL_EXPIRY env or 3600)
 * @returns         Signed URL string, or null on error
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = DEFAULT_EXPIRY
): Promise<string | null> {
  try {
    const client = getClient();

    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error(`[StorageService] getSignedUrl error — bucket=${bucket} path=${path}`, error);
      return null;
    }

    return data.signedUrl;
  } catch (err: any) {
    console.error('[StorageService] getSignedUrl threw:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteFile
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Delete an object from a Supabase Storage bucket.
 *
 * @param bucket  Bucket name
 * @param path    Object path within the bucket
 * @returns       true on success, false on error
 */
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(`[StorageService] deleteFile error — bucket=${bucket} path=${path}`, error);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[StorageService] deleteFile threw:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadOpeningPhoto (high-level helper)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Upload an opening measurement photo to Supabase Storage.
 * Path format: {companyId}/{appointmentId}/{timestamp}_{random}.jpg
 *
 * @param companyId     Company UUID (used as top-level path scope)
 * @param appointmentId Appointment UUID
 * @param base64        Raw base64 image data (no data-URI prefix)
 * @param openingId     Optional opening ID to include in filename
 * @returns             { path, url } — url is a 1-hour signed URL or null
 */
export async function uploadOpeningPhoto(
  companyId: string,
  appointmentId: string,
  base64: string,
  openingId?: string
): Promise<{ path: string; url: string | null }> {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const prefix = openingId ? `${openingId}_` : '';
  const filename = `${prefix}${timestamp}_${rand}.jpg`;
  const storagePath = `${companyId}/${appointmentId}/${filename}`;

  const { path, error } = await uploadFile(
    BUCKETS.OPENING_PHOTOS,
    storagePath,
    base64,
    'image/jpeg'
  );

  if (error || !path) {
    console.error('[StorageService] uploadOpeningPhoto failed:', error);
    return { path: storagePath, url: null };
  }

  const url = await getSignedUrl(BUCKETS.OPENING_PHOTOS, path);
  return { path, url };
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadVisualizerImage (high-level helper)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Save an AI-generated visualizer image to cloud storage.
 * Path format: {companyId}/{appointmentId}/{suffix}_{timestamp}.png
 *
 * @param companyId     Company UUID
 * @param appointmentId Appointment UUID
 * @param base64        Raw base64 PNG data
 * @param suffix        Label for the image type, e.g. "preview" or "original"
 * @returns             { path, url }
 */
export async function uploadVisualizerImage(
  companyId: string,
  appointmentId: string,
  base64: string,
  suffix: string = 'preview'
): Promise<{ path: string; url: string | null }> {
  const timestamp = Date.now();
  const filename = `${suffix}_${timestamp}.png`;
  const storagePath = `${companyId}/${appointmentId}/${filename}`;

  const { path, error } = await uploadFile(
    BUCKETS.VISUALIZER_IMAGES,
    storagePath,
    base64,
    'image/png'
  );

  if (error || !path) {
    console.error('[StorageService] uploadVisualizerImage failed:', error);
    return { path: storagePath, url: null };
  }

  const url = await getSignedUrl(BUCKETS.VISUALIZER_IMAGES, path);
  return { path, url };
}

// ─────────────────────────────────────────────────────────────────────────────
// isConfigured — safe guard for graceful degradation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns true if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both set.
 * Use this to gracefully fall back to local file storage when Supabase is not
 * configured (e.g. local development without a Supabase project).
 */
export function isStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
