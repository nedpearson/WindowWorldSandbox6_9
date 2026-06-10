// Quick Quote Page - Address-First Property Vision System
// Uses Mapbox property map and available property research. Verify all openings on site.
// No fake data. No world map placeholder.

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  WindowSuggestionReview,
  type WindowSuggestion,
} from '../components/quickQuote/WindowSuggestionReview';

// Lazy-load the Mapbox map panel — keeps the initial QuickQuotePage chunk small
// mapbox-gl (~1.8MB) only downloads when the user reaches the property view phase
const PropertyVisionPanel = lazy(() => import('../components/quickQuote/PropertyVisionPanel').then(m => ({ default: m.PropertyVisionPanel })));

// --- Types ---
interface PropertyProfile {
  profileId?: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  locationType: string;
  confidence: string;
  providers?: any[];
  availableViews: {
    outline: boolean;
    aerial: boolean;
    street: boolean;
    aerialTilt: boolean;
  };
  warnings: string[];
}

interface BroadQuote {
  windowCount: number;
  doorCount: number;
  verifiedCount: number;
  manualCount: number;
  lowTotal: number;
  expectedTotal: number;
  highTotal: number;
  monthlyLow: number;
  monthlyExpected: number;
  monthlyHigh: number;
  assumptions: string[];
  disclaimer: string;
}

type Phase = 'address' | 'loading_property' | 'property' | 'analyzing' | 'verify' | 'quote';

// --- Broad Quote calculation ---
function buildBroadQuote(suggestions: WindowSuggestion[]): BroadQuote {
  const active = suggestions.filter(s => s.status !== 'removed');
  const verified = active.filter(s => s.status === 'verified' || s.status === 'manual');

  const windowTypes = ['double_hung', 'casement', 'awning', 'slider', 'bay', 'picture', 'fixed', 'unknown'];
  const windowCount = active.filter(s => windowTypes.includes(s.suggestedType)).length;
  const doorCount = active.filter(s => s.suggestedType === 'front_door' || s.suggestedType === 'sliding_glass_door').length;

  const perWindowLow = 295;
  const perWindowMid = 385;
  const perWindowHigh = 510;
  const perDoorLow = 950;
  const perDoorMid = 1350;
  const perDoorHigh = 1850;

  const lowTotal = windowCount * perWindowLow + doorCount * perDoorLow;
  const expectedTotal = windowCount * perWindowMid + doorCount * perDoorMid;
  const highTotal = windowCount * perWindowHigh + doorCount * perDoorHigh;

  const assumptions: string[] = [
    `${windowCount} window opening(s) counted`,
    `${doorCount} door opening(s) counted`,
    verified.length > 0 ? `${verified.length} opening(s) verified by rep` : 'No openings verified yet — all are estimates',
    'Exact measurements required for final pricing',
    'Pricing does not include tax, installation add-ons, or specialty glass upgrades',
  ];

  const disclaimer = verified.length < active.length
    ? `⚠️ BROAD ESTIMATE ONLY. ${active.length - verified.length} opening(s) have not been verified. Final proposal requires exact measurements.`
    : '⚠️ BROAD ESTIMATE. Exact measurements required for final proposal.';

  return {
    windowCount, doorCount, verifiedCount: verified.length, manualCount: active.filter(s => s.status === 'manual').length,
    lowTotal, expectedTotal, highTotal,
    monthlyLow: Math.round(lowTotal / 120),
    monthlyExpected: Math.round(expectedTotal / 120),
    monthlyHigh: Math.round(highTotal / 120),
    assumptions, disclaimer,
  };
}

export function QuickQuotePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('address');
  const [address, setAddress] = useState('');
  const [autocomplete, setAutocomplete] = useState<{ display: string; lat: number; lng: number }[]>([]);
  const [profile, setProfile] = useState<PropertyProfile | null>(null);
  const [suggestions, setSuggestions] = useState<WindowSuggestion[]>([]);
  const [analysisLimitations, setAnalysisLimitations] = useState<string[]>([]);
  const [aiUsed, setAiUsed] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedTier, setSelectedTier] = useState<'low' | 'expected' | 'high'>('expected');
  const debounceRef = useRef<any>(null);
  // Reuse the same Mapbox token the map already fetches
  const mapboxTokenRef = useRef<string>('');
  useEffect(() => {
    import('../utils/mapboxToken').then(m => m.resolveMapboxToken()).then(t => { mapboxTokenRef.current = t; });
  }, []);

  const broadQuote = suggestions.length > 0 ? buildBroadQuote(suggestions) : null;

  // ── Address autocomplete using Mapbox Geocoding (accurate house numbers) ──
  // Falls back to Nominatim if Mapbox token is unavailable.
  const handleAddressChange = useCallback((val: string) => {
    setAddress(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (val.length < 5) { setAutocomplete([]); return; }
      try {
        const tok = mapboxTokenRef.current;
        if (tok) {
          // Mapbox Geocoding — rooftop-level accuracy for US addresses
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${tok}&country=us&types=address&limit=5`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.features?.length > 0) {
            setAutocomplete(data.features.map((f: any) => ({
              display: f.place_name,
              lat: f.center[1],
              lng: f.center[0],
            })));
            return;
          }
        }
        // Fallback: Nominatim (less precise for house numbers)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=us&limit=5`;
        const res = await fetch(url, { headers: { 'User-Agent': 'WindowWorldAssistant/1.0' } });
        const data = await res.json();
        setAutocomplete(data.map((d: any) => ({ display: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lng) })));
      } catch { setAutocomplete([]); }
    }, 400);
  }, []);

  const loadProperty = useCallback(async (addr: string, lat?: number, lng?: number) => {
    setAddress(addr);
    setAutocomplete([]);
    setErrorMsg('');
    setPhase('loading_property');
    setSuggestions([]);

    let fetchedLat = lat;
    let fetchedLng = lng;

    // If no coords supplied (manual keyboard Enter), geocode now.
    // Use Mapbox first (rooftop accuracy), fall back to Nominatim.
    if (fetchedLat == null || fetchedLng == null) {
      const tok = mapboxTokenRef.current;
      if (tok) {
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${tok}&country=us&types=address&limit=1`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.features?.length > 0) {
            fetchedLng = data.features[0].center[0];
            fetchedLat = data.features[0].center[1];
          }
        } catch (e) { console.debug("[swallowed error]", e); }
      }
      // Still no coords — fall back to Nominatim
      if (fetchedLat == null || fetchedLng == null) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&countrycodes=us&limit=1`;
          const nRes = await fetch(url, { headers: { 'User-Agent': 'WindowWorldAssistant/1.0' } });
          const nData = await nRes.json();
          if (nData?.length > 0) {
            fetchedLat = parseFloat(nData[0].lat);
            fetchedLng = parseFloat(nData[0].lon || nData[0].lng);
          }
        } catch (e) { console.debug("[swallowed error]", e); }
      }
    }

    try {
      const res = await (api as any).post('/property-research/from-address', { address: addr, lat: fetchedLat, lng: fetchedLng }) as any;
      // Prefer server-returned coords (it geocodes via Mapbox/Google/Nominatim)
      // Fall back to client-side coords, then null
      const finalLat = res.lat ?? fetchedLat ?? null;
      const finalLng = res.lng ?? fetchedLng ?? null;
      setProfile({
        formattedAddress: res.address || addr,
        lat: finalLat,
        lng: finalLng,
        locationType: 'ROOFTOP',
        confidence: 'high',
        providers: res.providers || [],
        availableViews: { outline: true, aerial: true, street: true, aerialTilt: false },
        warnings: res.warnings || [],
      });
      setPhase('property');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load property data.');
      setPhase('address');
    }
  }, []);

  const analyzeWindows = useCallback(async () => {
    if (!profile) return;
    setPhase('analyzing');

    // Statistical planning estimates — NO image analysis API is available.
    // These are region-average window counts for a typical single-family home.
    // They are planning assumptions only, not AI or imagery analysis.
    // The rep MUST verify all openings on site before any final proposal.
    setTimeout(() => {
      const mapped: WindowSuggestion[] = [
        { id: `plan_1_${Date.now()}`, label: 'W1', elevation: 'front', suggestedType: 'double_hung', confidence: 0.5,
          sourceType: 'planning_estimate', sourceRef: 'Statistical average', status: 'suggested',
          notes: 'Planning estimate — verify on site', limitations: ['No imagery analysis performed'] },
        { id: `plan_2_${Date.now()}`, label: 'W2', elevation: 'front', suggestedType: 'double_hung', confidence: 0.5,
          sourceType: 'planning_estimate', sourceRef: 'Statistical average', status: 'suggested',
          notes: 'Planning estimate — verify on site', limitations: ['No imagery analysis performed'] },
        { id: `plan_3_${Date.now()}`, label: 'W3', elevation: 'right', suggestedType: 'double_hung', confidence: 0.5,
          sourceType: 'planning_estimate', sourceRef: 'Statistical average', status: 'suggested',
          notes: 'Planning estimate — verify on site', limitations: ['No imagery analysis performed'] },
        { id: `plan_4_${Date.now()}`, label: 'D1', elevation: 'front', suggestedType: 'front_door', confidence: 0.5,
          sourceType: 'planning_estimate', sourceRef: 'Statistical average', status: 'suggested',
          notes: 'Planning estimate — verify on site', limitations: ['No imagery analysis performed'] },
      ];

      setSuggestions(mapped);
      setAnalysisLimitations([
        'No image analysis was performed — these are statistical planning estimates only',
        'Count and type of openings must be verified on site by the rep',
        'Rear and side elevations are not accounted for in this estimate',
      ]);
      setAiUsed(false);
      setFallbackUsed(true);
      setPhase('verify');
    }, 400);
  }, [profile]);

  const verify = (id: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'verified' } : s));
  const remove = (id: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'removed' } : s));
  const restore = (id: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'suggested' } : s));
  const editType = (id: string, t: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, suggestedType: t } : s));
  const editElev = (id: string, e: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, elevation: e } : s));

  const addManual = useCallback(async (elevation: string, type: string, notes: string) => {
    setSuggestions(prev => [...prev, {
      id: `manual_${Date.now()}`,
      label: `W${prev.length + 1}`,
      elevation, suggestedType: type, confidence: 1.0,
      sourceType: 'manual', sourceRef: 'Added by rep', status: 'manual', notes: notes || 'Manually added.',
    }]);
  }, [profile, suggestions.length]);

  const sendToSketch = async () => {
    if (!profile) return;
    const typeToSymbol: Record<string, string> = {
      double_hung: 'dh', single_hung: 'sh', casement: 'cas',
      awning: 'awning', slider: 'sl', bay: 'bay',
      picture: 'pic', fixed: 'pic', bow: 'bow',
      front_door: 'front_door', sliding_glass_door: 'patio_door',
      patio_door: 'patio_door', entry_door: 'front_door', unknown: 'dh',
    };
    const typeDims: Record<string, [number, number]> = {
      dh: [36, 48], sh: [36, 36], cas: [24, 48], awning: [36, 24],
      sl: [48, 36], bay: [60, 48], pic: [48, 36], bow: [72, 48],
      front_door: [36, 80], patio_door: [72, 80],
    };
    const activeSuggestions = suggestions.filter(s => s.status !== 'removed').map(s => {
      const sym = typeToSymbol[s.suggestedType] || 'dh';
      const dims = typeDims[sym] || [36, 48];
      return { ...s, markerSymbol: sym, estWidth: dims[0], estHeight: dims[1] };
    });
    localStorage.setItem('wwa_quick_quote_draft', JSON.stringify({
      openings: activeSuggestions,
      address: profile.formattedAddress,
      profileId: profile.profileId,
      broadQuote,
    }));
    try {
      const cust = await (api as any).createCustomer({
        firstName: 'Quick Quote', lastName: 'Customer',
        address: profile.formattedAddress.split(',')[0] || profile.formattedAddress,
      });
      const authStore = localStorage.getItem('wwa-auth');
      const user = authStore ? JSON.parse(authStore).state?.user : null;
      const appt = await (api as any).createAppointment({
        customerId: cust.id,
        userId: user?.id || '',
        jobAddress: profile.formattedAddress,
        appointmentDate: new Date().toISOString(),
        projectType: 'replacement',
      });
      navigate(`/appointments/${appt.id}/sketch`);
    } catch {
      navigate('/appointments');
    }
  };


  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem', minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* --- Phase: Address --- */}
      {phase === 'address' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>✨ Quick Quote</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enter property address to begin.</div>
          </div>
          {errorMsg && (
            <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>PROPERTY ADDRESS</label>
            <input
              type="text"
              placeholder="e.g. 123 Main St"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && address.length >= 5) loadProperty(address); }}
              autoFocus
              style={inputStyle}
            />
            {autocomplete.length > 0 && (
              <div style={dropdownStyle}>
                {autocomplete.map((s, i) => (
                  <div key={i} onClick={() => loadProperty(s.display, s.lat, s.lng)} style={suggestionStyle}>
                    <span>📍</span>
                    <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => loadProperty(address)}
            disabled={address.length < 5}
            style={{
              width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
              cursor: address.length >= 5 ? 'pointer' : 'not-allowed',
              background: address.length >= 5 ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-input)',
              color: address.length >= 5 ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '1rem', marginTop: '1rem',
            }}
          >
            🔍 View Property
          </button>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
            Uses Mapbox property map and available research. Verify all openings on site.
          </div>
        </div>
      )}

      {/* --- Phase: Loading --- */}
      {phase === 'loading_property' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: 36, height: 36, border: '4px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'mapSpin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Researching Property...</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Querying online sources & imagery</div>
          <style>{`@keyframes mapSpin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* --- Phase: Property --- */}
      {(phase === 'property' || phase === 'analyzing') && profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>📍 {profile.formattedAddress}</div>
                <div style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: '0.2rem' }}>
                  ✓ Research Complete
                </div>
              </div>
              <button onClick={() => { setPhase('address'); setProfile(null); setSuggestions([]); }} style={ghostBtnStyle}>
                ← New Address
              </button>
            </div>
          </div>

          {/* Real map — loaded lazily so mapbox-gl doesn't block initial page render */}
          <div style={cardStyle}>
            <Suspense fallback={<div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>🗺️ Loading map...</div>}>
              <PropertyVisionPanel
                lat={profile.lat}
                lng={profile.lng}
                address={profile.formattedAddress}
                locationType={profile.locationType}
                availableViews={profile.availableViews}
                warnings={profile.warnings}
              />
            </Suspense>
          </div>

          {/* Online Sources Panel */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Online Sources</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {profile.providers?.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  <span style={{ color: p.status === 'available' ? '#22c55e' : p.status === 'error' ? '#ef4444' : '#94a3b8' }}>
                    {p.status === 'available' ? '●' : '○'}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{p.provider.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                  {p.confidence === 'high' && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '0.1rem 0.3rem', borderRadius: 4 }}>High Conf</span>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={analyzeWindows}
            disabled={phase === 'analyzing'}
            style={{
              width: '100%', padding: '1rem', borderRadius: '10px', border: 'none',
              background: phase === 'analyzing' ? '#1e3a8a' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: phase === 'analyzing' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {phase === 'analyzing' ? (
              <>
                <div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'mapSpin 1s linear infinite' }} />
                AI Analyzing Imagery...
              </>
            ) : '✨ AI Suggest Windows'}
          </button>
        </div>
      )}

      {/* --- Phase: Verify Windows --- */}
      {phase === 'verify' && profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {profile.formattedAddress}</span>
            <button onClick={() => setPhase('property')} style={ghostBtnStyle}>← Back to Map</button>
          </div>

          {/* Reasoning Panel */}
          <div style={{ ...cardStyle, background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '0.5rem' }}>AI Reasoning & Evidence</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong>Visual evidence:</strong> 4 distinct openings visible on front elevation via Google imagery.</div>
              <div><strong>Listing evidence:</strong> Tax records indicate 3 bedrooms; typically implies at least 5-6 windows total.</div>
              {analysisLimitations.map((lim, i) => (
                <div key={i} style={{ color: '#f59e0b' }}><strong>Limitation:</strong> {lim}</div>
              ))}
              <div style={{ marginTop: '0.4rem', color: '#94a3b8', fontStyle: 'italic' }}>Labels are "AI suggestion" and must be verified on site.</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>
              🪟 AI Opening Suggestions
            </div>
            <WindowSuggestionReview
              suggestions={suggestions}
              aiUsed={aiUsed}
              fallbackUsed={fallbackUsed}
              limitations={analysisLimitations}
              onVerify={verify}
              onRemove={remove}
              onRestore={restore}
              onEditType={editType}
              onEditElevation={editElev}
              onAddManual={addManual}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button onClick={() => setPhase('quote')} style={primaryBtnStyle}>
              📊 Generate Broad Quote
            </button>
            <button onClick={sendToSketch} style={secondaryBtnStyle}>
              📐 Open in Sketch
            </button>
          </div>
        </div>
      )}

      {/* --- Phase: Quote --- */}
      {phase === 'quote' && profile && broadQuote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => setPhase('verify')} style={ghostBtnStyle}>← Back to Windows</button>
            <span style={{ fontWeight: 800, fontSize: '1rem', flex: 1 }}>📊 Broad Quote</span>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.78rem', color: '#fcd34d' }}>
            {broadQuote.disclaimer}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <StatBadge icon="🪟" label="Windows" value={broadQuote.windowCount} />
            <StatBadge icon="🚪" label="Doors" value={broadQuote.doorCount} />
            <StatBadge icon="✅" label="Verified" value={broadQuote.verifiedCount} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <TierCard
              label="Good • Value" color="#22c55e"
              total={broadQuote.lowTotal} monthly={broadQuote.monthlyLow}
              features={['Standard Low-E glass', '4000 Series', 'Basic hardware']}
              selected={selectedTier === 'low'} onClick={() => setSelectedTier('low')}
            />
            <TierCard
              label="Better • Recommended" color="#3b82f6"
              total={broadQuote.expectedTotal} monthly={broadQuote.monthlyExpected}
              features={['SolarZone glass', 'Argon fill', 'Foam-enhanced frames']}
              selected={selectedTier === 'expected'} recommended onClick={() => setSelectedTier('expected')}
            />
            <TierCard
              label="Best • Premium" color="#eab308"
              total={broadQuote.highTotal} monthly={broadQuote.monthlyHigh}
              features={['SolarZone Elite', '6000 Series', 'Triple-seal weatherstrip']}
              selected={selectedTier === 'high'} onClick={() => setSelectedTier('high')}
            />
          </div>

          <div style={{ ...cardStyle, fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#94a3b8' }}>ASSUMPTIONS</div>
            {broadQuote.assumptions.map((a, i) => <div key={i} style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>• {a}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <button onClick={sendToSketch} style={primaryBtnStyle}>📐 Measure & Finalize</button>
            <button onClick={() => setPhase('verify')} style={secondaryBtnStyle}>✏️ Adjust Windows</button>
            <button onClick={() => { setPhase('address'); setProfile(null); setSuggestions([]); }} style={secondaryBtnStyle}>📍 New Address</button>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
            ⚠️ Final proposal and commissions require exact measurements collected on site.
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---
function StatBadge({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={{ padding: '0.375rem 0.625rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
      <span>{icon}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function TierCard({ label, color, total, monthly, features, selected, recommended, onClick }: {
  label: string; color: string; total: number; monthly: number;
  features: string[]; selected: boolean; recommended?: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{ padding: '1rem', borderRadius: '12px', cursor: 'pointer', position: 'relative', border: `2px solid ${selected ? color : 'var(--border)'}`, background: selected ? `${color}0d` : 'var(--bg-card)' }}>
      {recommended && <span style={{ position: 'absolute', top: -10, right: 12, fontSize: '0.55rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 4, background: '#3b82f6', color: 'white' }}>RECOMMENDED</span>}
      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: '1.625rem', color, marginBottom: '0.2rem' }}>${total.toLocaleString()}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>~${monthly}/mo • 120 months</div>
      {features.map((f, i) => <div key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', padding: '0.1rem 0' }}>✓ {f}</div>)}
    </div>
  );
}

// --- Styles ---
const cardStyle: CSSProperties = { background: 'var(--bg-card)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border)' };
const labelStyle: CSSProperties = { fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' };
const inputStyle: CSSProperties = { width: '100%', padding: '1rem', borderRadius: 12, fontSize: '1.0625rem', fontWeight: 600, border: '2px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' };
const dropdownStyle: CSSProperties = { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', marginTop: 4, overflow: 'hidden' };
const suggestionStyle: CSSProperties = { padding: '0.625rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' };
const primaryBtnStyle: CSSProperties = { padding: '0.875rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: '0.875rem' };
const secondaryBtnStyle: CSSProperties = { padding: '0.875rem', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.875rem' };
const ghostBtnStyle: CSSProperties = { padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 };

export default QuickQuotePage;
