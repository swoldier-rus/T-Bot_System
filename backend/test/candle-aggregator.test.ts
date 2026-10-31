import { describe, expect, it } from 'vitest';
import { CandleAggregator } from '../src/core/candle-aggregator';
import { EventBus } from '../src/core/event-bus';
import { SharedState } from '../src/core/shared-state';
import { Candle } from '../src/types/market';

describe('CandleAggregator', () => {
  it('aggregates five 1m candles into a single 5m candle correctly', () => {
    const eventBus = new EventBus();
    const sharedState = new SharedState();
    const aggregator = new CandleAggregator(eventBus, sharedState);

    const baseTime = 1700000000000; // Aligned to 5m? Let's check: 1700000000000 % 300000 = 200000
    // Let's create an exact 5m boundary:
    const alignedBaseTime = Math.floor(1700000000000 / 300000) * 300000;

    const recorded5m: Candle[] = [];
    eventBus.on('market:candle_tick', (c) => {
      if (c.timeframe === '5m') {
        recorded5m.push(c);
      }
    });

    // Minute 0
    aggregator.process1mCandle({
      figi: 'FIGI_SBER',
      ticker: 'SBER',
      timeframe: '1m',
      time: alignedBaseTime,
      open: 100,
      high: 105,
      low: 99,
      close: 104,
      volume: 10,
      isComplete: true,
    });

    // Minute 1
    aggregator.process1mCandle({
      figi: 'FIGI_SBER',
      ticker: 'SBER',
      timeframe: '1m',
      time: alignedBaseTime + 60000,
      open: 104,
      high: 108,
      low: 103,
      close: 107,
      volume: 20,
      isComplete: true,
    });

    // Minute 2
    aggregator.process1mCandle({
      figi: 'FIGI_SBER',
      ticker: 'SBER',
      timeframe: '1m',
      time: alignedBaseTime + 120000,
      open: 107,
      high: 107,
      low: 95, // New low
      close: 98,
      volume: 15,
      isComplete: true,
    });

    // Minute 3
    aggregator.process1mCandle({
      figi: 'FIGI_SBER',
      ticker: 'SBER',
      timeframe: '1m',
      time: alignedBaseTime + 180000,
      open: 98,
      high: 101,
      low: 97,
      close: 100,
      volume: 25,
      isComplete: true,
    });

    // Minute 4 (Final minute of 5m bucket)
    aggregator.process1mCandle({
      figi: 'FIGI_SBER',
      ticker: 'SBER',
      timeframe: '1m',
      time: alignedBaseTime + 240000,
      open: 100,
      high: 110, // New high
      low: 99,
      close: 109,
      volume: 30,
      isComplete: true,
    });

    const latest5m = sharedState.getLatestCandle('SBER', '5m');
    expect(latest5m).toBeDefined();
    expect(latest5m?.open).toBe(100);
    expect(latest5m?.high).toBe(110);
    expect(latest5m?.low).toBe(95);
    expect(latest5m?.close).toBe(109);
    expect(latest5m?.volume).toBe(10 + 20 + 15 + 25 + 30); // 100
    expect(latest5m?.isComplete).toBe(true);
    expect(latest5m?.time).toBe(alignedBaseTime);

    const latest1d = sharedState.getLatestCandle('SBER', '1d');
    expect(latest1d).toBeDefined();
    expect(latest1d?.open).toBe(100);
    expect(latest1d?.high).toBe(110);
    expect(latest1d?.low).toBe(95);
    expect(latest1d?.close).toBe(109);
    expect(latest1d?.volume).toBe(100);
  });

  it('setCandles sorts chronologically and deduplicates candles', () => {
    const sharedState = new SharedState();

    const unsortedCandles: Candle[] = [
      { figi: 'F1', ticker: 'GAZP', timeframe: '5m', time: 3000, open: 10, high: 12, low: 9, close: 11, volume: 100, isComplete: true },
      { figi: 'F1', ticker: 'GAZP', timeframe: '5m', time: 1000, open: 8, high: 9, low: 7, close: 8.5, volume: 50, isComplete: true },
      { figi: 'F1', ticker: 'GAZP', timeframe: '5m', time: 2000, open: 9, high: 10, low: 8.5, close: 9.5, volume: 80, isComplete: true },
      { figi: 'F1', ticker: 'GAZP', timeframe: '5m', time: 2000, open: 9, high: 10.5, low: 8.5, close: 10, volume: 90, isComplete: true }, // Duplicate with updated close
    ];

    sharedState.setCandles('GAZP', '5m', unsortedCandles);

    const candles = sharedState.getCandles('GAZP', '5m');
    expect(candles.length).toBe(3);
    expect(candles[0].time).toBe(1000);
    expect(candles[1].time).toBe(2000);
    expect(candles[1].close).toBe(10); // Overwritten by last duplicate
    expect(candles[2].time).toBe(3000);
  });
});
