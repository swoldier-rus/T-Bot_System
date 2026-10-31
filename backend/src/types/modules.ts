import { Candle, Instrument, OrderBook, TradeEvent } from './market';
import { MarketSignal, SignalPayload } from './signals';

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface ISharedStateReader {
  getOrderBook(ticker: string): OrderBook | undefined;
  getTrades(ticker: string): readonly TradeEvent[];
  getCandles(ticker: string, timeframe: string): readonly Candle[];
  getLatestCandle(ticker: string, timeframe: string): Candle | undefined;
  getInstrument(ticker: string): Instrument | undefined;
  getAllInstruments(): Instrument[];
}

export interface ModuleContext {
  state: ISharedStateReader;
  logger: ILogger;
  emitSignal: <T = SignalPayload>(
    signal: Omit<MarketSignal<T>, 'event' | 'moduleId'>
  ) => void;
}

export interface IScannerModule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;

  init(ctx: ModuleContext): Promise<void> | void;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  toggle(enabled?: boolean): boolean;

  onCandle?(candle: Candle): void | Promise<void>;
  onTrade?(trade: TradeEvent): void | Promise<void>;
  onOrderBook?(orderBook: OrderBook): void | Promise<void>;
}
