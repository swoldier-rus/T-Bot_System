import { describe, expect, it } from 'vitest';
import {
  calculateRSI,
  calculateStochastic,
} from '../src/modules/rsi-stoch/indicators';
import {
  detectDivergence,
  evaluateRsiStochRules,
} from '../src/modules/rsi-stoch/signal-rules';
import { Candle, Instrument } from '../src/types/market';
import { SharedState } from '../src/core/shared-state';

describe('Indicators Math: RSI & Stochastic', () => {
  describe('calculateRSI', () => {
    it('returns empty array if prices length is <= period', () => {
      const prices = [10, 11, 12, 13];
      expect(calculateRSI(prices, 14)).toEqual([]);
    });

    it('returns RSI = 100 for continuous monotonic price growth', () => {
      const prices: number[] = [];
      for (let i = 0; i < 30; i++) {
        prices.push(100 + i * 2);
      }
      const rsi = calculateRSI(prices, 14);
      expect(rsi.length).toBe(30 - 14);
      expect(rsi[rsi.length - 1]).toBe(100);
    });

    it('returns RSI = 0 for continuous monotonic price decline', () => {
      const prices: number[] = [];
      for (let i = 0; i < 30; i++) {
        prices.push(200 - i * 2);
      }
      const rsi = calculateRSI(prices, 14);
      expect(rsi.length).toBe(30 - 14);
      expect(rsi[rsi.length - 1]).toBe(0);
    });

    it('correctly calculates Wilder smoothed RSI on realistic fluctuating data', () => {
      // 15 days of prices
      const prices = [
        44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
        45.89, 46.03, 45.61, 46.28, 46.28, 46.0,
      ];
      const rsi = calculateRSI(prices, 14);
      expect(rsi.length).toBe(2);
      // The first RSI(14) on day 15 is around 70.5
      expect(rsi[0]).toBeGreaterThan(65);
      expect(rsi[0]).toBeLessThan(75);
    });
  });

  describe('calculateStochastic', () => {
    it('returns empty series if candle length < kPeriod', () => {
      const candles = [
        { high: 10, low: 5, close: 8 },
        { high: 11, low: 6, close: 9 },
      ];
      const res = calculateStochastic(candles, 14, 3, 3);
      expect(res.k).toEqual([]);
      expect(res.d).toEqual([]);
    });

    it('calculates %K and %D accurately on steady high prices', () => {
      const candles: Array<{ high: number; low: number; close: number }> = [];
      for (let i = 0; i < 25; i++) {
        // Highs and closes near the top of the range
        candles.push({
          high: 100 + i,
          low: 90 + i,
          close: 100 + i, // Closing at the high
        });
      }
      const res = calculateStochastic(candles, 14, 3, 3);
      expect(res.k.length).toBeGreaterThan(0);
      expect(res.d.length).toBeGreaterThan(0);
      // Closing at highest high gives %K = 100
      expect(res.latestK).toBe(100);
      expect(res.latestD).toBe(100);
    });
  });

  describe('Signal Rules & Divergence', () => {
    it('detects BULLISH_CROSS when %K crosses %D upward in oversold zone', () => {
      const candles: Candle[] = [];
      const now = Date.now();
      for (let i = 0; i < 20; i++) {
        candles.push({
          figi: 'FIGI_SBER',
          ticker: 'SBER',
          timeframe: '1m',
          time: now + i * 60000,
          open: 100,
          high: 102,
          low: 98,
          close: 99,
          volume: 100,
          isComplete: true,
        });
      }

      const rsiValues = [25, 26, 27];
      const kValues = [14, 18]; // Crossed above D
      const dValues = [15, 16];

      const signal = evaluateRsiStochRules(candles, rsiValues, kValues, dValues);
      expect(signal).not.toBeNull();
      expect(signal?.direction).toBe('LONG');
      expect(signal?.reason).toBe('BULLISH_CROSS');
      expect(signal?.severity).toBe('MEDIUM');
    });

    it('detects BEARISH_CROSS when %K crosses %D downward in overbought zone', () => {
      const candles: Candle[] = [];
      const now = Date.now();
      for (let i = 0; i < 20; i++) {
        candles.push({
          figi: 'FIGI_SBER',
          ticker: 'SBER',
          timeframe: '1m',
          time: now + i * 60000,
          open: 200,
          high: 205,
          low: 198,
          close: 204,
          volume: 100,
          isComplete: true,
        });
      }

      const rsiValues = [78, 77, 76];
      const kValues = [85, 80]; // Crossed below D
      const dValues = [82, 82];

      const signal = evaluateRsiStochRules(candles, rsiValues, kValues, dValues);
      expect(signal).not.toBeNull();
      expect(signal?.direction).toBe('SHORT');
      expect(signal?.reason).toBe('BEARISH_CROSS');
      expect(signal?.severity).toBe('MEDIUM');
    });

    it('detects Bullish Divergence when price makes lower low but RSI makes higher low', () => {
      const candles: Candle[] = [];
      const now = Date.now();
      const rsiValues: number[] = [];

      // Create 20 candles
      // Swing low 1 at index 10: price 95, RSI 20
      // Swing low 2 at index 18: price 90 (lower low), RSI 28 (higher low)
      for (let i = 0; i < 20; i++) {
        let price = 100;
        let rsi = 35;

        if (i === 10) {
          price = 95;
          rsi = 20;
        } else if (i === 9 || i === 11) {
          price = 98;
          rsi = 26;
        } else if (i === 19) {
          price = 90; // lower price on latest candle
          rsi = 30; // higher RSI on latest candle
        }

        candles.push({
          figi: 'FIGI_SBER',
          ticker: 'SBER',
          timeframe: '1m',
          time: now + i * 60000,
          open: price,
          high: price + 1,
          low: price,
          close: price,
          volume: 100,
          isComplete: true,
        });
        rsiValues.push(rsi);
      }

      const div = detectDivergence(candles, rsiValues);
      expect(div).toBe('BULLISH');
    });
  });
  describe('Daily Timeframe (1d) Full Indicator Parity in SharedState', () => {
    it('calculates RSI, STCH, CCI, and Nadaraya-Watson for 1d and updates on new 1d candles', () => {
      const state = new SharedState();
      const instrument: Instrument = {
        ticker: 'SBER',
        figi: 'BBG004730N88',
        name: 'Сбербанк',
        lot: 10,
      };
      state.setInstrument(instrument);

      const dayMs = 86400000;
      const baseTime = 1700000000000;
      const dailyCandles: Candle[] = [];

      for (let i = 0; i < 40; i++) {
        const price = 250 + Math.sin(i / 5) * 20;
        dailyCandles.push({
          figi: 'BBG004730N88',
          ticker: 'SBER',
          timeframe: '1d',
          time: baseTime + i * dayMs,
          open: price - 1,
          high: price + 2,
          low: price - 2,
          close: price,
          volume: 10000 + i * 500,
          isComplete: true,
        });
      }

      state.setCandles('SBER', '1d', dailyCandles);

      const stock = state.getStockItem('SBER');
      expect(stock).toBeDefined();
      expect(stock?.tf).toBeDefined();
      expect(stock?.tf['1d']).toBeDefined();

      // Check all 4 indicators on 1d
      const tf1d = stock!.tf['1d'];
      expect(tf1d.rsi).not.toBeNull();
      expect(typeof tf1d.rsi).toBe('number');
      expect(tf1d.rsi).toBeGreaterThan(0);
      expect(tf1d.rsi).toBeLessThan(100);

      expect(tf1d.k).not.toBeNull();
      expect(typeof tf1d.k).toBe('number');

      expect(tf1d.d).not.toBeNull();
      expect(typeof tf1d.d).toBe('number');

      expect(tf1d.cci).not.toBeNull();
      expect(typeof tf1d.cci).toBe('number');

      expect(tf1d.nw).toBeDefined();
      expect(tf1d.nw?.signal).toBeDefined();
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(tf1d.nw?.signal);

      // Verify formatStockItem preserves 1d
      const formatted = state.formatStockItem(stock!);
      expect(formatted.tf['1d']).toBeDefined();
      expect(formatted.tf['1d'].rsi).toBe(tf1d.rsi);

      // Real-time candle update
      const initialRsi = tf1d.rsi;
      const newCandle: Candle = {
        figi: 'BBG004730N88',
        ticker: 'SBER',
        timeframe: '1d',
        time: baseTime + 40 * dayMs,
        open: 300,
        high: 320,
        low: 295,
        close: 318, // sharp spike up
        volume: 25000,
        isComplete: false,
      };

      state.updateCandle(newCandle);

      const updatedStock = state.getStockItem('SBER');
      expect(updatedStock!.tf['1d'].rsi).toBeDefined();
      // Price spike should shift daily RSI upward
      expect(updatedStock!.tf['1d'].rsi).toBeGreaterThan(initialRsi!);
    });
  });
});
