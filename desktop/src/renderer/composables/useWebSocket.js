import { ref, watch } from 'vue';
import {
  useScreenerState,
  upsertBackendStocks,
  updateSingleStock,
  queueStockUpdates,
  queueCandleTick,
} from './useScreenerState.js';
import { useFavorites } from './useFavorites.js';

const serverOnline = ref(true);
const realConnected = ref(false);
const serverPingLabel = ref('MOEX · 14 мс');

export function useWebSocket() {
  const { assetFilter, filteredAndSortedRows, getActiveTickers } = useScreenerState();
  const {
    getFavoritesArray,
    getTBankFavoritesArray,
    setTBankFavorites,
    fetchTBankFavorites,
  } = useFavorites();

  let ws = null;
  let currentPort = 3001;
  let simInterval = null;
  let universeDebounceTimer = null;

  function sendActiveUniverse() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const mode = assetFilter.value;
      let listMode = 'all_stocks';
      let tickers = null;

      if (mode === 'favorites') {
        listMode = 'favorites';
        tickers = getFavoritesArray();
      } else if (mode === 'bluechips') {
        listMode = 'bluechips';
        tickers = getActiveTickers();
      } else if (mode === 'tbank_favorites') {
        listMode = 'tbank_favorites';
        tickers = getTBankFavoritesArray();
      } else {
        listMode = 'all_stocks';
        tickers = null;
      }

      ws.send(JSON.stringify({
        action: 'SET_ACTIVE_UNIVERSE',
        listMode,
        tickers,
      }));
    }
  }

  // Watch for filter/search/universe changes and debounced delta sync
  watch([assetFilter, () => filteredAndSortedRows.value.length], () => {
    if (assetFilter.value === 'tbank_favorites' && getTBankFavoritesArray().length === 0) {
      fetchTBankFavorites(currentPort);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'GET_FAVORITES' }));
      }
    }

    if (universeDebounceTimer) clearTimeout(universeDebounceTimer);
    universeDebounceTimer = setTimeout(() => {
      sendActiveUniverse();
    }, 250);
  });

  function toggleServerConnection() {
    serverOnline.value = !serverOnline.value;
    if (!serverOnline.value) {
      serverPingLabel.value = 'Нет связи';
      if (ws) {
        ws.close();
        ws = null;
      }
    } else {
      initBackendWs();
    }
  }

  function simulateTickFallback() {
    // Fallback simulation only when backend is completely unavailable
    if (!serverOnline.value || realConnected.value) return;
    const ping = 11 + Math.floor(Math.random() * 8);
    serverPingLabel.value = `MOEX · ${ping} мс (симуляция)`;
  }

  async function initBackendWs() {
    if (!serverOnline.value) return;

    let wsPort = 3001;
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getBackendStatus) {
      try {
        const st = await window.electronAPI.getBackendStatus();
        if (st && st.port) wsPort = st.port;
      } catch (e) {}
    }
    currentPort = wsPort;

    const wsUrl = `ws://127.0.0.1:${wsPort}/stream`;

    function connect() {
      if (!serverOnline.value) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          realConnected.value = true;
          serverOnline.value = true;
          serverPingLabel.value = `WS ${wsPort} · Онлайн`;

          // Stop fallback mock simulation when real backend is connected
          if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
          }

          // Fetch T-Bank favorites immediately upon open (both WS and REST fallback)
          ws.send(JSON.stringify({ action: 'GET_FAVORITES' }));
          fetchTBankFavorites(wsPort);

          sendActiveUniverse();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.event === 'SNAPSHOT' && Array.isArray(msg.data)) {
              upsertBackendStocks(msg.data);
            } else if (msg.event === 'FAVORITES' && msg.data) {
              const tbTickers = Array.isArray(msg.data.tickers) ? msg.data.tickers : [];
              if (tbTickers.length > 0) {
                setTBankFavorites(tbTickers);
              }
            } else if (msg.event === 'DELTA_UPDATE' || msg.event === 'TICKER_UPDATE') {
              if (Array.isArray(msg.data)) {
                queueStockUpdates(msg.data);
              } else if (msg.data && msg.data.ticker) {
                queueStockUpdates([msg.data]);
              }
            } else if (msg.event === 'CANDLE_TICK') {
              if (msg.data) {
                queueCandleTick(msg.data);
              }
            } else if (msg.type === 'ticker' || msg.type === 'candle') {
              if (msg.data) {
                queueCandleTick(msg.data);
              } else {
                queueCandleTick(msg);
              }
            } else if (msg.event === 'SCANNER_SIGNAL') {
              const s = msg.data;
              if (s && s.ticker) {
                const dir = s.direction === 'BUY' ? '🟢 ПОКУПКА' : (s.direction === 'SELL' ? '🔴 ПРОДАЖА' : 'СИГНАЛ');
                const title = `${dir}: ${s.ticker}`;
                const body = s.message || `Сигнал ${s.direction} на MOEX`;
                if (typeof window.triggerDesktopAlert === 'function') {
                  window.triggerDesktopAlert(title, body);
                }
              }
            } else if (msg.event === 'METRICS_UPDATE') {
              if (msg.data && typeof msg.data.subscribedCount === 'number') {
                serverPingLabel.value = `WS ${wsPort} · ${msg.data.subscribedCount} акц.`;
              }
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          realConnected.value = false;
        };

        ws.onclose = () => {
          realConnected.value = false;
          serverPingLabel.value = 'Переподключение...';
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
    // Only schedule fallback ping if offline after initial grace period
    simInterval = setInterval(simulateTickFallback, 3000);
  }

  function stop() {
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
    if (universeDebounceTimer) {
      clearTimeout(universeDebounceTimer);
      universeDebounceTimer = null;
    }
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
    syncFavoritesWithBackend: sendActiveUniverse,
    start,
    stop,
  };
}
