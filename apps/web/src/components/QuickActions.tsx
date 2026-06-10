// ═══════════════════════════════════════════════════════════
// Quick Actions — One-tap actions for the 20 most common
// field operations. Reduces multi-tap workflows to single taps.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  fields: Record<string, any>;
  color?: string;
  show?: boolean; // if false, hide this action
}

// ── Generate context-aware quick actions for an opening ──
function getQuickActions(opening: any, allOpenings: any[]): QuickAction[] {
  const actions: QuickAction[] = [];
  const prev = allOpenings.find(o => o.openingNumber === opening.openingNumber - 1);
  const room = (opening.roomLocation || '').toLowerCase();
  const isBath = room.match(/bath|shower|powder|lavatory/);

  // 1. Duplicate
  actions.push({ id: 'dup', icon: '📋', label: 'Duplicate', fields: {}, color: '#6366f1' });

  // 2. Same dims as previous
  if (prev && prev.width > 0) {
    actions.push({
      id: 'same-dims', icon: '📐', label: `${prev.width}×${prev.height}`,
      fields: { width: prev.width, height: prev.height },
      show: !opening.width || opening.width === 0,
    });
  }

  // 3. Same grids as previous
  if (prev && prev.gridStyle && prev.gridStyle !== opening.gridStyle) {
    actions.push({
      id: 'same-grid', icon: '▦', label: prev.gridStyle,
      fields: { gridStyle: prev.gridStyle, gridPattern: prev.gridPattern },
    });
  }

  // 4. Same colors as previous
  if (prev && (prev.interiorColor !== opening.interiorColor || prev.exteriorColor !== opening.exteriorColor)) {
    actions.push({
      id: 'same-color', icon: '🎨', label: `${prev.interiorColor}/${prev.exteriorColor}`,
      fields: { interiorColor: prev.interiorColor, exteriorColor: prev.exteriorColor },
    });
  }

  // 5. Mark tempered
  if (opening.temperedGlass !== 'full') {
    actions.push({
      id: 'tempered', icon: '🛡️', label: 'Tempered',
      fields: { temperedGlass: 'full' },
      color: isBath ? '#ef4444' : undefined,
    });
  } else {
    actions.push({ id: 'un-tempered', icon: '🛡️', label: '−Tempered', fields: { temperedGlass: 'none' } });
  }

  // 6. Mark obscure
  if (opening.obscureGlass !== 'full') {
    actions.push({
      id: 'obscure', icon: '🫧', label: 'Obscure',
      fields: { obscureGlass: 'full' },
      color: isBath ? '#ef4444' : undefined,
    });
  } else {
    actions.push({ id: 'un-obscure', icon: '🫧', label: '−Obscure', fields: { obscureGlass: 'none' } });
  }

  // 7. Bathroom package (tempered + obscure + half)
  if (isBath && (opening.temperedGlass !== 'full' || opening.obscureGlass !== 'full')) {
    actions.push({
      id: 'bath-pkg', icon: '🚿', label: 'Bath Pkg',
      fields: { temperedGlass: 'full', obscureGlass: 'full' },
      color: '#06b6d4',
    });
  }

  // 8. Convert to slider
  if (opening.productCategory !== 'slider') {
    actions.push({ id: 'to-slider', icon: '↔️', label: 'Slider', fields: { productCategory: 'slider' } });
  }

  // 9. Convert to picture
  if (opening.productCategory !== 'picture') {
    actions.push({ id: 'to-picture', icon: '🖼️', label: 'Picture', fields: { productCategory: 'picture', screenOption: 'None' } });
  }

  // 10. Convert to casement
  if (opening.productCategory !== 'casement') {
    actions.push({ id: 'to-casement', icon: '🪟', label: 'Casement', fields: { productCategory: 'casement' } });
  }

  // 11. Toggle argon
  actions.push({
    id: 'argon', icon: '💨', label: opening.argon ? '−Argon' : '+Argon',
    fields: { argon: !opening.argon },
  });

  // 12. Toggle foam enhanced
  actions.push({
    id: 'foam', icon: '🟢', label: opening.foamEnhanced ? '−Foam' : '+Foam',
    fields: { foamEnhanced: !opening.foamEnhanced },
  });

  // 13. No grids
  if (opening.gridStyle !== 'None') {
    actions.push({ id: 'no-grid', icon: '❌', label: 'No Grid', fields: { gridStyle: 'None', gridPattern: '' } });
  }

  // 14. Colonial grids
  if (opening.gridStyle !== 'Colonial') {
    actions.push({ id: 'colonial', icon: '▦', label: 'Colonial', fields: { gridStyle: 'Colonial' } });
  }

  // 15. Toggle nail fin
  actions.push({
    id: 'nailfin', icon: '🔩', label: opening.nailFin ? '−NailFin' : '+NailFin',
    fields: { nailFin: !opening.nailFin },
  });

  // 16. Toggle sill repair
  actions.push({
    id: 'sill', icon: '🔧', label: opening.sillRepair ? '−Sill' : '+Sill',
    fields: { sillRepair: !opening.sillRepair },
  });

  // 17. Mark needs verification
  actions.push({
    id: 'verify', icon: '⚠️', label: opening.needsVerification ? '✅ Verified' : '⚠ Verify',
    fields: { needsVerification: !opening.needsVerification },
    color: opening.needsVerification ? '#22c55e' : '#f59e0b',
  });

  // 18. Apply exterior defaults from job majority
  const majorityExterior = getMajority(allOpenings, 'exteriorColor');
  if (majorityExterior && opening.exteriorColor !== majorityExterior) {
    actions.push({
      id: 'ext-default', icon: '🏠', label: `Ext: ${majorityExterior}`,
      fields: { exteriorColor: majorityExterior },
    });
  }

  // 19. Insert removal (vs tearout)
  if (opening.removalType !== 'insert') {
    actions.push({ id: 'insert', icon: '📥', label: 'Insert', fields: { removalType: 'insert' } });
  } else {
    actions.push({ id: 'tearout', icon: '🔨', label: 'Tearout', fields: { removalType: 'full_tearout' } });
  }

  // 20. Toggle horizontal R&R
  actions.push({
    id: 'hrr', icon: '↕️', label: opening.horizontalRR ? '−H R&R' : '+H R&R',
    fields: { horizontalRR: !opening.horizontalRR },
  });

  return actions.filter(a => a.show !== false);
}

function getMajority(openings: any[], field: string): string | null {
  const counts: Record<string, number> = {};
  for (const o of openings) {
    const v = o[field];
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 && entries[0][1] >= 2 ? entries[0][0] : null;
}

// ── Inline quick-action bar (shown in table row on hover/tap) ──
export function RowQuickActions({
  opening, allOpenings, onUpdate, onDuplicate,
}: {
  opening: any;
  allOpenings: any[];
  onUpdate: (fields: Record<string, any>) => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const actions = getQuickActions(opening, allOpenings);
  // Show top 4 by default, full list on expand
  const visible = expanded ? actions : actions.slice(0, 4);

  return (
    <div style={{
      display: 'flex', gap: '2px', flexWrap: 'wrap', alignItems: 'center',
    }}>
      {visible.map(a => (
        <button key={a.id} onClick={(e) => {
          e.stopPropagation();
          if (a.id === 'dup') { onDuplicate(); return; }
          onUpdate(a.fields);
        }} title={a.label} style={{
          padding: '2px 5px', borderRadius: 4, border: '1px solid var(--border)',
          background: a.color ? `${a.color}12` : 'rgba(255,255,255,0.04)',
          color: a.color || 'var(--text-secondary)',
          fontSize: '0.5625rem', fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all 0.1s', lineHeight: 1.3,
        }}>
          {a.icon} {a.label}
        </button>
      ))}
      {actions.length > 4 && (
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{
          padding: '2px 5px', borderRadius: 4, border: '1px solid var(--border)',
          background: 'none', color: 'var(--text-muted)', fontSize: '0.5625rem',
          cursor: 'pointer', fontWeight: 600,
        }}>
          {expanded ? '← Less' : `+${actions.length - 4}`}
        </button>
      )}
    </div>
  );
}

// ── Mobile context actions (swipe-like row below each card) ──
export function MobileQuickActions({
  opening, allOpenings, onUpdate, onDuplicate,
}: {
  opening: any;
  allOpenings: any[];
  onUpdate: (fields: Record<string, any>) => void;
  onDuplicate: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const actions = getQuickActions(opening, allOpenings);
  const visible = showAll ? actions : actions.slice(0, 6);

  return (
    <div style={{
      display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '0.375rem',
      paddingTop: '0.375rem', borderTop: '1px solid var(--border)',
    }}>
      {visible.map(a => (
        <button key={a.id} onClick={() => {
          if (a.id === 'dup') { onDuplicate(); return; }
          onUpdate(a.fields);
        }} style={{
          padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
          background: a.color ? `${a.color}15` : 'rgba(255,255,255,0.04)',
          color: a.color || 'var(--text-secondary)',
          fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>
          {a.icon} {a.label}
        </button>
      ))}
      {actions.length > 6 && (
        <button onClick={() => setShowAll(!showAll)} style={{
          padding: '4px 8px', borderRadius: 6, border: '1px dashed var(--border)',
          background: 'none', color: 'var(--text-muted)', fontSize: '0.6875rem',
          cursor: 'pointer', fontWeight: 600,
        }}>
          {showAll ? '← Less' : `+${actions.length - 6} more`}
        </button>
      )}
    </div>
  );
}

// ── Bulk quick-actions for entire job ──
export function BulkQuickActions({
  openings, onBulkUpdate,
}: {
  openings: any[];
  onBulkUpdate: (fields: Record<string, any>) => void;
}) {
  if (openings.length < 2) return null;

  const bulk: { id: string; icon: string; label: string; fields: Record<string, any> }[] = [];
  const maj = {
    grid: getMajority(openings, 'gridStyle'),
    intColor: getMajority(openings, 'interiorColor'),
    extColor: getMajority(openings, 'exteriorColor'),
    glass: getMajority(openings, 'glassPackage'),
    series: getMajority(openings, 'seriesModel'),
    screen: getMajority(openings, 'screenOption'),
  };

  // Detect inconsistencies and offer bulk fixes
  const inconsistent = (field: string, majority: string | null) => {
    if (!majority) return 0;
    return openings.filter(o => o[field] && o[field] !== majority).length;
  };

  if (inconsistent('gridStyle', maj.grid) > 0) {
    bulk.push({ id: 'bulk-grid', icon: '▦', label: `All → ${maj.grid}`, fields: { gridStyle: maj.grid } });
  }
  if (inconsistent('interiorColor', maj.intColor) > 0) {
    bulk.push({ id: 'bulk-int', icon: '🎨', label: `Int → ${maj.intColor}`, fields: { interiorColor: maj.intColor } });
  }
  if (inconsistent('exteriorColor', maj.extColor) > 0) {
    bulk.push({ id: 'bulk-ext', icon: '🏠', label: `Ext → ${maj.extColor}`, fields: { exteriorColor: maj.extColor } });
  }

  // Always-available bulk actions
  bulk.push({ id: 'bulk-argon', icon: '💨', label: 'All +Argon', fields: { argon: true } });
  bulk.push({ id: 'bulk-foam', icon: '🟢', label: 'All +Foam', fields: { foamEnhanced: true } });

  if (bulk.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '0.75rem',
      padding: '6px 8px', borderRadius: 8,
      background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)',
    }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
        ⚡ Bulk
      </span>
      {bulk.map(a => (
        <button key={a.id} onClick={() => onBulkUpdate(a.fields)} style={{
          padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)',
          background: 'rgba(34,197,94,0.08)', color: '#22c55e',
          fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  );
}
