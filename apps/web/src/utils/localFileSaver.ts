import { toast } from '../components/Toast';

export async function saveLocalFile(blob: Blob, suggestedName: string, mimeType: string, extension: string) {
  try {
    if ('showSaveFilePicker' in window) {
      const opts: any = {
        suggestedName,
        types: [{
          description: extension.toUpperCase() + ' File',
          accept: { [mimeType]: ['.' + extension] },
        }],
      };
      
      const handle = await (window as any).showSaveFilePicker(opts);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      toast.success(`Saved to ${handle.name}`);
      return true;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('File System Access API failed', err);
    } else {
      return false; // User cancelled
    }
  }

  // Fallback to standard download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Downloaded ' + suggestedName);
  return true;
}
