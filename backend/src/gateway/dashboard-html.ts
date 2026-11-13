export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOEX Screener Pro — Live Stream & Scanner</title>
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
      --orange-bg: rgba(255, 152, 0, 0.15);
      --cyan: #00bcd4;
      --cyan-bg: rgba(0, 188, 212, 0.15);
      --purple: #ab47bc;
      --purple-bg: rgba(171, 71, 188, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-dark);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Trebuchet MS', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: hidden;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Sticky Header */
    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      gap: 15px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand h1 {
      font-size: 15px;
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
      padding: 3px 9px;
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
      gap: 8px;
    }
    .btn {
      background: var(--border);
      color: var(--text);
      border: 1px solid transparent;
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      user-select: none;
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
    .btn-sm {
      padding: 3px 8px;
      font-size: 11px;
    }

    /* Tab Navigation Bar */
    .tabs-bar {
      background: #171b26;
      border-bottom: 1px solid var(--border);
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      position: sticky;
      top: 51px;
      z-index: 99;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.03);
    }
    .tab-btn.active {
      color: #fff;
      border-bottom-color: var(--accent);
      background: rgba(41, 98, 255, 0.08);
    }
    .tab-badge {
      background: var(--border);
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .tab-btn.active .tab-badge {
      background: var(--accent);
      color: #fff;
    }

    /* Main Container & Tab Sections */
    .container {
      max-width: 1650px;
      width: 100%;
      margin: 0 auto;
      padding: 16px 20px;
      flex: 1;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* KPI Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
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
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }
    .card-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* 2-Column Split for Monitoring & Settings */
    .split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .split-grid { grid-template-columns: 1fr; }
    }

    /* Default Universe Catalog Grid & Toolbar */
    .universe-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .universe-search {
      flex: 1;
      min-width: 260px;
      position: relative;
    }
    .universe-search input {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px 8px 34px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }
    .universe-search input:focus {
      border-color: var(--accent);
      background: rgba(41, 98, 255, 0.06);
    }
    .universe-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 13px;
      pointer-events: none;
    }
    .filter-pills-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 20px;
      color: var(--text-muted);
      font-size: 12px;
      padding: 5px 12px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .filter-pill:hover {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .filter-pill.active {
      background: rgba(41, 98, 255, 0.18);
      border-color: var(--accent);
      color: #82b1ff;
      font-weight: 600;
    }
    .universe-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .universe-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      max-height: calc(100vh - 270px);
      overflow-y: auto;
      padding-right: 4px;
    }
    .stock-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .stock-card:hover {
      border-color: rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.03);
      transform: translateY(-1px);
    }
    .stock-card.selected {
      border-color: rgba(41, 98, 255, 0.65);
      background: rgba(41, 98, 255, 0.08);
      box-shadow: 0 0 10px rgba(41, 98, 255, 0.12);
    }
    .stock-checkbox {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
      cursor: pointer;
      flex-shrink: 0;
    }
    .stock-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
      overflow: hidden;
    }
    .stock-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .stock-info {
      flex: 1;
      min-width: 0;
    }
    .stock-header {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .stock-ticker {
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 700;
      color: #fff;
    }
    .stock-class-badge {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
    }
    .stock-title {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .stock-meta {
      text-align: right;
      flex-shrink: 0;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .stock-price {
      color: #fff;
      font-weight: 600;
    }
    .stock-change {
      font-size: 11px;
      margin-top: 2px;
    }
    .stock-change.up { color: var(--green); }
    .stock-change.down { color: var(--red); }
    .stock-change.neutral { color: var(--text-muted); }

    /* Terminal Styles */
    .terminal-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 145px);
      min-height: 550px;
      position: relative;
    }
    .terminal-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 10px;
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
      width: 160px;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .terminal-window {
      flex: 1;
      background: #0d1017;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      contain: content;
    }
    .log-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 2px 4px;
      border-radius: 3px;
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
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: #fff;
      padding: 5px 14px;
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
      transition: all 0.15s ease;
    }
    .scroll-pill:hover {
      background: var(--accent-hover);
      transform: translateX(-50%) translateY(-2px);
    }
    .scroll-pill.hidden {
      display: none;
    }

    /* Common Table Design */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      margin-top: 12px;
    }
    .table-toolbar {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .table-scroll {
      max-height: 580px;
      overflow-y: auto;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    table.data-table th {
      background: #171b26;
      color: var(--text-muted);
      font-weight: 600;
      padding: 8px 12px;
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    table.data-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #202430;
      vertical-align: middle;
      white-space: nowrap;
    }
    table.data-table tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-buy { background: var(--green-bg); color: var(--green); border: 1px solid var(--green); }
    .badge-sell { background: var(--red-bg); color: var(--red); border: 1px solid var(--red); }
    .badge-neutral { background: rgba(255, 255, 255, 0.06); color: var(--text-muted); border: 1px solid var(--border); }
    .badge-iceberg { background: var(--cyan-bg); color: var(--cyan); border: 1px solid var(--cyan); }
    .badge-robot { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple); }

    /* Module Toggles */
    .module-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-radius: 6px;
      background: #171b26;
      border: 1px solid var(--border);
      margin-bottom: 8px;
    }
    .module-info h4 {
      font-size: 13px;
      color: #fff;
      margin-bottom: 2px;
    }
    .module-info p {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
    }
    .toggle-switch {
      position: relative;
      width: 38px;
      height: 20px;
      flex-shrink: 0;
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

    /* Forms & Settings Inputs */
    .form-group {
      margin-bottom: 12px;
    }
    .form-group label {
      display: block;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-input {
      width: 100%;
      background: #171b26;
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
    }
    .form-input:focus {
      border-color: var(--accent);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
    }

    /* Accordion (Гармошка) for Indicator & Scanner Settings */
    .accordion-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .accordion-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .accordion-item[open] {
      background: rgba(255, 255, 255, 0.035);
      border-color: rgba(41, 98, 255, 0.35);
    }
    .accordion-header {
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      list-style: none;
      user-select: none;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .accordion-header::-webkit-details-marker {
      display: none;
    }
    .accordion-header:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .accordion-item[open] .accordion-header {
      color: #fff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .accordion-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .acc-icon {
      font-size: 13px;
    }
    .accordion-badge {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 7px;
      border-radius: 10px;
    }
    .accordion-item[open] .accordion-badge {
      background: rgba(41, 98, 255, 0.15);
      color: #82b1ff;
    }
    .accordion-chevron {
      font-size: 10px;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }
    .accordion-item[open] .accordion-chevron {
      transform: rotate(180deg);
      color: var(--accent);
    }
    .accordion-body {
      padding: 12px 14px 4px 14px;
      animation: fadeIn 0.15s ease-out;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="brand">
      <h1>📈 MOEX Screener Pro <span style="font-size: 11px; color: var(--text-muted); font-weight: 400;">Local Analytical Engine</span></h1>
      <span id="conn-badge" class="badge-status"><span class="live-dot"></span> <span id="conn-text">Подключение...</span></span>
    </div>
    <div class="header-actions">
      <span id="uptime-text" style="font-size: 11px; color: var(--text-muted); margin-right: 8px;">Uptime: 0с</span>
      <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-primary btn-sm">🖥 Терминал Т-Банка</a>
      <a href="/stocks" target="_blank" class="btn btn-sm">📊 /stocks (JSON)</a>
      <a href="/status" target="_blank" class="btn btn-sm">⚙️ /status</a>
    </div>
  </header>

  <!-- Tab Navigation Bar -->
  <nav class="tabs-bar">
    <button class="tab-btn active" data-tab="monitoring">
      <span>📊</span> <span>Мониторинг</span>
    </button>
    <button class="tab-btn" data-tab="stream">
      <span>⚡</span> <span>Стриминг сделок & сигналов</span>
      <span class="tab-badge" id="badge-stream-count">0</span>
    </button>
    <button class="tab-btn" data-tab="icebergs">
      <span>🧊</span> <span>Айсберги & Роботы</span>
      <span class="tab-badge" id="badge-icebergs-count">0</span>
    </button>
    <button class="tab-btn" data-tab="rsi-stoch">
      <span>📈</span> <span>RSI + Stochastic Scanner</span>
      <span class="tab-badge" id="badge-rsi-count">0</span>
    </button>
    <button class="tab-btn" data-tab="nw-rsi">
      <span>🌊</span> <span>RSI + Nadaraya-Watson</span>
      <span class="tab-badge" id="badge-nw-count">0</span>
    </button>
    <button class="tab-btn" data-tab="default-universe" id="tab-btn-default-universe">
      <span>📋</span> <span>Список по умолчанию</span>
      <span class="tab-badge" id="badge-default-count">0</span>
    </button>
    <button class="tab-btn" data-tab="settings">
      <span>⚙️</span> <span>Настройки & Telegram</span>
    </button>
  </nav>

  <div class="container">
    <!-- TAB 1: МОНИТОРИНГ -->
    <section id="tab-monitoring" class="tab-content active">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-title">Пропускная способность <span>⚡</span></div>
          <div class="card-value" id="val-fps">0 <span style="font-size:13px; font-weight:400; color:var(--text-muted);">пак/с</span></div>
          <div class="card-sub">Частота gRPC потока</div>
        </div>
        <div class="card">
          <div class="card-title">Лента сделок (AllTrades) <span>🤝</span></div>
          <div class="card-value" id="val-trades" style="color: #4dd0e1;">0</div>
          <div class="card-sub">Обезличенные сделки MOEX TQBR</div>
        </div>
        <div class="card">
          <div class="card-title">Стаканы L2 Depth <span>📖</span></div>
          <div class="card-value" id="val-depth" style="color: #ba68c8;">0</div>
          <div class="card-sub">20 уровней Bids / Asks</div>
        </div>
        <div class="card">
          <div class="card-title">Свечи 1M / Трейды <span>🕯️</span></div>
          <div class="card-value" id="val-candles" style="color: #81c784;">0</div>
          <div class="card-sub">Минутные тики всех акций</div>
        </div>
        <div class="card">
          <div class="card-title">Всего пакетов <span>📦</span></div>
          <div class="card-value" id="val-packets">0</div>
          <div class="card-sub" id="val-stocks-count">0 активных подписок (из 273)</div>
        </div>
      </div>

      <div class="split-grid">
        <!-- Left: Broker & Engine Status -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Здоровье соединения с брокером T-Bank (gRPC)</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid var(--border);">
                <span>Статус брокерского стрима:</span>
                <span id="grpc-status-badge" class="badge-status">CONNECTED</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid var(--border);">
                <span>Брокерский сервер:</span>
                <code style="color:#81c784;">invest-public-api.tbank.ru:443</code>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid var(--border);">
                <span>Подписано инструментов (gRPC):</span>
                <span id="grpc-subscribed-count" style="font-weight:700; color:var(--green);">0 акций (динамически)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid var(--border);">
                <span>Реконнекты и сбои:</span>
                <span id="grpc-reconnects" style="color:var(--text-muted);">0 сбоев за сессию</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Время сессии:</span>
                <span id="engine-uptime" style="font-weight:600; color:#fff;">0м 0с</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Telegram Диспетчер Сигналов</div>
            <div id="mon-tg-status" style="margin-bottom:12px; font-size:12px; color:var(--text-muted);">Проверка статуса...</div>
            <button id="btn-tg-quick-test" class="btn btn-primary" style="width:100%; justify-content:center;">📲 Отправить тестовое оповещение</button>
            <div id="mon-tg-result" style="margin-top:8px; font-size:11px;"></div>
          </div>
        </div>

        <!-- Right: Analytical Modules Overview -->
        <div class="card">
          <div class="card-title" style="margin-bottom:12px;">Аналитические модули в реальном времени</div>
          <div id="mon-modules-list">
            <div style="color:var(--text-muted);">Загрузка модулей...</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 2: СТРИМИНГ СДЕЛОК & СИГНАЛОВ -->
    <section id="tab-stream" class="tab-content">
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
            <button id="btn-pause" class="btn btn-sm">⏸ Пауза</button>
            <button id="btn-clear" class="btn btn-sm">🗑 Очистить</button>
            <button id="btn-copy-stream" class="btn btn-sm">📋 Скопировать</button>
          </div>
        </div>

        <div id="terminal" class="terminal-window">
          <div class="log-row" data-type="system" data-ticker="LOCAL">
            <span class="log-time">--:--:--</span>
            <span class="log-tag tag-system">SYSTEM</span>
            <span class="log-ticker">LOCAL</span>
            <span class="log-msg">Инициализация веб-терминала потока MOEX Screener Pro...</span>
          </div>
        </div>

        <!-- Floating Smart Auto-Scroll Pill -->
        <div id="scroll-bottom-pill" class="scroll-pill hidden">
          <span>Новые события</span> <span>↓</span>
        </div>
      </div>
    </section>

    <!-- TAB 3: АЙСБЕРГИ & РОБОТЫ -->
    <section id="tab-icebergs" class="tab-content">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-title">Всего скрытых объемов <span>🧊</span></div>
          <div class="card-value" id="val-icebergs-total" style="color:var(--cyan);">0</div>
          <div class="card-sub">Айсберг-заявки институционалов</div>
        </div>
        <div class="card">
          <div class="card-title">Покупки vs Продажи <span>⚖️</span></div>
          <div class="card-value" id="val-icebergs-ratio" style="font-size:16px;">
            <span style="color:var(--green)">0 BUY</span> / <span style="color:var(--red)">0 SELL</span>
          </div>
          <div class="card-sub">Баланс скрытого накопления/сброса</div>
        </div>
        <div class="card">
          <div class="card-title">Макс. коэффициент (Ratio) <span>🚀</span></div>
          <div class="card-value" id="val-icebergs-max" style="color:var(--orange);">x0.0</div>
          <div class="card-sub">Отношение исполнено / видимо</div>
        </div>
        <div class="card">
          <div class="card-title">HFT Роботы & Пинги <span>🤖</span></div>
          <div class="card-value" id="val-robots-total" style="color:var(--purple);">0</div>
          <div class="card-sub">Высокочастотные микро-всплески</div>
        </div>
      </div>

      <!-- Icebergs Table -->
      <div class="table-container">
        <div class="table-toolbar">
          <div style="font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;">
            <span>🧊 Радар скрытых айсберг-заявок (Order Book Volume Absorption)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="text" id="iceberg-search" class="search-input" placeholder="Поиск по тикеру...">
            <select id="iceberg-filter-dir" class="search-input" style="width:120px;">
              <option value="all">Все стороны</option>
              <option value="BUY">Только BUY</option>
              <option value="SELL">Только SELL</option>
            </select>
            <button id="btn-clear-icebergs" class="btn btn-sm">🗑 Очистить</button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table" id="icebergs-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Тикер</th>
                <th>Сторона</th>
                <th>Цена (₽)</th>
                <th>Множитель (Ratio)</th>
                <th>Детекция / Описание</th>
                <th>Терминал</th>
              </tr>
            </thead>
            <tbody id="icebergs-body">
              <tr>
                <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
                  Ожидание сигналов скрытых объемов крупных игроков...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Robots Table -->
      <div class="table-container" style="margin-top:20px;">
        <div class="table-toolbar">
          <div style="font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;">
            <span>🤖 Радар алгоритмических HFT-роботов и пинг-ботов</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="btn-clear-robots" class="btn btn-sm">🗑 Очистить</button>
          </div>
        </div>
        <div class="table-scroll" style="max-height:350px;">
          <table class="data-table" id="robots-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Тикер</th>
                <th>Частота сделок</th>
                <th>Цена (₽)</th>
                <th>Паттерн алгоритма</th>
                <th>Описание</th>
                <th>Терминал</th>
              </tr>
            </thead>
            <tbody id="robots-body">
              <tr>
                <td colspan="7" style="text-align:center; color:var(--text-muted); padding:25px;">
                  Ожидание активности алгоритмических пинг-ботов...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 4: RSI + STOCHASTIC SCANNER -->
    <section id="tab-rsi-stoch" class="tab-content">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-title">Активных акций в подписке <span>📊</span></div>
          <div class="card-value" id="val-rsi-scanned">0</div>
          <div class="card-sub">Динамический Set Union клиентов</div>
        </div>
        <div class="card">
          <div class="card-title">Зона перепроданности (BUY) <span>🟢</span></div>
          <div class="card-value" id="val-rsi-os" style="color:var(--green);">0</div>
          <div class="card-sub">RSI &lt; 30 / Stoch &lt; 20</div>
        </div>
        <div class="card">
          <div class="card-title">Зона перекупленности (SELL) <span>🔴</span></div>
          <div class="card-value" id="val-rsi-ob" style="color:var(--red);">0</div>
          <div class="card-sub">RSI &gt; 70 / Stoch &gt; 80</div>
        </div>
        <div class="card">
          <div class="card-title">Активные сигналы разворота <span>🎯</span></div>
          <div class="card-value" id="val-rsi-signals" style="color:var(--orange);">0</div>
          <div class="card-sub">Свежие пересечения %K / %D</div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <div class="filter-group">
            <span style="font-size:11px; color:var(--text-muted); margin-right:4px;">Таймфрейм:</span>
            <span class="filter-chip active rsi-tf-chip" data-tf="5m">5 минут (5M)</span>
            <span class="filter-chip rsi-tf-chip" data-tf="15m">15 минут (15M)</span>
            <span class="filter-chip rsi-tf-chip" data-tf="1h">1 час (1H)</span>
            <span class="filter-chip rsi-tf-chip" data-tf="4h">4 часа (4H)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="rsi-filter-condition" class="search-input" style="width:160px;">
              <option value="all">Все инструменты</option>
              <option value="os">Только Перепроданность (BUY)</option>
              <option value="ob">Только Перекупленность (SELL)</option>
              <option value="signals">Только активные сигналы</option>
            </select>
            <input type="text" id="rsi-search" class="search-input" placeholder="Поиск (тикер, имя)...">
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Компания</th>
                <th>Цена (₽)</th>
                <th>Изм. 24ч</th>
                <th>RVol</th>
                <th>RSI (Период 14)</th>
                <th>Stoch %K / %D</th>
                <th>Сигнал разворота</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody id="rsi-stoch-body">
              <tr>
                <td colspan="9" style="text-align:center; color:var(--text-muted); padding:30px;">
                  Загрузка данных скринера MOEX...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 5: RSI + NADARAYA-WATSON CONFLUENCE -->
    <section id="tab-nw-rsi" class="tab-content">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-title">Сигналов Confluence <span>🌊</span></div>
          <div class="card-value" id="val-nw-confluence-total" style="color:var(--accent);">0</div>
          <div class="card-sub">Совпадение полос NW и экстремумов RSI</div>
        </div>
        <div class="card">
          <div class="card-title">Бычий разворот (STRONG BUY) <span>🚀</span></div>
          <div class="card-value" id="val-nw-strong-buy" style="color:var(--green);">0</div>
          <div class="card-sub">Цена &lt; Lower Band + RSI &lt; 30</div>
        </div>
        <div class="card">
          <div class="card-title">Медвежий откат (STRONG SELL) <span>⚠️</span></div>
          <div class="card-value" id="val-nw-strong-sell" style="color:var(--red);">0</div>
          <div class="card-sub">Цена &gt; Upper Band + RSI &gt; 70</div>
        </div>
        <div class="card">
          <div class="card-title">Параметры NW Envelope <span>⚙️</span></div>
          <div class="card-value" style="font-size:16px;">h: 8.0 | Mult: 3.0</div>
          <div class="card-sub">LuxAlgo Standard (500 баров)</div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <div class="filter-group">
            <span style="font-size:11px; color:var(--text-muted); margin-right:4px;">Таймфрейм:</span>
            <span class="filter-chip active nw-tf-chip" data-tf="5m">5 минут (5M)</span>
            <span class="filter-chip nw-tf-chip" data-tf="15m">15 минут (15M)</span>
            <span class="filter-chip nw-tf-chip" data-tf="1h">1 час (1H)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="nw-filter-condition" class="search-input" style="width:160px;">
              <option value="all">Все инструменты</option>
              <option value="confluence">Только Confluence сигналы</option>
              <option value="buy">Только STRONG BUY</option>
              <option value="sell">Только STRONG SELL</option>
            </select>
            <input type="text" id="nw-search" class="search-input" placeholder="Поиск по акции...">
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Компания</th>
                <th>Цена (₽)</th>
                <th>NW Lower</th>
                <th>NW Mid</th>
                <th>NW Upper</th>
                <th>Положение в канале</th>
                <th>RSI</th>
                <th>Stoch (%K / %D)</th>
                <th>CCI</th>
                <th>Confluence Сигнал</th>
                <th>График</th>
              </tr>
            </thead>
            <tbody id="nw-body">
              <tr>
                <td colspan="12" style="text-align:center; color:var(--text-muted); padding:30px;">
                  Загрузка данных Nadaraya-Watson Envelope...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 6: DEFAULT UNIVERSE (SQLITE & FALLBACK TO .ENV) -->
    <section id="tab-default-universe" class="tab-content">
      <div class="metrics-grid" style="margin-bottom:16px;">
        <div class="card">
          <div class="card-title">Выбрано акций по умолчанию <span>📋</span></div>
          <div class="card-value" id="val-def-selected-count" style="color:var(--green);">0</div>
          <div class="card-sub" id="val-def-source-sub">Источник: SQLite (data/settings.db)</div>
        </div>
        <div class="card">
          <div class="card-title">Всего в каталоге MOEX TQBR <span>🏛️</span></div>
          <div class="card-value" id="val-def-total-count">273</div>
          <div class="card-sub">Доступные для подписки акции</div>
        </div>
        <div class="card">
          <div class="card-title">Статус хранилища <span>💾</span></div>
          <div class="card-value" id="val-def-db-status" style="font-size:16px; font-weight:600; color:#82b1ff;">SQLite База данных</div>
          <div class="card-sub" id="val-def-db-sub">Файл data/settings.db</div>
        </div>
        <div class="card">
          <div class="card-title">Режим работы при старте <span>⚡</span></div>
          <div class="card-value" id="val-def-mode-status" style="font-size:15px; font-weight:600; color:#fff;">Динамический fallback</div>
          <div class="card-sub">Если база пуста → fallback на .env</div>
        </div>
      </div>

      <!-- Action Toolbar -->
      <div class="universe-toolbar">
        <div class="universe-search">
          <span class="universe-search-icon">🔍</span>
          <input type="text" id="def-search-input" placeholder="Поиск по тикеру или названию (например SBER, Сбер, Газпром)..." />
        </div>

        <div class="filter-pills-group">
          <button type="button" class="filter-pill active" data-filter="all" id="pill-filter-all">Все (<span id="pill-cnt-all">273</span>)</button>
          <button type="button" class="filter-pill" data-filter="selected" id="pill-filter-selected">Выбранные (<span id="pill-cnt-selected">0</span>)</button>
          <button type="button" class="filter-pill" data-filter="blue-chips" id="pill-filter-blue">Голубые фишки (22)</button>
        </div>

        <div class="universe-actions">
          <button type="button" class="btn btn-secondary" id="btn-def-select-favorites" title="Загрузить и применить Избранное из вашего профиля Т-Банка">
            💛 Избранное Т-Банка
          </button>
          <button type="button" class="btn btn-secondary" id="btn-def-select-top20" title="Выбрать 20 самых ликвидных акций MOEX">
            ⭐ Топ-20
          </button>
          <button type="button" class="btn btn-secondary" id="btn-def-reset-env" title="Очистить базу данных SQLite и вернуть список из .env">
            🔄 Сбросить к .env
          </button>
          <button type="button" class="btn btn-secondary" id="btn-def-clear-all" title="Снять все галочки">
            ✕ Снять все
          </button>
          <span id="def-auto-save-indicator" style="font-size:12px; color:var(--green); font-weight:600; display:none;">✓ Сохранено в SQLite</span>
        </div>
      </div>

      <!-- Stock Cards Grid -->
      <div class="universe-grid" id="def-stocks-grid">
        <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">
          Загрузка каталога инструментов MOEX...
        </div>
      </div>
    </section>

    <!-- TAB 7: НАСТРОЙКИ & TELEGRAM -->
    <section id="tab-settings" class="tab-content">
      <div class="split-grid">
        <!-- Column 1: Telegram & Module Toggles -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Telegram Settings -->
          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Конфигурация Telegram Оповещений</div>
            <form id="form-telegram" onsubmit="saveTelegramSettings(event)">
              <div class="form-group">
                <label>Telegram Bot Token</label>
                <div style="display:flex; gap:6px;">
                  <input type="password" id="cfg-tg-token" class="form-input" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ">
                  <button type="button" class="btn btn-sm" onclick="toggleTokenVisibility()">👁</button>
                </div>
              </div>
              <div class="form-group">
                <label>Chat ID (Канал или Пользователь)</label>
                <input type="text" id="cfg-tg-chat" class="form-input" placeholder="-1001234567890 или 123456789">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Cooldown (минуты)</label>
                  <input type="number" id="cfg-tg-cooldown" class="form-input" min="1" max="60" value="5">
                </div>
                <div class="form-group" style="display:flex; flex-direction:column; justify-content:center;">
                  <label>Оповещения активны</label>
                  <label class="toggle-switch" style="margin-top:4px;">
                    <input type="checkbox" id="cfg-tg-enabled" checked>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button type="submit" class="btn btn-primary" style="flex:1; justify-content:center;">💾 Сохранить Telegram</button>
                <button type="button" id="btn-tg-test" class="btn" style="flex:1; justify-content:center;">📲 Тестовое сообщение</button>
              </div>
              <div id="settings-tg-result" style="margin-top:10px; font-size:11px;"></div>
            </form>
          </div>

          <!-- Modules Control -->
          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Управление аналитическими модулями</div>
            <div id="settings-modules-list">
              <div style="color:var(--text-muted);">Загрузка модулей...</div>
            </div>
          </div>
        </div>

        <!-- Column 2: Indicator Parameters & Gateway Info -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="card">
            <div class="card-title" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span>Параметры индикаторов и сканеров</span>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-sm" onclick="expandAllAccordion()" title="Развернуть все секции">Развернуть все</button>
                <button type="button" class="btn btn-sm" onclick="collapseAllAccordion()" title="Свернуть все секции">Свернуть все</button>
              </div>
            </div>

            <form id="form-indicators" onsubmit="saveIndicatorParams(event)">
              <div class="accordion-group">
                <!-- 1. RSI -->
                <details class="accordion-item" open>
                  <summary class="accordion-header">
                    <div class="accordion-title">
                      <span class="acc-icon">📊</span>
                      <span>RSI (Relative Strength Index)</span>
                      <span class="accordion-badge" id="acc-badge-rsi">14 [30/70]</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div class="form-row">
                      <div class="form-group">
                        <label>RSI Период</label>
                        <input type="number" id="cfg-rsi-period" class="form-input" min="2" max="50" value="14">
                      </div>
                      <div class="form-group">
                        <label>Зона перепроданности (BUY)</label>
                        <input type="number" id="cfg-rsi-oversold" class="form-input" min="10" max="45" value="30">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Зона перекупленности (SELL)</label>
                        <input type="number" id="cfg-rsi-overbought" class="form-input" min="55" max="90" value="70">
                      </div>
                    </div>
                  </div>
                </details>

                <!-- 2. Stochastic -->
                <details class="accordion-item" open>
                  <summary class="accordion-header">
                    <div class="accordion-title">
                      <span class="acc-icon">⚡</span>
                      <span>Stochastic Oscillator</span>
                      <span class="accordion-badge" id="acc-badge-stoch">14, 3, 3 [20/80]</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div class="form-row">
                      <div class="form-group">
                        <label>Stoch %K Период</label>
                        <input type="number" id="cfg-stoch-k" class="form-input" min="2" max="50" value="14">
                      </div>
                      <div class="form-group">
                        <label>Stoch %D / Signal</label>
                        <input type="number" id="cfg-stoch-d" class="form-input" min="1" max="10" value="3">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Stoch %K Smooth</label>
                        <input type="number" id="cfg-stoch-smooth" class="form-input" min="1" max="10" value="3">
                      </div>
                      <div class="form-group">
                        <label>Зона перепроданности (BUY)</label>
                        <input type="number" id="cfg-stoch-oversold" class="form-input" min="5" max="40" value="20">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Зона перекупленности (SELL)</label>
                        <input type="number" id="cfg-stoch-overbought" class="form-input" min="60" max="95" value="80">
                      </div>
                    </div>
                  </div>
                </details>

                <!-- 3. Nadaraya-Watson -->
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <div class="accordion-title">
                      <span class="acc-icon">🌊</span>
                      <span>Nadaraya-Watson Envelope (LuxAlgo)</span>
                      <span class="accordion-badge" id="acc-badge-nw">h=8.0, mult=3.0</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div class="form-row">
                      <div class="form-group">
                        <label>NW Bandwidth (h)</label>
                        <input type="number" id="cfg-nw-bw" class="form-input" min="1" max="50" step="0.5" value="8">
                      </div>
                      <div class="form-group">
                        <label>NW Multiplier (mult)</label>
                        <input type="number" id="cfg-nw-mult" class="form-input" min="0.5" max="10" step="0.5" value="3">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Режим LuxAlgo (500 баров сглаживания)</label>
                        <label class="toggle-switch" style="margin-top:4px;">
                          <input type="checkbox" id="cfg-nw-repaint" checked>
                          <span class="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </details>

                <!-- 4. CCI -->
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <div class="accordion-title">
                      <span class="acc-icon">🧭</span>
                      <span>CCI (Commodity Channel Index)</span>
                      <span class="accordion-badge" id="acc-badge-cci">20 [-100/+100]</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div class="form-row">
                      <div class="form-group">
                        <label>CCI Период</label>
                        <input type="number" id="cfg-cci-period" class="form-input" min="2" max="100" value="20">
                      </div>
                      <div class="form-group">
                        <label>Нижняя граница (BUY)</label>
                        <input type="number" id="cfg-cci-oversold" class="form-input" min="-300" max="-50" value="-100">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Верхняя граница (SELL)</label>
                        <input type="number" id="cfg-cci-overbought" class="form-input" min="50" max="300" value="100">
                      </div>
                    </div>
                  </div>
                </details>

                <!-- 5. RVol -->
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <div class="accordion-title">
                      <span class="acc-icon">📦</span>
                      <span>RVol (Относительный объем)</span>
                      <span class="accordion-badge" id="acc-badge-rvol">10 дней [x2.0]</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div class="form-row">
                      <div class="form-group">
                        <label>RVol Базовый период (Дней)</label>
                        <input type="number" id="cfg-rvol-days" class="form-input" min="2" max="30" value="10">
                      </div>
                      <div class="form-group">
                        <label>Порог аномального всплеска (x)</label>
                        <input type="number" id="cfg-rvol-threshold" class="form-input" min="1.1" max="10" step="0.1" value="2.0">
                      </div>
                    </div>
                  </div>
                </details>

                <!-- 6. Scanners & Detectors Group -->
                <details class="accordion-item" open>
                  <summary class="accordion-header" style="border-left: 3px solid var(--accent);">
                    <div class="accordion-title">
                      <span class="acc-icon">🎯</span>
                      <span style="color:#fff; font-weight:700;">Сканеры & Детекторы микроструктуры</span>
                      <span class="accordion-badge" style="background:rgba(41,98,255,0.2); color:#82b1ff;">Детекторы L2</span>
                    </div>
                    <span class="accordion-chevron">▼</span>
                  </summary>
                  <div class="accordion-body">
                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
                      Параметры детекции скрытой ликвидности (айсбергов), алгоритмических роботов и спуфинга в реальном времени.
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Айсберги: Мин. множитель (x)</label>
                        <input type="number" id="cfg-iceberg-ratio" class="form-input" min="1.2" max="20" step="0.1" value="2.5">
                      </div>
                      <div class="form-group">
                        <label>Айсберги: Мин. трейдов на уровне</label>
                        <input type="number" id="cfg-iceberg-min-trades" class="form-input" min="1" max="30" value="3">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Роботы: Мин. частота (тр/с)</label>
                        <input type="number" id="cfg-robot-freq" class="form-input" min="1" max="100" value="5">
                      </div>
                      <div class="form-group">
                        <label>Роботы: Размер пакета сделок</label>
                        <input type="number" id="cfg-robot-burst" class="form-input" min="3" max="100" value="10">
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:14px; padding:9px 16px;">
                💾 Применить параметры индикаторов и сканеров
              </button>
              <div id="settings-indicators-result" style="margin-top:8px; font-size:11px;"></div>
            </form>
          </div>

          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Сетевой шлюз и API Ссылки</div>
            <div style="font-size: 11px; display:flex; flex-direction:column; gap:10px;">
              <div>
                <div style="color:var(--text-muted); margin-bottom:2px;">WebSocket Stream Server:</div>
                <code id="info-ws-url" style="color:#82b1ff; word-break:break-all;">ws://127.0.0.1:3001/stream</code>
              </div>
              <div>
                <div style="color:var(--text-muted); margin-bottom:2px;">REST API Ticker Snapshot:</div>
                <code id="info-rest-url" style="color:#82b1ff; word-break:break-all;">http://127.0.0.1:3001/stocks</code>
              </div>
              <div>
                <div style="color:var(--text-muted); margin-bottom:2px;">T-Bank gRPC Broker Host:</div>
                <code style="color:#81c784;">invest-public-api.tbank.ru:443</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <script>
    // -------------------------------------------------------------
    // 1. Dynamic Protocol & Host Detection
    // -------------------------------------------------------------
    const curProto = location.protocol === 'https:' ? 'https:' : 'http:';
    const curWsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const infoWsEl = document.getElementById('info-ws-url');
    const infoRestEl = document.getElementById('info-rest-url');
    if (infoWsEl) infoWsEl.textContent = \`\${curWsProto}//\${location.host}/stream\`;
    if (infoRestEl) infoRestEl.textContent = \`\${curProto}//\${location.host}/stocks\`;

    // -------------------------------------------------------------
    // 2. Tab Navigation System with URL Hash Sync
    // -------------------------------------------------------------
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(tabId, updateHash = true) {
      tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      tabContents.forEach(content => {
        if (content.id === \`tab-\${tabId}\`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      if (updateHash) {
        window.location.hash = tabId;
      }

      if (tabId === 'default-universe') {
        loadDefaultUniverse();
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) switchTab(tabId, true);
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && document.getElementById(\`tab-\${hash}\`)) {
        switchTab(hash, false);
      }
    });

    // Check initial hash on page load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(\`tab-\${initialHash}\`)) {
      switchTab(initialHash, false);
    }

    // -------------------------------------------------------------
    // 3. Batched Terminal Stream Log (High Performance)
    // -------------------------------------------------------------
    const MAX_ROWS = 350;
    const terminal = document.getElementById('terminal');
    const searchTicker = document.getElementById('search-ticker');
    const scrollPill = document.getElementById('scroll-bottom-pill');
    const badgeStreamCount = document.getElementById('badge-stream-count');

    let currentFilter = 'all';
    let isPaused = false;
    let autoScroll = true;
    let lastLogId = 0;
    let totalLogsCount = 0;

    let pendingLogQueue = [];
    let batchRafId = null;
    const backgroundBuffer = [];

    terminal.addEventListener('scroll', () => {
      const distFromBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight;
      if (distFromBottom > 45) {
        if (autoScroll) autoScroll = false;
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

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && backgroundBuffer.length > 0) {
        while (backgroundBuffer.length > 0) {
          pendingLogQueue.push(backgroundBuffer.shift());
        }
        scheduleLogFlush();
      }
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const parent = chip.parentElement;
        if (!parent) return;
        parent.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter') || 'all';
        filterRows();
      });
    });

    searchTicker.addEventListener('input', () => filterRows());

    document.getElementById('btn-clear').addEventListener('click', () => {
      terminal.innerHTML = '';
      pendingLogQueue = [];
      backgroundBuffer.length = 0;
      totalLogsCount = 0;
      if (badgeStreamCount) badgeStreamCount.textContent = '0';
      if (scrollPill) scrollPill.classList.add('hidden');
    });

    const btnPause = document.getElementById('btn-pause');
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? '▶️ Продолжить' : '⏸ Пауза';
      btnPause.style.background = isPaused ? 'var(--orange)' : '';
      btnPause.style.color = isPaused ? '#fff' : '';
    });

    document.getElementById('btn-copy-stream').addEventListener('click', () => {
      const text = Array.from(terminal.querySelectorAll('.log-row'))
        .map(r => r.innerText.replace(/\\n/g, ' '))
        .join('\\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('Логи терминала скопированы в буфер обмена!');
      });
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
      totalLogsCount++;
      if (badgeStreamCount) badgeStreamCount.textContent = totalLogsCount > 999 ? '999+' : String(totalLogsCount);

      if (isPaused) return;

      if (document.hidden) {
        if (backgroundBuffer.length >= 200) backgroundBuffer.shift();
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

      const excess = terminal.children.length - MAX_ROWS;
      if (excess > 0) {
        for (let i = 0; i < excess; i++) {
          if (terminal.firstElementChild) terminal.removeChild(terminal.firstElementChild);
        }
      }

      if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
      } else {
        if (scrollPill) scrollPill.classList.remove('hidden');
      }
    }

    // -------------------------------------------------------------
    // 4. Tab 3: Icebergs & Algo Ping-Bots Radar
    // -------------------------------------------------------------
    const icebergsBody = document.getElementById('icebergs-body');
    const robotsBody = document.getElementById('robots-body');
    const icebergSearch = document.getElementById('iceberg-search');
    const icebergFilterDir = document.getElementById('iceberg-filter-dir');
    const badgeIcebergsCount = document.getElementById('badge-icebergs-count');

    let icebergsData = [];
    let robotsData = [];
    let buyIcebergs = 0;
    let sellIcebergs = 0;
    let maxIcebergRatio = 0;

    function addIcebergRecord(entry) {
      icebergsData.unshift(entry);
      if (icebergsData.length > 200) icebergsData.pop();

      if (entry.direction === 'BUY' || entry.direction === 'LONG') buyIcebergs++;
      else if (entry.direction === 'SELL' || entry.direction === 'SHORT') sellIcebergs++;

      const ratio = Number(entry.ratio || 0);
      if (ratio > maxIcebergRatio) maxIcebergRatio = ratio;

      updateIcebergKPIs();
      renderIcebergsTable();
    }

    function addRobotRecord(entry) {
      robotsData.unshift(entry);
      if (robotsData.length > 200) robotsData.pop();

      const robotsTotalEl = document.getElementById('val-robots-total');
      if (robotsTotalEl) robotsTotalEl.textContent = robotsData.length;

      renderRobotsTable();
    }

    function updateIcebergKPIs() {
      const totalEl = document.getElementById('val-icebergs-total');
      const ratioEl = document.getElementById('val-icebergs-ratio');
      const maxEl = document.getElementById('val-icebergs-max');

      const total = icebergsData.length;
      if (totalEl) totalEl.textContent = total;
      if (badgeIcebergsCount) badgeIcebergsCount.textContent = total > 99 ? '99+' : String(total);

      if (ratioEl) {
        ratioEl.innerHTML = \`<span style="color:var(--green)">\${buyIcebergs} BUY</span> / <span style="color:var(--red)">\${sellIcebergs} SELL</span>\`;
      }
      if (maxEl) maxEl.textContent = \`x\${maxIcebergRatio.toFixed(1)}\`;
    }

    function renderIcebergsTable() {
      if (icebergsData.length === 0) {
        icebergsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Ожидание сигналов скрытых объемов крупных игроков...</td></tr>';
        return;
      }

      const q = icebergSearch.value.trim().toUpperCase();
      const dirFilter = icebergFilterDir.value;

      const filtered = icebergsData.filter(item => {
        const matchTicker = !q || item.ticker.includes(q);
        const isBuy = item.direction === 'BUY' || item.direction === 'LONG';
        const matchDir = dirFilter === 'all' || (dirFilter === 'BUY' && isBuy) || (dirFilter === 'SELL' && !isBuy);
        return matchTicker && matchDir;
      });

      if (filtered.length === 0) {
        icebergsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">Нет айсбергов по заданному фильтру</td></tr>';
        return;
      }

      icebergsBody.innerHTML = filtered.slice(0, 50).map(item => {
        const isBuy = item.direction === 'BUY' || item.direction === 'LONG';
        const badgeCls = isBuy ? 'badge-buy' : 'badge-sell';
        const ratio = Number(item.ratio || 0).toFixed(1);

        return \`
          <tr>
            <td style="color:var(--text-muted);">\${new Date(item.time).toLocaleTimeString('ru-RU')}</td>
            <td style="font-weight:700; color:#fff;">\${item.ticker}</td>
            <td><span class="badge-pill \${badgeCls}">\${isBuy ? 'ПОКУПКА (BID)' : 'ПРОДАЖА (ASK)'}</span></td>
            <td style="font-weight:600;">\${Number(item.price).toFixed(2)} ₽</td>
            <td><span class="badge-pill badge-iceberg">x\${ratio}</span></td>
            <td style="color:var(--text-muted); font-size:11px;">\${item.message || 'Скрытое исполнение институционального объема'}</td>
            <td>
              <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-sm" style="padding:2px 6px;">График ↗</a>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function renderRobotsTable() {
      if (robotsData.length === 0) {
        robotsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:25px;">Ожидание активности алгоритмических пинг-ботов...</td></tr>';
        return;
      }

      robotsBody.innerHTML = robotsData.slice(0, 50).map(item => \`
        <tr>
          <td style="color:var(--text-muted);">\${new Date(item.time).toLocaleTimeString('ru-RU')}</td>
          <td style="font-weight:700; color:#fff;">\${item.ticker}</td>
          <td><span class="badge-pill badge-robot">\${item.frequency || '10+'} микро-сд/сек</span></td>
          <td style="font-weight:600;">\${item.price ? Number(item.price).toFixed(2) + ' ₽' : '—'}</td>
          <td><span class="badge-pill badge-neutral">HFT PING / CLUSTER</span></td>
          <td style="color:var(--text-muted); font-size:11px;">\${item.message || 'Высокочастотное прощупывание стакана'}</td>
          <td>
            <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-sm" style="padding:2px 6px;">График ↗</a>
          </td>
        </tr>
      \`).join('');
    }

    icebergSearch.addEventListener('input', () => renderIcebergsTable());
    icebergFilterDir.addEventListener('change', () => renderIcebergsTable());

    document.getElementById('btn-clear-icebergs').addEventListener('click', () => {
      icebergsData = [];
      buyIcebergs = 0;
      sellIcebergs = 0;
      maxIcebergRatio = 0;
      updateIcebergKPIs();
      renderIcebergsTable();
    });

    document.getElementById('btn-clear-robots').addEventListener('click', () => {
      robotsData = [];
      const robotsTotalEl = document.getElementById('val-robots-total');
      if (robotsTotalEl) robotsTotalEl.textContent = '0';
      renderRobotsTable();
    });

    // -------------------------------------------------------------
    // 5. Tab 4: RSI + Stochastic Scanner Logic
    // -------------------------------------------------------------
    let stockItemsSnapshot = [];
    let rsiActiveTf = '5m';
    const rsiStochBody = document.getElementById('rsi-stoch-body');
    const rsiSearch = document.getElementById('rsi-search');
    const rsiFilterCondition = document.getElementById('rsi-filter-condition');
    const badgeRsiCount = document.getElementById('badge-rsi-count');

    document.querySelectorAll('.rsi-tf-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.rsi-tf-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        rsiActiveTf = chip.getAttribute('data-tf') || '5m';
        renderRsiStochTable();
      });
    });

    rsiSearch.addEventListener('input', () => renderRsiStochTable());
    rsiFilterCondition.addEventListener('change', () => renderRsiStochTable());

    function renderRsiStochTable() {
      if (!stockItemsSnapshot || stockItemsSnapshot.length === 0) {
        rsiStochBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:30px;">Загрузка данных инструментов MOEX...</td></tr>';
        return;
      }

      const q = rsiSearch.value.trim().toUpperCase();
      const cond = rsiFilterCondition.value;

      let osCount = 0;
      let obCount = 0;
      let signalCount = 0;

      const prepared = stockItemsSnapshot.map(item => {
        const tfData = item.tf ? item.tf[rsiActiveTf] : null;
        const rsiVal = tfData && typeof tfData.rsi === 'number' ? tfData.rsi : null;
        const kVal = tfData && typeof tfData.k === 'number' ? tfData.k : null;
        const dVal = tfData && typeof tfData.d === 'number' ? tfData.d : null;

        let signalType = 'NEUTRAL';
        if (rsiVal !== null) {
          if (rsiVal < 30) {
            osCount++;
            signalType = 'BUY';
            signalCount++;
          } else if (rsiVal > 70) {
            obCount++;
            signalType = 'SELL';
            signalCount++;
          }
        }

        return { item, rsiVal, kVal, dVal, signalType };
      });

      document.getElementById('val-rsi-os').textContent = osCount;
      document.getElementById('val-rsi-ob').textContent = obCount;
      document.getElementById('val-rsi-signals').textContent = signalCount;
      if (badgeRsiCount) badgeRsiCount.textContent = signalCount > 99 ? '99+' : String(signalCount);

      const filtered = prepared.filter(({ item, rsiVal, signalType }) => {
        const matchSearch = !q || item.ticker.includes(q) || (item.description && item.description.toUpperCase().includes(q));
        if (!matchSearch) return false;

        if (cond === 'os') return signalType === 'BUY';
        if (cond === 'ob') return signalType === 'SELL';
        if (cond === 'signals') return signalType === 'BUY' || signalType === 'SELL';
        return true;
      });

      // Sort: signals first, then by RSI extremes
      filtered.sort((a, b) => {
        if (a.signalType !== 'NEUTRAL' && b.signalType === 'NEUTRAL') return -1;
        if (a.signalType === 'NEUTRAL' && b.signalType !== 'NEUTRAL') return 1;
        const rsiA = a.rsiVal !== null ? a.rsiVal : 50;
        const rsiB = b.rsiVal !== null ? b.rsiVal : 50;
        return rsiA - rsiB;
      });

      if (filtered.length === 0) {
        rsiStochBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:20px;">Нет акций по выбранным условиям фильтра</td></tr>';
        return;
      }

      rsiStochBody.innerHTML = filtered.slice(0, 100).map(({ item, rsiVal, kVal, dVal, signalType }) => {
        const change = typeof item.change === 'number' ? item.change : 0;
        const changeCls = change > 0 ? 'color:var(--green)' : change < 0 ? 'color:var(--red)' : '';
        const changeSign = change > 0 ? '+' : '';

        let rsiBadge = '<span style="color:var(--text-muted)">—</span>';
        if (rsiVal !== null) {
          const rsiColor = rsiVal < 30 ? 'var(--green)' : rsiVal > 70 ? 'var(--red)' : '#fff';
          rsiBadge = \`<span style="font-weight:700; color:\${rsiColor}">\${rsiVal.toFixed(1)}</span>\`;
        }

        let stochText = '<span style="color:var(--text-muted)">—</span>';
        if (kVal !== null && dVal !== null) {
          const kColor = kVal < 20 ? 'var(--green)' : kVal > 80 ? 'var(--red)' : 'var(--text-muted)';
          stochText = \`<span style="color:\${kColor}; font-weight:600;">%K: \${kVal.toFixed(0)}</span> / <span style="color:var(--text-muted);">%D: \${dVal.toFixed(0)}</span>\`;
        }

        let signalBadge = '<span class="badge-pill badge-neutral">NEUTRAL</span>';
        if (signalType === 'BUY') {
          signalBadge = '<span class="badge-pill badge-buy">🟢 REVERSAL BUY</span>';
        } else if (signalType === 'SELL') {
          signalBadge = '<span class="badge-pill badge-sell">🔴 RETRACE SELL</span>';
        }

        return \`
          <tr>
            <td style="font-weight:700; color:#fff;">\${item.ticker}</td>
            <td style="color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis;">\${item.description || item.ticker}</td>
            <td style="font-weight:600;">\${item.price ? formatStockPrice(item.price) + ' ₽' : '—'}</td>
            <td style="\${changeCls}; font-weight:600;">\${changeSign}\${change.toFixed(2)}%</td>
            <td style="color:var(--text-muted);">\${item.rvol ? item.rvol.toFixed(2) + 'x' : '1.0x'}</td>
            <td>\${rsiBadge}</td>
            <td>\${stochText}</td>
            <td>\${signalBadge}</td>
            <td>
              <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-sm" style="padding:2px 6px;">График ↗</a>
            </td>
          </tr>
        \`;
      }).join('');
    }

    // -------------------------------------------------------------
    // 6. Tab 5: Nadaraya-Watson + RSI Confluence Scanner Logic
    // -------------------------------------------------------------
    let nwActiveTf = '5m';
    const nwBody = document.getElementById('nw-body');
    const nwSearch = document.getElementById('nw-search');
    const nwFilterCondition = document.getElementById('nw-filter-condition');
    const badgeNwCount = document.getElementById('badge-nw-count');

    document.querySelectorAll('.nw-tf-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.nw-tf-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        nwActiveTf = chip.getAttribute('data-tf') || '5m';
        renderNwTable();
      });
    });

    nwSearch.addEventListener('input', () => renderNwTable());
    nwFilterCondition.addEventListener('change', () => renderNwTable());

        function formatStockPrice(val) {
      if (val === undefined || val === null || isNaN(val)) return '—';
      const num = Number(val);
      if (num < 0.01) return num.toFixed(6);
      if (num < 0.1) return num.toFixed(5);
      if (num < 1) return num.toFixed(4);
      if (num < 10) return num.toFixed(3);
      return num.toFixed(2);
    }

    function renderNwTable() {
      if (!stockItemsSnapshot || stockItemsSnapshot.length === 0) {
        nwBody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:var(--text-muted); padding:30px;">Загрузка данных инструментов MOEX...</td></tr>';
        return;
      }

      const q = nwSearch.value.trim().toUpperCase();
      const cond = nwFilterCondition.value;

      let strongBuyCount = 0;
      let strongSellCount = 0;

      const prepared = stockItemsSnapshot.map(item => {
        const tfData = item.tf ? item.tf[nwActiveTf] : null;
        const nw = tfData && tfData.nw ? tfData.nw : null;
        const rsiVal = tfData && typeof tfData.rsi === 'number' ? tfData.rsi : null;
        const kVal = tfData && typeof tfData.k === 'number' ? tfData.k : null;
        const dVal = tfData && typeof tfData.d === 'number' ? tfData.d : null;
        const cciVal = tfData && typeof tfData.cci === 'number' ? tfData.cci : null;
        const price = item.price;

        let confluenceSignal = 'NEUTRAL';
        let positionText = '<span style="color:var(--text-muted);">Внутри канала</span>';

        if (nw && price) {
          if (price <= nw.lower) {
            positionText = '<span style="color:var(--green); font-weight:600;">Ниже нижней границы (OS)</span>';
            if (rsiVal !== null && rsiVal < 35) {
              confluenceSignal = 'STRONG BUY';
              strongBuyCount++;
            }
          } else if (price >= nw.upper) {
            positionText = '<span style="color:var(--red); font-weight:600;">Выше верхней границы (OB)</span>';
            if (rsiVal !== null && rsiVal > 65) {
              confluenceSignal = 'STRONG SELL';
              strongSellCount++;
            }
          }
        }

        return { item, nw, rsiVal, kVal, dVal, cciVal, confluenceSignal, positionText };
      });

      const totalConfluence = strongBuyCount + strongSellCount;
      document.getElementById('val-nw-confluence-total').textContent = totalConfluence;
      document.getElementById('val-nw-strong-buy').textContent = strongBuyCount;
      document.getElementById('val-nw-strong-sell').textContent = strongSellCount;
      if (badgeNwCount) badgeNwCount.textContent = totalConfluence > 99 ? '99+' : String(totalConfluence);

      const filtered = prepared.filter(({ item, confluenceSignal }) => {
        const matchSearch = !q || item.ticker.includes(q) || (item.description && item.description.toUpperCase().includes(q));
        if (!matchSearch) return false;

        if (cond === 'confluence') return confluenceSignal !== 'NEUTRAL';
        if (cond === 'buy') return confluenceSignal === 'STRONG BUY';
        if (cond === 'sell') return confluenceSignal === 'STRONG SELL';
        return true;
      });

      filtered.sort((a, b) => {
        if (a.confluenceSignal !== 'NEUTRAL' && b.confluenceSignal === 'NEUTRAL') return -1;
        if (a.confluenceSignal === 'NEUTRAL' && b.confluenceSignal !== 'NEUTRAL') return 1;
        return a.item.ticker.localeCompare(b.item.ticker);
      });

      if (filtered.length === 0) {
        nwBody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:var(--text-muted); padding:20px;">Нет акций по выбранным условиям фильтра</td></tr>';
        return;
      }

      nwBody.innerHTML = filtered.slice(0, 100).map(({ item, nw, rsiVal, kVal, dVal, cciVal, confluenceSignal, positionText }) => {
        let signalBadge = '<span class="badge-pill badge-neutral">NEUTRAL</span>';
        if (confluenceSignal === 'STRONG BUY') {
          signalBadge = '<span class="badge-pill badge-buy">🚀 STRONG BUY</span>';
        } else if (confluenceSignal === 'STRONG SELL') {
          signalBadge = '<span class="badge-pill badge-sell">⚠️ STRONG SELL</span>';
        }

        let stochText = '<span style="color:var(--text-muted)">—</span>';
        if (kVal !== null && dVal !== null) {
          const kColor = kVal < 20 ? 'var(--green)' : kVal > 80 ? 'var(--red)' : '#fff';
          stochText = \`<span style="color:\${kColor}; font-weight:600;">\${kVal.toFixed(0)}</span> <span style="color:var(--text-muted); font-size:11px;">/ \${dVal.toFixed(0)}</span>\`;
        }

        let cciText = '<span style="color:var(--text-muted)">—</span>';
        if (cciVal !== null) {
          const cciColor = cciVal < -100 ? 'var(--green)' : cciVal > 100 ? 'var(--red)' : '#fff';
          const sign = cciVal > 0 ? '+' : '';
          cciText = \`<span style="color:\${cciColor}; font-weight:600;">\${sign}\${cciVal.toFixed(1)}</span>\`;
        }

        return \`
          <tr>
            <td style="font-weight:700; color:#fff;">\${item.ticker}</td>
            <td style="color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis;">\${item.description || item.ticker}</td>
            <td style="font-weight:600;">\${item.price ? formatStockPrice(item.price) + ' ₽' : '—'}</td>
            <td style="color:#81c784;">\${nw ? formatStockPrice(nw.lower) : '—'}</td>
            <td style="color:#82b1ff;">\${nw ? formatStockPrice(nw.mid) : '—'}</td>
            <td style="color:#e57373;">\${nw ? formatStockPrice(nw.upper) : '—'}</td>
            <td>\${positionText}</td>
            <td style="font-weight:600;">\${rsiVal !== null ? rsiVal.toFixed(1) : '—'}</td>
            <td>\${stochText}</td>
            <td>\${cciText}</td>
            <td>\${signalBadge}</td>
            <td>
              <a href="https://www.tbank.ru/terminal/" target="_blank" class="btn btn-sm" style="padding:2px 6px;">График ↗</a>
            </td>
          </tr>
        \`;
      }).join('');
    }

    // -------------------------------------------------------------
    // 7. Tab 6: Default Universe Manager (SQLite & Fallback to .env)
    // -------------------------------------------------------------
    const BLUE_CHIPS_SET = new Set([
      'SBER', 'SBERP', 'GAZP', 'LKOH', 'GMKN', 'NVTK', 'YDEX', 'YNDX', 'ROSN',
      'MGNT', 'TATN', 'TATNP', 'MTSS', 'CHMF', 'NLMK', 'MAGN', 'ALRS', 'PLZL',
      'IRAO', 'VTBR', 'SNGS', 'SNGSP', 'TRNFP', 'MOEX', 'AFLT', 'PHOR', 'T'
    ]);
    const TOP_20_LIST = [
      'SBER', 'GAZP', 'LKOH', 'GMKN', 'NVTK', 'YDEX', 'ROSN', 'MGNT',
      'TATN', 'MTSS', 'CHMF', 'NLMK', 'ALRS', 'PLZL', 'IRAO', 'VTBR',
      'SNGS', 'SNGSP', 'TRNFP', 'MOEX'
    ];

    let allUniverseStocks = [];
    let selectedDefaultTickers = new Set();
    let currentUniverseFilter = 'all';
    let universeSearchQuery = '';
    let defaultAutoSaveTimer = null;
    let universeLoaded = false;

    async function loadDefaultUniverse(force = false) {
      if (universeLoaded && !force) return;
      try {
        const res = await fetch('/api/default-tickers');
        if (!res.ok) return;
        const data = await res.json();

        allUniverseStocks = Array.isArray(data.instruments) ? data.instruments : [];
        selectedDefaultTickers = new Set(Array.isArray(data.tickers) ? data.tickers : []);
        universeLoaded = true;

        const totalEl = document.getElementById('val-def-total-count');
        const pillAllEl = document.getElementById('pill-cnt-all');
        if (totalEl) totalEl.textContent = allUniverseStocks.length;
        if (pillAllEl) pillAllEl.textContent = allUniverseStocks.length;

        updateUniverseCounters(!data.isFromEnv);
        renderUniverseGrid();
      } catch (e) {
        console.error('Failed to load default universe:', e);
      }
    }

    function updateUniverseCounters(isCustomDb) {
      const count = selectedDefaultTickers.size;
      const valCount = document.getElementById('val-def-selected-count');
      const badgeCount = document.getElementById('badge-default-count');
      const pillSelected = document.getElementById('pill-cnt-selected');
      const dbStatus = document.getElementById('val-def-db-status');
      const sourceSub = document.getElementById('val-def-source-sub');

      if (valCount) valCount.textContent = count;
      if (badgeCount) badgeCount.textContent = count;
      if (pillSelected) pillSelected.textContent = count;

      if (count === 0 || !isCustomDb) {
        if (dbStatus) {
          dbStatus.textContent = count === 0 ? 'Fallback на .env (база пуста)' : 'По умолчанию (.env)';
          dbStatus.style.color = '#ffb74d';
        }
        if (sourceSub) {
          sourceSub.textContent = count === 0 ? 'База пуста → активен fallback на .env' : 'Источник: Резервный список .env';
        }
      } else {
        if (dbStatus) {
          dbStatus.textContent = 'SQLite База данных';
          dbStatus.style.color = '#82b1ff';
        }
        if (sourceSub) {
          sourceSub.textContent = 'Источник: SQLite (data/settings.db)';
        }
      }
    }

    function renderUniverseGrid() {
      const grid = document.getElementById('def-stocks-grid');
      if (!grid) return;

      if (allUniverseStocks.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">Каталог инструментов пуст или загружается...</div>';
        return;
      }

      const q = universeSearchQuery;
      const filtered = allUniverseStocks.filter(stock => {
        const matchSearch = !q || stock.ticker.includes(q) || (stock.name && stock.name.toUpperCase().includes(q));
        if (!matchSearch) return false;

        if (currentUniverseFilter === 'selected') {
          return selectedDefaultTickers.has(stock.ticker);
        }
        if (currentUniverseFilter === 'blue-chips') {
          return BLUE_CHIPS_SET.has(stock.ticker);
        }
        return true;
      });

      // Sort: selected first, then alphabetically
      filtered.sort((a, b) => {
        const aSel = selectedDefaultTickers.has(a.ticker) ? 1 : 0;
        const bSel = selectedDefaultTickers.has(b.ticker) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        return a.ticker.localeCompare(b.ticker);
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 30px; color:var(--text-muted);">Ничего не найдено по текущим фильтрам</div>';
        return;
      }

      grid.innerHTML = filtered.map(stock => {
        const isSelected = selectedDefaultTickers.has(stock.ticker);
        const change = typeof stock.change === 'number' ? stock.change : 0;
        const changeCls = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
        const changeSign = change > 0 ? '+' : '';
        const priceStr = stock.price ? stock.price.toFixed(2) + ' ₽' : '—';
        const avatarLetters = stock.ticker.slice(0, 2);

        return \`
          <div class="stock-card \${isSelected ? 'selected' : ''}" data-ticker="\${stock.ticker}">
            <input type="checkbox" class="stock-checkbox" \${isSelected ? 'checked' : ''} data-ticker="\${stock.ticker}" />
            <div class="stock-avatar" style="\${stock.logoColor ? 'background:' + stock.logoColor : ''}">
              \${stock.logoUrl ? \`<img src="\${stock.logoUrl}" alt="\${stock.ticker}" onerror="this.style.display='none'; this.parentNode.textContent='\${avatarLetters}';" />\` : avatarLetters}
            </div>
            <div class="stock-info">
              <div class="stock-header">
                <span class="stock-ticker">\${stock.ticker}</span>
                <span class="stock-class-badge">\${stock.classCode || 'TQBR'}</span>
              </div>
              <div class="stock-title" title="\${stock.name || stock.ticker}">\${stock.name || stock.ticker}</div>
            </div>
            <div class="stock-meta">
              <div class="stock-price">\${priceStr}</div>
              <div class="stock-change \${changeCls}">\${changeSign}\${change.toFixed(2)}%</div>
            </div>
          </div>
        \`;
      }).join('');

      // Attach click listeners to cards
      grid.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const ticker = card.getAttribute('data-ticker');
          if (!ticker) return;
          const checkbox = card.querySelector('.stock-checkbox');

          const isDirectCheckbox = e.target === checkbox || e.target.classList.contains('stock-checkbox');
          if (!isDirectCheckbox && checkbox) {
            checkbox.checked = !checkbox.checked;
          }

          const isChecked = checkbox ? checkbox.checked : !selectedDefaultTickers.has(ticker);
          if (isChecked) {
            selectedDefaultTickers.add(ticker);
            card.classList.add('selected');
          } else {
            selectedDefaultTickers.delete(ticker);
            card.classList.remove('selected');
          }

          updateUniverseCounters(true);
          saveDefaultTickersDebounced();
        });
      });
    }

    function saveDefaultTickersDebounced() {
      const indicator = document.getElementById('def-auto-save-indicator');
      if (indicator) {
        indicator.style.display = 'inline';
        indicator.style.color = 'var(--orange)';
        indicator.textContent = '💾 Сохранение в SQLite...';
      }

      if (defaultAutoSaveTimer) clearTimeout(defaultAutoSaveTimer);
      defaultAutoSaveTimer = setTimeout(async () => {
        try {
          const tickers = Array.from(selectedDefaultTickers);
          const res = await fetch('/api/default-tickers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers })
          });
          if (res.ok) {
            const data = await res.json();
            updateUniverseCounters(!data.isFromEnv);
            if (indicator) {
              indicator.style.color = 'var(--green)';
              indicator.textContent = tickers.length > 0 ? '✓ Сохранено в SQLite' : '✓ Список пуст (fallback на .env)';
              setTimeout(() => {
                indicator.style.display = 'none';
              }, 2500);
            }
          } else {
            if (indicator) {
              indicator.style.color = 'var(--red)';
              indicator.textContent = '⚠️ Ошибка сохранения';
            }
          }
        } catch (e) {
          if (indicator) {
            indicator.style.color = 'var(--red)';
            indicator.textContent = '❌ Ошибка сети';
          }
        }
      }, 250);
    }

    // Default Universe Toolbar Listeners
    const defSearchInput = document.getElementById('def-search-input');
    if (defSearchInput) {
      defSearchInput.addEventListener('input', () => {
        universeSearchQuery = defSearchInput.value.trim().toUpperCase();
        renderUniverseGrid();
      });
    }

    document.querySelectorAll('.filter-pills-group .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pills-group .filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentUniverseFilter = pill.getAttribute('data-filter') || 'all';
        renderUniverseGrid();
      });
    });

    document.getElementById('btn-def-select-favorites')?.addEventListener('click', async () => {
      const indicator = document.getElementById('def-auto-save-indicator');
      if (indicator) {
        indicator.style.display = 'inline';
        indicator.style.color = 'var(--orange)';
        indicator.textContent = '💛 Загрузка избранного из Т-Банка...';
      }
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tickers) && data.tickers.length > 0) {
            selectedDefaultTickers = new Set(data.tickers);
            updateUniverseCounters(true);
            renderUniverseGrid();
            saveDefaultTickersDebounced();
            if (indicator) {
              indicator.style.color = 'var(--green)';
              indicator.textContent = \`✓ Применено Избранное (\${data.tickers.length} акций)\`;
              setTimeout(() => { indicator.style.display = 'none'; }, 2500);
            }
          } else {
            if (indicator) {
              indicator.style.color = '#ffb74d';
              indicator.textContent = '⚠️ В профиле Т-Банка нет акций MOEX (TQBR)';
              setTimeout(() => { indicator.style.display = 'none'; }, 3500);
            }
          }
        } else {
          if (indicator) {
            indicator.style.color = 'var(--red)';
            indicator.textContent = '❌ Ошибка получения избранного';
            setTimeout(() => { indicator.style.display = 'none'; }, 3000);
          }
        }
      } catch (e) {
        if (indicator) {
          indicator.style.color = 'var(--red)';
          indicator.textContent = '❌ Ошибка сети';
          setTimeout(() => { indicator.style.display = 'none'; }, 3000);
        }
      }
    });

    document.getElementById('btn-def-select-top20')?.addEventListener('click', () => {
      selectedDefaultTickers = new Set(TOP_20_LIST);
      updateUniverseCounters(true);
      renderUniverseGrid();
      saveDefaultTickersDebounced();
    });

    document.getElementById('btn-def-reset-env')?.addEventListener('click', async () => {
      const indicator = document.getElementById('def-auto-save-indicator');
      if (indicator) {
        indicator.style.display = 'inline';
        indicator.style.color = 'var(--orange)';
        indicator.textContent = '🔄 Сброс к .env...';
      }
      try {
        const res = await fetch('/api/default-tickers/reset', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          selectedDefaultTickers = new Set(data.tickers || []);
          updateUniverseCounters(false);
          renderUniverseGrid();
          if (indicator) {
            indicator.style.color = 'var(--green)';
            indicator.textContent = '✓ Сброшено к .env';
            setTimeout(() => { indicator.style.display = 'none'; }, 2500);
          }
        }
      } catch (e) {
        if (indicator) {
          indicator.style.color = 'var(--red)';
          indicator.textContent = '❌ Ошибка сброса';
        }
      }
    });

    document.getElementById('btn-def-clear-all')?.addEventListener('click', () => {
      selectedDefaultTickers.clear();
      updateUniverseCounters(true);
      renderUniverseGrid();
      saveDefaultTickersDebounced();
    });

    // -------------------------------------------------------------
    // 8. Status & Metrics Handler
    // -------------------------------------------------------------
    function applyStatusData(data) {
      if (!data) return;

      const badge = document.getElementById('conn-badge');
      const badgeText = document.getElementById('conn-text');
      const grpcBadge = document.getElementById('grpc-status-badge');

      if (data.connectionState === 'CONNECTED') {
        badge.className = 'badge-status';
        badgeText.textContent = 'T-Bank gRPC Connected';
        if (grpcBadge) {
          grpcBadge.className = 'badge-status';
          grpcBadge.textContent = 'CONNECTED';
        }
      } else {
        badge.className = 'badge-status offline';
        badgeText.textContent = data.connectionState || 'Ожидание gRPC';
        if (grpcBadge) {
          grpcBadge.className = 'badge-status offline';
          grpcBadge.textContent = data.connectionState || 'OFFLINE';
        }
      }

      if (data.stats) {
        document.getElementById('val-fps').innerHTML = \`\${data.stats.fps || 0} <span style="font-size:13px; font-weight:400; color:var(--text-muted);">пак/с</span>\`;
        document.getElementById('val-trades').textContent = (data.stats.tradeCount || 0).toLocaleString();
        document.getElementById('val-depth').textContent = (data.stats.orderBookCount || 0).toLocaleString();
        document.getElementById('val-candles').textContent = (data.stats.candleCount || 0).toLocaleString();
        document.getElementById('val-packets').textContent = (data.stats.totalPackets || 0).toLocaleString();
      }

      const subCount = typeof data.subscribedCount === 'number' ? data.subscribedCount : (data.subscribedTickers?.length || 0);
      const totalInCatalog = data.totalStocksInState || 273;
      const subTickersList = Array.isArray(data.subscribedTickers) && data.subscribedTickers.length > 0
        ? data.subscribedTickers.slice(0, 10).join(', ') + (data.subscribedTickers.length > 10 ? '...' : '')
        : 'нет';

      const grpcSubEl = document.getElementById('grpc-subscribed-count');
      if (grpcSubEl) {
        grpcSubEl.innerHTML = \`<span style="color:var(--green)">\${subCount} акций (динамически)</span> <span style="font-size:11px; color:var(--text-muted); font-weight:400;" title="Активно: \${subTickersList}">(из \${totalInCatalog} в справочнике)</span>\`;
      }

      const stocksCountEl = document.getElementById('val-stocks-count');
      if (stocksCountEl) {
        stocksCountEl.textContent = \`\${subCount} активных подписок (из \${totalInCatalog})\`;
      }

      const rsiScannedEl = document.getElementById('val-rsi-scanned');
      if (rsiScannedEl) {
        rsiScannedEl.textContent = subCount;
      }

      if (typeof data.defaultTickersCount === 'number') {
        const badgeDefEl = document.getElementById('badge-default-count');
        if (badgeDefEl && !selectedDefaultTickers.size) {
          badgeDefEl.textContent = data.defaultTickersCount;
        }
      }

      if (typeof data.uptime === 'number') {
        const upSec = Math.floor(data.uptime);
        const h = Math.floor(upSec / 3600);
        const m = Math.floor((upSec % 3600) / 60);
        const s = upSec % 60;
        const uptimeStr = h > 0 ? \`\${h}ч \${m}м \${s}с\` : \`\${m}м \${s}с\`;
        document.getElementById('uptime-text').textContent = \`Uptime: \${uptimeStr}\`;
        const engUptime = document.getElementById('engine-uptime');
        if (engUptime) engUptime.textContent = uptimeStr;
      }

      if (Array.isArray(data.modules)) {
        renderModules(data.modules);
      }

      const tg = data.telegram;
      const monTgDiv = document.getElementById('mon-tg-status');
      if (monTgDiv) {
        if (tg && tg.enabled && tg.hasBotToken && tg.hasChatId) {
          monTgDiv.innerHTML = '<span style="color:var(--green)">● Активен</span> (Cooldown: ' + tg.cooldownMinutes + ' мин)';
        } else {
          monTgDiv.innerHTML = '<span style="color:var(--text-muted)">○ Отключен или не настроен</span>';
        }
      }
    }

    let lastModulesJson = '';
    function renderModules(modules) {
      const json = JSON.stringify(modules);
      if (json === lastModulesJson) return;
      lastModulesJson = json;

      const html = modules.map(m => \`
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

      const monContainer = document.getElementById('mon-modules-list');
      const setContainer = document.getElementById('settings-modules-list');
      if (monContainer) monContainer.innerHTML = html;
      if (setContainer) setContainer.innerHTML = html;
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

    // -------------------------------------------------------------
    // 8. WebSocket Streaming & Real-Time Sync
    // -------------------------------------------------------------
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
          message: 'Вебсокет подключен (WebSocket Push активен)'
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.event === 'METRICS_UPDATE') {
            applyStatusData(msg.data);
            return;
          }

          if (msg.event === 'DEFAULT_TICKERS_UPDATED') {
            if (msg.data && Array.isArray(msg.data.tickers)) {
              selectedDefaultTickers = new Set(msg.data.tickers);
              updateUniverseCounters(!msg.data.isFromEnv);
              renderUniverseGrid();
            }
            return;
          }

          if (msg.event === 'SNAPSHOT' && Array.isArray(msg.data)) {
            stockItemsSnapshot = msg.data;
            renderRsiStochTable();
            renderNwTable();
            return;
          }

          if (msg.event === 'STREAM_LOG' && msg.data) {
            if (msg.data.id && msg.data.id > lastLogId) {
              lastLogId = msg.data.id;
            }
            queueLogRow(msg.data);

            if (msg.data.type === 'iceberg') {
              addIcebergRecord({
                time: msg.data.time,
                ticker: msg.data.ticker,
                direction: msg.data.message.includes('BUY') || msg.data.message.includes('LONG') ? 'BUY' : 'SELL',
                price: parseFloat((msg.data.message.match(/([0-9.]+)\\s*₽/) || [])[1] || '0'),
                ratio: parseFloat((msg.data.message.match(/x([0-9.]+)/) || [])[1] || '2.5'),
                message: msg.data.message
              });
            } else if (msg.data.type === 'robot') {
              addRobotRecord({
                time: msg.data.time,
                ticker: msg.data.ticker,
                frequency: parseFloat((msg.data.message.match(/([0-9.]+)\\s*микро/) || [])[1] || '10'),
                price: parseFloat((msg.data.message.match(/@\\s*([0-9.]+)/) || [])[1] || '0'),
                message: msg.data.message
              });
            }
            return;
          }

          if (msg.event === 'SIGNAL') {
            if (msg.payload?.reason === 'ICEBERG_DETECTED') {
              const record = {
                time: Date.now(),
                ticker: msg.ticker,
                direction: msg.direction || 'BUY',
                price: msg.payload.price || 0,
                ratio: msg.payload.ratio || 2.5,
                message: \`Обнаружен скрытый объем: \${msg.payload.price} ₽ (\${msg.direction}, x\${msg.payload.ratio})\`
              };
              addIcebergRecord(record);
              queueLogRow({
                time: record.time,
                type: 'iceberg',
                tagCls: 'tag-iceberg',
                tagText: 'ICEBERG 🧊',
                ticker: msg.ticker,
                message: record.message
              });
            } else if (msg.payload?.reason === 'ALGO_PING_BOT_DETECTED') {
              const record = {
                time: Date.now(),
                ticker: msg.ticker,
                frequency: msg.payload.microTradesPerSecond || 10,
                price: msg.payload.price || 0,
                message: \`Высокочастотный всплеск: \${msg.payload.microTradesPerSecond} микро-сделок/сек @ \${msg.payload.price} ₽\`
              };
              addRobotRecord(record);
              queueLogRow({
                time: record.time,
                type: 'robot',
                tagCls: 'tag-robot',
                tagText: 'ALGO BOT 🤖',
                ticker: msg.ticker,
                message: record.message
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

    function startFallbackPoll() {
      if (fallbackPollTimer) return;
      fallbackPollTimer = setInterval(async () => {
        if (wsConnected) return;
        try {
          const res = await fetch('/status');
          if (res.ok) {
            const data = await res.json();
            applyStatusData(data);
          }

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

    // -------------------------------------------------------------
    // 9. Initial Snapshot Bootstrap
    // -------------------------------------------------------------
    async function loadInitialData() {
      try {
        const [statusRes, stocksRes, logsRes, tgRes, indRes] = await Promise.all([
          fetch('/status'),
          fetch('/stocks'),
          fetch('/api/logs'),
          fetch('/config/telegram'),
          fetch('/config/indicators')
        ]);

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          applyStatusData(statusData);
        }

        if (stocksRes.ok) {
          const stocksJson = await stocksRes.json();
          if (stocksJson.data && Array.isArray(stocksJson.data)) {
            stockItemsSnapshot = stocksJson.data;
            renderRsiStochTable();
            renderNwTable();
          }
        }

        if (logsRes.ok) {
          const initialLogs = await logsRes.json();
          if (Array.isArray(initialLogs)) {
            initialLogs.forEach(l => {
              if (l.id > lastLogId) lastLogId = l.id;
              queueLogRow(l);
              if (l.type === 'iceberg') {
                addIcebergRecord({
                  time: l.time,
                  ticker: l.ticker,
                  direction: l.message.includes('BUY') ? 'BUY' : 'SELL',
                  price: parseFloat((l.message.match(/([0-9.]+)\\s*₽/) || [])[1] || '0'),
                  ratio: parseFloat((l.message.match(/x([0-9.]+)/) || [])[1] || '2.5'),
                  message: l.message
                });
              } else if (l.type === 'robot') {
                addRobotRecord({
                  time: l.time,
                  ticker: l.ticker,
                  frequency: parseFloat((l.message.match(/([0-9.]+)\\s*микро/) || [])[1] || '10'),
                  price: parseFloat((l.message.match(/@\\s*([0-9.]+)/) || [])[1] || '0'),
                  message: l.message
                });
              }
            });
          }
        }

        if (tgRes.ok) {
          const tgCfg = await tgRes.json();
          if (tgCfg) {
            const tokenInput = document.getElementById('cfg-tg-token');
            const chatInput = document.getElementById('cfg-tg-chat');
            const cooldownInput = document.getElementById('cfg-tg-cooldown');
            const enabledInput = document.getElementById('cfg-tg-enabled');
            if (tokenInput && tgCfg.botToken) tokenInput.value = tgCfg.botToken;
            if (chatInput && tgCfg.chatId) chatInput.value = tgCfg.chatId;
            if (cooldownInput && typeof tgCfg.cooldownMinutes === 'number') cooldownInput.value = tgCfg.cooldownMinutes;
            if (enabledInput && typeof tgCfg.enabled === 'boolean') enabledInput.checked = tgCfg.enabled;
          }
        }

        if (indRes.ok) {
          const indCfg = await indRes.json();
          if (indCfg && indCfg.params) {
            const p = indCfg.params;
            if (p.rsiPeriod) document.getElementById('cfg-rsi-period').value = p.rsiPeriod;
            if (p.rsiOversold) document.getElementById('cfg-rsi-oversold').value = p.rsiOversold;
            if (p.rsiOverbought) document.getElementById('cfg-rsi-overbought').value = p.rsiOverbought;

            if (p.stochK) document.getElementById('cfg-stoch-k').value = p.stochK;
            if (p.stochD) document.getElementById('cfg-stoch-d').value = p.stochD;
            if (p.stochSmooth) document.getElementById('cfg-stoch-smooth').value = p.stochSmooth;
            if (p.stochOversold) document.getElementById('cfg-stoch-oversold').value = p.stochOversold;
            if (p.stochOverbought) document.getElementById('cfg-stoch-overbought').value = p.stochOverbought;

            if (p.nwBandwidth) document.getElementById('cfg-nw-bw').value = p.nwBandwidth;
            if (p.nwMult) document.getElementById('cfg-nw-mult').value = p.nwMult;
            if (typeof p.nwRepaint === 'boolean') document.getElementById('cfg-nw-repaint').checked = p.nwRepaint;

            if (p.cciPeriod) document.getElementById('cfg-cci-period').value = p.cciPeriod;
            if (p.cciOversold) document.getElementById('cfg-cci-oversold').value = p.cciOversold;
            if (p.cciOverbought) document.getElementById('cfg-cci-overbought').value = p.cciOverbought;

            if (p.rvolDays) document.getElementById('cfg-rvol-days').value = p.rvolDays;
            if (p.rvolThreshold) document.getElementById('cfg-rvol-threshold').value = p.rvolThreshold;

            if (p.icebergRatio) document.getElementById('cfg-iceberg-ratio').value = p.icebergRatio;
            if (p.icebergMinTrades) document.getElementById('cfg-iceberg-min-trades').value = p.icebergMinTrades;

            if (p.robotFreq) document.getElementById('cfg-robot-freq').value = p.robotFreq;
            if (p.robotBurst) document.getElementById('cfg-robot-burst').value = p.robotBurst;

            updateAccordionBadges();
          }
        }

        loadDefaultUniverse();
      } catch (e) {}
    }

    // -------------------------------------------------------------
    // 10. Settings Form Handlers
    // -------------------------------------------------------------
    function toggleTokenVisibility() {
      const input = document.getElementById('cfg-tg-token');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    }

    async function saveTelegramSettings(event) {
      if (event) event.preventDefault();
      const resDiv = document.getElementById('settings-tg-result');
      resDiv.innerHTML = '<span style="color:var(--orange)">Сохранение настроек...</span>';

      const botToken = document.getElementById('cfg-tg-token').value.trim();
      const chatId = document.getElementById('cfg-tg-chat').value.trim();
      const cooldownMinutes = parseInt(document.getElementById('cfg-tg-cooldown').value, 10) || 5;
      const enabled = document.getElementById('cfg-tg-enabled').checked;

      try {
        const resp = await fetch('/config/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken, chatId, cooldownMinutes, enabled })
        });
        const res = await resp.json();
        if (res.status === 'ok') {
          resDiv.innerHTML = '<span style="color:var(--green)">✅ Настройки Telegram успешно сохранены!</span>';
        } else {
          resDiv.innerHTML = '<span style="color:var(--red)">⚠️ Ошибка сохранения</span>';
        }
      } catch (e) {
        resDiv.innerHTML = '<span style="color:var(--red)">❌ Ошибка сети</span>';
      }
      setTimeout(() => { resDiv.innerHTML = ''; }, 4000);
    }

    async function sendTelegramTest(targetDivId) {
      const resDiv = document.getElementById(targetDivId);
      if (!resDiv) return;
      resDiv.innerHTML = '<span style="color:var(--orange)">Отправка тестового сигнала...</span>';
      try {
        const resp = await fetch('/config/telegram/test', { method: 'POST' });
        const res = await resp.json();
        if (res.success) {
          resDiv.innerHTML = '<span style="color:var(--green)">✅ Сигнал успешно доставлен в Telegram!</span>';
        } else {
          resDiv.innerHTML = \`<span style="color:var(--red)">⚠️ Ошибка: \${res.error || 'Сбой отправки'}</span>\`;
        }
      } catch (e) {
        resDiv.innerHTML = '<span style="color:var(--red)">❌ Ошибка сети</span>';
      }
      setTimeout(() => { resDiv.innerHTML = ''; }, 4000);
    }

    document.getElementById('btn-tg-test').addEventListener('click', () => sendTelegramTest('settings-tg-result'));
    document.getElementById('btn-tg-quick-test').addEventListener('click', () => sendTelegramTest('mon-tg-result'));

    function expandAllAccordion() {
      document.querySelectorAll('#form-indicators .accordion-item').forEach(el => el.open = true);
    }

    function collapseAllAccordion() {
      document.querySelectorAll('#form-indicators .accordion-item').forEach(el => el.open = false);
    }

    function updateAccordionBadges() {
      const rsiP = document.getElementById('cfg-rsi-period')?.value || 14;
      const rsiOs = document.getElementById('cfg-rsi-oversold')?.value || 30;
      const rsiOb = document.getElementById('cfg-rsi-overbought')?.value || 70;
      const bRsi = document.getElementById('acc-badge-rsi');
      if (bRsi) bRsi.textContent = \`\${rsiP} [\${rsiOs}/\${rsiOb}]\`;

      const stK = document.getElementById('cfg-stoch-k')?.value || 14;
      const stD = document.getElementById('cfg-stoch-d')?.value || 3;
      const stSm = document.getElementById('cfg-stoch-smooth')?.value || 3;
      const stOs = document.getElementById('cfg-stoch-oversold')?.value || 20;
      const stOb = document.getElementById('cfg-stoch-overbought')?.value || 80;
      const bStoch = document.getElementById('acc-badge-stoch');
      if (bStoch) bStoch.textContent = \`\${stK}, \${stD}, \${stSm} [\${stOs}/\${stOb}]\`;

      const nwBw = document.getElementById('cfg-nw-bw')?.value || 8;
      const nwMult = document.getElementById('cfg-nw-mult')?.value || 3;
      const bNw = document.getElementById('acc-badge-nw');
      if (bNw) bNw.textContent = \`h=\${nwBw}, mult=\${nwMult}\`;

      const cciP = document.getElementById('cfg-cci-period')?.value || 20;
      const cciOs = document.getElementById('cfg-cci-oversold')?.value || -100;
      const cciOb = document.getElementById('cfg-cci-overbought')?.value || 100;
      const bCci = document.getElementById('acc-badge-cci');
      if (bCci) bCci.textContent = \`\${cciP} [\${cciOs}/+\${cciOb}]\`;

      const rvD = document.getElementById('cfg-rvol-days')?.value || 10;
      const rvTh = document.getElementById('cfg-rvol-threshold')?.value || 2.0;
      const bRv = document.getElementById('acc-badge-rvol');
      if (bRv) bRv.textContent = \`\${rvD} дн. [x\${rvTh}]\`;
    }

    // Bind real-time input change listeners for dynamic badge feedback
    document.querySelectorAll('#form-indicators input').forEach(input => {
      input.addEventListener('input', updateAccordionBadges);
    });

    async function saveIndicatorParams(event) {
      if (event) event.preventDefault();
      const resDiv = document.getElementById('settings-indicators-result');
      resDiv.innerHTML = '<span style="color:var(--orange)">Обновление параметров...</span>';

      const params = {
        rsiPeriod: parseInt(document.getElementById('cfg-rsi-period')?.value, 10) || 14,
        rsiOversold: parseInt(document.getElementById('cfg-rsi-oversold')?.value, 10) || 30,
        rsiOverbought: parseInt(document.getElementById('cfg-rsi-overbought')?.value, 10) || 70,

        stochK: parseInt(document.getElementById('cfg-stoch-k')?.value, 10) || 14,
        stochD: parseInt(document.getElementById('cfg-stoch-d')?.value, 10) || 3,
        stochSmooth: parseInt(document.getElementById('cfg-stoch-smooth')?.value, 10) || 3,
        stochOversold: parseInt(document.getElementById('cfg-stoch-oversold')?.value, 10) || 20,
        stochOverbought: parseInt(document.getElementById('cfg-stoch-overbought')?.value, 10) || 80,

        nwBandwidth: parseFloat(document.getElementById('cfg-nw-bw')?.value) || 8.0,
        nwMult: parseFloat(document.getElementById('cfg-nw-mult')?.value) || 3.0,
        nwRepaint: document.getElementById('cfg-nw-repaint') ? document.getElementById('cfg-nw-repaint').checked : true,

        cciPeriod: parseInt(document.getElementById('cfg-cci-period')?.value, 10) || 20,
        cciOversold: parseInt(document.getElementById('cfg-cci-oversold')?.value, 10) || -100,
        cciOverbought: parseInt(document.getElementById('cfg-cci-overbought')?.value, 10) || 100,

        rvolDays: parseInt(document.getElementById('cfg-rvol-days')?.value, 10) || 10,
        rvolThreshold: parseFloat(document.getElementById('cfg-rvol-threshold')?.value) || 2.0,

        icebergRatio: parseFloat(document.getElementById('cfg-iceberg-ratio')?.value) || 2.5,
        icebergMinTrades: parseInt(document.getElementById('cfg-iceberg-min-trades')?.value, 10) || 3,

        robotFreq: parseInt(document.getElementById('cfg-robot-freq')?.value, 10) || 5,
        robotBurst: parseInt(document.getElementById('cfg-robot-burst')?.value, 10) || 10,
      };

      try {
        const resp = await fetch('/config/indicators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        const res = await resp.json();
        if (res.status === 'ok') {
          resDiv.innerHTML = '<span style="color:var(--green)">✅ Параметры индикаторов и сканеров сохранены!</span>';
          updateAccordionBadges();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'SET_INDICATOR_PARAMS', params }));
          }
        } else {
          resDiv.innerHTML = '<span style="color:var(--red)">⚠️ Ошибка применения</span>';
        }
      } catch (e) {
        resDiv.innerHTML = '<span style="color:var(--red)">❌ Ошибка сети</span>';
      }
      setTimeout(() => { resDiv.innerHTML = ''; }, 4000);
    }

    // Initialize application
    connectWs();
    loadInitialData();
  </script>
</body>
</html>`;
}