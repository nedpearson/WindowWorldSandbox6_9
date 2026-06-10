// ═══════════════════════════════════════════════════════════════
// Pricing Service — Client-side pricing abstraction
// Wraps API calls + provides caching and formatting utilities
// ═══════════════════════════════════════════════════════════════

import { api } from '../utils/api';
import type { Opening, PricingVersion, PricingVersionItem } from '../types';
import { calculateUI, calculateUITier } from './calculations';

// ─── Cache ───────────────────────────────────────────────────
let _activeVersion: PricingVersion | null = null;
let _activePricingItems: PricingVersionItem[] = [];
let _lastFetchedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the active published pricing version with items.
 * Caches for 5 minutes to avoid repeated API calls during a session.
 */
export async function getActivePricingVersion(): Promise<PricingVersion | null> {
  if (_activeVersion && Date.now() - _lastFetchedAt < CACHE_TTL) {
    return _activeVersion;
  }
  try {
    const versions = await api.get('/pricing-versions');
    const active = versions.find((v: PricingVersion) => v.status === 'published');
    if (active) {
      _activeVersion = active;
      _activePricingItems = active.items || [];
      _lastFetchedAt = Date.now();
    }
    return active || null;
  } catch {
    return _activeVersion; // return stale cache on error
  }
}

/**
 * Look up the price for a given opening configuration via the server.
 * This is the authoritative pricing path — never calculate prices client-side.
 */
export async function lookupPrice(opening: Partial<Opening>): Promise<{
  basePrice: number;
  optionsPrice: number;
  laborPrice: number;
  totalPrice: number;
  breakdown: { label: string; amount: number }[];
  needsVerification: boolean;
}> {
  const ui = calculateUI(opening.width || 0, opening.height || 0);
  const tier = calculateUITier(ui);

  const result = await api.priceLookup({
    productCategory: opening.productCategory,
    seriesModel: opening.seriesModel,
    unitedInches: ui,
    tierIndex: tier.index,
    options: {
      gridStyle: opening.gridStyle,
      temperedGlass: opening.temperedGlass,
      obscureGlass: opening.obscureGlass,
      interiorColor: opening.interiorColor,
      exteriorColor: opening.exteriorColor,
      foamEnhanced: opening.foamEnhanced,
      screenOption: opening.screenOption,
      oriel: opening.oriel,
      // Source of truth overrides
      cutbackType: opening.cutbackType,
      headerType: opening.headerType,
      trimType: opening.trimType,
    },
    removalType: opening.removalType,
    installType: opening.installType,
    sillRepair: opening.sillRepair,
  });

  return result;
}

/**
 * Format a price for display.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Clear the pricing cache (e.g. after a new version is published).
 */
export function clearPricingCache(): void {
  _activeVersion = null;
  _activePricingItems = [];
  _lastFetchedAt = 0;
}
