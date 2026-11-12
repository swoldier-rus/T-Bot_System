const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-fullscreen-toggle'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),

  // Backend controls & status
  getBackendStatus: () => ipcRenderer.invoke('backend-get-status'),
  restartBackend: () => ipcRenderer.invoke('backend-restart'),

  // Native notifications
  showNotification: (options) => ipcRenderer.send('show-notification', options),

  // Events from main
  onBackendStatusChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('backend-status-changed', handler);
    return () => ipcRenderer.removeListener('backend-status-changed', handler);
  },
  onWindowStateChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('window-state-changed', handler);
    return () => ipcRenderer.removeListener('window-state-changed', handler);
  },
});
