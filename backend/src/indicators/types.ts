export interface OHLCV {
  open?: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number;
}

export interface StochasticResult {
  k: number[];
  d: number[];
  latestK: number;
  latestD: number;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
  latestMacd: number;
  latestSignal: number;
  latestHistogram: number;
}

export interface BollingerBandsResult {
  upper: number[];
  basis: number[];
  lower: number[];
  latestUpper: number;
  latestBasis: number;
  latestLower: number;
}

export type TrendDirection = 'LONG' | 'SHORT';

export interface SupertrendResult {
  supertrend: number[];
  direction: TrendDirection[];
  latestSupertrend: number;
  latestDirection: TrendDirection;
}

export interface VWAPResult {
  vwap: number[];
  upper1?: number[];
  lower1?: number[];
  latestVwap: number;
}

export interface NadarayaWatsonResult {
  mid: number;
  upper: number;
  lower: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface CCIResult {
  values: number[];
  latest: number | null;
}
