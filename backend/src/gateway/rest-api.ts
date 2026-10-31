import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { EventBus } from '../core/event-bus';
import { ModuleManager } from '../core/module-manager';
import { FixedRingBuffer } from '../core/ring-buffer';
import { SharedState } from '../core/shared-state';
import { StreamManager } from '../core/stream-manager';
import { TelegramService } from '../core/telegram-service';
import { Candle, TradeEvent } from '../types/market';
import { MarketSignal } from '../types/signals';
import { renderDashboardHtml } from './dashboard-html';

export interface StreamLogEntry {
  id: number;
  time: number;
  type: 'trade' | 'candle' | 'signal' | 'iceberg' | 'robot' | 'system';
  tagCls: string;
  tagText: string;
  ticker: string;
  message: string;
}

export function createRestApp(
  eventBus: EventBus,
  streamManager: StreamManager,
  moduleManager: ModuleManager,
  sharedState: SharedState,
  telegramService: TelegramService,
  startTime: number
): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // In-memory stream log ring buffer (last 300 events)
  const logBuffer = new FixedRingBuffer<StreamLogEntry>(300);
  let logIdCounter = 0;

  const pushLog = (
    type: StreamLogEntry['type'],
    tagCls: string,
    tagText: string,
    ticker: string,
    message: string
  ) => {
    logIdCounter++;
    logBuffer.push({
      id: logIdCounter,
      time: Date.now(),
      type,
      tagCls,
      tagText,
      ticker,
      message,
    });
  };

  pushLog('system', 'tag-system', 'SYSTEM', 'LOCAL', 'Сервер MOEX Screener Pro запущен');

  eventBus.on('stream:connected', () => {
    pushLog('system', 'tag-system', 'gRPC', 'T-BANK', 'Соединение с T-Bank MarketDataStream установлено');
  });

  eventBus.on('stream:disconnected', (d) => {
    pushLog('system', 'tag-sell', 'DISCONN', 'T-BANK', `Обрыв соединения: ${d.error || 'stream closed'}`);
  });

  eventBus.on('stream:reconnecting', (d) => {
    pushLog('system', 'tag-candle', 'RECONN', 'T-BANK', `Попытка реконнекта #${d.attempt} через ${d.delayMs}мс`);
  });

  eventBus.on('market:trade', (t: TradeEvent) => {
    const isBuy = t.direction === 'BUY';
    const tagCls = isBuy ? 'tag-buy' : 'tag-sell';
    const tagText = isBuy ? 'BUY' : t.direction === 'SELL' ? 'SELL' : 'TRADE';
    pushLog('trade', tagCls, tagText, t.ticker, `${t.price.toFixed(2)} ₽ x ${t.quantity} лот.`);
  });

  eventBus.on('market:candle_tick', (c: Candle) => {
    pushLog(
      'candle',
      'tag-candle',
      '1M TICK',
      c.ticker,
      `O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${c.volume}`
    );
  });

  eventBus.on('scanner:signal', (s: MarketSignal) => {
    if (s.payload?.reason === 'ICEBERG_DETECTED') {
      pushLog(
        'iceberg',
        'tag-iceberg',
        'ICEBERG 🧊',
        s.ticker,
        `Скрытый объем: ${s.payload.price} ₽ (${s.direction}, x${s.payload.ratio})`
      );
    } else if (s.payload?.reason === 'ALGO_PING_BOT_DETECTED') {
      pushLog(
        'robot',
        'tag-robot',
        'ALGO BOT 🤖',
        s.ticker,
        `Всплеск: ${s.payload.microTradesPerSecond} микро-сделок/сек @ ${s.payload.price} ₽`
      );
    } else {
      const tagCls = s.direction === 'LONG' ? 'tag-buy' : 'tag-sell';
      pushLog(
        'signal',
        tagCls,
        `SIGNAL ${s.direction}`,
        s.ticker,
        `[${s.severity}] TF: ${s.payload?.timeframe || '5m'} | RSI: ${s.payload?.rsi || '—'} | Stoch %K: ${s.payload?.stochK || '—'}`
      );
    }
  });

  // Web Dashboard Pages
  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDashboardHtml());
  });

  app.get('/logs', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDashboardHtml());
  });

  // GET /api/logs
  app.get('/api/logs', (req: Request, res: Response) => {
    const since = req.query.since ? parseInt(String(req.query.since), 10) : 0;
    const all = logBuffer.toArray();
    if (since > 0) {
      res.json(all.filter((l) => l.id > since));
    } else {
      res.json(all.slice(-100));
    }
  });

  // GET /health
  app.get('/health', (_req: Request, res: Response) => {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    res.json({
      status: 'ok',
      uptime: uptimeSec,
    });
  });

  // GET /status
  app.get('/status', (_req: Request, res: Response) => {
    const uptimeSec = (Date.now() - startTime) / 1000;
    const stats = streamManager.getStats();
    const connectionState = streamManager.getConnectionState();
    const subscribedTickers = streamManager.getSubscribedTickers();
    const modules = moduleManager.getStatuses();
    const telegram = telegramService.getConfig();

    res.json({
      status: 'ok',
      uptime: uptimeSec,
      connectionState,
      stats,
      totalStocksInState: sharedState.getAllStockItems().length,
      subscribedTickers,
      modules,
      telegram: {
        enabled: telegram.enabled,
        hasBotToken: !!telegram.botToken,
        hasChatId: !!telegram.chatId,
        cooldownMinutes: telegram.cooldownMinutes,
      },
    });
  });

  // GET /stocks - Full current market snapshot
  app.get('/stocks', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      data: sharedState.getAllStockItems(),
      timestamp: Date.now(),
    });
  });

  // POST /instruments
  app.post('/instruments', async (req: Request, res: Response) => {
    const { tickers, action = 'SUBSCRIBE' } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      res.status(400).json({
        error: 'Invalid request: "tickers" must be a non-empty array of strings',
      });
      return;
    }

    const upperTickers = tickers.map((t: string) => String(t).trim().toUpperCase());

    if (action === 'UNSUBSCRIBE') {
      await streamManager.unsubscribe(upperTickers);
    } else {
      await streamManager.subscribe(upperTickers);
    }

    res.json({
      status: 'ok',
      action,
      subscribedTickers: streamManager.getSubscribedTickers(),
    });
  });

  // POST /modules/:id/toggle
  app.post('/modules/:id/toggle', (req: Request, res: Response) => {
    const rawId = req.params.id;
    const moduleId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { enabled } = req.body || {};

    const explicitEnabled =
      typeof enabled === 'boolean' ? enabled : undefined;

    const newState = moduleManager.toggleModule(moduleId, explicitEnabled);

    if (newState === null) {
      res.status(404).json({
        error: `Module with id "${moduleId}" was not found`,
      });
      return;
    }

    res.json({
      status: 'ok',
      moduleId,
      enabled: newState,
    });
  });

  // GET /config/telegram
  app.get('/config/telegram', (_req: Request, res: Response) => {
    res.json(telegramService.getConfig());
  });

  // POST /config/telegram
  app.post('/config/telegram', (req: Request, res: Response) => {
    const { botToken, chatId, enabled, cooldownMinutes } = req.body || {};
    telegramService.updateConfig({
      botToken: typeof botToken === 'string' ? botToken : undefined,
      chatId: typeof chatId === 'string' ? chatId : undefined,
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      cooldownMinutes: typeof cooldownMinutes === 'number' ? cooldownMinutes : undefined,
    });

    res.json({
      status: 'ok',
      config: telegramService.getConfig(),
    });
  });

  // POST /config/telegram/test
  app.post('/config/telegram/test', async (_req: Request, res: Response) => {
    const result = await telegramService.testConnection();
    res.json(result);
  });

  // POST /telegram/send - Relay endpoint: sends custom text or structured signal to Telegram on frontend command
  app.post('/telegram/send', async (req: Request, res: Response) => {
    const { text, signal, chatId, botToken } = req.body || {};

    if (!text && !signal) {
      res.status(400).json({
        status: 'error',
        error: 'Either "text" or "signal" must be provided in request body',
      });
      return;
    }

    // Optional per-request override
    const originalConfig = telegramService.getConfig();
    if (chatId || botToken) {
      telegramService.updateConfig({
        chatId: chatId || originalConfig.chatId,
        botToken: botToken || originalConfig.botToken,
      });
    }

    try {
      let result: { success: boolean; error?: string };
      if (signal) {
        result = await telegramService.sendSignalAlert(signal, true);
      } else {
        result = await telegramService.sendMessage(String(text));
      }

      if (result.success) {
        res.json({ status: 'ok', success: true });
      } else {
        res.status(502).json({
          status: 'error',
          success: false,
          error: result.error || 'Failed to deliver message to Telegram',
        });
      }
    } finally {
      if (chatId || botToken) {
        telegramService.updateConfig(originalConfig);
      }
    }
  });

  return app;
}
