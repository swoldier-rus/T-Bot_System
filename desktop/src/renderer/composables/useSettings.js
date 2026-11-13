import { ref, reactive, watch } from 'vue';

const STORAGE_KEY = 'moex_screener_settings';

export const DEFAULT_TABLE_COLUMNS = [
  { id: 'price', label: 'Цена/Изм', visible: true, hint: 'Текущая цена последней сделки и процентное изменение цены за торговую сессию.' },
  { id: 'volume', label: 'Объем', visible: true, hint: 'Дневной торговый объем в млн руб. и процентное отклонение от среднего объема за выбранный период.' },
  { id: 'rsi', label: 'RSI', visible: true, hint: 'Индекс относительной силы (Relative Strength Index). Сигналы перекупленности и перепроданности.' },
  { id: 'nw', label: 'NWE', visible: true, hint: 'Конверт Надарая-Ватсона (Nadaraya-Watson Envelope) с фильтрацией тренда и отскоков.' },
  { id: 'cci', label: 'CCI', visible: true, hint: 'Индекс товарного канала (Commodity Channel Index). Определение циклических экстремумов.' },
  { id: 'stch', label: 'Stoch', visible: true, hint: 'Стохастический осциллятор (%K / %D). Опережающие сигналы разворота импульса.' },
  { id: 'status', label: 'Статус', visible: true, hint: 'Итоговый сигнал стратегии (BUY / SELL / NEUTRAL) с перечислением подтверждающих индикаторов.' },
];

function loadColumns(savedColumns) {
  if (!Array.isArray(savedColumns) || savedColumns.length === 0) {
    return DEFAULT_TABLE_COLUMNS.map(c => ({ ...c }));
  }
  const defaultMap = new Map(DEFAULT_TABLE_COLUMNS.map(c => [c.id, c]));
  const result = [];
  const seenIds = new Set();

  for (const col of savedColumns) {
    if (col && col.id && defaultMap.has(col.id)) {
      const def = defaultMap.get(col.id);
      result.push({
        id: col.id,
        label: def.label,
        hint: def.hint,
        visible: typeof col.visible === 'boolean' ? col.visible : true,
      });
      seenIds.add(col.id);
    }
  }

  for (const def of DEFAULT_TABLE_COLUMNS) {
    if (!seenIds.has(def.id)) {
      result.push({ ...def });
    }
  }
  return result;
}

const DEFAULT_SETTINGS = {
  volumeDaysX: 20,
  thresholds: {
    rsiLow: 30,
    rsiHigh: 70,
    cciLow: -100,
    cciHigh: 100,
    stchLow: 20,
    stchHigh: 80,
  },
  indicatorParams: {
    rsiPeriod: 14,
    stochK: 14,
    stochSmooth: 3,
    stochD: 3,
    nwBandwidth: 8.0,
    nwMult: 3.0,
    nwRepaint: true,
    cciPeriod: 20,
  },
  theme: 'night',
  condensed: false,
  contrast: false,
  soundAlerts: false,
  tableColumns: DEFAULT_TABLE_COLUMNS.map(c => ({ ...c })),
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(parsed.thresholds || {}) },
        indicatorParams: { ...DEFAULT_SETTINGS.indicatorParams, ...(parsed.indicatorParams || {}) },
        tableColumns: loadColumns(parsed.tableColumns),
      };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return {
    ...DEFAULT_SETTINGS,
    thresholds: { ...DEFAULT_SETTINGS.thresholds },
    indicatorParams: { ...DEFAULT_SETTINGS.indicatorParams },
    tableColumns: DEFAULT_TABLE_COLUMNS.map(c => ({ ...c })),
  };
}

const settings = reactive(loadSettings());

function applyDomTheme() {
  const html = document.documentElement;
  html.setAttribute('data-theme', settings.theme);
  html.setAttribute('data-condensed', settings.condensed ? 'true' : 'false');
  html.setAttribute('data-contrast', settings.contrast ? 'true' : 'false');
}

// Initial apply
applyDomTheme();

// Sync indicator parameters with backend on boot
async function syncFromBackend() {
  try {
    const hasLocalSettings = !!localStorage.getItem(STORAGE_KEY);
    if (hasLocalSettings) {
      // Local settings exist -> push client's saved configuration to backend
      await fetch('http://127.0.0.1:3001/config/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rvolDays: settings.volumeDaysX,
          rsiPeriod: settings.indicatorParams.rsiPeriod,
          rsiOversold: settings.thresholds.rsiLow,
          rsiOverbought: settings.thresholds.rsiHigh,
          stochK: settings.indicatorParams.stochK,
          stochSmooth: settings.indicatorParams.stochSmooth,
          stochD: settings.indicatorParams.stochD,
          stochOversold: settings.thresholds.stchLow,
          stochOverbought: settings.thresholds.stchHigh,
          cciPeriod: settings.indicatorParams.cciPeriod,
          cciOversold: settings.thresholds.cciLow,
          cciOverbought: settings.thresholds.cciHigh,
          nwBandwidth: settings.indicatorParams.nwBandwidth,
          nwMult: settings.indicatorParams.nwMult,
          nwRepaint: settings.indicatorParams.nwRepaint,
        })
      });
      return;
    }

    const res = await fetch('http://127.0.0.1:3001/config/indicators');
    if (res.ok) {
      const data = await res.json();
      if (data && data.params) {
        const p = data.params;
        if (typeof p.rvolDays === 'number') settings.volumeDaysX = p.rvolDays;
        if (typeof p.rsiPeriod === 'number') settings.indicatorParams.rsiPeriod = p.rsiPeriod;
        if (typeof p.rsiOversold === 'number') settings.thresholds.rsiLow = p.rsiOversold;
        if (typeof p.rsiOverbought === 'number') settings.thresholds.rsiHigh = p.rsiOverbought;
        if (typeof p.stochK === 'number') settings.indicatorParams.stochK = p.stochK;
        if (typeof p.stochSmooth === 'number') settings.indicatorParams.stochSmooth = p.stochSmooth;
        if (typeof p.stochD === 'number') settings.indicatorParams.stochD = p.stochD;
        if (typeof p.stochOversold === 'number') settings.thresholds.stchLow = p.stochOversold;
        if (typeof p.stochOverbought === 'number') settings.thresholds.stchHigh = p.stochOverbought;
        if (typeof p.cciPeriod === 'number') settings.indicatorParams.cciPeriod = p.cciPeriod;
        if (typeof p.cciOversold === 'number') settings.thresholds.cciLow = p.cciOversold;
        if (typeof p.cciOverbought === 'number') settings.thresholds.cciHigh = p.cciOverbought;
        if (typeof p.nwBandwidth === 'number') settings.indicatorParams.nwBandwidth = p.nwBandwidth;
        if (typeof p.nwMult === 'number') settings.indicatorParams.nwMult = p.nwMult;
        if (typeof p.nwRepaint === 'boolean') settings.indicatorParams.nwRepaint = p.nwRepaint;
      }
    }
  } catch (e) {}
}
syncFromBackend();

export function useSettings() {
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error persisting settings', e);
    }
    applyDomTheme();

    // Async sync with analytical backend
    try {
      fetch('http://127.0.0.1:3001/config/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rvolDays: settings.volumeDaysX,
          rsiPeriod: settings.indicatorParams.rsiPeriod,
          rsiOversold: settings.thresholds.rsiLow,
          rsiOverbought: settings.thresholds.rsiHigh,
          stochK: settings.indicatorParams.stochK,
          stochSmooth: settings.indicatorParams.stochSmooth,
          stochD: settings.indicatorParams.stochD,
          stochOversold: settings.thresholds.stchLow,
          stochOverbought: settings.thresholds.stchHigh,
          cciPeriod: settings.indicatorParams.cciPeriod,
          cciOversold: settings.thresholds.cciLow,
          cciOverbought: settings.thresholds.cciHigh,
          nwBandwidth: settings.indicatorParams.nwBandwidth,
          nwMult: settings.indicatorParams.nwMult,
          nwRepaint: settings.indicatorParams.nwRepaint,
        })
      }).catch(() => {});
    } catch (e) {}
  }

  function resetDefaults() {
    settings.volumeDaysX = DEFAULT_SETTINGS.volumeDaysX;
    settings.thresholds = { ...DEFAULT_SETTINGS.thresholds };
    settings.indicatorParams = { ...DEFAULT_SETTINGS.indicatorParams };
    settings.theme = DEFAULT_SETTINGS.theme;
    settings.condensed = DEFAULT_SETTINGS.condensed;
    settings.contrast = DEFAULT_SETTINGS.contrast;
    settings.soundAlerts = DEFAULT_SETTINGS.soundAlerts;
    settings.tableColumns = DEFAULT_TABLE_COLUMNS.map(c => ({ ...c }));
    persist();
  }

  function toggleTheme() {
    settings.theme = settings.theme === 'night' ? 'light' : 'night';
    persist();
  }

  function toggleCondensed() {
    settings.condensed = !settings.condensed;
    persist();
  }

  function toggleContrast() {
    settings.contrast = !settings.contrast;
    persist();
  }

  return {
    settings,
    persist,
    resetDefaults,
    toggleTheme,
    toggleCondensed,
    toggleContrast,
  };
}
