/**
 * ════════════════════════════════════════════════════════════════
 * Order Form Generation Service — Multi-Tenant, Supabase-Backed
 * ════════════════════════════════════════════════════════════════
 *
 * Full server-side order form generation pipeline:
 *   1. Auth + tenant verification
 *   2. Sketch export via sketchExport.service.ts
 *   3. Download sketch PNG buffer from Supabase Storage
 *   4. Load appointment/customer/opening data from DB
 *   5. Generate filled XLSX workbook (sketch embedded from buffer)
 *   6. Generate PDF via pdfService.ts
 *   7. Upload XLSX + PDF to Supabase Storage
 *   8. Create GeneratedDocument DB record
 *   9. Return document metadata + signed URLs
 *
 * Storage paths:
 *   XLSX: generated-documents / company/{companyId}/appointments/{apptId}/documents/order-form-v{n}.xlsx
 *   PDF:  generated-documents / company/{companyId}/appointments/{apptId}/documents/order-form-v{n}.pdf
 *
 * Tenant isolation:
 *   - companyId always from auth JWT, never from request body
 *   - Appointment ownership verified before generation
 *   - Storage paths include companyId as first segment
 *   - GeneratedDocument row scoped by companyId + appointmentId
 * ════════════════════════════════════════════════════════════════
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { prisma } from '../index.js';
import { generateWorkbookBuffer, type AppointmentExportData, type OpeningData } from '../workbookEngine.js';
// pdfService removed as per requirements
import {
  uploadBuffer,
  getSignedUrl,
  isStorageConfigured,
} from './storageService.js';
import { BUCKETS, uploadFile } from './storageService.js';
import { WINDOW_WORLD_SALES_EMAIL } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerateOrderFormOptions {
  appointmentId: string;
  companyId: string;       // from auth JWT
  userId: string;          // from auth JWT
  documentType?: 'order_form' | 'contract' | 'proposal';
  forceRegenerate?: boolean;
}

export interface GenerateOrderFormResult {
  documentId: string;
  documentType: string;
  version: number;
  status: string;
  xlsxSignedUrl: string | null;
  pdfSignedUrl: string | null;
  fileName: string;
  sketchExportId: string | null;
  /** XLSX buffer — also returned for immediate HTTP download */
  xlsxBuffer: Buffer | null;
  /** PDF buffer — returned for immediate HTTP download */
  pdfBuffer: Buffer | null;
  generatedAt?: Date;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function generateOrderForm(
  opts: GenerateOrderFormOptions
): Promise<GenerateOrderFormResult> {
  const { appointmentId, companyId, userId, documentType = 'order_form', forceRegenerate = false } = opts;

  // ── 1. Fetch unified order data adapter ────────────────────────────────────
  const { buildWindowWorldOrderData } = await import('../workbookEngine.js');
  const { exportData, activeMarkers } = await buildWindowWorldOrderData(appointmentId, companyId);

  // ── 2. Get sketch image ────────────────────────────────────────────────────
  // Use buildComposedSketchImage which composes the authoritative export image:
  // It uses the client-uploaded map if available, then forcefully draws
  // the latest active markers on top to guarantee order form accuracy.
  let sketchExportId: string | null = null;
  let sketchBuffer: Buffer | null = null;

  try {
    const { buildComposedSketchImage } = await import('./sketchRenderer.js');
    const pngBuffer = await buildComposedSketchImage(exportData, activeMarkers, appointmentId, companyId);
    
    if (pngBuffer) {
      sketchBuffer = pngBuffer;
      exportData.sketchImageBuffer = sketchBuffer;
      console.log(`[OrderFormGeneration] Generated authoritative sketch image for ${appointmentId}, size=${pngBuffer.length}`);
    } else {
      throw new Error('buildComposedSketchImage returned null');
    }
  } catch (sketchErr) {
    console.warn('[OrderFormGeneration] Sketch retrieval/render failed, continuing without sketch:', sketchErr);
    if (activeMarkers && activeMarkers.length > 0) {
      throw new Error('[OrderFormGeneration] Failed to render sketch markers. Cannot generate document with missing sketch data.');
    }
  }

  // ── 3. Determine next version number ─────────────────────────────────────
  const latestDoc = await prisma.generatedDocument.findFirst({
    where: { appointmentId, companyId, documentType },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latestDoc?.version ?? 0) + 1;

  // ── 4. Generate XLSX buffer ───────────────────────────────────────────────
  let xlsxBuffer: Buffer | null = null;
  try {
    xlsxBuffer = await generateWorkbookBuffer(exportData);
  } catch (xlsxErr) {
    console.error('[OrderFormGeneration] XLSX generation failed:', xlsxErr);
  }

  // ── 6. Generate PDF buffer (REMOVED) ──────────────────────────────────────
  let pdfBuffer: null = null;
  // CRITICAL REQUIREMENT CHANGE: Stop generating the custom simplified PDF.
  // The primary output should be the filled editable Excel file (.xlsx)
  // based on the real Window World Excel workbook template.

  // ── 7. Upload to Supabase Storage (or skip if not configured) ─────────────
  const baseStoragePath = `company/${companyId}/appointments/${appointmentId}/documents`;
  const xlsxFilename = `${documentType}-v${nextVersion}.xlsx`;
  const xlsxPath = `${baseStoragePath}/${xlsxFilename}`;

  let xlsxStoragePath: string | null = null;
  let pdfStoragePath:  string | null = null;
  let xlsxSignedUrl:   string | null = null;
  let pdfSignedUrl:    string | null = null;

  if (isStorageConfigured()) {
    if (xlsxBuffer) {
      const { path: up, error } = await uploadBuffer(
        BUCKETS.GENERATED_DOCUMENTS, xlsxPath, xlsxBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      if (!error && up) {
        xlsxStoragePath = up || xlsxPath;
        xlsxSignedUrl = await getSignedUrl(BUCKETS.GENERATED_DOCUMENTS, xlsxStoragePath);
      } else {
        console.error('[OrderFormGeneration] XLSX upload failed:', error);
      }
    }
  } else {
    console.warn('[OrderFormGeneration] Supabase Storage not configured — documents NOT persisted to cloud storage');
  }

  // ── 8. Create GeneratedDocument DB record ────────────────────────────────
  const docStatus = (xlsxStoragePath || pdfStoragePath) ? 'ready'
    : isStorageConfigured() ? 'failed'
    : 'ready'; // local-only is "ready" for dev purposes

  const docRecord = await prisma.generatedDocument.create({
    data: {
      companyId,
      appointmentId,
      customerId: exportData.pricing?.customerId || 'unknown',
      createdByUserId: userId,
      documentType,
      status: docStatus,
      storageBucket: BUCKETS.GENERATED_DOCUMENTS,
      storagePath: xlsxStoragePath || null,
      xlsxStoragePath: xlsxStoragePath || null,
      pdfStoragePath:  null,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: xlsxFilename,
      version: nextVersion,
      sourceSketchExportId: sketchExportId || null,
    },
  });

  return {
    documentId: docRecord.id,
    documentType,
    version: nextVersion,
    status: docStatus,
    xlsxSignedUrl,
    pdfSignedUrl,
    fileName: xlsxFilename,
    sketchExportId,
    xlsxBuffer,
    pdfBuffer,
    generatedAt: docRecord.createdAt,
  };
}
