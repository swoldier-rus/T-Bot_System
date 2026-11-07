import { Candle, DEFAULT_INDICATOR_PARAMS, IndicatorParams } from '../../types/market';
import { BaseScannerModule } from '../base-module';
import { cci, nadarayaWatsonEnvelope, rsi, stochastic } from '../../indicators';

export interface NwRsiSignalPayload {
  price: number;
  timeframe: string;
  nw: {
    mid: number;
    upper: number;
    lower: number;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
  };
  rsi: number;
  stochK: number;
  cci: number | null;
  confluenceScore: number; // 2 to 4 confirming factors
  reason?: string;
}

export class NwRsiModule extends BaseScannerModule {
  public readonly id = 'nw_rsi';
  public readonly name = 'RSI + Nadaraya-Watson Confluence Scanner';
  public readonly description =
    'Real-time detector for Gaussian Nadaraya-Watson Envelope band touches confirmed by RSI, CCI, and Stochastic extremes across 5M, 15M, and 1H.';

  private params: IndicatorParams = { ...DEFAULT_INDICATOR_PARAMS };
  private readonly emittedSignals = new Map<string, number>();

  public updateParams(params: Partial<IndicatorParams>): void {
    this.params = { ...this.params, ...params };
    this.logger.info(
      `[nw_rsi] Updated params: NW(h=${this.params.nwBandwidth}, mult=${this.params.nwMult}), RSI(${this.params.rsiPeriod})`
    );
  }

  public override onCandle(candle: Candle): void {
    const timeframe = candle.timeframe;
    // Analyze 5m, 15m, and 1h
    if (timeframe !== '5m' && timeframe !== '15m' && timeframe !== '1h') {
      return;
    }

    const ticker = candle.ticker.toUpperCase();
    const candles = this.ctx.state.getCandles(ticker, timeframe);

    const minNeeded = Math.max(
      this.params.rsiPeriod + 2,
      (this.params.cciPeriod ?? 20) + 1,
      this.params.stochK + this.params.stochSmooth
    );
    if (candles.length < minNeeded) {
      return;
    }

    const prices = candles.map((c) => c.close);
    const ohlcv = candles.map((c) => ({ high: c.high, low: c.low, close: c.close }));

    const nw = nadarayaWatsonEnvelope(
      prices,
      this.params.nwBandwidth ?? 8,
      this.params.nwMult ?? 3,
      this.params.nwRepaint ?? true
    );

    const rsiVals = rsi(prices, this.params.rsiPeriod);
    const lastRsi = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : 50;

    const stochRes = stochastic(
      ohlcv,
      this.params.stochK,
      this.params.stochSmooth,
      this.params.stochD
    );
    const lastK = stochRes.latestK ?? 50;

    const cciVals = cci(ohlcv, this.params.cciPeriod ?? 20);
    const lastCci = cciVals.length > 0 && Number.isFinite(cciVals[cciVals.length - 1])
      ? cciVals[cciVals.length - 1]
      : null;

    const price = candle.close;
    let direction: 'LONG' | 'SHORT' | null = null;
    let confluenceScore = 0;
    let reason = '';

    // Long Confluence: Price at/below Lower NW band + Oversold RSI + confirming Stoch/CCI
    if (price <= nw.lower) {
      confluenceScore += 1;
      if (lastRsi <= 35) confluenceScore += 1;
      if (lastK <= 25) confluenceScore += 1;
      if (lastCci !== null && lastCci <= -100) confluenceScore += 1;

      if (confluenceScore >= 2 && lastRsi <= 40) {
        direction = 'LONG';
        reason = `NWE Lower Band (${nw.lower}) + RSI (${lastRsi.toFixed(1)})`;
      }
    }
    // Short Confluence: Price at/above Upper NW band + Overbought RSI + confirming Stoch/CCI
    else if (price >= nw.upper) {
      confluenceScore += 1;
      if (lastRsi >= 65) confluenceScore += 1;
      if (lastK >= 75) confluenceScore += 1;
      if (lastCci !== null && lastCci >= 100) confluenceScore += 1;

      if (confluenceScore >= 2 && lastRsi >= 60) {
        direction = 'SHORT';
        reason = `NWE Upper Band (${nw.upper}) + RSI (${lastRsi.toFixed(1)})`;
      }
    }

    if (!direction) {
      return;
    }

    // Debounce: 1 signal per candle per direction
    const debounceKey = `${ticker}:${timeframe}:${direction}`;
    const lastEmittedTime = this.emittedSignals.get(debounceKey);
    if (lastEmittedTime === candle.time) {
      return;
    }
    this.emittedSignals.set(debounceKey, candle.time);

    const severity = confluenceScore >= 3 ? 'HIGH' : 'MEDIUM';

    this.emitSignal<NwRsiSignalPayload>({
      ticker,
      figi: candle.figi,
      direction,
      severity,
      payload: {
        price,
        timeframe,
        nw,
        rsi: Number(lastRsi.toFixed(1)),
        stochK: Number(lastK.toFixed(1)),
        cci: lastCci !== null ? Number(lastCci.toFixed(1)) : null,
        confluenceScore,
        reason,
      },
      timestamp: candle.time,
    });
  }
}
