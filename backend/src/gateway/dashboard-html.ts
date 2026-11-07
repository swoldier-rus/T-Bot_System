export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOEX Screener Pro — Live Stream Monitor</title>
  <style>
    :root {
      --bg-dark: #131722;
      --bg-card: #1e222d;
      --bg-card-hover: #262b3d;
      --border: #2a2e39;
      --text: #d1d4dc;
      --text-muted: #787b86;
      --accent: #2962ff;
      --accent-hover: #1e53e5;
      --green: #089981;
      --green-bg: rgba(8, 153, 129, 0.15);
      --red: #f23645;
      --red-bg: rgba(242, 54, 69, 0.15);
      --orange: #ff9800;
      --cyan: #00bcd4;
      --purple: #ab47bc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-dark);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Trebuchet MS', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: hidden;
    }
    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand h1 {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: var(--green-bg);
      color: var(--green);
      border: 1px solid var(--green);
    }
    .badge-status.offline {
      background: var(--red-bg);
      color: var(--red);
      border-color: var(--red);
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      background: var(--border);
      color: var(--text);
      border: 1px solid transparent;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #363a45;
      color: #fff;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
    }
    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .card-title {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-value {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }
    .card-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
    }
    @media (max-width: 1100px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .terminal-container {
      display: flex;
      flex-direction: column;
      height: 620px;
      position: relative;
    }
    .terminal-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
      gap: 10px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-chip {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      user-select: none;
      transition: all 0.15s;
    }
    .filter-chip.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .search-input {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      color: #fff;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      width: 140px;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .terminal-window {
      flex: 1;
      background: #0d1017;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
      contain: content;
    }
    .log-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 2px 4px;
      border-radius: 3px;
      transition: background 0.1s;
    }
    .log-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .log-time {
      color: var(--text-muted);
      font-size: 11px;
      flex-shrink: 0;
    }
    .log-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .tag-buy { background: var(--green-bg); color: var(--green); border: 1px solid var(--green); }
    .tag-sell { background: var(--red-bg); color: var(--red); border: 1px solid var(--red); }
    .tag-candle { background: rgba(41, 98, 255, 0.15); color: #82b1ff; border: 1px solid #2962ff; }
    .tag-signal { background: rgba(255, 152, 0, 0.15); color: var(--orange); border: 1px solid var(--orange); }
    .tag-iceberg { background: rgba(0, 188, 212, 0.15); color: var(--cyan); border: 1px solid var(--cyan); }
    .tag-robot { background: rgba(171, 71, 188, 0.15); color: var(--purple); border: 1px solid var(--purple); }
    .tag-system { background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid var(--border); }
    .log-ticker {
      font-weight: 700;
      color: #fff;
      min-width: 55px;
      flex-shrink: 0;
    }
    .log-msg {
      color: var(--text);
      word-break: break-all;
    }
    .scroll-pill {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: #fff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
      transition: all 0.18s ease;
    }
    .scroll-pill:hover {
      background: var(--accent-hover);
      transform: translateX(-50%) translateY(-2px);
    }
    .scroll-pill.hidden {
      display: none;
    }
    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .module-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .module-item:last-child { border-bottom: none; }
    .module-info h4 {
      font-size: 13px;
      color: #fff;
      margin-bottom: 2px;
    }
    .module-info p {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
      max-width: 220px;
    }
    .toggle-switch {
      position: relative;
      width: 38px;
      height: 20px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: var(--border);
      transition: .2s;
      border-radius: 20px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .toggle-slider { background-color: var(--green); }
    input:checked + .toggle-slider:before { transform: translateX(18px); }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>📈 MOEX Screener Pro <span style="font-size: 11px; color: var(--text-muted); font-weight: 400;">Local Analytical Engine</span></h1>
      <span id="conn-badge" class="badge-status"><span class="live-dot"></span> <span id="conn-text">Подключение...</span></span>
    </div>
    <div class="header-actions">
      <span id="uptime-text" style="font-size: 11px; color: var(--text-muted); margin-right: 10px;">Uptime: 0с</span>
      <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-primary">🖥 Терминал Т-Банка</a>
      <a href="/stocks" target="_blank" class="btn">📊 /stocks (JSON)</a>
      <a href="/status" target="_blank" class="btn">⚙️ /status</a>
    </div>
  </header>

  <div class="container">
    <div class="metrics-grid">
      <div class="card">
        <div class="card-title">Пропускная способность <span>⚡</span></div>
        <div class="card-value" id="val-fps">0 <span style="font-size:13px; font-weight:400; color:var(--text-muted);">пак/с</span></div>
        <div class="card-sub" id="sub-fps">Частота обработки gRPC потока</div>
      </div>
      <div class="card">
        <div class="card-title">Лента сделок (AllTrades) <span>🤝</span></div>
        <div class="card-value" id="val-trades" style="color: #4dd0e1;">0</div>
        <div class="card-sub">Обезличенные сделки MOEX TQBR</div>
      </div>
      <div class="card">
        <div class="card-title">Стаканы L2 Depth <span>📖</span></div>
        <div class="card-value" id="val-depth" style="color: #ba68c8;">0</div>
        <div class="card-sub">Глубина 20 уровней Bids / Asks</div>
      </div>
      <div class="card">
        <div class="card-title">Свечи 1M / Трейды <span>🕯️</span></div>
        <div class="card-value" id="val-candles" style="color: #81c784;">0</div>
        <div class="card-sub">Минутные тики всех 273 акций</div>
      </div>
      <div class="card">
        <div class="card-title">Всего пакетов <span>📦</span></div>
        <div class="card-value" id="val-packets">0</div>
        <div class="card-sub" id="val-stocks-count">273 инструмента в памяти</div>
      </div>
    </div>

    <div class="main-grid">
      <!-- Live Terminal Stream Logs -->
      <div class="card terminal-container">
        <div class="terminal-toolbar">
          <div class="filter-group">
            <span class="filter-chip active" data-filter="all">Все события</span>
            <span class="filter-chip" data-filter="trade">Сделки</span>
            <span class="filter-chip" data-filter="signal">Сигналы</span>
            <span class="filter-chip" data-filter="iceberg">Айсберги 🧊</span>
            <span class="filter-chip" data-filter="robot">Роботы 🤖</span>
            <span class="filter-chip" data-filter="candle">Свечи</span>
            <span class="filter-chip" data-filter="system">Система</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="text" id="search-ticker" class="search-input" placeholder="Поиск (SBER, LKOH)...">
            <button id="btn-pause" class="btn" style="padding: 4px 8px;">⏸ Пауза</button>
            <button id="btn-clear" class="btn" style="padding: 4px 8px;">🗑 Очистить</button>
          </div>
        </div>

        <div id="terminal" class="terminal-window">
          <div class="log-row" data-type="system" data-ticker="LOCAL">
            <span class="log-time">--:--:--</span>
            <span class="log-tag tag-system">SYSTEM</span>
            <span class="log-ticker">LOCAL</span>
            <span class="log-msg">Инициализация веб-монитора потока MOEX Screener Pro...</span>
          </div>
        </div>

        <!-- Floating Smart Auto-Scroll Pill -->
        <div id="scroll-bottom-pill" class="scroll-pill hidden">
          <span>Новые события</span> <span>↓</span>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="side-panel">
        <!-- Modules -->
        <div class="card">
          <div class="card-title" style="margin-bottom:12px;">Аналитические модули</div>
          <div id="modules-list">
            <div style="color:var(--text-muted);">Загрузка модулей...</div>
          </div>
        </div>

        <!-- Telegram -->
        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">Telegram Оповещения</div>
          <div id="tg-status" style="margin-bottom:10px; font-size:12px; color:var(--text-muted);">Проверка статуса...</div>
          <button id="btn-tg-test" class="btn btn-primary" style="width:100%; justify-content:center;">📲 Отправить тестовый сигнал</button>
          <div id="tg-result" style="margin-top:8px; font-size:11px;"></div>
        </div>

        <!-- API Links with Dynamic Host/Port Detection -->
        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">Шлюз и протоколы</div>
          <div style="font-size: 11px; display:flex; flex-direction:column; gap:6px;">
            <div><b>WebSocket:</b> <code id="info-ws-url" style="color:#82b1ff;">ws://127.0.0.1:3001/stream</code></div>
            <div><b>REST API:</b> <code id="info-rest-url" style="color:#82b1ff;">http://127.0.0.1:3001/stocks</code></div>
            <div><b>gRPC Broker:</b> <code style="color:#81c784;">invest-public-api.tbank.ru:443</code></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 1. Dynamic Gateway Host / Protocol Detection
    const curProto = location.protocol === 'https:' ? 'https:' : 'http:';
    const curWsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const infoWsEl = document.getElementById('info-ws-url');
    const infoRestEl = document.getElementById('info-rest-url');
    if (infoWsEl) infoWsEl.textContent = \`\${curWsProto}//\${location.host}/stream\`;
    if (infoRestEl) infoRestEl.textContent = \`\${curProto}//\${location.host}/stocks\`;

    // 2. High-Performance Batched Log Rendering & Smart Scroll
    const MAX_ROWS = 350;
    const terminal = document.getElementById('terminal');
    const searchTicker = document.getElementById('search-ticker');
    const scrollPill = document.getElementById('scroll-bottom-pill');

    let currentFilter = 'all';
    let isPaused = false;
    let autoScroll = true;
    let lastLogId = 0;

    let pendingLogQueue = [];
    let batchRafId = null;
    const backgroundBuffer = []; // In-memory ring buffer while document is hidden

    // Smart Auto-Scroll Detection
    terminal.addEventListener('scroll', () => {
      const distanceFromBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight;
      if (distanceFromBottom > 45) {
        if (autoScroll) {
          autoScroll = false;
        }
      } else {
        if (!autoScroll) {
          autoScroll = true;
          if (scrollPill) scrollPill.classList.add('hidden');
        }
      }
    });

    if (scrollPill) {
      scrollPill.addEventListener('click', () => {
        autoScroll = true;
        terminal.scrollTop = terminal.scrollHeight;
        scrollPill.classList.add('hidden');
      });
    }

    // Page Visibility API: Sleep DOM updates when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && backgroundBuffer.length > 0) {
        while (backgroundBuffer.length > 0) {
          pendingLogQueue.push(backgroundBuffer.shift());
        }
        scheduleLogFlush();
      }
    });

    // Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter');
        filterRows();
      });
    });

    searchTicker.addEventListener('input', () => {
      filterRows();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      terminal.innerHTML = '';
      pendingLogQueue = [];
      backgroundBuffer.length = 0;
      if (scrollPill) scrollPill.classList.add('hidden');
    });

    const btnPause = document.getElementById('btn-pause');
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? '▶️ Продолжить' : '⏸ Пауза';
      btnPause.style.background = isPaused ? 'var(--orange)' : '';
      btnPause.style.color = isPaused ? '#fff' : '';
    });

    function filterRows() {
      const q = searchTicker.value.trim().toUpperCase();
      const rows = terminal.querySelectorAll('.log-row');
      rows.forEach(r => {
        const type = r.getAttribute('data-type') || '';
        const ticker = r.getAttribute('data-ticker') || '';
        const matchFilter = (currentFilter === 'all') || (type === currentFilter);
        const matchSearch = !q || ticker.includes(q);
        r.style.display = (matchFilter && matchSearch) ? 'flex' : 'none';
      });
    }

    function queueLogRow(entry) {
      if (isPaused) return;

      if (document.hidden) {
        if (backgroundBuffer.length >= 200) {
          backgroundBuffer.shift();
        }
        backgroundBuffer.push(entry);
        return;
      }

      pendingLogQueue.push(entry);
      scheduleLogFlush();
    }

    function scheduleLogFlush() {
      if (!batchRafId) {
        batchRafId = requestAnimationFrame(flushLogBatch);
      }
    }

    function createLogRowElement(entry) {
      const timeStr = entry.time
        ? new Date(entry.time).toLocaleTimeString('ru-RU') + '.' + String(entry.time % 1000).padStart(3, '0')
        : new Date().toLocaleTimeString('ru-RU');

      const row = document.createElement('div');
      row.className = 'log-row';
      row.setAttribute('data-type', entry.type);
      row.setAttribute('data-ticker', entry.ticker || '');

      row.innerHTML = \`
        <span class="log-time">\${timeStr}</span>
        <span class="log-tag \${entry.tagCls}">\${entry.tagText}</span>
        <span class="log-ticker">\${entry.ticker || ''}</span>
        <span class="log-msg">\${entry.message || ''}</span>
      \`;

      return row;
    }

    function flushLogBatch() {
      batchRafId = null;
      if (pendingLogQueue.length === 0) return;

      const fragment = document.createDocumentFragment();
      const q = searchTicker.value.trim().toUpperCase();

      for (let i = 0; i < pendingLogQueue.length; i++) {
        const entry = pendingLogQueue[i];
        const row = createLogRowElement(entry);

        const matchFilter = (currentFilter === 'all') || (entry.type === currentFilter);
        const matchSearch = !q || (entry.ticker && entry.ticker.includes(q));
        if (!matchFilter || !matchSearch) {
          row.style.display = 'none';
        }

        fragment.appendChild(row);
      }

      pendingLogQueue = [];
      terminal.appendChild(fragment);

      // Bulk prune old rows beyond MAX_ROWS to prevent memory leaks
      const excess = terminal.children.length - MAX_ROWS;
      if (excess > 0) {
        for (let i = 0; i < excess; i++) {
          if (terminal.firstElementChild) {
            terminal.removeChild(terminal.firstElementChild);
          }
        }
      }

      // Smart auto-scroll
      if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
      } else {
        if (scrollPill) scrollPill.classList.remove('hidden');
      }
    }

    // 3. Status & Metrics Handler
    function applyStatusData(data) {
      if (!data) return;

      const badge = document.getElementById('conn-badge');
      const badgeText = document.getElementById('conn-text');
      if (data.connectionState === 'CONNECTED') {
        badge.className = 'badge-status';
        badgeText.textContent = 'T-Bank gRPC Connected';
      } else {
        badge.className = 'badge-status offline';
        badgeText.textContent = data.connectionState || 'Ожидание gRPC';
      }

      if (data.stats) {
        document.getElementById('val-fps').innerHTML = \`\${data.stats.fps || 0} <span style="font-size:13px; font-weight:400; color:var(--text-muted);">пак/с</span>\`;
        document.getElementById('val-trades').textContent = (data.stats.tradeCount || 0).toLocaleString();
        document.getElementById('val-depth').textContent = (data.stats.orderBookCount || 0).toLocaleString();
        document.getElementById('val-candles').textContent = (data.stats.candleCount || 0).toLocaleString();
        document.getElementById('val-packets').textContent = (data.stats.totalPackets || 0).toLocaleString();
      }

      document.getElementById('val-stocks-count').textContent = \`\${data.totalStocksInState || 0} инструментов в памяти\`;

      if (typeof data.uptime === 'number') {
        const upSec = Math.floor(data.uptime);
        const m = Math.floor(upSec / 60);
        const s = upSec % 60;
        document.getElementById('uptime-text').textContent = \`Uptime: \${m}м \${s}с\`;
      }

      if (Array.isArray(data.modules)) {
        renderModules(data.modules);
      }

      const tg = data.telegram;
      const tgDiv = document.getElementById('tg-status');
      if (tg && tg.enabled && tg.hasBotToken && tg.hasChatId) {
        tgDiv.innerHTML = '<span style="color:var(--green)">● Активен</span> (Cooldown: ' + tg.cooldownMinutes + ' мин)';
      } else if (tgDiv) {
        tgDiv.innerHTML = '<span style="color:var(--text-muted)">○ Отключен или не настроен</span>';
      }
    }

    let lastModulesJson = '';
    function renderModules(modules) {
      const json = JSON.stringify(modules);
      if (json === lastModulesJson) return;
      lastModulesJson = json;

      const container = document.getElementById('modules-list');
      if (!container) return;
      container.innerHTML = modules.map(m => \`
        <div class="module-item">
          <div class="module-info">
            <h4>\${m.name}</h4>
            <p>\${m.description}</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" \${m.enabled ? 'checked' : ''} onchange="toggleModule('\${m.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      \`).join('');
    }

    async function toggleModule(id, enabled) {
      try {
        await fetch(\`/modules/\${id}/toggle\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        queueLogRow({
          time: Date.now(),
          type: 'system',
          tagCls: 'tag-system',
          tagText: 'MODULE',
          ticker: id.toUpperCase(),
          message: \`Модуль переключен: \${enabled ? 'ВКЛЮЧЕН' : 'ОТКЛЮЧЕН'}\`
        });
      } catch (e) {}
    }

    // 4. WebSocket Streaming (Replaces regular HTTP polling)
    let ws = null;
    let wsConnected = false;
    let fallbackPollTimer = null;

    function connectWs() {
      const wsUrl = \`\${curWsProto}//\${location.host}/stream?client=dashboard\`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        wsConnected = true;
        stopFallbackPoll();
        queueLogRow({
          time: Date.now(),
          type: 'system',
          tagCls: 'tag-system',
          tagText: 'WS',
          ticker: 'LOCAL',
          message: 'Вебсокет подключен (WebSocket Push активен, HTTP-поллинг отключен)'
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Real-time server push for metrics
          if (msg.event === 'METRICS_UPDATE') {
            applyStatusData(msg.data);
            return;
          }

          // Real-time server push for stream log events
          if (msg.event === 'STREAM_LOG' && msg.data) {
            if (msg.data.id && msg.data.id > lastLogId) {
              lastLogId = msg.data.id;
            }
            queueLogRow(msg.data);
            return;
          }

          // Direct Scanner Signals
          if (msg.event === 'SIGNAL') {
            if (msg.payload?.reason === 'ICEBERG_DETECTED') {
              queueLogRow({
                time: Date.now(),
                type: 'iceberg',
                tagCls: 'tag-iceberg',
                tagText: 'ICEBERG 🧊',
                ticker: msg.ticker,
                message: \`Обнаружен скрытый объем: \${msg.payload.price} ₽ (\${msg.direction}, x\${msg.payload.ratio})\`
              });
            } else if (msg.payload?.reason === 'ALGO_PING_BOT_DETECTED') {
              queueLogRow({
                time: Date.now(),
                type: 'robot',
                tagCls: 'tag-robot',
                tagText: 'ALGO BOT 🤖',
                ticker: msg.ticker,
                message: \`Высокочастотный всплеск: \${msg.payload.microTradesPerSecond} микро-сделок/сек @ \${msg.payload.price} ₽\`
              });
            } else {
              const tag = msg.direction === 'LONG' ? 'tag-buy' : 'tag-sell';
              queueLogRow({
                time: Date.now(),
                type: 'signal',
                tagCls: tag,
                tagText: \`SIGNAL \${msg.direction}\`,
                ticker: msg.ticker,
                message: \`[\${msg.severity}] TF: \${msg.payload?.timeframe || '5m'} | RSI: \${msg.payload?.rsi || '—'} | Stoch %K: \${msg.payload?.stochK || '—'}\`
              });
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        wsConnected = false;
        startFallbackPoll();
        setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        wsConnected = false;
        startFallbackPoll();
      };
    }

    // 5. Secondary Fallback HTTP Polling (Engages only if WebSocket drops)
    function startFallbackPoll() {
      if (fallbackPollTimer) return;
      fallbackPollTimer = setInterval(async () => {
        if (wsConnected) return;
        try {
          // Poll status
          const res = await fetch('/status');
          if (res.ok) {
            const data = await res.json();
            applyStatusData(data);
          }

          // Poll logs
          const resp = await fetch(\`/api/logs?since=\${lastLogId}\`);
          if (resp.ok) {
            const newLogs = await resp.json();
            if (Array.isArray(newLogs) && newLogs.length > 0) {
              newLogs.forEach(l => {
                if (l.id > lastLogId) {
                  lastLogId = l.id;
                  queueLogRow(l);
                }
              });
            }
          }
        } catch (e) {}
      }, 2500);
    }

    function stopFallbackPoll() {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
        fallbackPollTimer = null;
      }
    }

    // 6. Bootstrap Initial Data
    async function loadInitialData() {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch('/status'),
          fetch('/api/logs')
        ]);

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          applyStatusData(statusData);
        }

        if (logsRes.ok) {
          const initialLogs = await logsRes.json();
          if (Array.isArray(initialLogs)) {
            initialLogs.forEach(l => {
              if (l.id > lastLogId) lastLogId = l.id;
              queueLogRow(l);
            });
          }
        }
      } catch (e) {}
    }

    // Telegram Test Button
    document.getElementById('btn-tg-test').addEventListener('click', async () => {
      const resDiv = document.getElementById('tg-result');
      resDiv.innerHTML = '<span style="color:var(--orange)">Отправка тестового сигнала...</span>';
      try {
        const resp = await fetch('/config/telegram/test', { method: 'POST' });
        const res = await resp.json();
        if (res.success) {
          resDiv.innerHTML = '<span style="color:var(--green)">✅ Сообщение успешно доставлено в Telegram!</span>';
        } else {
          resDiv.innerHTML = \`<span style="color:var(--red)">⚠️ Ошибка: \${res.error || 'Сбой отправки'}</span>\`;
        }
      } catch (e) {
        resDiv.innerHTML = '<span style="color:var(--red)">❌ Ошибка сети</span>';
      }
      setTimeout(() => { resDiv.innerHTML = ''; }, 4000);
    });

    // Start WebSocket and load initial snapshot
    connectWs();
    loadInitialData();
  </script>
</body>
</html>`;
}
