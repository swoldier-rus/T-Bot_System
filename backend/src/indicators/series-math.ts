/**
 * Core time-series mathematical primitives inspired by Pine Script and OpenAlgo.
 */

export function stdev(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 1 || values.length < period) return result;

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - mean;
      varianceSum += diff * diff;
    }
    result[i] = Math.sqrt(varianceSum / period);
  }

  return result;
}

export function crossover(
  seriesA: number[],
  seriesB: number[] | number
): boolean[] {
  const result: boolean[] = new Array(seriesA.length).fill(false);
  const isScalar = typeof seriesB === 'number';

  for (let i = 1; i < seriesA.length; i++) {
    const prevA = seriesA[i - 1];
    const currA = seriesA[i];
    const prevB = isScalar ? (seriesB as number) : (seriesB as number[])[i - 1];
    const currB = isScalar ? (seriesB as number) : (seriesB as number[])[i];

    if (
      Number.isFinite(prevA) &&
      Number.isFinite(currA) &&
      Number.isFinite(prevB) &&
      Number.isFinite(currB)
    ) {
      if (prevA <= prevB && currA > currB) {
        result[i] = true;
      }
    }
  }

  return result;
}

export function crossunder(
  seriesA: number[],
  seriesB: number[] | number
): boolean[] {
  const result: boolean[] = new Array(seriesA.length).fill(false);
  const isScalar = typeof seriesB === 'number';

  for (let i = 1; i < seriesA.length; i++) {
    const prevA = seriesA[i - 1];
    const currA = seriesA[i];
    const prevB = isScalar ? (seriesB as number) : (seriesB as number[])[i - 1];
    const currB = isScalar ? (seriesB as number) : (seriesB as number[])[i];

    if (
      Number.isFinite(prevA) &&
      Number.isFinite(currA) &&
      Number.isFinite(prevB) &&
      Number.isFinite(currB)
    ) {
      if (prevA >= prevB && currA < currB) {
        result[i] = true;
      }
    }
  }

  return result;
}

export function isCrossoverAtLast(
  seriesA: number[],
  seriesB: number[] | number
): boolean {
  if (seriesA.length < 2) return false;
  const i = seriesA.length - 1;
  const isScalar = typeof seriesB === 'number';
  const prevA = seriesA[i - 1];
  const currA = seriesA[i];
  const prevB = isScalar ? (seriesB as number) : (seriesB as number[])[i - 1];
  const currB = isScalar ? (seriesB as number) : (seriesB as number[])[i];

  return prevA <= prevB && currA > currB;
}

export function isCrossunderAtLast(
  seriesA: number[],
  seriesB: number[] | number
): boolean {
  if (seriesA.length < 2) return false;
  const i = seriesA.length - 1;
  const isScalar = typeof seriesB === 'number';
  const prevA = seriesA[i - 1];
  const currA = seriesA[i];
  const prevB = isScalar ? (seriesB as number) : (seriesB as number[])[i - 1];
  const currB = isScalar ? (seriesB as number) : (seriesB as number[])[i];

  return prevA >= prevB && currA < currB;
}

export function highest(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  for (let i = period - 1; i < values.length; i++) {
    let max = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] > max) max = values[j];
    }
    result[i] = max;
  }

  return result;
}

export function lowest(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return result;

  for (let i = period - 1; i < values.length; i++) {
    let min = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] < min) min = values[j];
    }
    result[i] = min;
  }

  return result;
}

export function pivotHigh(
  values: number[],
  leftBars: number,
  rightBars: number
): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const total = leftBars + rightBars + 1;
  if (values.length < total) return result;

  for (let i = leftBars + rightBars; i < values.length; i++) {
    const pivotIdx = i - rightBars;
    const candidate = values[pivotIdx];
    if (!Number.isFinite(candidate)) continue;

    let isPivot = true;
    for (let j = 1; j <= leftBars; j++) {
      if (values[pivotIdx - j] >= candidate) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (values[pivotIdx + j] >= candidate) {
          isPivot = false;
          break;
        }
      }
    }

    if (isPivot) {
      result[i] = candidate;
    }
  }

  return result;
}

export function pivotLow(
  values: number[],
  leftBars: number,
  rightBars: number
): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const total = leftBars + rightBars + 1;
  if (values.length < total) return result;

  for (let i = leftBars + rightBars; i < values.length; i++) {
    const pivotIdx = i - rightBars;
    const candidate = values[pivotIdx];
    if (!Number.isFinite(candidate)) continue;

    let isPivot = true;
    for (let j = 1; j <= leftBars; j++) {
      if (values[pivotIdx - j] <= candidate) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (values[pivotIdx + j] <= candidate) {
          isPivot = false;
          break;
        }
      }
    }

    if (isPivot) {
      result[i] = candidate;
    }
  }

  return result;
}
