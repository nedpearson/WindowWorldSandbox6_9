// ═══════════════════════════════════════════════════════════════
// Photo-Based Replacement Recommendation Engine
// Analyzes rep-tagged photo features to recommend replacement
// products with Good/Better/Best tiers, sales talking points,
// confidence scoring, and order-form auto-population.
// ═══════════════════════════════════════════════════════════════

import type { MarkerSymbol, WindowType } from './sketchSync';

// ── Detected Feature Tags (rep selects from photo) ──────────
export type ExistingFrameMaterial = 'aluminum' | 'wood' | 'vinyl' | 'steel' | 'composite' | 'unknown';
export type ExistingCondition = 'good' | 'fair' | 'poor' | 'failing';
export type GridPattern = 'none' | 'colonial' | 'prairie' | 'diamond' | 'custom';
export type ExteriorSurface = 'brick' | 'vinyl_siding' | 'wood_siding' | 'fiber_cement' | 'stucco' | 'stone' | 'fascia' | 'soffit';
export type TrimType = 'wood' | 'aluminum_wrap' | 'vinyl' | 'composite';
export type DamageType = 'none' | 'rot' | 'seal_failure' | 'cracked_glass' | 'water_damage' | 'poor_fitment' | 'fogging' | 'draft';

export interface PhotoFeatureTags {
  // Window features
  existingType?: WindowType | 'entry_door' | 'storm_door';
  frameMaterial?: ExistingFrameMaterial;
  condition?: ExistingCondition;
  paneCount?: 1 | 2 | 3;
  gridPattern?: GridPattern;
  frameColor?: string;
  exteriorSurface?: ExteriorSurface;
  // Damage indicators
  damages?: DamageType[];
  // Location context
  isNearBathroom?: boolean;
  isNearStairs?: boolean;
  isNearDoor?: boolean;
  isAboveGround?: boolean;
  floorLevel?: 1 | 2 | 3;
  // Door-specific
  doorSwing?: 'left' | 'right';
  hasSidelites?: boolean;
  hasTransom?: boolean;
  // Exterior / Siding
  sidingProfile?: string;
  sidingColor?: string;
  sidingDamageScope?: 'spot' | 'wall' | 'full_house';
  trimType?: TrimType;
  hasAluminumWrap?: boolean;
}

// ── Confidence Scoring ──────────────────────────────────────
export interface ConfidenceScores {
  identification: number; // 0-100
  measurement: number;
  recommendation: number;
  codeCompliance: number;
  overall: number;
  requiresManualConfirmation: boolean;
  lowConfidenceReasons: string[];
}

// ── Recommendation Tier ─────────────────────────────────────
export interface RecommendationTier {
  tier: 'good' | 'better' | 'best';
  label: string;
  productType: string;
  model: string;
  glassPackage: string;
  gridStyle: string;
  color: string;
  screen: string;
  estimatedPrice: number;
  monthlyPayment: number;
  benefits: string[];
  whyRecommended: string;
}

// ── Sales Talking Point ─────────────────────────────────────
export interface SalesTalkingPoint {
  category: 'energy' | 'savings' | 'curb_appeal' | 'maintenance' | 'comfort' | 'safety' | 'value';
  icon: string;
  headline: string;
  script: string;
}

// ── Full Recommendation Result ──────────────────────────────
export interface PhotoRecommendation {
  id: string;
  photoId: string;
  markerId: string;
  openingNumber: number | null;
  timestamp: number;
  // Analysis
  detectedType: string;
  detectedCondition: ExistingCondition;
  detectedIssues: string[];
  // Recommendations
  tiers: RecommendationTier[];
  defaultTier: 'good' | 'better' | 'best';
  // Sales
  talkingPoints: SalesTalkingPoint[];
  // Compliance
  temperedRequired: boolean;
  obscureRecommended: boolean;
  egressConcern: boolean;
  energyUpgradeRecommended: boolean;
  // Confidence
  confidence: ConfidenceScores;
  // Status
  status: 'pending_review' | 'accepted' | 'rejected' | 'modified';
  acceptedTier?: 'good' | 'better' | 'best';
  repOverrideReason?: string;
  // AI recommendations for installation details
  recommendedMeasurementBasis?: 'inside' | 'outside';
  cutbackRequired?: boolean;
  recommendedCutbackType?: string;
  cutbackAmount?: number | null;
  trimRecommendation?: string;
  headerRecommendation?: string;
  isWindowTypeMismatch?: boolean;
  // Order field mapping
  orderFields: Record<string, any>;
}

// ── Photo Analysis Record (persisted) ───────────────────────
export interface PhotoAnalysisRecord {
  id: string;
  appointmentId: string;
  markerId: string;
  openingNumber: number | null;
  photoDataUrl?: string; // base64 thumbnail (legacy/primary)
  photoDataUrls?: string[]; // base64 thumbnails (multiple photos)
  featureTags: PhotoFeatureTags;
  recommendation: PhotoRecommendation | null;
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

function detectIssues(tags: PhotoFeatureTags): string[] {
  const issues: string[] = [];
  const damages = tags.damages || [];

  if (damages.includes('seal_failure') || damages.includes('fogging')) {
    issues.push('Seal failure detected — insulated glass unit has failed');
  }
  if (damages.includes('rot')) {
    issues.push('Frame rot observed — structural integrity compromised');
  }
  if (damages.includes('cracked_glass')) {
    issues.push('Cracked glass — safety and energy concern');
  }
  if (damages.includes('water_damage')) {
    issues.push('Water damage around frame — possible moisture intrusion');
  }
  if (damages.includes('poor_fitment')) {
    issues.push('Poor fitment — gaps visible around frame');
  }
  if (damages.includes('draft')) {
    issues.push('Air leakage/draft reported — weatherstripping failure');
  }
  if (tags.frameMaterial === 'aluminum') {
    issues.push('Aluminum frame — poor thermal performance, condensation risk');
  }
  if (tags.frameMaterial === 'wood' && tags.condition !== 'good') {
    issues.push('Wood frame deterioration — maintenance burden');
  }
  if (tags.paneCount === 1) {
    issues.push('Single-pane glass — minimal insulation, high energy loss');
  }
  if (tags.condition === 'poor' || tags.condition === 'failing') {
    issues.push('Overall condition is ' + tags.condition + ' — replacement recommended');
  }
  if (tags.exteriorSurface === 'wood_siding' && tags.condition !== 'good') {
    issues.push('Wood siding shows wear — high maintenance required, consider vinyl');
  }
  if (tags.trimType === 'wood' && damages.includes('rot')) {
    issues.push('Wood trim rot detected — recommend PVC composite or aluminum wrap');
  }
  if (tags.damages?.includes('water_damage')) {
    issues.push('Water damage detected — underlying sheathing inspection required');
  }
  return issues;
}

function computeConfidence(tags: PhotoFeatureTags): ConfidenceScores {
  const reasons: string[] = [];
  let id = 80, meas = 30, rec = 75, code = 70;

  // Boost identification confidence with more tags
  if (tags.existingType) id += 10;
  if (tags.frameMaterial) id += 5;
  if (tags.condition) id += 5;
  if (!tags.existingType) { id -= 30; reasons.push('Window/door type not identified'); }
  if (!tags.frameMaterial) { id -= 10; reasons.push('Frame material unknown'); }

  // Measurement confidence is always low from photos alone
  if (!tags.floorLevel) { meas -= 10; reasons.push('Floor level not specified'); }
  reasons.push('Photo-based — manual measurements required');

  // Recommendation confidence
  if ((tags.damages || []).length > 0) rec += 10;
  if (tags.condition === 'failing') rec += 10;
  if (tags.condition === 'good') { rec -= 15; reasons.push('Existing condition is good — verify replacement need'); }

  // Code compliance
  if (tags.isNearBathroom !== undefined) code += 10;
  if (tags.isNearStairs !== undefined) code += 5;
  if (tags.isAboveGround !== undefined) code += 5;

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  id = clamp(id); meas = clamp(meas); rec = clamp(rec); code = clamp(code);
  const overall = Math.round((id + meas + rec + code) / 4);

  return {
    identification: id,
    measurement: meas,
    recommendation: rec,
    codeCompliance: code,
    overall,
    requiresManualConfirmation: meas < 50 || overall < 60,
    lowConfidenceReasons: reasons,
  };
}

// ── Tier Builder ────────────────────────────────────────────
function buildWindowTiers(tags: PhotoFeatureTags, markerSymbol: MarkerSymbol): RecommendationTier[] {
  const isSlider = markerSymbol === 'slider' || tags.existingType === 'slider';
  const isPic = markerSymbol === 'picture' || tags.existingType === 'picture';
  const isCas = markerSymbol === 'casement' || tags.existingType === 'casement';

  const type = isPic ? 'Picture' : isSlider ? 'Slider' : isCas ? 'Casement' : 'Double Hung';
  const matchGrid = tags.gridPattern && tags.gridPattern !== 'none';
  const gridLabel = matchGrid ? (tags.gridPattern === 'colonial' ? 'Colonial' : tags.gridPattern === 'prairie' ? 'Prairie' : 'Colonial') : 'None';
  const extColor = tags.frameColor || 'White';
  const screen = isPic ? 'No Screen' : 'Full Screen';

  return [
    {
      tier: 'good',
      label: '💲 Good — Value',
      productType: type,
      model: '4000 Series',
      glassPackage: 'LEE',
      gridStyle: gridLabel,
      color: extColor,
      screen,
      estimatedPrice: isPic ? 280 : isSlider ? 320 : isCas ? 380 : 295,
      monthlyPayment: isPic ? 12 : isSlider ? 14 : isCas ? 16 : 13,
      benefits: ['Same opening size — no structural changes', 'Standard Low-E insulated glass', 'Vinyl maintenance-free frame'],
      whyRecommended: 'Most cost-effective replacement. Fits existing opening without modification.',
    },
    {
      tier: 'better',
      label: '⭐ Better — Recommended',
      productType: type,
      model: '4000 Series',
      glassPackage: 'SolarZone',
      gridStyle: gridLabel,
      color: extColor,
      screen,
      estimatedPrice: isPic ? 360 : isSlider ? 410 : isCas ? 480 : 385,
      monthlyPayment: isPic ? 15 : isSlider ? 17 : isCas ? 20 : 16,
      benefits: ['SolarZone glass — better UV and heat blocking', 'Argon gas fill for improved insulation', 'Foam-enhanced frame for energy efficiency', 'Best value for performance'],
      whyRecommended: 'Best balance of energy savings and price. Reduces energy bills and improves comfort.',
    },
    {
      tier: 'best',
      label: '🏆 Best — Premium',
      productType: type,
      model: '6000 Series',
      glassPackage: 'SolarZone Elite',
      gridStyle: gridLabel,
      color: extColor,
      screen,
      estimatedPrice: isPic ? 480 : isSlider ? 540 : isCas ? 620 : 510,
      monthlyPayment: isPic ? 20 : isSlider ? 23 : isCas ? 26 : 22,
      benefits: ['SolarZone Elite — maximum energy efficiency', 'Triple-seal weatherstripping', 'Premium hardware and aesthetics', 'Strongest curb appeal', 'Highest ENERGY STAR rating'],
      whyRecommended: 'Top-tier performance and appearance. Maximum energy savings and home value impact.',
    },
  ];
}

function buildDoorTiers(tags: PhotoFeatureTags, markerSymbol: MarkerSymbol): RecommendationTier[] {
  const isSGD = markerSymbol === 'sgd' || tags.existingType === 'patio_door';
  const isPatio = markerSymbol === 'patio_door';
  const type = isSGD ? 'Sliding Glass Door' : isPatio ? 'Patio Door' : 'Entry Door';
  const extColor = tags.frameColor || 'White';

  return [
    {
      tier: 'good', label: '💲 Good — Value', productType: type, model: 'Standard',
      glassPackage: 'LEE', gridStyle: 'None', color: extColor, screen: isSGD ? 'Sliding Screen' : 'No Screen',
      estimatedPrice: isSGD ? 1200 : 850,
      monthlyPayment: isSGD ? 50 : 36,
      benefits: ['Standard insulated glass', 'New weatherstripping and hardware', 'Improved security'],
      whyRecommended: 'Cost-effective door replacement with improved seal and security.',
    },
    {
      tier: 'better', label: '⭐ Better — Recommended', productType: type, model: 'Premium',
      glassPackage: 'SolarZone', gridStyle: 'None', color: extColor, screen: isSGD ? 'Sliding Screen' : 'No Screen',
      estimatedPrice: isSGD ? 1600 : 1100,
      monthlyPayment: isSGD ? 67 : 46,
      benefits: ['SolarZone glass for energy savings', 'Heavy-duty hardware', 'Multi-point locking system', 'Improved threshold seal'],
      whyRecommended: 'Best value with enhanced energy performance and security features.',
    },
    {
      tier: 'best', label: '🏆 Best — Premium', productType: type, model: 'Elite',
      glassPackage: 'SolarZone Elite', gridStyle: 'Colonial', color: extColor, screen: isSGD ? 'Sliding Screen' : 'No Screen',
      estimatedPrice: isSGD ? 2200 : 1500,
      monthlyPayment: isSGD ? 92 : 63,
      benefits: ['Elite glass package — maximum efficiency', 'Designer hardware collection', 'Impact-resistant option available', 'Premium curb appeal'],
      whyRecommended: 'Top-of-line door with maximum performance, security, and aesthetics.',
    },
  ];
}

// ── Siding / Exterior Tier Builder ──────────────────────────
function buildSidingTiers(tags: PhotoFeatureTags): RecommendationTier[] {
  const scope = tags.sidingDamageScope === 'full_house' ? 'Whole House' : tags.sidingDamageScope === 'wall' ? 'Single Wall' : 'Spot Repair';
  const sqftEstimate = scope === 'Whole House' ? 2200 : scope === 'Single Wall' ? 400 : 100;
  
  return [
    {
      tier: 'good', label: '💲 Good — Standard Vinyl', productType: 'Vinyl Siding', model: '4000 Series .042',
      glassPackage: 'N/A', gridStyle: 'N/A', color: tags.sidingColor || 'White', screen: 'N/A',
      estimatedPrice: sqftEstimate * 6.50,
      monthlyPayment: Math.round((sqftEstimate * 6.50) / 60),
      benefits: ['Low maintenance', 'Never needs painting', 'Standard wind resistance'],
      whyRecommended: `Cost-effective solution for ${scope} replacement.`,
    },
    {
      tier: 'better', label: '⭐ Better — Premium Insulated', productType: 'Insulated Vinyl Siding', model: '6000 Series .046',
      glassPackage: 'N/A', gridStyle: 'N/A', color: tags.sidingColor || 'White', screen: 'N/A',
      estimatedPrice: sqftEstimate * 8.50,
      monthlyPayment: Math.round((sqftEstimate * 8.50) / 60),
      benefits: ['Foam-backed for rigidity', 'Increased R-value (energy savings)', 'Superior impact resistance', 'Quieter interior'],
      whyRecommended: `Best value for ${scope}. Improves thermal envelope and straightens uneven walls.`,
    },
    {
      tier: 'best', label: '🏆 Best — Fiber Cement / Composite', productType: 'Composite Siding', model: 'Elite Board',
      glassPackage: 'N/A', gridStyle: 'N/A', color: tags.sidingColor || 'White', screen: 'N/A',
      estimatedPrice: sqftEstimate * 12.00,
      monthlyPayment: Math.round((sqftEstimate * 12.00) / 60),
      benefits: ['Authentic wood-grain look', 'Fire resistant', 'Maximum durability', 'Premium curb appeal'],
      whyRecommended: `Highest end option for maximum durability and aesthetic value for ${scope}.`,
    },
  ];
}

// ── Sales Talking Points Generator ──────────────────────────
function generateTalkingPoints(tags: PhotoFeatureTags, issues: string[]): SalesTalkingPoint[] {
  const points: SalesTalkingPoint[] = [];

  if (tags.paneCount === 1 || tags.frameMaterial === 'aluminum' || (tags.damages || []).some(d => ['seal_failure', 'fogging', 'draft'].includes(d))) {
    points.push({
      category: 'energy', icon: '🌡️', headline: 'Energy Efficiency Upgrade',
      script: 'Your existing window appears to have poor thermal performance. Upgrading to Low-E argon insulated glass can reduce heat transfer by up to 50%, lowering energy bills and improving comfort year-round.',
    });
  }

  points.push({
    category: 'savings', icon: '💰', headline: 'Cost-Smart Replacement',
    script: 'Keeping the same opening size avoids any structural changes, which helps control project cost. A pocket replacement fits right into the existing frame opening.',
  });

  if (tags.gridPattern && tags.gridPattern !== 'none') {
    points.push({
      category: 'curb_appeal', icon: '🏠', headline: 'Matching Curb Appeal',
      script: `Matching the ${tags.gridPattern} grid pattern across all front-facing windows creates a clean, consistent exterior appearance that adds to home value.`,
    });
  }

  if (tags.frameMaterial === 'wood' || tags.frameMaterial === 'aluminum') {
    points.push({
      category: 'maintenance', icon: '🔧', headline: 'Maintenance-Free Vinyl',
      script: `Replacing ${tags.frameMaterial} frames with vinyl eliminates scraping, painting, and long-term maintenance costs. Vinyl won't rot, rust, or corrode.`,
    });
  }

  if ((tags.damages || []).some(d => ['rot', 'water_damage', 'cracked_glass'].includes(d))) {
    points.push({
      category: 'safety', icon: '🛡️', headline: 'Safety & Structural Integrity',
      script: 'The existing damage could compromise structural integrity and home security. New replacement products restore full protection and meet current building codes.',
    });
  }

  points.push({
    category: 'comfort', icon: '☀️', headline: 'Comfort Improvement',
    script: 'Upgraded insulated glass reduces drafts, hot spots, and noise — making every room more comfortable throughout the year.',
  });

  points.push({
    category: 'value', icon: '📈', headline: 'Home Value Impact',
    script: 'New windows and doors are one of the top home improvements for ROI. They improve both energy ratings and curb appeal for resale value.',
  });

  return points;
}

// ── Symbol Match Helper ──────────────────────────────────────
export function doesSymbolMatchWindowType(symbol: MarkerSymbol, type: string): boolean {
  if (!type) return true;
  const sym = symbol.toLowerCase();
  const t = type.toLowerCase();
  
  if (sym === 'dh' || sym === 'sh' || sym === 'window_x') {
    return t === 'double_hung' || t === 'single_hung' || t === 'oriel';
  }
  if (sym === 'slider') return t === 'slider';
  if (sym === 'picture') return t === 'picture';
  if (sym === 'casement') return t === 'casement' || t === 'awning';
  if (sym === 'awning') return t === 'casement' || t === 'awning';
  if (sym === 'patio_door') return t === 'patio_door';
  if (sym === 'sgd') return t === 'sgd' || t === 'patio_door';
  if (sym === 'oriel') return t === 'oriel' || t === 'double_hung';
  if (sym === 'special_shape') return t === 'special_shape' || t === 'picture';
  return true;
}

// ── Order Field Mapping ─────────────────────────────────────
function buildOrderFields(
  tier: RecommendationTier, 
  tags: PhotoFeatureTags, 
  temperedRequired: boolean, 
  obscureRecommended: boolean,
  recommendedMeasurementBasis: 'inside' | 'outside',
  cutbackRequired: boolean,
  recommendedCutbackType: string,
  cutbackAmount: number | null,
  trimRecommendation: string,
  headerRecommendation: string
): Record<string, any> {
  return {
    productCategory: tier.productType.toLowerCase().replace(/ /g, '_'),
    seriesModel: tier.model,
    glassPackage: tier.glassPackage,
    glassOption: tier.glassPackage,
    gridStyle: tier.gridStyle,
    exteriorColor: tier.color,
    interiorColor: 'White',
    screenOption: tier.screen,
    foamEnhanced: tier.tier !== 'good',
    argon: tier.tier !== 'good',
    temperedGlass: temperedRequired ? 'full' : 'none',
    obscureGlass: obscureRecommended ? 'full' : 'none',
    exteriorType: tags.exteriorSurface || '',
    installType: tags.exteriorSurface === 'brick' ? 'EXT' : 'INT',
    removalType: tags.frameMaterial === 'aluminum' ? 'ALUM' : tags.frameMaterial === 'wood' ? 'WOOD' : 'ALUM',
    installNotes: 'AI photo recommendation accepted by rep; manually verified required fields.',
    basePrice: tier.estimatedPrice,
    // AI installation details
    measurementBasis: recommendedMeasurementBasis,
    actualMeasurementBasis: recommendedMeasurementBasis,
    cutbackRequired: cutbackRequired,
    cutbackSelected: cutbackRequired,
    cutbackReviewStatus: cutbackRequired ? 'cutback_required' : 'not_needed',
    cutbackType: recommendedCutbackType,
    cutbackAmount: cutbackAmount,
    trimType: trimRecommendation,
    trimRequired: trimRecommendation !== 'None',
    trimDecision: trimRecommendation !== 'None' ? 'capping' : 'none',
    headerType: headerRecommendation,
    headerRequired: headerRecommendation !== 'None',
    headerSelected: headerRecommendation !== 'None',
    headerFlashingSelected: headerRecommendation !== 'None',
    measurementGuidanceAccepted: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════

export function analyzePhotoAndRecommend(
  tags: PhotoFeatureTags,
  markerId: string,
  markerSymbol: MarkerSymbol,
  openingNumber: number | null,
): PhotoRecommendation {
  const isDoor = ['front_door', 'back_door', 'patio_door', 'sgd'].includes(markerSymbol);
  const isSiding = markerSymbol === 'siding';
  const issues = detectIssues(tags);
  const confidence = computeConfidence(tags);
  const condition = tags.condition || 'fair';

  // Build tiers
  const tiers = isSiding
    ? buildSidingTiers(tags)
    : isDoor
    ? buildDoorTiers(tags, markerSymbol)
    : buildWindowTiers(tags, markerSymbol);

  // Talking points
  const talkingPoints = generateTalkingPoints(tags, issues);

  // Compliance flags
  const temperedRequired = !!(tags.isNearBathroom || tags.isNearStairs || tags.isNearDoor);
  const obscureRecommended = !!tags.isNearBathroom;
  const egressConcern = !!(tags.floorLevel && tags.floorLevel >= 2);

  // Default tier selection
  const defaultTier: 'good' | 'better' | 'best' =
    condition === 'failing' || issues.length >= 3 ? 'best'
    : condition === 'poor' || issues.length >= 2 ? 'better'
    : 'better'; // Always default to "better" — best value

  // ── AI Recommendations for Trim, Header, Measurement Basis & Cutback ──
  const isBrick = tags.exteriorSurface === 'brick' || tags.exteriorSurface === 'stone';
  const isStucco = tags.exteriorSurface === 'stucco';
  
  // Measurement Basis Recommendation
  const recommendedMeasurementBasis: 'inside' | 'outside' = isBrick ? 'inside' : 'outside';

  // Cutback Recommendation
  let cutbackRequired = false;
  let recommendedCutbackType = 'No cutback';
  let cutbackAmount: number | null = null;
  if (recommendedMeasurementBasis === 'outside') {
    if (isStucco) {
      cutbackRequired = true;
      recommendedCutbackType = 'Standard stucco cutback';
      cutbackAmount = 1.0;
    } else if (tags.trimType === 'wood' || tags.frameMaterial === 'wood') {
      cutbackRequired = true;
      recommendedCutbackType = 'Wood Casing Cutback';
      cutbackAmount = 0.75;
    }
  }

  // Trim Recommendation
  let trimRecommendation = 'None';
  if (tags.exteriorSurface && ['vinyl_siding', 'wood_siding', 'fiber_cement'].includes(tags.exteriorSurface)) {
    trimRecommendation = 'Vinyl trim';
  } else if (tags.trimType === 'wood' || tags.trimType === 'aluminum_wrap') {
    trimRecommendation = 'Exterior Capping';
  } else if (tags.trimType) {
    if (tags.trimType === 'vinyl') trimRecommendation = 'Vinyl trim';
    else if (tags.trimType === 'composite') trimRecommendation = 'Vinyl trim';
  }

  // Header Recommendation
  let headerRecommendation = 'None';
  if (tags.exteriorSurface && ['vinyl_siding', 'wood_siding', 'fiber_cement'].includes(tags.exteriorSurface)) {
    if (tags.condition === 'poor' || tags.condition === 'failing' || (tags.damages || []).includes('rot')) {
      headerRecommendation = 'New header';
    } else {
      headerRecommendation = 'Reuse header';
    }
  } else {
    headerRecommendation = isBrick ? 'None' : 'Reuse header';
  }

  // Mismatch detection
  const isWindowTypeMismatch = !!(tags.existingType && tags.existingType !== 'entry_door' && tags.existingType !== 'storm_door' && !doesSymbolMatchWindowType(markerSymbol, tags.existingType));

  const selectedTier = tiers.find(t => t.tier === defaultTier) || tiers[1];
  const orderFields = buildOrderFields(
    selectedTier,
    tags,
    temperedRequired,
    obscureRecommended,
    recommendedMeasurementBasis,
    cutbackRequired,
    recommendedCutbackType,
    cutbackAmount,
    trimRecommendation,
    headerRecommendation
  );

  return {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    photoId: `photo_${markerId}`,
    markerId,
    openingNumber,
    timestamp: Date.now(),
    detectedType: isDoor ? (markerSymbol === 'sgd' ? 'Sliding Glass Door' : 'Entry Door') : (tags.existingType || markerSymbol),
    detectedCondition: condition,
    detectedIssues: issues,
    tiers,
    defaultTier,
    talkingPoints,
    temperedRequired,
    obscureRecommended,
    egressConcern,
    energyUpgradeRecommended: tags.paneCount === 1 || tags.frameMaterial === 'aluminum' || condition === 'poor' || condition === 'failing',
    confidence,
    status: 'pending_review',
    recommendedMeasurementBasis,
    cutbackRequired,
    recommendedCutbackType,
    cutbackAmount,
    trimRecommendation,
    headerRecommendation,
    isWindowTypeMismatch,
    orderFields,
  };
}

import { getOfflineDb } from '../lib/offlineDb';

// ═══════════════════════════════════════════════════════════════
// PHOTO STORE — Local persistence for photo analysis records
// ═══════════════════════════════════════════════════════════════

export async function getPhotoRecords(appointmentId: string): Promise<PhotoAnalysisRecord[]> {
  try {
    const db = getOfflineDb();
    const records = await db.photo_analysis_records.where('appointmentId').equals(appointmentId).toArray();
    return records.map(r => ({
      ...r,
      featureTags: JSON.parse(r.featureTagsJson),
      recommendation: r.recommendationJson ? JSON.parse(r.recommendationJson) : null,
    }));
  } catch { return []; }
}

export async function getPhotoForMarker(markerId: string): Promise<PhotoAnalysisRecord | null> {
  try {
    const db = getOfflineDb();
    const record = await db.photo_analysis_records.where('markerId').equals(markerId).first();
    if (!record) return null;
    return {
      ...record,
      featureTags: JSON.parse(record.featureTagsJson),
      recommendation: record.recommendationJson ? JSON.parse(record.recommendationJson) : null,
    };
  } catch { return null; }
}

export async function savePhotoRecord(record: PhotoAnalysisRecord): Promise<void> {
  try {
    const db = getOfflineDb();
    await db.photo_analysis_records.put({
      id: record.id,
      appointmentId: record.appointmentId,
      markerId: record.markerId,
      openingNumber: record.openingNumber,
      photoDataUrl: record.photoDataUrl,
      photoDataUrls: record.photoDataUrls,
      featureTagsJson: JSON.stringify(record.featureTags),
      recommendationJson: record.recommendation ? JSON.stringify(record.recommendation) : '',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch { /* silent */ }
}

export async function deletePhotoRecord(id: string): Promise<void> {
  try {
    const db = getOfflineDb();
    await db.photo_analysis_records.delete(id);
  } catch { /* silent */ }
}

// ── Validation: Photo vs Order conflicts ────────────────────
export interface PhotoOrderConflict {
  field: string;
  photoValue: string;
  orderValue: string;
  message: string;
  severity: 'warning' | 'critical';
}

export function detectPhotoOrderConflicts(recommendation: PhotoRecommendation, opening: any): PhotoOrderConflict[] {
  if (!opening || recommendation.status !== 'accepted') return [];
  const conflicts: PhotoOrderConflict[] = [];
  const of = recommendation.orderFields;

  if (of.productCategory && opening.productCategory && of.productCategory !== opening.productCategory) {
    conflicts.push({
      field: 'productCategory', photoValue: of.productCategory, orderValue: opening.productCategory,
      message: `Photo detected ${of.productCategory} but order shows ${opening.productCategory}`,
      severity: 'warning',
    });
  }
  if (recommendation.temperedRequired && opening.temperedGlass === 'none') {
    conflicts.push({
      field: 'temperedGlass', photoValue: 'required', orderValue: 'none',
      message: 'Photo indicates tempered glass needed but order has none selected',
      severity: 'critical',
    });
  }
  if (recommendation.obscureRecommended && opening.obscureGlass === 'none') {
    conflicts.push({
      field: 'obscureGlass', photoValue: 'recommended', orderValue: 'none',
      message: 'Photo indicates bathroom/privacy — obscure glass recommended',
      severity: 'warning',
    });
  }
  return conflicts;
}
