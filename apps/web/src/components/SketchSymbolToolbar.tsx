// ═══════════════════════════════════════════════════════════════
// Sketch Symbol Toolbar — Mobile-Optimized Drawing Tools
// Full field symbol set: windows, doors, shapes, annotations,
// fixtures, materials, presets, and quick actions
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { MarkerSymbol } from '../utils/sketchSync';
import { SHAPE_ICON_MAP } from './SketchShapeIcons';

export type SketchTool = 'select' | 'pan' | 'pen' | 'line' | 'smart_outline' | 'eraser' | 'rect'
  // Windows
  | 'window_x' | 'dh' | 'sh' | 'slider' | 'picture' | 'casement' | 'awning'
  | 'oriel' | 'special_shape' | 'bay' | 'bow'
  | 'circle_top' | 'eyebrow' | 'half_round' | 'trapezoid'
  // Doors
  | 'front_door' | 'back_door' | 'patio_door' | 'sgd'
  // Annotations
  | 'note' | 'text' | 'arrow' | 'dimension_line' | 'room_label' | 'elevation_label'
  | 'number_marker' | 'obscure_marker'
  | 'clear_story' | 'second_floor'
  // Actions
  | 'join_mull'
  // Siding
  | 'siding';

interface ToolDef {
  id: SketchTool;
  icon: string;
  label: string;
  category: 'draw' | 'window' | 'door' | 'siding' | 'tools';
  tooltip: string;
  markerSymbol?: MarkerSymbol;
}

const TOOLS: ToolDef[] = [
  // ── Drawing & Navigation ──
  { id: 'select', icon: '👆', label: 'Select', category: 'draw', tooltip: 'Select and edit markers' },
  { id: 'pan', icon: '✥', label: 'Pan', category: 'draw', tooltip: 'Pan and zoom canvas' },
  { id: 'pen', icon: '✏️', label: 'Draw', category: 'draw', tooltip: 'Freehand draw outline' },
  { id: 'line', icon: '📏', label: 'Straight', category: 'draw', tooltip: 'Straight line segments' },
  { id: 'smart_outline', icon: '⬈', label: 'Smart Out', category: 'draw', tooltip: 'Smart outline mode' },
  { id: 'eraser', icon: '🧹', label: 'Erase', category: 'draw', tooltip: 'Erase strokes and segments' },
  { id: 'rect', icon: '⬜', label: 'Rect', category: 'draw', tooltip: 'Rectangle' },
  // ── Windows ──
  { id: 'window_x', icon: '✕', label: 'X', category: 'window', tooltip: 'Generic window (X)', markerSymbol: 'window_x' },
  { id: 'dh', icon: '⬍', label: 'DH', category: 'window', tooltip: 'Double Hung', markerSymbol: 'dh' },
  { id: 'sh', icon: '⬆', label: 'SH', category: 'window', tooltip: 'Single Hung', markerSymbol: 'sh' },
  { id: 'slider', icon: '↔', label: 'SL', category: 'window', tooltip: 'Slider', markerSymbol: 'slider' },
  { id: 'picture', icon: '🖼', label: 'PIC', category: 'window', tooltip: 'Picture', markerSymbol: 'picture' },
  { id: 'casement', icon: '⊞', label: 'CAS', category: 'window', tooltip: 'Casement', markerSymbol: 'casement' },
  { id: 'awning', icon: '☂', label: 'AWN', category: 'window', tooltip: 'Awning', markerSymbol: 'awning' },
  { id: 'oriel', icon: '⬔', label: 'OR', category: 'window', tooltip: 'Oriel', markerSymbol: 'oriel' },
  { id: 'bay', icon: '◺', label: 'BAY', category: 'window', tooltip: 'Bay window', markerSymbol: 'bay' },
  { id: 'bow', icon: '◠', label: 'BOW', category: 'window', tooltip: 'Bow window', markerSymbol: 'bow' },
  // ── Specialty Shapes (merged into window) ──
  { id: 'special_shape', icon: '⬡', label: 'Shape', category: 'window', tooltip: 'Custom special shape', markerSymbol: 'special_shape' },
  { id: 'circle_top', icon: '⌒', label: 'CT', category: 'window', tooltip: 'Circle Top', markerSymbol: 'circle_top' },
  { id: 'eyebrow', icon: '⌢', label: 'EY', category: 'window', tooltip: 'Eyebrow', markerSymbol: 'eyebrow' },
  { id: 'half_round', icon: '◗', label: 'HR', category: 'window', tooltip: 'Half Round', markerSymbol: 'half_round' },
  { id: 'trapezoid', icon: '⏢', label: 'TRAP', category: 'window', tooltip: 'Trapezoid', markerSymbol: 'trapezoid' },
  // ── Doors ──
  { id: 'front_door', icon: '🚪', label: 'FD', category: 'door', tooltip: 'Front door', markerSymbol: 'front_door' },
  { id: 'back_door', icon: '🚪', label: 'BD', category: 'door', tooltip: 'Back door', markerSymbol: 'back_door' },
  { id: 'patio_door', icon: '↔🚪', label: 'PAT', category: 'door', tooltip: 'Patio door', markerSymbol: 'patio_door' },
  { id: 'sgd', icon: '⬌', label: 'SGD', category: 'door', tooltip: 'Sliding glass door', markerSymbol: 'sgd' },
  // ── Siding ──
  { id: 'siding', icon: '🧱', label: 'SID', category: 'siding', tooltip: 'Siding Area', markerSymbol: 'siding' },
  // ── Tools (notes, safety markers, materials, actions) ──
  { id: 'note', icon: '📝', label: 'Note', category: 'tools', tooltip: 'Add note', markerSymbol: 'note' },
  { id: 'text', icon: 'T', label: 'Text', category: 'tools', tooltip: 'Add text word' },
  { id: 'arrow', icon: '➡️', label: 'Arrow', category: 'tools', tooltip: 'Arrow/label', markerSymbol: 'arrow' },
  // ── Actions ──
  { id: 'join_mull', icon: '🔗', label: 'Mull', category: 'tools', tooltip: 'Join/mull markers' },
];

export function SketchSymbolToolbar({
  activeTool, onToolChange, onUndo, onRedo, onClear,
  joinMode, selectedForJoinCount, compact = false,
}: {
  activeTool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  joinMode?: boolean;
  selectedForJoinCount?: number;
  compact?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('window');
  // Larger touch targets for field use — 44px minimum per WCAG
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const btnSize = compact ? 44 : 48;

  const categories = [
    { key: 'draw', label: '✏️ Draw', color: '#6366f1' },
    { key: 'window', label: '🪟 Windows', color: '#3b82f6' },
    { key: 'door', label: '🚪 Doors', color: '#7c3aed' },
    { key: 'siding', label: '🧱 Siding', color: '#f59e0b' },
    { key: 'tools', label: '⚙️ Tools', color: '#64748b' },
  ];

  const renderBtn = (t: ToolDef) => {
    const isActive = activeTool === t.id;
    const isJoin = t.id === 'join_mull' && joinMode;
    const SvgIcon = SHAPE_ICON_MAP[t.id];
    const hasSvg = !!SvgIcon;
    return (
      <button key={t.id} onClick={() => onToolChange(t.id)} title={t.tooltip}
        style={{
          width: btnSize, height: btnSize,
          border: `2px solid ${isActive || isJoin ? '#60a5fa' : '#475569'}`,
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          fontSize: hasSvg ? '1rem' : (t.category === 'window' ? '1.2rem' : '1.1rem'),
          fontWeight: isActive ? 800 : 700,
          background: isActive || isJoin ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#1e293b',
          color: isActive || isJoin ? '#ffffff' : '#e2e8f0',
          boxShadow: isActive ? '0 0 0 2px rgba(96,165,250,0.5), 0 2px 8px rgba(59,130,246,0.5)' : '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'all 0.12s ease', position: 'relative', flexShrink: 0,
        }}>
        {hasSvg ? (
          <span style={{ width: btnSize * 0.5, height: btnSize * 0.5, display: 'flex' }}><SvgIcon /></span>
        ) : (
          <span style={{ lineHeight: 1.1 }}>{t.icon}</span>
        )}
        <span style={{
          fontSize: '0.625rem', fontWeight: 800, letterSpacing: 0.3,
          lineHeight: 1, color: isActive || isJoin ? '#ffffff' : '#cbd5e1',
        }}>{t.label}</span>
        {t.id === 'join_mull' && (selectedForJoinCount ?? 0) > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {selectedForJoinCount}
          </span>
        )}
      </button>
    );
  };

  const activeTools = TOOLS.filter(t => t.category === activeCategory);

  return (
    <div style={{
      background: '#0f172a', borderRadius: 10,
      border: '1px solid #334155',
      padding: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
    }}>
      {/* Category tabs — single row, scrollable, clear separation */}
      <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
        {categories.map(c => (
          <button key={c.key} onClick={() => setActiveCategory(c.key)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 8,
              border: activeCategory === c.key ? 'none' : '1px solid #334155',
              cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
              background: activeCategory === c.key ? c.color : 'transparent',
              color: activeCategory === c.key ? '#ffffff' : '#94a3b8',
              transition: 'all 0.1s',
              boxShadow: activeCategory === c.key ? `0 2px 8px ${c.color}66` : 'none',
            }}>{c.label}</button>
        ))}
        {/* Undo/Redo/Clear — inline at the end for single-row layout */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button onClick={onUndo} title="Undo" style={actionBtnStyle}>↩</button>
          <button onClick={onRedo} title="Redo" style={actionBtnStyle}>↪</button>
          <button onClick={onClear} title="Clear canvas" style={actionBtnStyle}>🗑</button>
        </div>
      </div>

      {/* Active tools — scrollable row on mobile, grid on desktop */}
      <div className="sketch-toolbar-grid" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, ${btnSize}px)`,
        gap: '0.3rem',
        justifyContent: 'start',
      }}>
        {activeTools.map(renderBtn)}
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  width: 44, height: 44, border: '1px solid #475569', borderRadius: 8, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#94a3b8', fontWeight: 700,
  fontSize: '1rem', transition: 'all 0.12s', flexShrink: 0,
};

// ── Helper: Get marker symbol from tool ─────────────────────
export function getMarkerSymbolFromTool(tool: SketchTool): MarkerSymbol | null {
  const toolDef = TOOLS.find(t => t.id === tool);
  return toolDef?.markerSymbol || null;
}

// ── Export tool list for external use ────────────────────────
export { TOOLS as SKETCH_TOOLS };
export type { ToolDef };
