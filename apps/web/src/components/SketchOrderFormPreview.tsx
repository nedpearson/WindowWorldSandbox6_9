import { useState, useMemo } from 'react';
import { ORDER_FORM_SKETCH_BOX } from '../config/workbookFieldMap';
import { calculateSketchFit } from './sketchExportUtils';

interface SketchMarker {
  id: string;
  openingNumber: number;
  room?: string;
  elevation?: string;
}

interface Props {
  appointmentId: string;
  openings: any[];
  markers: SketchMarker[];
  sketchExists: boolean;
  onExportSketch?: () => void;
  onEditSketch?: () => void;
  onAddFullPage?: () => void;
}

export function SketchOrderFormPreview({
  appointmentId, openings, markers, sketchExists, onExportSketch, onEditSketch, onAddFullPage,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const box = ORDER_FORM_SKETCH_BOX;

  // Marker validation
  const validation = useMemo(() => {
    const markerNumbers = markers.map(m => m.openingNumber);
    const openingNumbers = openings.map(o => o.openingNumber);

    const unlinkedOpenings = openingNumbers.filter(n => !markerNumbers.includes(n));
    const unlinkedMarkers = markerNumbers.filter(n => !openingNumbers.includes(n));
    const duplicateMarkers = markerNumbers.filter((n, i) => markerNumbers.indexOf(n) !== i);
    const countMismatch = markers.length !== openings.length;

    const issues: { severity: 'BLOCKER' | 'WARNING' | 'INFO'; message: string }[] = [];

    if (!sketchExists) {
      issues.push({ severity: 'BLOCKER', message: 'No sketch created — Order Form sketch box will be empty' });
    }
    for (const n of unlinkedOpenings) {
      issues.push({ severity: 'WARNING', message: `Opening #${n} is not shown in the sketch box` });
    }
    for (const n of unlinkedMarkers) {
      issues.push({ severity: 'WARNING', message: `Sketch marker #${n} is not linked to an opening row` });
    }
    if (duplicateMarkers.length > 0) {
      issues.push({ severity: 'WARNING', message: `Sketch has duplicate marker numbers: ${[...new Set(duplicateMarkers)].map(n => `#${n}`).join(', ')}` });
    }
    if (countMismatch && markers.length > 0 && openings.length > 0) {
      issues.push({ severity: 'INFO', message: `Sketch marker count (${markers.length}) does not match opening count (${openings.length})` });
    }

    return {
      issues,
      blockers: issues.filter(i => i.severity === 'BLOCKER').length,
      warnings: issues.filter(i => i.severity === 'WARNING').length,
      allClear: issues.length === 0,
    };
  }, [markers, openings, sketchExists]);

  const sevColor = (s: string) => s === 'BLOCKER' ? '#ef4444' : s === 'WARNING' ? '#f59e0b' : '#60a5fa';

  return (
    <div className="card" style={{
      borderColor: validation.blockers > 0 ? 'rgba(239,68,68,0.3)' : validation.allClear ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)',
      background: validation.blockers > 0 ? 'rgba(239,68,68,0.03)' : validation.allClear ? 'rgba(34,197,94,0.03)' : 'rgba(245,158,11,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setShowDetails(!showDetails)}>
        <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🖼️ Sketch / Drawing Box
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            color: validation.allClear ? '#22c55e' : validation.blockers > 0 ? '#ef4444' : '#f59e0b',
            background: validation.allClear ? 'rgba(34,197,94,0.1)' : validation.blockers > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          }}>
            {validation.allClear ? 'Ready' : `${validation.issues.length} issue${validation.issues.length > 1 ? 's' : ''}`}
          </span>
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{showDetails ? '▲' : '▼'}</span>
      </div>

      {showDetails && (
        <div style={{ marginTop: '0.75rem' }}>
          {/* Sketch box info */}
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-input)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>Target:</strong> Order Form → {box.range} (upper-left blank box) · {box.approxWidthPx}×{box.approxHeightPx}px
          </div>

          {/* Validation issues */}
          {validation.issues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
              {validation.issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.25rem 0.5rem', background: `${sevColor(issue.severity)}08`, borderRadius: 4 }}>
                  <span style={{ color: sevColor(issue.severity), fontWeight: 700, fontSize: '0.6875rem' }}>
                    {issue.severity === 'BLOCKER' ? '🛑' : issue.severity === 'WARNING' ? '⚠' : 'ℹ'}
                  </span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-primary" onClick={onEditSketch}>
              ✏️ {sketchExists ? 'Edit Sketch' : 'Draw Sketch'}
            </button>
            {sketchExists && (
              <>
                <button className="btn btn-sm btn-secondary" onClick={onExportSketch}>
                  📸 Preview in Order Form
                </button>
                <button className="btn btn-sm btn-secondary" onClick={onAddFullPage}>
                  📄 Add Full-Size Sketch Page
                </button>
              </>
            )}
          </div>

          {/* Marker summary */}
          {markers.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {markers.map(m => {
                const linked = openings.find(o => o.openingNumber === m.openingNumber);
                return (
                  <span key={m.id} style={{
                    fontSize: '0.6875rem', padding: '1px 6px', borderRadius: 4,
                    background: linked ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                    color: linked ? '#3b82f6' : '#ef4444',
                  }}>
                    #{m.openingNumber} {m.room || linked?.roomLocation || ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
