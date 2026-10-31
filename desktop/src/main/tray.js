const { Tray, Menu, nativeImage, app } = require('electron');
const backendManager = require('./backend-manager');

// 16x16 Yellow/Dark Terminal Icon (Base64 PNG)
const DEFAULT_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAYwM+7f+PR0v1n92g7jAG5CewGlAGm0bkgc3Y1CGbT5wBGBoJ2Y5NEp0/aD4k6g8k+5FtJEYjPvfji6qR3IDyYmgFzV40H5GjGZ/7idqM7D6CRiMAnB9+wSm2OioAAAAASUVORK5CYII=';

let tray = null;

function setupTray(mainWindow) {
  if (tray) return tray;

  const icon = nativeImage.createFromDataURL(DEFAULT_ICON_DATA_URL);
  tray = new Tray(icon);
  tray.setToolTip('MOEX Live Screener Pro');

  const updateContextMenu = () => {
    const backendStatus = backendManager.getStatus();
    const isVisible = mainWindow && mainWindow.isVisible();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Свернуть в трей' : 'Открыть терминал',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: mainWindow && mainWindow.isFullScreen() ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим',
        click: () => {
          if (!mainWindow) return;
          mainWindow.show();
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        },
      },
      { type: 'separator' },
      {
        label: `Бэкенд: ${backendStatus.status === 'running' ? '● В сети (8080)' : '○ Остановлен'}`,
        enabled: false,
      },
      {
        label: 'Перезапустить бэкенд',
        click: async () => {
          backendManager.stop();
          await backendManager.start();
          updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Выход',
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    updateContextMenu();
  });

  return { tray, updateContextMenu };
}

module.exports = { setupTray };
