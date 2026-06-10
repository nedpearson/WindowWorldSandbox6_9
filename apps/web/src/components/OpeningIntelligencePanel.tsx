import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface OpeningIntelligenceProps {
  opening: any;
  appointmentId: string;
}

export function OpeningIntelligencePanel({ opening, appointmentId }: OpeningIntelligenceProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!opening?.width || !opening?.height) return;
    setLoading(true);
    api.analyzeOpening({
      width: opening.width,
      height: opening.height,
      productCategory: opening.productCategory,
      roomLocation: opening.roomLocation,
      floorNumber: opening.floorNumber,
      exteriorType: opening.exteriorType,
      temperedGlass: opening.temperedGlass,
      obscureGlass: opening.obscureGlass,
      oriel: opening.oriel,
      clearStory: opening.clearStory,
      specialtyShape: opening.specialtyShape,
      installType: opening.installType,
      color: opening.exteriorColor,
    }).then(setAnalysis).catch(() => {}).finally(() => setLoading(false));
  }, [opening?.width, opening?.height, opening?.productCategory]);

  if (!opening?.width || !opening?.height) return null;

  const ui = analysis?.ui ?? (opening.width + opening.height);
  const tier = analysis?.tier;

  return (
    <div className="intelligence-panel" style={{ background: 'var(--bg-secondary, #161b22)', borderRadius: '12px', padding: '16px', marginTop: '12px', border: '1px solid var(--border-color, #30363d)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary, #e6edf3)' }}>
          🧠 Opening Intelligence
        </h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8b949e)' }}>
          {expanded ? '▲' : '▼'} {loading ? 'Analyzing…' : `UI ${ui} · ${tier?.label || ''}`}
        </span>
      </div>

      {expanded && analysis && (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* UI & Tier */}
          <MetricCard label="United Inches" value={analysis.ui} sub={analysis.tier?.label} color="#58a6ff" />

          {/* Complexity */}
          <MetricCard
            label="Install Complexity"
            value={`${analysis.complexity?.score}/10`}
            sub={`~${analysis.complexity?.laborHoursEstimate}hr labor`}
            color={analysis.complexity?.score >= 7 ? '#f85149' : analysis.complexity?.score >= 4 ? '#d29922' : '#3fb950'}
          />

          {/* Lead Time */}
          <MetricCard
            label="Est. Lead Time"
            value={`${analysis.leadTime?.totalDays} days`}
            sub={analysis.leadTime?.risk?.replace('_', ' ')}
            color={analysis.leadTime?.risk === 'standard' ? '#3fb950' : analysis.leadTime?.risk === 'manager_review' ? '#f85149' : '#d29922'}
          />

          {/* Structural */}
          <MetricCard
            label="Structural"
            value={analysis.structural?.level === 'none' ? '✅ Clear' : `⚠️ ${analysis.structural?.level}`}
            sub={analysis.structural?.reasons?.[0] || 'No concerns'}
            color={analysis.structural?.level === 'none' ? '#3fb950' : '#f85149'}
          />

          {/* Tempered */}
          <MetricCard
            label="Tempered Glass"
            value={analysis.tempered?.required ? '🔴 Required' : analysis.tempered?.reasons?.length ? '🟡 Review' : '🟢 Not Required'}
            sub={analysis.tempered?.reasons?.[0] || 'No tempered trigger'}
            color={analysis.tempered?.required ? '#f85149' : '#3fb950'}
          />

          {/* Rough Opening */}
          {analysis.roughOpening && (
            <MetricCard
              label="Rough Opening"
              value={`${analysis.roughOpening.roWidth}" × ${analysis.roughOpening.roHeight}"`}
              sub="Calculated R.O."
              color="#58a6ff"
            />
          )}

          {/* Complexity Factors */}
          {analysis.complexity?.factors?.length > 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: 'var(--bg-tertiary, #0d1117)', borderRadius: '8px', fontSize: '0.8rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Complexity Factors:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-muted)' }}>
                {analysis.complexity.factors.map((f: any, i: number) => (
                  <li key={i}>{f.label} (+{f.points})</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tempered Reasons */}
          {analysis.tempered?.reasons?.length > 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: analysis.tempered.required ? 'rgba(248,81,73,0.1)' : 'rgba(210,153,34,0.1)', borderRadius: '8px', fontSize: '0.8rem', border: `1px solid ${analysis.tempered.required ? '#f8514966' : '#d2992266'}` }}>
              <strong style={{ color: analysis.tempered.required ? '#f85149' : '#d29922' }}>
                {analysis.tempered.required ? '🔴 Tempered Required' : '🟡 Tempered Review'}
              </strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-muted)' }}>
                {analysis.tempered.reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Structural Warnings */}
          {analysis.structural?.level !== 'none' && (
            <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: 'rgba(248,81,73,0.1)', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #f8514966' }}>
              <strong style={{ color: '#f85149' }}>⚠️ Structural Review Needed</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                This is not engineering certification. Consult a structural engineer for definitive assessment.
              </p>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-muted)' }}>
                {analysis.structural.reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary, #0d1117)', borderRadius: '8px', borderLeft: `3px solid ${color || '#58a6ff'}` }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #8b949e)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #e6edf3)', marginTop: '2px' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

export default OpeningIntelligencePanel;
