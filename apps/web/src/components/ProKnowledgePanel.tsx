// ═══════════════════════════════════════════════════════════
// Pro Knowledge Panel — Customer-facing knowledge cards
// that make the rep sound like a 20-year veteran.
// Surfaces talk tracks automatically based on context.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  getRelevantKnowledge, getFinancingKnowledge, getJobKnowledge,
  type KnowledgeCard,
} from '../utils/proKnowledge';

// ── Talk Track Card ──────────────────────────────────────
function TalkTrackCard({ card, compact }: { card: KnowledgeCard; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <button onClick={() => setExpanded(!expanded)} style={{
        padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.12)',
        background: expanded ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.03)',
        cursor: 'pointer', textAlign: 'left', width: '100%', color: 'var(--text-primary)',
        marginBottom: 3, transition: 'all 0.15s',
      }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#6366f1', display: 'flex', justifyContent: 'space-between' }}>
          <span>{card.icon} {card.title}</span>
          <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{expanded ? '▴' : 'Talk Track'}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: '4px' }}>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{card.talkTrack}"
            </p>
            <p style={{ fontSize: '0.5625rem', color: '#22c55e', margin: '0 0 2px', fontWeight: 600 }}>
              ✓ Why it matters: {card.whyItMatters}
            </p>
            {card.proTip && (
              <p style={{ fontSize: '0.5625rem', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
                💡 {card.proTip}
              </p>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 12, marginBottom: '0.75rem',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03))',
      border: '1px solid rgba(99,102,241,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {card.icon} {card.title}
        </h3>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 9999 }}>
          {card.category}
        </span>
      </div>

      {/* Talk track — italicized for "say this" effect */}
      <div style={{
        padding: '8px 12px', borderRadius: 8, marginBottom: '0.5rem',
        background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #6366f1',
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          "{card.talkTrack}"
        </p>
      </div>

      {/* Why it matters */}
      <div style={{ fontSize: '0.8125rem', color: '#22c55e', fontWeight: 600, marginBottom: '0.25rem' }}>
        ✓ {card.whyItMatters}
      </div>

      {/* Pro tip */}
      {card.proTip && (
        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
          💡 {card.proTip}
        </div>
      )}
    </div>
  );
}

// ── Opening Knowledge Panel (inside edit modal) ──────────
export function OpeningKnowledgePanel({
  opening,
}: {
  opening: any;
}) {
  const cards = useMemo(() => getRelevantKnowledge(opening), [opening]);

  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🎯 Talk Tracks for This Opening
      </div>
      {cards.map(card => (
        <TalkTrackCard key={card.id} card={card} compact />
      ))}
    </div>
  );
}

// ── Full Knowledge Library (for Customer Mode proposal) ──
export function KnowledgeLibrary({
  openings, showFinancing,
}: {
  openings: any[];
  showFinancing?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const jobCards = useMemo(() => getJobKnowledge(openings), [openings]);
  const finCards = showFinancing ? getFinancingKnowledge() : [];
  const allCards = [...jobCards, ...finCards];

  const categories = Array.from(new Set(allCards.map(c => c.category)));

  if (allCards.length === 0) return null;

  const filtered = activeCategory ? allCards.filter(c => c.category === activeCategory) : allCards;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.75rem' }}>
        🎓 Expert Knowledge
      </h2>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveCategory(null)} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: !activeCategory ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
          color: !activeCategory ? '#6366f1' : 'var(--text-muted)',
          fontSize: '0.6875rem', fontWeight: 600,
        }}>All ({allCards.length})</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: activeCategory === cat ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            color: activeCategory === cat ? '#6366f1' : 'var(--text-muted)',
            fontSize: '0.6875rem', fontWeight: 600,
          }}>{cat} ({allCards.filter(c => c.category === cat).length})</button>
        ))}
      </div>

      {/* Cards */}
      {filtered.map(card => (
        <TalkTrackCard key={card.id} card={card} />
      ))}
    </div>
  );
}
