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

  it('updates and retains all accordion indicator parameters and scanner thresholds', () => {
    const state = new SharedState();
    const customParams = {
      rsiPeriod: 21,
      rsiOversold: 25,
      rsiOverbought: 75,
      stochK: 21,
      stochSmooth: 5,
      stochD: 5,
      stochOversold: 15,
      stochOverbought: 85,
      nwBandwidth: 10.5,
      nwMult: 3.5,
      nwRepaint: false,
      cciPeriod: 30,
      cciOversold: -120,
      cciOverbought: 120,
      rvolDays: 14,
      rvolThreshold: 2.5,
      icebergRatio: 3.0,
      icebergMinTrades: 5,
      robotFreq: 8,
      robotBurst: 15,
    };

    state.updateDefaultParams(customParams);
    const active = state.getDefaultParams();

    expect(active.rsiPeriod).toBe(21);
    expect(active.rsiOversold).toBe(25);
    expect(active.rsiOverbought).toBe(75);
    expect(active.stochK).toBe(21);
    expect(active.stochSmooth).toBe(5);
    expect(active.stochD).toBe(5);
    expect(active.stochOversold).toBe(15);
    expect(active.stochOverbought).toBe(85);
    expect(active.nwBandwidth).toBe(10.5);
    expect(active.nwMult).toBe(3.5);
    expect(active.nwRepaint).toBe(false);
    expect(active.cciPeriod).toBe(30);
    expect(active.cciOversold).toBe(-120);
    expect(active.cciOverbought).toBe(120);
    expect(active.rvolDays).toBe(14);
    expect(active.rvolThreshold).toBe(2.5);
    expect(active.icebergRatio).toBe(3.0);
    expect(active.icebergMinTrades).toBe(5);
    expect(active.robotFreq).toBe(8);
    expect(active.robotBurst).toBe(15);
  });
});
