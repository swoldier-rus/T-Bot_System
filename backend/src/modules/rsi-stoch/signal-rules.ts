import { Candle } from '../../types/market';
import { SignalDirection, SignalSeverity } from '../../types/signals';

export type SignalReason =
  | 'OVERSOLD_ZONE'
  | 'OVERBOUGHT_ZONE'
  | 'BULLISH_CROSS'
  | 'BEARISH_CROSS'
  | 'BULLISH_DIVERGENCE'
  | 'BEARISH_DIVERGENCE'
  | 'BULLISH_CROSS_AND_DIVERGENCE'
  | 'BEARISH_CROSS_AND_DIVERGENCE';

export interface EvaluatedSignal {
  direction: SignalDirection;
  severity: SignalSeverity;
  reason: SignalReason;
  rsi: number;
  stochK: number;
  stochD: number;
  price: number;
  details?: Record<string, unknown>;
}

/**
 * Detects swing pivots to identify Bullish and Bearish Divergences between Price and RSI.
 * Bullish Divergence: Price Low_2 < Price Low_1 AND RSI Low_2 > RSI Low_1
 * Bearish Divergence: Price High_2 > Price High_1 AND RSI High_2 < RSI High_1
 */
export function detectDivergence(
  candles: readonly Candle[],
  rsiValues: number[]
): 'BULLISH' | 'BEARISH' | null {
  // Need at least 15 candles and matching RSI points
  if (candles.length < 15 || rsiValues.length < 15) {
    return null;
  }

  // Align candle subset with RSI values
  const offset = candles.length - rsiValues.length;
  if (offset < 0) return null;

  // Search for local swing lows/highs in the last 20 candles
  const windowSize = Math.min(20, rsiValues.length);
  const startIdx = rsiValues.length - windowSize;

  const swingLows: Array<{ candleIdx: number; price: number; rsi: number }> = [];
  const swingHighs: Array<{ candleIdx: number; price: number; rsi: number }> = [];

  for (let i = startIdx + 1; i < rsiValues.length - 1; i++) {
    const cIdx = offset + i;
    const currentPriceLow = candles[cIdx].low;
    const currentPriceHigh = candles[cIdx].high;
    const currentRsi = rsiValues[i];

    // Local Low (pivot low: strictly lower than left and right neighbor)
    if (
      currentPriceLow < candles[cIdx - 1].low &&
      currentPriceLow < candles[cIdx + 1].low &&
      currentRsi < rsiValues[i - 1] &&
      currentRsi < rsiValues[i + 1]
    ) {
      swingLows.push({
        candleIdx: cIdx,
        price: currentPriceLow,
        rsi: currentRsi,
      });
    }

    // Local High (pivot high: strictly higher than left and right neighbor)
    if (
      currentPriceHigh > candles[cIdx - 1].high &&
      currentPriceHigh > candles[cIdx + 1].high &&
      currentRsi > rsiValues[i - 1] &&
      currentRsi > rsiValues[i + 1]
    ) {
      swingHighs.push({
        candleIdx: cIdx,
        price: currentPriceHigh,
        rsi: currentRsi,
      });
    }
  }

  // Also include the current latest candle if it made an extreme
  const latestCIdx = candles.length - 1;
  const latestRsiIdx = rsiValues.length - 1;
  const latestPrice = candles[latestCIdx].close;
  const latestRsi = rsiValues[latestRsiIdx];

  // Check Bullish Divergence against the last found swing low
  if (swingLows.length > 0) {
    const prevLow = swingLows[swingLows.length - 1];
    // Distance between pivots must be at least 3 candles to avoid noise
    if (latestCIdx - prevLow.candleIdx >= 3) {
      if (latestPrice < prevLow.price && latestRsi > prevLow.rsi && latestRsi < 40) {
        return 'BULLISH';
      }
    }
  }

  // Check Bearish Divergence against the last found swing high
  if (swingHighs.length > 0) {
    const prevHigh = swingHighs[swingHighs.length - 1];
    if (latestCIdx - prevHigh.candleIdx >= 3) {
      if (latestPrice > prevHigh.price && latestRsi < prevHigh.rsi && latestRsi > 60) {
        return 'BEARISH';
      }
    }
  }

  return null;
}

/**
 * Evaluates indicator conditions according to Section 3.4 rules.
 */
export function evaluateRsiStochRules(
  candles: readonly Candle[],
  rsiValues: number[],
  kValues: number[],
  dValues: number[]
): EvaluatedSignal | null {
  if (
    candles.length === 0 ||
    rsiValues.length < 2 ||
    kValues.length < 2 ||
    dValues.length < 2
  ) {
    return null;
  }

  const latestCandle = candles[candles.length - 1];
  const currentPrice = latestCandle.close;

  const currentRsi = rsiValues[rsiValues.length - 1];
  const currentK = kValues[kValues.length - 1];
  const prevK = kValues[kValues.length - 2];
  const currentD = dValues[dValues.length - 1];
  const prevD = dValues[dValues.length - 2];

  // 1. Stochastic crosses
  const isBullishCross = prevK <= prevD && currentK > currentD && currentK <= 25;
  const isBearishCross = prevK >= prevD && currentK < currentD && currentK >= 75;

  // 2. Divergence check
  const divergence = detectDivergence(candles, rsiValues);

  // 3. Combined conditions
  if (isBullishCross && divergence === 'BULLISH') {
    return {
      direction: 'LONG',
      severity: 'HIGH',
      reason: 'BULLISH_CROSS_AND_DIVERGENCE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  if (isBearishCross && divergence === 'BEARISH') {
    return {
      direction: 'SHORT',
      severity: 'HIGH',
      reason: 'BEARISH_CROSS_AND_DIVERGENCE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  // 4. Standalone crosses in extreme zones
  if (isBullishCross) {
    return {
      direction: 'LONG',
      severity: 'MEDIUM',
      reason: 'BULLISH_CROSS',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  if (isBearishCross) {
    return {
      direction: 'SHORT',
      severity: 'MEDIUM',
      reason: 'BEARISH_CROSS',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  // 5. Standalone Divergence
  if (divergence === 'BULLISH') {
    return {
      direction: 'LONG',
      severity: 'MEDIUM',
      reason: 'BULLISH_DIVERGENCE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  if (divergence === 'BEARISH') {
    return {
      direction: 'SHORT',
      severity: 'MEDIUM',
      reason: 'BEARISH_DIVERGENCE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  // 6. Extreme zone alerts
  if (currentRsi < 30 && currentK < 20) {
    return {
      direction: 'LONG',
      severity: 'LOW',
      reason: 'OVERSOLD_ZONE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  if (currentRsi > 70 && currentK > 80) {
    return {
      direction: 'SHORT',
      severity: 'LOW',
      reason: 'OVERBOUGHT_ZONE',
      rsi: currentRsi,
      stochK: currentK,
      stochD: currentD,
      price: currentPrice,
    };
  }

  return null;
}
