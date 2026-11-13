import { OHLCV } from './types';

/**
 * Simple Moving Average (SMA).
 */
export function sma(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

/**
 * Exponential Moving Average (EMA).
 * Smoothing factor: alpha = 2 / (period + 1).
 */
export function ema(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Initial value is SMA of first 'period' elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < values.length; i++) {
    const current = values[i];
    const currentEma = current * multiplier + prevEma * (1 - multiplier);
    result[i] = currentEma;
    prevEma = currentEma;
  }

  return result;
}

/**
 * Wilder's Moving Average (RMA).
 * Smoothing factor: alpha = 1 / period. Used in Wilder's RSI and ATR.
 */
export function rma(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevRma = sum / period;
  result[period - 1] = prevRma;

  for (let i = period; i < values.length; i++) {
    const currentRma = (prevRma * (period - 1) + values[i]) / period;
    result[i] = currentRma;
    prevRma = currentRma;
  }

  return result;
}

/**
 * Weighted Moving Average (WMA).
 * Linear weighting from 1 to period.
 */
export function wma(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < values.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      weightedSum += values[i - period + 1 + j] * (j + 1);
    }
    result[i] = weightedSum / weightSum;
  }

  return result;
}

/**
 * Volume-Weighted Moving Average (VWMA).
 * Ratio of SMA(Price * Volume, period) / SMA(Volume, period).
 */
export function vwma(candles: OHLCV[], period: number): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (period <= 0 || candles.length < period) return result;

  let pvSum = 0;
  let volSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const vol = candles[i].volume ?? 1;
    const pv = candles[i].close * vol;

    pvSum += pv;
    volSum += vol;

    if (i >= period) {
      const oldVol = candles[i - period].volume ?? 1;
      pvSum -= candles[i - period].close * oldVol;
      volSum -= oldVol;
    }

    if (i >= period - 1) {
      result[i] = volSum === 0 ? candles[i].close : (pvSum / volSum);
    }
  }

  return result;
}

/**
 * Hull Moving Average (HMA).
 * HMA = WMA(2 * WMA(n/2) - WMA(n), floor(sqrt(n)))
 */
export function hma(values: number[], period: number): number[] {
  if (period <= 1 || values.length < period) {
    return new Array(values.length).fill(NaN);
  }

  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaHalf = wma(values, halfPeriod);
  const wmaFull = wma(values, period);

  const diffSeries: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(wmaHalf[i]) && Number.isFinite(wmaFull[i])) {
      diffSeries[i] = 2 * wmaHalf[i] - wmaFull[i];
    }
  }

  return wma(diffSeries, sqrtPeriod);
}
