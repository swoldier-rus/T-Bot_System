import { cci, nadarayaWatsonEnvelope, rsi, stochastic } from '../indicators';
import {
  Candle,
  DEFAULT_INDICATOR_PARAMS,
  IndicatorParams,
  Instrument,
  OrderBook,
  StockItem,
  StockTfIndicators,
  TradeEvent,
} from '../types/market';
import { ISharedStateReader } from '../types/modules';
import { FixedRingBuffer } from './ring-buffer';
import { DatabaseService } from './database-service';

export class SharedState implements ISharedStateReader {
  // Store order books by ticker
  private readonly orderBooks = new Map<string, OrderBook>();

  // Trade tapes: Ring buffer of 1000 items per ticker
  private readonly tradeTapes = new Map<string, FixedRingBuffer<TradeEvent>>();
  private readonly tradeTapeCapacity = 1000;

  // Candles: Map<ticker, Map<timeframe, FixedRingBuffer<Candle>>>
  private readonly candles = new Map<string, Map<string, FixedRingBuffer<Candle>>>();
  private readonly candleCapacity = 500;

  // Instruments registry
  private readonly tickerToInstrument = new Map<string, Instrument>();
  private readonly figiToInstrument = new Map<string, Instrument>();

  // Stock Items store for Screener UI
  private readonly stockItems = new Map<string, StockItem>();
  private readonly closePrices = new Map<string, number>();
  private readonly dirtyTickers = new Set<string>();

  // Server-wide default indicator calculation parameters
  private defaultParams: IndicatorParams = { ...DEFAULT_INDICATOR_PARAMS };

  constructor(private databaseService?: DatabaseService) {
    if (this.databaseService && typeof (this.databaseService as any).getIndicatorParams === 'function') {
      const saved = this.databaseService.getIndicatorParams();
      if (saved) {
        this.defaultParams = {
          ...DEFAULT_INDICATOR_PARAMS,
          ...saved,
        };
      }
    } else {
      this.databaseService = undefined;
    }
  }

  public markDirty(ticker: string): void {
    this.dirtyTickers.add(ticker.toUpperCase());
  }

  public getDirtyStockItems(): StockItem[] {
    if (this.dirtyTickers.size === 0) return [];
    const deltas: StockItem[] = [];
    for (const ticker of this.dirtyTickers) {
      const item = this.stockItems.get(ticker);
      if (item) deltas.push(item);
    }
    this.dirtyTickers.clear();
    return deltas;
  }

  // --- Instrument registry ---

  public setInstrument(instrument: Instrument): void {
    const ticker = instrument.ticker.toUpperCase();
    this.tickerToInstrument.set(ticker, instrument);
    this.figiToInstrument.set(instrument.figi, instrument);

    if (!this.stockItems.has(ticker)) {
      this.stockItems.set(ticker, {
        ticker,
        fullSymbol: `MOEX:${ticker}`,
        description: instrument.name || ticker,
        figi: instrument.figi,
        lot: instrument.lot || 1,
        logoUrl: instrument.logoUrl || null,
        logoColor: instrument.logoColor || null,
        price: null,
        prevClose: null,
        change: 0,
        turnover: 0,
        time: '',
        rvol: 1.0,
        dailyRsi: null,
        tf: {
          '5m': { rsi: null, k: null, d: null },
          '15m': { rsi: null, k: null, d: null },
          '1h': { rsi: null, k: null, d: null },
          '4h': { rsi: null, k: null, d: null },
          '1d': { rsi: null, k: null, d: null },
        },
      });
    } else {
      const existing = this.stockItems.get(ticker);
      if (existing) {
        if (instrument.name) existing.description = instrument.name;
        if (instrument.lot) existing.lot = instrument.lot;
        if (instrument.logoUrl) existing.logoUrl = instrument.logoUrl;
        if (instrument.logoColor) existing.logoColor = instrument.logoColor;
      }
    }
  }

  public getInstrument(tickerOrFigi: string): Instrument | undefined {
    const upper = tickerOrFigi.toUpperCase();
    return this.tickerToInstrument.get(upper) ?? this.figiToInstrument.get(tickerOrFigi);
  }

  public getAllInstruments(): Instrument[] {
    return Array.from(this.tickerToInstrument.values());
  }

  // --- Close Prices ---

  public setClosePrice(tickerOrFigi: string, price: number): void {
    const inst = this.getInstrument(tickerOrFigi);
    const ticker = inst ? inst.ticker.toUpperCase() : tickerOrFigi.toUpperCase();
    this.closePrices.set(ticker, price);

    const stock = this.stockItems.get(ticker);
    if (stock) {
      stock.prevClose = price;
      if (stock.price && price > 0) {
        stock.change = Number((((stock.price - price) / price) * 100).toFixed(2));
      } else if (!stock.price && price > 0) {
        stock.price = price;
      }
      this.dirtyTickers.add(ticker);
    }
  }

  public setLastPrice(tickerOrFigi: string, price: number): void {
    const inst = this.getInstrument(tickerOrFigi);
    const ticker = inst ? inst.ticker.toUpperCase() : tickerOrFigi.toUpperCase();

    const stock = this.stockItems.get(ticker);
    if (stock && price > 0) {
      stock.price = price;
      stock.time = new Date().toLocaleTimeString('ru-RU');
      if (stock.prevClose && stock.prevClose > 0) {
        stock.change = Number((((price - stock.prevClose) / stock.prevClose) * 100).toFixed(2));
      }
      this.dirtyTickers.add(ticker);
    }
  }

  // --- OrderBook ---

  public updateOrderBook(orderBook: OrderBook): void {
    const ticker = orderBook.ticker.toUpperCase();
    this.orderBooks.set(ticker, orderBook);
  }

  public getOrderBook(ticker: string): OrderBook | undefined {
    return this.orderBooks.get(ticker.toUpperCase());
  }

  // --- Trades Tape ---

  public addTrade(trade: TradeEvent): void {
    const ticker = trade.ticker.toUpperCase();
    let buffer = this.tradeTapes.get(ticker);
    if (!buffer) {
      buffer = new FixedRingBuffer<TradeEvent>(this.tradeTapeCapacity);
      this.tradeTapes.set(ticker, buffer);
    }
    buffer.push(trade);

    // Update real-time price & turnover in stock item
    const stock = this.stockItems.get(ticker);
    if (stock) {
      stock.price = trade.price;
      stock.time = new Date(trade.timestamp).toLocaleTimeString('ru-RU');
      stock.turnover += trade.price * trade.quantity * stock.lot;

      if (stock.prevClose && stock.prevClose > 0) {
        stock.change = Number((((trade.price - stock.prevClose) / stock.prevClose) * 100).toFixed(2));
      }
      this.dirtyTickers.add(ticker);
    }
  }

  public getTrades(ticker: string): readonly TradeEvent[] {
    const buffer = this.tradeTapes.get(ticker.toUpperCase());
    return buffer ? buffer.toArray() : [];
  }

  // --- Candles ---

  public setCandles(ticker: string, timeframe: string, newCandles: readonly Candle[]): void {
    if (!newCandles || newCandles.length === 0) return;
    const tickerUpper = ticker.toUpperCase();
    const tf = timeframe.toLowerCase();

    let tickerCandles = this.candles.get(tickerUpper);
    if (!tickerCandles) {
      tickerCandles = new Map<string, FixedRingBuffer<Candle>>();
      this.candles.set(tickerUpper, tickerCandles);
    }

    let buffer = tickerCandles.get(tf);
    if (!buffer) {
      buffer = new FixedRingBuffer<Candle>(this.candleCapacity);
      tickerCandles.set(tf, buffer);
    }

    // Merge existing buffer and new candles by timestamp to prevent duplicate or out-of-order bars
    const candleMap = new Map<number, Candle>();
    for (const c of buffer.toArray()) {
      candleMap.set(c.time, c);
    }
    for (const c of newCandles) {
      candleMap.set(c.time, c);
    }

    // Sort chronologically ascending
    const sorted = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    const toKeep = sorted.slice(-this.candleCapacity);

    buffer.clear();
    for (const c of toKeep) {
      buffer.push(c);
    }

    // Refresh stock indicators for this timeframe once per batch
    this.recomputeStockTfIndicators(tickerUpper, tf);
  }

  public updateCandle(candle: Candle): void {
    const ticker = candle.ticker.toUpperCase();
    const tf = candle.timeframe.toLowerCase();

    let tickerCandles = this.candles.get(ticker);
    if (!tickerCandles) {
      tickerCandles = new Map<string, FixedRingBuffer<Candle>>();
      this.candles.set(ticker, tickerCandles);
    }

    let buffer = tickerCandles.get(tf);
    if (!buffer) {
      buffer = new FixedRingBuffer<Candle>(this.candleCapacity);
      tickerCandles.set(tf, buffer);
    }

    const last = buffer.last();
    if (last && last.time === candle.time) {
      buffer.updateLast(candle);
    } else if (!last || candle.time > last.time) {
      buffer.push(candle);
    } else {
      // Historical or out-of-order candle: delegate to setCandles to maintain sorting
      this.setCandles(ticker, tf, [candle]);
      return;
    }

    // Refresh stock indicators for this timeframe
    this.recomputeStockTfIndicators(ticker, tf);
  }

  public getCandles(ticker: string, timeframe: string): readonly Candle[] {
    const tickerCandles = this.candles.get(ticker.toUpperCase());
    if (!tickerCandles) return [];
    const buffer = tickerCandles.get(timeframe.toLowerCase());
    return buffer ? buffer.toArray() : [];
  }

  public getLatestCandle(ticker: string, timeframe: string): Candle | undefined {
    const tickerCandles = this.candles.get(ticker.toUpperCase());
    if (!tickerCandles) return undefined;
    const buffer = tickerCandles.get(timeframe.toLowerCase());
    return buffer ? buffer.last() : undefined;
  }

  // --- Disk Cache Export / Import for Instant Warmup ---

  public exportCandlesSnapshot(): Record<string, Record<string, Candle[]>> {
    const result: Record<string, Record<string, Candle[]>> = {};
    for (const [ticker, tfMap] of this.candles.entries()) {
      result[ticker] = {};
      for (const [tf, buffer] of tfMap.entries()) {
        result[ticker][tf] = buffer.toArray();
      }
    }
    return result;
  }

  public importCandlesSnapshot(data: Record<string, Record<string, Candle[]>>): number {
    let count = 0;
    for (const [ticker, tfMap] of Object.entries(data)) {
      for (const [tf, candleArr] of Object.entries(tfMap)) {
        if (!Array.isArray(candleArr) || candleArr.length === 0) continue;
        this.setCandles(ticker, tf, candleArr);
        count += candleArr.length;
      }
    }
    return count;
  }

  // --- Screener Stock Items & Indicator Calculations ---

  public getStockItem(ticker: string): StockItem | undefined {
    return this.stockItems.get(ticker.toUpperCase());
  }

  public getAllStockItems(): StockItem[] {
    return Array.from(this.stockItems.values());
  }

  public getDefaultParams(): IndicatorParams {
    return { ...this.defaultParams };
  }

  public updateDefaultParams(params: Partial<IndicatorParams>): void {
    this.defaultParams = {
      ...this.defaultParams,
      ...params,
    };
    if (this.databaseService && typeof this.databaseService.setIndicatorParams === 'function') {
      this.databaseService.setIndicatorParams(this.defaultParams);
    }
    for (const ticker of this.stockItems.keys()) {
      this.recomputeAllIndicatorsForStock(ticker, this.defaultParams);
    }
  }

  public recomputeAllIndicatorsForStock(ticker: string, params: IndicatorParams): void {
    const stock = this.stockItems.get(ticker);
    if (!stock) return;

    for (const tf of ['5m', '15m', '1h', '4h', '1d'] as const) {
      const candles = this.getCandles(ticker, tf);
      stock.tf[tf] = this.calcTfIndicators(
        candles,
        params.rsiPeriod,
        params.stochK,
        params.stochSmooth,
        params.stochD,
        params.nwBandwidth ?? this.defaultParams.nwBandwidth,
        params.nwMult ?? this.defaultParams.nwMult,
        params.nwRepaint ?? this.defaultParams.nwRepaint,
        params.cciPeriod ?? this.defaultParams.cciPeriod
      );
    }

    const dailyCandles = this.getCandles(ticker, '1d');
    if (dailyCandles.length >= params.rsiPeriod + 1) {
      const rsiVals = rsi(dailyCandles.map((c) => c.close), params.rsiPeriod);
      stock.dailyRsi = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : null;
    } else {
      stock.dailyRsi = null;
    }

    stock.rvol = this.calcRvol(dailyCandles, params.rvolDays);
    this.dirtyTickers.add(ticker);
  }

  public formatStockItem(base: StockItem, params?: IndicatorParams): StockItem {
    if (!params) return base;
    const isDefault =
      params.rsiPeriod === this.defaultParams.rsiPeriod &&
      params.stochK === this.defaultParams.stochK &&
      params.stochSmooth === this.defaultParams.stochSmooth &&
      params.stochD === this.defaultParams.stochD &&
      params.rvolDays === this.defaultParams.rvolDays &&
      (params.nwBandwidth ?? 8) === (this.defaultParams.nwBandwidth ?? 8) &&
      (params.nwMult ?? 3) === (this.defaultParams.nwMult ?? 3) &&
      (params.nwRepaint ?? false) === (this.defaultParams.nwRepaint ?? false) &&
      (params.cciPeriod ?? 20) === (this.defaultParams.cciPeriod ?? 20);

    if (isDefault) return base;

    const ticker = base.ticker;
    const tf5m = this.calcTfIndicators(
      this.getCandles(ticker, '5m'),
      params.rsiPeriod,
      params.stochK,
      params.stochSmooth,
      params.stochD,
      params.nwBandwidth ?? this.defaultParams.nwBandwidth,
      params.nwMult ?? this.defaultParams.nwMult,
      params.nwRepaint ?? this.defaultParams.nwRepaint,
      params.cciPeriod ?? this.defaultParams.cciPeriod
    );
    const tf15m = this.calcTfIndicators(
      this.getCandles(ticker, '15m'),
      params.rsiPeriod,
      params.stochK,
      params.stochSmooth,
      params.stochD,
      params.nwBandwidth ?? this.defaultParams.nwBandwidth,
      params.nwMult ?? this.defaultParams.nwMult,
      params.nwRepaint ?? this.defaultParams.nwRepaint,
      params.cciPeriod ?? this.defaultParams.cciPeriod
    );
    const tf1h = this.calcTfIndicators(
      this.getCandles(ticker, '1h'),
      params.rsiPeriod,
      params.stochK,
      params.stochSmooth,
      params.stochD,
      params.nwBandwidth ?? this.defaultParams.nwBandwidth,
      params.nwMult ?? this.defaultParams.nwMult,
      params.nwRepaint ?? this.defaultParams.nwRepaint,
      params.cciPeriod ?? this.defaultParams.cciPeriod
    );
    const tf4h = this.calcTfIndicators(
      this.getCandles(ticker, '4h'),
      params.rsiPeriod,
      params.stochK,
      params.stochSmooth,
      params.stochD,
      params.nwBandwidth ?? this.defaultParams.nwBandwidth,
      params.nwMult ?? this.defaultParams.nwMult,
      params.nwRepaint ?? this.defaultParams.nwRepaint,
      params.cciPeriod ?? this.defaultParams.cciPeriod
    );
    const tf1d = this.calcTfIndicators(
      this.getCandles(ticker, '1d'),
      params.rsiPeriod,
      params.stochK,
      params.stochSmooth,
      params.stochD,
      params.nwBandwidth ?? this.defaultParams.nwBandwidth,
      params.nwMult ?? this.defaultParams.nwMult,
      params.nwRepaint ?? this.defaultParams.nwRepaint,
      params.cciPeriod ?? this.defaultParams.cciPeriod
    );

    const dailyCandles = this.getCandles(ticker, '1d');
    let dailyRsi: number | null = null;
    if (dailyCandles.length >= params.rsiPeriod + 1) {
      const rsiVals = rsi(dailyCandles.map((c) => c.close), params.rsiPeriod);
      dailyRsi = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : null;
    }
    const rvol = this.calcRvol(dailyCandles, params.rvolDays);

    const customStock: StockItem = {
      ...base,
      rvol,
      dailyRsi,
      tf: {
        '5m': tf5m,
        '15m': tf15m,
        '1h': tf1h,
        '4h': tf4h,
        '1d': tf1d,
      },
    };
    return customStock;
  }

  public formatStocksForClient(items: StockItem[], params?: IndicatorParams): StockItem[] {
    if (!params) return items;
    return items.map((item) => this.formatStockItem(item, params));
  }

  public getCustomSnapshot(tickers: string[] | null, params?: IndicatorParams): StockItem[] {
    const p = params || this.defaultParams;
    const items = tickers
      ? (tickers
          .map((t) => this.stockItems.get(t.toUpperCase()))
          .filter(Boolean) as StockItem[])
      : Array.from(this.stockItems.values());

    return items.map((item) => this.formatStockItem(item, p));
  }

  private recomputeStockTfIndicators(ticker: string, tf: string): void {
    const stock = this.stockItems.get(ticker);
    if (!stock) return;

    const validTfs = ['5m', '15m', '1h', '4h', '1d'] as const;
    const isTargetTf = validTfs.includes(tf as any);

    if (isTargetTf) {
      const candles = this.getCandles(ticker, tf);
      const tfKey = tf as '5m' | '15m' | '1h' | '4h' | '1d';
      stock.tf[tfKey] = this.calcTfIndicators(
        candles,
        this.defaultParams.rsiPeriod,
        this.defaultParams.stochK,
        this.defaultParams.stochSmooth,
        this.defaultParams.stochD,
        this.defaultParams.nwBandwidth,
        this.defaultParams.nwMult,
        this.defaultParams.nwRepaint,
        this.defaultParams.cciPeriod
      );
    }

    if (tf === '1d') {
      const dailyCandles = this.getCandles(ticker, '1d');
      if (dailyCandles.length >= this.defaultParams.rsiPeriod + 1) {
        const rsiVals = rsi(dailyCandles.map((c) => c.close), this.defaultParams.rsiPeriod);
        stock.dailyRsi = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : null;
      }
      stock.rvol = this.calcRvol(dailyCandles, this.defaultParams.rvolDays);
    }

    this.dirtyTickers.add(ticker);
  }

  private calcTfIndicators(
    candles: readonly Candle[],
    rsiPeriod: number = 14,
    stochK: number = 14,
    stochSmooth: number = 3,
    stochD: number = 3,
    nwBandwidth: number = 8,
    nwMult: number = 3,
    nwRepaint: boolean = false,
    cciPeriod: number = 20
  ): StockTfIndicators {
    const minNeeded = Math.max(rsiPeriod + 1, stochK);
    if (candles.length < minNeeded) {
      return { rsi: null, k: null, d: null, cci: null, nw: null };
    }

    const prices = candles.map((c) => c.close);
    const rsiVals = rsi(prices, rsiPeriod);
    const lastRsi = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : null;

    const ohlcv = candles.map((c) => ({ high: c.high, low: c.low, close: c.close }));
    const stochRes = stochastic(ohlcv, stochK, stochSmooth, stochD);

    const nw = nadarayaWatsonEnvelope(prices, nwBandwidth, nwMult, nwRepaint);
    const cciVals = cci(ohlcv, cciPeriod);
    const lastCci = cciVals.length > 0 && Number.isFinite(cciVals[cciVals.length - 1])
      ? cciVals[cciVals.length - 1]
      : null;

    return {
      rsi: lastRsi,
      k: stochRes.latestK !== undefined ? stochRes.latestK : null,
      d: stochRes.latestD !== undefined ? stochRes.latestD : null,
      cci: lastCci,
      nw: nw ? { mid: nw.mid, upper: nw.upper, lower: nw.lower, signal: nw.signal } : null,
    };
  }

  private calcRvol(dailyCandles: readonly Candle[], rvolDays: number = 10): number {
    if (dailyCandles.length < 2) return 1.0;
    const today = dailyCandles[dailyCandles.length - 1];
    const past = dailyCandles.slice(-(rvolDays + 1), -1);
    if (past.length === 0) return 1.0;

    const avgVol = past.reduce((s, c) => s + c.volume, 0) / past.length;
    if (avgVol <= 0 || today.volume <= 0) return 1.0;

    return Number((today.volume / avgVol).toFixed(2));
  }

  public clear(): void {
    this.orderBooks.clear();
    this.tradeTapes.clear();
    this.candles.clear();
    this.tickerToInstrument.clear();
    this.figiToInstrument.clear();
    this.stockItems.clear();
    this.closePrices.clear();
  }
}
