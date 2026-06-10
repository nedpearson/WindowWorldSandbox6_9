import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../utils/api';
import { useAuthStore } from '../store';

import { LiveExteriorVisualizer } from '../components/LiveExteriorVisualizer';
import { SignaturePad } from '../components/SignaturePad';
import { useNavigate } from 'react-router-dom';
import { toast } from './Toast';
import { runPreSubmissionSweep, type SweepCheckpoint, type ReadinessReport } from '../utils/preSubmissionSweep';
import { handleFixIssue } from '../utils/issueFixRouter';
import { DocumentCardSection } from './documents/DocumentCardSection';
import { exportContract } from '../utils/exportContract';
import { validateSketchOrderContractConsistency } from '../utils/sketchOrderContractConsistency';
import { ReadinessGate } from './ReadinessGate';
import { calculateFinancePayment } from '../lib/financeEngine';
import type { FinanceOption } from '../types';

export function ProposalBuilder({ 
  appointment, 
  jobAmount, 
  onSelectFinancing,
  onLockOrder
}: { 
  appointment: any; 
  jobAmount: number; 
  onSelectFinancing?: (plan: string | null) => void;
  onLockOrder?: () => void;
}) {
  const safeJobAmount = Number.isFinite(jobAmount) ? jobAmount : 0;
  const [tiers, setTiers] = useState<any[]>([]);
  const [financing, setFinancing] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [addedUpgradesAmount, setAddedUpgradesAmount] = useState<number>(0);
  const [autoAppliedRecs, setAutoAppliedRecs] = useState<Record<string, boolean>>({});
  
  const [selectedTier, setSelectedTier] = useState<string>('solarzone');
  const [selectedPlan, setSelectedPlan] = useState<string>('cash');
  const [finResult, setFinResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'proposal'|'energy'|'before_after'|'upgrades'|'signing'|'readiness'|'diagnostics'>('proposal');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [highlightSignature, setHighlightSignature] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [pricingResult, setPricingResult] = useState<{ lineItems: any[]; total: number } | null>(null);

  const activeTierObj = tiers.find(t => t.tier === selectedTier);

  useEffect(() => {
    if (appointment?.id) {
      const saved = localStorage.getItem(`sketch_annotations_${appointment.id}`);
      if (saved) {
        try {
          setAnnotations(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [appointment?.id]);

  useEffect(() => {
    // Parse focus targets from URL hash (e.g. #proposal?focus=ownerSignature)
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const focusTarget = hashParams.get('focus');
    if (focusTarget && ['ownerSignature', 'signatureDate', 'estimatorSignature', 'customerInitials'].includes(focusTarget)) {
      setActiveTab('signing');
      setHighlightSignature(true);
      setTimeout(() => setHighlightSignature(false), 3000); // clear after 3s
    }
  }, []);

  useEffect(() => {
    const fetchSelectedPricing = async () => {
      if (appointment?.openings?.length > 0 && activeTierObj) {
        try {
          const testOpenings = appointment.openings.map((o: any) => ({ ...o, ...activeTierObj.defaults }));
          const res = await api.calculateOfficialPricing({
            openings: testOpenings,
            discount: appointment.discount || 0,
          });
          setPricingResult({
            lineItems: res.lineItems || [],
            total: res.totals?.total || 0
          });
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchSelectedPricing();
  }, [appointment, selectedTier, activeTierObj]);

  useEffect(() => {
    // Hardcode tiers to mockTiers to satisfy 2-tier option constraint and completely avoid API cache issues
    const activeTiers = mockTiers;
    const mergedTiers = activeTiers.map((at: any) => {
      const mockT = mockTiers.find(mt => mt.tier === at.tier);
      return {
        ...at,
        features: at.features || (mockT as any)?.features || []
      };
    });
    setTiers(mergedTiers);

    // Fetch canonical pricing for each tier
    const fetchPricing = async () => {
      if (appointment?.openings?.length > 0) {
        const prices: Record<string, number> = {};
        await Promise.all(mergedTiers.map(async (tier) => {
          try {
            const testOpenings = appointment.openings.map((o: any) => ({ ...o, ...tier.defaults }));
            const res = await api.calculateOfficialPricing({
              openings: testOpenings,
              discount: appointment.discount || 0,
            });
            prices[tier.tier] = res.totals.total;
          } catch (e) {
            console.error('Pricing lookup failed for tier:', tier.tier, e);
            toast.error(`Pricing calculation failed for ${tier.tier}`);
            prices[tier.tier] = Math.round(safeJobAmount * (1 + (tier.priceModifier || 0)));
          }
        }));
        setTierPrices(prices);
      }
    };
    fetchPricing();

    // — Use canonical finance-options DB catalog (not hardcoded /proposals/financing) —
    api.get('/finance-options?active=true').then((data: any) => {
      const items = data?.items || [];
      if (items.length > 0) {
        // Normalize to shape expected by this component
        const plans = [
          { id: 'cash', name: 'Cash / Check', isCash: true, apr: 0, termMonths: 0 },
          ...items
            .filter((f: any) => f.isActive)
            .map((f: any) => ({
              id: f.id,
              name: f.displayName,
              isCash: false,
              apr: f.aprPercent ?? 0,
              termMonths: f.termMonths ?? 0,
            }))
        ];
        setFinancing(plans);
        if (!plans.find(p => p.id === selectedPlan)) setSelectedPlan('cash');
      } else {
        setFinancing(mockFinancing);
      }
    }).catch(() => setFinancing(mockFinancing));

    api.getSalesRecommendations().then(r => {
      const recommendations = r.length ? r : mockRecs;
      setRecs(recommendations);
      
      // Synthetic Intelligence: Auto-apply recommended upsells
      let autoUpsellAmount = 0;
      const autoApplied: Record<string, boolean> = {};
      recommendations.forEach((rec: any) => {
        // Assume AI confidently recommends these, so we auto-apply them
        autoUpsellAmount += Math.floor(safeJobAmount * (rec.upsellPct / 100));
        autoApplied[rec.id] = true;
      });
      setAddedUpgradesAmount(autoUpsellAmount);
      setAutoAppliedRecs(autoApplied);

      // Auto-select tier based on job size (AI rule: if > $15k, auto-select 'elite' tier)
      if (safeJobAmount > 15000) {
        setSelectedTier('elite');
      }
    }).catch(() => {
      setRecs(mockRecs);
    });
  }, [appointment, safeJobAmount]);

  useEffect(() => {
    if (!selectedPlan || safeJobAmount <= 0 || tiers.length === 0) return;

    const tier = tiers.find(t => t.tier === selectedTier);
    const adjustedAmount = tierPrices[selectedTier] || Math.round((safeJobAmount + addedUpgradesAmount) * (1 + (tier?.priceModifier || 0)));

    const plan = financing.find(f => f.id === selectedPlan);
    if (!plan) return;

    if (plan.isCash || plan.id === 'cash') {
      setFinResult({ totalAmount: adjustedAmount, isCash: true });
      if (onSelectFinancing) onSelectFinancing(null);
      return;
    }

    // 📱 Use offline canonical amortization (financeEngine.ts) 📱
    // We map the minimal properties available in `plan` to `FinanceOption`.
    // In a real flow, `plan` would be the full FinanceOption object from DB.
    const fOpt: FinanceOption = {
      id: plan.id,
      code: plan.id,
      displayName: plan.name,
      termMonths: plan.termMonths || 0,
      promoMonths: plan.promoMonths || 0,
      apr: plan.apr || 0,
      factor: plan.factor,
      monthlyPaymentFormulaType: 'standard',
      active: true,
      sortOrder: 0,
      sourceVersion: 'v1'
    };

    const calc = calculateFinancePayment({
      finalContractTotal: adjustedAmount,
      downPayment: 0, // TODO: add down payment input support if needed
      financeOption: fOpt
    });

    setFinResult({
      totalAmount: adjustedAmount,
      monthlyPayment: calc.monthlyPayment,
      termMonths: calc.termMonths,
      totalPayment: calc.monthlyPayment * calc.termMonths,
      interestCost: Math.max(0, (calc.monthlyPayment * calc.termMonths) - calc.financedBalance),
      isCash: false,
    });

    if (onSelectFinancing) onSelectFinancing(selectedPlan);
  }, [selectedPlan, safeJobAmount, selectedTier, tiers, financing, onSelectFinancing, tierPrices, addedUpgradesAmount]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [blockers, setBlockers] = useState<SweepCheckpoint[] | null>(null);
  const navigate = useNavigate();

  /** Parse sketch data safely — never crash on bad/missing input */
  const parseSketchSafe = useCallback(() => {
    try {
      if (!appointment?.sketchData) return { markers: [], groups: [] };
      const parsed = JSON.parse(appointment.sketchData);
      return { markers: parsed.markers || [], groups: parsed.groups || [] };
    } catch {
      return { markers: [], groups: [] };
    }
  }, [appointment?.sketchData]);

  /** Run pre-submission sweep and return the report. Shows blockers if not ready. */
  const runValidation = useCallback((): { ready: boolean; blockers: SweepCheckpoint[]; hasCriticals: boolean; report: ReadinessReport | null } => {
    try {
      const sketch = parseSketchSafe();
      const report = runPreSubmissionSweep(
        appointment?.openings || [],
        sketch.markers,
        sketch.groups,
        appointment || {}
      );

      // Run consistency check
      const consistency = validateSketchOrderContractConsistency(
        sketch.markers,
        appointment?.openings || [],
        sketch.groups,
        annotations,
        pricingResult
      );

      const allBlockers = [...(report.unresolvedCriticals || [])];
      
      if (!consistency.valid) {
        consistency.issues
          .filter(i => i.severity === 'blocker')
          .forEach((issue, idx) => {
            allBlockers.push({
              id: `consistency-blocker-${idx}`,
              category: 'openings',
              label: `Consistency Issue: ${issue.field}`,
              status: 'fail',
              severity: 'critical',
              detail: `${issue.openingNumber ? `Opening #${issue.openingNumber}: ` : ''}${issue.expected} vs ${issue.actual}`,
              blocksSubmission: true,
              managerApproved: false,
              fix: issue.fixAction === 'sync_grids' 
                ? 'Check and save grid settings in active opening details.' 
                : issue.fixAction === 'set_glass_package'
                  ? 'Set glass package to LE or LEE.'
                  : 'Open the sketch and review details.',
              fixAction: { type: 'opening_details', openingNumber: issue.openingNumber }
            });
          });
      }

      // Separate critical blockers from non-critical warnings
      const criticalBlockers = allBlockers.filter(b => b.severity === 'critical');
      const hasCriticals = criticalBlockers.length > 0;

      if (allBlockers.length > 0) {
        setBlockers(allBlockers);
        return { ready: false, blockers: allBlockers, hasCriticals, report };
      }
      setBlockers(null);
      return { ready: true, blockers: [], hasCriticals: false, report };
    } catch (e: any) {
      // Validation itself crashed — treat as blocking, show the error
      const crashBlocker: SweepCheckpoint = {
        id: 'validation-crash',
        category: 'openings',
        label: 'Validation engine error',
        status: 'fail',
        severity: 'critical',
        detail: `Validation could not run: ${e?.message || 'unknown error'}. Fix data issues and retry.`,
        blocksSubmission: true,
        managerApproved: false,
        fix: 'Check that all openings have valid measurements and required fields.',
      };
      setBlockers([crashBlocker]);
      return { ready: false, blockers: [crashBlocker], hasCriticals: true, report: null };
    }
  }, [appointment, parseSketchSafe, annotations, pricingResult]);

  /** Force download even with non-critical warnings (draft preview mode) */
  const handlePreviewDraft = useCallback(async () => {
    if (!appointment?.id) { toast.error('No appointment loaded.'); return; }
    setBlockers(null);
    setDownloading(true);
    try {
      let blob: Blob;
      try {
        blob = await api.exportExcel(appointment.id);
      } catch (serverErr: any) {
        const msg: string = serverErr?.message || '';
        const isOffline = msg.includes('NetworkError') || msg.includes('Failed to fetch') || !navigator.onLine;
        if (isOffline) {
          const tier = tiers.find(t => t.tier === selectedTier) || tiers[0];
          await exportContract(appointment, finResult, tier, selectedPlan);
          toast.success('📥 Draft contract downloaded (offline mode).');
          return;
        }
        toast.error(`Draft download failed: ${msg}`);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const lastName = appointment?.customer?.lastName || 'Customer';
      const firstName = appointment?.customer?.firstName || '';
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `DRAFT_${lastName}_${firstName}_WW_Contract_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('📋 Draft contract downloaded — resolve warnings before final submission.');
    } catch (err: any) {
      toast.error(`Draft download failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  }, [appointment, finResult, selectedTier, selectedPlan, tiers]);

  // Live readiness report for the Readiness tab
  const liveReadinessData = useMemo(() => {
    try {
      const sketch = parseSketchSafe();
      return {
        openings: appointment?.openings || [],
        markers: sketch.markers,
        groups: sketch.groups,
        appointment: appointment || {},
      };
    } catch {
      return { openings: [], markers: [], groups: [], appointment: {} };
    }
  }, [appointment, parseSketchSafe]);

  const [downloading, setDownloading] = useState(false);

  /** PRIMARY ACTION: Preview & Download
   *  Uses server-side pipeline: canonical template + DB sketch + validated data.
   *  Falls back to client-side ExcelJS only when server is unreachable (offline). */
  const handlePreviewDownload = useCallback(async () => {
    if (!appointment?.id) {
      toast.error('No appointment loaded.');
      return;
    }
    const validation = runValidation();
    if (!validation.ready) return; // blockers already shown in modal

    setDownloading(true);
    try {
      let blob: Blob;

      try {
        // PRIMARY: server pipeline — canonical template, DB sketch, fresh markers
        blob = await api.exportExcel(appointment.id);
      } catch (serverErr: any) {
        const msg: string = serverErr?.message || '';
        const isOffline =
          msg.includes('NetworkError') ||
          msg.includes('Failed to fetch') ||
          msg.includes('ERR_CONNECTION') ||
          msg.includes('ERR_NETWORK') ||
          !navigator.onLine;

        if (isOffline) {
          // OFFLINE FALLBACK: client-side ExcelJS from localStorage sketch
          console.warn('[Preview & Download] Server unreachable — offline fallback');
          const tier = tiers.find(t => t.tier === selectedTier) || tiers[0];
          await exportContract(appointment, finResult, tier, selectedPlan);
          toast.success('📥 Contract downloaded (offline mode — sync when back online).');
          return;
        }

        // Server returned a structured error — surface it as a blocker
        const blockerFromServer: import('../utils/preSubmissionSweep').SweepCheckpoint = {
          id: 'server-export-error',
          category: 'openings',
          label: 'Workbook generation failed',
          status: 'fail',
          severity: 'critical',
          detail: msg,
          blocksSubmission: true,
          managerApproved: false,
          fix: msg.includes('Sketch') || msg.includes('marker')
            ? 'Open Sketch and verify all openings have markers placed.'
            : msg.includes('MODEL') || msg.includes('model')
              ? 'Open the opening and set the Window World model number.'
              : 'Review the error and fix the indicated field.',
        };
        setBlockers([blockerFromServer]);
        return;
      }

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const lastName = appointment?.customer?.lastName || 'Customer';
      const firstName = appointment?.customer?.firstName || '';
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `${lastName}_${firstName}_WW_Contract_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('✅ Contract workbook downloaded!');
    } catch (err: any) {
      console.error('[Preview & Download] unexpected error:', err);
      toast.error(`Download failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  }, [appointment, finResult, selectedTier, selectedPlan, tiers, runValidation]);

  const [applying, setApplying] = useState(false);
  const applyPackage = async (tier: any) => {
    if (!appointment?.id) return;
    setApplying(true);
    try {
      const updatedOpenings = (appointment?.openings || []).map((o: any) => ({
        ...o,
        ...tier.defaults,
        foamEnhanced: o.foamEnhanced === false ? false : tier.defaults.foamEnhanced,
        argon: o.argon === false ? false : tier.defaults.argon,
      }));
      await api.batchSyncOpenings({
        appointmentId: appointment.id,
        openings: updatedOpenings
      });
      await api.recalculate(appointment.id);
      
      toast.success(`Applied ${tier.label} package! Generating contract...`);
      
      // Generate and download the filled-out Excel contract
      try {
        await exportContract(appointment, finResult, tier, selectedPlan);
        toast.success('Contract downloaded successfully!');
      } catch (err: any) {
        toast.error(`Failed to generate contract document: ${err?.message || err}`);
        console.error(err);
      }

      // Go to the filled out order form and contract tab
      setActiveTab('signing');

      // Optional: trigger parent update or next step
      // if (onLockOrder) onLockOrder();
    } catch (err: any) {
      console.error('Package apply error:', err);
      toast.error(`Failed to apply package: ${err?.message || 'Server rejected updates'}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ── BLOCKERS MODAL — exact issues with Fix Now actions ── */}
      {blockers && blockers.length > 0 && (() => {
        const criticalCount = blockers.filter(b => b.severity === 'critical').length;
        const warningCount = blockers.length - criticalCount;
        const hasOnlyWarnings = criticalCount === 0 && warningCount > 0;
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: `2px solid ${hasOnlyWarnings ? '#f59e0b' : '#ef4444'}`, maxWidth: 700, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ color: hasOnlyWarnings ? '#f59e0b' : '#ef4444', marginTop: 0, fontSize: '1.5rem' }}>
                {hasOnlyWarnings ? '⚠️' : '🛑'} {blockers.length} Issue{blockers.length !== 1 ? 's' : ''} {hasOnlyWarnings ? 'Found' : 'Must Be Resolved'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {hasOnlyWarnings
                  ? 'These are warnings — you can still preview a draft contract, but should resolve them before final submission.'
                  : `Fix ${criticalCount} critical blocker${criticalCount !== 1 ? 's' : ''} before generating a contract${warningCount > 0 ? ` (plus ${warningCount} warning${warningCount !== 1 ? 's' : ''})` : ''}:`}
              </p>
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                {blockers.map((b, i: number) => {
                  const severityIcon = b.severity === 'critical' ? '🛑' : b.severity === 'high' ? '🟧' : '🟨';
                  return (
                    <div key={b.id || i} style={{ background: b.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', padding: '1.25rem', borderRadius: 12, marginBottom: '0.75rem', borderLeft: `6px solid ${b.severity === 'critical' ? '#ef4444' : b.severity === 'high' ? '#f97316' : '#eab308'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{severityIcon}</span>
                            {b.severity === 'critical' && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 6, fontWeight: 800 }}>BLOCKER</span>}
                            {b.openingNumber ? `Opening #${b.openingNumber} — ` : ''}{b.label}
                          </div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.375rem', lineHeight: '1.4' }}>{b.detail}</div>
                        </div>
                        {b.fix && (
                          <button
                            onClick={() => {
                              setBlockers(null);
                              if (b.category === 'signatures') {
                                setActiveTab('signing');
                              } else {
                                const currentPath = window.location.pathname;
                                handleFixIssue(b, appointment?.id, navigate, { returnTo: `${currentPath}#proposal` });
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                              background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                          >Fix Now</button>
                        )}
                      </div>
                      {b.fix && <div style={{ marginTop: '0.625rem', fontSize: '0.875rem', color: '#60a5fa', fontWeight: 500 }}>💡 {b.fix}</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handlePreviewDraft}
                  disabled={downloading}
                  style={{
                    flex: 1, padding: '0.875rem', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                    fontWeight: 700, cursor: downloading ? 'wait' : 'pointer', touchAction: 'manipulation', minHeight: 48,
                    fontSize: '1rem',
                  }}
                >
                  {downloading ? '⏳ Generating...' : '🙈 Ignore Blockers & Preview'}
                </button>
                <button onClick={() => setBlockers(null)} style={{ flex: 1, padding: '0.875rem', borderRadius: 10, border: 'none', background: 'var(--bg-secondary)', color: 'white', fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation', minHeight: 48, fontSize: '1rem' }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── COMMAND CENTER HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 12px var(--success)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>GPS Verified · AI Active</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: 800, background: 'linear-gradient(45deg, #fff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Proposal Builder // {appointment?.customer?.lastName || 'Customer'}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            {appointment?.customer?.firstName} {appointment?.customer?.lastName} • {appointment?.jobAddress} • Real-Time Predictive Analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* PRIMARY ACTION */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <button
              onClick={handlePreviewDownload}
              disabled={downloading}
              style={{
                padding: '0.875rem 1.75rem',
                borderRadius: 12,
                border: 'none',
                background: downloading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: downloading ? 'wait' : 'pointer',
                boxShadow: downloading ? 'none' : '0 4px 20px rgba(59,130,246,0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: 200,
                justifyContent: 'center',
              }}
            >
              {downloading ? '⏳ Generating...' : '📥 Download Excel Workbook'}
            </button>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Includes original order form & contract</div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: 16, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <TabButton active={activeTab==='proposal'} onClick={()=>setActiveTab('proposal')}>📊 Predictive Pricing</TabButton>
        <TabButton active={activeTab === 'energy'} onClick={() => setActiveTab('energy')}>Energy Impact</TabButton>
        <TabButton active={activeTab === 'before_after'} onClick={() => setActiveTab('before_after')}>Live Visualizer</TabButton>
        <TabButton active={activeTab === 'upgrades'} onClick={() => setActiveTab('upgrades')}>Recommended Upgrades</TabButton>
        <TabButton active={activeTab === 'readiness'} onClick={() => setActiveTab('readiness')}>✅ Readiness</TabButton>
        <TabButton active={activeTab === 'signing'} onClick={() => setActiveTab('signing')}>Sign & Proceed</TabButton>
        <TabButton active={activeTab === 'diagnostics'} onClick={() => setActiveTab('diagnostics')}>🔍 Diagnostics</TabButton>
      </div>

      {/* ── CONTENT ── */}
      {activeTab === 'proposal' && (
        <div className="fade-in">
          {/* Synthetic AI: Auto-generated Executive Summary */}
          <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.05))', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
              ✨ AI Executive Summary
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '0.9375rem' }}>
              {generateExecutiveSummary(appointment, selectedTier)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {tiers.map(tier => {
              const isSelected = selectedTier === tier.tier;
              const adjustedPrice = tierPrices[tier.tier] || Math.round((safeJobAmount + addedUpgradesAmount) * (1 + tier.priceModifier));
              return (
                <div key={tier.tier} onClick={() => setSelectedTier(tier.tier)} style={{
                  padding: '2rem', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isSelected ? `linear-gradient(145deg, var(--bg-card), ${tier.color}15)` : 'var(--bg-card)',
                  border: `2px solid ${isSelected ? tier.color : 'transparent'}`,
                  boxShadow: isSelected ? `0 10px 30px -10px ${tier.color}40` : '0 4px 6px rgba(0,0,0,0.1)',
                  transform: isSelected ? 'translateY(-8px)' : 'none',
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column'
                }}>
                  {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: tier.color }} />}
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{tier.icon}</div>
                  <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: isSelected ? tier.color : 'white' }}>{tier.label}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem', minHeight: 40 }}>{tier.description}</p>
                  
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>
                    ${adjustedPrice.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Total Investment</div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', flex: 1 }}>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {generateDynamicFeatures(appointment, tier).map((feature: string, idx: number) => (
                        <FeatureItem key={idx} text={feature} active={isSelected} color={tier.color} />
                      ))}
                    </ul>
                  </div>
                  
                  {isSelected && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); applyPackage(tier); }}
                      disabled={applying}
                      style={{
                        marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: 8,
                        background: tier.color, color: '#fff', border: 'none',
                        fontWeight: 700, cursor: applying ? 'wait' : 'pointer'
                      }}
                    >
                      {applying ? 'Applying...' : 'Apply Package'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financing Focus */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem' }}>💳 Monthly Payment Focus</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {financing.map(f => (
                  <button key={f.id} onClick={() => setSelectedPlan(f.id)} style={{
                    padding: '1rem', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    border: `1px solid ${selectedPlan === f.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    background: selectedPlan === f.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: 'white'
                  }}>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    {f.apr > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{f.apr}% APR</div>}
                  </button>
                ))}
              </div>

              {finResult && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: '3rem' }}>
                  {!finResult.isCash ? (
                    <>
                      <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Estimated Monthly</div>
                      <div style={{ fontSize: '4.5rem', fontWeight: 800, color: '#3b82f6', margin: '0.5rem 0' }}>
                        ${finResult.monthlyPayment.toFixed(0)}<span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>/mo</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>For {finResult.termMonths} months • Total Project: ${finResult.totalAmount.toLocaleString()}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Cash Investment</div>
                      <div style={{ fontSize: '4.5rem', fontWeight: 800, color: '#22c55e', margin: '0.5rem 0' }}>
                        ${finResult.totalAmount.toLocaleString()}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>No interest · No monthly payments</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'energy' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem', color: '#22c55e' }}>🌱 Estimated Energy Impact</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              By upgrading to our <strong>{activeTierObj?.label || 'Premium'}</strong> package, you're investing in your home's thermal envelope. 
              Our SolarZone™ glass technology significantly reduces heat transfer, keeping your home cooler in the summer and warmer in the winter.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <span>Annual Heating Savings</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>~18%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <span>Annual Cooling Savings</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>~22%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <span>UV Protection</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>95% Blocked</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>☀️❄️</div>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Year-Round Comfort</h3>
               <p style={{ color: 'var(--text-muted)' }}>Low-E glass and Argon gas fills create a microscopic barrier against thermal transfer.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'before_after' && (
        <div className="fade-in">
          <LiveExteriorVisualizer
            appointmentId={appointment?.id}
            onAddToProposal={(imageData, options) => {
              toast.success('Visual added to proposal presentation');
            }}
          />
        </div>
      )}

      {activeTab === 'upgrades' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {recs.map((r, idx) => {
            const isApplied = autoAppliedRecs[r.id];
            const amount = Math.floor(safeJobAmount * (r.upsellPct / 100));
            return (
              <div key={idx} style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: `1px solid ${isApplied ? '#22c55e' : r.color || 'var(--border)'}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.05 }}>{r.icon || '✨'}</div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: isApplied ? '#22c55e' : r.color || 'white' }}>
                  {r.recommendation} {isApplied && <span style={{ fontSize: '0.875rem' }}>✅ Auto-Applied (AI)</span>}
                </h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{r.explanation || 'Enhance your home\'s curb appeal and functionality with this recommended upgrade.'}</p>
                <button 
                  onClick={() => {
                    if (isApplied) {
                      setAddedUpgradesAmount(prev => prev - amount);
                      setAutoAppliedRecs(prev => ({ ...prev, [r.id]: false }));
                    } else {
                      setAddedUpgradesAmount(prev => prev + amount);
                      setAutoAppliedRecs(prev => ({ ...prev, [r.id]: true }));
                    }
                  }} 
                  style={{ padding: '0.5rem 1rem', background: isApplied ? 'rgba(34,197,94,0.1)' : r.color || '#3b82f6', color: isApplied ? '#22c55e' : 'white', border: `1px solid ${isApplied ? '#22c55e' : 'transparent'}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  {isApplied ? `Remove (-$${amount})` : `Add to Proposal (+$${amount})`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'readiness' && (
        <div className="fade-in">
          <ReadinessGate
            openings={liveReadinessData.openings}
            markers={liveReadinessData.markers}
            groups={liveReadinessData.groups}
            appointment={liveReadinessData.appointment}
            onProceed={() => {
              handlePreviewDownload();
            }}
            onGoFix={(category) => {
              if (category === 'signatures') {
                setActiveTab('signing');
              } else {
                const currentPath = window.location.pathname;
                handleFixIssue(
                  { id: `fix-${category}`, category: category as any, label: '', status: 'fail', severity: 'critical', detail: '', blocksSubmission: true, managerApproved: false },
                  appointment?.id,
                  navigate,
                  { returnTo: `${currentPath}#proposal` }
                );
              }
            }}
          />
        </div>
      )}

      {activeTab === 'signing' && (
        <div className="fade-in" style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)', maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: '#3b82f6' }}>✍️ Official Sign-Off</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Please review the total investment of <strong>${(finResult?.totalAmount || safeJobAmount).toLocaleString()}</strong> with the <strong>{activeTierObj?.label || 'Premium'}</strong> package. 
            By signing below, you agree to the Window World terms and conditions and authorize the work to proceed.
          </p>
          
          <div style={{ marginBottom: '2rem' }}>
            <DocumentCardSection appointmentId={appointment.id} />
          </div>

          <div style={{
            transition: 'box-shadow 0.3s ease',
            boxShadow: highlightSignature ? '0 0 0 4px var(--accent), 0 0 20px rgba(59,130,246,0.5)' : 'none',
            borderRadius: 16
          }}>
            <SignaturePad 
              onSave={async (data) => {
                setSignatureData(data);
                toast.success('Signature captured successfully');
                await api.patch(`/appointments/${appointment.id}`, { signatureData: data });
              }} 
              onClear={() => setSignatureData(null)}
              height={220}
              label="Sign Here on the Glass"
            />
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (() => {
        const sketch = parseSketchSafe();
        const consistencyReport = validateSketchOrderContractConsistency(
          sketch.markers,
          appointment?.openings || [],
          sketch.groups,
          annotations,
          pricingResult
        );
        return (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: '#3b82f6' }}>🔍 Sketch-Order-Contract Diagnostics</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Real-time audit verifying that Sketch Canvas details flow accurately to the pricing engine and contract documents.
              </p>
              
              {/* Summary Banner */}
              {consistencyReport.issues.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span>✅</span> All Sketch settings, pricing line items, and contract mappings are 100% consistent.
                </div>
              ) : (
                <div style={{ padding: '1rem', background: consistencyReport.valid ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${consistencyReport.valid ? '#eab308' : '#ef4444'}`, borderRadius: 8, color: consistencyReport.valid ? '#facc15' : '#fca5a5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span>{consistencyReport.valid ? '⚠️' : '🛑'}</span> 
                  {consistencyReport.valid 
                    ? `Found ${consistencyReport.issues.length} warnings. Document can be generated, but review is recommended.`
                    : `Found ${consistencyReport.issues.length} issues (${consistencyReport.issues.filter(i => i.severity === 'blocker').length} blockers). You must resolve blockers before contract download.`
                  }
                </div>
              )}

              {/* Diagnostic Table */}
              <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Opening #</th>
                      <th style={{ padding: '0.75rem' }}>Category / Field</th>
                      <th style={{ padding: '0.75rem' }}>Expected (Sketch/Default)</th>
                      <th style={{ padding: '0.75rem' }}>Actual (Opening/DB)</th>
                      <th style={{ padding: '0.75rem' }}>Severity</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consistencyReport.issues.map((issue, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: issue.severity === 'blocker' ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{issue.openingNumber ? `#${issue.openingNumber}` : 'Global'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: 4, marginRight: '0.5rem' }}>
                            {issue.category}
                          </span>
                          {issue.field}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#4ade80' }}>{issue.expected}</td>
                        <td style={{ padding: '0.75rem', color: '#fca5a5' }}>{issue.actual}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ 
                            padding: '0.15rem 0.4rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                            background: issue.severity === 'blocker' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                            color: issue.severity === 'blocker' ? '#f87171' : '#facc15'
                          }}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {issue.severity === 'blocker' ? '❌ Blocked' : '⚠️ Warning'}
                        </td>
                      </tr>
                    ))}
                    {consistencyReport.issues.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          All validation checks passed successfully.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Line Items Audit Card */}
              {pricingResult && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#3b82f6', fontSize: '0.95rem' }}>Option / Labor Pricing Diagnostics</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pricingResult.lineItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px dashed rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                            {item.openingNumber ? `Opening #${item.openingNumber}` : 'Global'}
                          </span>
                          <span>{item.label}</span>
                          {item.optionCode && (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.05rem 0.25rem', borderRadius: 4, marginLeft: '0.5rem' }}>
                              {item.optionCode}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', marginTop: '0.4rem', color: '#3b82f6' }}>
                      <span>Pricing Engine Calculated Total:</span>
                      <span>${pricingResult.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}



    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--accent)' : 'transparent',
      border: '1px solid',
      borderColor: active ? 'var(--accent)' : 'transparent',
      borderRadius: 12,
      padding: '0.5rem 1rem',
      color: active ? 'white' : 'var(--text-muted)',
      fontWeight: 700,
      fontSize: '0.875rem',
      cursor: 'pointer',
      boxShadow: active ? 'var(--shadow-glow)' : 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      flex: 1
    }}>
      {children}
    </button>
  );
}

function FeatureItem({ text, active, color }: { text: string, active: boolean, color: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: active ? 'white' : 'var(--text-muted)' }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: active ? color : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {active && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
      </div>
      <span style={{ fontSize: '0.875rem' }}>{text}</span>
    </li>
  );
}

// ── Dynamic Features Generator ──
function generateDynamicFeatures(appointment: any, tier: any) {
  const features: string[] = [];
  
  // 1. Group windows by product category
  const openings = appointment?.openings || [];
  if (openings.length === 0) {
    features.push('0 openings sketched yet (Draw openings in Sketch tab)');
  } else {
    const counts: Record<string, number> = {};
    openings.forEach((o: any) => {
      // Normalize to readable names
      let cat = (o.productCategory || 'Window').replace('_', ' ');
      cat = cat.replace(/\b\w/g, (l: string) => l.toUpperCase());
      counts[cat] = (counts[cat] || 0) + (o.quantity || 1);
    });
    
    // Add window counts
    Object.entries(counts).forEach(([cat, count]) => {
      features.push(`${count} ${cat}${count > 1 && !cat.endsWith('s') ? 's' : ''}`);
    });

    // 2. Trim and Header
    const hasTrim = openings.some((o: any) => o.trimType && o.trimType !== 'None');
    if (hasTrim) features.push('Exterior Trim Included');

    const hasHeader = openings.some((o: any) => o.headerType && o.headerType !== 'None');
    if (hasHeader || appointment?.headerFlashingFeet > 0) features.push('Header Flashing Included');
    
    // Check removals
    const hasSpecialRemoval = openings.some((o: any) => o.removalType && o.removalType !== 'none');
    if (hasSpecialRemoval) features.push('Professional Tear-Out & Disposal');
  }

  // 3. Add tier-specific items
  if (tier.defaults) {
    if (tier.defaults.glassPackage) features.push(`Glass: ${tier.defaults.glassPackage}`);
    
    const hasGrids = openings.some((o: any) => o.gridStyle && o.gridStyle !== 'None' && o.gridStyle !== 'none' && o.gridStyle !== '');
    if (hasGrids) features.push('Grids Included');
    
    if (tier.defaults.foamEnhanced) features.push('Foam Enhanced Frame');
    if (tier.defaults.argon) features.push('Argon Gas Fill Included');
  }

  // 4. Lifetime Warranty
  features.push('Full Lifetime Transferrable Warranty');

  return features;
}

// ── Synthetic AI: Executive Summary Generator ──
function generateExecutiveSummary(appointment: any, tierId: string) {
  if (!appointment?.openings?.length) {
    return 'We are ready to build a customized proposal for your home once measurements are complete.';
  }
  const openings = appointment.openings;
  const count = openings.length;
  const exterior = appointment.exteriorType || appointment.aiPredictedExterior || 'your home';
  
  let dominantType = 'window';
  const typeCounts: Record<string, number> = {};
  openings.forEach((o: any) => {
    const t = o.productCategory || 'double_hung';
    typeCounts[t] = (typeCounts[t] || 0) + (o.quantity || 1);
  });
  if (Object.keys(typeCounts).length > 0) {
    dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0].replace('_', ' ');
  }

  const tierLabel = tierId === 'solarzone' ? 'Premium SolarZone™' : 'Elite SolarZone™';
  
  const removals = Array.from(new Set(openings.map((o: any) => o.removalType).filter((r: any) => r && r !== 'none')));
  const tearOutStr = removals.length > 0 ? `professional tear-out of existing ${removals.join('/')} frames` : 'careful removal of existing units';

  return `This project includes a comprehensive upgrade of ${count} openings on ${exterior}, featuring predominantly ${dominantType} styles. We will be performing a ${tearOutStr}, followed by a precision installation of our ${tierLabel} high-performance windows. This ensures maximum thermal efficiency, superior UV protection, and a complete lifetime transferable warranty.`;
}

// ── Mock Data Fallbacks ──
const mockTiers = [
  {
    tier: 'solarzone',
    label: 'Great',
    icon: '☀️',
    description: 'SolarZone Low-E & Argon',
    priceModifier: 0,
    color: '#3b82f6',
    defaults: { glassPackage: 'LE', gridStyle: 'None', foamEnhanced: false, argon: true }
  },
  {
    tier: 'elite',
    label: 'Best',
    icon: '👑',
    description: 'SolarZone Low-E Elite',
    priceModifier: 0.15,
    color: '#8b5cf6',
    defaults: { glassPackage: 'LEE', gridStyle: 'None', foamEnhanced: false, argon: true }
  }
];

const mockFinancing = [
  { id: 'cash', name: 'Cash / Check', isCash: true, apr: 0, termMonths: 0 },
  { id: 'plan_12mo', name: '12 Months Same As Cash', isCash: false, apr: 0, termMonths: 12 },
  { id: 'plan_60mo', name: '60 Months Special Rate', isCash: false, apr: 6.99, termMonths: 60 },
  { id: 'plan_120mo', name: '120 Months Low Payment', isCash: false, apr: 9.99, termMonths: 120 }
];

const mockRecs = [
  { id: '1', recommendation: 'Upgrade to Black Exterior Frames', explanation: 'Black exterior frames provide a modern, high-contrast look that significantly boosts curb appeal and home resale value.', upsellPct: 12, color: '#f59e0b', icon: '⬛' },
  { id: '2', recommendation: 'Obscure Glass in Bathrooms', explanation: 'Add privacy without sacrificing natural light. Strongly recommended for all ground-floor bathroom windows.', upsellPct: 2, color: '#0ea5e9', icon: '🛁' },
  { id: '3', recommendation: 'Patio Door Built-In Blinds', explanation: 'Eliminate dusting and damaged blinds with integrated between-the-glass blinds for your new patio door.', upsellPct: 8, color: '#10b981', icon: '🚪' }
];
