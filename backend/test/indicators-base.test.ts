import { describe, expect, it } from 'vitest';
import {
  atr,
  bollingerBands,
  cci,
  crossover,
  crossunder,
  ema,
  hma,
  isCrossoverAtLast,
  isCrossunderAtLast,
  keltnerChannels,
  macd,
  obv,
  pivotHigh,
  pivotLow,
  rma,
  rsi,
  sma,
  stdev,
  stochastic,
  supertrend,
  trueRange,
  vwap,
  vwma,
  williamsR,
  wma,
} from '../src/indicators';

describe('Central Indicators Base', () => {
  describe('Moving Averages', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    it('calculates SMA correctly', () => {
      const res = sma(prices, 3);
      expect(res[0]).toBeNaN();
      expect(res[1]).toBeNaN();
      expect(res[2]).toBe(11); // (10+11+12)/3
      expect(res[3]).toBe(12); // (11+12+13)/3
      expect(res[9]).toBe(18); // (17+18+19)/3
    });

    it('calculates EMA correctly', () => {
      const res = ema(prices, 3);
      expect(res[2]).toBe(11); // initial SMA
      expect(res[3]).toBe(12); // EMA with multiplier 2/4 = 0.5: 13*0.5 + 11*0.5 = 12
    });

    it('calculates RMA (Wilder) correctly', () => {
      const res = rma(prices, 3);
      expect(res[2]).toBe(11); // initial SMA
      // RMA: (11*2 + 13)/3 = 35/3 ≈ 11.6667
      expect(res[3]).toBeCloseTo(11.6667, 2);
    });

    it('calculates WMA correctly', () => {
      const res = wma(prices, 3);
      // Weights: 1, 2, 3. Sum = 6
      // Index 2: (10*1 + 11*2 + 12*3)/6 = (10 + 22 + 36)/6 = 68/6 ≈ 11.3333
      expect(res[2]).toBeCloseTo(11.3333, 2);
    });

    it('calculates HMA without errors', () => {
      const res = hma(prices, 4);
      expect(res.length).toBe(prices.length);
      expect(Number.isFinite(res[prices.length - 1])).toBe(true);
    });

    it('calculates VWMA with volume', () => {
      const candles = prices.map((p, idx) => ({
        high: p + 1,
        low: p - 1,
        close: p,
        volume: (idx + 1) * 10,
      }));
      const res = vwma(candles, 3);
      expect(Number.isFinite(res[2])).toBe(true);
      expect(res[2]).toBeGreaterThan(10);
    });
  });

  describe('Oscillators', () => {
    const prices = [
      100, 102, 104, 103, 105, 107, 106, 108, 110, 109,
      111, 113, 112, 114, 116, 115, 117, 119, 118, 120,
    ];

    it('calculates RSI(14) properly', () => {
      const res = rsi(prices, 14);
      expect(res.length).toBe(prices.length - 14);
      // In uptrend, RSI should be elevated (> 70)
      expect(res[res.length - 1]).toBeGreaterThan(70);
    });

    it('calculates MACD(12, 26, 9)', () => {
      const longPrices: number[] = [];
      for (let i = 0; i < 40; i++) {
        longPrices.push(100 + i * 2);
      }
      const res = macd(longPrices, 12, 26, 9);
      expect(res.macd.length).toBe(40);
      expect(res.signal.length).toBe(40);
      expect(res.histogram.length).toBe(40);
      expect(Number.isFinite(res.latestMacd)).toBe(true);
      expect(res.latestMacd).toBeGreaterThan(0);
    });

    it('calculates CCI', () => {
      const candles = prices.map((p) => ({
        high: p + 2,
        low: p - 2,
        close: p,
      }));
      const res = cci(candles, 14);
      expect(res.length).toBe(prices.length);
      expect(Number.isFinite(res[res.length - 1])).toBe(true);
    });

    it('calculates Williams %R', () => {
      const candles = prices.map((p) => ({
        high: p + 2,
        low: p - 2,
        close: p,
      }));
      const res = williamsR(candles, 14);
      expect(res.length).toBe(prices.length);
      // Range is between -100 and 0
      expect(res[res.length - 1]).toBeGreaterThanOrEqual(-100);
      expect(res[res.length - 1]).toBeLessThanOrEqual(0);
    });
  });

  describe('Volatility & Trend', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: 100 + i + 2,
      low: 100 + i - 2,
      close: 100 + i,
      volume: 50,
    }));

    it('calculates True Range and ATR', () => {
      const tr = trueRange(candles);
      expect(tr[0]).toBe(4); // 102 - 98 = 4
      const atrRes = atr(candles, 10);
      expect(Number.isFinite(atrRes[atrRes.length - 1])).toBe(true);
      expect(atrRes[atrRes.length - 1]).toBeGreaterThan(0);
    });

    it('calculates Bollinger Bands', () => {
      const res = bollingerBands(candles, 10, 2);
      expect(res.upper.length).toBe(candles.length);
      expect(res.basis.length).toBe(candles.length);
      expect(res.lower.length).toBe(candles.length);

      const last = candles.length - 1;
      expect(res.upper[last]).toBeGreaterThan(res.basis[last]);
      expect(res.basis[last]).toBeGreaterThan(res.lower[last]);
    });

    it('calculates Supertrend and direction', () => {
      const res = supertrend(candles, 10, 3);
      expect(res.supertrend.length).toBe(candles.length);
      expect(res.direction.length).toBe(candles.length);
      expect(res.latestDirection).toBe('LONG'); // Steadily rising prices
    });

    it('calculates Keltner Channels', () => {
      const res = keltnerChannels(candles, 10, 10, 2);
      const last = candles.length - 1;
      expect(res.upper[last]).toBeGreaterThan(res.basis[last]);
      expect(res.basis[last]).toBeGreaterThan(res.lower[last]);
    });
  });

  describe('Volume Indicators', () => {
    const candles = Array.from({ length: 15 }, (_, i) => ({
      high: 100 + i + 1,
      low: 100 + i - 1,
      close: 100 + i,
      volume: 100,
    }));

    it('calculates VWAP and bands', () => {
      const res = vwap(candles);
      expect(res.vwap.length).toBe(15);
      expect(res.latestVwap).toBeGreaterThan(0);
      if (res.upper1 && res.lower1) {
        expect(res.upper1[14]).toBeGreaterThanOrEqual(res.vwap[14]);
        expect(res.lower1[14]).toBeLessThanOrEqual(res.vwap[14]);
      }
    });

    it('calculates OBV', () => {
      const res = obv(candles);
      expect(res.length).toBe(15);
      // Because every candle closes higher, OBV should continuously accumulate
      expect(res[14]).toBe(14 * 100);
    });
  });

  describe('Series Math & Crossovers', () => {
    it('detects crossover and crossunder correctly', () => {
      const seriesA = [10, 12, 15, 14, 11];
      const seriesB = [12, 12, 12, 12, 12];

      const crossesAbove = crossover(seriesA, seriesB);
      expect(crossesAbove[2]).toBe(true); // 12 -> 15 crossed 12
      expect(crossesAbove[1]).toBe(false);

      const crossesBelow = crossunder(seriesA, seriesB);
      expect(crossesBelow[4]).toBe(true); // 14 -> 11 crossed below 12
    });

    it('checks isCrossoverAtLast and isCrossunderAtLast', () => {
      expect(isCrossoverAtLast([10, 15], 12)).toBe(true);
      expect(isCrossunderAtLast([15, 10], 12)).toBe(true);
      expect(isCrossoverAtLast([15, 16], 12)).toBe(false);
    });

    it('detects pivot highs and pivot lows', () => {
      const series = [10, 12, 20, 14, 11, 8, 12, 13];
      // Index 2 (value 20) is pivot high with left 2, right 2
      const highs = pivotHigh(series, 2, 2);
      expect(highs[4]).toBe(20); // Reported once right bars complete

      // Index 5 (value 8) is pivot low with left 2, right 2
      const lows = pivotLow(series, 2, 2);
      expect(lows[7]).toBe(8);
    });
  });
});
