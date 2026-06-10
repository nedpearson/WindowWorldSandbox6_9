// ═══════════════════════════════════════════════════════════════
// Install Department Sketch Export
// Generates clean, readable order sheets from sketch data
// Output: structured text for PDF rendering or clipboard copy
// ═══════════════════════════════════════════════════════════════

import type { SketchMarkerData, MarkerGroupData } from '../utils/sketchSync';
import { NON_OPENING_MARKERS } from '../utils/sketchSync';

export interface InstallExportLine {
  number: number;
  elevation: string;
  room: string;
  type: string;
  width: number;
  height: number;
  ui: number;
  shape: string;
  exterior: string;
  install: string;
  trim: string;
  removal: string;
  screen: string;
  grid: string;
  tempered: string;
  obscure: string;
  notes: string;
  status: string;
}

export interface InstallExportData {
  customerName: string;
  address: string;
  date: string;
  repName: string;
  totalOpenings: number;
  elevations: { name: string; openingCount: number }[];
  lines: InstallExportLine[];
  groups: { type: string; members: number[]; note: string }[];
  warnings: string[];
}

/** Generate install export data from sketch markers and openings */
export function generateInstallExport(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
  customer?: { firstName?: string; lastName?: string; address?: string },
  repName?: string,
): InstallExportData {
  const openingMarkers = markers
    .filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol))
    .sort((a, b) => (a.markerNumber || 0) - (b.markerNumber || 0));

  const lines: InstallExportLine[] = openingMarkers.map(m => {
    const opening = openings.find(o => o.openingNumber === m.markerNumber);
    return {
      number: m.markerNumber || 0,
      elevation: m.elevation || '',
      room: m.roomLocation || opening?.roomLocation || '',
      type: formatWindowType(m.windowType || opening?.productCategory || ''),
      width: m.width || opening?.width || 0,
      height: m.height || opening?.height || 0,
      ui: m.unitedInches || opening?.unitedInches || 0,
      shape: m.shapeType || '',
      exterior: m.exteriorMaterial || opening?.exteriorType || '',
      install: m.installType || opening?.installType || '',
      trim: opening?.trimType || '',
      removal: m.removalType || opening?.removalType || '',
      screen: opening?.screenOption || '',
      grid: opening?.gridStyle || 'None',
      tempered: opening?.temperedGlass || 'none',
      obscure: opening?.obscureGlass || 'none',
      notes: [m.notes, opening?.customerNotes, opening?.installerNotes].filter(Boolean).join('; '),
      status: m.validationStatus || 'incomplete',
    };
  });

  const elevationNames = [...new Set(openingMarkers.map(m => m.elevation))];
  const elevations = elevationNames.map(name => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    openingCount: openingMarkers.filter(m => m.elevation === name).length,
  }));

  const groupExport = groups.map(g => ({
    type: g.groupType.replace(/_/g, ' ').toUpperCase(),
    members: g.memberMarkerIds
      .map(id => markers.find(m => m.id === id)?.markerNumber || 0)
      .filter(n => n > 0),
    note: g.groupNote || '',
  }));

  const warnings: string[] = [];
  for (const line of lines) {
    if (!line.width || !line.height) warnings.push(`#${line.number}: Missing dimensions`);
    if (line.exterior.toLowerCase() === 'brick' && !line.notes.includes('depth'))
      warnings.push(`#${line.number}: Brick — verify depth measured`);
    if (line.tempered === 'none' && line.room.toLowerCase().includes('bath'))
      warnings.push(`#${line.number}: Bathroom — verify tempered glass`);
  }

  return {
    customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '',
    address: customer?.address || '',
    date: new Date().toLocaleDateString(),
    repName: repName || '',
    totalOpenings: lines.length,
    elevations,
    lines,
    groups: groupExport,
    warnings,
  };
}

/** Format install export as clean readable text */
export function formatInstallExportText(data: InstallExportData): string {
  const lines: string[] = [];
  lines.push('════════════════════════════════════════════');
  lines.push('  WINDOW WORLD — INSTALL SKETCH EXPORT');
  lines.push('════════════════════════════════════════════');
  lines.push(`Customer: ${data.customerName}`);
  lines.push(`Address:  ${data.address}`);
  lines.push(`Date:     ${data.date}`);
  lines.push(`Rep:      ${data.repName}`);
  lines.push(`Total:    ${data.totalOpenings} openings`);
  lines.push('');

  // Elevations summary
  lines.push('── ELEVATIONS ──');
  for (const elev of data.elevations) {
    lines.push(`  ${elev.name}: ${elev.openingCount} opening(s)`);
  }
  lines.push('');

  // Opening lines
  lines.push('── OPENINGS ──');
  for (const l of data.lines) {
    const parts = [
      `#${l.number}`,
      `${l.width}×${l.height}`,
      l.type,
      l.shape ? `(${l.shape})` : '',
      l.exterior,
      l.install ? `Install:${l.install}` : '',
      l.trim ? `Trim:${l.trim}` : '',
      l.removal ? `Remove:${l.removal}` : '',
      l.screen !== 'No Screen' ? `Screen:${l.screen}` : '',
      l.grid !== 'None' ? `Grid:${l.grid}` : '',
      l.tempered !== 'none' ? '⚠️TEMPERED' : '',
      l.obscure !== 'none' ? '⚠️OBSCURE' : '',
    ].filter(Boolean).join(' | ');

    lines.push(`  ${parts}`);
    if (l.room) lines.push(`     Room: ${l.room} | Elevation: ${l.elevation}`);
    if (l.notes) lines.push(`     Notes: ${l.notes}`);
  }

  // Groups
  if (data.groups.length > 0) {
    lines.push('');
    lines.push('── MULL GROUPS ──');
    for (const g of data.groups) {
      lines.push(`  ${g.type}: Windows #${g.members.join(', #')} — ${g.note || 'No note'}`);
    }
  }

  // Warnings
  if (data.warnings.length > 0) {
    lines.push('');
    lines.push('── ⚠️ WARNINGS ──');
    for (const w of data.warnings) {
      lines.push(`  ⚠️ ${w}`);
    }
  }

  lines.push('');
  lines.push('════════════════════════════════════════════');
  return lines.join('\n');
}

function formatWindowType(type: string): string {
  const map: Record<string, string> = {
    double_hung: 'DH', single_hung: 'SH', slider: 'Slider', picture: 'Picture',
    casement: 'Casement', awning: 'Awning', patio_door: 'Patio Door', sgd: 'SGD',
    special_shape: 'Special Shape', oriel: 'Oriel', bay: 'Bay', bow: 'Bow',
    bso: 'BSO', door_sidelight: 'Door SL', other: 'Other',
  };
  return map[type] || type;
}
