import { NadarayaWatsonResult } from './types';

/**
 * Gaussian kernel weighting function:
 * K(x, h) = exp(-(x^2) / (2 * h^2))
 */
export function gaussianKernel(x: number, h: number): number {
  if (h <= 0) return 1;
  return Math.exp(-(x * x) / (2 * h * h));
}

/**
 * Nadaraya-Watson Envelope (NWE) based on LuxAlgo's Pine Script implementation.
 *
 * @param prices Array of historical close prices (chronological order, latest is last).
 * @param bandwidth Bandwidth parameter (h), default 8.
 * @param mult Envelope multiplier for mean absolute error (mult), default 3.
 * @param repaint If false, uses causal Non-Repainting Endpoint calculation.
 *                If true, uses full-window kernel regression.
 */
export function nadarayaWatsonEnvelope(
  prices: number[],
  bandwidth = 8,
  mult = 3,
  repaint = true
): NadarayaWatsonResult {
  const len = prices.length;
  if (len < 2) {
    const p = len === 1 ? prices[0] : 0;
    return { mid: p, upper: p, lower: p, signal: 'NEUTRAL' };
  }

  const h = Math.max(0.1, bandwidth);
  const lookback = Math.min(len, 500);
  const latestPrice = prices[len - 1];

  let out = 0;
  let mae = 0;

  if (repaint) {
    // --- 1. LuxAlgo Standard Nadaraya-Watson Envelope (Exact TradingView Match) ---
    // Kernel regression across up to 500 bars window (matching LuxAlgo Pine Script length = 500)
    const cutoff = Math.min(lookback, Math.max(40, Math.ceil(h * 5)));
    const weights = new Float64Array(cutoff + 1);
    for (let k = 0; k <= cutoff; k++) {
      weights[k] = Math.exp(-(k * k) / (2 * h * h));
    }

    let saeSum = 0;
    for (let i = 0; i < lookback; i++) {
      let sum = 0;
      let sumw = 0;
      const jMin = Math.max(0, i - cutoff);
      const jMax = Math.min(lookback - 1, i + cutoff);
      for (let j = jMin; j <= jMax; j++) {
        const diff = Math.abs(i - j);
        const w = weights[diff];
        sum += prices[len - 1 - j] * w;
        sumw += w;
      }
      const y = sumw > 0 ? sum / sumw : prices[len - 1 - i];
      if (i === 0) {
        out = y;
      }
      saeSum += Math.abs(prices[len - 1 - i] - y);
    }
    mae = (saeSum / lookback) * mult;
  } else {
    // --- 2. Non-Repainting Causal Endpoint Method across Full 500-bar Window ---
    const maxK = Math.min(lookback, Math.max(30, Math.ceil(h * 5)));
    const kernelWeights = new Float64Array(maxK + 1);
    for (let k = 0; k <= maxK; k++) {
      kernelWeights[k] = gaussianKernel(k, h);
    }

    const yCausal = new Float64Array(lookback);
    let absDevSum = 0;
    for (let idx = 0; idx < lookback; idx++) {
      const t = len - lookback + idx;
      let num = 0;
      let den = 0;
      const curMaxK = Math.min(t, maxK);
      for (let k = 0; k <= curMaxK; k++) {
        const w = kernelWeights[k];
        num += prices[t - k] * w;
        den += w;
      }
      const y = den > 0 ? num / den : prices[t];
      yCausal[idx] = y;
      absDevSum += Math.abs(prices[t] - y);
    }

    out = yCausal[lookback - 1];
    mae = (absDevSum / lookback) * mult;
  }

  const mid = Number(out.toFixed(2));
  const upper = Number((out + mae).toFixed(2));
  const lower = Number((out - mae).toFixed(2));

  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (latestPrice <= lower) {
    signal = 'BUY';
  } else if (latestPrice >= upper) {
    signal = 'SELL';
  }

  return { mid, upper, lower, signal };
}
