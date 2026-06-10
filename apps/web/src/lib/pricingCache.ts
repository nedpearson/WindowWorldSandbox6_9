// ─────────────────────────────────────────────────────────────────────────────
// pricingCache.ts — Offline pricing/rules cache backed by Dexie
//
// Fetches and stores:
//   - Active pricing version + items
//   - Measurement rules
//   - Finance options
//
// Used by:
//   - Offline quote calculation
//   - PricingReview component (stale warning)
//   - AppointmentDetailPage (offline badge)
//
// Never used to generate official contracts without cloud verification.
// ─────────────────────────────────────────────────────────────────────────────

import { getOfflineDb } from './offlineDb';
import { api } from '../utils/api';

const PRICING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PricingCacheSummary {
  hasCache: boolean;
  fetchedAt?: number;
  isStale: boolean;
  staleSinceMs?: number;
}

async function getCacheEntry(cacheType: string) {
  const db = getOfflineDb();
  const entry = await db.pricing_cache
    .where('cacheType')
    .equals(cacheType)
    .last();
  return entry ?? null;
}

async function setCacheEntry(cacheType: string, data: any): Promise<void> {
  const db = getOfflineDb();
  // Remove old entries for this type
  await db.pricing_cache.where('cacheType').equals(cacheType).delete();
  await db.pricing_cache.add({
    cacheType: cacheType as any,
    dataJson: JSON.stringify(data),
    fetchedAt: Date.now(),
    expiresAt: Date.now() + PRICING_TTL_MS,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Refresh all pricing data from the server. Call on login and on reconnect. */
export async function refreshPricingCache(): Promise<void> {
  try {
    const [pricingVersion, measurementRules, financeOptions, rules] = await Promise.allSettled([
      api.get('/pricing-versions/active').catch(() => null),
      api.get('/measurement-rules').catch(() => null),
      api.get('/finance-options').catch(() => null),
      api.get('/rules').catch(() => null),
    ]);

    if (pricingVersion.status === 'fulfilled' && pricingVersion.value) {
      await setCacheEntry('pricing_version', pricingVersion.value);
    }
    if (measurementRules.status === 'fulfilled' && measurementRules.value) {
      await setCacheEntry('measurement_rules', measurementRules.value);
    }
    if (financeOptions.status === 'fulfilled' && financeOptions.value) {
      await setCacheEntry('finance_options', financeOptions.value);
    }
    if (rules.status === 'fulfilled' && rules.value) {
      await setCacheEntry('business_rules', rules.value);
    }
  } catch (err) {
    console.warn('[pricingCache] Refresh failed — using existing cache', err);
  }
}

export async function getCachedPricing(): Promise<any | null> {
  const entry = await getCacheEntry('pricing_version');
  return entry ? JSON.parse(entry.dataJson) : null;
}

export async function getCachedMeasurementRules(): Promise<any | null> {
  const entry = await getCacheEntry('measurement_rules');
  return entry ? JSON.parse(entry.dataJson) : null;
}

export async function getCachedFinanceOptions(): Promise<any | null> {
  const entry = await getCacheEntry('finance_options');
  return entry ? JSON.parse(entry.dataJson) : null;
}

export async function getCachedBusinessRules(): Promise<any | null> {
  const entry = await getCacheEntry('business_rules');
  return entry ? JSON.parse(entry.dataJson) : null;
}

export async function getPricingCacheSummary(): Promise<PricingCacheSummary> {
  const entry = await getCacheEntry('pricing_version');
  if (!entry) return { hasCache: false, isStale: true };
  const age = Date.now() - entry.fetchedAt;
  return {
    hasCache: true,
    fetchedAt: entry.fetchedAt,
    isStale: age > PRICING_TTL_MS,
    staleSinceMs: age > PRICING_TTL_MS ? age - PRICING_TTL_MS : undefined,
  };
}

/** Returns a human-readable staleness warning if cache is old. */
export async function getPricingStaleWarning(): Promise<string | null> {
  const summary = await getPricingCacheSummary();
  if (!summary.hasCache) return '⚠️ No offline pricing data — connect to internet to load pricing.';
  if (summary.isStale && summary.staleSinceMs) {
    const hours = Math.round(summary.staleSinceMs / 3_600_000);
    return `⚠️ Offline pricing is ${hours}h out of date. Connect to sync latest pricing.`;
  }
  return null;
}
