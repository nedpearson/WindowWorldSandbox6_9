// ═══════════════════════════════════════════════════════════════
// Shared Types — Single source of truth for all data shapes
// Every component, page, and utility must import from here.
// ═══════════════════════════════════════════════════════════════

// ─── User ────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  avatarUrl?: string;
}

// ─── Customer ────────────────────────────────────────────────
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  leadSource?: string;
  preLead1978: boolean;
  customerId?: string;
}

// ─── Appointment ─────────────────────────────────────────────
export interface Appointment {
  id: string;
  customerId: string;
  userId: string;
  status: 'draft' | 'in_progress' | 'quoted' | 'sold' | 'cancelled' | string;
  appointmentDate?: string;
  jobAddress?: string;
  jobCity?: string;
  jobState?: string;
  jobZip?: string;
  projectType?: string;
  completeJob: boolean;
  poNumber?: string;
  accountNumber?: string;
  notes?: string;
  estimatorNotes?: string;
  installerNotes?: string;
  officeNotes?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  adminFee: number;
  discount: number;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  financingAmount: number;
  hasMaintenanceAgreement?: boolean;
  clearStoryOverride?: boolean;
  secondStoryCharge?: boolean;
  pricingVersionId?: string;
  pre1978Status?: string;
  completionPct: number;
  lockedAt?: string;
  lockedReason?: string;
  createdAt: string;
  updatedAt: string;

  // Relations (populated by API includes)
  customer?: Customer;
  openings?: Opening[];
  signatures?: Signature[];
  houseMap?: HouseMap;
  contracts?: Contract[];
  lineItems?: QuoteLineItem[];
  preVisitPropertyProfile?: PreVisitPropertyProfile;
  syntheticInferences?: SyntheticInference[];
}

// ─── Synthetic AI ──────────────────────────────────────────────
export interface PreVisitPropertyProfile {
  id: string;
  appointmentId: string;
  address: string;
  propertyFactsJson?: any;
  imageryStatus: string;
  confidenceLevel?: string;
  createdAt: string;
}

export interface SyntheticInference {
  id: string;
  appointmentId: string;
  agentType: string;
  inferredData?: any;
  confidenceScore: number;
  acceptedByUser: boolean;
  createdAt: string;
}

// ─── Opening ─────────────────────────────────────────────────
export interface Opening {
  id: string;
  appointmentId: string;
  openingNumber: number;
  quantity: number;
  companyId?: string;
  roomLocation?: string;
  elevation?: string;
  floorNumber?: number;
  width?: number;
  height?: number;
  unitedInches?: number;
  productCategory?: string;
  productModel?: string;
  seriesModel?: string;
  interiorColor?: string;
  exteriorColor?: string;
  // Grid — legacy field (used by order form export)
  gridStyle?: string;
  // Grid — new rich fields
  gridPattern?: string;
  gridProfile?: string;
  gridVerticalCount?: number;
  gridHorizontalCount?: number;
  gridPlacement?: string;
  gridNotes?: string;
  gridConfirmed?: boolean;
  sdlSize?: string;
  isSDL?: boolean;
  isGBG?: boolean;
  gridRequiresAudit?: boolean;
  glassPackage?: string;
  temperedGlass?: string;
  obscureGlass?: string;
  argon: boolean;
  foamEnhanced: boolean;
  lowEPackage?: string;
  screenOption?: string;
  nailFin: boolean;
  // Oriel specifics
  oriel: boolean;
  orielType?: string;
  orielUpperSashHeight?: number;
  orielMeasurementBasis?: string;
  orielMeetingRailReference?: string;
  orielConfirmed?: boolean;
  orielNotes?: string;
  horizontalRR: boolean;
  hinge?: string;
  exteriorType?: string;
  exteriorSurface?: string;
  exteriorConditionNotes?: string;
  requiresTrimHeader?: boolean;
  requiresSpecialHandling?: boolean;
  trimType?: string;
  trimNotes?: string;
  removalType?: string;
  installType?: string;
  sillRepair: boolean;
  installNotes?: string;
  customerNotes?: string;
  installerNotes?: string;
  copiedFromOpeningId?: string;
  measurementConfirmed?: boolean;
  safetyConfirmed?: boolean;
  basePrice: number;
  optionsPrice: number;
  laborPrice: number;
  totalPrice: number;
  radius?: number;
  customRadius?: number;
  legHeight?: number;
  // Shape specifics
  shapeType?: string;
  shapeOrientation?: string;
  shapeSpringlineHeight?: number;
  shapeRise?: number;
  shapeHighSide?: number;
  shapeLowSide?: number;
  shapeSlopeDirection?: string;
  shapeAcrossFlats?: number;
  specialtyNotes?: string;
  needsVerification: boolean;
  pricingStatus?: string;

  // ── Special Shape Trim (Rule A) ──────────────────────────────────────────
  specialShapeTrimRequired?: boolean;
  specialShapeTrimSelected?: boolean;
  specialShapeTrimPrice?: number;

  // ── Measurement Method ──────────────────────────────────────────────────
  measurementMethod?: string;       // inside | outside | cush | unknown
  outsideMeasureUsed?: boolean;

  // ── Siding / Outside Measure Rules ────────────────────────────────────
  cutbackLikely?: boolean;
  cutbackSelected?: boolean;
  cutbackReviewStatus?: string;     // pending | confirmed | not_needed | manager_review

  headerRequired?: boolean;
  headerSelected?: boolean;
  headerFlashingSelected?: boolean;

  trimRequiredReview?: boolean;
  trimSelected?: boolean;
  trimDecision?: string;            // add_trim | not_needed | manager_review
  trimDecisionReason?: string;
  trimPhotoRequired?: boolean;
  managerReviewRequired?: boolean;

  // ── Source of Truth Fields (added 2026-05-31) ──
  measurementBasis?: string;
  measurementBasisDefaulted?: boolean;
  measurementBasisOverridden?: boolean;
  outsideMeasurementConfirmed?: boolean;
  insideMeasurementConfirmed?: boolean;
  measurementBasisNotes?: string;
  measurementNeedsReview?: boolean;

  cutbackType?: string;
  cutbackAmount?: number;
  cutbackIncludedInPrice?: boolean;
  cutbackNotes?: string;
  cutbackNeedsReview?: boolean;

  headerType?: string;
  headerMaterial?: string;
  headerColor?: string;
  headerIncludedInPrice?: boolean;
  headerNotes?: string;
  headerNeedsReview?: boolean;

  trimIncludedInPrice?: boolean;
  trimNeedsReview?: boolean;
  installMethod?: string;

  // ── New measurement/cutback/guidance fields ──
  preferredMeasurementBasis?: string;
  actualMeasurementBasis?: string;
  cutbackRequired?: boolean;
  removalDetail?: string;
  trimIncluded?: boolean;
  headerFlashingIncluded?: boolean;
  measurementGuidanceAccepted?: boolean;
  measurementGuidanceOverrideReason?: string;
  outsidePhotoId?: string;
  measurementVisualAnnotationId?: string;
  mullGroup?: string;
  installMullion?: boolean;
  structuralMullion?: boolean;

  createdAt: string;
  updatedAt: string;

  // Relations
  photos?: OpeningPhoto[];
}

// ─── Opening Photo ───────────────────────────────────────────
export interface OpeningPhoto {
  id: string;
  companyId?: string;
  projectId?: string;
  appointmentId?: string;
  customerId?: string;
  sketchId?: string;
  sketchObjectId?: string;
  openingId?: string;
  elevation?: string;
  itemType?: string;
  markerNumber?: number;
  photoType?: string;        // exterior_opening | interior_opening | tape_width | etc.
  originalUrl?: string;
  annotatedUrl?: string;
  thumbnailUrl?: string;
  storagePath?: string;
  notes?: string;          // replaces old 'caption'
  uploadedBy?: string;
  capturedAt?: string;
  createdAt: string;
}

// ─── Signature ───────────────────────────────────────────────
export interface Signature {
  id: string;
  appointmentId: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signedAt: string;
  createdAt: string;
}

// ─── Contract ────────────────────────────────────────────────
export interface Contract {
  id: string;
  appointmentId: string;
  pdfUrl?: string;
  version: number;
  status: string;
  formData?: string;
}

// ─── Quote Line Item ─────────────────────────────────────────
export interface QuoteLineItem {
  id: string;
  appointmentId: string;
  label: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  needsVerification: boolean;
  sortOrder: number;
}

// ─── House Map ───────────────────────────────────────────────
export interface HouseMap {
  id: string;
  appointmentId: string;
  sketchData?: string;
  sketchImage?: string;
  exteriorMaterial?: string;
  notes?: string;
  markers?: HouseMapMarker[];
}

export interface HouseMapMarker {
  id: string;
  houseMapId: string;
  elevation: string;
  x: number;
  y: number;
  openingNumber: number;
  label?: string;
  roomName?: string;
  floorLevel?: number;
  accessNotes?: string;
  installNotes?: string;
}

// ─── Sketch (New Drawing Engine) ─────────────────────────────
export interface SketchMarker {
  id: string;
  sketchId: string;
  companyId?: string;
  markerType: string;
  markerNumber?: number;
  markerSymbol?: string;
  markerLabel?: string;
  windowType?: string;
  shapeType?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  unitedInches?: number;
  elevation?: string;
  roomLocation?: string;
  floorNumber?: number;
  productType?: string;
  specialtyType?: string;
  installComplexity?: string;
  ladderReq: boolean;
  removalType?: string;
  installType?: string;
  exteriorMaterial?: string;
  notes?: string;
  pricingStatus?: string;
  linkedOrderRowNumber?: number;
  validationStatus?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  links?: SketchMarkerLink[];
}

export interface SketchMarkerLink {
  id: string;
  markerId: string;
  openingId?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SketchMarkerGroup {
  id: string;
  sketchId: string;
  companyId?: string;
  groupType: string; // mull_pair | twin | triple | bay_bow | field_note | other
  groupNote?: string;
  keepSeparateRows: boolean;
  needsReview: boolean;
  pricingReviewed: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  markers?: SketchMarker[];
  members?: SketchMarkerGroupMember[];
}

export interface SketchMarkerGroupMember {
  id: string;
  groupId: string;
  markerId: string;
  position: number;
  createdAt: string;
}

// ─── Pricing ─────────────────────────────────────────────────
export interface PricingVersion {
  id: string;
  name: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  publishedAt?: string;
  notes?: string;
  items?: PricingVersionItem[];
}

export interface PricingVersionItem {
  id: string;
  pricingVersionId: string;
  category: string;
  productCategory?: string;
  seriesModel?: string;
  label: string;
  unitedInchesMin?: number;
  unitedInchesMax?: number;
  price: number;
  priceType: string;
  confidence: number;
  needsVerification: boolean;
}

// ─── Walkthrough ─────────────────────────────────────────────
export interface WalkthroughSession {
  id: string;
  appointmentId: string;
  userId: string;
  status: string;
  totalRooms: number;
  completionPct: number;
  completedRooms: string[];
  completedAt?: string;
}

export interface WalkthroughRoom {
  id: string;
  sessionId: string;
  appointmentId: string;
  roomName: string;
  roomType: string;
  floorNumber: number;
  sortOrder: number;
  openingCount: number;
  completionPct: number;
  status: 'pending' | 'completed' | 'skipped' | string;
  notes?: string;
  openings?: WalkthroughRoomOpening[];
}

export interface WalkthroughRoomOpening {
  id: string;
  roomId: string;
  openingId?: string;
  openingNumber?: number;
  productType?: string;
  width?: number;
  height?: number;
  notes?: string;
}

// ─── Commission ──────────────────────────────────────────────
export interface CommissionRecord {
  id: string;
  userId: string;
  importId?: string;
  sourceFileName?: string;
  customerName?: string;
  customerId_?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  customerPhone?: string;
  region?: string;
  contractNumber?: string;
  orderNumber?: string;
  soldDate?: string;
  installDate?: string;
  salesRepName?: string;
  salesRepNumber?: string;
  result?: string;
  numWindows?: number;
  jobAmount?: number;
  totalSaleAmount?: number;
  commissionableAmt?: number;
  commissionAmount?: number;
  commissionRate?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  adjustedAmount?: number;
  adminFee?: number;
  commissionStatus: string;
  paymentDate?: string;
  checkNumber?: string;
  notes?: string;
  comments?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  payments?: CommissionPayment[];
  adjustments?: CommissionAdjustment[];
  links?: CommissionRecordLink[];
}

export interface CommissionPayment {
  id: string;
  commissionId: string;
  amount: number;
  paymentDate?: string;
  checkNumber?: string;
  paymentMethod?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface CommissionAdjustment {
  id: string;
  commissionId: string;
  adjustmentType: string;
  amount: number;
  reason?: string;
  notes?: string;
  adjustedBy?: string;
  adjustedAt: string;
}

export interface CommissionRecordLink {
  id: string;
  commissionId: string;
  appointmentId?: string;
  customerId?: string;
  linkType: string;
  matchConfidence?: number;
  matchReason?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
}

// ─── Calculation Engine Types (mirror server) ────────────────
export type FrameType = 'fin' | 'block' | 'retrofit' | 'stucco' | 'siding' | 'brick' | 'wood_buck';
export type SplitType = '1/3_over_2/3' | '2/3_over_1/3' | '1/2_over_1/2' | 'custom';

export interface UITier {
  label: string;
  min: number;
  max: number;
  index: number;
}

export interface RoughOpeningResult {
  roWidth: number;
  roHeight: number;
  adjustments: { label: string; widthAdj: number; heightAdj: number }[];
}

export interface ProfitResult {
  materialCost: number;
  laborCost: number;
  disposal: number;
  fuel: number;
  permit: number;
  financingFee: number;
  commission: number;
  discount: number;
  riskReserve: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number;
  netMargin: number;
  netMarginPct: number;
  riskAdjustedMargin: number;
  riskAdjustedMarginPct: number;
  status: 'green' | 'yellow' | 'red';
}

export interface StructuralWarning {
  level: 'none' | 'review' | 'concern' | 'critical';
  reasons: string[];
  message: string;
}

export interface LeadTimeResult {
  baseDays: number;
  modifiers: { label: string; addDays: number }[];
  totalDays: number;
  risk: 'standard' | 'delayed' | 'high_risk' | 'manager_review';
}

// --- Canonical Mull Group ---
export interface MullGroup {
  mullGroupId: string;
  appointmentId: string;
  sideOrElevation?: string;
  openingIds: string[];
  openingNumbers: number[];
  mullType: 'standard' | 'field' | 'factory' | 'structural' | 'horizontal' | 'vertical' | 'custom';
  orientation?: 'vertical' | 'horizontal';
  structuralReviewRequired: boolean;
  pricingLineItemId?: string;
  notes?: string;
  sketchLineId?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

// --- Canonical Finance ---
export interface FinanceOption {
  id: string;
  code: string;
  displayName: string;
  termMonths: number;
  promoMonths: number;
  apr: number;
  factor?: number;
  minimumAmount?: number;
  maximumAmount?: number;
  monthlyPaymentFormulaType: string;
  disclosureText?: string;
  active: boolean;
  sortOrder: number;
  sourceVersion: string;
}

export interface SelectedFinance {
  appointmentId: string;
  quoteGroupId?: string;
  selectedFinanceOptionId: string;
  selectedFinanceCode: string;
  amountFinanced: number;
  downPayment: number;
  financedBalance: number;
  termMonths: number;
  apr: number;
  promoMonths: number;
  monthlyPayment: number;
  disclosureText?: string;
  calculatedAt: string;
  sourceVersion: string;
}
