// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/photoQA.ts — Local photo metadata QA checks
//
// OFFLINE-SAFE: Checks local photo metadata only (photo count, sync status).
// Cloud AI analysis (surface detection, damage detection) is handled
// separately by intelligence.ts /analyze-opening-photo and is NOT called here.
//
// BOUNDARY RULE: Never auto-deletes or modifies photos.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding } from './types';

/** Simple djb2 hash — works with any Unicode string */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function makeId(appointmentId: string, key: string): string {
  return `phqa_${djb2Hash(`phqa:${appointmentId}:${key}`)}`;
}

export interface PhotoMeta {
  id: string;
  openingId?: string | null;
  openingNumber?: number | null;
  appointmentId: string;
  photoType: string; // 'exterior' | 'interior' | 'opening' | 'damage' | 'measurement' | 'other'
  syncStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  capturedAt?: number;
}

// ── Exterior/Interior Photo Presence ─────────────────────────────────────

export function checkAppointmentPhotoPresence(
  appointmentId: string,
  photos: PhotoMeta[],
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  const hasExterior = photos.some(p => p.photoType === 'exterior' && p.openingId == null);
  const hasInterior = photos.some(p => p.photoType === 'interior' && p.openingId == null);

  if (!hasExterior) {
    findings.push({
      id: makeId(appointmentId, 'exterior:missing'),
      severity: 'warning',
      category: 'photo',
      source: 'photo_qa',
      appointmentId,
      title: 'Missing exterior photo',
      message: 'No exterior photo of the home has been captured. Exterior photos document the job site, support damage claims, and are required for the final packet.',
      suggestedAction: 'Take an exterior photo of the home from the front before leaving the job site.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { photoType: 'exterior' },
    });
  }

  if (!hasInterior) {
    findings.push({
      id: makeId(appointmentId, 'interior:missing'),
      severity: 'info',
      category: 'photo',
      source: 'photo_qa',
      appointmentId,
      title: 'No interior photo captured',
      message: 'No interior photo has been taken. Interior photos help document existing conditions (sills, frames, trim damage).',
      suggestedAction: 'Capture an interior photo showing the existing windows and frames.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { photoType: 'interior' },
    });
  }

  return findings;
}

// ── Per-Opening Photo Check ───────────────────────────────────────────────

export function checkOpeningPhotoPresence(
  appointmentId: string,
  openings: { id: string; openingNumber?: number }[],
  photos: PhotoMeta[],
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  for (const op of openings) {
    const n = op.openingNumber ?? 0;
    const hasPhoto = photos.some(
      p => p.openingId === op.id || p.openingNumber === n,
    );
    if (!hasPhoto) {
      findings.push({
        id: makeId(appointmentId, `opening:${op.id}:missing`),
        severity: 'info',
        category: 'photo',
        source: 'photo_qa',
        appointmentId,
        openingId: op.id,
        openingNumber: n,
        title: `Opening ${n}: No photo`,
        message: `Opening ${n} has no photo. Window-level photos support measurement verification and condition documentation.`,
        suggestedAction: `Tap the 📷 Photos button for Opening ${n} and capture at least one photo.`,
        requiresApproval: false,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { openingNumber: n },
      });
    }
  }

  return findings;
}

// ── Photo Sync Status Check ───────────────────────────────────────────────

export function checkPhotoSyncStatus(
  appointmentId: string,
  photos: PhotoMeta[],
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  const failed = photos.filter(p => p.syncStatus === 'failed');
  const pending = photos.filter(p => p.syncStatus === 'pending' || p.syncStatus === 'uploading');

  if (failed.length > 0) {
    findings.push({
      id: makeId(appointmentId, `sync:failed:${failed.length}`),
      severity: 'blocking',
      category: 'photo',
      source: 'photo_qa',
      appointmentId,
      title: `${failed.length} photo upload${failed.length > 1 ? 's' : ''} failed`,
      message: `${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload. ` +
        `Final contract cannot be completed until all photos are successfully synced.`,
      suggestedAction: `Tap "Retry" on failed photo uploads before generating the contract.`,
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { failedIds: failed.map(p => p.id), count: failed.length },
    });
  }

  if (pending.length > 0) {
    findings.push({
      id: makeId(appointmentId, `sync:pending:${pending.length}`),
      severity: 'warning',
      category: 'photo',
      source: 'photo_qa',
      appointmentId,
      title: `${pending.length} photo${pending.length > 1 ? 's' : ''} pending upload`,
      message: `${pending.length} photo${pending.length > 1 ? 's' : ''} are queued for upload. ` +
        `They will sync when a stable internet connection is available.`,
      suggestedAction: `Stay connected to upload all pending photos before final contract submission.`,
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { pendingIds: pending.map(p => p.id), count: pending.length },
    });
  }

  return findings;
}

// ── Full Photo Analysis ───────────────────────────────────────────────────

export function analyzePhotos(
  appointmentId: string,
  openings: { id: string; openingNumber?: number }[],
  photos: PhotoMeta[],
): FieldIntelligenceFinding[] {
  return [
    ...checkAppointmentPhotoPresence(appointmentId, photos),
    ...checkOpeningPhotoPresence(appointmentId, openings, photos),
    ...checkPhotoSyncStatus(appointmentId, photos),
  ];
}
