import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from './Toast';
import { api } from '../utils/api';

// ── Product catalogs (synced from server but self-contained for offline) ──
const WINDOW_COLORS = [
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'almond', label: 'Almond', hex: '#f5e6d3' },
  { id: 'clay', label: 'Clay', hex: '#c4a882' },
  { id: 'black', label: 'Black', hex: '#2d2d2d' },
  { id: 'bronze', label: 'Bronze', hex: '#4a3f35' },
];

const GRID_PATTERNS = [
  { id: 'none', label: 'No Grids' },
  { id: 'colonial', label: 'Colonial' },
  { id: 'prairie', label: 'Prairie' },
  { id: 'perimeter', label: 'Perimeter' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'craftsman', label: 'Craftsman' },
  { id: 'contoured', label: 'Contoured' },
  { id: 'flat', label: 'Flat' },
];

const SIDING_COLORS = [
  { id: 'original', label: 'Keep Original', hex: 'transparent' },
  { id: 'navy', label: 'Midnight Navy', hex: '#1a2a3a' },
  { id: 'gray', label: 'Pewter Gray', hex: '#8a959e' },
  { id: 'beige', label: 'Tuscan Clay', hex: '#c4b5a3' },
  { id: 'sage', label: 'Sage Green', hex: '#7a8a7a' },
  { id: 'blue', label: 'Coastal Blue', hex: '#4a6a8a' },
  { id: 'white', label: 'White', hex: '#f0f0f0' },
];

const DOOR_COLORS = [
  { id: 'original', label: 'Keep Original', hex: 'transparent' },
  { id: 'white', label: 'Pristine White', hex: '#eee' },
  { id: 'black', label: 'Onyx Black', hex: '#222' },
  { id: 'red', label: 'Classic Red', hex: '#8a1a1a' },
  { id: 'woodgrain', label: 'Cherry Wood', hex: '#6a3a2a' },
  { id: 'bronze', label: 'Bronze', hex: '#4a3f35' },
];

const TRIM_COLORS = [
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'black', label: 'Black', hex: '#2d2d2d' },
  { id: 'almond', label: 'Almond', hex: '#f5e6d3' },
];

const SHUTTER_COLORS = [
  { id: 'none', label: 'No Shutters', hex: 'transparent' },
  { id: 'black', label: 'Black', hex: '#111' },
  { id: 'navy', label: 'Navy', hex: '#1a2a4a' },
  { id: 'green', label: 'Forest Green', hex: '#2a4a2a' },
  { id: 'red', label: 'Burgundy', hex: '#5a1a1a' },
];

const PHOTO_TYPES = [
  { id: 'front_exterior', label: '🏠 Front Exterior', icon: '🏠' },
  { id: 'rear_exterior', label: '🏡 Rear Exterior', icon: '🏡' },
  { id: 'left_exterior', label: '◀️ Left Side', icon: '◀️' },
  { id: 'right_exterior', label: '▶️ Right Side', icon: '▶️' },
  { id: 'interior_window', label: '🪟 Interior Window', icon: '🪟' },
  { id: 'door', label: '🚪 Door', icon: '🚪' },
  { id: 'siding_detail', label: '🧱 Siding', icon: '🧱' },
];

interface Props {
  appointmentId?: string;
  onSaveVisual?: (imageData: string, options: any) => void;
  onAddToProposal?: (imageData: string, options: any) => void;
}

export function LiveExteriorVisualizer({ appointmentId, onSaveVisual, onAddToProposal }: Props) {
  // Photo state
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState('front_exterior');
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Product selections
  const [windowColor, setWindowColor] = useState(WINDOW_COLORS[0]);
  const [gridPattern, setGridPattern] = useState(GRID_PATTERNS[0]);
  const [sidingColor, setSidingColor] = useState(SIDING_COLORS[0]);
  const [doorColor, setDoorColor] = useState(DOOR_COLORS[0]);
  const [trimColor, setTrimColor] = useState(TRIM_COLORS[0]);
  const [shutterColor, setShutterColor] = useState(SHUTTER_COLORS[0]);
  const [activeTab, setActiveTab] = useState<'windows' | 'siding' | 'doors' | 'trim'>('windows');

  // Saved versions
  const [savedVersions, setSavedVersions] = useState<Array<{ image: string; options: any; timestamp: number }>>([]);

  // ── Photo capture/upload ──
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo too large (max 10MB). Please use a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Resize if needed for performance
      resizeImage(dataUrl, 1600, (resized) => {
        setOriginalPhoto(resized);
        setGeneratedPhoto(null);
        setGenError(null);
        toast.success('📸 Photo loaded! Select options and generate preview.');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset for re-uploads
  }, []);

  // ── Resize large images ──
  const resizeImage = (dataUrl: string, maxDim: number, callback: (result: string) => void) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) { callback(dataUrl); return; }
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  };

  // ── Generate AI preview ──
  const generatePreview = async () => {
    if (!originalPhoto) { toast.error('Take or upload a photo first'); return; }
    setGenerating(true);
    setGenError(null);
    try {
      // api utility always attaches the correct Bearer token — no manual token read needed
      const data = await api.post(`/visualizer/generate/${appointmentId || 'preview'}`, {
        imageData: originalPhoto,
        options: {
          category: activeTab === 'windows' ? 'windows' : activeTab === 'siding' ? 'siding' : activeTab === 'doors' ? 'doors' : 'trim',
          windowFrameColor: windowColor.id,
          gridPattern: gridPattern.id,
          sidingColor: sidingColor.id !== 'original' ? sidingColor.id : undefined,
          doorColor: doorColor.id !== 'original' ? doorColor.id : undefined,
          trimColor: trimColor.id,
          shutterColor: shutterColor.id !== 'none' ? shutterColor.id : undefined,
          photoType,
        },
      }) as any;
      if (data.status === 'success' && data.generatedImage) {
        setGeneratedPhoto(data.generatedImage);
        toast.success('✨ AI preview generated!');
      } else if (data.status === 'fallback') {
        setGenError('AI provider not configured. Using overlay mode.');
      } else {
        setGenError(data.error || 'Generation failed');
        toast.error('Preview generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      // Surface auth errors clearly instead of hiding them as network errors
      if (msg.toLowerCase().includes('auth') || msg.includes('401')) {
        setGenError('Session expired — please refresh and log in again.');
        toast.error('Session expired. Please log in again.');
      } else {
        setGenError(msg);
        toast.error('Preview generation failed: ' + msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  // ── Save version ──
  const saveVersion = () => {
    const img = generatedPhoto || originalPhoto;
    if (!img) return;
    const options = { windowColor: windowColor.id, gridPattern: gridPattern.id, sidingColor: sidingColor.id, doorColor: doorColor.id, trimColor: trimColor.id, shutterColor: shutterColor.id, photoType };
    setSavedVersions(prev => [...prev, { image: img, options, timestamp: Date.now() }]);
    onSaveVisual?.(img, options);
    toast.success('💾 Visual saved!');
  };

  const addToProposal = () => {
    const img = generatedPhoto || originalPhoto;
    if (!img) return;
    const options = { windowColor: windowColor.id, gridPattern: gridPattern.id, sidingColor: sidingColor.id, doorColor: doorColor.id, trimColor: trimColor.id, shutterColor: shutterColor.id, photoType };
    onAddToProposal?.(img, options);
    toast.success('📄 Visual added to proposal!');
  };

  // ── Current display image ──
  const displayImage = showBeforeAfter ? originalPhoto : (generatedPhoto || originalPhoto);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 500 }}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} style={{ display: 'none' }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />

      {/* ── Main content: Photo + Controls ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }} className="visualizer-layout">
        {/* ── Photo area ── */}
        <div style={{ flex: 1, position: 'relative', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 350 }}>
          {!originalPhoto ? (
            /* ── Camera capture prompt ── */
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.6 }}>📸</div>
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: 'white' }}>Take a Photo of the Customer's Home</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: 400 }}>
                Capture the actual house to show how new windows, doors, siding, and colors will look
              </p>
              {/* Photo type selector */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {PHOTO_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => setPhotoType(pt.id)} style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                    border: `1px solid ${photoType === pt.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    background: photoType === pt.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                    color: photoType === pt.id ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer',
                  }}>
                    {pt.label}
                  </button>
                ))}
              </div>
              {/* Capture buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => cameraInputRef.current?.click()} style={{
                  padding: '1rem 2rem', borderRadius: 12, border: 'none', fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
                }}>
                  📷 Take Photo
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  padding: '1rem 2rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', color: 'white',
                }}>
                  📁 Upload Photo
                </button>
              </div>
            </div>
          ) : (
            /* ── Photo display ── */
            <>
              <img src={displayImage!} alt="Customer home" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

              {/* Generating overlay */}
              {generating && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🤖</div>
                  <h3 style={{ color: 'white', fontSize: '1.125rem', margin: '0 0 0.5rem' }}>Generating AI Preview...</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Applying {windowColor.label} windows with {gridPattern.label} grids</p>
                  <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
                </div>
              )}

              {/* Error banner */}
              {genError && !generating && (
                <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.9)', borderRadius: 8, color: 'white', fontSize: '0.8125rem', fontWeight: 600 }}>
                  ⚠️ {genError}
                </div>
              )}

              {/* Before/After toggle */}
              {generatedPhoto && (
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setShowBeforeAfter(false)} style={{
                    padding: '0.5rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    background: !showBeforeAfter ? '#3b82f6' : 'rgba(0,0,0,0.6)', color: 'white',
                  }}>After</button>
                  <button onClick={() => setShowBeforeAfter(true)} style={{
                    padding: '0.5rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    background: showBeforeAfter ? '#f59e0b' : 'rgba(0,0,0,0.6)', color: 'white',
                  }}>Before</button>
                </div>
              )}

              {/* Retake button */}
              <button onClick={() => { setOriginalPhoto(null); setGeneratedPhoto(null); }} style={{
                position: 'absolute', top: 12, right: 12, padding: '0.5rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: 'rgba(0,0,0,0.6)', color: 'white',
              }}>📷 Retake</button>
            </>
          )}
        </div>

        {/* ── Controls sidebar / bottom sheet ── */}
        {originalPhoto && (
          <div style={{ width: 320, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="visualizer-sidebar">
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', margin: '0 0 0.25rem', fontWeight: 800 }}>AI Visualizer</h2>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>Select options and generate preview on the actual home</p>
            </div>

            {/* Sub-nav */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {(['windows', 'siding', 'doors', 'trim'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '0.625rem 0', background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`,
                  color: activeTab === tab ? '#3b82f6' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', cursor: 'pointer',
                }}>{tab}</button>
              ))}
            </div>

            {/* Options */}
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'windows' && (
                <div className="fade-in">
                  <OptionGroup label="Window Frame Color">
                    {WINDOW_COLORS.map(c => (
                      <SelectionCard key={c.id} label={c.label} colorHex={c.hex} active={windowColor.id === c.id} onClick={() => setWindowColor(c)} />
                    ))}
                  </OptionGroup>
                  <OptionGroup label="Grid Pattern">
                    {GRID_PATTERNS.map(g => (
                      <SelectionCard key={g.id} label={g.label} active={gridPattern.id === g.id} onClick={() => setGridPattern(g)} />
                    ))}
                  </OptionGroup>
                </div>
              )}
              {activeTab === 'siding' && (
                <div className="fade-in">
                  <OptionGroup label="Siding Color">
                    {SIDING_COLORS.map(c => (
                      <SelectionCard key={c.id} label={c.label} colorHex={c.hex} active={sidingColor.id === c.id} onClick={() => setSidingColor(c)} />
                    ))}
                  </OptionGroup>
                </div>
              )}
              {activeTab === 'doors' && (
                <div className="fade-in">
                  <OptionGroup label="Door Color">
                    {DOOR_COLORS.map(c => (
                      <SelectionCard key={c.id} label={c.label} colorHex={c.hex} active={doorColor.id === c.id} onClick={() => setDoorColor(c)} />
                    ))}
                  </OptionGroup>
                </div>
              )}
              {activeTab === 'trim' && (
                <div className="fade-in">
                  <OptionGroup label="Trim & Fascia">
                    {TRIM_COLORS.map(c => (
                      <SelectionCard key={c.id} label={c.label} colorHex={c.hex} active={trimColor.id === c.id} onClick={() => setTrimColor(c)} />
                    ))}
                  </OptionGroup>
                  <OptionGroup label="Shutters">
                    {SHUTTER_COLORS.map(c => (
                      <SelectionCard key={c.id} label={c.label} colorHex={c.hex} active={shutterColor.id === c.id} onClick={() => setShutterColor(c)} />
                    ))}
                  </OptionGroup>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={generatePreview} disabled={generating} style={{
                width: '100%', padding: '0.875rem', borderRadius: 10, border: 'none', fontSize: '0.875rem', fontWeight: 800, cursor: generating ? 'wait' : 'pointer',
                background: generating ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              }}>
                {generating ? '⏳ Generating Preview...' : '✨ Generate AI Preview'}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveVersion} style={{
                  flex: 1, padding: '0.625rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem',
                }}>💾 Save</button>
                <button onClick={addToProposal} style={{
                  flex: 1, padding: '0.625rem', borderRadius: 8, border: 'none', background: '#22c55e', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem',
                }}>📄 Add to Proposal</button>
              </div>
              {savedVersions.length > 0 && (
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {savedVersions.length} version{savedVersions.length > 1 ? 's' : ''} saved
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .visualizer-layout { flex-direction: column !important; }
          .visualizer-sidebar { width: 100% !important; border-left: none !important; border-top: 1px solid var(--border); max-height: 50vh; }
        }
      `}</style>
    </div>
  );
}

// ── Shared sub-components ──
function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>{children}</div>
    </div>
  );
}

function SelectionCard({ label, colorHex, active, onClick }: { label: string; colorHex?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem', borderRadius: 8,
      border: `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
      background: active ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
      color: active ? '#3b82f6' : 'var(--text-secondary)',
      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
    }}>
      {colorHex && colorHex !== 'transparent' && (
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: colorHex, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
      )}
      <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>{label}</span>
    </button>
  );
}
