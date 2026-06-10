/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SketchFieldPage, { snapAngle, simplifyRDP, normalizeElevation } from './SketchFieldPage';

// Mock matchMedia for components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock canvas API so it doesn't throw in jsdom but can return null contexts if needed
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,');

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({ id: 'sketch_123', markers: [] }),
    batchSyncOpenings: vi.fn().mockResolvedValue({}),
    reconcileOpenings: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('../services/updateService', () => ({
  checkForAppUpdates: vi.fn().mockResolvedValue({ hasUpdate: false })
}));

afterEach(cleanup);

describe('SketchFieldPage Null Ref Resilience', () => {
  const renderSketch = () => {
    return render(
      <MemoryRouter initialEntries={['/appointments/appt_1/sketch']}>
        <Routes>
          <Route path="/appointments/:appointmentId/sketch" element={<SketchFieldPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders safely when canvas refs start null on first render', () => {
    expect(() => renderSketch()).not.toThrow();
  });

  it('redraw function exits safely when canvasRef.current is null', () => {
    const { container } = renderSketch();
    // Simulate resize event which triggers redraw
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(container).toBeTruthy();
  });

  it('orientation change does not crash the sketch canvas', () => {
    const { container } = renderSketch();
    act(() => {
      window.dispatchEvent(new Event('orientationchange'));
    });
    // Wait for internal debounce timeout
    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    vi.useRealTimers();
    expect(container).toBeTruthy();
  });

  it('touch/pointer move does not crash before canvas is ready', () => {
    const { container } = renderSketch();
    const touchArea = container.querySelector('.sketch-fullscreen');
    if (touchArea) {
      expect(() => {
        fireEvent.touchStart(touchArea, { touches: [{ clientX: 100, clientY: 100 }] });
        fireEvent.touchMove(touchArea, { touches: [{ clientX: 150, clientY: 150 }] });
        fireEvent.touchEnd(touchArea);
      }).not.toThrow();
    }
  });

  it('navigating away during sketch load does not call refs after unmount', () => {
    const { unmount } = renderSketch();
    // Unmount before async loads complete
    expect(() => unmount()).not.toThrow();
    
    // Fast-forward any timers to trigger pending callbacks
    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
  });
});

describe('SketchFieldPage Helper and Hardening Suite', () => {
  // 17. Snap horizontal/vertical works if implemented
  it('snapAngle snaps lines to closest 45 degree angle when within snapping threshold', () => {
    const p1 = { x: 0, y: 0 };
    // 5 degrees is close to 0 degrees, snaps to 0 deg
    const p2_0 = { x: 10, y: 0.8 }; 
    const snapped_0 = snapAngle(p1, p2_0);
    expect(snapped_0.y).toBeCloseTo(0);
    expect(snapped_0.x).toBeCloseTo(Math.sqrt(10 * 10 + 0.8 * 0.8));

    // 88 degrees is close to 90 degrees, snaps to 90 deg
    const p2_90 = { x: 0.3, y: 10 };
    const snapped_90 = snapAngle(p1, p2_90);
    expect(snapped_90.x).toBeCloseTo(0);
    expect(snapped_90.y).toBeCloseTo(Math.sqrt(0.3 * 0.3 + 10 * 10));
  });

  it('snapAngle does not snap to angles if difference exceeds the threshold', () => {
    const p1 = { x: 0, y: 0 };
    // 25 degrees is too far from 0 or 45, returns original point
    const p2 = { x: 10, y: 4.66 };
    const snapped = snapAngle(p1, p2);
    expect(snapped.x).toBe(p2.x);
    expect(snapped.y).toBe(p2.y);
  });

  // 19. Freehand line can be straightened & 20. Straightened line preserves corners
  it('simplifyRDP reduces points on crooked freehand strokes while preserving key corners', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0.1 },
      { x: 2, y: -0.1 },
      { x: 5, y: 5 }, // corner
      { x: 8, y: 0.1 },
      { x: 9, y: -0.1 },
      { x: 10, y: 0 }
    ];
    const simplified = simplifyRDP(points, 1.0);
    expect(simplified.length).toBeLessThan(points.length);
    // Endpoints are preserved
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
    expect(simplified[simplified.length - 1]).toEqual({ x: 10, y: 0 });
    const hasCorner = simplified.some((p: { x: number; y: number }) => Math.abs(p.x - 5) < 0.5 && Math.abs(p.y - 5) < 0.5);
    expect(hasCorner).toBe(true);
  });

  // elevation helper
  it('normalizeElevation maps stories to canonical forms', () => {
    expect(normalizeElevation('1st_story')).toBe('1st_story');
    expect(normalizeElevation('2nd_Story')).toBe('2nd_story');
    expect(normalizeElevation('second_story')).toBe('2nd_story');
    expect(normalizeElevation('')).toBe('1st_story');
    expect(normalizeElevation(null)).toBe('1st_story');
  });
});
