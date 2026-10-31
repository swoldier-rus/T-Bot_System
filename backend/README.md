# MOEX Screener Pro — Local Analytical Backend

Локальный модульный бэкенд-сервис аналитики на **Node.js (TypeScript)** для проекта «MOEX T-Bank Terminal Screener Pro».

## 1. Архитектурный принцип: Single Ingestion -> Multiple Consumers
1. Сервер держит **одно двунаправленное gRPC-соединение** к T-Bank Invest API (`invest-public-api.tbank.ru:443`).
2. В поток мультиплексируются подписки:
   - `SubscribeCandles` (свечи интервала 1M)
   - `SubscribeOrderBook` (L2 стаканы глубиной 20)
   - `SubscribeTrades` (поток `AllTrades` — все обезличенные сделки на бирже)
3. Все входящие события нормализуются и поступают в типизированную шину событий (`EventBus`) и разделяемое состояние в памяти (`SharedState`).
4. Независимые модули-сканеры (`rsi_stoch`, `icebergs`, `robots`) подписываются на шину внутри процесса.
5. Результаты расчетов рассылаются в браузерный Userscript через WebSocket `ws://127.0.0.1:8080/stream` с нулевой задержкой.

## 2. Быстрый старт
Запустите файл `start-backend.bat` в корне проекта или:
```bash
cd backend
npm install
npm run build
npm start
```

## 3. Эндпоинты
- **WebSocket поток**: `ws://127.0.0.1:8080/stream`
- **GET /status**: Состояние шлюза, Uptime, FPS, количество обработанных пакетов и активные подписки.
- **GET /stocks**: Полный срез всех акций MOEX TQBR со всеми таймфреймами (5m, 15m, 1h, 4h, 1d), индикаторами RSI, Stoch и статусом.
