/**
 * Sketch Export Utilities
 * Handles calculating contain-fit dimensions for the Order Form sketch box
 */

const SKETCH_BOX_WIDTH = 651;
const SKETCH_BOX_HEIGHT = 215;
const SKETCH_BOX_PADDING = 4;

export function calculateSketchFit(imageWidth: number, imageHeight: number) {
  const availW = SKETCH_BOX_WIDTH - (SKETCH_BOX_PADDING * 2);
  const availH = SKETCH_BOX_HEIGHT - (SKETCH_BOX_PADDING * 2);

  const scaleX = availW / imageWidth;
  const scaleY = availH / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  const fitWidth = Math.round(imageWidth * scale);
  const fitHeight = Math.round(imageHeight * scale);

  const tooSmall = fitWidth < 200 || fitHeight < 80;

  return {
    fitWidth,
    fitHeight,
    scale,
    tooSmall,
    boxWidth: SKETCH_BOX_WIDTH,
    boxHeight: SKETCH_BOX_HEIGHT,
    warning: tooSmall
      ? 'Sketch may be too small to read in the Order Form box. Add Additional Sketch Page?'
      : null,
  };
}

/**
 * Render a sketch canvas to a PNG Blob for export/upload
 */
export async function renderSketchToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

/**
 * Upload rendered sketch image to server for Order Form insertion
 */
export async function uploadSketchForOrderForm(
  appointmentId: string,
  blob: Blob,
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('sketch', blob, `${appointmentId}.png`);
    formData.append('appointmentId', appointmentId);

    const token = localStorage.getItem('wwa_token');
    const res = await fetch('/api/sketches/upload-for-export', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || ''}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      return { success: false, error: err.error };
    }

    const data = await res.json();
    return { success: true, path: data.path };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
