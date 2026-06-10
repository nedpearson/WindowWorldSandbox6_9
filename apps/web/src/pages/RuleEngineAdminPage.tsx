import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { DbRule } from '../utils/ruleExecutionEngine';

interface MeasurementRule {
  id: string;
  name: string;
  description?: string;
  status: 'verified' | 'needs_verification' | 'inactive';
  actionType?: string;
  windowType?: string;
  exteriorType?: string;
  installType?: string;
  removalType?: string;
  widthTakeoffDecimal: number;
  heightTakeoffDecimal: number;
  minDeduction?: number;
  maxDeduction?: number;
  requiresConfirmation: boolean;
  requiresPhoto: boolean;
  requiresNote: boolean;
  severity: string;
  notes?: string;
  active: boolean;
}

const EMPTY_BUSINESS_RULE: Omit<DbRule, 'id'> = {
  ruleKey: '',
  name: '',
  description: '',
  category: 'window_defaults',
  isActive: true,
  severity: 'warning',
  triggerField: 'exteriorType',
  operator: 'equals',
  triggerValue: 'Brick',
  actionType: 'set_field',
  actionField: 'installType',
  actionValue: 'EXT',
  message: '',
  autoApply: true,
  requiresConfirmation: false,
  requiresOverrideReason: false,
  priority: 0,
  sourceDocument: '2026 BTR Pricing Guidelines',
  sourceSection: '',
  sourcePage: '',
  fieldRepGuidance: '',
  installerNoteTemplate: '',
  orderFormImpact: '',
  contractImpact: '',
  pricingImpact: '',
  workbookMappingKey: '',
  appliesToAllReps: true,
  region: '',
};

const EMPTY_MEASUREMENT_RULE: Omit<MeasurementRule, 'id'> = {
  name: '',
  description: '',
  status: 'needs_verification',
  windowType: 'double_hung',
  exteriorType: 'brick',
  installType: 'INT',
  removalType: 'ALUM',
  widthTakeoffDecimal: 0.25,
  heightTakeoffDecimal: 0.25,
  requiresConfirmation: true,
  requiresPhoto: false,
  requiresNote: false,
  severity: 'high',
  notes: '',
  active: true,
};

const CATEGORIES = [
  { value: 'window_defaults', label: 'Window Defaults' },
  { value: 'exterior_install', label: 'Exterior / Install' },
  { value: 'pricing', label: 'Pricing Rules' },
  { value: 'measurement', label: 'Measurement Validation' },
  { value: 'oriel', label: 'Oriel Windows' },
  { value: 'specialty_shape', label: 'Specialty Shapes' },
  { value: 'mull_joined', label: 'Mull / Joined Units' },
  { value: 'tempered_glass', label: 'Tempered Glass' },
  { value: 'final_export', label: 'Final Export / Audit' },
];

const SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'warning', label: 'Warning' },
  { value: 'require_manager_review', label: 'Require Manager Review' },
  { value: 'blocker', label: 'Block Final Workbook' },
];

const TRIGGER_FIELDS = [
  'exteriorType', 'measureBasis', 'installType', 'removeType', 'insideSet', 'outsideSet',
  'windowType', 'productModel', 'series', 'width', 'height', 'ui', 'specialShapeType',
  'orielSelected', 'orielHeight', 'screenType', 'exteriorColor', 'interiorColor', 'vinylColor',
  'gridSelected', 'gridStyle', 'gridPattern', 'sdlSelected', 'sdlSize', 'obscureGlass', 'rainGlass',
  'temperedRequired', 'bottomSashOnly', 'adjacentToDoor', 'distanceFromDoor', 'bottomEdgeFromFloor',
  'walkingSurfaceDistance', 'mullSelected', 'mullType', 'clearStory', 'headerFlashing', 'trim',
  'cutback', 'tapconRequired', 'acSash', 'glassPack', 'financeProvider', 'customerDeviceFinance',
  'photosAttached', 'aiReviewStatus', 'workbookOrderFormMapped'
];

const TRIGGER_VALUES_MAP: Record<string, string[]> = {
  exteriorType: ['Brick', 'Siding', 'Wood', 'Stucco', 'Masonry', 'Metal', 'Unknown'],
  measureBasis: ['inside', 'outside', 'rough_opening'],
  installType: ['EXT', 'INT', 'Inside Set', 'Outside Set', 'Self Install'],
  removeType: ['ALUM', 'WOOD', 'VINYL', 'METAL', 'NONE'],
  insideSet: ['true', 'false'],
  outsideSet: ['true', 'false'],
  windowType: ['Double Hung', 'Single Hung', 'Picture', 'Slider', '3-Lite Slider', 'Casement', 'Awning', 'Garden', 'Bay', 'Bow', 'Patio Door', 'Special Shape', 'Glass Pack'],
  productModel: ['3001', '3002', '3004', '03A0', '0700', '0971', '0972', 'Wincore', 'S140', 'S144', 'S146'],
  series: ['L2000', '03A0', '3000', 'Wincore', '0700'],
  width: ['8', '12', '24', '36', '48', '60', '72', '84', '96', '120'],
  height: ['8', '12', '24', '36', '48', '60', '72', '84', '96', '120'],
  ui: ['40', '60', '80', '100', '120', '130', '140', '150'],
  specialShapeType: ['Arch / Radius', 'Eyebrow', 'Half Round', 'Quarter Round', 'Trapezoid', 'Triangle', 'Octagon', 'Pentagon', 'Polygon', 'Custom Shape'],
  orielSelected: ['true', 'false'],
  orielHeight: ['10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
  screenType: ['Half Screen', 'Full Screen', 'No Screen', 'Not Available'],
  exteriorColor: ['White', 'Bronze', 'Black', 'Clay', 'Beige'],
  interiorColor: ['White', 'Beige', 'Clay', 'Oak', 'Cherry'],
  vinylColor: ['White', 'Beige', 'Clay'],
  gridSelected: ['true', 'false'],
  gridStyle: [
    'A1 Colonial Flat Full', 'B1 Colonial Contour Full', 'C1 Colonial Brass Full', 'D1 Diamond Full',
    'E1 Single Prairie Flat Full', 'E4 Double Prairie Flat Full', 'F1 Single Prairie Contour Full',
    'F4 Double Prairie Contour Full', 'G1 Single Perimeter Contour Full', 'G2 Double Perimeter Contour Full',
    'G3 Single Perimeter Flat Full', 'G4 Double Perimeter Flat Full', 'K1 Craftsman Casement Only',
    'SDL 7/8', 'SDL 1-1/4'
  ],
  gridPattern: ['Colonial', 'Prairie', 'Perimeter', 'Diamond', 'Craftsman', 'None'],
  sdlSelected: ['true', 'false'],
  sdlSize: ['7/8', '1-1/4', 'None'],
  obscureGlass: ['yes', 'no'],
  rainGlass: ['yes', 'no'],
  temperedRequired: ['true', 'false'],
  bottomSashOnly: ['true', 'false'],
  adjacentToDoor: ['true', 'false'],
  distanceFromDoor: ['0', '12', '24', '36', '48', '60'],
  bottomEdgeFromFloor: ['0', '10', '18', '24', '36', '60'],
  walkingSurfaceDistance: ['0', '12', '24', '36', '48', '60'],
  mullSelected: ['true', 'false'],
  mullType: ['Twin', 'Triple', 'Arch Top', 'Vertical', 'Horizontal'],
  clearStory: ['true', 'false'],
  headerFlashing: ['Required', 'Suggested', 'Not Required', 'Under Covering / Verify', 'Needs Review'],
  trim: ['Required', 'Suggested', 'Not Required', 'Customer Declined', 'Needs Review'],
  cutback: ['Required', 'Suggested', 'Not Required', 'Needs Review'],
  tapconRequired: ['true', 'false'],
  acSash: ['true', 'false'],
  glassPack: ['Low E', 'Low E Elite', 'Double Pane', 'Triple Pane', 'Tempered', 'Obscure', 'Laminated'],
  financeProvider: ['Wells Fargo', 'GreenSky', 'Cash / Check', 'Self Financed'],
  customerDeviceFinance: ['true', 'false'],
  photosAttached: ['true', 'false'],
  aiReviewStatus: ['passed', 'failed', 'pending'],
  workbookOrderFormMapped: ['true', 'false'],
};

const ACTION_TYPES = [
  { value: 'set_field', label: 'Set Field' },
  { value: 'suggest_field', label: 'Suggest Field' },
  { value: 'require_field', label: 'Require Field' },
  { value: 'disable_option', label: 'Disable Option' },
  { value: 'add_warning', label: 'Add Warning' },
  { value: 'add_price', label: 'Add Price Surcharge' },
  { value: 'add_installer_note', label: 'Add Installer Note' },
  { value: 'add_sales_note', label: 'Add Sales Rep Note' },
  { value: 'add_order_form_note', label: 'Add Order Form Note' },
  { value: 'add_contract_line', label: 'Add Contract Line' },
  { value: 'add_workbook_mapping', label: 'Add Workbook Mapping Requirement' },
  { value: 'ask_confirmation', label: 'Ask Confirmation' },
  { value: 'require_photo', label: 'Require Photo Verification' },
  { value: 'require_manager_review', label: 'Require Manager Review' },
  { value: 'block_final', label: 'Block Final Workbook Export' },
];

const SET_FIELDS = [
  'installType', 'removeType', 'trim', 'headerFlashing', 'screenType', 'gridStyle',
  'gridPattern', 'glassOption', 'temperedRequired', 'mullType', 'specialShapeTrim',
  'stuccoRemoval', 'tapconRequired', 'acSash', 'glassPack', 'orielHeight', 'vinylColor', 
  'exteriorColor', 'interiorColor', 'productModel', 'series'
];

const SET_VALUES_MAP: Record<string, string[]> = {
  installType: ['EXT', 'INT', 'Inside Set', 'Outside Set', 'Self Install'],
  removeType: ['ALUM', 'WOOD', 'VINYL', 'METAL', 'NONE'],
  trim: ['Required', 'Suggested', 'Not Required', 'Customer Declined', 'Needs Review'],
  headerFlashing: ['Required', 'Suggested', 'Not Required', 'Under Covering / Verify', 'Needs Review'],
  screenType: ['Half Screen', 'Full Screen', 'No Screen', 'Not Available'],
  gridStyle: ['A1 Colonial Flat Full', 'B1 Colonial Contour Full', 'D1 Diamond Full', 'SDL 7/8', 'SDL 1-1/4'],
  gridPattern: ['Colonial', 'Prairie', 'Perimeter', 'Diamond', 'Craftsman', 'None'],
  glassOption: ['Low E', 'Low E Elite', 'Clear', 'Tempered', 'Obscure', 'Rain Obscure', 'Laminated'],
  temperedRequired: ['true', 'false'],
  mullType: ['Twin', 'Triple', 'Arch Top', 'Vertical', 'Horizontal'],
  specialShapeTrim: ['Required', 'Suggested', 'Not Required'],
  stuccoRemoval: ['Required', 'Not Required', 'Needs Review'],
  tapconRequired: ['true', 'false'],
  acSash: ['true', 'false'],
  glassPack: ['Low E', 'Low E Elite', 'Double Pane', 'Triple Pane', 'Tempered', 'Obscure', 'Laminated'],
  orielHeight: ['10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
  vinylColor: ['White', 'Beige', 'Clay'],
  exteriorColor: ['White', 'Bronze', 'Black', 'Clay'],
  interiorColor: ['White', 'Beige', 'Clay', 'Oak', 'Cherry'],
  productModel: ['3001', '3002', '3004', '03A0', '0700', '0971', '0972', 'Wincore', 'S140', 'S144', 'S146'],
  series: ['L2000', '03A0', '3000', 'Wincore', '0700'],
};

const BIZ_PRESETS = [
  {
    name: 'BTR-01: Default Glass Option (Low-E Elite)',
    description: 'Default all new window openings to Low-E Elite (LEE). Per BTR 2026 guidelines.',
    triggerField: 'windowType',
    operator: 'is_not_empty',
    triggerValue: 'Double Hung',
    actionType: 'set_field',
    actionField: 'glassPack',
    actionValue: 'Low E Elite',
    message: 'Auto-set glass option to Low-E Elite (LEE)',
    category: 'window_defaults',
    severity: 'info',
    priority: 1,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.2 Glass',
    sourcePage: '12',
    workbookMappingKey: 'OrderForm.GlassPackage',
  },
  {
    name: 'BTR-02: Default Foam Wrap Insulation',
    description: 'Default all new openings to have foam wrap insulation.',
    triggerField: 'windowType',
    operator: 'is_not_empty',
    triggerValue: 'Double Hung',
    actionType: 'set_field',
    actionField: 'acSash',
    actionValue: 'true',
    message: 'Auto-set foam insulation wrap',
    category: 'window_defaults',
    severity: 'info',
    priority: 1,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.3 Insulation',
    sourcePage: '14',
    workbookMappingKey: 'OrderForm.FoamEnhanced',
  },
  {
    name: 'BTR-03: Default Removal Type (Aluminum)',
    description: 'Default all window replacements to aluminum removal (ALUM).',
    triggerField: 'windowType',
    operator: 'is_not_empty',
    triggerValue: 'Double Hung',
    actionType: 'set_field',
    actionField: 'removeType',
    actionValue: 'ALUM',
    message: 'Auto-set removal type to ALUM',
    category: 'window_defaults',
    severity: 'info',
    priority: 1,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '2.1 Removal',
    sourcePage: '22',
    workbookMappingKey: 'OrderForm.RemovalType',
  },
  {
    name: 'BTR-04: Brick Exterior Installation',
    description: 'If opening exterior touches brick, default installation to outside (EXT).',
    triggerField: 'exteriorType',
    operator: 'equals',
    triggerValue: 'Brick',
    actionType: 'set_field',
    actionField: 'installType',
    actionValue: 'EXT',
    message: 'Brick exterior: default install to EXT',
    category: 'exterior_install',
    severity: 'info',
    priority: 2,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '2.2 Installation Methods',
    sourcePage: '28',
    workbookMappingKey: 'OrderForm.InstallType',
  },
  {
    name: 'BTR-05: Wood/Siding Trim Warning',
    description: 'If exterior touches wood or siding, warn that inside installation + trim is required.',
    triggerField: 'exteriorType',
    operator: 'equals',
    triggerValue: 'Siding',
    actionType: 'add_warning',
    actionField: 'trim',
    actionValue: 'Required',
    message: 'Wood/Siding exterior: inside installation + vinyl trim is required.',
    category: 'exterior_install',
    severity: 'warning',
    priority: 2,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '2.3 Trim and Finish',
    sourcePage: '35',
    workbookMappingKey: 'OrderForm.TrimType',
  },
  {
    name: 'BTR-06: Picture Window Screen',
    description: 'Picture windows must not have screens by default.',
    triggerField: 'windowType',
    operator: 'equals',
    triggerValue: 'Picture',
    actionType: 'set_field',
    actionField: 'screenType',
    actionValue: 'No Screen',
    message: 'Picture window: auto-set screen to None',
    category: 'window_defaults',
    severity: 'info',
    priority: 1,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.4 Options',
    sourcePage: '18',
    workbookMappingKey: 'OrderForm.ScreenOption',
  },
  {
    name: 'BTR-07: Oriel Sash Confirmation',
    description: 'Oriel window measurements must be based on the top sash.',
    triggerField: 'windowType',
    operator: 'equals',
    triggerValue: 'Special Shape',
    actionType: 'require_confirmation',
    actionField: '',
    actionValue: '',
    message: 'Oriel window: confirm top sash measurement was used.',
    category: 'measurement',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '3.1 Oriel Specifications',
    sourcePage: '45',
    workbookMappingKey: 'OrderForm.OrielConfirmed',
  },
  {
    name: 'BTR-08: Clear Story Surcharge',
    description: 'If floor level >= 2 or Clear Story toggle is true, apply Clear Story labor surcharge.',
    triggerField: 'clearStory',
    operator: 'equals',
    triggerValue: 'true',
    actionType: 'add_price',
    actionField: '',
    actionValue: '225',
    message: 'Clear story charge: first = $225, additional = $75 each',
    category: 'pricing',
    severity: 'warning',
    priority: 2,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '4.2 Labor surcharges',
    sourcePage: '88',
    workbookMappingKey: 'OrderForm.ClearStory',
  },
  {
    name: 'BTR-09: Tempered Glazing Check',
    description: 'Tempered glass warning if window is near doors or wet areas.',
    triggerField: 'temperedRequired',
    operator: 'equals',
    triggerValue: 'true',
    actionType: 'add_warning',
    actionField: '',
    actionValue: '',
    message: 'Louisiana code check: verify tempered glass and safety glazing requirements.',
    category: 'tempered_glass',
    severity: 'high',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '5.1 Safety Glazing Codes',
    sourcePage: '99',
    workbookMappingKey: 'OrderForm.TemperedRequired',
  },
  {
    name: 'BTR-10: Specialty Shape Trim',
    description: 'Radius shapes require specialty shape trim; polygons do not.',
    triggerField: 'specialShapeType',
    operator: 'equals',
    triggerValue: 'Arch / Radius',
    actionType: 'set_field',
    actionField: 'specialShapeTrim',
    actionValue: 'Required',
    message: 'Radius specialty shape detected: trim is required.',
    category: 'specialty_shape',
    severity: 'high',
    priority: 2,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '3.4 specialty trim',
    sourcePage: '60',
    workbookMappingKey: 'OrderForm.SpecialtyShapeTrim',
  },
  {
    name: 'BTR-H: Clay Not Available in L-2000/0700',
    description: 'Clay vinyl cannot be made in L-2000 (FUSION) & 0700 series. Per BTR 2026 p.71.',
    triggerField: 'series',
    operator: 'equals',
    triggerValue: 'L2000',
    actionType: 'add_warning',
    actionField: 'vinylColor',
    actionValue: 'Clay',
    message: 'Clay vinyl is NOT available in L-2000 (FUSION) & 0700 series.',
    category: 'color_validation',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-I: No Exterior Color on L-2000/0700',
    description: 'Exterior color option is not available in L-2000 (FUSION) & 0700 series. Per BTR 2026 p.71.',
    triggerField: 'series',
    operator: 'equals',
    triggerValue: 'L2000',
    actionType: 'add_warning',
    actionField: 'exteriorColor',
    actionValue: 'Bronze',
    message: 'Exterior color is NOT available on L-2000 (FUSION) & 0700 series.',
    category: 'color_validation',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-J: No Interior Color on L-2000',
    description: 'Interior color option is not available in L-2000 (FUSION) series. Per BTR 2026 p.71.',
    triggerField: 'series',
    operator: 'equals',
    triggerValue: 'L2000',
    actionType: 'add_warning',
    actionField: 'interiorColor',
    actionValue: 'Oak',
    message: 'Interior color is NOT available on L-2000 (FUSION) series.',
    category: 'color_validation',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-K: No Interior Color on 03A0-SH & Arch-Tops',
    description: 'Interior color not available on 03A0 Single Hung, S140, S144, S146. Per BTR 2026 p.71.',
    triggerField: 'productModel',
    operator: 'equals',
    triggerValue: '03A0',
    actionType: 'add_warning',
    actionField: 'interiorColor',
    actionValue: 'Oak',
    message: 'Interior color is NOT available on 03A0 Single Hung or arch-top windows.',
    category: 'color_validation',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-L: Exterior Color Requires B1 Contoured Grids',
    description: 'Windows with exterior color must have B1 CONTOURED grids. Per BTR 2026 p.71.',
    triggerField: 'exteriorColor',
    operator: 'equals',
    triggerValue: 'Bronze',
    actionType: 'add_warning',
    actionField: 'gridStyle',
    actionValue: 'A1 Colonial Flat Full',
    message: 'Windows with exterior color MUST have B1 CONTOURED grids.',
    category: 'product_defaults',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-M: L-2000 Must Have B1 Contoured Grids',
    description: 'L-2000 series must have B1 CONTOURED grids. Per BTR 2026 p.13.',
    triggerField: 'series',
    operator: 'equals',
    triggerValue: 'L2000',
    actionType: 'add_warning',
    actionField: 'gridStyle',
    actionValue: 'A1 Colonial Flat Full',
    message: 'L-2000 series MUST have B1 CONTOURED grids.',
    category: 'product_defaults',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.1 Series Specs',
    sourcePage: '13',
  },
  {
    name: 'BTR-N: Diamond Grids Must Be A1 Flat',
    description: 'Diamond grids must be A1 FLAT. Per BTR 2026 p.71.',
    triggerField: 'gridStyle',
    operator: 'equals',
    triggerValue: 'D1 Diamond Full',
    actionType: 'add_warning',
    actionField: '',
    actionValue: '',
    message: 'Diamond grids must be A1 FLAT.',
    category: 'product_defaults',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  },
  {
    name: 'BTR-O: 50" Max Oriel on DH Windows',
    description: '50" max oriel on DH windows. >50" oriel only on single hung (03A0). Per BTR 2026 p.17.',
    triggerField: 'windowType',
    operator: 'equals',
    triggerValue: 'Double Hung',
    actionType: 'add_warning',
    actionField: 'orielHeight',
    actionValue: '55',
    message: '50" max oriel on DH windows. Oriel >50" only available on single hung (03A0).',
    category: 'measurement',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.4 Options',
    sourcePage: '17',
  },
  {
    name: 'BTR-P: Full Screen Restrictions',
    description: 'Full screen cannot be made on picture windows, 3-lite sliders, or arch-top windows. Per BTR 2026 p.13.',
    triggerField: 'windowType',
    operator: 'equals',
    triggerValue: 'Picture',
    actionType: 'add_warning',
    actionField: 'screenType',
    actionValue: 'Full Screen',
    message: 'Full screen CANNOT be made on picture windows, 3-lite sliders, or arch-top windows.',
    category: 'product_defaults',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.1 Series Specs',
    sourcePage: '13',
  },
  {
    name: 'BTR-Q: 03A0 Single Hung Specialty Section',
    description: 'All 03A0 single hung windows must be written in the specialty windows section of the contract. Per BTR 2026 p.15.',
    triggerField: 'productModel',
    operator: 'equals',
    triggerValue: '03A0',
    actionType: 'add_warning',
    actionField: '',
    actionValue: '',
    message: '03A0 Single Hung must be written in the SPECIALTY WINDOWS section of the contract.',
    category: 'product_defaults',
    severity: 'high',
    priority: 2,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.2 Window Models',
    sourcePage: '15',
  },
  {
    name: 'BTR-R: No Exterior Color on Clay Vinyl',
    description: 'Exterior color is not available on clay vinyl windows. Per BTR 2026 p.71.',
    triggerField: 'vinylColor',
    operator: 'equals',
    triggerValue: 'Clay',
    actionType: 'add_warning',
    actionField: 'exteriorColor',
    actionValue: 'Bronze',
    message: 'Exterior color is not available on clay vinyl windows.',
    category: 'color_validation',
    severity: 'blocker',
    priority: 3,
    sourceDocument: '2026 BTR Pricing Guidelines',
    sourceSection: '1.5 Color Options',
    sourcePage: '71',
  }
];

const MEAS_PRESETS = [
  {
    name: 'Oriel — Top Sash Measurement',
    description: 'Oriel windows must always be measured using the TOP SASH. No width/height deduction is applied.',
    windowType: 'oriel',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'blocker',
    actionType: 'require_confirmation',
    notes: 'Oriel: always use top sash measurement as-is for the order form.',
  },
  {
    name: 'Insert Install / Brick — Standard Takeoff',
    description: 'Standard insert into brick opening. Apply 1/4" takeoff to width and height.',
    windowType: '',
    exteriorType: 'brick',
    installType: 'INT',
    removalType: '',
    widthTakeoffDecimal: 0.25,
    heightTakeoffDecimal: 0.25,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'high',
    actionType: 'deduct',
    notes: 'Standard brick insert takeoff.',
  },
  {
    name: 'Full Frame Install / Siding — No Deduction',
    description: 'Full frame replacement in siding opening. Measure rough opening width and height. No takeoff applied.',
    windowType: '',
    exteriorType: 'siding',
    installType: 'EXT',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    actionType: 'deduct',
    notes: 'Full frame siding replacement.',
  },
  {
    name: 'EXT Install / Brick — No Takeoff',
    description: 'EXT (exterior) install in brick. Measure from the existing frame. No standard deduction.',
    windowType: '',
    exteriorType: 'brick',
    installType: 'EXT',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    actionType: 'deduct',
    notes: 'Exterior install in brick opening.',
  },
  {
    name: 'Circle Top — Radius Measurement',
    description: 'Circle top windows require width, leg height, and rise measurement. App computes radius.',
    windowType: 'circle_top',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    actionType: 'require_confirmation',
    notes: 'Circle top radius measurements.',
  },
  {
    name: 'Eyebrow Window — Width + Rise + Leg Height',
    description: 'Eyebrow windows require width, rise (center height), and left/right leg heights.',
    windowType: 'eyebrow',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    actionType: 'require_confirmation',
    notes: 'Eyebrow takeoff rules.',
  },
  {
    name: 'Arch / Half Round — Width + Height + Rise',
    description: 'Full arch/half-round: measure overall width and height. Rise = height.',
    windowType: 'arch',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    actionType: 'require_confirmation',
    notes: 'Arch/half-round takeoff rules.',
  },
  {
    name: 'Quarter Arch — Width + Height + Leg Heights',
    description: 'Quarter arch: width, height, left leg height, right leg height required.',
    windowType: 'quarter_arch',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    actionType: 'require_confirmation',
    notes: 'Quarter arch takeoff rules.',
  },
  {
    name: 'Patio Door — Rough Opening Measurement',
    description: 'Patio doors: measure rough opening width and height. Confirm door swing direction.',
    windowType: 'patio_door',
    exteriorType: '',
    installType: '',
    removalType: '',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'high',
    actionType: 'require_confirmation',
    notes: 'Patio door takeoff rules.',
  }
];

export function RuleEngineAdminPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'measurement'>('business');
  
  // Rules states
  const [businessRules, setBusinessRules] = useState<DbRule[]>([]);
  const [measurementRules, setMeasurementRules] = useState<MeasurementRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Modals editing states
  const [editingBiz, setEditingBiz] = useState<DbRule | null>(null);
  const [editingMeas, setEditingMeas] = useState<MeasurementRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const bizData = await api.get('/rules');
      setBusinessRules(Array.isArray(bizData) ? bizData : []);
      
      const measData = await api.get('/measurement-rules/all');
      setMeasurementRules(Array.isArray(measData) ? measData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load rules.');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── BUSINESS RULE ACTIONS ──────────────────────────────────────────────────
  const openNewBiz = () => {
    setEditingBiz({ ...EMPTY_BUSINESS_RULE, id: '', ruleKey: `ww-rule-${Date.now()}` } as DbRule);
    setIsNew(true);
    setError('');
  };

  const openEditBiz = (rule: DbRule) => {
    setEditingBiz({ ...rule });
    setIsNew(false);
    setError('');
  };

  const saveBiz = async () => {
    if (!editingBiz) return;
    if (!editingBiz.name.trim()) { setError('Rule name is required'); return; }
    if (!editingBiz.ruleKey.trim()) { setError('Rule key is required'); return; }
    if (!editingBiz.triggerField) { setError('Trigger Field is required'); return; }
    if (!editingBiz.triggerValue) { setError('Trigger Value is required'); return; }
    if (editingBiz.actionType.startsWith('set_') && !editingBiz.actionField) {
      setError('Action Field is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const created = await api.post('/rules', editingBiz);
        setBusinessRules(prev => [...prev, created]);
        showToast('✅ Rule created successfully');
      } else {
        const updated = await api.put(`/rules/${editingBiz.id}`, editingBiz);
        setBusinessRules(prev => prev.map(r => r.id === editingBiz.id ? updated : r));
        showToast('✅ Rule updated successfully');
      }
      setEditingBiz(null);
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    }
    setSaving(false);
  };

  const toggleBizActive = async (rule: DbRule) => {
    try {
      const updated = await api.put(`/rules/${rule.id}`, { ...rule, isActive: !rule.isActive });
      setBusinessRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: updated.isActive } : r));
      showToast(updated.isActive ? '✅ Rule enabled' : '⏸ Rule disabled');
    } catch {
      showToast('❌ Could not toggle rule');
    }
  };

  const deleteBizRule = async (rule: DbRule) => {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/rules/${rule.id}`);
      setBusinessRules(prev => prev.filter(r => r.id !== rule.id));
      showToast('🗑 Rule deleted');
    } catch {
      showToast('❌ Delete failed');
    }
  };

  // ── MEASUREMENT RULE ACTIONS ───────────────────────────────────────────────
  const openNewMeas = () => {
    setEditingMeas({ ...EMPTY_MEASUREMENT_RULE, id: '' } as MeasurementRule);
    setIsNew(true);
    setError('');
  };

  const openEditMeas = (rule: MeasurementRule) => {
    setEditingMeas({ ...rule });
    setIsNew(false);
    setError('');
  };

  const saveMeas = async () => {
    if (!editingMeas) return;
    if (!editingMeas.name.trim()) { setError('Rule name is required'); return; }

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const created = await api.post('/measurement-rules', editingMeas);
        setMeasurementRules(prev => [...prev, created]);
        showToast('✅ Measurement rule created');
      } else {
        const updated = await api.patch(`/measurement-rules/${editingMeas.id}`, editingMeas);
        setMeasurementRules(prev => prev.map(r => r.id === editingMeas.id ? updated : r));
        showToast('✅ Measurement rule updated');
      }
      setEditingMeas(null);
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    }
    setSaving(false);
  };

  const toggleMeasActive = async (rule: MeasurementRule) => {
    try {
      const updated = await api.patch(`/measurement-rules/${rule.id}`, { active: !rule.active });
      setMeasurementRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: updated.active } : r));
      showToast(updated.active ? '✅ Measurement rule enabled' : '⏸ Measurement rule disabled');
    } catch {
      showToast('❌ Could not toggle rule');
    }
  };

  const verifyMeasRule = async (rule: MeasurementRule) => {
    try {
      const updated = await api.post(`/measurement-rules/${rule.id}/verify`, {});
      setMeasurementRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: updated.status } : r));
      showToast('✓ Rule marked as verified');
    } catch {
      showToast('❌ Verification failed');
    }
  };

  const deleteMeasRule = async (rule: MeasurementRule) => {
    if (!confirm(`Retire measurement rule "${rule.name}"?`)) return;
    try {
      await api.del(`/measurement-rules/${rule.id}`);
      setMeasurementRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: false, status: 'inactive' } : r));
      showToast('🗑 Measurement rule retired');
    } catch {
      showToast('❌ Delete failed');
    }
  };

  const seedDefaultMeasurementRules = async () => {
    if (!confirm('Seed standard 9 Window World measurement rules? Existing rules will be skipped.')) return;
    try {
      const res = await api.post('/measurement-rules/seed-defaults', {});
      showToast(`🌱 Seeded: ${res.summary}`);
      loadData();
    } catch {
      showToast('❌ Seeding failed');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', background: '#1e293b', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '0.75rem 1.25rem', color: '#f8fafc', fontWeight: 600, fontSize: '0.875rem', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ Rule Engine Command Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>Configure automated workflows, measurement deductions, and field safety reviews.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'measurement' && (
            <button className="btn btn-secondary" onClick={seedDefaultMeasurementRules}>
              🌱 Seed Default Takeoffs
            </button>
          )}
          <button className="btn btn-primary" onClick={activeTab === 'business' ? openNewBiz : openNewMeas}>
            + New {activeTab === 'business' ? 'Business' : 'Measurement'} Rule
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('business')}
          style={{ all: 'unset', cursor: 'pointer', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'business' ? '#3b82f6' : 'var(--text-muted)', borderBottom: activeTab === 'business' ? '2px solid #3b82f6' : 'none' }}
        >
          Business & Validation Rules
        </button>
        <button
          onClick={() => setActiveTab('measurement')}
          style={{ all: 'unset', cursor: 'pointer', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'measurement' ? '#3b82f6' : 'var(--text-muted)', borderBottom: activeTab === 'measurement' ? '2px solid #3b82f6' : 'none' }}
        >
          Measurement & Takeoff Rules
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 8, marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── TAB 1: BUSINESS RULES ── */}
      {activeTab === 'business' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem', width: 60 }}>Status</th>
                <th style={{ padding: '1rem' }}>Rule Name & Details</th>
                <th style={{ padding: '1rem' }}>Trigger Condition</th>
                <th style={{ padding: '1rem' }}>Action Value</th>
                <th style={{ padding: '1rem', textAlign: 'right', width: 160 }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {businessRules.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No business rules loaded.</td>
                </tr>
              ) : (
                businessRules.map(rule => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <button
                        title={rule.isActive ? 'Active - click to pause' : 'Paused - click to activate'}
                        onClick={() => toggleBizActive(rule)}
                        style={{ all: 'unset', cursor: 'pointer', display: 'block', width: 14, height: 14, borderRadius: '50%', background: rule.isActive ? '#22c55e' : '#64748b', boxShadow: rule.isActive ? '0 0 8px rgba(34,197,94,0.5)' : 'none' }}
                      />
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rule.name}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>{rule.description}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                        IF {rule.triggerField} = {rule.triggerValue}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span className="badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                        {rule.actionType.toUpperCase()}: {rule.actionField || ''} = {rule.actionValue || ''}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditBiz(rule)}>✏️ Edit</button>
                        <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => deleteBizRule(rule)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 2: MEASUREMENT RULES ── */}
      {activeTab === 'measurement' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem', width: 60 }}>Status</th>
                <th style={{ padding: '1rem' }}>Takeoff Rule Name</th>
                <th style={{ padding: '1rem' }}>Matching Scope</th>
                <th style={{ padding: '1rem' }}>Deductions (W / H)</th>
                <th style={{ padding: '1rem', textAlign: 'right', width: 220 }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {measurementRules.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No measurement rules loaded. Click Seed Default Takeoffs to populate.</td>
                </tr>
              ) : (
                measurementRules.map(rule => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)', opacity: rule.active ? 1 : 0.6 }}>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <button
                        title={rule.active ? 'Active' : 'Inactive'}
                        onClick={() => toggleMeasActive(rule)}
                        style={{ all: 'unset', cursor: 'pointer', display: 'block', width: 14, height: 14, borderRadius: '50%', background: rule.active ? '#22c55e' : '#64748b' }}
                      />
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rule.name}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>{rule.description}</div>
                      {rule.status === 'verified' && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>✓ Verified</span>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {rule.windowType && <span>Window: <strong>{rule.windowType}</strong></span>}
                        {rule.exteriorType && <span>Exterior: <strong>{rule.exteriorType}</strong></span>}
                        {rule.installType && <span>Install: <strong>{rule.installType}</strong></span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        W: -{rule.widthTakeoffDecimal}" / H: -{rule.heightTakeoffDecimal}"
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {rule.status !== 'verified' && rule.active && (
                          <button className="btn btn-sm btn-secondary" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }} onClick={() => verifyMeasRule(rule)}>Verify</button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditMeas(rule)}>✏️ Edit</button>
                        <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => deleteMeasRule(rule)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FLAT MODAL: BUSINESS RULES ── */}
      {editingBiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isNew ? '+ New Rule' : `✏️ Edit Rule: ${editingBiz.name}`}
              </h3>
              <button onClick={() => setEditingBiz(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {isNew && (
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Load Guideline Template Preset
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6, borderColor: '#3b82f6' }}
                    onChange={e => {
                      const idx = parseInt(e.target.value);
                      if (isNaN(idx)) return;
                      const preset = BIZ_PRESETS[idx];
                      if (preset) {
                        setEditingBiz({
                          ...editingBiz,
                          ...preset,
                        });
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Choose BTR Guideline Preset --</option>
                    {BIZ_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Rule Name *
                <input
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                  value={editingBiz.name}
                  onChange={e => setEditingBiz({ ...editingBiz, name: e.target.value })}
                  placeholder="e.g. Brick → EXT Install"
                />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Description
                <textarea
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 6, minHeight: 60, resize: 'vertical' }}
                  value={editingBiz.description}
                  onChange={e => setEditingBiz({ ...editingBiz, description: e.target.value })}
                  placeholder="Brief explanation for field reps"
                />
              </label>

              {/* CATEGORY, SEVERITY, PRIORITY, REGION, WORKBOOK MAPPING */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Category *
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.category || 'window_defaults'}
                    onChange={e => setEditingBiz({ ...editingBiz, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Severity *
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.severity || 'warning'}
                    onChange={e => setEditingBiz({ ...editingBiz, severity: e.target.value })}
                  >
                    {SEVERITIES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Priority
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.priority ?? 0}
                    onChange={e => setEditingBiz({ ...editingBiz, priority: parseInt(e.target.value) || 0 })}
                  >
                    <option value="0">0 (Lowest)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 (Highest)</option>
                  </select>
                </label>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Region
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.region || ''}
                    onChange={e => setEditingBiz({ ...editingBiz, region: e.target.value })}
                  >
                    <option value="">All Regions</option>
                    <option value="Louisiana">Louisiana</option>
                    <option value="Texas">Texas</option>
                    <option value="Florida">Florida</option>
                    <option value="Carolinas">Carolinas</option>
                  </select>
                </label>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Workbook Mapping
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.workbookMappingKey || ''}
                    onChange={e => setEditingBiz({ ...editingBiz, workbookMappingKey: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="OrderForm.GlassPackage">OrderForm.GlassPackage</option>
                    <option value="OrderForm.FoamEnhanced">OrderForm.FoamEnhanced</option>
                    <option value="OrderForm.RemovalType">OrderForm.RemovalType</option>
                    <option value="OrderForm.InstallType">OrderForm.InstallType</option>
                    <option value="OrderForm.TrimType">OrderForm.TrimType</option>
                    <option value="OrderForm.ScreenOption">OrderForm.ScreenOption</option>
                    <option value="OrderForm.OrielConfirmed">OrderForm.OrielConfirmed</option>
                    <option value="OrderForm.ClearStory">OrderForm.ClearStory</option>
                    <option value="OrderForm.TemperedRequired">OrderForm.TemperedRequired</option>
                    <option value="OrderForm.SpecialtyShapeTrim">OrderForm.SpecialtyShapeTrim</option>
                  </select>
                </label>
              </div>

              {/* TRIGGER CONDITION */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Trigger Condition
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Field *
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingBiz.triggerField || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const defaults = TRIGGER_VALUES_MAP[val] || [];
                        setEditingBiz({
                          ...editingBiz,
                          triggerField: val,
                          triggerValue: defaults[0] || '',
                        });
                      }}
                    >
                      {TRIGGER_FIELDS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Operator *
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingBiz.operator || 'equals'}
                      onChange={e => setEditingBiz({ ...editingBiz, operator: e.target.value })}
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not_equals</option>
                      <option value="contains">contains</option>
                      <option value="greater_than">greater_than</option>
                      <option value="less_than">less_than</option>
                      <option value="is_empty">is_empty</option>
                      <option value="is_not_empty">is_not_empty</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Value *
                    {TRIGGER_VALUES_MAP[editingBiz.triggerField || ''] ? (
                      <select
                        className="form-input"
                        style={{ display: 'block', width: '100%', marginTop: 6 }}
                        value={editingBiz.triggerValue || ''}
                        onChange={e => setEditingBiz({ ...editingBiz, triggerValue: e.target.value })}
                      >
                        {TRIGGER_VALUES_MAP[editingBiz.triggerField || ''].map((v: string) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        style={{ display: 'block', width: '100%', marginTop: 6 }}
                        value={editingBiz.triggerValue || ''}
                        onChange={e => setEditingBiz({ ...editingBiz, triggerValue: e.target.value })}
                        placeholder="e.g. Brick"
                      />
                    )}
                  </label>
                </div>
              </div>

              {/* ACTION */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Action
                </h4>
                
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
                  Action Type *
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                    value={editingBiz.actionType}
                    onChange={e => setEditingBiz({ ...editingBiz, actionType: e.target.value })}
                  >
                    {ACTION_TYPES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </label>

                {editingBiz.actionType.startsWith('set_') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Set Field *
                      <select
                        className="form-input"
                        style={{ display: 'block', width: '100%', marginTop: 6 }}
                        value={editingBiz.actionField || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const defaults = SET_VALUES_MAP[val] || [];
                          setEditingBiz({
                            ...editingBiz,
                            actionField: val,
                            actionValue: defaults[0] || '',
                          });
                        }}
                      >
                        <option value="">Select Field...</option>
                        {SET_FIELDS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Set Value *
                      {SET_VALUES_MAP[editingBiz.actionField || ''] ? (
                        <select
                          className="form-input"
                          style={{ display: 'block', width: '100%', marginTop: 6 }}
                          value={editingBiz.actionValue || ''}
                          onChange={e => setEditingBiz({ ...editingBiz, actionValue: e.target.value })}
                        >
                          {SET_VALUES_MAP[editingBiz.actionField || ''].map((v: string) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="form-input"
                          style={{ display: 'block', width: '100%', marginTop: 6 }}
                          value={editingBiz.actionValue || ''}
                          onChange={e => setEditingBiz({ ...editingBiz, actionValue: e.target.value })}
                          placeholder="e.g. EXT"
                        />
                      )}
                    </label>
                  </div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <input
                  type="checkbox"
                  checked={editingBiz.isActive}
                  onChange={e => setEditingBiz({ ...editingBiz, isActive: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                Rule is active (applies to all field reps)
              </label>

              {/* Error */}
              {error && (
                <div style={{ color: '#f87171', fontSize: '0.825rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: 6 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setEditingBiz(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveBiz} disabled={saving}>
                  {saving ? 'Saving...' : isNew ? 'Create Rule' : 'Save Changes'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── FLAT MODAL: MEASUREMENT RULES ── */}
      {editingMeas && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isNew ? '+ New Takeoff Rule' : `✏️ Edit Takeoff Rule: ${editingMeas.name}`}
              </h3>
              <button onClick={() => setEditingMeas(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {isNew && (
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Load Measurement Preset Template
                  <select
                    className="form-input"
                    style={{ display: 'block', width: '100%', marginTop: 6, borderColor: '#3b82f6' }}
                    onChange={e => {
                      const idx = parseInt(e.target.value);
                      if (isNaN(idx)) return;
                      const preset = MEAS_PRESETS[idx];
                      if (preset) {
                        setEditingMeas({
                          ...editingMeas,
                          ...preset,
                        });
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Choose Takeoff Preset --</option>
                    {MEAS_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Takeoff Rule Name *
                <input
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                  value={editingMeas.name}
                  onChange={e => setEditingMeas({ ...editingMeas, name: e.target.value })}
                  placeholder="e.g. Siding Insert Takeoff"
                />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Description
                <textarea
                  className="form-input"
                  style={{ display: 'block', width: '100%', marginTop: 6, minHeight: 60, resize: 'vertical' }}
                  value={editingMeas.description || ''}
                  onChange={e => setEditingMeas({ ...editingMeas, description: e.target.value })}
                  placeholder="Details about takeoff formulas"
                />
              </label>

              {/* SCOPE DETAILS */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Scope
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Window Type
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.windowType || ''}
                      onChange={e => setEditingMeas({ ...editingMeas, windowType: e.target.value || undefined })}
                    >
                      <option value="">(All Window Types)</option>
                      <option value="double_hung">Double Hung</option>
                      <option value="single_hung">Single Hung</option>
                      <option value="picture">Picture Window</option>
                      <option value="slider">Slider</option>
                      <option value="3_lite_slider">3-Lite Slider</option>
                      <option value="casement">Casement</option>
                      <option value="oriel">Oriel Window</option>
                      <option value="circle_top">Circle Top</option>
                      <option value="eyebrow">Eyebrow</option>
                      <option value="arch">Arch / Half Round</option>
                      <option value="quarter_arch">Quarter Arch</option>
                      <option value="patio_door">Patio Door</option>
                      <option value="custom_shape">Custom / Geometric Shape</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Exterior Type
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.exteriorType || ''}
                      onChange={e => setEditingMeas({ ...editingMeas, exteriorType: (e.target.value as any) || undefined })}
                    >
                      <option value="">(All Exteriors)</option>
                      <option value="brick">Brick</option>
                      <option value="siding">Siding</option>
                      <option value="wood">Wood</option>
                      <option value="stucco">Stucco</option>
                      <option value="vinyl">Vinyl</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Install Type
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.installType || ''}
                      onChange={e => setEditingMeas({ ...editingMeas, installType: (e.target.value as any) || undefined })}
                    >
                      <option value="">(All Installs)</option>
                      <option value="INT">INT (Insert)</option>
                      <option value="EXT">EXT (Exterior Full Frame)</option>
                      <option value="full_frame">Full Frame</option>
                      <option value="insert">Insert</option>
                      <option value="replacement">Replacement</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Removal Type
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.removalType || ''}
                      onChange={e => setEditingMeas({ ...editingMeas, removalType: (e.target.value as any) || undefined })}
                    >
                      <option value="">(All Removals)</option>
                      <option value="ALUM">ALUM</option>
                      <option value="wood">WOOD</option>
                      <option value="vinyl">VINYL</option>
                      <option value="full_frame">FULL FRAME</option>
                      <option value="none">NONE</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* ACTION TYPE, SEVERITY & STATUS */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rule Behavior & Status
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Action Type *
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.actionType || 'deduct'}
                      onChange={e => setEditingMeas({ ...editingMeas, actionType: e.target.value })}
                    >
                      <option value="deduct">Deduct (takeoff)</option>
                      <option value="warn">Warn (trigger alert)</option>
                      <option value="block">Block (prevent export)</option>
                      <option value="require_photo">Require Photo</option>
                      <option value="require_note">Require Note</option>
                      <option value="require_confirmation">Require Confirmation</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Severity *
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.severity || 'high'}
                      onChange={e => setEditingMeas({ ...editingMeas, severity: e.target.value as any })}
                    >
                      <option value="info">Info</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="blocker">Blocker</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Status *
                    <select
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.status || 'needs_verification'}
                      onChange={e => setEditingMeas({ ...editingMeas, status: e.target.value as any })}
                    >
                      <option value="draft">Draft</option>
                      <option value="needs_verification">Needs Verification</option>
                      <option value="verified">Verified</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* TAKEOFF FRACTIONS/DECIMALS */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Takeoff Surcharges / Deductions
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Width Takeoff Deduction (inches)
                    <input
                      type="number"
                      step="0.0625"
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.widthTakeoffDecimal}
                      onChange={e => setEditingMeas({ ...editingMeas, widthTakeoffDecimal: parseFloat(e.target.value) || 0 })}
                    />
                  </label>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Height Takeoff Deduction (inches)
                    <input
                      type="number"
                      step="0.0625"
                      className="form-input"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      value={editingMeas.heightTakeoffDecimal}
                      onChange={e => setEditingMeas({ ...editingMeas, heightTakeoffDecimal: parseFloat(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingMeas.requiresConfirmation}
                    onChange={e => setEditingMeas({ ...editingMeas, requiresConfirmation: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  Req. Confirmation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingMeas.requiresPhoto}
                    onChange={e => setEditingMeas({ ...editingMeas, requiresPhoto: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  Req. Photo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingMeas.requiresNote || false}
                    onChange={e => setEditingMeas({ ...editingMeas, requiresNote: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  Req. Note
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={editingMeas.active}
                  onChange={e => setEditingMeas({ ...editingMeas, active: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                Takeoff rule is active
              </label>

              {/* Error */}
              {error && (
                <div style={{ color: '#f87171', fontSize: '0.825rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: 6 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setEditingMeas(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveMeas} disabled={saving}>
                  {saving ? 'Saving...' : isNew ? 'Create Takeoff Rule' : 'Save Changes'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
