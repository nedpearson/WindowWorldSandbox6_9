// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/engine.ts — Field Intelligence Engine Orchestrator
//
// Runs all QA modules and returns a unified FieldIntelligenceReport.
//
// OFFLINE-SAFE: All deterministic checks run without network.
//               Cloud-enhanced checks are queued when offline.
//
// BOUNDARY RULE:
// - The engine produces advisory findings only.
// - It NEVER modifies appointments, openings, pricing, customers, contracts,
//   photos, sketches, or sync state.
// - Results are cached in Dexie v5 field_intelligence_cache.
// - Dedup is enforced: same finding ID is never stored twice.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding, FieldIntelligenceReport } from './types';
import { analyzeAllMeasurements } from './measurementQA';
import { analyzePricing } from './pricingQA';
import { analyzePhotos, type PhotoMeta } from './photoQA';
import { analyzeContractReadiness } from './contractQA';
import { analyzeSyncState } from './syncQA';
import { analyzeSketchState } from './sketchQA';
import {
  saveFindingsLocally,
  loadFindingsLocally,
  pruneOldFindings,
} from './offlineCache';

// ── Engine Input ──────────────────────────────────────────────────────────

export interface FieldIntelligenceInput {
  appointmentId: string;
  isOnline: boolean;
  stage?: 'quick_price' | 'full_details' | 'contract_ready';

  // Customer data
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;

  // Openings — must include all measurement fields
  openings?: {
    id: string;
    openingNumber?: number;
    // Multi-point captures
    widthTop?: number | null;
    widthMiddle?: number | null;
    widthBottom?: number | null;
    heightLeft?: number | null;
    heightCenter?: number | null;
    heightRight?: number | null;
    // Final stored dimensions
    width?: number | null;
    height?: number | null;
    price?: number | null;
    productCategory?: string | null;
    exteriorSurface?: string | null;
    obstructionNotes?: string | null;
    isManualOverride?: boolean;
    manualOverrideReason?: string | null;
    hasRawBluetoothCapture?: boolean;
    hasMeasurementAdjustmentRecord?: boolean;
    // Raw BT values for pricing source check
    rawBtWidth?: number | null;
    rawBtHeight?: number | null;
  }[];

  // Photos
  photos?: PhotoMeta[];

  // Sketch
  markers?: any[];

  // Pricing metadata
  qa2PriceFields?: {
    qa2Price1?: number | null;
    qa2Price2?: number | null;
    qa2Price3?: number | null;
    qa2CommissionOverride?: number | null;
    qa2BonusAmount?: number | null;
  };
  pricingCachedAt?: number | null;
  financeOption?: {
    financeOptionId?: string | null;
    totalAmount?: number | null;
    financeRequested?: boolean;
  };

  // Contract
  contractData?: {
    ownerSignature?: string | null;
    estimatorSignature?: string | null;
    signatureDate?: string | null;
    customerInitials?: string | null;
  } | null;
}

// ── Engine ────────────────────────────────────────────────────────────────

/**
 * Run all Field Intelligence QA checks and return a unified report.
 *
 * ADVISORY ONLY. Never modifies any source-of-truth data.
 */
export async function runFieldIntelligence(
  input: FieldIntelligenceInput,
): Promise<FieldIntelligenceReport> {
  const { appointmentId, stage = 'full_details' } = input;
  const runAt = Date.now();

  // Prune old resolved findings (best-effort, non-blocking)
  pruneOldFindings().catch(() => {});

  const allFindings: FieldIntelligenceFinding[] = [];

  // ── 1. Measurement QA (deterministic, offline-safe) ──────────────────
  if (input.openings && input.openings.length > 0) {
    allFindings.push(...analyzeAllMeasurements(appointmentId, input.openings));
  }

  // ── 2. Pricing QA (deterministic, offline-safe) ──────────────────────
  allFindings.push(...analyzePricing(appointmentId, {
    qa2PriceFields: input.qa2PriceFields,
    openings: input.openings?.map(op => ({
      id: op.id,
      openingNumber: op.openingNumber,
      width: op.width,
      height: op.height,
      rawBtWidth: op.rawBtWidth,
      rawBtHeight: op.rawBtHeight,
    })),
    pricingCachedAt: input.pricingCachedAt,
    financeOption: input.financeOption,
  }));

  // ── 3. Photo QA (local metadata, offline-safe) ───────────────────────
  if (input.photos !== undefined) {
    allFindings.push(...analyzePhotos(
      appointmentId,
      input.openings?.map(op => ({ id: op.id, openingNumber: op.openingNumber })) ?? [],
      input.photos,
    ));
  }

  // ── 4. Contract Readiness (deterministic, offline-safe) ──────────────
  allFindings.push(...analyzeContractReadiness(appointmentId, {
    customer: input.customer,
    openings: input.openings?.map(op => ({
      id: op.id,
      openingNumber: op.openingNumber,
      width: op.width,
      height: op.height,
      productCategory: op.productCategory,
      price: op.price,
    })),
    contractData: input.contractData,
    stage,
  }));

  // ── 5. Sketch QA (deterministic, offline-safe) ─────────────────────────
  if (input.markers !== undefined && input.openings !== undefined) {
    allFindings.push(...analyzeSketchState(appointmentId, input.markers, input.openings));
  }

  // ── 6. Sync State QA (reads Dexie, offline-safe) ─────────────────────
  try {
    const syncFindings = await analyzeSyncState(appointmentId);
    allFindings.push(...syncFindings);
  } catch {
    // Sync QA is best-effort — never crash the engine
  }

  // ── Dedup by finding ID ───────────────────────────────────────────────
  // Load previously-resolved findings from cache so we don't reset their status
  const cached = await loadFindingsLocally(appointmentId);
  const resolvedIds = new Set(
    cached.filter(f => f.status !== 'open').map(f => f.id),
  );

  const dedupedFindings: FieldIntelligenceFinding[] = [];
  const seen = new Set<string>();
  for (const f of allFindings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    // Preserve resolved status from cache
    if (resolvedIds.has(f.id)) {
      const cachedVersion = cached.find(c => c.id === f.id);
      if (cachedVersion) {
        dedupedFindings.push(cachedVersion);
        continue;
      }
    }
    dedupedFindings.push(f);
  }

  // ── Persist to local cache ────────────────────────────────────────────
  await saveFindingsLocally(dedupedFindings);

  // ── Count by severity ─────────────────────────────────────────────────
  const openFindings = dedupedFindings.filter(f => f.status === 'open');
  const counts = {
    blocking: openFindings.filter(f => f.severity === 'blocking').length,
    warning: openFindings.filter(f => f.severity === 'warning').length,
    info: openFindings.filter(f => f.severity === 'info').length,
    total: openFindings.length,
  };

  // ── Next Best Actions ─────────────────────────────────────────────────
  const nextBestActions = deriveNextBestActions(openFindings);

  return {
    appointmentId,
    runAt,
    findings: dedupedFindings,
    counts,
    isOffline: !input.isOnline,
    nextBestActions,
  };
}

// ── Next Best Action Deriver ──────────────────────────────────────────────

function deriveNextBestActions(findings: FieldIntelligenceFinding[]): string[] {
  const actions: string[] = [];
  const categories = new Set(findings.map(f => f.category));

  // Prioritize blockers first
  const blockers = findings.filter(f => f.severity === 'blocking');
  if (blockers.length > 0) {
    const first = blockers[0];
    if (first.suggestedAction) {
      actions.push(`🔴 ${first.suggestedAction}`);
    }
    if (blockers.length > 1) {
      actions.push(`🔴 Fix ${blockers.length - 1} more blocking issue${blockers.length > 2 ? 's' : ''}`);
    }
  }

  // Category-based suggestions
  if (categories.has('sync') && findings.some(f => f.category === 'sync' && f.severity !== 'info')) {
    actions.push('📡 Connect to internet to sync changes and upload photos');
  }
  if (categories.has('measurement') && findings.some(f => f.category === 'measurement' && f.severity === 'warning')) {
    actions.push('📏 Review measurement variations before finalizing contract');
  }
  if (categories.has('photo') && findings.some(f => f.category === 'photo' && f.severity === 'warning')) {
    actions.push('📷 Capture exterior photo before leaving job site');
  }

  // Cap at 3
  return actions.slice(0, 3);
}

// ── Load Cached Report ────────────────────────────────────────────────────

/**
 * Load a previously-cached report for an appointment without running checks.
 * Used on app re-open to show last results instantly.
 */
export async function loadCachedReport(
  appointmentId: string,
): Promise<FieldIntelligenceReport | null> {
  const findings = await loadFindingsLocally(appointmentId);
  if (findings.length === 0) return null;

  const openFindings = findings.filter(f => f.status === 'open');
  const runAt = Math.max(...findings.map(f => f.createdAt));

  return {
    appointmentId,
    runAt,
    findings,
    counts: {
      blocking: openFindings.filter(f => f.severity === 'blocking').length,
      warning: openFindings.filter(f => f.severity === 'warning').length,
      info: openFindings.filter(f => f.severity === 'info').length,
      total: openFindings.length,
    },
    isOffline: !navigator.onLine,
    nextBestActions: deriveNextBestActions(openFindings),
  };
}
