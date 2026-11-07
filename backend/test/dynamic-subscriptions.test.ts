import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { EventBus } from '../src/core/event-bus';
import { SharedState } from '../src/core/shared-state';
import { StreamManager } from '../src/core/stream-manager';
import { GatewayWebSocketServer } from '../src/gateway/websocket-server';
import { env } from '../src/config/env';
import { Candle, StockItem } from '../src/types/market';

describe('Dynamic Subscription Aggregator (MOEX Screener Pro)', () => {
  let server: http.Server;
  let eventBus: EventBus;
  let sharedState: SharedState;
  let streamManager: StreamManager;
  let gatewayWs: GatewayWebSocketServer;
  let serverPort: number;

  beforeEach(async () => {
    eventBus = new EventBus();
    sharedState = new SharedState(eventBus);
    streamManager = new StreamManager(eventBus, sharedState);
    gatewayWs = new GatewayWebSocketServer(eventBus, streamManager, sharedState);

    server = http.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    gatewayWs.init(server);
  });

  afterEach(async () => {
    await gatewayWs.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await streamManager.stop();
  });

  it('calculates exact 20 unique tickers for Set Union (Desktop 15 tickers, Extension 12 tickers, 7 overlapping)', async () => {
    const desktopTickers = [
      'SBER', 'GAZP', 'LKOH', 'GMKN', 'ROSN',
      'NVTK', 'TATN', 'YDEX', 'MGNT', 'ALRS',
      'CHMF', 'NLMK', 'VTBR', 'MOEX', 'PLZL'
    ]; // 15 tickers

    const extensionTickers = [
      'SBER', 'GAZP', 'LKOH', 'GMKN', 'ROSN',
      'NVTK', 'TATN', // 7 overlapping
      'AFLT', 'MTSS', 'OZON', 'POSI', 'SELG' // 5 new tickers
    ]; // 12 tickers

    // 1. Connect Client 1 (Desktop)
    const wsDesktop = new WebSocket(`ws://127.0.0.1:${serverPort}/stream`);
    await new Promise<void>((resolve) => wsDesktop.on('open', () => resolve()));

    wsDesktop.send(JSON.stringify({
      action: 'SET_ACTIVE_UNIVERSE',
      tickers: desktopTickers,
    }));

    // Wait briefly for message processing
    await new Promise((r) => setTimeout(r, 50));

    let union = gatewayWs.getGlobalActiveUniverse();
    expect(union).not.toBeNull();
    expect(union!.size).toBe(15);
    for (const t of desktopTickers) {
      expect(union!.has(t)).toBe(true);
    }

    // 2. Connect Client 2 (Extension)
    const wsExtension = new WebSocket(`ws://127.0.0.1:${serverPort}/stream`);
    await new Promise<void>((resolve) => wsExtension.on('open', () => resolve()));

    wsExtension.send(JSON.stringify({
      action: 'SET_ACTIVE_UNIVERSE',
      tickers: extensionTickers,
    }));

    await new Promise((r) => setTimeout(r, 50));

    // Acceptance criterion 1: Exactly 20 unique subscriptions in global union
    union = gatewayWs.getGlobalActiveUniverse();
    expect(union).not.toBeNull();
    expect(union!.size).toBe(20);

    // Verify all 20 unique tickers exist in the union
    const expected20 = new Set([...desktopTickers, ...extensionTickers]);
    expect(expected20.size).toBe(20);
    for (const t of expected20) {
      expect(union!.has(t)).toBe(true);
    }

    // 3. Disconnect Client 2 (Extension tab closed)
    const syncSpy = vi.spyOn(streamManager, 'syncActiveUniverse');
    wsExtension.close();

    await new Promise((r) => setTimeout(r, 100));

    // Acceptance criterion 2: Remaining union shrinks back to Desktop's 15 tickers
    union = gatewayWs.getGlobalActiveUniverse();
    expect(union).not.toBeNull();
    expect(union!.size).toBe(15);
    for (const t of desktopTickers) {
      expect(union!.has(t)).toBe(true);
    }
    // Tickers exclusive to extension must no longer be present
    expect(union!.has('AFLT')).toBe(false);
    expect(union!.has('MTSS')).toBe(false);
    expect(union!.has('OZON')).toBe(false);
    expect(union!.has('POSI')).toBe(false);
    expect(union!.has('SELG')).toBe(false);

    expect(syncSpy).toHaveBeenCalled();

    // 4. Disconnect Client 1 (Desktop closed) -> Fallback to DEFAULT_TICKERS
    wsDesktop.close();
    await new Promise((r) => setTimeout(r, 100));

    union = gatewayWs.getGlobalActiveUniverse();
    expect(union).not.toBeNull();
    expect(union!.size).toBe(env.DEFAULT_TICKERS.length);
    for (const t of env.DEFAULT_TICKERS) {
      expect(union!.has(t.toUpperCase())).toBe(true);
    }
  });

  it('performs differential delta synchronization in StreamManager (toSubscribe and toUnsubscribe)', async () => {
    // Set MOCK mode for unit test of delta sync logic
    (streamManager as any).connectionState = 'MOCK_STREAM';

    // Subscribe Client A with 3 tickers
    await streamManager.syncActiveUniverse(new Set(['SBER', 'GAZP', 'LKOH']));
    expect(new Set(streamManager.getSubscribedTickers())).toEqual(new Set(['SBER', 'GAZP', 'LKOH']));

    // Aggregator receives addition of 2 new tickers and removal of 1 (SBER, LKOH, NVTK, TATN)
    await streamManager.syncActiveUniverse(new Set(['SBER', 'LKOH', 'NVTK', 'TATN']));
    expect(new Set(streamManager.getSubscribedTickers())).toEqual(new Set(['SBER', 'LKOH', 'NVTK', 'TATN']));
    expect(streamManager.getSubscribedTickers().includes('GAZP')).toBe(false);

    // All clients disconnected -> reverts to DEFAULT_TICKERS
    await streamManager.syncActiveUniverse(new Set());
    const defaultSet = new Set(env.DEFAULT_TICKERS.map((t) => t.toUpperCase()));
    expect(new Set(streamManager.getSubscribedTickers())).toEqual(defaultSet);
  });

  it('delivers CANDLE_TICK and TICKER_UPDATE strictly to clients whose active universe contains the ticker', async () => {
    const wsClientA = new WebSocket(`ws://127.0.0.1:${serverPort}/stream`);
    const wsClientB = new WebSocket(`ws://127.0.0.1:${serverPort}/stream`);

    await Promise.all([
      new Promise<void>((r) => wsClientA.on('open', () => r())),
      new Promise<void>((r) => wsClientB.on('open', () => r())),
    ]);

    const clientAMessages: any[] = [];
    const clientBMessages: any[] = [];

    wsClientA.on('message', (data) => {
      clientAMessages.push(JSON.parse(data.toString()));
    });
    wsClientB.on('message', (data) => {
      clientBMessages.push(JSON.parse(data.toString()));
    });

    // Client A requests only SBER
    wsClientA.send(JSON.stringify({
      action: 'SET_ACTIVE_UNIVERSE',
      tickers: ['SBER'],
    }));

    // Client B requests only GAZP
    wsClientB.send(JSON.stringify({
      action: 'SET_ACTIVE_UNIVERSE',
      tickers: ['GAZP'],
    }));

    await new Promise((r) => setTimeout(r, 50));
    clientAMessages.length = 0;
    clientBMessages.length = 0;

    // 1. Emit Candle Tick for SBER
    const sberCandle: Candle = {
      figi: 'BBG004730N88',
      ticker: 'SBER',
      timeframe: '1m',
      time: Date.now(),
      open: 280,
      high: 281,
      low: 279,
      close: 280.5,
      volume: 100,
      isComplete: false,
    };
    eventBus.emit('market:candle_tick', sberCandle);

    await new Promise((r) => setTimeout(r, 50));

    // Client A should receive SBER candle tick
    const clientASberTicks = clientAMessages.filter((m) => m.event === 'CANDLE_TICK' && m.data.ticker === 'SBER');
    expect(clientASberTicks.length).toBe(1);

    // Client B must NOT receive SBER candle tick
    const clientBSberTicks = clientBMessages.filter((m) => m.event === 'CANDLE_TICK' && m.data.ticker === 'SBER');
    expect(clientBSberTicks.length).toBe(0);

    // 2. Broadcast DELTA_UPDATE with SBER and GAZP
    const sberItem: StockItem = {
      ticker: 'SBER',
      name: 'Сбербанк',
      classCode: 'TQBR',
      figi: 'BBG004730N88',
      lot: 10,
      price: 280.5,
      change: 0.8,
      volume24h: 1000,
      volDiffBase: 1.2,
      timeframeIndicators: {} as any,
    };
    const gazpItem: StockItem = {
      ticker: 'GAZP',
      name: 'Газпром',
      classCode: 'TQBR',
      figi: 'BBG004730RP0',
      lot: 10,
      price: 135.2,
      change: -0.4,
      volume24h: 800,
      volDiffBase: 0.9,
      timeframeIndicators: {} as any,
    };

    gatewayWs.broadcastDeltaUpdate([sberItem, gazpItem]);

    await new Promise((r) => setTimeout(r, 50));

    // Client A's DELTA_UPDATE should only contain SBER
    const clientADeltas = clientAMessages.filter((m) => m.event === 'DELTA_UPDATE');
    expect(clientADeltas.length).toBeGreaterThan(0);
    for (const d of clientADeltas) {
      expect(d.data.every((item: any) => item.ticker === 'SBER')).toBe(true);
      expect(d.data.some((item: any) => item.ticker === 'GAZP')).toBe(false);
    }

    // Client B's DELTA_UPDATE should only contain GAZP
    const clientBDeltas = clientBMessages.filter((m) => m.event === 'DELTA_UPDATE');
    expect(clientBDeltas.length).toBeGreaterThan(0);
    for (const d of clientBDeltas) {
      expect(d.data.every((item: any) => item.ticker === 'GAZP')).toBe(true);
      expect(d.data.some((item: any) => item.ticker === 'SBER')).toBe(false);
    }

    wsClientA.close();
    wsClientB.close();
  });
});
