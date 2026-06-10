import type { SketchMarkerData } from './sketchSync';

export interface SketchLayoutConfigParams {
  viewportWidth: number;
  viewportHeight: number;
  footprintMinSide: number;
  openingCount: number;
  isMobile: boolean;
  isTablet: boolean;
  zoomLevel: number;
  isPrintMode?: boolean; // True when exporting to PDF/Excel
}

export interface SketchLayoutConfig {
  markerSize: number;
  smallMarkerSize: number;
  isCompact: boolean;
  labelVisibilityMode: 'full' | 'number_only' | 'none';
  detailPanelMode: 'bottom_sheet' | 'side_panel' | 'full_screen';
  toolbarMode: 'compact' | 'scrollable' | 'full';
  mapZoomPadding: number;
  fitAllPadding: number;
}

export function getFieldSketchLayoutConfig({
  viewportWidth,
  viewportHeight,
  footprintMinSide,
  openingCount,
  isMobile,
  isTablet,
  zoomLevel,
  isPrintMode = false,
}: SketchLayoutConfigParams): SketchLayoutConfig {
  // Base dimension calculation
  const isLandscape = viewportWidth > viewportHeight;
  const baseDim = (footprintMinSide > 0 ? footprintMinSide : Math.min(viewportWidth, viewportHeight)) * zoomLevel;

  // If we are exporting for documents, use legible print markers that scale with zoom
  if (isPrintMode) {
    const size = Math.max(40, baseDim * 0.08);
    return {
      markerSize: size,
      smallMarkerSize: Math.max(26, size * 0.65),
      isCompact: true, // Use the same compact mode as the live sketch so the export looks identical
      labelVisibilityMode: 'full',
      detailPanelMode: 'side_panel',
      toolbarMode: 'full',
      mapZoomPadding: 20,
      fitAllPadding: 40,
    };
  }
  
  // Base physical footprint scaling
  let baseSize = baseDim * 0.08;

  // Density factor reduces size if house is crowded
  let densityFactor = 1.0;
  if (openingCount >= 15) densityFactor = 0.6;
  else if (openingCount >= 9) densityFactor = 0.7;
  else if (openingCount >= 5) densityFactor = 0.85;

  let adjustedSize = baseSize * densityFactor;

  // Default compact sizes
  let minSize = 14, maxSize = 24;
  
  // In the field, we want to maximize canvas space, meaning markers should be compact by default.
  let finalSize = Math.max(minSize, Math.min(maxSize, adjustedSize));

  // Determine compact mode: Almost always compact on field devices unless very zoomed in
  // Field reps need to see the whole house, so markers shouldn't cover it.
  const isCompact = true; // Always default to compact on the live canvas
  
  let labelVisibilityMode: 'full' | 'number_only' | 'none' = 'number_only';
  if (zoomLevel > 1.8) {
    labelVisibilityMode = 'full';
  } else if (zoomLevel < 0.5 && openingCount > 10) {
    labelVisibilityMode = 'none';
  }

  // Determine layout panels based on device
  let detailPanelMode: 'bottom_sheet' | 'side_panel' | 'full_screen' = 'side_panel';
  let toolbarMode: 'compact' | 'scrollable' | 'full' = 'compact';
  
  if (isMobile) {
    detailPanelMode = isLandscape ? 'side_panel' : 'bottom_sheet';
    toolbarMode = 'scrollable';
  } else if (isTablet) {
    detailPanelMode = isLandscape ? 'side_panel' : 'bottom_sheet';
    toolbarMode = 'compact';
  } else {
    // Desktop / Large Surface
    detailPanelMode = 'side_panel';
    toolbarMode = isLandscape ? 'full' : 'compact';
  }

  return {
    markerSize: finalSize,
    smallMarkerSize: finalSize * 0.7,
    isCompact,
    labelVisibilityMode,
    detailPanelMode,
    toolbarMode,
    mapZoomPadding: isMobile ? 10 : 30,
    fitAllPadding: isMobile ? 30 : 60,
  };
}
