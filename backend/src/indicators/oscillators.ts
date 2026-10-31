import { ema, rma, sma } from './moving-averages';
import { MACDResult, OHLCV, StochasticResult } from './types';

/**
 * Relative Strength Index (RSI) using Wilder's Smoothing.
 */
export function rsi(prices: number[], period = 14): number[] {
  if (prices.length <= period) {
    return [];
  }

  const rsiValues: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }

  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  rsiValues.push(Number(currentRsi.toFixed(2)));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      currentRsi = 100;
    } else if (avgGain === 0) {
      currentRsi = 0;
    } else {
      rs = avgGain / avgLoss;
      currentRsi = 100 - 100 / (1 + rs);
    }
    rsiValues.push(Number(currentRsi.toFixed(2)));
  }

  return rsiValues;
}

/**
 * Slow Stochastic Oscillator (%K, %D).
 */
export function stochastic(
  candles: OHLCV[],
  kPeriod = 14,
  smoothK = 3,
  dPeriod = 3
): StochasticResult {
  if (candles.length < kPeriod) {
    return { k: [], d: [], latestK: 50, latestD: 50 };
  }

  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const currentClose = candles[i].close;
    const range = highestHigh - lowestLow;
    const fastK = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
    rawK.push(fastK);
  }

  if (rawK.length < smoothK) {
    return { k: [], d: [], latestK: 50, latestD: 50 };
  }

  // Smooth raw %K with SMA
  const smoothedK: number[] = [];
  for (let i = smoothK - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = i - smoothK + 1; j <= i; j++) {
      sum += rawK[j];
    }
    smoothedK.push(Number((sum / smoothK).toFixed(2)));
  }

  if (smoothedK.length < dPeriod) {
    return {
      k: smoothedK,
      d: [],
      latestK: smoothedK[smoothedK.length - 1] ?? 50,
      latestD: smoothedK[smoothedK.length - 1] ?? 50,
    };
  }

  // %D is SMA of smoothed %K
  const dValues: number[] = [];
  for (let i = dPeriod - 1; i < smoothedK.length; i++) {
    let sum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      sum += smoothedK[j];
    }
    dValues.push(Number((sum / dPeriod).toFixed(2)));
  }

  return {
    k: smoothedK,
    d: dValues,
    latestK: smoothedK[smoothedK.length - 1] ?? 50,
    latestD: dValues[dValues.length - 1] ?? 50,
  };
}

/**
 * Moving Average Convergence Divergence (MACD).
 */
export function macd(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEma = ema(prices, fastPeriod);
  const slowEma = ema(prices, slowPeriod);

  const macdLine: number[] = new Array(prices.length).fill(NaN);
  for (let i = 0; i < prices.length; i++) {
    if (Number.isFinite(fastEma[i]) && Number.isFinite(slowEma[i])) {
      macdLine[i] = Number((fastEma[i] - slowEma[i]).toFixed(4));
    }
  }

  // Filter finite values to compute signal line
  const validMacd: number[] = [];
  const validIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (Number.isFinite(macdLine[i])) {
      validMacd.push(macdLine[i]);
      validIndices.push(i);
    }
  }

  const signalLine: number[] = new Array(prices.length).fill(NaN);
  const histogram: number[] = new Array(prices.length).fill(NaN);

  if (validMacd.length >= signalPeriod) {
    const rawSignal = ema(validMacd, signalPeriod);
    for (let j = 0; j < rawSignal.length; j++) {
      const origIdx = validIndices[j];
      signalLine[origIdx] = rawSignal[j];
      if (Number.isFinite(rawSignal[j])) {
        histogram[origIdx] = Number((macdLine[origIdx] - rawSignal[j]).toFixed(4));
      }
    }
  }

  const lastIdx = prices.length - 1;
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    latestMacd: Number.isFinite(macdLine[lastIdx]) ? macdLine[lastIdx] : 0,
    latestSignal: Number.isFinite(signalLine[lastIdx]) ? signalLine[lastIdx] : 0,
    latestHistogram: Number.isFinite(histogram[lastIdx]) ? histogram[lastIdx] : 0,
  };
}

/**
 * Commodity Channel Index (CCI).
 * Typical Price (TP) = (High + Low + Close) / 3
 * CCI = (TP - SMA(TP, period)) / (0.015 * MeanDeviation)
 */
export function cci(candles: OHLCV[], period = 20): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (period <= 0 || candles.length < period) return result;

  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const tpSma = sma(tp, period);

  for (let i = period - 1; i < candles.length; i++) {
    const mean = tpSma[i];
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(tp[j] - mean);
    }
    meanDev /= period;

    if (meanDev === 0) {
      result[i] = 0;
    } else {
      result[i] = Number(((tp[i] - mean) / (0.015 * meanDev)).toFixed(2));
    }
  }

  return result;
}

/**
 * Williams %R.
 * Formula: %R = -100 * (HighestHigh - Close) / (HighestHigh - LowestLow)
 * Range: 0 to -100 (Overbought > -20, Oversold < -80).
 */
export function williamsR(candles: OHLCV[], period = 14): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (period <= 0 || candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const range = highestHigh - lowestLow;
    if (range === 0) {
      result[i] = -50;
    } else {
      result[i] = Number(((-100 * (highestHigh - candles[i].close)) / range).toFixed(2));
    }
  }

  return result;
}
