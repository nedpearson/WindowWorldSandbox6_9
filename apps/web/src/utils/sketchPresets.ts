// ═══════════════════════════════════════════════════════════════
// Sketch Presets — One-Tap Opening Templates
// Pre-configured opening data for common field scenarios
// ═══════════════════════════════════════════════════════════════

import type { MarkerSymbol, WindowType, ShapeType } from './sketchSync';

export interface SketchPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  markerSymbol: MarkerSymbol;
  windowType: WindowType;
  shapeType?: ShapeType;
  defaults: Record<string, any>;
}

export const SKETCH_PRESETS: SketchPreset[] = [
  {
    id: 'std_dh', label: 'Standard DH', icon: '🪟', description: 'Double Hung — Siding, Vinyl Trim, Alum Removal',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', screenOption: 'Half Screen', glassPackage: 'LEE', foamEnhanced: false, interiorColor: 'White' },
  },
  {
    id: 'brick_dh', label: 'Brick DH', icon: '🧱', description: 'Double Hung — Brick, Depth Required, Measure Outside',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { exteriorType: 'Brick', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', screenOption: 'Half Screen', glassPackage: 'LEE', foamEnhanced: false, interiorColor: 'White', needsDepth: true },
  },
  {
    id: 'bath_win', label: 'Bathroom', icon: '🛁', description: 'Tempered + Obscure — Bathroom Safety',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { temperedGlass: 'both', obscureGlass: 'yes', roomLocation: 'Bathroom', screenOption: 'Half Screen', glassPackage: 'LEE', foamEnhanced: false, interiorColor: 'White' },
  },
  {
    id: 'eyebrow_dh', label: 'Eyebrow DH', icon: '⌢', description: 'Double Hung with Eyebrow Top — Special Shape',
    markerSymbol: 'eyebrow', windowType: 'special_shape', shapeType: 'eyebrow',
    defaults: { exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', glassPackage: 'LEE' },
  },
  {
    id: 'oriel_dh', label: 'Oriel DH', icon: '⬔', description: 'Oriel Double Hung — Unequal Sash Split',
    markerSymbol: 'oriel', windowType: 'oriel',
    defaults: { exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', screenOption: 'Half Screen', glassPackage: 'LEE' },
  },
  {
    id: 'slider_pair', label: 'Slider', icon: '↔', description: '2-Lite Slider — Standard Setup',
    markerSymbol: 'slider', windowType: 'slider',
    defaults: { exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', screenOption: 'Half Screen', glassPackage: 'LEE', foamEnhanced: false },
  },
  {
    id: 'picture', label: 'Picture', icon: '🖼', description: 'Picture Window — No Screen, No Grids',
    markerSymbol: 'picture', windowType: 'picture',
    defaults: { screenOption: 'No Screen', gridStyle: 'None', glassPackage: 'LEE', foamEnhanced: false },
  },
  {
    id: 'twin_mull', label: 'Twin Mull', icon: '🔗', description: 'Two Mulled Double Hungs',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { autoMull: 'twin', exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', glassPackage: 'LEE' },
  },
  {
    id: 'triple_mull', label: 'Triple Mull', icon: '🔗🔗', description: 'Three Mulled Windows',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { autoMull: 'triple', exteriorType: 'Siding', trimType: 'Vinyl', removalType: 'ALUM', installType: 'EXT', glassPackage: 'LEE' },
  },
  {
    id: 'sgd', label: 'Sliding Glass Door', icon: '⬌', description: 'SGD — Rear/Patio Elevation',
    markerSymbol: 'sgd', windowType: 'sgd',
    defaults: { elevation: 'rear', screenOption: 'Half Screen', glassPackage: 'LEE' },
  },
  {
    id: 'front_door', label: 'Front Door', icon: '🚪', description: 'Front Door — Reference Marker',
    markerSymbol: 'front_door', windowType: 'other',
    defaults: {},
  },
  {
    id: 'back_door', label: 'Back Door', icon: '🚪', description: 'Back Door — Reference Marker',
    markerSymbol: 'back_door', windowType: 'other',
    defaults: {},
  },
  {
    id: 'clear_story', label: 'Clear Story', icon: '⬆', description: '2nd Floor / Ladder Required',
    markerSymbol: 'dh', windowType: 'double_hung',
    defaults: { floorNumber: 2, ladderReq: true, clearStory: true },
  },
];

/** Apply preset defaults to an opening record */
export function applyPresetToOpening(preset: SketchPreset, opening: Record<string, any>): Record<string, any> {
  return { ...opening, ...preset.defaults, productCategory: preset.windowType };
}

/** Get presets filtered by exterior type */
export function getPresetsForExterior(exterior: string): SketchPreset[] {
  if (exterior.toLowerCase() === 'brick') {
    return SKETCH_PRESETS.filter(p => p.defaults.exteriorType === 'Brick' || !p.defaults.exteriorType);
  }
  return SKETCH_PRESETS;
}
