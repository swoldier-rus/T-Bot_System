import { Candle, OrderBook, TradeEvent } from '../types/market';
import { ILogger, IScannerModule, ModuleContext } from '../types/modules';
import { MarketSignal, SignalPayload } from '../types/signals';

export abstract class BaseScannerModule implements IScannerModule {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;

  protected _enabled = true;
  protected ctx!: ModuleContext;

  public get enabled(): boolean {
    return this._enabled;
  }

  public get logger(): ILogger {
    return this.ctx.logger;
  }

  public init(ctx: ModuleContext): Promise<void> | void {
    this.ctx = ctx;
    this.logger.info(`Module [${this.id}] initialized.`);
  }

  public start(): Promise<void> | void {
    this.logger.info(`Module [${this.id}] started.`);
  }

  public stop(): Promise<void> | void {
    this.logger.info(`Module [${this.id}] stopped.`);
  }

  public toggle(enabled?: boolean): boolean {
    this._enabled = enabled !== undefined ? enabled : !this._enabled;
    this.logger.info(
      `Module [${this.id}] is now ${this._enabled ? 'ENABLED' : 'DISABLED'}.`
    );
    return this._enabled;
  }

  protected emitSignal<T = SignalPayload>(
    signal: Omit<MarketSignal<T>, 'event' | 'moduleId'>
  ): void {
    if (!this._enabled) return;
    this.ctx.emitSignal(signal as any);
  }

  public onCandle?(candle: Candle): void | Promise<void>;
  public onTrade?(trade: TradeEvent): void | Promise<void>;
  public onOrderBook?(orderBook: OrderBook): void | Promise<void>;
}
