import React, { useState, useEffect, useRef } from 'react';
import type { Opening } from '../types';

export interface MeasureHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  opening: Partial<Opening>;
  appointment: any;
  onSave: (updates: Partial<Opening>) => void;
  initialMode?: 'exterior' | 'mull' | 'shape' | 'oriel' | 'tempered' | 'grids';
}

export const MeasureHelpModal: React.FC<MeasureHelpModalProps> = ({
  isOpen,
  onClose,
  opening,
  appointment,
  onSave,
  initialMode = 'exterior',
}) => {
  const [mode, setMode] = useState<string>(initialMode);
  
  // State for Exterior Guidance
  const extType = opening.exteriorType || opening.exteriorSurface || 'Other';
  const [basis, setBasis] = useState<string>(opening.actualMeasurementBasis || 'outside');
  const [overrideReason, setOverrideReason] = useState<string>(opening.measurementGuidanceOverrideReason || '');
  const [cutbackReq, setCutbackReq] = useState<boolean>(opening.cutbackRequired || false);
  const [cutbackType, setCutbackType] = useState<string>(opening.cutbackType || 'none');
  const [cutbackAmt, setCutbackAmt] = useState<number>(opening.cutbackAmount || 0);
  const [removalDet, setRemovalDet] = useState<string>(opening.removalDetail || '');
  const [trimInc, setTrimInc] = useState<boolean>(opening.trimIncluded || false);
  const [flashingInc, setFlashingInc] = useState<boolean>(opening.headerFlashingIncluded || false);
  const [guidanceAccepted, setGuidanceAccepted] = useState<boolean>(opening.measurementGuidanceAccepted || false);

  // State for Photo & Draggable Arrows
  const [photoUrl, setPhotoUrl] = useState<string | null>(opening.outsidePhotoId || null);
  const [dragArrows, setDragArrows] = useState({
    width: { x1: 50, y1: 150, x2: 250, y2: 150 },
    height: { x1: 150, y1: 50, x2: 150, y2: 250 },
    legHeight: { x1: 250, y1: 100, x2: 250, y2: 250 },
  });
  const [aiConfidence, setAiConfidence] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<{ arrow: 'width' | 'height' | 'legHeight'; point: 'p1' | 'p2' } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // State for Mulls
  const [mullGroup, setMullGroup] = useState<string>(opening.mullGroup || '');
  const [installMull, setInstallMull] = useState<boolean>(opening.installMullion || false);
  const [structuralMull, setStructuralMull] = useState<boolean>(opening.structuralMullion || false);

  // State for Special Shapes
  const [widthVal, setWidthVal] = useState<number>(opening.width || 0);
  const [heightVal, setHeightVal] = useState<number>(opening.height || 0);
  const [legHeightVal, setLegHeightVal] = useState<number>(opening.legHeight || 0);
  const [shapeType, setShapeType] = useState<string>(opening.productCategory || 'eyebrow');

  // State for Oriel
  const [orielUpperHeight, setOrielUpperHeight] = useState<number>(opening.orielUpperSashHeight || 0);

  // State for Tempered
  const [temperedDecision, setTemperedDecision] = useState<string>(opening.temperedGlass || 'none');

  // State for Grids
  const [gridSty, setGridSty] = useState<string>(opening.gridStyle || 'None');
  const [gridV, setGridV] = useState<number>(opening.gridVerticalCount || 0);
  const [gridH, setGridH] = useState<number>(opening.gridHorizontalCount || 0);

  // Load defaults based on exterior type on mount/change
  useEffect(() => {
    if (initialMode === 'exterior') {
      applyRecommendedDefaults();
    }
  }, [extType, initialMode]);

  const applyRecommendedDefaults = () => {
    const normExt = extType.toLowerCase();
    if (normExt.includes('brick')) {
      setBasis('outside');
      setCutbackReq(false);
      setCutbackType('none');
      setRemovalDet('window_removal');
      setTrimInc(false);
      setFlashingInc(false);
    } else if (normExt.includes('stucco')) {
      setBasis('outside');
      setCutbackReq(true);
      setCutbackType('standard_stucco_cutback');
      setRemovalDet(opening.removalType === 'ALUM' ? 'Remove Aluminum from Stucco' : 'Remove Aluminum from Stucco');
      setTrimInc(true);
      setFlashingInc(false);
    } else if (normExt.includes('siding')) {
      setBasis('outside');
      setCutbackReq(false);
      setCutbackType('none');
      setRemovalDet('window_removal');
      setTrimInc(true);
      setFlashingInc(true);
    } else if (normExt.includes('wood')) {
      setBasis('outside');
      setCutbackReq(false);
      setCutbackType('none');
      setRemovalDet('window_removal');
      setTrimInc(true);
      setFlashingInc(true);
    }
  };

  if (!isOpen) return null;

  // Handle Photo Selection
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);

      // Trigger suggested AI mapping (simulated)
      setAiConfidence('Suggested');
      setDragArrows({
        width: { x1: 60, y1: 180, x2: 240, y2: 180 },
        height: { x1: 150, y1: 40, x2: 150, y2: 260 },
        legHeight: { x1: 240, y1: 120, x2: 240, y2: 260 },
      });
    }
  };

  // SVG Mouse/Pointer Tracking for Draggable Arrows
  const handlePointerDown = (arrow: 'width' | 'height' | 'legHeight', point: 'p1' | 'p2', e: React.PointerEvent) => {
    e.preventDefault();
    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
    setActiveHandle({ arrow, point });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(300, e.clientX - rect.left));
    const y = Math.max(0, Math.min(300, e.clientY - rect.top));

    setDragArrows(prev => {
      const arrow = prev[activeHandle.arrow];
      if (activeHandle.point === 'p1') {
        return {
          ...prev,
          [activeHandle.arrow]: { ...arrow, x1: x, y1: y },
        };
      } else {
        return {
          ...prev,
          [activeHandle.arrow]: { ...arrow, x2: x, y2: y },
        };
      }
    });
    setAiConfidence('Manual placement required');
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle && svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setActiveHandle(null);
  };

  const handleSave = () => {
    const updates: Partial<Opening> = {};

    if (mode === 'exterior') {
      updates.actualMeasurementBasis = basis;
      updates.preferredMeasurementBasis = 'outside_preferred';
      updates.cutbackRequired = cutbackReq;
      updates.cutbackType = cutbackType;
      updates.cutbackAmount = cutbackAmt;
      updates.removalDetail = removalDet;
      updates.trimIncluded = trimInc;
      updates.headerFlashingIncluded = flashingInc;
      updates.measurementGuidanceAccepted = guidanceAccepted;
      updates.measurementGuidanceOverrideReason = overrideReason;
      if (photoUrl) {
        updates.outsidePhotoId = photoUrl;
        updates.measurementVisualAnnotationId = JSON.stringify(dragArrows);
      }
    } else if (mode === 'mull') {
      updates.mullGroup = mullGroup;
      updates.installMullion = installMull;
      updates.structuralMullion = structuralMull;
    } else if (mode === 'shape') {
      updates.width = widthVal;
      updates.height = heightVal;
      updates.legHeight = legHeightVal;
      updates.productCategory = shapeType;
      updates.unitedInches = widthVal + heightVal;
    } else if (mode === 'oriel') {
      updates.orielUpperSashHeight = orielUpperHeight;
      updates.oriel = true;
    } else if (mode === 'tempered') {
      updates.temperedGlass = temperedDecision;
    } else if (mode === 'grids') {
      updates.gridStyle = gridSty;
      updates.gridVerticalCount = gridV;
      updates.gridHorizontalCount = gridH;
    }

    onSave(updates);
    onClose();
  };

  // Guidance texts based on selected exterior
  const getGuidanceText = () => {
    const norm = extType.toLowerCase();
    if (norm.includes('brick')) {
      return {
        title: 'Brick / Brick-to-Brick Guidance',
        recommendation: 'Measure smallest clear masonry opening width & height from the outside.',
        instructions: 'Measure brick edge to brick edge. Do not include trim or returns in the measurement. Standard cutback is usually not needed.',
        hasCutback: false,
      };
    } else if (norm.includes('stucco')) {
      return {
        title: 'Stucco Guidance',
        recommendation: 'Outside measurement is preferred with Stucco Cutback choice.',
        instructions: 'Measure the exterior opening. Choose Standard stucco cutback (3/4") or Deep stucco cutback (1.25"). For aluminum windows, select Remove Aluminum from Stucco.',
        hasCutback: true,
      };
    } else if (norm.includes('siding')) {
      return {
        title: 'Siding Guidance',
        recommendation: 'Measure to the window frame. Trim & Flashing recommended.',
        instructions: 'Measure the outside window frame size. If existing siding trim touches the frame, measure window size. Header flashing is required.',
        hasCutback: true,
      };
    } else if (norm.includes('wood')) {
      return {
        title: 'Wood Exterior Guidance',
        recommendation: 'Measure to material touching the window. Trim recommended.',
        instructions: 'Determine if trim touches the window. Trim and header flashing are highly recommended. Cutback applies if existing trim must be cut back.',
        hasCutback: true,
      };
    }
    return {
      title: 'General Exterior Guidance',
      recommendation: 'Outside measurement preferred where possible.',
      instructions: 'Choose measurement points carefully. Consult manager if return material or casing is ambiguous.',
      hasCutback: true,
    };
  };

  const guidance = getGuidanceText();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
    }}>
      <div style={{
        background: '#1f2937', color: '#f9fafb',
        width: '100%', maxWidth: '680px', maxHeight: '90vh',
        borderRadius: '16px', border: '1px solid #374151',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem', borderBottom: '1px solid #374151',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📏</span> Measure Help & Guidance
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#9ca3af',
            fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem',
          }}>×</button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex', background: '#111827', borderBottom: '1px solid #374151',
          overflowX: 'auto',
        }}>
          {[
            { id: 'exterior', label: 'Exterior' },
            { id: 'mull', label: 'Mullion' },
            { id: 'shape', label: 'Special Shape' },
            { id: 'oriel', label: 'Oriel DH' },
            { id: 'tempered', label: 'Tempered' },
            { id: 'grids', label: 'Grids/SDL' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              style={{
                flex: 1, padding: '0.75rem 1rem', border: 'none',
                background: mode === t.id ? '#1f2937' : 'transparent',
                color: mode === t.id ? '#3b82f6' : '#9ca3af',
                fontWeight: mode === t.id ? 700 : 500,
                borderBottom: mode === t.id ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          
          {/* EXTERIOR MODE */}
          {mode === 'exterior' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#60a5fa' }}>{guidance.title}</h3>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>💡 Recommended Basis: {guidance.recommendation}</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>{guidance.instructions}</p>
              </div>

              {/* Photos & Canvas Overlay */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Outside Photo & Arrow Guides</label>
                  <div style={{
                    width: '100%', height: '220px', background: '#111827', borderRadius: '8px',
                    position: 'relative', overflow: 'hidden', border: '1px dashed #4b5563',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {photoUrl ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={photoUrl} alt="Exterior" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <svg
                          ref={svgRef}
                          width="100%"
                          height="100%"
                          viewBox="0 0 300 300"
                          style={{ position: 'absolute', top: 0, left: 0 }}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        >
                          {/* Width Arrow */}
                          <line x1={dragArrows.width.x1} y1={dragArrows.width.y1} x2={dragArrows.width.x2} y2={dragArrows.width.y2} stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrow)" />
                          <circle cx={dragArrows.width.x1} cy={dragArrows.width.y1} r="7" fill="#3b82f6" style={{ cursor: 'pointer' }} onPointerDown={(e) => handlePointerDown('width', 'p1', e)} />
                          <circle cx={dragArrows.width.x2} cy={dragArrows.width.y2} r="7" fill="#3b82f6" style={{ cursor: 'pointer' }} onPointerDown={(e) => handlePointerDown('width', 'p2', e)} />

                          {/* Height Arrow */}
                          <line x1={dragArrows.height.x1} y1={dragArrows.height.y1} x2={dragArrows.height.x2} y2={dragArrows.height.y2} stroke="#10b981" strokeWidth="3" />
                          <circle cx={dragArrows.height.x1} cy={dragArrows.height.y1} r="7" fill="#10b981" style={{ cursor: 'pointer' }} onPointerDown={(e) => handlePointerDown('height', 'p1', e)} />
                          <circle cx={dragArrows.height.x2} cy={dragArrows.height.y2} r="7" fill="#10b981" style={{ cursor: 'pointer' }} onPointerDown={(e) => handlePointerDown('height', 'p2', e)} />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <p style={{ margin: '0 0 1rem 0', color: '#9ca3af' }}>No photo captured</p>
                        <label style={{
                          background: '#2563eb', padding: '0.5rem 1rem', borderRadius: '6px',
                          cursor: 'pointer', display: 'inline-block', fontWeight: 600,
                        }}>
                          📷 Capture Photo
                          <input type="file" accept="image/*" onChange={handlePhotoCapture} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>
                  {aiConfidence && (
                    <div style={{
                      marginTop: '0.5rem', fontSize: '0.8rem',
                      color: aiConfidence === 'Suggested' ? '#10b981' : '#f59e0b',
                    }}>
                      AI Status: {aiConfidence}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Actual Measurement Basis</label>
                    <select value={basis} onChange={e => setBasis(e.target.value)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }}>
                      <option value="outside">Outside Measurement</option>
                      <option value="inside">Inside Measurement</option>
                      <option value="needs_review">Needs Review</option>
                    </select>
                  </div>

                  {guidance.hasCutback && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input type="checkbox" checked={cutbackReq} onChange={e => setCutbackReq(e.target.checked)} />
                      <label>Is Cutback required?</label>
                    </div>
                  )}

                  {cutbackReq && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Cutback Type</label>
                        <select value={cutbackType} onChange={e => setCutbackType(e.target.value)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }}>
                          <option value="standard_stucco_cutback">Standard Stucco Cutback</option>
                          <option value="deep_stucco_cutback">Deep Stucco Cutback</option>
                          <option value="siding_cutback">Siding Cutback</option>
                          <option value="wood_trim_cutback">Wood/Trim Cutback</option>
                          <option value="brick_return_cutback">Brick Return Cutback</option>
                          <option value="custom">Custom Cutback</option>
                          <option value="needs_review">Needs Review</option>
                        </select>
                      </div>

                      {cutbackType === 'custom' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Custom Cutback Amount (inches)</label>
                          <input type="number" step="0.125" value={cutbackAmt} onChange={e => setCutbackAmt(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Removal Detail</label>
                    <input type="text" value={removalDet} onChange={e => setRemovalDet(e.target.value)} placeholder="e.g. Remove Aluminum from Stucco" style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                  </div>
                </div>
              </div>

              {/* Flashing / Trim Options */}
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={trimInc} onChange={e => setTrimInc(e.target.checked)} />
                  Trim Included
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={flashingInc} onChange={e => setFlashingInc(e.target.checked)} />
                  Header Flashing Included
                </label>
              </div>

              {/* Override / Acknowledgment */}
              <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem', marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="checkbox" checked={guidanceAccepted} onChange={e => setGuidanceAccepted(e.target.checked)} />
                  I accept the recommended measurement guidance
                </label>
                {!guidanceAccepted && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#f87171' }}>Override Reason (Required if not accepting guidance)</label>
                    <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Provide reasoning for override..." style={{ width: '100%', background: '#374151', border: '1px solid #ef4444', padding: '0.5rem', borderRadius: '6px', color: '#fff', minHeight: '60px' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MULL MODE */}
          {mode === 'mull' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#fbbf24' }}>Mull Joining Rules</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>
                  Ensure you specify all window numbers involved in the mull (e.g. "Windows 1 & 2 mulled").
                  Structural mulls carry a <strong>$150 charge</strong>. Verify load-bearing headers.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Mull Group / Window Numbers</label>
                  <input type="text" value={mullGroup} onChange={e => setMullGroup(e.target.value)} placeholder="e.g. Window #1 & #2" style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={installMull} onChange={e => setInstallMull(e.target.checked)} />
                    Install Mullion
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={structuralMull} onChange={e => setStructuralMull(e.target.checked)} />
                    Structural Mullion (+$150)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SPECIAL SHAPE MODE */}
          {mode === 'shape' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#fbbf24' }}>Specialty Shape Dimensions</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>
                  Special shape orders must specify Width, Full Height, and Leg Height.
                  The United Inches (UI) is auto-calculated. Shapes over max UI carry a $150 adder.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Shape Type</label>
                  <select value={shapeType} onChange={e => setShapeType(e.target.value)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }}>
                    <option value="eyebrow">Eyebrow</option>
                    <option value="circle_top">Circle Top</option>
                    <option value="quarter_arch">Quarter Arch</option>
                    <option value="custom_shape">Custom Shape</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Width (inches)</label>
                  <input type="number" value={widthVal} onChange={e => setWidthVal(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Full Height (inches)</label>
                  <input type="number" value={heightVal} onChange={e => setHeightVal(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Leg Height (inches)</label>
                  <input type="number" value={legHeightVal} onChange={e => setLegHeightVal(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', fontSize: '1rem', fontWeight: 'bold' }}>
                United Inches: {widthVal + heightVal} UI
              </div>
            </div>
          )}

          {/* ORIEL MODE */}
          {mode === 'oriel' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#60a5fa' }}>Oriel Double Hung Split</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>
                  Oriel double hung windows require the Top Sash Height to determine sash split.
                  Measure in 1/8" increments.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Top Sash Height (inches)</label>
                <input type="number" step="0.125" value={orielUpperHeight} onChange={e => setOrielUpperHeight(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
              </div>
            </div>
          )}

          {/* TEMPERED MODE */}
          {mode === 'tempered' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#ef4444' }}>Tempered Glazing Code Rules</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>
                  Tempered safety glass is required if:
                  <ul style={{ margin: '0.25rem 0 0 1rem', paddingLeft: 0 }}>
                    <li>Within 24" of any door lock/hinge edge.</li>
                    <li>Within 60" of tub/shower drain edge.</li>
                    <li>Glass area &gt; 9 sq ft and low sill height (&lt; 18" from floor).</li>
                  </ul>
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Tempered Glazing Decision</label>
                <select value={temperedDecision} onChange={e => setTemperedDecision(e.target.value)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }}>
                  <option value="none">Not Tempered</option>
                  <option value="full">Full Tempered</option>
                  <option value="half">Half Tempered (Bottom Sash Only)</option>
                  <option value="unsure">Unsure / Escalate to Manager</option>
                </select>
              </div>
            </div>
          )}

          {/* GRIDS MODE */}
          {mode === 'grids' && (
            <div>
              <div style={{ background: '#374151', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#60a5fa' }}>Grids & Simulated Divided Lites (SDL)</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.4 }}>
                  Choose Grid style and counts correctly. Mismatches will block factory orders.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Grid Style</label>
                  <select value={gridSty} onChange={e => setGridSty(e.target.value)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }}>
                    <option value="None">None</option>
                    <option value="Colonial">Colonial</option>
                    <option value="Prairie">Prairie</option>
                    <option value="Diamond">Diamond</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Vertical Count</label>
                  <input type="number" value={gridV} onChange={e => setGridV(parseInt(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#9ca3af' }}>Horizontal Count</label>
                  <input type="number" value={gridH} onChange={e => setGridH(parseInt(e.target.value) || 0)} style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '6px', color: '#fff' }} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem', borderTop: '1px solid #374151', background: '#111827',
          display: 'flex', gap: '1rem', justifyContent: 'flex-end',
        }}>
          {mode === 'exterior' && (
            <button onClick={applyRecommendedDefaults} style={{
              background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db',
              padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
            }}>
              Reset to Recommended
            </button>
          )}
          <button onClick={handleSave} style={{
            background: '#2563eb', border: 'none', color: '#fff',
            padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
          }}>
            Save Guidance
          </button>
        </div>

      </div>
    </div>
  );
};
