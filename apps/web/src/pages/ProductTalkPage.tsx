import { useNavigate, useLocation } from 'react-router-dom';

export function ProductTalkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preVisitId = new URLSearchParams(location.search).get('profile');

  const startInspection = () => {
    navigate(`/exterior-inspection?profile=${preVisitId || ''}`);
  };

  return (
    <div style={{ padding: '1.25rem', maxWidth: 800, margin: '0 auto', paddingBottom: '6rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>🗣️ Product Talk</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>1. The Good/Better/Best Tiers</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Explain the difference between our series options.</p>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            <li><strong>Good:</strong> Standard double pane, great value, standard warranty.</li>
            <li><strong>Better:</strong> Enhanced frame, better insulation, lifetime warranty.</li>
            <li><strong>Best:</strong> Triple pane, maximum efficiency, premium hardware.</li>
          </ul>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>2. Energy & Glass Packages</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Discuss Low-E and Argon options based on the home's sun exposure.</p>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            <li>Standard Low-E (SolarZone)</li>
            <li>Argon Gas fill for thermal performance</li>
            <li>Foam enhanced frames</li>
          </ul>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>3. Installation & Finish Expectations</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Set expectations early about how the windows will look and how they go in.</p>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            <li>Most jobs take 1-2 days.</li>
            <li>We protect floors and furniture.</li>
            <li>Review interior/exterior trim options (Custom Capping vs Pocket).</li>
          </ul>
        </div>

      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
        <button onClick={startInspection} style={{ padding: '1rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer' }}>
          Begin Exterior Inspection →
        </button>
      </div>
    </div>
  );
}
