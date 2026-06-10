import { useState, useEffect, useRef } from 'react';
import { parseMeasurement, toFractionDisplay } from '../utils/measurementParser';
import { MeasureHelpModal } from './MeasureHelpModal';

interface FractionTextInputProps {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  autoFocus?: boolean;
}

export function FractionTextInput({
  value,
  onChange,
  placeholder,
  className,
  style,
  id,
  autoFocus,
}: FractionTextInputProps) {
  const [text, setText] = useState(value ? toFractionDisplay(value) : '');
  const lastNotifiedValue = useRef(value);

  useEffect(() => {
    if (value !== lastNotifiedValue.current) {
      setText(value ? toFractionDisplay(value) : '');
      lastNotifiedValue.current = value;
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = parseMeasurement(raw);
    if (parsed.valid) {
      lastNotifiedValue.current = parsed.inches;
      onChange(parsed.inches);
    } else if (raw === '') {
      lastNotifiedValue.current = null;
      onChange(null);
    }
  };

  const handleBlur = () => {
    if (value) {
      setText(toFractionDisplay(value));
    } else {
      setText('');
    }
  };

  return (
    <input
      id={id}
      type="text"
      value={text}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
    />
  );
}
import type { SketchMarkerData, WindowType, ShapeType } from '../utils/sketchSync';
import { calcUnitedInches, checkTubShowerRule, checkLowGlassRule, calculateGlassArea, NON_OPENING_MARKERS } from '../utils/sketchSync';
import {
  calculateFinalMeasurement,
  calculateSimpleFinalMeasurement,
  detectMeasurementMode,
  resolveMeasurementDefaultsForOpening
} from '../utils/measurementRulesEngine';
import { WW_OPENING_DEFAULTS } from '../utils/openingDefaults';
import { estimateMissingMeasurement, type MeasurementEstimate } from '../utils/aiMeasurementRecovery';
import { getShapeIcon } from './SpecialShapeIcons';
import { getGridPatternIcon } from './GridPatternIcons';
import { getExteriorSurfaceIcon } from './ExteriorSurfaceIcons';
import { validateOpening } from '../utils/openingValidation';
import { toast } from './Toast';
import DefaultBadge from './DefaultBadge';
import { resolveOpeningDefaults } from '../utils/openingDefaults';
import { SmartMeasurementAssistant } from './SmartMeasurementAssistant';
import { SmartCheckPanel } from './SmartCheckPanel';
import { SpecialtyShapePicker } from './SpecialtyShapePicker';
import { GridPatternPicker } from './GridPatternPicker';
import { WindowTypePicker } from './WindowTypePicker';
import { VisualOptionPicker } from './visualOptions';
import type { VisualOption } from './visualOptions';
import { getRemovalTypeIcon, getInstallTypeIcon } from './RealisticInstallIcons';
import { getTrimIcon, getHeaderIcon, getCutbackIcon } from './RealisticExteriorDetailIcons';
import { getGlassIcon, getScreenIcon, getColorSwatchIcon } from './RealisticProductIcons';

const WINDOW_TYPES: { value: WindowType; label: string; icon: string }[] = [
  { value: 'double_hung', label: 'Double Hung', icon: '🪟' },
  { value: 'picture', label: 'Picture', icon: '🖼️' },
  { value: 'slider', label: 'Slider', icon: '↔️' },
  { value: 'casement', label: 'Casement', icon: '🔲' },
  { value: 'awning', label: 'Awning', icon: '☂️' },
  { value: 'patio_door', label: 'Patio Door', icon: '🚪' },
  { value: 'bso', label: 'BSO', icon: '⬇️' },
  { value: 'special_shape', label: 'Special Shape', icon: '⬡' },
  { value: 'oriel', label: 'Oriel', icon: '🔲' },
  { value: 'door_sidelight', label: 'Door Sidelight', icon: '🚪' },
  { value: 'other', label: 'Other', icon: '❓' },
];

const ELEVATIONS = ['main', 'second_story', 'details'];
const EXTERIOR_TYPES = [
  'Vinyl Siding', 'Wood Siding', 'Stucco', 'Brick', 'Hardie / Fiber Cement',
  'Metal', 'Existing Trim', 'Existing Header', 'Mixed Material', 'Unknown / Verify', 'Other'
];
const INTERIOR_COLORS = ['White', 'Almond', 'Clay', 'Woodgrain'];
const EXTERIOR_COLORS = ['White', 'Almond', 'Clay', 'Bronze', 'Black'];
const GRID_PROFILES = ['Flat', 'Contoured', 'SDL', 'GBG'];
const GRID_PLACEMENTS = [
  { value: 'full', label: 'Full Window / Both Sash' },
  { value: 'top_sash', label: 'Top Sash Only' },
  { value: 'bottom_sash', label: 'Bottom Sash Only' },
  { value: 'perimeter', label: 'Perimeter Only' },
  { value: 'custom', label: 'Custom Placement' },
];
const GLASS_OPTIONS = ['LEE', 'LE'];
const SCREEN_OPTIONS = ['Full Screen', 'Half Screen', 'No Screen'];

// ── Visual option definitions for VisualOptionPicker ──

const REMOVAL_TYPE_OPTIONS: VisualOption[] = [
  { value: 'ALUM', label: 'Aluminum', helper: 'Standard aluminum frame', icon: getRemovalTypeIcon('ALUM'), badge: 'default' },
  { value: 'WOOD', label: 'Wood', helper: 'Wood frame removal', icon: getRemovalTypeIcon('WOOD') },
  { value: 'VINYL', label: 'Vinyl', helper: 'Vinyl frame removal', icon: getRemovalTypeIcon('VINYL') },
  { value: 'STEEL', label: 'Steel', helper: 'Steel/metal frame', icon: getRemovalTypeIcon('STEEL') },
  { value: 'ALUM_STUCCO', label: 'Alum in Stucco', helper: 'Remove Aluminum in Stucco', icon: getRemovalTypeIcon('ALUM') },
  { value: 'STORM', label: 'Storm Only', helper: 'Storm window removal', icon: getRemovalTypeIcon('STORM') },
  { value: 'none', label: 'None', helper: 'No removal needed', icon: getRemovalTypeIcon('none') },
  { value: 'other', label: 'Other', helper: 'Notes required', icon: getRemovalTypeIcon('other'), badge: 'needs-review' },
];

const INSTALL_TYPE_OPTIONS: VisualOption[] = [
  { value: 'EXT', label: 'Exterior', helper: 'Exterior install', icon: getInstallTypeIcon('EXT') },
  { value: 'INT', label: 'Interior', helper: 'Interior install', icon: getInstallTypeIcon('INT') },
  { value: 'replacement', label: 'Replacement', helper: 'Pocket replacement', icon: getInstallTypeIcon('replacement') },
  { value: 'full_frame', label: 'Full Frame', helper: 'Full-frame install', icon: getInstallTypeIcon('full_frame') },
  { value: 'new_construction', label: 'New Const.', helper: 'New construction', icon: getInstallTypeIcon('new_construction') },
  { value: 'other', label: 'Other', helper: 'Notes required', icon: getInstallTypeIcon('other'), badge: 'needs-review' },
];

const GLASS_VISUAL_OPTIONS: VisualOption[] = [
  { value: 'LEE', label: 'Low-E Elite', helper: 'Premium energy efficient', icon: getGlassIcon('LEE'), badge: 'default' },
  { value: 'LE', label: 'Low-E', helper: 'Standard energy efficient', icon: getGlassIcon('LEE') },
];

const SCREEN_VISUAL_OPTIONS: VisualOption[] = [
  { value: 'Half Screen', label: 'Half', helper: 'Half screen (default)', icon: getScreenIcon('Half Screen'), badge: 'default' },
  { value: 'Full Screen', label: 'Full', helper: 'Full screen (+adder)', icon: getScreenIcon('Full Screen'), badge: 'adds-price' },
  { value: 'No Screen', label: 'None', helper: 'No screen', icon: getScreenIcon('No Screen') },
];

const INTERIOR_COLOR_OPTIONS: VisualOption[] = INTERIOR_COLORS.map(c => ({
  value: c, label: c, icon: getColorSwatchIcon(c, true),
  ...(c === 'White' ? { badge: 'default' as const } : {}),
}));

const EXTERIOR_COLOR_OPTIONS: VisualOption[] = EXTERIOR_COLORS.map(c => ({
  value: c, label: c, icon: getColorSwatchIcon(c, false),
  ...(c === 'White' ? { badge: 'default' as const } : {}),
}));

const CUTBACK_VISUAL_OPTIONS: VisualOption[] = [
  { value: 'Needs cutback selection', label: 'Select...', helper: 'Required', icon: getCutbackIcon('Needs cutback selection'), badge: 'needs-review' },
  { value: 'Standard stucco cutback', label: 'Standard', helper: 'Standard stucco', icon: getCutbackIcon('Standard stucco cutback') },
  { value: 'Wood Casing Cutback', label: 'Wood Casing', helper: 'Wood Casing Cutback', icon: getCutbackIcon('Standard stucco cutback') },
  { value: 'Custom cutback', label: 'Custom', helper: 'Add notes', icon: getCutbackIcon('Custom cutback'), badge: 'needs-review' },
  { value: 'No cutback', label: 'None', helper: 'No cutback', icon: getCutbackIcon('No cutback') },
];

const TRIM_VISUAL_OPTIONS: VisualOption[] = [
  { value: 'Vinyl trim', label: 'Vinyl', helper: 'Included', icon: getTrimIcon('Vinyl trim'), badge: 'included' },
  { value: 'Exterior Capping', label: 'Ext Capping', helper: 'Install Exterior Capping', icon: getTrimIcon('Vinyl trim') },
  { value: 'Special Shape Trim', label: 'Special Shape', helper: 'Special Shape Trim', icon: getTrimIcon('Custom trim') },
  { value: 'Bay Window Finish', label: 'Bay Finish', helper: 'Bay Window Finish & Trim', icon: getTrimIcon('Custom trim') },
  { value: 'Custom trim', label: 'Custom', helper: 'Notes required', icon: getTrimIcon('Custom trim'), badge: 'needs-review' },
  { value: 'None', label: 'None', helper: 'No trim', icon: getTrimIcon('None') },
];

const HEADER_VISUAL_OPTIONS: VisualOption[] = [
  { value: 'New header', label: 'New', helper: 'Included', icon: getHeaderIcon('New header'), badge: 'included' },
  { value: 'Reuse header', label: 'Reuse', helper: 'Existing header', icon: getHeaderIcon('Reuse header') },
  { value: 'None', label: 'None', helper: 'No header', icon: getHeaderIcon('None') },
];

interface MarkerDetailSheetProps {
  marker: SketchMarkerData;
  onUpdate: (updates: Partial<SketchMarkerData>) => void;
  onOpeningUpdate?: (fields: Record<string, any>) => void;
  onClose: () => void;
  onDelete: () => void;
  onAutoFill?: () => void;
  onPhotoAnalysis?: () => void;
  onDuplicate?: () => void;
  allMarkers?: SketchMarkerData[];
  allOpenings?: any[];
  opening?: any;
  hasPhoto?: boolean;
  focusTarget?: string | null;
  smartCheckReport?: any;
  smartCheckLoading?: boolean;
  runSmartCheck?: () => void;
  onFindingResolved?: (finding: any) => void;
  appointment?: any;
}

export function estimateSpecialShapePricing(
  model: string,
  w: number,
  h: number,
  trimSelected: boolean
) {
  const ui = Math.round(w + h);
  if (ui <= 0) return null;

  const isArchHung = ['S140', 'S144', 'S146'].includes(model);
  const isOverMaxDim = w > 84 || h > 84;
  
  let basePrice = 0;
  let overMaxAdder = 0;
  let maxUI = isArchHung ? 134 : 128;

  if (isArchHung) {
    if (ui <= 67) basePrice = 823.10;
    else if (ui <= 84) basePrice = 959.83;
    else if (ui <= 104) basePrice = 1115.02;
    else if (ui <= 124) basePrice = 1277.76;
    else basePrice = 1462.89;

    if (ui > 134 || isOverMaxDim) {
      basePrice = 1462.89;
      overMaxAdder = 150.00;
    }
  } else {
    if (ui <= 38) basePrice = 397.00;
    else if (ui <= 44) basePrice = 421.99;
    else if (ui <= 50) basePrice = 437.90;
    else if (ui <= 56) basePrice = 461.43;
    else if (ui <= 62) basePrice = 493.08;
    else if (ui <= 68) basePrice = 526.17;
    else if (ui <= 74) basePrice = 552.73;
    else if (ui <= 86) basePrice = 610.81;
    else if (ui <= 92) basePrice = 654.13;
    else if (ui <= 98) basePrice = 704.70;
    else if (ui <= 110) basePrice = 755.89;
    else basePrice = 918.27;

    if (ui > 128 || isOverMaxDim) {
      basePrice = 918.27;
      overMaxAdder = 150.00;
    }
  }

  const trimPrice = trimSelected ? 75.00 : 0.00;
  const total = basePrice + overMaxAdder + trimPrice;

  return {
    ui,
    basePrice,
    overMaxAdder,
    trimPrice,
    total,
    isOverMaxDim,
    isOverMaxUI: ui > maxUI
  };
}

export function MarkerDetailSheet({
  marker: initialMarker,
  onUpdate,
  onOpeningUpdate,
  onClose,
  onDelete,
  onAutoFill,
  onPhotoAnalysis,
  onDuplicate,
  allMarkers = [],
  allOpenings = [],
  opening: initialOpening,
  hasPhoto,
  focusTarget,
  smartCheckReport,
  smartCheckLoading,
  runSmartCheck,
  onFindingResolved,
  appointment,
}: MarkerDetailSheetProps) {
  const [marker, setMarker] = useState<SketchMarkerData>(initialMarker);
  const [opening, setOpening] = useState<any>(initialOpening || {});
  const [isDirty, setIsDirty] = useState(false);
  const [quickPriceMode, setQuickPriceMode] = useState(true);
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [measurementAssistantOpen, setMeasurementAssistantOpen] = useState(false);
  const [advancedMeasurementOpen, setAdvancedMeasurementOpen] = useState(() =>
    detectMeasurementMode(initialMarker) === 'advanced'
  );
  const [measureHelpOpen, setMeasureHelpOpen] = useState(false);
  const [measureHelpMode, setMeasureHelpMode] = useState<'exterior' | 'mull' | 'shape' | 'oriel' | 'tempered' | 'grids'>('exterior');
  const [skippedPhoto, setSkippedPhoto] = useState(false);

  useEffect(() => {
    // Only reset if the marker ID changes to avoid interrupting typing
    if (initialMarker.id !== marker.id) {
      setMarker(initialMarker);
      setOpening(initialOpening || {});
      setIsDirty(false);
      setShowOnlyMissing(false);
      setSkippedPhoto(false);

      // Backward compat: if the marker has final width/height but no simpleRaw values
      const mode = detectMeasurementMode(initialMarker);
      if (mode === 'simple' && initialMarker.width && !initialMarker.simpleRawWidth) {
        const basis = (initialOpening || {}).measurementBasis || 'outside';
        const deduction = (basis === 'outside' || basis === 'both') ? -0.375 : 0;
        const rawW = initialMarker.width - deduction;
        const rawH = initialMarker.height ? initialMarker.height - deduction : null;
        setMarker(prev => ({ ...prev, simpleRawWidth: rawW, simpleRawHeight: rawH }));
      }
    }
  }, [initialMarker.id]); // Removed initialOpening to avoid reset on parent update

  // Auto-save effect
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        onUpdate(marker);
        if (onOpeningUpdate && Object.keys(opening).length > 0) {
          onOpeningUpdate(opening);
        }
        setIsDirty(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [marker, opening, isDirty, onUpdate, onOpeningUpdate]);

  // Handle auto-calculation of final adjusted dimensions based on basis AND mode
  useEffect(() => {
    const basis = opening.measurementBasis || 'outside';
    const mode = advancedMeasurementOpen ? 'advanced' : 'simple';
    
    if (mode === 'advanced') {
      // Advanced: use existing 3-point smallest logic
      if (basis === 'outside' || basis === 'both') {
        const deduction = -0.375;
        const w = calculateFinalMeasurement(marker.widthTop || null, marker.widthMiddle || null, marker.widthBottom || null, deduction);
        if (w !== null && w !== marker.width) {
          updateLocalMarker({ width: w } as any);
        }
        const h = calculateFinalMeasurement(marker.heightLeft || null, marker.heightCenter || null, marker.heightRight || null, deduction);
        if (h !== null && h !== marker.height) {
          updateLocalMarker({ height: h } as any);
        }
      } else if (basis === 'inside') {
        const w = calculateFinalMeasurement(marker.insideWidthTop || null, marker.insideWidthMiddle || null, marker.insideWidthBottom || null, 0);
        if (w !== null && w !== marker.width) {
          updateLocalMarker({ width: w } as any);
        }
        const h = calculateFinalMeasurement(marker.insideHeightLeft || null, marker.insideHeightCenter || null, marker.insideHeightRight || null, 0);
        if (h !== null && h !== marker.height) {
          updateLocalMarker({ height: h } as any);
        }
      }
    } else {
      // Simple mode: auto-calc final from simpleRaw values
      const deduction = (basis === 'outside' || basis === 'both') ? -0.375 : 0;
      if (marker.simpleRawWidth && marker.simpleRawWidth > 0) {
        const w = calculateSimpleFinalMeasurement(marker.simpleRawWidth, deduction);
        if (w !== null && w !== marker.width) {
          updateLocalMarker({ width: w, unitedInches: w + (marker.height || 0) } as any);
        }
      }
      if (marker.simpleRawHeight && marker.simpleRawHeight > 0) {
        const h = calculateSimpleFinalMeasurement(marker.simpleRawHeight, deduction);
        if (h !== null && h !== marker.height) {
          updateLocalMarker({ height: h, unitedInches: (marker.width || 0) + h } as any);
        }
      }
    }
  }, [
    opening.measurementBasis, advancedMeasurementOpen,
    marker.simpleRawWidth, marker.simpleRawHeight,
    marker.widthTop, marker.widthMiddle, marker.widthBottom,
    marker.heightLeft, marker.heightCenter, marker.heightRight,
    marker.insideWidthTop, marker.insideWidthMiddle, marker.insideWidthBottom,
    marker.insideHeightLeft, marker.insideHeightCenter, marker.insideHeightRight
  ]);

  const [orielConfirmed, setOrielConfirmed] = useState(false);
  const [estimate, setEstimate] = useState<MeasurementEstimate | null>(null);
  const [temperedAnswers, setTemperedAnswers] = useState({
    tubNearby: '' as string,
    tubDistance: '' as string,
    bottomHeight: '' as string,
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F12') {
        e.preventDefault();
        setShowDiagnostics(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isOriel = marker.windowType === 'oriel' || opening?.oriel === true || (opening?.productCategory || '').toLowerCase().includes('oriel') || (opening?.model || '').toLowerCase().includes('oriel');
  const isSpecialShape = marker.windowType === 'special_shape';
  const isPicture = marker.windowType === 'picture';
  const isPatioDoor = marker.windowType === 'patio_door';

  useEffect(() => {
    if (isPicture && opening) {
      if (opening.screenOption !== 'No Screen') {
        updateLocalOpening({ screenOption: 'No Screen' });
      }
    }
  }, [marker.windowType]);

  useEffect(() => {
    if (focusTarget) {
      const section3Fields = [
        'Elevation', 'elevation', 'Interior Color', 'interiorColor', 'Exterior Color', 'exteriorColor',
        'Tempered', 'temperedGlass', 'Upper Sash Height', 'orielUpperSashHeight',
        'Oriel Measurement Basis', 'orielMeasurementBasis', 'Shape Type', 'shapeType',
        'Removal Type', 'removalType'
      ];
      if (section3Fields.includes(focusTarget)) {
        setQuickPriceMode(false);
      }

      // Map field names from UnifiedWarning to DOM IDs
      const fieldIdMap: Record<string, string> = {
        'Exterior Surface': 'focus-ExteriorSurface',
        'exteriorColor': 'focus-ExteriorSurface',
        'Width': 'focus-Width',
        'width': 'focus-Width',
        'Height': 'focus-Height',
        'height': 'focus-Height',
        'Grid Pattern': 'focus-GridPattern',
        'gridPattern': 'focus-GridPattern',
        'Grid Profile': 'focus-GridProfile',
        'gridProfile': 'focus-GridProfile',
        'Grid V-Lines': 'focus-GridVLines',
        'gridVerticalCount': 'focus-GridVLines',
        'Grid H-Lines': 'focus-GridHLines',
        'gridHorizontalCount': 'focus-GridHLines',
        'SDL Size': 'focus-SDLSize',
        'sdlSize': 'focus-SDLSize',
        'Upper Sash Height': 'focus-UpperSashHeight',
        'orielUpperSashHeight': 'focus-UpperSashHeight',
        'Oriel Measurement Basis': 'focus-OrielMeasurementBasis',
        'orielMeasurementBasis': 'focus-OrielMeasurementBasis',
        'Shape Type': 'focus-ShapeType',
        'shapeType': 'focus-ShapeType',
        'temperedGlass': 'focus-TemperedGlass',
        'tempered': 'focus-TemperedGlass',
        'removalType': 'focus-RemovalType',
        'removal': 'focus-RemovalType',
      };
      
      const targetId = fieldIdMap[focusTarget] || `focus-${focusTarget}`;
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
          
          // Visual highlight effect
          const originalBoxShadow = el.style.boxShadow;
          const originalTransition = el.style.transition;
          el.style.transition = 'box-shadow 0.3s ease-in-out, outline 0.3s ease-in-out';
          el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.6)';
          el.style.outline = 'none';
          
          setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
            el.style.outline = '';
          }, 2500);
        }
      }, 150);

      // Trigger respective Measure Help Modal tabs based on focus target
      if (['actualMeasurementBasis', 'cutbackRequired', 'removalDetail', 'outsidePhotoId', 'measurementVisualAnnotationId'].includes(focusTarget)) {
        setMeasureHelpMode('exterior');
        setMeasureHelpOpen(true);
      } else if (focusTarget === 'installMullion') {
        setMeasureHelpMode('mull');
        setMeasureHelpOpen(true);
      } else if (focusTarget === 'legHeight') {
        setMeasureHelpMode('shape');
        setMeasureHelpOpen(true);
      } else if (focusTarget === 'orielUpperSashHeight') {
        setMeasureHelpMode('oriel');
        setMeasureHelpOpen(true);
      } else if (focusTarget === 'temperedGlass') {
        setMeasureHelpMode('tempered');
        setMeasureHelpOpen(true);
      } else if (focusTarget === 'gridStyle') {
        setMeasureHelpMode('grids');
        setMeasureHelpOpen(true);
      }
    }
  }, [focusTarget]);

  useEffect(() => {
    document.body.classList.add('detail-panel-open');
    return () => {
      document.body.classList.remove('detail-panel-open');
    };
  }, []);

  const updateLocalMarker = (updates: Partial<SketchMarkerData>) => {
    setMarker((prev: SketchMarkerData) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };
  const updateLocalOpening = (updates: Record<string, any>) => {
    setOpening((prev: any) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleDimensionChange = (field: 'width' | 'height', value: string) => {
    const num = parseFloat(value) || null;
    const updates: Partial<SketchMarkerData> = { [field]: num };
    const w = field === 'width' ? num : marker.width;
    const h = field === 'height' ? num : marker.height;
    if (w && h) {
      updates.unitedInches = calcUnitedInches(w, h);
    }
    updateLocalMarker(updates);
  };

  const handleSave = () => {
    onUpdate(marker);
    if (onOpeningUpdate && Object.keys(opening).length > 0) {
      onOpeningUpdate(opening);
    }
    setIsDirty(false);
    toast.success(`Saved ${marker.markerLabel || 'Item'}`);
    onClose();
  };

  const handleApplyDefaults = () => {
    if (Object.keys(defaultsResult.defaults).length > 0) {
      updateLocalOpening(defaultsResult.defaults);
      toast.success(`Applied ${Object.keys(defaultsResult.defaults).length} suggested defaults`);
    }
  };

  const handleSaveAndAddAnother = () => {
    onUpdate(marker);
    if (onOpeningUpdate && Object.keys(opening).length > 0) {
      onOpeningUpdate(opening);
    }
    setIsDirty(false);
    if (onDuplicate) onDuplicate();
  };

  const handleCancel = () => {
    onClose();
  };

  const focusField = (field: string) => {
    // 1. Expand collapsed sections if needed
    const fullDetailsFields = [
      'elevation', 'floorNumber', 'interiorColor', 'exteriorColor', 
      'temperedGlass', 'obscureGlass', 'nailFin', 'sillRepair', 
      'removeStormWindow', 'installMullion', 'structuralMullion', 
      'jChannel', 'orielUpperSashHeight', 'orielMeasurementBasis', 
      'shapeType', 'removalType', 'installType', 'installerNotes'
    ];
    if (fullDetailsFields.includes(field)) {
      setQuickPriceMode(false);
    }

    // 2. Map field to DOM ID
    const fieldIdMap: Record<string, string> = {
      width: 'focus-Width',
      height: 'focus-Height',
      measurementBasis: 'focus-MeasurementBasis',
      roomLocation: 'focus-RoomLocation',
      elevation: 'focus-Elevation',
      productCategory: 'focus-WindowType',
      interiorColor: 'focus-InteriorColor',
      exteriorColor: 'focus-ExteriorColor',
      gridStyle: 'focus-GridPattern',
      gridPattern: 'focus-GridPattern',
      gridProfile: 'focus-GridProfile',
      sdlSize: 'focus-SDLSize',
      glassPackage: 'focus-GlassPackage',
      removalType: 'focus-RemovalType',
      installType: 'focus-InstallType',
      orielUpperSashHeight: 'focus-UpperSashHeight',
      orielMeasurementBasis: 'focus-OrielMeasurementBasis',
      cutbackType: 'focus-CutbackType',
      temperedGlass: 'focus-TemperedGlass',
    };

    const targetId = fieldIdMap[field] || `focus-${field}`;

    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        
        // Glow effect
        const prevOutline = el.style.outline;
        const prevBoxShadow = el.style.boxShadow;
        const prevBorderColor = el.style.borderColor;
        const prevTransition = el.style.transition;

        el.style.transition = 'all 0.3s ease';
        el.style.outline = 'none';
        el.style.borderColor = '#ef4444'; // red-500
        el.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.4)'; // red-500 glow

        setTimeout(() => {
          el.style.outline = prevOutline;
          el.style.boxShadow = prevBoxShadow;
          el.style.borderColor = prevBorderColor;
          el.style.transition = prevTransition;
        }, 3000);
      }
    }, 100);
  };

  const ui = calcUnitedInches(marker.width || 0, marker.height || 0);
  const glassArea = calculateGlassArea(marker.width || 0, marker.height || 0);
  const tubRule = checkTubShowerRule(parseFloat(temperedAnswers.tubDistance) || null, temperedAnswers.tubNearby || null);
  const lowGlassRule = checkLowGlassRule(parseFloat(temperedAnswers.bottomHeight) || null, glassArea);

  const validation = validateOpening(opening, allOpenings || [], false);
  const defaultsResult = resolveOpeningDefaults(opening, { stage: 'save_item' });
  const missingContract = validation.missingFields.filter(f => f.severity === 'required').map(f => f.label);
  const missingPrice = validation.missingFields.filter(f => f.field === 'width' || f.field === 'height' || f.field === 'productCategory' || f.field === 'exteriorColor' || f.field === 'interiorColor').map(f => f.label);

  const isPriceReady = marker.width && marker.height && marker.windowType;
  const hasGrid = (opening.gridPattern || opening.gridStyle || 'None') !== 'None';

  const estPricing = (() => {
    if (!isSpecialShape) return null;
    const w = Number(marker.width) || 0;
    const h = Number(marker.height) || 0;
    if (w <= 0 || h <= 0) return null;
    return estimateSpecialShapePricing(
      marker.shapeType || 'S105', 
      w, 
      h, 
      opening.specialShapeTrimSelected ?? true
    );
  })();

  const shouldShow = (fieldKey: string) => {
    if (!showOnlyMissing) return true;

    const hasRequiredMissing = validation.missingFields.some(f => f.severity === 'required');
    const hasRecommendedMissing = validation.missingFields.some(f => f.severity === 'recommended');

    // If nothing is missing, show everything
    if (!hasRequiredMissing && !hasRecommendedMissing) return true;

    const targetSeverity = hasRequiredMissing ? 'required' : 'recommended';

    // Helper to check validation.missingFields
    const isValMissing = (fk: string) => validation.missingFields.some(f => f.field === fk && f.severity === targetSeverity);

    switch (fieldKey) {
      case 'width':
        return isValMissing('width') || (hasRequiredMissing && !marker.simpleRawWidth && !marker.width);
      case 'height':
        return isValMissing('height') || (hasRequiredMissing && !marker.simpleRawHeight && !marker.height);
      case 'measurementBasis':
        return isValMissing('measurementBasis') || (hasRequiredMissing && (!opening.measurementBasis || opening.measurementBasis === 'needs_review'));
      case 'productCategory':
      case 'windowType':
        return isValMissing('productCategory') || (hasRequiredMissing && !marker.windowType);
      case 'roomLocation':
        return isValMissing('roomLocation') || (hasRequiredMissing && !marker.roomLocation);
      case 'exteriorSurface':
      case 'exteriorMaterial':
        return hasRequiredMissing && !marker.exteriorMaterial && !opening.exteriorSurface;
      case 'cutbackType':
        const isStucco = (marker.exteriorMaterial || opening.exteriorSurface || '').toLowerCase().includes('stucco');
        if (!isStucco) return false;
        return isValMissing('cutbackType') || (hasRequiredMissing && (!opening.cutbackType || opening.cutbackType === 'Needs cutback selection'));
      case 'glassPackage':
        return isValMissing('glassPackage') || (hasRequiredMissing && !opening.glassPackage);
      case 'gridStyle':
      case 'gridPattern':
        return isValMissing('gridStyle') || (hasRequiredMissing && !opening.gridPattern);
      case 'gridProfile':
        const hasGridPattern = (opening.gridPattern || opening.gridStyle || 'None') !== 'None';
        return hasGridPattern && (!opening.gridProfile || isValMissing('gridProfile'));
      case 'sdlSize':
        const isSDL = opening.gridProfile === 'SDL';
        return isSDL && (!opening.sdlSize || isValMissing('sdlSize'));
      case 'elevation':
        return isValMissing('elevation') || (hasRequiredMissing && !marker.elevation);
      case 'interiorColor':
        return isValMissing('interiorColor') || (hasRequiredMissing && !opening.interiorColor);
      case 'exteriorColor':
        return isValMissing('exteriorColor') || (hasRequiredMissing && !opening.exteriorColor);
      case 'removalType':
        return isValMissing('removalType') || (hasRequiredMissing && !marker.removalType);
      case 'temperedGlass':
      case 'obscureGlass':
        const room = (opening.roomLocation || '').toLowerCase();
        const isBath = room.includes('bath') || room.includes('shower') || room.includes('tub');
        if (!isBath) return false;
        return isValMissing('temperedGlass') || isValMissing('obscureGlass') || (hasRequiredMissing && (!opening.temperedGlass || opening.temperedGlass === 'none'));
      case 'orielUpperSashHeight':
        return isOriel && (isValMissing('orielUpperSashHeight') || (hasRequiredMissing && !marker.orielUpperSashHeight));
      case 'orielMeasurementBasis':
        return isOriel && (hasRequiredMissing && !marker.orielMeasurementBasis);
      case 'shapeType':
        return isSpecialShape && (isValMissing('radius') || isValMissing('legHeight') || (hasRequiredMissing && !marker.shapeType));
      default:
        return false;
    }
  };

  const getFirstMissingField = () => {
    const hasRequiredMissing = validation.missingFields.some(f => f.severity === 'required');
    const hasRecommendedMissing = validation.missingFields.some(f => f.severity === 'recommended');

    if (!hasRequiredMissing && !hasRecommendedMissing) return null;

    const targetSeverity = hasRequiredMissing ? 'required' : 'recommended';
    
    const firstMissing = validation.missingFields.find(f => f.severity === targetSeverity)?.field;
    if (firstMissing) return firstMissing;

    // Fallbacks for layout fields not explicitly returned in the validation object
    if (hasRequiredMissing) {
      if (!marker.simpleRawWidth && !marker.width) return 'width';
      if (!marker.simpleRawHeight && !marker.height) return 'height';
      if (!opening.measurementBasis || opening.measurementBasis === 'needs_review') return 'measurementBasis';
      if (!marker.windowType) return 'productCategory';
      if (!marker.roomLocation) return 'roomLocation';
      if (!marker.exteriorMaterial && !opening.exteriorSurface) return 'exteriorSurface';
      if (isOriel && !marker.orielUpperSashHeight) return 'orielUpperSashHeight';
      if (isSpecialShape && !marker.shapeType) return 'shapeType';
      if (!opening.glassPackage) return 'glassPackage';
      if (!opening.interiorColor) return 'interiorColor';
      if (!opening.exteriorColor) return 'exteriorColor';
      if (!marker.removalType) return 'removalType';
    }

    return null;
  };

  const isSectionVisible = (section: 1 | 2 | 3) => {
    if (!showOnlyMissing) return true;
    
    if (section === 1) {
      return (
        shouldShow('width') ||
        shouldShow('height') ||
        shouldShow('measurementBasis') ||
        shouldShow('productCategory') ||
        shouldShow('roomLocation') ||
        shouldShow('exteriorSurface') ||
        shouldShow('cutbackType')
      );
    }
    
    if (section === 2) {
      return (
        shouldShow('glassPackage') ||
        shouldShow('gridStyle') ||
        shouldShow('gridProfile') ||
        shouldShow('sdlSize')
      );
    }
    
    if (section === 3) {
      return (
        shouldShow('elevation') ||
        shouldShow('interiorColor') ||
        shouldShow('exteriorColor') ||
        shouldShow('temperedGlass') ||
        shouldShow('orielUpperSashHeight') ||
        shouldShow('orielMeasurementBasis') ||
        shouldShow('shapeType') ||
        shouldShow('removalType')
      );
    }
    
    return true;
  };

  return (
    <div className="marker-sheet-container" style={{
      background: 'var(--card)',
      zIndex: 1000,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        .marker-sheet-container {
          position: fixed; bottom: 0; left: 0; right: 0; width: 100%; max-width: 100vw;
          border-top: 1px solid var(--border); border-radius: var(--radius) var(--radius) 0 0; 
          max-height: 85dvh;
          padding-bottom: env(safe-area-inset-bottom, 20px);
          overflow-y: auto;
          animation: slideUp 0.25s ease-out; box-sizing: border-box;
          z-index: 1000;
        }
        @media (min-width: 1024px) {
          .marker-sheet-container {
            right: 0; left: auto; top: 60px; bottom: 0; width: clamp(360px, 32vw, 480px);
            max-width: min(480px, calc(100vw - 24px)); max-height: calc(100dvh - 60px);
            border-top: none; border-left: 1px solid var(--border); border-radius: 0; animation: slideLeft 0.25s ease-out;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) and (orientation: landscape) {
          .marker-sheet-container {
            right: 0; left: auto; top: 60px; bottom: 0; width: clamp(320px, 40vw, 400px);
            max-width: calc(100vw - 16px); max-height: calc(100dvh - 60px); border-top: none;
            border-left: 1px solid var(--border); border-radius: 0; animation: slideLeft 0.25s ease-out;
          }
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        
        .section-title {
          font-size: 0.875rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase;
          margin-bottom: 0.75rem; margin-top: 1.25rem;
        }
        .section-title:first-child { margin-top: 0; }
        
        /* Reduce spacing logic */
        .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; }
        .field-row { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
        
        .badge-warning {
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .badge-warning:hover {
          filter: brightness(1.2);
          transform: translateY(-1px);
        }
        .badge-warning:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Header */}
      {opening?.copiedFromOpeningId && !opening.measurementConfirmed && (
        <div style={{
          background: 'var(--amberbg)', borderBottom: '1px solid rgba(154,103,0,0.2)',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 600
        }}>
          <span>⚠️</span> Duplicated opening. Please confirm measurements and details.
        </div>
      )}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(() => {
              const openingLabels: Record<string, string> = {
                window_x: 'X', dh: 'DH', sh: 'SH', slider: 'SL', picture: 'PIC',
                casement: 'CAS', awning: 'AWN', oriel: 'OR', specialty_shape: 'SS',
                bay: 'BAY', bow: 'BOW', circle_top: 'CT', eyebrow: 'EY',
                half_round: 'HR', trapezoid: 'TRAP', patio_door: 'PAT', sgd: 'SGD',
                front_door: 'FD', back_door: 'BD',
              };
              const prefix = openingLabels[marker.markerSymbol] || 'X';
              const isDuplicate = allMarkers?.some(
                m => m.id !== marker.id && 
                m.markerNumber === marker.markerNumber && 
                !NON_OPENING_MARKERS.includes(m.markerSymbol)
              );
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{prefix} #</span>
                  <input
                    type="number"
                    value={marker.markerNumber || ''}
                    min={1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        const newLabel = `${prefix} #${val}`;
                        onUpdate({ markerNumber: val, markerLabel: newLabel, linkedOrderRowNumber: val });
                      }
                    }}
                    style={{
                      width: '55px',
                      padding: '2px 4px',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: isDuplicate ? '2px solid var(--danger)' : '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  />
                  {isDuplicate && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="This window number is already in use!">
                      ⚠️ Duplicate
                    </span>
                  )}
                </div>
              );
            })()}
            {validation.status === 'complete' || validation.status === 'ready' ? (
              <span className="badge badge-sold">Complete ✓</span>
            ) : isPriceReady ? (
              <span className="badge badge-sold">Price Ready</span>
            ) : (
              <span className="badge badge-danger">Missing Price Fields</span>
            )}
            {validation.status !== 'complete' && validation.status !== 'ready' && (
              <span 
                className={`badge badge-warning ${showOnlyMissing ? 'active-filter' : ''}`}
                onClick={() => {
                  const nextShowOnly = !showOnlyMissing;
                  setShowOnlyMissing(nextShowOnly);
                  if (nextShowOnly) {
                    const firstMissing = getFirstMissingField();
                    if (firstMissing) {
                      focusField(firstMissing);
                    }
                  }
                }}
                style={{ 
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: showOnlyMissing ? '1px solid var(--amber)' : '1px solid transparent',
                  background: showOnlyMissing ? 'var(--amber)' : 'var(--amberbg)',
                  color: showOnlyMissing ? '#fff' : 'var(--amber)',
                  fontWeight: 700,
                  boxShadow: showOnlyMissing ? '0 0 10px rgba(154,103,0,0.3)' : 'none',
                }}
                title={showOnlyMissing ? "Click to show all fields" : "Click to show only missing required fields"}
              >
                {showOnlyMissing ? '🔍 Showing Only Needed' : '⚠️ Needs Details'}
              </span>
            )}
          </div>
          {validation.missingFields.filter(f => f.severity === 'required').length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', maxWidth: '300px', whiteSpace: 'normal', lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Missing:</span>
              {validation.missingFields.filter(f => f.severity === 'required').map((f, idx, arr) => (
                <span 
                  key={f.field} 
                  onClick={() => focusField(f.field)}
                  style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                >
                  {f.label}{idx < arr.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}
            onClick={() => {
              setMeasureHelpMode('exterior');
              setMeasureHelpOpen(true);
            }}
          >
            衡量 📏 Measure Help
          </button>
          {onPhotoAnalysis && (
            <button className={`btn btn-sm ${hasPhoto ? 'btn-success' : 'btn-primary'}`} onClick={onPhotoAnalysis}>📸</button>
          )}
          <button className="btn btn-sm btn-danger" onClick={onDelete}>🗑</button>
        </div>
      </div>

      {/* Defaults Status Bar */}
      {(Object.keys(defaultsResult.fieldStatus).length > 0 || defaultsResult.needsReview.length > 0) && (
        <div style={{
          padding: '0.4rem 1rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          background: defaultsResult.needsReview.length > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)',
          fontSize: '0.7rem', color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {Object.values(defaultsResult.fieldStatus).filter(s => s === 'defaulted' || s === 'suggested').length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10 }}>⚙️</span>
                {Object.values(defaultsResult.fieldStatus).filter(s => s === 'defaulted' || s === 'suggested').length} defaults active
              </span>
            )}
            {defaultsResult.needsReview.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontWeight: 600 }}>
                <span style={{ fontSize: 10 }}>⚠️</span>
                {defaultsResult.needsReview.length} needs review
              </span>
            )}
            {defaultsResult.suggestions.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--blue)' }}>
                <span style={{ fontSize: 10 }}>💡</span>
                {defaultsResult.suggestions.length} suggestions
              </span>
            )}
          </div>
          {Object.keys(defaultsResult.defaults).length > 0 && (
            <button 
              className="btn btn-sm btn-primary" 
              onClick={handleApplyDefaults}
              style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', height: 'auto' }}
            >
              Apply All Suggested
            </button>
          )}
        </div>
      )}

      {/* Scrollable Form or Photo Requirement Splash */}
      {!hasPhoto && !skippedPhoto && !NON_OPENING_MARKERS.includes(marker.markerSymbol) ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px',
          width: 'calc(100% - 2rem)', margin: '1rem auto', boxSizing: 'border-box', border: '2px dashed var(--border)', gap: '1.25rem', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>📸</div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Photo Analysis Required</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
              Window World Assistant uses AI computer vision to identify trim, header, and measurement details. Please take or upload a photo of the opening first.
            </p>
          </div>
          <button 
            onClick={onPhotoAnalysis}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%)', color: '#fff',
              fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'transform 0.2s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            📸 Capture / Upload Photo
          </button>
          <button 
            onClick={() => setSkippedPhoto(true)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Skip Photo (Manual Entry)
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          
          {/* Smart Check Panel (Opening-specific) */}
        <SmartCheckPanel
          report={smartCheckReport}
          loading={smartCheckLoading}
          compact={true}
          filterOpeningId={opening?.id}
          onRunCheck={runSmartCheck}
          onFindingResolved={onFindingResolved}
        />

        {/* ⚠️ Missing Required Details Interactive Panel */}
        {!showOnlyMissing && validation.missingFields.filter(f => f.severity === 'required').length > 0 && (
          <div style={{
            background: '#fdecec',
            border: '1px solid rgba(220, 53, 69, 0.2)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
              <span>⚠️</span>
              <span>Details Needed to Complete Contract:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {validation.missingFields.filter(f => f.severity === 'required').map(f => (
                <button
                  key={f.field}
                  onClick={() => focusField(f.field)}
                  style={{
                    background: 'rgba(220, 53, 69, 0.1)',
                    border: '1px solid rgba(220, 53, 69, 0.2)',
                    color: '#a32d2d',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)'}
                >
                  <span>{f.label}</span>
                  <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>➔</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 1: QUICK PRICE ── */}
        {isSectionVisible(1) && (
          <>
            <div className="section-title">1. Quick Price</div>
            
            {shouldShow('width') && shouldShow('height') && (!marker.width || !marker.height) && (
              <div style={{ padding: '0.75rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)' }}>🤖 AI Recovery</span>
                <button className="btn btn-sm btn-primary" onClick={() => {
                  const est = estimateMissingMeasurement(marker, allMarkers, allOpenings);
                  if (est) setEstimate(est);
                }}>
                  Analyze Geometry
                </button>
              </div>
            )}
            {estimate && (
              <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{estimate.width} <span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>W ×</span> {estimate.height} <span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>H</span></div>
                <button className="btn btn-sm btn-success" onClick={() => { updateLocalMarker({ width: estimate.width, height: estimate.height }); setEstimate(null); }}>Apply</button>
              </div>
            )}

            {/* ── Measurement Basis ── */}
            {shouldShow('measurementBasis') && (
              <div className="field-grid">
                <FieldGroup label="Basis">
                  <select id="focus-MeasurementBasis" className="form-input" value={opening.measurementBasis || 'outside'} onChange={e => {
                    updateLocalOpening({ measurementBasis: e.target.value });
                    updateLocalMarker({ pricingStatus: 'stale' } as any);
                    updateLocalOpening({ pricingStatus: 'pending' });
                  }}>
                    <option value="outside">Outside</option>
                    <option value="inside">Inside</option>
                    <option value="both">Both Outside & Inside</option>
                    <option value="needs_review">Needs Review</option>
                  </select>
                </FieldGroup>
              </div>
            )}

            {/* ── Simple Mode (default) — fast 1-width + 1-height ── */}
            {!advancedMeasurementOpen && (shouldShow('width') || shouldShow('height')) && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="field-grid">
                  {shouldShow('width') && (
                    <FieldGroup label={`${(opening.measurementBasis === 'inside') ? 'Inside' : 'Outside'} Width (in)`}>
                      <FractionTextInput id="focus-Width"
                        value={marker.simpleRawWidth}
                        onChange={raw => {
                          const basis = opening.measurementBasis || 'outside';
                          const deduction = (basis === 'outside' || basis === 'both') ? -0.375 : 0;
                          const final_ = raw && raw > 0 ? raw + deduction : null;
                          updateLocalMarker({
                            simpleRawWidth: raw,
                            width: final_,
                            measurementMode: 'simple',
                            unitedInches: final_ ? final_ + (marker.height || 0) : marker.unitedInches,
                          } as any);
                        }}
                        style={{ borderColor: !marker.simpleRawWidth && !marker.width ? 'var(--danger)' : '', minHeight: '44px', fontSize: '1rem' }}
                        placeholder="36"
                        className="form-input"
                      />
                    </FieldGroup>
                  )}
                  {shouldShow('height') && (
                    <FieldGroup label={`${(opening.measurementBasis === 'inside') ? 'Inside' : 'Outside'} Height (in)`}>
                      <FractionTextInput id="focus-Height"
                        value={marker.simpleRawHeight}
                        onChange={raw => {
                          const basis = opening.measurementBasis || 'outside';
                          const deduction = (basis === 'outside' || basis === 'both') ? -0.375 : 0;
                          const final_ = raw && raw > 0 ? raw + deduction : null;
                          updateLocalMarker({
                            simpleRawHeight: raw,
                            height: final_,
                            measurementMode: 'simple',
                            unitedInches: final_ ? (marker.width || 0) + final_ : marker.unitedInches,
                          } as any);
                        }}
                        style={{ borderColor: !marker.simpleRawHeight && !marker.height ? 'var(--danger)' : '', minHeight: '44px', fontSize: '1rem' }}
                        placeholder="60"
                        className="form-input"
                      />
                    </FieldGroup>
                  )}
                </div>

                {/* Deduction + Final Size display */}
                {(!showOnlyMissing || (shouldShow('width') && shouldShow('height'))) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Measured:
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: (opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? 'line-through' : 'none', opacity: (opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? 0.6 : 1 }}>
                        {marker.simpleRawWidth ? `${toFractionDisplay(marker.simpleRawWidth)}"` : (marker.width ? `${toFractionDisplay(marker.width)}"` : '—')} × {marker.simpleRawHeight ? `${toFractionDisplay(marker.simpleRawHeight)}"` : (marker.height ? `${toFractionDisplay(marker.height)}"` : '—')}
                      </span>
                    </div>
                    {(opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') && (
                      <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                          Order Size (-3/8" deduction):
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8' }}>
                          {marker.width ? `${toFractionDisplay(marker.width)}"` : '—'} × {marker.height ? `${toFractionDisplay(marker.height)}"` : '—'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation for advanced mode */}
                {!showOnlyMissing && ((marker.exteriorMaterial || opening.exteriorSurface || '').toLowerCase().includes('brick') ||
                  (marker.exteriorMaterial || opening.exteriorSurface || '').toLowerCase().includes('stucco')) && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--amberbg)', border: '1px solid rgba(154, 103, 0, 0.2)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--amber)' }}>
                    💡 Consider using 3-point measurement for brick/stucco — the opening may be out of square.
                  </div>
                )}
              </div>
            )}

            {/* ── Advanced Mode (3-point, collapsed by default) ── */}
            {advancedMeasurementOpen && (shouldShow('width') || shouldShow('height')) && (
              <div style={{ marginTop: '0.5rem' }}>
                {['outside', 'both'].includes(opening.measurementBasis || 'outside') && (
                  <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>Outside Measurements (Raw)</h4>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Deduction: -3/8"</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <FractionTextInput placeholder="Width Top" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.widthTop} onChange={val => updateLocalMarker({ widthTop: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Width Mid" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.widthMiddle} onChange={val => updateLocalMarker({ widthMiddle: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Width Bot" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.widthBottom} onChange={val => updateLocalMarker({ widthBottom: val, measurementMode: 'advanced' })} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <FractionTextInput placeholder="Height Left" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.heightLeft} onChange={val => updateLocalMarker({ heightLeft: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Height Center" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.heightCenter} onChange={val => updateLocalMarker({ heightCenter: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Height Right" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.heightRight} onChange={val => updateLocalMarker({ heightRight: val, measurementMode: 'advanced' })} />
                      </div>
                    </div>
                  </div>
                )}

                {['inside', 'both'].includes(opening.measurementBasis || 'outside') && (
                  <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>Inside Measurements (Raw)</h4>
                      <span style={{ fontSize: '0.75rem', color: '#a3e635' }}>Deduction: -0"</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <FractionTextInput placeholder="Width Top" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideWidthTop} onChange={val => updateLocalMarker({ insideWidthTop: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Width Mid" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideWidthMiddle} onChange={val => updateLocalMarker({ insideWidthMiddle: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Width Bot" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideWidthBottom} onChange={val => updateLocalMarker({ insideWidthBottom: val, measurementMode: 'advanced' })} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <FractionTextInput placeholder="Height Left" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideHeightLeft} onChange={val => updateLocalMarker({ insideHeightLeft: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Height Center" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideHeightCenter} onChange={val => updateLocalMarker({ insideHeightCenter: val, measurementMode: 'advanced' })} />
                        <FractionTextInput placeholder="Height Right" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem', minHeight: '40px' }} value={marker.insideHeightRight} onChange={val => updateLocalMarker({ insideHeightRight: val, measurementMode: 'advanced' })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Size display for advanced mode */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Smallest Measured:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: (opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? 'line-through' : 'none', opacity: (opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? 0.6 : 1 }}>
                      {marker.width ? `${toFractionDisplay((opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? marker.width + 0.375 : marker.width)}"` : '—'} × {marker.height ? `${toFractionDisplay((opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') ? marker.height + 0.375 : marker.height)}"` : '—'}
                    </span>
                  </div>
                  {(opening.measurementBasis === 'outside' || opening.measurementBasis === 'both') && (
                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                        Order Size (-3/8" deduction):
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8' }}>
                        {marker.width ? `${toFractionDisplay(marker.width)}"` : '—'} × {marker.height ? `${toFractionDisplay(marker.height)}"` : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Toggle between simple and advanced ── */}
            {!showOnlyMissing && (
              <button
                onClick={() => {
                  const next = !advancedMeasurementOpen;
                  setAdvancedMeasurementOpen(next);
                  updateLocalMarker({ measurementMode: next ? 'advanced' : 'simple' } as any);
                }}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: advancedMeasurementOpen ? '#fdecec' : 'var(--infobg)', border: `1px solid ${advancedMeasurementOpen ? 'rgba(220, 53, 69, 0.2)' : 'rgba(13, 110, 253, 0.2)'}`, borderRadius: 6, color: advancedMeasurementOpen ? 'var(--danger)' : 'var(--blue)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}
              >
                {advancedMeasurementOpen ? '↩ Switch to simple measurement' : '📐 Use 3-point measurement'}
              </button>
            )}

            {!showOnlyMissing && (
              <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => { e.preventDefault(); setMeasurementAssistantOpen(!measurementAssistantOpen); }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>📏</span> {measurementAssistantOpen ? 'Close Smart Measure' : 'Smart Measure AI (Tape & Cush)'}
                </button>
                
                {measurementAssistantOpen && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <SmartMeasurementAssistant 
                      marker={marker} 
                      opening={opening} 
                      onUpdateMarker={updateLocalMarker} 
                      onUpdateOpening={updateLocalOpening} 
                    />
                  </div>
                )}
              </div>
            )}

            {shouldShow('productCategory') && (
              <div className="field-row">
                <FieldGroup label="Window Type">
                  <div id="focus-WindowType" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                    <WindowTypePicker 
                      value={marker.windowType || null}
                      onChange={type => {
                        const map: Record<string, any> = {
                          double_hung: 'dh',
                          picture: 'picture',
                          slider: 'slider',
                          casement: 'casement',
                          awning: 'awning',
                          patio_door: 'patio_door',
                          special_shape: 'special_shape',
                          oriel: 'oriel',
                        };
                        updateLocalMarker({ 
                          windowType: type as any,
                          ...(map[type] ? { markerSymbol: map[type] } : {})
                        });
                      }}
                      error={!marker.windowType}
                    />
                  </div>
                </FieldGroup>
                {marker.windowType === 'double_hung' && !showOnlyMissing && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={isOriel} 
                      onChange={e => {
                        updateLocalOpening({ oriel: e.target.checked });
                        if (e.target.checked) {
                          updateLocalMarker({ windowType: 'oriel', markerSymbol: 'oriel' } as any);
                        } else {
                          updateLocalMarker({ windowType: 'double_hung', markerSymbol: 'dh' } as any);
                        }
                      }} 
                    />
                    <label>Is this an Oriel window (sash split)?</label>
                  </div>
                )}
              </div>
            )}
            
            {shouldShow('exteriorSurface') && (
              <div className="field-row" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <FieldGroup label="Exterior Surface">
                  <div id="focus-ExteriorSurface" style={{ 
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', gap: '0.5rem', 
                    marginTop: '0.5rem', padding: '2px', 
                    borderColor: (!marker.exteriorMaterial && !opening.exteriorSurface) ? '#ef4444' : 'transparent', 
                    borderWidth: 1, borderStyle: 'solid', borderRadius: 8 
                  }}>
                    {EXTERIOR_TYPES.map(e => {
                      const isActive = (marker.exteriorMaterial || opening.exteriorSurface) === e;
                      return (
                        <div 
                          key={e} 
                          onClick={() => {
                            updateLocalMarker({ exteriorMaterial: e, exteriorSurface: e } as any);
                            updateLocalOpening({ exteriorType: e, exteriorSurface: e });
                            setMeasureHelpMode('exterior');
                            setMeasureHelpOpen(true);
                          }}
                          style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.1s' }}
                          onPointerDown={(ev) => ev.currentTarget.style.transform = 'scale(0.95)'}
                          onPointerUp={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
                          onPointerLeave={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
                        >
                          {getExteriorSurfaceIcon(e, isActive)}
                          <div style={{ fontSize: '0.55rem', marginTop: '0.35rem', color: isActive ? '#3b82f6' : 'var(--text-secondary)', fontWeight: isActive ? 800 : 500, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                            {e}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </FieldGroup>
              </div>
            )}

            {!showOnlyMissing && (
              <div className="field-row" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <FieldGroup label="What touches the window?">
                  <select className="form-input" value={opening.whatTouchesWindow || ''} onChange={e => {
                    updateLocalOpening({ whatTouchesWindow: e.target.value });
                    updateLocalOpening({ pricingStatus: 'stale' });
                  }}>
                    <option value="">Select touching material...</option>
                    <option value="Siding">Siding</option>
                    <option value="Brick">Brick</option>
                    <option value="Wood">Wood</option>
                    <option value="Stucco">Stucco</option>
                    <option value="Trim">Trim</option>
                    <option value="Other">Other</option>
                  </select>
                </FieldGroup>
              </div>
            )}

            {!showOnlyMissing && (() => {
              const defaults = resolveMeasurementDefaultsForOpening(opening);
              return (
                <div className="field-row" style={{ marginTop: '0', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>Measurement Strategy</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {defaults.reason}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6875rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: 4, fontWeight: 600 }}>
                      Basis: {defaults.basis.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.6875rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: 4, fontWeight: 600 }}>
                      Trim: {defaults.includeTrim ? 'YES' : 'NO'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: 4, fontWeight: 600 }}>
                      Header: {defaults.includeHeaderFlashing ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {shouldShow('cutbackType') && ((marker.exteriorMaterial || opening.exteriorSurface || '').toLowerCase().includes('stucco')) && (
              <div className="field-row" style={{ marginTop: '0', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6 }}>
                <FieldGroup label="Stucco Cutback">
                  <div id="focus-CutbackType" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                    <VisualOptionPicker
                      options={CUTBACK_VISUAL_OPTIONS}
                      value={opening.cutbackType || 'Needs cutback selection'}
                      onChange={v => updateLocalOpening({ cutbackType: v })}
                      title="Stucco Cutback"
                      mode="inline"
                      error={!opening.cutbackType || opening.cutbackType === 'Needs cutback selection'}
                    />
                  </div>
                </FieldGroup>
              </div>
            )}

            {!showOnlyMissing && ['siding', 'wood'].some(v => (marker.exteriorMaterial || opening.exteriorSurface || '').toLowerCase().includes(v)) && (
              <div className="field-grid" style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 6 }}>
                <FieldGroup label="Trim">
                  <VisualOptionPicker
                    options={TRIM_VISUAL_OPTIONS}
                    value={opening.trimType || 'Vinyl trim'}
                    onChange={v => updateLocalOpening({ trimType: v })}
                    title="Trim Type"
                    mode="inline"
                  />
                </FieldGroup>
                <FieldGroup label="Header">
                  <VisualOptionPicker
                    options={HEADER_VISUAL_OPTIONS}
                    value={opening.headerType || 'New header'}
                    onChange={v => updateLocalOpening({ headerType: v })}
                    title="Header Type"
                    mode="inline"
                  />
                </FieldGroup>
              </div>
            )}

            {shouldShow('roomLocation') && (
              <div className="field-row">
                <FieldGroup label="Room / Location">
                  <input id="focus-RoomLocation" className="form-input" value={marker.roomLocation || ''} onChange={e => updateLocalMarker({ roomLocation: e.target.value })} placeholder="e.g. Living Room" style={{ borderColor: !marker.roomLocation ? '#ef4444' : '', minHeight: '44px', fontSize: '1rem' }} />
                </FieldGroup>
              </div>
            )}
          </>
        )}

        {/* ── Section 2: PRICE OPTIONS ── */}
        {isSectionVisible(2) && (
          <>
            <div className="section-title">2. Price Options</div>
            
            {shouldShow('glassPackage') && (
              <div className="field-row">
                <FieldGroup label="Glass Package" badge={defaultsResult.fieldStatus.glassPackage ? <DefaultBadge status={defaultsResult.fieldStatus.glassPackage} compact /> : undefined}>
                  <div id="focus-GlassPackage" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                    <VisualOptionPicker
                      options={GLASS_VISUAL_OPTIONS}
                      value={opening.glassPackage || WW_OPENING_DEFAULTS.glassPackage}
                      onChange={v => updateLocalOpening({ glassPackage: v })}
                      title="Glass Package"
                      mode="inline"
                    />
                  </div>
                </FieldGroup>
              </div>
            )}

            {shouldShow('gridStyle') && (
              <div className="field-row" style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
                <FieldGroup label="Grid Settings">
                  <div id="focus-GridPattern" style={{ marginTop: '0.5rem' }}>
                    <GridPatternPicker 
                      value={opening.gridPattern || opening.gridStyle || 'None'} 
                      profile={opening.gridProfile || ''}
                      vCount={opening.gridVerticalCount || 0}
                      hCount={opening.gridHorizontalCount || 0}
                      sdlSize={opening.sdlSize || ''}
                      exteriorColor={opening.exteriorColor}
                      seriesModel={opening.seriesModel}
                      onChange={(updates) => updateLocalOpening(updates)}
                    />
                  </div>
                </FieldGroup>
              </div>
            )}

            {hasGrid && !showOnlyMissing && (
              <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: '0.4rem' }}>
                <FieldGroup label="Placement">
                  <select className="form-input" value={opening.gridPlacement || 'full'} onChange={e => updateLocalOpening({ gridPlacement: e.target.value })}>
                    {GRID_PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </FieldGroup>
              </div>
            )}

            {!showOnlyMissing && (
              <div className="field-grid">
                <FieldGroup label="Screen" badge={defaultsResult.fieldStatus.screenOption ? <DefaultBadge status={defaultsResult.fieldStatus.screenOption} compact /> : undefined}>
                  <VisualOptionPicker
                    options={SCREEN_VISUAL_OPTIONS}
                    value={opening.screenOption || (isPicture ? 'No Screen' : 'Half Screen')}
                    onChange={v => updateLocalOpening({ screenOption: v })}
                    title="Screen Option"
                    mode="inline"
                  />
                </FieldGroup>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <CheckItem label="Foam Enhanced" checked={opening.foamEnhanced ?? false} onChange={v => updateLocalOpening({ foamEnhanced: v })} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Quick Add-ons Chips ── */}
        {!showOnlyMissing && (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="section-title">Quick Add-ons</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {/* Obscure Glass */}
              <button
                onClick={() => updateLocalOpening({ obscureGlass: (opening.obscureGlass === 'full' ? 'none' : 'full') })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.obscureGlass && opening.obscureGlass !== 'none' ? '#8b5cf6' : 'var(--border)'}`,
                  background: opening.obscureGlass && opening.obscureGlass !== 'none' ? 'rgba(139,92,246,0.12)' : 'transparent',
                  color: opening.obscureGlass && opening.obscureGlass !== 'none' ? '#8b5cf6' : 'var(--text-muted)',
                }}
              >
                {opening.obscureGlass && opening.obscureGlass !== 'none' ? '🔵 Obscure ✓' : 'Obscure'}
              </button>

              {/* Rain Obscure */}
              <button
                onClick={() => updateLocalOpening({ rainObscure: !opening.rainObscure })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.rainObscure ? '#06b6d4' : 'var(--border)'}`,
                  background: opening.rainObscure ? 'rgba(6,182,212,0.12)' : 'transparent',
                  color: opening.rainObscure ? '#06b6d4' : 'var(--text-muted)',
                }}
              >
                {opening.rainObscure ? '🌧️ Rain Obscure ✓' : '🌧️ Rain Obsc'}
              </button>

              {/* Tempered */}
              <button
                onClick={() => updateLocalOpening({ temperedGlass: (opening.temperedGlass === 'full' ? 'none' : 'full') })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.temperedGlass && opening.temperedGlass !== 'none' ? '#ef4444' : 'var(--border)'}`,
                  background: opening.temperedGlass && opening.temperedGlass !== 'none' ? 'rgba(239,68,68,0.12)' : 'transparent',
                  color: opening.temperedGlass && opening.temperedGlass !== 'none' ? '#ef4444' : 'var(--text-muted)',
                }}
              >
                {opening.temperedGlass && opening.temperedGlass !== 'none' ? '🛡️ Tempered ✓' : '🛡️ Tempered'}
              </button>

              {/* Special Shape Trim */}
              {(isSpecialShape || opening.specialShapeTrimRequired) && (
                <button
                  onClick={() => updateLocalOpening({ specialShapeTrimSelected: !opening.specialShapeTrimSelected })}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                    border: `1.5px solid ${opening.specialShapeTrimSelected ? '#f59e0b' : 'var(--border)'}`,
                    background: opening.specialShapeTrimSelected ? 'rgba(245,158,11,0.12)' : 'transparent',
                    color: opening.specialShapeTrimSelected ? '#f59e0b' : 'var(--text-muted)',
                  }}
                >
                  {opening.specialShapeTrimSelected ? '🔧 Shape Trim ✓' : '🔧 Shape Trim'}
                </button>
              )}

              {/* Tapcon */}
              <button
                onClick={() => updateLocalOpening({ tapcon: !opening.tapcon })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.tapcon ? '#64748b' : 'var(--border)'}`,
                  background: opening.tapcon ? 'rgba(100,116,139,0.12)' : 'transparent',
                  color: opening.tapcon ? '#64748b' : 'var(--text-muted)',
                }}
              >
                {opening.tapcon ? '🔩 Tapcon ✓' : '🔩 Tapcon'}
              </button>

              {/* Clear Story */}
              <button
                onClick={() => updateLocalOpening({ clearStory: !opening.clearStory })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.clearStory ? '#3b82f6' : 'var(--border)'}`,
                  background: opening.clearStory ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: opening.clearStory ? '#3b82f6' : 'var(--text-muted)',
                }}
              >
                {opening.clearStory ? '🏗️ Clear Story ✓' : '🏗️ Clear Story'}
              </button>

              {/* Mullion */}
              <button
                onClick={() => updateLocalOpening({ installMullion: !opening.installMullion })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.installMullion ? '#f59e0b' : 'var(--border)'}`,
                  background: opening.installMullion ? 'rgba(245,158,11,0.12)' : 'transparent',
                  color: opening.installMullion ? '#f59e0b' : 'var(--text-muted)',
                }}
              >
                {opening.installMullion ? '🔗 Mullion ✓' : '🔗 Mullion'}
              </button>

              {/* Structural Mullion (only show if mullion selected) */}
              {opening.installMullion && (
                <button
                  onClick={() => updateLocalOpening({ structuralMullion: !opening.structuralMullion })}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                    border: `1.5px solid ${opening.structuralMullion ? '#dc2626' : 'var(--border)'}`,
                    background: opening.structuralMullion ? 'rgba(220,38,38,0.12)' : 'transparent',
                    color: opening.structuralMullion ? '#dc2626' : 'var(--text-muted)',
                  }}
                >
                  {opening.structuralMullion ? '🏗️ Structural ✓' : '🏗️ Structural'}
                </button>
              )}

              {/* Nail Fin */}
              <button
                onClick={() => updateLocalOpening({ nailFin: !opening.nailFin })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.nailFin ? '#22c55e' : 'var(--border)'}`,
                  background: opening.nailFin ? 'rgba(34,197,94,0.12)' : 'transparent',
                  color: opening.nailFin ? '#22c55e' : 'var(--text-muted)',
                }}
              >
                {opening.nailFin ? '📌 Nail Fin ✓' : '📌 Nail Fin'}
              </button>

              {/* Sill Repair */}
              <button
                onClick={() => updateLocalOpening({ sillRepair: !opening.sillRepair })}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  border: `1.5px solid ${opening.sillRepair ? '#a855f7' : 'var(--border)'}`,
                  background: opening.sillRepair ? 'rgba(168,85,247,0.12)' : 'transparent',
                  color: opening.sillRepair ? '#a855f7' : 'var(--text-muted)',
                }}
              >
                {opening.sillRepair ? '🔨 Sill Repair ✓' : '🔨 Sill Repair'}
              </button>
            </div>

            {/* Grid pattern display */}
            {hasGrid && (opening.gridVerticalCount > 0 || opening.gridHorizontalCount > 0) && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontWeight: 600 }}>Grid:</span>
                <span style={{ padding: '0.15rem 0.5rem', borderRadius: 6, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontWeight: 700, fontSize: '0.7rem' }}>
                  {opening.gridVerticalCount || 0}V × {opening.gridHorizontalCount || 0}H
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {opening.gridProfile || ''} {(opening.gridPattern || opening.gridStyle || '').replace('None', '')}
                </span>
              </div>
            )}

            {/* UI display for special shapes */}
            {isSpecialShape && marker.width && marker.height && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>UI:</span>
                <span style={{ padding: '0.15rem 0.5rem', borderRadius: 6, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontWeight: 700, fontSize: '0.7rem' }}>
                  {ui} ({marker.width}"W + {marker.height}"H)
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Section 3: FULL DETAILS (Collapsible) ── */}
        {isSectionVisible(3) && (
          <>
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
              <button 
                onClick={() => setQuickPriceMode(!quickPriceMode)} 
                style={{ width: '100%', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'left', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', cursor: 'pointer' }}
                disabled={showOnlyMissing}
              >
                <span>3. Full Details {(!quickPriceMode || showOnlyMissing) ? '' : '(Hidden)'}</span>
                {!showOnlyMissing && <span>{quickPriceMode ? '▶ Show' : '▼ Hide'}</span>}
              </button>
            </div>

            {(!quickPriceMode || showOnlyMissing) && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="field-grid">
                  {shouldShow('elevation') && (
                    <FieldGroup label="Elevation">
                      <select id="focus-Elevation" className="form-input" value={marker.elevation || 'main'} onChange={e => updateLocalMarker({ elevation: e.target.value })}>
                        {ELEVATIONS.map(e => <option key={e} value={e}>{e === 'main' ? 'Main Sketch' : e === 'second_story' ? 'Second Story' : 'Details / Other'}</option>)}
                      </select>
                    </FieldGroup>
                  )}
                  {!showOnlyMissing && (
                    <FieldGroup label="Floor">
                      <select className="form-input" value={marker.floorNumber || 1} onChange={e => updateLocalMarker({ floorNumber: parseInt(e.target.value) })}>
                        <option value={1}>1st Floor</option><option value={2}>2nd Floor</option><option value={3}>3rd Floor</option>
                      </select>
                    </FieldGroup>
                  )}
                </div>
                
                <div className="field-grid">
                  {shouldShow('interiorColor') && (
                    <FieldGroup label="Interior Color" badge={defaultsResult.fieldStatus.interiorColor ? <DefaultBadge status={defaultsResult.fieldStatus.interiorColor} compact /> : undefined}>
                      <div id="focus-InteriorColor" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                        <VisualOptionPicker
                          options={INTERIOR_COLOR_OPTIONS}
                          value={opening.interiorColor || 'White'}
                          onChange={v => updateLocalOpening({ interiorColor: v })}
                          title="Interior Color"
                          mode="inline"
                        />
                      </div>
                    </FieldGroup>
                  )}
                  {shouldShow('exteriorColor') && (
                    <FieldGroup label="Exterior Color" badge={defaultsResult.fieldStatus.exteriorColor ? <DefaultBadge status={defaultsResult.fieldStatus.exteriorColor} compact /> : undefined}>
                      <div id="focus-ExteriorColor" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                        <VisualOptionPicker
                          options={EXTERIOR_COLOR_OPTIONS}
                          value={opening.exteriorColor || 'White'}
                          onChange={v => updateLocalOpening({ exteriorColor: v })}
                          title="Exterior Color"
                          mode="inline"
                        />
                      </div>
                    </FieldGroup>
                  )}
                </div>

                {(shouldShow('temperedGlass') || !showOnlyMissing) && (
                  <div id="focus-TemperedGlass" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.5rem 0', outline: 'none', borderRadius: 8, padding: '2px' }}>
                    <CheckItem label="Tempered Full" checked={opening.temperedGlass === 'full'} onChange={v => updateLocalOpening({ temperedGlass: v ? 'full' : 'none' })} />
                    <CheckItem label="Tempered Half" checked={opening.temperedGlass === 'half'} onChange={v => updateLocalOpening({ temperedGlass: v ? 'half' : (opening.temperedGlass === 'full' ? 'full' : 'none') })} />
                    {!showOnlyMissing && (
                      <>
                        <CheckItem label="Nail Fin" checked={opening.nailFin ?? false} onChange={v => updateLocalOpening({ nailFin: v })} />
                        <CheckItem label="Obscure Glass" checked={opening.obscureGlass === 'full'} onChange={v => updateLocalOpening({ obscureGlass: v ? 'full' : 'none' })} />
                      </>
                    )}
                  </div>
                )}

                {!showOnlyMissing && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>Add-ons & Repairs</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <CheckItem label="Repair Sill / Jamb" checked={opening.sillRepair ?? false} onChange={v => updateLocalOpening({ sillRepair: v })} />
                      <CheckItem label="Remove Storm Window" checked={opening.removeStormWindow ?? false} onChange={v => updateLocalOpening({ removeStormWindow: v })} />
                      <CheckItem label="Install Mullion" checked={opening.installMullion ?? false} onChange={v => updateLocalOpening({ installMullion: v })} />
                      <CheckItem label="Structural Mullion" checked={opening.structuralMullion ?? false} onChange={v => updateLocalOpening({ structuralMullion: v })} />
                      <CheckItem label="J-Channel" checked={opening.jChannel ?? false} onChange={v => updateLocalOpening({ jChannel: v })} />
                    </div>
                  </div>
                )}

                {isOriel && (shouldShow('orielUpperSashHeight') || shouldShow('orielMeasurementBasis') || !showOnlyMissing) && (
                  <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.4rem' }}>Oriel Specs</div>
                    <div className="field-grid">
                      {(shouldShow('orielUpperSashHeight') || !showOnlyMissing) && (
                        <FieldGroup label="Upper Sash (in)">
                          <FractionTextInput id="focus-UpperSashHeight" className="form-input" value={marker.orielUpperSashHeight} onChange={val => { updateLocalMarker({ orielUpperSashHeight: val || undefined }); updateLocalOpening({ orielUpperSashHeight: val || undefined }); }} style={{ borderColor: !marker.orielUpperSashHeight ? '#ef4444' : '' }} />
                        </FieldGroup>
                      )}
                      {(shouldShow('orielMeasurementBasis') || !showOnlyMissing) && (
                        <FieldGroup label="Measurement Basis">
                          <select id="focus-OrielMeasurementBasis" className="form-input" value={marker.orielMeasurementBasis || ''} onChange={e => { updateLocalMarker({ orielMeasurementBasis: e.target.value }); updateLocalOpening({ orielMeasurementBasis: e.target.value }); }} style={{ borderColor: !marker.orielMeasurementBasis ? '#ef4444' : '' }}>
                            <option value="">Select...</option><option value="Top glass to top meeting rail">BTR Default</option><option value="Bottom window to meeting rail">Wincore Default</option>
                          </select>
                        </FieldGroup>
                      )}
                    </div>
                    {!showOnlyMissing && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={opening.orielConfirmed || false} onChange={e => updateLocalOpening({ orielConfirmed: e.target.checked })} />
                        <label style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>Top Sash Measurement Confirmed</label>
                      </div>
                    )}
                  </div>
                )}

                {isSpecialShape && (shouldShow('shapeType') || !showOnlyMissing) && (
                  <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: 6, border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '0.4rem' }}>Shape Specs</div>
                    <div id="focus-ShapeType" style={{ marginBottom: '0.5rem' }}>
                      <SpecialtyShapePicker 
                        value={marker.shapeType || null} 
                        onChange={shape => updateLocalMarker({ shapeType: shape })} 
                        error={!marker.shapeType}
                      />
                    </div>

                    {/* Radius / Rise and Leg Height inputs */}
                    <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <FieldGroup label="Radius / Rise (in)">
                        <FractionTextInput 
                          value={marker.radius} 
                          onChange={val => {
                            updateLocalMarker({ radius: val || undefined });
                            updateLocalOpening({ radius: val || undefined });
                          }}
                        />
                      </FieldGroup>
                      <FieldGroup label="Leg Height (in)">
                        <FractionTextInput 
                          value={marker.legHeight} 
                          onChange={val => {
                            updateLocalMarker({ legHeight: val || undefined });
                            updateLocalOpening({ legHeight: val || undefined });
                          }}
                        />
                      </FieldGroup>
                    </div>

                    {/* Live UI Calculation */}
                    {marker.width && marker.height ? (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#c4b5fd', fontWeight: 600 }}>
                        UI: {Math.round((marker.width || 0) + (marker.height || 0))} ({marker.width}"W + {marker.height}"H)
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 4, color: '#fca5a5', fontSize: '0.75rem' }}>
                        ⚠️ Blocker: Width and Height are required to calculate special shape pricing.
                      </div>
                    )}

                    {/* Blocker for shapeType */}
                    {!marker.shapeType && (
                      <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 4, color: '#fca5a5', fontSize: '0.75rem' }}>
                        ⚠️ Blocker: Please select a specialty shape type.
                      </div>
                    )}

                    {/* Estimation Card */}
                    {estPricing && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Estimated Pricing (BTR Guidelines)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Base Price:</span>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>${estPricing.basePrice.toFixed(2)}</span>
                        </div>
                        {estPricing.overMaxAdder > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#fca5a5' }}>
                            <span>Over-Max Dim Adder (over 84" or max UI):</span>
                            <span style={{ fontWeight: 600 }}>+${estPricing.overMaxAdder.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Trim Price:</span>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>${estPricing.trimPrice.toFixed(2)}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#c4b5fd',
                          borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                          paddingTop: '0.4rem',
                          marginTop: '0.2rem'
                        }}>
                          <span>Total Est. Opening Cost:</span>
                          <span>${estPricing.total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {shouldShow('removalType') && (
                  <div className="field-row" style={{ marginBottom: '0.75rem' }}>
                    <FieldGroup label="Type Removed">
                      <div id="focus-RemovalType" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                        <VisualOptionPicker
                          options={REMOVAL_TYPE_OPTIONS}
                          value={marker.removalType || WW_OPENING_DEFAULTS.removalType}
                          onChange={v => { updateLocalMarker({ removalType: v }); updateLocalOpening({ removalType: v }); }}
                          title="Type Removed"
                          mode="bottomSheet"
                          placeholder="Select removal type..."
                          changeLabel="Change"
                        />
                      </div>
                    </FieldGroup>
                  </div>
                )}

                {!showOnlyMissing && (
                  <>
                    <div className="field-row">
                      <FieldGroup label="Type Install">
                        <div id="focus-InstallType" tabIndex={-1} style={{ outline: 'none', borderRadius: 8 }}>
                          <VisualOptionPicker
                            options={INSTALL_TYPE_OPTIONS}
                            value={marker.installType || opening.installType || ''}
                            onChange={v => { updateLocalMarker({ installType: v }); updateLocalOpening({ installType: v }); }}
                            title="Type Install"
                            mode="bottomSheet"
                            placeholder="Select install type..."
                            changeLabel="Change"
                          />
                        </div>
                      </FieldGroup>
                    </div>
                    
                    <div className="field-row">
                      <FieldGroup label="Installer Notes">
                        <textarea className="form-input" rows={2} value={opening.installerNotes || ''} onChange={e => updateLocalOpening({ installerNotes: e.target.value })} />
                      </FieldGroup>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
        <div style={{ height: 40 }} />
      </div>
      )}

      {/* Footer Actions */}
      <div style={{
        padding: '0.5rem',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-secondary" onClick={handleCancel} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto', flex: !hasPhoto && !NON_OPENING_MARKERS.includes(marker.markerSymbol) ? '1 1 auto' : '0 0 auto' }}>
            Close
          </button>
          
          {(hasPhoto || NON_OPENING_MARKERS.includes(marker.markerSymbol)) && (
            <button className={`btn ${isPriceReady ? 'btn-primary' : 'btn-danger'}`} onClick={handleSave} style={{ flex: '1 1 auto', justifyContent: 'center', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto', display: 'flex', alignItems: 'center' }}>
              {isPriceReady ? 'Done' : 'Close (Missing Fields)'}
            </button>
          )}
        </div>

        {(hasPhoto || NON_OPENING_MARKERS.includes(marker.markerSymbol)) && (onDuplicate || quickPriceMode) && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {onDuplicate && (
              <button className="btn btn-secondary" onClick={handleSaveAndAddAnother} style={{ flex: '1 1 auto', justifyContent: 'center', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', borderColor: 'rgba(14, 165, 233, 0.2)', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto', display: 'flex', alignItems: 'center' }}>
                Save & Add Similar
              </button>
            )}
            
            {quickPriceMode && (
              <button className="btn btn-secondary" onClick={() => setQuickPriceMode(false)} style={{ flex: '1 1 auto', justifyContent: 'center', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto', display: 'flex', alignItems: 'center' }}>
                Complete Details
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ctrl+F12 Diagnostics Panel */}
      {showDiagnostics && (
        <div style={{ padding: '1rem', background: 'var(--bg)', color: 'var(--text)', borderTop: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)' }}>🛠️ Resolver Output Diagnostics</h4>
          <pre style={{ margin: 0 }}>{JSON.stringify(defaultsResult, null, 2)}</pre>
        </div>
      )}

      {measureHelpOpen && (
        <MeasureHelpModal
          isOpen={measureHelpOpen}
          onClose={() => setMeasureHelpOpen(false)}
          opening={opening}
          appointment={appointment}
          onSave={(updates) => {
            updateLocalOpening(updates);
            if (updates.width || updates.height) {
              updateLocalMarker({
                width: updates.width ?? marker.width,
                height: updates.height ?? marker.height,
              } as any);
            }
          }}
          initialMode={measureHelpMode}
        />
      )}
    </div>
  );
}

function FieldGroup({ label, children, badge }: { label: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {badge}
      </label>
      {children}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', minHeight: 36 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--blue)' }} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  );
}
