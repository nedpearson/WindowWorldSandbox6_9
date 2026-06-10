// server/src/services/pricingService.ts
//
// Canonical pricing engine — every selected chargeable option flows through here.
// Called by pricingEngine.ts (recalculatePricing) and saved as QuoteLineItems.
//
// OPTION PRICING RULES:
//  - temperedGlass: 'full' or 'half' — per opening, with sq-ft basis if catalog method = per_sq_ft
//  - obscureGlass:  'full' or 'half' (BSO) — same
//  - gridStyle:     any non-None/Standard value → catalog lookup → $45/opening fallback
//  - removalType:   non-none → catalog labor lookup → $85/opening fallback (window), $125 full tearout
//  - screenOption:  'Full' → $25/opening fallback; 'Half' → per catalog if priced
//  - foamEnhanced:  true → catalog lookup (no fallback — already in base for Double Hung FE)
//  - argon:         true → catalog lookup
//  - oriel:         true → catalog lookup → $95/opening fallback
//  - requiresTrimHeader: true → catalog lookup → $40/opening fallback
//  - header flashing (siding): exterior surface = siding → catalog lookup → $12/opening fallback
//
// BTR 2026 PRICING INTEGRATION:
//  - When catalog lookup fails, BTR pricing tables provide authoritative fallback prices
//  - Small window $285 minimum (UI ≤ 83) for sliders/pictures in L200/03A0/3000
//  - Tapcon $10/unit for concrete attachment
//  - Clear story $225 first window + $75 each additional
//  - Wincore $100 adder for windows > 120 UI
//  - Special shape $150 adder for over-max-UI (no 80% discount)
//
// MISSING PRICE HANDLING:
//  - Every option that has no catalog entry AND no fallback emits a missingRules entry
//  - missingRules are returned and saved as AuditorIssues by pricingEngine.ts
//  - Frontend Review page shows these as blockers before contract generation

import {
  getCasementPricing,
  getSpecialShapePricing,
  getGardenWindowPricing,
  loadPricingTables,
} from './btrRulesEngine.js';

export interface PricingLineItem {
  openingNumber: number;
  label: string;
  category: 'product' | 'option' | 'labor';
  optionCode?: string;   // canonical option identifier for cross-document matching
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
  needsVerification: boolean;
  explanation: string;
}

export interface MissingPricingRule {
  openingNumber: number;
  optionCode: string;
  description: string;
  label: string;
}

// ── Catalog lookup helpers ──────────────────────────────────────────────────

/**
 * Find an option item in the pricing version by one or more keyword matches.
 * More robust than a single label.includes() — tries each keyword in order.
 */
function findOptionItem(versionItems: any[], ...keywords: string[]): any | undefined {
  const lower = keywords.map(k => k.toLowerCase());
  return versionItems.find((i: any) => {
    if (i.category !== 'option') return false;
    const lbl = i.label.toLowerCase();
    return lower.some(k => lbl.includes(k));
  });
}

function findLaborItem(versionItems: any[], ...keywords: string[]): any | undefined {
  const lower = keywords.map(k => k.toLowerCase());
  return versionItems.find((i: any) => {
    if (i.category !== 'labor') return false;
    const lbl = i.label.toLowerCase();
    return lower.some(k => lbl.includes(k));
  });
}

function findProductItem(versionItems: any[], ...keywords: string[]): any | undefined {
  const lower = keywords.map(k => k.toLowerCase());
  return versionItems.find((i: any) => {
    if (i.category !== 'product') return false;
    const lbl = i.label.toLowerCase();
    return lower.some(k => lbl.includes(k));
  });
}

// ── Main export ─────────────────────────────────────────────────────────────

export function calculateProposalTotals(
  openings: any[],
  version: any
): { lineItems: PricingLineItem[]; missingRules: MissingPricingRule[] } {
  const lineItems: PricingLineItem[] = [];
  const missingRules: MissingPricingRule[] = [];
  const items = version.items as any[];

  for (const opening of openings) {
    const ui = (opening.width || 0) + (opening.height || 0);
    const qty = opening.quantity || 1;
    // Glass area in sq ft — used for per_sq_ft option pricing
    const glassAreaSqFt = ((opening.width || 0) * (opening.height || 0)) / 144;

    // ── BASE PRODUCT PRICE ──────────────────────────────────────────────────

    let baseItem: any = null;

    if (opening.productType === 'siding') {
      baseItem = items.find((i: any) =>
        i.category === 'product' &&
        i.productCategory === 'siding' &&
        (i.seriesModel === opening.sidingMaterial || (opening.sidingMaterial && i.seriesModel && opening.sidingMaterial.includes(i.seriesModel)))
      );
    } else {
      baseItem = items.find((i: any) =>
        i.category === 'product' &&
        i.productCategory === opening.productCategory &&
        (
          i.seriesModel === opening.seriesModel ||
          i.seriesModel === opening.model ||
          (opening.seriesModel && i.seriesModel && opening.seriesModel.includes(i.seriesModel)) ||
          (!i.seriesModel && (!opening.seriesModel || !i.label.includes('6100') || opening.seriesModel?.includes('6100')))
        ) &&
        (i.unitedInchesMin == null || ui >= i.unitedInchesMin) &&
        (i.unitedInchesMax == null || ui <= i.unitedInchesMax)
      );
    }

    const isOriel = opening.oriel === true || 
                    opening.productCategory === 'oriel' ||
                    (opening.productCategory || '').toLowerCase().includes('oriel');

    if (isOriel) {
      const price = 385;
      const label = 'Oriel Window (Specialty)';
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${label}`,
        category: 'product',
        optionCode: 'base_product',
        quantity: qty,
        unitPrice: price,
        totalPrice: price * qty,
        confidence: 0.9,
        needsVerification: false,
        explanation: `Oriel Specialty Window priced at $385`,
      });
    } else if (baseItem) {
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${baseItem.label}`,
        category: 'product',
        optionCode: 'base_product',
        quantity: qty,
        unitPrice: baseItem.price,
        totalPrice: baseItem.price * qty,
        confidence: baseItem.confidence,
        needsVerification: baseItem.needsVerification,
        explanation: `Base Price: ${baseItem.label}`,
      });
    } else if (
      opening.productCategory === 'Double Hung' ||
      opening.productCategory === 'double_hung'
    ) {
      // Fallback for DH if missing from catalog
      const isFoam = opening.foamEnhanced;
      const price = isFoam ? 410 : 385;
      const label = isFoam ? '4000 DH Foam Enh. 3001-FE' : '4000 DH Mech/Weld 3001';
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${label} (Fallback)`,
        category: 'product',
        optionCode: 'base_product',
        quantity: qty,
        unitPrice: price,
        totalPrice: price * qty,
        confidence: 0.5,
        needsVerification: true,
        explanation: `Fallback pricing used. Please configure ${label} in Admin.`,
      });
    } else {
      const price = 450;
      const label = opening.productCategory
        ? opening.productCategory.charAt(0).toUpperCase() + opening.productCategory.slice(1).replace(/_/g, ' ')
        : 'Window';
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${label} Base Price (Fallback)`,
        category: 'product',
        optionCode: 'base_product',
        quantity: qty,
        unitPrice: price,
        totalPrice: price * qty,
        confidence: 0.2,
        needsVerification: true,
        explanation: `Fallback pricing used. Please configure ${label} in Admin.`,
      });
      missingRules.push({
        openingNumber: opening.openingNumber,
        optionCode: 'base_product',
        label,
        description: `No base price for ${opening.productCategory} ${opening.seriesModel || ''} at UI=${ui}`,
      });
    }

    // ── BTR 2026: SMALL WINDOW $285 MINIMUM ──────────────────────────────
    // All small sliders and small picture windows with UI ≤ 83 = $285
    // Applies to L200, 03A0, 3000 series (BTR p.13, p.15, p.17)
    const category = (opening.productCategory || '').toLowerCase();
    const model = opening.seriesModel || opening.productModel || '';
    const isSmallWindowEligible = (
      (category.includes('slider') || category.includes('picture')) &&
      (model.startsWith('L2') || model.startsWith('03A') || model.startsWith('30') || !model)
    );
    if (isSmallWindowEligible && ui <= 83) {
      const currentBaseItem = lineItems.find(
        li => li.openingNumber === opening.openingNumber && li.optionCode === 'base_product'
      );
      if (currentBaseItem && currentBaseItem.unitPrice < 285) {
        currentBaseItem.unitPrice = 285;
        currentBaseItem.totalPrice = 285 * qty;
        currentBaseItem.explanation += ' (BTR $285 small window minimum applied)';
        currentBaseItem.confidence = 0.9;
      }
    }

    // ── BTR 2026: TAPCON CONCRETE ATTACHMENT ─────────────────────────────
    // $10 per unit for concrete attachment (BTR universal rule)
    if ((opening as any).tapcon === true) {
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} Tapcon Concrete Attachment`,
        category: 'option',
        optionCode: 'tapcon',
        quantity: qty,
        unitPrice: 10,
        totalPrice: 10 * qty,
        confidence: 1.0,
        needsVerification: false,
        explanation: 'BTR 2026: Tapcon $10/unit concrete attachment',
      });
    }

    // ── BTR 2026: CLEAR STORY CHARGE ─────────────────────────────────────
    // $225 minimum first window + $75 each additional (BTR p.102)
    if ((opening as any).clearStory === true) {
      const clearStoryPrice = (opening as any).clearStoryIsFirst ? 225 : 75;
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} Clear Story Charge${(opening as any).clearStoryIsFirst ? ' (First)' : ' (Additional)'}`,
        category: 'labor',
        optionCode: 'clear_story',
        quantity: qty,
        unitPrice: clearStoryPrice,
        totalPrice: clearStoryPrice * qty,
        confidence: 1.0,
        needsVerification: false,
        explanation: `BTR 2026: Clear story ${(opening as any).clearStoryIsFirst ? '$225 first window' : '$75 additional'}`,
      });
    }

    // ── BTR 2026: WINCORE $100 LARGE WINDOW ADDER ────────────────────────
    // $100 per contract for windows > 120 UI (BTR p.19)
    if (model.startsWith('88') && ui > 120) {
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} Wincore Large Window Adder (>120 UI)`,
        category: 'option',
        optionCode: 'wincore_large_adder',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        confidence: 1.0,
        needsVerification: false,
        explanation: `BTR 2026: Wincore $100 adder for UI=${ui} > 120`,
      });
    }

    // ── BTR 2026: CASEMENT PRICING FALLBACK ──────────────────────────────
    // If catalog has no casement pricing, use BTR pricing tables
    if (!baseItem && model.startsWith('09') && model.length === 4) {
      const vinylColor = opening.interiorColor || opening.exteriorColor || 'white';
      const btrPrice = getCasementPricing(model, ui, vinylColor);
      if (btrPrice) {
        // Replace the generic fallback line item with BTR pricing
        const existingFallback = lineItems.findIndex(
          li => li.openingNumber === opening.openingNumber && li.optionCode === 'base_product'
        );
        if (existingFallback >= 0) {
          lineItems[existingFallback] = {
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Casement ${model} (BTR 2026)`,
            category: 'product',
            optionCode: 'base_product',
            quantity: qty,
            unitPrice: btrPrice,
            totalPrice: btrPrice * qty,
            confidence: 0.9,
            needsVerification: false,
            explanation: `BTR 2026 Pricing: Casement ${model} at UI=${ui}`,
          };
          // Remove corresponding missing rule if present
          const mrIdx = missingRules.findIndex(
            mr => mr.openingNumber === opening.openingNumber && mr.optionCode === 'base_product'
          );
          if (mrIdx >= 0) missingRules.splice(mrIdx, 1);
        }
      }
    }

    // ── BTR 2026: SPECIAL SHAPE PRICING FALLBACK ────────────────────────
    if (!baseItem && model.startsWith('S1')) {
      const shapePricing = getSpecialShapePricing(model, ui);
      if (shapePricing) {
        const vinylColor = opening.interiorColor || 'white';
        const basePrice = vinylColor.toLowerCase() === 'white' ? shapePricing.white : (shapePricing.beige || shapePricing.white);
        const adder = shapePricing.overMaxUI ? (shapePricing.overMaxAdder || 150) : 0;
        const totalBasePrice = basePrice + adder;

        const existingFallback = lineItems.findIndex(
          li => li.openingNumber === opening.openingNumber && li.optionCode === 'base_product'
        );
        if (existingFallback >= 0) {
          lineItems[existingFallback] = {
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Special Shape ${model}${adder ? ' (Over Max UI +$150)' : ''} (BTR 2026)`,
            category: 'product',
            optionCode: 'base_product',
            quantity: qty,
            unitPrice: totalBasePrice,
            totalPrice: totalBasePrice * qty,
            confidence: 0.85,
            needsVerification: adder > 0,
            explanation: `BTR 2026 Pricing: ${model} at UI=${ui}${adder ? '. Over-max-UI $150 adder (no 80% discount)' : ''}`,
          };
          const mrIdx = missingRules.findIndex(
            mr => mr.openingNumber === opening.openingNumber && mr.optionCode === 'base_product'
          );
          if (mrIdx >= 0) missingRules.splice(mrIdx, 1);
        }
      }
    }

    // ── BTR 2026: GARDEN WINDOW PRICING FALLBACK ────────────────────────
    if (!baseItem && (model === 'S134' || category.includes('garden'))) {
      const vinylColor = opening.interiorColor || 'white';
      const gardenPrice = getGardenWindowPricing(opening.width || 0, opening.height || 0, vinylColor);
      if (gardenPrice) {
        const existingFallback = lineItems.findIndex(
          li => li.openingNumber === opening.openingNumber && li.optionCode === 'base_product'
        );
        if (existingFallback >= 0) {
          lineItems[existingFallback] = {
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Garden Window S134 (BTR 2026)`,
            category: 'product',
            optionCode: 'base_product',
            quantity: qty,
            unitPrice: gardenPrice,
            totalPrice: gardenPrice * qty,
            confidence: 0.9,
            needsVerification: false,
            explanation: `BTR 2026 Pricing: Garden Window ${opening.width}"W × ${opening.height}"H`,
          };
          const mrIdx = missingRules.findIndex(
            mr => mr.openingNumber === opening.openingNumber && mr.optionCode === 'base_product'
          );
          if (mrIdx >= 0) missingRules.splice(mrIdx, 1);
        }
      }
    }

    // ── OPTION ADDERS (windows, doors, patio doors) ─────────────────────────

    if (
      opening.productType === 'window' ||
      opening.productType === 'patio_door' ||
      opening.productType === 'entry_door' ||
      !opening.productType // default — treat as window
    ) {

      // ── A. TEMPERED GLASS ─────────────────────────────────────────────────
      // Fields: temperedGlass = 'full' | 'half' | 'none' | null
      // 'full' = full tempered, 'half' = half tempered (bottom sash only)
      // Both are chargeable. Per-opening basis; catalog may set per_sq_ft.
      const tempVal = opening.temperedGlass;
      if (tempVal && tempVal !== 'none' && tempVal !== 'None' && tempVal !== false) {
        const isHalf = tempVal === 'half';
        const tempLabel = isHalf ? 'Half Tempered Glass' : 'Tempered Glass';
        const optionCode = isHalf ? 'tempered_half' : 'tempered_full';

        // Catalog lookup: try several common label patterns
        const tempItem = findOptionItem(items, 'tempered glass', 'tempered', 'temp glass');
        const halfTempItem = isHalf
          ? findOptionItem(items, 'half tempered', 'half temp', 'bso tempered') || tempItem
          : null;
        const resolvedItem = isHalf ? (halfTempItem || tempItem) : tempItem;

        if (resolvedItem) {
          // Check if catalog uses per_sq_ft basis
          const isSqFt = resolvedItem.priceType === 'per_sq_ft' || 
                         resolvedItem.label.toLowerCase().includes('sq ft') ||
                         resolvedItem.label.toLowerCase().includes('tempered');
          const unitQty = isSqFt ? glassAreaSqFt : qty;
          const halfDiscount = isHalf && !halfTempItem ? 0.5 : 1; // half-tempered costs ~50% of full if no specific item
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${resolvedItem.label}${isHalf && !halfTempItem ? ' (Half)' : ''}`,
            category: 'option',
            optionCode,
            quantity: unitQty,
            unitPrice: resolvedItem.price * halfDiscount,
            totalPrice: resolvedItem.price * halfDiscount * unitQty,
            confidence: resolvedItem.confidence,
            needsVerification: resolvedItem.needsVerification,
            explanation: `Option: ${tempLabel} (catalog)`,
          });
        } else {
          // Fallback — $45 per opening for full, $25 for half
          const fallbackPrice = isHalf ? 25 : 45;
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${tempLabel} (Fallback)`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: fallbackPrice,
            totalPrice: fallbackPrice * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: ${tempLabel} not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode,
            label: tempLabel,
            description: `No catalog price for ${tempLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
          });
        }
      }

      // ── B. OBSCURE GLASS ─────────────────────────────────────────────────
      // Fields: obscureGlass = 'full' | 'half' | 'none' | null
      // 'half' = BSO (bottom sash obscure) — chargeable
      const obscVal = opening.obscureGlass;
      if (obscVal && obscVal !== 'none' && obscVal !== 'None' && obscVal !== false) {
        const isHalfObsc = obscVal === 'half';
        const obscLabel = isHalfObsc ? 'Obscure Glass (BSO - Half)' : 'Obscure Glass (Full)';
        const optionCode = isHalfObsc ? 'obscure_half' : 'obscure_full';

        const obscItem = findOptionItem(items, 'obscure glass', 'obscure', 'privacy glass');
        const halfObscItem = isHalfObsc
          ? findOptionItem(items, 'bso', 'half obscure', 'bottom sash obscure') || obscItem
          : null;
        const resolvedItem = isHalfObsc ? (halfObscItem || obscItem) : obscItem;

        if (resolvedItem) {
          const halfDiscount = isHalfObsc && !halfObscItem ? 0.6 : 1;
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${resolvedItem.label}${isHalfObsc && !halfObscItem ? ' (BSO/Half)' : ''}`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: resolvedItem.price * halfDiscount,
            totalPrice: resolvedItem.price * halfDiscount * qty,
            confidence: resolvedItem.confidence,
            needsVerification: resolvedItem.needsVerification,
            explanation: `Option: ${obscLabel} (catalog)`,
          });
        } else {
          const fallbackPrice = isHalfObsc ? 25 : 35;
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${obscLabel} (Fallback)`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: fallbackPrice,
            totalPrice: fallbackPrice * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: ${obscLabel} not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode,
            label: obscLabel,
            description: `No catalog price for ${obscLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
          });
        }
      }

      // ── C. GRID OPTIONS ───────────────────────────────────────────────────
      // Fields: gridStyle = 'Flat' | 'Contoured' | 'Colonial' | 'Prairie' | 'Diamond' | etc., or 'None'
      // gridProfile = 'Flat' | 'Contoured' — OVERRIDES gridStyle profile if set
      const gridStyle = opening.gridStyle;
      if (gridStyle && gridStyle !== 'None' && gridStyle !== 'none' && gridStyle !== 'Standard') {
        const profile = opening.gridProfile || gridStyle; // 'Flat' | 'Contoured'
        const isContoured = profile === 'Contoured' || profile?.toLowerCase().includes('contoured');
        const isFlat = !isContoured || profile === 'Flat' || profile?.toLowerCase().includes('flat');
        const optionCode = isContoured ? 'grid_contoured' : 'grid_flat';

        // Lookup: contoured first if applicable, fall to flat, then generic grid
        let gridItem: any;
        if (isContoured) {
          gridItem = findOptionItem(items, 'contoured grid', 'contoured grids', 'contoured') ||
                     findOptionItem(items, 'grid contoured') ||
                     findOptionItem(items, 'grid');
        } else {
          gridItem = findOptionItem(items, 'flat grid', 'flat grids') ||
                     findOptionItem(items, 'grid flat') ||
                     findOptionItem(items, `${gridStyle.toLowerCase()} grid`) ||
                     findOptionItem(items, 'colonial grid', 'prairie grid', 'diamond grid', 'grid');
        }

        const gridLabel = `${isContoured ? 'Contoured' : 'Flat'} Grid — ${gridStyle}`;
        if (gridItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${gridItem.label}`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: gridItem.price,
            totalPrice: gridItem.price * qty,
            confidence: gridItem.confidence,
            needsVerification: gridItem.needsVerification,
            explanation: `Option: Grid (${gridStyle}) — ${profile} profile`,
          });
        } else {
          // Fallback: $45 flat, $55 contoured per opening
          const fallbackPrice = isContoured ? 55 : 45;
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${gridLabel} (Fallback)`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: fallbackPrice,
            totalPrice: fallbackPrice * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: Grid not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode,
            label: gridLabel,
            description: `No catalog price for ${gridLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
          });
        }
      }

      // ── D. SCREEN OPTION ─────────────────────────────────────────────────
      // Fields: screenOption = 'Full' | 'Half' | 'None' | 'Standard' | null
      // 'Standard' = included in base price (no adder)
      // 'Full' = full screen adder
      // 'Half' = half screen (some products include half by default)
      const screenVal = opening.screenOption;
      if (screenVal === 'Full' || screenVal === 'Full Screen' || screenVal === 'full') {
        const isFull = screenVal === 'Full' || screenVal === 'full';
        const screenLabel = isFull ? 'Full Screen' : 'Screen';
        const optionCode = isFull ? 'screen_full' : 'screen_half';

        const screenItem = isFull
          ? findOptionItem(items, 'full screen', 'full-screen')
          : findOptionItem(items, 'half screen', 'screen');

        if (screenItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${screenItem.label}`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: screenItem.price,
            totalPrice: screenItem.price * qty,
            confidence: screenItem.confidence,
            needsVerification: screenItem.needsVerification,
            explanation: `Option: ${screenLabel}`,
          });
        } else if (isFull) {
          // Full screen fallback $25/opening
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Full Screen (Fallback)`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: 25,
            totalPrice: 25 * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: Full Screen not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode,
            label: screenLabel,
            description: `No catalog price for Full Screen on opening #${opening.openingNumber}. Fallback $25 used.`,
          });
        }
        // Half screen with no catalog item — no charge, no flag (included by default in many products)
      }

      // ── E. FOAM ENHANCED ─────────────────────────────────────────────────
      // Only add as option if base item was found (DH fallback already includes foam in price)
      if (opening.foamEnhanced === true && baseItem) {
        const foamItem = findOptionItem(items, 'foam enhanced', 'foam', 'foam frame');
        if (foamItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${foamItem.label}`,
            category: 'option',
            optionCode: 'foam_enhanced',
            quantity: qty,
            unitPrice: foamItem.price,
            totalPrice: foamItem.price * qty,
            confidence: foamItem.confidence,
            needsVerification: foamItem.needsVerification,
            explanation: `Option: Foam Enhanced`,
          });
        }
        // No fallback — foam is typically included in base model (3001-FE); if catalog missing, not critical
      }

      // ── F. ARGON GAS ─────────────────────────────────────────────────────
      if (opening.argon === true) {
        const argonItem = findOptionItem(items, 'argon', 'argon gas fill', 'argon fill');
        if (argonItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${argonItem.label}`,
            category: 'option',
            optionCode: 'argon',
            quantity: qty,
            unitPrice: argonItem.price,
            totalPrice: argonItem.price * qty,
            confidence: argonItem.confidence,
            needsVerification: argonItem.needsVerification,
            explanation: `Option: Argon Gas`,
          });
        }
      }

      // ── G. GLASS PACKAGE ──────────────────────────────────────────────────
      const gp = opening.glassPackage;
      if (gp && gp !== 'none' && gp !== 'None') {
        const isElite = gp.toLowerCase().includes('elite') || gp.toUpperCase() === 'LEE';
        
        // SolarZone Low-E (LE) is default and included in base price.
        // We only charge an option adder if it's Elite (LEE).
        if (isElite) {
          const gpLabel = 'SolarZone Elite Low-E Glass';
          const optionCode = 'glass_solarzone_elite';
          const gpItem = findOptionItem(items, 'solarzone elite', 'solar zone elite', 'elite glass');

          if (gpItem) {
            lineItems.push({
              openingNumber: opening.openingNumber,
              label: `#${opening.openingNumber} ${gpItem.label}`,
              category: 'option',
              optionCode,
              quantity: qty,
              unitPrice: gpItem.price,
              totalPrice: gpItem.price * qty,
              confidence: gpItem.confidence,
              needsVerification: gpItem.needsVerification,
              explanation: `Option: ${gpLabel} (catalog)`,
            });
          } else {
            const fallbackPrice = 110;
            lineItems.push({
              openingNumber: opening.openingNumber,
              label: `#${opening.openingNumber} ${gpLabel} (Fallback)`,
              category: 'option',
              optionCode,
              quantity: qty,
              unitPrice: fallbackPrice,
              totalPrice: fallbackPrice * qty,
              confidence: 0.5,
              needsVerification: true,
              explanation: `Fallback: ${gpLabel} not in catalog.`,
            });
            missingRules.push({
              openingNumber: opening.openingNumber,
              optionCode,
              label: gpLabel,
              description: `No catalog price for ${gpLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
            });
          }
        }
      }

      // ── H. ORIEL / TOP SASH ──────────────────────────────────────────────
      if (isOriel) {
        const orielItem = findOptionItem(items, 'oriel', 'cottage', 'top sash');
        const price = orielItem?.price ?? 36;
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${orielItem?.label || 'Oriel / Cottage Style (60/40 Split)'}`,
          category: 'option',
          optionCode: 'oriel_option',
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
          confidence: orielItem ? orielItem.confidence : 0.5,
          needsVerification: !orielItem,
          explanation: `Option: Oriel Style Split`,
        });
      }
      // ── H. NAIL FIN / J-CHANNEL ──────────────────────────────────────────
      if (opening.nailFin === true) {
        const nailFinItem = findOptionItem(items, 'nail fin', 'nail-fin', 'j-channel', 'j channel');
        if (nailFinItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${nailFinItem.label}`,
            category: 'option',
            optionCode: 'nail_fin',
            quantity: qty,
            unitPrice: nailFinItem.price,
            totalPrice: nailFinItem.price * qty,
            confidence: nailFinItem.confidence,
            needsVerification: nailFinItem.needsVerification,
            explanation: `Option: Nail Fin`,
          });
        }
      }

      // ── I. SPECIAL SHAPE TRIM ─────────────────────────────────────────────
      if (opening.specialShapeTrimSelected === true) {
        const trimItem = findOptionItem(items, 'special shape trim', 'shape trim', 'specialty trim');
        if (trimItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${trimItem.label}`,
            category: 'option',
            optionCode: 'special_shape_trim',
            quantity: qty,
            unitPrice: trimItem.price,
            totalPrice: trimItem.price * qty,
            confidence: trimItem.confidence,
            needsVerification: trimItem.needsVerification,
            explanation: `Option: Special Shape Trim`,
          });
        } else {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Special Shape Trim (Fallback)`,
            category: 'option',
            optionCode: 'special_shape_trim',
            quantity: qty,
            unitPrice: 75,
            totalPrice: 75 * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: Special Shape Trim not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode: 'special_shape_trim',
            label: 'Special Shape Trim',
            description: `No catalog price for Special Shape Trim on opening #${opening.openingNumber}. Fallback $75 used.`,
          });
        }
      }

      // ── J. RAIN OBSCURE GLASS ──────────────────────────────────────────────
      if ((opening as any).rainObscure === true) {
        const rainItem = findOptionItem(items, 'rain obscure', 'rain glass', 'rain pattern');
        if (rainItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${rainItem.label}`,
            category: 'option',
            optionCode: 'rain_obscure',
            quantity: qty,
            unitPrice: rainItem.price,
            totalPrice: rainItem.price * qty,
            confidence: rainItem.confidence,
            needsVerification: rainItem.needsVerification,
            explanation: `Option: Rain Obscure Glass`,
          });
        } else {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Rain Obscure Glass (Fallback)`,
            category: 'option',
            optionCode: 'rain_obscure',
            quantity: qty,
            unitPrice: 40,
            totalPrice: 40 * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: Rain Obscure not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode: 'rain_obscure',
            label: 'Rain Obscure Glass',
            description: `No catalog price for Rain Obscure on opening #${opening.openingNumber}. Fallback $40 used.`,
          });
        }
      }

      // ── K. STUCCO ALUMINUM REMOVAL ────────────────────────────────────────
      if ((opening as any).stuccoRemoval === true) {
        const stuccoItem = findLaborItem(items, 'stucco', 'aluminum from stucco', 'stucco removal') ||
                           findOptionItem(items, 'stucco removal', 'alum stucco', 'aluminum stucco');
        if (stuccoItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${stuccoItem.label}`,
            category: stuccoItem.category === 'labor' ? 'labor' : 'option',
            optionCode: 'stucco_alum_removal',
            quantity: qty,
            unitPrice: stuccoItem.price,
            totalPrice: stuccoItem.price * qty,
            confidence: stuccoItem.confidence,
            needsVerification: stuccoItem.needsVerification,
            explanation: `Labor: Remove Aluminum from Stucco`,
          });
        } else {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} Remove Aluminum from Stucco (Fallback)`,
            category: 'labor',
            optionCode: 'stucco_alum_removal',
            quantity: qty,
            unitPrice: 90,
            totalPrice: 90 * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: Stucco removal not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode: 'stucco_alum_removal',
            label: 'Remove Aluminum from Stucco',
            description: `No catalog price for Stucco Removal on opening #${opening.openingNumber}. Fallback $125 used.`,
          });
        }
      }

      // ── L. CUTBACK ────────────────────────────────────────────────────────
      if (opening.cutbackSelected === true || opening.cutbackRequired === true) {
        const type = opening.cutbackType || 'standard_stucco_cutback';
        let cutbackItem: any = null;
        let fallbackPrice = 50;
        let label = 'Cutback';
        let optionCode = 'cutback';

        if (type === 'standard_stucco_cutback') {
          cutbackItem = findOptionItem(items, 'standard stucco cutback', 'stucco cutback', 'cutback') || findLaborItem(items, 'standard stucco cutback', 'stucco cutback', 'cutback');
          fallbackPrice = 75;
          label = 'Standard Stucco Cutback';
          optionCode = 'cutback_standard_stucco';
        } else if (type === 'deep_stucco_cutback') {
          cutbackItem = findOptionItem(items, 'deep stucco cutback', 'deep cutback') || findLaborItem(items, 'deep stucco cutback', 'deep cutback');
          fallbackPrice = 125;
          label = 'Deep Stucco Cutback';
          optionCode = 'cutback_deep_stucco';
        } else if (type === 'siding_cutback') {
          cutbackItem = findOptionItem(items, 'siding cutback', 'cutback') || findLaborItem(items, 'siding cutback', 'cutback');
          fallbackPrice = 50;
          label = 'Siding Cutback';
          optionCode = 'cutback_siding';
        } else if (type === 'wood_trim_cutback') {
          cutbackItem = findOptionItem(items, 'wood trim cutback', 'wood cutback', 'cutback') || findLaborItem(items, 'wood trim cutback', 'wood cutback', 'cutback');
          fallbackPrice = 80;
          label = 'Wood/Trim Cutback';
          optionCode = 'cutback_wood_trim';
        } else if (type === 'brick_return_cutback') {
          cutbackItem = findOptionItem(items, 'brick return cutback', 'brick cutback', 'cutback') || findLaborItem(items, 'brick return cutback', 'brick cutback', 'cutback');
          fallbackPrice = 75;
          label = 'Brick Return Cutback';
          optionCode = 'cutback_brick_return';
        } else if (type === 'custom') {
          cutbackItem = findOptionItem(items, 'custom cutback', 'cutback') || findLaborItem(items, 'custom cutback', 'cutback');
          fallbackPrice = opening.cutbackAmount ?? 60;
          label = `Custom Cutback (${opening.cutbackAmount ? opening.cutbackAmount + '"' : 'custom'})`;
          optionCode = 'cutback_custom';
        } else if (type === 'needs_review') {
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode: 'cutback_needs_review',
            label: 'Cutback Needs Review',
            description: `Opening #${opening.openingNumber} has cutback set to 'Needs Review' and requires manager/installer review.`,
          });
        }

        if (type !== 'needs_review') {
          if (cutbackItem) {
            lineItems.push({
              openingNumber: opening.openingNumber,
              label: `#${opening.openingNumber} ${cutbackItem.label}`,
              category: cutbackItem.category === 'labor' ? 'labor' : 'option',
              optionCode,
              quantity: qty,
              unitPrice: cutbackItem.price,
              totalPrice: cutbackItem.price * qty,
              confidence: cutbackItem.confidence,
              needsVerification: cutbackItem.needsVerification,
              explanation: `Option: ${label}`,
            });
          } else {
            lineItems.push({
              openingNumber: opening.openingNumber,
              label: `#${opening.openingNumber} ${label} (Fallback)`,
              category: 'option',
              optionCode,
              quantity: qty,
              unitPrice: fallbackPrice,
              totalPrice: fallbackPrice * qty,
              confidence: 0.5,
              needsVerification: true,
              explanation: `Fallback: ${label} not in catalog. Add to Pricing Admin.`,
            });
            missingRules.push({
              openingNumber: opening.openingNumber,
              optionCode,
              label,
              description: `No catalog price for ${label} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
            });
          }
        }
      }

      // ── M. MULLION ────────────────────────────────────────────────────────
      if (opening.installMullion === true) {
        const isStructural = opening.structuralMullion === true;
        const mullLabel = isStructural ? 'Structural Mullion' : 'Mullion';
        const optionCode = isStructural ? 'structural_mull' : 'mullion';
        const mullItem = isStructural
          ? findOptionItem(items, 'structural mull', 'structural mullion') || findOptionItem(items, 'mullion', 'mull')
          : findOptionItem(items, 'mullion', 'mull', 'non-structural mull');
        if (mullItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${mullItem.label}`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: mullItem.price,
            totalPrice: mullItem.price * qty,
            confidence: mullItem.confidence,
            needsVerification: mullItem.needsVerification,
            explanation: `Option: ${mullLabel}`,
          });
        } else {
          const fallbackPrice = isStructural ? 150 : 30;
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${mullLabel} (Fallback)`,
            category: 'option',
            optionCode,
            quantity: qty,
            unitPrice: fallbackPrice,
            totalPrice: fallbackPrice * qty,
            confidence: 0.5,
            needsVerification: true,
            explanation: `Fallback: ${mullLabel} not in catalog. Add to Pricing Admin.`,
          });
          missingRules.push({
            openingNumber: opening.openingNumber,
            optionCode,
            label: mullLabel,
            description: `No catalog price for ${mullLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
          });
        }
      }
    }

    // ── EXTERIOR COLOR ──────────────────────────────────────────────────────
    const extColorRaw = (opening.exteriorColor || '').toLowerCase();
    if (extColorRaw && !['white', 'wht', 'none', ''].includes(extColorRaw)) {
      const colorItem = findOptionItem(items, 'exterior color', 'painted exterior', 'custom color');
      const colorPrice = colorItem?.price ?? 75; // Fallback for painted exterior
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${colorItem?.label ?? 'Exterior Color'} (${opening.exteriorColor})`,
        category: 'option',
        optionCode: 'exterior_color',
        quantity: qty,
        unitPrice: colorPrice,
        totalPrice: colorPrice * qty,
        confidence: colorItem ? colorItem.confidence : 0.5,
        needsVerification: !colorItem,
        explanation: `Exterior Color required for ${opening.exteriorColor}`,
      });
      if (!colorItem) {
        missingRules.push({
          openingNumber: opening.openingNumber,
          optionCode: 'exterior_color',
          label: 'Exterior Color',
          description: `No catalog price for Exterior Color on opening #${opening.openingNumber}. Fallback $75 used.`,
        });
      }
    }

    // ── SIDING-SPECIFIC OPTIONS ─────────────────────────────────────────────
    if (opening.productType === 'siding') {
      if (opening.jChannelFeet) {
        const jItem = findOptionItem(items, 'j-channel', 'j channel');
        const jPrice = jItem?.price ?? 2;
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${jItem?.label ?? 'J-Channel'} (${opening.jChannelFeet} ft)`,
          category: 'option',
          optionCode: 'j_channel',
          quantity: opening.jChannelFeet,
          unitPrice: jPrice,
          totalPrice: jPrice * opening.jChannelFeet,
          confidence: jItem ? jItem.confidence : 0.5,
          needsVerification: !jItem,
          explanation: `J-Channel: ${opening.jChannelFeet} feet`,
        });
      }
      if (opening.headerFlashingFeet) {
        const hfItem = findOptionItem(items, 'header flashing', 'header flash');
        const hfPrice = hfItem?.price ?? 3;
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${hfItem?.label ?? 'Header Flashing'} (${opening.headerFlashingFeet} ft)`,
          category: 'option',
          optionCode: 'header_flashing_siding',
          quantity: opening.headerFlashingFeet,
          unitPrice: hfPrice,
          totalPrice: hfPrice * opening.headerFlashingFeet,
          confidence: hfItem ? hfItem.confidence : 0.5,
          needsVerification: !hfItem,
          explanation: `Header Flashing: ${opening.headerFlashingFeet} feet`,
        });
      }
    }

    // ── TRIM & HEADER FLASHING (Windows) ───────────────────────────────────
    const trimRaw = (opening.trimType || '').toLowerCase();
    const needsTrim = opening.requiresTrimHeader === true || 
                      opening.trimIncluded === true || 
                      (trimRaw && trimRaw !== 'none');
                      
    const extSurface = (opening.exteriorSurface || '').toLowerCase();
    const needsHeaderFlashing = opening.headerFlashingFeet > 0 || 
      extSurface.includes('siding') || 
      (opening as any).exteriorType === 'siding' ||
      opening.headerFlashingIncluded === true ||
      opening.headerFlashingSelected === true;

    if (needsTrim) {
      const trimItem = findOptionItem(items, 'trim', 'vinyl trim', 'exterior trim', 'interior trim');
      const trimPrice = trimItem?.price ?? 40;
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${trimItem?.label ?? 'Custom Trim'}`,
        category: 'option',
        optionCode: 'vinyl_trim',
        quantity: qty,
        unitPrice: trimPrice,
        totalPrice: trimPrice * qty,
        confidence: trimItem ? trimItem.confidence : 0.5,
        needsVerification: !trimItem,
        explanation: `Trim required for opening #${opening.openingNumber}`,
      });
      if (!trimItem) {
        missingRules.push({
          openingNumber: opening.openingNumber,
          optionCode: 'vinyl_trim',
          label: 'Custom Trim',
          description: `No catalog price for Trim on opening #${opening.openingNumber}. Fallback $40 used.`,
        });
      }
    }

    if (needsHeaderFlashing) {
      const flashItem = findOptionItem(items, 'header flashing', 'header flash', 'flashing');
      const flashPrice = flashItem?.price ?? 12;
      lineItems.push({
        openingNumber: opening.openingNumber,
        label: `#${opening.openingNumber} ${flashItem?.label ?? 'Header Flashing (Siding Exterior)'}`,
        category: 'option',
        optionCode: 'header_flashing',
        quantity: qty,
        unitPrice: flashPrice,
        totalPrice: flashPrice * qty,
        confidence: flashItem ? flashItem.confidence : 0.5,
        needsVerification: !flashItem,
        explanation: `Header Flashing required — siding exterior detected`,
      });
      if (!flashItem) {
        missingRules.push({
          openingNumber: opening.openingNumber,
          optionCode: 'header_flashing',
          label: 'Header Flashing (Siding)',
          description: `No catalog price for Header Flashing on opening #${opening.openingNumber}. Fallback $12 used.`,
        });
      }
    }

    // ── SILL REPAIR ────────────────────────────────────────────────────────
    if (opening.sillRepair === true) {
      const sillItem = findOptionItem(items, 'sill repair', 'sill', 'sill replacement');
      if (sillItem) {
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${sillItem.label}`,
          category: 'option',
          optionCode: 'sill_repair',
          quantity: qty,
          unitPrice: sillItem.price,
          totalPrice: sillItem.price * qty,
          confidence: sillItem.confidence,
          needsVerification: sillItem.needsVerification,
          explanation: `Sill Repair`,
        });
      }
    }

    // ── WINDOW REMOVAL / LABOR ─────────────────────────────────────────────
    const remType = (opening.removalType || '').toLowerCase();
    if (remType && remType !== 'none') {
      const isFullTearout = remType === 'full_tearout';
      const isStorm = remType === 'storm_only' || remType === 'storm';
      const isAlum = remType.includes('alum');
      const isWood = remType.includes('wood');
      
      const removalLabel = isFullTearout
        ? 'Full Tearout / Window Removal'
        : isStorm
        ? 'Storm Window Removal'
        : isAlum 
        ? 'Aluminum Window Removal'
        : isWood
        ? 'Wood Window Removal'
        : 'Window Removal (Insert)';

      const optionCode = isFullTearout ? 'removal_full_tearout' : isStorm ? 'removal_storm' : 'removal_insert';

      // Try labor category first, then option category
      const laborItem =
        findLaborItem(items, isFullTearout ? 'full tearout' : isStorm ? 'storm' : isAlum ? 'aluminum removal' : isWood ? 'wood removal' : 'insert', 'removal') ||
        findOptionItem(items, isFullTearout ? 'full tearout' : isStorm ? 'storm removal' : 'window removal', 'removal');

      if (laborItem) {
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${laborItem.label}`,
          category: laborItem.category === 'labor' ? 'labor' : 'option',
          optionCode,
          quantity: qty,
          unitPrice: laborItem.price,
          totalPrice: laborItem.price * qty,
          confidence: laborItem.confidence,
          needsVerification: laborItem.needsVerification,
          explanation: `Labor: ${removalLabel}`,
        });
      } else {
        // ALWAYS add a fallback — never silently drop a removal charge
        const fallbackPrice = isFullTearout ? 125 : isStorm ? 45 : 60;
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${removalLabel} (Fallback)`,
          category: 'labor',
          optionCode,
          quantity: qty,
          unitPrice: fallbackPrice,
          totalPrice: fallbackPrice * qty,
          confidence: 0.5,
          needsVerification: true,
          explanation: `Fallback: ${removalLabel} not in catalog. Add to Pricing Admin.`,
        });
        missingRules.push({
          openingNumber: opening.openingNumber,
          optionCode,
          label: removalLabel,
          description: `No catalog price for ${removalLabel} on opening #${opening.openingNumber}. Fallback $${fallbackPrice} used.`,
        });
      }
    }
  }

  return { lineItems, missingRules };
}
