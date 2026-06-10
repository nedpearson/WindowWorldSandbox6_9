import React, { useEffect, useState, useCallback, useRef } from 'react';
import { parseMeasurement, toFractionDisplay } from '../utils/measurementParser';
import { HelpLink } from './HelpLink';
import { api } from '../utils/api';
import { toast } from './Toast';
import { SmartCheckPanel } from "./SmartCheckPanel";
import { useSmartCheck } from "../hooks/useSmartCheck";
import { learnFromOpening } from '../utils/repMemory';
import { predictNewOpening, generateAutopilotSuggestions } from '../utils/repAutopilot';
import type { AutopilotSuggestion } from '../utils/repAutopilot';
import { SmartSuggestionBar, ConfigPicker, RoomAutocomplete, InstallNoteSuggestions, QuickPackages } from './SmartSuggestions';
import { QuickWxH, SameAsPrevious } from './QuickMeasure';
import { CommonSizePicker, RapidMeasureStrip } from './SpeedMeasure';
import { OpeningIntelligencePanel } from './OpeningIntelligencePanel';
import { FieldShortcutBar } from './FieldShortcutBar';
import { BrickMeasurementPanel } from './BrickMeasurementPanel';
import { OpeningBadge, NextActionBanner, ProjectHealthBar, PresetPicker } from './ValidationEngine';
import { useFieldShortcuts, OpeningNavigator, QuickDuplicateBar, FloatingActionButton } from './FieldAccelerators';
import { RowQuickActions, BulkQuickActions } from './QuickActions';
import { StatusBadge, RoomHeatmap } from './FieldMemory';
import { ForgetNothingPanel } from './ForgetNothingPanel';
import { ConfidencePanel, OpeningCompletionBar } from './ConfidencePanel';
import { UnifiedIntelBar } from './UnifiedIntelBar';
import { OpeningKnowledgePanel } from './ProKnowledgePanel';
import { SpecialShapeTrimCard } from './SpecialShapeTrimCard';
import { SidingOutsideMeasureCard } from './SidingOutsideMeasureCard';
import { specialShapeRequiresTrim, isSidingExterior, isOutsideMeasure } from '../utils/businessRules';
import {
  useAutosave, useCrashGuard, useRecoveryCheck,
  saveOpeningVersion, journalWrite, undoPush, undoPop, undoCount,
  clearAutosave, RecoveryBanner, VersionHistoryPanel, AutosaveIndicator,
} from '../utils/dataGuard';
import { markQuoteGroupsStaleByOpening } from '../lib/offlineDb';
import { validateWindowConfiguration, type ValidationResult, type WindowConfig } from '../utils/pricingValidation';
import { reviewJob, type EstimatorAlert } from '../utils/seniorEstimator';

const CATEGORIES = ['double_hung','picture','slider','casement','awning','eyebrow','circle_top','quarter_arch','patio_door','custom_shape'];
const ELEVATIONS = ['1st_story', '2nd_story'];
const COLORS = ['White','Almond','Clay','Bronze','Black','Dark Chocolate','Forest Green'];
const GRID_STYLES = ['None','Colonial','Prairie','Diamond','Perimeter'];
const GLASS_PKG = ['LEE','LE'];
const REMOVAL = ['ALUM','full_tearout','insert','none'];
const SPECIALTY = ['eyebrow','circle_top','quarter_arch','custom_shape'];

const empty = (appointmentId: string, num: number) => ({
  appointmentId, openingNumber: num, quantity: 1, roomLocation: '', elevation: '1st_story', floorNumber: 1, width: 0, height: 0,
  productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White',
  gridStyle: 'None', gridPattern: '', glassPackage: 'LEE', temperedGlass: 'none', obscureGlass: 'none',
  argon: false, foamEnhanced: false, nailFin: false, oriel: false, horizontalRR: false, sillRepair: false,
  lowEPackage: '', screenOption: 'Half Screen', trimNotes: '', hinge: '', requiresTrimHeader: false,
  removalType: 'ALUM', installType: 'EXT', installNotes: '', customerNotes: '', installerNotes: '',
  basePrice: 0, optionsPrice: 0, laborPrice: 0, totalPrice: 0,
  radius: null, customRadius: null, legHeight: null, specialtyNotes: '', needsVerification: false
});

export function OpeningEditor({ appointmentId, onUpdate, jobExteriorType, jobInstallType }: { appointmentId: string; onUpdate: () => void; jobExteriorType?: string; jobInstallType?: string }) {
  const [openings, setOpenings] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);  // Default ON — table view is fastest for field reps
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for synthetic intelligence auto-navigation
  useEffect(() => {
    const handleOpen = (e: any) => {
      const { openingNumber, field } = e.detail;
      const op = openings.find((o: any) => o.openingNumber === openingNumber);
      if (op) {
        setEditing(op);
        // Optional: wait a tick and scroll to field
        if (field) {
          setTimeout(() => {
            // Find by name, id, or text label match heuristically
            const inputs = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLElement[];
            const el = inputs.find(i => 
              i.getAttribute('name') === field || 
              i.id?.toLowerCase().includes(field.toLowerCase()) ||
              i.className?.toLowerCase().includes(field.toLowerCase())
            );
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      }
    };
    window.addEventListener('wwa-open-editor', handleOpen);
    return () => window.removeEventListener('wwa-open-editor', handleOpen);
  }, [openings]);

  // Auto-scroll to last edited opening on mount
  useEffect(() => {
    const lastEdited = sessionStorage.getItem(`wwa_last_opening_${appointmentId}`);
    if (lastEdited && scrollContainerRef.current) {
      setTimeout(() => {
        const row = document.querySelector(`[data-opening-num="${lastEdited}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [openings.length]);

  // Autosave every 30s while editing — interruption-safe
  useEffect(() => {
    if (editing) {
      autosaveTimerRef.current = setInterval(() => {
        if (editing && editing.id) {
          api.updateOpening(editing.id, editing).catch((err) => {
            console.error('[OpeningEditor] Autosave failed:', err);
            toast.error('Autosave failed - changes may not be synced');
          });
        }
      }, 30000);
    }
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [editing]);

  const { report: smartCheckReport, loading: smartCheckLoading, runCheck: runSmartCheck, handleFindingResolved } = useSmartCheck(appointmentId, {
    openings,
    stage: 'full_details',
  });

  const [brickMode, setBrickMode] = useState(jobExteriorType === 'brick');  // Auto-detect from job-level setting
  const [lastSaved, setLastSaved] = useState<any>(null);
  const [showVersions, setShowVersions] = useState(false);

  const [radiusText, setRadiusText] = useState('');
  const [legHeightText, setLegHeightText] = useState('');
  const [orielText, setOrielText] = useState('');

  useEffect(() => {
    if (editing) {
      setRadiusText(editing.radius ? toFractionDisplay(editing.radius) : '');
      setLegHeightText(editing.legHeight ? toFractionDisplay(editing.legHeight) : '');
      setOrielText(editing.orielUpperSashHeight ? toFractionDisplay(editing.orielUpperSashHeight) : '');
    } else {
      setRadiusText('');
      setLegHeightText('');
      setOrielText('');
    }
  }, [editing?.id, editing?.radius, editing?.legHeight, editing?.orielUpperSashHeight]);

  const handleRadiusChange = (val: string) => {
    setRadiusText(val);
    const parsed = parseMeasurement(val);
    if (parsed.valid) {
      upd('radius', parsed.inches);
    } else if (val === '') {
      upd('radius', null);
    }
  };

  const handleLegHeightChange = (val: string) => {
    setLegHeightText(val);
    const parsed = parseMeasurement(val);
    if (parsed.valid) {
      upd('legHeight', parsed.inches);
    } else if (val === '') {
      upd('legHeight', null);
    }
  };

  const handleOrielChange = (val: string) => {
    setOrielText(val);
    const parsed = parseMeasurement(val);
    if (parsed.valid) {
      upd('orielUpperSashHeight', parsed.inches);
    } else if (val === '') {
      upd('orielUpperSashHeight', null);
    }
  };

  const load = async () => {
    const data = await api.getOpenings(appointmentId);
    setOpenings(data);
  };

  useEffect(() => { load(); }, [appointmentId]);

  // ── DataGuard: Continuous autosave ────────────────────
  useAutosave(appointmentId, editing, 2000);

  // ── DataGuard: Crash recovery guard ──────────────────
  useCrashGuard(appointmentId, editing);

  // ── DataGuard: Recovery check on mount ────────────────
  const { recoveryAvailable, recoveryData, acceptRecovery, dismissRecovery } =
    useRecoveryCheck(appointmentId, (data) => {
      if (data.editingOpening) setEditing(data.editingOpening);
    });

  const addOpening = () => {
    const num = openings.length + 1;
    // Autopilot: predict fields from existing openings
    const predicted = predictNewOpening(openings, num);
    const newOpening = { ...empty(appointmentId, num), ...predicted };
    if (jobExteriorType) (newOpening as any).exteriorType = jobExteriorType;
    if (jobInstallType) (newOpening as any).installType = jobInstallType;
    setEditing(newOpening);
  };

  const generateAutoInstallNotes = (data: any) => {
    if (data.installNotes && data.installNotes.trim().length > 0) return data; // Keep user notes

    const notes = [];
    if (data.trimRequired && data.trimType) {
      notes.push(`Trim: Install ${data.trimType}.`);
    }
    if (data.headerRequired && data.headerType) {
      notes.push(`Header: Install ${data.headerType} flashing.`);
    }
    if (data.specialShapeTrimRequired) {
      notes.push(`Special Shape Trim: Needs custom bending onsite.`);
    }
    if (data.cutbackLikely && data.cutbackReviewStatus === 'cutback_required') {
      notes.push(`Cutback: Cut back siding for proper exterior fit.`);
    }
    if (data.temperedGlass === 'full') {
      notes.push(`Glass: Tempered (Safety Glazing Rule applied).`);
    }
    if (data.removalType && data.removalType !== 'none') {
      notes.push(`Removal: ${data.removalType} tear-out required.`);
    }

    if (notes.length > 0) {
      return { ...data, installNotes: 'Auto-Generated: ' + notes.join(' ') };
    }
    return data;
  };

  const saveOpening = async (dataToSave?: any) => {
    let data = dataToSave || editing;
    if (!data) return;
    data = generateAutoInstallNotes(data);
    setSaving(true);
    try {
      if (data.id) {
        await api.updateOpening(data.id, data);
      } else {
        const qty = data.quantity || 1;
        const baseNum = openings.length + 1;
        for (let i = 0; i < qty; i++) {
          await api.createOpening({ ...data, openingNumber: baseNum + i });
        }
      }
      // Learn from saved opening
      learnFromOpening(data);
      // DataGuard: save version + journal + clear autosave
      saveOpeningVersion(data, 'manual_save');
      journalWrite({
        type: 'opening_save', appointmentId, openingNumber: data.openingNumber,
        entityId: data.id, summary: `Saved Opening #${data.openingNumber} — ${data.roomLocation || 'Unnamed'}`,
        dataAfter: data,
      });
      markQuoteGroupsStaleByOpening(data.openingNumber).catch(() => {});
      clearAutosave(appointmentId, data.openingNumber);
      setLastSaved(data);
      // Track last edited opening for auto-scroll on return
      sessionStorage.setItem(`wwa_last_opening_${appointmentId}`, String(data.openingNumber));
      setEditing(null);
      await load();
      onUpdate();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  // Save current and immediately open the next opening for rapid entry
  const saveAndNext = async () => {
    let data = editing;
    if (!data) return;
    data = generateAutoInstallNotes(data);
    setSaving(true);
    try {
      if (data.id) await api.updateOpening(data.id, data);
      else await api.createOpening(data);
      learnFromOpening(data);
      saveOpeningVersion(data, 'manual_save');
      journalWrite({
        type: 'opening_save', appointmentId, openingNumber: data.openingNumber,
        summary: `Save & Next: Opening #${data.openingNumber}`, dataAfter: data,
      });
      markQuoteGroupsStaleByOpening(data.openingNumber).catch(() => {});
      clearAutosave(appointmentId, data.openingNumber);
      setLastSaved(data);
      await load();
      onUpdate();
      // Auto-open next new opening
      const nextNum = data.openingNumber + 1;
      setEditing(empty(appointmentId, nextNum));
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  // Quick duplicate: clone opening with optional overrides
  const duplicateOpening = useCallback(async (source: any, overrides?: Record<string, any>) => {
    const num = openings.length + 1;
    const { id, ...dup } = source;
    try {
      await api.createOpening({ ...dup, appointmentId, openingNumber: num, ...overrides });
      await load();
      onUpdate();
    } catch (e) { console.debug("[swallowed error]", e); }
  }, [openings, appointmentId]);


  const deleteOpening = async (id: string) => {
    await api.deleteOpening(id);
    await load();
    onUpdate();
  };

  // Bulk update handler for smart suggestions — parallel to avoid N+1 latency
  const handleBulkUpdate = async (field: string, value: any, targets: 'all' | 'remaining') => {
    const updates = openings
      .filter(op => op.id && !(targets === 'remaining' && op[field] === value))
      .map(op => api.updateOpening(op.id, { [field]: value }).catch(() => {}));
    await Promise.all(updates);
    await load();
    onUpdate();
  };

  const upd = (f: string, v: any) => {
    // DataGuard: track undo for field changes
    if (editing) {
      undoPush({
        type: 'field_change', entityType: 'opening', entityId: editing.id || `new_${editing.openingNumber}`,
        previousData: { [f]: editing[f] }, newData: { [f]: v },
        description: `Changed ${f} on Opening #${editing.openingNumber}`,
      });
    }
    setEditing({ ...editing, [f]: v });
  };
  const isSpecialty = editing && SPECIALTY.includes(editing.productCategory);

  // ── BTR Pricing Guideline Validation (real-time) ─────
  const pricingWarnings = editing ? validateWindowConfiguration({
    series: editing.seriesModel?.split(' ')[0],
    model: editing.seriesModel,
    productCategory: editing.productCategory,
    width: editing.width,
    height: editing.height,
    orielSize: editing.orielUpperSashHeight,
    hasOriel: !!editing.oriel,
    screenType: editing.screenType,
    gridType: editing.gridStyle?.substring(0, 2),
    gridPattern: editing.gridPattern,
    isSDL: editing.gridStyle?.toLowerCase()?.includes('sdl'),
    sdlSize: editing.sdlSize,
    vinylColor: editing.vinylColor,
    exteriorColor: editing.exteriorColor,
    interiorColor: editing.interiorColor,
    isSpecialShape: isSpecialty,
    specialShapeType: editing.productCategory,
    installType: editing.installType,
    hasTrim: editing.hasTrim,
    nailFins: editing.hasNailFins,
    roomType: editing.roomLocation?.toLowerCase()?.includes('bath') ? 'bathroom' : undefined,
    nearDoor: editing.nearDoor,
    nearStairway: editing.nearStairway,
  } as WindowConfig) : [];

  const specWarnings = () => {
    if (!editing || !isSpecialty) return [];
    const w: string[] = [];
    const cat = editing.productCategory;
    if (cat === 'circle_top' && editing.width < 12) w.push('Circle top minimum width is 12"');
    if (cat === 'eyebrow' && editing.height < 8) w.push('Eyebrow minimum height is 8"');
    if (cat === 'quarter_arch' && !editing.radius && editing.width) w.push('Quarter arch needs a radius');
    if ((cat === 'circle_top' || cat === 'eyebrow') && !editing.radius) w.push('Radius is required');
    return w;
  };

  // ── Keyboard shortcuts ──────────────────────────────
  useFieldShortcuts({
    onAddOpening: addOpening,
    onDuplicate: () => openings.length > 0 && duplicateOpening(openings[openings.length - 1]),
    onSave: () => editing && saveOpening(),
    onEscape: () => setEditing(null),
    onNextOpening: () => {
      if (!editing) return;
      const idx = openings.findIndex(o => o.openingNumber === editing.openingNumber);
      if (idx >= 0 && idx < openings.length - 1) setEditing(openings[idx + 1]);
    },
    onPrevOpening: () => {
      if (!editing) return;
      const idx = openings.findIndex(o => o.openingNumber === editing.openingNumber);
      if (idx > 0) setEditing(openings[idx - 1]);
    },
  });

  return (
    <div>
      {/* DataGuard: Crash Recovery Banner */}
      {recoveryAvailable && recoveryData && (
        <RecoveryBanner recovery={recoveryData} onAccept={acceptRecovery} onDismiss={dismissRecovery} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>🪟 Openings ({openings.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={addOpening}>
          ➕ Add Opening
        </button>
      </div>

      {/* ═══ UNIFIED INTELLIGENCE BAR ═══ */}
      {/* Replaces: ProjectHealthBar + SeniorEstimator + ForgetNothing + SmartSuggestionBar + QuickPackages */}
      {openings.length > 0 && !editing && (
        <UnifiedIntelBar openings={openings} onUpdate={onUpdate} load={load} />
      )}

      {/* ═══ RAPID MEASURE (only when unmeasured openings exist) ═══ */}
      {openings.length > 0 && !editing && openings.some(o => !o.width || o.width === 0) && (
        <RapidMeasureStrip openings={openings} onUpdateDims={async (id, w, h) => {
          await api.updateOpening(id, { width: w, height: h }).catch(() => {});
          await load(); onUpdate();
        }} />
      )}

      {/* Controls row — view toggle + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button className="btn btn-sm" onClick={() => setSimpleMode(!simpleMode)} style={{ background: simpleMode ? 'var(--primary)' : 'var(--bg-input)', color: simpleMode ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.625rem', padding: '3px 8px' }}>
            {simpleMode ? '📊 Table' : '🃏 Cards'}
          </button>
          {lastSaved && !editing && (
            <QuickDuplicateBar lastSaved={lastSaved} onDuplicate={(overrides) => duplicateOpening(lastSaved, overrides)} />
          )}
        </div>
      </div>

      {openings.length > 0 && !simpleMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {openings.map((o: any) => {
            const isComplete = o.width > 0 && o.height > 0 && o.totalPrice > 0;
            return (
              <div key={o.id} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${isComplete ? 'var(--success)' : 'var(--warning)'}` }}>
                <SmartCheckPanel
                    report={smartCheckReport}
                    loading={smartCheckLoading}
                    compact={true}
                    filterOpeningId={o.id}
                    onRunCheck={runSmartCheck}
                    onFindingResolved={handleFindingResolved}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>
                    #{o.openingNumber} — {o.roomLocation || 'Unnamed'} {o.elevation ? `(${o.elevation})` : ''}
                  </div>
                  <StatusBadge opening={o} />
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {(() => {
                    const isOutside = o.actualMeasurementBasis === 'outside' || o.measurementBasis === 'outside';
                    const needsCutback = o.cutbackRequired || o.actualMeasurementBasis === 'Opening' || o.measurementBasis === 'Opening' || isOutside;
                    const deduction = o.cutbackAmount || 0.375;
                    let orderW = o.width || 0;
                    let orderH = o.height || 0;
                    let measuredW = o.rawWidth || o.width || 0;
                    let measuredH = o.rawHeight || o.height || 0;

                    if (needsCutback && (!o.rawWidth || o.rawWidth === o.width)) {
                       orderW -= deduction;
                       orderH -= deduction;
                    }

                    if (measuredW !== orderW || measuredH !== orderH) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>
                            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{toFractionDisplay(measuredW)}</span>" W × <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{toFractionDisplay(measuredH)}</span>" H <span style={{fontSize: '0.7rem'}}>(Measured)</span>
                          </div>
                          <div style={{ color: 'var(--accent)' }}>
                            <strong>{toFractionDisplay(orderW)}</strong>" W × <strong>{toFractionDisplay(orderH)}</strong>" H <span style={{fontSize: '0.7rem'}}>(Order Size)</span>
                          </div>
                        </div>
                      );
                    }
                    return <div style={{ marginBottom: '4px' }}><strong>{toFractionDisplay(orderW) || '?'}</strong>" W × <strong>{toFractionDisplay(orderH) || '?'}</strong>" H</div>;
                  })()}
                  <div>{o.productCategory?.replace('_', ' ')} • {o.interiorColor}/{o.exteriorColor}</div>
                  <div>{o.gridStyle !== 'None' ? `${o.gridStyle} Grids • ` : ''}{o.glassOption}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setEditing(o)}>Edit</button>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={async () => {
                    await duplicateOpening(o);
                  }}>Duplicate</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteOpening(o.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {openings.length > 0 && simpleMode && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Room</th><th>Elev</th><th>W×H</th><th>UI</th><th>Product</th><th>Series</th><th>Price</th><th></th>
            </tr></thead>
            <tbody>
              {openings.map((o: any) => {
                const isIncomplete = !o.width || o.width === 0 || !o.height || o.height === 0 || !o.roomLocation;
                return (
                <React.Fragment key={o.id}>
                <tr data-opening-num={o.openingNumber} style={{ background: isIncomplete ? 'rgba(245,158,11,0.04)' : undefined }}>
                  <td>
                    {isIncomplete && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginRight: 4, animation: 'pulse 2s infinite' }} />}
                    <strong>{o.openingNumber}</strong>
                  </td>
                  <td>{o.roomLocation || <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>—</span>}</td>
                  <td>{o.elevation || '—'}</td>
                  <td>
                    {o.width && o.height ? (
                      (() => {
                        let measuredW = o.rawWidth || o.width;
                        let measuredH = o.rawHeight || o.height;
                        let orderW = o.width;
                        let orderH = o.height;
                        const isOutside = o.actualMeasurementBasis === 'outside' || o.measurementBasis === 'outside';
                        const needsCutback = o.cutbackRequired || o.actualMeasurementBasis === 'Opening' || o.measurementBasis === 'Opening' || isOutside;
                        const deduction = o.cutbackAmount || 0.375;
                        if (needsCutback && (!o.rawWidth || o.rawWidth === o.width)) {
                           orderW -= deduction;
                           orderH -= deduction;
                        }
                        if (measuredW !== orderW || measuredH !== orderH) {
                          return (
                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{toFractionDisplay(measuredW)}" × {toFractionDisplay(measuredH)}"</span>
                               <span><strong>{toFractionDisplay(orderW)}" × {toFractionDisplay(orderH)}"</strong></span>
                             </div>
                          );
                        }
                        return `${toFractionDisplay(orderW)}" × ${toFractionDisplay(orderH)}"`;
                      })()
                    ) : <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>needs dims</span>}
                  </td>
                  <td><strong>{o.unitedInches}"</strong></td>
                  <td>{o.productCategory?.replace('_', ' ')}</td>
                  <td>{o.seriesModel}</td>
                  <td>
                    ${o.totalPrice?.toFixed(2)}
                    {o.needsVerification && <span className="needs-verify" style={{ marginLeft: '0.375rem' }}>⚠</span>}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(o)} style={{ marginRight: '0.375rem' }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteOpening(o.id)}>×</button>
                  </td>
                </tr>
                <tr data-opening-actions={o.openingNumber} style={{ background: isIncomplete ? 'rgba(245,158,11,0.02)' : 'rgba(255,255,255,0.01)' }}>
                  <td colSpan={9} style={{ padding: '2px 8px 4px' }}>
                    <RowQuickActions
                      opening={o}
                      allOpenings={openings}
                      onUpdate={async (fields) => {
                        await api.updateOpening(o.id, fields).catch(() => {});
                        await load(); onUpdate();
                      }}
                      onDuplicate={() => duplicateOpening(o)}
                    />
                  </td>
                </tr>
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openings.length === 0 && !editing && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.7 }}>🪟</div>
          <h3 style={{ marginBottom: '0.375rem', fontWeight: 700 }}>No openings yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', maxWidth: 320, margin: '0 auto 1.25rem' }}>
            Add windows, doors, or siding to begin.
          </p>
          <button className="btn btn-primary" onClick={addOpening}>
            ➕ Add First Opening
          </button>
        </div>
      )}

      {/* Editor modal (Manual) */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              // On touch devices, tapping the backdrop to close the keyboard often accidentally discards edits.
              // Auto-save instead of discarding, or just ignore the click.
              // We'll ignore the click and force them to use Save/Cancel buttons to prevent accidental data loss.
            }
          }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
           <h2 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Opening #{editing.openingNumber} — {editing.roomLocation || 'New'}
              <AutosaveIndicator hasUnsaved={!!editing} />
              {undoCount() > 0 && (
                <button onClick={() => {
                  const entry = undoPop();
                  if (entry) setEditing({ ...editing, ...entry.previousData });
                }} style={{
                  padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)', fontSize: '0.65rem',
                  cursor: 'pointer',
                }}>↩ Undo</button>
              )}
            </h2>

            {/* ═══ AUTOPILOT BAR (compact, only when useful) ═══ */}
            {(() => {
              const suggestions = generateAutopilotSuggestions(editing, openings);
              if (suggestions.length === 0) return null;
              return (
                <div style={{
                  display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem',
                  padding: '6px 8px', borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
                    🪄 Autopilot
                  </span>
                  {suggestions.slice(0, 5).map((s: AutopilotSuggestion) => (
                    <button key={s.id} onClick={() => setEditing({ ...editing, ...s.fields })} style={{
                      padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)',
                      background: s.confidence > 0.8 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
                      color: s.confidence > 0.8 ? '#6366f1' : 'var(--text-secondary)',
                      fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }} title={s.detail}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* ═══ BTR PRICING ALERTS (critical only — shown inline) ═══ */}
            {pricingWarnings.filter(w => w.severity === 'critical').length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                {pricingWarnings.filter(w => w.severity === 'critical').map(w => (
                  <div key={w.id} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.375rem', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>🚫 {w.message}</div>
                    {w.suggestion && <div style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>💡 {w.suggestion}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ═══ REP CONFIDENCE FEEDBACK ═══ */}
            <ConfidencePanel opening={editing} allOpenings={openings} />

            {/* ═══ PRO KNOWLEDGE TALK TRACKS ═══ */}
            <OpeningKnowledgePanel opening={editing} />

            {/* ═══ QUICK PRESETS ═══ */}
            <PresetPicker onApply={(fields) => setEditing({ ...editing, ...fields })} />

            {/* Specialty warnings */}
            {specWarnings().length > 0 && (
              <ul className="warning-list" style={{ marginBottom: '1rem' }}>
                {specWarnings().map((w, i) => <li key={i} className="warning-item">⚠ {w}</li>)}
              </ul>
            )}

            {/* Basic info — with Room autocomplete */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Room / Location</label>
                <RoomAutocomplete value={editing.roomLocation || ''} onChange={(v) => upd('roomLocation', v)} />
              </div>
              <div className="form-group"><label className="form-label">Elevation</label>
                <select className="form-select" value={editing.elevation || ''} onChange={e => upd('elevation', e.target.value)}>
                  {ELEVATIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Floor</label>
                <select className="form-select" value={editing.floorNumber || 1} onChange={e => upd('floorNumber', +e.target.value)}>
                  {[1,2,3].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* ═══ BRICK HOUSE MEASUREMENT MODE ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: brickMode ? '#d2691e' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={brickMode} onChange={e => setBrickMode(e.target.checked)} />
                🧱 Brick House Mode
              </label>
              {brickMode && (
                <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(210,105,30,0.12)', color: '#d2691e', padding: '2px 6px', borderRadius: '4px' }}>
                  3-Point Measurement · Smallest Value · Outside
                </span>
              )}
            </div>

            {brickMode ? (
              <BrickMeasurementPanel
                opening={editing}
                onUpdate={(fields) => setEditing({ ...editing, ...fields })}
                isBrickHouse={true}
              />
            ) : (
              /* ═══ STANDARD QUICK MEASUREMENT ENTRY ═══ */
              <>
                {/* Common size presets */}
                <CommonSizePicker
                  onSelect={(w, h) => {
                    upd('width', w);
                    upd('height', h);
                    setEditing({ ...editing, width: w, height: h });
                  }}
                  recentSizes={openings
                    .filter(o => o.width > 0 && o.height > 0 && o.id !== editing.id)
                    .slice(-5)
                    .map(o => ({ w: o.width, h: o.height }))
                    .filter((s, i, arr) => arr.findIndex(a => a.w === s.w && a.h === s.h) === i)
                  }
                />
                <QuickWxH
                  width={editing.width || 0}
                  height={editing.height || 0}
                  onWidthChange={(v) => upd('width', v)}
                  onHeightChange={(v) => upd('height', v)}
                  productCategory={editing.productCategory || 'double_hung'}
                  measurementBasis={editing.actualMeasurementBasis || editing.measurementBasis || 'Exact'}
                  onBasisChange={v => { upd('actualMeasurementBasis', v); upd('pricingStatus', 'stale'); }}
                  rawWidth={editing.rawWidth}
                  rawHeight={editing.rawHeight}
                  onRawWidthChange={(v) => upd('rawWidth', v)}
                  onRawHeightChange={(v) => upd('rawHeight', v)}
                  deduction={editing.cutbackAmount || 0.375}
                />
              </>
            )}

            {/* Product */}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Product Category</label>
                <select className="form-select" value={editing.productCategory || ''} onChange={e => upd('productCategory', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Series / Model</label>
                <select className="form-select" value={editing.seriesModel || ''} onChange={e => upd('seriesModel', e.target.value)}>
                  {['4000 Series','6000 Series','Custom'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Colors */}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Interior Color</label>
                <select className="form-select" value={editing.interiorColor || ''} onChange={e => upd('interiorColor', e.target.value)}>
                  {COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Exterior Color</label>
                <select className="form-select" value={editing.exteriorColor || ''} onChange={e => upd('exteriorColor', e.target.value)}>
                  {COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Grid & Glass */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Grid Style
                  <HelpLink articleId="lib-grids" label="Grid types and options" />
                </label>
                <select className="form-select" value={editing.gridStyle || ''} onChange={e => upd('gridStyle', e.target.value)}>
                  {GRID_STYLES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Grid Pattern</label><input className="form-input" value={editing.gridPattern || ''} onChange={e => upd('gridPattern', e.target.value)} placeholder="e.g. 2x2" /></div>
              <div className="form-group"><label className="form-label">Glass Package</label>
                <select className="form-select" value={editing.glassPackage || ''} onChange={e => upd('glassPackage', e.target.value)}>
                  {GLASS_PKG.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '0.75rem 0' }}>
              <div className="form-group" style={{ minWidth: 120 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Tempered
                  <HelpLink articleId="lib-tempered-glass" label="Tempered glass rules (IRC R308.4)" />
                </label>
                <select className="form-select" value={editing.temperedGlass || 'none'} onChange={e => upd('temperedGlass', e.target.value)}>
                  <option value="none">None</option><option value="full">Full</option><option value="half">Half</option>
                </select>
              </div>
              <div className="form-group" style={{ minWidth: 120 }}><label className="form-label">Obscure</label>
                <select className="form-select" value={editing.obscureGlass || 'none'} onChange={e => upd('obscureGlass', e.target.value)}>
                  <option value="none">None</option><option value="full">Full</option><option value="half">Half</option>
                </select>
              </div>
              <div className="form-check"><input type="checkbox" checked={editing.argon} onChange={e => upd('argon', e.target.checked)} /><label>Argon</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.foamEnhanced} onChange={e => upd('foamEnhanced', e.target.checked)} /><label>Foam Enhanced</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.nailFin} onChange={e => upd('nailFin', e.target.checked)} /><label>Nail Fin</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.oriel} onChange={e => upd('oriel', e.target.checked)} /><label>Oriel</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.horizontalRR} onChange={e => upd('horizontalRR', e.target.checked)} /><label>H R&R</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.sillRepair} onChange={e => upd('sillRepair', e.target.checked)} /><label>Sill Repair</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.requiresTrimHeader} onChange={e => upd('requiresTrimHeader', e.target.checked)} /><label>Trim Required</label></div>
            </div>

            {/* ═══ EXTERIOR SURFACE + MEASUREMENT METHOD ═══ */}
            {/* These two fields trigger Rules B, C, D for siding + outside measure */}
            <div className="form-row" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Exterior Surface
                  <HelpLink articleId="lib-siding-outside-measure-cutback" label="Siding + outside measure rules" />
                </label>
                <select
                  id={`exterior-surface-${editing.openingNumber}`}
                  className="form-select"
                  value={editing.exteriorSurface || editing.exteriorType || ''}
                  onChange={e => {
                    upd('exteriorSurface', e.target.value);
                    upd('exteriorType', e.target.value);
                  }}
                >
                  <option value="">— Select —</option>
                  <option value="brick">Brick</option>
                  <option value="stucco">Stucco</option>
                  <option value="siding">Siding (Vinyl / Lap)</option>
                  <option value="wood_siding">Wood Siding</option>
                  <option value="hardie">Hardie / Fiber Cement</option>
                  <option value="t1_11">T1-11</option>
                  <option value="existing_trim">Existing Trim / Casing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  What touches the window?
                </label>
                <select className="form-select" value={editing.whatTouchesWindow || ''} onChange={e => {
                  upd('whatTouchesWindow', e.target.value);
                  upd('pricingStatus', 'stale'); // measurement basis might change
                }}>
                  <option value="">Select material...</option>
                  <option value="Siding">Siding</option>
                  <option value="Brick">Brick</option>
                  <option value="Wood">Wood</option>
                  <option value="Stucco">Stucco</option>
                  <option value="Trim">Trim</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Measurement Method
                  <HelpLink articleId="lib-header-flashing" label="Outside measure → header required" />
                </label>
                <select
                  id={`measurement-method-${editing.openingNumber}`}
                  className="form-select"
                  value={editing.measurementMethod || 'inside'}
                  onChange={e => {
                    upd('measurementMethod', e.target.value);
                    upd('outsideMeasureUsed', e.target.value === 'outside');
                  }}
                >
                  <option value="inside">Inside (Standard)</option>
                  <option value="outside">Outside Measure</option>
                  <option value="cush">Cush Measure</option>
                  <option value="unknown">Unknown / Ask</option>
                </select>
                {editing.measurementMethod === 'outside' && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#f97316',
                    marginTop: '0.25rem', display: 'block',
                  }}>
                    ⚠ Outside measure — header + cutback + trim review required
                  </span>
                )}
              </div>
            </div>


            {/* Specialty fields */}
            {isSpecialty && (
              <div className="card" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)', marginTop: '0.75rem' }}>
                <h3 style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>🔷 Specialty Shape Details</h3>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Radius</label><input className="form-input" type="text" value={radiusText} onChange={e => handleRadiusChange(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Leg Height</label><input className="form-input" type="text" value={legHeightText} onChange={e => handleLegHeightChange(e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Specialty Notes</label><textarea className="form-textarea" value={editing.specialtyNotes || ''} onChange={e => upd('specialtyNotes', e.target.value)} /></div>
              </div>
            )}

            {/* Oriel fields */}
            {editing.oriel && (
              <div className="card" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.3)', marginTop: '0.75rem' }}>
                <h3 style={{ color: '#93c5fd', marginBottom: '0.75rem' }}>🔷 Oriel Window Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Top Sash Height (inches)</label>
                    <input className="form-input" type="text" value={orielText} onChange={e => handleOrielChange(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Installation */}
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Removal Type</label>
                <select className="form-select" value={editing.removalType || ''} onChange={e => upd('removalType', e.target.value)}>
                  {REMOVAL.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Screen</label>
                <select className="form-select" value={editing.screenOption || ''} onChange={e => upd('screenOption', e.target.value)}>
                  {['Half','Full','Full Screen','Retractable','None'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Pricing — single total field (base/options/labor come from pricing engine) */}
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Total Price</label><input className="form-input" type="number" step="0.01" value={editing.totalPrice || ''} onChange={e => upd('totalPrice', +e.target.value)} /></div>
            </div>

            {/* Notes — single unified field */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={editing.installNotes || ''} onChange={e => upd('installNotes', e.target.value)} placeholder="Install notes, trim details, special instructions..." />
              {/* ═══ SMART NOTE SUGGESTIONS ═══ */}
              <InstallNoteSuggestions opening={editing} onAppend={(note) => {
                const existing = editing.installNotes || '';
                upd('installNotes', existing ? `${existing}\n${note}` : note);
              }} />
            </div>

            <div className="form-check" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={editing.needsVerification} onChange={e => upd('needsVerification', e.target.checked)} />
              <label style={{ color: 'var(--warning)' }}>⚠ Needs Verification</label>
            </div>

            {/* ═══ VALIDATION + NEXT ACTION ═══ */}
            <NextActionBanner opening={editing} allOpenings={openings} isBrick={brickMode} />

            {/* ═══ EXTERIOR CONDITION RULE CARDS ═══ */}
            {/* Rule A: Special Shape Trim (radius shapes only — per BTR p60) */}
            {specialShapeRequiresTrim(editing) && (
              <SpecialShapeTrimCard
                opening={editing}
                appointmentId={appointmentId}
                onUpdate={(updated) => setEditing({ ...editing, ...updated })}
              />
            )}

            {/* Rules B/C/D: Siding + Outside Measure — unified decision card */}
            {isSidingExterior(editing) && isOutsideMeasure(editing) && (
              <SidingOutsideMeasureCard
                opening={editing}
                appointmentId={appointmentId}
                onUpdate={(updated) => setEditing({ ...editing, ...updated })}
              />
            )}

            {/* ═══ SAME AS PREVIOUS (below form — useful after filling fields) ═══ */}
            <SameAsPrevious
              previousOpening={openings.find((o: any) => o.openingNumber === editing.openingNumber - 1) || null}
              currentOpening={editing}
              onApply={(fields) => setEditing({ ...editing, ...fields })}
            />

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
                onClick={saveAndNext} disabled={saving}>Save & Next →</button>
              <button className="btn btn-secondary" onClick={() => saveOpening()} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Ctrl+S · Ctrl+N · Ctrl+Z · Esc</span>
            </div>


          </div>
        </div>
      )}

      {/* ═══ FLOATING ADD BUTTON (mobile) - REMOVED (Sketch Canvas handles adding) ═══ */}
    </div>
  );
}
