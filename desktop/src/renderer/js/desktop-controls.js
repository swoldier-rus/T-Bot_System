// Desktop Window Controls & Backend Bridge Integration

(function () {
  const hasElectron = typeof window.electronAPI !== 'undefined';

  function initDesktopControls() {
    const minBtn = document.getElementById('win-btn-minimize');
    const maxBtn = document.getElementById('win-btn-maximize');
    const fullBtn = document.getElementById('win-btn-fullscreen');
    const closeBtn = document.getElementById('win-btn-close');

    if (!hasElectron) {
      console.warn('Running outside Electron environment. Desktop window controls disabled.');
      if (minBtn) minBtn.style.display = 'none';
      if (maxBtn) maxBtn.style.display = 'none';
      if (fullBtn) fullBtn.style.display = 'none';
      if (closeBtn) closeBtn.style.display = 'none';
      return;
    }

    if (minBtn) {
      minBtn.addEventListener('click', () => {
        window.electronAPI.minimize();
      });
    }

    if (maxBtn) {
      maxBtn.addEventListener('click', () => {
        window.electronAPI.maximize();
      });
    }

    if (fullBtn) {
      fullBtn.addEventListener('click', () => {
        window.electronAPI.toggleFullscreen();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.electronAPI.close();
      });
    }

    // Listen to maximize / unmaximize / fullscreen state
    window.electronAPI.onWindowStateChange((state) => {
      if (maxBtn && typeof state.isMaximized === 'boolean') {
        maxBtn.innerHTML = state.isMaximized ? '&#10697;' : '&#9633;';
        maxBtn.title = state.isMaximized ? 'Восстановить окно' : 'Развернуть';
      }
      if (fullBtn && typeof state.isFullscreen === 'boolean') {
        fullBtn.innerHTML = state.isFullscreen ? '&#10530;' : '&#9974;';
        fullBtn.title = state.isFullscreen ? 'Обычный режим (Esc)' : 'Полный экран';
      }
    });

    // Check backend status periodically
    async function checkBackend() {
      try {
        const info = await window.electronAPI.getBackendStatus();
        const dot = document.getElementById('server-status-dot');
        const pingLabel = document.getElementById('server-ping-label');
        if (!dot || !pingLabel) return;

        if (info && info.status === 'running') {
          dot.className = 'server-dot online';
          if (!window._realWsConnected) {
            pingLabel.textContent = `Backend · ${info.port}`;
            pingLabel.style.color = 'var(--text-secondary)';
          }
        } else {
          dot.className = 'server-dot offline';
          pingLabel.textContent = 'Backend оффлайн';
          pingLabel.style.color = 'var(--signal-sell-text)';
        }
      } catch (e) {
        console.error('Failed to get backend status:', e);
      }
    }

    setInterval(checkBackend, 4000);
    checkBackend();
  }

  // Global helper for firing desktop notifications
  window.triggerDesktopAlert = function (title, body) {
    if (hasElectron) {
      window.electronAPI.showNotification({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  window.addEventListener('DOMContentLoaded', initDesktopControls);
})();
