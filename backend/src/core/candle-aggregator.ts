import { Candle, Timeframe } from '../types/market';
import { EventBus } from './event-bus';
import { SharedState } from './shared-state';

interface AggregationBucket {
  timeframe: Timeframe;
  intervalMs: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  minuteVolumes: Map<number, number>;
  isComplete: boolean;
}

export class CandleAggregator {
  // Key: `${ticker}:${timeframe}`
  private readonly activeBuckets = new Map<string, AggregationBucket>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly sharedState: SharedState
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.eventBus.on('market:candle_tick', (candle: Candle) => {
      // Only aggregate upwards from 1m candles
      if (candle.timeframe === '1m') {
        this.process1mCandle(candle);
      }
    });
  }

  /**
   * Ingests a 1m candle and updates 5m, 15m, 1h, 4h, and 1d aggregated candles.
   */
  public process1mCandle(candle: Candle): void {
    this.aggregateToTimeframe(candle, '5m', 5 * 60 * 1000);
    this.aggregateToTimeframe(candle, '15m', 15 * 60 * 1000);
    this.aggregateToTimeframe(candle, '1h', 60 * 60 * 1000);
    this.aggregateToTimeframe(candle, '4h', 4 * 60 * 60 * 1000);
    this.aggregateToDay(candle);
  }

  private aggregateToDay(candle1m: Candle): void {
    const ticker = candle1m.ticker.toUpperCase();
    const bucketKey = `${ticker}:1d`;
    const dayStart = new Date(candle1m.time).setUTCHours(0, 0, 0, 0);

    let bucket = this.activeBuckets.get(bucketKey);

    if (!bucket || bucket.time !== dayStart) {
      const existing1d = this.sharedState.getLatestCandle(ticker, '1d');
      const minuteVolumes = new Map<number, number>();
      minuteVolumes.set(candle1m.time, candle1m.volume);

      const hasTodayBase = existing1d && existing1d.time === dayStart;
      bucket = {
        timeframe: '1d',
        intervalMs: 86400000,
        time: dayStart,
        open: hasTodayBase ? existing1d.open : candle1m.open,
        high: hasTodayBase ? Math.max(existing1d.high, candle1m.high) : candle1m.high,
        low: hasTodayBase ? Math.min(existing1d.low, candle1m.low) : candle1m.low,
        close: candle1m.close,
        minuteVolumes,
        isComplete: false,
      };
      this.activeBuckets.set(bucketKey, bucket);
    } else {
      bucket.high = Math.max(bucket.high, candle1m.high);
      bucket.low = Math.min(bucket.low, candle1m.low);
      bucket.close = candle1m.close;
      bucket.minuteVolumes.set(candle1m.time, candle1m.volume);
    }

    const existing1d = this.sharedState.getLatestCandle(ticker, '1d');
    const baseVolume = existing1d && existing1d.time === dayStart ? existing1d.volume : 0;
    let liveVolume = 0;
    for (const vol of bucket.minuteVolumes.values()) {
      liveVolume += vol;
    }

    const aggregatedCandle: Candle = {
      figi: candle1m.figi,
      ticker,
      timeframe: '1d',
      time: bucket.time,
      open: bucket.open,
      high: bucket.high,
      low: bucket.low,
      close: bucket.close,
      volume: Math.max(baseVolume, liveVolume),
      isComplete: false,
    };

    this.sharedState.updateCandle(aggregatedCandle);
    this.eventBus.emit('market:candle_tick', aggregatedCandle);
  }

  private aggregateToTimeframe(
    candle1m: Candle,
    targetTf: Timeframe,
    intervalMs: number
  ): void {
    const ticker = candle1m.ticker.toUpperCase();
    const bucketKey = `${ticker}:${targetTf}`;
    const bucketStart = Math.floor(candle1m.time / intervalMs) * intervalMs;
    const isLastMinuteOfBucket =
      candle1m.isComplete &&
      candle1m.time + 60 * 1000 >= bucketStart + intervalMs;

    let bucket = this.activeBuckets.get(bucketKey);

    if (!bucket || bucket.time !== bucketStart) {
      // Initialize new timeframe bucket
      const minuteVolumes = new Map<number, number>();
      minuteVolumes.set(candle1m.time, candle1m.volume);

      bucket = {
        timeframe: targetTf,
        intervalMs,
        time: bucketStart,
        open: candle1m.open,
        high: candle1m.high,
        low: candle1m.low,
        close: candle1m.close,
        minuteVolumes,
        isComplete: isLastMinuteOfBucket,
      };
      this.activeBuckets.set(bucketKey, bucket);
    } else {
      // Update existing bucket
      bucket.high = Math.max(bucket.high, candle1m.high);
      bucket.low = Math.min(bucket.low, candle1m.low);
      bucket.close = candle1m.close;
      bucket.minuteVolumes.set(candle1m.time, candle1m.volume);
      if (isLastMinuteOfBucket) {
        bucket.isComplete = true;
      }
    }

    // Compute total volume across all 1m candles in this bucket
    let totalVolume = 0;
    for (const vol of bucket.minuteVolumes.values()) {
      totalVolume += vol;
    }

    const aggregatedCandle: Candle = {
      figi: candle1m.figi,
      ticker,
      timeframe: targetTf,
      time: bucket.time,
      open: bucket.open,
      high: bucket.high,
      low: bucket.low,
      close: bucket.close,
      volume: totalVolume,
      isComplete: bucket.isComplete,
    };

    // Update shared state and notify listeners
    this.sharedState.updateCandle(aggregatedCandle);
    this.eventBus.emit('market:candle_tick', aggregatedCandle);
  }

  public clear(): void {
    this.activeBuckets.clear();
  }
}
