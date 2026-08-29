const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 620,
    backgroundColor: '#0f172a',
    title: 'TUBOL Merger Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('save-pdf', async (_event, payload) => {
  try {
    if (!payload || !payload.base64) throw new Error('No PDF data was provided.');
    const defaultPath = String(payload.defaultPath || 'merged.pdf').replace(/[\\/:*?"<>|]/g, '-');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save PDF',
      defaultPath,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { canceled: true };

    const bytes = Buffer.from(payload.base64, 'base64');
    await fs.writeFile(filePath, bytes);
    return { canceled: false, filePath };
  } catch (error) {
    console.error('save-pdf failed:', error);
    return { canceled: false, error: error?.message || String(error) };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
