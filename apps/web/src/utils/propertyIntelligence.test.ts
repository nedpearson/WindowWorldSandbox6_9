// ═══════════════════════════════════════════════════════════════
// Property Intelligence + AI Sketch Generator — Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateAISketch,
  generateQuickQuote,
  savePropertyIntelligence,
  getPropertyIntelligence,
  type PropertyData,
} from './propertyIntelligence';

// Mock localStorage
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
});

const baseProperty: PropertyData = {
  address: '456 Oak Ave', city: 'Baton Rouge', state: 'LA', zip: '70808',
  lat: 30.4515, lng: -91.1871,
  stories: 1, sqft: 2000, yearBuilt: 1995, lotSqft: 6000,
  propertyType: 'single_family', exteriorMaterial: 'brick', roofType: 'shingle',
  garageType: 'attached', estimatedOpenings: 10, estimatedSidingArea: 0,
};

describe('AI House Sketch Generator', () => {
  it('generates openings for all 4 elevations', () => {
    const result = generateAISketch(baseProperty);
    const elevations = result.elevations.map(e => e.elevation);
    expect(elevations).toContain('front');
    expect(elevations).toContain('rear');
    expect(elevations).toContain('left');
    expect(elevations).toContain('right');
  });

  it('places front door on front elevation', () => {
    const result = generateAISketch(baseProperty);
    const frontDoor = result.draftOpenings.find(o => o.markerSymbol === 'front_door');
    expect(frontDoor).toBeDefined();
    expect(frontDoor!.elevation).toBe('front');
  });

  it('places SGD on rear elevation', () => {
    const result = generateAISketch(baseProperty);
    const sgd = result.draftOpenings.find(o => o.markerSymbol === 'sgd');
    expect(sgd).toBeDefined();
    expect(sgd!.elevation).toBe('rear');
  });

  it('generates more windows for 2-story homes', () => {
    const oneStory = generateAISketch({ ...baseProperty, stories: 1 });
    const twoStory = generateAISketch({ ...baseProperty, stories: 2 });
    expect(twoStory.totalWindows).toBeGreaterThan(oneStory.totalWindows);
  });

  it('marks all openings as needsVerification', () => {
    const result = generateAISketch(baseProperty);
    for (const o of result.draftOpenings) {
      expect(o.needsVerification).toBe(true);
    }
  });

  it('includes garage on front when attached', () => {
    const result = generateAISketch({ ...baseProperty, garageType: 'attached' });
    const garage = result.draftOpenings.find(o => o.type === 'garage');
    expect(garage).toBeDefined();
    expect(garage!.elevation).toBe('front');
  });

  it('no garage when garageType is none', () => {
    const result = generateAISketch({ ...baseProperty, garageType: 'none' });
    const garage = result.draftOpenings.find(o => o.type === 'garage');
    expect(garage).toBeUndefined();
  });

  it('includes awning/bathroom window on side elevations', () => {
    const result = generateAISketch(baseProperty);
    const awnings = result.draftOpenings.filter(o => o.markerSymbol === 'awning');
    expect(awnings.length).toBeGreaterThanOrEqual(1);
  });

  it('sets confidence levels appropriately', () => {
    const result = generateAISketch(baseProperty);
    const frontDoor = result.draftOpenings.find(o => o.markerSymbol === 'front_door');
    const rearSGD = result.draftOpenings.find(o => o.markerSymbol === 'sgd');
    expect(frontDoor!.confidence).toBe('high');
    expect(rearSGD!.confidence).toBe('medium');
  });
});

describe('Quick Quote Generator', () => {
  it('calculates Good/Better/Best totals', () => {
    const result = generateAISketch(baseProperty);
    const quote = generateQuickQuote(result);
    expect(quote.goodTotal).toBeGreaterThan(0);
    expect(quote.betterTotal).toBeGreaterThan(quote.goodTotal);
    expect(quote.bestTotal).toBeGreaterThan(quote.betterTotal);
  });

  it('calculates monthly payments', () => {
    const result = generateAISketch(baseProperty);
    const quote = generateQuickQuote(result);
    expect(quote.goodMonthly).toBeGreaterThan(0);
    expect(quote.betterMonthly).toBe(Math.round(quote.betterTotal / 120));
  });

  it('counts windows and doors correctly', () => {
    const result = generateAISketch(baseProperty);
    const quote = generateQuickQuote(result);
    expect(quote.windowCount).toBe(result.totalWindows);
    expect(quote.doorCount).toBe(result.totalDoors);
  });

  it('includes siding when exterior is siding', () => {
    const sidingProperty = { ...baseProperty, exteriorMaterial: 'siding' as const };
    const result = generateAISketch(sidingProperty);
    const quote = generateQuickQuote(result);
    expect(quote.sidingZones).toBe(1);
  });
});

describe('Property Intelligence Persistence', () => {
  it('saves and retrieves property data', () => {
    const result = generateAISketch(baseProperty);
    savePropertyIntelligence('apt_test_1', result);
    const retrieved = getPropertyIntelligence('apt_test_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.property.address).toBe('456 Oak Ave');
  });

  it('returns null for unknown appointment', () => {
    expect(getPropertyIntelligence('nonexistent')).toBeNull();
  });
});
