import { Candle, OrderBook, TradeEvent } from '../types/market';
import { ILogger, IScannerModule, ModuleContext } from '../types/modules';
import { MarketSignal, SignalPayload } from '../types/signals';
import { EventBus } from './event-bus';
import { SharedState } from './shared-state';

export interface ModuleStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export class ModuleManager {
  private readonly modules = new Map<string, IScannerModule>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly sharedState: SharedState
  ) {
    this.setupEventForwarding();
  }

  public register(module: IScannerModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module with id "${module.id}" is already registered.`);
    }

    const logger: ILogger = {
      debug: (msg, ...args) => console.debug(`[${module.id}] ${msg}`, ...args),
      info: (msg, ...args) => console.info(`[${module.id}] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[${module.id}] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[${module.id}] ${msg}`, ...args),
    };

    const ctx: ModuleContext = {
      state: this.sharedState,
      logger,
      emitSignal: <T = SignalPayload>(
        signal: Omit<MarketSignal<T>, 'event' | 'moduleId'>
      ) => {
        const fullSignal: MarketSignal<T> = {
          event: 'SIGNAL',
          moduleId: module.id,
          ...signal,
        };
        this.eventBus.emit('scanner:signal', fullSignal as MarketSignal);
      },
    };

    module.init(ctx);
    this.modules.set(module.id, module);
  }

  public getModule(id: string): IScannerModule | undefined {
    return this.modules.get(id);
  }

  public getAllModules(): IScannerModule[] {
    return Array.from(this.modules.values());
  }

  public getStatuses(): ModuleStatus[] {
    return this.getAllModules().map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      enabled: m.enabled,
    }));
  }

  public toggleModule(id: string, enabled?: boolean): boolean | null {
    const mod = this.modules.get(id);
    if (!mod) {
      return null;
    }
    const newState = mod.toggle(enabled);
    this.eventBus.emit('module:toggled', { moduleId: id, enabled: newState });
    return newState;
  }

  public async startAll(): Promise<void> {
    for (const mod of this.modules.values()) {
      if (mod.enabled) {
        try {
          await mod.start();
        } catch (err) {
          console.error(`❌ Error starting module [${mod.id}]:`, err);
        }
      }
    }
  }

  public async stopAll(): Promise<void> {
    for (const mod of this.modules.values()) {
      try {
        await mod.stop();
      } catch (err) {
        console.error(`❌ Error stopping module [${mod.id}]:`, err);
      }
    }
  }

  private setupEventForwarding(): void {
    // 1. Forward Candle ticks to enabled modules
    this.eventBus.on('market:candle_tick', (candle: Candle) => {
      for (const mod of this.modules.values()) {
        if (mod.enabled && typeof mod.onCandle === 'function') {
          try {
            const res = mod.onCandle(candle);
            if (res instanceof Promise) {
              res.catch((err) => {
                console.error(`❌ Async error in module [${mod.id}].onCandle:`, err);
              });
            }
          } catch (err) {
            console.error(`❌ Sync error in module [${mod.id}].onCandle:`, err);
          }
        }
      }
    });

    // 2. Forward Trades to enabled modules
    this.eventBus.on('market:trade', (trade: TradeEvent) => {
      for (const mod of this.modules.values()) {
        if (mod.enabled && typeof mod.onTrade === 'function') {
          try {
            const res = mod.onTrade(trade);
            if (res instanceof Promise) {
              res.catch((err) => {
                console.error(`❌ Async error in module [${mod.id}].onTrade:`, err);
              });
            }
          } catch (err) {
            console.error(`❌ Sync error in module [${mod.id}].onTrade:`, err);
          }
        }
      }
    });

    // 3. Forward OrderBooks to enabled modules
    this.eventBus.on('market:orderbook', (orderBook: OrderBook) => {
      for (const mod of this.modules.values()) {
        if (mod.enabled && typeof mod.onOrderBook === 'function') {
          try {
            const res = mod.onOrderBook(orderBook);
            if (res instanceof Promise) {
              res.catch((err) => {
                console.error(`❌ Async error in module [${mod.id}].onOrderBook:`, err);
              });
            }
          } catch (err) {
            console.error(`❌ Sync error in module [${mod.id}].onOrderBook:`, err);
          }
        }
      }
    });
  }
}
