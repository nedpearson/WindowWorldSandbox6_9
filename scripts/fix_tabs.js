const fs = require('fs');
const path = 'apps/web/src/pages/AppointmentDetailPage.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
  `{ icon: "🏠", label: "The House" },
            { icon: "✏️", label: "Layout" },
            { icon: "🪟", label: "Windows" },`,
  `{ icon: "🏠", label: "House" },
            { icon: "✏️", label: "Measure" },
            { icon: "🪟", label: "Quote" },`
);

const step3Search = `{step === 3 && (
            <div>
              {/* Openings Editor — canonical opening management */}`;
              
const step3Replace = `{step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚡ Quick Quote (Broad)
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Give a fast estimated range without specific measurements.
                </p>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/quick-quote')}>
                  Launch Quick Quote Builder
                </button>
              </div>
              <h3 style={{ margin: '1rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🪟 Measured Quote
              </h3>
              {/* Openings Editor — canonical opening management */}`;

if (text.includes(step3Search)) {
  text = text.replace(step3Search, step3Replace);
  fs.writeFileSync(path, text, 'utf8');
  console.log("Successfully updated tabs and added Quick Quote button!");
} else {
  console.log("Failed to find step3Search string");
}
