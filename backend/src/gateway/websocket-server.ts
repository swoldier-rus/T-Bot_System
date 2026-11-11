import http from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { env } from '../config/env';
import { EventBus } from '../core/event-bus';
import { ModuleManager } from '../core/module-manager';
import { SharedState } from '../core/shared-state';
import { StreamManager } from '../core/stream-manager';
import { TelegramService } from '../core/telegram-service';
import { Candle, IndicatorParams, StockItem } from '../types/market';
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
    | 'SEND_TELEGRAM'
    | 'GET_DEFAULT_TICKERS'
    | 'SET_DEFAULT_TICKERS'
    | 'RESET_DEFAULT_TICKERS'
    | 'GET_FAVORITES'
    | 'APPLY_FAVORITES';
  tickers?: string[];
  listMode?: string;
  params?: Partial<IndicatorParams>;
  text?: string;
  signal?: MarketSignal;
}

export class GatewayWebSocketServer {
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly streamManager: StreamManager,
    private readonly sharedState: SharedState,
    private readonly telegramService?: TelegramService,
    private readonly moduleManager?: ModuleManager,
    private readonly startTime: number = Date.now()
  ) {}

  public init(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/stream' });

    // Listen to dashboard logs from rest-api
    this.eventBus.on('dashboard:log', (entry: any) => {
      this.broadcastDashboardLog(entry);
    });

    // Broadcast periodic metrics to dashboard clients every 1000ms
    this.metricsInterval = setInterval(() => {
      this.broadcastMetrics();
    }, 1000);

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;
      extWs.subscribedTickers = new Set<string>();
      extWs.activeUniverse = new Set<string>(); // Client registers active tickers on open

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

      // 2. If client universe is already specified (reconnect), send filtered snapshot
      if (extWs.activeUniverse && extWs.activeUniverse.size > 0) {
        const snapshot = this.sharedState.getCustomSnapshot(Array.from(extWs.activeUniverse), extWs.indicatorParams);
        extWs.send(
          JSON.stringify({
            event: 'SNAPSHOT',
            data: snapshot,
            timestamp: Date.now(),
          })
        );
      }

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

    // Broadcast individual candle ticks (strictly addressed per client active universe)
    this.eventBus.on('market:candle_tick', (candle: Candle) => {
      this.broadcastCandleTick(candle);
    });

    // Listen to default tickers updates from DatabaseService
    this.eventBus.on('system:default_tickers_updated', (effectiveTickers: string[]) => {
      const globalUnion = this.getGlobalActiveUniverse();
      this.streamManager.syncActiveUniverse(globalUnion).catch(() => {});
      this.broadcastDefaultTickers(effectiveTickers);
    });
  }

  private async handleClientMessage(ws: ExtendedWebSocket, raw: RawData): Promise<void> {
    try {
      const parsed = JSON.parse(raw.toString()) as ClientMessage;

      switch (parsed.action) {
        case 'GET_SNAPSHOT': {
          const currentTickers = ws.activeUniverse && ws.activeUniverse.size > 0
            ? Array.from(ws.activeUniverse)
            : (ws.activeUniverse === null ? null : env.DEFAULT_TICKERS);
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
          if (Array.isArray(parsed.tickers) && parsed.tickers.length > 0) {
            ws.activeUniverse = new Set(parsed.tickers.map((t) => t.toUpperCase()));
          } else if (parsed.listMode === 'all_stocks' || parsed.listMode === 'all') {
            ws.activeUniverse = null;
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
              rsiOversold: typeof parsed.params.rsiOversold === 'number' ? Math.max(10, Math.min(45, parsed.params.rsiOversold)) : (current.rsiOversold ?? 30),
              rsiOverbought: typeof parsed.params.rsiOverbought === 'number' ? Math.max(55, Math.min(90, parsed.params.rsiOverbought)) : (current.rsiOverbought ?? 70),
              stochK: typeof parsed.params.stochK === 'number' ? Math.max(2, Math.min(50, parsed.params.stochK)) : current.stochK,
              stochSmooth: typeof parsed.params.stochSmooth === 'number' ? Math.max(1, Math.min(10, parsed.params.stochSmooth)) : current.stochSmooth,
              stochD: typeof parsed.params.stochD === 'number' ? Math.max(1, Math.min(10, parsed.params.stochD)) : current.stochD,
              stochOversold: typeof parsed.params.stochOversold === 'number' ? Math.max(5, Math.min(40, parsed.params.stochOversold)) : (current.stochOversold ?? 20),
              stochOverbought: typeof parsed.params.stochOverbought === 'number' ? Math.max(60, Math.min(95, parsed.params.stochOverbought)) : (current.stochOverbought ?? 80),
              rvolDays: typeof parsed.params.rvolDays === 'number' ? Math.max(2, Math.min(30, parsed.params.rvolDays)) : current.rvolDays,
              rvolThreshold: typeof parsed.params.rvolThreshold === 'number' ? Math.max(1.1, Math.min(10, parsed.params.rvolThreshold)) : (current.rvolThreshold ?? 2.0),
              nwBandwidth: typeof parsed.params.nwBandwidth === 'number' ? Math.max(1, Math.min(50, parsed.params.nwBandwidth)) : (current.nwBandwidth ?? 8),
              nwMult: typeof parsed.params.nwMult === 'number' ? Math.max(0.5, Math.min(10, parsed.params.nwMult)) : (current.nwMult ?? 3),
              nwRepaint: typeof parsed.params.nwRepaint === 'boolean' ? parsed.params.nwRepaint : (current.nwRepaint ?? true),
              cciPeriod: typeof parsed.params.cciPeriod === 'number' ? Math.max(2, Math.min(100, parsed.params.cciPeriod)) : (current.cciPeriod ?? 20),
              cciOversold: typeof parsed.params.cciOversold === 'number' ? Math.max(-300, Math.min(-50, parsed.params.cciOversold)) : (current.cciOversold ?? -100),
              cciOverbought: typeof parsed.params.cciOverbought === 'number' ? Math.max(50, Math.min(300, parsed.params.cciOverbought)) : (current.cciOverbought ?? 100),
              icebergRatio: typeof parsed.params.icebergRatio === 'number' ? Math.max(1.2, Math.min(20, parsed.params.icebergRatio)) : (current.icebergRatio ?? 2.5),
              icebergMinTrades: typeof parsed.params.icebergMinTrades === 'number' ? Math.max(1, Math.min(30, parsed.params.icebergMinTrades)) : (current.icebergMinTrades ?? 3),
              robotFreq: typeof parsed.params.robotFreq === 'number' ? Math.max(1, Math.min(100, parsed.params.robotFreq)) : (current.robotFreq ?? 5),
              robotBurst: typeof parsed.params.robotBurst === 'number' ? Math.max(3, Math.min(100, parsed.params.robotBurst)) : (current.robotBurst ?? 10),
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

        case 'GET_DEFAULT_TICKERS': {
          const dbService = this.streamManager.getDatabaseService();
          const effective = dbService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
          const hasCustom = dbService.hasCustomDefaultTickers();
          ws.send(
            JSON.stringify({
              event: 'DEFAULT_TICKERS',
              data: {
                tickers: effective,
                isFromEnv: !hasCustom,
                envTickers: env.DEFAULT_TICKERS,
              },
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'SET_DEFAULT_TICKERS': {
          if (Array.isArray(parsed.tickers)) {
            await this.streamManager.updateDefaultTickers(parsed.tickers);
            const dbService = this.streamManager.getDatabaseService();
            const effective = dbService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
            ws.send(
              JSON.stringify({
                event: 'DEFAULT_TICKERS_UPDATED',
                data: {
                  tickers: effective,
                  isFromEnv: !dbService.hasCustomDefaultTickers(),
                  success: true,
                },
                timestamp: Date.now(),
              })
            );
          }
          break;
        }

        case 'RESET_DEFAULT_TICKERS': {
          await this.streamManager.resetDefaultTickers();
          ws.send(
            JSON.stringify({
              event: 'DEFAULT_TICKERS_UPDATED',
              data: {
                tickers: env.DEFAULT_TICKERS,
                isFromEnv: true,
                success: true,
              },
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'GET_FAVORITES': {
          const favInstruments = await this.streamManager.getFavorites();
          const tickers = favInstruments.map((i) => i.ticker);
          const instruments = favInstruments.map((inst) => {
            const stock = this.sharedState.getStockItem(inst.ticker);
            return {
              ticker: inst.ticker,
              name: inst.name || stock?.description || inst.ticker,
              classCode: inst.classCode || 'TQBR',
              price: stock?.price ?? null,
              change: stock?.change ?? 0,
              logoUrl: inst.logoUrl || stock?.logoUrl,
              logoColor: inst.logoColor || stock?.logoColor,
            };
          });
          ws.send(
            JSON.stringify({
              event: 'FAVORITES',
              data: {
                tickers,
                count: tickers.length,
                instruments,
              },
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'APPLY_FAVORITES': {
          const favInstruments = await this.streamManager.getFavorites();
          const tickers = favInstruments.map((i) => i.ticker);
          if (tickers.length > 0) {
            await this.streamManager.updateDefaultTickers(tickers);
          }
          const dbService = this.streamManager.getDatabaseService();
          const effective = dbService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
          ws.send(
            JSON.stringify({
              event: 'FAVORITES_APPLIED',
              data: {
                tickers: effective,
                count: effective.length,
                success: tickers.length > 0,
              },
              timestamp: Date.now(),
            })
          );
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
    const effectiveDefaults = this.streamManager.getDatabaseService().getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
    if (!this.wss || this.wss.clients.size === 0) return new Set(effectiveDefaults);
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

    if (screenerCount === 0) return new Set(effectiveDefaults);
    if (anyWantsAll) return null;
    if (union.size === 0) return new Set(effectiveDefaults);
    return union;
  }

  public broadcastTickerUpdate(stocks: StockItem[]): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && !extWs.subscribedSignals) {
        const clientStocks = extWs.activeUniverse
          ? stocks.filter((s) => extWs.activeUniverse!.has(s.ticker))
          : stocks;

        if (clientStocks.length > 0) {
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
  }

  public broadcastDeltaUpdate(deltas: StockItem[]): void {
    if (!this.wss || this.wss.clients.size === 0 || deltas.length === 0) return;

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && !extWs.subscribedSignals) {
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

  public broadcastCandleTick(candle: Candle): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    const ticker = candle.ticker.toUpperCase();
    const payload = JSON.stringify({
      event: 'CANDLE_TICK',
      data: candle,
      timestamp: Date.now(),
    });

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && !extWs.subscribedSignals) {
        if (extWs.activeUniverse === null || extWs.activeUniverse.has(ticker)) {
          extWs.send(payload);
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

  public broadcastDashboardLog(entry: any): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    const payload = JSON.stringify({
      event: 'STREAM_LOG',
      data: entry,
    });

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && extWs.subscribedSignals) {
        extWs.send(payload);
      }
    }
  }

  private broadcastMetrics(): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    let hasDashboardClient = false;
    for (const client of this.wss.clients) {
      if ((client as ExtendedWebSocket).subscribedSignals) {
        hasDashboardClient = true;
        break;
      }
    }
    if (!hasDashboardClient) return;

    const tgConfig = this.telegramService?.getConfig();
    const telegramStatus = tgConfig
      ? {
          enabled: tgConfig.enabled,
          hasBotToken: !!tgConfig.botToken,
          hasChatId: !!tgConfig.chatId,
          cooldownMinutes: tgConfig.cooldownMinutes,
        }
      : { enabled: false, hasBotToken: false, hasChatId: false, cooldownMinutes: 5 };

    const subscribedTickers = this.streamManager.getSubscribedTickers();
    const dbService = this.streamManager.getDatabaseService();
    const defaultTickers = dbService.getDefaultTickers();
    const hasCustomDefault = dbService.hasCustomDefaultTickers();

    const payload = JSON.stringify({
      event: 'METRICS_UPDATE',
      data: {
        connectionState: this.streamManager.getConnectionState(),
        stats: this.streamManager.getStats(),
        subscribedTickers,
        subscribedCount: subscribedTickers.length,
        defaultTickersCount: defaultTickers.length || env.DEFAULT_TICKERS.length,
        isDefaultFromDb: hasCustomDefault,
        totalStocksInState: this.sharedState.getAllStockItems().length,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        modules: this.moduleManager ? this.moduleManager.getStatuses() : [],
        telegram: telegramStatus,
      },
    });

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && extWs.subscribedSignals) {
        extWs.send(payload);
      }
    }
  }

  public broadcastDefaultTickers(tickers: string[]): void {
    if (!this.wss || this.wss.clients.size === 0) return;
    const isFromDb = this.streamManager.getDatabaseService().hasCustomDefaultTickers();
    const payload = JSON.stringify({
      event: 'DEFAULT_TICKERS_UPDATED',
      data: {
        tickers,
        isFromEnv: !isFromDb,
        count: tickers.length,
        timestamp: Date.now(),
      },
    });

    for (const client of this.wss.clients) {
      const extWs = client as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN && extWs.subscribedSignals) {
        extWs.send(payload);
      }
    }
  }

  public async close(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

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
