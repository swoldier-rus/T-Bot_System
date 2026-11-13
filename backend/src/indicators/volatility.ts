import { ema, rma, sma } from './moving-averages';
import { stdev } from './series-math';
import { BollingerBandsResult, OHLCV, SupertrendResult, TrendDirection } from './types';

/**
 * True Range (TR).
 * TR = max(high - low, abs(high - prevClose), abs(low - prevClose))
 */
export function trueRange(candles: OHLCV[]): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (candles.length === 0) return result;

  result[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    result[i] = tr;
  }

  return result;
}

/**
 * Average True Range (ATR).
 * Calculated by applying Wilder's RMA to True Range.
 */
export function atr(candles: OHLCV[], period = 14): number[] {
  const tr = trueRange(candles);
  return rma(tr, period);
}

/**
 * Bollinger Bands.
 */
export function bollingerBands(
  source: OHLCV[] | number[],
  period = 20,
  multiplier = 2
): BollingerBandsResult {
  const prices: number[] =
    typeof source[0] === 'number'
      ? (source as number[])
      : (source as OHLCV[]).map((c) => c.close);

  const basis = sma(prices, period);
  const deviations = stdev(prices, period);

  const upper: number[] = new Array(prices.length).fill(NaN);
  const lower: number[] = new Array(prices.length).fill(NaN);

  for (let i = 0; i < prices.length; i++) {
    if (Number.isFinite(basis[i]) && Number.isFinite(deviations[i])) {
      upper[i] = basis[i] + multiplier * deviations[i];
      lower[i] = basis[i] - multiplier * deviations[i];
    }
  }

  const lastIdx = prices.length - 1;
  return {
    upper,
    basis,
    lower,
    latestUpper: upper[lastIdx] ?? 0,
    latestBasis: basis[lastIdx] ?? 0,
    latestLower: lower[lastIdx] ?? 0,
  };
}

/**
 * Classic Supertrend indicator based on ATR and Trailing Bands.
 */
export function supertrend(
  candles: OHLCV[],
  atrPeriod = 10,
  multiplier = 3
): SupertrendResult {
  const len = candles.length;
  const supertrendSeries: number[] = new Array(len).fill(NaN);
  const directions: TrendDirection[] = new Array(len).fill('LONG');

  if (len < atrPeriod) {
    return {
      supertrend: supertrendSeries,
      direction: directions,
      latestSupertrend: NaN,
      latestDirection: 'LONG',
    };
  }

  const atrValues = atr(candles, atrPeriod);

  let prevFinalUpper = 0;
  let prevFinalLower = 0;
  let prevSupertrend = 0;
  let prevDirection: TrendDirection = 'LONG';

  for (let i = 0; i < len; i++) {
    const currentAtr = atrValues[i];
    if (!Number.isFinite(currentAtr)) continue;

    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUpper = hl2 + multiplier * currentAtr;
    const basicLower = hl2 - multiplier * currentAtr;

    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (prevSupertrend !== 0) {
      finalUpper =
        basicUpper < prevFinalUpper || candles[i - 1].close > prevFinalUpper
          ? basicUpper
          : prevFinalUpper;

      finalLower =
        basicLower > prevFinalLower || candles[i - 1].close < prevFinalLower
          ? basicLower
          : prevFinalLower;
    }

    let currentDirection: TrendDirection = prevDirection;
    let currentSupertrend = prevSupertrend;

    if (prevDirection === 'LONG') {
      if (candles[i].close < finalLower) {
        currentDirection = 'SHORT';
        currentSupertrend = finalUpper;
      } else {
        currentSupertrend = finalLower;
      }
    } else {
      if (candles[i].close > finalUpper) {
        currentDirection = 'LONG';
        currentSupertrend = finalLower;
      } else {
        currentSupertrend = finalUpper;
      }
    }

    supertrendSeries[i] = currentSupertrend;
    directions[i] = currentDirection;

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevSupertrend = currentSupertrend;
    prevDirection = currentDirection;
  }

  const lastIdx = len - 1;
  return {
    supertrend: supertrendSeries,
    direction: directions,
    latestSupertrend: supertrendSeries[lastIdx] ?? 0,
    latestDirection: directions[lastIdx] ?? 'LONG',
  };
}

/**
 * Keltner Channels.
 * Middle: EMA(close, emaPeriod)
 * Upper: Middle + multiplier * ATR(atrPeriod)
 * Lower: Middle - multiplier * ATR(atrPeriod)
 */
export function keltnerChannels(
  candles: OHLCV[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): { upper: number[]; basis: number[]; lower: number[] } {
  const closes = candles.map((c) => c.close);
  const basis = ema(closes, emaPeriod);
  const atrValues = atr(candles, atrPeriod);

  const upper: number[] = new Array(candles.length).fill(NaN);
  const lower: number[] = new Array(candles.length).fill(NaN);

  for (let i = 0; i < candles.length; i++) {
    if (Number.isFinite(basis[i]) && Number.isFinite(atrValues[i])) {
      upper[i] = basis[i] + multiplier * atrValues[i];
      lower[i] = basis[i] - multiplier * atrValues[i];
    }
  }

  return { upper, basis, lower };
}
