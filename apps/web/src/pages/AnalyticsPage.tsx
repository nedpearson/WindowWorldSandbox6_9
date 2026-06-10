import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function AnalyticsPage() {
  const [shapes, setShapes] = useState<any[]>([]);
  const [defaults, setDefaults] = useState<any[]>([]);
  const [codeDefaults, setCodeDefaults] = useState<any>(null);

  useEffect(() => {
    api.getSpecialtyShapes().then(setShapes).catch(() => {});
    api.getWindowDefaults().then(setDefaults).catch(() => {});
    api.getCodeDefaults().then(setCodeDefaults).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 1100 }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>📊 Analytics & Knowledge Base</h2>

      {/* Code Compliance */}
      {codeDefaults && (
        <Section title="🏛️ Code Compliance — Louisiana / Baton Rouge">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <InfoCard label="Code Version" value={codeDefaults.codeVersion} />
            <InfoCard label="Wind Zone" value={codeDefaults.windZone} />
            <InfoCard label="DP Rating" value={`${codeDefaults.dpRating}`} />
            <InfoCard label="Egress Min Width" value={`${codeDefaults.egress?.minWidth}"`} />
            <InfoCard label="Egress Min Height" value={`${codeDefaults.egress?.minHeight}"`} />
            <InfoCard label="Egress Min Area" value={`${codeDefaults.egress?.minArea} sq ft`} />
            <InfoCard label="Max Sill Height" value={`${codeDefaults.egress?.maxSillHeight}"`} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Tempered Glass Rules:</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {codeDefaults.tempered?.map((r: any, i: number) => <li key={i}><strong>{r.rule}</strong>: {r.desc}</li>)}
            </ul>
          </div>
        </Section>
      )}

      {/* Window Defaults Library */}
      <Section title="📋 Window Default Profiles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {defaults.map(d => (
            <div key={d.id} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{d.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {d.width && d.height ? `${d.width}×${d.height} · UI ${d.ui || (d.width + d.height)}` : ''}
                {d.rise ? ` · Rise ${d.rise}"` : ''}{d.radius ? ` · Radius ${d.radius}"` : ''}
                {d.topSash ? ` · Top ${d.topSash}" / Bottom ${d.bottomSash}"` : ''}
              </div>
              {d.notes && <div style={{ fontSize: '0.7rem', color: '#d29922', marginTop: '4px' }}>⚠️ {d.notes}</div>}
            </div>
          ))}
        </div>
      </Section>

      {/* Specialty Shapes */}
      <Section title="🔷 Specialty Shape Library">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {shapes.map(s => (
            <div key={s.type} style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{s.category}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
      <h3 style={{ fontSize: '1rem', margin: '0 0 12px', color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '3px solid #58a6ff' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default AnalyticsPage;
