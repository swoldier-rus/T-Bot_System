import { describe, expect, it } from 'vitest';
import { SharedState } from '../src/core/shared-state';
import { Candle, DEFAULT_INDICATOR_PARAMS } from '../src/types/market';

describe('SharedState Dynamic Indicator Parameters', () => {
  it('calculates different RSI values when rsiPeriod changes', () => {
    const state = new SharedState();
    const ticker = 'SBER';

    // Register dummy instrument
    state.setInstrument({
      ticker,
      figi: 'BBG004730N88',
      name: 'Сбербанк',
      classCode: 'TQBR',
      lot: 1,
    });

    // Feed 30 synthetic 5m candles with oscillating prices
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const price = 250 + Math.sin(i / 2) * 10;
      const candle: Candle = {
        ticker,
        figi: 'BBG004730N88',
        timeframe: '5m',
        time: now + i * 300000,
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000 + i * 10,
      };
      state.updateCandle(candle);
    }

    const defaultSnapshot = state.getCustomSnapshot([ticker], DEFAULT_INDICATOR_PARAMS);
    expect(defaultSnapshot.length).toBe(1);
    const rsi14 = defaultSnapshot[0].tf['5m'].rsi;
    expect(rsi14).not.toBeNull();

    // Now request with rsiPeriod = 5
    const customSnapshot = state.getCustomSnapshot([ticker], {
      ...DEFAULT_INDICATOR_PARAMS,
      rsiPeriod: 5,
    });
    const rsi5 = customSnapshot[0].tf['5m'].rsi;
    expect(rsi5).not.toBeNull();

    // RSI(5) reacts much faster to sinusoidal swings than RSI(14)
    expect(rsi5).not.toEqual(rsi14);
  });

  it('calculates different Stochastic values when stochK changes', () => {
    const state = new SharedState();
    const ticker = 'GAZP';

    state.setInstrument({
      ticker,
      figi: 'BBG004730RP0',
      name: 'Газпром',
      classCode: 'TQBR',
      lot: 10,
    });

    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const price = 100 + i * 2 + (i % 3) * 5;
      const candle: Candle = {
        ticker,
        figi: 'BBG004730RP0',
        timeframe: '5m',
        time: now + i * 300000,
        open: price,
        high: price + 4,
        low: price - 3,
        close: price + 1,
        volume: 500,
      };
      state.updateCandle(candle);
    }

    const snap14 = state.getCustomSnapshot([ticker], DEFAULT_INDICATOR_PARAMS);
    const k14 = snap14[0].tf['5m'].k;

    const snap5 = state.getCustomSnapshot([ticker], {
      ...DEFAULT_INDICATOR_PARAMS,
      stochK: 5,
    });
    const k5 = snap5[0].tf['5m'].k;

    expect(k14).not.toBeNull();
    expect(k5).not.toBeNull();
    expect(k5).not.toEqual(k14);
  });
});
