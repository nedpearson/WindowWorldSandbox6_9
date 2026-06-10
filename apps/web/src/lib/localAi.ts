import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;

let classifierPipeline: any = null;
let isModelDownloading = false;

export async function downloadLocalAiModels(onProgress?: (progress: number) => void) {
  if (isModelDownloading) return;
  isModelDownloading = true;
  try {
    classifierPipeline = await pipeline('image-classification', 'Xenova/vit-base-patch16-224', {
      progress_callback: (data: any) => {
        if (data.status === 'progress' && onProgress) {
          const pct = Math.round((data.loaded / data.total) * 100);
          onProgress(pct);
        }
      }
    });
    localStorage.setItem('localAiModelStatus', 'installed');
  } catch (err) {
    console.error('Failed to download local AI models:', err);
    throw err;
  } finally {
    isModelDownloading = false;
  }
}

export function isLocalAiInstalled() {
  return localStorage.getItem('localAiModelStatus') === 'installed';
}

export async function analyzePhotoLocal(photoUrlOrBlob: string | Blob): Promise<string> {
  let finalUrl = '';
  
  if (photoUrlOrBlob instanceof Blob) {
    finalUrl = URL.createObjectURL(photoUrlOrBlob);
  } else {
    finalUrl = photoUrlOrBlob;
  }

  if (!isLocalAiInstalled() || !classifierPipeline) {
    try {
      if (!classifierPipeline && isLocalAiInstalled()) {
         classifierPipeline = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
      }
      if (!classifierPipeline) throw new Error('Pipeline unavailable');
    } catch (e) {
      return "Rule-Based Offline Analysis: The photo is marked for review. Cannot perform vision classification offline without the Local AI Pack installed.";
    }
  }

  try {
    const results = await classifierPipeline(finalUrl);
    
    if (photoUrlOrBlob instanceof Blob) {
      URL.revokeObjectURL(finalUrl);
    }
    
    const topLabels = results.map((r: any) => r.label + ' (' + (r.score * 100).toFixed(1) + '%)').join(', ');
    let notes = 'Local AI Detected: ' + topLabels + '.';
    
    if (notes.toLowerCase().includes('bathroom') || notes.toLowerCase().includes('tub') || notes.toLowerCase().includes('shower')) {
      notes += ' \n?? WARNING: Bathroom detected. Check for Tempered Glass requirement.';
    }
    if (notes.toLowerCase().includes('brick')) {
      notes += ' \nExterior matches Brick.';
    }
    if (notes.toLowerCase().includes('siding')) {
      notes += ' \nExterior matches Vinyl/Wood Siding. Requires J-Channel/Trim evaluation.';
    }

    return notes;
  } catch (err) {
    return "Error running Local AI model on this device.";
  }
}

export function checkOfflineMeasurementRules(width: number, height: number): string[] {
  const warnings = [];
  if (width < 14) warnings.push('Width is less than 14" (minimum size for many double hungs).');
  if (width > 54) warnings.push('Width is > 54" (may require a slider or twin unit).');
  if (height < 24) warnings.push('Height is < 24" (verify if egress is needed or if size is possible).');
  if (height > 84) warnings.push('Height is > 84" (too tall for standard units, check limits).');
  if (width > 40 && height > 60) warnings.push('?? WARNING: Large glass area. Verify if tempered glass is required by code due to size.');
  return warnings;
}
