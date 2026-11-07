// =====================================================================
// MOEX Live Screener Pro - Frontend Engine
// =====================================================================

// 1. БАЗА ИНСТРУМЕНТОВ MOEX (Тикер + Полное название для смены при наведении)
const instrumentsData = [
    { ticker: 'SBER', fullName: 'Сбербанк России ПАО', color: '#19B26B', bluechip: true, price: 284.65, change: 2.18, volDiffBase: 68.4, volRubMln: 48200, rsi: 24.6, nw: 'BUY', cci: -138, stch: 14.2 },
    { ticker: 'T', fullName: 'Т-Технологии МКПАО', color: '#FFDD2D', textDark: true, bluechip: true, price: 2942.50, change: 3.42, volDiffBase: 94.2, volRubMln: 31500, rsi: 22.1, nw: 'BUY', cci: -154, stch: 11.8 },
    { ticker: 'LKOH', fullName: 'ЛУКОЙЛ НК ПАО', color: '#F23645', bluechip: true, price: 7148.00, change: -1.45, volDiffBase: 42.0, volRubMln: 22900, rsi: 76.4, nw: 'SELL', cci: 148, stch: 88.5 },
    { ticker: 'GAZP', fullName: 'Газпром ПАО', color: '#336FEE', bluechip: true, price: 136.82, change: -2.14, volDiffBase: 55.8, volRubMln: 28400, rsi: 74.1, nw: 'SELL', cci: 132, stch: 84.1 },
    { ticker: 'YDEX', fullName: 'МКАО Яндекс', color: '#F23645', bluechip: true, price: 4125.00, change: 1.95, volDiffBase: 38.5, volRubMln: 18700, rsi: 27.9, nw: 'BUY', cci: -118, stch: 18.6 },
    { ticker: 'ROSN', fullName: 'НК Роснефть ПАО', color: '#F59E0B', textDark: true, bluechip: true, price: 518.40, change: 0.42, volDiffBase: -18.4, volRubMln: 9400, rsi: 48.2, nw: 'NEUTRAL', cci: -24, stch: 46.0 },
    { ticker: 'NVTK', fullName: 'НОВАТЭК ПАО', color: '#3879F2', bluechip: true, price: 1042.60, change: -1.88, volDiffBase: 29.4, volRubMln: 11200, rsi: 72.8, nw: 'SELL', cci: 119, stch: 82.3 },
    { ticker: 'PLZL', fullName: 'Полюс ПАО', color: '#D97706', bluechip: true, price: 14890.00, change: 2.76, volDiffBase: 81.2, volRubMln: 16400, rsi: 26.2, nw: 'BUY', cci: -126, stch: 15.9 },
    { ticker: 'GMKN', fullName: 'ГМК Норильский никель', color: '#0284C7', bluechip: true, price: 118.45, change: -0.64, volDiffBase: -32.0, volRubMln: 6800, rsi: 54.5, nw: 'NEUTRAL', cci: 42, stch: 58.2 },
    { ticker: 'SNGS', fullName: 'Сургутнефтегаз ПАО', color: '#2563EB', bluechip: false, price: 26.84, change: 1.54, volDiffBase: 24.6, volRubMln: 8100, rsi: 28.4, nw: 'BUY', cci: -92, stch: 19.4 },
    { ticker: 'CHMF', fullName: 'Северсталь ПАО', color: '#4F46E5', bluechip: false, price: 1284.00, change: -2.35, volDiffBase: 47.1, volRubMln: 7900, rsi: 78.2, nw: 'SELL', cci: 164, stch: 91.0 },
    { ticker: 'ALRS', fullName: 'АЛРОСА АК ПАО', color: '#0EA5E9', bluechip: false, price: 54.90, change: -0.18, volDiffBase: -41.5, volRubMln: 3200, rsi: 44.0, nw: 'NEUTRAL', cci: -15, stch: 39.5 },
    { ticker: 'AFLT', fullName: 'Аэрофлот ПАО', color: '#3B82F6', bluechip: false, price: 61.25, change: 3.12, volDiffBase: 112.5, volRubMln: 14300, rsi: 21.8, nw: 'BUY', cci: -149, stch: 12.4 },
    { ticker: 'MOEX', fullName: 'Московская Биржа ПАО', color: '#E11D48', bluechip: false, price: 218.70, change: -1.62, volDiffBase: 19.8, volRubMln: 8900, rsi: 71.5, nw: 'SELL', cci: 112, stch: 79.2 }
];

// 2. СОСТОЯНИЕ ВИДЖЕТА И НАСТРОЕК
const state = {
    timeframe: '15м',
    assetFilter: 'all',
    strategyMode: 'rsi_nw',
    useCCI: true,
    useSTCH: true,
    serverOnline: true,
    volumeDaysX: 20,
    thresholds: {
        rsiLow: 30,
        rsiHigh: 70,
        cciLow: -100,
        cciHigh: 100,
        stchLow: 20,
        stchHigh: 80
    },
    sortBy: 'statusScore',
    sortDesc: true,
    editFavoritesMode: false
};

function getFavoritesSet() {
    try {
        const stored = localStorage.getItem('moex_screener_favorites');
        if (stored) return new Set(JSON.parse(stored));
    } catch (e) {}
    return new Set(['SBER', 'GAZP', 'LKOH', 'GMKN', 'ROSN', 'NVTK', 'YDEX', 'T']);
}

function saveFavoritesSet(favSet) {
    localStorage.setItem('moex_screener_favorites', JSON.stringify(Array.from(favSet)));
}

function syncFavoritesUniverseWithBackend() {
    if (window._backendWs && window._backendWs.readyState === WebSocket.OPEN) {
        const favs = Array.from(getFavoritesSet());
        window._backendWs.send(JSON.stringify({
            action: 'SET_ACTIVE_UNIVERSE',
            listMode: 'favorites',
            tickers: favs
        }));
    }
}

function toggleEditFavoritesMode() {
    state.editFavoritesMode = !state.editFavoritesMode;
    const btn = document.getElementById('btn-edit-favorites');
    const label = document.getElementById('label-edit-favorites');
    if (btn && label) {
        if (state.editFavoritesMode) {
            btn.classList.add('!bg-[#336FEE]', '!text-white', '!border-[#428BF9]');
            btn.classList.remove('hover:bg-[rgba(112,139,164,0.20)]');
            label.textContent = 'Готово';
            btn.title = 'Сохранить выбор избранных и скрыть чекбоксы';
        } else {
            btn.classList.remove('!bg-[#336FEE]', '!text-white', '!border-[#428BF9]');
            btn.classList.add('hover:bg-[rgba(112,139,164,0.20)]');
            btn.style.color = 'var(--text-secondary)';
            label.textContent = 'Изменить';
            btn.title = 'Выбрать избранные инструменты (чекбоксы)';

            if (state.assetFilter === 'favorites') {
                syncFavoritesUniverseWithBackend();
            }
        }
    }
    renderTable();
}

function toggleFavoriteItem(ticker, event) {
    if (event) event.stopPropagation();
    const favSet = getFavoritesSet();
    if (favSet.has(ticker)) {
        favSet.delete(ticker);
    } else {
        favSet.add(ticker);
    }
    saveFavoritesSet(favSet);
    if (state.assetFilter === 'favorites') {
        syncFavoritesUniverseWithBackend();
    }
    renderTable();
}

const tfMultipliers = {
    '1м': 0.82,
    '5м': 0.91,
    '15м': 1.00,
    '1ч': 1.08,
    '4ч': 1.15,
    'Д': 1.24
};

// Запоминаем время последних уведомлений, чтобы не спамить
const lastNotified = {};

// 3. ВЫЧИСЛЕНИЕ СИГНАЛОВ ИНДИКАТОРОВ И СОВОКУПНОГО СТАТУСА
function evaluateRowSignals(item) {
    const t = state.thresholds;

    const rsiSignal = item.rsi <= t.rsiLow ? 1 : (item.rsi >= t.rsiHigh ? -1 : 0);
    const nwSignal = item.nw === 'BUY' ? 1 : (item.nw === 'SELL' ? -1 : 0);
    const cciSignal = item.cci <= t.cciLow ? 1 : (item.cci >= t.cciHigh ? -1 : 0);
    const stchSignal = item.stch <= t.stchLow ? 1 : (item.stch >= t.stchHigh ? -1 : 0);

    const activeVotes = [];
    const reasons = [];

    if (state.strategyMode === 'rsi_only') {
        activeVotes.push(rsiSignal * 2);
        if (rsiSignal !== 0) reasons.push(`RSI (${item.rsi.toFixed(1)})`);
    } else if (state.strategyMode === 'nw_only') {
        activeVotes.push(nwSignal * 2);
        if (nwSignal !== 0) reasons.push(`NW (${item.nw === 'BUY' ? 'Покупка' : 'Продажа'})`);
    } else {
        activeVotes.push(rsiSignal);
        activeVotes.push(nwSignal);
        if (rsiSignal !== 0) reasons.push(`RSI (${item.rsi.toFixed(1)})`);
        if (nwSignal !== 0) reasons.push(`NW (${item.nw === 'BUY' ? 'Покупка' : 'Продажа'})`);
    }

    if (state.useCCI) {
        activeVotes.push(cciSignal);
        if (cciSignal !== 0) reasons.push(`CCI (${item.cci > 0 ? '+' + item.cci : item.cci})`);
    }
    if (state.useSTCH) {
        activeVotes.push(stchSignal);
        if (stchSignal !== 0) reasons.push(`STCH (${item.stch.toFixed(1)})`);
    }

    const buyVotes = activeVotes.filter(v => v > 0).length;
    const sellVotes = activeVotes.filter(v => v < 0).length;
    const totalScore = activeVotes.reduce((acc, v) => acc + v, 0);

    let finalStatus = 'NEUTRAL';
    if (state.strategyMode === 'rsi_or_nw') {
        if ((rsiSignal > 0 || nwSignal > 0) && sellVotes === 0) finalStatus = 'BUY';
        else if ((rsiSignal < 0 || nwSignal < 0) && buyVotes === 0) finalStatus = 'SELL';
    } else if (state.strategyMode === 'strict') {
        if (buyVotes >= 3 && sellVotes === 0) finalStatus = 'BUY';
        else if (sellVotes >= 3 && buyVotes === 0) finalStatus = 'SELL';
    } else {
        if (totalScore >= 2 || (buyVotes >= 2 && sellVotes === 0)) finalStatus = 'BUY';
        else if (totalScore <= -2 || (sellVotes >= 2 && buyVotes === 0)) finalStatus = 'SELL';
    }

    const dayFactor = 20 / state.volumeDaysX;
    const volumeDiff = Number((item.volDiffBase * Math.pow(dayFactor, 0.35)).toFixed(1));

    // Проверяем отправку нативного уведомления при сильном сигнале
    const now = Date.now();
    if (finalStatus !== 'NEUTRAL') {
        const lastTime = lastNotified[item.ticker] || 0;
        if (now - lastTime > 60000) { // Не чаще раза в минуту на тикер
            lastNotified[item.ticker] = now;
            if (typeof window.triggerDesktopAlert === 'function') {
                const actionText = finalStatus === 'BUY' ? '🟢 ПОКУПКА' : '🔴 ПРОДАЖА';
                window.triggerDesktopAlert(
                    `${actionText}: ${item.ticker} (${priceFormattedStr(item.price)} ₽)`,
                    `${reasons.join(' · ')} | Объем ${volumeDiff > 0 ? '+' : ''}${volumeDiff}%`
                );
            }
        }
    }

    return {
        rsiSignal,
        nwSignal,
        cciSignal,
        stchSignal,
        finalStatus,
        statusScore: finalStatus === 'BUY' ? 10 + totalScore : (finalStatus === 'SELL' ? -10 + totalScore : totalScore),
        reasonsText: reasons.length ? reasons.join(' + ') : 'Нет выраженных сигналов',
        volumeDiff
    };
}

function priceFormattedStr(price) {
    return price >= 1000
        ? price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : price.toFixed(2);
}

// 4. РЕНДЕР ТАБЛИЦЫ СКРИНЕРА
function renderTable(flashedTicker = null, flashDir = 0) {
    const tbody = document.getElementById('screener-tbody');
    const searchInput = document.getElementById('ticker-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    if (!tbody) return;

    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', query.length === 0);
    }

    const thCci = document.getElementById('th-cci-col');
    const thStch = document.getElementById('th-stch-col');
    if (thCci) thCci.classList.toggle('col-muted', !state.useCCI);
    if (thStch) thStch.classList.toggle('col-muted', !state.useSTCH);

    const favSet = getFavoritesSet();

    let enriched = instrumentsData.map(item => {
        const calc = evaluateRowSignals(item);
        return { ...item, ...calc };
    });

    enriched = enriched.filter(row => {
        if (query && !row.ticker.toLowerCase().includes(query) && !row.fullName.toLowerCase().includes(query)) {
            return false;
        }
        if (state.assetFilter === 'favorites') {
            if (!favSet.has(row.ticker)) return false;
        }
        if (state.assetFilter === 'bluechips' && !row.bluechip) return false;
        if (state.assetFilter === 'highvol' && row.volumeDiff <= 0) return false;
        if (state.assetFilter === 'active_signals' && row.finalStatus === 'NEUTRAL') return false;
        return true;
    });

    enriched.sort((a, b) => {
        let valA = a[state.sortBy];
        let valB = b[state.sortBy];
        if (state.sortBy === 'ticker') {
            return state.sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        if (state.sortBy === 'nw') {
            valA = a.nwSignal;
            valB = b.nwSignal;
        }
        return state.sortDesc ? (valB - valA) : (valA - valB);
    });

    let buyCount = 0;
    let sellCount = 0;
    let neutralCount = 0;

    enriched.forEach(r => {
        if (r.finalStatus === 'BUY') buyCount++;
        else if (r.finalStatus === 'SELL') sellCount++;
        else neutralCount++;
    });

    const totalEl = document.getElementById('total-rows-count');
    const buyEl = document.getElementById('footer-buy-count');
    const sellEl = document.getElementById('footer-sell-count');
    const neutEl = document.getElementById('footer-neutral-count');

    if (totalEl) totalEl.textContent = enriched.length;
    if (buyEl) buyEl.textContent = buyCount;
    if (sellEl) sellEl.textContent = sellCount;
    if (neutEl) neutEl.textContent = neutralCount;

    if (enriched.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-xs" style="color: var(--text-secondary);">
                    По выбранным фильтрам инструментов не найдено. <button type="button" onclick="minimizeOrResetWidget()" class="text-[#62A1FF] underline bg-transparent border-none cursor-pointer">Сбросить фильтры</button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = enriched.map(row => {
        const isFlashed = row.ticker === flashedTicker;
        const flashClass = isFlashed ? (flashDir >= 0 ? 'row-flash-up' : 'row-flash-down') : '';

        const priceFormatted = priceFormattedStr(row.price);
        const changeSign = row.change > 0 ? '+' : '';
        const changeColorClass = row.change >= 0 ? 'text-[#2CE89C]' : 'text-[#FF6969]';

        const volSign = row.volumeDiff > 0 ? '+' : '';
        const volColor = row.volumeDiff >= 25
            ? 'color: var(--signal-buy-text); font-weight: 600;'
            : (row.volumeDiff < 0 ? 'color: var(--signal-sell-text);' : 'color: var(--text-secondary);');
        const volBarWidth = Math.min(100, Math.max(8, Math.round(Math.abs(row.volumeDiff) * 0.8)));
        const volBarColor = row.volumeDiff >= 0 ? '#19B26B' : '#F23645';

        const rsiClass = row.rsiSignal > 0 ? 'sig-buy' : (row.rsiSignal < 0 ? 'sig-sell' : 'sig-neutral');
        const nwClass = row.nwSignal > 0 ? 'sig-buy' : (row.nwSignal < 0 ? 'sig-sell' : 'sig-neutral');
        const nwLabel = row.nwSignal > 0 ? 'Покупка' : (row.nwSignal < 0 ? 'Продажа' : 'Нейтрально');

        const cciClass = row.cciSignal > 0 ? 'sig-buy' : (row.cciSignal < 0 ? 'sig-sell' : 'sig-neutral');
        const cciFormatted = (row.cci > 0 ? '+' : '') + Math.round(row.cci);
        const stchClass = row.stchSignal > 0 ? 'sig-buy' : (row.stchSignal < 0 ? 'sig-sell' : 'sig-neutral');

        let statusBadgeHtml = '';
        if (row.finalStatus === 'BUY') {
            statusBadgeHtml = `
                <span class="sig-pill sig-buy" title="Сигналы за Покупку: ${row.reasonsText}">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#2CE89C]"></span>
                    <span>Покупка</span>
                </span>
            `;
        } else if (row.finalStatus === 'SELL') {
            statusBadgeHtml = `
                <span class="sig-pill sig-sell" title="Сигналы за Продажу: ${row.reasonsText}">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#FF6969]"></span>
                    <span>Продажа</span>
                </span>
            `;
        } else {
            statusBadgeHtml = `
                <span class="sig-pill sig-neutral" title="${row.reasonsText}">
                    <span>Ожидание</span>
                </span>
            `;
        }

        const isFavorite = favSet.has(row.ticker);

        return `
            <tr class="${flashClass}">
                <td class="ticker-cell">
                    <div class="flex items-center gap-2">
                        ${state.editFavoritesMode ? `
                        <input type="checkbox"
                               ${isFavorite ? 'checked' : ''}
                               onchange="toggleFavoriteItem('${row.ticker}', event)"
                               class="w-3.5 h-3.5 rounded accent-[#336FEE] bg-[#12151B] border border-[rgba(140,167,190,0.4)] cursor-pointer shrink-0"
                               title="Добавить/удалить ${row.ticker} в избранное" />
                        ` : ''}

                        ${row.logoUrl ? `
                        <img src="${row.logoUrl}"
                             class="w-5 h-5 rounded-full object-cover shrink-0"
                             style="background-color: ${row.logoColor || row.color || '#333'};"
                             onerror="this.style.display='none'"
                             alt="${row.ticker}" />
                        ` : `
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style="background-color: ${row.color}; color: ${row.textDark ? '#12151B' : '#FFFFFF'};">
                            ${row.ticker.slice(0, 1)}
                        </span>
                        `}
                        <div class="ticker-swap-wrap flex-1 min-w-0">
                            <span class="ticker-code-label flex items-center gap-1">
                                <span>${row.ticker}</span>
                                ${isFavorite ? '<span class="text-[#f0b90b] text-[11px] leading-none select-none" title="В избранном">★</span>' : ''}
                            </span>
                            <span class="ticker-fullname-label truncate">
                                ${row.fullName}
                            </span>
                        </div>
                    </div>
                </td>

                <td class="text-right font-mono">
                    <div class="inline-flex items-baseline justify-end gap-1.5">
                        <span class="font-semibold" style="color: var(--text-primary);">${priceFormatted} ₽</span>
                        <span class="text-[11px] font-medium ${changeColorClass}">${changeSign}${row.change.toFixed(2)}%</span>
                    </div>
                </td>

                <td class="text-right font-mono" title="Текущий объем: ${(row.volRubMln / 1000).toFixed(1)} млрд ₽ (отклонение от среднего за ${state.volumeDaysX} дн.)">
                    <div class="flex flex-col items-end gap-0.5">
                        <span class="text-[12px]" style="${volColor}">${volSign}${row.volumeDiff.toFixed(1)}%</span>
                        <div class="w-16 h-1 rounded-full bg-[rgba(112,139,164,0.18)] overflow-hidden">
                            <div class="h-full rounded-full" style="width: ${volBarWidth}%; background-color: ${volBarColor};"></div>
                        </div>
                    </div>
                </td>

                <td class="text-center font-mono">
                    <span class="sig-pill ${rsiClass} min-w-[48px]">${row.rsi.toFixed(1)}</span>
                </td>

                <td class="text-center">
                    <span class="sig-pill ${nwClass}">${nwLabel}</span>
                </td>

                <td class="text-center font-mono ${state.useCCI ? '' : 'col-muted'}">
                    <span class="sig-pill ${cciClass} min-w-[50px]">${cciFormatted}</span>
                </td>

                <td class="text-center font-mono ${state.useSTCH ? '' : 'col-muted'}">
                    <span class="sig-pill ${stchClass} min-w-[48px]">${row.stch.toFixed(1)}</span>
                </td>

                <td class="text-right">
                    ${statusBadgeHtml}
                </td>
            </tr>
        `;
    }).join('');
}

// 5. ОБРАБОТЧИКИ ПАНЕЛИ ИНСТРУМЕНТОВ
function selectTimeframe(tf, btnEl) {
    state.timeframe = tf;
    document.querySelectorAll('.tf-group .tf-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const tfBadge = document.getElementById('header-active-tf-badge');
    if (tfBadge) tfBadge.textContent = tf;

    const mult = tfMultipliers[tf] || 1;
    instrumentsData.forEach(item => {
        const drift = (Math.random() - 0.49) * 5 * mult;
        item.rsi = Math.max(12, Math.min(88, Number((item.rsi + drift).toFixed(1))));
        item.stch = Math.max(6, Math.min(95, Number((item.stch + drift * 1.2).toFixed(1))));
        item.cci = Math.max(-210, Math.min(210, Math.round(item.cci + drift * 6)));

        if (item.rsi <= 31) item.nw = 'BUY';
        else if (item.rsi >= 69) item.nw = 'SELL';
        else if (Math.random() > 0.65) item.nw = 'NEUTRAL';
    });

    renderTable();
}

function toggleDropdown(type) {
    const isAssets = type === 'assets';
    const btn = document.getElementById(isAssets ? 'btn-assets-select' : 'btn-strategy-select');
    const menu = document.getElementById(isAssets ? 'menu-assets-select' : 'menu-strategy-select');
    const otherBtn = document.getElementById(isAssets ? 'btn-strategy-select' : 'btn-assets-select');
    const otherMenu = document.getElementById(isAssets ? 'menu-strategy-select' : 'menu-assets-select');

    if (otherBtn) otherBtn.classList.remove('open');
    if (otherMenu) otherMenu.classList.remove('open');

    if (btn && menu) {
        btn.classList.toggle('open');
        menu.classList.toggle('open');
    }
}

function selectAssetFilter(filterCode, label, itemEl) {
    state.assetFilter = filterCode;
    const lbl = document.getElementById('label-assets-select');
    if (lbl) lbl.textContent = label;

    document.querySelectorAll('#menu-assets-select .kit-dropdown-item').forEach(el => el.classList.remove('selected'));
    if (itemEl) itemEl.classList.add('selected');

    document.getElementById('btn-assets-select')?.classList.remove('open');
    document.getElementById('menu-assets-select')?.classList.remove('open');

    if (filterCode === 'favorites') {
        syncFavoritesUniverseWithBackend();
    } else if (filterCode === 'all') {
        if (window._backendWs && window._backendWs.readyState === WebSocket.OPEN) {
            window._backendWs.send(JSON.stringify({ action: 'SET_ACTIVE_UNIVERSE', listMode: 'all_stocks' }));
        }
    }

    renderTable();
}

function selectStrategyMode(modeCode, label, itemEl) {
    state.strategyMode = modeCode;
    const lbl = document.getElementById('label-strategy-select');
    if (lbl) lbl.textContent = label;

    document.querySelectorAll('#menu-strategy-select .kit-dropdown-item').forEach(el => el.classList.remove('selected'));
    if (itemEl) itemEl.classList.add('selected');

    document.getElementById('btn-strategy-select')?.classList.remove('open');
    document.getElementById('menu-strategy-select')?.classList.remove('open');
    renderTable();
}

function toggleIndicatorChip(ind) {
    if (ind === 'cci') {
        state.useCCI = !state.useCCI;
        const btn = document.getElementById('toggle-cci-btn');
        const txt = document.getElementById('cci-state-text');
        if (btn) btn.classList.toggle('active', state.useCCI);
        if (txt) txt.textContent = state.useCCI ? 'ON' : 'OFF';
    } else if (ind === 'stch') {
        state.useSTCH = !state.useSTCH;
        const btn = document.getElementById('toggle-stch-btn');
        const txt = document.getElementById('stch-state-text');
        if (btn) btn.classList.toggle('active', state.useSTCH);
        if (txt) txt.textContent = state.useSTCH ? 'ON' : 'OFF';
    }
    renderTable();
}

function toggleServerConnection() {
    state.serverOnline = !state.serverOnline;
    const dot = document.getElementById('server-status-dot');
    const label = document.getElementById('server-ping-label');
    if (!dot || !label) return;

    if (state.serverOnline) {
        dot.className = 'server-dot online';
        label.textContent = 'MOEX · 14 мс';
        label.style.color = 'var(--text-secondary)';
    } else {
        dot.className = 'server-dot offline';
        label.textContent = 'Нет связи';
        label.style.color = 'var(--signal-sell-text)';
    }
}

function setSortColumn(col) {
    if (state.sortBy === col) {
        state.sortDesc = !state.sortDesc;
    } else {
        state.sortBy = col;
        state.sortDesc = true;
    }

    ['ticker', 'change', 'volumeDiff', 'rsi', 'nw', 'cci', 'stch', 'statusScore'].forEach(key => {
        const icon = document.getElementById('sort-icon-' + key);
        if (!icon) return;
        if (key === state.sortBy) {
            icon.textContent = state.sortDesc ? '▼' : '▲';
            icon.className = 'text-[10px] text-[#62A1FF]';
        } else {
            icon.textContent = '';
            icon.className = 'text-[10px] opacity-60';
        }
    });

    renderTable();
}

function clearSearchInput() {
    const inp = document.getElementById('ticker-search-input');
    if (inp) {
        inp.value = '';
        inp.focus();
    }
    renderTable();
}

function minimizeOrResetWidget() {
    state.assetFilter = 'all';
    state.strategyMode = 'rsi_nw';
    state.useCCI = true;
    state.useSTCH = true;
    const inp = document.getElementById('ticker-search-input');
    if (inp) inp.value = '';

    document.getElementById('label-assets-select').textContent = 'Все акции';
    document.getElementById('label-strategy-select').textContent = 'RSI + NW';
    document.getElementById('toggle-cci-btn')?.classList.add('active');
    document.getElementById('toggle-stch-btn')?.classList.add('active');
    document.getElementById('cci-state-text').textContent = 'ON';
    document.getElementById('stch-state-text').textContent = 'ON';
    renderTable();
}

// 6. НАСТРОЙКИ МОДАЛЬНОГО ОКНА
function openSettingsModal() {
    document.getElementById('settings-modal-backdrop')?.classList.add('open');
}

function closeSettingsModal() {
    document.getElementById('settings-modal-backdrop')?.classList.remove('open');
}

function closeSettingsOnBackdrop(e) {
    if (e.target.id === 'settings-modal-backdrop') {
        closeSettingsModal();
    }
}

function switchSettingsTab(tabName, tabEl) {
    document.querySelectorAll('.settings-vert-tab').forEach(el => el.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    document.getElementById('settings-pane-volume')?.classList.toggle('hidden', tabName !== 'volume');
    document.getElementById('settings-pane-thresholds')?.classList.toggle('hidden', tabName !== 'thresholds');
    document.getElementById('settings-pane-appearance')?.classList.toggle('hidden', tabName !== 'appearance');
}

function updateVolumeDaysSetting(daysVal) {
    const days = parseInt(daysVal, 10) || 20;
    state.volumeDaysX = days;
    const modalLabel = document.getElementById('modal-vol-days-val');
    const thLabel = document.getElementById('th-volume-label');
    if (modalLabel) modalLabel.textContent = days + ' дней';
    if (thLabel) thLabel.textContent = `Объем (${days}д)`;
    updateFooterInfoText();
    renderTable();
}

function applySettingsFromModal() {
    const rsiLow = parseFloat(document.getElementById('inp-rsi-low')?.value) || 30;
    const rsiHigh = parseFloat(document.getElementById('inp-rsi-high')?.value) || 70;
    const cciLow = parseFloat(document.getElementById('inp-cci-low')?.value) || -100;
    const cciHigh = parseFloat(document.getElementById('inp-cci-high')?.value) || 100;
    const stchLow = parseFloat(document.getElementById('inp-stch-low')?.value) || 20;
    const stchHigh = parseFloat(document.getElementById('inp-stch-high')?.value) || 80;

    state.thresholds = { rsiLow, rsiHigh, cciLow, cciHigh, stchLow, stchHigh };
    updateFooterInfoText();
    renderTable();
    closeSettingsModal();
}

function resetSettingsDefaults() {
    state.volumeDaysX = 20;
    state.thresholds = { rsiLow: 30, rsiHigh: 70, cciLow: -100, cciHigh: 100, stchLow: 20, stchHigh: 80 };

    const slider = document.getElementById('modal-vol-days-slider');
    if (slider) slider.value = 20;
    document.getElementById('modal-vol-days-val').textContent = '20 дней';
    document.getElementById('th-volume-label').textContent = 'Объем (20д)';

    document.getElementById('inp-rsi-low').value = 30;
    document.getElementById('inp-rsi-high').value = 70;
    document.getElementById('inp-cci-low').value = -100;
    document.getElementById('inp-cci-high').value = 100;
    document.getElementById('inp-stch-low').value = 20;
    document.getElementById('inp-stch-high').value = 80;

    updateFooterInfoText();
    renderTable();
}

function updateFooterInfoText() {
    const el = document.getElementById('footer-thresholds-info');
    if (!el) return;
    const t = state.thresholds;
    el.textContent = `Пороги: RSI ${t.rsiLow}/${t.rsiHigh} · CCI ${t.cciLow}/+${t.cciHigh} · STCH ${t.stchLow}/${t.stchHigh} · Ср. объем за ${state.volumeDaysX} дн.`;
}

// 7. СИМУЛЯЦИЯ И ЖИВОЙ ПОТОК
function simulateLiveStreamTick() {
    if (!state.serverOnline) return;

    const randomIdx = Math.floor(Math.random() * instrumentsData.length);
    const item = instrumentsData[randomIdx];
    if (!item) return;

    const pctDelta = (Math.random() - 0.49) * 0.35;
    item.price = Math.max(1, Number((item.price * (1 + pctDelta / 100)).toFixed(2)));
    item.change = Number((item.change + pctDelta * 0.4).toFixed(2));
    item.volDiffBase = Number((item.volDiffBase + (Math.random() - 0.46) * 2.2).toFixed(1));

    item.rsi = Math.max(14, Math.min(86, Number((item.rsi + (Math.random() - 0.5) * 1.4).toFixed(1))));
    item.stch = Math.max(8, Math.min(94, Number((item.stch + (Math.random() - 0.5) * 1.8).toFixed(1))));
    item.cci = Math.max(-195, Math.min(195, Math.round(item.cci + (Math.random() - 0.5) * 7)));

    if (!window._realWsConnected) {
        const pingLabel = document.getElementById('server-ping-label');
        if (pingLabel) {
            const ping = 11 + Math.floor(Math.random() * 8);
            pingLabel.textContent = `MOEX · ${ping} мс`;
        }
    }

    renderTable(item.ticker, pctDelta);
}

function triggerMarketPulse() {
    instrumentsData.forEach(item => {
        const impulse = (Math.random() - 0.45) * 1.8;
        item.price = Math.max(1, Number((item.price * (1 + impulse / 100)).toFixed(2)));
        item.change = Number((item.change + impulse * 0.5).toFixed(2));
        item.volDiffBase = Number((item.volDiffBase + Math.abs(impulse) * 14).toFixed(1));
    });
    renderTable();
}

function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'night' ? 'light' : 'night';
    html.setAttribute('data-theme', next);
    const lbl = document.getElementById('demo-theme-label');
    if (lbl) lbl.textContent = next === 'night' ? 'Night' : 'Light';
}

function toggleCondensed() {
    const html = document.documentElement;
    const next = html.getAttribute('data-condensed') === 'true' ? 'false' : 'true';
    html.setAttribute('data-condensed', next);
    const lbl = document.getElementById('demo-condensed-label');
    if (lbl) lbl.textContent = next === 'true' ? 'ON' : 'OFF';
}

function toggleContrast() {
    const html = document.documentElement;
    const next = html.getAttribute('data-contrast') === 'true' ? 'false' : 'true';
    html.setAttribute('data-contrast', next);
    const lbl = document.getElementById('demo-contrast-label');
    if (lbl) lbl.textContent = next === 'true' ? 'ON' : 'OFF';
}

const groupColors = ['#336FEE', '#FFDD2D', '#2CE89C', '#FF6969', '#A855F7'];
let groupColorIdx = 0;
function cycleLinkGroupColor(btnEl) {
    groupColorIdx = (groupColorIdx + 1) % groupColors.length;
    if (btnEl) {
        btnEl.style.backgroundColor = groupColors[groupColorIdx];
    }
}

// 8. ПОДКЛЮЧЕНИЕ К WEBSOCKET БЭКЕНДА
async function initBackendWebSocket() {
    let wsPort = 3001;
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getBackendStatus) {
        try {
            const st = await window.electronAPI.getBackendStatus();
            if (st && st.port) wsPort = st.port;
        } catch (e) {}
    }

    const wsUrl = `ws://127.0.0.1:${wsPort}/stream`;
    let ws = null;

    function connect() {
        try {
            ws = new WebSocket(wsUrl);
            window._backendWs = ws;

            ws.onopen = () => {
                window._realWsConnected = true;
                const dot = document.getElementById('server-status-dot');
                const label = document.getElementById('server-ping-label');
                if (dot) dot.className = 'server-dot online';
                if (label) {
                    label.textContent = `WS ${wsPort} · 0ms`;
                    label.style.color = '#2CE89C';
                }

                if (state.assetFilter === 'favorites') {
                    syncFavoritesUniverseWithBackend();
                } else {
                    ws.send(JSON.stringify({ action: 'SET_ACTIVE_UNIVERSE', listMode: 'all_stocks' }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'SNAPSHOT' && Array.isArray(msg.data)) {
                        msg.data.forEach(item => {
                            let match = instrumentsData.find(i => i.ticker === item.ticker);
                            if (match) {
                                if (item.logoUrl) match.logoUrl = item.logoUrl;
                                if (item.logoColor) match.logoColor = item.logoColor;
                                if (item.price) match.price = item.price;
                                if (item.change !== undefined) match.change = item.change;
                                if (item.description) match.fullName = item.description;
                            }
                        });
                        renderTable();
                    } else if (msg.type === 'ticker' || msg.type === 'candle' || msg.ticker) {
                        const targetTicker = msg.ticker;
                        const match = instrumentsData.find(i => i.ticker === targetTicker);
                        if (match) {
                            if (msg.price) match.price = msg.price;
                            if (msg.change) match.change = msg.change;
                            if (msg.rsi) match.rsi = msg.rsi;
                            if (msg.nw) match.nw = msg.nw;
                            if (msg.cci) match.cci = msg.cci;
                            if (msg.stch) match.stch = msg.stch;
                            renderTable(targetTicker, msg.change || 0);
                        }
                    }
                } catch (e) {
                    // Ignore non-json or ping frames
                }
            };

            ws.onerror = () => {
                window._realWsConnected = false;
            };

            ws.onclose = () => {
                window._realWsConnected = false;
                setTimeout(connect, 3000);
            };
        } catch (e) {
            window._realWsConnected = false;
            setTimeout(connect, 3000);
        }
    }

    connect();
}

// Закрытие выпадающих меню при клике вне них
document.addEventListener('click', (e) => {
    if (!e.target.closest('#dropdown-assets-wrap')) {
        document.getElementById('btn-assets-select')?.classList.remove('open');
        document.getElementById('menu-assets-select')?.classList.remove('open');
    }
    if (!e.target.closest('#dropdown-strategy-wrap')) {
        document.getElementById('btn-strategy-select')?.classList.remove('open');
        document.getElementById('menu-strategy-select')?.classList.remove('open');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    renderTable();
    setInterval(simulateLiveStreamTick, 1600);
    initBackendWebSocket();
});


// Expose handlers to window for HTML onclick attributes
Object.assign(window, {
    selectTimeframe,
    toggleDropdown,
    selectAssetFilter,
    selectStrategyMode,
    toggleIndicatorChip,
    toggleServerConnection,
    setSortColumn,
    clearSearchInput,
    minimizeOrResetWidget,
    openSettingsModal,
    closeSettingsModal,
    closeSettingsOnBackdrop,
    switchSettingsTab,
    updateVolumeDaysSetting,
    applySettingsFromModal,
    resetSettingsDefaults,
    simulateLiveStreamTick,
    triggerMarketPulse,
    toggleTheme,
    toggleCondensed,
    toggleContrast,
    cycleLinkGroupColor,
    toggleEditFavoritesMode,
    toggleFavoriteItem,
    renderTable
});
