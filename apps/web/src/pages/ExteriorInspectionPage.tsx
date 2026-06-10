import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

export function ExteriorInspectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preVisitId = new URLSearchParams(location.search).get('profile');

  const [elevation, setElevation] = useState('Front');
  const [openingLabel, setOpeningLabel] = useState('Opening 1');
  const [exteriorSurface, setExteriorSurface] = useState('Brick');
  const [existingInstallStyle, setExistingInstallStyle] = useState('Insert/Replacement');
  const [homeownerFinishPreference, setHomeownerFinishPreference] = useState('Match Existing');

  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<any>(null);

  const analyzeOpening = async () => {
    setLoading(true);
    try {
      // Create inspection if it doesn't exist (mocking appointment ID for now)
      const inspection = await api.createExteriorInspection({
        appointmentId: `mock-appt-${preVisitId || Date.now()}`,
        status: 'in_progress'
      });

      const result = await api.createInspectionOpening(inspection.id, {
        elevation,
        openingLabel,
        exteriorSurface,
        existingInstallStyle,
        homeownerFinishPreference
      });

      setAdvice(result);
    } catch (err) {
      console.error(err);
      // Fallback for UI if API fails during preview
      setAdvice({
        recommendedInstallMethod: 'Mock Recommendation',
        laborFlagsJson: ['Mock Flag'],
        notes: 'Mock notes'
      });
    } finally {
      setLoading(false);
    }
  };

  const startMeasure = () => {
    navigate(`/appointments/mock-appt-${preVisitId || Date.now()}/sketch`);
  };

  return (
    <div style={{ padding: '1.25rem', maxWidth: 800, margin: '0 auto', paddingBottom: '6rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>🔍 Exterior Inspection</h2>
      
      {!advice ? (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Help determine how existing windows are set and what finish approach is best.</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Elevation / Location</label>
            <input type="text" value={elevation} onChange={e => setElevation(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Exterior Surface</label>
            <select value={exteriorSurface} onChange={e => setExteriorSurface(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <option value="Brick">Brick</option>
              <option value="Stucco">Stucco</option>
              <option value="Vinyl Siding">Vinyl Siding</option>
              <option value="Wood">Wood</option>
              <option value="Hardie">Hardie / Fiber Cement</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Existing Install Style</label>
            <select value={existingInstallStyle} onChange={e => setExistingInstallStyle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <option value="Insert/Replacement">Insert/Replacement</option>
              <option value="New Construction/Nail Fin">New Construction / Nail Fin</option>
              <option value="Wood Rot">Wood Rot Present</option>
              <option value="Mulled Unit">Mulled Unit</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Finish Preference</label>
            <select value={homeownerFinishPreference} onChange={e => setHomeownerFinishPreference(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <option value="Lowest Cost">Lowest Cost Acceptable</option>
              <option value="Match Existing">Match Existing</option>
              <option value="Premium">Cleanest/Premium Finish</option>
            </select>
          </div>

          <button onClick={analyzeOpening} disabled={loading} style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', borderRadius: 8, fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {loading ? 'Analyzing...' : 'Get Install Advice'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: 12, border: '1px solid #34d399' }}>
            <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>Recommended Method</h3>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#047857' }}>{advice.recommendedInstallMethod}</p>
            
            {advice.laborFlagsJson && advice.laborFlagsJson.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong style={{ color: '#b45309' }}>Flags sent to Final Review:</strong>
                <ul style={{ color: '#b45309', paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
                  {advice.laborFlagsJson.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            {advice.notes && (
              <div style={{ marginTop: '1rem', color: '#064e3b', fontSize: '0.9rem' }}>
                <strong>Talking Points:</strong> {advice.notes}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setAdvice(null)} style={{ flex: 1, padding: '1rem', background: 'white', color: 'var(--primary)', borderRadius: 8, fontSize: '1rem', fontWeight: 600, border: '1px solid var(--primary)', cursor: 'pointer' }}>
              Add Another Opening
            </button>
            <button onClick={startMeasure} style={{ flex: 1, padding: '1rem', background: '#3b82f6', color: 'white', borderRadius: 8, fontSize: '1rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Continue to Measure →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
