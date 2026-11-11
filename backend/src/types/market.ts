export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  figi: string;
  ticker: string;
  timeframe: Timeframe;
  time: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete: boolean;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  figi: string;
  ticker: string;
  depth: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  bestBid: number;
  bestAsk: number;
  timestamp: number;
}

export type TradeDirection = 'BUY' | 'SELL' | 'UNKNOWN';

export interface TradeEvent {
  figi: string;
  ticker: string;
  direction: TradeDirection;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface Instrument {
  figi: string;
  ticker: string;
  name?: string;
  classCode?: string;
  lot?: number;
  minPriceIncrement?: number;
  currency?: string;
  logoUrl?: string;
  logoColor?: string;
}

export interface StockTfIndicators {
  rsi: number | null;
  k: number | null;
  d: number | null;
  cci?: number | null;
  nw?: {
    mid: number;
    upper: number;
    lower: number;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
  } | null;
}

export interface StockItem {
  ticker: string;
  fullSymbol: string;
  description: string;
  figi: string;
  lot: number;
  logoUrl?: string | null;
  logoColor?: string | null;
  price: number | null;
  prevClose: number | null;
  change: number;
  turnover: number;
  time: string;
  rvol: number;
  dailyRsi: number | null;
  tf: {
    '5m': StockTfIndicators;
    '15m': StockTfIndicators;
    '1h': StockTfIndicators;
    '4h': StockTfIndicators;
  };
}

export interface IndicatorParams {
  rsiPeriod: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  stochK: number;
  stochSmooth: number;
  stochD: number;
  stochOversold?: number;
  stochOverbought?: number;
  rvolDays: number;
  rvolThreshold?: number;
  nwBandwidth?: number;
  nwMult?: number;
  nwRepaint?: boolean;
  cciPeriod?: number;
  cciOversold?: number;
  cciOverbought?: number;
  icebergRatio?: number;
  icebergMinTrades?: number;
  robotFreq?: number;
  robotBurst?: number;
}

export const DEFAULT_INDICATOR_PARAMS: IndicatorParams = {
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  stochK: 14,
  stochSmooth: 3,
  stochD: 3,
  stochOversold: 20,
  stochOverbought: 80,
  rvolDays: 10,
  rvolThreshold: 2.0,
  nwBandwidth: 8,
  nwMult: 3,
  nwRepaint: true,
  cciPeriod: 20,
  cciOversold: -100,
  cciOverbought: 100,
  icebergRatio: 2.5,
  icebergMinTrades: 3,
  robotFreq: 5,
  robotBurst: 10,
};
