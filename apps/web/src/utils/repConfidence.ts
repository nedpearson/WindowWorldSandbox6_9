// ═══════════════════════════════════════════════════════════
// Rep Confidence — Positive reinforcement + contextual
// explanations that make newer reps feel supported.
// Shows WHY rules exist, reassures correct work,
// highlights validated items, and reduces uncertainty.
// ═══════════════════════════════════════════════════════════

export interface ConfidenceItem {
  id: string;
  type: 'validated' | 'explained' | 'tip' | 'reassurance';
  icon: string;
  message: string;
  detail?: string;       // expanded explanation
  whyItMatters?: string; // business reason
}

// ── Analyze a single opening for confidence feedback ─────
export function getConfidenceFeedback(opening: any, allOpenings: any[]): ConfidenceItem[] {
  const items: ConfidenceItem[] = [];
  const room = (opening.roomLocation || '').toLowerCase();
  const isBath = /bath|shower|powder|lavatory/i.test(room);

  // ── VALIDATED (green checks — "you did this right") ────
  if (opening.width > 0 && opening.height > 0) {
    const ui = opening.width + opening.height;
    if (ui >= 50 && ui <= 160) {
      items.push({
        id: 'dim-good', type: 'validated', icon: '✅',
        message: `Dimensions look correct (UI: ${ui}")`,
        detail: `${opening.width}" × ${opening.height}" is within normal residential window range.`,
      });
    }
  }

  if (isBath && opening.temperedGlass === 'full') {
    items.push({
      id: 'bath-tempered', type: 'validated', icon: '✅',
      message: 'Bathroom tempered glass — correct',
      detail: 'Building code requires tempered glass in wet areas. You got this one right.',
      whyItMatters: 'Without tempered glass, this window would fail inspection and require a costly return trip.',
    });
  }

  if (isBath && opening.obscureGlass === 'full') {
    items.push({
      id: 'bath-obscure', type: 'validated', icon: '✅',
      message: 'Bathroom obscure glass — correct',
      detail: 'Privacy glass is expected in bathrooms. Good call.',
    });
  }

  if (opening.productCategory === 'patio_door' && opening.temperedGlass === 'full') {
    items.push({
      id: 'door-tempered', type: 'validated', icon: '✅',
      message: 'Patio door tempered glass — correct',
      whyItMatters: 'All glass doors must have tempered glass per safety code.',
    });
  }

  if (opening.interiorColor && opening.exteriorColor) {
    items.push({
      id: 'colors-set', type: 'validated', icon: '✅',
      message: 'Colors specified',
    });
  }

  if (opening.removalType && opening.removalType !== 'none') {
    items.push({
      id: 'removal-set', type: 'validated', icon: '✅',
      message: `Removal type: ${opening.removalType.replace('_', ' ')}`,
    });
  }

  // ── EXPLAINED (amber — WHY this warning exists) ────────
  if (isBath && opening.temperedGlass !== 'full') {
    items.push({
      id: 'why-tempered', type: 'explained', icon: '🛡️',
      message: 'Why does this need tempered glass?',
      detail: 'Building code requires tempered glass within 60" of a water source (tub, shower). This prevents dangerous large-shard breakage near wet, slippery surfaces.',
      whyItMatters: 'If the homeowner or inspector catches this later, Window World pays for the replacement trip and glass — typically $200-400.',
    });
  }

  if (opening.width > 0 && opening.height > 0 && (opening.width * opening.height) / 144 > 9 && opening.temperedGlass !== 'full') {
    items.push({
      id: 'why-large-tempered', type: 'explained', icon: '📏',
      message: 'Why might this need tempered?',
      detail: `This pane is ${((opening.width * opening.height) / 144).toFixed(1)} sq ft. If the bottom edge is within 18" of the floor, building code requires tempered glass for panes over 9 sq ft.`,
      whyItMatters: 'Measure the distance from the floor to the bottom of the window frame. If it\'s under 18", add tempered.',
    });
  }

  if (opening.productCategory === 'slider' && opening.height > opening.width) {
    items.push({
      id: 'why-slider-tall', type: 'explained', icon: '↔️',
      message: 'Slider dimensions look unusual',
      detail: 'Sliders are typically wider than they are tall. Your measurement shows this slider as taller than wide. Double-check that you haven\'t swapped width and height.',
      whyItMatters: 'If ordered with swapped dimensions, the window won\'t fit the opening — a costly remake.',
    });
  }

  if (opening.productCategory === 'double_hung' && opening.width > opening.height && opening.width > 30) {
    items.push({
      id: 'why-dh-wide', type: 'explained', icon: '↕️',
      message: 'Double hung dimensions look unusual',
      detail: 'Double hungs are almost always taller than they are wide. Your width is larger than the height. Verify you haven\'t swapped the measurements.',
      whyItMatters: 'Ordering with reversed dimensions means the sashes won\'t operate correctly in the frame.',
    });
  }

  // ── TIPS (blue — expert knowledge) ─────────────────────
  if (opening.productCategory === 'casement' && !opening.installNotes?.toLowerCase().includes('swing')) {
    items.push({
      id: 'tip-casement', type: 'tip', icon: '💡',
      message: 'Note which direction the casement opens',
      detail: 'Document "opens left" or "opens right" in the install notes. Looking from inside the house, which side has the hinge?',
      whyItMatters: 'Installers need this to pre-position windows on the truck. Wrong direction = return trip.',
    });
  }

  if (opening.productCategory === 'patio_door' && !opening.installNotes?.toLowerCase().match(/hand|slide|active/)) {
    items.push({
      id: 'tip-patio-hand', type: 'tip', icon: '💡',
      message: 'Document patio door handing',
      detail: 'Specify which panel slides (left or right) when viewed from the exterior. This is critical for ordering the correct configuration.',
    });
  }

  if ((opening.floorNumber || 1) >= 2 && !opening.installNotes?.toLowerCase().match(/ladder|scaffold/)) {
    items.push({
      id: 'tip-upper', type: 'tip', icon: '💡',
      message: 'Note access requirements for floor ' + opening.floorNumber,
      detail: 'Document if a ladder, scaffold, or boom lift is needed. This affects crew planning and installation pricing.',
    });
  }

  if (opening.sillRepair && !opening.installNotes?.toLowerCase().match(/rot|damage/)) {
    items.push({
      id: 'tip-sill', type: 'tip', icon: '💡',
      message: 'Document the extent of sill damage',
      detail: 'Note whether the rot is surface-level or structural. Take a photo if possible. This helps the installer bring the right repair materials.',
    });
  }

  // ── REASSURANCE (green — "you're doing great") ─────────
  const measuredCount = allOpenings.filter(o => o.width > 0 && o.height > 0).length;
  const totalCount = allOpenings.length;

  if (measuredCount === totalCount && totalCount > 0) {
    items.push({
      id: 'all-measured', type: 'reassurance', icon: '🎯',
      message: 'All openings measured — great job!',
      detail: `You've measured all ${totalCount} openings. The measurements are ready for pricing.`,
    });
  } else if (measuredCount > 0 && measuredCount >= totalCount * 0.5) {
    items.push({
      id: 'half-measured', type: 'reassurance', icon: '📐',
      message: `${measuredCount} of ${totalCount} measured — making good progress`,
    });
  }

  // Consistent configuration across job
  if (allOpenings.length >= 3) {
    const colors = new Set(allOpenings.map(o => o.interiorColor).filter(Boolean));
    const grids = new Set(allOpenings.map(o => o.gridStyle).filter(Boolean));
    if (colors.size === 1 && grids.size <= 1) {
      items.push({
        id: 'consistent-config', type: 'reassurance', icon: '🎨',
        message: 'Consistent colors and grids across the job',
        detail: 'All openings share the same interior color and grid style. This is exactly what a clean order looks like.',
      });
    }
  }

  return items;
}
