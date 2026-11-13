// ==UserScript==
// @name         T-Invest MOEX Nadaraya-Watson RSI Scanner Widget
// @namespace    https://github.com/
// @version      1.0.0
// @description  Виджет сканера сигналов RSI + Nadaraya-Watson + CCI + Stoch для веб-терминала Т-Инвестиций через встроенный SDK
// @author       You
// @match        https://*.tbank.ru/terminal/*
// @match        https://*.tbank.ru/terminal-beta/*
// @match        https://*.tinkoff.ru/terminal/*
// @match        https://*.tinkoff.ru/terminal-beta/*
// @match        https://*.tbank-online.com/terminal/*
// @match        https://*.tbank-online.com/terminal-beta/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function mainWorldScript() {
        if (window.__moexNwRsiLoaded) return;
        window.__moexNwRsiLoaded = true;

        const WS_URL = 'ws://127.0.0.1:8080/stream';
        const HTTP_URL = 'http://127.0.0.1:8080/stocks';
        const EXTENSION_ID = 'moexnwrsiuserscript';
        const WIDGET_KEY = 'nw_rsi_scanner';
        const FULL_WIDGET_TYPE = `${EXTENSION_ID}_${WIDGET_KEY}`;

        let extInstance = null;
        let isRegistered = false;

        const NWRSI_ICON = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
        </svg>`;

        function injectStyles() {
            if (document.getElementById('moex-nw-rsi-styles')) return;
            const style = document.createElement('style');
            style.id = 'moex-nw-rsi-styles';
            style.textContent = `
                .nwrsi-container {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    background: #17212b;
                    color: #d1d5db;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 11px;
                    user-select: none;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .nwrsi-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 8px;
                    background: #111922;
                    border-bottom: 1px solid #233242;
                    flex-shrink: 0;
                    flex-wrap: wrap;
                }
                .nwrsi-btn-group {
                    display: flex;
                    background: #0b1118;
                    border: 1px solid #233242;
                    border-radius: 4px;
                    padding: 1px;
                }
                .nwrsi-btn {
                    background: transparent;
                    border: none;
                    color: #9ca3af;
                    padding: 3px 8px;
                    font-size: 10px;
                    cursor: pointer;
                    border-radius: 3px;
                    transition: all 0.15s;
                    font-weight: 500;
                }
                .nwrsi-btn:hover { color: #ffffff; background: rgba(255,255,255,0.05); }
                .nwrsi-btn.active {
                    background: #2563eb;
                    color: #ffffff;
                    font-weight: 600;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
                .nwrsi-input {
                    background: #0b1118;
                    border: 1px solid #233242;
                    color: #ffffff;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    outline: none;
                    transition: border 0.2s;
                }
                .nwrsi-input:focus { border-color: #3b82f6; }
                .nwrsi-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ef4444;
                    box-shadow: 0 0 6px #ef4444;
                    margin-left: auto;
                    transition: all 0.3s;
                    cursor: pointer;
                }
                .nwrsi-status-dot.connected {
                    background: #10b981;
                    box-shadow: 0 0 6px #10b981;
                }
                .nwrsi-table-wrapper {
                    flex: 1;
                    overflow: auto;
                    position: relative;
                }
                .nwrsi-table-wrapper::-webkit-scrollbar { width: 5px; height: 5px; }
                .nwrsi-table-wrapper::-webkit-scrollbar-thumb {
                    background: #233242;
                    border-radius: 3px;
                }
                .nwrsi-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 11px;
                }
                .nwrsi-table th {
                    position: sticky;
                    top: 0;
                    background: #111922;
                    color: #9ca3af;
                    font-weight: 600;
                    font-size: 10px;
                    padding: 6px 8px;
                    border-bottom: 1px solid #233242;
                    white-space: nowrap;
                    cursor: pointer;
                    user-select: none;
                    z-index: 2;
                }
                .nwrsi-table th:hover { color: #ffffff; }
                .nwrsi-table td {
                    padding: 5px 8px;
                    border-bottom: 1px solid rgba(35, 50, 66, 0.5);
                    white-space: nowrap;
                    vertical-align: middle;
                }
                .nwrsi-row {
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .nwrsi-row:hover { background: #1e2c39 !important; }
                .nwrsi-row.active-symbol { background: rgba(37, 99, 235, 0.15) !important; }
                
                .text-green { color: #10b981 !important; font-weight: 600; }
                .text-red   { color: #f43f5e !important; font-weight: 600; }
                .text-gray  { color: #6b7280 !important; }

                .badge {
                    display: inline-block;
                    padding: 1px 5px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: 600;
                    text-align: center;
                }
                .badge-buy { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
                .badge-sell { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
                .badge-neutral { background: rgba(156, 163, 175, 0.1); color: #9ca3af; }
                .badge-strong-buy { background: #059669; color: #ffffff; font-weight: bold; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
                .badge-strong-sell { background: #e11d48; color: #ffffff; font-weight: bold; box-shadow: 0 0 6px rgba(244, 63, 94, 0.4); }
                .badge-rvol-high { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }

                .nwrsi-quick-add-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: linear-gradient(135deg, #1e3a8a, #2563eb);
                    color: #ffffff;
                    border: 1px solid #3b82f6;
                    border-radius: 4px;
                    padding: 4px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-left: 10px;
                    user-select: none;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .nwrsi-quick-add-btn:hover {
                    background: linear-gradient(135deg, #2563eb, #3b82f6);
                    border-color: #93c5fd;
                }
                .nwrsi-settings-panel {
                    display: none;
                    position: absolute;
                    top: 36px;
                    right: 10px;
                    background: #111922;
                    border: 1px solid #233242;
                    border-radius: 6px;
                    padding: 10px;
                    width: 220px;
                    z-index: 100;
                    box-shadow: 0 8px 18px rgba(0,0,0,0.5);
                }
                .nwrsi-settings-panel.open { display: block; }
                .nwrsi-setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    font-size: 11px;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        class NwRsiWidget {
            constructor(contentRef) {
                this.container = contentRef;
                this.selectedTf = '5m';
                this.dirFilter = 'all'; // 'all' | 'signals' | 'buy' | 'sell'
                this.confluenceMode = 'any'; // 'any' | 'strict' | 'nw_only'
                this.searchTicker = '';
                this.minRvol = 0;
                this.sortField = 'status';
                this.sortAsc = false;

                // Indicator Params
                this.nwBandwidth = 8;
                this.nwMult = 3;
                this.nwRepaint = false;
                this.rsiOversold = 35;
                this.rsiOverbought = 65;

                this.stocks = [];
                this.ws = null;
                this.reconnectTimer = null;

                this.initLayout();
                this.connectWs();
            }

            initLayout() {
                this.container.innerHTML = `
                    <div class="nwrsi-container">
                        <div class="nwrsi-toolbar">
                            <!-- Timeframe selection -->
                            <div class="nwrsi-btn-group" title="Таймфрейм расчета индикаторов">
                                <button class="nwrsi-btn ${this.selectedTf === '5m' ? 'active' : ''}" data-tf="5m">5M</button>
                                <button class="nwrsi-btn ${this.selectedTf === '15m' ? 'active' : ''}" data-tf="15m">15M</button>
                                <button class="nwrsi-btn ${this.selectedTf === '1h' ? 'active' : ''}" data-tf="1h">1H</button>
                                <button class="nwrsi-btn ${this.selectedTf === '4h' ? 'active' : ''}" data-tf="4h">4H</button>
                            </div>

                            <!-- Direction filter -->
                            <div class="nwrsi-btn-group" title="Фильтр по сигналам">
                                <button class="nwrsi-btn ${this.dirFilter === 'all' ? 'active' : ''}" data-dir="all">Все</button>
                                <button class="nwrsi-btn ${this.dirFilter === 'signals' ? 'active' : ''}" data-dir="signals">Сигналы</button>
                                <button class="nwrsi-btn ${this.dirFilter === 'buy' ? 'active' : ''}" data-dir="buy">BUY</button>
                                <button class="nwrsi-btn ${this.dirFilter === 'sell' ? 'active' : ''}" data-dir="sell">SELL</button>
                            </div>

                            <!-- Search -->
                            <input type="text" class="nwrsi-input" id="nwrsi-search" placeholder="Поиск тикера..." style="width: 80px;" title="Фильтр по тикеру">
                            <input type="number" class="nwrsi-input" id="nwrsi-rvol" placeholder="RVOL ≥" style="width: 55px;" min="0" step="0.5" title="Минимальный RVOL">

                            <!-- Settings toggle -->
                            <button class="nwrsi-btn" id="nwrsi-settings-toggle" title="Настройки NW и RSI">⚙️</button>

                            <!-- Connection dot -->
                            <div class="nwrsi-status-dot" id="nwrsi-status" title="Подключение к локальному бэкенду ws://127.0.0.1:8080/stream"></div>

                            <!-- Settings Dropdown Panel -->
                            <div class="nwrsi-settings-panel" id="nwrsi-settings-panel">
                                <div style="font-weight:600; margin-bottom:8px; border-bottom:1px solid #233242; padding-bottom:4px; color:#60a5fa;">
                                    Параметры Nadaraya-Watson & RSI
                                </div>
                                <div class="nwrsi-setting-row">
                                    <span>NW Bandwidth (h):</span>
                                    <input type="number" class="nwrsi-input" id="set-nw-h" value="${this.nwBandwidth}" min="1" max="50" style="width:45px;">
                                </div>
                                <div class="nwrsi-setting-row">
                                    <span>NW Множитель:</span>
                                    <input type="number" class="nwrsi-input" id="set-nw-mult" value="${this.nwMult}" min="0.5" max="10" step="0.5" style="width:45px;">
                                </div>
                                <div class="nwrsi-setting-row">
                                    <span>Режим сглаживания:</span>
                                    <select class="nwrsi-input" id="set-nw-repaint" style="width:110px;">
                                        <option value="false" ${!this.nwRepaint ? 'selected' : ''}>Non-Repaint (Торги)</option>
                                        <option value="true" ${this.nwRepaint ? 'selected' : ''}>Smoothing (Плавный)</option>
                                    </select>
                                </div>
                                <div class="nwrsi-setting-row">
                                    <span>RSI Перепроданность:</span>
                                    <input type="number" class="nwrsi-input" id="set-rsi-os" value="${this.rsiOversold}" min="10" max="45" style="width:45px;">
                                </div>
                                <div class="nwrsi-setting-row">
                                    <span>RSI Перекупленность:</span>
                                    <input type="number" class="nwrsi-input" id="set-rsi-ob" value="${this.rsiOverbought}" min="55" max="90" style="width:45px;">
                                </div>
                                <div style="text-align:right; margin-top:8px;">
                                    <button class="nwrsi-btn active" id="btn-save-settings" style="width:100%;">Применить</button>
                                </div>
                            </div>
                        </div>

                        <!-- Table -->
                        <div class="nwrsi-table-wrapper">
                            <table class="nwrsi-table">
                                <thead>
                                    <tr>
                                        <th data-sort="ticker">Тикер</th>
                                        <th data-sort="price" style="text-align:right;">Цена / Изм</th>
                                        <th data-sort="rvol" style="text-align:center;">RVOL</th>
                                        <th data-sort="rsi" style="text-align:center;">RSI</th>
                                        <th data-sort="nw" style="text-align:center;">Nadaraya-Watson</th>
                                        <th data-sort="cci" style="text-align:center;">CCI</th>
                                        <th data-sort="stoch" style="text-align:center;">STCH (%K/%D)</th>
                                        <th data-sort="status" style="text-align:center;">Статус</th>
                                    </tr>
                                </thead>
                                <tbody id="nwrsi-tbody">
                                    <tr><td colspan="8" style="text-align:center; padding:20px; color:#6b7280;">Подключение к бэкенду...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                this.statusEl = this.container.querySelector('#nwrsi-status');
                this.tbodyEl = this.container.querySelector('#nwrsi-tbody');
                this.settingsPanel = this.container.querySelector('#nwrsi-settings-panel');

                // Timeframe switchers
                this.container.querySelectorAll('[data-tf]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.container.querySelectorAll('[data-tf]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.selectedTf = btn.dataset.tf;
                        this.renderTable();
                    });
                });

                // Direction filter switchers
                this.container.querySelectorAll('[data-dir]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.container.querySelectorAll('[data-dir]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.dirFilter = btn.dataset.dir;
                        this.renderTable();
                    });
                });

                // Search inputs
                const searchEl = this.container.querySelector('#nwrsi-search');
                searchEl.addEventListener('input', (e) => {
                    this.searchTicker = e.target.value.trim().toUpperCase();
                    this.renderTable();
                });

                const rvolEl = this.container.querySelector('#nwrsi-rvol');
                rvolEl.addEventListener('input', (e) => {
                    this.minRvol = parseFloat(e.target.value) || 0;
                    this.renderTable();
                });

                // Settings toggle
                const settingsBtn = this.container.querySelector('#nwrsi-settings-toggle');
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.settingsPanel.classList.toggle('open');
                });

                document.addEventListener('click', (e) => {
                    if (!this.settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                        this.settingsPanel.classList.remove('open');
                    }
                });

                // Apply settings
                const saveSettingsBtn = this.container.querySelector('#btn-save-settings');
                saveSettingsBtn.addEventListener('click', () => {
                    this.nwBandwidth = parseFloat(this.container.querySelector('#set-nw-h').value) || 8;
                    this.nwMult = parseFloat(this.container.querySelector('#set-nw-mult').value) || 3;
                    this.nwRepaint = this.container.querySelector('#set-nw-repaint').value === 'true';
                    this.rsiOversold = parseFloat(this.container.querySelector('#set-rsi-os').value) || 35;
                    this.rsiOverbought = parseFloat(this.container.querySelector('#set-rsi-ob').value) || 65;

                    this.settingsPanel.classList.remove('open');
                    this.sendIndicatorParamsToBackend();
                    this.renderTable();
                });

                // Sort headers
                this.container.querySelectorAll('th[data-sort]').forEach(th => {
                    th.addEventListener('click', () => {
                        const field = th.dataset.sort;
                        if (this.sortField === field) {
                            this.sortAsc = !this.sortAsc;
                        } else {
                            this.sortField = field;
                            this.sortAsc = false;
                        }
                        this.renderTable();
                    });
                });

                // Row click -> Select Symbol in T-Invest Terminal
                this.tbodyEl.addEventListener('click', (e) => {
                    const row = e.target.closest('tr');
                    if (!row || !row.dataset.ticker) return;
                    this.selectSymbol(row.dataset.ticker);
                });
            }

            selectSymbol(ticker) {
                try {
                    if (window.store && typeof window.store.dispatch === 'function') {
                        window.store.dispatch({
                            type: 'WIDGET_SYMBOL_SELECT',
                            payload: { symbolId: ticker }
                        });
                    }
                    this.container.querySelectorAll('.nwrsi-row').forEach(r => {
                        r.classList.toggle('active-symbol', r.dataset.ticker === ticker);
                    });
                } catch (err) {
                    console.warn('[NwRsiWidget] Select symbol error:', err);
                }
            }

            connectWs() {
                try {
                    this.ws = new WebSocket(WS_URL);

                    this.ws.onopen = () => {
                        if (this.statusEl) {
                            this.statusEl.classList.add('connected');
                            this.statusEl.title = `Сервер подключен (${WS_URL})`;
                        }
                        this.sendIndicatorParamsToBackend();
                    };

                    this.ws.onmessage = (event) => {
                        try {
                            const msg = JSON.parse(event.data);
                            if (msg.event === 'SNAPSHOT') {
                                this.stocks = msg.data || [];
                                this.renderTable();
                            } else if (msg.event === 'DELTA') {
                                this.handleDelta(msg.data);
                            }
                        } catch (err) {
                            console.error('[NwRsiWidget] Parse error:', err);
                        }
                    };

                    this.ws.onclose = () => {
                        if (this.statusEl) {
                            this.statusEl.classList.remove('connected');
                            this.statusEl.title = 'Сервер отключен. Автоматическое переподключение...';
                        }
                        this.fallbackHttp();
                        this.reconnectTimer = setTimeout(() => this.connectWs(), 2500);
                    };

                    this.ws.onerror = () => {
                        this.ws.close();
                    };
                } catch (e) {
                    this.reconnectTimer = setTimeout(() => this.connectWs(), 3000);
                }
            }

            sendIndicatorParamsToBackend() {
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
                this.ws.send(JSON.stringify({
                    action: 'SET_INDICATOR_PARAMS',
                    params: {
                        nwBandwidth: this.nwBandwidth,
                        nwMult: this.nwMult,
                        nwRepaint: this.nwRepaint
                    }
                }));
            }

            async fallbackHttp() {
                try {
                    const res = await fetch(HTTP_URL);
                    if (res.ok) {
                        const json = await res.json();
                        this.stocks = json.data || [];
                        this.renderTable();
                    }
                } catch (e) {}
            }

            handleDelta(deltas) {
                if (!Array.isArray(deltas) || deltas.length === 0) return;
                const map = new Map(this.stocks.map(s => [s.ticker, s]));
                for (const d of deltas) {
                    map.set(d.ticker, { ...(map.get(d.ticker) || {}), ...d });
                }
                this.stocks = Array.from(map.values());
                this.renderTable();
            }

            evaluateConfluence(stock) {
                const tfData = stock.tf && stock.tf[this.selectedTf];
                if (!tfData) {
                    return { statusText: '—', statusRank: 0, badgeCls: 'badge-neutral', dir: 'NONE' };
                }

                const price = stock.price || 0;
                const rsiVal = tfData.rsi;
                const nw = tfData.nw;
                const kVal = tfData.k;
                const cciVal = tfData.cci;

                if (!nw || rsiVal === null || rsiVal === undefined) {
                    return { statusText: 'Нет данных', statusRank: 0, badgeCls: 'badge-neutral', dir: 'NONE' };
                }

                const isNwLower = price <= nw.lower;
                const isNwUpper = price >= nw.upper;
                const isRsiOs = rsiVal <= this.rsiOversold;
                const isRsiOb = rsiVal >= this.rsiOverbought;
                const isStochOs = kVal !== null && kVal <= 25;
                const isStochOb = kVal !== null && kVal >= 75;
                const isCciOs = cciVal !== null && cciVal <= -100;
                const isCciOb = cciVal !== null && cciVal >= 100;

                // Confluence evaluation
                if (isNwLower && isRsiOs && (isStochOs || isCciOs)) {
                    return { statusText: '🔥 СТРОГИЙ BUY', statusRank: 5, badgeCls: 'badge-strong-buy', dir: 'BUY' };
                }
                if (isNwUpper && isRsiOb && (isStochOb || isCciOb)) {
                    return { statusText: '🔥 СТРОГИЙ SELL', statusRank: 5, badgeCls: 'badge-strong-sell', dir: 'SELL' };
                }
                if (isNwLower && isRsiOs) {
                    return { statusText: '🟢 LONG', statusRank: 4, badgeCls: 'badge-buy', dir: 'BUY' };
                }
                if (isNwUpper && isRsiOb) {
                    return { statusText: '🔴 SHORT', statusRank: 4, badgeCls: 'badge-sell', dir: 'SELL' };
                }
                if (isNwLower) {
                    return { statusText: 'Ниже NW', statusRank: 2, badgeCls: 'badge-buy', dir: 'BUY' };
                }
                if (isNwUpper) {
                    return { statusText: 'Выше NW', statusRank: 2, badgeCls: 'badge-sell', dir: 'SELL' };
                }

                return { statusText: 'Канал', statusRank: 1, badgeCls: 'badge-neutral', dir: 'NONE' };
            }

            renderTable() {
    function formatStockPrice(val) {
        if (val === undefined || val === null || isNaN(val)) return '—';
        const num = Number(val);
        if (num < 0.01) return num.toFixed(6);
        if (num < 0.1) return num.toFixed(5);
        if (num < 1) return num.toFixed(4);
        if (num < 10) return num.toFixed(3);
        return num.toFixed(2);
    }

                if (!this.tbodyEl) return;

                let items = this.stocks.map(stock => {
                    const conf = this.evaluateConfluence(stock);
                    return { stock, conf };
                });

                // Apply Filters
                if (this.searchTicker) {
                    items = items.filter(x => x.stock.ticker.includes(this.searchTicker));
                }
                if (this.minRvol > 0) {
                    items = items.filter(x => (x.stock.rvol || 0) >= this.minRvol);
                }
                if (this.dirFilter === 'signals') {
                    items = items.filter(x => x.conf.dir !== 'NONE');
                } else if (this.dirFilter === 'buy') {
                    items = items.filter(x => x.conf.dir === 'BUY');
                } else if (this.dirFilter === 'sell') {
                    items = items.filter(x => x.conf.dir === 'SELL');
                }

                // Sorting
                items.sort((a, b) => {
                    let valA, valB;
                    const tfA = a.stock.tf && a.stock.tf[this.selectedTf];
                    const tfB = b.stock.tf && b.stock.tf[this.selectedTf];

                    if (this.sortField === 'ticker') {
                        return this.sortAsc ? a.stock.ticker.localeCompare(b.stock.ticker) : b.stock.ticker.localeCompare(a.stock.ticker);
                    } else if (this.sortField === 'price') {
                        valA = a.stock.price; valB = b.stock.price;
                    } else if (this.sortField === 'rvol') {
                        valA = a.stock.rvol; valB = b.stock.rvol;
                    } else if (this.sortField === 'rsi') {
                        valA = tfA?.rsi; valB = tfB?.rsi;
                    } else if (this.sortField === 'nw') {
                        valA = tfA?.nw ? (a.stock.price - tfA.nw.mid) : null;
                        valB = tfB?.nw ? (b.stock.price - tfB.nw.mid) : null;
                    } else if (this.sortField === 'cci') {
                        valA = tfA?.cci; valB = tfB?.cci;
                    } else if (this.sortField === 'stoch') {
                        valA = tfA?.k; valB = tfB?.k;
                    } else if (this.sortField === 'status') {
                        valA = a.conf.statusRank; valB = b.conf.statusRank;
                    }

                    if (valA === undefined || valA === null) return 1;
                    if (valB === undefined || valB === null) return -1;
                    return this.sortAsc ? (valA - valB) : (valB - valA);
                });

                if (items.length === 0) {
                    this.tbodyEl.innerHTML = `
                        <tr><td colspan="8" style="text-align:center; padding:20px; color:#6b7280;">
                            ${this.stocks.length === 0 ? 'Загрузка данных с сервера...' : 'Нет бумаг под выбранный фильтр'}
                        </td></tr>`;
                    return;
                }

                const rowsHtml = items.map(({ stock, conf }) => {
                    const priceStr = stock.price !== null ? formatStockPrice(stock.price) : '—';
                    const changeVal = stock.change || 0;
                    const changeSign = changeVal > 0 ? '+' : '';
                    const changeCls = changeVal > 0 ? 'text-green' : changeVal < 0 ? 'text-red' : 'text-gray';

                    const tfData = stock.tf && stock.tf[this.selectedTf];
                    const rsiVal = tfData && tfData.rsi !== null ? tfData.rsi.toFixed(1) : '—';
                    const rsiCls = tfData?.rsi <= this.rsiOversold ? 'text-green' : tfData?.rsi >= this.rsiOverbought ? 'text-red' : '';

                    const cciVal = tfData && tfData.cci !== null ? tfData.cci.toFixed(0) : '—';
                    const cciCls = tfData?.cci <= -100 ? 'text-green' : tfData?.cci >= 100 ? 'text-red' : 'text-gray';

                    const kVal = tfData && tfData.k !== null ? tfData.k.toFixed(0) : '—';
                    const dVal = tfData && tfData.d !== null ? tfData.d.toFixed(0) : '—';
                    const stochCls = tfData?.k <= 20 ? 'text-green' : tfData?.k >= 80 ? 'text-red' : '';

                    let nwBadge = '<span class="text-gray">—</span>';
                    if (tfData && tfData.nw) {
                        const { upper, lower, mid } = tfData.nw;
                        const p = stock.price || 0;
                        const lowerStr = formatStockPrice(lower);
                        const upperStr = formatStockPrice(upper);
                        if (p <= lower) {
                            nwBadge = `<span class="badge badge-buy">Ниже L (${lowerStr})</span>`;
                        } else if (p >= upper) {
                            nwBadge = `<span class="badge badge-sell">Выше U (${upperStr})</span>`;
                        } else {
                            nwBadge = `<span class="text-gray">${lowerStr} .. ${upperStr}</span>`;
                        }
                    }

                    const rvolBadge = stock.rvol >= 2.0
                        ? `<span class="badge badge-rvol-high">🔥 ${stock.rvol.toFixed(1)}x</span>`
                        : `${stock.rvol ? stock.rvol.toFixed(2) : '1.00'}`;

                    return `
                        <tr class="nwrsi-row" data-ticker="${stock.ticker}">
                            <td style="font-weight:600; color:#ffffff;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    ${stock.logoUrl ? `
                                    <img src="${stock.logoUrl}" style="width:18px; height:18px; border-radius:50%; object-fit:cover; flex-shrink:0; background:${stock.logoColor || '#333'};" onerror="this.style.display='none'" alt="" />
                                    ` : ''}
                                    <div>
                                        <span>${stock.ticker}</span>
                                        <span style="display:block; font-size:9px; color:#6b7280; font-weight:normal;">${stock.description || ''}</span>
                                    </div>
                                </div>
                            </td>
                            <td style="text-align:right;">
                                <div>${priceStr} ₽</div>
                                <div class="${changeCls}" style="font-size:10px;">${changeSign}${changeVal.toFixed(2)}%</div>
                            </td>
                            <td style="text-align:center;">${rvolBadge}</td>
                            <td style="text-align:center; font-weight:600;" class="${rsiCls}">${rsiVal}</td>
                            <td style="text-align:center;">${nwBadge}</td>
                            <td style="text-align:center;" class="${cciCls}">${cciVal}</td>
                            <td style="text-align:center; font-size:10px;" class="${stochCls}">${kVal} / ${dVal}</td>
                            <td style="text-align:center;"><span class="badge ${conf.badgeCls}">${conf.statusText}</span></td>
                        </tr>
                    `;
                }).join('');

                this.tbodyEl.innerHTML = rowsHtml;
            }

            destroy() {
                if (this.ws) {
                    this.ws.onclose = null;
                    this.ws.close();
                }
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                }
            }
        }

        window.openNwRsiScanner = function () {
            let spaceId = null;
            const spaceEl = document.querySelector('[data-space-id]');
            if (spaceEl) {
                spaceId = spaceEl.getAttribute('data-space-id');
            }

            if (!spaceId && window.store && typeof window.store.getState === 'function') {
                const state = window.store.getState();
                try {
                    const layouts = state?.dataStoresState?.layoutStores?.layouts;
                    if (layouts && Object.values(layouts).length > 0) {
                        spaceId = Object.values(layouts)[0].spaceId;
                    }
                } catch (e) {}

                if (!spaceId) {
                    try {
                        spaceId = state?.spaces?.activeSpaceId || Object.keys(state?.spaces?.spaces || {})[0];
                    } catch (e) {}
                }
            }

            if (!spaceId) {
                spaceId = 'default_space';
            }

            const widgetId = `${spaceId}_${FULL_WIDGET_TYPE}_${Date.now()}`;
            console.log('[NwRsiScanner] Opening widget type:', FULL_WIDGET_TYPE, 'in spaceId:', spaceId);

            if (window.store && typeof window.store.dispatch === 'function') {
                window.store.dispatch({
                    type: 'SPACE_ADD_WIDGET',
                    payload: {
                        spaceId: spaceId,
                        widgetId: widgetId,
                        widgetType: FULL_WIDGET_TYPE,
                        settings: {
                            common: {
                                layout: { width: 720, height: 460, x: 100, y: 100, pinned: false },
                                spaceId: spaceId
                            },
                            meta: {
                                extensionId: EXTENSION_ID,
                                extensionName: 'moex_nw_rsi',
                                title: 'RSI + Nadaraya-Watson'
                            }
                        },
                        highlighted: true,
                        unhighlightOthers: false
                    }
                });
            }
        };

        function addQuickButton() {
            if (document.getElementById('nwrsi-quick-add-button')) return;
            const toolbar = document.querySelector('[class*="TopToolbar-top"], [class*="Header-header"], header, [class*="navigation"]');
            if (toolbar) {
                const btn = document.createElement('button');
                btn.id = 'nwrsi-quick-add-button';
                btn.className = 'nwrsi-quick-add-btn';
                btn.innerHTML = `${NWRSI_ICON} <span>+ NW+RSI</span>`;
                btn.title = 'Открыть сканер сигналов RSI + Nadaraya-Watson';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.openNwRsiScanner();
                });
                toolbar.appendChild(btn);
            }
        }

        setInterval(addQuickButton, 1500);

        async function registerTerminalWidget() {
            injectStyles();

            if (isRegistered) return true;
            if (!window.terminal || typeof window.terminal.registerExtension !== 'function') {
                return false;
            }

            try {
                isRegistered = true;

                // Emulate chrome-extension stack trace for T-Bank SDK origin validation
                const RealError = window.Error;
                function PatchedError(...args) {
                    const err = new RealError(...args);
                    err.stack = `Error\n    at chrome-extension://${EXTENSION_ID}/content.js:1:1`;
                    return err;
                }
                PatchedError.prototype = RealError.prototype;

                try {
                    window.Error = PatchedError;
                    extInstance = await window.terminal.registerExtension({
                        extensionName: 'moex_nw_rsi',
                        displayName: 'RSI + Nadaraya-Watson',
                        icon: NWRSI_ICON
                    });
                } finally {
                    window.Error = RealError;
                }

                if (extInstance && typeof extInstance.registerWidgetType === 'function') {
                    extInstance.registerWidgetType(WIDGET_KEY, {
                        layout: { width: 720, height: 460 },
                        settings: {
                            title: 'RSI + Nadaraya-Watson',
                            searchable: true,
                            symbolRequired: false,
                            fullscreenAllowed: true,
                            noGroup: false,
                            useSymbolInTitle: false,
                            pinnable: true
                        },
                        menu: {
                            icon: NWRSI_ICON,
                            label: 'RSI + Nadaraya-Watson',
                            hint: 'Сканер схождения полос Nadaraya-Watson и RSI'
                        },
                        handlers: {
                            mount: (context) => {
                                console.log('[NwRsiScanner] Mount widget:', context.widgetId);
                                context.contentRef._nwRsiWidget = new NwRsiWidget(context.contentRef);
                            },
                            unmount: (context) => {
                                console.log('[NwRsiScanner] Unmount widget:', context.widgetId);
                                if (context.contentRef._nwRsiWidget) {
                                    context.contentRef._nwRsiWidget.destroy();
                                    delete context.contentRef._nwRsiWidget;
                                }
                            },
                            tickerChange: (context, newTicker) => {}
                        }
                    });
                    console.log('[NwRsiScanner] Успешно зарегистрирован в T-Investments SDK!');
                }
                return true;
            } catch (err) {
                console.error('[NwRsiScanner] Ошибка регистрации SDK:', err);
                return false;
            }
        }

        if (window.terminal && typeof window.terminal.registerExtension === 'function') {
            registerTerminalWidget();
        }

        window.addEventListener('SDK_READY', () => {
            registerTerminalWidget();
        }, { once: true });

        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (isRegistered || tries > 20) {
                clearInterval(timer);
                return;
            }
            if (window.terminal && typeof window.terminal.registerExtension === 'function') {
                registerTerminalWidget().then(ok => {
                    if (ok) clearInterval(timer);
                });
            }
        }, 1000);
    }

    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = `(${mainWorldScript.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();
