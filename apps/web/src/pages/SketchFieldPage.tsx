// ═══════════════════════════════════════════════════════════════
// Sketch Canvas — Immersive Full-Screen Drawing Experience
// Responsive, DPI-aware, touch-optimized, orientation-safe
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from '../components/Toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SketchSymbolToolbar, getMarkerSymbolFromTool } from '../components/SketchSymbolToolbar';
import type { SketchTool } from '../components/SketchSymbolToolbar';
import { drawMarkerOnCanvas, drawGroupConnector, hitTestMarker } from '../components/SketchMarkerRenderer';
import { MarkerDetailSheet } from '../components/MarkerDetailSheet';
import { JoinMullWorkflow } from '../components/JoinMullWorkflow';
import { createMarkerData, createOpeningFromMarker, validateSketchSync, calcUnitedInches, NON_OPENING_MARKERS, getNextMarkerNumber, compactRenumberMarkers } from '../utils/sketchSync';
import type { SketchMarkerData, MarkerGroupData, MarkerSymbol } from '../utils/sketchSync';
import { getFieldSketchLayoutConfig } from '../utils/sketchMarkerLayout';
import { enqueueOutboxItem, getCachedAppointment } from '../lib/syncEngine';
import { cacheSketch, getCachedSketch } from '../lib/offlineDb';
import { SKETCH_PRESETS, applyPresetToOpening } from '../utils/sketchPresets';
import type { SketchPreset } from '../utils/sketchPresets';
import { UpdateBanner } from '../components/UpdateBanner';
import { generateInstallExport, formatInstallExportText } from '../utils/installExport';
import { api } from '../utils/api';
import { useProjectValidation } from '../hooks/useProjectValidation';
import { ValidationPanel, ValidationBadge } from '../components/ValidationPanel';
import { PhotoRecommendationPanel } from '../components/PhotoRecommendationPanel';
import { useSaveGuard, useUnsavedChangesGuard, SaveStateIndicator } from '../utils/productionGuards';
import { getPhotoForMarker } from '../utils/photoRecommendationEngine';
import { ARMeasurementOverlay } from '../components/ARMeasurementOverlay';
import { VoiceAssistantFAB } from '../components/VoiceAssistantFAB';
import { voiceEvents, type ParsedVoiceCommand } from '../utils/voiceEngine';
import { LiveEstimateWidget } from '../components/LiveEstimateWidget';
import { AddressVisualsPanel } from '../components/AddressVisualsPanel';
import { validateOpening, validateOpeningWithStage } from '../utils/openingValidation';
import { resolveOpeningDefaults } from '../utils/openingDefaults';
import { useSmartCheck } from '../hooks/useSmartCheck';
import { QuoteGroupsPanel } from '../components/QuoteGroupsPanel';
import { CombinedQuoteBuilder } from '../components/CombinedQuoteBuilder';
import { getPointerIntent, isInteractiveElement, isPenPointer } from '../utils/surfacePenInput';
import { SketchAnnotation, createAnnotation, drawAnnotation, drawLeaderLine, hitTestAnnotations, findNearestMarker } from '../components/SketchNoteBubble';

// Validate opening with smart defaults applied — fields that would be auto-filled
// count as "filled" so the validation status accurately reflects field completeness.
function validateWithDefaults(opening: any, allOpenings: any[], isBrick: boolean) {
  return validateOpeningWithStage(opening, allOpenings, isBrick, 'save_item');
}

function getSqDist(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function getSqSegDist(p: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(
  points: { x: number; y: number }[],
  first: number,
  last: number,
  sqTolerance: number,
  simplified: { x: number; y: number }[]
) {
  let maxSqDist = sqTolerance;
  let index = -1;

  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

export function simplifyRDP(points: { x: number; y: number }[], tolerance: number) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const first = 0;
  const last = points.length - 1;
  const simplified = [points[first]];
  simplifyDPStep(points, first, last, sqTolerance, simplified);
  simplified.push(points[last]);
  return simplified;
}

export function snapAngle(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 2) return { ...p2 };

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normAngle = (angle + 360) % 360;

  const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  let closestAngle = 0;
  let minDiff = 360;
  for (const a of snapAngles) {
    const diff = Math.abs(normAngle - a);
    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = a % 360;
    }
  }

  if (minDiff < 15) {
    const rad = closestAngle * Math.PI / 180;
    return {
      x: p1.x + distance * Math.cos(rad),
      y: p1.y + distance * Math.sin(rad)
    };
  }
  return { ...p2 };
}

const ELEVATIONS = ['1st_story', '2nd_story'] as const;

export function normalizeElevation(raw: string | undefined | null): string {
  if (!raw) return '1st_story';
  const val = raw.toLowerCase();
  if (val === '1st_story' || val === '2nd_story') return val;
  if (val === 'second_story' || val === '2nd') return '2nd_story';
  return '1st_story';
}

// Logical (CSS) canvas dimensions — actual pixel size is multiplied by DPR
const LOGICAL_W = 800;
const LOGICAL_H = 500;

export default function SketchFieldPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false; 
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const [elevation, setElevation] = useState<string>('1st_story');
  const [tool, setTool] = useState<SketchTool>('select'); // default to select mode per user guidelines
  const [sketchSourceMode, setSketchSourceMode] = useState<string>('blank_canvas');
  const [mapOutlineEnabled, setMapOutlineEnabled] = useState<boolean>(false);
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState<boolean>(true);
  const [exportBackgroundEnabled, setExportBackgroundEnabled] = useState<boolean>(false);
  const [useBlackInstallerLines, setUseBlackInstallerLines] = useState<boolean>(true);
  const [markers, setMarkers] = useState<SketchMarkerData[]>([]);
  const [groups, setGroups] = useState<MarkerGroupData[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState(false);
  const [joinSelected, setJoinSelected] = useState<string[]>([]);
  const [quoteGroupMode, setQuoteGroupMode] = useState(false);
  const [quoteGroupSelected, setQuoteGroupSelected] = useState<string[]>([]);
  const [showQuoteGroupsPanel, setShowQuoteGroupsPanel] = useState(false);
  const [showCombinedQuoteBuilder, setShowCombinedQuoteBuilder] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth] = useState(2);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [appointment, setAppointment] = useState<any>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [showPanels, setShowPanels] = useState(false);
  const [transform, setTransform] = useState({ panX: 0, panY: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [jumpTargetField, setJumpTargetField] = useState<string | null>(null);

  // Hardened Sketch Outlines & Freehand Vectors
  const [outlineSegments, setOutlineSegments] = useState<any[]>([]);
  const [outlineConfirmed, setOutlineConfirmed] = useState<boolean>(false);
  const [activeLinePoints, setActiveLinePoints] = useState<{ x: number, y: number }[]>([]);
  const [freehandStrokes, setFreehandStrokes] = useState<any[]>([]);
  const [mapOpacity, setMapOpacity] = useState<number>(0.9);
  const [mapLocked, setMapLocked] = useState<boolean>(true);
  const [lastPointerEvent, setLastPointerEvent] = useState<string>('');
  const [previewCursor, setPreviewCursor] = useState<{ x: number, y: number } | null>(null);
  const [straightenedPreview, setStraightenedPreview] = useState<{ x: number, y: number }[][] | null>(null);
  const [mapPan, setMapPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [mapZoomOffset, setMapZoomOffset] = useState<number>(1.0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // ── Sketch Note Annotations ──
  const [annotations, setAnnotations] = useState<SketchAnnotation[]>([]);
  const [notePlacementMode, setNotePlacementMode] = useState(false);
  const [textPlacementMode, setTextPlacementMode] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [resizingAnnotation, setResizingAnnotation] = useState<{ id: string; handle: string; startX: number; startY: number; startW: number; startH: number; startNX: number; startNY: number } | null>(null);

  // Field Intelligence QA
  const { report: smartCheckReport, loading: smartCheckLoading, runCheck: runSmartCheck, handleFindingResolved } = useSmartCheck(appointmentId, {
    customer: appointment?.customer,
    openings,
    markers,
    stage: 'full_details',
  });
  const [showPhotoPanel, setShowPhotoPanel] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [markerHasPhoto, setMarkerHasPhoto] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMarkerId) {
      import('../utils/photoRecommendationEngine').then(({ getPhotoForMarker }) => {
        getPhotoForMarker(selectedMarkerId).then((res: any) => setMarkerHasPhoto(!!res));
      });
    } else {
      setMarkerHasPhoto(false);
    }
  }, [selectedMarkerId, showPhotoPanel]);

  // Surface Pen Settings State
  const [penSettings, setPenSettings] = useState({
    enableDoubleTap: true,
    enableEraser: true,
    enableShortcuts: true,
    enableFingerDrawing: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  });

  const isFingerDrawingEnabled = penSettings.enableFingerDrawing;

  useEffect(() => {
    const saved = localStorage.getItem('wwa_surface_pen_settings');
    if (saved) {
      try { setPenSettings(JSON.parse(saved)); } catch (e) { console.debug("[swallowed error]", e); }
    }
  }, []);

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

  // Eraser UI state tracking (separate from tool state so UI can revert)
  const [isHardwareErasing, setIsHardwareErasing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isGeneratingElevation, setIsGeneratingElevation] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [apptLoaded, setApptLoaded] = useState(false);
  // true once the server sketch markers have been loaded — gates orphan-deletion logic
  const [sketchMarkersLoaded, setSketchMarkersLoaded] = useState(false);
  const [qqJustLoaded, setQqJustLoaded] = useState(false);
  const [sketchId, setSketchId] = useState<string | null>(null);
  const [canvasBgUrl, setCanvasBgUrl] = useState(''); // satellite aerial URL used as canvas CSS background
  const [fullScreenFocus, setFullScreenFocus] = useState(false);


  // ── Coordinate Transform Helpers ──
  const getTransformParams = (canvasOverride?: HTMLCanvasElement | null) => {
    const canvas = canvasOverride || canvasRef.current;
    if (!canvas) return { unit: 1, offsetX: 0, offsetY: 0, cw: 1, ch: 1, planeSize: 1 };
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    // We define our sketch plane as a 100x100 square that fits centered within the canvas at zoom=1
    const planeSize = Math.min(cw, ch);
    const unit = planeSize / 100;
    const offsetX = (cw - planeSize) / 2 + transform.panX;
    const offsetY = (ch - planeSize) / 2 + transform.panY;
    return { unit, offsetX, offsetY, cw, ch, planeSize };
  };

  const toLogical = (px: number, py: number, canvasOverride?: HTMLCanvasElement | null) => {
    const { unit, offsetX, offsetY } = getTransformParams(canvasOverride);
    return {
      x: (px - offsetX) / (unit * transform.zoom),
      y: (py - offsetY) / (unit * transform.zoom)
    };
  };

  const toScreen = (lx: number, ly: number, canvasOverride?: HTMLCanvasElement | null) => {
    const { unit, offsetX, offsetY } = getTransformParams(canvasOverride);
    return {
      x: lx * unit * transform.zoom + offsetX,
      y: ly * unit * transform.zoom + offsetY
    };
  };

  const fitAll = () => {
    const elevMarkers = markers.filter(m => (m.elevation || '1st_story') === elevation);
    
    // Always consider the house footprint (0-100) as part of the bounds
    let minX = 0, maxX = 100, minY = 0, maxY = 100;
    
    // Add valid markers to bounds, ignoring extreme outliers
    elevMarkers.forEach(m => {
      // Ignore extreme stray markers that would force a microscopic zoom
      if (m.x < -500 || m.x > 600 || m.y < -500 || m.y > 600) return;
      if (m.x < minX) minX = m.x;
      if (m.x > maxX) maxX = m.x;
      if (m.y < minY) minY = m.y;
      if (m.y > maxY) maxY = m.y;
    });
    
    // Add logical padding to account for marker sizes overlapping the edge
    minX -= 10;
    maxX += 10;
    minY -= 10;
    maxY += 10;
    
    const w = maxX - minX;
    const h = maxY - minY;
    
    const { cw, ch, planeSize } = getTransformParams();
    
    // target zoom to fit w/h into viewport
    const zoomX = 100 / w;
    const zoomY = 100 / h;
    const zoom = Math.max(0.5, Math.min(zoomX, zoomY, 4)); // allow more zoom for big outlines
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    const unit = planeSize / 100;
    const panX = cw / 2 - (cx * unit * zoom + (cw - planeSize) / 2);
    const panY = ch / 2 - (cy * unit * zoom + (ch - planeSize) / 2);
    
    setTransform({ panX, panY, zoom });
  };

  const autoArrange = () => {
    if (!window.confirm('Arrange openings evenly on this elevation?')) return;
    const elevMarkers = markers.filter(m => (m.elevation || '1st_story') === elevation);
    const doors = elevMarkers.filter(m => m.markerSymbol.includes('door'));
    const windows = elevMarkers.filter(m => !m.markerSymbol.includes('door') && !NON_OPENING_MARKERS.includes(m.markerSymbol));
    
    windows.sort((a, b) => a.x - b.x);
    
    const newMarkers = [...markers];
    
    doors.forEach((d, i) => {
      const idx = newMarkers.findIndex(m => m.id === d.id);
      if (idx >= 0) {
        newMarkers[idx] = { ...d, x: 50 + (i - (doors.length - 1)/2) * 15, y: 80 };
      }
    });
    
    if (windows.length > 0) {
      // Split into two rows if dense
      const rows = windows.length > 6 ? 2 : 1;
      const wPerRow = Math.ceil(windows.length / rows);
      
      windows.forEach((w, i) => {
        const row = Math.floor(i / wPerRow);
        const col = i % wPerRow;
        const totalInRow = Math.min(wPerRow, windows.length - row * wPerRow);
        
        const spacing = Math.min(25, 80 / totalInRow);
        const startX = 50 - (totalInRow - 1) * spacing / 2;
        const yPos = rows === 1 ? 40 : (row === 0 ? 30 : 55);
        
        const idx = newMarkers.findIndex(m => m.id === w.id);
        if (idx >= 0) {
          newMarkers[idx] = { ...w, x: startX + col * spacing, y: yPos };
        }
      });
    }
    
    setMarkers(newMarkers);
    setTimeout(fitAll, 50); // delay to let state apply before fitAll calculation
  };

  const autoRenumberWindows = useCallback(() => {
    if (!window.confirm('Auto-assign numbers 1, 2, 3... starting from the front/bottom going counter-clockwise?')) return;
    const openingMarkers = markers.filter(m => m.markerNumber != null);
    if (openingMarkers.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const m of openingMarkers) {
      if (m.x < minX) minX = m.x;
      if (m.x > maxX) maxX = m.x;
      if (m.y < minY) minY = m.y;
      if (m.y > maxY) maxY = m.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const sorted = [...openingMarkers].sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      
      const getSortValue = (ang: number) => {
        let val = -ang - (-Math.PI/2);
        if (val < 0) val += 2 * Math.PI;
        return val;
      };
      
      return getSortValue(angleA) - getSortValue(angleB);
    });

    setMarkers(prev => {
      const next = [...prev];
      let counter = 1;
      const idToNewNumber = new Map<string, number>();
      
      for (const sm of sorted) {
        idToNewNumber.set(sm.id, counter++);
      }
      
      for (let i = 0; i < next.length; i++) {
        if (idToNewNumber.has(next[i].id)) {
          next[i] = { ...next[i], markerNumber: idToNewNumber.get(next[i].id)! };
        }
      }
      return next;
    });

    setOpenings(prev => {
      const next = [...prev];
      const oldToNew = new Map<number, number>();
      let counter = 1;
      for (const sm of sorted) {
        if (sm.markerNumber != null) {
          oldToNew.set(sm.markerNumber, counter);
        }
        counter++;
      }
      
      for (let i = 0; i < next.length; i++) {
        if (oldToNew.has(next[i].openingNumber)) {
          next[i] = { ...next[i], openingNumber: oldToNew.get(next[i].openingNumber)! };
        }
      }
      next.sort((a, b) => a.openingNumber - b.openingNumber);
      return next;
    });
    
    toast.success('Windows renumbered counter-clockwise!');
  }, [markers]);

  // ── Background Map Image State ──
  const [bgMapData, setBgMapData] = useState<{ url: string, w: number, h: number, rotationDegrees?: number } | null>(null);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!appointmentId) return;
    try {
      const saved = localStorage.getItem(`sketch_canvas_${appointmentId}_${elevation}_bgMap`);
      if (saved && saved !== 'data:,') {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.url) {
          setBgMapData(parsed);
        }
      }
    } catch (e) { console.debug("[swallowed error]", e); }
  }, [appointmentId, elevation]);

  useEffect(() => {
    if (bgMapData?.url) {
      const img = new Image();
      img.onload = () => setBgImageObj(img);
      img.src = bgMapData.url;
    } else {
      setBgImageObj(null);
    }
  }, [bgMapData]);

  // ── Elevation Defaults (auto-fill new items per elevation) ──
  const [elevationDefaults, setElevationDefaults] = useState<Record<string, Record<string, any>>>({});

  // Guard against duplicate auto-generation of markers from DB openings
  const autoGenDone = useRef(false);
  
  // ── Guards ──
  const { saveState, lastSaved, errorMsg, guardedSave, retry } = useSaveGuard();
  const [hasUnsaved, setHasUnsaved] = useState(false);
  useUnsavedChangesGuard(hasUnsaved, 'You have unsaved sketch changes. Are you sure you want to leave?');

  // House Outline Map
  const [showOutlinePanel, setShowOutlinePanel] = useState(() => {
    const stored = localStorage.getItem(`sketch_canvas_${appointmentId}_1st_story_bgMap`);
    return !stored;
  });
  const [outlineExpanded, setOutlineExpanded] = useState(window.innerWidth >= 1024);

  // Auto-collapse toolbar in landscape mobile to maximize canvas
  useEffect(() => {
    const checkLandscape = () => {
      const isLandscapeMobile = window.innerHeight < 500 && window.innerWidth > window.innerHeight;
      setToolbarCollapsed(isLandscapeMobile);
    };
    checkLandscape();
    window.addEventListener('resize', checkLandscape);
    return () => window.removeEventListener('resize', checkLandscape);
  }, []);

  // ── Smart Elevation Recognition ──
  const handleSmartElevation = async () => {
    if (markers.length > 0 && !window.confirm('This will add AI-generated openings to your existing sketch. Continue?')) return;
    setIsGeneratingElevation(true);
    setShowPanels(false);
    try {
      const { runPropertyIntelligence } = await import('../utils/propertyIntelligence');
      const address = appointment?.jobAddress || appointment?.customer?.address || '123 Smart St, Baton Rouge, LA';
      const intel = await runPropertyIntelligence(address);
      
      if (intel.draftOpenings && intel.draftOpenings.length > 0) {
        const newMarkers: SketchMarkerData[] = [];
        const newOpenings: any[] = [];
        
        intel.draftOpenings.forEach((draftObj: any, index: number) => {
          // Distribute positions slightly so they don't stack
          const cx = 50 + (index * 5 % 30) - 15;
          const cy = 50 + (Math.floor(index / 5) * 5 % 20) - 10;
          
          const baseMarker = createMarkerData(
            `sketch_${appointmentId}`,
            draftObj.markerSymbol,
            cx,
            cy,
            draftObj.elevation,
            [...markers, ...newMarkers]
          );
          
          const marker: SketchMarkerData = {
            ...baseMarker,
            id: draftObj.id,
            markerLabel: 'AI',
            width: draftObj.estWidth,
            height: draftObj.estHeight,
            validationStatus: validateWithDefaults(draftObj, openings, appointment?.houseSpecs?.isBrick || false).status === 'complete' || validateWithDefaults(draftObj, openings, appointment?.houseSpecs?.isBrick || false).status === 'ready' ? 'complete' : 'incomplete',
            notes: draftObj.needsVerification ? 'Generated by AI — verify manually.' : '',
          };
          
          newMarkers.push(marker);
          
          if (!NON_OPENING_MARKERS.includes(marker.markerSymbol)) {
            newOpenings.push(createOpeningFromMarker(marker, appointmentId || ''));
          }
        });
        
        setMarkers(prev => [...prev, ...newMarkers]);
        setOpenings(prev => {
          const existingIds = new Set(prev.map(o => o.markerId));
          const uniqueNew = newOpenings.filter(o => !existingIds.has(o.markerId));
          return [...prev, ...uniqueNew];
        });
        
        toast.success(`Smart Elevation: Auto-grouped ${intel.draftOpenings.length} items by elevation`);
      }
    } catch (err) {
      toast.error('Failed to run Smart Elevation');
    } finally {
      setIsGeneratingElevation(false);
    }
  };

  // ── Centralized Validation ──
  const validation = useProjectValidation(openings, markers, groups, appointment);

  // ── Voice Assistant Handler ──
  useEffect(() => {
    const handleVoiceCommand = (cmd: ParsedVoiceCommand) => {
      switch (cmd.intent) {
        case 'add_opening': {
          const typeMap: Record<string, MarkerSymbol> = {
            'double_hung': 'dh', 'single_hung': 'sh', 'slider': 'slider',
            'front_door': 'front_door', 'patio_door': 'patio_door'
          };
          const sym = typeMap[cmd.payload.type] || 'dh';
          const newMarker = createMarkerData(`sketch_${appointmentId}`, sym, 50, 50, elevation, markers);
          if (cmd.payload.width) newMarker.width = cmd.payload.width;
          if (cmd.payload.height) newMarker.height = cmd.payload.height;
          
          setMarkers(prev => [...prev, newMarker]);
          setOpenings(prev => [...prev, createOpeningFromMarker(newMarker, appointmentId || '')]);
          setSelectedMarkerId(newMarker.id);
          toast.success(`Voice: Added ${cmd.payload.width ? cmd.payload.width+'x'+cmd.payload.height : ''} ${cmd.payload.type.replace('_', ' ')}`);
          break;
        }
        case 'mark_tempered':
        case 'mark_obscure': {
          if (!selectedMarkerId) {
            toast.error('Please select an opening first');
            return;
          }
          setOpenings(prev => prev.map(o => {
            if (o.markerId !== selectedMarkerId) return o;
            const key = cmd.intent === 'mark_tempered' ? 'tempered' : 'obscure';
            toast.success(`Voice: Marked as ${key}`);
            return { ...o, [key]: true };
          }));
          break;
        }
        case 'add_siding': {
          const elev = cmd.payload.elevation !== 'unknown' ? cmd.payload.elevation : elevation;
          const newMarker = createMarkerData(`sketch_${appointmentId}`, 'siding', 50, 50, elev, markers);
          setMarkers(prev => [...prev, newMarker]);
          toast.success(`Voice: Added siding zone to ${elev} elevation`);
          break;
        }
        case 'duplicate_opening': {
          if (!selectedMarkerId) {
            toast.error('Please select an opening to duplicate');
            return;
          }
          const sel = markers.find(m => m.id === selectedMarkerId);
          if (sel) {
            const newMarkerNumber = getNextMarkerNumber(markers);
            const newMarker = { ...sel, id: 'm_' + Math.random().toString(36).substr(2, 9), markerNumber: newMarkerNumber, x: sel.x + 20, y: sel.y + 20 };
            setMarkers(prev => [...prev, newMarker as SketchMarkerData]);
            if (!NON_OPENING_MARKERS.includes(sel.markerSymbol)) {
              setOpenings(prev => [...prev, createOpeningFromMarker(newMarker as SketchMarkerData, appointmentId || '')]);
            }
            setSelectedMarkerId(newMarker.id);
            toast.success('Voice: Duplicated opening');
          }
          break;
        }
        case 'generate_proposal': {
          toast.success('Voice: Generating proposal...');
          navigate(`/appointments/${appointmentId}`);
          break;
        }
      }
    };
    const unsubscribe = voiceEvents.subscribe(handleVoiceCommand);
    return () => unsubscribe();
  }, [appointmentId, markers, elevation, selectedMarkerId, navigate]);

  // Drag-to-move state
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // Surface Pen / Pointer Input State
  const activePointers = useRef<Map<number, React.PointerEvent>>(new Map());
  const lastPenTime = useRef<number>(0);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);
  const initialMapZoomOffset = useRef<number>(1.0);
  const initialPan = useRef<{x: number, y: number} | null>(null);
  const initialMapPan = useRef<{x: number, y: number} | null>(null);
  const initialPinchCenter = useRef<{x: number, y: number} | null>(null);

  // Canvas drawing state
  const drawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const savedCanvas = useRef<ImageData | null>(null);
  const historyStack = useRef<ImageData[]>([]);
  const historyIdx = useRef(-1);

  // Surface Pen / Pointer Input State Machine Refs
  const activePointerId = useRef<number | null>(null);
  const pointerTypeRef = useRef<'pen' | 'touch' | 'mouse' | null>(null);
  const isErasing = useRef(false);
  const suppressMarkerSelectUntil = useRef<number>(0);
  const currentLogicalStroke = useRef<{ x: number; y: number }[]>([]);
  const lastFreehandStroke = useRef<{ x: number; y: number }[]>([]);
  const lastLineClickTime = useRef<number>(0);
  const pointerStartScreen = useRef<{ x: number, y: number } | null>(null);
  const pointerMovedOverThreshold = useRef<boolean>(false);

  const vectorHistoryStack = useRef<{ freehandStrokes: any[], outlineSegments: any[] }[]>([]);
  const vectorHistoryIdx = useRef(-1);

  const saveVectorState = (newStrokes: any[], newSegments: any[]) => {
    vectorHistoryStack.current = vectorHistoryStack.current.slice(0, vectorHistoryIdx.current + 1);
    vectorHistoryStack.current.push({
      freehandStrokes: newStrokes,
      outlineSegments: newSegments
    });
    vectorHistoryIdx.current = vectorHistoryStack.current.length - 1;
  };

  const finishOutline = () => {
    if (activeLinePoints.length < 2) {
      setActiveLinePoints([]);
      setPreviewCursor(null);
      return;
    }
    const firstPt = activeLinePoints[0];
    const lastPt = activeLinePoints[activeLinePoints.length - 1];
    const newSeg = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x1: lastPt.x, y1: lastPt.y,
      x2: firstPt.x, y2: firstPt.y,
      elevation,
      type: 'manual' as const
    };
    setOutlineSegments(prev => {
      const next = [...prev, newSeg];
      saveVectorState(freehandStrokes, next);
      return next;
    });
    setActiveLinePoints([]);
    setPreviewCursor(null);
    toast.success('Outline closed!');
    saveCanvasImage();
  };

  const redrawMarkersRef = useRef<() => void>(() => {});
  const redrawDrawingCanvasRef = useRef<() => void>(() => {});
  const redrawMapRef = useRef<() => void>(() => {});
  const canvasLoadedRef = useRef(false);

  // ── Responsive canvas sizing with DPR ───────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      const wrap = canvasWrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      // Set canvas backing size for crisp rendering
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
      }
      // Size overlay canvas to match
      if (overlay) {
        overlay.width = w * dpr;
        overlay.height = h * dpr;
        overlay.style.width = w + 'px';
        overlay.style.height = h + 'px';
        const oCtx = overlay.getContext('2d');
        if (oCtx) oCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Size bgCanvas to match
      const bgCanvas = bgCanvasRef.current;
      if (bgCanvas) {
        bgCanvas.width = w * dpr;
        bgCanvas.height = h * dpr;
        bgCanvas.style.width = w + 'px';
        bgCanvas.style.height = h + 'px';
        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      
      // Redraw markers, drawings, and map after clearing the canvas on resize
      redrawMarkersRef.current();
      redrawDrawingCanvasRef.current();
      redrawMapRef.current();
    };
    resize();
    const orientHandler = () => setTimeout(resize, 150);
    const visHandler = () => { if (!document.hidden) setTimeout(resize, 100); };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', orientHandler);
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', orientHandler);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [elevation, appointmentId]);

  // Load appointment + openings + sketches
  useEffect(() => {
    if (!appointmentId) return;

    // 1. Immediately load from offline drafts / localStorage for instant paint
    try {
      const stored = localStorage.getItem('wwa-mobile');
      if (stored) {
        const parsed = JSON.parse(stored);
        const cachedAppt = parsed?.state?.drafts?.[`appt_${appointmentId}`];
        if (cachedAppt && !appointment) {
          setAppointment(cachedAppt);
          if (cachedAppt.openings) setOpenings(cachedAppt.openings);
        }
      }
    } catch (e) { console.debug("[swallowed error]", e); }

    const saved = localStorage.getItem(`sketch_field_${appointmentId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.markers) {
          const normalized = data.markers.map((m: any) => {
            // FIX 1: normalize elevation from localStorage — lowercase, default to 'main'
            const nextElev = normalizeElevation(m.elevation);
            if (m.x > 100 || m.y > 100) {
              return {
                ...m,
                elevation: nextElev,
                x: Math.min(95, Math.max(5, (m.x / 1024) * 100)),
                y: Math.min(95, Math.max(5, (m.y / 1024) * 100))
              };
            }
            return { ...m, elevation: nextElev };
          });
          setMarkers(normalized);
        }
        if (data.groups) setGroups(data.groups);

        const initialStrokes = data.freehandStrokes || [];
        const initialSegments = data.outlineSegments || [];
        setFreehandStrokes(initialStrokes);
        setOutlineSegments(initialSegments);
        if (data.outlineConfirmed !== undefined) setOutlineConfirmed(data.outlineConfirmed);
        if (data.mapOpacity !== undefined) setMapOpacity(data.mapOpacity);
        if (data.mapLocked !== undefined) setMapLocked(data.mapLocked);
        if (data.mapPan !== undefined) setMapPan(data.mapPan);
        if (data.mapZoomOffset !== undefined) setMapZoomOffset(data.mapZoomOffset);

        vectorHistoryStack.current = [{ freehandStrokes: initialStrokes, outlineSegments: initialSegments }];
        vectorHistoryIdx.current = 0;
      } catch (e) { console.debug("[swallowed error]", e); }
    } else {
      vectorHistoryStack.current = [{ freehandStrokes: [], outlineSegments: [] }];
      vectorHistoryIdx.current = 0;
    }

    // Load annotations
    try {
      const savedAnnotations = localStorage.getItem(`sketch_annotations_${appointmentId}`);
      if (savedAnnotations) {
        setAnnotations(JSON.parse(savedAnnotations));
      }
    } catch { /* ignore */ }

    // 2. Fetch appointment details from server
    api.get(`/appointments/${appointmentId}`).then(r => {
      setAppointment(r);
      if (r.openings) setOpenings(r.openings);
      setApptLoaded(true);
    }).catch(async () => {
      try {
        const cached = await getCachedAppointment(appointmentId!);
        if (cached) {
          setAppointment(cached);
          if (cached.openings) setOpenings(cached.openings);
        }
      } catch (err) {
        console.error('Failed to load cached appointment:', err);
      }
      setApptLoaded(true);
    });

    // 3. Fetch live sketches from the server
    api.get(`/sketches/appointment/${appointmentId}`).then(async (sketches: any[]) => {
      let currentSketch = sketches?.[0];
      if (!currentSketch) {
        try {
          currentSketch = await api.post('/sketches', { appointmentId, name: 'Main Sketch' });
        } catch (err) {
          console.error('Failed to create sketch on server:', err);
        }
      }
      if (currentSketch) {
        setSketchId(currentSketch.id);
        if (currentSketch.sketchSourceMode) setSketchSourceMode(currentSketch.sketchSourceMode);
          if (currentSketch.mapOutlineEnabled !== undefined) setMapOutlineEnabled(currentSketch.mapOutlineEnabled);
          if (currentSketch.manualDrawingEnabled !== undefined) setManualDrawingEnabled(currentSketch.manualDrawingEnabled);
          if (currentSketch.exportBackgroundEnabled !== undefined) setExportBackgroundEnabled(currentSketch.exportBackgroundEnabled);

          if (currentSketch.markers && currentSketch.markers.length > 0) {
          const uniqueMarkers: SketchMarkerData[] = [];
          // Dedup by markerNumber globally (opening link is by number only).
          // Non-opening markers (annotations, fixtures, materials) dedup by position.
          const seenElevNum = new Set<string>();
          const seenPos = new Set<string>();
          for (const m of currentSketch.markers) {
            if (uniqueMarkers.find(u => u.id === m.id)) continue;

            let nx = m.x;
            let ny = m.y;
            if (nx > 100 || ny > 100) {
              nx = Math.min(95, Math.max(5, (nx / 800) * 100));
              ny = Math.min(95, Math.max(5, (ny / 800) * 100));
            }

            // FIX 1: always normalize elevation; never leave as '' or null
            const normElev = normalizeElevation(m.elevation);

            if (m.markerNumber !== null && m.markerNumber !== undefined) {
              // FIX 6: Dedup by markerNumber globally — opening-to-marker link is
              // by markerNumber only (ignores elevation), so two markers with the
              // same number on different elevations would map to ONE opening.
              const key = `${m.markerNumber}`;
              if (seenElevNum.has(key)) continue;
              seenElevNum.add(key);
            } else {
              const posKey = `${m.markerSymbol}_${normElev}_${Math.round(nx / 5) * 5}_${Math.round(ny / 5) * 5}`;
              if (seenPos.has(posKey)) continue;
              seenPos.add(posKey);
            }

            uniqueMarkers.push({
              id: m.id,
              sketchId: m.sketchId || currentSketch.id,
              markerType: m.markerType || 'window',
              markerNumber: m.markerNumber,
              markerSymbol: m.markerSymbol,
              markerLabel: m.markerLabel || '',
              windowType: m.windowType,
              shapeType: m.shapeType,
              x: nx,
              y: ny,
              width: m.width,
              height: m.height,
              unitedInches: m.unitedInches,
              // FIX 1: always normalize elevation; never leave as '' or null
              elevation: normElev,
              roomLocation: m.roomLocation || '',
              floorNumber: m.floorNumber || 1,
              productType: m.productType,
              specialtyType: m.specialtyType,
              ladderReq: m.ladderReq || false,
              removalType: m.removalType || '',
              installType: m.installType || '',
              exteriorMaterial: m.exteriorMaterial || '',
              notes: m.notes || '',
              pricingStatus: m.pricingStatus || '',
              linkedOrderRowNumber: m.linkedOrderRowNumber,
              validationStatus: m.validationStatus || 'incomplete',
              groupId: m.groupId,
            } as any);
          }
          // Fix: Always use the server's markers when successfully fetched, to ensure multi-device sync works
          // and a stale local cache doesn't overwrite work done on another device.
          setMarkers(uniqueMarkers);
          setSketchMarkersLoaded(true); // FIX 3: gate orphan deletion
          
          // Overwrite local draft with fresh server data to heal stale caches
          const serverGroups = currentSketch.canvasData?.groups || currentSketch.markerGroups || [];
          const existingDraftStr = localStorage.getItem(`sketch_field_${appointmentId}`);
          let existingDraft = {};
          if (existingDraftStr) {
            try { existingDraft = JSON.parse(existingDraftStr); } catch (e) {}
          }
          localStorage.setItem(`sketch_field_${appointmentId}`, JSON.stringify({ 
            ...existingDraft,
            markers: uniqueMarkers, 
            groups: serverGroups,
            ...(currentSketch.canvasData?.freehandStrokes ? { freehandStrokes: currentSketch.canvasData.freehandStrokes } : {}),
            ...(currentSketch.canvasData?.outlineSegments ? { outlineSegments: currentSketch.canvasData.outlineSegments } : {})
          }));
        } else {
          // Sketch exists but has no markers — still mark as loaded so auto-gen can run
          setSketchMarkersLoaded(true);
        }
        
        // Load drawing vector data if present on the server
        if (currentSketch.canvasData) {
          const cd = currentSketch.canvasData;
          if (cd.freehandStrokes) setFreehandStrokes(cd.freehandStrokes);
          if (cd.outlineSegments) setOutlineSegments(cd.outlineSegments);
          if (cd.outlineConfirmed !== undefined) setOutlineConfirmed(cd.outlineConfirmed);
          if (cd.mapOpacity !== undefined) setMapOpacity(cd.mapOpacity);
          if (cd.mapLocked !== undefined) setMapLocked(cd.mapLocked);
          if (cd.mapPan) setMapPan(cd.mapPan);
          if (cd.mapZoomOffset !== undefined) setMapZoomOffset(cd.mapZoomOffset);
          if (cd.groups) setGroups(cd.groups);
        } else if (currentSketch.markerGroups) {
          setGroups(currentSketch.markerGroups);
        }
      }
    }).catch(async err => {
      console.error('Failed to load sketch from server:', err);
      try {
        const cached = await getCachedSketch(appointmentId!);
        if (cached) {
          setSketchId(cached.id);
          if (cached.markers) setMarkers(cached.markers);
          if (cached.groups) setGroups(cached.groups);
        } else {
          // Fallback to local sketch ID if completely offline
          setSketchId(`local_sketch_${Date.now()}`);
        }
        setSketchMarkersLoaded(true);
      } catch (cacheErr) {
        console.error('Failed to load cached sketch:', cacheErr);
        setSketchMarkersLoaded(true);
      }
    }).finally(() => {
      // ── Process Quick Quote draft ──────────────────────────────────────────
      // Always import QQ draft when present for this appointment — even if we
      // already have saved markers (rep may have re-entered QQ flow).
      const qqDraftRaw = localStorage.getItem('wwa_quick_quote_draft');
    if (qqDraftRaw) {
      try {
        const qqDraft = JSON.parse(qqDraftRaw);
        if (qqDraft.openings && qqDraft.openings.length > 0) {

          // Map QuickQuote suggestedType → sketch markerSymbol
          const typeToSymbol: Record<string, string> = {
            double_hung: 'dh', single_hung: 'sh', casement: 'cas',
            awning: 'awning', slider: 'sl', bay: 'bay',
            picture: 'pic', fixed: 'pic', bow: 'bow',
            front_door: 'front_door', sliding_glass_door: 'patio_door',
            patio_door: 'patio_door', entry_door: 'front_door',
            unknown: 'dh',
          };
          // Default rough dimensions (width × height in inches) per window type
          const typeDims: Record<string, [number, number]> = {
            dh: [36, 48], sh: [36, 36], cas: [24, 48], awning: [36, 24],
            sl: [48, 36], bay: [60, 48], pic: [48, 36], bow: [72, 48],
            front_door: [36, 80], patio_door: [72, 80], default: [36, 48],
          };

          // Group by elevation for organized row layout
          const elevGroups: Record<string, any[]> = {};
          qqDraft.openings.forEach((s: any) => {
            const elev = s.elevation || '1st_story';
            if (!elevGroups[elev]) elevGroups[elev] = [];
            elevGroups[elev].push(s);
          });

          // Assign Y rows per elevation, X spread evenly
          const elevY: Record<string, number> = {
            front: 30, rear: 60, left: 45, right: 45,
            garage: 80, other: 80, unknown: 45,
          };
          const CANVAS_W = 100;

          const newMarkers: SketchMarkerData[] = [];
          const newOpenings: any[] = [];
          let globalIdx = 0;

          Object.entries(elevGroups).forEach(([elev, items]) => {
            const baseY = elevY[elev] ?? 45;
            const step = Math.min(15, Math.floor((CANVAS_W - 10) / (items.length + 1)));

            items.forEach((draftObj: any, i: number) => {
              const sym = typeToSymbol[draftObj.suggestedType] || 'dh';
              const dims = typeDims[sym] || typeDims['default'];
              const cx = 5 + step * (i + 1);
              const cy = baseY + (globalIdx % 2 === 0 ? 0 : 5); // slight stagger
              globalIdx++;

              const markerElev = normalizeElevation(elev);
              const baseMarker = createMarkerData(
                `sketch_${appointmentId}`,
                sym as any,
                cx,
                cy,
                markerElev,
                [...newMarkers]
              );

              const marker: SketchMarkerData = {
                ...baseMarker,
                id: draftObj.id || baseMarker.id,
                markerLabel: 'QQ',
                width: draftObj.estWidth || dims[0],
                height: draftObj.estHeight || dims[1],
                validationStatus: 'incomplete',
                notes: `Quick Quote AI — ${draftObj.notes || 'verify on-site'}`,
                elevation: elev,
              };

              newMarkers.push(marker);

              if (!NON_OPENING_MARKERS.includes(marker.markerSymbol)) {
                newOpenings.push(createOpeningFromMarker(marker, appointmentId));
              }
            });
          });

          setMarkers(prev => {
            // Merge with existing markers, skip duplicates by id
            const existingIds = new Set(prev.map(m => m.id));
            return [...prev, ...newMarkers.filter(m => !existingIds.has(m.id))];
          });
          setOpenings(prev => {
            const existingIds = new Set(prev.map(o => o.markerId));
            const uniqueNew = newOpenings.filter(o => !existingIds.has(o.markerId));
            return [...prev, ...uniqueNew];
          });

          // Switch to front elevation and open the outline panel so it can auto-apply
          setElevation('1st_story');
          setQqJustLoaded(true);
          setShowOutlinePanel(true);
          setOutlineExpanded(true);

          const total = newMarkers.length;
          toast.success(`✅ ${total} Quick Quote window${total !== 1 ? 's' : ''} placed — loading house aerial…`);
          localStorage.removeItem('wwa_quick_quote_draft');
        }
      } catch (err) {
        console.error('Failed to parse Quick Quote draft', err);
      }
    }
    });
  }, [appointmentId]);


  // ── Handle Auto-Selection / Focusing from Fix Query Parameters ──
  useEffect(() => {
    if (!sketchMarkersLoaded || markers.length === 0) return;
    const params = new URLSearchParams(location.search);
    const focusOpening = params.get('focusOpening') || params.get('focusMarker');
    const focusField = params.get('focusField');

    if (focusOpening) {
      // Find the marker by markerNumber or by marker ID
      const targetMarker = markers.find(
        m => String(m.markerNumber) === focusOpening || m.id === focusOpening
      );
      if (targetMarker) {
        // Switch to the correct elevation if needed
        const normElev = normalizeElevation(targetMarker.elevation);
        if (normElev !== elevation) {
          setElevation(normElev);
        }
        
        // Select the marker so the panel opens
        if (selectedMarkerId !== targetMarker.id) {
          setSelectedMarkerId(targetMarker.id);
        }

        // Focus the target field in the detail sheet
        if (focusField) {
          setJumpTargetField(focusField);
        }

        // Center the canvas around this marker
        setTimeout(() => {
          fitAll();
        }, 100);
      }
    }
  }, [location.search, sketchMarkersLoaded, markers.length]);



  // ── Rebuild missing markers from DB openings ───────────────────────────────
  // Finds openings that have no canvas marker and creates default positions for them.
  const rebuildMissingMarkers = useCallback(() => {
    const openingMarkerNums = new Set(
      markers
        .filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol) && m.markerNumber !== null)
        .map(m => m.markerNumber)
    );
    const missing = openings.filter(op => !openingMarkerNums.has(op.openingNumber));
    if (missing.length === 0) {
      toast.info('All openings already have canvas markers.');
      return;
    }
    const newMarkers: SketchMarkerData[] = [];
    const cols = 5;
    missing.forEach((op: any, idx: number) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = 15 + col * 15;
      const cy = 25 + row * 15;
      let symbol: MarkerSymbol = 'window_x';
      const cat = (op.productCategory || '').toLowerCase();
      if (cat.includes('door') || cat.includes('patio')) symbol = 'patio_door';
      else if (cat.includes('picture')) symbol = 'picture';
      else if (cat.includes('slider') || cat.includes('sliding')) symbol = 'slider';
      else if (cat.includes('casement')) symbol = 'casement';
      else if (cat.includes('awning')) symbol = 'awning';
      // FIX 7: normalize elevation
      const markerElev = normalizeElevation(op.elevation);
      const marker = createMarkerData(
        `sketch_${appointmentId}`, symbol, cx, cy, markerElev,
        markers.concat(newMarkers)
      );
      marker.markerNumber = op.openingNumber;
      marker.markerLabel = `X #${op.openingNumber}`;
      marker.linkedOrderRowNumber = op.openingNumber;
      marker.width = op.width || 36;
      marker.height = op.height || 60;
      marker.unitedInches = op.unitedInches || ((marker.width || 36) + (marker.height || 60));
      marker.windowType = op.productCategory || 'double_hung';
      marker.roomLocation = op.roomLocation || '';
      marker.elevation = markerElev;
      marker.floorNumber = op.floorNumber || 1;
      marker.validationStatus = validateWithDefaults(op, openings, appointment?.houseSpecs?.isBrick || false).status === 'complete' || validateWithDefaults(op, openings, appointment?.houseSpecs?.isBrick || false).status === 'ready' ? 'complete' : 'incomplete';
      newMarkers.push(marker);
    });
    setMarkers(prev => [...prev, ...newMarkers]);
    toast.success(`Rebuilt ${newMarkers.length} missing marker${newMarkers.length !== 1 ? 's' : ''} — tap Save to persist.`);
    // Switch to the elevation of the first rebuilt marker so rep can see it
    if (newMarkers[0]?.elevation) setElevation(newMarkers[0].elevation);
    setTimeout(fitAll, 80);
  }, [markers, openings, appointmentId, fitAll]);

  // Synchronize markers to openings (in case localStorage markers drifted from backend openings)
  useEffect(() => {
    if (!appointmentId || !apptLoaded) return;

    // FIX 3: Only run auto-gen from openings after the server sketch markers have been loaded.
    // Without this guard, the effect fires the moment apptLoaded=true and openings arrive
    // but before the /sketches/ fetch completes, causing all server markers to be wiped.
    if (!sketchMarkersLoaded) return;

    // Synchronize validation status of all markers based on current openings
    setMarkers(prev => {
      let changed = false;
      const next = prev.map(m => {
        const o = openings.find(op => op.openingNumber === m.markerNumber);
        if (!o) return m;
        const valStatus = validateWithDefaults(o, openings, appointment?.houseSpecs?.isBrick || false).status;
        const newStatus = ((valStatus === 'complete' || valStatus === 'ready') ? 'complete' : 'incomplete') as any;
        if (m.validationStatus !== newStatus) {
          changed = true;
          return { ...m, validationStatus: newStatus };
        }
        return m;
      });
      if (changed) return next;
      return prev;
    });

    // If the canvas is blank but we have openings in the DB, auto-create markers from them.
    // This handles the transition from the old Openings workflow to Sketch-as-Source-of-Truth.
    if (markers.length === 0 && openings.length > 0 && !autoGenDone.current) {
      autoGenDone.current = true; // prevent re-run from React strict mode or state changes
      const newMarkers: SketchMarkerData[] = [];
      const cols = 5; // arrange in a grid
      openings.forEach((op: any, idx: number) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = 15 + col * 15;
        const cy = 25 + row * 15;

        // Determine marker symbol from product category
        let symbol: MarkerSymbol = 'window_x';
        const cat = (op.productCategory || '').toLowerCase();
        if (cat.includes('door') || cat.includes('patio')) symbol = 'patio_door';
        else if (cat.includes('picture')) symbol = 'picture';
        else if (cat.includes('slider') || cat.includes('sliding')) symbol = 'slider';
        else if (cat.includes('casement')) symbol = 'casement';
        else if (cat.includes('awning')) symbol = 'awning';

        // FIX 7: normalize elevation
        const markerElev = normalizeElevation(op.elevation);
        const marker = createMarkerData(
          `sketch_${appointmentId}`,
          symbol,
          cx, cy,
          markerElev,
          markers.concat(newMarkers) // pass accumulated markers to get correct numbering
        );
        // Overwrite with actual opening data
        marker.markerNumber = op.openingNumber;
        marker.markerLabel = `X #${op.openingNumber}`;
        marker.linkedOrderRowNumber = op.openingNumber;
        marker.width = op.width || 36;
        marker.height = op.height || 60;
        marker.unitedInches = op.unitedInches || 0;
        marker.windowType = op.productCategory || 'double_hung';
        marker.roomLocation = op.roomLocation || '';
        marker.elevation = markerElev;
        marker.floorNumber = op.floorNumber || 1;
        marker.exteriorMaterial = op.exteriorType || op.exteriorSurface || '';
        marker.exteriorSurface = op.exteriorSurface || op.exteriorType || '';
        marker.removalType = op.removalType || '';
        marker.installType = op.installType || '';
        marker.gridPattern = op.gridPattern || op.gridStyle || 'None';
        marker.gridProfile = op.gridProfile || '';
        marker.gridVerticalCount = op.gridVerticalCount || 0;
        marker.gridHorizontalCount = op.gridHorizontalCount || 0;
        marker.gridPlacement = op.gridPlacement || 'full';
        marker.validationStatus = validateWithDefaults(op, openings, appointment?.houseSpecs?.isBrick || false).status === 'complete' || validateWithDefaults(op, openings, appointment?.houseSpecs?.isBrick || false).status === 'ready' ? 'complete' : 'incomplete';
        marker.pricingStatus = op.totalPrice > 0 ? 'priced' : 'pending';

        newMarkers.push(marker);
      });

      setMarkers(newMarkers);
      toast.success(`Loaded ${newMarkers.length} existing openings onto sketch canvas.`);
      return;
    }

    if (markers.length === 0) return;

    const openingMarkers = markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol) && m.markerNumber !== null);

    setOpenings(prev => {
      let changed = false;
      let newOpenings = [...prev];

      // 1. ADD missing openings (exist in markers, missing in DB)
      // 2. UPDATE existing openings if measurements changed
      for (const m of openingMarkers) {
        const existing = newOpenings.find(o => o.openingNumber === m.markerNumber);
        if (!existing) {
          newOpenings.push(createOpeningFromMarker(m, appointmentId));
          changed = true;
        } else {
          if (
            existing.width !== m.width || 
            existing.height !== m.height || 
            existing.unitedInches !== m.unitedInches ||
            (m.windowType && existing.productCategory !== m.windowType)
          ) {
            existing.width = m.width;
            existing.height = m.height;
            existing.unitedInches = m.unitedInches;
            if (m.windowType) existing.productCategory = m.windowType;
            changed = true;
          }
        }
      }

      // 2. FIX 3: Only prune orphaned openings after sketch markers are loaded.
      // Previously this ran before the sketch fetch completed, wiping all openings.
      const validNumbers = new Set(openingMarkers.map(m => m.markerNumber));
      const filteredOpenings = newOpenings.filter(o => validNumbers.has(o.openingNumber));

      if (filteredOpenings.length !== newOpenings.length) {
        changed = true;
        newOpenings = filteredOpenings;
      }

      if (changed) {
        // Auto-sync to backend so pricing engine is instantly aware
        if (navigator.onLine) {
          api.batchSyncOpenings({ appointmentId, openings: newOpenings })
            .then(() => api.reconcileOpenings(appointmentId || '').catch(console.error))
            .catch(console.error);
        } else {
          // Offline handling: queue mutation for each opening
          newOpenings.forEach(o => {
            enqueueOutboxItem({
              companyId: appointment?.companyId || '',
              userId: appointment?.userId || '',
              entityType: 'opening',
              entityLocalId: o.id || `local_opening_${Date.now()}_${o.openingNumber}`,
              entityCloudId: o.id?.startsWith('local_') ? undefined : o.id,
              appointmentId: appointmentId,
              operation: o.id?.startsWith('local_') ? 'create' : 'update',
              payload: { ...o, appointmentId }
            }).catch(console.error);
          });
        }
      }

      return changed ? newOpenings : prev;
    });
  }, [markers, appointment, appointmentId, apptLoaded, sketchMarkersLoaded]);



  // Auto-pan is now handled by the Fit All logic and normalized coordinate system

  // Re-render markers on canvas when markers/groups/elevation/outline/transform change
  useEffect(() => {
    redrawMarkers();
  }, [markers, groups, elevation, selectedMarkerId, joinSelected, transform]);

  // Debounced persist to localStorage and server — prevents blocking main thread during rapid edits
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(() => {
    if (!appointmentId) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      localStorage.setItem(`sketch_field_${appointmentId}`, JSON.stringify({
        markers,
        groups,
        freehandStrokes,
        outlineSegments,
        outlineConfirmed,
        mapOpacity,
        mapLocked,
        mapPan,
        mapZoomOffset
      }));
      // Save annotations
      try {
        localStorage.setItem(`sketch_annotations_${appointmentId}`, JSON.stringify(annotations));
      } catch { /* quota exceeded — not critical */ }
      setWarnings(validateSketchSync(markers, openings, groups));
      setHasUnsaved(true);
        localStorage.setItem('sketch_has_unsaved_' + appointmentId, 'true');

      // Sync to backend if sketchId is loaded
      if (sketchId) {
        const canvasData = {
          freehandStrokes,
          outlineSegments,
          outlineConfirmed,
          mapOpacity,
          mapLocked,
          mapPan,
          mapZoomOffset,
          groups
        };
        
        if (navigator.onLine) {
          api.post(`/sketches/${sketchId}/markers`, { markers, markerGroups: groups }).catch(err => {
            console.error('Failed to sync markers to server:', err);
          });
          api.put(`/sketches/${sketchId}`, { canvasData }).catch(err => {
            console.error('Failed to sync canvasData to server:', err);
          });
          // Upload canvas snapshot for Order Form sketch embedding (non-blocking)
          uploadSketchForExport();
        } else {
          // Offline handling: cache sketch and queue mutation
          cacheSketch({
            id: sketchId,
            appointmentId,
            markers,
            groups
          }).catch(console.error);

          enqueueOutboxItem({
            companyId: appointment?.companyId || '',
            userId: appointment?.userId || '',
            entityType: 'sketch_marker',
            entityLocalId: sketchId,
            entityCloudId: sketchId?.startsWith('local_') ? undefined : sketchId,
            appointmentId: appointmentId,
            operation: sketchId?.startsWith('local_') ? 'create' : 'update',
            payload: { markers, groups }
          }).catch(console.error);
        }
      }
    }, 300);
  }, [appointment, appointmentId, sketchId, markers, groups, openings, mapPan, mapLocked, mapOpacity, mapZoomOffset]);

  useEffect(() => { persist(); }, [markers, groups, openings, mapPan, mapLocked, mapOpacity, mapZoomOffset]);

  // Keep refs of latest state/functions to ensure emergency save / unmount hooks always have fresh context without re-binding event listeners
  const markersRef = useRef(markers);
  const groupsRef = useRef(groups);
  const openingsRef = useRef(openings);
  const sketchIdRef = useRef(sketchId);
  const elevationRef = useRef(elevation);
  const uploadSketchRef = useRef<any>(null);

  const freehandStrokesRef = useRef(freehandStrokes);
  const outlineSegmentsRef = useRef(outlineSegments);
  const mapOpacityRef = useRef(mapOpacity);
  const mapLockedRef = useRef(mapLocked);
  const mapPanRef = useRef(mapPan);
  const mapZoomOffsetRef = useRef(mapZoomOffset);
  const outlineConfirmedRef = useRef(outlineConfirmed);

  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { openingsRef.current = openings; }, [openings]);
  useEffect(() => { sketchIdRef.current = sketchId; }, [sketchId]);
  useEffect(() => { elevationRef.current = elevation; }, [elevation]);
  
  useEffect(() => { freehandStrokesRef.current = freehandStrokes; }, [freehandStrokes]);
  useEffect(() => { outlineSegmentsRef.current = outlineSegments; }, [outlineSegments]);
  useEffect(() => { mapOpacityRef.current = mapOpacity; }, [mapOpacity]);
  useEffect(() => { mapLockedRef.current = mapLocked; }, [mapLocked]);
  useEffect(() => { mapPanRef.current = mapPan; }, [mapPan]);
  useEffect(() => { mapZoomOffsetRef.current = mapZoomOffset; }, [mapZoomOffset]);
  useEffect(() => { outlineConfirmedRef.current = outlineConfirmed; }, [outlineConfirmed]);

  const syncToServerImmediate = useCallback(() => {
    const activeApptId = appointmentId;
    const activeSketchId = sketchIdRef.current;
    const activeMarkers = markersRef.current;
    const activeOpenings = openingsRef.current;
    const activeGroups = groupsRef.current;

    if (!activeApptId || !navigator.onLine) return;
    if (activeSketchId) {
      api.post(`/sketches/${activeSketchId}/markers`, { markers: activeMarkers, markerGroups: activeGroups }).catch(err => {
        console.error('[SketchFieldPage] Immediate markers sync failed:', err);
      });
      
      const canvasData = {
        freehandStrokes: freehandStrokesRef.current,
        outlineSegments: outlineSegmentsRef.current,
        outlineConfirmed: outlineConfirmedRef.current,
        mapOpacity: mapOpacityRef.current,
        mapLocked: mapLockedRef.current,
        mapPan: mapPanRef.current,
        mapZoomOffset: mapZoomOffsetRef.current,
        groups: activeGroups
      };
      
      api.put(`/sketches/${activeSketchId}`, { canvasData }).catch(err => {
        console.error('[SketchFieldPage] Immediate canvasData sync failed:', err);
      });
    }
    api.batchSyncOpenings({ appointmentId: activeApptId, openings: activeOpenings })
      .then(() => api.reconcileOpenings(activeApptId).catch(console.error))
      .catch(err => {
        console.error('[SketchFieldPage] Immediate openings sync failed:', err);
      });
  }, [appointmentId]);

  // ── Upload canvas snapshot to server for Order Form Excel/PDF embedding ──
  // Called after every marker sync so the sketch PNG on disk is always current.
  // Non-blocking: failures are silently swallowed (best-effort).
  //
  // CRITICAL FIX: The live sketch uses white strokes on dark (#1e293b) background.
  // For export to white paper/PDF we invert light strokes to dark and re-render
  // markers fresh with colored fills + dark number labels.
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadSketchForExport = useCallback((
    forceBaseCanvas?: HTMLCanvasElement, 
    forceOverlayCanvas?: HTMLCanvasElement,
    immediate?: boolean
  ) => {
    try {
      if (!immediate && !isMountedRef.current) return;
      const baseCanvas = forceBaseCanvas || canvasRef.current;
      const overlayCanvas = forceOverlayCanvas || overlayRef.current;
      if (!baseCanvas || !overlayCanvas || !appointmentId) return;

      if (outlineSegments.some(s => s.type === 'auto') && !outlineConfirmed) {
        toast.warning('Auto-outline has not been confirmed! Verify and confirm it to ensure the export is correct.');
      }

      const dpr = window.devicePixelRatio || 1;
      const exportW = baseCanvas.width;
      const exportH = baseCanvas.height;

      // Step 1: Create export canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = exportW;
      tempCanvas.height = exportH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportW, exportH);

      // Step 1.5: Draw background map if it exists
      const bgCanvas = bgCanvasRef.current;
      if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0);
      }

      const drawCustomerInfo = (targetCtx: CanvasRenderingContext2D) => {
        if (!appointment) return;
        const customer = appointment.customer;
        const customerName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer';
        const address1 = appointment.jobAddress || customer?.address || '';
        const address2 = [appointment.city || customer?.city, appointment.state || customer?.state, appointment.zip || customer?.zip].filter(Boolean).join(', ');
        const phone = customer?.phone || '';
        const dateStr = new Date().toLocaleDateString();

        const lines = [customerName, address1, address2, phone, `Date: ${dateStr}`].filter(Boolean);
        
        targetCtx.save();
        targetCtx.setTransform(1, 0, 0, 1, 0, 0);
        
        targetCtx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        let maxWidth = 0;
        lines.forEach(line => {
          const w = targetCtx.measureText(line).width;
          if (w > maxWidth) maxWidth = w;
        });

        const padding = 12;
        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * 20 + padding * 2;
        
        const x = 20;
        const y = 20;

        targetCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        targetCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        targetCtx.shadowBlur = 8;
        targetCtx.shadowOffsetX = 2;
        targetCtx.shadowOffsetY = 4;
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, boxWidth, boxHeight, 8);
        targetCtx.fill();
        
        targetCtx.shadowColor = 'transparent';
        targetCtx.fillStyle = '#000000';
        targetCtx.textBaseline = 'top';
        
        lines.forEach((line, i) => {
          if (i === 0) targetCtx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          else targetCtx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          targetCtx.fillText(line, x + padding, y + padding + i * 20);
        });
        
        targetCtx.restore();
      };



      // Step 2: Draw base canvas legacy strokes with color inversion
      const strokeCanvas = document.createElement('canvas');
      strokeCanvas.width = exportW;
      strokeCanvas.height = exportH;
      const strokeCtx = strokeCanvas.getContext('2d');
      if (strokeCtx) {
        strokeCtx.drawImage(baseCanvas, 0, 0);
        strokeCtx.drawImage(baseCanvas, 1, 0);
        strokeCtx.drawImage(baseCanvas, 0, 1);
        strokeCtx.drawImage(baseCanvas, 1, 1);
        
        strokeCtx.globalCompositeOperation = 'source-in';
        strokeCtx.fillStyle = '#000000';
        strokeCtx.fillRect(0, 0, exportW, exportH);
        strokeCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(strokeCanvas, 0, 0);
      }

      // Step 3: Re-render markers with export-safe text colors (black numbers/labels)
      // so they are visible on white paper.
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { cw, ch, planeSize } = getTransformParams(baseCanvas);
      
      // EXPORT FIX: Always export ALL active markers, not just the current elevation tab.
      // This ensures the Order Form sketch is a true "source of truth" composite.
      // Also, filter out markers that were auto-generated but never placed on the sketch.
      // Auto-generated markers are placed at exactly cx = 15 + col * 15, cy = 25 + row * 15.
      const exportMarkers = markers.filter(m => {
        if (NON_OPENING_MARKERS.includes(m.markerSymbol)) return false;
        
        // Filter out unplaced markers to prevent them from shrinking the exported sketch bounds.
        const col = (m.x - 15) / 15;
        const row = (m.y - 25) / 15;
        const isUnplaced = Math.abs(col - Math.round(col)) < 0.001 && 
                           Math.abs(row - Math.round(row)) < 0.001 && 
                           col >= 0 && col < 100 && row >= 0;
                           
        return !isUnplaced;
      });
      
      const layoutConfig = getFieldSketchLayoutConfig({
        viewportWidth: cw,
        viewportHeight: ch,
        footprintMinSide: planeSize,
        openingCount: exportMarkers.length,
        isMobile: false,
        isTablet: false,
        zoomLevel: transform.zoom,
        isPrintMode: true,
      });

      for (const m of exportMarkers) {
        const sPos = toScreen(m.x, m.y, baseCanvas);
        const renderM = { ...m, x: sPos.x, y: sPos.y };
        drawMarkerOnCanvas(ctx, renderM, {
          size: layoutConfig.markerSize,
          smallSize: layoutConfig.smallMarkerSize,
          isCompact: layoutConfig.isCompact,
          isSelected: false,
          isJoinSelected: false,
          textColor: '#000000', // Draw black numbers/labels on white background
          labelVisibilityMode: layoutConfig.labelVisibilityMode,
          isPrintMode: true,
        });
      }

      for (const g of groups) {
        const gm = exportMarkers.filter(m => g.memberMarkerIds.includes(m.id)).map(m => {
          const sPos = toScreen(m.x, m.y, baseCanvas);
          return { ...m, x: sPos.x, y: sPos.y };
        });
        if (gm.length >= 2) drawGroupConnector(ctx, gm, g.groupType);
      }

      // Draw annotations on the export canvas (notes appear on Order Form sketch image)
      const { unit: annUnit, offsetX: annOX, offsetY: annOY } = getTransformParams(baseCanvas);
      for (const ann of annotations.filter(a => !a.sketchId || a.sketchId === sketchId)) {
        if (ann.markerId) {
          const linkedMarker = exportMarkers.find(m => m.id === ann.markerId);
          if (linkedMarker) {
            drawLeaderLine(ctx, ann, linkedMarker.x, linkedMarker.y, transform, annUnit, annOX, annOY);
          }
        }
        drawAnnotation(ctx, ann, transform, annUnit, annOX, annOY, false, true);
      }

      // Draw customer details box
      drawCustomerInfo(ctx);

      ctx.restore();

      const strokeDataUrl = strokeCanvas.toDataURL('image/png');
      const tempUrl = tempCanvas.toDataURL('image/png');
      if (!tempUrl || tempUrl === 'data:,') return;

      // Create clean export background canvas (white background + Mapbox map + black strokes)
      const cleanExportCanvas = document.createElement('canvas');
      cleanExportCanvas.width = exportW;
      cleanExportCanvas.height = exportH;
      const cleanCtx = cleanExportCanvas.getContext('2d');
      let cleanExportUrl = '';
      if (cleanCtx) {
        cleanCtx.fillStyle = '#ffffff';
        cleanCtx.fillRect(0, 0, exportW, exportH);
          // Draw background map if permitted by source mode
          const shouldDrawMap = sketchSourceMode === 'map_outline_only' || sketchSourceMode === 'map_plus_manual' || sketchSourceMode === 'street_view_reference_only';
          const bgCanvas = bgCanvasRef.current;
          if (bgCanvas && shouldDrawMap) {
            cleanCtx.drawImage(bgCanvas, 0, 0);
          }
        
        // Draw black strokes
        cleanCtx.drawImage(strokeCanvas, 0, 0);
        
        // Draw customer details box on the clean export canvas as well
        drawCustomerInfo(cleanCtx);
        
        cleanExportUrl = cleanExportCanvas.toDataURL('image/webp', 0.5);
      }

      // ── SYNCHRONOUS LOCAL STORAGE SAVE ──
      // Always immediately flush to localStorage so ProposalBuilder can grab it instantly if the user navigates away
      localStorage.setItem(
        `wwa_sketch_${appointmentId}_${elevation}`,
        JSON.stringify({ dataUrl: tempUrl, markers })
      );
      
      const baseUrl = baseCanvas.toDataURL('image/webp', 0.5);
      if (baseUrl) {
        localStorage.setItem(`sketch_canvas_${appointmentId}_${elevation}`, baseUrl);
        if (cleanExportUrl) {
          localStorage.setItem(`sketch_canvas_clean_${appointmentId}_${elevation}`, cleanExportUrl);
        }
        const transformData = { ...transform, dpr: window.devicePixelRatio || 1 };
        localStorage.setItem(`sketch_transform_${appointmentId}_${elevation}`, JSON.stringify(transformData));
      }

      // ── DEBOUNCED / IMMEDIATE UPLOAD ──
      const doUpload = () => {
        const token = localStorage.getItem('wwa_token');
        const dataUrl = tempUrl || baseUrl;
        if (!dataUrl) return;

        // Convert base64 DataURL to Blob
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], {type: mimeString});
        
        const formData = new FormData();
        formData.append('appointmentId', appointmentId);
        formData.append('file', blob, 'sketch.png');

        fetch(`/api/sketches/upload-for-export`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
          body: formData,
        }).catch(err => {
          console.error('Failed to upload sketch for export:', err);
        });
      };

      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      if (immediate) {
        doUpload();
      } else {
        uploadTimer.current = setTimeout(doUpload, 800);
      }
      
    } catch (err) {
      console.error('Failed to generate export canvas:', err);
    }
  }, [appointmentId, elevation, markers, groups, transform]);

  useEffect(() => { uploadSketchRef.current = uploadSketchForExport; }, [uploadSketchForExport]);

  // Render background map
  const redrawMap = useCallback(() => {
    const canvas = bgCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const { cw, ch } = getTransformParams(canvas);
    ctx.clearRect(0, 0, cw, ch);

    const shouldDrawMap = sketchSourceMode === 'map_outline_only' || sketchSourceMode === 'map_plus_manual' || sketchSourceMode === 'street_view_reference_only';

    if (bgImageObj && bgMapData && shouldDrawMap) {
      ctx.save();
      
      const centerPos = toScreen(50, 50, canvas);
      
      // Calculate scale so the image covers the viewport.
      // Since mapData was saved with a certain width (e.g. 900),
      // we map it such that it covers the maximum screen dimension
      // to ensure no blank margins.
      const canvasMax = Math.max(cw, ch);
      
      // We want the image width to be 'canvasMax' pixels in screen space when zoom=1.
      // Since we draw at scale `transform.zoom`, the base draw size should be canvasMax.
      const scale = canvasMax / bgMapData.w;
      
      // Apply mapZoomOffset to scale the map image independently when unlocked
      const drawW = bgMapData.w * scale * transform.zoom * mapZoomOffset;
      const drawH = bgMapData.h * scale * transform.zoom * mapZoomOffset;
      
      const drawX = centerPos.x - drawW / 2 + mapPan.x;
      const drawY = centerPos.y - drawH / 2 + mapPan.y;
      
      ctx.globalAlpha = mapOpacity;
      ctx.drawImage(bgImageObj, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }, [bgImageObj, bgMapData, transform, mapOpacity, mapPan, mapZoomOffset, sketchSourceMode]);

  useEffect(() => {
    redrawMapRef.current = redrawMap;
    redrawMap();
  }, [redrawMap]);

  // Trigger it on marker changes
  useEffect(() => {
    uploadSketchForExport();
  }, [uploadSketchForExport]);

  // ── Auto-load Property Map on mount/load ──
  const autoLoadBgMap = useCallback(async (appt: any) => {
    if (!appt || !appointmentId) return;

    // Check if bgMapData already exists in localStorage for this elevation
    const storageKey = `sketch_canvas_${appointmentId}_${elevation}_bgMap`;
    const saved = localStorage.getItem(storageKey);
    if (saved && saved !== 'data:,') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.url) {
          return; // already loaded
        }
      } catch (e) { /* ignore */ }
    }

    const addressStr = [
      appt.jobAddress || appt.customer?.address,
      appt.city        || appt.customer?.city,
      appt.state       || appt.customer?.state,
      appt.zip         || appt.customer?.zip,
    ].filter(Boolean).join(', ');

    if (!addressStr.trim()) return;

    try {
      console.log('[SketchFieldPage] Auto-loading map background for address:', addressStr);
      
      const geocodeCacheKey = `sketch_geocode_${appointmentId}`;
      let geo: { lat: number; lng: number; formattedAddress: string } | null = null;
      try {
        const cachedGeo = localStorage.getItem(geocodeCacheKey);
        if (cachedGeo) geo = JSON.parse(cachedGeo);
      } catch (e) { /* ignore */ }

      if (!geo) {
        const token = localStorage.getItem('wwa_token') || '';
        const res = await fetch('/api/house-outline/from-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ address: addressStr, appointmentId, customerId: appt.customerId }),
        });
        const data = await res.json();
        if (data.success) {
          geo = { lat: data.lat, lng: data.lng, formattedAddress: data.formattedAddress };
          localStorage.setItem(geocodeCacheKey, JSON.stringify(geo));
        }
      }

      if (geo && geo.lat && geo.lng) {
        const zoomLevel = 20;
        const token = localStorage.getItem('wwa_token') || '';
        const imgUrl = `/api/house-outline/static-image?lat=${geo.lat}&lng=${geo.lng}&zoom=${zoomLevel}&w=600&h=840&token=${encodeURIComponent(token)}&cb=${Date.now()}`;
        
        const img = new Image();
        img.onload = () => {
          const aspect = img.height / img.width;
          const logW = 900;
          const logH = logW * aspect;

          const offscreen = document.createElement('canvas');
          offscreen.width = img.width;
          offscreen.height = img.height;
          const ctx = offscreen.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = offscreen.toDataURL('image/png');
            const mapData = { url: dataUrl, w: logW, h: logH };
            
            // Save to both elevations so background is present globally
            const targetElevations = ['1st_story', '2nd_story'];
            targetElevations.forEach(elev => {
              localStorage.setItem(`sketch_canvas_${appointmentId}_${elev}_bgMap`, JSON.stringify(mapData));
            });

            setBgMapData(mapData);
            console.log('[SketchFieldPage] Map background auto-loaded and applied.');
            setTimeout(() => uploadSketchForExport(), 500);
          }
        };
        img.src = imgUrl;
      }
    } catch (err) {
      console.warn('[SketchFieldPage] Failed to auto-load property map:', err);
    }
  }, [appointmentId, elevation, uploadSketchForExport]);

  // Trigger auto-load when appointment details are loaded
  useEffect(() => {
    if (appointment && appointmentId) {
      autoLoadBgMap(appointment);
    }
  }, [appointment, appointmentId, autoLoadBgMap]);

  // Trigger sketch export when background map image finishes loading
  useEffect(() => {
    if (bgImageObj) {
      const timer = setTimeout(() => {
        uploadSketchForExport();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [bgImageObj, uploadSketchForExport]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = 1.05;
      const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

      if (!mapLocked) {
        setMapZoomOffset(prev => {
          const next = prev * delta;
          return Math.max(0.2, Math.min(next, 5));
        });
      } else {
        setTransform(prev => {
          let nextZoom = prev.zoom * delta;
          nextZoom = Math.max(0.5, Math.min(nextZoom, 6));
          return { ...prev, zoom: nextZoom };
        });
      }
    } else {
      // Standard scroll: Pan the map or canvas
      if (!mapLocked) {
        setMapPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      } else {
        setTransform(prev => ({
          ...prev,
          panX: prev.panX - e.deltaX,
          panY: prev.panY - e.deltaY
        }));
      }
    }
  }, [mapLocked]);

  // ── FIELD RELIABILITY: Emergency save on app background / close ──
  // Prevents data loss when rep switches apps, locks phone, loses battery
  useEffect(() => {
    const emergencySave = () => {
      const activeApptId = appointmentId;
      if (!activeApptId) return;

      const activeMarkers = markersRef.current;
      const activeGroups = groupsRef.current;

      // Flush markers + groups immediately (bypass debounce)
      const existingData = localStorage.getItem(`sketch_field_${activeApptId}`);
      const parsedExisting = existingData ? JSON.parse(existingData) : {};
      localStorage.setItem(`sketch_field_${activeApptId}`, JSON.stringify({
        ...parsedExisting,
        markers: activeMarkers,
        groups: activeGroups,
        freehandStrokes: freehandStrokesRef.current,
        outlineSegments: outlineSegmentsRef.current,
        outlineConfirmed: outlineConfirmedRef.current,
        mapOpacity: mapOpacityRef.current,
        mapLocked: mapLockedRef.current,
        mapPan: mapPanRef.current,
        mapZoomOffset: mapZoomOffsetRef.current
      }));
      
      // Flush canvas strokes immediately, ONLY if it finished loading
      const baseCanvas = canvasRef.current;
      if (baseCanvas && canvasLoadedRef.current) {
        localStorage.setItem(`sketch_canvas_${activeApptId}_${elevationRef.current}`, baseCanvas.toDataURL('image/webp', 0.5));
      }

      // Sync to server immediately
      syncToServerImmediate();

      // Flush canvas drawing immediately
      const overlayCanvas = overlayRef.current;
      if (baseCanvas && overlayCanvas && uploadSketchRef.current) {
        uploadSketchRef.current(baseCanvas, overlayCanvas, true);
      }
    };
    const visHandler = () => { if (document.visibilityState === 'hidden') emergencySave(); };
    const unloadHandler = () => emergencySave();
    document.addEventListener('visibilitychange', visHandler);
    window.addEventListener('beforeunload', unloadHandler);
    window.addEventListener('pagehide', unloadHandler); // iOS Safari
    
    // Capture the canvas elements in the closure for unmount
    const cleanupBaseCanvas = canvasRef.current;
    const cleanupOverlayCanvas = overlayRef.current;

    return () => {
      document.removeEventListener('visibilitychange', visHandler);
      window.removeEventListener('beforeunload', unloadHandler);
      window.removeEventListener('pagehide', unloadHandler);
      
      const activeApptId = appointmentId;
      if (!activeApptId) return;

      const activeMarkers = markersRef.current;
      const activeGroups = groupsRef.current;

      // ALWAYS FORCE SAVE ON UNMOUNT (catches React Router navigation)
      const existingData = localStorage.getItem(`sketch_field_${activeApptId}`);
      const parsedExisting = existingData ? JSON.parse(existingData) : {};
      localStorage.setItem(`sketch_field_${activeApptId}`, JSON.stringify({
        ...parsedExisting,
        markers: activeMarkers,
        groups: activeGroups,
        freehandStrokes: freehandStrokesRef.current,
        outlineSegments: outlineSegmentsRef.current,
        outlineConfirmed: outlineConfirmedRef.current,
        mapOpacity: mapOpacityRef.current,
        mapLocked: mapLockedRef.current,
        mapPan: mapPanRef.current,
        mapZoomOffset: mapZoomOffsetRef.current
      }));
      
      if (cleanupBaseCanvas && canvasLoadedRef.current) {
        localStorage.setItem(`sketch_canvas_${activeApptId}_${elevationRef.current}`, cleanupBaseCanvas.toDataURL('image/webp', 0.5));
      }

      // Sync to server immediately
      syncToServerImmediate();

      if (cleanupBaseCanvas && cleanupOverlayCanvas && uploadSketchRef.current) {
        uploadSketchRef.current(cleanupBaseCanvas, cleanupOverlayCanvas, true);
      }
    };
  }, [appointmentId, elevation, syncToServerImmediate]);

  // ── Canvas helpers ──────────────────────────────────────
  const getPos = (e: React.PointerEvent) => {
    // Use overlay canvas for coordinate mapping (events fire on overlay)
    const el = overlayRef.current || canvasRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return toLogical(px, py);
  };

  const getCanvasPos = (e: React.PointerEvent) => {
    const el = overlayRef.current || canvasRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // The base canvas is rendered at 1:1 screen size (no CSS transform), 
    // so we must draw exactly at the screen coordinate.
    return {
      x: px,
      y: py
    };
  };

  const getCanvasSize = () => {
    const c = canvasRef.current;
    return c ? { w: c.width, h: c.height } : { w: LOGICAL_W, h: LOGICAL_H };
  };

  const pushHistory = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { w, h } = getCanvasSize();
    const data = ctx.getImageData(0, 0, w, h);
    historyStack.current = historyStack.current.slice(0, historyIdx.current + 1);
    historyStack.current.push(data);
    historyIdx.current = historyStack.current.length - 1;
  };

  const undo = () => {
    let handled = false;
    if (vectorHistoryIdx.current > 0) {
      vectorHistoryIdx.current--;
      const snapshot = vectorHistoryStack.current[vectorHistoryIdx.current];
      setFreehandStrokes(snapshot.freehandStrokes);
      setOutlineSegments(snapshot.outlineSegments);
      handled = true;
    }

    if (historyIdx.current <= 0) {
      if (handled) {
        redrawMarkers();
        redrawDrawingCanvas();
        saveCanvasImage();
      }
      return;
    }
    historyIdx.current--;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.putImageData(historyStack.current[historyIdx.current], 0, 0);
    redrawMarkers(); // re-render markers on overlay after base canvas change
    redrawDrawingCanvas();
    saveCanvasImage();
  };

  const redo = () => {
    let handled = false;
    if (vectorHistoryIdx.current < vectorHistoryStack.current.length - 1) {
      vectorHistoryIdx.current++;
      const snapshot = vectorHistoryStack.current[vectorHistoryIdx.current];
      setFreehandStrokes(snapshot.freehandStrokes);
      setOutlineSegments(snapshot.outlineSegments);
      handled = true;
    }

    if (historyIdx.current >= historyStack.current.length - 1) {
      if (handled) {
        redrawMarkers();
        redrawDrawingCanvas();
        saveCanvasImage();
      }
      return;
    }
    historyIdx.current++;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.putImageData(historyStack.current[historyIdx.current], 0, 0);
    redrawMarkers(); // re-render markers on overlay after base canvas change
    redrawDrawingCanvas();
    saveCanvasImage();
  };

  const clearCanvas = () => {
    if (!window.confirm('Clear the entire sketch including all markers?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    pushHistory();
    setMarkers([]);
    setOpenings([]);
    setGroups([]);
    saveCanvasImage();
  };

  const repairBackground = () => {
    if (!window.confirm('This will clear ONLY the background drawing layer to fix the burn-in glitch. Your markers, measurements, and auto-outline will be preserved. Continue?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    pushHistory();
    localStorage.removeItem(`sketch_canvas_${appointmentId}_${elevation}`);
    redrawMarkers();
  };

  // Init canvas — loads saved sketch strokes or starts blank
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    canvasLoadedRef.current = false;
    // Always restore saved sketch strokes
    const saved = localStorage.getItem(`sketch_canvas_${appointmentId}_${elevation}`);
    if (saved) {
      const img = new Image();
      img.onload = () => { 
        const dpr = window.devicePixelRatio || 1;
        ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr); 
        pushHistory(); 
        canvasLoadedRef.current = true;
      };
      img.src = saved;
    } else { 
      pushHistory(); 
      canvasLoadedRef.current = true;
    }
  }, [appointmentId, elevation]);

  // Debounced canvas image save — toDataURL is expensive
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCanvasImage = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      uploadSketchForExport();
    }, 150); // extremely short debounce so it catches navigation
  }, [uploadSketchForExport]);

  // ── Redraw markers on OVERLAY canvas (never touches base drawing) ──
  const redrawMarkers = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = overlay.width / dpr;
    const h = overlay.height / dpr;
    ctx.clearRect(0, 0, w, h);
    
    // Calculate dynamic marker sizes based on footprint, density, and device
    const { cw, ch, planeSize } = getTransformParams();
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const elevMarkers = markers.filter(m => (m.elevation || '1st_story') === elevation);
    
    const layoutConfig = getFieldSketchLayoutConfig({
      viewportWidth: cw,
      viewportHeight: ch,
      footprintMinSide: planeSize,
      openingCount: elevMarkers.length,
      isMobile,
      isTablet,
      zoomLevel: transform.zoom
    });

    // Render de-duplication to prevent corrupted stacked items
    const renderedIds = new Set<string>();
    
    for (const m of elevMarkers) {
      if (renderedIds.has(m.id)) {
        console.warn('Suppressed duplicate sketch render for ID:', m.id);
        continue;
      }
      renderedIds.add(m.id);
      const isSelected = m.id === selectedMarkerId;
      const isJoin = joinSelected.includes(m.id);
      const isQuoteGroup = quoteGroupSelected.includes(m.id);
      
      const sPos = toScreen(m.x, m.y);
      const renderM = { ...m, x: sPos.x, y: sPos.y };
      drawMarkerOnCanvas(ctx, renderM, {
        size: layoutConfig.markerSize,
        smallSize: layoutConfig.smallMarkerSize,
        isCompact: layoutConfig.isCompact,
        labelVisibilityMode: layoutConfig.labelVisibilityMode,
        isSelected,
        isJoinSelected: isJoin || isQuoteGroup,
        textColor: '#000000'
      });
    }
    // Draw group connectors
    for (const g of groups) {
      const gMarkers = elevMarkers.filter(m => g.memberMarkerIds.includes(m.id)).map(m => {
        const sPos = toScreen(m.x, m.y);
        return { ...m, x: sPos.x, y: sPos.y };
      });
      if (gMarkers.length >= 2) drawGroupConnector(ctx, gMarkers, g.groupType);
    }

    // ── Draw annotations ──
    const { unit: annUnit, offsetX: annOX, offsetY: annOY } = getTransformParams();
    for (const ann of annotations.filter(a => !a.sketchId || a.sketchId === sketchId)) {
      // Draw leader line if associated with a marker
      if (ann.markerId) {
        const linkedMarker = markers.find(m => m.id === ann.markerId);
        if (linkedMarker) {
          drawLeaderLine(ctx, ann, linkedMarker.x, linkedMarker.y, transform, annUnit, annOX, annOY);
        }
      }
      drawAnnotation(ctx, ann, transform, annUnit, annOX, annOY, ann.id === selectedAnnotationId, false);
    }
  };

  const redrawDrawingCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Draw saved bitmap if exists (legacy compatibility)
    const saved = localStorage.getItem(`sketch_canvas_bitmap_only_${appointmentId}_${elevation}`);
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
      };
      img.src = saved;
    }

    // Draw freehand strokes
    for (const stroke of freehandStrokes.filter(s => s.elevation === elevation)) {
      if (stroke.points.length < 2) continue;
        ctx.strokeStyle = useBlackInstallerLines ? '#000000' : stroke.color;
        ctx.lineWidth = useBlackInstallerLines ? Math.max(stroke.lineWidth, 4) : stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const p0 = toScreen(stroke.points[0].x, stroke.points[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = toScreen(stroke.points[i].x, stroke.points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Draw outline segments
    for (const seg of outlineSegments.filter(s => s.elevation === elevation)) {
      ctx.strokeStyle = '#000000'; // black outline on white screen
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const p1 = toScreen(seg.x1, seg.y1);
      const p2 = toScreen(seg.x2, seg.y2);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw active line points
    if (activeLinePoints.length > 0) {
      ctx.strokeStyle = '#60a5fa'; // blue preview
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const p0 = toScreen(activeLinePoints[0].x, activeLinePoints[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < activeLinePoints.length; i++) {
        const p = toScreen(activeLinePoints[i].x, activeLinePoints[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Draw dashed line to cursor if available
      if (previewCursor) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#93c5fd';
        const lastPt = activeLinePoints[activeLinePoints.length - 1];
        const pLast = toScreen(lastPt.x, lastPt.y);
        const pCursor = toScreen(previewCursor.x, previewCursor.y);
        ctx.beginPath();
        ctx.moveTo(pLast.x, pLast.y);
        ctx.lineTo(pCursor.x, pCursor.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw vertices
      ctx.fillStyle = '#3b82f6';
      for (const pt of activeLinePoints) {
        const p = toScreen(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw straightened preview
    if (straightenedPreview && straightenedPreview.length > 0) {
      for (const path of straightenedPreview) {
        if (path.length === 0) continue;
        ctx.save();
        ctx.beginPath();
        const p0 = toScreen(path[0].x, path[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < path.length; i++) {
          const p = toScreen(path[i].x, path[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();

        // Draw vertices
        ctx.fillStyle = '#f59e0b';
        for (const pt of path) {
          const p = toScreen(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [freehandStrokes, outlineSegments, activeLinePoints, previewCursor, straightenedPreview, elevation, transform]);

  useEffect(() => {
    redrawDrawingCanvas();
  }, [redrawDrawingCanvas]);

  useEffect(() => {
    redrawMarkersRef.current = redrawMarkers;
  }, [redrawMarkers]);

  useEffect(() => {
    redrawDrawingCanvasRef.current = redrawDrawingCanvas;
  }, [redrawDrawingCanvas]);

  const checkHit = (m: SketchMarkerData, p: {x: number, y: number}, e: React.PointerEvent) => {
    const { cw, ch, planeSize } = getTransformParams();
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const elevMarkers = markers.filter(mk => (mk.elevation || '1st_story') === elevation);
    
    const layoutConfig = getFieldSketchLayoutConfig({
      viewportWidth: cw,
      viewportHeight: ch,
      footprintMinSide: planeSize,
      openingCount: elevMarkers.length,
      isMobile,
      isTablet,
      zoomLevel: transform.zoom
    });

    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const tolerance = isTouch ? Math.max(44, layoutConfig.markerSize + 16) : (layoutConfig.markerSize + 4);

    const sPos = toScreen(m.x, m.y);
    const renderM = { ...m, x: sPos.x, y: sPos.y };
    const screenP = toScreen(p.x, p.y);
    return hitTestMarker(renderM, screenP.x, screenP.y, tolerance);
  };

  const eraseVectorAtPos = (pos: {x: number, y: number}) => {
    const thresholdSq = 25; // 5 units squared
    let changed = false;

    const nextSegments = outlineSegments.filter(seg => {
      if (seg.elevation !== elevation) return true;
      const distSq = getSqSegDist(pos, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 });
      return distSq > thresholdSq;
    });
    if (nextSegments.length !== outlineSegments.length) {
      changed = true;
      toast.info('Erased outline segment');
    }

    const nextStrokes = freehandStrokes.filter(stroke => {
      if (stroke.elevation !== elevation) return true;
      const hasClosePoint = stroke.points.some((pt: any) => getSqDist(pos, pt) < thresholdSq);
      return !hasClosePoint;
    });
    if (nextStrokes.length !== freehandStrokes.length) {
      changed = true;
      toast.info('Erased freehand stroke');
    }

    if (changed) {
      setOutlineSegments(nextSegments);
      setFreehandStrokes(nextStrokes);
      saveVectorState(nextStrokes, nextSegments);
      saveCanvasImage();
    }

    setAnnotations(prev => {
      const filtered = prev.filter(ann => {
        const distSq = getSqDist(pos, { x: ann.x, y: ann.y });
        return distSq > thresholdSq;
      });
      if (filtered.length !== prev.length) {
        toast.info('Erased note');
        saveCanvasImage();
      }
      return filtered;
    });

    setGroups(prev => {
      let changed = false;
      const next = prev.map(g => {
        const gMarkers = markers.filter(m => g.memberMarkerIds.includes(m.id) && (m.elevation || '1st_story') === elevation);
        if (gMarkers.length >= 2) {
          for (let i = 0; i < gMarkers.length - 1; i++) {
            const m1 = gMarkers[i];
            const m2 = gMarkers[i + 1];
            const distSq = getSqSegDist(pos, { x: m1.x, y: m1.y }, { x: m2.x, y: m2.y });
            if (distSq <= thresholdSq) {
              changed = true;
              setTimeout(() => {
                setOpenings(oPrev => oPrev.map(o => {
                  const memberNumbers = gMarkers.map(m => m.markerNumber);
                  if (memberNumbers.includes(o.openingNumber)) {
                    return { ...o, installMullion: false, structuralMullion: false };
                  }
                  return o;
                }));
              }, 0);
              return null;
            }
          }
        }
        return g;
      }).filter(Boolean) as MarkerGroupData[];
      if (changed) {
        toast.info('Removed mullion connection');
        saveCanvasImage();
      }
      return next;
    });
  };

  const autoNumberMarkers = useCallback(() => {
    // 1. Get all opening markers (exclude annotations)
    const openingMarkers = markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol));
    if (openingMarkers.length === 0) {
      toast.info('No windows to number.');
      return;
    }

    // 2. Compute centroid of all openings
    let cx = 0, cy = 0;
    openingMarkers.forEach(m => { cx += m.x; cy += m.y; });
    cx /= openingMarkers.length;

    // 3. Sort openings by angle counter-clockwise
    const sortedOpenings = [...openingMarkers].sort((a, b) => {
      // Math.atan2(y, x) is the angle. Screen Y goes down, so inverted Y for standard trig
      let angleA = Math.atan2(cy - a.y, a.x - cx);
      let angleB = Math.atan2(cy - b.y, b.x - cx);
      // Adjust angles to be from 0 to 2PI, starting at PI/4 (top right)
      const offset = Math.PI / 4; 
      angleA = (angleA - offset + 2 * Math.PI) % (2 * Math.PI);
      angleB = (angleB - offset + 2 * Math.PI) % (2 * Math.PI);
      return angleA - angleB; // Ascending angle = counter clockwise
    });

    // 4. Update marker numbers
    setMarkers(prev => prev.map(m => {
      if (NON_OPENING_MARKERS.includes(m.markerSymbol)) return m;
      const idx = sortedOpenings.findIndex(om => om.id === m.id);
      return { ...m, markerNumber: idx + 1 };
    }));
    
    // 5. Update openings to match new numbers
    setOpenings(prev => prev.map(o => {
      const marker = markers.find(m => m.markerNumber === o.openingNumber);
      if (!marker) return o;
      const newIdx = sortedOpenings.findIndex(om => om.id === marker.id);
      return { ...o, openingNumber: newIdx + 1 };
    }));
    
    toast.success('Successfully auto-numbered windows!');
    setHasUnsaved(true);
    localStorage.setItem('sketch_has_unsaved_' + appointmentId, 'true');
  }, [markers, appointmentId]);

  const handleCanvasDown = (e: React.PointerEvent) => {
    // ── STRICT PALM REJECTION ──
    // Reject touches with large contact geometry (e.g. resting a palm)
    if (e.pointerType === 'touch') {
      const contactSize = Math.max(e.width || 0, e.height || 0);
      if (!isFingerDrawingEnabled && contactSize > 30) {
        console.debug('Rejected palm touch', { width: e.width, height: e.height });
        return;
      }
    }

    // ── STRICT PEN HOVER REJECTION ──
    // Ignore pen events if pressure is 0 (e.g. hovering or air-clicking barrel button)
    if (e.pointerType === 'pen' && e.pressure === 0) {
      console.debug('Rejected zero-pressure pen event');
      return;
    }

    if (isInteractiveElement(e.target)) return;

    pointerStartScreen.current = { x: e.clientX, y: e.clientY };
    pointerMovedOverThreshold.current = false;

    activePointers.current.set(e.pointerId, e);
    activePointerId.current = e.pointerId;
    pointerTypeRef.current = e.pointerType as 'pen' | 'touch' | 'mouse';
    setLastPointerEvent(`down: id=${e.pointerId} type=${e.pointerType}`);

    const pos = getPos(e);
    let effectiveTool = tool;

    const isPen = isPenPointer(e);
    if (isPen) {
      lastPenTime.current = Date.now();
      const intent = getPointerIntent(e);

      if (intent.isDoubleTap && penSettings.enableDoubleTap && penSettings.enableShortcuts) {
        const sourceId = selectedMarkerId || markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol)).pop()?.id;
        if (sourceId) {
          const sourceMarker = markers.find(m => m.id === sourceId);
          if (sourceMarker) duplicateMarker(sourceMarker);
        } else {
          toast.error('Select a window first to duplicate it.');
        }
        return;
      }
      if (intent.isEraser && penSettings.enableEraser && penSettings.enableShortcuts) {
        effectiveTool = 'eraser';
        setIsHardwareErasing(true);
        isErasing.current = true;
      }
      
      if (!getMarkerSymbolFromTool(effectiveTool) && effectiveTool !== 'eraser' && effectiveTool !== 'join_mull' && effectiveTool !== 'line' && effectiveTool !== 'smart_outline' && effectiveTool !== 'select' && effectiveTool !== 'pan') {
        effectiveTool = 'pen';
      }
    }

    if (e.pointerType === 'touch') {
      // Allow two-finger pan/zoom even when pen is selected
      if (activePointers.current.size > 1) {
        effectiveTool = 'pan';
      }

      const activeArr = Array.from(activePointers.current.values());
      if (activeArr.length === 2) {
        const dx = activeArr[0].clientX - activeArr[1].clientX;
        const dy = activeArr[0].clientY - activeArr[1].clientY;
        const cx = (activeArr[0].clientX + activeArr[1].clientX) / 2;
        const cy = (activeArr[0].clientY + activeArr[1].clientY) / 2;
        initialPinchDist.current = Math.sqrt(dx*dx + dy*dy);
        initialPinchCenter.current = { x: cx, y: cy };
        initialZoom.current = transform.zoom;
        initialMapZoomOffset.current = mapZoomOffset;
        initialPan.current = { x: transform.panX, y: transform.panY };
        initialMapPan.current = { x: mapPan.x, y: mapPan.y };
        setIsPanning(false);
        setDraggingMarkerId(null);
        return;
      }

      if (!isFingerDrawingEnabled && (effectiveTool === 'pen' || effectiveTool === 'line' || effectiveTool === 'smart_outline' || effectiveTool === 'eraser' || effectiveTool === 'rect')) {
        effectiveTool = 'pan';
      }
    }

    if (activePointers.current.size > 1) return;

    const elevMarkers = markers.filter(m => (m.elevation || '1st_story') === elevation);
    const isDrawOrEraseMode = ['pen', 'line', 'smart_outline', 'eraser', 'rect'].includes(effectiveTool);

    if (!isDrawOrEraseMode && suppressMarkerSelectUntil.current < Date.now()) {
      if (notePlacementMode || textPlacementMode || effectiveTool === 'text') {
        const logPt = getPos(e);
        const isText = textPlacementMode || effectiveTool === 'text';
        const newNote = createAnnotation(appointmentId || '', logPt.x, logPt.y, sketchId || undefined, undefined, isText ? 'text' : 'bubble');
        const nearestMarkerId = findNearestMarker(logPt.x, logPt.y, elevMarkers);
        if (nearestMarkerId) newNote.markerId = nearestMarkerId;
        setAnnotations(prev => [...prev, newNote]);
        setSelectedAnnotationId(newNote.id);
        setEditingAnnotationId(newNote.id);
        setNotePlacementMode(false);
        setTextPlacementMode(false);
        if (effectiveTool === 'text') setTool('select');
        return;
      }

      {
        const el = overlayRef.current || canvasRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const hx = e.clientX - rect.left;
          const hy = e.clientY - rect.top;
          const { unit: hitUnit, offsetX: hitOX, offsetY: hitOY } = getTransformParams();
          const noteHit = hitTestAnnotations(
            annotations.filter(a => !a.sketchId || a.sketchId === sketchId),
            hx, hy, transform, hitUnit, hitOX, hitOY, selectedAnnotationId
          );
          if (noteHit) {
            if (noteHit.handle === 'body') {
              if (selectedAnnotationId === noteHit.annotationId) {
                setEditingAnnotationId(noteHit.annotationId);
              }
              setSelectedAnnotationId(noteHit.annotationId);
              setDraggingAnnotationId(noteHit.annotationId);
              setSelectedMarkerId(null);
            } else if (noteHit.handle) {
              const ann = annotations.find(a => a.id === noteHit.annotationId);
              if (ann) {
                setResizingAnnotation({
                  id: noteHit.annotationId,
                  handle: noteHit.handle,
                  startX: e.clientX, startY: e.clientY,
                  startW: ann.width, startH: ann.height,
                  startNX: ann.x, startNY: ann.y,
                });
              }
            }
            return;
          }
        }
      }

      if (quoteGroupMode) {
        const hit = elevMarkers.find(m => checkHit(m, pos, e));
        if (hit && !NON_OPENING_MARKERS.includes(hit.markerSymbol)) {
          setQuoteGroupSelected(prev =>
            prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]
          );
        }
        return;
      }

      if (effectiveTool === 'select') {
        const hit = elevMarkers.find(m => checkHit(m, pos, e));
        if (hit && !joinMode) {
          if (!NON_OPENING_MARKERS.includes(hit.markerSymbol) && hit.markerNumber == null) {
            const numbers = markers.map(m => m.markerNumber).filter(n => n != null) as number[];
            const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
            const repairedMarker = { ...hit, markerNumber: nextNum };
            setMarkers(prev => prev.map(m => m.id === hit.id ? repairedMarker : m));
            setOpenings(prev => {
              if (prev.some(o => o.openingNumber === nextNum)) return prev;
              return [...prev, createOpeningFromMarker(repairedMarker, appointmentId || '')];
            });
          }

          if (e.currentTarget.setPointerCapture) {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
          }
          // Only set selectedMarkerId on down if it is already selected (to allow dragging selected markers without glitches)
          if (selectedMarkerId === hit.id) {
            // keep it selected
          }
          setDraggingMarkerId(hit.id);
          setDragOffset({ dx: pos.x - hit.x, dy: pos.y - hit.y });
          return;
        } else {
          // Clicked empty space: deselect markers and annotations
          setSelectedMarkerId(null);
          setSelectedAnnotationId(null);
        }
      }
    }

    if (effectiveTool === 'pan') {
      if (e.currentTarget.setPointerCapture) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
      }
      e.preventDefault();
      setIsPanning(true);
      setDragOffset({ dx: pos.x, dy: pos.y });
      return;
    }

    const markerSymbol = getMarkerSymbolFromTool(effectiveTool);
    if (markerSymbol) {
      if (joinMode) {
        const hit = elevMarkers.find(m => checkHit(m, pos, e));
        if (hit && !NON_OPENING_MARKERS.includes(hit.markerSymbol)) {
          setJoinSelected(prev =>
            prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]
          );
        }
        return;
      }

      setMarkers(prev => {
        const newMarker = createMarkerData(
          `sketch_${appointmentId}`, markerSymbol, pos.x, pos.y, elevation, prev
        );
        
        if (!NON_OPENING_MARKERS.includes(markerSymbol)) {
          setTimeout(() => {
            setOpenings(oPrev => {
              if (oPrev.some(o => o.openingNumber === newMarker.markerNumber)) return oPrev;
              return [...oPrev, createOpeningFromMarker(newMarker, appointmentId || '')];
            });
            setSelectedMarkerId(newMarker.id);
            setShowPhotoPanel(true); // Auto-open photo panel!
          }, 0);
        } else {
          setTimeout(() => setSelectedMarkerId(newMarker.id), 0);
        }
        return [...prev, newMarker];
      });
      setTool('select');
      return;
    }

    if (effectiveTool === 'join_mull') {
      setJoinMode(true);
      const hit = elevMarkers.find(m => checkHit(m, pos, e));
      if (hit && !NON_OPENING_MARKERS.includes(hit.markerSymbol)) {
        setJoinSelected(prev =>
          prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]
        );
      }
      return;
    }

    if (effectiveTool === 'eraser') {
      if (e.currentTarget.setPointerCapture) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
      }
      e.preventDefault();
      const canvasPos = getCanvasPos(e);
      drawing.current = true;
      isErasing.current = true;
      startPos.current = canvasPos;
      eraseVectorAtPos(pos);
      return;
    }

    if (effectiveTool === 'pen') {
      if (e.currentTarget.setPointerCapture) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
      }
      e.preventDefault();
      const canvasPos = getCanvasPos(e);
      drawing.current = true;
      startPos.current = canvasPos;
      currentLogicalStroke.current = [pos];
      return;
    }

    if (effectiveTool === 'line' || effectiveTool === 'smart_outline') {
      const now = Date.now();
      const isDoubleTap = now - lastLineClickTime.current < 300;
      lastLineClickTime.current = now;

      if (isDoubleTap && activeLinePoints.length >= 2) {
        finishOutline();
        return;
      }

      if (e.currentTarget.setPointerCapture) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
      }
      e.preventDefault();
      
      let snapPt = { ...pos };
      if (activeLinePoints.length > 0) {
        const lastPt = activeLinePoints[activeLinePoints.length - 1];
        if (e.shiftKey || effectiveTool === 'smart_outline') {
          snapPt = snapAngle(lastPt, pos);
        }
      }

      if (activeLinePoints.length >= 3 && getSqDist(snapPt, activeLinePoints[0]) < 9) {
        const firstPt = activeLinePoints[0];
        const lastPt = activeLinePoints[activeLinePoints.length - 1];
        const newSeg = {
          id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          x1: lastPt.x, y1: lastPt.y,
          x2: firstPt.x, y2: firstPt.y,
          elevation,
          type: 'manual' as const
        };
        setOutlineSegments(prev => {
          const next = [...prev, newSeg];
          saveVectorState(freehandStrokes, next);
          return next;
        });
        setActiveLinePoints([]);
        setPreviewCursor(null);
        toast.success('Outline closed!');
        saveCanvasImage();
        return;
      }

      setActiveLinePoints(prev => {
        const next = [...prev, snapPt];
        if (next.length >= 2) {
          const p1 = next[next.length - 2];
          const p2 = next[next.length - 1];
          const newSeg = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            x1: p1.x, y1: p1.y,
            x2: p2.x, y2: p2.y,
            elevation,
            type: 'manual' as const
          };
          setOutlineSegments(s => {
            const nextSegs = [...s, newSeg];
            saveVectorState(freehandStrokes, nextSegs);
            return nextSegs;
          });
        }
        return next;
      });
      return;
    }
  };

  const handleCanvasMove = (e: React.PointerEvent) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, e);
    }
    setLastPointerEvent(`move: id=${e.pointerId} type=${e.pointerType}`);

    if (pointerStartScreen.current) {
      const dx = e.clientX - pointerStartScreen.current.x;
      const dy = e.clientY - pointerStartScreen.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        pointerMovedOverThreshold.current = true;
      }
    }

    if (e.pointerType === 'touch' && Date.now() - lastPenTime.current < 500) {
      return;
    }

    let effectiveTool = tool;
    if (isHardwareErasing) {
      effectiveTool = 'eraser';
    }
    if (e.pointerType === 'touch' && !isFingerDrawingEnabled && (effectiveTool === 'pen' || effectiveTool === 'line' || effectiveTool === 'smart_outline' || effectiveTool === 'eraser' || effectiveTool === 'rect')) {
      effectiveTool = 'pan';
    }

    const pos = getPos(e);

    if (effectiveTool === 'line' || effectiveTool === 'smart_outline') {
      let snapPt = { ...pos };
      if (activeLinePoints.length > 0) {
        const lastPt = activeLinePoints[activeLinePoints.length - 1];
        if (e.shiftKey || effectiveTool === 'smart_outline') {
          snapPt = snapAngle(lastPt, pos);
        }
      }
      setPreviewCursor(snapPt);
      return;
    }

    if (initialPinchDist.current !== null && initialPan.current !== null && activePointers.current.size >= 2) {
      const activeArr = Array.from(activePointers.current.values());
      const dx = activeArr[0].clientX - activeArr[1].clientX;
      const dy = activeArr[0].clientY - activeArr[1].clientY;
      const cx = (activeArr[0].clientX + activeArr[1].clientX) / 2;
      const cy = (activeArr[0].clientY + activeArr[1].clientY) / 2;
      
      const dist = Math.sqrt(dx*dx + dy*dy);
      const scale = dist / initialPinchDist.current;
      
      const pcx = initialPinchCenter.current?.x ?? cx;
      const pcy = initialPinchCenter.current?.y ?? cy;
      const panDx = cx - pcx;
      const panDy = cy - pcy;
      
      if (!mapLocked) {
        let newMapZoom = initialMapZoomOffset.current * scale;
        newMapZoom = Math.max(0.2, Math.min(newMapZoom, 5));
        setMapZoomOffset(newMapZoom);
        
        if (initialMapPan.current) {
          setMapPan({
            x: initialMapPan.current.x + panDx,
            y: initialMapPan.current.y + panDy
          });
        }
      } else {
        let newZoom = initialZoom.current * scale;
        newZoom = Math.max(0.5, Math.min(newZoom, 4));
        setTransform(prev => ({ 
          ...prev, 
          zoom: newZoom,
          panX: initialPan.current!.x + panDx,
          panY: initialPan.current!.y + panDy
        }));
      }
      return;
    }

    if (isPanning) {
      const pPos = getPos(e);
      if (mapLocked) {
        setTransform(prev => ({
          ...prev,
          panX: prev.panX + (pPos.x - dragOffset.dx) * prev.zoom,
          panY: prev.panY + (pPos.y - dragOffset.dy) * prev.zoom
        }));
      } else {
        setMapPan(prev => ({
          x: prev.x + (pPos.x - dragOffset.dx) * transform.zoom,
          y: prev.y + (pPos.y - dragOffset.dy) * transform.zoom
        }));
      }
      setDragOffset({ dx: pPos.x, dy: pPos.y });
      return;
    }

    if (draggingMarkerId && effectiveTool === 'select') {
      const pPos = getPos(e);
      setMarkers(prev => prev.map(m => m.id === draggingMarkerId ? {
        ...m,
        x: pPos.x - dragOffset.dx,
        y: pPos.y - dragOffset.dy
      } : m));
      return;
    }

    if (draggingAnnotationId && effectiveTool === 'select') {
      const pPos = getPos(e);
      setAnnotations(prev => prev.map(ann => ann.id === draggingAnnotationId ? {
        ...ann,
        x: pPos.x,
        y: pPos.y
      } : ann));
      return;
    }

    if (resizingAnnotation && effectiveTool === 'select') {
      const dx = e.clientX - resizingAnnotation.startX;
      const dy = e.clientY - resizingAnnotation.startY;
      const { unit } = getTransformParams();
      const ldx = dx / (unit * transform.zoom);
      const ldy = dy / (unit * transform.zoom);
      
      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== resizingAnnotation.id) return ann;
        let newW = resizingAnnotation.startW;
        let newH = resizingAnnotation.startH;
        let newX = ann.x;
        let newY = ann.y;

        if (resizingAnnotation.handle.includes('r')) newW = Math.max(40, resizingAnnotation.startW + ldx);
        if (resizingAnnotation.handle.includes('b')) newH = Math.max(30, resizingAnnotation.startH + ldy);
        if (resizingAnnotation.handle.includes('l')) {
          const potentialW = resizingAnnotation.startW - ldx;
          if (potentialW >= 40) {
            newW = potentialW;
            newX = resizingAnnotation.startNX + ldx;
          }
        }
        if (resizingAnnotation.handle.includes('t')) {
          const potentialH = resizingAnnotation.startH - ldy;
          if (potentialH >= 30) {
            newH = potentialH;
            newY = resizingAnnotation.startNY + ldy;
          }
        }
        return { ...ann, x: newX, y: newY, width: newW, height: newH };
      }));
      return;
    }

    if (!drawing.current) return;

    // Failsafe: if pen lifted but pointerup missed, don't draw in air
    if (e.pointerType === 'pen' && e.pressure === 0) return;

    // Failsafe palm rejection during move
    if (e.pointerType === 'touch' && !isFingerDrawingEnabled && Math.max(e.width || 0, e.height || 0) > 30) return;

    if (effectiveTool === 'pen') {
      currentLogicalStroke.current.push(pos);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && startPos.current) {
        const canvasPos = getCanvasPos(e);
          ctx.strokeStyle = useBlackInstallerLines ? '#000000' : color;
          ctx.lineWidth = useBlackInstallerLines ? Math.max(lineWidth, 4) : lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(canvasPos.x, canvasPos.y);
        ctx.stroke();
        startPos.current = canvasPos;
      }
    } else if (effectiveTool === 'eraser') {
      eraseVectorAtPos(pos);
    }
  };

  const handleCanvasUp = (e: React.PointerEvent) => {
    setLastPointerEvent(`up: id=${e.pointerId} type=${e.pointerType}`);

    if (e.currentTarget.releasePointerCapture) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { console.debug("[swallowed error]", err); }
    }

    activePointers.current.delete(e.pointerId);
    if (activePointerId.current === e.pointerId) {
      activePointerId.current = null;
      pointerTypeRef.current = null;
    }

    if (activePointers.current.size < 2) {
      initialPinchDist.current = null;
      initialPan.current = null;
    }

    if (isHardwareErasing) {
      setIsHardwareErasing(false);
    }
    isErasing.current = false;
    
    if (isPanning && activePointers.current.size === 0) {
      setIsPanning(false);
      suppressMarkerSelectUntil.current = Date.now() + 250;
      return;
    }

    if (draggingMarkerId && activePointers.current.size === 0) {
      const moved = pointerMovedOverThreshold.current;
      setDraggingMarkerId(null);
      persist();
      suppressMarkerSelectUntil.current = Date.now() + 250;
      if (!moved) {
        setSelectedMarkerId(draggingMarkerId);
      }
      return;
    }

    if (draggingAnnotationId) {
      setDraggingAnnotationId(null);
      persist();
      suppressMarkerSelectUntil.current = Date.now() + 250;
      return;
    }

    if (resizingAnnotation) {
      setResizingAnnotation(null);
      persist();
      suppressMarkerSelectUntil.current = Date.now() + 250;
      return;
    }

    if (!drawing.current) return;
    drawing.current = false;

    let effectiveTool = tool;
    if (e.pointerType === 'touch' && !isFingerDrawingEnabled) {
      effectiveTool = 'pan';
    }

    if (effectiveTool === 'pen' && currentLogicalStroke.current.length > 1) {
      const newStroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        points: [...currentLogicalStroke.current],
        color,
        lineWidth,
        elevation
      };
      setFreehandStrokes(prev => {
        const next = [...prev, newStroke];
        saveVectorState(next, outlineSegments);
        return next;
      });
      lastFreehandStroke.current = [...currentLogicalStroke.current];
      currentLogicalStroke.current = [];
    }

    suppressMarkerSelectUntil.current = Date.now() + 250;
    pushHistory();
    saveCanvasImage();
  };

  // ── Marker updates ─────────────────────────────────────
  const updateMarker = (updates: Partial<SketchMarkerData>) => {
    if (!selectedMarkerId) return;
    setMarkers(prev => prev.map(m => m.id === selectedMarkerId ? { ...m, ...updates } : m));
    // Sync to opening
    const marker = markers.find(m => m.id === selectedMarkerId);
    if (marker && marker.markerNumber) {
      setOpenings(prev => prev.map(o => {
        if (o.openingNumber !== marker.markerNumber) return o;
        const sync: any = {};
        if (updates.width !== undefined) sync.width = updates.width;
        if (updates.height !== undefined) sync.height = updates.height;
        if (updates.roomLocation !== undefined) sync.roomLocation = updates.roomLocation;
        if (updates.elevation !== undefined) sync.elevation = updates.elevation;
        if (updates.floorNumber !== undefined) sync.floorNumber = updates.floorNumber;
        if (updates.windowType !== undefined) sync.productCategory = updates.windowType;
        if (updates.unitedInches !== undefined) sync.unitedInches = updates.unitedInches;
        if (updates.exteriorMaterial !== undefined) sync.exteriorType = updates.exteriorMaterial;
        if (updates.removalType !== undefined) sync.removalType = updates.removalType;
        if (updates.installType !== undefined) sync.installType = updates.installType;
        if (updates.markerNumber !== undefined) sync.openingNumber = updates.markerNumber;
        return { ...o, ...sync };
      }));
    }
  };

  const updateOpening = (fields: Record<string, any>) => {
    const marker = markers.find(m => m.id === selectedMarkerId);
    if (!marker || !marker.markerNumber) return;
    setOpenings(prev => prev.map(o =>
      o.openingNumber === marker.markerNumber ? { ...o, ...fields } : o
    ));
  };

  const deleteMarker = () => {
    if (!selectedMarkerId) return;
    const marker = markers.find(m => m.id === selectedMarkerId);
    // Remove marker and compact-renumber remaining markers
    setMarkers(prev => {
      const after = prev.filter(m => m.id !== selectedMarkerId);
      const { renumbered, changed } = compactRenumberMarkers(after);
      return changed ? renumbered : after;
    });
    if (marker?.markerNumber) {
      setOpenings(prev => {
        const openingToDelete = prev.find(o => o.openingNumber === marker.markerNumber);
        if (openingToDelete) {
          enqueueOutboxItem({
            companyId: appointment?.companyId || '',
            userId: appointment?.userId || '',
            entityType: 'opening',
            entityLocalId: openingToDelete.id || `local_opening_${Date.now()}_${openingToDelete.openingNumber}`,
            entityCloudId: openingToDelete.id?.startsWith('local_') ? undefined : openingToDelete.id,
            appointmentId: appointmentId || '',
            operation: 'delete',
            payload: { id: openingToDelete.id }
          }).catch(console.error);
        }
        return prev.filter(o => o.openingNumber !== marker.markerNumber);
      });
    }
    // Clean up group membership
    if (marker?.groupId) {
      setGroups(prev => prev.map(g => ({
        ...g,
        memberMarkerIds: g.memberMarkerIds.filter(id => id !== selectedMarkerId),
      })).filter(g => g.memberMarkerIds.length >= 2));
    }
    setSelectedMarkerId(null);
    toast.success(`Deleted #${marker?.markerNumber || 'marker'}`);
  };

  const handleJoinConfirm = (groupData: Omit<MarkerGroupData, 'id'>) => {
    const newGroup: MarkerGroupData = { ...groupData, id: `grp_${Date.now()}` };
    setGroups(prev => [...prev, newGroup]);
    setMarkers(prev => prev.map(m =>
      newGroup.memberMarkerIds.includes(m.id) ? { ...m, groupId: newGroup.id } : m
    ));

    // Propagate mullion properties to member openings
    if (newGroup.groupType === 'mull_pair' || newGroup.groupType.startsWith('mull')) {
      const memberNumbers = markers
        .filter(m => newGroup.memberMarkerIds.includes(m.id))
        .map(m => m.markerNumber)
        .filter((n): n is number => n !== null);

      setOpenings(oPrev => oPrev.map(o => {
        if (memberNumbers.includes(o.openingNumber)) {
          return {
            ...o,
            installMullion: true,
            structuralMullion: newGroup.mullType === 'structural',
          };
        }
        return o;
      }));
    }

    setJoinMode(false);
    setJoinSelected([]);
  };

  // ── Quick Add / Duplicate Similar ──────────────────────
  const duplicateMarker = (sourceMarker: SketchMarkerData) => {
    setMarkers(prev => {
      const nextNum = getNextMarkerNumber(prev);
      const newMarker: SketchMarkerData = {
        ...sourceMarker,
        id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        markerNumber: nextNum,
        markerLabel: `X #${nextNum}`,
        linkedOrderRowNumber: nextNum,
        x: sourceMarker.x + 60,
        y: sourceMarker.y + 30,
        measurementConfirmed: false,
        safetyConfirmed: false,
        copiedFromId: sourceMarker.id,
        validationStatus: 'incomplete',
        pricingStatus: 'pending',
        groupId: null,
      };
      
      setOpenings(oPrev => {
        const sourceOpening = oPrev.find(o => o.openingNumber === sourceMarker.markerNumber);
        const newOpening = createOpeningFromMarker(newMarker, appointmentId || '');
        
        // Deep copy details from source opening, if it exists
        if (sourceOpening) {
          const fieldsToCopy = [
            'productCategory', 'productModel', 'seriesModel', 'interiorColor', 'exteriorColor', 
            'gridStyle', 'glassPackage', 'temperedGlass', 'obscureGlass', 'argon', 'foamEnhanced', 
            'lowEPackage', 'screenOption', 'nailFin', 'oriel', 'horizontalRR', 'hinge', 'exteriorType', 
            'removalType', 'installType', 'gridPattern', 'gridProfile', 'gridVerticalCount', 
            'gridHorizontalCount', 'gridPlacement', 'gridNotes', 'exteriorSurface', 'exteriorConditionNotes',
            'requiresTrimHeader', 'requiresSpecialHandling'
          ];
          for (const field of fieldsToCopy) {
            if (sourceOpening[field] !== undefined) {
              newOpening[field] = sourceOpening[field];
            }
          }
        }

        newOpening.copiedFromOpeningId = sourceMarker.id;
        newOpening.measurementConfirmed = false;
        newOpening.safetyConfirmed = false;
        return [...oPrev, newOpening];
      });
      
      setTimeout(() => setSelectedMarkerId(newMarker.id), 0);
      toast.success(`Duplicated → #${nextNum} — confirm measurements`);
      
      return [...prev, newMarker];
    });
  };

  // ── Set Elevation Default ──────────────────────────────
  const setElevationDefault = (elev: string, field: string, value: any) => {
    setElevationDefaults(prev => ({
      ...prev,
      [elev]: { ...(prev[elev] || {}), [field]: value },
    }));
  };

  const getElevationDefault = (elev: string, field: string): any => {
    return elevationDefaults[elev]?.[field] ?? undefined;
  };

  const handleAutoFill = () => {
    if (!selectedMarkerId) return;
    const marker = markers.find(m => m.id === selectedMarkerId);
    const opening = openings.find(o => o.openingNumber === marker?.markerNumber);
    if (!marker || !opening) return;
    
    // Find neighbors on the same elevation
    const neighbors = markers.filter(m => 
      m.elevation === marker.elevation && 
      m.id !== marker.id && 
      !NON_OPENING_MARKERS.includes(m.markerSymbol)
    );
    
    if (neighbors.length === 0) {
      toast.info('No other openings on this elevation to auto-fill.');
      return;
    }
    
    if (!window.confirm(`Auto-copy grids, colors, sizes, and glass package to ${neighbors.length} other openings on the ${marker.elevation} elevation?`)) return;

    setMarkers(prev => prev.map(m => {
      if (m.elevation === marker.elevation && m.id !== marker.id && !NON_OPENING_MARKERS.includes(m.markerSymbol)) {
        return {
          ...m,
          width: m.width || marker.width,
          height: m.height || marker.height,
          windowType: m.windowType || marker.windowType,
          roomLocation: m.roomLocation || marker.roomLocation,
          unitedInches: (!m.width || !m.height) ? marker.unitedInches : m.unitedInches,
          validationStatus: (!m.width || !m.height) ? marker.validationStatus : m.validationStatus,
        };
      }
      return m;
    }));

    setOpenings(prev => prev.map(o => {
      const parentMarker = markers.find(m => m.markerNumber === o.openingNumber);
      if (parentMarker && parentMarker.elevation === marker.elevation && parentMarker.id !== marker.id && !NON_OPENING_MARKERS.includes(parentMarker.markerSymbol)) {
        return {
          ...o,
          width: o.width || opening.width,
          height: o.height || opening.height,
          productCategory: o.productCategory || opening.productCategory,
          interiorColor: o.interiorColor || opening.interiorColor,
          exteriorColor: o.exteriorColor || opening.exteriorColor,
          gridStyle: o.gridStyle || opening.gridStyle,
          glassPackage: o.glassPackage || opening.glassPackage,
          screenOption: o.screenOption || opening.screenOption,
          foamEnhanced: o.foamEnhanced ?? opening.foamEnhanced,
        };
      }
      return o;
    }));

    toast.success(`Project Autocomplete applied to ${neighbors.length} openings.`);
  };

  const selectedMarker = useMemo(() => markers.find(m => m.id === selectedMarkerId), [markers, selectedMarkerId]);
  const selectedOpening = useMemo(() => selectedMarker ? openings.find(o => o.openingNumber === selectedMarker.markerNumber) : null, [selectedMarker, openings]);
  // FIX 1: elevation filter uses normalized lowercase — markers are always stored lowercase now
  const elevMarkers = useMemo(() => markers.filter(m => (m.elevation || '1st_story') === elevation), [markers, elevation]);
  const openingMarkerCount = useMemo(() => elevMarkers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol)).length, [elevMarkers]);
  // FIX 4: drawnCount = markers on current elevation (not all elevations)
  const drawnCount = useMemo(() => elevMarkers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol)).length, [elevMarkers]);
  const totalOpeningMarkerCount = useMemo(() => markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol)).length, [markers]);
  // Keep legacy name for anything referencing it below
  const totalMarkerCount = totalOpeningMarkerCount;
  const blockers = useMemo(() => warnings.filter(w => w.severity === 'blocker'), [warnings]);
  const customer = appointment?.customer;

  return (
    <div className="sketch-fullscreen" style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', overflow: 'hidden',
      touchAction: 'none', overscrollBehavior: 'none',
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      boxSizing: 'border-box',
    }}>
      <UpdateBanner />

      {/* ── Compact Header ── */}
      {!fullScreenFocus && (
        <div className="sketch-header-compact" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.35rem 0.5rem', flexShrink: 0, gap: '0.25rem',
          background: 'var(--royal)', borderBottom: '1px solid rgba(255,255,255,0.15)',
          minHeight: 44, flexWrap: 'wrap'
        }}>
          {/* Left: Exit button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: '140px', flex: '1 1 auto' }}>
            <button onClick={() => {
              if (hasUnsaved && !window.confirm('You have unsaved changes. Leave anyway?')) return;
              if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
                navigate(isMobileUA ? '/mobile' : `/appointments/${appointmentId}`);
              }
            }} style={{
              padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.16)', cursor: 'pointer', color: '#fff', fontSize: '0.8rem',
              minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, gap: '0.15rem'
            }}>
              <span>←</span> <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Exit</span>
            </button>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {customer ? `${customer.lastName}` : 'Sketch'}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {totalOpeningMarkerCount} of {openings.length} drawn
              </span>
            </div>
          </div>

          {/* Center: Segmented Elevation Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            padding: 2,
            gap: 2,
            flexShrink: 0,
          }}>
            {['1st_story', '2nd_story'].map(elev => {
              const cnt = markers.filter(m => (normalizeElevation(m.elevation)) === elev && !NON_OPENING_MARKERS.includes(m.markerSymbol)).length;
              const active = elevation === elev;
              return (
                <button
                  key={elev}
                  onClick={() => { setElevation(elev); setSelectedMarkerId(null); }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? 'var(--royal)' : 'rgba(255,255,255,0.8)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {elev === '1st_story' ? '1st Story' : '2nd Story'}{cnt > 0 ? ` (${cnt})` : ''}
                </button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
            <select
              value={sketchSourceMode}
              onChange={(e) => {
                const newMode = e.target.value;
                setSketchSourceMode(newMode);
                if (newMode === 'blank_canvas') {
                  setOutlineSegments([]);
                  saveVectorState(freehandStrokes, []); // save state for undo stack
                }
                if (sketchId) {
                  api.put('/sketches/' + sketchId, { sketchSourceMode: newMode }).catch(err => console.error(err));
                }
              }}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: '0.75rem',
                cursor: 'pointer',
                minHeight: 36,
                marginRight: '0.25rem',
                maxWidth: '150px',
                textOverflow: 'ellipsis'
              }}
            >
              <option value="blank_canvas">Blank / Draw Myself</option>
              <option value="map_outline_only">Use Map House Outline</option>
              <option value="map_plus_manual">Use Map + My Drawing</option>
              <option value="street_view_reference_only">Use Street View Reference</option>
            </select>

            <button type="button" onClick={() => setShowPanels(!showPanels)} style={{
              padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer',
              background: showPanels ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.16)', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>☰</button>
            <button type="button" onClick={() => {
              guardedSave(async () => {
                const baseCanvas = canvasRef.current;
                const overlayCanvas = overlayRef.current;
                
                if (baseCanvas) {
                  localStorage.setItem(`sketch_canvas_${appointmentId}_${elevation}`, baseCanvas.toDataURL('image/webp', 0.5));
                }

                if (baseCanvas && overlayCanvas) {
                  uploadSketchForExport(baseCanvas, overlayCanvas, true);
                }
                localStorage.setItem(`sketch_field_${appointmentId}`, JSON.stringify({
                  markers, groups, freehandStrokes, outlineSegments,
                  outlineConfirmed, mapOpacity, mapLocked, mapPan, mapZoomOffset
                }));
                if (appointmentId) {
                  try {
                    await api.batchSyncOpenings({ appointmentId, openings });
                    if (sketchId) {
                      await api.post(`/sketches/${sketchId}/markers`, { markers });
                    }
                  } catch (err: any) {
                    if (err.isOffline || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network')) {
                      toast.success('Saved locally (Offline)');
                    } else {
                      console.error('Failed to sync openings or sketch to backend:', err);
                      toast.error('Failed to save: ' + (err.message || 'Server Error'));
                      throw err;
                    }
                  }
                }
                setSelectedMarkerId(null);
                setShowPanels(false);
                setHasUnsaved(false);
                  localStorage.removeItem('sketch_has_unsaved_' + appointmentId);
              });
            }} style={{
              padding: '0.35rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'var(--ok)', color: '#fff',
              fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem',
              minHeight: 36,
            }}>
              {saveState === 'idle' ? '💾 Save' : <SaveStateIndicator state={saveState} lastSaved={lastSaved} errorMsg={errorMsg} onRetry={() => {}} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar (auto-collapses in landscape mobile) ── */}
      {toolbarCollapsed ? (
        <div className="sketch-toolbar-wrap" style={{ flexShrink: 0, padding: '0.15rem 0.25rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button onClick={() => setToolbarCollapsed(false)} style={{
            padding: '0.25rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--text)', fontSize: '0.7rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>Tools ▾</button>
          <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{tool}</span>
        </div>
      ) : (
        <div className="sketch-toolbar-wrap" style={{ flexShrink: 0, padding: '0.2rem 0.25rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {window.innerHeight < 500 && (
            <button onClick={() => setToolbarCollapsed(true)} style={{
              position: 'absolute', top: 2, right: 4, zIndex: 5,
              padding: '0.15rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', fontSize: '0.6rem', fontWeight: 700,
              cursor: 'pointer',
            }}>▲ Hide</button>
          )}
          <SketchSymbolToolbar
            activeTool={tool}
            onToolChange={t => {
              setTool(t);
              setSelectedMarkerId(null);
              if (t === 'join_mull') { setJoinMode(true); setJoinSelected([]); }
              else if (joinMode) { setJoinMode(false); setJoinSelected([]); }
              // Auto-collapse in landscape after selecting a tool
              if (window.innerHeight < 500) setToolbarCollapsed(true);
            }}
            onUndo={undo} onRedo={redo} onClear={clearCanvas}
            joinMode={joinMode} selectedForJoinCount={joinSelected.length}
            compact
          />
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', padding: '0.2rem 0', flexWrap: 'wrap' }}>
            <button onClick={fitAll} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              ⛶ Fit All
            </button>
            <button onClick={autoArrange} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              ▤ Arrange
            </button>
            <button onClick={autoRenumberWindows} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              1️⃣ Auto-Number
            </button>
            <button 
              onClick={() => {
                setQuoteGroupMode(!quoteGroupMode);
                if (!quoteGroupMode) {
                  setQuoteGroupSelected([]);
                  setTool('pen');
                  setSelectedMarkerId(null);
                  setJoinMode(false);
                }
              }}
              style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: quoteGroupMode ? '#8b5cf6' : 'var(--card)', border: `1px solid ${quoteGroupMode ? '#8b5cf6' : 'var(--border)'}`, color: quoteGroupMode ? '#fff' : 'var(--text)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {quoteGroupMode ? 'Cancel Selection' : '➕ Quote Group'}
            </button>
            <button
              onClick={() => setShowQuoteGroupsPanel(true)}
              style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Quote Groups Panel
            </button>
            {/* FIX 6: Rebuild markers for openings that exist in DB but have no canvas marker */}
            {openings.length > totalOpeningMarkerCount && (
              <button onClick={rebuildMissingMarkers} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'var(--amber)', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                ⟳ Rebuild {openings.length - totalOpeningMarkerCount} Missing
              </button>
            )}
            <button onClick={autoNumberMarkers} style={{ padding: '0.375rem 0.75rem', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
              🔢 Auto-Number (CCW)
            </button>
            <button
              onClick={() => { setNotePlacementMode(!notePlacementMode); setTextPlacementMode(false); setSelectedMarkerId(null); setSelectedAnnotationId(null); }}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                border: notePlacementMode ? '2px solid #FFEB3B' : '1px solid var(--border)',
                background: notePlacementMode ? 'rgba(255,235,59,0.15)' : 'var(--bg-card)',
                color: notePlacementMode ? '#FFEB3B' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.75rem',
              }}
            >
              📝 Note
            </button>
          </div>
        </div>
      )}

      {/* ── Workspace: Canvas + Side Panel ── */}
      <div className={[
        'sketch-workspace',
        (selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol)) || showValidation ? 'has-side-panel' : '',
        showOutlinePanel ? 'has-outline-panel' : '',
      ].filter(Boolean).join(' ')}>
        
        {/* ── Canvas — fills remaining viewport ── */}
        <div ref={canvasWrapRef} className="sketch-canvas-wrap" style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: '#ffffff',
          backgroundImage: canvasBgUrl ? `url(${canvasBgUrl})` : undefined,
          backgroundSize: canvasRef.current ? `${Math.min(canvasRef.current.width/(window.devicePixelRatio||1), canvasRef.current.height/(window.devicePixelRatio||1)) * transform.zoom}px` : 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `calc(50% + ${transform.panX}px) calc(50% + ${transform.panY}px)`,
          minHeight: 0, minWidth: 0,
        }}>

        {/* ── Floating Controls ── */}
        {!showOutlinePanel && (
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => setFullScreenFocus(!fullScreenFocus)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.35rem', background: fullScreenFocus ? 'rgba(59,130,246,0.9)' : 'rgba(15,23,42,0.85)',
                border: `1px solid ${fullScreenFocus ? '#3b82f6' : '#334155'}`, borderRadius: '8px',
                color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)',
                width: 34, height: 34
              }}
              title={fullScreenFocus ? "Exit Full Screen" : "Full Screen Focus"}
            >
              {fullScreenFocus ? '⤡' : '⤢'}
            </button>
            <button
              onClick={() => setShowOutlinePanel(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                background: canvasBgUrl ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.85)',
                border: `1px solid ${canvasBgUrl ? '#60a5fa' : '#3b82f6'}`,
                borderRadius: '8px',
                color: canvasBgUrl ? '#bfdbfe' : '#93c5fd',
                fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              🏠 House Outline{canvasBgUrl ? ' ✓' : ''}
            </button>
            {canvasBgUrl && (
              <button
                onClick={() => {
                  setCanvasBgUrl('');
                  if (appointmentId) {
                    localStorage.removeItem(`sketch_canvas_bg_${appointmentId}_${elevation}`);
                    localStorage.removeItem(`sketch_canvas_bg_${appointmentId}`);
                  }
                }}
                title="Remove aerial background"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.35rem 0.6rem',
                  background: 'rgba(239,68,68,0.85)',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {/* FIX 5: Empty state — shown when the selected elevation has no markers but others do */}
        {elevMarkers.length === 0 && totalOpeningMarkerCount > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12, padding: '1rem 1.5rem',
            color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600,
            textAlign: 'center', pointerEvents: 'none', zIndex: 8, maxWidth: 280,
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🪟</div>
            <div style={{ color: '#e2e8f0', marginBottom: '0.25rem' }}>
              No openings on {elevation === '1st_story' ? '1st Story' : '2nd Story'}
              {elevation === '2nd_story' && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Use this only if the job has second-story openings.</div>}
            </div>
            <div style={{ fontSize: '0.72rem' }}>
              {['1st_story', '2nd_story'].filter(e => markers.some(m => normalizeElevation(m.elevation) === e && !NON_OPENING_MARKERS.includes(m.markerSymbol)))
                .map(e => e === '1st_story' ? '1st Story' : '2nd Story')
                .join(', ')} {totalOpeningMarkerCount === 1 ? 'has' : 'have'} openings — tap those tabs to view.
            </div>
          </div>
        )}
        {/* FIX 5: Empty state — no markers at all */}
        {elevMarkers.length === 0 && totalOpeningMarkerCount === 0 && openings.length > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 12, padding: '1rem 1.5rem',
            color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600,
            textAlign: 'center', pointerEvents: 'none', zIndex: 8, maxWidth: 300,
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <div style={{ color: '#fde68a', marginBottom: '0.4rem' }}>{openings.length} openings have no canvas markers</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tap ⟳ Rebuild Missing in the toolbar to place them.</div>
          </div>
        )}

        {/* ── Floating tap hint — shows when markers exist and none selected ── */}
        {elevMarkers.length > 0 && !selectedMarkerId && !draggingMarkerId && (
          <div style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 20, padding: '0.4rem 1rem',
            color: '#93c5fd', fontSize: '0.72rem', fontWeight: 600,
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 8,
          }}>
            👆 Tap a window to edit specs · Drag to reposition
          </div>
        )}

        {/* Floating Opacity and Lock Controls */}
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
          padding: '0.35rem 0.6rem', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 600 }}>Map Opacity:</span>
          <input
            type="range" min="0" max="1" step="0.1"
            value={mapOpacity}
            onChange={e => setMapOpacity(parseFloat(e.target.value))}
            style={{ width: 60, height: 4, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', width: 24, textAlign: 'right' }}>{Math.round(mapOpacity * 100)}%</span>
          
          {/* Zoom Buttons */}
          <button
            onClick={() => {
              if (!mapLocked) {
                setMapZoomOffset(prev => Math.min(5, prev * 1.15));
              } else {
                setTransform(prev => ({ ...prev, zoom: Math.min(6, prev.zoom * 1.15) }));
              }
            }}
            style={{
              width: 22, height: 22, borderRadius: 4,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}
            title="Zoom In"
          >
            ＋
          </button>
          <button
            onClick={() => {
              if (!mapLocked) {
                setMapZoomOffset(prev => Math.max(0.2, prev / 1.15));
              } else {
                setTransform(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom / 1.15) }));
              }
            }}
            style={{
              width: 22, height: 22, borderRadius: 4,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}
            title="Zoom Out"
          >
            －
          </button>
          {!mapLocked && bgMapData && (
            <>
              <button
                onClick={() => {
                  const newRot = ((bgMapData.rotationDegrees || 0) - 15) % 360;
                  const newData = { ...bgMapData, rotationDegrees: newRot };
                  setBgMapData(newData);
                  if (appointmentId) {
                    localStorage.setItem(`sketch_canvas_${appointmentId}_${elevation}_bgMap`, JSON.stringify(newData));
                  }
                }}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}
                title="Rotate Left"
              >
                ↺
              </button>
              <button
                onClick={() => {
                  const newRot = ((bgMapData.rotationDegrees || 0) + 15) % 360;
                  const newData = { ...bgMapData, rotationDegrees: newRot };
                  setBgMapData(newData);
                  if (appointmentId) {
                    localStorage.setItem(`sketch_canvas_${appointmentId}_${elevation}_bgMap`, JSON.stringify(newData));
                  }
                }}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}
                title="Rotate Right"
              >
                ↻
              </button>
            </>
          )}


          <button
            onClick={() => setMapLocked(prev => !prev)}
            style={{
              padding: '0.15rem 0.35rem', borderRadius: 4,
              background: mapLocked ? 'var(--blue)' : '#ef4444',
              border: 'none', color: '#fff', fontSize: '0.65rem',
              fontWeight: 800, cursor: 'pointer'
            }}
          >
            {mapLocked ? '🔒 Map Locked' : '🔓 Map Free'}
          </button>
        </div>


        {/* Straighten/Smooth Outline Preview Banner */}
        {straightenedPreview && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
            border: '2px solid #f59e0b', borderRadius: 12, padding: '0.75rem 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center',
            zIndex: 30, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', maxWidth: 360,
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fde68a' }}>
              📐 Straighten Outline Preview
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setStraightenedPreview(null);
                  toast.info('Kept original freehand stroke.');
                }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #475569', background: '#1e293b', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Keep Original
              </button>
              <button
                onClick={() => {
                  const segments: any[] = [];
                  for (const path of straightenedPreview) {
                    for (let i = 0; i < path.length - 1; i++) {
                      segments.push({
                        id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
                        x1: path[i].x, y1: path[i].y,
                        x2: path[i + 1].x, y2: path[i + 1].y,
                        elevation,
                        type: 'manual' as const
                      });
                    }
                  }
                  setOutlineSegments(prev => {
                    const next = [...prev, ...segments];
                    const remainingStrokes = freehandStrokes.filter(s => s.elevation !== elevation);
                    saveVectorState(remainingStrokes, next);
                    return next;
                  });
                  setFreehandStrokes(prev => prev.filter(s => s.elevation !== elevation));
                  setStraightenedPreview(null);
                  toast.success('Outline straightened successfully!');
                  saveCanvasImage();
                }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Use Straightened
              </button>
              <button
                onClick={() => {
                  const segments: any[] = [];
                  for (const path of straightenedPreview) {
                    for (let i = 0; i < path.length - 1; i++) {
                      segments.push({
                        id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
                        x1: path[i].x, y1: path[i].y,
                        x2: path[i + 1].x, y2: path[i + 1].y,
                        elevation,
                        type: 'manual' as const
                      });
                    }
                  }
                  setOutlineSegments(prev => {
                    const next = [...prev, ...segments];
                    saveVectorState(freehandStrokes, next);
                    return next;
                  });
                  setStraightenedPreview(null);
                  toast.success('Kept both raw and straightened paths!');
                  saveCanvasImage();
                }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #f59e0b', background: 'transparent', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Keep Both
              </button>
            </div>
          </div>
        )}

        {/* Suggested Outline Confirmation Banner */}
        {outlineSegments.some(s => s.type === 'auto') && !outlineConfirmed && (
          <div style={{
            position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
            border: '2px solid #ef4444', borderRadius: 12, padding: '0.6rem 1rem',
            display: 'flex', gap: '0.75rem', alignItems: 'center', zIndex: 30,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)', maxWidth: 360,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fca5a5' }}>
                ⚠️ Suggested Outline — confirm before using
              </span>
              <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                Auto-generated outline must be verified before final export.
              </span>
            </div>
            <button
              onClick={() => {
                setOutlineConfirmed(true);
                toast.success('Outline confirmed!');
              }}
              style={{
                padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: '0.7rem',
                fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Confirm
            </button>
          </div>
        )}

        {/* Floating Straighten Outline Button */}
        {freehandStrokes.some(s => s.elevation === elevation) && !straightenedPreview && (
          <button
            onClick={() => {
              const strokesToStraighten = freehandStrokes.filter(s => s.elevation === elevation);
              if (strokesToStraighten.length === 0) {
                toast.warning('No freehand strokes to straighten.');
                return;
              }
              const allSnappedPaths: { x: number; y: number }[][] = [];
              for (const stroke of strokesToStraighten) {
                if (stroke.points.length < 3) continue;
                const simplified = simplifyRDP(stroke.points, 3);
                const snapped: { x: number; y: number }[] = [];
                for (let i = 0; i < simplified.length; i++) {
                  if (i === 0) {
                    snapped.push(simplified[0]);
                  } else {
                    const p1_orig = simplified[i - 1];
                    const p2_orig = simplified[i];
                    const p1_snapped = snapped[i - 1];
                    
                    const dx = p2_orig.x - p1_orig.x;
                    const dy = p2_orig.y - p1_orig.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
                    const snapThreshold = 20;
                    const normalizedAngle = angle < 0 ? angle + 360 : angle;
                    
                    let wasSnapped = false;
                    for (const a of snapAngles) {
                      if (Math.abs(normalizedAngle - a) <= snapThreshold || Math.abs(normalizedAngle - a + 360) <= snapThreshold || Math.abs(normalizedAngle - a - 360) <= snapThreshold) {
                        const rad = a * (Math.PI / 180);
                        snapped.push({
                          x: p1_snapped.x + Math.cos(rad) * dist,
                          y: p1_snapped.y + Math.sin(rad) * dist,
                        });
                        wasSnapped = true;
                        break;
                      }
                    }
                    
                    if (!wasSnapped) {
                      snapped.push({
                        x: p1_snapped.x + dx,
                        y: p1_snapped.y + dy,
                      });
                    }
                  }
                }
                if (snapped.length >= 2) {
                  allSnappedPaths.push(snapped);
                }
              }
              if (allSnappedPaths.length === 0) {
                 toast.warning('Freehand strokes are too short to straighten.');
                 return;
              }
              setStraightenedPreview(allSnappedPaths);
            }}
            style={{
              position: 'absolute', bottom: 8, left: 8, zIndex: 10,
              padding: '0.35rem 0.75rem', borderRadius: 8,
              background: '#f59e0b', border: 'none', color: '#fff',
              fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              boxShadow: '0 2px 8px rgba(245,158,11,0.4)'
            }}
          >
            📐 Straighten Outline
          </button>
        )}

        {/* Done / Finish Outline button */}
        {activeLinePoints.length >= 2 && (
          <button
            onClick={finishOutline}
            style={{
              position: 'absolute', bottom: 8, right: 8, zIndex: 10,
              padding: '0.35rem 0.75rem', borderRadius: 8,
              background: '#22c55e', border: 'none', color: '#fff',
              fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              boxShadow: '0 2px 8px rgba(34,197,94,0.4)'
            }}
          >
            ✓ Finish Outline
          </button>
        )}

        <canvas
          ref={bgCanvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            display: 'block', width: '100%', height: '100%',
            touchAction: 'none',
            pointerEvents: 'none', zIndex: 1,
            background: 'transparent',
          }}
        />
        <canvas ref={canvasRef}
          style={{
            position: 'relative', zIndex: 2,
            display: 'block', width: '100%', height: '100%',
            touchAction: 'none',
            background: 'transparent',
          }}
        />
        {/* Overlay canvas for markers — sits on top, catches all pointer events */}
        <canvas ref={overlayRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            zIndex: 3,
            display: 'block', width: '100%', height: '100%',
            touchAction: 'none',
            cursor: draggingMarkerId ? 'grabbing' : hoveredMarkerId ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair',
          }}
          onPointerDown={handleCanvasDown} onPointerMove={handleCanvasMove}
          onPointerUp={handleCanvasUp} onPointerLeave={(e) => { handleCanvasUp(e); setHoveredMarkerId(null); }}
          onPointerCancel={handleCanvasUp}
          onWheel={handleWheel}
        />

        {/* Floating marker action bar — appears near selected marker */}
        {selectedMarker && selectedMarker.elevation === elevation && !draggingMarkerId && NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol) && (() => {
          const canvas = canvasRef.current;
          const wrap = canvasWrapRef.current;
          if (!canvas || !wrap) return null;
          const cRect = canvas.getBoundingClientRect();
          const wRect = wrap.getBoundingClientRect();
          const scaleX = cRect.width / (canvas.width / (window.devicePixelRatio || 1));
          const scaleY = cRect.height / (canvas.height / (window.devicePixelRatio || 1));
          const px = selectedMarker.x * scaleX + (cRect.left - wRect.left);
          const py = selectedMarker.y * scaleY + (cRect.top - wRect.top);
          // Position above the marker, clamp to canvas bounds (toolbar is ~52px tall, marker top is ~24px above center)
          const barWidth = 140;
          const barLeft = Math.max(4, Math.min(px - barWidth / 2, cRect.width - barWidth - 4));
          const barTop = Math.max(4, py - 90);
          return (
            <div 
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              style={{
              position: 'absolute', top: barTop, left: barLeft,
              display: 'flex', gap: '0.35rem', alignItems: 'center',
              padding: '0.35rem 0.5rem',
              background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(8px)',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
              zIndex: 15, animation: 'fadeInBar 0.15s ease-out',
            }}>
              <style>{`@keyframes fadeInBar { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
              {selectedMarker.markerNumber != null && (
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', marginRight: '0.2rem', marginLeft: '0.2rem' }}>
                  #{selectedMarker.markerNumber}
                </span>
              )}
              <button onClick={() => { /* visual indicator that marker is movable */ toast.info('Drag marker to move it'); }}
                title="Drag to move" style={{
                  width: 44, height: 44, borderRadius: 8, border: 'none', cursor: 'grab',
                  background: '#3b82f6', color: '#ffffff',
                  fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>✥</button>
              <button onClick={deleteMarker}
                title="Delete this window" style={{
                  width: 44, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#ef4444', color: '#ffffff',
                  fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#dc2626'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#ef4444'; }}
              >🗑</button>
              <button onClick={() => setSelectedMarkerId(null)}
                title="Deselect" style={{
                  width: 44, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#64748b', color: '#ffffff',
                  fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>✕</button>
            </div>
          );
        })()}

        {/* Floating badge — bottom-right to avoid overlapping QA/Estimate pills */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8, padding: '0.25rem 0.5rem',
          borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#e2e8f0',
          fontSize: '0.7rem', fontWeight: 700, pointerEvents: 'none',
          backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {openingMarkerCount} on {elevation}
        </div>

      {/* Note text editing overlay */}
      {editingAnnotationId && (() => {
        const ann = annotations.find(a => a.id === editingAnnotationId);
        if (!ann) return null;
        const { unit: eUnit, offsetX: eOX, offsetY: eOY } = getTransformParams();
        const zoom = transform.zoom;
        const sx = (ann.x * eUnit + eOX + transform.panX) * zoom;
        const sy = (ann.y * eUnit + eOY + transform.panY) * zoom;
        const sw = (ann.width / 100) * eUnit * zoom;
        const sh = (ann.height / 100) * eUnit * zoom;
        return (
          <textarea
            autoFocus
            value={ann.text}
            onChange={e => {
              setAnnotations(prev => prev.map(a =>
                a.id === editingAnnotationId ? { ...a, text: e.target.value, updatedAt: Date.now(), syncStatus: 'dirty' as const } : a
              ));
            }}
            onBlur={() => setEditingAnnotationId(null)}
            onKeyDown={e => { if (e.key === 'Escape') setEditingAnnotationId(null); }}
            style={{
              position: 'absolute',
              left: sx, top: sy,
              width: sw, height: sh,
              background: 'rgba(255,235,59,0.95)',
              border: '2px solid #1976D2',
              borderRadius: 6,
              padding: 6,
              fontSize: 12,
              fontFamily: '-apple-system, sans-serif',
              resize: 'none',
              outline: 'none',
              zIndex: 100,
              color: '#212121',
            }}
            placeholder="Type note here..."
          />
        );
      })()}

      </div>

      {/* ── House Outline Panel — SIBLING TO CANVAS ── */}
      {showOutlinePanel && (
        <div className={`sketch-outline-panel-wrapper ${outlineExpanded ? 'expanded' : 'collapsed'}`}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--card)'
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', flex: 1 }}>House Outline Reference</span>
            <button
              onClick={() => setOutlineExpanded(!outlineExpanded)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--muted)', fontSize: '0.7rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
            >
              {outlineExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button
              onClick={() => setShowOutlinePanel(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem' }}
              title="Close outline panel"
            >&times;</button>
          </div>
          {outlineExpanded && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0.5rem' }}>
              <AddressVisualsPanel
                address={[
                  appointment?.jobAddress || appointment?.customer?.address,
                  appointment?.city        || appointment?.customer?.city,
                  appointment?.state       || appointment?.customer?.state,
                  appointment?.zip         || appointment?.customer?.zip,
                ].filter(Boolean).join(', ')}
                appointmentId={appointment?.id}
                customerId={appointment?.customerId}
                autoLoad={true}
                autoApplyOnLoad={true}
                onGeoReady={(imgUrl) => {
                  // Do not auto-apply or auto-close. Keep panel open for manual zoom/crop.
                  if (qqJustLoaded) {
                    setQqJustLoaded(false);
                    toast.success('🏠 House aerial loaded — zoom, crop, and click Apply to Canvas!');
                  }
                }}
                onReady={() => {}}
                onManualSketch={() => setShowOutlinePanel(false)}
                onAutoOutline={(points, source) => {
                  const newSegments = [];
                  for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[(i + 1) % points.length];
                    newSegments.push({
                      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
                      x1: p1.x, y1: p1.y,
                      x2: p2.x, y2: p2.y,
                      elevation,
                      type: 'auto'
                    });
                  }
                  setOutlineSegments(newSegments);
                  setOutlineConfirmed(false);
                  toast.success(`🏠 Footprint auto-outline loaded from ${source}! Confirm before final export.`);
                  saveCanvasImage();
                }}
                onImportImage={(dataUrl, rotationDegrees) => {
                  const img = new Image();
                  img.onload = () => { 
                    const aspect = img.height / img.width;
                    const logW = 900;
                    const logH = logW * aspect;
                    const mapData = { url: dataUrl, w: logW, h: logH, rotationDegrees };
                    localStorage.setItem(`sketch_canvas_${appointment?.id}_${elevation}_bgMap`, JSON.stringify(mapData));
                    setBgMapData(mapData);
                    
                    if (sketchSourceMode === 'blank_canvas') {
                      setSketchSourceMode('map_plus_manual');
                      api.put('/sketches/' + (sketchId || 'temp'), { sketchSourceMode: 'map_plus_manual' }).catch(() => {});
                    }
                    
                    // If this was an auto-apply from QQ, close the panel and toast
                    if (qqJustLoaded) {
                      setQqJustLoaded(false);
                      setShowOutlinePanel(false);
                      toast.success('🏠 House aerial loaded — drag windows into position or add more');
                    }
                    setTimeout(() => uploadSketchForExport(), 300);
                  };
                  img.src = dataUrl;
                  
                  if (!qqJustLoaded) {
                    // Manual apply — close panel immediately
                    setShowOutlinePanel(false);
                  }
                }}
              />

            </div>
          )}
        </div>
      )}

      {/* ── Slide-up Panels Overlay ── */}
      {showPanels && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          maxHeight: '50vh', overflowY: 'auto',
          background: 'var(--card)', borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0', padding: '0.5rem',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
          zIndex: 20,
        }}>
          {/* Header & Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.375rem', position: 'relative' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            <button 
              onClick={() => setShowPanels(false)} 
              style={{ position: 'absolute', right: 0, top: '-4px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1 }}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: '0.5rem', padding: '0.375rem 0.5rem', background: 'var(--amberbg)', border: '1px solid rgba(154, 103, 0, 0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--amber)' }}>
                ⚠️ {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </div>
              {warnings.slice(0, 3).map((w, i) => (
                <div key={i} style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>• {w.message}</div>
              ))}
            </div>
          )}

          {/* Opening chips */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              SKETCH ITEMS ({totalMarkerCount})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {markers.filter(m => m.markerNumber !== null && !NON_OPENING_MARKERS.includes(m.markerSymbol)).map(m => (
                <button key={m.id} onClick={() => { setElevation(m.elevation); setSelectedMarkerId(m.id); setShowPanels(false); }}
                  style={{
                    padding: '0.2rem 0.5rem', borderRadius: 6, border: '1px solid',
                    borderColor: m.validationStatus === 'complete' ? '#22c55e' : m.validationStatus === 'measured' ? '#f59e0b' : '#ef4444',
                    background: m.id === selectedMarkerId ? 'rgba(59,130,246,0.15)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                  <span style={{ fontWeight: 800, color: '#3b82f6' }}>#{m.markerNumber}</span>
                  {' '}{m.roomLocation || m.windowType || ''}
                  {m.width && m.height ? ` ${m.width}×${m.height}` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* ── House Outline Reference ── */}
          <div style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={() => { setShowOutlinePanel(true); setShowPanels(false); }}
              style={{
                width: '100%', padding: '0.6rem', fontSize: '0.875rem', fontWeight: 600,
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}
            >
              Get House Outline
            </button>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleSmartElevation} disabled={isGeneratingElevation} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: 'none', cursor: isGeneratingElevation ? 'wait' : 'pointer', background: 'var(--royal)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              {isGeneratingElevation ? '⏳ Auto-grouping...' : '🤖 Smart Elevation'}
            </button>
            <button onClick={() => setShowAR(true)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ok)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              📷 AR Measure
            </button>
            <button onClick={() => setShowPresets(!showPresets)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: showPresets ? 'var(--blue)' : 'var(--card)', color: showPresets ? '#fff' : 'var(--text)', fontSize: '0.65rem', fontWeight: 700 }}>
              ⚡ Presets
            </button>
            <button onClick={() => setShowOrderPreview(!showOrderPreview)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: showOrderPreview ? 'var(--blue)' : 'var(--card)', color: showOrderPreview ? '#fff' : 'var(--text)', fontSize: '0.65rem', fontWeight: 700 }}>
              📋 Preview
            </button>
            <button onClick={() => setShowSettings(true)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--card)', color: 'var(--text)', fontSize: '0.65rem', fontWeight: 700 }}>
              ⚙️ Pen
            </button>
            <button onClick={() => setShowExport(!showExport)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: showExport ? 'var(--ok)' : 'var(--card)', color: showExport ? '#fff' : 'var(--text)', fontSize: '0.65rem', fontWeight: 700 }}>
              📦 Export
            </button>
          </div>

          {/* Presets */}
          {showPresets && (
            <div style={{ marginBottom: '0.5rem', padding: '0.375rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {SKETCH_PRESETS.map(preset => {
                  const wrap = canvasWrapRef.current?.getBoundingClientRect();
                  const cx = (wrap?.width || 400) / 2;
                  const cy = (wrap?.height || 300) / 2;
                  return (
                    <button key={preset.id} onClick={() => {
                      setMarkers(prev => {
                        const newMarker = createMarkerData(`sketch_${appointmentId}`, preset.markerSymbol, cx + Math.random() * 80 - 40, cy + Math.random() * 80 - 40, elevation, prev);
                        if (preset.shapeType) newMarker.shapeType = preset.shapeType;
                        
                        if (!NON_OPENING_MARKERS.includes(preset.markerSymbol)) {
                          setTimeout(() => {
                            setOpenings(oPrev => {
                              if (oPrev.some(o => o.openingNumber === newMarker.markerNumber)) return oPrev;
                              return [...oPrev, applyPresetToOpening(preset, createOpeningFromMarker(newMarker, appointmentId || ''))];
                            });
                            setSelectedMarkerId(newMarker.id);
                            setShowPhotoPanel(true); // Auto-open photo panel!
                          }, 0);
                        } else {
                          setTimeout(() => setSelectedMarkerId(newMarker.id), 0);
                        }
                        
                        return [...prev, newMarker];
                      });
                      setShowPresets(false); setShowPanels(false);
                    }} title={preset.description} style={{
                      padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'rgba(59,130,246,0.06)', cursor: 'pointer', fontSize: '0.6rem',
                      fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                    }}>
                      {preset.icon} {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Preview */}
          {showOrderPreview && (
            <div style={{ marginBottom: '0.5rem', padding: '0.375rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 200, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.55rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Type', 'W×H', 'UI', 'Room', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.15rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol)).sort((a, b) => (a.markerNumber || 0) - (b.markerNumber || 0)).map(m => (
                    <tr key={m.id} onClick={() => { setElevation(m.elevation); setSelectedMarkerId(m.id); setShowPanels(false); }} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '0.15rem', fontWeight: 800, color: '#3b82f6' }}>#{m.markerNumber}</td>
                      <td style={{ padding: '0.15rem' }}>{m.windowType || '—'}</td>
                      <td style={{ padding: '0.15rem' }}>{m.width && m.height ? `${m.width}×${m.height}` : '—'}</td>
                      <td style={{ padding: '0.15rem' }}>{m.unitedInches || '—'}</td>
                      <td style={{ padding: '0.15rem' }}>{m.roomLocation || '—'}</td>
                      <td style={{ padding: '0.15rem' }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: m.validationStatus === 'complete' ? '#22c55e' : m.validationStatus === 'measured' ? '#f59e0b' : '#ef4444' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export */}
          {showExport && (
            <div style={{ marginBottom: '0.5rem', padding: '0.375rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <button onClick={() => {
                const data = generateInstallExport(markers, openings, groups, customer, 'Rep');
                const text = formatInstallExportText(data);
                navigator.clipboard.writeText(text).then(() => toast.success('Install export copied!'));
              }} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontSize: '0.6rem', fontWeight: 700, width: '100%' }}>
                📋 Copy Install Export to Clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Right Column (Side Panel for Desktop/Tablet) ── */}
      {((selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol)) || showValidation) && (
        <div className="sketch-side-panel-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol) && (
            <div style={{ flex: showValidation ? '1 1 60%' : '1 1 100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <MarkerDetailSheet
                marker={selectedMarker}
                opening={selectedOpening}
                onUpdate={updateMarker}
                onOpeningUpdate={updateOpening}
                onClose={() => { setSelectedMarkerId(null); setJumpTargetField(null); }}
                onDelete={deleteMarker}
                onAutoFill={handleAutoFill}
                onDuplicate={() => selectedMarker && duplicateMarker(selectedMarker)}
                allMarkers={markers}
                allOpenings={openings}
                onPhotoAnalysis={() => setShowPhotoPanel(true)}
                hasPhoto={markerHasPhoto}
                focusTarget={jumpTargetField}
                smartCheckReport={smartCheckReport}
                smartCheckLoading={smartCheckLoading}
                runSmartCheck={runSmartCheck}
                onFindingResolved={handleFindingResolved}
                appointment={appointment}
              />
            </div>
          )}
          {showValidation && (
            <div style={{ flex: (selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol)) ? '1 1 40%' : '1 1 100%', minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: (selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol)) ? '2px solid var(--border)' : 'none' }}>
              <ValidationPanel
                report={validation.report}
                visible={showValidation}
                onClose={() => setShowValidation(false)}
                onJumpToOpening={(n, field) => {
                  const m = markers.find(mk => mk.markerNumber === n);
                  if (m) {
                    setSelectedMarkerId(m.id);
                    if (field) setJumpTargetField(field);
                  }
                }}
                compact={(selectedMarker && !NON_OPENING_MARKERS.includes(selectedMarker.markerSymbol)) ? true : false}
                appointmentId={appointmentId}
                selectedOpeningNumber={selectedMarker?.markerNumber || undefined}
                defaultStage="quick_price"
              />
            </div>
          )}
        </div>
      )}
    </div>

      {/* Photo Recommendation Panel */}
      {showPhotoPanel && selectedMarker && (
        <PhotoRecommendationPanel
          marker={selectedMarker}
          appointmentId={appointmentId || ''}
          onApplyRecommendation={(fields, tier) => {
            updateOpening(fields);
            toast.success(`${tier.toUpperCase()} recommendation applied to opening #${selectedMarker.markerNumber}`);
            setShowPhotoPanel(false);
          }}
          onClose={() => setShowPhotoPanel(false)}
          onUpdateMarker={updateMarker}
        />
      )}

      {/* Join/Mull Workflow */}
      {joinMode && (
        <JoinMullWorkflow
          selectedMarkers={markers.filter(m => joinSelected.includes(m.id))}
          onConfirm={handleJoinConfirm}
          onCancel={() => { setJoinMode(false); setJoinSelected([]); setTool('pen'); }}
        />
      )}

      {/* Quote Group Mode Floating Bar */}
      {quoteGroupMode && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', backdropFilter: 'blur(8px)',
          border: '1px solid #8b5cf6', borderRadius: 12, padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 50,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        }}>
          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>
            {quoteGroupSelected.length} openings selected
          </div>
          <button
            onClick={async () => {
              if (quoteGroupSelected.length === 0) {
                toast.error('Select at least one opening');
                return;
              }
              const name = prompt('Name this Quote Group: (e.g. "Front 3 Windows")');
              if (!name) return;
              
              const id = `local_qg_${Date.now()}`;
              const db = (await import('../lib/offlineDb')).getOfflineDb();
              
              await db.quote_groups.put({
                id,
                localId: id,
                appointmentId: appointmentId || '',
                name,
                status: 'draft',
                sortOrder: 0,
                isWholeJob: false,
                subtotal: 0, discount: 0, tax: 0, total: 0, pricingStatus: 'needs_review',
                syncStatus: 'pending',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              
              for (const [index, markerId] of quoteGroupSelected.entries()) {
                const marker = markers.find(m => m.id === markerId);
                const opening = openings.find(o => o.openingNumber === marker?.markerNumber);
                if (opening) {
                  await db.quote_group_openings.put({
                    id: `local_qgo_${Date.now()}_${index}`,
                    quoteGroupId: id,
                    openingId: opening.id || `local_opening_${opening.openingNumber}`,
                    markerId: markerId,
                    openingNumberSnapshot: opening.openingNumber,
                    sortOrder: index,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }
              }
              
              // enqueue outbox item
              await (await import('../lib/syncEngine')).enqueueOutboxItem({
                companyId: '', userId: '',
                entityType: 'quote_group',
                entityLocalId: id,
                operation: 'create',
                payload: {
                  name,
                  appointmentId: appointmentId || '',
                  openings: quoteGroupSelected.map(mId => {
                    const m = markers.find(x => x.id === mId);
                    const o = openings.find(x => x.openingNumber === m?.markerNumber);
                    return o ? o.id || `local_opening_${o.openingNumber}` : null;
                  }).filter(Boolean),
                }
              });
              
              toast.success(`Quote Group "${name}" created`);
              setQuoteGroupMode(false);
              setQuoteGroupSelected([]);
            }}
            style={{
              padding: '0.4rem 1rem', borderRadius: 6, background: '#8b5cf6', border: 'none', color: '#fff',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            Save Quote Group
          </button>
        </div>
      )}

      {showQuoteGroupsPanel && (
        <QuoteGroupsPanel
          appointmentId={appointmentId || ''}
          onClose={() => setShowQuoteGroupsPanel(false)}
          onCombineGroups={() => {
            setShowQuoteGroupsPanel(false);
            setShowCombinedQuoteBuilder(true);
          }}
        />
      )}

      {showCombinedQuoteBuilder && (
        <CombinedQuoteBuilder
          appointmentId={appointmentId || ''}
          onClose={() => setShowCombinedQuoteBuilder(false)}
        />
      )}

      {/* AR Measurement Overlay */}
      {showAR && (
        <ARMeasurementOverlay
          elevation={elevation}
          onClose={() => setShowAR(false)}
          onAddMarker={(newMarker) => {
            setMarkers(prev => [...prev, newMarker]);
            if (!NON_OPENING_MARKERS.includes(newMarker.markerSymbol)) {
              setOpenings(prev => [...prev, createOpeningFromMarker(newMarker, appointmentId || '')]);
            }
          }}
        />
      )}

      {/* Live Predictive Quoting */}
      <LiveEstimateWidget openings={openings} markers={markers} />

      {/* Voice Assistant */}
      {(!selectedMarker && !showValidation && localStorage.getItem('WWA_SHOW_ADVANCED_VOICE') === 'true') && <VoiceAssistantFAB />}


      {/* ── Mobile Bottom Nav — Removed redundancy to maximize canvas drawing height ── */}

      {showDiagnostics && (
        <div style={{
          position: 'fixed', top: '10%', left: '10%', right: '10%', bottom: '10%',
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
          border: '2px solid #3b82f6', borderRadius: 16, padding: '1.5rem',
          color: '#e2e8f0', zIndex: 9999, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, color: '#60a5fa' }}>🛠 Sketch Input Diagnostics</h3>
            <button onClick={() => setShowDiagnostics(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
            <div><strong>Current Tool Mode:</strong> <span style={{ color: '#34d399' }}>{tool}</span></div>
            <div><strong>Active Pointer ID:</strong> {activePointerId.current ?? 'None'}</div>
            <div><strong>Active Pointer Type:</strong> {pointerTypeRef.current ?? 'None'}</div>
            <div><strong>Is Drawing:</strong> {drawing.current ? 'Yes' : 'No'}</div>
            <div><strong>Is Erasing:</strong> {isErasing.current ? 'Yes' : 'No'}</div>
            <div><strong>Is Panning:</strong> {isPanning ? 'Yes' : 'No'}</div>
            <div><strong>Marker Hit Testing:</strong> {tool === 'select' ? 'Enabled' : 'Disabled'}</div>
            <div><strong>Last Pointer Event:</strong> <span style={{ fontFamily: 'monospace' }}>{lastPointerEvent || 'None'}</span></div>
            <div><strong>Last Stroke Exists:</strong> {lastFreehandStroke.current.length > 0 ? 'Yes' : 'No'}</div>
            <div><strong>Eraser Targets Count:</strong> {freehandStrokes.length + outlineSegments.length}</div>
            <div><strong>Outline Segments:</strong> {outlineSegments.length}</div>
            <div><strong>Auto Outline Source:</strong> {outlineSegments.some(s => s.type === 'auto') ? 'mapbox' : 'none'}</div>
            <div><strong>Map Locked:</strong> {mapLocked ? 'Yes' : 'No'}</div>
            <div><strong>Unsynced Changes:</strong> {hasUnsaved ? 'Yes' : 'No'}</div>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399' }}>Safe Recovery Actions</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button onClick={() => { setTool('select'); toast.success('Tool reset to Select'); }} style={diagnosticBtnStyle}>Reset Tool to Select</button>
              <button onClick={() => {
                if (overlayRef.current) {
                  try { overlayRef.current.releasePointerCapture(activePointerId.current || 0); } catch {}
                }
                activePointerId.current = null;
                toast.success('Released pointer capture');
              }} style={diagnosticBtnStyle}>Clear Stuck Capture</button>
              <button onClick={() => {
                setIsPanning(false);
                drawing.current = false;
                isErasing.current = false;
                toast.success('Canvas input unlocked');
              }} style={diagnosticBtnStyle}>Unlock Canvas Input</button>
              <button onClick={() => {
                const saved = localStorage.getItem(`sketch_field_${appointmentId}`);
                if (saved) {
                  const data = JSON.parse(saved);
                  if (data.markers) setMarkers(data.markers);
                  if (data.groups) setGroups(data.groups);
                  if (data.freehandStrokes) setFreehandStrokes(data.freehandStrokes);
                  if (data.outlineSegments) setOutlineSegments(data.outlineSegments);
                }
                toast.success('Reloaded latest sketch state');
              }} style={diagnosticBtnStyle}>Reload Latest State</button>
              <button onClick={() => {
                redrawDrawingCanvas();
                redrawMarkers();
                toast.success('Rerendered sketch layers');
              }} style={diagnosticBtnStyle}>Rerender Layers</button>
              <button onClick={() => {
                setOutlineSegments(prev => prev.map(s => ({ ...s, elevation: s.elevation || elevation })));
                redrawDrawingCanvas();
                toast.success('Repaired outline layer ordering');
              }} style={diagnosticBtnStyle}>Repair Outline Layer</button>
              <button onClick={() => {
                saveCanvasImage();
                uploadSketchForExport();
                toast.success('Regenerated export image');
              }} style={diagnosticBtnStyle}>Regenerate Export Image</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#f87171' }}>Unsafe Recovery Actions (Requires Confirmation)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button onClick={() => {
                if (window.confirm('Clear all freehand strokes? This cannot be undone.')) {
                  setFreehandStrokes([]);
                  saveVectorState([], outlineSegments);
                  saveCanvasImage();
                  toast.success('Cleared all strokes');
                }
              }} style={diagnosticUnsafeBtnStyle}>Clear All Strokes</button>
              <button onClick={() => {
                if (window.confirm('Clear outline segments? This cannot be undone.')) {
                  setOutlineSegments([]);
                  saveVectorState(freehandStrokes, []);
                  saveCanvasImage();
                  toast.success('Cleared outline');
                }
              }} style={diagnosticUnsafeBtnStyle}>Clear Outline</button>
              <button onClick={() => {
                if (window.confirm('Delete all markers and openings? This cannot be undone.')) {
                  setMarkers([]);
                  setOpenings([]);
                  setGroups([]);
                  toast.success('Deleted all markers');
                }
              }} style={diagnosticUnsafeBtnStyle}>Delete Markers</button>
              <button onClick={() => {
                if (window.confirm('Reset entire sketch state including markers and strokes? This cannot be undone.')) {
                  setMarkers([]);
                  setOpenings([]);
                  setGroups([]);
                  setFreehandStrokes([]);
                  setOutlineSegments([]);
                  setOutlineConfirmed(false);
                  saveVectorState([], []);
                  saveCanvasImage();
                  toast.success('Reset sketch state complete');
                }
              }} style={diagnosticUnsafeBtnStyle}>Reset Sketch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const diagnosticBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  background: '#1e293b',
  border: '1px solid #475569',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.12s',
};

const diagnosticUnsafeBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  background: 'rgba(239, 68, 68, 0.2)',
  border: '1px solid #ef4444',
  borderRadius: 6,
  color: '#fca5a5',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.12s',
};







