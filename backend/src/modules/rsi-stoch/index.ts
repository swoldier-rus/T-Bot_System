import { Candle, DEFAULT_INDICATOR_PARAMS, IndicatorParams } from '../../types/market';
import { BaseScannerModule } from '../base-module';
import { calculateRSI, calculateStochastic } from './indicators';
import { evaluateRsiStochRules } from './signal-rules';

export class RsiStochModule extends BaseScannerModule {
  public readonly id = 'rsi_stoch';
  public readonly name = 'RSI + Stochastic Reversal Scanner';
  public readonly description =
    'Real-time detector for overbought/oversold extremes, stochastic crosses, and RSI divergences across 1M and 5M timeframes.';

  private params: IndicatorParams = { ...DEFAULT_INDICATOR_PARAMS };

  // Map to debounce signals on the same candle: `${ticker}:${timeframe}:${reason}` -> lastEmittedCandleTime
  private readonly emittedSignals = new Map<string, number>();

  public updateParams(params: Partial<IndicatorParams>): void {
    this.params = { ...this.params, ...params };
    this.logger.info(`[rsi_stoch] Updated params: RSI(${this.params.rsiPeriod}), Stoch(${this.params.stochK}, ${this.params.stochSmooth}, ${this.params.stochD})`);
  }

  public override onCandle(candle: Candle): void {
    const timeframe = candle.timeframe;
    // Only analyze 1m and 5m timeframes
    if (timeframe !== '1m' && timeframe !== '5m') {
      return;
    }

    const ticker = candle.ticker.toUpperCase();
    const candles = this.ctx.state.getCandles(ticker, timeframe);

    // Need enough candles for RSI and Stoch
    const minNeeded = Math.max(this.params.rsiPeriod + 2, this.params.stochK + this.params.stochSmooth + this.params.stochD);
    if (candles.length < minNeeded) {
      return;
    }

    const prices = candles.map((c) => c.close);
    const rsiValues = calculateRSI(prices, this.params.rsiPeriod);
    const stochResult = calculateStochastic(
      candles.map((c) => ({ high: c.high, low: c.low, close: c.close })),
      this.params.stochK,
      this.params.stochSmooth,
      this.params.stochD
    );

    if (
      rsiValues.length === 0 ||
      stochResult.k.length === 0 ||
      stochResult.d.length === 0
    ) {
      return;
    }

    const evaluated = evaluateRsiStochRules(
      candles,
      rsiValues,
      stochResult.k,
      stochResult.d
    );

    if (!evaluated) {
      return;
    }

    // Multi-Timeframe Confirmation Check (1M + 5M)
    let finalSeverity = evaluated.severity;
    if (timeframe === '1m') {
      const candles5m = this.ctx.state.getCandles(ticker, '5m');
      if (candles5m.length >= minNeeded) {
        const rsi5m = calculateRSI(
          candles5m.map((c) => c.close),
          this.params.rsiPeriod
        );
        const lastRsi5m = rsi5m[rsi5m.length - 1];

        if (lastRsi5m !== undefined) {
          // Both 1m and 5m in oversold/overbought zone elevates to HIGH
          if (
            (evaluated.direction === 'LONG' && lastRsi5m < 35) ||
            (evaluated.direction === 'SHORT' && lastRsi5m > 65)
          ) {
            finalSeverity = 'HIGH';
          }
        }
      }
    }

    // Debounce to prevent emitting duplicate signals for the same bar & condition
    const debounceKey = `${ticker}:${timeframe}:${evaluated.reason}`;
    const lastEmittedTime = this.emittedSignals.get(debounceKey);
    if (lastEmittedTime === candle.time) {
      return;
    }
    this.emittedSignals.set(debounceKey, candle.time);

    // Emit the formal MarketSignal
    this.emitSignal({
      ticker,
      figi: candle.figi,
      timestamp: candle.time || Date.now(),
      direction: evaluated.direction,
      severity: finalSeverity,
      payload: {
        timeframe,
        rsi: evaluated.rsi,
        stochK: evaluated.stochK,
        stochD: evaluated.stochD,
        price: evaluated.price,
        reason: evaluated.reason,
      },
    });
  }
}
