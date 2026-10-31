import { describe, expect, it } from 'vitest';
import { cci, gaussianKernel, nadarayaWatsonEnvelope } from '../src/indicators';

describe('Nadaraya-Watson Envelope Indicator', () => {
  it('gaussianKernel computes correct bell curve values', () => {
    expect(gaussianKernel(0, 8)).toBe(1);
    expect(gaussianKernel(8, 8)).toBeCloseTo(Math.exp(-0.5), 4);
    expect(gaussianKernel(16, 8)).toBeCloseTo(Math.exp(-2), 4);
    expect(gaussianKernel(0, 0)).toBe(1);
  });

  it('handles small or empty price arrays gracefully', () => {
    const resEmpty = nadarayaWatsonEnvelope([]);
    expect(resEmpty).toEqual({ mid: 0, upper: 0, lower: 0, signal: 'NEUTRAL' });

    const resSingle = nadarayaWatsonEnvelope([150]);
    expect(resSingle).toEqual({ mid: 150, upper: 150, lower: 150, signal: 'NEUTRAL' });
  });

  it('computes non-repainting endpoint envelope accurately', () => {
    // Monotonic uptrend
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
    const res = nadarayaWatsonEnvelope(prices, 8, 3, false);

    expect(res.mid).toBeGreaterThan(100);
    expect(res.upper).toBeGreaterThan(res.mid);
    expect(res.lower).toBeLessThan(res.mid);
    expect(res.upper - res.mid).toBeCloseTo(res.mid - res.lower, 1);
  });

  it('maintains tight realistic envelope width during long sustained trends (no residual explosion)', () => {
    // 200 bars trending from 100 to 300 with small noise
    const trendingPrices = Array.from({ length: 200 }, (_, i) => 100 + i + (i % 2 === 0 ? 0.5 : -0.5));
    const res = nadarayaWatsonEnvelope(trendingPrices, 8, 3, false);

    // Old bug caused envelope width to be ~150 points. True residual MAE keeps it tight and realistic.
    const envelopeWidth = res.upper - res.lower;
    expect(envelopeWidth).toBeLessThan(45);
    expect(envelopeWidth).toBeGreaterThan(0);
  });

  it('triggers BUY signal when price drops below lower band', () => {
    const basePrices = Array.from({ length: 40 }, () => 100);
    // Sudden sharp drop on latest candle
    basePrices.push(50);

    const res = nadarayaWatsonEnvelope(basePrices, 8, 2, false);
    expect(res.signal).toBe('BUY');
    expect(res.lower).toBeGreaterThan(50);
  });

  it('triggers SELL signal when price surges above upper band', () => {
    const basePrices = Array.from({ length: 40 }, () => 100);
    // Sudden sharp spike on latest candle
    basePrices.push(160);

    const res = nadarayaWatsonEnvelope(basePrices, 8, 2, false);
    expect(res.signal).toBe('SELL');
    expect(res.upper).toBeLessThan(160);
  });

  it('computes repainting smoothing mode correctly', () => {
    const prices = [100, 102, 101, 105, 107, 110, 108, 112, 115, 114, 118];
    const res = nadarayaWatsonEnvelope(prices, 8, 3, true);

    expect(res.mid).toBeGreaterThan(100);
    expect(res.upper).toBeGreaterThan(res.mid);
    expect(res.lower).toBeLessThan(res.mid);
    expect(['BUY', 'SELL', 'NEUTRAL']).toContain(res.signal);
  });
});

describe('Commodity Channel Index (CCI)', () => {
  it('computes CCI across candle series', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
    }));

    const cciVals = cci(candles, 20);
    expect(cciVals.length).toBe(30);
    // First 19 values should be NaN
    expect(Number.isNaN(cciVals[0])).toBe(true);
    expect(Number.isNaN(cciVals[18])).toBe(true);
    // Value at index 19 should be finite
    expect(Number.isFinite(cciVals[19])).toBe(true);
  });
});
