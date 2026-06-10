import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { calculateCushMeasure, formatFraction } from '../utils/cushMeasureCalc';
import type { SketchMarkerData } from '../utils/sketchSync';
import { getMeasurementRules, calculateFinalMeasurement } from '../utils/measurementRulesEngine';
import { MeasurementGuidanceCard } from './MeasurementGuidanceCard';
import { TapeMeasureHelper } from './TapeMeasureHelper';
import { useParams } from 'react-router-dom';

interface Props {
  marker: SketchMarkerData;
  opening: any;
  onUpdateMarker: (updates: Partial<SketchMarkerData>) => void;
  onUpdateOpening: (updates: Record<string, any>) => void;
  onClose?: () => void;
}

export function SmartMeasurementAssistant({ marker, opening, onUpdateMarker, onUpdateOpening, onClose }: Props) {
  const { id: appointmentId } = useParams();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeInput, setActiveInput] = useState<{ field: string, type: 'width' | 'height' } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const guidance = getMeasurementRules(marker.exteriorMaterial || opening?.exteriorSurface, marker.windowType, marker.shapeType);

  // Derive final values whenever raw inputs change (3-point logic)
  useEffect(() => {
    const pointsW = [marker.widthTop, marker.widthMiddle, marker.widthBottom].filter(p => p !== null && p !== undefined && p > 0);
    const pointsH = [marker.heightLeft, marker.heightCenter, marker.heightRight].filter(p => p !== null && p !== undefined && p > 0);
    
    if (pointsW.length > 0) {
      const finalW = calculateFinalMeasurement(marker.widthTop || null, marker.widthMiddle || null, marker.widthBottom || null, guidance.defaultDeduction);
      if (finalW !== null && finalW !== marker.width) onUpdateMarker({ width: finalW });
    }
    
    if (pointsH.length > 0) {
      const finalH = calculateFinalMeasurement(marker.heightLeft || null, marker.heightCenter || null, marker.heightRight || null, guidance.defaultDeduction);
      if (finalH !== null && finalH !== marker.height) onUpdateMarker({ height: finalH });
    }
  }, [marker.widthTop, marker.widthMiddle, marker.widthBottom, marker.heightLeft, marker.heightCenter, marker.heightRight, guidance.defaultDeduction]);

  const handleInput = (field: keyof SketchMarkerData, val: string) => {
    const num = parseFloat(val);
    onUpdateMarker({ [field]: isNaN(num) ? null : num });
  };

  const handleFractionSelect = (dec: number, label: string) => {
    if (!activeInput) return;
    const currentVal = marker[activeInput.field as keyof SketchMarkerData] as number | null;
    const base = currentVal !== null ? Math.floor(currentVal) : 0;
    onUpdateMarker({ [activeInput.field]: base + dec });
  };

  // AI Photo Logic
  const handleAnalyzePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await api.post('/measurements/photo-analysis', {
          appointmentId: appointmentId || marker.sketchId || 'draft',
          openingId: opening?.id,
          photoId: `temp_${Date.now()}`,
          imageUrlOrStoragePath: base64,
          actualWidth: marker.width,
          actualHeight: marker.height,
          exteriorType: marker.exteriorMaterial || opening?.exteriorSurface
        });
        
        if (res.success) {
          setAnalysisResult(res);
          // If tape measure read width/height, we can ask user or auto-apply.
          // For now, we will display it as a suggestion.
        } else {
          alert('Failed to analyze photo');
        }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
      alert('Error analyzing photo');
    }
  };

  const applySuggestions = async () => {
    if (!analysisResult) return;
    const prefill = analysisResult.suggestions || {};
    
    const markerUpdates: Partial<SketchMarkerData> = {};
    if (prefill.windowType) markerUpdates.windowType = prefill.windowType;
    if (prefill.exteriorType) markerUpdates.exteriorMaterial = prefill.exteriorType;

    // Apply Tape Reading to currently active input or standard width
    if (analysisResult.tapeReading) {
      const tapeVal = parseFloat(analysisResult.tapeReading);
      if (!isNaN(tapeVal)) {
        if (activeInput) {
          markerUpdates[activeInput.field as keyof SketchMarkerData] = tapeVal as any;
        } else {
          markerUpdates.width = tapeVal;
        }
      }
    }
    
    onUpdateMarker(markerUpdates);
    
    const openingUpdates: Record<string, any> = {};
    if (prefill.exteriorType) openingUpdates.exteriorSurface = prefill.exteriorType;
    if (prefill.gridOption !== 'none') openingUpdates.gridPattern = prefill.gridOption;
    
    if (Object.keys(openingUpdates).length > 0) {
      onUpdateOpening(openingUpdates);
    }
  };

  const saveCushMeasure = async () => {
    if (!analysisResult) return;
    try {
      await api.patch(`/measurements/${analysisResult.analysisId}/verify-ai-suggestions`, {
        actualWidth: marker.width,
        actualHeight: marker.height,
        revisedWidth: analysisResult.revisedMeasurement?.width,
        revisedHeight: analysisResult.revisedMeasurement?.height,
        acceptedSuggestions: analysisResult.suggestions
      });
      onUpdateMarker({
        width: analysisResult.revisedMeasurement?.width,
        height: analysisResult.revisedMeasurement?.height
      });
      alert('Cush Measure saved and applied successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save Cush Measure');
    }
  };

  const calcResult = calculateCushMeasure({
    actualWidth: marker.width || 0,
    actualHeight: marker.height || 0,
    exteriorType: marker.exteriorMaterial || opening?.exteriorSurface
  });

  return (
    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🧠</span> Smart Measure AI
        </h3>
        {onClose && (
          <button onClick={(e) => { e.preventDefault(); onClose(); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        )}
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            style={{ cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', border: 'none', fontFamily: 'inherit' }}
          >
            <span>📷</span> {analyzing ? 'Analyzing Photo...' : 'Take Photo (Tape & Exterior AI)'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleAnalyzePhoto} disabled={analyzing} />
        </div>

        {analysisResult && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399', fontSize: '0.875rem' }}>🤖 AI Identified</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div><strong>Type:</strong> {analysisResult.suggestions?.windowType}</div>
              <div><strong>Exterior:</strong> {analysisResult.suggestions?.exteriorType}</div>
              <div><strong>Grid:</strong> {analysisResult.suggestions?.gridOption}</div>
              {analysisResult.tapeReading && (
                <div style={{ color: '#fbbf24' }}><strong>Tape Read:</strong> {analysisResult.tapeReading}"</div>
              )}
            </div>
            
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-sm btn-success" onClick={applySuggestions} style={{ width: '100%' }}>Accept AI Values</button>
            </div>

            {analysisResult.proTips && analysisResult.proTips.length > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#a7f3d0' }}>
                <ul style={{ margin: '0 0 0 1.25rem' }}>
                  {analysisResult.proTips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <MeasurementGuidanceCard guidance={guidance} />

        {/* 3-Point Measurements */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* WIDTH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>Width (Actual)</div>
            <PointInput label="Top" value={marker.widthTop} onChange={(v) => handleInput('widthTop', v)} onFocus={() => setActiveInput({ field: 'widthTop', type: 'width' })} active={activeInput?.field === 'widthTop'} />
            <PointInput label="Middle" value={marker.widthMiddle} onChange={(v) => handleInput('widthMiddle', v)} onFocus={() => setActiveInput({ field: 'widthMiddle', type: 'width' })} active={activeInput?.field === 'widthMiddle'} />
            <PointInput label="Bottom" value={marker.widthBottom} onChange={(v) => handleInput('widthBottom', v)} onFocus={() => setActiveInput({ field: 'widthBottom', type: 'width' })} active={activeInput?.field === 'widthBottom'} />
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>
              Smallest W: {marker.width ? marker.width : '--'}
            </div>
          </div>

          {/* HEIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>Height (Actual)</div>
            <PointInput label="Left" value={marker.heightLeft} onChange={(v) => handleInput('heightLeft', v)} onFocus={() => setActiveInput({ field: 'heightLeft', type: 'height' })} active={activeInput?.field === 'heightLeft'} />
            <PointInput label="Center" value={marker.heightCenter} onChange={(v) => handleInput('heightCenter', v)} onFocus={() => setActiveInput({ field: 'heightCenter', type: 'height' })} active={activeInput?.field === 'heightCenter'} />
            <PointInput label="Right" value={marker.heightRight} onChange={(v) => handleInput('heightRight', v)} onFocus={() => setActiveInput({ field: 'heightRight', type: 'height' })} active={activeInput?.field === 'heightRight'} />
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>
              Smallest H: {marker.height ? marker.height : '--'}
            </div>
          </div>
        </div>

        <TapeMeasureHelper onSelectFraction={handleFractionSelect} />
        
        {((marker.width || 0) > 0 && (marker.height || 0) > 0) && (
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.75rem', borderRadius: 8, marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Cush Measure (Order Size):</span>
              <span style={{ fontWeight: 700 }}>
                {calcResult.revisedWidth}w × {calcResult.revisedHeight}h
              </span>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
              Rule: {calcResult.isBrick ? 'Brick (1/2" per side)' : 'Standard (3/8" per side)'} deduction applied.
            </div>

            {analysisResult && (
              <button className="btn btn-primary" onClick={saveCushMeasure} style={{ width: '100%', marginTop: '0.75rem' }}>
                Confirm & Save Order Size
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PointInput({ label, value, onChange, onFocus, active }: { label: string, value?: number | null, onChange: (val: string) => void, onFocus: () => void, active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ width: '50px', fontSize: '0.75rem', color: '#cbd5e1' }}>{label}</label>
      <input
        type="number"
        className="form-input"
        step="0.125"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        style={{ 
          flex: 1, 
          padding: '0.25rem 0.5rem',
          fontSize: '0.875rem',
          borderColor: active ? '#3b82f6' : undefined,
          boxShadow: active ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : undefined
        }}
        placeholder='0.00'
      />
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: '35px', textAlign: 'right' }}>
        {value ? formatFraction(value) : ''}
      </span>
    </div>
  );
}
