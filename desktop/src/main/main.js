const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const backendManager = require('./backend-manager');
const { setupTray } = require('./tray');

let mainWindow = null;
let trayController = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 880,
    minWidth: 960,
    minHeight: 180,
    frame: false, // Frameless window
    backgroundColor: '#12151B',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const distPath = path.join(__dirname, '../../dist/index.html');
  const devIndexPath = path.join(__dirname, '../renderer/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadFile(devIndexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window state change notifications
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', { isFullscreen: true });
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', { isFullscreen: false });
  });
  mainWindow.on('always-on-top-changed', (_event, isAlwaysOnTop) => {
    mainWindow.webContents.send('window-state-changed', { isAlwaysOnTop });
    if (trayController) {
      trayController.updateContextMenu();
    }
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      if (trayController) {
        trayController.updateContextMenu();
      }
    }
  });

  // Initialize System Tray
  trayController = setupTray(mainWindow);
}

// Window control IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-fullscreen-toggle', () => {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.on('window-set-always-on-top', (_event, flag) => {
  if (!mainWindow) return;
  const target = typeof flag === 'boolean' ? flag : !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(target);
  mainWindow.webContents.send('window-state-changed', { isAlwaysOnTop: target });
  if (trayController) {
    trayController.updateContextMenu();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window-is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('window-is-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : false;
});

// Backend management IPC
ipcMain.handle('backend-get-status', () => {
  return backendManager.getStatus();
});

ipcMain.handle('backend-restart', async () => {
  backendManager.stop();
  const res = await backendManager.start();
  if (trayController) trayController.updateContextMenu();
  return res;
});

// Native notifications IPC
ipcMain.on('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'MOEX Screener Signal',
      body: body || '',
      silent: false,
    }).show();
  }
});

// App lifecycle
app.whenReady().then(async () => {
  // Start backend manager in parallel with UI creation
  backendManager.start().then(() => {
    if (trayController) trayController.updateContextMenu();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuiting = true;
  backendManager.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
