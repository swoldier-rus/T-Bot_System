import { ref, reactive, watch } from 'vue';

const STORAGE_KEY = 'moex_screener_settings';

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
  theme: 'night',
  condensed: false,
  contrast: false,
  soundAlerts: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return { ...DEFAULT_SETTINGS };
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

// Fetch initial indicator thresholds from backend
async function syncFromBackend() {
  try {
    const res = await fetch('http://127.0.0.1:3001/config/indicators');
    if (res.ok) {
      const data = await res.json();
      if (data && data.params) {
        const p = data.params;
        if (typeof p.rvolDays === 'number') settings.volumeDaysX = p.rvolDays;
        if (typeof p.rsiOversold === 'number') settings.thresholds.rsiLow = p.rsiOversold;
        if (typeof p.rsiOverbought === 'number') settings.thresholds.rsiHigh = p.rsiOverbought;
        if (typeof p.stochOversold === 'number') settings.thresholds.stchLow = p.stochOversold;
        if (typeof p.stochOverbought === 'number') settings.thresholds.stchHigh = p.stochOverbought;
        if (typeof p.cciOversold === 'number') settings.thresholds.cciLow = p.cciOversold;
        if (typeof p.cciOverbought === 'number') settings.thresholds.cciHigh = p.cciOverbought;
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
          rsiOversold: settings.thresholds.rsiLow,
          rsiOverbought: settings.thresholds.rsiHigh,
          stochOversold: settings.thresholds.stchLow,
          stochOverbought: settings.thresholds.stchHigh,
          cciOversold: settings.thresholds.cciLow,
          cciOverbought: settings.thresholds.cciHigh,
        })
      }).catch(() => {});
    } catch (e) {}
  }

  function resetDefaults() {
    settings.volumeDaysX = DEFAULT_SETTINGS.volumeDaysX;
    settings.thresholds = { ...DEFAULT_SETTINGS.thresholds };
    settings.theme = DEFAULT_SETTINGS.theme;
    settings.condensed = DEFAULT_SETTINGS.condensed;
    settings.contrast = DEFAULT_SETTINGS.contrast;
    settings.soundAlerts = DEFAULT_SETTINGS.soundAlerts;
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
