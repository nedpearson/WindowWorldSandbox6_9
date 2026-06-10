// ═══════════════════════════════════════════════════════════
// Field Memory — Visual guide through the house
// Shows room-by-room progress, opening status badges,
// measurement heatmaps, and unresolved warnings.
// Helps reps never forget where they measured.
// ═══════════════════════════════════════════════════════════

// ── Opening Status Analysis ──────────────────────────────
export interface OpeningStatus {
  measured: boolean;
  hasPhoto: boolean;
  hasDims: boolean;
  hasRoom: boolean;
  hasProduct: boolean;
  hasPrice: boolean;
  hasWarning: boolean;
  isHighRisk: boolean;
  needsVerification: boolean;
  completionPct: number;
  missing: string[];
  riskReasons: string[];
}

export function analyzeOpening(opening: any): OpeningStatus {
  const missing: string[] = [];
  const riskReasons: string[] = [];

  const hasDims = opening.width > 0 && opening.height > 0;
  const hasRoom = !!opening.roomLocation;
  const hasProduct = !!opening.productCategory;
  const hasPrice = opening.totalPrice > 0;
  const hasPhoto = !!(opening.photos?.length > 0 || opening.photoCount > 0);
  const needsVerification = !!opening.needsVerification;

  if (!hasDims) missing.push('Dimensions');
  if (!hasRoom) missing.push('Room');
  if (!hasProduct) missing.push('Product');
  if (!opening.elevation) missing.push('Elevation');
  if (!opening.interiorColor) missing.push('Interior Color');
  if (!opening.exteriorColor) missing.push('Exterior Color');

  // High risk detection
  const room = (opening.roomLocation || '').toLowerCase();
  const isBath = room.match(/bath|shower|powder|lavatory/);
  if (isBath && opening.temperedGlass !== 'full') {
    riskReasons.push('Bathroom — needs tempered');
  }
  if (isBath && opening.obscureGlass !== 'full') {
    riskReasons.push('Bathroom — needs obscure');
  }
  if (opening.width > 72 || opening.height > 72) {
    riskReasons.push('Oversized — verify measurements');
  }
  if (opening.floorNumber >= 2 && !opening.installNotes) {
    riskReasons.push('Upper floor — no install notes');
  }
  if (opening.sillRepair) {
    riskReasons.push('Sill repair required');
  }

  const totalChecks = 6;
  const filled = [hasDims, hasRoom, hasProduct, !!opening.elevation, !!opening.interiorColor, hasPrice].filter(Boolean).length;

  return {
    measured: hasDims,
    hasPhoto,
    hasDims,
    hasRoom,
    hasProduct,
    hasPrice,
    hasWarning: riskReasons.length > 0 || needsVerification,
    isHighRisk: riskReasons.length > 0,
    needsVerification,
    completionPct: Math.round((filled / totalChecks) * 100),
    missing,
    riskReasons,
  };
}

// ── Room Progress Summary ────────────────────────────────
export interface RoomProgress {
  name: string;
  openings: any[];
  totalCount: number;
  measuredCount: number;
  completeCount: number;
  warningCount: number;
  photoCount: number;
  overallPct: number;
}

export function getRoomProgress(openings: any[]): RoomProgress[] {
  const roomMap = new Map<string, any[]>();
  for (const o of openings) {
    const room = o.roomLocation || 'Unassigned';
    if (!roomMap.has(room)) roomMap.set(room, []);
    roomMap.get(room)!.push(o);
  }

  return Array.from(roomMap.entries()).map(([name, ops]) => {
    const statuses = ops.map(analyzeOpening);
    return {
      name,
      openings: ops,
      totalCount: ops.length,
      measuredCount: statuses.filter(s => s.measured).length,
      completeCount: statuses.filter(s => s.completionPct >= 80).length,
      warningCount: statuses.filter(s => s.hasWarning).length,
      photoCount: statuses.filter(s => s.hasPhoto).length,
      overallPct: Math.round(statuses.reduce((s, st) => s + st.completionPct, 0) / statuses.length),
    };
  }).sort((a, b) => a.overallPct - b.overallPct); // Least complete first
}

// ── Status Badge Colors ──────────────────────────────────
export function getStatusColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export function getStatusBg(pct: number): string {
  if (pct >= 80) return 'rgba(34,197,94,0.1)';
  if (pct >= 50) return 'rgba(245,158,11,0.08)';
  return 'rgba(239,68,68,0.08)';
}

export function getStatusIcon(status: OpeningStatus): string {
  if (status.isHighRisk) return '🔴';
  if (status.needsVerification) return '⚠️';
  if (status.completionPct >= 80) return '✅';
  if (status.measured) return '📐';
  return '⬜';
}

// ── Elevation Summary ────────────────────────────────────
export interface ElevationProgress {
  name: string;
  count: number;
  measuredCount: number;
  pct: number;
}

export function getElevationProgress(openings: any[]): ElevationProgress[] {
  const elevMap = new Map<string, any[]>();
  for (const o of openings) {
    const elev = o.elevation || 'unset';
    if (!elevMap.has(elev)) elevMap.set(elev, []);
    elevMap.get(elev)!.push(o);
  }
  return Array.from(elevMap.entries()).map(([name, ops]) => ({
    name,
    count: ops.length,
    measuredCount: ops.filter(o => o.width > 0 && o.height > 0).length,
    pct: Math.round((ops.filter(o => o.width > 0 && o.height > 0).length / ops.length) * 100),
  }));
}
