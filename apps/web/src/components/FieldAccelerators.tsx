// ═══════════════════════════════════════════════════════════════
// Field Accelerators — Rapid-workflow UX components
// Swipe gestures, keyboard shortcuts, auto-focus, floating FAB,
// sticky toolbar, and quick-duplicate for field speed.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { parseMeasurement, toFractionDisplay } from '../utils/measurementParser';

// ── 1. Swipe Navigation Hook ────────────────────────────────
// Detects horizontal swipes for tab navigation on mobile
export function useSwipeNav(tabs: string[], currentTab: string, onChangeTab: (tab: string) => void) {
  const startX = useRef(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only attach to the ref element — never fall back to document.body.
    // Attaching to body caused all taps (even on archive/delete buttons) to
    // fire through the swipe handler, swallowing the touch on a slight move.
    const el = containerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      // Only trigger on predominantly horizontal swipes > 80px
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
        const idx = tabs.indexOf(currentTab);
        if (dx < 0 && idx < tabs.length - 1) onChangeTab(tabs[idx + 1]); // swipe left → next
        if (dx > 0 && idx > 0) onChangeTab(tabs[idx - 1]); // swipe right → prev
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [tabs, currentTab, onChangeTab]);

  return containerRef;
}


// ── 2. Keyboard Shortcuts Hook ──────────────────────────────
// Global shortcuts for desktop and bluetooth keyboards
export function useFieldShortcuts(handlers: {
  onAddOpening?: () => void;
  onDuplicate?: () => void;
  onSave?: () => void;
  onNextOpening?: () => void;
  onPrevOpening?: () => void;
  onEscape?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Only handle Escape and Tab shortcuts inside inputs
        if (e.key === 'Escape') { handlers.onEscape?.(); e.preventDefault(); }
        if (e.key === 'Enter' && e.ctrlKey) { handlers.onSave?.(); e.preventDefault(); }
        return;
      }

      switch (e.key) {
        case 'n': case 'N': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handlers.onAddOpening?.(); } break;
        case 'd': case 'D': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handlers.onDuplicate?.(); } break;
        case 's': case 'S': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handlers.onSave?.(); } break;
        case 'ArrowRight': if (e.altKey) { handlers.onNextOpening?.(); e.preventDefault(); } break;
        case 'ArrowLeft': if (e.altKey) { handlers.onPrevOpening?.(); e.preventDefault(); } break;
        case 'ArrowDown': if (e.altKey) { handlers.onNextTab?.(); e.preventDefault(); } break;
        case 'ArrowUp': if (e.altKey) { handlers.onPrevTab?.(); e.preventDefault(); } break;
        case 'Escape': handlers.onEscape?.(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}

// ── 3. Auto-Advance Measurement Input ───────────────────────
// When width is entered, auto-focus height. When height is entered, auto-advance.
export function AutoAdvanceMeasure({
  width, height, onWidthChange, onHeightChange, onComplete,
}: {
  width: number; height: number;
  onWidthChange: (v: number) => void; onHeightChange: (v: number) => void;
  onComplete?: () => void;
}) {
  const widthRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);

  const [widthText, setWidthText] = useState(width ? toFractionDisplay(width) : '');
  const [heightText, setHeightText] = useState(height ? toFractionDisplay(height) : '');

  useEffect(() => {
    setWidthText(width ? toFractionDisplay(width) : '');
  }, [width]);

  useEffect(() => {
    setHeightText(height ? toFractionDisplay(height) : '');
  }, [height]);

  const handleWidthChange = (val: string) => {
    setWidthText(val);
    const parsed = parseMeasurement(val);
    if (parsed.valid) {
      onWidthChange(parsed.inches);
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightText(val);
    const parsed = parseMeasurement(val);
    if (parsed.valid) {
      onHeightChange(parsed.inches);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
      <div>
        <label style={labelStyle}>Width (in)</label>
        <input ref={widthRef} type="text" value={widthText}
          className="form-input" autoFocus
          onChange={e => handleWidthChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              heightRef.current?.focus();
              heightRef.current?.select();
            }
          }}
          style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}
        />
      </div>
      <div>
        <label style={labelStyle}>Height (in)</label>
        <input ref={heightRef} type="text" value={heightText}
          className="form-input"
          onChange={e => handleHeightChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onComplete?.();
            }
          }}
          style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}
        />
      </div>
    </div>
  );
}

// ── 4. Floating Action Button (FAB) ─────────────────────────
// Persistent floating button for rapid add/duplicate
export function FloatingActionButton({
  onAdd, onDuplicate, lastOpening,
}: {
  onAdd: () => void;
  onDuplicate?: () => void;
  lastOpening?: any;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 16, zIndex: 150,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem',
    }}>
      {expanded && (
        <>
          {lastOpening && onDuplicate && (
            <button onClick={() => { onDuplicate(); setExpanded(false); }}
              style={fabSecondary}>
              📋 Dup #{lastOpening.openingNumber}
            </button>
          )}
          <button onClick={() => { onAdd(); setExpanded(false); }}
            style={fabSecondary}>
            🪟 New Opening
          </button>
        </>
      )}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: '#fff', fontSize: '1.5rem', fontWeight: 700,
        boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
        transition: 'transform 0.2s',
        transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        +
      </button>
    </div>
  );
}

// ── 5. Opening Navigator Strip ──────────────────────────────
// Horizontal scrollable strip for fast opening switching
export function OpeningNavigator({
  openings, activeNumber, onSelect, onDuplicate,
}: {
  openings: any[];
  activeNumber?: number;
  onSelect: (opening: any) => void;
  onDuplicate: (opening: any) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active opening
  useEffect(() => {
    if (activeNumber && stripRef.current) {
      const btn = stripRef.current.querySelector(`[data-num="${activeNumber}"]`) as HTMLElement;
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeNumber]);

  return (
    <div ref={stripRef} style={{
      display: 'flex', gap: '0.375rem', overflowX: 'auto', padding: '0.375rem 0',
      WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      scrollSnapType: 'x mandatory',
    }}>
      {openings.map(o => {
        const isActive = o.openingNumber === activeNumber;
        const hasMeasure = o.width > 0 && o.height > 0;
        return (
          <button key={o.id || o.openingNumber} data-num={o.openingNumber}
            onClick={() => onSelect(o)}
            onDoubleClick={() => onDuplicate(o)}
            style={{
              minWidth: 64, padding: '0.375rem 0.5rem', borderRadius: 8, border: '2px solid',
              borderColor: isActive ? '#3b82f6' : hasMeasure ? 'rgba(34,197,94,0.3)' : 'var(--border)',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              cursor: 'pointer', flexShrink: 0,
              scrollSnapAlign: 'center',
              transition: 'all 0.15s',
            }}>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: isActive ? '#3b82f6' : 'var(--text-primary)' }}>
              #{o.openingNumber}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {o.roomLocation?.slice(0, 8) || 'No room'}
            </div>
            {hasMeasure && (
              <div style={{ fontSize: '0.55rem', color: '#22c55e', fontWeight: 600 }}>
                {o.width}×{o.height}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── 6. Quick Duplicate Bar ──────────────────────────────────
// One-tap duplicate with room name auto-increment
export function QuickDuplicateBar({
  lastSaved, onDuplicate,
}: {
  lastSaved: any;
  onDuplicate: (overrides?: Record<string, any>) => void;
}) {
  if (!lastSaved) return null;
  const rooms = ['Same Room', 'Next Room', 'Bathroom', 'Kitchen', 'Bedroom', 'Living Room'];

  return (
    <div style={{
      display: 'flex', gap: '0.375rem', overflowX: 'auto', padding: '0.5rem',
      background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)',
      WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, alignSelf: 'center' }}>
        Quick dup #{lastSaved.openingNumber}:
      </span>
      {rooms.map(r => (
        <button key={r} className="btn btn-sm btn-secondary" style={{ flexShrink: 0, fontSize: '0.6875rem' }}
          onClick={() => onDuplicate(r === 'Same Room' ? {} : { roomLocation: r })}>
          {r}
        </button>
      ))}
    </div>
  );
}

// ── 7. Sticky Measurement Toolbar ───────────────────────────
// Stays visible while scrolling through opening details
export function StickyMeasureToolbar({
  width, height, unitedInches, openingNumber,
}: {
  width: number; height: number; unitedInches: number; openingNumber: number;
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.375rem 0.75rem',
      background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.875rem' }}>
        #{openingNumber}
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
          {width > 0 ? `${width}"` : '—'} × {height > 0 ? `${height}"` : '—'}
        </span>
        {unitedInches > 0 && (
          <span style={{
            padding: '0.15rem 0.5rem', borderRadius: 6,
            background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
            fontWeight: 700, fontSize: '0.75rem',
          }}>
            UI: {unitedInches}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Shared Styles ───────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.15rem',
  display: 'block',
};

const fabSecondary: React.CSSProperties = {
  padding: '0.5rem 1rem', borderRadius: 24, border: 'none', cursor: 'pointer',
  background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8125rem',
  fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  display: 'flex', alignItems: 'center', gap: '0.375rem',
  whiteSpace: 'nowrap',
};
