import http from 'http';
import { env } from './config/env';
import { CandleAggregator } from './core/candle-aggregator';
import { EventBus } from './core/event-bus';
import { ModuleManager } from './core/module-manager';
import { SharedState } from './core/shared-state';
import { StreamManager } from './core/stream-manager';
import { TelegramService } from './core/telegram-service';
import { createRestApp } from './gateway/rest-api';
import { GatewayWebSocketServer } from './gateway/websocket-server';
import { IcebergDetectorModule } from './modules/icebergs';
import { NwRsiModule } from './modules/nw-rsi';
import { RobotsDetectorModule } from './modules/robots';
import { RsiStochModule } from './modules/rsi-stoch';

async function bootstrap(): Promise<void> {
  const startTime = Date.now();

  console.info('🚀 Starting MOEX Screener Pro Analytical Backend...');
  console.info(`⚙️  Environment: ${env.NODE_ENV} | Log Level: ${env.LOG_LEVEL}`);

  // 1. Core Data Structures & Event Bus
  const eventBus = new EventBus();
  const sharedState = new SharedState();
  const candleAggregator = new CandleAggregator(eventBus, sharedState);
  const streamManager = new StreamManager(eventBus, sharedState);
  const moduleManager = new ModuleManager(eventBus, sharedState);
  const telegramService = new TelegramService(eventBus);

  // Initialize Telegram configuration from env if provided
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    telegramService.updateConfig({
      enabled: env.TELEGRAM_ENABLED ?? true,
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID,
    });
  }

  // 2. Register Analytical Scanner Modules
  const rsiStochModule = new RsiStochModule();
  const nwRsiModule = new NwRsiModule();
  moduleManager.register(rsiStochModule);
  moduleManager.register(nwRsiModule);
  moduleManager.register(new IcebergDetectorModule());
  moduleManager.register(new RobotsDetectorModule());

  (eventBus as any).on('system:indicator_params_updated', (params: any) => {
    rsiStochModule.updateParams(params);
    nwRsiModule.updateParams(params);
  });

  // 3. HTTP REST App & WebSocket Gateway
  const app = createRestApp(
    eventBus,
    streamManager,
    moduleManager,
    sharedState,
    telegramService,
    startTime
  );
  const server = http.createServer(app);
  const wsServer = new GatewayWebSocketServer(
    eventBus,
    streamManager,
    sharedState,
    telegramService,
    moduleManager,
    startTime
  );
  wsServer.init(server);

  // 4. Start HTTP & WebSocket Server
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, env.HOST, () => {
      console.info(
        `🌐 Gateway listening on http://${env.HOST}:${env.PORT} and ws://${env.HOST}:${env.PORT}/stream`
      );
      resolve();
    });
  });

  // 5. Start Scanner Modules and Market Data Stream
  await moduleManager.startAll();
  await streamManager.start();

  console.info('✅ MOEX Screener Pro Backend successfully started and ready!');

  // 6. Graceful Shutdown Handler
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.info(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      console.error('⚠️ Forcefully exiting after shutdown timeout');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    try {
      console.info('1. Closing WebSocket connections...');
      await wsServer.close();

      console.info('2. Stopping Market Data Stream...');
      await streamManager.stop();

      console.info('3. Stopping Analytical Modules...');
      await moduleManager.stopAll();

      console.info('4. Closing HTTP Server...');
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });

      candleAggregator.clear();
      sharedState.clear();

      console.info('👋 Graceful shutdown complete. Bye!');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during bootstrap:', err);
  process.exit(1);
});
