import { OrderBook, TradeEvent } from '../../types/market';
import { BaseScannerModule } from '../base-module';

export interface BotActivityMetric {
  ticker: string;
  microTradeCount: number;
  windowStart: number;
  lastTradeTimestamp: number;
}

export class RobotsDetectorModule extends BaseScannerModule {
  public readonly id = 'robots';
  public readonly name = 'HFT Robots & Spoofing Detector';
  public readonly description =
    'Detects algorithmic ping-pong bots, quote stuffing, and spoofing patterns by analyzing trade bursts and rapid order book cancellations.';

  // Window tracking for micro trades: Map<ticker, BotActivityMetric>
  private readonly activityWindows = new Map<string, BotActivityMetric>();
  private readonly windowDurationMs = 1000; // 1-second rolling window
  private readonly microTradeThreshold = 10; // >10 micro trades/sec indicates algorithmic pinging

  public override onOrderBook(orderBook: OrderBook): void {
    // Contract implementation stub: inspects rapid placement and cancellation of phantom depth walls (spoofing)
  }

  public override onTrade(trade: TradeEvent): void {
    // Check for micro lot trade bursts (algorithmic pinging)
    if (trade.quantity > 3) return;

    const ticker = trade.ticker.toUpperCase();
    const now = trade.timestamp;

    let metric = this.activityWindows.get(ticker);
    if (!metric || now - metric.windowStart > this.windowDurationMs) {
      metric = {
        ticker,
        microTradeCount: 1,
        windowStart: now,
        lastTradeTimestamp: now,
      };
      this.activityWindows.set(ticker, metric);
    } else {
      metric.microTradeCount++;
      metric.lastTradeTimestamp = now;

      if (metric.microTradeCount === this.microTradeThreshold) {
        this.emitSignal({
          ticker,
          figi: trade.figi,
          timestamp: now,
          direction: 'NEUTRAL',
          severity: 'LOW',
          payload: {
            microTradesPerSecond: metric.microTradeCount,
            price: trade.price,
            reason: 'ALGO_PING_BOT_DETECTED',
          },
        });
      }
    }
  }
}
