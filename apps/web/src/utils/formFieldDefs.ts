// ═══════════════════════════════════════════════════════════
// Window World — Exact Form Field Definitions
// This is the source of truth for every required/important
// field on the Order Form and Contract.
// ═══════════════════════════════════════════════════════════

export type FieldSeverity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FieldSource = 'customer' | 'appointment' | 'opening' | 'pricing' | 'signature' | 'sketch';

export interface FormFieldDef {
  id: string;
  label: string;
  form: 'order_form' | 'contract' | 'both';
  section: string;
  source: FieldSource;
  severity: FieldSeverity;
  required: boolean;
  /** For opening-level fields: checks per-opening */
  perOpening?: boolean;
  /** The data path relative to source (e.g. "customer.firstName") */
  dataPath: string;
  /** Condition function — only required when this returns true */
  condition?: string;
  description?: string;
}

// ─── ORDER FORM HEADER FIELDS ───────────────────────────────
export const ORDER_FORM_HEADER: FormFieldDef[] = [
  { id: 'of-po', label: 'PO #', form: 'order_form', section: 'Header', source: 'appointment', severity: 'MEDIUM', required: false, dataPath: 'poNumber' },
  { id: 'of-acct', label: 'Account #', form: 'order_form', section: 'Header', source: 'appointment', severity: 'MEDIUM', required: false, dataPath: 'accountNumber' },
  { id: 'of-date', label: 'Order Date', form: 'order_form', section: 'Header', source: 'appointment', severity: 'BLOCKER', required: true, dataPath: 'appointmentDate' },
  { id: 'of-name', label: 'Customer Name', form: 'order_form', section: 'Header', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'firstName' },
  { id: 'of-lname', label: 'Customer Last Name', form: 'order_form', section: 'Header', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'lastName' },
  { id: 'of-phone', label: 'Customer Phone', form: 'order_form', section: 'Header', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'phone' },
  { id: 'of-addr', label: 'Customer Address', form: 'order_form', section: 'Header', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'address' },
  { id: 'of-city', label: 'City', form: 'order_form', section: 'Header', source: 'customer', severity: 'HIGH', required: true, dataPath: 'city' },
  { id: 'of-state', label: 'State', form: 'order_form', section: 'Header', source: 'customer', severity: 'HIGH', required: true, dataPath: 'state' },
  { id: 'of-zip', label: 'ZIP', form: 'order_form', section: 'Header', source: 'customer', severity: 'HIGH', required: true, dataPath: 'zip' },
  { id: 'of-estimator', label: 'Estimator', form: 'order_form', section: 'Header', source: 'appointment', severity: 'HIGH', required: true, dataPath: 'userId', description: 'Auto-filled from logged-in user' },
];

// ─── ORDER FORM — PER-OPENING FIELDS ────────────────────────
export const ORDER_FORM_OPENING: FormFieldDef[] = [
  { id: 'oo-num', label: 'Opening Number', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'openingNumber' },
  { id: 'oo-qty', label: 'Quantity', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'quantity' },
  { id: 'oo-model', label: 'Model / Series', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'seriesModel' },
  { id: 'oo-intcolor', label: 'Interior Color', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'interiorColor' },
  { id: 'oo-extcolor', label: 'Exterior Color', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'exteriorColor' },
  { id: 'oo-width', label: 'Width', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'width' },
  { id: 'oo-height', label: 'Height', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'height' },
  { id: 'oo-leg', label: 'Leg Height', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'legHeight', condition: 'isSpecialtyShape' },
  { id: 'oo-radius', label: 'Custom Radius', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'customRadius', condition: 'isSpecialtyShape' },
  { id: 'oo-hinge', label: 'Hinge', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'hinge', condition: 'isCasementOrAwning' },
  { id: 'oo-glass', label: 'Glass Package', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'glassPackage' },
  { id: 'oo-foam', label: 'Foam Enhanced', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'foamEnhanced' },
  { id: 'oo-grid', label: 'Grid Pattern', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'gridPattern' },
  { id: 'oo-gridprof', label: 'Grid Profile', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'gridProfile', condition: 'hasGrid' },
  { id: 'oo-gridv', label: 'Grid Vertical Count', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'gridVerticalCount', condition: 'hasGrid' },
  { id: 'oo-gridh', label: 'Grid Horizontal Count', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'gridHorizontalCount', condition: 'hasGrid' },
  { id: 'oo-obscure', label: 'Obscure Glass', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'obscureGlass' },
  { id: 'oo-tempered', label: 'Tempered Glass', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'temperedGlass' },
  { id: 'oo-nailfin', label: 'Nail Fin', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'nailFin' },
  { id: 'oo-screen', label: 'Full Screen', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'screenOption' },
  { id: 'oo-oriel', label: 'Oriel', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'oriel' },
  { id: 'oo-hrr', label: 'Horizontal R&R', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'horizontalRR' },
  { id: 'oo-exttype', label: 'Exterior Type', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'exteriorType' },
  { id: 'oo-extsurf', label: 'Exterior Surface Material', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'exteriorSurface' },
  { id: 'oo-floor', label: 'Floor Number', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'floorNumber' },
  { id: 'oo-trim', label: 'Trim Type', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'trimType' },
  { id: 'oo-removal', label: 'Remove/Install Type', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'removalType' },
  { id: 'oo-sill', label: 'Sill Repair', form: 'order_form', section: 'Openings', source: 'opening', severity: 'MEDIUM', required: false, perOpening: true, dataPath: 'sillRepair' },
  { id: 'oo-room', label: 'Room / Location', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'roomLocation' },
  { id: 'oo-elev', label: 'Elevation / Side', form: 'order_form', section: 'Openings', source: 'opening', severity: 'HIGH', required: true, perOpening: true, dataPath: 'elevation' },
  { id: 'oo-product', label: 'Product Type', form: 'order_form', section: 'Openings', source: 'opening', severity: 'BLOCKER', required: true, perOpening: true, dataPath: 'productCategory' },
  { id: 'oo-notes', label: 'Install Notes', form: 'order_form', section: 'Openings', source: 'opening', severity: 'LOW', required: false, perOpening: true, dataPath: 'installNotes' },
];

// ─── ORDER FORM — SKETCH ────────────────────────────────────
export const ORDER_FORM_SKETCH: FormFieldDef[] = [
  { id: 'os-sketch', label: 'Home Sketch / Drawing', form: 'order_form', section: 'Sketch', source: 'sketch', severity: 'HIGH', required: true, dataPath: 'sketchData' },
  { id: 'os-markers', label: 'Opening Markers on Sketch', form: 'order_form', section: 'Sketch', source: 'sketch', severity: 'HIGH', required: true, dataPath: 'markers' },
];

// ─── CONTRACT FIELDS ────────────────────────────────────────
export const CONTRACT_FIELDS: FormFieldDef[] = [
  { id: 'ct-name', label: 'Customer Name', form: 'contract', section: 'Customer', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'firstName' },
  { id: 'ct-custid', label: 'Customer ID', form: 'contract', section: 'Customer', source: 'customer', severity: 'MEDIUM', required: false, dataPath: 'customerId' },
  { id: 'ct-addr', label: 'Address', form: 'contract', section: 'Customer', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'address' },
  { id: 'ct-email', label: 'Email', form: 'contract', section: 'Customer', source: 'customer', severity: 'MEDIUM', required: false, dataPath: 'email' },
  { id: 'ct-phone1', label: 'Primary Phone', form: 'contract', section: 'Customer', source: 'customer', severity: 'BLOCKER', required: true, dataPath: 'phone' },
  { id: 'ct-phone2', label: 'Secondary Phone', form: 'contract', section: 'Customer', source: 'customer', severity: 'LOW', required: false, dataPath: 'phone2' },
  { id: 'ct-job', label: 'Complete Job / Remaining', form: 'contract', section: 'Job Scope', source: 'appointment', severity: 'HIGH', required: true, dataPath: 'completeJob' },
  { id: 'ct-dhcount', label: 'Double Hung Count', form: 'contract', section: 'Product Counts', source: 'opening', severity: 'HIGH', required: true, dataPath: '_computed_dh_count' },
  { id: 'ct-othercount', label: 'Other Style Count', form: 'contract', section: 'Product Counts', source: 'opening', severity: 'HIGH', required: true, dataPath: '_computed_other_count' },
  { id: 'ct-speccount', label: 'Specialty Window Count', form: 'contract', section: 'Product Counts', source: 'opening', severity: 'MEDIUM', required: false, dataPath: '_computed_spec_count' },
  { id: 'ct-doorcount', label: 'Door Count', form: 'contract', section: 'Product Counts', source: 'opening', severity: 'MEDIUM', required: false, dataPath: '_computed_door_count' },
  { id: 'ct-listprice', label: 'Total List Price', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'BLOCKER', required: true, dataPath: 'subtotal' },
  { id: 'ct-adminfee', label: 'Administrative/Setup Fee', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'HIGH', required: true, dataPath: 'adminFee' },
  // Tax field removed — Window World does not charge sales tax

  { id: 'ct-total', label: 'Total Amount', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'BLOCKER', required: true, dataPath: 'totalAmount' },
  { id: 'ct-deposit', label: 'Custom Order Deposit', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'BLOCKER', required: true, dataPath: 'depositAmount' },
  { id: 'ct-balance', label: 'Balance to Installer', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'HIGH', required: true, dataPath: 'balanceDue' },
  { id: 'ct-finance', label: 'Amount Financed', form: 'contract', section: 'Pricing', source: 'pricing', severity: 'LOW', required: false, dataPath: 'financingAmount' },
  { id: 'ct-lead', label: 'Pre-1978 Lead Acknowledgment', form: 'contract', section: 'Acknowledgments', source: 'customer', severity: 'BLOCKER', required: false, dataPath: 'preLead1978', condition: 'preLead1978Home' },
  { id: 'ct-sig-owner', label: 'Owner Signature', form: 'contract', section: 'Signatures', source: 'signature', severity: 'BLOCKER', required: true, dataPath: 'ownerSignature' },
  { id: 'ct-sig-est', label: 'Estimator Signature', form: 'contract', section: 'Signatures', source: 'signature', severity: 'HIGH', required: true, dataPath: 'estimatorSignature' },
  { id: 'ct-sig-date', label: 'Signature Date', form: 'contract', section: 'Signatures', source: 'signature', severity: 'BLOCKER', required: true, dataPath: 'signatureDate' },
  { id: 'ct-initials', label: 'Customer Initials', form: 'contract', section: 'Signatures', source: 'signature', severity: 'HIGH', required: true, dataPath: 'customerInitials' },
];

// ─── ALL FIELDS ─────────────────────────────────────────────
export const ALL_FORM_FIELDS: FormFieldDef[] = [
  ...ORDER_FORM_HEADER,
  ...ORDER_FORM_OPENING,
  ...ORDER_FORM_SKETCH,
  ...CONTRACT_FIELDS,
];

// ─── SPECIALTY SHAPE PRODUCT CATEGORIES ──────────────────────
// All productCategory values that classify as a special/custom shape.
// Covers: BTR S-series model codes, common descriptive names, and
// abbreviation codes used in field data entry.
export const SPECIALTY_SHAPES: string[] = [
  // S-series model codes (productModel / seriesModel)
  'S105', 'S110', 'S111', 'S112', 'S113', 'S114', 'S115', 'S116',
  'S118', 'S120', 'S121', 'S122', 'S123', 'S129', 'S140', 'S144', 'S146',
  // Descriptive names used as productCategory
  'eyebrow', 'circle_top', 'quarter_arch', 'custom_shape', 'special_shape',
  'geometric', 'half_round', 'arch_top', 'full_circle', 'oval', 'ellipse',
  'hexagon', 'octagon', 'pentagon', 'triangle', 'trapezoid', 'cathedral',
  'extended_leg_eyebrow', 'half_eyebrow',
  // Field abbreviation codes
  'CT',    // Circle Top
  'EY',    // Eyebrow
  'HR',    // Half Round
  'TRAP',  // Trapezoid
  'SHAPE', // Generic shape
  'GBG',   // Garden Bay General (when used as shape)
];

export const CASEMENT_AWNING = ['casement', 'awning'];

