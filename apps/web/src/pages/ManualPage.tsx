/**
 * ManualPage - Field Manual and Interactive Training Mode
 *
 * Encoding rules for this file:
 *  - NO emoji literals anywhere (they corrupt on Windows saves)
 *  - NO HTML entities as string props (React renders them as text, not HTML)
 *  - NO Unicode escape sequences that may garble (\u2014 is OK, literals are not)
 *  - Use inline SVG for any icon needs
 *  - Use plain ASCII dashes: -- or use \u2014 escape for em-dash in JSX
 *
 * Tabs:
 *  Field Manual  - searchable, categorized chapters
 *  Training Mode - structured paths with quizzes and scenarios
 *  Auditor Guide - severity levels, auditor descriptions
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store';
import { api } from '../utils/api';
import {
  manualChapters,
  manualCategories,
  manualRoles,
  auditors,
  issueSeverities,
  type ManualChapter,
  type ManualSection,
  type ManualVideo,
} from '../data/manualContent';
import {
  expansionChapters,
  expansionCategories,
} from '../data/manualExpansion';
import {
  allTrainingPaths,
  type TrainingPath,
  type TrainingLesson,
  type QuizQuestion,
} from '../data/allTrainingPaths';
import { allLibraryChapters } from '../data/manualLibrary';
import { YouTubeEmbedCard } from '../components/YouTubeEmbedCard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CHAPTERS: ManualChapter[] = [
  ...manualChapters,
  ...expansionChapters,
  ...allLibraryChapters,
];
const ALL_CATEGORIES = ['All', ...manualCategories, ...expansionCategories];
const ALL_ROLES = ['All', ...manualRoles];

type ActiveTab = 'manual' | 'training' | 'auditors';

// ---------------------------------------------------------------------------
// SVG Icons (inline, no emoji, no external fonts)
// ---------------------------------------------------------------------------

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Category color map (ASCII only)
// ---------------------------------------------------------------------------

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    'Window Types': '#3b82f6',
    'Door Types': '#8b5cf6',
    'Siding': '#10b981',
    'Measuring Rules': '#f59e0b',
    'Glass and Safety': '#ef4444',
    'Exterior Conditions': '#f97316',
    'Chargeable Options': '#ec4899',
    'Production Handoff': '#6366f1',
    'Follow-Up': '#14b8a6',
    'Getting Started': '#64748b',
    'Sales Workflow': '#0ea5e9',
    'Field Measurement': '#f59e0b',
    'Lead Management': '#22c55e',
    'Sketch and Photos': '#a855f7',
    'Product Selection': '#06b6d4',
    'Pricing and Quotes': '#f59e0b',
    'Contracts': '#84cc16',
    'Auditor System': '#ef4444',
    'Manager Tools': '#8b5cf6',
  };
  return map[cat] ?? '#475569';
}

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.7rem',
    fontWeight: 700,
    background: color,
    color: '#fff',
    marginRight: '0.25rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };
}

function chapterCardStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.875rem 1rem',
    borderRadius: 8,
    border: `1px solid ${active ? 'rgba(59,130,246,0.5)' : 'rgba(71,85,105,0.3)'}`,
    background: active ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.4)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

// ---------------------------------------------------------------------------
// Tab button (SVG icon, plain text label - no emoji, no HTML entities as props)
// ---------------------------------------------------------------------------

type TabId = 'manual' | 'training' | 'auditors';

function TabButton({ active, onClick, tabId }: { active: boolean; onClick: () => void; tabId: TabId }) {
  const labels: Record<TabId, string> = {
    manual: 'Field Manual',
    training: 'Training Mode',
    auditors: 'Auditor Guide',
  };
  const icons: Record<TabId, React.ReactNode> = {
    manual: <BookIcon />,
    training: <GraduationIcon />,
    auditors: <ChartIcon />,
  };
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1.125rem',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        fontSize: '0.85rem',
        background: active ? 'rgba(59,130,246,0.85)' : 'transparent',
        color: active ? '#fff' : '#94a3b8',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      {icons[tabId]}
      {labels[tabId]}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(71,85,105,0.3)',
        border: '1px solid rgba(71,85,105,0.5)',
        borderRadius: 6,
        color: '#94a3b8',
        cursor: 'pointer',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
      }}
    >
      <ArrowLeftIcon />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

interface ScenarioOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

function SectionView({ section }: { section: ManualSection }) {
  const [scenarioAnswer, setScenarioAnswer] = useState<string | null>(null);

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        borderRadius: 10,
        border: '1px solid rgba(71,85,105,0.25)',
        background: 'rgba(15,23,42,0.5)',
      }}
    >
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#e2e8f0' }}>
        {section.title}
      </h3>

      <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1rem' }}>
        {section.body}
      </p>

      {/* Steps */}
      {section.steps && section.steps.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Steps
          </div>
          {section.steps.map((step, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '0.375rem', fontSize: '0.875rem' }}
            >
              <span style={{ background: 'rgba(59,130,246,0.3)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, color: '#93c5fd' }}>
                {i + 1}
              </span>
              <span style={{ color: '#cbd5e1' }}>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      {section.checklist && section.checklist.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Checklist
          </div>
          {section.checklist.map((item, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '0.375rem', fontSize: '0.875rem', color: '#cbd5e1' }}
            >
              <span style={{ color: '#4ade80', marginTop: 2 }}><CheckIcon /></span>
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Examples */}
      {section.examples && section.examples.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Examples
          </div>
          {section.examples.map((ex, i) => (
            <div
              key={i}
              style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: '0.375rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#fcd34d' }}
            >
              {ex}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {section.warnings && section.warnings.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Warnings
          </div>
          {section.warnings.map((w, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#fca5a5' }}
            >
              <span style={{ marginTop: 1 }}><AlertIcon /></span>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* What to Choose / What NOT to Choose */}
      {(section.whatToChoose || section.whatNotToChoose) && (
        <div style={{ display: 'grid', gridTemplateColumns: section.whatToChoose && section.whatNotToChoose ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          {section.whatToChoose && (
            <div style={{ padding: '0.875rem', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>Choose this when...</div>
              <p style={{ color: '#bbf7d0', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{section.whatToChoose}</p>
            </div>
          )}
          {section.whatNotToChoose && (
            <div style={{ padding: '0.875rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>Do NOT choose when...</div>
              <p style={{ color: '#fecaca', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{section.whatNotToChoose}</p>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {section.tips && section.tips.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pro Tips</div>
          {section.tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '0.375rem', fontSize: '0.875rem', color: '#86efac' }}>
              <span style={{ fontWeight: 800, flexShrink: 0, color: '#4ade80' }}>+</span>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Rules / Code References */}
      {section.rules && section.rules.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rules and Code</div>
          {section.rules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '0.375rem', fontSize: '0.875rem', color: '#93c5fd' }}>
              <span style={{ fontWeight: 800, flexShrink: 0, color: '#3b82f6' }}>[R]</span>
              {rule}
            </div>
          ))}
        </div>
      )}

      {/* Installer Notes */}
      {section.installerNotes && section.installerNotes.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fb923c', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Installer Notes</div>
          {section.installerNotes.map((note, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)', marginBottom: '0.375rem', fontSize: '0.875rem', color: '#fdba74' }}>
              <span style={{ fontWeight: 800, flexShrink: 0, color: '#f97316' }}>[I]</span>
              {note}
            </div>
          ))}
        </div>
      )}

      {/* Chargeback Risks */}
      {section.chargebackRisks && section.chargebackRisks.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chargeback Risks</div>
          {section.chargebackRisks.map((risk, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.35)', marginBottom: '0.375rem', fontSize: '0.875rem', color: '#fca5a5' }}>
              <span style={{ fontWeight: 800, flexShrink: 0, color: '#ef4444' }}>$!</span>
              {risk}
            </div>
          ))}
        </div>
      )}

      {/* YouTube / Video Resources */}
      {section.videos && section.videos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Video Resources</div>
          {section.videos.map((vid, i) => (
            <YouTubeEmbedCard
              key={i}
              title={vid.title}
              url={vid.url}
              embedUrl={vid.embedUrl}
              attribution={vid.attribution}
              forceLinkCard={vid.sourceType === 'link'}
            />
          ))}
        </div>
      )}

      {/* Scenario */}
      {section.scenario && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Scenario
          </div>
          <p style={{ color: '#c4b5fd', marginBottom: '0.75rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {section.scenario.situation}
          </p>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#e2e8f0' }}>
            {section.scenario.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(Array.isArray(section.scenario.options) ? section.scenario.options : []).map((opt: ScenarioOption) => {
              const selected = scenarioAnswer === opt.id;
              const revealed = scenarioAnswer !== null;
              const isCorrect = opt.isCorrect;
              return (
                <button
                  key={opt.id}
                  onClick={() => !revealed && setScenarioAnswer(opt.id)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 6, textAlign: 'left', fontSize: '0.875rem', transition: 'all 0.15s',
                    cursor: revealed ? 'default' : 'pointer',
                    border: `1px solid ${revealed ? (isCorrect ? 'rgba(34,197,94,0.6)' : selected ? 'rgba(239,68,68,0.6)' : 'rgba(71,85,105,0.3)') : 'rgba(71,85,105,0.4)'}`,
                    background: revealed ? (isCorrect ? 'rgba(34,197,94,0.1)' : selected ? 'rgba(239,68,68,0.1)' : 'transparent') : selected ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: revealed ? (isCorrect ? '#4ade80' : selected ? '#f87171' : '#64748b') : '#e2e8f0',
                  }}
                >
                  {opt.text}
                  {revealed && opt.explanation && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.8 }}>
                      {opt.explanation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {scenarioAnswer && (
            <>
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.875rem', color: '#93c5fd' }}>
                <strong>Explanation:</strong> {section.scenario.explanation}
              </div>
              <button onClick={() => setScenarioAnswer(null)} style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'rgba(71,85,105,0.3)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer' }}>
                Reset
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter detail view
// ---------------------------------------------------------------------------

function ChapterDetail({ chapter }: { chapter: ManualChapter }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Field Manual</span>
        <ChevronRightIcon />
        <span style={{ color: '#94a3b8' }}>{chapter.category}</span>
        <ChevronRightIcon />
        <span style={{ color: '#e2e8f0' }}>{chapter.title}</span>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <span style={badgeStyle(categoryColor(chapter.category))}>{chapter.category}</span>
          {(Array.isArray(chapter.roles) ? chapter.roles : []).map((r) => (
            <span key={r} style={{ ...badgeStyle('#475569'), fontSize: '0.65rem' }}>{r}</span>
          ))}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f1f5f9' }}>
          {chapter.title}
        </h1>
        {chapter.subtitle && (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{chapter.subtitle}</p>
        )}
      </div>

      {(Array.isArray(chapter.sections) ? chapter.sections : []).map((sec) => (
        <SectionView key={sec.id} section={sec} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz question
// ---------------------------------------------------------------------------

function QuizQuestionView({ question, number }: { question: QuizQuestion; number: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;

  return (
    <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px solid rgba(71,85,105,0.3)' }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ background: 'rgba(59,130,246,0.3)', borderRadius: 6, padding: '0.125rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd', flexShrink: 0 }}>
          Q{number}
        </span>
        {question.codeRef && (
          <span style={{ ...badgeStyle('rgba(239,68,68,0.7)'), fontSize: '0.65rem' }}>{question.codeRef}</span>
        )}
      </div>

      <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
        {question.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {(Array.isArray(question.options) ? question.options : []).map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = opt.isCorrect;
          return (
            <button
              key={opt.id}
              onClick={() => !revealed && setSelected(opt.id)}
              style={{
                padding: '0.75rem 1rem', borderRadius: 6, textAlign: 'left', fontSize: '0.875rem', lineHeight: 1.5, transition: 'all 0.15s',
                cursor: revealed ? 'default' : 'pointer',
                border: `1px solid ${revealed ? (isCorrect ? 'rgba(34,197,94,0.6)' : isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(71,85,105,0.2)') : 'rgba(71,85,105,0.4)'}`,
                background: revealed ? (isCorrect ? 'rgba(34,197,94,0.1)' : isSelected ? 'rgba(239,68,68,0.08)' : 'transparent') : isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: revealed ? (isCorrect ? '#4ade80' : isSelected ? '#f87171' : '#475569') : '#e2e8f0',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{opt.id.toUpperCase()}.</span>
                <div>
                  <div>{opt.text}</div>
                  {revealed && opt.explanation && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.85 }}>{opt.explanation}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.08)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.875rem', color: '#93c5fd', lineHeight: 1.6 }}>
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}
      {revealed && (
        <button onClick={() => setSelected(null)} style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'rgba(71,85,105,0.25)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer' }}>
          Try Again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown line renderer (for lesson body text)
// ---------------------------------------------------------------------------

function renderMarkdownLine(line: string, i: number): React.ReactNode {
  if (line.startsWith('## ')) {
    return <h2 key={i} style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem', marginTop: '1rem', borderBottom: '1px solid rgba(71,85,105,0.3)', paddingBottom: '0.25rem' }}>{line.slice(3)}</h2>;
  }
  if (line.startsWith('### ')) {
    return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem', marginTop: '0.75rem' }}>{line.slice(4)}</h3>;
  }
  if (line.startsWith('- ')) {
    return (
      <div key={i} style={{ display: 'flex', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
        <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>-</span>
        {line.slice(2)}
      </div>
    );
  }
  if (line.startsWith('> ')) {
    return <div key={i} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '0.75rem', color: '#93c5fd', fontStyle: 'italic', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{line.slice(2)}</div>;
  }
  if (line.trim() === '' || line.trim() === '---') {
    return <div key={i} style={{ height: '0.5rem' }} />;
  }
  if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
    return <p key={i} style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{line.slice(2, -2)}</p>;
  }
  return <p key={i} style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '0.25rem' }}>{line}</p>;
}

// ---------------------------------------------------------------------------
// Lesson view
// ---------------------------------------------------------------------------

function LessonView({ lesson, onBack }: { lesson: TrainingLesson; onBack: () => void }) {
  const [scenarioAnswer, setScenarioAnswer] = useState<string | null>(null);
  const [aiScenario, setAiScenario] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const lessonType = (lesson as any).type ?? (lesson as any).lessonType ?? 'article';
  const lessonQuiz = (lesson as any).quiz ?? (lesson as any).quizJson ?? null;
  const safeQuiz = Array.isArray(lessonQuiz) ? lessonQuiz : [];
  
  useEffect(() => {
    setScenarioAnswer(null);
    setAiScenario(null);
    if (lessonType === 'scenario' || lessonType === 'chargeback_sim') {
      setLoadingAi(true);
      api.generateSimulatorScenario(lesson.title)
        .then(res => setAiScenario(res))
        .catch(() => {
          // Fallback to hardcoded scenario if AI fails or is offline
          setAiScenario((lesson as any).scenario ?? (lesson as any).scenarioJson ?? null);
        })
        .finally(() => setLoadingAi(false));
    } else {
      setAiScenario((lesson as any).scenario ?? (lesson as any).scenarioJson ?? null);
    }
  }, [lesson, lessonType]);

  const lessonScenario = aiScenario;

  const typeLabelColor: Record<string, string> = {
    quiz: '#3b82f6',
    scenario: '#8b5cf6',
    measurement_practice: '#f59e0b',
    chargeback_sim: '#ef4444',
    article: '#64748b',
    video: '#06b6d4',
  };

  return (
    <div>
      <BackButton onClick={onBack} label="Back to Lessons" />

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={badgeStyle(typeLabelColor[lessonType] ?? '#64748b')}>
            {lessonType.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lesson.durationMinutes} min</span>
        </div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.5rem' }}>{lesson.title}</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{lesson.summary}</p>
      </div>

      {/* Body markdown */}
      {lesson.bodyMarkdown && (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(15,23,42,0.5)', borderRadius: 10, border: '1px solid rgba(71,85,105,0.25)' }}>
          {lesson.bodyMarkdown.split('\n').map((line, i) => renderMarkdownLine(line, i))}
        </div>
      )}

      {/* Video (YouTube embed) */}
      {(lesson as any).videoUrl && (
        <div style={{ marginBottom: '1.5rem' }}>
          <YouTubeEmbedCard
            title={lesson.title}
            url={(lesson as any).videoUrl}
            attribution={(lesson as any).videoAttribution}
          />
        </div>
      )}

      {/* Quiz */}
      {safeQuiz.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Knowledge Check &mdash; {safeQuiz.length} Question{safeQuiz.length !== 1 ? 's' : ''}
          </div>
          {safeQuiz.map((q: any, i: number) => (
            <QuizQuestionView key={q.id ?? i} question={q} number={i + 1} />
          ))}
        </div>
      )}

      {/* Scenario */}
      {loadingAi ? (
        <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🤖 AI Generating Scenario...
          </div>
        </div>
      ) : lessonScenario && (
        <div style={{ padding: '1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Field Scenario {lessonScenario.isAiGenerated && <span style={{ color: '#3b82f6', fontStyle: 'italic', marginLeft: '0.5rem' }}>(AI Generated)</span>}
          </div>
          <div style={{ padding: '0.875rem', background: 'rgba(139,92,246,0.1)', borderRadius: 8, marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Situation</div>
            <p style={{ color: '#e2e8f0', marginTop: '0.25rem', fontSize: '0.9rem', lineHeight: 1.6 }}>{lessonScenario.situation}</p>
          </div>
          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>{lessonScenario.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(Array.isArray(lessonScenario.options) ? lessonScenario.options : []).map((opt: any) => {
              const isSelected = scenarioAnswer === opt.id;
              const revealed = scenarioAnswer !== null;
              const isCorrect = opt.isCorrect;
              return (
                <button
                  key={opt.id}
                  onClick={() => !revealed && setScenarioAnswer(opt.id)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 6, textAlign: 'left', fontSize: '0.875rem', lineHeight: 1.5,
                    cursor: revealed ? 'default' : 'pointer',
                    border: `1px solid ${revealed ? (isCorrect ? 'rgba(34,197,94,0.6)' : isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(71,85,105,0.2)') : 'rgba(71,85,105,0.4)'}`,
                    background: revealed ? (isCorrect ? 'rgba(34,197,94,0.1)' : isSelected ? 'rgba(239,68,68,0.08)' : 'transparent') : 'transparent',
                    color: revealed ? (isCorrect ? '#4ade80' : isSelected ? '#f87171' : '#475569') : '#e2e8f0',
                  }}
                >
                  {opt.text}
                  {revealed && opt.explanation && <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.85 }}>{opt.explanation}</div>}
                </button>
              );
            })}
          </div>
          {scenarioAnswer && (
            <>
              <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.08)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.875rem', color: '#93c5fd', lineHeight: 1.6 }}>
                <strong>Explanation:</strong> {lessonScenario.explanation}
              </div>
              <button onClick={() => setScenarioAnswer(null)} style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'rgba(71,85,105,0.25)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer' }}>
                Reset
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Training path card
// ---------------------------------------------------------------------------

const pathIconLabels: Record<string, string> = {
  BOOTCAMP: 'BOOT',
  'WINDOW-ID': 'WIN',
  SAFETY: 'SAFE',
  GLASS: 'GLSS',
  DOOR: 'DOOR',
  SHIELD: 'SHLD',
  AUDIT: 'AUDT',
  SIDING: 'SDNG',
  CONTRACT: 'CNTR',
  ADVANCED: 'ADV',
  // Paths 11-15
  ESTIMATE: 'EST',
  SKETCH: 'SKCH',
  FINANCE: 'FIN',
  ADMIN: 'ADMN',
};

function PathCard({ path, onClick }: { path: TrainingPath; onClick: () => void }) {
  const roleColors: Record<string, string> = {
    sales_rep: '#3b82f6',
    manager: '#8b5cf6',
    auditor: '#f59e0b',
    all: '#10b981',
  };

  const iconLabel = pathIconLabels[path.iconEmoji ?? ''] ?? (path.iconEmoji ?? 'PATH').slice(0, 4).toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{ padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(71,85,105,0.3)', background: 'rgba(15,23,42,0.5)', cursor: 'pointer', transition: 'all 0.15s ease', marginBottom: '1rem' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', fontWeight: 800, flexShrink: 0,
              color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.03em',
              textAlign: 'center', lineHeight: 1.1,
            }}
          >
            {iconLabel}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{path.title}</div>
            {path.required && <span style={badgeStyle('#ef4444')}>Required</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={badgeStyle(roleColors[path.roleTarget] ?? '#475569')}>
            {path.roleTarget.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{path.estimatedMinutes} min</span>
        </div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        {path.description}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(Array.isArray(path.lessons) ? path.lessons : []).map((l: any) => (
          <span
            key={l.id}
            style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: 4, background: 'rgba(71,85,105,0.3)', color: '#94a3b8' }}
          >
            {(l.type ?? l.lessonType ?? 'lesson').replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ManualPage
// ---------------------------------------------------------------------------

export function ManualPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedChapter, setSelectedChapter] = useState<ManualChapter | null>(null);
  const [selectedPath, setSelectedPath] = useState<TrainingPath | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<TrainingLesson | null>(null);

  // Cloud state -- loaded from backend API, local data is fallback only
  const [cloudArticles, setCloudArticles] = useState<any[]>([]);
  const [cloudCategories, setCloudCategories] = useState<any[]>([]);
  const [cloudPaths, setCloudPaths] = useState<any[]>([]);
  const [cloudProgress, setCloudProgress] = useState<any[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [selectedCloudArticle, setSelectedCloudArticle] = useState<any | null>(null);

  const user = useAuthStore((s) => s.user);


  // Read ?article=<id> URL param on mount -- jump directly to that chapter
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (articleId) {
        // Try cloud articles first, then local fallback
        const cloudMatch = cloudArticles.find((a: any) => a.slug === articleId || a.id === articleId);
        if (cloudMatch) {
          setActiveTab('manual');
          setSelectedCloudArticle(cloudMatch);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const chapter = ALL_CHAPTERS.find((ch) => ch.id === articleId);
        if (chapter) {
          setActiveTab('manual');
          setSelectedChapter(chapter);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch {
      // ignore -- URL params not critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudArticles]);

  // ── Cloud data fetch ────────────────────────────────────────────────────────
  // Articles, categories, and training paths are loaded from the cloud backend.
  // Local static data is kept as offline fallback only.
  useEffect(() => {
    let cancelled = false;
    const fetchCloud = async () => {
      setCloudLoading(true);
      setCloudError(null);
      try {
        const [cats, articles] = await Promise.all([
          api.getManualCategories(),
          api.getManualArticles(),
        ]);
        if (!cancelled) {
          setCloudCategories(cats ?? []);
          setCloudArticles(articles ?? []);
        }
      } catch {
        if (!cancelled) setCloudError('offline');
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    };
    fetchCloud();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchPaths = async () => {
      try {
        const paths = await api.getTrainingPaths();
        if (!cancelled && paths?.length) setCloudPaths(paths);
      } catch {
        // Silently fall back to local training paths
      }
    };
    fetchPaths();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchProgress = async () => {
      try {
        const progress = await api.getMyTrainingProgress();
        if (!cancelled && progress) setCloudProgress(progress ?? []);
      } catch {
        // Progress unavailable -- not critical
      }
    };
    fetchProgress();
    return () => { cancelled = true; };
  }, []);


  // Build effective category list: prefer cloud categories, fall back to local
  const effectiveCategories = useMemo(() => {
    if (Array.isArray(cloudCategories) && cloudCategories.length > 0) {
      // Cloud categories from the API — use their titles, deduped
      const cloudCatTitles = cloudCategories
        .filter((c: any) => c.active !== false)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c: any) => c.title ?? c.slug ?? 'General');
      return ['All', ...cloudCatTitles.filter((t: string, i: number, a: string[]) => a.indexOf(t) === i)];
    }
    // Fall back to local static categories
    return ALL_CATEGORIES.filter((c, i, a) => a.indexOf(c) === i);
  }, [cloudCategories]);

  // Chapters: prefer cloud, fall back to local static data
  const filteredChapters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // If cloud articles loaded, filter them
    if (cloudArticles.length > 0) {
      return cloudArticles.filter((a: any) => {
        const matchSearch =
          !q ||
          (a.title ?? '').toLowerCase().includes(q) ||
          (a.summary ?? '').toLowerCase().includes(q) ||
          (a.bodyMarkdown ?? '').toLowerCase().includes(q) ||
          (a.category?.title ?? '').toLowerCase().includes(q);
        const matchCategory = selectedCategory === 'All' || a.category?.title === selectedCategory || a.category?.slug === selectedCategory;
        return matchSearch && matchCategory;
      });
    }
    // Fall back to local
    return ALL_CHAPTERS.filter((ch) => {
      const matchSearch =
        !q ||
        ch.title.toLowerCase().includes(q) ||
        (ch.subtitle ?? '').toLowerCase().includes(q) ||
        ch.category.toLowerCase().includes(q) ||
        (ch.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        ch.sections.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.body.toLowerCase().includes(q) ||
            s.checklist?.some((c) => c.toLowerCase().includes(q)) ||
            s.warnings?.some((w) => w.toLowerCase().includes(q)) ||
            s.tips?.some((t) => t.toLowerCase().includes(q)) ||
            s.rules?.some((r) => r.toLowerCase().includes(q)) ||
            s.steps?.some((st) => st.toLowerCase().includes(q)) ||
            s.examples?.some((ex) => ex.toLowerCase().includes(q)) ||
            (s as any).chargebackRisks?.some((cr: string) => cr.toLowerCase().includes(q)) ||
            (s as any).installerNotes?.some((n: string) => n.toLowerCase().includes(q))
        );
      const matchCategory = selectedCategory === 'All' || ch.category === selectedCategory;
      const matchRole = selectedRole === 'All' || ch.roles.includes(selectedRole);
      return matchSearch && matchCategory && matchRole;
    });
  }, [searchQuery, selectedCategory, selectedRole, cloudArticles]);


  // Category counts -- dynamically computed from active data source
  const categoryCounts = useMemo(() => {
    if (Array.isArray(cloudCategories) && cloudCategories.length > 0) {
      // Use cloud category _count from the server (pre-filtered to published)
      const totalArticles = cloudCategories.reduce((sum: number, c: any) => sum + (c._count?.articles ?? 0), 0);
      const counts: Record<string, number> = { All: totalArticles };
      cloudCategories.forEach((c: any) => {
        const catTitle = c.title ?? c.slug ?? 'General';
        counts[catTitle] = c._count?.articles ?? 0;
      });
      return counts;
    }
    // Fall back to local chapter counts
    const counts: Record<string, number> = { All: ALL_CHAPTERS.length };
    ALL_CHAPTERS.forEach((ch) => {
      counts[ch.category] = (counts[ch.category] ?? 0) + 1;
    });
    return counts;
  }, [cloudCategories]);

  // Training paths: prefer cloud, fall back to local
  const effectivePaths = Array.isArray(cloudPaths) && cloudPaths.length > 0 ? cloudPaths : allTrainingPaths;
  const filteredPaths = useMemo(() => {
    const role = (user as any)?.role ?? 'sales_rep';
    const safePaths = Array.isArray(effectivePaths) ? effectivePaths : [];
    return safePaths.filter(
      (p: any) => p.roleTarget === 'all' || p.roleTarget === role || role === 'admin' || role === 'manager'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(user as any)?.role, cloudPaths]);


  const handleSelectChapter = useCallback((ch: ManualChapter) => {
    setSelectedChapter(ch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToManual = () => { setActiveTab('manual'); setSelectedChapter(null); setSelectedCloudArticle(null); };
  const goToTraining = () => { setActiveTab('training'); setSelectedPath(null); setSelectedLesson(null); };
  const goToAuditors = () => setActiveTab('auditors');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "var(--font)" }}>

      {/* ── Header ── */}
      <header style={{ background: 'var(--royal)', borderBottom: '1px solid var(--border)', padding: '12px 16px', color: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
              Field Manual &amp; Training
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>
              Window World Baton Rouge &mdash; Field Sales Reference and Interactive Training
            </p>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.16)', padding: '0.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
            <TabButton active={activeTab === 'manual'} onClick={goToManual} tabId="manual" />
            <TabButton active={activeTab === 'training'} onClick={goToTraining} tabId="training" />
            <TabButton active={activeTab === 'auditors'} onClick={goToAuditors} tabId="auditors" />
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MANUAL TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'manual' && (
        <div className="manual-grid" style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 110px)' }}>

          {/* Sidebar */}
          <aside className="manual-sidebar" style={{ borderRight: '1px solid var(--border)', padding: '1.25rem 1rem', background: '#fff', overflowY: 'auto', position: 'sticky', top: 0, maxHeight: 'calc(100vh - 110px)' }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <SearchIcon />
              <input
                type="search"
                placeholder="Search manual..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedChapter(null); setSelectedCloudArticle(null); }}
                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Role filter */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                Filter by Role
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid rgba(71,85,105,0.4)', background: 'rgba(30,41,59,0.8)', color: '#f1f5f9', fontSize: '0.8rem' }}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Category nav */}
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Categories
            </div>
            {effectiveCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedChapter(null); setSelectedCloudArticle(null); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '0.45rem 0.6rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  marginBottom: '0.1rem', fontSize: '0.8rem',
                  background: selectedCategory === cat ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: selectedCategory === cat ? '#93c5fd' : '#94a3b8',
                  textAlign: 'left',
                }}
              >
                <span>{cat}</span>
                {categoryCounts[cat] !== undefined && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(71,85,105,0.3)', borderRadius: 10, padding: '0.1rem 0.4rem', color: '#64748b' }}>
                    {categoryCounts[cat]}
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Main content */}
          <main style={{ padding: '1.5rem 2rem', overflowY: 'auto', minWidth: 0 }}>

            {/* Cloud status indicator */}
            {!cloudLoading && !cloudError && cloudArticles.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#4ade80' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                Cloud library loaded -- {cloudArticles.length} articles from server
              </div>
            )}
            {cloudError && (
              <div style={{ marginBottom: '1rem', padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.72rem', color: '#fbbf24' }}>
                Offline -- showing local content. Cloud articles unavailable.
              </div>
            )}
            {cloudLoading && (
              <div style={{ marginBottom: '1rem', padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.72rem', color: '#93c5fd' }}>
                Loading cloud content...
              </div>
            )}

            {/* Cloud article detail view */}
            {selectedCloudArticle ? (
              <>
                <BackButton onClick={() => setSelectedCloudArticle(null)} label="Back to List" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Field Manual</span>
                    <ChevronRightIcon />
                    <span style={{ color: '#94a3b8' }}>{selectedCloudArticle.category?.title ?? 'General'}</span>
                    <ChevronRightIcon />
                    <span style={{ color: '#e2e8f0' }}>{selectedCloudArticle.title}</span>
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f1f5f9' }}>
                    {selectedCloudArticle.title}
                  </h1>
                  {selectedCloudArticle.summary && (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{selectedCloudArticle.summary}</p>
                  )}
                  <div style={{ padding: '1.25rem', background: 'rgba(15,23,42,0.5)', borderRadius: 10, border: '1px solid rgba(71,85,105,0.25)', lineHeight: 1.7, color: '#cbd5e1', fontSize: '0.9rem' }}>
                    {(selectedCloudArticle.bodyMarkdown ?? '').split('\n').map((line: string, i: number) => renderMarkdownLine(line, i))}
                  </div>
                  {selectedCloudArticle.doChooseJson && Array.isArray(selectedCloudArticle.doChooseJson) && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.5rem', textTransform: 'uppercase' }}>When to Choose</div>
                      {selectedCloudArticle.doChooseJson.map((item: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.875rem', padding: '0.3rem 0' }}><span style={{ color: '#4ade80' }}>+</span>{item}</div>
                      ))}
                    </div>
                  )}
                  {selectedCloudArticle.doNotChooseJson && Array.isArray(selectedCloudArticle.doNotChooseJson) && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem', textTransform: 'uppercase' }}>When Not to Choose</div>
                      {selectedCloudArticle.doNotChooseJson.map((item: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.875rem', padding: '0.3rem 0' }}><span style={{ color: '#f87171' }}>-</span>{item}</div>
                      ))}
                    </div>
                  )}
                  {selectedCloudArticle.commonMistakesJson && Array.isArray(selectedCloudArticle.commonMistakesJson) && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Common Mistakes</div>
                      {selectedCloudArticle.commonMistakesJson.map((item: string, i: number) => (
                        <div key={i} style={{ color: '#cbd5e1', fontSize: '0.875rem', padding: '0.3rem 0' }}>{item}</div>
                      ))}
                    </div>
                  )}
                  {selectedCloudArticle.installerNotesJson && Array.isArray(selectedCloudArticle.installerNotesJson) && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Installer Notes</div>
                      {selectedCloudArticle.installerNotesJson.map((item: string, i: number) => (
                        <div key={i} style={{ color: '#cbd5e1', fontSize: '0.875rem', padding: '0.3rem 0' }}>{item}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: '#475569' }}>
                    v{selectedCloudArticle.version ?? 1} -- {selectedCloudArticle.status} -- {selectedCloudArticle.category?.title}
                  </div>
                </div>
              </>
            ) : selectedChapter ? (
              <>
                <BackButton onClick={() => setSelectedChapter(null)} label="Back to List" />
                <ChapterDetail chapter={selectedChapter} />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                    {selectedCategory === 'All' ? 'All Chapters' : selectedCategory}
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
                      {filteredChapters.length} article{filteredChapters.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                </div>

                {filteredChapters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <p style={{ marginBottom: '0.75rem' }}>
                      {searchQuery
                        ? `No articles found for "${searchQuery}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`
                        : `No articles found in ${selectedCategory === 'All' ? 'any category' : `"${selectedCategory}"`}.`
                      }
                    </p>
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedCloudArticle(null); setSelectedChapter(null); }}
                      style={{ padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 6, color: '#93c5fd', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {filteredChapters.map((ch: any) => {
                      // Cloud article card
                      if (cloudArticles.length > 0) {
                        return (
                          <div
                            key={ch.id}
                            onClick={() => { setSelectedCloudArticle(ch); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            style={chapterCardStyle(false)}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)')}
                          >
                            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={badgeStyle(categoryColor(ch.category?.title ?? 'General'))}>{ch.category?.title ?? 'General'}</span>
                              {ch.status === 'draft' && <span style={badgeStyle('#475569')}>Draft</span>}
                            </div>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.25rem', lineHeight: 1.4 }}>
                              {ch.title}
                            </div>
                            {ch.summary && (
                              <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>{ch.summary}</div>
                            )}
                          </div>
                        );
                      }
                      // Local fallback card
                      const isActive = selectedChapter !== null && (selectedChapter as ManualChapter).id === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => handleSelectChapter(ch)}
                          style={chapterCardStyle(isActive)}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = isActive ? 'rgba(59,130,246,0.5)' : 'rgba(71,85,105,0.3)')}
                        >
                          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={badgeStyle(categoryColor(ch.category))}>{ch.category}</span>
                          </div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.25rem', lineHeight: 1.4 }}>
                            {ch.title}
                          </div>
                          {ch.subtitle && (
                            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>{ch.subtitle}</div>
                          )}
                          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#475569' }}>
                            {(ch.sections ?? []).length} section{(ch.sections ?? []).length !== 1 ? 's' : ''} &mdash; {(ch.roles ?? []).join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </main>

        </div>
      )}

      {/* ══════════════════════════════════════════
          TRAINING TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'training' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
          {selectedLesson && selectedPath ? (
            <LessonView lesson={selectedLesson} onBack={() => setSelectedLesson(null)} />
          ) : selectedPath ? (
            <>
              <BackButton onClick={() => setSelectedPath(null)} label="Back to Paths" />
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', flexShrink: 0 }}>
                    {pathIconLabels[selectedPath.iconEmoji ?? ''] ?? (selectedPath.iconEmoji ?? 'PATH').slice(0, 4)}
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>{selectedPath.title}</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{selectedPath.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {selectedPath.required && <span style={badgeStyle('#ef4444')}>Required</span>}
                  <span style={{ ...badgeStyle('#475569'), fontSize: '0.75rem' }}>{selectedPath.roleTarget.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedPath.estimatedMinutes} min &mdash; {(selectedPath.lessons ?? []).length} lessons</span>
                </div>
              </div>

              <div>
                {(Array.isArray(selectedPath.lessons) ? selectedPath.lessons : []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                    No lessons available for this path yet.
                  </div>
                ) : (selectedPath.lessons ?? []).map((lesson: any, i: number) => {
                  const lessonType = lesson.type ?? lesson.lessonType ?? 'article';
                  return (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      // Save in_progress to cloud -- fire and forget
                      if (selectedPath?.id) {
                        api.saveTrainingProgress({
                          trainingPathId: selectedPath.id,
                          lessonId: lesson.id,
                          status: 'in_progress',
                        }).catch(() => { /* offline -- ignore */ });
                      }
                    }}
                    style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid rgba(71,85,105,0.3)', background: 'rgba(15,23,42,0.5)', cursor: 'pointer', marginBottom: '0.625rem', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)')}
                  >
                    <div style={{ background: 'rgba(59,130,246,0.15)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#93c5fd', fontSize: '0.875rem', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{lesson.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{lesson.summary}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={badgeStyle(lessonType === 'quiz' ? '#3b82f6' : lessonType === 'scenario' ? '#8b5cf6' : lessonType === 'measurement_practice' ? '#f59e0b' : '#64748b')}>
                        {lessonType.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lesson.durationMinutes}m</span>
                      <ChevronRightIcon />
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>
                  Training Paths
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  {filteredPaths.length} path{filteredPaths.length !== 1 ? 's' : ''} available &mdash; select a path to begin
                </p>
              </div>
              {filteredPaths.map((path) => (
                <PathCard key={path.id} path={path} onClick={() => setSelectedPath(path)} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          AUDITOR GUIDE TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'auditors' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
            Auditor System Guide
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}>
            The 4 severity levels and all automated auditors that protect data quality and revenue.
          </p>

          {/* Severity levels */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#93c5fd', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Severity Levels
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {issueSeverities.map((sev, i) => {
                const colors = ['#475569', '#f59e0b', '#ef4444', '#7c3aed'];
                const c = colors[i] ?? '#475569';
                return (
                  <div key={sev.id} style={{ padding: '1rem', borderRadius: 8, border: `1px solid ${c}44`, background: `${c}11` }}>
                    <div style={{ fontWeight: 700, color: c, marginBottom: '0.375rem', fontSize: '0.9rem' }}>{sev.name}</div>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 }}>{sev.description}</p>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: c }}>{sev.canMoveForward}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Auditors */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#93c5fd', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Automated Auditors
            </div>
            {auditors.map((aud) => (
              <div key={aud.id} style={{ marginBottom: '1rem', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(71,85,105,0.3)', background: 'rgba(15,23,42,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{aud.name}</h4>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {(aud.severityLevels as string[] | undefined)?.map((sl: string) => (
                      <span key={sl} style={badgeStyle(sl.includes('4') ? '#7c3aed' : sl.includes('3') ? '#ef4444' : sl.includes('2') ? '#f59e0b' : '#475569')}>
                        {sl.split(' ').slice(0, 2).join(' ')}
                      </span>
                    ))}
                    {aud.blocksSubmission && <span style={badgeStyle('#ef4444')}>Blocks</span>}
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: 1.6 }}>{aud.purpose}</p>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                  Common Issues
                </div>
                {(aud.commonIssues as string[] | undefined)?.map((issue: string, i: number) => (
                  <div key={i} style={{ padding: '0.375rem 0.625rem', borderRadius: 4, background: 'rgba(71,85,105,0.15)', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    {issue}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile-responsive overrides ── */}
      <style>{`
        @media (max-width: 768px) {
          .manual-sidebar { display: none !important; }
        }
        @media (max-width: 900px) {
          .manual-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ManualPage;
