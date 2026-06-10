// ══════════════════════════════════════════════════════════
// AI Field Guidance — contextual help for every form field
// ══════════════════════════════════════════════════════════

export interface FieldGuide {
  field: string;
  label: string;
  required: boolean;
  example: string;
  why: string;
  commonMistakes: string;
  affects: ('pricing' | 'ordering' | 'installation' | 'signatures')[];
  hint?: string;
}

export const FIELD_GUIDES: Record<string, FieldGuide> = {
  // ── Customer ────────────────────────────────────────────
  firstName: {
    field: 'firstName', label: 'First Name', required: true,
    example: 'James',
    why: 'Required on order form and contract for customer identification.',
    commonMistakes: 'Using a nickname instead of legal name on the contract.',
    affects: ['ordering', 'signatures'],
  },
  lastName: {
    field: 'lastName', label: 'Last Name', required: true,
    example: 'Robertson',
    why: 'Used for order form header, contract, and deposit check.',
    commonMistakes: 'Misspellings cause issues with check endorsement.',
    affects: ['ordering', 'signatures'],
  },
  phone: {
    field: 'phone', label: 'Primary Phone', required: true,
    example: '225-555-0101',
    why: 'Production and delivery calls go to this number.',
    commonMistakes: 'Using cell vs. home — confirm which is best for scheduling.',
    affects: ['ordering'],
  },
  address: {
    field: 'address', label: 'Street Address', required: true,
    example: '1420 Oak Valley Dr',
    why: 'Installer needs the exact install address. Mailing address may differ.',
    commonMistakes: 'PO box instead of physical address. Apartment number missing.',
    affects: ['ordering', 'installation'],
  },
  // ── Measurements ────────────────────────────────────────
  width: {
    field: 'width', label: 'Width (inches)', required: true,
    example: '35 3/8',
    why: 'Window width is used to calculate United Inches and select correct factory size.',
    commonMistakes: 'Forgetting fractions. Width over 12 feet is unrealistic. Measure the rough opening, not the frame.',
    affects: ['pricing', 'ordering'],
    hint: 'Always measure in fractions (1/8"). Enter as: 35 3/8',
  },
  height: {
    field: 'height', label: 'Height (inches)', required: true,
    example: '59 7/8',
    why: 'Height determines window size pricing tier.',
    commonMistakes: 'Inverting width and height. Patio doors should always be taller than wide.',
    affects: ['pricing', 'ordering'],
    hint: 'Doors: height must be greater than width (e.g. 36 × 80)',
  },
  legHeight: {
    field: 'legHeight', label: 'Leg Height', required: false,
    example: '4',
    why: 'For specialty shapes — the straight portion below an arch. Required for accurate shape pricing.',
    commonMistakes: 'Omitting leg height on eyebrow or circle-top windows causes incorrect orders.',
    affects: ['pricing', 'ordering'],
  },
  radius: {
    field: 'radius', label: 'Radius', required: false,
    example: '18',
    why: 'For circle tops and quarter arches. Factory needs exact radius to cut the frame.',
    commonMistakes: 'Missing radius on specialty shapes. Must be measured precisely.',
    affects: ['pricing', 'ordering'],
  },
  // ── Product ─────────────────────────────────────────────
  productCategory: {
    field: 'productCategory', label: 'Product Type', required: true,
    example: 'double_hung',
    why: 'Determines which product is ordered and how it is priced.',
    commonMistakes: 'Marking a slider as double hung — they operate differently.',
    affects: ['pricing', 'ordering'],
  },
  seriesModel: {
    field: 'seriesModel', label: 'Series / Model', required: true,
    example: '4000 Series',
    why: 'Window World has multiple product lines. The series determines features and price.',
    commonMistakes: 'Using 4000 pricing with 6000 glass package options — not always compatible.',
    affects: ['pricing', 'ordering'],
  },
  // ── Glass & Options ──────────────────────────────────────
  glassPackage: {
    field: 'glassPackage', label: 'Glass Package', required: true,
    example: 'SolarZone',
    why: 'Glass type affects energy efficiency ratings and pricing.',
    commonMistakes: 'Leaving glass package blank — default may not match what customer agreed to.',
    affects: ['pricing', 'ordering'],
  },
  temperedGlass: {
    field: 'temperedGlass', label: 'Tempered Glass', required: false,
    example: 'Full',
    why: 'Required by code near floors, doors, tubs, showers, and stairways. Failure to specify can cause code rejection.',
    commonMistakes: 'Not checking for tempered near bathrooms, entry doors, or basement egress.',
    affects: ['ordering', 'installation'],
    hint: '⚠️ Always verify: Near tub/shower? Within 18" of floor? Within 24" of door? If yes → Tempered required.',
  },
  obscureGlass: {
    field: 'obscureGlass', label: 'Obscure Glass', required: false,
    example: 'Full',
    why: 'Privacy glass for bathrooms and sidelights. Full or half (bottom half opaque).',
    commonMistakes: 'Leaving obscure off bathroom windows the customer asked about.',
    affects: ['ordering'],
  },
  gridStyle: {
    field: 'gridStyle', label: 'Grid Style', required: false,
    example: 'Colonial',
    why: 'Grid pattern affects appearance and price. Colonial is standard. Prairie has corner blocks.',
    commonMistakes: 'Customer says "grids" but doesn\'t specify style — confirm Colonial vs. Prairie vs. perimeter.',
    affects: ['pricing', 'ordering'],
  },
  // ── Installation ─────────────────────────────────────────
  removalType: {
    field: 'removalType', label: 'Removal / Install Type', required: true,
    example: 'full_tearout',
    why: 'Determines labor charge and installer preparation. Full tearout vs. insert vs. new construction.',
    commonMistakes: 'Writing "insert" when customer expects full frame removed. Verify with customer.',
    affects: ['pricing', 'installation'],
  },
  floorNumber: {
    field: 'floorNumber', label: 'Floor #', required: true,
    example: '2',
    why: 'Installer needs to know ladder or scaffolding requirements. 2nd floor jobs need different equipment.',
    commonMistakes: 'Leaving floor blank — installer may not bring correct equipment.',
    affects: ['installation'],
    hint: '2nd floor or higher? Installer needs ladder access confirmed. Is there safe ladder access on that side?',
  },

  sillRepair: {
    field: 'sillRepair', label: 'Sill Repair', required: false,
    example: 'true',
    why: 'Damaged or rotten sills must be noted before install. Installer needs to bring correct materials.',
    commonMistakes: 'Not noting sill damage — causes callbacks and extra charges after job.',
    affects: ['pricing', 'installation'],
    hint: 'Check: Is the sill rotten, sloped, cracked, or uneven? If yes, mark sill repair and add notes.',
  },
  installerNotes: {
    field: 'installerNotes', label: 'Installer Notes', required: false,
    example: 'Brick exterior. Verify return depth. 2nd floor needs 40-ft ladder.',
    why: 'Critical information installer may not discover until day of job. Better to over-note than under-note.',
    commonMistakes: 'Leaving notes blank on complex jobs — brick, narrow access, shutters, 2nd floor, unusual sills.',
    affects: ['installation'],
    hint: 'Think like the installer on job day: What will surprise them? Shutters? Storm windows? Brick? Access?',
  },
  // ── Pricing ──────────────────────────────────────────────
  totalPrice: {
    field: 'totalPrice', label: 'Total Price', required: true,
    example: '$520.00',
    why: 'Contract total is used on the signature page. Must be accurate.',
    commonMistakes: 'Using estimated price without pricing tables loaded. Confirm with pricing sheet.',
    affects: ['pricing', 'signatures'],
  },
  // ── Contract ─────────────────────────────────────────────
  poNumber: {
    field: 'poNumber', label: 'PO #', required: false,
    example: 'WW-2024-001',
    why: 'Used by the Window World office to track your order in their system.',
    commonMistakes: 'Usually assigned by office — leave blank if unknown.',
    affects: ['ordering'],
  },
  roomLocation: {
    field: 'roomLocation', label: 'Room / Location', required: true,
    example: 'Living Room - Front',
    why: 'Helps installer identify which window to install. Must match sketch label.',
    commonMistakes: 'Generic labels like "Window 1" instead of specific room + side.',
    affects: ['installation'],
  },
};

// ── Component ─────────────────────────────────────────────
import { useState } from 'react';

const AFFECT_COLORS = {
  pricing: { color: '#22c55e', label: 'Pricing' },
  ordering: { color: '#3b82f6', label: 'Ordering' },
  installation: { color: '#f59e0b', label: 'Install' },
  signatures: { color: '#8b5cf6', label: 'Signatures' },
};

export function AIFieldGuide({ fieldKey, compact = false }: { fieldKey: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(!compact);
  const guide = FIELD_GUIDES[fieldKey];
  if (!guide) return null;

  return (
    <div style={{ padding: compact ? '0.375rem 0.5rem' : '0.625rem 0.75rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 6, marginTop: '0.25rem', fontSize: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: compact ? 'pointer' : 'default' }} onClick={() => compact && setExpanded(!expanded)}>
        <span style={{ fontSize: '0.875rem' }}>💡</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {guide.label}
          {guide.required && <span style={{ marginLeft: 4, fontSize: '0.5625rem', padding: '1px 4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 3, fontWeight: 700 }}>REQUIRED</span>}
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {guide.affects.map(a => (
            <span key={a} style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3, background: `${AFFECT_COLORS[a].color}20`, color: AFFECT_COLORS[a].color, fontWeight: 700 }}>
              {AFFECT_COLORS[a].label}
            </span>
          ))}
        </div>
        {compact && <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>{expanded ? '▲' : '▼'}</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {guide.hint && (
            <div style={{ padding: '0.25rem 0.5rem', background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', borderRadius: '0 4px 4px 0', color: '#f59e0b', fontWeight: 600, fontSize: '0.6875rem' }}>
              {guide.hint}
            </div>
          )}
          <div style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Why: </span>{guide.why}</div>
          <div style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Example: </span><code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>{guide.example}</code></div>
          <div style={{ color: '#f59e0b' }}><span style={{ fontWeight: 600 }}>⚠ Common mistake: </span>{guide.commonMistakes}</div>
        </div>
      )}
    </div>
  );
}

// ── Guided Form Group ─────────────────────────────────────
export function GuidedField({ fieldKey, label, children, showGuide = true }: {
  fieldKey: string;
  label?: string;
  children: React.ReactNode;
  showGuide?: boolean;
}) {
  const guide = FIELD_GUIDES[fieldKey];
  return (
    <div className="form-group">
      <label className="form-label">
        {label || guide?.label || fieldKey}
        {guide?.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {showGuide && guide && <AIFieldGuide fieldKey={fieldKey} compact={true} />}
    </div>
  );
}
