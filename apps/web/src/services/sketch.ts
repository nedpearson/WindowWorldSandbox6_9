// ═══════════════════════════════════════════════════════════════
// Sketch Service — Client-side sketch abstraction
// Wraps sketch API calls and provides utility functions for
// the drawing engine, marker management, and sync operations.
// ═══════════════════════════════════════════════════════════════

import { api } from '../utils/api';

// ─── Types ───────────────────────────────────────────────────
export interface SketchData {
  id: string;
  appointmentId: string;
  name?: string;
  completenessScore?: number;
  installerClarityScore?: number;
  layers: any[];
  markers: any[];
  validations: any[];
  warnings: any[];
}

/**
 * Load or create a sketch for an appointment.
 * If no sketch exists, creates one via the API.
 */
export async function getOrCreateSketch(appointmentId: string): Promise<SketchData> {
  try {
    const existing = await api.get(`/sketches/appointment/${appointmentId}`);
    if (existing?.sketch) return existing.sketch;
  } catch { /* no existing sketch */ }

  const created = await api.post('/sketches', { appointmentId, name: 'Field Sketch' });
  return created.sketch;
}

/**
 * Save marker to server.
 */
export async function saveMarker(sketchId: string, marker: any): Promise<any> {
  if (marker.id?.startsWith('marker_')) {
    // Local-only marker — create on server
    return api.post(`/sketches/${sketchId}/markers`, marker);
  }
  // Existing marker — update
  return api.put(`/sketches/markers/${marker.id}`, marker);
}

/**
 * Delete a marker from the server.
 */
export async function deleteMarker(markerId: string): Promise<void> {
  await api.del(`/sketches/markers/${markerId}`);
}

/**
 * Create a marker group (mull pair, etc.).
 */
export async function createMarkerGroup(
  sketchId: string,
  groupType: string,
  markerIds: string[],
  groupNote?: string,
): Promise<any> {
  return api.post(`/sketches/${sketchId}/groups`, {
    groupType,
    memberMarkerIds: markerIds,
    groupNote,
  });
}

/**
 * Save sketch canvas image (base64) to server.
 */
export async function saveSketchImage(sketchId: string, imageData: string): Promise<void> {
  await api.put(`/sketches/${sketchId}/image`, { imageData });
}
