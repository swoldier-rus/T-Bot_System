// ==UserScript==
// @name         MOEX T-Bank Terminal All-Stocks Live Screener Pro (v17.15)
// @namespace    http://tampermonkey.net/
// @version      17.15
// @description  Единый скринер акций Мосбиржи (5m, 15m, 1h, 4h) для Терминала Т-Банка: чистый статус без эмодзи кружков, нативная кнопка закрытия (✕), фоновый мониторинг
// @author       You
// @match        *://*.tbank.ru/terminal/*
// @match        *://*.tinkoff.ru/terminal/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_notification
// @connect      invest-public-api.tinkoff.ru
// @connect      api.telegram.org
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const FALLBACK_BLUE_CHIPS = [
        "SBER", "GAZP", "LKOH", "ROSN", "NVTK", "YDEX", "T", "SIBN", "GMKN", "TATN",
        "PLZL", "SNGS", "SNGSP", "CHMF", "NLMK", "MAGN", "ALRS", "MOEX", "VTBR", "MTSS",
        "PHOR", "IRAO", "RUAL", "AFLT", "PIKK", "OZON", "POSI", "AFKS", "HYDR", "FEES",
        "TRNFP", "CBOM", "SOVCOM", "BSPB", "FLOT", "ASTR", "HEAD", "VKCO", "SELG", "UGLD"
    ];

    // Хост виджета с изолированным Shadow DOM
    const host = document.createElement('div');
    host.id = 'tv-moex-screener-host';
    host.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483647; transform: translate3d(0, 0, 0);';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        #widget {
            width: 720px;
            height: 520px;
            display: flex;
            flex-direction: column;
            background-color: #131722;
            color: #d1d4dc;
            border: 1px solid #363a45;
            border-radius: 8px;
            box-shadow: 0 14px 42px rgba(0,0,0,0.92);
            font-size: 12px;
            user-select: none;
            overflow: hidden;
            position: relative;
            contain: layout style;
        }
        #header {
            background-color: #1e222d;
            padding: 7px 12px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #363a45;
            font-size: 12px;
            gap: 8px;
        }
        .live-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #d1d4dc;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
        }
        .dot-green {
            background-color: #00e676;
            box-shadow: 0 0 6px #00e676;
        }
        .dot-yellow {
            background-color: #ffd600;
            box-shadow: 0 0 6px #ffd600;
        }
        .dot-gray {
            background-color: #787b86;
        }
        .dot-red {
            background-color: #ff5252;
            box-shadow: 0 0 6px #ff5252;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.2px;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }
        .hdr-icon-btn {
            width: 26px;
            height: 26px;
            min-width: 26px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            box-sizing: border-box;
            border-radius: 6px;
        }
        .hdr-icon-btn svg {
            width: 15px;
            height: 15px;
            display: block;
            flex-shrink: 0;
            fill: currentColor;
        }
        .hdr-icon-btn svg path {
            fill: currentColor;
        }
        .hdr-btn {
            background: #2a2e39;
            border: 1px solid #363a45;
            color: #d1d4dc;
            border-radius: 4px;
            padding: 4px 9px;
            font-size: 11px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.15s;
            white-space: nowrap;
        }
        .hdr-btn:hover { background: #363a45; color: #fff; }
        .hdr-btn.active-on {
            background: rgba(182, 182, 182, 0.25);
            border: 1px solid #363a45;
            color: #fff;
        }

        /* Панель фильтров над таблицей */
        .filter-toolbar {
            background-color: #181c27;
            border-bottom: 1px solid #2a2e39;
            padding: 6px 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            z-index: 10;
            position: relative;
        }

        /* Выпадающее меню списков акций в панели фильтров */
        .list-dropdown-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .hdr-list-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 500;
            height: 24px;
            background: transparent;
            border: 1px solid #363a45;
            color: #d1d4dc;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }
        .hdr-list-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: #434651;
            color: #fff;
        }
        .hdr-list-btn.active-filter {
            border-color: #2962ff;
            color: #2979ff;
                    <div class="resize-handle" id="resize-handle" title="Потяните для изменения размера окна">
                        <svg viewBox="0 0 10 10" width="10" height="10" fill="none">
                            <path d="M8 2L2 8M9 5L5 9M9 8L8 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    `;
    shadow.appendChild(container);

    // Ссылки на элементы UI
    const rsiSlider = shadow.getElementById('rsi-slider');
    const stochSlider = shadow.getElementById('stoch-slider');
    const rsiValLow = shadow.getElementById('rsi-val-low');
    const rsiValHigh = shadow.getElementById('rsi-val-high');
    const stochValLow = shadow.getElementById('stoch-val-low');
    const stochValHigh = shadow.getElementById('stoch-val-high');

    // Ссылки на параметры и периоды индикаторов
    const rsiPeriodSlider = shadow.getElementById('rsi-period-slider');
    const stochPeriodSlider = shadow.getElementById('stoch-period-slider');
    const rvolDaysSlider = shadow.getElementById('rvol-days-slider');
    const rsiPeriodBadge = shadow.getElementById('rsi-period-badge');
    const stochPeriodBadge = shadow.getElementById('stoch-period-badge');
    const rvolDaysBadge = shadow.getElementById('rvol-days-badge');

    // Фильтры
    const modeSelect = shadow.getElementById('mode-select');
    const tfSelect = shadow.getElementById('tf-select');
    const volumeFilterSelect = shadow.getElementById('volume-filter-select');
    const resetFiltersBtn = shadow.getElementById('reset-filters-btn');

    // Статус и футер
    const statusText = shadow.getElementById('status-text');
    const footerBar = shadow.getElementById('footer-bar');
    const footerText = shadow.getElementById('footer-text');
    const tbody = shadow.getElementById('stocks-tbody');
    const tableContainer = shadow.getElementById('table-container');
    const filterToolbar = shadow.getElementById('filter-toolbar');
    const closeWidgetBtn = shadow.getElementById('close-widget-btn');
    const headerEl = shadow.getElementById('header');
    const resizeHandle = shadow.getElementById('resize-handle');
    const widget = shadow.getElementById('widget');

    // ==========================================
    // ЭТАП 1: ЕДИНЫЙ CONFIG STORE & АВТО-МИГРАЦИЯ
    // ==========================================
    const DEFAULT_CONFIG = {
        version: 12,
        ui: {
            width: 720,
            height: 520,
            x: null,
            y: null,
            visible: true
        },
        filters: {
            listFilter: 'all_stocks',
            direction: 'all',
            indicatorMode: 'both',
            minRvolFilter: 0,
            tf: 'any',
            minVolumeRub: 0,
            sortField: 'change',
            sortAsc: false
        },
        thresholds: {
            rsi: 30,
            stoch: 20,
            climaxRvol: 2.0
        },
        indicators: {
            rsiPeriod: 14,
            stochPeriod: 14,
            rvolDays: 10
        },
        alerts: {
            sound: false,
            push: false,
            telegram: false,
            tgToken: '',
            tgChatId: '',
            cooldownMins: 15,
            direction: 'both'
        },
        favorites: ["SBER", "GAZP", "LKOH", "ROSN", "NVTK", "YDEX", "T", "SIBN", "GMKN", "TATN"],
        network: {
            refreshIntervalMs: 15000,
            openInNewTab: false,
            chartTargetGroup: 'auto',
            tinkoffToken: '',
            isPaused: false
        }
    };

    function deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        const result = Array.isArray(target) ? [...target] : { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    const ConfigStore = {
        data: null,

        init() {
            let saved = null;
            try {
                saved = GM_getValue('moex_config_v11', null);
            } catch (e) {
                saved = null;
            }

            if (!saved || typeof saved !== 'object' || !saved.version || saved.version < 11) {
                saved = this.migrateLegacy();
            }

            this.data = deepMerge(DEFAULT_CONFIG, saved);

            // Миграция старого filters.mode на раздельные direction и indicatorMode
            if (this.data && this.data.filters) {
                if (this.data.filters.mode && (!this.data.filters.direction || this.data.filters.direction === 'all')) {
                    if (this.data.filters.mode === 'signal_long') this.data.filters.direction = 'long';
                    else if (this.data.filters.mode === 'signal_short') this.data.filters.direction = 'short';
                    else if (this.data.filters.mode === 'signal_both') this.data.filters.direction = 'signals';
                    else if (this.data.filters.mode === 'signal_any') {
                        this.data.filters.direction = 'signals';
                        this.data.filters.indicatorMode = 'any';
                    } else if (this.data.filters.mode === 'signal_climax') {
                        this.data.filters.direction = 'signals';
                        this.data.filters.minRvolFilter = 3.0;
                    }
                }
            }

            this.save();
            return this.data;
        },

        migrateLegacy() {
            const migrated = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

            const oldWl = GM_getValue('moex_watched_tickers', null);
            if (oldWl !== null) {
            const txt = (cand.innerText || cand.textContent || '').trim();
            if (txt.length >= 2 && txt.length <= 35) {
                if (!txt.includes('✕') && !txt.includes('⚙') && !txt.includes('...') && !txt.includes('1м') && !txt.includes('1д')) {
                    return cand;
                }
            }
        }
        return null;
    }

    function findWidgetInstrumentButton() {
        // Приоритет 1: Виджет Графика (с canvas или iframe)
        const allWidgets = Array.from(document.querySelectorAll('[data-widget-type], [class*="widget"], [class*="Widget"], [data-qa-type*="widget"]'))
            .filter(el => !el.closest('#tv-moex-screener-host'));

        const chartWidgets = allWidgets.filter(w => w.querySelector('canvas') || w.querySelector('iframe') || (w.getAttribute('data-widget-type') || '').includes('chart'));
        for (const cw of chartWidgets) {
            const header = cw.querySelector('[class*="header"], [class*="Header"], [data-qa-type*="header"]') || cw;
            const btn = findInstrumentElementInside(header);
            if (btn) return btn;
        }

        // Приоритет 2: Любой другой виджет терминала (стакан, заявка, инструмент)
        for (const w of allWidgets) {
            const header = w.querySelector('[class*="header"], [class*="Header"], [data-qa-type*="header"]');
            if (header) {
                const btn = findInstrumentElementInside(header);
                if (btn) return btn;
            }
        }

        // Приоритет 3: Прямой поиск в заголовках виджетов
        const standaloneHeaders = Array.from(document.querySelectorAll('[class*="widget-header"], [class*="WidgetHeader"], [data-qa-type*="widget-header"]'))
            .filter(el => !el.closest('#tv-moex-screener-host'));
        for (const h of standaloneHeaders) {
            const btn = findInstrumentElementInside(h);
            if (btn) return btn;
        }

        return null;
    }

    function findOpenTerminalInput() {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'))
            .filter(inp => !inp.closest('#tv-moex-screener-host'));

        for (const inp of inputs) {
            if (inp.offsetParent === null && inp.offsetWidth === 0 && inp.offsetHeight === 0) continue;

            const ph = (inp.placeholder || '').toLowerCase();
            const qa = (inp.getAttribute('data-qa-type') || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            const aria = (inp.getAttribute('aria-label') || '').toLowerCase();

            if (ph.includes('поиск') || ph.includes('инструмент') || ph.includes('тикер') || ph.includes('акци') ||
                qa.includes('search') || qa.includes('ticker') || qa.includes('symbol') || qa.includes('instrument') ||
                cls.includes('search') || aria.includes('поиск') || aria.includes('search')) {
                return inp;
            }
        }

        if (document.activeElement && document.activeElement.tagName === 'INPUT' && !document.activeElement.closest('#tv-moex-screener-host')) {
            return document.activeElement;
        }
        return null;
    }

    function fillAndSelectTicker(input, ticker) {
        console.log(`[MOEX Screener] Ввод тикера ${ticker} в поле:`, input);
        typeIntoInput(input, ticker);

        setTimeout(() => {
            // Эмуляция клавиши Enter
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));

            // Ищем строку с тикером в появившемся выпадающем списке результатов
            setTimeout(() => {
                const candidates = Array.from(document.querySelectorAll('[data-qa-type*="item"], [data-qa-type*="result"], [role="option"], [class*="item"], [class*="Item"], tr, [class*="row"]'))
                    .filter(el => !el.closest('#tv-moex-screener-host'));

                let matched = null;
                for (const c of candidates) {
                    const t = (c.innerText || c.textContent || '').toUpperCase();
                    if (t.includes(ticker)) {
                        matched = c;
                        break;
                    }
                }

                if (matched) {
                    console.log('[MOEX Screener] Клик по найденной строке инструмента:', matched);
                    simulateClick(matched);
                    showTerminalToast(`График: ${ticker}`);
                } else if (candidates.length > 0) {
                    console.log('[MOEX Screener] Клик по первому результату в списке:', candidates[0]);
                    simulateClick(candidates[0]);
                    showTerminalToast(`График: ${ticker}`);
                } else {
                    console.log(`[MOEX Screener] Тикер ${ticker} введен в поле поиска`);
                    showTerminalToast(`Тикер ${ticker} введен в поиск`);
                }
            }, 120);
        }, 120);
    }

    // ==========================================
    // ПРИВЯЗКА К ГРАФИКАМ ТЕРМИНАЛА Т-БАНКА
    // МГНОВЕННОЕ ПЕРЕКЛЮЧЕНИЕ ЧЕРЕЗ REACT FIBER
    // ==========================================

    function inPageFiberBridge() {
        const GROUPS_COLORS = {
            1: "rgb(255, 212, 80)", 2: "rgb(255, 123, 118)", 3: "rgb(163, 129, 255)", 4: "rgb(77, 195, 247)"
        };

        const GROUPS_NAMES = {
            'auto': 'Авто',
            'group1': '🟡 Группа 1',
            'group2': '🔴 Группа 2',
            'group3': '🟣 Группа 3',
            'group4': '🔵 Группа 4'
        };

        function getFiberProps(el) {
            if (!el) return null;
            const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
            if (!key) return null;
            let f = el[key];
            let d = 0;
            while (f && d < 30) {
                if (f.memoizedProps && typeof f.memoizedProps.selectSymbol === 'function') {
                    return f.memoizedProps;
                }
                f = f.return;
                d++;
            }
            return null;
        }

        function findPropsInContainer(w) {
            let p = getFiberProps(w);
            if (p) return p;
            const hdr = w.querySelector('[class*="header"], [class*="Header"], [data-qa-type*="header"]');
            if (hdr) {
                p = getFiberProps(hdr);
                if (p) return p;
            }
            const children = w.querySelectorAll('div, button, nav');
            for (let i = 0; i < Math.min(children.length, 12); i++) {
                p = getFiberProps(children[i]);
                if (p) return p;
            }
            return null;
        }

        function getGroupId(props, el) {
            if (props && props.settings && props.settings.groupId) {
                return props.settings.groupId;
            }
            if (props && props.groupId) {
                return props.groupId;
            }
            if (el) {
                const icon = el.querySelector('[class*="GroupMenu-icon-"]');
                if (icon && icon.style && icon.style.color) {
                    const col = icon.style.color;
                    const id = Object.keys(GROUPS_COLORS).find(k => GROUPS_COLORS[k] === col);
                    if (id) return 'group' + id;
                }
            }
            return 'group0';
        }

        window.__moexFiberSwitch = function(ticker, targetGroup = 'auto') {
            ticker = (ticker || '').trim().toUpperCase();
            if (!ticker) return { success: false, reason: 'empty_ticker' };

            // Поиск всех виджетов графика на странице (исключая оверлей самого скринера)
            const allWidgets = Array.from(document.querySelectorAll('[data-widget-type], [data-widget-id]'))
                .filter(el => !el.closest('#tv-moex-screener-host'));

            const candidates = [];
            for (const w of allWidgets) {
                const props = findPropsInContainer(w);
                if (props && typeof props.selectSymbol === 'function') {
                    const wtype = (w.getAttribute('data-widget-type') || '').toUpperCase();
                    const isChart = wtype.includes('CHART') || wtype.includes('TV_WIDGET') || !!w.querySelector('canvas, iframe');
                    const gid = getGroupId(props, w);
                    candidates.push({ element: w, props, groupId: gid, isChart, type: wtype });
                }
            }

            if (candidates.length === 0) {
                return { success: false, reason: 'no_widgets_found' };
            }

            let target = null;
            if (targetGroup !== 'auto') {
                target = candidates.find(c => c.groupId === targetGroup && c.isChart) ||
                         candidates.find(c => c.groupId === targetGroup);
            }
            if (!target) {
                target = candidates.find(c => c.isChart) || candidates[0];
            }

            if (target && target.props && typeof target.props.selectSymbol === 'function') {
                console.log(`[MOEX Screener] ⚡ React Fiber: смена ${ticker} в группе ${target.groupId} (${target.isChart ? 'График' : 'Виджет'})`);
                target.props.selectSymbol(ticker);
                const grpName = GROUPS_NAMES[target.groupId] || target.groupId;
                return { success: true, group: target.groupId, groupName: grpName, isChart: target.isChart };
            }

            return { success: false, reason: 'select_symbol_not_executed' };
        };
    }

    function injectFiberBridge() {
        if (document.getElementById('moex-fiber-bridge-script')) return;
        try {
            const script = document.createElement('script');
            script.id = 'moex-fiber-bridge-script';
            script.type = 'text/javascript';
            script.textContent = `(${inPageFiberBridge.toString()})();`;
            (document.head || document.documentElement).appendChild(script);
            console.log('[MOEX Screener] ⚡ In-page Fiber Bridge успешно внедрен');
        } catch (e) {
            console.error('[MOEX Screener] Ошибка внедрения Fiber bridge:', e);
        }
    }

    let currentActiveTerminalTicker = null;
    let lastSwitchedTicker = null;
    let lastSwitchTimestamp = 0;

    function highlightActiveTickerInTable(ticker) {
        if (!tbody) return;
        ticker = (ticker || '').trim().toUpperCase();
        const rows = tbody.querySelectorAll('tr[data-ticker]');
        rows.forEach(r => {
            if (r.getAttribute('data-ticker') === ticker) {
                r.classList.add('row-active-ticker');
            } else {
                r.classList.remove('row-active-ticker');
            }
        });
    }

    function switchTerminalTicker(ticker) {
        ticker = (ticker || '').trim().toUpperCase();
        if (!ticker) return;

        // Защита от дребезга / повторных кликов по тому же тикеру
        const now = Date.now();
        if (ticker === lastSwitchedTicker && (now - lastSwitchTimestamp < 400)) {
            return;
        }
        lastSwitchedTicker = ticker;
        lastSwitchTimestamp = now;

        currentActiveTerminalTicker = ticker;
        highlightActiveTickerInTable(ticker);

        console.log(`[MOEX Screener] Переключение графика на ${ticker} (целевая группа: ${currentChartGroup})...`);

        // СТРАТЕГИЯ 0: Мгновенное переключение через React Fiber (Основная)
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (typeof win.__moexFiberSwitch === 'function') {
            try {
                const res = win.__moexFiberSwitch(ticker, currentChartGroup);
                if (res && res.success) {
                    console.log('[MOEX Screener] ⚡ Успешно переключено через React Fiber:', res);
                    showTerminalToast(`⚡ График (${res.groupName}): ${ticker}`);
                    return;
                }
            } catch (err) {
                console.warn('[MOEX Screener] Ошибка вызова __moexFiberSwitch:', err);
            }
        }

        // СТРАТЕГИЯ 1: Инпут поиска уже открыт
        const activeInput = findOpenTerminalInput();
        if (activeInput) {
            console.log('[MOEX Screener] Поле поиска уже открыто:', activeInput);
            fillAndSelectTicker(activeInput, ticker);
            return;
        }

        // СТРАТЕГИЯ 2: Клик по тикеру в шапке виджета графика
        const instrumentBtn = findWidgetInstrumentButton();
        if (instrumentBtn) {
            console.log('[MOEX Screener] Нажатие на кнопку тикера в шапке:', instrumentBtn);
            simulateClick(instrumentBtn);

            let attempts = 0;
            const timer = setInterval(() => {
                attempts++;
                const popupInput = findOpenTerminalInput();
                if (popupInput) {
                    clearInterval(timer);
                    console.log('[MOEX Screener] Всплывающее поле поиска появилось:', popupInput);
    function calcRSI(candles, period = 14) {
        if (!candles || candles.length <= period) return null;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = candles[i].close - candles[i - 1].close;
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < candles.length; i++) {
            const diff = candles[i].close - candles[i - 1].close;
            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // Расчет классического Slow Stochastic (14, 3, 3) со сглаживанием SMA (%K и %D)
    function calcStoch(candles, period = 14, smoothK = 3, smoothD = 3) {
        if (!candles || candles.length < period) return { k: null, d: null };

        // Расчет сырого Fast %K для свечи с индексом barIdx
        function getRawK(barIdx) {
            if (barIdx < period - 1) return null;
            let highest = -Infinity, lowest = Infinity;
            for (let j = barIdx - period + 1; j <= barIdx; j++) {
                if (candles[j].high > highest) highest = candles[j].high;
                if (candles[j].low < lowest) lowest = candles[j].low;
            }
            const close = candles[barIdx].close;
            if (highest === lowest) return 50;
            return Math.max(0, Math.min(100, ((close - lowest) / (highest - lowest)) * 100));
        }

        // Расчет сглаженного Slow %K (SMA от raw %K с периодом smoothK) для бара barIdx
        function getSlowK(barIdx) {
            const count = Math.min(smoothK, barIdx - period + 2);
            if (count <= 0) return null;
            let sum = 0;
            for (let m = 0; m < count; m++) {
                const r = getRawK(barIdx - m);
                if (r === null) return null;
                sum += r;
            }
            return sum / count;
        }

        const lastIdx = candles.length - 1;
        const currentK = getSlowK(lastIdx);
        if (currentK === null) return { k: null, d: null };

        // Расчет сигнальной линии Slow %D (SMA от Slow %K с периодом smoothD)
        const countD = Math.min(smoothD, candles.length - period - smoothK + 2);
        let currentD = currentK;
        if (countD > 0) {
            let sumD = 0;
            let validD = 0;
            for (let m = 0; m < countD; m++) {
                const sk = getSlowK(lastIdx - m);
                if (sk !== null) {
                    sumD += sk;
                    validD++;
                }
            }
            if (validD > 0) currentD = sumD / validD;
        }

        const last = list[list.length - 1];
        if (last && last.signal) {
            return parseQuotation(last.signal);
        }
        return null;
    }

    let isComputingIndicators = false;
    const candleCache = new Map(); // ticker -> { timestamp }

    async function computePriorityIndicators(isManual = false) {
        if (isPaused && !isManual) return;
        if (!tinkoffToken || isComputingIndicators) return;
        isComputingIndicators = true;

        try {
            // Формируем список приоритетных тикеров:
            // 1. Избранное пользователя (★)
            // 2. Голубые фишки (TOP_BLUE_CHIPS)
            // 3. Топ-25 акций по списку
            const prioritySet = new Set();
            watchedTickers.forEach(t => prioritySet.add(t));
            TOP_BLUE_CHIPS.forEach(t => prioritySet.add(t));
            allStocks.slice(0, 25).forEach(s => prioritySet.add(s.ticker));

            const now = Date.now();
            const queue = [];
            const stockMap = new Map();
            allStocks.forEach(s => stockMap.set(s.ticker, s));

            prioritySet.forEach(ticker => {
                const stock = stockMap.get(ticker);
                if (stock && stock.figi) {
                    const cached = candleCache.get(ticker);
                    // Обновляем свечи и индикаторы каждые 60 секунд
                    if (!cached || (now - cached.timestamp > 60000)) {
                        queue.push(stock);
                    }
                }
            });

            if (queue.length === 0) {
                checkAlertsAndCooldown();
                return;
            }

            const concurrency = 2; // Бережная параллельность для rate limits
            let updatedCount = 0;

            async function worker() {
                while (queue.length > 0) {
                    const stock = queue.shift();
                    try {
                        const rsiPeriod = (config.indicators && config.indicators.rsiPeriod) || 14;
                        const stochPeriod = (config.indicators && config.indicators.stochPeriod) || 14;
                        const rvolDays = (config.indicators && config.indicators.rvolDays) || 10;

                        const nowIso = new Date().toISOString();
                        const from1DayIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
                        const from7DayIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
                        const from30DayIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
                        const daysLookback = Math.max(35, rvolDays * 2 + 10);
                        const fromDayIso = new Date(Date.now() - daysLookback * 24 * 3600 * 1000).toISOString();

                        // Запрос свечей и официального расчета RSI (GetTechAnalysis) через API Т-Инвестиций
                        const [
                            c5mRes, c15mRes, c1hRes, c4hRes, cDayRes,
                            rsi5mRes, rsi15mRes, rsi1hRes, rsi4hRes, rsiDayRes
                        ] = await Promise.allSettled([
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles', {
                                figi: stock.figi,
                                instrumentId: stock.figi,
                                from: from1DayIso,
                                to: nowIso,
                                interval: 'CANDLE_INTERVAL_5_MIN'
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles', {
                                figi: stock.figi,
                                instrumentId: stock.figi,
                                from: from1DayIso,
                                to: nowIso,
                                interval: 'CANDLE_INTERVAL_15_MIN'
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles', {
                                figi: stock.figi,
                                instrumentId: stock.figi,
                                from: from7DayIso,
                                to: nowIso,
                                interval: 'CANDLE_INTERVAL_HOUR'
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles', {
                                figi: stock.figi,
                                instrumentId: stock.figi,
                                from: from30DayIso,
                                to: nowIso,
                                interval: 'CANDLE_INTERVAL_4_HOUR'
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles', {
                                figi: stock.figi,
                                instrumentId: stock.figi,
                                from: fromDayIso,
                                to: nowIso,
                                interval: 'CANDLE_INTERVAL_DAY'
                            }),
                            // Прямой расчет RSI через официальный метод GetTechAnalysis T-Invest API
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetTechAnalysis', {
                                indicatorType: 'INDICATOR_TYPE_RSI',
                                instrumentId: stock.figi,
                                from: from1DayIso,
                                to: nowIso,
                                interval: 'INDICATOR_INTERVAL_FIVE_MINUTES',
                                typeOfPrice: 'TYPE_OF_PRICE_CLOSE',
                                length: rsiPeriod
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetTechAnalysis', {
                                indicatorType: 'INDICATOR_TYPE_RSI',
                                instrumentId: stock.figi,
                                from: from1DayIso,
                                to: nowIso,
                                interval: 'INDICATOR_INTERVAL_FIFTEEN_MINUTES',
                                typeOfPrice: 'TYPE_OF_PRICE_CLOSE',
                                length: rsiPeriod
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetTechAnalysis', {
                                indicatorType: 'INDICATOR_TYPE_RSI',
                                instrumentId: stock.figi,
                                from: from7DayIso,
                                to: nowIso,
                                interval: 'INDICATOR_INTERVAL_ONE_HOUR',
                                typeOfPrice: 'TYPE_OF_PRICE_CLOSE',
                                length: rsiPeriod
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetTechAnalysis', {
                                indicatorType: 'INDICATOR_TYPE_RSI',
                                instrumentId: stock.figi,
                                from: from30DayIso,
                                to: nowIso,
                                interval: 'INDICATOR_INTERVAL_4_HOUR',
                                typeOfPrice: 'TYPE_OF_PRICE_CLOSE',
                                length: rsiPeriod
                            }),
                            fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetTechAnalysis', {
                                indicatorType: 'INDICATOR_TYPE_RSI',
                                instrumentId: stock.figi,
                                from: fromDayIso,
                                to: nowIso,
                                interval: 'INDICATOR_INTERVAL_ONE_DAY',
                                typeOfPrice: 'TYPE_OF_PRICE_CLOSE',
                                length: rsiPeriod
                            })
                        ]);

                        const c5m = (c5mRes.status === 'fulfilled' && c5mRes.value && Array.isArray(c5mRes.value.candles))
                            ? c5mRes.value.candles.map(convertTinkoffCandle) : [];
                        const c15m = (c15mRes.status === 'fulfilled' && c15mRes.value && Array.isArray(c15mRes.value.candles))
                            ? c15mRes.value.candles.map(convertTinkoffCandle) : [];
                        const c1h = (c1hRes.status === 'fulfilled' && c1hRes.value && Array.isArray(c1hRes.value.candles))
                            ? c1hRes.value.candles.map(convertTinkoffCandle) : [];
                        const c4h = (c4hRes.status === 'fulfilled' && c4hRes.value && Array.isArray(c4hRes.value.candles))
                            ? c4hRes.value.candles.map(convertTinkoffCandle) : [];
                        const cDay = (cDayRes.status === 'fulfilled' && cDayRes.value && Array.isArray(cDayRes.value.candles))
                            ? cDayRes.value.candles.map(convertTinkoffCandle) : [];

                        // Привязка последней цены к формирующейся свече
                        if (stock.price) {
                            [c5m, c15m, c1h, c4h, cDay].forEach(list => {
                                if (list.length > 0) {
                                    const last = list[list.length - 1];
                                    last.close = stock.price;
                                    last.high = Math.max(last.high, stock.price);
                                    last.low = Math.min(last.low, stock.price);
                                }
                            });
                        }

                        // Значения RSI напрямую от API Т-Инвестиций (GetTechAnalysis)
                        const apiRsi5m = extractTechAnalysisSignal(rsi5mRes);
                        const apiRsi15m = extractTechAnalysisSignal(rsi15mRes);
                        const apiRsi1h = extractTechAnalysisSignal(rsi1hRes);
                        const apiRsi4h = extractTechAnalysisSignal(rsi4hRes);
                        const apiRsiDay = extractTechAnalysisSignal(rsiDayRes);

                        // Fallback на локальный расчет, если GetTechAnalysis вернул пустой результат
                        const rsi5m = apiRsi5m !== null ? apiRsi5m : calcRSI(c5m, rsiPeriod);
                        const rsi15m = apiRsi15m !== null ? apiRsi15m : calcRSI(c15m, rsiPeriod);
                        const rsi1h = apiRsi1h !== null ? apiRsi1h : calcRSI(c1h, rsiPeriod);
                        const rsi4h = apiRsi4h !== null ? apiRsi4h : calcRSI(c4h, rsiPeriod);
                        const dailyRsi = apiRsiDay !== null ? apiRsiDay : calcRSI(cDay, rsiPeriod);

                        // Индикаторы таймфреймов: официальный RSI + сглаженный Slow Stochastic (14, 3, 3)
                        const stoch5m = calcStoch(c5m, stochPeriod, 3, 3);
                        const stoch15m = calcStoch(c15m, stochPeriod, 3, 3);
                        const stoch1h = calcStoch(c1h, stochPeriod, 3, 3);
                        const stoch4h = calcStoch(c4h, stochPeriod, 3, 3);

                        const tf5m = { rsi: rsi5m, k: stoch5m.k, d: stoch5m.d };
                        const tf15m = { rsi: rsi15m, k: stoch15m.k, d: stoch15m.d };
                        const tf1h = { rsi: rsi1h, k: stoch1h.k, d: stoch1h.d };
                        const tf4h = { rsi: rsi4h, k: stoch4h.k, d: stoch4h.d };

                        let rvol = stock.rvol || 1.0;
                        let rvol = stock.rvol || 1.0;
                        if (cDay.length > 0) {
                            const todayCandle = cDay[cDay.length - 1];
                            const todayVolLots = todayCandle.volume || 0;
                            if (stock.price) {
                                stock.turnover = todayVolLots * (stock.lot || 1) * stock.price;
                            }
                            const pastDaysSlice = cDay.slice(-(rvolDays + 1), -1);
                            if (pastDaysSlice.length > 0) {
                                const avgLots = pastDaysSlice.reduce((s, c) => s + (c.volume || 0), 0) / pastDaysSlice.length;
                                if (avgLots > 0 && todayVolLots > 0) {
                                    rvol = todayVolLots / avgLots;
                                }
                            }
                        }

                        stock.tf = { '5m': tf5m, '15m': tf15m, '1h': tf1h, '4h': tf4h };
                        stock.dailyRsi = dailyRsi;
                        stock.rvol = rvol;

                        candleCache.set(stock.ticker, { timestamp: Date.now() });
                        updatedCount++;

                        if (updatedCount % 4 === 0 && !document.hidden) {
                            triggerDebouncedRender();
                            renderFooterBar();
                        }

                        // Плавный интервал между запросами воркера
                        await new Promise(r => setTimeout(r, 120));

                    } catch (e) {
                        // мягкий пропуск ошибки единичного инструмента
                    }
                }
            }

            const workers = [];
            for (let i = 0; i < concurrency; i++) workers.push(worker());
            await Promise.all(workers);

            checkAlertsAndCooldown();
            if (!document.hidden) {
                renderTable();
                renderFooterBar();
            }

            // Обновляем кэш со свежими индикаторами
            try {
                GM_setValue('moex_quotes_cache', { timestamp: Date.now(), stocks: allStocks });
            } catch (e) {}

        } finally {
            isComputingIndicators = false;
        }
    }

    async function fetchAllMoexStocks(isManual = false) {
        if (isPaused && !isManual) return;

        if (!tinkoffToken) {
            updateStatusUI();
            renderTable();
            renderFooterBar();
            return;
        }

        if (refreshBtn) refreshBtn.classList.add('spinning');
        if (statusText) {
            statusText.innerHTML = '<span class="live-dot dot-yellow"></span> <span>Опрос Т-Инвестиций...</span>';
        }

        try {
            const shares = await getTinkoffShares();
            if (!shares || shares.length === 0) {
                throw new Error('Список акций MOEX TQBR пуст');
            }

            const figis = shares.map(s => s.figi);
            const closeInstruments = shares.map(s => ({ instrumentId: s.figi }));

            // 2 пакетных запроса: последние цены и цены закрытия для всех акций TQBR
            const [lastPricesResp, closePricesResp] = await Promise.all([
                fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetLastPrices', { figi: figis }),
                fetchTinkoff('tinkoff.public.invest.api.contract.v1.MarketDataService/GetClosePrices', { instruments: closeInstruments })
            ]);

            const lastPriceMap = new Map();
            if (lastPricesResp && Array.isArray(lastPricesResp.lastPrices)) {
                lastPricesResp.lastPrices.forEach(lp => {
                    const p = parseQuotation(lp.price);
                    if (p > 0) lastPriceMap.set(lp.figi, { price: p, time: lp.time });
                });
            }

            const closePriceMap = new Map();
            if (closePricesResp && Array.isArray(closePricesResp.closePrices)) {
                closePricesResp.closePrices.forEach(cp => {
                    const p = parseQuotation(cp.price);
                    if (p > 0) closePriceMap.set(cp.figi, p);
                });
            }

            // Сохраняем ранее рассчитанные индикаторы
            const prevStockMap = new Map();
            allStocks.forEach(s => prevStockMap.set(s.ticker, s));

            const newStocks = [];
            shares.forEach(share => {
                const lp = lastPriceMap.get(share.figi);
                const closeP = closePriceMap.get(share.figi);
                const prev = prevStockMap.get(share.ticker);

                const price = lp ? lp.price : (prev ? prev.price : null);
                if (!price && !closeP) return;

                let change = 0;
                if (price && closeP && closeP > 0) {
                    change = ((price - closeP) / closeP) * 100;
                } else if (prev && prev.change !== undefined) {
                    change = prev.change;
                }

                let timeStr = '';
                if (lp && lp.time) {
                    try {
                        const d = new Date(lp.time);
                        timeStr = d.toLocaleTimeString();
                    } catch (e) {
                        timeStr = '';
                    }
                } else if (prev) {
                    timeStr = prev.time;
                }

                newStocks.push({
                    fullSymbol: `MOEX:${share.ticker}`,
                    ticker: share.ticker,
                    description: share.name || share.ticker,
                    figi: share.figi,
                    uid: share.uid,
                    lot: share.lot || 1,
                    price: price,
                    change: change,
                    turnover: prev ? (prev.turnover || 0) : 0,
                    time: timeStr,
                    tf: prev ? prev.tf : {
                        '5m':  { rsi: null, k: null },
                        '15m': { rsi: null, k: null },
                        '1h':  { rsi: null, k: null },
                        '4h':  { rsi: null, k: null }
                    },
                    dailyRsi: prev ? prev.dailyRsi : null,
                    rvol: prev ? prev.rvol : 1.0
                });
            });

            newStocks.sort((a, b) => {
                const aTop = TOP_BLUE_CHIPS.has(a.ticker) ? 1 : 0;
                const bTop = TOP_BLUE_CHIPS.has(b.ticker) ? 1 : 0;
                if (aTop !== bTop) return bTop - aTop;
                return (b.turnover || 0) - (a.turnover || 0);
            });

            allStocks = newStocks;

            // Кэширование для мгновенного старта при F5
            try {
                GM_setValue('moex_quotes_cache', { timestamp: Date.now(), stocks: allStocks });
            } catch (e) {}

            const currentTime = new Date().toLocaleTimeString();
            lastUpdateTime = currentTime;
            updateStatusUI();

            // Немедленная отрисовка
            if (!document.hidden) {
                renderTable();
                if (settingsPanel && settingsPanel.style.display === 'block') {
                    const activeTab = shadow.querySelector('.settings-tab-btn.active');
                    if (activeTab && activeTab.getAttribute('data-tab') === 'tab-system') {
                        renderWatchlistUI();
                    }
                }
            }

            // Фоновый запуск расчета реальных индикаторов
            computePriorityIndicators(isManual);

        } catch (err) {
            if (statusText) {
                statusText.innerHTML = `<span class="live-dot dot-red"></span> <span title="${err.message}">Ошибка Т-Инвестиций</span>`;
            }
            if (err.message && (err.message.includes('401') || err.message.includes('NO_TOKEN') || err.message.includes('Unauthenticated'))) {
                if (tinkoffTokenBadge) {
                    tinkoffTokenBadge.textContent = 'Ошибка токена (401)';
                    tinkoffTokenBadge.style.color = '#f23645';
                }
            }
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        if (evalRes.longBoth) cls = 'signal-both-long';
        else if (evalRes.shortBoth) cls = 'signal-both-short';
        else if (evalRes.longAny) cls = 'signal-one-long';
        else if (evalRes.shortAny) cls = 'signal-one-short';

        const dTip = (tfData.d !== null && tfData.d !== undefined) ? ` (%D: ${tfData.d.toFixed(1)})` : '';
        return `<td class="${cls}" title="RSI: ${r} | Slow %K (SMA 3): ${k}${dTip}">${r} | ${k}</td>`;
    }

    function formatPriceChange(price, change, turnover) {
        const priceStr = (price !== null && price !== undefined) ? `${price} ₽` : '—';
        let volStr = '';
        if (turnover > 1000000000) volStr = `${(turnover / 1000000000).toFixed(1)}B ₽`;
        else if (turnover > 1000000) volStr = `${(turnover / 1000000).toFixed(1)}M ₽`;

        if (change === null || change === undefined) {
            return `<td><div><b>${priceStr}</b></div><span class="chg-zero">—</span></td>`;
        }
        const sign = change > 0 ? '+' : '';
        const cls = change > 0 ? 'chg-pos' : (change < 0 ? 'chg-neg' : 'chg-zero');
        return `<td><div><b>${priceStr}</b></div><span class="${cls}">${sign}${change.toFixed(2)}%</span> <small style="color:#787b86;">${volStr}</small></td>`;
    }

    function formatRvolBadge(rvol) {
        if (rvol === null || rvol === undefined) return `<td>—</td>`;
        const valStr = `${rvol.toFixed(1)}x`;
        const rDays = (config.indicators && config.indicators.rvolDays) || 10;
        if (rvol >= climaxRvolThreshold) {
            return `<td><span class="badge-spike" title="Всплеск объема: в ${valStr} выше средней нормы (${rDays} дн)">${valStr}</span></td>`;
        } else if (rvol >= 1.5) {
            return `<td><span class="badge-rvol-active" title="Повышенный объем (${rDays} дн)">${valStr}</span></td>`;
        }
        return `<td style="color:#787b86;">${valStr}</td>`;
    }

    function renderTable() {
        if (isDragging || isResizing) {
            needsRenderAfterDrag = true;
            return;
        }
        if (!tinkoffToken) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 42px 20px; text-align: center;">
                        <div style="font-size: 34px; margin-bottom: 12px;">🔑</div>
                        <div style="font-size: 15px; font-weight: 600; color: #d1d4dc; margin-bottom: 8px;">
                            Требуется токен Т-Инвестиций
                        </div>
                        <div style="font-size: 12px; color: #787b86; max-width: 440px; margin: 0 auto 16px; line-height: 1.5;">
                            Для получения реалтайм котировок MOEX без задержки и расчета индикаторов укажите ваш токен Т-Инвестиций с правами «Только чтение» в настройках.
                        </div>
                        <button id="no-token-open-settings-btn" style="background: #2962ff; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            ⚙️ Ввести токен в настройках
                        </button>
                    </td>
                </tr>
            `;
            const openBtn = shadow.getElementById('no-token-open-settings-btn');
            if (openBtn) {
                openBtn.addEventListener('click', () => {
                    settingsPanel.style.display = 'block';
                    shadow.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'tab-alerts'));
                    shadow.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-alerts'));
                    if (tinkoffTokenInput) tinkoffTokenInput.focus();
                });
            }
            renderFooterBar();
            return;
        }

        updateSortArrows();

        const rsiOffset = parseFloat(rsiSlider.value);
        const stochOffset = parseFloat(stochSlider.value);
        const selectedTf = currentTfFilter;
        const now = Date.now();
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const filtered = [];

        for (const stock of allStocks) {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const tickerMatch = stock.ticker.toLowerCase().includes(q);
                const descMatch = stock.description && stock.description.toLowerCase().includes(q);
                if (!tickerMatch && !descMatch) continue;
            }

            const isWatched = watchedTickers.has(stock.ticker);
            if (currentListFilter === 'watched_only' && !isWatched) continue;
            if (currentListFilter === 'blue_chips' && !TOP_BLUE_CHIPS.has(stock.ticker)) continue;
            if (minVolumeRub > 0 && stock.turnover < minVolumeRub) continue;
            if (minRvolFilter > 0 && stock.rvol < minRvolFilter) continue;

            const e5 = evaluateTimeframe(stock.tf['5m'], rsiOffset, stochOffset);
            const e15 = evaluateTimeframe(stock.tf['15m'], rsiOffset, stochOffset);
            const e1h = evaluateTimeframe(stock.tf['1h'], rsiOffset, stochOffset);
            const e4h = evaluateTimeframe(stock.tf['4h'], rsiOffset, stochOffset);
            const allNoData = e5.noData && e15.noData && e1h.noData && e4h.noData;

            // Выборка таймфреймов для фильтрации
            const targetTfs = (selectedTf === 'any') ? ['5m', '15m', '1h', '4h'] : [selectedTf];
            const targetEvals = targetTfs.map(tf => tf === '5m' ? e5 : tf === '15m' ? e15 : tf === '1h' ? e1h : e4h);

            // Проверка сигналов с учетом выбранного режима индикаторов
            let hasLong = false;
            let hasShort = false;

            for (const ev of targetEvals) {
                if (!ev || ev.noData) continue;
                let l = false;
                let s = false;
                if (currentIndicatorFilter === 'both') {
                    l = ev.longBoth;
                    s = ev.shortBoth;
                } else if (currentIndicatorFilter === 'any') {
                    l = ev.longAny;
                    s = ev.shortAny;
                } else if (currentIndicatorFilter === 'rsi_only') {
                    l = ev.rsiOversold;
                    s = ev.rsiOverbought;
                } else if (currentIndicatorFilter === 'stoch_only') {
                    l = ev.stochOversold;
                    s = ev.stochOverbought;
                }
                if (l) hasLong = true;
                if (s) hasShort = true;
            }

            // Фильтрация по направлению (Тип)
            if (currentDirectionFilter === 'signals' && !hasLong && !hasShort) continue;
            if (currentDirectionFilter === 'long' && !hasLong) continue;
            if (currentDirectionFilter === 'short' && !hasShort) continue;

            const isClimaxLong = hasLong && (stock.rvol >= climaxRvolThreshold);
            const isClimaxShort = hasShort && (stock.rvol >= climaxRvolThreshold);
            const isClimax = isClimaxLong || isClimaxShort;

            let statusRank = 1;
            if (allNoData) statusRank = 0;
            else if (isClimax) statusRank = 5;
            else if (hasLong || hasShort) statusRank = 4;

            filtered.push({
                stock, isWatched, e5, e15, e1h, e4h,
                hasLong, hasShort,
                isClimaxLong, isClimaxShort, allNoData, statusRank
            });
        }

        filtered.sort((a, b) => {
            let valA, valB;
            if (sortField === 'ticker') {
                return sortAsc ? a.stock.ticker.localeCompare(b.stock.ticker) : b.stock.ticker.localeCompare(a.stock.ticker);
            } else if (sortField === 'change') {
                valA = a.stock.change; valB = b.stock.change;
            } else if (sortField === 'rvol') {
                valA = a.stock.rvol; valB = b.stock.rvol;
            } else if (sortField === '5m' || sortField === '15m' || sortField === '1h' || sortField === '4h') {
                valA = a.stock.tf[sortField] ? a.stock.tf[sortField].rsi : null;
                valB = b.stock.tf[sortField] ? b.stock.tf[sortField].rsi : null;
            } else if (sortField === 'status') {
                valA = a.statusRank; valB = b.statusRank;
            }

            const aNull = (valA === null || valA === undefined);
            const bNull = (valB === null || valB === undefined);
            if (aNull && bNull) return 0;
            if (aNull) return 1;
            if (bNull) return -1;

            return sortAsc ? (valA - valB) : (valB - valA);
        });

        const prevScroll = tableContainer.scrollTop;

        if (filtered.length === 0) {
            const noMatchMsg = searchQuery
                ? `По запросу «${searchQuery}» ничего не найдено.`
                : 'Нет бумаг по выбранному фильтру. Проверьте настройки фильтров.';
            tbody.innerHTML = `<tr><td colspan="8" style="padding:18px; color:#787b86; text-align:center;">${noMatchMsg}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const { stock, isWatched, e5, e15, e1h, e4h, hasLong, hasShort, isClimaxLong, isClimaxShort, allNoData } = item;
            const starCls = isWatched ? 'star-btn starred' : 'star-btn';
            const starChar = isWatched ? '★' : '☆';

            const lastAlert = lastAlertTimes[stock.ticker] || 0;
            const onCooldown = (now - lastAlert) < cooldownMs;
            const cooldownLeft = onCooldown ? Math.ceil((cooldownMs - (now - lastAlert)) / 60000) : 0;
            const cdIcon = onCooldown ? `<span class="cooldown-dot" title="Антиспам Cooldown: тишина еще ${cooldownLeft} мин">⏳${cooldownLeft}м</span>` : '';

            let statusBadge = '<span class="badge-norm">Норма</span>';
            if (allNoData) {
                const dRsi = stock.dailyRsi !== null && stock.dailyRsi !== undefined ? `1D RSI: ${stock.dailyRsi.toFixed(1)}` : 'Выходной';
                statusBadge = `<span class="badge-nodata">${dRsi}</span>`;
            } else if (isClimaxLong) {
                statusBadge = '<span class="badge-climax-long" title="Капитуляция: Перепроданность + Всплеск объема!">КАПИТУЛЯЦИЯ</span>';
            } else if (isClimaxShort) {
                statusBadge = '<span class="badge-climax-short" title="Эйфория: Перекупленность + Всплеск объема!">ЭЙФОРИЯ</span>';
            } else if (hasLong && hasShort) {
                statusBadge = '<span class="badge-strong-long">СИГНАЛ (ОБА)</span>';
            } else if (hasLong) {
                statusBadge = '<span class="badge-strong-long">LONG</span>';
            } else if (hasShort) {
                statusBadge = '<span class="badge-strong-short">SHORT</span>';
            }

            const isActiveRow = currentActiveTerminalTicker && (stock.ticker === currentActiveTerminalTicker);
            const trClass = isActiveRow ? 'row-active-ticker' : '';

            return `
                <tr class="${trClass}" data-ticker="${stock.ticker}">
                    <td style="text-align:left;">
                        <span class="${starCls}" data-star="${stock.ticker}" title="В избранное">${starChar}</span>
                        <span class="ticker-link" data-ticker="${stock.ticker}" data-symbol="${stock.fullSymbol}" title="Открыть ${stock.ticker} (Клик: в терминале, Ctrl+клик: новая вкладка)">${stock.ticker}</span>${cdIcon}
                        <span class="sub-name">${stock.description}</span>
                    </td>
                    ${formatPriceChange(stock.price, stock.change, stock.turnover)}
                    ${formatRvolBadge(stock.rvol)}
                    ${formatCell(stock.tf['5m'], e5)}
                    ${formatCell(stock.tf['15m'], e15)}
                    ${formatCell(stock.tf['1h'], e1h)}
                    ${formatCell(stock.tf['4h'], e4h)}
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        tableContainer.scrollTop = prevScroll;
        renderFooterBar();
    }

    function restartTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        if (isPaused) return;
        const ms = parseInt(intervalSelect.value, 10) || 15000;
        timerId = setInterval(fetchAllMoexStocks, ms);
    }

    // ==========================================
    // ЭТАП 2: РЕАКТИВНАЯ КРОСС-ВКЛАДОЧНАЯ СИНХРОНИЗАЦИЯ
    // ==========================================
    function syncUIFromRemote() {
        const c = ConfigStore.data;

        // 1. Избранное
    }

    // ==========================================
    // ОПТИМИЗАЦИЯ: МГНОВЕННЫЙ СТАРТ ИЗ КЭША (0 мс)
    // ==========================================
    try {
        const cached = GM_getValue('moex_quotes_cache', null);
        if (cached && Array.isArray(cached.stocks) && cached.stocks.length > 0) {
            const ageMinutes = Math.round((Date.now() - (cached.timestamp || 0)) / 60000);
            if (ageMinutes < 180) { // кэш моложе 3 часов
                allStocks = cached.stocks;
                const timeStr = ageMinutes > 0 ? `${ageMinutes} мин назад` : 'только что';
                lastUpdateTime = timeStr;
                if (!isPaused) {
                    statusText.innerHTML = `<span class="live-dot dot-yellow"></span> <span>Кэш (${timeStr})</span>`;
                    statusText.title = `Данные загружены из кэша. Идет фоновое обновление с Т-Инвестиций...`;
                }
                renderTable();
            }
        }
    } catch (e) {}

    // Слушатель активности вкладки (Page Visibility API)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && allStocks.length > 0) {
            renderTable();
            renderFooterBar();
        }
    });

    // ==========================================
    // ИНТЕГРАЦИЯ КНОПКИ «СКРИНЕР» В ШАПКУ Т-ТЕРМИНАЛА
    // ==========================================
    function setupTerminalHeaderButton() {
        function injectButton() {
            const legacyBtn = document.getElementById('tbank-screener-toggle-btn');
            if (legacyBtn) legacyBtn.remove();

            if (document.getElementById('tbank-moex-screener-btn')) {
                updateTerminalHeaderButtonState();
                return;
            }

            const addWidgetBtn = document.getElementById('addWidgetMenuButton') ||
                                 document.querySelector('[data-qa-icon="add-widget2"]')?.closest('button') ||
                                 document.querySelector('[class*="addWidgetMenu"] button');

            if (!addWidgetBtn || !addWidgetBtn.parentNode) return;

            const screenerBtn = document.createElement('button');
            screenerBtn.id = 'tbank-moex-screener-btn';
            screenerBtn.type = 'button';

            let btnClass = addWidgetBtn.className.replace(/\bpx-\d+\b/g, '');
            if (!btnClass.includes('button-icon')) {
                btnClass += ' packages-kit-src-components-Button-Button-button-icon-a26ee';
            }
            screenerBtn.className = btnClass;
            screenerBtn.style.padding = '0';
            screenerBtn.style.aspectRatio = '1 / 1';
            screenerBtn.style.display = 'inline-flex';
            screenerBtn.style.alignItems = 'center';
            screenerBtn.style.justifyContent = 'center';
            screenerBtn.title = 'Скринер MOEX';

            const containerEl = addWidgetBtn.querySelector('div');
            const containerClass = containerEl ? containerEl.className : '';
            const iconWrapEl = addWidgetBtn.querySelector('[data-qa-type="kit/Icon"]');
            const iconWrapClass = iconWrapEl ? iconWrapEl.className : '';
            const cleanIconWrapClass = (iconWrapClass || '')
                .replace(/packages-kit-src-components-Button-Button-leftIcon-[a-z0-9]+/g, '')
                .replace(/packages-kit-src-components-Button-Button-obsoleteIconMargin-[a-z0-9]+/g, '')
                .trim();

            screenerBtn.innerHTML = `
                <div class="${containerClass}" style="display: flex; align-items: center; justify-content: center;">
                    <span style="width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; margin: 0;" class="${cleanIconWrapClass}" role="img" aria-hidden="true">
                        <span size="16" class="pro-icon" style="display: inline-flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3.5 3.5V6H6.5V3.5H3.5ZM8 3.5V6H12.5V3.5H8ZM12.5 7.5H8V10H12.5V7.5ZM12.5 11.5H8V12.5H12.5V11.5ZM6.5 12.5V11.5H3.5V12.5H6.5ZM3.5 10H6.5V7.5H3.5V10Z" fill="currentColor"></path>
                            </svg>
                        </span>
                    </span>
                </div>
            `;

            screenerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleScreenerVisibility();
            });

            addWidgetBtn.parentNode.insertBefore(screenerBtn, addWidgetBtn);
            updateTerminalHeaderButtonState();
        }

        injectButton();

        const observer = new MutationObserver(() => {
            if (!document.getElementById('tbank-moex-screener-btn')) {
                injectButton();
            }
        });

        try {
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) {}

        setInterval(() => {
            if (!document.getElementById('tbank-moex-screener-btn')) {
                injectButton();
            }
        }, 2000);
    }

    if (isPaused) {
        updateStatusUI();
    } else {
        setTimeout(fetchAllMoexStocks, 150);
        restartTimer();
    }
    startFooterRotation();
    injectFiberBridge();
    setupTerminalHeaderButton();
})();
