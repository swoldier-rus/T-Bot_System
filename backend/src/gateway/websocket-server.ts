import http from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { EventBus } from '../core/event-bus';
import { SharedState } from '../core/shared-state';
import { StreamManager } from '../core/stream-manager';
import { TelegramService } from '../core/telegram-service';
import { IndicatorParams, StockItem } from '../types/market';
import { MarketSignal } from '../types/signals';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscribedTickers: Set<string>;
  subscribedSignals: boolean;
  activeUniverse: Set<string> | null; // null = all stocks, Set = specific subset (e.g. 50 favorites or 22 blue chips)
  indicatorParams?: IndicatorParams;
}

interface ClientMessage {
  action:
    | 'SUBSCRIBE'
    | 'UNSUBSCRIBE'
    | 'PING'
    | 'GET_SNAPSHOT'
    | 'SUBSCRIBE_SIGNALS'
    | 'UNSUBSCRIBE_SIGNALS'
    | 'SET_ACTIVE_UNIVERSE'
    | 'SET_INDICATOR_PARAMS'
    | 'SEND_TELEGRAM';
  tickers?: string[];
  listMode?: string;
  params?: Partial<IndicatorParams>;
  text?: string;
  signal?: MarketSignal;
}

export class GatewayWebSocketServer {
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly streamManager: StreamManager,
    private readonly sharedState: SharedState,
    private readonly telegramService?: TelegramService
  ) {}

  public init(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/stream' });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;
      extWs.subscribedTickers = new Set<string>(); // Empty set means receive all tickers
      extWs.activeUniverse = null; // null = receive all stocks

      // Only clients explicitly requesting signals (e.g. Dashboard monitor ?client=dashboard or ?signals=1) receive raw signal events
      const url = req.url || '';
      extWs.subscribedSignals = url.includes('client=dashboard') || url.includes('signals=true') || url.includes('signals=1');

      // 1. Connection acknowledgement
      extWs.send(
        JSON.stringify({
          event: 'CONNECTED',
          message: 'Connected to MOEX Screener Pro Real-Time Engine',
          timestamp: Date.now(),
        })
      );

      // 2. Immediately send current market snapshot
      const snapshot = this.sharedState.getAllStockItems();
      extWs.send(
        JSON.stringify({
          event: 'SNAPSHOT',
          data: snapshot,
          timestamp: Date.now(),
        })
      );

      extWs.on('pong', () => {
        extWs.isAlive = true;
      });

      extWs.on('close', () => {
        if (!extWs.subscribedSignals) {
          const remainingUnion = this.getGlobalActiveUniverse();
          this.streamManager.syncActiveUniverse(remainingUnion).catch(() => {});
        }
      });

      extWs.on('message', (raw: RawData) => {
        this.handleClientMessage(extWs, raw);
      });

      extWs.on('error', (err) => {
        console.error('⚠️ [WebSocket Client Error]:', err.message);
      });
    });

    // 30s ping-pong heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      for (const client of this.wss.clients) {
        const extWs = client as ExtendedWebSocket;
        if (!extWs.isAlive) {
          extWs.terminate();
          continue;
        }
        extWs.isAlive = false;
        extWs.ping();
      }
    }, 30000);

    // Forward scanner signals
    this.eventBus.on('scanner:signal', (signal: MarketSignal) => {
      this.broadcastSignal(signal);
    });

    // Broadcast ticker data updates (heartbeat snapshots)
    this.eventBus.on('market:ticker_update', (stocks: StockItem[]) => {
      this.broadcastTickerUpdate(stocks);
    });

    // Broadcast incremental delta updates (changed stocks only)
    this.eventBus.on('market:delta_update', (deltas: StockItem[]) => {
      this.broadcastDeltaUpdate(deltas);
    });
  }

  private handleClientMessage(ws: ExtendedWebSocket, raw: RawData): void {
    try {
      const parsed = JSON.parse(raw.toString()) as ClientMessage;

      switch (parsed.action) {
        case 'GET_SNAPSHOT': {
          const currentTickers = ws.activeUniverse ? Array.from(ws.activeUniverse) : null;
          const snapshot = this.sharedState.getCustomSnapshot(currentTickers, ws.indicatorParams);
          ws.send(
            JSON.stringify({
              event: 'SNAPSHOT',
              data: snapshot,
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'SUBSCRIBE': {
          if (Array.isArray(parsed.tickers)) {
            const upper = parsed.tickers.map((t) => t.toUpperCase());
            for (const t of upper) {
              ws.subscribedTickers.add(t);
            }
            this.streamManager.subscribe(upper);
            ws.send(
              JSON.stringify({
                event: 'SUBSCRIBED',
                tickers: Array.from(ws.subscribedTickers),
                timestamp: Date.now(),
              })
            );
          }
          break;
        }

        case 'UNSUBSCRIBE': {
          if (Array.isArray(parsed.tickers)) {
            const upper = parsed.tickers.map((t) => t.toUpperCase());
            for (const t of upper) {
              ws.subscribedTickers.delete(t);
            }
            ws.send(
              JSON.stringify({
                event: 'UNSUBSCRIBED',
                tickers: upper,
                timestamp: Date.now(),
              })
            );
          }
          break;
        }

        case 'SUBSCRIBE_SIGNALS': {
          ws.subscribedSignals = true;
          ws.send(
            JSON.stringify({
              event: 'SIGNALS_SUBSCRIBED',
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'UNSUBSCRIBE_SIGNALS': {
          ws.subscribedSignals = false;
          ws.send(
            JSON.stringify({
              event: 'SIGNALS_UNSUBSCRIBED',
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'SET_ACTIVE_UNIVERSE': {
          if (parsed.listMode === 'all_stocks') {
            ws.activeUniverse = null;
          } else if (Array.isArray(parsed.tickers)) {
            ws.activeUniverse = new Set(parsed.tickers.map((t) => t.toUpperCase()));
          }

          // 1. Recalculate global union of all connected tabs
          const globalUnion = this.getGlobalActiveUniverse();
          this.streamManager.syncActiveUniverse(globalUnion).catch(() => {});

          // 2. Send immediate filtered SNAPSHOT strictly for this client's active universe with client's indicatorParams
          const currentTickers = ws.activeUniverse ? Array.from(ws.activeUniverse) : null;
          const filteredSnapshot = this.sharedState.getCustomSnapshot(currentTickers, ws.indicatorParams);

          ws.send(
            JSON.stringify({
              event: 'SNAPSHOT',
              data: filteredSnapshot,
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'SET_INDICATOR_PARAMS': {
          if (parsed.params && typeof parsed.params === 'object') {
            const current = ws.indicatorParams || this.sharedState.getDefaultParams();
            const updated: IndicatorParams = {
              rsiPeriod: typeof parsed.params.rsiPeriod === 'number' ? Math.max(2, Math.min(50, parsed.params.rsiPeriod)) : current.rsiPeriod,
              stochK: typeof parsed.params.stochK === 'number' ? Math.max(2, Math.min(50, parsed.params.stochK)) : current.stochK,
              stochSmooth: typeof parsed.params.stochSmooth === 'number' ? Math.max(1, Math.min(10, parsed.params.stochSmooth)) : current.stochSmooth,
              stochD: typeof parsed.params.stochD === 'number' ? Math.max(1, Math.min(10, parsed.params.stochD)) : current.stochD,
              rvolDays: typeof parsed.params.rvolDays === 'number' ? Math.max(2, Math.min(30, parsed.params.rvolDays)) : current.rvolDays,
              nwBandwidth: typeof parsed.params.nwBandwidth === 'number' ? Math.max(1, Math.min(50, parsed.params.nwBandwidth)) : (current.nwBandwidth ?? 8),
              nwMult: typeof parsed.params.nwMult === 'number' ? Math.max(0.5, Math.min(10, parsed.params.nwMult)) : (current.nwMult ?? 3),
              nwRepaint: typeof parsed.params.nwRepaint === 'boolean' ? parsed.params.nwRepaint : (current.nwRepaint ?? false),
              cciPeriod: typeof parsed.params.cciPeriod === 'number' ? Math.max(2, Math.min(100, parsed.params.cciPeriod)) : (current.cciPeriod ?? 20),
            };
            ws.indicatorParams = updated;

            // Update default params on server and emit event for background Telegram scanner
            this.sharedState.updateDefaultParams(updated);
            (this.eventBus as any).emit('system:indicator_params_updated', updated);

            // Send immediate customized snapshot back to this client
            const tickers = ws.activeUniverse ? Array.from(ws.activeUniverse) : null;
            const customSnapshot = this.sharedState.getCustomSnapshot(tickers, updated);
            ws.send(
              JSON.stringify({
                event: 'SNAPSHOT',
                data: customSnapshot,
                indicatorParams: updated,
                timestamp: Date.now(),
              })
            );
          }
          break;
        }

        case 'PING': {
          ws.send(
            JSON.stringify({
              event: 'PONG',
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'SEND_TELEGRAM': {
          if (!this.telegramService) {
            ws.send(
              JSON.stringify({
                event: 'TELEGRAM_SENT',
                success: false,
                error: 'Telegram service is not initialized on server',
                timestamp: Date.now(),
              })
            );
            break;
          }

          const { text, signal } = parsed;
          let sendPromise: Promise<{ success: boolean; error?: string }>;
          if (signal) {
            sendPromise = this.telegramService.sendSignalAlert(signal, true);
          } else if (text) {
            sendPromise = this.telegramService.sendMessage(String(text));
          } else {
            sendPromise = Promise.resolve({ success: false, error: 'Neither "text" nor "signal" provided' });
          }

          sendPromise.then((result) => {
            ws.send(
              JSON.stringify({
                event: 'TELEGRAM_SENT',
                success: result.success,
                error: result.error,
                timestamp: Date.now(),
              })
            );
          });
          break;
        }

        default:
          ws.send(
            JSON.stringify({
              event: 'ERROR',
              message: `Unknown action: ${(parsed as any).action}`,
            })
          );
      }
    } catch {
      ws.send(
        JSON.stringify({
          event: 'ERROR',
          message: 'Invalid JSON payload received',
        })
      );
    }
  }

  public getGlobalActiveUniverse(): Set<string> | null {
    if (!this.wss || this.wss.clients.size === 0) return null;
    let anyWantsAll = false;
    const union = new Set<string>();
    let screenerCount = 0;

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      // Игнорируем мониторы логов и дашборд — они не должны навязывать список скринеру
      if (extWs.subscribedSignals) {
        continue;
      }

      if (extWs.readyState === WebSocket.OPEN) {
        screenerCount++;
        if (extWs.activeUniverse === null) {
          anyWantsAll = true;
          break;
        }
        for (const t of extWs.activeUniverse) {
          union.add(t);
        }
      }
    }

    if (screenerCount === 0 || anyWantsAll) return null;
    return union;
  }

  public broadcastTickerUpdate(stocks: StockItem[]): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN) {
        const clientStocks = extWs.activeUniverse
          ? stocks.filter((s) => extWs.activeUniverse!.has(s.ticker))
          : stocks;

        const formatted = this.sharedState.formatStocksForClient(clientStocks, extWs.indicatorParams);

        extWs.send(
          JSON.stringify({
            event: 'TICKER_UPDATE',
            data: formatted,
            timestamp: Date.now(),
          })
        );
      }
    }
  }

  public broadcastDeltaUpdate(deltas: StockItem[]): void {
    if (!this.wss || this.wss.clients.size === 0 || deltas.length === 0) return;

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN) {
        const clientDeltas = extWs.activeUniverse
          ? deltas.filter((d) => extWs.activeUniverse!.has(d.ticker))
          : deltas;

        if (clientDeltas.length > 0) {
          const formatted = this.sharedState.formatStocksForClient(clientDeltas, extWs.indicatorParams);
          extWs.send(
            JSON.stringify({
              event: 'DELTA_UPDATE',
              data: formatted,
              timestamp: Date.now(),
            })
          );
        }
      }
    }
  }

  public broadcastSignal(signal: MarketSignal): void {
    if (!this.wss) return;

    const payload = JSON.stringify(signal);
    const ticker = signal.ticker.toUpperCase();

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      // Only broadcast signals to clients that explicitly subscribed to them (e.g. Dashboard monitor)
      if (extWs.readyState === WebSocket.OPEN && extWs.subscribedSignals) {
        if (
          extWs.subscribedTickers.size === 0 ||
          extWs.subscribedTickers.has(ticker)
        ) {
          extWs.send(payload);
        }
      }
    }
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      for (const client of this.wss.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve());
      });
      this.wss = null;
    }
  }
}
