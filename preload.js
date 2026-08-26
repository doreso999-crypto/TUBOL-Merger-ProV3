const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  savePdf: (payload) => ipcRenderer.invoke('save-pdf', payload)
});
