// ═══════════════════════════════════════════════════════════════
// ValidationPanel — Unified Validation Sidebar / Overlay
// Grouped fix cards. All actions are wired to real modals or
// real API calls — no dead buttons.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { HelpLink } from './HelpLink';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import {
  ProjectValidationReport,
  UnifiedWarning,
  RecommendedFix,
  AlternativeFix,
  SEVERITY_CONFIG
} from '../utils/centralValidationOrchestrator';
import { EscalateButton } from './ManagerReviewPanel';
import { getNextFix } from '../utils/fixPrioritization';
import { groupValidationIssues, type ReviewGroup } from '../lib/reviewGrouping';
import { ReviewSignatureModal } from './ReviewSignatureModal';
import { ReviewOpeningsModal } from './ReviewOpeningsModal';
import { api } from '../utils/api';
import { toast } from './Toast';

type MOBILE_TAB = 'home' | 'pricing' | 'sketch' | 'checklist' | 'proposal';

interface ValidationPanelProps {
  report: ProjectValidationReport | null;
  appointment?: any;              // needed for modal data
  onJumpToOpening?: (openingNumber: number, field?: string) => void;
  onJumpToFix?: (warning: UnifiedWarning) => void;
  onAction?: (action: RecommendedFix | AlternativeFix) => void;
  onJumpToSketch?: (openingNumber?: number) => void;
  onRefresh?: () => Promise<void>;  // refreshes appointment data + validation
  onIgnore?: () => void;
  compact?: boolean;
  visible?: boolean;
  onClose?: () => void;
  appointmentId?: string;
  selectedOpeningNumber?: number;
  defaultStage?: 'quick_price' | 'full_details' | 'contract_ready' | 'production_handoff' | 'all';
}

export function ValidationPanel({
  report, appointment, onJumpToOpening, onJumpToFix, onAction, onJumpToSketch,
  onRefresh, onIgnore, compact = false, visible = true, onClose, appointmentId
}: ValidationPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>('blockers_group');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showOpeningsModal, setShowOpeningsModal] = useState(false);
  const [openingsIssueIds, setOpeningsIssueIds] = useState<string[]>([]);
  const [isFixingAll, setIsFixingAll] = useState(false);

  if (!visible || !report) return null;

  const warnings = report.warnings || [];
  const blockers = warnings.filter(w => w.blocksSubmission);
  const recommended = warnings.filter(w => !w.blocksSubmission && w.recommendedFix);
  const groups = groupValidationIssues(warnings);
  const blockerGroups = groups.filter(g => g.blocksSubmission);
  const recommendedGroups = groups.filter(g => !g.blocksSubmission);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Synthetic QA Intelligence: Auto-Fixer
  useEffect(() => {
    if (!isFixingAll) return;
    
    if (blockers.length === 0) {
      setIsFixingAll(false);
      toast.success("✨ AI Auto-Fix complete! All issues resolved.");
    } else {
      const { fix } = getNextFix(blockers);
      if (fix) {
        const group = blockerGroups.find(g => g.issues.some(i => i.id === fix.warning.id));
        if (group && group.key === 'signature_completion') {
           setShowSignatureModal(true);
           setIsFixingAll(false);
           return;
        }

        if (fix.warning.openingNumber && onJumpToOpening) {
          let field = fix.warning.recommendedFix?.payload?.field;
          if (!field) {
            if (fix.warning.id.toLowerCase().includes('width')) field = 'width';
            else if (fix.warning.id.toLowerCase().includes('height')) field = 'height';
            else if (fix.warning.id.toLowerCase().includes('product')) field = 'productCategory';
            else if (fix.warning.id.toLowerCase().includes('room')) field = 'roomLocation';
          }
          setIsFixingAll(false);
          onJumpToOpening(fix.warning.openingNumber, field);
        } else if (fix.warning.recommendedFix && onAction) {
          setIsFixingAll(false);
          onAction(fix.warning.recommendedFix);
        } else {
          setIsFixingAll(false);
        }
      }
    }
  }, [isFixingAll, blockers.length]);

  const handleGroupAction = async (group: ReviewGroup, action: RecommendedFix | AlternativeFix) => {
    // ── Signature group ──────────────────────────────────────
    if (group.key === 'signature_completion') {
      if (action.actionType === 'route_focus' || action.actionType === 'manual_required'
          || (action as any).label?.toLowerCase().includes('sign')) {
        setShowSignatureModal(true);
        return;
      }
    }

    // ── Openings/pricing group ───────────────────────────────
    if (group.key === 'openings_pricing') {
      const actionType = (action as any).actionType;
      if (actionType === 'route_focus' || actionType === 'apply_quote_options') {
        const ids = group.issues.map(i => i.id);
        setOpeningsIssueIds(ids);
        setShowOpeningsModal(true);
        return;
      }
    }

    // ── Delegate to parent for route_focus / remaining actions ──
    if (onAction) onAction(action);
    else if (onJumpToOpening) {
      const firstIssueWithOpening = group.issues.find(i => i.openingNumber !== undefined);
      if (firstIssueWithOpening && firstIssueWithOpening.openingNumber) {
         let field = firstIssueWithOpening.recommendedFix?.payload?.field;
         if (!field) {
            if (firstIssueWithOpening.id.toLowerCase().includes('width')) field = 'width';
            else if (firstIssueWithOpening.id.toLowerCase().includes('height')) field = 'height';
            else if (firstIssueWithOpening.id.toLowerCase().includes('product')) field = 'productCategory';
            else if (firstIssueWithOpening.id.toLowerCase().includes('room')) field = 'roomLocation';
         }
         onJumpToOpening(firstIssueWithOpening.openingNumber, field);
      }
    }
  };

  const handleModalSaved = async () => {
    setShowSignatureModal(false);
    setShowOpeningsModal(false);
    if (onRefresh) await onRefresh();
  };

  const handleNavigate = (tab: string) => {
    setShowOpeningsModal(false);
    if (onAction) {
      onAction({ label: `Open ${tab}`, actionType: 'route_focus', payload: { tab } });
    }
  };

  // Missing signature field IDs for the modal
  const missingSignatureFields = groups
    .find(g => g.key === 'signature_completion')?.issues
    .map(i => {
      // Map contract-ct-sig-owner → ownerSignature etc.
      if (i.id.includes('ct-sig-owner') || i.id.includes('ownerSignature')) return 'ownerSignature';
      if (i.id.includes('ct-sig-est') || i.id.includes('estimatorSignature')) return 'estimatorSignature';
      if (i.id.includes('ct-sig-date') || i.id.includes('signatureDate')) return 'signatureDate';
      if (i.id.includes('ct-initials') || i.id.includes('customerInitials')) return 'customerInitials';
      return i.id;
    }) || [];

  const panelStyle: React.CSSProperties = compact ? {
    background: 'var(--bg-card, #1a1a2e)', borderRadius: 12,
    border: '1px solid var(--border, rgba(255,255,255,0.1))',
    padding: '0.6rem', maxHeight: '400px', overflowY: 'auto',
  } : isMobile ? {
    position: 'fixed', left: 0, right: 0,
    bottom: 0, zIndex: 1000,
    background: 'var(--bg-card, #1a1a2e)',
    borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
    borderRadius: '16px 16px 0 0',
    padding: '1rem', paddingBottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 1rem)',
    overflowY: 'auto', maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 20px)',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
  } : {
    display: 'flex', flexDirection: 'column',
    width: '100%', height: '100%',
    background: 'var(--bg-card, #1a1a2e)',
    padding: '1rem', overflowY: 'auto',
  };

  return (
    <>
      {/* ── Signature Modal — rendered on document.body to escape overflow containers ── */}
      {showSignatureModal && appointmentId && createPortal(
        <ReviewSignatureModal
          appointmentId={appointmentId}
          missingFields={missingSignatureFields}
          onSaved={handleModalSaved}
          onClose={() => setShowSignatureModal(false)}
        />,
        document.body
      )}

      {/* ── Openings Modal — rendered on document.body to escape overflow containers ── */}
      {showOpeningsModal && appointmentId && createPortal(
        <ReviewOpeningsModal
          appointment={appointment || { id: appointmentId }}
          issueIds={openingsIssueIds}
          onSaved={handleModalSaved}
          onClose={() => setShowOpeningsModal(false)}
          onNavigate={handleNavigate}
        />,
        document.body
      )}

      <div style={panelStyle}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: compact ? '1.2rem' : '1.4rem', fontWeight: 800, color: 'var(--text-primary, #fff)', marginBottom: '6px' }}>
              {blockers.length > 0 ? 'Needs Fixes' : recommended.length > 0 ? 'Almost Ready' : 'Ready'}
            </div>
            <div style={{ fontSize: '1rem', color: blockers.length > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              {blockers.length > 0
                ? `${blockerGroups.length} required fix group${blockerGroups.length > 1 ? 's' : ''} before proposal`
                : recommended.length > 0
                  ? `${recommendedGroups.length} recommended improvement${recommendedGroups.length > 1 ? 's' : ''}`
                  : 'All required items complete'}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
          )}
        </div>

        {/* ── Synthetic QA Intelligence: FIX ALL Button ── */}
        {blockers.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => setIsFixingAll(true)}
              style={{ 
                flex: 1, padding: '12px', background: '#3b82f6', color: 'white', 
                borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: isFixingAll ? '0 0 15px #3b82f6' : 'none'
              }}
            >
              ⚡ {isFixingAll ? "Auto-Navigating to Issues..." : "FIX ALL ISSUES"}
            </button>
            {onIgnore && (
              <button 
                onClick={onIgnore}
                style={{ 
                  padding: '12px 16px', background: 'transparent', color: 'var(--text-muted)', 
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Skip / Ignore
              </button>
            )}
          </div>
        )}

        {/* ── All clear ── */}
        {groups.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ✅ All items complete. You are ready to present!
          </div>
        )}

        {/* ── Fix Required ── */}
        {blockerGroups.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <SectionHeader
              title="🛑 Fix Required"
              count={blockerGroups.length}
              isExpanded={expandedGroupKey === 'blockers_group'}
              onToggle={() => setExpandedGroupKey(expandedGroupKey === 'blockers_group' ? null : 'blockers_group')}
              color="#f85149"
            />
            {expandedGroupKey === 'blockers_group' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {blockerGroups.map(group => (
                  <GroupCard
                    key={group.key}
                    group={group}
                    onAction={(a) => handleGroupAction(group, a)}
                    onJumpToOpening={onJumpToOpening}
                    onJumpToSketch={onJumpToSketch}
                    appointmentId={appointmentId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Recommended ── */}
        {recommendedGroups.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <SectionHeader
              title="💡 Recommended"
              count={recommendedGroups.length}
              isExpanded={expandedGroupKey === 'recommended_group'}
              onToggle={() => setExpandedGroupKey(expandedGroupKey === 'recommended_group' ? null : 'recommended_group')}
              color="#f59e0b"
            />
            {expandedGroupKey === 'recommended_group' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {recommendedGroups.map(group => (
                  <GroupCard
                    key={group.key}
                    group={group}
                    onAction={(a) => handleGroupAction(group, a)}
                    onJumpToOpening={onJumpToOpening}
                    onJumpToSketch={onJumpToSketch}
                    appointmentId={appointmentId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Advanced Details ── */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600,
            }}
          >
            {showAdvanced ? '▾ Hide Advanced Details' : '▸ Show Advanced Details'}
          </button>

          {showAdvanced && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Individual raw validation issues. Use the fix groups above for guided workflow.
              </div>
              {warnings.map(w => (
                <RawIssueRow
                  key={w.id}
                  warning={w}
                  onJumpToFix={onJumpToFix}
                  onJumpToOpening={onJumpToOpening}
                  onAction={onAction}
                  onJumpToSketch={onJumpToSketch}
                />
              ))}
              {report?.sections && Object.keys(report.sections).length > 0 && (
                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📊 Section Completion</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: report.overallPct === 100 ? '#22c55e' : '#f59e0b' }}>{report.overallPct}% Overall</span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    {Object.entries(report.sections).map(([name, s]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 100, fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{name}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{
                            width: `${s.pct}%`, height: '100%', borderRadius: 4,
                            background: s.pct === 100 ? '#22c55e' : s.pct > 60 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ width: 30, fontSize: '0.6rem', fontWeight: 700, textAlign: 'right', color: s.pct === 100 ? '#22c55e' : s.pct > 60 ? '#f59e0b' : '#ef4444' }}>{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Section Header ───────────────────────────────────────────
function SectionHeader({ title, count, isExpanded, onToggle, color }: {
  title: string; count: number; isExpanded: boolean; onToggle: () => void; color: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.6rem 0.85rem', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary, #fff)',
        fontSize: '1rem', fontWeight: 800, textAlign: 'left',
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${color}22`, color }}>
        {count} {isExpanded ? '▾' : '▸'}
      </span>
    </button>
  );
}

// ── Group key -> manual article mapping ─────────────────────
const GROUP_ARTICLE_MAP: Record<string, string> = {
  signature_completion:    'lib-signing',
  openings_pricing:        'lib-opening-pricing',
  tempered_glass:          'lib-tempered-glass',
  sketch_markers:          'lib-sketch-canvas',
  contract_totals:         'lib-contract',
  follow_up:               'lib-followup-panel',
  proposal_review:         'lib-proposal-builder',
  missing_photos:          'lib-pre-visit-checklist',
  measurement_accuracy:    'lib-measuring-windows',
  door_handing:            'lib-door-handing',
};

// ── Group Card ───────────────────────────────────────────────
function GroupCard({ group, onAction, onJumpToOpening, onJumpToSketch, appointmentId }: {
  group: ReviewGroup;
  onAction: (action: RecommendedFix | AlternativeFix) => void;
  onJumpToOpening?: (n: number, field?: string) => void;
  onJumpToSketch?: (n?: number) => void;
  appointmentId?: string;
}) {
  const [showChangeMenu, setShowChangeMenu] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const helpArticleId = GROUP_ARTICLE_MAP[group.key];

  const borderColor = group.blocksSubmission ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)';
  const btnBg = group.blocksSubmission ? '#ef4444' : '#6366f1';

  return (
    <div style={{
      background: 'var(--bg-elevated, #232338)',
      border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: '1.25rem', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '1.3rem' }}>{group.emoji}</span>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{group.title}</div>
        {helpArticleId && (
          <HelpLink
            articleId={helpArticleId}
            label="Field Manual: learn more about this requirement"
            size="sm"
            style={{ marginLeft: 2 }}
          />
        )}
        {group.blocksSubmission && (
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.15)', color: '#f85149' }}>
            Required
          </span>
        )}
      </div>

      {group.message && (
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          {group.message}
        </div>
      )}

      {/* Issues list */}
      <div style={{ marginBottom: '1.1rem' }}>
        {group.issues.map(issue => (
          <div key={issue.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)', padding: '3px 0' }}>
            <span style={{ color: group.blocksSubmission ? '#f87171' : '#facc15', fontSize: '0.8rem' }}>●</span>
            {issue.title}
            {issue.openingNumber !== undefined && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>(Opening #{issue.openingNumber})</span>
            )}
          </div>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          id={`review-fix-${group.key}`}
          onClick={() => onAction(group.primaryAction)}
          style={{
            padding: '0.5rem 1.1rem', borderRadius: 7, fontSize: '0.82rem', fontWeight: 700,
            background: btnBg, color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)', flexShrink: 0,
          }}
        >
          {group.primaryAction.label}
        </button>

        {group.alternativeActions.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              id={`review-change-${group.key}`}
              onClick={() => setShowChangeMenu(!showChangeMenu)}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: 7, fontSize: '0.82rem', fontWeight: 600,
                background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
              }}
            >
              Change ▾
            </button>

            {showChangeMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
                background: 'var(--bg-dropdown, #2a2a40)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
                minWidth: 220, padding: '0.4rem',
              }}>
                {group.alternativeActions.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => { onAction(alt); setShowChangeMenu(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
                      borderRadius: 6, background: 'transparent', border: 'none',
                      color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {alt.label}
                  </button>
                ))}
                {group.blocksSubmission && appointmentId && (
                  <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.4rem' }}>
                    <EscalateButton warning={group.issues[0]} appointmentId={appointmentId} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowIssues(!showIssues)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '0.72rem', cursor: 'pointer', marginLeft: 'auto', textDecoration: 'underline',
          }}
        >
          {showIssues ? 'Hide items' : `${group.issues.length} item${group.issues.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {showIssues && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {group.issues.map(issue => (
            <IndividualIssueRow key={issue.id} warning={issue} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function IndividualIssueRow({ warning: w, onAction }: { warning: UnifiedWarning; onAction: (a: RecommendedFix | AlternativeFix) => void }) {
  const sev = SEVERITY_CONFIG[w.severity];
  return (
    <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            <span style={{ color: sev?.color || 'var(--text-muted)', marginRight: '0.4rem' }}>{sev?.icon}</span>
            {w.title}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w.detail}</div>
        </div>
        {w.recommendedFix && (
          <button
            onClick={() => onAction({ ...w.recommendedFix!, issueId: w.id, issueType: w.id })}
            style={{
              flexShrink: 0, padding: '0.4rem 0.9rem', borderRadius: 6,
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {w.recommendedFix.label}
          </button>
        )}
      </div>
    </div>
  );
}

function RawIssueRow({ warning: w, onJumpToFix, onJumpToOpening, onAction, onJumpToSketch }: {
  warning: UnifiedWarning;
  onJumpToFix?: (w: UnifiedWarning) => void;
  onJumpToOpening?: (n: number, field?: string) => void;
  onAction?: (action: RecommendedFix | AlternativeFix) => void;
  onJumpToSketch?: (n?: number) => void;
}) {
  const sev = SEVERITY_CONFIG[w.severity];
  const handleFix = () => {
    if (w.recommendedFix && onAction) {
      onAction({ ...w.recommendedFix, issueId: w.id, issueType: w.id });
    } else if (onJumpToFix) {
      onJumpToFix(w);
    } else if (w.openingNumber !== undefined && onJumpToOpening) {
      onJumpToOpening(w.openingNumber, w.fieldPath?.split('.').pop());
    }
  };
  return (
    <div style={{ padding: '0.6rem 0.75rem', marginBottom: '0.4rem', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <span style={{ marginRight: '0.4rem' }}>{sev?.icon}</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.title}</span>
        {w.openingNumber !== undefined && <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>(#{w.openingNumber})</span>}
      </div>
      <button
        onClick={handleFix}
        style={{
          flexShrink: 0, padding: '0.35rem 0.8rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
          background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer',
        }}
      >
        {w.recommendedFix?.label || 'Fix'}
      </button>
    </div>
  );
}

// ── Inline Warning Badge ─────────────────────────────────────
export function InlineWarningBadge({ warnings, compact = false }: { warnings: UnifiedWarning[]; compact?: boolean }) {
  if (warnings.length === 0) return null;
  const worst = warnings[0];
  const sev = SEVERITY_CONFIG[worst.severity];
  if (compact) {
    return (
      <span title={worst.title} className={`sev-badge sev-badge-${worst.severity}`} style={{ fontSize: '0.55rem', padding: '1px 5px', cursor: 'help' }}>
        {sev.icon} {warnings.length}
      </span>
    );
  }
  return (
    <div className={`sev-card sev-card-${worst.severity}`} style={{ padding: '4px 8px', fontSize: '0.6rem' }}>
      {sev.icon} {worst.title}
      {warnings.length > 1 && <span style={{ opacity: 0.7 }}> +{warnings.length - 1} more</span>}
    </div>
  );
}

// ── Compact QA Badge ─────────────────────────────────────────
export function ValidationBadge({ report, onClick }: { report: ProjectValidationReport | null; onClick: () => void }) {
  if (!report) {
    return (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
        <span>QA</span>
      </button>
    );
  }
  const qpBlockers = report.warnings.filter(w => w.stage === 'quick_price' && w.severity === 'critical');
  const others = report.warnings.filter(w => w.stage !== 'quick_price');
  const isClear = report.counts.total === 0;
  let bg, color, text;
  if (qpBlockers.length > 0) {
    bg = 'rgba(239,68,68,0.15)'; color = '#ef4444'; text = `QA: ${qpBlockers.length} Price Fields`;
  } else if (others.length > 0) {
    bg = 'rgba(245,158,11,0.15)'; color = '#f59e0b'; text = `Full Details: ${others.length}`;
  } else {
    bg = 'rgba(34,197,94,0.15)'; color = '#22c55e'; text = 'QA Ready';
  }
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.6rem', borderRadius: 6, border: `1px solid ${color}40`, background: bg, color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
      <span>{text}</span>
    </button>
  );
}
