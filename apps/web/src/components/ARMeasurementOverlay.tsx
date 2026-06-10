// ═══════════════════════════════════════════════════════════════
// AR Measurement Overlay
// Camera view for detecting openings, tracking wall planes, 
// and creating draft sketch markers.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ARMeasurementEngine, type ARFrameAnalysis, type ARBoundingBox } from '../utils/arMeasurementEngine';
import type { SketchMarkerData } from '../utils/sketchSync';
import { toast } from './Toast';

interface ARMeasurementOverlayProps {
  onClose: () => void;
  onAddMarker: (marker: SketchMarkerData) => void;
  elevation?: string;
}

export function ARMeasurementOverlay({ onClose, onAddMarker, elevation = '1st_story' }: ARMeasurementOverlayProps) {
  const webcamRef = useRef<Webcam>(null);
  const engineRef = useRef<ARMeasurementEngine | null>(null);
  const [analysis, setAnalysis] = useState<ARFrameAnalysis | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Start AR Engine
    const engine = new ARMeasurementEngine();
    engineRef.current = engine;
    
    // Slight delay to simulate model loading
    setTimeout(() => {
      setProcessing(false);
      engine.start((frame) => {
        setAnalysis(frame);
      });
    }, 1500);

    return () => {
      engine.stop();
    };
  }, []);

  const handleCaptureBox = (box: ARBoundingBox) => {
    // Generate Sketch Marker
    const markerData = ARMeasurementEngine.createDraftMarkerFromAR(box, elevation);
    onAddMarker(markerData);
    
    toast.success(`Added ${box.label} from AR — verify manually.`);
  };

  const handleScanAll = () => {
    if (!analysis || analysis.detectedObjects.length === 0) return;
    
    let added = 0;
    analysis.detectedObjects.forEach(box => {
      if (box.confidence > 0.8) {
        const markerData = ARMeasurementEngine.createDraftMarkerFromAR(box, elevation);
        onAddMarker(markerData);
        added++;
      }
    });

    if (added > 0) {
      toast.success(`Scanned and added ${added} openings from AR.`);
      setTimeout(() => onClose(), 600);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '1rem', display: 'flex', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 10, alignItems: 'center'
      }}>
        <div style={{ color: 'white' }}>
          <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>📷 AR Measurement</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Point camera at {elevation} elevation
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
          width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontWeight: 800
        }}>✕</button>
      </div>

      {/* Camera View */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Loading Overlay */}
        {processing && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)', color: 'white', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>🤖</div>
            <div style={{ fontWeight: 700 }}>Initializing AR Core Models...</div>
          </div>
        )}

        {/* HUD Elements */}
        {!processing && analysis && (
          <>
            {/* Plane Tracking Indicator */}
            <div style={{
              position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
              padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
              background: analysis.wallPlaneLocked ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)',
              color: 'white', display: 'flex', gap: '0.5rem', alignItems: 'center'
            }}>
              <span className={analysis.wallPlaneLocked ? '' : 'blink'}>
                {analysis.wallPlaneLocked ? '✓ Wall Plane Locked' : 'Searching for planes...'}
              </span>
            </div>

            {/* Bounding Boxes */}
            {analysis.detectedObjects.map(box => {
              let boxColor = box.confidence > 0.8 ? '#22c55e' : '#f59e0b';
              if (box.type === 'siding') boxColor = '#3b82f6';
              if (box.type === 'trim') boxColor = '#a855f7';
              if (box.type === 'mull_group') boxColor = '#f97316';
              
              return (
              <div key={box.id} style={{
                position: 'absolute',
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                border: `3px solid ${boxColor}`,
                backgroundColor: `${boxColor}22`,
                boxShadow: '0 0 12px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out'
              }}
              onClick={() => handleCaptureBox(box)}
              >
                <div style={{
                  position: 'absolute', top: -28, left: -3, background: boxColor,
                  color: 'white', fontSize: '0.625rem', fontWeight: 800, padding: '0.2rem 0.5rem',
                  borderRadius: '4px 4px 4px 0', whiteSpace: 'nowrap'
                }}>
                  {box.label} ({(box.confidence * 100).toFixed(0)}%)
                </div>
                
                {box.estimatedWidthIn && box.estimatedHeightIn && (
                  <div style={{
                    position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '0.7rem', fontWeight: 700,
                    padding: '0.2rem 0.5rem', borderRadius: 4, whiteSpace: 'nowrap'
                  }}>
                    {box.estimatedWidthIn}" × {box.estimatedHeightIn}"
                  </div>
                )}

                {box.inconsistencyWarning && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(239,68,68,0.9)', color: 'white', fontSize: '0.6rem', fontWeight: 700,
                    padding: '0.3rem 0.6rem', borderRadius: 6, textAlign: 'center', width: '90%'
                  }}>
                    ⚠️ {box.inconsistencyWarning}
                  </div>
                )}
              </div>
            )})}
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div style={{
        background: '#111', padding: '1.5rem', display: 'flex',
        flexDirection: 'column', gap: '1rem', alignItems: 'center'
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
          Tap any detected opening to capture its estimated measurements and add it to your sketch. <strong style={{color: '#fcd34d'}}>Estimated from AR — verify manually.</strong>
        </div>
        <button 
          onClick={handleScanAll}
          disabled={processing || !analysis || analysis.detectedObjects.length === 0}
          style={{
            background: 'white', color: 'black', border: 'none', borderRadius: 24,
            padding: '0.875rem 2rem', fontWeight: 800, fontSize: '1rem',
            opacity: (!analysis || analysis.detectedObjects.length === 0) ? 0.5 : 1,
            cursor: (!analysis || analysis.detectedObjects.length === 0) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
          }}
        >
          Scan All Openings
        </button>
      </div>
      
      <style>{`
        .blink { animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
