import { EventEmitter } from 'events';
import { Candle, Instrument, OrderBook, StockItem, TradeEvent } from '../types/market';
import { MarketSignal } from '../types/signals';

export interface EventMap {
  'market:candle_tick': Candle;
  'market:trade': TradeEvent;
  'market:orderbook': OrderBook;
  'market:ticker_update': StockItem[];
  'market:delta_update': StockItem[];
  'market:snapshot': StockItem[];
  'scanner:signal': MarketSignal;
  'stream:connected': { timestamp: number };
  'stream:disconnected': { error?: string; timestamp: number };
  'stream:reconnecting': { attempt: number; delayMs: number };
  'stream:stats': {
    fps: number;
    candleCount: number;
    tradeCount: number;
    orderBookCount: number;
  };
  'instruments:updated': Instrument[];
  'module:toggled': { moduleId: string; enabled: boolean };
  'dashboard:log': any;
}

export class EventBus {
  private readonly emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public on<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public off<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public once<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): boolean {
    return this.emitter.emit(event, data);
  }

  public removeAllListeners(event?: keyof EventMap): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  public listenerCount(event: keyof EventMap): number {
    return this.emitter.listenerCount(event);
  }
}
