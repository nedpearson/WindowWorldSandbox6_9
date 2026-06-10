// ═══════════════════════════════════════════════════════════════
// Sketch Shape SVG Icons — Architecturally accurate mini-icons
// Used in toolbar buttons and marker labels
// ═══════════════════════════════════════════════════════════════

const S = 22; // viewBox size
const sw = 1.5; // stroke width

function I({ children, ...p }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>;
}

// ── Window shapes ──────────────────────────────────────────

/** Double Hung — two sashes, horizontal rail */
export function IconDH(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={2} width={16} height={18} rx={1}/><line x1={3} y1={11} x2={19} y2={11}/><line x1={11} y1={6} x2={11} y2={7}/><line x1={11} y1={15} x2={11} y2={16}/></I>;
}

/** Single Hung — bottom sash operable, top fixed */
export function IconSH(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={2} width={16} height={18} rx={1}/><line x1={3} y1={11} x2={19} y2={11}/><line x1={11} y1={15} x2={11} y2={16}/><path d="M7 6 h8" strokeDasharray="2 2"/></I>;
}

/** Slider — two panels, vertical divider */
export function IconSlider(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={2} y={4} width={18} height={14} rx={1}/><line x1={11} y1={4} x2={11} y2={18}/><path d="M7 11 L5 9 M7 11 L5 13" strokeWidth={1.2}/><path d="M15 11 L17 9 M15 11 L17 13" strokeWidth={1.2}/></I>;
}

/** Picture — fixed single pane, no divider */
export function IconPicture(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={3} width={16} height={16} rx={1}/><rect x={5} y={5} width={12} height={12} rx={0.5} strokeDasharray="2 1.5"/></I>;
}

/** Casement — side-hinged, crank handle */
export function IconCasement(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={2} width={16} height={18} rx={1}/><line x1={3} y1={11} x2={19} y2={2}/><line x1={3} y1={11} x2={19} y2={20}/><circle cx={6} cy={11} r={1.5} fill="currentColor"/></I>;
}

/** Awning — top-hinged */
export function IconAwning(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={3} width={16} height={16} rx={1}/><line x1={3} y1={3} x2={11} y2={19}/><line x1={19} y1={3} x2={11} y2={19}/><circle cx={11} cy={17} r={1.2} fill="currentColor"/></I>;
}

/** Bay — three angled panels */
export function IconBay(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M2 18 L2 6 L6 3 L16 3 L20 6 L20 18"/><line x1={6} y1={3} x2={6} y2={18}/><line x1={16} y1={3} x2={16} y2={18}/></I>;
}

/** Bow — curved multi-panel */
export function IconBow(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M2 18 L2 8 Q11 0 20 8 L20 18"/><line x1={7.5} y1={4.5} x2={7.5} y2={18}/><line x1={11} y1={3} x2={11} y2={18}/><line x1={14.5} y1={4.5} x2={14.5} y2={18}/></I>;
}

/** Oriel — unequal top/bottom sash */
export function IconOriel(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={2} width={16} height={18} rx={1}/><line x1={3} y1={8} x2={19} y2={8}/><line x1={11} y1={13} x2={11} y2={14}/></I>;
}

// ── Specialty shapes ──────────────────────────────────────

/** Circle Top — rectangle with semicircle top */
export function IconCircleTop(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M4 20 L4 10 A7 7 0 0 1 18 10 L18 20 Z"/><line x1={4} y1={10} x2={18} y2={10}/></I>;
}

/** Eyebrow — rectangle with shallow arch top */
export function IconEyebrow(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M4 20 L4 8 Q11 2 18 8 L18 20 Z"/><line x1={4} y1={10} x2={18} y2={10}/></I>;
}

/** Half Round — just a semicircle */
export function IconHalfRound(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M3 16 A8 8 0 0 1 19 16 Z"/><line x1={11} y1={8} x2={11} y2={16}/></I>;
}

/** Trapezoid */
export function IconTrapezoid(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M6 4 L16 4 L20 18 L2 18 Z"/></I>;
}

/** Generic special shape — hexagon */
export function IconSpecialShape(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><path d="M11 2 L19 6 L19 16 L11 20 L3 16 L3 6 Z"/></I>;
}

// ── Doors ─────────────────────────────────────────────────

/** Front/Back Door */
export function IconDoor(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={5} y={2} width={12} height={18} rx={1}/><circle cx={14} cy={12} r={1.2} fill="currentColor"/></I>;
}

/** Patio / SGD — sliding glass door */
export function IconSGD(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={2} y={2} width={18} height={18} rx={1}/><line x1={11} y1={2} x2={11} y2={20}/><path d="M7 11 L5 9 M7 11 L5 13" strokeWidth={1.2}/></I>;
}

/** Generic X marker */
export function IconWindowX(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={3} y={3} width={16} height={16} rx={1}/><line x1={5} y1={5} x2={17} y2={17}/><line x1={17} y1={5} x2={5} y2={17}/></I>;
}

/** Siding / Exterior Area */
export function IconSiding(p: React.SVGProps<SVGSVGElement>) {
  return <I {...p}><rect x={2} y={2} width={18} height={18} rx={1}/><line x1={2} y1={6} x2={20} y2={6}/><line x1={2} y1={11} x2={20} y2={11}/><line x1={2} y1={16} x2={20} y2={16}/></I>;
}

// ── Icon lookup map ────────────────────────────────────────
export const SHAPE_ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  window_x: IconWindowX, dh: IconDH, sh: IconSH, slider: IconSlider,
  picture: IconPicture, casement: IconCasement, awning: IconAwning,
  bay: IconBay, bow: IconBow, oriel: IconOriel,
  special_shape: IconSpecialShape, circle_top: IconCircleTop,
  eyebrow: IconEyebrow, half_round: IconHalfRound, trapezoid: IconTrapezoid,
  front_door: IconDoor, back_door: IconDoor, patio_door: IconSGD, sgd: IconSGD,
  siding: IconSiding,
};
