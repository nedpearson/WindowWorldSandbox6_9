// ═══════════════════════════════════════════════════════════════
// Photo Recommendation Panel — Sketch Canvas Integration
// Shows photo capture, feature tagging, AI analysis results,
// Good/Better/Best tier cards, sales talking points, and
// one-tap "Apply to Order" flow.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  analyzePhotoAndRecommend,
  savePhotoRecord,
  getPhotoForMarker,
  doesSymbolMatchWindowType,
  type PhotoFeatureTags,
  type PhotoRecommendation,
  type PhotoAnalysisRecord,
  type ExistingFrameMaterial,
  type ExistingCondition,
  type DamageType,
  type GridPattern,
  type ExteriorSurface,
  type TrimType,
  type RecommendationTier,
} from '../utils/photoRecommendationEngine';
import type { SketchMarkerData, MarkerSymbol, WindowType } from '../utils/sketchSync';
import { toast } from './Toast';

// ── Quick-Tag Buttons ───────────────────────────────────────
const FRAME_MATERIALS: { value: ExistingFrameMaterial; label: string; icon: string }[] = [
  { value: 'aluminum', label: 'Aluminum', icon: '🔩' },
  { value: 'wood', label: 'Wood', icon: '🪵' },
  { value: 'vinyl', label: 'Vinyl', icon: '🪟' },
  { value: 'steel', label: 'Steel', icon: '⚙️' },
];

const CONDITIONS: { value: ExistingCondition; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: '#22c55e' },
  { value: 'fair', label: 'Fair', color: '#f59e0b' },
  { value: 'poor', label: 'Poor', color: '#f97316' },
  { value: 'failing', label: 'Failing', color: '#ef4444' },
];

const DAMAGE_OPTIONS: { value: DamageType; label: string; icon: string }[] = [
  { value: 'seal_failure', label: 'Seal Failure', icon: '💨' },
  { value: 'fogging', label: 'Fogging', icon: '🌫️' },
  { value: 'rot', label: 'Rot', icon: '🍂' },
  { value: 'cracked_glass', label: 'Cracked', icon: '💔' },
  { value: 'water_damage', label: 'Water Damage', icon: '💧' },
  { value: 'poor_fitment', label: 'Poor Fit', icon: '📐' },
  { value: 'draft', label: 'Draft', icon: '🌬️' },
];

const GRID_OPTIONS: { value: GridPattern; label: string }[] = [
  { value: 'none', label: 'No Grids' },
  { value: 'colonial', label: 'Colonial' },
  { value: 'prairie', label: 'Prairie' },
  { value: 'diamond', label: 'Diamond' },
];

const EXTERIOR_OPTIONS: { value: ExteriorSurface; label: string }[] = [
  { value: 'brick', label: 'Brick' },
  { value: 'vinyl_siding', label: 'Vinyl Siding' },
  { value: 'wood_siding', label: 'Wood Siding' },
  { value: 'fiber_cement', label: 'Fiber Cement' },
  { value: 'stucco', label: 'Stucco' },
  { value: 'stone', label: 'Stone' },
  { value: 'fascia', label: 'Fascia' },
  { value: 'soffit', label: 'Soffit' },
];

const TRIM_OPTIONS: { value: TrimType; label: string }[] = [
  { value: 'wood', label: 'Wood Trim' },
  { value: 'aluminum_wrap', label: 'Aluminum Wrap' },
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'composite', label: 'Composite/PVC' },
];

const SIDING_SCOPE_OPTIONS: { value: 'spot' | 'wall' | 'full_house'; label: string }[] = [
  { value: 'spot', label: 'Spot Repair' },
  { value: 'wall', label: 'Single Wall' },
  { value: 'full_house', label: 'Whole House' },
];

// ── Styles ──────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  position: 'fixed', left: 0, top: 0, bottom: 0, width: '100%', maxWidth: '420px', zIndex: 1100,
  background: 'var(--card)', borderRight: '1px solid var(--border)',
  padding: '1rem', overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
  color: 'var(--text)',
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.375rem 0.625rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600,
  border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
  background: active ? 'var(--infobg)' : 'var(--bg)',
  color: active ? 'var(--blue)' : 'var(--muted)',
});

const sectionLabel: React.CSSProperties = {
  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  color: 'var(--muted)', marginBottom: '0.375rem', marginTop: '0.75rem',
};

interface Props {
  marker: SketchMarkerData;
  appointmentId: string;
  onApplyRecommendation: (orderFields: Record<string, any>, tier: string) => void;
  onClose: () => void;
  onUpdateMarker?: (updates: Partial<SketchMarkerData>) => void;
}

type Phase = 'capture' | 'tag' | 'results';

export function PhotoRecommendationPanel({ marker, appointmentId, onApplyRecommendation, onClose, onUpdateMarker }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [existing, setExisting] = useState<PhotoAnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>('capture');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<PhotoFeatureTags>({});
  const [recommendation, setRecommendation] = useState<PhotoRecommendation | null>(null);
  const [selectedTier, setSelectedTier] = useState<'good' | 'better' | 'best'>('better');
  const [showTalkingPoints, setShowTalkingPoints] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPhotoForMarker(marker.id).then(record => {
      if (!mounted) return;
      if (record) {
        setExisting(record);
        setPhase(record.recommendation ? 'results' : 'capture');
        setPhotoUrls(record.photoDataUrls || (record.photoDataUrl ? [record.photoDataUrl] : []));
        setTags(record.featureTags || {});
        setRecommendation(record.recommendation || null);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [marker.id]);

  // ── Photo Capture ──
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Create thumbnail (max 400px)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(400 / img.width, 400 / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const newUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoUrls(prev => [...prev, newUrl]);
        setPhase('tag');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Run Analysis ──
  const runAnalysis = async () => {
    const rec = analyzePhotoAndRecommend(tags, marker.id, marker.markerSymbol, marker.markerNumber);
    setRecommendation(rec);
    setSelectedTier(rec.defaultTier);

    // Persist
    const record: PhotoAnalysisRecord = {
      id: existing?.id || `pa_${Date.now()}`,
      appointmentId,
      markerId: marker.id,
      openingNumber: marker.markerNumber,
      photoDataUrl: photoUrls[0] || '', // legacy for primary
      photoDataUrls: photoUrls,
      featureTags: tags,
      recommendation: rec,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await savePhotoRecord(record);
    setPhase('results');
  };

  // ── Apply to Order ──
  const applyToOrder = async () => {
    if (!recommendation) return;
    const tier = recommendation.tiers.find(t => t.tier === selectedTier);
    if (!tier) return;

    const fields = {
      productCategory: tier.productType.toLowerCase().replace(/ /g, '_'),
      seriesModel: tier.model,
      glassPackage: tier.glassPackage,
      glassOption: tier.glassPackage,
      gridStyle: tier.gridStyle,
      exteriorColor: tier.color,
      interiorColor: 'White',
      screenOption: tier.screen,
      foamEnhanced: tier.tier !== 'good',
      argon: tier.tier !== 'good',
      temperedGlass: recommendation.temperedRequired ? 'full' : 'none',
      obscureGlass: recommendation.obscureRecommended ? 'full' : 'none',
      exteriorType: tags.exteriorSurface || '',
      installType: tags.exteriorSurface === 'brick' ? 'EXT' : 'INT',
      basePrice: tier.estimatedPrice,
      installNotes: `AI photo recommendation (${tier.tier.toUpperCase()}) accepted by rep; manually verified.`,
      
      // Map AI recommended installation details:
      measurementBasis: recommendation.recommendedMeasurementBasis,
      actualMeasurementBasis: recommendation.recommendedMeasurementBasis,
      cutbackRequired: recommendation.cutbackRequired,
      cutbackSelected: recommendation.cutbackRequired,
      cutbackReviewStatus: recommendation.cutbackRequired ? 'cutback_required' : 'not_needed',
      cutbackType: recommendation.recommendedCutbackType,
      cutbackAmount: recommendation.cutbackAmount,
      trimType: recommendation.trimRecommendation,
      trimRequired: recommendation.trimRecommendation !== 'None',
      trimDecision: recommendation.trimRecommendation !== 'None' ? 'capping' : 'none',
      headerType: recommendation.headerRecommendation,
      headerRequired: recommendation.headerRecommendation !== 'None',
      headerSelected: recommendation.headerRecommendation !== 'None',
      headerFlashingSelected: recommendation.headerRecommendation !== 'None',
      measurementGuidanceAccepted: true,
    };

    // Update recommendation status
    const updated = { ...recommendation, status: 'accepted' as const, acceptedTier: selectedTier };
    setRecommendation(updated);

    // Persist
    const record = await getPhotoForMarker(marker.id);
    if (record) {
      record.recommendation = updated;
      record.updatedAt = Date.now();
      await savePhotoRecord(record);
    }

    onApplyRecommendation(fields, selectedTier);
  };

  // ── Correct Marker Symbol ──
  const handleCorrectSymbol = () => {
    if (!tags.existingType || !onUpdateMarker) return;
    
    const symbolMap: Record<string, MarkerSymbol> = {
      double_hung: 'dh',
      single_hung: 'sh',
      slider: 'slider',
      picture: 'picture',
      casement: 'casement',
      awning: 'awning',
      patio_door: 'patio_door',
      sgd: 'sgd',
      oriel: 'oriel',
      special_shape: 'special_shape',
    };
    
    const newSymbol = symbolMap[tags.existingType];
    if (newSymbol) {
      const labelMap: Record<string, string> = {
        dh: 'DH', sh: 'SH', slider: 'SL', picture: 'PIC',
        casement: 'CAS', awning: 'AWN', patio_door: 'PAT', sgd: 'SGD',
        oriel: 'OR', special_shape: 'SS'
      };
      
      onUpdateMarker({
        markerSymbol: newSymbol,
        windowType: tags.existingType as WindowType,
        markerLabel: `${labelMap[newSymbol] || 'X'} #${marker.markerNumber}`
      });
      
      toast.success(`Corrected sketch symbol to ${getMarkerSymbolLabel(tags.existingType)}`);
      
      // Re-trigger analysis with updated markerSymbol so tiers update too
      const rec = analyzePhotoAndRecommend(tags, marker.id, newSymbol, marker.markerNumber);
      setRecommendation(rec);
    };
  };

  function getMarkerSymbolLabel(sym: string): string {
    const map: Record<string, string> = {
      dh: 'Double Hung', sh: 'Single Hung', slider: 'Slider', picture: 'Picture',
      casement: 'Casement', awning: 'Awning', patio_door: 'Patio Door', sgd: 'Sliding Glass Door',
      oriel: 'Oriel', special_shape: 'Special Shape',
      double_hung: 'Double Hung', single_hung: 'Single Hung',
    };
    return map[sym] || sym;
  }

  const isMismatched = recommendation && tags.existingType && tags.existingType !== 'entry_door' && tags.existingType !== 'storm_door' && !doesSymbolMatchWindowType(marker.markerSymbol, tags.existingType);

  // ═══ RENDER ═══
  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Photo Recommendation</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--muted)' }}>×</button>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>📸 Photo Analysis</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
            {marker.markerLabel} #{marker.markerNumber} · {marker.elevation}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Phase: Capture */}
      {phase === 'capture' && (
        <div>
          {photoUrls.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              {photoUrls.map((url, i) => (
                <div key={i} style={{ flex: '0 0 80%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                  <img src={url} alt={`Captured ${i + 1}`} style={{ width: '100%', maxHeight: 250, objectFit: 'contain', backgroundColor: '#000' }} />
                  <button onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))} style={{
                    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer'
                  }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              height: 200, borderRadius: 12, border: '2px dashed var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer',
              background: 'var(--bg)',
            }} onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize: '2.5rem' }}>📷</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Take or Upload Photo</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>Capture the existing window, door, or siding</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
              background: 'var(--blue)', color: 'white', fontSize: '0.8125rem',
            }}>📸 {photoUrls.length > 0 ? 'Add Photo' : 'Camera'}</button>
            <button onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = (e: any) => handlePhoto(e);
              input.click();
            }} style={{
              padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
              fontWeight: 600, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8125rem',
            }}>🖼 Upload</button>
          </div>
          {photoUrls.length > 0 ? (
            <button onClick={() => setPhase('tag')} style={{
              width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--ok)', color: 'white', fontWeight: 700, fontSize: '0.875rem', marginTop: '0.75rem',
            }}>Next: Tag Features →</button>
          ) : (
            <button onClick={() => setPhase('tag')} style={{
              width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, fontSize: '0.875rem', marginTop: '0.75rem',
            }}>Skip Photo & Tag Features →</button>
          )}
        </div>
      )}

      {/* Phase: Tag Features */}
      {phase === 'tag' && (
        <div>
          {photoUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
              {photoUrls.map((url, i) => (
                <div key={i} style={{ flex: '0 0 100px', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: 100, objectFit: 'contain', backgroundColor: '#000' }} />
                </div>
              ))}
            </div>
          )}

          <div style={sectionLabel}>Frame Material</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {FRAME_MATERIALS.map(m => (
              <button key={m.value} onClick={() => setTags(t => ({ ...t, frameMaterial: m.value }))}
                style={chipStyle(tags.frameMaterial === m.value)}>{m.icon} {m.label}</button>
            ))}
          </div>

          <div style={sectionLabel}>Condition</div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {CONDITIONS.map(c => (
              <button key={c.value} onClick={() => setTags(t => ({ ...t, condition: c.value }))}
                style={{ ...chipStyle(tags.condition === c.value), borderColor: tags.condition === c.value ? c.color : undefined, color: tags.condition === c.value ? c.color : undefined }}>
                {c.label}
              </button>
            ))}
          </div>

          <div style={sectionLabel}>Damage/Issues (select all)</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {DAMAGE_OPTIONS.map(d => {
              const active = (tags.damages || []).includes(d.value);
              return (
                <button key={d.value} onClick={() => setTags(t => {
                  const cur = t.damages || [];
                  return { ...t, damages: active ? cur.filter(x => x !== d.value) : [...cur, d.value] };
                })} style={chipStyle(active)}>{d.icon} {d.label}</button>
              );
            })}
          </div>

          <div style={sectionLabel}>Grid Pattern</div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {GRID_OPTIONS.map(g => (
              <button key={g.value} onClick={() => setTags(t => ({ ...t, gridPattern: g.value }))}
                style={chipStyle(tags.gridPattern === g.value)}>{g.label}</button>
            ))}
          </div>

          <div style={sectionLabel}>Exterior Surface</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {EXTERIOR_OPTIONS.map(e => (
              <button key={e.value} onClick={() => setTags(t => ({ ...t, exteriorSurface: e.value }))}
                style={chipStyle(tags.exteriorSurface === e.value)}>{e.label}</button>
            ))}
          </div>

          <div style={sectionLabel}>Trim & Wrapping</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {TRIM_OPTIONS.map(e => (
              <button key={e.value} onClick={() => setTags(t => ({ ...t, trimType: e.value }))}
                style={chipStyle(tags.trimType === e.value)}>{e.label}</button>
            ))}
            <button onClick={() => setTags(t => ({ ...t, hasAluminumWrap: !t.hasAluminumWrap }))}
                style={chipStyle(!!tags.hasAluminumWrap)}>Has Alum Wrap</button>
          </div>

          {marker.markerSymbol === 'siding' && (
            <>
              <div style={sectionLabel}>Siding Replacement Scope</div>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {SIDING_SCOPE_OPTIONS.map(e => (
                  <button key={e.value} onClick={() => setTags(t => ({ ...t, sidingDamageScope: e.value }))}
                    style={chipStyle(tags.sidingDamageScope === e.value)}>{e.label}</button>
                ))}
              </div>
            </>
          )}

          <div style={sectionLabel}>Safety Context</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {[
              { key: 'isNearBathroom', label: '🛁 Near Bathroom' },
              { key: 'isNearStairs', label: '🪜 Near Stairs' },
              { key: 'isNearDoor', label: '🚪 Near Door' },
            ].map(s => (
              <button key={s.key} onClick={() => setTags(t => ({ ...t, [s.key]: !(t as any)[s.key] }))}
                style={chipStyle(!!(tags as any)[s.key])}>{s.label}</button>
            ))}
          </div>

          <div style={sectionLabel}>Pane Count</div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {([1, 2, 3] as const).map(n => (
              <button key={n} onClick={() => setTags(t => ({ ...t, paneCount: n }))}
                style={chipStyle(tags.paneCount === n)}>{n}-Pane</button>
            ))}
          </div>

          <button onClick={runAnalysis} style={{
            width: '100%', padding: '0.875rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--blue)', color: 'white',
            fontWeight: 700, fontSize: '0.9375rem', marginTop: '1rem',
          }}>🔍 Analyze & Recommend</button>

          <button onClick={() => setPhase('capture')} style={{
            width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.5rem',
          }}>← Back to Photo</button>
        </div>
      )}

      {/* Phase: Results */}
      {phase === 'results' && recommendation && (
        <div>
          {/* Mismatch Warning Banner */}
          {isMismatched && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--amber)', borderRadius: 10,
              padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', color: 'var(--amber)', fontWeight: 700, fontSize: '0.8125rem' }}>
                <span>⚠️ Window Type Mismatch</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.4 }}>
                Placed as <strong>{getMarkerSymbolLabel(marker.markerSymbol)}</strong>, but photo indicates <strong>{getMarkerSymbolLabel(tags.existingType as string)}</strong>.
              </div>
              <button 
                onClick={handleCorrectSymbol}
                style={{
                  alignSelf: 'flex-start', padding: '0.35rem 0.65rem', borderRadius: 6, border: 'none',
                  background: 'var(--amber)', color: '#000', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                🔄 Correct Sketch Symbol to {getMarkerSymbolLabel(tags.existingType as string)}
              </button>
            </div>
          )}

          {/* AI Installation Guidance */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(37,99,235,0.04) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: 12, padding: '0.875rem', marginBottom: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.9rem' }}>🤖</span>
              <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--blue)' }}>AI Installation Guidance</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Measurement Basis:</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                  {recommendation.recommendedMeasurementBasis === 'inside' ? 'Inside (Safety Default)' : 'Outside Measure'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Cutback Required:</span>
                <span style={{ fontWeight: 700, color: recommendation.cutbackRequired ? 'var(--danger)' : 'var(--text)' }}>
                  {recommendation.cutbackRequired ? 'Yes' : 'No'}
                </span>
              </div>
              
              {recommendation.cutbackRequired && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Cutback Type & Amt:</span>
                  <span style={{ fontWeight: 700 }}>
                    {recommendation.recommendedCutbackType} ({recommendation.cutbackAmount}")
                  </span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Trim / Wrapping:</span>
                <span style={{ fontWeight: 700 }}>{recommendation.trimRecommendation}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Header Flashing:</span>
                <span style={{ fontWeight: 700 }}>{recommendation.headerRecommendation}</span>
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', marginBottom: '0.375rem' }}>
              <span style={{ fontWeight: 700 }}>Confidence</span>
              <span style={{ fontWeight: 700, color: recommendation.confidence.overall >= 60 ? 'var(--ok)' : 'var(--amber)' }}>
                {recommendation.confidence.overall}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
              <div style={{
                height: '100%', borderRadius: 3, width: `${recommendation.confidence.overall}%`,
                background: recommendation.confidence.overall >= 60 ? 'var(--ok)' : 'var(--amber)',
              }} />
            </div>
            {recommendation.confidence.requiresManualConfirmation && (
              <div style={{ fontSize: '0.625rem', color: 'var(--amber)', marginTop: '0.25rem' }}>
                ⚠️ Manual measurement confirmation required
              </div>
            )}
          </div>

          {/* Detected Issues */}
          {recommendation.detectedIssues.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={sectionLabel}>Detected Issues</div>
              {recommendation.detectedIssues.map((issue, i) => (
                <div key={i} style={{ fontSize: '0.6875rem', color: 'var(--amber)', padding: '0.25rem 0', display: 'flex', gap: '0.375rem' }}>
                  <span>⚠️</span><span>{issue}</span>
                </div>
              ))}
            </div>
          )}

          {/* Compliance Flags */}
          {(recommendation.temperedRequired || recommendation.obscureRecommended || recommendation.egressConcern) && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {recommendation.temperedRequired && <span style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: '#fdecec', color: '#a32d2d', fontWeight: 700 }}>🛡️ Tempered Required</span>}
              {recommendation.obscureRecommended && <span style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: '#e7f0ff', color: '#0c447c', fontWeight: 700 }}>🔒 Obscure Recommended</span>}
              {recommendation.egressConcern && <span style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: 'var(--infobg)', color: 'var(--blue)', fontWeight: 700 }}>🚪 Egress Check</span>}
            </div>
          )}

          {/* Tier Cards */}
          <div style={sectionLabel}>Replacement Options</div>
          {recommendation.tiers.map(tier => (
            <TierCard
              key={tier.tier}
              tier={tier}
              selected={selectedTier === tier.tier}
              recommended={tier.tier === recommendation.defaultTier}
              onClick={() => setSelectedTier(tier.tier)}
            />
          ))}

          {/* Apply Button */}
          <button onClick={applyToOrder} style={{
            width: '100%', padding: '0.875rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: recommendation.status === 'accepted' ? 'var(--ok)' : 'var(--blue)',
            color: 'white', fontWeight: 700, fontSize: '0.9375rem', marginTop: '0.75rem',
          }}>
            {recommendation.status === 'accepted' ? '✓ Applied to Order' : '✓ Apply Recommendation to Order'}
          </button>

          {/* Sales Talking Points */}
          <button onClick={() => setShowTalkingPoints(!showTalkingPoints)} style={{
            width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', color: 'var(--blue)', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem',
          }}>💬 {showTalkingPoints ? 'Hide' : 'Show'} Sales Talking Points</button>

          {showTalkingPoints && (
            <div style={{ marginTop: '0.5rem' }}>
              {recommendation.talkingPoints.map((tp, i) => (
                <div key={i} style={{
                  padding: '0.5rem', borderRadius: 8, marginBottom: '0.375rem',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {tp.icon} {tp.headline}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--muted)', lineHeight: 1.5 }}>{tp.script}</div>
                </div>
              ))}
            </div>
          )}

          {/* Re-analyze */}
          <button onClick={() => setPhase('tag')} style={{
            width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)',
            background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.375rem',
          }}>🔄 Edit Tags & Re-analyze</button>
        </div>
      )}
    </div>
  );
}

// ── Tier Card Component ─────────────────────────────────────
function TierCard({ tier, selected, recommended, onClick }: {
  tier: RecommendationTier; selected: boolean; recommended: boolean; onClick: () => void;
}) {
  const borderColor = selected ? 'var(--blue)' : 'var(--border)';
  const bg = selected ? 'var(--infobg)' : 'var(--bg)';
  return (
    <div onClick={onClick} style={{
      padding: '0.625rem', borderRadius: 10, marginBottom: '0.5rem', cursor: 'pointer',
      border: `2px solid ${borderColor}`, position: 'relative',
      background: bg,
    }}>
      {recommended && (
        <span style={{ position: 'absolute', top: -8, right: 8, fontSize: '0.5625rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 4, background: 'var(--blue)', color: 'white' }}>RECOMMENDED</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{tier.label}</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: selected ? 'var(--blue)' : 'var(--text)' }}>${tier.estimatedPrice}</div>
      </div>
      <div style={{ fontSize: '0.625rem', color: 'var(--muted)', marginBottom: '0.375rem' }}>
        {tier.model} · {tier.glassPackage} · ~${tier.monthlyPayment}/mo
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {tier.benefits.slice(0, selected ? undefined : 2).map((b, i) => (
          <div key={i} style={{ fontSize: '0.625rem', color: 'var(--muted)' }}>✓ {b}</div>
        ))}
      </div>
      {selected && (
        <div style={{ fontSize: '0.625rem', color: 'var(--text)', marginTop: '0.375rem', fontStyle: 'italic' }}>
          {tier.whyRecommended}
        </div>
      )}
    </div>
  );
}
