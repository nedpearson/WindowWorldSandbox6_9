import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFileLocally: (filename: string, content: string | ArrayBuffer, subfolder?: string) => 
    ipcRenderer.invoke('save-file-locally', filename, content, subfolder),
  readFileLocally: (filename: string, subfolder?: string) =>
    ipcRenderer.invoke('read-file-locally', filename, subfolder),
  deleteFileLocally: (filename: string, subfolder?: string) =>
    ipcRenderer.invoke('delete-file-locally', filename, subfolder),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  generateExcelLocally: (data: any) => ipcRenderer.invoke('generate-excel-locally', data),
  backupLocalDb: (jsonData: string) => ipcRenderer.invoke('backup-local-db', jsonData),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  onUpdateError: (callback: (err: any) => void) => {
    ipcRenderer.on('update-error', (_event, err) => callback(err));
  }
});
