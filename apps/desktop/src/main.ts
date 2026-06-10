import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import serve from 'electron-serve';
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_START_URL;

const webDistPath = app.isPackaged 
  ? path.join(__dirname, '../web/dist')
  : path.join(__dirname, '../../web/dist');

const loadURL = serve({ directory: webDistPath });

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    if (deviceList && deviceList.length > 0) {
      callback(deviceList[0].deviceId);
    } else {
      callback('');
    }
  });

  if (isDev) {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    mainWindow.loadURL(startUrl);
    mainWindow.webContents.openDevTools();
  } else {
    loadURL(mainWindow);
  }
}

function getAppStorageFolder(subfolder?: string) {
  const documentsPath = app.getPath('documents');
  const wwFolder = path.join(documentsPath, 'WW Customers');
  const targetFolder = subfolder ? path.join(wwFolder, subfolder) : wwFolder;
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }
  return targetFolder;
}

function setupIpcHandlers() {
  ipcMain.handle('save-file-locally', async (event, filename: string, content: string | Buffer | ArrayBuffer, subfolder?: string) => {
    try {
      const targetFolder = getAppStorageFolder(subfolder);
      const filePath = path.join(targetFolder, filename);
      
      if (content instanceof ArrayBuffer) {
        fs.writeFileSync(filePath, Buffer.from(content));
      } else if (typeof content === 'string' && content.startsWith('data:')) {
        const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        } else {
          fs.writeFileSync(filePath, content);
        }
      } else {
        fs.writeFileSync(filePath, content as any);
      }
      return { success: true, path: filePath };
    } catch (err: any) {
      console.error('Failed to save file locally:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('read-file-locally', async (event, filename: string, subfolder?: string) => {
    try {
      const targetFolder = getAppStorageFolder(subfolder);
      const filePath = path.join(targetFolder, filename);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return { success: true, data: buffer }; // Send buffer back
      }
      return { success: false, error: 'File not found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-file-locally', async (event, filename: string, subfolder?: string) => {
    try {
      const targetFolder = getAppStorageFolder(subfolder);
      const filePath = path.join(targetFolder, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('generate-excel-locally', async (event, data: any) => {
    try {
      const { generateWorkbookLocally } = await import('./excelGenerator');
      
      let templatePath = path.join(__dirname, '../templates/window-world/btr-window-contract-template.xlsx');
      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(__dirname, '../../server/templates/window-world/btr-window-contract-template.xlsx');
      }

      const buffer = await generateWorkbookLocally(data, templatePath);
      const customerName = data.customer?.lastName || data.customer?.firstName || 'Unknown';
      const filename = `OrderForm_${customerName}_${Date.now()}.xlsx`;
      const targetFolder = getAppStorageFolder('Documents');
      const filePath = path.join(targetFolder, filename);
      
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (err: any) {
      console.error('Failed to generate Excel locally:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup-local-db', async (event, jsonData: string) => {
    try {
      const targetFolder = getAppStorageFolder('Backups');
      const filename = `wwa_local_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(targetFolder, filename);
      fs.writeFileSync(filePath, jsonData);
      return { success: true, path: filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-available', info);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
  });
  
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-error', err.message);
  });
}

app.whenReady().then(async () => {
  try {
    const { session } = await import('electron');
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    });
    console.log('[Desktop] Successfully cleared service worker and cachestorage caches.');
  } catch (err) {
    console.error('[Desktop] Failed to clear storage:', err);
  }
  setupIpcHandlers();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
