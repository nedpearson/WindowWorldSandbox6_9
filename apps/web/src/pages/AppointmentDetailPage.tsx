import { useEffect, useState, useCallback, useMemo } from "react";
import { HelpLink } from "../components/HelpLink";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../utils/api";
import { toast } from "../components/Toast";
import { useDraftStore, useAuthStore } from "../store";
import { OpeningEditor } from "../components/OpeningEditor";
import { PricingReview } from "../components/PricingReview";
import { ContractExport } from "../components/ContractExport";
// OrderFormView consolidated into Contract step via ContractExport
import { VoiceAssistant } from "../components/VoiceAssistant";
import { ValidationPanel } from "../components/ValidationPanel";
import { StepCompletionBadge } from "../components/StepCompletion";
import { runFullValidation } from "../utils/centralValidationOrchestrator";

import { OfficeReviewPanel } from "../components/OfficeReviewPanel";
import {
  TabletSigningMode,
  SigningStatusBadge,
} from "../components/TabletSigningMode";
import { getSignatures, allSignaturesComplete } from "../utils/signatureStore";
import { QRSyncModal } from "../components/QRSyncModal";
import { WarrantyPanel } from "../components/WarrantyPanel";
import { LeadDisclosurePanel } from "../components/LeadDisclosurePanel";
import { FinanceOptionsPanel } from "../components/FinanceOptionsPanel";
import { DocumentChecklist } from "../components/DocumentChecklist";
import { useSaveGuard, SaveStateIndicator } from "../utils/productionGuards";
import { SketchOrderFormPreview } from "../components/SketchOrderFormPreview";
import { getAllSketchMarkers } from "../components/DrawableSketch";
import { DocumentCapture } from "../components/DocumentCapture";
import {
  trackPosition,
  getLastPosition,
  findIncompleteOpenings,
  suggestResumeStep,
} from "../utils/sessionTracker";
import {
  CustomerModeToggle,
  CustomerProjectSummary,
  CustomerWindowList,
  CustomerFinancingDisplay,
  CUSTOMER_TABS,
} from "../components/CustomerMode";
import { trackStepEnter } from "../utils/speedTracker";
import { AppointmentTimer, SmartNextStep } from "../components/SpeedDashboard";
import { KnowledgeLibrary } from "../components/ProKnowledgePanel";
import { ProposalBuilder } from "../components/ProposalBuilder";
import { FollowUpPanel } from "../components/FollowUpPanel";
import { TextCustomerModal } from "../components/TextCustomerModal";
import { normalizePhoneForSms, buildSmsLink, buildDefaultSmsMessage, detectPlatform } from "../utils/phoneUtils";
import { SyncStatusBar } from '../components/SyncStatusBar';
import AppointmentPhotosPanel from '../components/AppointmentPhotosPanel';
import { WorkbookManagementPanel } from "../components/WorkbookManagementPanel";

// ═══════════════════════════════════════════════════════════════
// OFFICIAL UNIFIED FLOW — Consolidated 4-step workflow.
// ═══════════════════════════════════════════════════════════════
const STEPS = [
  "Customer",
  "Sketch",
  "Review",
  "Workbook",
];

const STEP_BANNERS = [
  {
    emoji: "👤",
    title: "Customer & Project Details",
    body: "Collect the customer's contact info, house attributes, and capture required site photos.",
  },
  {
    emoji: "✏️",
    title: "Draw the layout",
    body: "Sketch the room layout and mark each window opening on the canvas.",
  },
  {
    emoji: "🔍",
    title: "Review & Price",
    body: "Manage measured openings, view automated pricing, configure financing, and run validation checks.",
  },
  {
    emoji: "📊",
    title: "Excel Workbook",
    body: "Manage the Excel workbook lifecycle, handle external edits, and finalize the job.",
  },
];

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Use navigation state for instant first render — shows header immediately.
  // The full detail fetch replaces this with complete data in the background.
  const navAppt = (location.state as any)?.appointment ?? null;
  const [appt, setAppt] = useState<any>(navAppt);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Restore step from session tracker — return to where the rep left off
  const [step, setStep] = useState(() => {
    const session = getLastPosition();
    const loadedStep = (session && session.appointmentId === id) ? session.step : 0;
    // Prevent redirect loop: if they were on Sketch (step 1), resume at Review (step 2)
    return loadedStep === 1 ? 2 : loadedStep;
  });
  const { saveState, lastSaved, errorMsg, guardedSave } = useSaveGuard();
  const [signingMode, setSigningMode] = useState(false);
  const [qaBypassed, setQaBypassed] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [docAcknowledgments, setDocAcknowledgments] = useState<
    Record<string, boolean>
  >({});
  const [selectedFinancePlan, setSelectedFinancePlan] = useState<
    string | undefined
  >();
  const [customerMode, setCustomerMode] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const { saveDraft } = useDraftStore();
  // Extract user reactively — avoids stale data from .getState() in JSX render
  const authUser = useAuthStore((s) => s.user);

  const handleDocAcknowledge = (key: string, value: boolean) => {
    setDocAcknowledgments((prev) => ({ ...prev, [key]: value }));
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoadError(null);
      const data = await api.getAppointment(id);
      // Backend always includes openings — no separate fetch needed
      setAppt(data);
      saveDraft(`appt_${id}`, data);
    } catch (err: any) {
      console.error("Failed to load appointment details:", err);
      setLoadError(err?.message || "Failed to load appointment details.");
      import("../components/Toast").then(({ toast }) => {
        toast.error(err?.message || "Failed to load appointment details.");
      });
      import("../utils/sessionTracker").then((m) => m.clearPosition());
    }
  }, [id]);

  useEffect(() => {
    load();
    // 30s background refresh — enough for collaborative editing without hammering the API.
    // Skipped when the browser tab is hidden to save CPU/battery.
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Synthetic AI Layer: Use backend-generated property intelligence
  useEffect(() => {
    if (!appt || !appt.preVisitPropertyProfile || appt.exteriorType) return;
    
    const intel = appt.preVisitPropertyProfile.propertyFactsJson;
    if (intel) {
      toast.info(`✨ AI predicted ${intel.constructionType} exterior and ${intel.estimatedOpenings} windows.`);
      const isPre1978 = intel.yearBuilt && intel.yearBuilt < 1978;
      const status = isPre1978 ? 'yes' : 'no';
      save({
        exteriorType: intel.constructionType,
        pre1978Status: status,
      });
      if (appt.customer && appt.customer.preLead1978 !== isPre1978) {
        api.updateCustomer(appt.customer.id, { ...appt.customer, preLead1978: isPre1978 })
          .then((updated) => setAppt((prev: any) => ({ ...prev, customer: updated })))
          .catch(() => {});
      }
    }
  }, [appt?.preVisitPropertyProfile]);
  // Read step from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    
    // Map canonical workflow states to internal steps
    const hashToStepMap: Record<string, number> = {
      customer: 0,
      price: 2,
      product: 2,
      measure: 2,
      review: 2,
      proposal: 3,
      contract: 3,
      close: 3,
    };
    
    if (hash in hashToStepMap) {
      setStep(hashToStepMap[hash]);
    }
  }, []);

  // Ping workflow once when appointment loads — not on every step change
  useEffect(() => {
    if (id) {
      api.pingWorkflow(id).catch(() => {});
    }
  }, [id]);

  const save = async (updates: any) => {
    if (!id) return;
    await guardedSave(
      async () => {
        const data = await api.updateAppointment(id, updates);
        setAppt((p: any) => ({ ...p, ...data }));
        saveDraft(`appt_${id}`, { ...appt, ...data });
      },
      { appointmentId: id, step: STEPS[step] },
    );
  };

  const [activeVersionId, setActiveVersionId] = useState<string | undefined>();

  // Fetch active pricing version only when entering the Review step (step 2)
  useEffect(() => {
    if (step !== 2) return;
    api
      .getActivePricingVersion()
      .then((v) => {
        if (v?.id) setActiveVersionId(v.id);
      })
      .catch(() => {});
  }, [step]);

  const recalc = async () => {
    if (!id) return;
    try {
      const d = await api.recalculate(id);
      setAppt((p: any) => ({ ...p, ...d }));
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  // Validation — expensive operation, only computed when:
  // 1. We have appointment data
  // 2. User is on Review or Workbook step (step >= 2) or explicitly requested
  // Deferred on initial load to avoid blocking the first render.
  const validationResult = useMemo(
    () => (appt && step >= 2 ? runFullValidation(appt.openings || [], [], [], appt) : null),
    [appt, activeVersionId, step]
  );

  // Auto-recalculate pricing when rep enters the Review step
  useEffect(() => {
    if (step === 2 && id) {
      recalc();
    }
    // Auto-navigate to immersive Sketch Canvas when Sketch tab is selected
    if (step === 1 && id) {
      navigate(`/appointments/${id}/sketch`);
    }
  }, [step]);

  // Speed tracker — measure time on each step
  useEffect(() => {
    if (id) trackStepEnter(id, step, STEPS[step] || "");
  }, [step, id]);

  if (loadError) {
    return (
      <div className="fade-in container" style={{ marginTop: "40px", textAlign: "center" }}>
        <div style={{ padding: "40px", background: "rgba(239,68,68,0.1)", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)" }}>
          <h2 style={{ color: "#ef4444", marginBottom: "16px" }}>Failed to Load Appointment</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{loadError}</p>
          <button className="btn btn-primary" onClick={load}>Retry</button>
          <button className="btn btn-secondary" onClick={() => navigate('/appointments')} style={{ marginLeft: "12px" }}>Back to List</button>
        </div>
      </div>
    );
  }

  // Session tracker — persist position on every step/data change
  useEffect(() => {
    if (!appt || !id) return;
    const openings = appt.openings || [];
    trackPosition({
      appointmentId: id,
      customerName:
        `${appt.customer?.firstName || ""} ${appt.customer?.lastName || ""}`.trim(),
      jobAddress: appt.jobAddress || "",
      step,
      stepLabel: STEPS[step] || "",
      editingOpeningNumber: null,
      openingCount: openings.length,
      totalAmount: openings.reduce(
        (s: number, o: any) => s + (o.totalPrice || 0),
        0,
      ),
      timestamp: Date.now(),
      incompleteOpenings: findIncompleteOpenings(openings),
    });
  }, [step, appt]);

  if (!appt)
    return (
      <div
        className="fade-in"
        style={{
          padding: "3rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            height: 32,
            borderRadius: 8,
            background: "var(--bg-card)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: 16,
            borderRadius: 6,
            background: "var(--bg-card)",
            width: "60%",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: 48,
            borderRadius: 10,
            background: "var(--bg-card)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: 200,
            borderRadius: 12,
            background: "var(--bg-card)",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n || 0);

  // Compute total from openings array (more reliable than totalAmount field)
  const computedTotal = (appt.openings || []).reduce(
    (s: number, o: any) => s + (o.totalPrice || 0),
    0,
  );
  const displayTotal =
    computedTotal > 0 ? computedTotal : appt.totalAmount || 0;

  // Ready state indicator
  const readyConfig: Record<string, { color: string; label: string }> = {
    incomplete: { color: "#ef4444", label: "Incomplete" },
    review: { color: "#f59e0b", label: "Review" },
    ready_for_signature: { color: "#3b82f6", label: "Signature Ready" },
    ready_to_export: { color: "#22c55e", label: "Export Ready" },
  };

  const readyState = validationResult
    ? readyConfig[(validationResult.submissionBlocked ? 'incomplete' : validationResult.counts.critical > 0 ? 'review' : 'ready_to_export')]
    : readyConfig.incomplete;

  return (
    <div className="fade-in" style={{ paddingBottom: "5rem" }}>
      <SyncStatusBar />
      
      {/* ═══ PROJECT WORKSPACE HEADER ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.625rem 0",
          marginBottom: "0.5rem",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minWidth: 0,
          }}
        >
          <button
            className="btn btn-secondary btn-sm desktop-only-back"
            onClick={() => navigate("/appointments")}
            style={{ padding: "4px 8px", fontSize: "0.75rem", flexShrink: 0 }}
          >
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: "1.125rem",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {appt.customer.firstName} {appt.customer.lastName}
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                margin: 0,
              }}
            >
              {appt.jobAddress || "No address"} · {appt.openings?.length || 0}{" "}
              window{appt.openings?.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.375rem",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Live total */}
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 800,
              color: "var(--success)",
              background: "rgba(34,197,94,0.08)",
              padding: "4px 10px",
              borderRadius: 8,
            }}
          >
            {fmt(displayTotal)}
          </span>
          {/* Progress pill */}
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: readyState.color,
              background: `${readyState.color}15`,
              padding: "3px 8px",
              borderRadius: 9999,
            }}
          >
            {validationResult?.overallPct}% {readyState.label}
          </span>
          {/* Live appointment timer — hidden, fires internally but no visual noise */}
          {/* Status + Save — kept compact */}
          {!customerMode && (
            <>
              <select
                className="form-select"
                value={appt.status}
                onChange={(e) => save({ status: e.target.value })}
                style={{
                  width: "auto",
                  fontSize: "0.75rem",
                  padding: "3px 6px",
                }}
              >
                {[
                  { value: "draft", label: "Draft" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "quoted", label: "Quoted" },
                  { value: "sold", label: "Sold" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "needs_remeasure", label: "Needs Remeasure" },
                ].map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => save(appt)}
                disabled={saveState === "saving"}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {saveState === "saving" ? "..." : "💾"}
                <SaveStateIndicator
                  state={saveState}
                  lastSaved={lastSaved}
                  errorMsg={errorMsg}
                />
              </button>
            </>
          )}

          {/* Customer Mode Toggle */}
          <button
            onClick={() => setCustomerMode(!customerMode)}
            title={
              customerMode ? "Switch to Rep Mode" : "Switch to Customer View"
            }
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              border: "none",
              cursor: "pointer",
              background: customerMode
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(255,255,255,0.06)",
              color: customerMode ? "#fff" : "var(--text-muted)",
              fontSize: "0.6875rem",
              fontWeight: 700,
              transition: "all 0.2s",
            }}
          >
            {customerMode ? "🏠 Customer View" : "👤 Present"}
          </button>
        </div>
      </div>

      {/* Quick actions condensed into header-level pill row — only 3 essential items */}
      {!customerMode && (() => {
        // ── Quick-action bar: Call / Text / Navigate / Field View ──────────────
        const rawPhone = appt.customer?.phone || appt.customer?.phone2 || '';
        const phoneResult = normalizePhoneForSms(rawPhone);
        const platform = detectPlatform();

        const handleTextClick = () => {
          // On mobile with a valid phone — open SMS directly, no modal needed.
          if (platform !== 'desktop' && phoneResult.isValid) {
            const repName = authUser?.name || authUser?.email?.split('@')[0] || 'Your Rep';
            const address = [appt.jobAddress, appt.jobCity].filter(Boolean).join(', ') || appt.customer?.address || '';
            const body = buildDefaultSmsMessage({
              customerFirstName: appt.customer?.firstName || 'there',
              repName,
              address,
            });
            const link = buildSmsLink({ phone: phoneResult.smsPhone, body });
            // Fire-and-forget AuditLog — never blocks texting
            api.post('/audit-log', {
              action: 'sms_intent_opened',
              entity: 'Appointment',
              entityId: id,
              details: JSON.stringify({ phone: phoneResult.smsPhone, platform, appointmentId: id }),
            }).catch(() => {});
            window.location.href = link;
            return;
          }
          // Desktop or missing/invalid phone — show the modal
          if (phoneResult.isValid) {
            api.post('/audit-log', {
              action: 'sms_intent_opened',
              entity: 'Appointment',
              entityId: id,
              details: JSON.stringify({ phone: phoneResult.smsPhone, platform, appointmentId: id }),
            }).catch(() => {});
          }
          setShowTextModal(true);
        };

        return (
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {/* Call — only show when phone is present and valid */}
            {phoneResult.isValid && (
              <a
                href={`tel:${phoneResult.smsPhone}`}
                style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'3px 10px', background:'rgba(25,135,84,0.08)', border:'1px solid rgba(25,135,84,0.25)', borderRadius:20, color:'var(--ok)', fontSize:'0.7rem', fontWeight:700, textDecoration:'none' }}
              >📞 Call</a>
            )}
            {/* Text — always visible; opens modal or direct SMS depending on state */}
            <button
              id="btn-text-customer"
              onClick={handleTextClick}
              style={{
                display:'flex', alignItems:'center', gap:'0.25rem', padding:'3px 10px',
                background: phoneResult.isValid ? 'rgba(25,135,84,0.06)' : 'var(--sev-critical-bg)',
                border: phoneResult.isValid ? '1px solid rgba(25,135,84,0.15)' : '1px solid var(--sev-critical-bdr)',
                borderRadius:20,
                color: phoneResult.isValid ? 'var(--ok)' : 'var(--danger)',
                fontSize:'0.7rem', fontWeight:700, cursor:'pointer',
              }}
            >
              💬 Text{!rawPhone ? ' (no phone)' : !phoneResult.isValid ? ' (fix phone)' : ''}
            </button>
            {/* Navigate */}
            {(appt.jobAddress || appt.customer?.address) && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent([appt.jobAddress,appt.jobCity].filter(Boolean).join(', ') || appt.customer?.address || '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'3px 10px', background:'rgba(13,110,253,0.08)', border:'1px solid rgba(13,110,253,0.25)', borderRadius:20, color:'var(--blue)', fontSize:'0.7rem', fontWeight:700, textDecoration:'none' }}
              >🗺️ Navigate</a>
            )}
            {/* Field View */}
            <button
              onClick={() => navigate(`/mobile/field/${id}`)}
              style={{ display:'flex', alignItems:'center', gap:'0.25rem', padding:'3px 10px', background:'var(--amberbg)', border:'1px solid rgba(154,103,0,0.25)', borderRadius:20, color:'var(--amber)', fontSize:'0.7rem', fontWeight:700, cursor:'pointer' }}
            >📱 Field View</button>
          </div>
        );
      })()}

      {/* ═══ WORKSPACE TAB DOCK — 4 tabs (Hidden in Customer Mode) ═══ */}
      {!customerMode && (
        <div style={{
          display: 'flex',
          gap: '2px',
          marginBottom: '0.75rem',
          padding: '4px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          {([
            { icon: '👤', label: 'Customer', steps: [0], jump: 0 },
            { icon: '📐', label: 'Sketch',   steps: [1], jump: 1 },
            { icon: '🔍', label: 'Review',   steps: [2], jump: 2 },
            { icon: '📊', label: 'Workbook', steps: [3], jump: 3 },
          ] as { icon: string; label: string; steps: number[]; jump: number }[]).map((tab) => {
            const isActive = tab.steps.includes(step);
            // Show blocker badge on Review and Workbook tabs
            const tabBlockers = (tab.jump === 2 || tab.jump === 3)
              ? (validationResult?.counts.critical || 0)
              : 0;
            return (
              <button
                key={tab.jump}
                onClick={() => setStep(tab.jump)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '1px', padding: '8px 6px', minHeight: 52,
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.6875rem', fontWeight: isActive ? 800 : 600,
                  transition: 'all 0.15s', position: 'relative',
                }}
              >
                <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tabBlockers > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 4,
                    minWidth: 14, height: 14, borderRadius: 7,
                    background: '#ef4444', color: '#fff',
                    fontSize: '0.5rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, padding: '0 3px',
                  }}>{tabBlockers}</span>
                )}
              </button>
            );
          })}
        </div>
      )}




      {/* ═══ CUSTOMER MODE VIEW ═══ */}
      {customerMode &&
        (() => {
          // Map customer tab to rep step
          const customerTabMap: Record<number, number> = {
            0: 0,
            1: 3,
            2: 4,
            3: 4,
            4: 5,
            5: 6,
          };
          const customerStep = Object.entries(customerTabMap).find(
            ([, repStep]) => repStep === step,
          )?.[0];
          const activeCustomerTab = customerStep ? parseInt(customerStep) : 2;

          return (
            <>
              {/* Customer-friendly tab dock */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  overflowX: "auto",
                  marginBottom: "1rem",
                  padding: "6px",
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03))",
                  borderRadius: 14,
                  border: "1px solid rgba(99,102,241,0.12)",
                }}
              >
                {CUSTOMER_TABS.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(tab.repStep)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      padding: "8px 16px",
                      minWidth: 70,
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      background:
                        step === tab.repStep
                          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                          : "transparent",
                      color:
                        step === tab.repStep ? "#fff" : "var(--text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: step === tab.repStep ? 800 : 600,
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Customer content panels */}
              {step === 0 && (
                <CustomerProjectSummary
                  appointment={appt}
                  total={displayTotal}
                />
              )}
              {step === 3 && (
                <CustomerWindowList openings={appt.openings || []} />
              )}
              {step === 4 && (
                <>
                  <CustomerProjectSummary
                    appointment={appt}
                    total={displayTotal}
                  />
                  <CustomerFinancingDisplay
                    total={displayTotal}
                    selectedPlan={selectedFinancePlan}
                    onSelect={setSelectedFinancePlan}
                  />
                </>
              )}
              {step === 5 && (
                <div>
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      marginBottom: "1rem",
                    }}
                  >
                    Your Proposal
                  </h2>
                  <CustomerProjectSummary
                    appointment={appt}
                    total={displayTotal}
                  />
                  <CustomerWindowList openings={appt.openings || []} />
                  <KnowledgeLibrary
                    openings={appt.openings || []}
                    showFinancing
                  />
                  <CustomerFinancingDisplay
                    total={displayTotal}
                    selectedPlan={selectedFinancePlan}
                    onSelect={setSelectedFinancePlan}
                  />
                </div>
              )}
              {step === 5 && (
                <div>
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      marginBottom: "1rem",
                    }}
                  >
                    Agreement
                  </h2>
                  <p
                    style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
                  >
                    Ready to get started? Let’s finalize your order.
                  </p>
                  <TabletSigningMode
                    appointment={appt}
                    onClose={() => setStep(0)}
                  />
                </div>
              )}
            </>
          );
        })()}

      {/* ═══ REP MODE CONTENT ═══ */}
      {!customerMode && (
        <>
          {/* Validation banner — only shown on final step if blockers exist */}
          {validationResult && validationResult.counts.critical > 0 && step === 3 && (
            <div
              style={{
                padding: "0.625rem 1rem",
                marginBottom: "1rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  color: "#ef4444",
                  fontWeight: 600,
                }}
              >
                🛑 {validationResult.counts.critical} critical blocker{validationResult.counts.critical > 1 ? "s" : ""} must be fixed before final workbook generation
              </span>
              <button
                className="btn btn-sm"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  border: "none",
                }}
                onClick={() => setStep(2)}
              >
                View All →
              </button>
            </div>
          )}

          {/* Step content */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.75rem' }}>👤 Customer Information</h3>
                <CustomerStep 
                  appt={appt} 
                  onSave={save} 
                  validation={validationResult} 
                  onCustomerUpdated={(c) => {
                    setAppt((prev: any) => ({ ...prev, customer: c }));
                    save({ pre1978Status: c.preLead1978 ? 'yes' : 'no' });
                  }} 
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>🏠 About the House & Project Details</h3>
                <JobInfoStep appt={appt} onSave={save} />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>📷 Photos & Document Capture</h3>
                <DocumentCapture 
                  appointmentId={id!} 
                  onFileCaptured={(file, type) => {
                    if (type === 'camera' && appt) {
                      api.analyzeOpeningPhoto({ imageData: '' }).then(res => {
                        if (res && !appt.exteriorType) {
                          toast.info("✨ AI Auto-filled exterior details from your photo.");
                          save({ 
                            exteriorType: res.exteriorType || 'brick',
                            trimType: res.trimType || 'standard'
                          });
                        }
                      }).catch(() => {});
                    }
                  }} 
                />
                <div style={{ marginTop: '1rem' }}>
                  <AppointmentPhotosPanel appointmentId={id!} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📐</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Redirecting to Sketch Canvas...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                If you are not automatically redirected, click the button below to draw the layout.
              </p>
              <button className="btn btn-primary" onClick={() => navigate(`/appointments/${id}/sketch`)}>
                Open Sketch Canvas
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div id="opening-editor-root">
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📏 Measured Openings
                  <HelpLink articleId="lib-opening-wizard-window" label="Window measurement guide" />
                </h3>
                <OpeningEditor
                  appointmentId={id!}
                  onUpdate={load}
                  jobExteriorType={appt.exteriorType}
                  jobInstallType={appt.installType}
                />
              </div>

              {/* Global Job Add-ons */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Global Job Add-ons</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={appt.hasMaintenanceAgreement || false} onChange={e => save({ hasMaintenanceAgreement: e.target.checked })} />
                      Include Maintenance Agreement
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={appt.secondStoryCharge || false} onChange={e => save({ secondStoryCharge: e.target.checked })} />
                      Add 2nd Story Charge
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={appt.clearStoryOverride || false} onChange={e => save({ clearStoryOverride: e.target.checked })} />
                      Force Clear Story Charge (Scaffolding/Lift)
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>💰 Pricing & Investment</h3>
                <PricingReview
                  appointment={appt}
                  onRecalculate={recalc}
                  onSave={save}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>💳 Financing Options</h3>
                <FinanceOptionsPanel
                  jobAmount={displayTotal}
                  selectedPlanId={selectedFinancePlan}
                  onSelectPlan={(id) => setSelectedFinancePlan(id || undefined)}
                  onAcknowledge={handleDocAcknowledge}
                  acknowledgments={docAcknowledgments}
                />
              </div>

              {/* Warranty, Disclosure & Document Checklist */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>📄 Agreements & Disclosures</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <WarrantyPanel
                    appointmentId={id!}
                    glassBreakageSelected={appt.openings?.some((o: any) => o.glassBreakage)}
                    onAcknowledge={handleDocAcknowledge}
                    acknowledgments={docAcknowledgments}
                  />
                  <LeadDisclosurePanel
                    pre1978Status={appt.pre1978Status || (appt.customer?.preLead1978 ? 'yes' : 'unknown')}
                    homeBuiltYear={appt.customer?.homeBuiltYear}
                    onStatusChange={async (status) => {
                      await save({ pre1978Status: status });
                      const isPre1978 = status === 'yes' || status === 'unknown';
                      if (appt.customer) {
                        const updatedCustomer = { ...appt.customer, preLead1978: isPre1978 };
                        await api.updateCustomer(appt.customer.id, updatedCustomer);
                        setAppt((prev: any) => ({
                          ...prev,
                          customer: updatedCustomer
                        }));
                      }
                    }}
                    onAcknowledge={handleDocAcknowledge}
                    acknowledgments={docAcknowledgments}
                  />
                  <DocumentChecklist
                    appointment={appt}
                    acknowledgments={docAcknowledgments}
                    selectedFinancePlan={selectedFinancePlan}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>🔍 Workbook Review Checks</h3>
                <ValidationPanel 
                  report={validationResult} 
                  appointmentId={appt.id} 
                  compact={false} 
                  visible={true} 
                  onRefresh={load} 
                  onIgnore={() => setQaBypassed(true)}
                  onJumpToOpening={(openingNumber, field) => {
                    const element = document.getElementById('opening-editor-root');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('wwa-open-editor', { detail: { openingNumber, field } }));
                    }, 100);
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {validationResult && !qaBypassed && validationResult.submissionBlocked && (
                <div
                  className="card"
                  style={{
                    marginBottom: "1rem",
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.3)",
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    🛑
                  </div>
                  <h3 style={{ color: "#ef4444" }}>
                    Validation Blockers Remaining — {validationResult.counts.critical} Blocker
                    {validationResult.counts.critical > 1 ? "s" : ""}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Fix all critical issues on the Review tab before final workbook generation.
                  </p>
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setStep(2)}
                  >
                    Go to Review Tab
                  </button>
                </div>
              )}

              {/* Tablet Signing Mode trigger badge */}
              <div style={{ marginBottom: "1rem" }}>
                <SigningStatusBadge
                  appointmentId={id!}
                  onEnterSigningMode={() => setSigningMode(true)}
                />
              </div>

              {/* Workbook Lifecycle Management */}
              <WorkbookManagementPanel 
                appointment={appt} 
                onRefresh={load} 
              />

              {/* Follow-Up — log contact outcome and schedule next call */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>📅 Customer Follow-Up</h3>
                <FollowUpPanel
                  appointmentId={id!}
                  customerId={appt.customer?.id}
                  customerName={`${appt.customer?.firstName || ""} ${appt.customer?.lastName || ""}`.trim()}
                  customerPhone={appt.customer?.phone}
                  followUpDate={appt.followUpDate}
                  followUpOutcome={appt.followUpOutcome}
                  onUpdate={(patch) =>
                    setAppt((p: any) => ({ ...p, ...patch }))
                  }
                />
              </div>
            </div>
          )}

          {/* ── Workspace Section Nav ────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              marginTop: "1rem",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              className="btn btn-secondary btn-sm"
              disabled={step === 0}
              onClick={() => {
                if (step === 2) {
                  setStep(0);
                } else {
                  setStep(Math.max(0, step - 1));
                }
              }}
              style={{ opacity: step === 0 ? 0.3 : 1, fontSize: "0.75rem" }}
            >
              ← {step === 2 ? STEPS[0] : step > 0 ? STEPS[step - 1] : ""}
            </button>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >

              <button
                className="btn btn-sm"
                title="QR code for tablet signing"
                onClick={() => setQrOpen(true)}
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#7c3aed",
                  fontSize: "0.7rem",
                  padding: "3px 8px",
                }}
              >
                📱 QR
              </button>
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={step === STEPS.length - 1}
              onClick={() => {
                if (step === 0) {
                  setStep(2);
                } else {
                  setStep(Math.min(STEPS.length - 1, step + 1));
                }
              }}
              style={{
                opacity: step === STEPS.length - 1 ? 0.3 : 1,
                fontSize: "0.75rem",
              }}
            >
              {step === 0 ? STEPS[2] : step < STEPS.length - 1 ? STEPS[step + 1] : ""} →
            </button>
          </div>

          {/* Floating Voice Assistant (Admin Only) */}
          {authUser?.role === 'admin' && (
            <VoiceAssistant
              appointmentId={id!}
              userId={authUser?.id || ""}
              onApplied={load}
            />
          )}

          {/* Smart Next Step CTA */}
          <SmartNextStep
            step={step}
            stepLabel={STEPS[step] || ""}
            appointment={appt}
            onGoToStep={setStep}
          />



          {/* Office Review Panel (Admin Only) */}
          {authUser?.role === 'admin' && (
            <OfficeReviewPanel
              appointment={appt}
              currentUserName={authUser?.name || "Office"}
            />
          )}

          {/* Signing Mode FAB — only visible on signing/submit steps */}
          {step === 3 && (
            /* Workbook/Agreement step */ <button
              onClick={() => setSigningMode(true)}
              className="coach-fab"
              title="Customer Signing Mode"
              style={{
                bottom: "24rem",
                background: "linear-gradient(135deg,#059669,#10b981)",
              }}
            >
              ✍️
            </button>
          )}

          {/* Tablet Signing Mode — fullscreen overlay */}
          {signingMode && (
            <TabletSigningMode
              appointment={appt}
              onClose={() => setSigningMode(false)}
            />
          )}

          {/* QR Sync Modal — scoped signing session for customer tablet */}
          {qrOpen && (
            <QRSyncModal
              appointment={appt}
              userId={authUser?.id || ""}
              userEmail={authUser?.email || ""}
              onClose={() => setQrOpen(false)}
            />
          )}

          {/* Old duplicate navigation removed — using enhanced Next Step Navigation bar above */}
        </>
      )}

      {/* Sticky total */}
      <div className="sticky-total">
        <div>
          <span className="total-label">Quote Total</span>
          <span
            style={{
              marginLeft: "0.5rem",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
            }}
          >
            {appt.openings?.length || 0} items
          </span>
          {validationResult && (
            <span
              style={{
                marginLeft: "0.75rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: readyState.color,
              }}
            >
              {readyState.label}
            </span>
          )}
        </div>
        <span className="total-value">{fmt(displayTotal)}</span>
      </div>
      {/* ── Text Customer Modal — desktop fallback + missing/invalid phone UX ── */}
      {showTextModal && (
        <TextCustomerModal
          appointment={appt}
          authUser={authUser}
          onClose={() => setShowTextModal(false)}
          onGoToCustomer={() => {
            setShowTextModal(false);
            setStep(0); // Customer Info step
          }}
        />
      )}
    </div>
  );
}

// ─── CUSTOMER STEP with inline validation ─────────────────
function CustomerStep({
  appt,
  onSave,
  validation,
  onCustomerUpdated,
}: {
  appt: any;
  onSave: (u: any) => void;
  validation: any;
  onCustomerUpdated?: (c: any) => void;
}) {
  const [c, setC] = useState(appt.customer);
  const upd = (f: string, v: any, isBlur?: boolean) => {
    const updated = { ...c, [f]: v };
    setC(updated);
    if (isBlur) {
      api.updateCustomer(c.id, updated)
        .then(() => { if (onCustomerUpdated) onCustomerUpdated(updated); })
        .catch(e => console.debug("[swallowed error]", e));
    }
  };
  const saveCustomer = async () => {
    try {
      await api.updateCustomer(c.id, c);
      if (onCustomerUpdated) onCustomerUpdated(c);
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  // Find issues for this step
  const stepIssues =
    validation?.warnings?.filter((i: any) => i.jumpStep === 0) || [];

  const fieldWarn = (path: string) => {
    const issue = stepIssues.find((i: any) => i.fieldPath.endsWith(path));
    if (!issue) return null;
    return (
      <span
        style={{
          fontSize: "0.6875rem",
          color: issue.severity === "critical" ? "#ef4444" : "#f59e0b",
          marginLeft: "0.25rem",
        }}
      >
        {issue.severity === "critical" ? "🛑" : "⚠"} Required
      </span>
    );
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1rem" }}>👤 Customer Information</h2>
      {stepIssues.length > 0 && (
        <div
          style={{
            marginBottom: "0.75rem",
            padding: "0.5rem 0.75rem",
            background: "rgba(239,68,68,0.08)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8125rem",
            color: "#ef4444",
          }}
        >
          {stepIssues.length} field{stepIssues.length > 1 ? "s" : ""} need
          attention
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            First Name {fieldWarn("firstName")}
          </label>
          <input
            className="form-input"
            value={c.firstName || ""}
            onChange={(e) => upd("firstName", e.target.value)}
            onBlur={(e) => upd("firstName", e.target.value, true)}
            style={!c.firstName ? { borderColor: "#ef4444" } : {}}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Last Name {fieldWarn("lastName")}
          </label>
          <input
            className="form-input"
            value={c.lastName || ""}
            onChange={(e) => upd("lastName", e.target.value)}
            onBlur={(e) => upd("lastName", e.target.value, true)}
            style={!c.lastName ? { borderColor: "#ef4444" } : {}}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone {fieldWarn("phone")}</label>
          <input
            className="form-input"
            value={c.phone || ""}
            onChange={(e) => upd("phone", e.target.value)}
            onBlur={(e) => upd("phone", e.target.value, true)}
            style={!c.phone ? { borderColor: "#ef4444" } : {}}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email {fieldWarn("email")}</label>
          <input
            className="form-input"
            value={c.email || ""}
            onChange={(e) => upd("email", e.target.value)}
            onBlur={(e) => upd("email", e.target.value, true)}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone 2</label>
          <input
            className="form-input"
            value={c.phone2 || ""}
            onChange={(e) => upd("phone2", e.target.value)}
            onBlur={(e) => upd("phone2", e.target.value, true)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">WW Customer ID</label>
          <input
            className="form-input"
            value={c.customerId || ""}
            onChange={(e) => upd("customerId", e.target.value)}
            onBlur={(e) => upd("customerId", e.target.value, true)}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Address {fieldWarn("address")}</label>
        <input
          className="form-input"
          value={c.address || ""}
          onChange={(e) => upd("address", e.target.value)}
            onBlur={(e) => upd("address", e.target.value, true)}
          style={!c.address ? { borderColor: "#ef4444" } : {}}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City {fieldWarn("city")}</label>
          <input
            className="form-input"
            value={c.city || ""}
            onChange={(e) => upd("city", e.target.value)}
            onBlur={(e) => upd("city", e.target.value, true)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">State {fieldWarn("state")}</label>
          <input
            className="form-input"
            value={c.state || ""}
            onChange={(e) => upd("state", e.target.value)}
            onBlur={(e) => upd("state", e.target.value, true)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ZIP {fieldWarn("zip")}</label>
          <input
            className="form-input"
            value={c.zip || ""}
            onChange={(e) => upd("zip", e.target.value)}
            onBlur={(e) => upd("zip", e.target.value, true)}
          />
        </div>
      </div>
      <div className="form-check" style={{ marginTop: "0.5rem" }}>
        <input
          type="checkbox"
          checked={c.preLead1978 || false}
          onChange={(e) => {
            upd("preLead1978", e.target.checked);
            setTimeout(saveCustomer, 100);
          }}
        />
        <label className="form-label" style={{ margin: 0 }}>
          Pre-1978 Home (Lead Paint Acknowledgement Required)
        </label>
      </div>
    </div>
  );
}

function JobInfoStep({
  appt,
  onSave,
}: {
  appt: any;
  onSave: (u: any) => void;
}) {
  const [a, setA] = useState(appt);
  const upd = (f: string, v: any, isBlur?: boolean) => {
    const n = { ...a, [f]: v };
    setA(n);
    if (isBlur) {
      onSave(n);
    }
  };

  const formatDateTimeLocal = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1rem" }}>📋 Project Details</h2>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label className="form-label">Appointment Date/Time</label>
        <input
          className="form-input"
          type="datetime-local"
          value={formatDateTimeLocal(a.appointmentDate)}
          onChange={(e) => {
            const val = e.target.value ? new Date(e.target.value).toISOString() : null;
            upd("appointmentDate", val);
            onSave({ appointmentDate: val });
          }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Job Address</label>
        <input
          className="form-input"
          value={a.jobAddress || ""}
          onChange={(e) => upd("jobAddress", e.target.value)}
          onBlur={() =>
            onSave({
              jobAddress: a.jobAddress,
              jobCity: a.jobCity,
              jobState: a.jobState,
              jobZip: a.jobZip,
            })
          }
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City</label>
          <input
            className="form-input"
            value={a.jobCity || ""}
            onChange={(e) => upd("jobCity", e.target.value)}
            onBlur={(e) => upd("jobCity", e.target.value, true)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input
            className="form-input"
            value={a.jobState || ""}
            onChange={(e) => upd("jobState", e.target.value)}
            onBlur={(e) => upd("jobState", e.target.value, true)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ZIP</label>
          <input
            className="form-input"
            value={a.jobZip || ""}
            onChange={(e) => upd("jobZip", e.target.value)}
            onBlur={(e) => upd("jobZip", e.target.value, true)}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Project Type</label>
          <select
            className="form-select"
            value={a.projectType || ""}
            onChange={(e) => {
              upd("projectType", e.target.value);
              onSave({ projectType: e.target.value });
            }}
          >
            <option value="replacement">Replacement</option>
            <option value="new_construction">New Construction</option>
            <option value="remodel">Remodel</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Complete Job?</label>
          <select
            className="form-select"
            value={a.completeJob ? "yes" : "no"}
            onChange={(e) => {
              upd("completeJob", e.target.value === "yes");
              onSave({ completeJob: e.target.value === "yes" });
            }}
          >
            <option value="yes">Complete Job — All Windows</option>
            <option value="no">Partial — Remaining Windows Only</option>
          </select>
        </div>
      </div>

      {/* House Type + Install Type */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">🏠 Exterior Type</label>
          <select
            className="form-select"
            value={a.exteriorType || "brick"}
            onChange={(e) => {
              upd("exteriorType", e.target.value);
              onSave({ exteriorType: e.target.value });
            }}
          >
            <option value="brick">🧱 Brick</option>
            <option value="vinyl_siding">Vinyl Siding</option>
            <option value="wood">Wood</option>
            <option value="stucco">Stucco</option>
            <option value="stone">Stone</option>
            <option value="hardie">HardiePlank</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">📏 Install Type</label>
          <select
            className="form-select"
            value={a.installType || "replacement"}
            onChange={(e) => {
              upd("installType", e.target.value);
              onSave({ installType: e.target.value });
            }}
          >
            <option value="replacement">Replacement Insert</option>
            <option value="full_tearout">Full Tearout</option>
            <option value="new_construction">New Construction</option>
            <option value="retrofit">Retrofit</option>
          </select>
        </div>
      </div>

      {(a.exteriorType === "brick" || !a.exteriorType) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            background: "rgba(210,105,30,0.06)",
            border: "1px solid rgba(210,105,30,0.2)",
            marginBottom: "0.75rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          🧱 <strong style={{ color: "#d2691e" }}>Brick House Detected</strong>{" "}
          — 3-point measurement mode will activate in Openings. Measure from{" "}
          <strong>outside</strong>. Use <strong>smallest</strong> measurement.
          Do NOT manually deduct — manufacturer handles production deductions.
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">PO Number</label>
          <input
            className="form-input"
            value={a.poNumber || ""}
            onChange={(e) => upd("poNumber", e.target.value)}
            onBlur={() => onSave({ poNumber: a.poNumber })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Account Number</label>
          <input
            className="form-input"
            value={a.accountNumber || ""}
            onChange={(e) => upd("accountNumber", e.target.value)}
            onBlur={() => onSave({ accountNumber: a.accountNumber })}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Estimator Notes</label>
        <textarea
          className="form-textarea"
          value={a.estimatorNotes || ""}
          onChange={(e) => upd("estimatorNotes", e.target.value)}
          onBlur={() => onSave({ estimatorNotes: a.estimatorNotes })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Installer Notes</label>
        <textarea
          className="form-textarea"
          value={a.installerNotes || ""}
          onChange={(e) => upd("installerNotes", e.target.value)}
          onBlur={() => onSave({ installerNotes: a.installerNotes })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Office Notes</label>
        <textarea
          className="form-textarea"
          value={a.officeNotes || ""}
          onChange={(e) => upd("officeNotes", e.target.value)}
          onBlur={() => onSave({ officeNotes: a.officeNotes })}
        />
      </div>
    </div>
  );
}

// Removed ProposalStep to use imported ProposalBuilder
