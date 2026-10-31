import { OrderBook, TradeEvent } from '../../types/market';
import { BaseScannerModule } from '../base-module';

export interface IcebergCandidate {
  ticker: string;
  price: number;
  direction: 'BUY' | 'SELL';
  visibleVolume: number;
  executedVolume: number;
  ratio: number;
  firstSeenTime: number;
  lastTradeTime: number;
}

export class IcebergDetectorModule extends BaseScannerModule {
  public readonly id = 'icebergs';
  public readonly name = 'Iceberg Orders Detector';
  public readonly description =
    'Detects hidden institutional liquidity (iceberg orders) by tracking excessive cumulative trade execution at price levels relative to displayed L2 order book depth.';

  // State tracker for cumulative volume per price level: Map<`${ticker}:${price}`, IcebergCandidate>
  private readonly volumeAtPrice = new Map<string, IcebergCandidate>();
  // Minimum execution-to-visible ratio to classify as iceberg (e.g. executed 3x more than displayed)
  private readonly icebergRatioThreshold = 3.0;
  // Minimum executed volume to avoid tiny noise
  private readonly minExecutedVolume = 100;

  public override onOrderBook(orderBook: OrderBook): void {
    // Contract implementation stub: monitors L2 changes and cleans up stale levels
  }

  public override onTrade(trade: TradeEvent): void {
    const ticker = trade.ticker.toUpperCase();
    const key = `${ticker}:${trade.price}`;
    const orderBook = this.ctx.state.getOrderBook(ticker);

    if (!orderBook) return;

    // Determine displayed volume at this price
    let visibleVolume = 0;
    if (trade.direction === 'BUY') {
      const askLevel = orderBook.asks.find((a) => a.price === trade.price);
      visibleVolume = askLevel ? askLevel.quantity : 0;
    } else if (trade.direction === 'SELL') {
      const bidLevel = orderBook.bids.find((b) => b.price === trade.price);
      visibleVolume = bidLevel ? bidLevel.quantity : 0;
    }

    let candidate = this.volumeAtPrice.get(key);
    if (!candidate) {
      candidate = {
        ticker,
        price: trade.price,
        direction: trade.direction === 'BUY' ? 'BUY' : 'SELL',
        visibleVolume: visibleVolume || 1,
        executedVolume: trade.quantity,
        ratio: 1,
        firstSeenTime: trade.timestamp,
        lastTradeTime: trade.timestamp,
      };
      this.volumeAtPrice.set(key, candidate);
    } else {
      candidate.executedVolume += trade.quantity;
      candidate.lastTradeTime = trade.timestamp;
      if (visibleVolume > 0) {
        candidate.visibleVolume = visibleVolume;
      }
      candidate.ratio = candidate.executedVolume / candidate.visibleVolume;
    }

    // Trigger signal if executed volume exceeds threshold ratio
    if (
      candidate.ratio >= this.icebergRatioThreshold &&
      candidate.executedVolume >= this.minExecutedVolume
    ) {
      this.emitSignal({
        ticker,
        figi: trade.figi,
        timestamp: trade.timestamp,
        direction: candidate.direction === 'BUY' ? 'LONG' : 'SHORT',
        severity: candidate.ratio >= 5.0 ? 'HIGH' : 'MEDIUM',
        payload: {
          price: candidate.price,
          executedVolume: candidate.executedVolume,
          visibleVolume: candidate.visibleVolume,
          ratio: Number(candidate.ratio.toFixed(2)),
          reason: 'ICEBERG_DETECTED',
        },
      });

      // Clear after detection to avoid repeat alert flood
      this.volumeAtPrice.delete(key);
    }
  }
}
