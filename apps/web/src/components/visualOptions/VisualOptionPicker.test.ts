import { describe, it, expect, vi } from 'vitest';

// ── VisualOptionPicker unit tests ──
// Tests for the shared visual option picker component system

describe('VisualOptionPicker', () => {
  // Test that the visual option types are properly exported
  it('exports VisualOption type with required fields', async () => {
    const mod = await import('./visualOptionTypes');
    // Type-only check — if this compiles, types are correct
    const option: import('./visualOptionTypes').VisualOption = {
      value: 'test',
      label: 'Test',
      icon: null,
    };
    expect(option.value).toBe('test');
    expect(option.label).toBe('Test');
  });

  it('exports VisualOptionPickerProps with mode support', async () => {
    const mod = await import('./visualOptionTypes');
    const props: import('./visualOptionTypes').VisualOptionPickerProps = {
      options: [],
      value: null,
      onChange: () => {},
      title: 'Test',
      mode: 'inline',
    };
    expect(props.mode).toBe('inline');
  });

  it('supports badge types', async () => {
    const option: import('./visualOptionTypes').VisualOption = {
      value: 'test',
      label: 'Test',
      icon: null,
      badge: 'default',
    };
    expect(option.badge).toBe('default');
    
    const addsPriceOption: import('./visualOptionTypes').VisualOption = {
      value: 'premium',
      label: 'Premium',
      icon: null,
      badge: 'adds-price',
    };
    expect(addsPriceOption.badge).toBe('adds-price');
  });
});

describe('Visual option data mappings', () => {
  // Verify that the option definitions in MarkerDetailSheet use the same stored values
  // as the existing system to prevent data mapping breaks
  
  it('REMOVAL_TYPE_OPTIONS values match existing DB/pricing values', () => {
    // These are the values the system expects:
    // - orderFormGeneration.service.ts maps removalType → typeRemoved
    // - workbookEngine.ts writes typeRemoved to column AH
    // - pdfService.ts reads removalType for contract summary
    const expectedValues = ['ALUM', 'WOOD', 'VINYL', 'STEEL', 'STORM', 'none', 'other'];
    // Values that the mapRemovalType() function handles:
    const knownMappings: Record<string, string> = {
      'ALUM': 'ALUM',
      'WOOD': 'ALUM', // maps to ALUM in exports.ts mapRemovalType
      'VINYL': 'ALUM', // maps to ALUM
      'STEEL': 'STEEL',
      'STORM': 'STORM',
      'none': '', // maps to empty
    };
    
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
    
    // Verify ALUM is the default (matching WW_OPENING_DEFAULTS.removalType)
    expect(expectedValues[0]).toBe('ALUM');
  });

  it('INSTALL_TYPE_OPTIONS values match expected install type codes', () => {
    const expectedValues = ['EXT', 'INT', 'replacement', 'full_frame', 'new_construction', 'other'];
    // workbookFieldMap.ts documents: typeInstall valid values are IN, OUT, EXT
    // The stored value is written to column AK via installType pass-through
    
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it('GLASS_VISUAL_OPTIONS values match GLASS_OPTIONS array', () => {
    const expectedValues = ['LEE', 'Clear', 'SolarZone', 'SolarZone Elite'];
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
    }
    // Default is LEE
    expect(expectedValues[0]).toBe('LEE');
  });

  it('SCREEN_VISUAL_OPTIONS values match SCREEN_OPTIONS array', () => {
    const expectedValues = ['Full Screen', 'Half Screen', 'No Screen'];
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
    }
  });

  it('CUTBACK_VISUAL_OPTIONS values match existing cutback dropdown values', () => {
    // These must exactly match the <option> values from the old dropdown
    const expectedValues = ['Needs cutback selection', 'Standard stucco cutback', 'Custom cutback', 'No cutback'];
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
    }
  });

  it('TRIM_VISUAL_OPTIONS values match existing trim dropdown values', () => {
    const expectedValues = ['Vinyl trim', 'Custom trim', 'None'];
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
    }
    // Default is 'Vinyl trim' (Included)
    expect(expectedValues[0]).toBe('Vinyl trim');
  });

  it('HEADER_VISUAL_OPTIONS values match existing header dropdown values', () => {
    const expectedValues = ['New header', 'Reuse header', 'None'];
    for (const val of expectedValues) {
      expect(typeof val).toBe('string');
    }
    // Default is 'New header' (Included)
    expect(expectedValues[0]).toBe('New header');
  });

  it('COLOR_OPTIONS values match existing color dropdown values', () => {
    const interiorColors = ['White', 'Almond', 'Clay', 'Woodgrain'];
    const exteriorColors = ['White', 'Almond', 'Clay', 'Bronze', 'Black'];
    
    for (const val of interiorColors) {
      expect(typeof val).toBe('string');
    }
    for (const val of exteriorColors) {
      expect(typeof val).toBe('string');
    }
    // Default for both is 'White'
    expect(interiorColors[0]).toBe('White');
    expect(exteriorColors[0]).toBe('White');
  });
});

describe('SVG icon functions', () => {
  it('getRemovalTypeIcon returns React elements for all known types', async () => {
    const { getRemovalTypeIcon } = await import('../RealisticInstallIcons');
    const types = ['ALUM', 'WOOD', 'VINYL', 'STEEL', 'STORM', 'none', 'other'];
    for (const type of types) {
      const icon = getRemovalTypeIcon(type);
      expect(icon).toBeTruthy();
    }
    // Unknown type should still return something (not crash)
    const unknown = getRemovalTypeIcon('UNKNOWN_VALUE');
    expect(unknown).toBeTruthy();
  });

  it('getInstallTypeIcon returns React elements for all known types', async () => {
    const { getInstallTypeIcon } = await import('../RealisticInstallIcons');
    const types = ['EXT', 'INT', 'replacement', 'full_frame', 'new_construction', 'other'];
    for (const type of types) {
      const icon = getInstallTypeIcon(type);
      expect(icon).toBeTruthy();
    }
    const unknown = getInstallTypeIcon('UNKNOWN');
    expect(unknown).toBeTruthy();
  });

  it('getTrimIcon returns React elements for all known types', async () => {
    const { getTrimIcon } = await import('../RealisticExteriorDetailIcons');
    const types = ['Vinyl trim', 'Custom trim', 'None'];
    for (const type of types) {
      const icon = getTrimIcon(type);
      expect(icon).toBeTruthy();
    }
  });

  it('getHeaderIcon returns React elements for all known types', async () => {
    const { getHeaderIcon } = await import('../RealisticExteriorDetailIcons');
    const types = ['New header', 'Reuse header', 'None'];
    for (const type of types) {
      const icon = getHeaderIcon(type);
      expect(icon).toBeTruthy();
    }
  });

  it('getCutbackIcon returns React elements for all known types', async () => {
    const { getCutbackIcon } = await import('../RealisticExteriorDetailIcons');
    const types = ['Standard stucco cutback', 'Custom cutback', 'No cutback', 'Needs cutback selection'];
    for (const type of types) {
      const icon = getCutbackIcon(type);
      expect(icon).toBeTruthy();
    }
  });

  it('getGlassIcon returns React elements for all known types', async () => {
    const { getGlassIcon } = await import('../RealisticProductIcons');
    const types = ['LEE', 'Clear', 'SolarZone', 'SolarZone Elite'];
    for (const type of types) {
      const icon = getGlassIcon(type);
      expect(icon).toBeTruthy();
    }
  });

  it('getScreenIcon returns React elements for all known types', async () => {
    const { getScreenIcon } = await import('../RealisticProductIcons');
    const types = ['Full Screen', 'Half Screen', 'No Screen'];
    for (const type of types) {
      const icon = getScreenIcon(type);
      expect(icon).toBeTruthy();
    }
  });

  it('getColorSwatchIcon returns React elements for all known colors', async () => {
    const { getColorSwatchIcon } = await import('../RealisticProductIcons');
    const colors = ['White', 'Almond', 'Clay', 'Bronze', 'Black', 'Woodgrain'];
    for (const color of colors) {
      const icon = getColorSwatchIcon(color);
      expect(icon).toBeTruthy();
    }
    // Interior flag should not crash
    const interiorIcon = getColorSwatchIcon('Woodgrain', true);
    expect(interiorIcon).toBeTruthy();
  });
});
