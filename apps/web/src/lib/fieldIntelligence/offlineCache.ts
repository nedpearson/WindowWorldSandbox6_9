// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/offlineCache.ts — Dexie v5 local cache for Field Intelligence
//
// Findings are persisted locally so they survive app close/reopen.
// On reconnect, findings are synced to the server FinalReviewItem table.
// Dedup is enforced by finding.id (hash of appointment+opening+category+source).
// ═══════════════════════════════════════════════════════════════════════════

import { getOfflineDb } from '../offlineDb';
import type { FieldIntelligenceFinding } from './types';

const STORE_NAME = 'field_intelligence_cache';
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // prune findings older than 7 days

// ── Save Findings ─────────────────────────────────────────────────────────

/**
 * Save a batch of findings to the local Dexie cache.
 * Uses bulkPut so existing findings with the same id are updated (not duplicated).
 * Resolved findings (status !== 'open') are preserved for audit trail.
 */
export async function saveFindingsLocally(
  findings: FieldIntelligenceFinding[],
): Promise<void> {
  try {
    const db = getOfflineDb() as any;
    if (!db[STORE_NAME]) return; // store not available in older DB version
    await db[STORE_NAME].bulkPut(
      findings.map(f => ({ ...f, cachedAt: Date.now() })),
    );
  } catch (err) {
    console.warn('[fieldIntelligence] saveFindingsLocally failed:', err);
  }
}

// ── Load Findings ─────────────────────────────────────────────────────────

/**
 * Load all findings for a given appointment from the local cache.
 * Returns findings sorted by severity (blocking first) then createdAt desc.
 */
export async function loadFindingsLocally(
  appointmentId: string,
): Promise<FieldIntelligenceFinding[]> {
  try {
    const db = getOfflineDb() as any;
    if (!db[STORE_NAME]) return [];
    const rows: FieldIntelligenceFinding[] = await db[STORE_NAME]
      .where('appointmentId')
      .equals(appointmentId)
      .toArray();
    return rows.sort((a, b) => {
      const sevOrder: Record<string, number> = { blocking: 0, warning: 1, info: 2 };
      const diff = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      if (diff !== 0) return diff;
      return b.createdAt - a.createdAt;
    });
  } catch {
    return [];
  }
}

// ── Mark Finding Resolved ─────────────────────────────────────────────────

/**
 * Update a finding's status locally (applied | ignored | reviewed | manager_review).
 * The change is recorded locally immediately and synced to the server on reconnect.
 *
 * BOUNDARY: This only updates the finding record status.
 * It does NOT apply the suggestedAction automatically.
 */
export async function markFindingStatus(
  findingId: string,
  status: FieldIntelligenceFinding['status'],
  reason?: string,
): Promise<void> {
  try {
    const db = getOfflineDb() as any;
    if (!db[STORE_NAME]) return;
    await db[STORE_NAME].update(findingId, {
      status,
      resolvedAt: Date.now(),
      ...(reason ? { overrideReason: reason } : {}),
    });
  } catch (err) {
    console.warn('[fieldIntelligence] markFindingStatus failed:', err);
  }
}

// ── Prune Old Findings ────────────────────────────────────────────────────

/**
 * Remove findings older than PRUNE_AGE_MS that are already resolved.
 * Called lazily on engine startup to prevent unbounded growth.
 */
export async function pruneOldFindings(): Promise<void> {
  try {
    const db = getOfflineDb() as any;
    if (!db[STORE_NAME]) return;
    const cutoff = Date.now() - PRUNE_AGE_MS;
    await db[STORE_NAME]
      .where('createdAt')
      .below(cutoff)
      .and((f: FieldIntelligenceFinding) => f.status !== 'open')
      .delete();
  } catch {
    // Prune is best-effort
  }
}
