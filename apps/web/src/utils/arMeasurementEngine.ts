// ═══════════════════════════════════════════════════════════════
// AR Measurement Engine — Computer Vision Mock Engine
// Simulates ARKit/ARCore for the web prototype
// ═══════════════════════════════════════════════════════════════

import type { MarkerSymbol, WindowType } from './sketchSync';

export interface ARBoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  type: 'window' | 'door' | 'siding' | 'trim' | 'mull_group';
  estimatedWidthIn: number | null;
  estimatedHeightIn: number | null;
  distanceFt: number;
  wallPlaneDetected: boolean;
  markerSymbol?: MarkerSymbol;
  windowType?: WindowType | null;
  inconsistencyWarning?: string;
}

export interface ARFrameAnalysis {
  timestamp: number;
  detectedObjects: ARBoundingBox[];
  wallPlaneLocked: boolean;
  cameraHeightFt: number;
  lightingCondition: 'good' | 'poor' | 'glare';
  sidingZoneDetected: boolean;
}

// Simulated ML detection models for AR
export class ARMeasurementEngine {
  private active: boolean = false;
  private onFrameAnalysis?: (analysis: ARFrameAnalysis) => void;
  private simulatedInterval?: any;

  constructor() {}

  public start(onFrame: (analysis: ARFrameAnalysis) => void) {
    this.active = true;
    this.onFrameAnalysis = onFrame;
    this.simulateARFeed();
  }

  public stop() {
    this.active = false;
    if (this.simulatedInterval) clearInterval(this.simulatedInterval);
  }

  // Simulate AR spatial tracking and object detection
  private simulateARFeed() {
    this.simulatedInterval = setInterval(() => {
      if (!this.active || !this.onFrameAnalysis) return;

      // Simulate a window detection
      const objects: ARBoundingBox[] = [
        {
          id: `ar_win_1`,
          x: 0.3,
          y: 0.4,
          width: 0.2,
          height: 0.3,
          label: 'Window (Double Hung)',
          confidence: 0.92,
          type: 'window',
          estimatedWidthIn: 35.5,
          estimatedHeightIn: 59.5,
          distanceFt: 8.5,
          wallPlaneDetected: true,
          markerSymbol: 'dh',
          windowType: 'double_hung',
        },
        {
          id: `ar_door_1`,
          x: 0.6,
          y: 0.5,
          width: 0.25,
          height: 0.45,
          label: 'Entry Door',
          confidence: 0.88,
          type: 'door',
          estimatedWidthIn: 36,
          estimatedHeightIn: 80,
          distanceFt: 8.0,
          wallPlaneDetected: true,
          markerSymbol: 'front_door',
        },
        {
          id: `ar_mull_1`,
          x: 0.28,
          y: 0.38,
          width: 0.24,
          height: 0.34,
          label: 'Mull Group (Twin)',
          confidence: 0.85,
          type: 'mull_group',
          estimatedWidthIn: null,
          estimatedHeightIn: null,
          distanceFt: 8.5,
          wallPlaneDetected: true,
          markerSymbol: 'dh',
        },
        {
          id: `ar_siding_1`,
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.8,
          label: 'Siding Zone (Vinyl)',
          confidence: 0.95,
          type: 'siding',
          estimatedWidthIn: 400,
          estimatedHeightIn: 120,
          distanceFt: 10.0,
          wallPlaneDetected: true,
          markerSymbol: 'siding',
        },
        {
          id: `ar_trim_1`,
          x: 0.1,
          y: 0.05,
          width: 0.8,
          height: 0.1,
          label: 'Fascia/Soffit',
          confidence: 0.89,
          type: 'trim',
          estimatedWidthIn: 400,
          estimatedHeightIn: 12,
          distanceFt: 12.0,
          wallPlaneDetected: true,
          markerSymbol: 'note',
        }
      ];

      // Simulate measurement inconsistency detection
      // e.g., if estimated dimensions are not standard
      objects.forEach(obj => {
        if (obj.estimatedWidthIn && obj.estimatedHeightIn) {
          if (obj.estimatedWidthIn % 0.5 !== 0 || obj.estimatedHeightIn % 0.5 !== 0) {
            obj.inconsistencyWarning = "Dimensions irregular. Please re-measure.";
          }
        }
      });

      this.onFrameAnalysis({
        timestamp: Date.now(),
        detectedObjects: objects,
        wallPlaneLocked: true,
        cameraHeightFt: 5.5,
        lightingCondition: 'good',
        sidingZoneDetected: false,
      });

    }, 2000); // Trigger every 2 seconds for simulation
  }

  // Public utility to convert AR Box to Sketch Marker
  public static createDraftMarkerFromAR(box: ARBoundingBox, elevation: string): any {
    return {
      id: `m_ar_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      x: box.x,
      y: box.y,
      markerSymbol: box.markerSymbol || 'window_x',
      windowType: box.windowType || null,
      elevation,
      markerLabel: 'AR',
      width: box.estimatedWidthIn,
      height: box.estimatedHeightIn,
      notes: 'Estimated from AR — verify manually.',
      validationStatus: 'measured',
    };
  }
}
