import fs from 'fs';
import path from 'path';
import { ChannelCredentials, createChannel } from 'nice-grpc';
import { Helpers, TinkoffInvestApi } from 'tinkoff-invest-api';
import { InstrumentStatus } from 'tinkoff-invest-api/dist/generated/common';
import {
  CandleInterval,
  LastPriceType,
  SubscriptionAction,
  SubscriptionInterval,
  TradeSourceType,
} from 'tinkoff-invest-api/dist/generated/marketdata';
import { env } from '../config/env';
import { MOEX_TOP_SHARES } from '../config/moex-instruments';
import {
  Candle,
  Instrument,
  OrderBook,
  OrderBookLevel,
  TradeDirection,
  TradeEvent,
} from '../types/market';
import { EventBus } from './event-bus';
import { SharedState } from './shared-state';
import { DatabaseService } from './database-service';

export interface StreamStats {
  fps: number;
  candleCount: number;
  tradeCount: number;
  orderBookCount: number;
  totalPackets: number;
  lastPacketTime: number;
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'MOCK_STREAM';

/**
 * Patch TinkoffInvestApi.prototype.createChannel to configure TLS credentials for T-Bank gRPC endpoints.
 * In Russia, T-Bank services use the Russian National Root CA (Минцифры РФ).
 * Configuring rejectUnauthorized: false prevents "self-signed certificate in certificate chain" errors.
 */
(TinkoffInvestApi.prototype as any).createChannel = function (this: any) {
  const { endpoint, channelOptions } = this.options;
  const credentials = /^localhost/i.test(endpoint)
    ? ChannelCredentials.createInsecure()
    : ChannelCredentials.createSsl(null, null, null, {
        rejectUnauthorized: env.TINKOFF_REJECT_UNAUTHORIZED ?? false,
      });
  return createChannel(endpoint, credentials, channelOptions);
};

export class StreamManager {
  private api: TinkoffInvestApi | null = null;
  private connectionState: ConnectionState = 'DISCONNECTED';
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private mockIntervalTimer: NodeJS.Timeout | null = null;
  private statsIntervalTimer: NodeJS.Timeout | null = null;
  private broadcastIntervalTimer: NodeJS.Timeout | null = null;
  private priceRefreshTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastStreamErrorLog = 0;

  // Set of subscribed tickers
  private readonly subscribedTickers = new Set<string>();
  private currentSubscribed = new Set<string>();

  // Metrics tracking
  private packetCounter = 0;
  private candleCounter = 0;
  private tradeCounter = 0;
  private orderBookCounter = 0;
  private totalPackets = 0;
  private currentFps = 0;
  private lastPacketTimestamp = 0;

  constructor(
    private readonly eventBus: EventBus,
    private readonly sharedState: SharedState,
    private readonly databaseService: DatabaseService = new DatabaseService()
  ) {
    // Pre-populate known MOEX instruments in shared state
    for (const inst of MOEX_TOP_SHARES) {
      this.sharedState.setInstrument(inst);
    }
    // Subscribe to effective default tickers (DB if populated, else .env)
    const effectiveDefaults = this.databaseService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
    for (const ticker of effectiveDefaults) {
      this.subscribedTickers.add(ticker.toUpperCase());
      this.currentSubscribed.add(ticker.toUpperCase());
    }
  }

  public getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  public async updateDefaultTickers(tickers: string[]): Promise<void> {
    this.databaseService.setDefaultTickers(tickers);
    const effective = this.databaseService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
    console.info(`💾 Updated default tickers in SQLite (${tickers.length} saved)`);
    this.eventBus.emit('system:default_tickers_updated', effective);
  }

  public async resetDefaultTickers(): Promise<void> {
    this.databaseService.clearDefaultTickers();
    console.info(`🔄 Reset default tickers in SQLite, reverted to .env (${env.DEFAULT_TICKERS.length} items)`);
    this.eventBus.emit('system:default_tickers_updated', env.DEFAULT_TICKERS);
  }

  /**
   * Fetches favorite instruments from T-Bank API via InstrumentsService.GetFavorites.
   * Filters the returned instruments strictly to MOEX (TQBR) shares present in the screener catalog.
   */
  public async getFavorites(): Promise<Instrument[]> {
    if (!this.api) {
      // Mock mode or not connected yet: return known blue chips from shared state as mock favorites
      const topTickers = ['SBER', 'GAZP', 'LKOH', 'GMKN', 'NVTK', 'ROSN', 'YDEX', 'T'];
      const mockFavs = topTickers
        .map((t) => this.sharedState.getInstrument(t))
        .filter((inst): inst is Instrument => !!inst);
      return mockFavs;
    }

    try {
      const resp = await this.api.instruments.getFavorites({});
      const favList = resp.favoriteInstruments || [];

      const result: Instrument[] = [];
      const seenTickers = new Set<string>();

      for (const item of favList) {
        const ticker = item.ticker ? item.ticker.trim().toUpperCase() : '';
        if (!ticker || seenTickers.has(ticker)) continue;

        // Check if instrument is a known MOEX TQBR share in shared state
        const catalogInst = this.sharedState.getInstrument(ticker);
        if (catalogInst && (catalogInst.classCode === 'TQBR' || item.classCode === 'TQBR')) {
          seenTickers.add(ticker);
          result.push(catalogInst);
          continue;
        }

        // If not in sharedState yet, only include if classCode is explicitly TQBR
        if (item.classCode === 'TQBR') {
          seenTickers.add(ticker);
          const inst: Instrument = {
            figi: item.figi,
            ticker,
            name: item.name || ticker,
            classCode: 'TQBR',
          };
          this.sharedState.setInstrument(inst);
          result.push(inst);
        }
      }

      console.info(
        `💛 Loaded ${result.length} MOEX TQBR favorite instruments from T-Bank API (out of ${favList.length} total favorites)`
      );
      return result;
    } catch (err: any) {
      console.warn('⚠️ Could not load favorites from T-Bank API:', err?.message || err);
      return [];
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getStats(): StreamStats {
    return {
      fps: this.currentFps,
      candleCount: this.candleCounter,
      tradeCount: this.tradeCounter,
      orderBookCount: this.orderBookCounter,
      totalPackets: this.totalPackets,
      lastPacketTime: this.lastPacketTimestamp,
    };
  }

  public getSubscribedTickers(): string[] {
    return Array.from(this.currentSubscribed);
  }

  /**
   * Starts the stream manager. If valid TINKOFF_TOKEN is provided, connects to gRPC.
   * Otherwise launches realistic mock stream for local testing.
   */
  public async start(): Promise<void> {
    this.startStatsTimer();
    this.startTickerBroadcastTimer();

    const token = env.TINKOFF_TOKEN?.trim();
    const isMock = !token || token.startsWith('t.your_api_token') || token === '';

    if (isMock) {
      this.startMockStream();
      return;
    }

    await this.connectGrpc();
  }

  /**
   * Graceful shutdown of gRPC stream or mock generator.
   */
  public async stop(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.mockIntervalTimer) {
      clearInterval(this.mockIntervalTimer);
      this.mockIntervalTimer = null;
    }

    if (this.statsIntervalTimer) {
      clearInterval(this.statsIntervalTimer);
      this.statsIntervalTimer = null;
    }

    if (this.broadcastIntervalTimer) {
      clearInterval(this.broadcastIntervalTimer);
      this.broadcastIntervalTimer = null;
    }

    if (this.priceRefreshTimer) {
      clearInterval(this.priceRefreshTimer);
      this.priceRefreshTimer = null;
    }

    // Unsubscribe all active gRPC subscriptions
    if (this.currentSubscribed.size > 0 && this.connectionState === 'CONNECTED') {
      const insts = this.getInstrumentsForTickers(this.currentSubscribed);
      this.sendGrpcUnsubscribe(insts);
      this.currentSubscribed.clear();
      this.subscribedTickers.clear();
    }

    if (this.api?.stream?.market) {
      try {
        await this.api.stream.market.cancel();
      } catch {
        // ignore
      }
    }

    this.connectionState = 'DISCONNECTED';
    this.eventBus.emit('stream:disconnected', { timestamp: Date.now() });
  }

  public async subscribe(tickers: string[]): Promise<void> {
    const updated = new Set(this.currentSubscribed.size > 0 ? this.currentSubscribed : this.subscribedTickers);
    for (const t of tickers) {
      updated.add(t.toUpperCase());
    }
    await this.syncActiveUniverse(updated);
  }

  public async unsubscribe(tickers: string[]): Promise<void> {
    const updated = new Set(this.currentSubscribed.size > 0 ? this.currentSubscribed : this.subscribedTickers);
    for (const t of tickers) {
      updated.delete(t.toUpperCase());
    }
    await this.syncActiveUniverse(updated);
  }

  public async syncActiveUniverse(targetTickers: Set<string> | null): Promise<void> {
    // 1. Determine target ticker set
    let targetSet: Set<string>;
    if (targetTickers === null) {
      // Client explicitly requested all MOEX instruments
      const all = this.sharedState.getAllInstruments();
      targetSet = new Set(all.map((i) => i.ticker.toUpperCase()));
      console.info(`🌐 Active universe: ALL MOEX instruments (${targetSet.size})`);
    } else if (targetTickers.size === 0) {
      // Fallback: no clients connected, revert to effective defaults (DB if set, else .env)
      const effective = this.databaseService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
      targetSet = new Set(effective.map((t) => t.toUpperCase()));
      const source = this.databaseService.hasCustomDefaultTickers() ? 'SQLite DB' : '.env';
      console.info(`💤 No active clients, reverting to default tickers from ${source} (${targetSet.size})`);
    } else {
      targetSet = new Set(Array.from(targetTickers).map((t) => t.toUpperCase()));
      console.info(
        `🎯 Active universe requested: ${targetSet.size} instruments (${Array.from(targetSet).slice(0, 8).join(', ')}${targetSet.size > 8 ? '...' : ''})`
      );
    }

    // 2. Differential delta calculation
    // toSubscribe = targetSet \ currentSubscribed
    const toSubscribe = new Set<string>();
    for (const t of targetSet) {
      if (!this.currentSubscribed.has(t)) {
        toSubscribe.add(t);
      }
    }

    // toUnsubscribe = currentSubscribed \ targetSet
    const toUnsubscribe = new Set<string>();
    for (const t of this.currentSubscribed) {
      if (!targetSet.has(t)) {
        toUnsubscribe.add(t);
      }
    }

    if (toSubscribe.size === 0 && toUnsubscribe.size === 0) {
      return; // Delta is empty
    }

    console.info(
      `📊 Delta Sync: +${toSubscribe.size} to subscribe, -${toUnsubscribe.size} to unsubscribe. Current active: ${this.currentSubscribed.size} -> Target: ${targetSet.size}`
    );

    // 3. Handle MOCK_STREAM mode
    if (this.connectionState === 'MOCK_STREAM') {
      for (const t of toUnsubscribe) {
        this.subscribedTickers.delete(t);
        this.currentSubscribed.delete(t);
      }
      for (const t of toSubscribe) {
        this.subscribedTickers.add(t);
        this.currentSubscribed.add(t);
      }
      return;
    }

    // 4. Handle gRPC live mode
    if (this.connectionState === 'CONNECTED' && this.api) {
      // Unsubscribe delta
      if (toUnsubscribe.size > 0) {
        const instrumentsToUnsub = this.getInstrumentsForTickers(toUnsubscribe);
        if (instrumentsToUnsub.length > 0) {
          this.sendGrpcUnsubscribe(instrumentsToUnsub);
          for (const t of toUnsubscribe) {
            this.currentSubscribed.delete(t);
            this.subscribedTickers.delete(t);
          }
          console.info(
            `🔻 [gRPC Unsubscribe]: -${instrumentsToUnsub.length} tickers: ${instrumentsToUnsub.map((i) => i.ticker).slice(0, 10).join(', ')}${instrumentsToUnsub.length > 10 ? '...' : ''}`
          );
        }
      }

      // Subscribe delta
      if (toSubscribe.size > 0) {
        const instrumentsToSub = this.getInstrumentsForTickers(toSubscribe);
        if (instrumentsToSub.length > 0) {
          this.sendGrpcSubscribe(instrumentsToSub);
          for (const t of toSubscribe) {
            this.currentSubscribed.add(t);
            this.subscribedTickers.add(t);
          }
          console.info(
            `🔺 [gRPC Subscribe]: +${instrumentsToSub.length} tickers: ${instrumentsToSub.map((i) => i.ticker).slice(0, 10).join(', ')}${instrumentsToSub.length > 10 ? '...' : ''}`
          );

          // Pointwise fetch lastPrices, closePrices and warmup candles for newly added tickers
          this.warmupNewTickers(instrumentsToSub).catch((err) => {
            console.warn('⚠️ Pointwise warmup error:', err.message);
          });
        }
      }
    } else {
      // If not connected yet, update sets so upon connection they are subscribed
      for (const t of toUnsubscribe) {
        this.subscribedTickers.delete(t);
        this.currentSubscribed.delete(t);
      }
      for (const t of toSubscribe) {
        this.subscribedTickers.add(t);
        this.currentSubscribed.add(t);
      }
    }
  }

  // --- gRPC Connection & Reconnection Management ---

  private async connectGrpc(): Promise<void> {
    this.connectionState = 'CONNECTING';

    try {
      // 1. Clean up old api stream listeners if api already exists
      if (this.api?.stream?.market) {
        try {
          (this.api.stream.market as any).emitter?.removeAllListeners();
          await this.api.stream.market.cancel();
        } catch {
          // ignore cleanup errors
        }
      }

      const api = new TinkoffInvestApi({
        token: env.TINKOFF_TOKEN,
        appName: env.TINKOFF_APP_NAME,
        endpoint: env.TINKOFF_ENDPOINT,
      });
      this.api = api;

      // Disable internal autoReconnect in TinkoffInvestApi to avoid competing
      // with StreamManager's own exponential backoff reconnection loop
      if ((api.stream.market as any).options) {
        (api.stream.market as any).options.autoReconnect = false;
      }

      // 2. Initial bootstrap: fetch instruments, prices and warmup only once on startup
      if (!this.isInitialized) {
        // Fetch all MOEX TQBR shares to populate full list of ~250 stocks
        try {
          const sharesRes = await api.instruments.shares({
            instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE,
          });

          if (sharesRes.instruments) {
            const tqbrShares = sharesRes.instruments.filter(
              (s) => s.classCode === 'TQBR' || s.currency === 'rub'
            );

            for (const s of tqbrShares) {
              let logoUrl: string | undefined;
              let logoColor: string | undefined;
              if (s.brand?.logoName) {
                const base = s.brand.logoName.replace(/\.png$/i, '');
                logoUrl = `https://invest-brands.cdn-tinkoff.ru/${base}x160.png`;
                logoColor = s.brand.logoBaseColor || undefined;
              }

              const inst: Instrument = {
                figi: s.figi,
                ticker: s.ticker,
                name: s.name,
                classCode: s.classCode,
                lot: s.lot,
                logoUrl,
                logoColor,
              };
              this.sharedState.setInstrument(inst);
            }
            console.info(`📋 Loaded ${tqbrShares.length} MOEX TQBR instruments from T-Bank API`);
          }
        } catch (err: any) {
          console.warn('⚠️ Could not load instruments list via API:', err.message);
        }

        // Fetch Close Prices for percentage calculation
        try {
          const allInst = this.sharedState.getAllInstruments();
          const closeResp = await api.marketdata.getClosePrices({
            instruments: allInst.map((i) => ({ instrumentId: i.figi })),
          });
          if (closeResp.closePrices) {
            for (const cp of closeResp.closePrices) {
              const price = Helpers.toNumber(cp.price);
              if (price && price > 0) {
                this.sharedState.setClosePrice(cp.figi, price);
              }
            }
          }
        } catch (e: any) {
          console.warn('⚠️ Could not load close prices:', e.message);
        }

        // Fetch Last Traded Prices so every stock has current real market price immediately
        try {
          const allInst = this.sharedState.getAllInstruments();
          const figis = allInst.map((i) => i.figi);
          const lastPricesResp = await api.marketdata.getLastPrices({
            figi: figis,
            instrumentId: figis,
            lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE ?? 1,
          });
          if (lastPricesResp.lastPrices) {
            for (const lp of lastPricesResp.lastPrices) {
              const price = Helpers.toNumber(lp.price);
              if (price && price > 0) {
                this.sharedState.setLastPrice(lp.figi, price);
              }
            }
            console.info(
              `💰 Loaded last traded prices for ${lastPricesResp.lastPrices.length} instruments`
            );
          }
        } catch (err: any) {
          console.warn('⚠️ Could not load last prices:', err.message);
        }

        // Warmup historical candles for immediate RSI & Stochastic calculation
        await this.warmupHistoricalData(api);

        // Start periodic refresh of last & close prices for all instruments
        this.startPriceRefreshTimer();

        this.isInitialized = true;
      }

      // 3. Stream event listeners
      api.stream.market.on('open', () => {
        this.reconnectAttempt = 0;
        this.connectionState = 'CONNECTED';
        this.eventBus.emit('stream:connected', { timestamp: Date.now() });

        // If reconnecting, re-subscribe whatever tickers are currently active
        if (this.currentSubscribed.size > 0) {
          const instruments = this.getInstrumentsForTickers(this.currentSubscribed);
          this.sendGrpcSubscribe(instruments);
        }
      });

      api.stream.market.on('close', (error?: Error) => {
        this.connectionState = 'DISCONNECTED';
        this.eventBus.emit('stream:disconnected', {
          error: error?.message,
          timestamp: Date.now(),
        });
        this.scheduleReconnect();
      });

      api.stream.market.on('error', (error: Error) => {
        const now = Date.now();
        if (now - this.lastStreamErrorLog > 10000) {
          this.lastStreamErrorLog = now;
          console.error('⚠️ [gRPC Stream Error]:', error.message);
        }
      });

      // Stream market data router
      api.stream.market.on('data', (d: any) => {
        if (d.candle) {
          this.handleRawCandle(d.candle);
        }
        if (d.orderbook) {
          this.handleRawOrderBook(d.orderbook);
        }
        if (d.trade) {
          this.handleRawTrade(d.trade);
        }
      });

      // Ensure bidirectional stream is open
      (api.stream.market as any).ensureConnected();

      // Perform subscription for active target tickers
      const targetTickers = this.currentSubscribed.size > 0
        ? this.currentSubscribed
        : (this.subscribedTickers.size > 0 ? this.subscribedTickers : new Set(this.databaseService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS)));
      const instrumentsToSub = this.getInstrumentsForTickers(targetTickers);
      if (instrumentsToSub.length > 0) {
        this.sendGrpcSubscribe(instrumentsToSub);
        this.currentSubscribed = new Set(instrumentsToSub.map((i) => i.ticker));
        this.subscribedTickers.clear();
        for (const t of this.currentSubscribed) {
          this.subscribedTickers.add(t);
        }
        console.info(
          `⚡ [gRPC Stream Initialized]: Subscribed to ${this.currentSubscribed.size} instruments: ${Array.from(this.currentSubscribed).join(', ')}`
        );
      }

      this.connectionState = 'CONNECTED';
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to establish gRPC stream connection:', errorMsg);
      this.scheduleReconnect();
    }
  }

  private async warmupHistoricalData(api: TinkoffInvestApi): Promise<void> {
    const cachedCount = await this.loadCandlesCache();
    if (cachedCount > 0) {
      console.info(`⚡ Restored ${cachedCount} candles from local disk cache! Instant warmup active.`);
    }

    const effectiveDefaults = this.databaseService.getEffectiveDefaultTickers(env.DEFAULT_TICKERS);
    const priorityTickers = Array.from(
      new Set([
        ...effectiveDefaults,
        ...MOEX_TOP_SHARES.slice(0, 10).map((s) => s.ticker),
      ])
    );
    console.info(`⏳ Warming up historical candles (gap stitching) for ${priorityTickers.length} active priority shares...`);

    const priorityQueue = [...priorityTickers];
    let priorityWarmed = 0;
    const priorityWorker = async () => {
      while (priorityQueue.length > 0) {
        const ticker = priorityQueue.shift();
        if (ticker) {
          const ok = await this.fetchCandlesForTicker(ticker, false);
          if (ok) priorityWarmed++;
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    };

    await Promise.all([
      priorityWorker(),
      priorityWorker(),
      priorityWorker(),
    ]);

    console.info(`✅ Priority warmup complete: pre-calculated RSI & Stoch for ${priorityWarmed} instruments.`);
    await this.saveCandlesCache();
  }

  /**
   * Computes the optimal 'from' date for fetching candles with Gap Stitching.
   * If local cache has sufficient history and is up to date, returns null (skip request).
   * If local cache has history but is behind, returns (lastCachedTime - intervalMs) to fetch only the missing delta.
   * If cache has insufficient bars, returns the full lookback window.
   */
  private getOptimalFromDate(
    ticker: string,
    tf: string,
    intervalMs: number,
    minCount: number,
    defaultLookbackMs: number,
    forceFresh: boolean
  ): Date | null {
    if (forceFresh) {
      return new Date(Date.now() - defaultLookbackMs);
    }

    const candles = this.sharedState.getCandles(ticker, tf);
    if (candles.length >= minCount) {
      const lastTime = candles[candles.length - 1].time;
      const now = Date.now();
      // If the latest cached bar is within one bar duration, it's already fresh!
      if (now - lastTime < intervalMs) {
        return null;
      }
      // Gap stitching: request from (lastCachedTime - intervalMs) to overlap by 1 bar and stitch missing delta
      return new Date(lastTime - intervalMs);
    }

    // Insufficient history in cache: request full required lookback (e.g. 500 bars for 5m)
    return new Date(Date.now() - defaultLookbackMs);
  }

  private async fetchCandlesForTicker(ticker: string, forceFresh = false): Promise<boolean> {
    if (!this.api) return false;
    const inst = this.sharedState.getInstrument(ticker);
    if (!inst) return false;

    const now = new Date();
    // 5m: 500 bars (~6 trading days on MOEX)
    const from5m = this.getOptimalFromDate(ticker, '5m', 5 * 60 * 1000, 300, 6 * 24 * 60 * 60 * 1000, forceFresh);
    // 15m: 300 bars (~15 trading days)
    const from15m = this.getOptimalFromDate(ticker, '15m', 15 * 60 * 1000, 200, 15 * 24 * 60 * 60 * 1000, forceFresh);
    // 1h: 200 bars (~40 days)
    const from1h = this.getOptimalFromDate(ticker, '1h', 60 * 60 * 1000, 150, 40 * 24 * 60 * 60 * 1000, forceFresh);
    // 4h: 100 bars (~90 days)
    const from4h = this.getOptimalFromDate(ticker, '4h', 4 * 60 * 60 * 1000, 80, 90 * 24 * 60 * 60 * 1000, forceFresh);
    // 1d: 50 bars (~365 days)
    const from1d = this.getOptimalFromDate(ticker, '1d', 24 * 60 * 60 * 1000, 30, 365 * 24 * 60 * 60 * 1000, forceFresh);

    // If all timeframes are already fresh in cache, no API requests needed!
    if (!from5m && !from15m && !from1h && !from4h && !from1d) {
      return true;
    }

    const mapCandle = (c: any, tf: string): Candle => ({
      figi: inst.figi,
      ticker: inst.ticker,
      timeframe: tf as any,
      time: c.time ? new Date(c.time).getTime() : Date.now(),
      open: Helpers.toNumber(c.open) || 0,
      high: Helpers.toNumber(c.high) || 0,
      low: Helpers.toNumber(c.low) || 0,
      close: Helpers.toNumber(c.close) || 0,
      volume: c.volume || 0,
      isComplete: c.isComplete ?? true,
    });

    try {
      const requests: Promise<void>[] = [];

      if (from5m) {
        requests.push(
          this.api.marketdata
            .getCandles({
              instrumentId: inst.figi,
              from: from5m,
              to: now,
              interval: CandleInterval.CANDLE_INTERVAL_5_MIN,
            })
            .then((resp) => {
              if (resp.candles && resp.candles.length > 0) {
                this.sharedState.setCandles(
                  inst.ticker,
                  '5m',
                  resp.candles.map((c) => mapCandle(c, '5m'))
                );
              }
            })
        );
      }

      if (from15m) {
        requests.push(
          this.api.marketdata
            .getCandles({
              instrumentId: inst.figi,
              from: from15m,
              to: now,
              interval: CandleInterval.CANDLE_INTERVAL_15_MIN,
            })
            .then((resp) => {
              if (resp.candles && resp.candles.length > 0) {
                this.sharedState.setCandles(
                  inst.ticker,
                  '15m',
                  resp.candles.map((c) => mapCandle(c, '15m'))
                );
              }
            })
        );
      }

      if (from1h) {
        requests.push(
          this.api.marketdata
            .getCandles({
              instrumentId: inst.figi,
              from: from1h,
              to: now,
              interval: CandleInterval.CANDLE_INTERVAL_HOUR,
            })
            .then((resp) => {
              if (resp.candles && resp.candles.length > 0) {
                this.sharedState.setCandles(
                  inst.ticker,
                  '1h',
                  resp.candles.map((c) => mapCandle(c, '1h'))
                );
              }
            })
        );
      }

      if (from4h) {
        requests.push(
          this.api.marketdata
            .getCandles({
              instrumentId: inst.figi,
              from: from4h,
              to: now,
              interval: CandleInterval.CANDLE_INTERVAL_4_HOUR,
            })
            .then((resp) => {
              if (resp.candles && resp.candles.length > 0) {
                this.sharedState.setCandles(
                  inst.ticker,
                  '4h',
                  resp.candles.map((c) => mapCandle(c, '4h'))
                );
              }
            })
        );
      }

      if (from1d) {
        requests.push(
          this.api.marketdata
            .getCandles({
              instrumentId: inst.figi,
              from: from1d,
              to: now,
              interval: CandleInterval.CANDLE_INTERVAL_DAY,
            })
            .then((resp) => {
              if (resp.candles && resp.candles.length > 0) {
                this.sharedState.setCandles(
                  inst.ticker,
                  '1d',
                  resp.candles.map((c) => mapCandle(c, '1d'))
                );
              }
            })
        );
      }

      await Promise.all(requests);
      return true;
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`⏳ Rate limit reached on ${ticker}, cooling down...`);
        await new Promise((r) => setTimeout(r, 10000));
      } else {
        console.warn(`⚠️ [Warmup] Could not load history for ${ticker}:`, msg);
      }
      return false;
    }
  }

  private async warmupNewTickers(instruments: { figi: string; ticker: string }[]): Promise<void> {
    if (!this.api || instruments.length === 0) return;

    const figis = instruments.map((i) => i.figi);

    // 1. Fetch spot prices (getLastPrices and getClosePrices)
    try {
      const [lastPricesResp, closeResp] = await Promise.all([
        this.api.marketdata.getLastPrices({
          figi: figis,
          instrumentId: figis,
          lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE ?? 1,
        }),
        this.api.marketdata.getClosePrices({
          instruments: figis.map((f) => ({ instrumentId: f })),
        }),
      ]);

      if (closeResp.closePrices) {
        for (const cp of closeResp.closePrices) {
          const price = Helpers.toNumber(cp.price);
          if (price && price > 0) {
            this.sharedState.setClosePrice(cp.figi, price);
          }
        }
      }

      if (lastPricesResp.lastPrices) {
        for (const lp of lastPricesResp.lastPrices) {
          const price = Helpers.toNumber(lp.price);
          if (price && price > 0) {
            this.sharedState.setLastPrice(lp.figi, price);
          }
        }
      }
    } catch (e: any) {
      console.warn('⚠️ [Warmup] Failed to fetch spot prices for new tickers:', e.message);
    }

    // 2. Warm up historical candles if needed
    for (const inst of instruments) {
      await this.fetchCandlesForTicker(inst.ticker, false);
      await new Promise((r) => setTimeout(r, 150));
    }

    await this.saveCandlesCache();
  }

  private startPriceRefreshTimer(): void {
    if (this.priceRefreshTimer) return;
    this.priceRefreshTimer = setInterval(async () => {
      if (this.connectionState !== 'CONNECTED' || !this.api) return;
      try {
        const allInst = this.sharedState.getAllInstruments();
        const figis = allInst.map((i) => i.figi);
        const [lastPricesResp, closeResp] = await Promise.all([
          this.api.marketdata.getLastPrices({
            figi: figis,
            instrumentId: figis,
            lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE ?? 1,
          }),
          this.api.marketdata.getClosePrices({
            instruments: figis.map((f) => ({ instrumentId: f })),
          }),
        ]);

        if (closeResp.closePrices) {
          for (const cp of closeResp.closePrices) {
            const price = Helpers.toNumber(cp.price);
            if (price && price > 0) {
              this.sharedState.setClosePrice(cp.figi, price);
            }
          }
        }

        if (lastPricesResp.lastPrices) {
          for (const lp of lastPricesResp.lastPrices) {
            const price = Helpers.toNumber(lp.price);
            if (price && price > 0) {
              this.sharedState.setLastPrice(lp.figi, price);
            }
          }
        }
      } catch {
        // silent on periodic background refresh errors
      }
    }, 20000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempt++;
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, max 60s
    const delaySec = Math.min(Math.pow(2, Math.min(this.reconnectAttempt, 5)), 60);
    const delayMs = Math.max(delaySec * 1000, 2000);

    console.info(`🔄 Scheduling gRPC reconnect attempt #${this.reconnectAttempt} in ${delaySec}s...`);

    this.eventBus.emit('stream:reconnecting', {
      attempt: this.reconnectAttempt,
      delayMs,
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connectGrpc();
      } catch (err: any) {
        console.error('❌ Reconnect attempt failed:', err?.message || err);
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  private getInstrumentsForTickers(tickers: Set<string>): { figi: string; ticker: string }[] {
    const list: { figi: string; ticker: string }[] = [];
    for (const ticker of tickers) {
      const inst = this.sharedState.getInstrument(ticker);
      if (inst && inst.figi) {
        list.push({ figi: inst.figi, ticker: inst.ticker });
      }
    }
    return list;
  }

  private sendGrpcSubscribe(instruments: { figi: string; ticker: string }[]): void {
    if (!this.api || instruments.length === 0) return;
    const marketStream = this.api.stream.market as any;

    // 1. Subscribe Candles (1M)
    marketStream.sendRequest({
      subscribeCandlesRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
          interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE,
        })),
        waitingClose: false,
      },
    });

    // 2. Subscribe OrderBooks (depth 20)
    marketStream.sendRequest({
      subscribeOrderBookRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
          depth: 20,
          orderBookType: 0,
        })),
      },
    });

    // 3. Subscribe All Trades
    marketStream.sendRequest({
      subscribeTradesRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
        })),
        tradeSource: TradeSourceType.TRADE_SOURCE_ALL,
        withOpenInterest: false,
      },
    });
  }

  private sendGrpcUnsubscribe(instruments: { figi: string; ticker: string }[]): void {
    if (!this.api || instruments.length === 0) return;
    const marketStream = this.api.stream.market as any;

    // 1. Unsubscribe Candles
    marketStream.sendRequest({
      subscribeCandlesRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
          interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE,
        })),
        waitingClose: false,
      },
    });

    // 2. Unsubscribe OrderBooks
    marketStream.sendRequest({
      subscribeOrderBookRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
          depth: 20,
          orderBookType: 0,
        })),
      },
    });

    // 3. Unsubscribe Trades
    marketStream.sendRequest({
      subscribeTradesRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE,
        instruments: instruments.map((i) => ({
          figi: i.figi,
          instrumentId: i.figi,
        })),
        tradeSource: TradeSourceType.TRADE_SOURCE_ALL,
        withOpenInterest: false,
      },
    });
  }

  // --- Normalization ---

  private handleRawCandle(raw: any): void {
    this.recordPacket();
    this.candleCounter++;

    const inst = this.sharedState.getInstrument(raw.figi);
    const ticker = raw.ticker || inst?.ticker || raw.figi;

    const candle: Candle = {
      figi: raw.figi,
      ticker,
      timeframe: '1m',
      time: raw.time ? new Date(raw.time).getTime() : Date.now(),
      open: Helpers.toNumber(raw.open) || 0,
      high: Helpers.toNumber(raw.high) || 0,
      low: Helpers.toNumber(raw.low) || 0,
      close: Helpers.toNumber(raw.close) || 0,
      volume: raw.volume || 0,
      isComplete: false,
    };

    if (candle.close > 0) {
      this.sharedState.setLastPrice(candle.figi, candle.close);
    }

    this.sharedState.updateCandle(candle);
    this.eventBus.emit('market:candle_tick', candle);
  }

  private handleRawOrderBook(raw: any): void {
    this.recordPacket();
    this.orderBookCounter++;

    const inst = this.sharedState.getInstrument(raw.figi);
    const ticker = raw.ticker || inst?.ticker || raw.figi;

    const bids: OrderBookLevel[] = (raw.bids || []).map((b: any) => ({
      price: Helpers.toNumber(b.price) || 0,
      quantity: b.quantity || 0,
    }));

    const asks: OrderBookLevel[] = (raw.asks || []).map((a: any) => ({
      price: Helpers.toNumber(a.price) || 0,
      quantity: a.quantity || 0,
    }));

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? Number((bestAsk - bestBid).toFixed(4)) : 0;

    const orderBook: OrderBook = {
      figi: raw.figi,
      ticker,
      depth: raw.depth || bids.length,
      bids,
      asks,
      spread,
      bestBid,
      bestAsk,
      timestamp: raw.time ? new Date(raw.time).getTime() : Date.now(),
    };

    this.sharedState.updateOrderBook(orderBook);
    this.eventBus.emit('market:orderbook', orderBook);
  }

  private handleRawTrade(raw: any): void {
    this.recordPacket();
    this.tradeCounter++;

    const inst = this.sharedState.getInstrument(raw.figi);
    const ticker = raw.ticker || inst?.ticker || raw.figi;

    let direction: TradeDirection = 'UNKNOWN';
    if (raw.direction === 1) direction = 'BUY';
    else if (raw.direction === 2) direction = 'SELL';

    const trade: TradeEvent = {
      figi: raw.figi,
      ticker,
      direction,
      price: Helpers.toNumber(raw.price) || 0,
      quantity: raw.quantity || 0,
      timestamp: raw.time ? new Date(raw.time).getTime() : Date.now(),
    };

    if (trade.price > 0) {
      this.sharedState.setLastPrice(trade.figi, trade.price);
    }

    this.sharedState.addTrade(trade);
    this.eventBus.emit('market:trade', trade);
  }

  private recordPacket(): void {
    this.packetCounter++;
    this.totalPackets++;
    this.lastPacketTimestamp = Date.now();
  }

  private startStatsTimer(): void {
    this.statsIntervalTimer = setInterval(() => {
      this.currentFps = this.packetCounter;
      this.packetCounter = 0;

      this.eventBus.emit('stream:stats', {
        fps: this.currentFps,
        candleCount: this.candleCounter,
        tradeCount: this.tradeCounter,
        orderBookCount: this.orderBookCounter,
      });
    }, 1000);
  }

  private startTickerBroadcastTimer(): void {
    // Broadcast ready screener table deltas every 1000ms to WebSocket clients (smooth 1s cadence)
    let tickCount = 0;
    this.broadcastIntervalTimer = setInterval(() => {
      tickCount++;
      const deltas = this.sharedState.getDirtyStockItems();
      if (deltas.length > 0) {
        this.eventBus.emit('market:delta_update', deltas);
      } else if (tickCount % 60 === 0) {
        // Periodic full sync heartbeat every 60s
        const all = this.sharedState.getAllStockItems();
        if (all.length > 0) {
          this.eventBus.emit('market:ticker_update', all);
        }
      }
    }, 1000);
  }

  private getCacheFilePath(): string {
    return path.join(process.cwd(), '.cache', 'candles-cache.json');
  }

  private async saveCandlesCache(): Promise<void> {
    try {
      const data = this.sharedState.exportCandlesSnapshot();
      const dir = path.join(process.cwd(), '.cache');
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(this.getCacheFilePath(), JSON.stringify(data), 'utf8');
      console.info('💾 Saved candles cache to disk (.cache/candles-cache.json)');
    } catch (e: any) {
      console.warn('⚠️ Could not save candles cache:', e.message);
    }
  }

  private async loadCandlesCache(): Promise<number> {
    try {
      const p = this.getCacheFilePath();
      const raw = await fs.promises.readFile(p, 'utf8');
      const data = JSON.parse(raw);
      return this.sharedState.importCandlesSnapshot(data);
    } catch {
      return 0;
    }
  }

  // --- Realistic Mock Stream for Development / Testing ---

  private startMockStream(): void {
    this.connectionState = 'MOCK_STREAM';
    console.info('📡 Running in Mock Stream mode (generating synthetic MOEX ticks & candles)');
    this.eventBus.emit('stream:connected', { timestamp: Date.now() });

    // Seed mock prices for all known shares
    const mockPrices: Record<string, number> = {};
    for (const inst of MOEX_TOP_SHARES) {
      mockPrices[inst.ticker] = Math.floor(Math.random() * 200) + 50;
      this.sharedState.setClosePrice(inst.ticker, mockPrices[inst.ticker]);
    }
    mockPrices['SBER'] = 275.5;
    mockPrices['GAZP'] = 134.2;
    mockPrices['LKOH'] = 7180.0;
    mockPrices['GMKN'] = 145.0;
    mockPrices['ROSN'] = 540.0;

    // Seed some initial candle history for realistic RSI/Stoch calculation
    const now = Date.now();
    for (const inst of MOEX_TOP_SHARES) {
      const base = mockPrices[inst.ticker] || 100;
      for (let i = 25; i >= 0; i--) {
        const cTime = now - i * 5 * 60000;
        const p = base + (Math.random() * 4 - 2);
        this.sharedState.updateCandle({
          figi: inst.figi,
          ticker: inst.ticker,
          timeframe: '5m',
          time: Math.floor(cTime / 300000) * 300000,
          open: p - 0.5,
          high: p + 1.0,
          low: p - 1.0,
          close: p,
          volume: Math.floor(Math.random() * 500) + 50,
          isComplete: true,
        });
      }
    }

    this.mockIntervalTimer = setInterval(() => {
      for (const ticker of this.subscribedTickers) {
        const inst = this.sharedState.getInstrument(ticker) ?? {
          figi: `MOCK_${ticker}`,
          ticker,
        };

        const currentBase = mockPrices[ticker] || 100.0;
        const delta = currentBase * (Math.random() * 0.006 - 0.003);
        const newPrice = Number((currentBase + delta).toFixed(2));
        mockPrices[ticker] = newPrice;

        const timestamp = Date.now();
        const minuteStart = Math.floor(timestamp / 60000) * 60000;

        // 1. Generate Trade Event
        const direction: TradeDirection = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const tradeQuantity = Math.floor(Math.random() * 50) + 1;
        const trade: TradeEvent = {
          figi: inst.figi,
          ticker,
          direction,
          price: newPrice,
          quantity: tradeQuantity,
          timestamp,
        };
        this.sharedState.addTrade(trade);
        this.eventBus.emit('market:trade', trade);
        this.recordPacket();
        this.tradeCounter++;

        // 2. Generate 1M Candle Update
        const existing1m = this.sharedState.getLatestCandle(ticker, '1m');
        let candle: Candle;

        if (existing1m && existing1m.time === minuteStart) {
          candle = {
            ...existing1m,
            high: Math.max(existing1m.high, newPrice),
            low: Math.min(existing1m.low, newPrice),
            close: newPrice,
            volume: existing1m.volume + tradeQuantity,
            isComplete: false,
          };
        } else {
          candle = {
            figi: inst.figi,
            ticker,
            timeframe: '1m',
            time: minuteStart,
            open: newPrice,
            high: newPrice,
            low: newPrice,
            close: newPrice,
            volume: tradeQuantity,
            isComplete: false,
          };
        }
        this.sharedState.updateCandle(candle);
        this.eventBus.emit('market:candle_tick', candle);
        this.recordPacket();
        this.candleCounter++;
      }
    }, 1000);
  }
}
