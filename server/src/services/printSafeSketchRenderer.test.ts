import { describe, it, expect } from 'vitest';
import { generatePrintSafeSketchSvg, normalizeSketchForDocumentExport, normalizeStrokeForPrint, type SketchMarkerData, type SketchStrokeData } from './printSafeSketchRenderer.js';

describe('generatePrintSafeSketchSvg unit tests', () => {
  it('correctly generates a print-safe SVG from active markers and strokes', () => {
    const markers: SketchMarkerData[] = [
      { id: 'm1', markerType: 'window', markerSymbol: 'dh', markerNumber: 1, x: 10, y: 20 },
      { id: 'm2', markerType: 'window', markerSymbol: 'casement', markerNumber: 2, x: 20, y: 30 },
      { id: 'm3', markerType: 'door', markerSymbol: 'front_door', markerNumber: 3, x: 30, y: 40 },
      { id: 'm4', markerType: 'window', markerSymbol: 'picture', markerNumber: 4, x: 40, y: 50 },
    ];

    const strokes: SketchStrokeData[] = [
      {
        points: [{ x: 5, y: 5 }, { x: 50, y: 50 }],
        color: '#ffffff', // white stroke
        width: 1, // too thin
      }
    ];

    const svg = generatePrintSafeSketchSvg({
      markers,
      strokes,
      houseOutline: [{ x: 2, y: 2 }, { x: 80, y: 80 }],
      width: 900,
      height: 500,
    });

    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 900 500"');
    
    // Check marker groups exist
    expect(svg).toContain('data-marker-id="m1"');
    expect(svg).toContain('data-opening-number="1"');
    expect(svg).toContain('data-marker-id="m2"');
    expect(svg).toContain('data-opening-number="2"');

    // Check marker labels exist
    expect(svg).toContain('#1');
    expect(svg).toContain('#2');
    expect(svg).toContain('#3');
    expect(svg).toContain('#4');

    // Check type labels exist
    expect(svg).toContain('DH');
    expect(svg).toContain('CAS');
    expect(svg).toContain('FD');
    expect(svg).toContain('PIC');

    // Check explicit marker colors
    expect(svg).toContain('#3B82F6'); // default window fill
    expect(svg).toContain('#7C3AED'); // casement fill
    expect(svg).toContain('#DC2626'); // door fill
    expect(svg).toContain('#0891B2'); // picture fill

    // Check strokes rendering
    expect(svg).toContain('stroke="#000000"'); // white stroke converted to black
    expect(svg).toContain('stroke-width="10"'); // thin stroke normalized to 10 minimum
    
    // Check no NaN coordinates exist
    expect(svg).not.toContain('NaN');
  });

  it('strictly enforces all print-safe stroke normalization styles', () => {
    // 1. White sketch stroke exports as dark stroke.
    const strokeWhite: SketchStrokeData = { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#ffffff', width: 4 };
    const normWhite = normalizeStrokeForPrint(strokeWhite);
    expect(normWhite.color).toBe('#000000');

    // 2. Light gray sketch stroke exports as dark stroke.
    const strokeLight: SketchStrokeData = { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#e5e7eb', width: 4 };
    const normLight = normalizeStrokeForPrint(strokeLight);
    expect(normLight.color).toBe('#000000');

    // 3. Low-opacity stroke exports with opacity 1.
    const strokeLowOp: SketchStrokeData = { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#111827', opacity: 0.5 };
    const normLowOp = normalizeStrokeForPrint(strokeLowOp);
    expect(normLowOp.opacity).toBe(1);

    // 4. Thin stroke exports with minimum width 10.
    const strokeThin: SketchStrokeData = { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#111827', width: 1.5 };
    const normThin = normalizeStrokeForPrint(strokeThin);
    expect(normThin.width).toBe(10);

    // 5. SVG contains marker icons and dark sketch lines together.
    const svg = generatePrintSafeSketchSvg({
      markers: [{ id: 'm1', markerType: 'window', markerSymbol: 'dh', markerNumber: 1, x: 10, y: 20 }],
      strokes: [
        { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: 'white', width: 1.5, opacity: 0.2 },
        { points: [{ x: 3, y: 3 }, { x: 4, y: 4 }], color: '#e5e7eb', width: 2.0, opacity: 0.4 }
      ]
    });

    expect(svg).toContain('data-marker-id="m1"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).toContain('stroke-width="10"');
    expect(svg).toContain('opacity="1"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(svg).toContain('font-size="20"'); // marker type label font-size
    expect(svg).toContain('font-size="28"'); // marker number font-size
    expect(svg).not.toMatch(/<path[^>]*stroke\s*=\s*["']#(?:fff(?:fff)?|FFF(?:FFF)?)["']/i);
    expect(svg).not.toMatch(/<path[^>]*stroke\s*=\s*["']white["']/i);
    expect(svg).not.toMatch(/<path[^>]*stroke\s*=\s*["']#e5e7eb["']/i);
  });

  it('handles empty optional fields and renders correct SVG standalone structure', () => {
    const markers: SketchMarkerData[] = [
      { id: 'm1', markerType: 'window', markerSymbol: 'dh', markerNumber: 1, x: 10, y: 20 },
    ];

    const svg = generatePrintSafeSketchSvg({ markers });
    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('data-marker-id="m1"');
    expect(svg).not.toContain('NaN');
  });

  describe('normalizeSketchForDocumentExport', () => {
    it('correctly compacts sparse marker numbers (e.g. #2, #3, #5...#12) into #1..#10 and aligns openings', () => {
      // Create an appointment fixture
      const appointment = { id: 'appt1', companyId: 'company1' };

      // Create a sparse marker sketch list (mimics user measurements on canvas)
      const markers = [
        { id: 'm2', markerType: 'window', markerSymbol: 'dh', markerNumber: 2, x: 10, y: 15, links: [{ openingId: 'op2' }] },
        { id: 'm3', markerType: 'window', markerSymbol: 'dh', markerNumber: 3, x: 15, y: 20, links: [{ openingId: 'op3' }] },
        { id: 'm5', markerType: 'window', markerSymbol: 'dh', markerNumber: 5, x: 20, y: 25, links: [{ openingId: 'op5' }] },
        { id: 'm6', markerType: 'window', markerSymbol: 'dh', markerNumber: 6, x: 25, y: 30, links: [{ openingId: 'op6' }] },
        { id: 'm7', markerType: 'window', markerSymbol: 'dh', markerNumber: 7, x: 30, y: 35, links: [{ openingId: 'op7' }] },
        { id: 'm8', markerType: 'window', markerSymbol: 'dh', markerNumber: 8, x: 35, y: 40, links: [{ openingId: 'op8' }] },
        { id: 'm9', markerType: 'window', markerSymbol: 'dh', markerNumber: 9, x: 40, y: 45, links: [{ openingId: 'op9' }] },
        { id: 'm10', markerType: 'window', markerSymbol: 'dh', markerNumber: 10, x: 45, y: 50, links: [{ openingId: 'op10' }] },
        { id: 'm11', markerType: 'window', markerSymbol: 'dh', markerNumber: 11, x: 50, y: 55, links: [{ openingId: 'op11' }] },
        { id: 'm12', markerType: 'window', markerSymbol: 'dh', markerNumber: 12, x: 55, y: 60, links: [{ openingId: 'op12' }] },
      ];

      const sketch = { id: 'sketch1', appointmentId: 'appt1', markers };

      // Associated openings (in unsorted or database order)
      const openings = [
        { id: 'op12', openingNumber: 12, width: 30, height: 40 },
        { id: 'op11', openingNumber: 11, width: 30, height: 40 },
        { id: 'op10', openingNumber: 10, width: 30, height: 40 },
        { id: 'op9', openingNumber: 9, width: 30, height: 40 },
        { id: 'op8', openingNumber: 8, width: 30, height: 40 },
        { id: 'op7', openingNumber: 7, width: 30, height: 40 },
        { id: 'op6', openingNumber: 6, width: 30, height: 40 },
        { id: 'op5', openingNumber: 5, width: 30, height: 40 },
        { id: 'op3', openingNumber: 3, width: 30, height: 40 },
        { id: 'op2', openingNumber: 2, width: 30, height: 40 },
      ];

      const result = normalizeSketchForDocumentExport(appointment, sketch, openings);

      // Verify activeMarkers has been compacted to exactly sequential #1..#10
      expect(result.activeMarkers.length).toBe(10);
      result.activeMarkers.forEach((m: any, index: number) => {
        expect(m.markerNumber).toBe(index + 1);
        expect(m.markerLabel).toBe(`#${index + 1}`);
      });

      // Verify openings have been normalized to exact same compact sequence numbers
      expect(result.openings.length).toBe(10);
      
      // op2 is linked to m2 (original number 2) -> should map to new sequential index 1
      const op2Normalized = result.openings.find((o: any) => o.id === 'op2');
      expect(op2Normalized).toBeDefined();
      expect(op2Normalized?.openingNumber).toBe(1);

      // op12 is linked to m12 (original number 12) -> should map to new sequential index 10
      const op12Normalized = result.openings.find((o: any) => o.id === 'op12');
      expect(op12Normalized).toBeDefined();
      expect(op12Normalized?.openingNumber).toBe(10);

      // Verify openings list is properly sorted by their corrected compact sequence numbers
      for (let i = 0; i < result.openings.length - 1; i++) {
        expect(result.openings[i].openingNumber).toBeLessThan(result.openings[i + 1].openingNumber);
      }
    });
  });
});
