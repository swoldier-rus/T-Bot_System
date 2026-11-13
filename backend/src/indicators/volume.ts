import { OHLCV, VWAPResult } from './types';

/**
 * Volume Weighted Average Price (VWAP) with Standard Deviation Bands.
 */
export function vwap(
  candles: OHLCV[],
  resetFlags?: boolean[]
): VWAPResult {
  const len = candles.length;
  const vwapSeries: number[] = new Array(len).fill(NaN);
  const upper1Series: number[] = new Array(len).fill(NaN);
  const lower1Series: number[] = new Array(len).fill(NaN);

  if (len === 0) {
    return { vwap: vwapSeries, latestVwap: NaN };
  }

  let cumulativePv = 0;
  let cumulativePv2 = 0;
  let cumulativeVol = 0;

  for (let i = 0; i < len; i++) {
    // If a new session anchor is flagged, reset the cumulative sums
    if (resetFlags && resetFlags[i]) {
      cumulativePv = 0;
      cumulativePv2 = 0;
      cumulativeVol = 0;
    }

    const c = candles[i];
    const vol = c.volume && c.volume > 0 ? c.volume : 1;
    const tp = (c.high + c.low + c.close) / 3;

    cumulativePv += tp * vol;
    cumulativePv2 += tp * tp * vol;
    cumulativeVol += vol;

    if (cumulativeVol > 0) {
      const currentVwap = cumulativePv / cumulativeVol;
      vwapSeries[i] = currentVwap;

      // Standard deviation of VWAP: sqrt(max(0, (sum(pv^2)/v) - vwap^2))
      const variance = Math.max(0, cumulativePv2 / cumulativeVol - currentVwap * currentVwap);
      const stdevVwap = Math.sqrt(variance);

      upper1Series[i] = currentVwap + stdevVwap;
      lower1Series[i] = currentVwap - stdevVwap;
    }
  }

  const lastIdx = len - 1;
  return {
    vwap: vwapSeries,
    upper1: upper1Series,
    lower1: lower1Series,
    latestVwap: vwapSeries[lastIdx] ?? 0,
  };
}

/**
 * On-Balance Volume (OBV).
 */
export function obv(candles: OHLCV[]): number[] {
  const result: number[] = new Array(candles.length).fill(0);
  if (candles.length === 0) return result;

  let currentObv = 0;
  result[0] = currentObv;

  for (let i = 1; i < candles.length; i++) {
    const vol = candles[i].volume ?? 0;
    if (candles[i].close > candles[i - 1].close) {
      currentObv += vol;
    } else if (candles[i].close < candles[i - 1].close) {
      currentObv -= vol;
    }
    result[i] = currentObv;
  }

  return result;
}
