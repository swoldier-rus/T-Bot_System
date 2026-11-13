import { describe, expect, it } from 'vitest';
import {
  atr,
  bollingerBands,
  cci,
  ema,
  macd,
  nadarayaWatsonEnvelope,
  rsi,
  sma,
  stochastic,
  trueRange,
} from '../src/indicators';

describe('Sub-ruble Instrument Math & Precision (< 1.0 ₽)', () => {
  // Realistic TGKA price walk (~0.0050 ₽ with micro-fluctuations)
  const tgkaPrices: number[] = [];
  let p = 0.005060;
  for (let i = 0; i < 40; i++) {
    p += Math.sin(i / 2) * 0.000030;
    tgkaPrices.push(p);
  }

  const tgkaCandles = tgkaPrices.map((c) => ({
    high: c + 0.000015,
    low: c - 0.000015,
    close: c,
    volume: 500,
  }));

  it('computes exact unrounded SMA for prices with 6 decimals', () => {
    const res = sma(tgkaPrices, 5);
    const last = res[res.length - 1];
    expect(Number.isFinite(last)).toBe(true);
    // Should preserve full float precision without 4-decimal truncation
    expect(last).toBeGreaterThan(0.0050);
    expect(last).toBeLessThan(0.0052);
    // Difference between consecutive points must not be zeroed out
    expect(res[res.length - 1] - res[res.length - 2]).not.toBe(0);
  });

  it('calculates CCI without spurious distortion on micro-fluctuations', () => {
    const res = cci(tgkaCandles, 20);
    const last = res[res.length - 1];
    expect(Number.isFinite(last)).toBe(true);
    // Valid standard oscillation range
    expect(last).toBeGreaterThan(-300);
    expect(last).toBeLessThan(300);
  });

  it('calculates True Range and ATR without collapsing to 0 on micro ranges', () => {
    const tr = trueRange(tgkaCandles);
    // Range is 0.000030 (high - low)
    expect(tr[0]).toBeCloseTo(0.000030, 6);
    expect(tr[0]).toBeGreaterThan(0);

    const atrRes = atr(tgkaCandles, 14);
    const lastAtr = atrRes[atrRes.length - 1];
    expect(Number.isFinite(lastAtr)).toBe(true);
    expect(lastAtr).toBeGreaterThan(0);
  });

  it('calculates MACD line without zeroing out on sub-ruble prices', () => {
    const res = macd(tgkaPrices, 12, 26, 9);
    expect(Number.isFinite(res.latestMacd)).toBe(true);
    // The EMA spread is small (~0.00001), but must NOT be forced to 0
    expect(res.latestMacd).not.toBe(0);
  });

  it('calculates Bollinger Bands preserving 6-decimal envelope levels', () => {
    const res = bollingerBands(tgkaPrices, 20, 2);
    const last = tgkaPrices.length - 1;
    expect(res.upper[last]).toBeGreaterThan(res.basis[last]);
    expect(res.basis[last]).toBeGreaterThan(res.lower[last]);
    expect(res.upper[last] - res.lower[last]).toBeGreaterThan(0);
  });

  it('calculates NWE bands accurately with both repaint=true and repaint=false', () => {
    const repTrue = nadarayaWatsonEnvelope(tgkaPrices, 8, 3, true);
    const repFalse = nadarayaWatsonEnvelope(tgkaPrices, 8, 3, false);

    expect(repTrue.upper).toBeGreaterThan(repTrue.mid);
    expect(repTrue.mid).toBeGreaterThan(repTrue.lower);
    expect(repFalse.upper).toBeGreaterThan(repFalse.mid);
    expect(repFalse.mid).toBeGreaterThan(repFalse.lower);

    // Midpoints match causal kernel regression at current bar
    expect(repTrue.mid).toBeCloseTo(repFalse.mid, 5);
  });
});
