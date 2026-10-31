export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';
export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SignalPayload {
  timeframe?: string;
  rsi?: number;
  stochK?: number;
  stochD?: number;
  price?: number;
  reason?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MarketSignal<T = SignalPayload> {
  event: 'SIGNAL';
  moduleId: string;
  ticker: string;
  figi: string;
  timestamp: number;
  direction: SignalDirection;
  severity: SignalSeverity;
  payload: T;
}
