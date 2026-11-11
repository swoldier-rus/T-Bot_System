import { ref, computed, reactive } from 'vue';
import { useFavorites } from './useFavorites';
import { useSettings } from './useSettings';

const initialInstruments = [
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
  { ticker: 'MOEX', fullName: 'Московская Биржа ПАО', color: '#E11D48', bluechip: false, price: 218.70, change: -1.62, volDiffBase: 19.8, volRubMln: 8900, rsi: 71.5, nw: 'SELL', cci: 112, stch: 79.2 },
];

const BLUE_CHIPS = new Set([
  'SBER', 'SBERP', 'GAZP', 'LKOH', 'GMKN', 'NVTK', 'YDEX', 'YNDX', 'ROSN',
  'MGNT', 'TATN', 'TATNP', 'MTSS', 'CHMF', 'NLMK', 'MAGN', 'ALRS', 'PLZL',
  'IRAO', 'VTBR', 'SNGS', 'SNGSP', 'TRNFP', 'MOEX', 'AFLT', 'PHOR', 'T', 'SVCB'
]);

const TF_MAP = {
  '1м': '5m',
  '5м': '5m',
  '15м': '15m',
  '1ч': '1h',
  '4ч': '4h',
  'Д': '1d',
};

function applyTimeframe(item, tfLabel) {
  if (!item || !item.tf) return;
  const tfKey = TF_MAP[tfLabel] || '15m';
  const d = item.tf[tfKey];
  if (!d) return;

  if (typeof d.rsi === 'number') {
    item.rsi = Number(d.rsi.toFixed(1));
  }
  if (typeof d.k === 'number') {
    item.stch = Number(d.k.toFixed(1));
  }
  if (typeof d.d === 'number') {
    item.stchD = Number(d.d.toFixed(1));
  }
  if (typeof d.cci === 'number') {
    item.cci = Math.round(d.cci);
  }
  if (d.nw && d.nw.signal) {
    item.nw = d.nw.signal;
  }
}

export function upsertBackendStocks(stockList) {
  if (!Array.isArray(stockList) || stockList.length === 0) return;
  const currentTf = timeframe.value;

  stockList.forEach(raw => {
    let match = instruments.find(i => i.ticker === raw.ticker);
    const isBluechip = BLUE_CHIPS.has(raw.ticker);
    const logoColor = raw.logoColor || '#336FEE';

    if (!match) {
      match = reactive({
        ticker: raw.ticker,
        fullName: raw.description || raw.name || raw.ticker,
        color: logoColor,
        logoUrl: raw.logoUrl || '',
        logoColor: logoColor,
        textDark: false,
        bluechip: isBluechip,
        price: raw.price || 0,
        change: raw.change || 0,
        volDiffBase: raw.rvol ? Math.round((raw.rvol - 1.0) * 100) : 0,
        volRubMln: raw.vol ? Math.round(raw.vol * (raw.price || 1) / 1000000) : 0,
        rsi: 50,
        nw: 'NEUTRAL',
        cci: 0,
        stch: 50,
        stchD: 50,
        tf: raw.tf || {},
      });
      applyTimeframe(match, currentTf);
      instruments.push(match);
    } else {
      if (raw.price !== undefined) match.price = raw.price;
      if (raw.change !== undefined) match.change = raw.change;
      if (raw.logoUrl) match.logoUrl = raw.logoUrl;
      if (raw.logoColor) match.logoColor = raw.logoColor;
      if (raw.description) match.fullName = raw.description;
      if (raw.rvol !== undefined) match.volDiffBase = Math.round((raw.rvol - 1.0) * 100);
      if (raw.vol !== undefined) match.volRubMln = Math.round(raw.vol * (raw.price || match.price || 1) / 1000000);
      if (raw.tf) {
        match.tf = { ...match.tf, ...raw.tf };
      }
      applyTimeframe(match, currentTf);
    }
  });
}

export function updateSingleStock(raw) {
  if (!raw || !raw.ticker) return;
  let match = instruments.find(i => i.ticker === raw.ticker);
  if (!match) return;

  if (raw.price !== undefined) match.price = raw.price;
  if (raw.change !== undefined) match.change = raw.change;
  if (raw.rvol !== undefined) match.volDiffBase = Math.round((raw.rvol - 1.0) * 100);
  if (raw.vol !== undefined) match.volRubMln = Math.round(raw.vol * (raw.price || match.price || 1) / 1000000);
  if (raw.tf) {
    match.tf = { ...match.tf, ...raw.tf };
  }
  applyTimeframe(match, timeframe.value);
}

const instruments = reactive(JSON.parse(JSON.stringify(initialInstruments)));
const timeframe = ref('15м');
const assetFilter = ref('all');
const strategyMode = ref('rsi_nw');
const useCCI = ref(true);
const useSTCH = ref(true);
const searchQuery = ref('');
const sortBy = ref('statusScore');
const sortDesc = ref(true);
const editFavoritesMode = ref(false);

const groupColors = ['#336FEE', '#FFDD2D', '#2CE89C', '#FF6969', '#A855F7'];
const groupColorIdx = ref(0);
const linkGroupColor = computed(() => groupColors[groupColorIdx.value]);

const lastNotified = {};

export function useScreenerState() {
  const { favorites } = useFavorites();
  const { settings } = useSettings();

  function cycleLinkGroupColor() {
    groupColorIdx.value = (groupColorIdx.value + 1) % groupColors.length;
  }

  function toggleEditFavoritesMode() {
    editFavoritesMode.value = !editFavoritesMode.value;
  }

  function setSortColumn(col) {
    if (sortBy.value === col) {
      sortDesc.value = !sortDesc.value;
    } else {
      sortBy.value = col;
      sortDesc.value = true;
    }
  }

  function selectTimeframe(tf) {
    timeframe.value = tf;
    instruments.forEach(item => {
      applyTimeframe(item, tf);
    });
  }

  function resetFilters() {
    assetFilter.value = 'all';
    strategyMode.value = 'rsi_nw';
    useCCI.value = true;
    useSTCH.value = true;
    searchQuery.value = '';
  }

  function evaluateSignals(item) {
    const t = settings.thresholds;
    const rsiSignal = item.rsi <= t.rsiLow ? 1 : (item.rsi >= t.rsiHigh ? -1 : 0);
    const nwSignal = item.nw === 'BUY' ? 1 : (item.nw === 'SELL' ? -1 : 0);
    const cciSignal = item.cci <= t.cciLow ? 1 : (item.cci >= t.cciHigh ? -1 : 0);
    const stchSignal = item.stch <= t.stchLow ? 1 : (item.stch >= t.stchHigh ? -1 : 0);

    const activeVotes = [];
    const reasons = [];

    if (strategyMode.value === 'rsi_only') {
      activeVotes.push(rsiSignal * 2);
      if (rsiSignal !== 0) reasons.push(`RSI (${item.rsi.toFixed(1)})`);
    } else if (strategyMode.value === 'nw_only') {
      activeVotes.push(nwSignal * 2);
      if (nwSignal !== 0) reasons.push(`NW (${item.nw === 'BUY' ? 'Покупка' : 'Продажа'})`);
    } else {
      activeVotes.push(rsiSignal);
      activeVotes.push(nwSignal);
      if (rsiSignal !== 0) reasons.push(`RSI (${item.rsi.toFixed(1)})`);
      if (nwSignal !== 0) reasons.push(`NW (${item.nw === 'BUY' ? 'Покупка' : 'Продажа'})`);
    }

    if (useCCI.value) {
      activeVotes.push(cciSignal);
      if (cciSignal !== 0) reasons.push(`CCI (${item.cci > 0 ? '+' + item.cci : item.cci})`);
    }
    if (useSTCH.value) {
      activeVotes.push(stchSignal);
      if (stchSignal !== 0) reasons.push(`STCH (${item.stch.toFixed(1)})`);
    }

    const buyVotes = activeVotes.filter(v => v > 0).length;
    const sellVotes = activeVotes.filter(v => v < 0).length;
    const totalScore = activeVotes.reduce((acc, v) => acc + v, 0);

    let finalStatus = 'NEUTRAL';
    if (strategyMode.value === 'rsi_or_nw') {
      if ((rsiSignal > 0 || nwSignal > 0) && sellVotes === 0) finalStatus = 'BUY';
      else if ((rsiSignal < 0 || nwSignal < 0) && buyVotes === 0) finalStatus = 'SELL';
    } else {
      if (totalScore >= 2 || (buyVotes >= 2 && sellVotes === 0)) finalStatus = 'BUY';
      else if (totalScore <= -2 || (sellVotes >= 2 && buyVotes === 0)) finalStatus = 'SELL';
    }

    const dayFactor = 20 / settings.volumeDaysX;
    const volumeDiff = Number((item.volDiffBase * Math.pow(dayFactor, 0.35)).toFixed(1));

    // Native notification trigger
    const now = Date.now();
    if (finalStatus !== 'NEUTRAL') {
      const lastTime = lastNotified[item.ticker] || 0;
      if (now - lastTime > 60000) {
        lastNotified[item.ticker] = now;
        if (typeof window.triggerDesktopAlert === 'function') {
          const actionText = finalStatus === 'BUY' ? '🟢 ПОКУПКА' : '🔴 ПРОДАЖА';
          window.triggerDesktopAlert(
            `${actionText}: ${item.ticker} (${item.price.toFixed(2)} ₽)`,
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
      volumeDiff,
    };
  }

  const enrichedRows = computed(() => {
    return instruments.map(item => ({
      ...item,
      ...evaluateSignals(item),
    }));
  });

  const filteredAndSortedRows = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const favSet = favorites.value;

    let res = enrichedRows.value.filter(row => {
      if (q && !row.ticker.toLowerCase().includes(q) && !row.fullName.toLowerCase().includes(q)) {
        return false;
      }
      if (assetFilter.value === 'favorites') {
        if (!favSet.has(row.ticker)) return false;
      }
      if (assetFilter.value === 'bluechips' && !row.bluechip) return false;
      return true;
    });

    res.sort((a, b) => {
      let valA = a[sortBy.value];
      let valB = b[sortBy.value];
      if (sortBy.value === 'ticker') {
        return sortDesc.value ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      if (sortBy.value === 'nw') {
        valA = a.nwSignal;
        valB = b.nwSignal;
      }
      return sortDesc.value ? (valB - valA) : (valA - valB);
    });

    return res;
  });

  const counts = computed(() => {
    let buy = 0;
    let sell = 0;
    let neutral = 0;
    filteredAndSortedRows.value.forEach(r => {
      if (r.finalStatus === 'BUY') buy++;
      else if (r.finalStatus === 'SELL') sell++;
      else neutral++;
    });
    return {
      total: filteredAndSortedRows.value.length,
      buy,
      sell,
      neutral,
    };
  });

  function getActiveTickers() {
    const visible = filteredAndSortedRows.value.slice(0, 60).map(r => r.ticker);
    return visible.length > 0 ? visible : ['SBER', 'GAZP', 'LKOH', 'GMKN', 'NVTK'];
  }

  return {
    instruments,
    timeframe,
    assetFilter,
    strategyMode,
    useCCI,
    useSTCH,
    searchQuery,
    sortBy,
    sortDesc,
    editFavoritesMode,
    linkGroupColor,
    filteredAndSortedRows,
    counts,
    selectTimeframe,
    setSortColumn,
    resetFilters,
    cycleLinkGroupColor,
    toggleEditFavoritesMode,
    getActiveTickers,
  };
}
