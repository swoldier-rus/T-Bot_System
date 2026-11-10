import http from 'http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { DatabaseService } from '../src/core/database-service';
import { EventBus } from '../src/core/event-bus';
import { ModuleManager } from '../src/core/module-manager';
import { SharedState } from '../src/core/shared-state';
import { StreamManager } from '../src/core/stream-manager';
import { TelegramService } from '../src/core/telegram-service';
import { createRestApp } from '../src/gateway/rest-api';
import { GatewayWebSocketServer } from '../src/gateway/websocket-server';

describe('T-Bank InstrumentsService.GetFavorites Integration', () => {
  let eventBus: EventBus;
  let sharedState: SharedState;
  let streamManager: StreamManager;
  let databaseService: DatabaseService;
  let moduleManager: ModuleManager;
  let telegramService: TelegramService;
  let app: any;
  let server: http.Server;
  let gatewayWs: GatewayWebSocketServer;
  let serverPort: number;

  beforeEach(async () => {
    eventBus = new EventBus();
    sharedState = new SharedState(eventBus);
    databaseService = new DatabaseService({ dbPath: ':memory:' });
    streamManager = new StreamManager(eventBus, sharedState, databaseService);
    moduleManager = new ModuleManager(eventBus, sharedState);
    telegramService = new TelegramService(eventBus);

    app = createRestApp(
      eventBus,
      streamManager,
      moduleManager,
      sharedState,
      telegramService,
      Date.now()
    );

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    gatewayWs = new GatewayWebSocketServer(eventBus, streamManager, sharedState);
    gatewayWs.init(server);
  });

  afterEach(async () => {
    await gatewayWs.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await streamManager.stop();
    databaseService.close();
  });

  it('filters out non-TQBR instruments (currency, bonds, SPB shares) and returns only MOEX shares', async () => {
    // Mock the internal API on streamManager
    const mockFavorites = [
      { figi: 'BBG004730N88', ticker: 'SBER', classCode: 'TQBR', instrumentType: 'share', name: 'Сбербанк' },
      { figi: 'BBG004730RP0', ticker: 'GAZP', classCode: 'TQBR', instrumentType: 'share', name: 'Газпром' },
      { figi: 'BBG0013HGFT4', ticker: 'USD000UTSTOM', classCode: 'CETS', instrumentType: 'currency', name: 'Доллар США' },
      { figi: 'BBG00R6Q5118', ticker: 'SU26238RMFS4', classCode: 'TQOB', instrumentType: 'bond', name: 'ОФЗ 26238' },
      { figi: 'BBG000B9XRY4', ticker: 'AAPL', classCode: 'SPBXM', instrumentType: 'share', name: 'Apple Inc' },
    ];

    (streamManager as any).api = {
      instruments: {
        getFavorites: async () => ({
          favoriteInstruments: mockFavorites,
        }),
      },
    };

    const favs = await streamManager.getFavorites();
    expect(favs.length).toBe(2);
    const tickers = favs.map((i) => i.ticker);
    expect(tickers).toContain('SBER');
    expect(tickers).toContain('GAZP');
    expect(tickers).not.toContain('USD000UTSTOM');
    expect(tickers).not.toContain('SU26238RMFS4');
    expect(tickers).not.toContain('AAPL');
  });

  it('REST API: GET /api/favorites returns filtered favorites with metadata', async () => {
    (streamManager as any).api = {
      instruments: {
        getFavorites: async () => ({
          favoriteInstruments: [
            { figi: 'BBG004730N88', ticker: 'SBER', classCode: 'TQBR', instrumentType: 'share', name: 'Сбербанк' },
            { figi: 'BBG004731032', ticker: 'LKOH', classCode: 'TQBR', instrumentType: 'share', name: 'ЛУКОЙЛ' },
          ],
        }),
      },
    };

    const resp = await fetch(`http://127.0.0.1:${serverPort}/api/favorites`);
    expect(resp.status).toBe(200);
    const body: any = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.count).toBe(2);
    expect(body.tickers).toEqual(['SBER', 'LKOH']);
    expect(body.instruments.length).toBe(2);
    expect(body.instruments[0].ticker).toBe('SBER');
  });

  it('REST API: POST /api/favorites/apply updates SQLite default universe', async () => {
    (streamManager as any).api = {
      instruments: {
        getFavorites: async () => ({
          favoriteInstruments: [
            { figi: 'BBG004730N88', ticker: 'SBER', classCode: 'TQBR', instrumentType: 'share', name: 'Сбербанк' },
            { figi: 'BBG004731032', ticker: 'LKOH', classCode: 'TQBR', instrumentType: 'share', name: 'ЛУКОЙЛ' },
            { figi: 'BBG00475KKY8', ticker: 'NVTK', classCode: 'TQBR', instrumentType: 'share', name: 'НОВАТЭК' },
          ],
        }),
      },
    };

    const resp = await fetch(`http://127.0.0.1:${serverPort}/api/favorites/apply`, { method: 'POST' });
    expect(resp.status).toBe(200);
    const body: any = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.count).toBe(3);
    expect(body.tickers).toEqual(['SBER', 'LKOH', 'NVTK']);

    // Verify persisted into SQLite
    expect(databaseService.hasCustomDefaultTickers()).toBe(true);
    expect(databaseService.getDefaultTickers()).toEqual(['SBER', 'LKOH', 'NVTK']);
  });

  it('WebSocket: handles GET_FAVORITES and APPLY_FAVORITES actions', async () => {
    (streamManager as any).api = {
      instruments: {
        getFavorites: async () => ({
          favoriteInstruments: [
            { figi: 'BBG004730N88', ticker: 'SBER', classCode: 'TQBR', instrumentType: 'share', name: 'Сбербанк' },
            { figi: 'BBG004730RP0', ticker: 'GAZP', classCode: 'TQBR', instrumentType: 'share', name: 'Газпром' },
          ],
        }),
      },
    };

    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/stream`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    // Test GET_FAVORITES
    const getFavPromise = new Promise<any>((resolve) => {
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'FAVORITES') {
          resolve(msg.data);
        }
      });
    });

    ws.send(JSON.stringify({ action: 'GET_FAVORITES' }));
    const favData = await getFavPromise;
    expect(favData.tickers).toEqual(['SBER', 'GAZP']);
    expect(favData.count).toBe(2);

    // Test APPLY_FAVORITES
    const applyFavPromise = new Promise<any>((resolve) => {
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'FAVORITES_APPLIED') {
          resolve(msg.data);
        }
      });
    });

    ws.send(JSON.stringify({ action: 'APPLY_FAVORITES' }));
    const appliedData = await applyFavPromise;
    expect(appliedData.tickers).toEqual(['SBER', 'GAZP']);
    expect(appliedData.success).toBe(true);
    expect(databaseService.getDefaultTickers()).toEqual(['SBER', 'GAZP']);

    ws.close();
  });
});
