# Surface Pro Pen Controls

Window World Assistant provides native support for Surface Pro Pen hardware to streamline the field quoting and sketching process.

## Hardware Features

### 1. Hardware Eraser
- **Action**: Flip the Surface Pen to use the eraser end.
- **Behavior**: The application automatically switches the active tool to `eraser`. 
  - Tapping a window marker will prompt to delete it.
  - Dragging on the canvas will erase drawing strokes.
- **Status**: Enabled by default (can be toggled in Pen Settings).

### 2. Barrel Button Duplicate
- **Action**: Double-tap the side barrel button on the Surface Pen.
- **Behavior**: The last selected or last created window opening is instantly duplicated on the canvas.
  - The new marker is placed slightly offset from the original.
  - **All** details from the original window are copied (Grid Style, Glass Package, Color, Window Type, Options).
  - The new window is flagged with `copiedFromOpeningId` and requires the rep to confirm its measurements.
- **Status**: Enabled by default (can be toggled in Pen Settings).

## Settings & Fallbacks

Users can access **⚙️ Pen Settings** in the Sketch canvas toolbar to customize behavior:
1. **Enable Pen Shortcuts**: Master switch to disable all hardware intercepts.
2. **Hardware Eraser**: Toggle automatic eraser switching.
3. **Barrel Button Duplicate**: Toggle double-tap duplication.

### Fallback Compatibility
If a user is operating on an iPad, a laptop without a Surface Pen, or a browser that does not fully support `PointerEvent.pointerType === 'pen'`, standard UI fallback buttons are still available on the toolbar (Eraser tool, Duplicate button).

## Technical Implementation Details
- Handled via unified `PointerEvent` listeners (`onPointerDown`, `onPointerMove`, `onPointerUp`) instead of standard mouse/touch events.
- `getPointerIntent(e: React.PointerEvent)` (in `apps/web/src/utils/surfacePenInput.ts`) detects `buttons === 32` (eraser) and tracks rapid sequential clicks (`detail >= 2` or manual timestamping) for the barrel button.
