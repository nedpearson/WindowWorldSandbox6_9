/**
 * ════════════════════════════════════════════════════════════════
 * Surface Pen Input Abstraction
 * ════════════════════════════════════════════════════════════════
 * 
 * Provides reliable cross-browser detection of Surface Pen (and other active styluses)
 * hardware states, including:
 * 1. Eraser end usage.
 * 2. Side button (barrel button) usage.
 * 3. Double-tap detection for shortcuts.
 */

export interface PenPointerIntent {
  isPen: boolean;
  isEraser: boolean;
  isBarrelButton: boolean;
  isDoubleTap: boolean;
}

// State for double-tap detection
let lastBarrelTapTime = 0;
let lastBarrelTapPos = { x: -1, y: -1 };
const DOUBLE_TAP_THRESHOLD_MS = 500;
const DOUBLE_TAP_DISTANCE_PX = 40; // Allow slight jitter

/**
 * Checks if the PointerEvent was triggered by an active stylus (pen).
 */
export function isPenPointer(e: React.PointerEvent | PointerEvent): boolean {
  return e.pointerType === 'pen' || e.pointerType === 'eraser';
}

/**
 * Checks if the pen's hardware eraser end is currently active.
 * 
 * Behavior varies by OS and browser:
 * - W3C Spec: `buttons & 32` (Eraser) or `button === 5`
 * - Some implementations may flip `pointerId` or send `button === 2`.
 */
export function isEraserPointer(e: React.PointerEvent | PointerEvent): boolean {
  if (!isPenPointer(e)) return false;
  
  if (e.pointerType === 'eraser') return true;
  
  // button 5 is the standard for eraser in many browsers.
  if (e.button === 5) return true;
  
  // buttons bitmask 32 is the W3C spec for eraser.
  if ((e.buttons & 32) === 32) return true;

  // Some legacy integrations might expose eraser as something else, but 
  // relying on `button 5` or `buttons 32` covers 95% of Chromium/Edge on Windows.
  return false;
}

/**
 * Checks if the pen's side button (barrel button) is being held/pressed.
 * 
 * - W3C Spec: `button === 2` (Right Click) or `buttons & 2` (Secondary)
 */
export function isBarrelButton(e: React.PointerEvent | PointerEvent): boolean {
  if (!isPenPointer(e)) return false;

  // The side button typically triggers a secondary action (right-click).
  if (e.button === 2) return true;
  if ((e.buttons & 2) === 2) return true;

  return false;
}

/**
 * Evaluates a PointerEvent to determine if a double-tap shortcut was just executed
 * using the barrel button.
 * 
 * Should be called inside `onPointerDown`.
 */
export function detectPenDoubleTap(e: React.PointerEvent | PointerEvent): boolean {
  if (!isBarrelButton(e)) return false;

  const now = Date.now();
  const timeDiff = now - lastBarrelTapTime;
  
  const dist = Math.hypot(e.clientX - lastBarrelTapPos.x, e.clientY - lastBarrelTapPos.y);

  // Update tracking state
  lastBarrelTapTime = now;
  lastBarrelTapPos = { x: e.clientX, y: e.clientY };

  // If within time threshold and distance threshold, it's a double tap!
  if (timeDiff > 50 && timeDiff < DOUBLE_TAP_THRESHOLD_MS && dist < DOUBLE_TAP_DISTANCE_PX) {
    // Reset to prevent triple-tap triggering another duplicate immediately
    lastBarrelTapTime = 0;
    return true;
  }

  return false;
}

/**
 * Comprehensive evaluator for a given PointerEvent.
 */
export function getPointerIntent(e: React.PointerEvent | PointerEvent): PenPointerIntent {
  const isPen = isPenPointer(e);
  if (!isPen) {
    return { isPen: false, isEraser: false, isBarrelButton: false, isDoubleTap: false };
  }

  return {
    isPen: true,
    isEraser: isEraserPointer(e),
    isBarrelButton: isBarrelButton(e),
    isDoubleTap: detectPenDoubleTap(e)
  };
}

/**
 * Identifies if the target element is an interactive UI control.
 * Used to ensure canvas pointer handlers don't accidentally intercept
 * pen taps on buttons, inputs, toolbars, or detail sheets.
 */
export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  
  // Direct interactive tags
  const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];
  if (interactiveTags.includes(el.tagName)) return true;
  
  // Content editable
  if (el.isContentEditable) return true;
  
  // Check if it's inside a known toolbar or panel by class name or id
  if (el.closest('.sketch-toolbar-wrap')) return true;
  if (el.closest('.sketch-side-panel-wrapper')) return true;
  if (el.closest('.marker-sheet-container')) return true;
  if (el.closest('.validation-panel')) return true;
  if (el.closest('.sketch-outline-panel-wrapper')) return true;
  
  // Generic button/control role
  if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'textbox') return true;

  return false;
}
