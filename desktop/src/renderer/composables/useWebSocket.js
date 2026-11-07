import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useScreenerState } from './useScreenerState';
import { useFavorites } from './useFavorites';

const serverOnline = ref(true);
const realConnected = ref(false);
const serverPingLabel = ref('MOEX · 14 мс');

export function useWebSocket() {
  const { instruments, assetFilter } = useScreenerState();
  const { favorites, getFavoritesArray } = useFavorites();
  let ws = null;
  let simInterval = null;
  let pingInterval = null;

  function syncFavoritesWithBackend() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'SET_ACTIVE_UNIVERSE',
        listMode: 'favorites',
        tickers: getFavoritesArray(),
      }));
    }
  }

  // Watch for assetFilter changes
  watch(assetFilter, (newVal) => {
    if (newVal === 'favorites') {
      syncFavoritesWithBackend();
    } else {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'SET_ACTIVE_UNIVERSE', listMode: 'all_stocks' }));
      }
    }
  });

  function toggleServerConnection() {
    serverOnline.value = !serverOnline.value;
    if (!serverOnline.value) {
      serverPingLabel.value = 'Нет связи';
    } else {
      serverPingLabel.value = realConnected.value ? 'WS 3001 · 0ms' : 'MOEX · 14 мс';
    }
  }

  function simulateTick() {
    if (!serverOnline.value) return;
    const randomIdx = Math.floor(Math.random() * instruments.length);
    const item = instruments[randomIdx];
    if (!item) return;

    const pctDelta = (Math.random() - 0.49) * 0.35;
    item.price = Math.max(1, Number((item.price * (1 + pctDelta / 100)).toFixed(2)));
    item.change = Number((item.change + pctDelta * 0.4).toFixed(2));
    item.volDiffBase = Number((item.volDiffBase + (Math.random() - 0.46) * 2.2).toFixed(1));

    item.rsi = Math.max(14, Math.min(86, Number((item.rsi + (Math.random() - 0.5) * 1.4).toFixed(1))));
    item.stch = Math.max(8, Math.min(94, Number((item.stch + (Math.random() - 0.5) * 1.8).toFixed(1))));
    item.cci = Math.max(-195, Math.min(195, Math.round(item.cci + (Math.random() - 0.5) * 7)));

    if (!realConnected.value) {
      const ping = 11 + Math.floor(Math.random() * 8);
      serverPingLabel.value = `MOEX · ${ping} мс`;
    }
  }

  async function initBackendWs() {
    let wsPort = 3001;
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getBackendStatus) {
      try {
        const st = await window.electronAPI.getBackendStatus();
        if (st && st.port) wsPort = st.port;
      } catch (e) {}
    }

    const wsUrl = `ws://127.0.0.1:${wsPort}/stream`;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          realConnected.value = true;
          serverOnline.value = true;
          serverPingLabel.value = `WS ${wsPort} · 0ms`;
          if (assetFilter.value === 'favorites') {
            syncFavoritesWithBackend();
          } else {
            ws.send(JSON.stringify({ action: 'SET_ACTIVE_UNIVERSE', listMode: 'all_stocks' }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'SNAPSHOT' && Array.isArray(msg.data)) {
              msg.data.forEach(item => {
                const match = instruments.find(i => i.ticker === item.ticker);
                if (match) {
                  if (item.logoUrl) match.logoUrl = item.logoUrl;
                  if (item.logoColor) match.logoColor = item.logoColor;
                  if (item.price) match.price = item.price;
                  if (item.change !== undefined) match.change = item.change;
                  if (item.description) match.fullName = item.description;
                }
              });
            } else if (msg.type === 'ticker' || msg.type === 'candle' || msg.ticker) {
              const match = instruments.find(i => i.ticker === msg.ticker);
              if (match) {
                if (msg.price) match.price = msg.price;
                if (msg.change !== undefined) match.change = msg.change;
                if (msg.rsi !== undefined) match.rsi = msg.rsi;
                if (msg.nw) match.nw = msg.nw;
                if (msg.cci !== undefined) match.cci = msg.cci;
                if (msg.stch !== undefined) match.stch = msg.stch;
              }
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          realConnected.value = false;
        };

        ws.onclose = () => {
          realConnected.value = false;
          setTimeout(connect, 3000);
        };
      } catch (e) {
        realConnected.value = false;
        setTimeout(connect, 3000);
      }
    }

    connect();
  }

  function start() {
    initBackendWs();
    simInterval = setInterval(simulateTick, 1600);
  }

  function stop() {
    if (simInterval) clearInterval(simInterval);
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  return {
    serverOnline,
    realConnected,
    serverPingLabel,
    toggleServerConnection,
    syncFavoritesWithBackend,
    start,
    stop,
  };
}
