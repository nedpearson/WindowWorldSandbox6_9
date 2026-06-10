// ═══════════════════════════════════════════════════════════
// Forget Nothing — Silent background checklist
// Monitors every opening for commonly forgotten items
// and presents a pre-submission gate before proposal.
// ═══════════════════════════════════════════════════════════

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'na';

export interface CheckItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  openingNumbers: number[];
  fix?: { label: string; field: string; value: any };
}

export interface ForgetNothingReport {
  items: CheckItem[];
  passCount: number;
  failCount: number;
  warnCount: number;
  score: number; // 0-100
  readyToPropose: boolean;
  readyToSubmit: boolean;
}

// ── Run Full Checklist ───────────────────────────────────
export function runForgetNothing(openings: any[], appointment?: any): ForgetNothingReport {
  const items: CheckItem[] = [];

  items.push(...checkTempered(openings));
  items.push(...checkObscure(openings));
  items.push(...checkDepth(openings));
  items.push(...checkPhotos(openings));
  items.push(...checkMullReinforcement(openings));
  items.push(...checkSDLSizing(openings));
  items.push(...checkSpecialtyNotes(openings));
  items.push(...checkBathroomRules(openings));
  items.push(...checkScreenLimitations(openings));
  items.push(...checkSpecialShapeTrim(openings));
  items.push(...checkMeasurementCompleteness(openings));
  items.push(...checkProductSelection(openings));
  items.push(...checkColorSelection(openings));
  items.push(...checkRemovalType(openings));
  items.push(...checkInstallNotes(openings));

  const passCount = items.filter(i => i.status === 'pass').length;
  const failCount = items.filter(i => i.status === 'fail').length;
  const warnCount = items.filter(i => i.status === 'warn').length;
  const applicable = items.filter(i => i.status !== 'na').length;
  const score = applicable > 0 ? Math.round((passCount / applicable) * 100) : 100;

  return {
    items,
    passCount,
    failCount,
    warnCount,
    score,
    readyToPropose: failCount === 0,
    readyToSubmit: failCount === 0 && warnCount === 0,
  };
}

// ── 1. Tempered Glass ────────────────────────────────────
function checkTempered(openings: any[]): CheckItem[] {
  const items: CheckItem[] = [];

  // Bathrooms
  const bathrooms = openings.filter(o => isBathroom(o.roomLocation));
  if (bathrooms.length > 0) {
    const missing = bathrooms.filter(o => o.temperedGlass !== 'full');
    items.push({
      id: 'tempered-bathroom', category: 'Tempered', label: 'Bathroom tempered glass',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${bathrooms.length} bathroom openings have tempered glass`
        : `${missing.length} bathroom opening(s) missing tempered: ${missing.map(o => `#${o.openingNumber}`).join(', ')}`,
      openingNumbers: missing.map(o => o.openingNumber),
      fix: missing.length > 0 ? { label: 'Add tempered to all', field: 'temperedGlass', value: 'full' } : undefined,
    });
  }

  // Patio doors
  const patioDoors = openings.filter(o => o.productCategory === 'patio_door');
  if (patioDoors.length > 0) {
    const missing = patioDoors.filter(o => o.temperedGlass !== 'full');
    items.push({
      id: 'tempered-patio', category: 'Tempered', label: 'Patio door tempered glass',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${patioDoors.length} patio doors have tempered glass`
        : `${missing.length} patio door(s) missing tempered`,
      openingNumbers: missing.map(o => o.openingNumber),
      fix: missing.length > 0 ? { label: 'Add tempered', field: 'temperedGlass', value: 'full' } : undefined,
    });
  }

  // Large panes (> 9 sq ft)
  const large = openings.filter(o => o.width > 0 && o.height > 0 && (o.width * o.height) / 144 > 9);
  if (large.length > 0) {
    const noTemp = large.filter(o => o.temperedGlass !== 'full');
    items.push({
      id: 'tempered-large', category: 'Tempered', label: 'Large pane tempered check',
      status: noTemp.length === 0 ? 'pass' : 'warn',
      detail: noTemp.length === 0
        ? `All large panes have tempered glass`
        : `${noTemp.length} large pane(s) (>9 sq ft) without tempered — verify floor-to-bottom height`,
      openingNumbers: noTemp.map(o => o.openingNumber),
    });
  }

  return items;
}

// ── 2. Obscure Glass ─────────────────────────────────────
function checkObscure(openings: any[]): CheckItem[] {
  const bathrooms = openings.filter(o => isBathroom(o.roomLocation));
  if (bathrooms.length === 0) return [];

  const missing = bathrooms.filter(o => o.obscureGlass !== 'full');
  return [{
    id: 'obscure-bathroom', category: 'Obscure', label: 'Bathroom obscure glass',
    status: missing.length === 0 ? 'pass' : 'warn',
    detail: missing.length === 0
      ? `All bathroom openings have obscure glass`
      : `${missing.length} bathroom opening(s) without obscure glass — homeowner preference?`,
    openingNumbers: missing.map(o => o.openingNumber),
    fix: missing.length > 0 ? { label: 'Add obscure', field: 'obscureGlass', value: 'full' } : undefined,
  }];
}

// ── 3. Depth Measurements ────────────────────────────────
function checkDepth(openings: any[]): CheckItem[] {
  const items: CheckItem[] = [];

  // Brick openings need return depth
  const brick = openings.filter(o => (o.exteriorType || '').toLowerCase().includes('brick'));
  if (brick.length > 0) {
    const noDepth = brick.filter(o => !o.installNotes?.toLowerCase().includes('depth'));
    items.push({
      id: 'depth-brick', category: 'Depth', label: 'Brick return depth',
      status: noDepth.length === 0 ? 'pass' : 'fail',
      detail: noDepth.length === 0
        ? `All brick openings have depth documented`
        : `${noDepth.length} brick opening(s) missing return depth — required for proper installation`,
      openingNumbers: noDepth.map(o => o.openingNumber),
    });
  }

  // Insert installations need jamb depth
  const inserts = openings.filter(o => o.removalType === 'insert');
  if (inserts.length > 0) {
    const noJamb = inserts.filter(o => !o.installNotes?.toLowerCase().match(/jamb|depth|frame/));
    items.push({
      id: 'depth-insert', category: 'Depth', label: 'Insert jamb depth',
      status: noJamb.length === 0 ? 'pass' : 'warn',
      detail: noJamb.length === 0
        ? `All insert openings have jamb depth noted`
        : `${noJamb.length} insert opening(s) without jamb depth — measure existing frame depth`,
      openingNumbers: noJamb.map(o => o.openingNumber),
    });
  }

  return items;
}

// ── 4. Photos ────────────────────────────────────────────
function checkPhotos(openings: any[]): CheckItem[] {
  const noPhoto = openings.filter(o => !(o.photos?.length > 0 || o.photoCount > 0));
  if (openings.length === 0) return [];

  return [{
    id: 'photos-coverage', category: 'Photos', label: 'Opening photos',
    status: noPhoto.length === 0 ? 'pass' : noPhoto.length <= openings.length * 0.5 ? 'warn' : 'fail',
    detail: noPhoto.length === 0
      ? `All ${openings.length} openings have photos`
      : `${noPhoto.length} of ${openings.length} openings missing photos`,
    openingNumbers: noPhoto.map(o => o.openingNumber),
  }];
}

// ── 5. Mull Reinforcement ────────────────────────────────
function checkMullReinforcement(openings: any[]): CheckItem[] {
  const mulled = openings.filter(o => o.mullPost || o.mullConfig);
  if (mulled.length === 0) return [];

  const noReinf = mulled.filter(o => {
    const w = o.width || 0;
    const h = o.height || 0;
    // Large mulled units typically need reinforcement
    return (w > 60 || h > 72) && !o.installNotes?.toLowerCase().match(/reinforce|mull.*bar|struct/);
  });

  return [{
    id: 'mull-reinforce', category: 'Mull', label: 'Mull reinforcement check',
    status: noReinf.length === 0 ? 'pass' : 'warn',
    detail: noReinf.length === 0
      ? `All mulled openings have reinforcement noted`
      : `${noReinf.length} large mulled unit(s) without reinforcement notes — verify structural requirements`,
    openingNumbers: noReinf.map(o => o.openingNumber),
  }];
}

// ── 6. SDL Sizing ────────────────────────────────────────
function checkSDLSizing(openings: any[]): CheckItem[] {
  const sdl = openings.filter(o =>
    o.gridStyle === 'SDL' || o.isSDL || (o.installNotes || '').toLowerCase().includes('sdl')
  );
  if (sdl.length === 0) return [];

  const noSize = sdl.filter(o => !o.sdlSize && !o.installNotes?.toLowerCase().match(/7\/8|1-1\/4|sdl.*size/));
  return [{
    id: 'sdl-sizing', category: 'SDL', label: 'SDL grid size specified',
    status: noSize.length === 0 ? 'pass' : 'fail',
    detail: noSize.length === 0
      ? `All SDL openings have grid size specified (7/8" or 1-1/4")`
      : `${noSize.length} SDL opening(s) missing grid size — must specify 7/8" or 1-1/4" per BTR Page 61`,
    openingNumbers: noSize.map(o => o.openingNumber),
  }];
}

// ── 7. Specialty Notes ───────────────────────────────────
function checkSpecialtyNotes(openings: any[]): CheckItem[] {
  const specialty = openings.filter(o =>
    ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(o.productCategory)
  );
  if (specialty.length === 0) return [];

  const noNotes = specialty.filter(o => !o.specialtyNotes && !o.installNotes);
  return [{
    id: 'specialty-notes', category: 'Specialty', label: 'Specialty shape notes',
    status: noNotes.length === 0 ? 'pass' : 'warn',
    detail: noNotes.length === 0
      ? `All specialty shapes have notes`
      : `${noNotes.length} specialty shape(s) without notes — document radius, leg height, or custom dimensions`,
    openingNumbers: noNotes.map(o => o.openingNumber),
  }];
}

// ── 8. Bathroom Rules ────────────────────────────────────
function checkBathroomRules(openings: any[]): CheckItem[] {
  const bathrooms = openings.filter(o => isBathroom(o.roomLocation));
  if (bathrooms.length === 0) return [];

  const issues: string[] = [];
  const issueNums: number[] = [];

  for (const o of bathrooms) {
    const problems: string[] = [];
    if (o.temperedGlass !== 'full') problems.push('tempered');
    if (o.obscureGlass !== 'full') problems.push('obscure');
    if (problems.length > 0) {
      issues.push(`#${o.openingNumber}: needs ${problems.join(' + ')}`);
      issueNums.push(o.openingNumber);
    }
  }

  return [{
    id: 'bathroom-rules', category: 'Bathroom', label: 'Bathroom compliance',
    status: issues.length === 0 ? 'pass' : 'fail',
    detail: issues.length === 0
      ? `All ${bathrooms.length} bathroom openings comply (tempered + obscure)`
      : issues.join('; '),
    openingNumbers: issueNums,
  }];
}

// ── 9. Screen Limitations ────────────────────────────────
function checkScreenLimitations(openings: any[]): CheckItem[] {
  const items: CheckItem[] = [];

  // Full screens on picture windows
  const picScreens = openings.filter(o =>
    o.productCategory === 'picture' && o.screenOption === 'full'
  );
  if (picScreens.length > 0) {
    items.push({
      id: 'screen-picture', category: 'Screens', label: 'Picture window screen rule',
      status: 'fail',
      detail: `${picScreens.length} picture window(s) have full screens — NOT MANUFACTURABLE per BTR Page 13`,
      openingNumbers: picScreens.map(o => o.openingNumber),
      fix: { label: 'Remove screen', field: 'screenOption', value: 'None' },
    });
  }

  // Full screens on arch-tops
  const archScreens = openings.filter(o =>
    ['eyebrow', 'circle_top', 'quarter_arch'].includes(o.productCategory) && o.screenOption === 'full'
  );
  if (archScreens.length > 0) {
    items.push({
      id: 'screen-arch', category: 'Screens', label: 'Arch-top screen rule',
      status: 'fail',
      detail: `${archScreens.length} arch-top window(s) have full screens — NOT MANUFACTURABLE`,
      openingNumbers: archScreens.map(o => o.openingNumber),
      fix: { label: 'Remove screen', field: 'screenOption', value: 'None' },
    });
  }

  // Operable windows without any screen
  const operable = openings.filter(o =>
    o.productCategory && !['picture', 'eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(o.productCategory) &&
    (!o.screenOption || o.screenOption === 'None' || o.screenOption === 'No Screen')
  );
  if (operable.length > 0) {
    items.push({
      id: 'screen-missing', category: 'Screens', label: 'Operable windows have screens',
      status: operable.length <= 2 ? 'warn' : 'fail',
      detail: `${operable.length} operable window(s) without screens — verify this is intentional`,
      openingNumbers: operable.map(o => o.openingNumber),
    });
  }

  return items;
}

// ── 10. Special Shape Trim ───────────────────────────────
function checkSpecialShapeTrim(openings: any[]): CheckItem[] {
  const shapes = openings.filter(o =>
    ['eyebrow', 'circle_top', 'quarter_arch'].includes(o.productCategory)
  );
  if (shapes.length === 0) return [];

  const noTrim = shapes.filter(o => !o.hasTrim && !o.nailFins);
  return [{
    id: 'shape-trim', category: 'Trim', label: 'Special shape trim',
    status: noTrim.length === 0 ? 'pass' : 'fail',
    detail: noTrim.length === 0
      ? `All radius/arch shapes have trim or nail fins noted`
      : `${noTrim.length} radius/arch shape(s) need trim (unless nail fins) — required per BTR Page 60`,
    openingNumbers: noTrim.map(o => o.openingNumber),
  }];
}

// ── 11. Measurement Completeness ─────────────────────────
function checkMeasurementCompleteness(openings: any[]): CheckItem[] {
  const noDims = openings.filter(o => !o.width || o.width === 0 || !o.height || o.height === 0);
  return [{
    id: 'measure-complete', category: 'Measurements', label: 'All openings measured',
    status: noDims.length === 0 ? 'pass' : 'fail',
    detail: noDims.length === 0
      ? `All ${openings.length} openings have W × H`
      : `${noDims.length} opening(s) still need measurements: ${noDims.map(o => `#${o.openingNumber}`).join(', ')}`,
    openingNumbers: noDims.map(o => o.openingNumber),
  }];
}

// ── 12. Product Selection ────────────────────────────────
function checkProductSelection(openings: any[]): CheckItem[] {
  const noProduct = openings.filter(o => !o.productCategory);
  if (openings.length === 0) return [];
  return [{
    id: 'product-selected', category: 'Product', label: 'Product type selected',
    status: noProduct.length === 0 ? 'pass' : 'fail',
    detail: noProduct.length === 0
      ? `All openings have a product type`
      : `${noProduct.length} opening(s) missing product type`,
    openingNumbers: noProduct.map(o => o.openingNumber),
  }];
}

// ── 13. Color Selection ──────────────────────────────────
function checkColorSelection(openings: any[]): CheckItem[] {
  const noColor = openings.filter(o => !o.interiorColor && !o.exteriorColor);
  if (openings.length === 0) return [];
  return [{
    id: 'colors-selected', category: 'Colors', label: 'Colors specified',
    status: noColor.length === 0 ? 'pass' : noColor.length <= 2 ? 'warn' : 'fail',
    detail: noColor.length === 0
      ? `All openings have colors specified`
      : `${noColor.length} opening(s) missing color selection`,
    openingNumbers: noColor.map(o => o.openingNumber),
  }];
}

// ── 14. Removal Type ─────────────────────────────────────
function checkRemovalType(openings: any[]): CheckItem[] {
  const noRemoval = openings.filter(o => !o.removalType || o.removalType === 'none');
  if (openings.length === 0) return [];
  return [{
    id: 'removal-type', category: 'Install', label: 'Removal type set',
    status: noRemoval.length === 0 ? 'pass' : 'warn',
    detail: noRemoval.length === 0
      ? `All openings have removal type (tearout/insert)`
      : `${noRemoval.length} opening(s) without removal type — needed for labor pricing`,
    openingNumbers: noRemoval.map(o => o.openingNumber),
  }];
}

// ── 15. Install Notes for Complex ────────────────────────
function checkInstallNotes(openings: any[]): CheckItem[] {
  const items: CheckItem[] = [];

  // Upper floor without access notes
  const upper = openings.filter(o => (o.floorNumber || 1) >= 2);
  if (upper.length > 0) {
    const noAccess = upper.filter(o => !o.installNotes?.toLowerCase().match(/ladder|scaffold|access|lift|boom|upper|second|third/));
    items.push({
      id: 'install-upper', category: 'Install', label: 'Upper floor access',
      status: noAccess.length === 0 ? 'pass' : 'warn',
      detail: noAccess.length === 0
        ? `All upper-floor openings have access notes`
        : `${noAccess.length} upper-floor opening(s) without ladder/scaffold notes`,
      openingNumbers: noAccess.map(o => o.openingNumber),
    });
  }

  // Sill repair flagged but no detail
  const sillRepair = openings.filter(o => o.sillRepair);
  if (sillRepair.length > 0) {
    const noDetail = sillRepair.filter(o => !o.installNotes?.toLowerCase().match(/sill|rot|damage|replace|repair/));
    items.push({
      id: 'install-sill', category: 'Install', label: 'Sill repair details',
      status: noDetail.length === 0 ? 'pass' : 'warn',
      detail: noDetail.length === 0
        ? `All sill repairs have detail notes`
        : `${noDetail.length} sill repair(s) without detail — document extent of damage`,
      openingNumbers: noDetail.map(o => o.openingNumber),
    });
  }

  return items;
}

// ── Helper ───────────────────────────────────────────────
function isBathroom(room: string | undefined): boolean {
  if (!room) return false;
  return /bath|shower|powder|lavatory|half.?bath/i.test(room);
}
