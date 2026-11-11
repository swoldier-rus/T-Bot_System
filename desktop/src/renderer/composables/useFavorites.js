import { ref } from 'vue';

const STORAGE_KEY = 'moex_screener_favorites';
const STORAGE_KEY_TBANK = 'moex_screener_tbank_favorites';
const DEFAULT_FAVORITES = ['SBER', 'GAZP', 'LKOH', 'GMKN', 'ROSN', 'NVTK', 'YDEX', 'T'];

function loadInitialFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.error('Failed to parse favorites from storage', e);
  }
  return new Set(DEFAULT_FAVORITES);
}

function loadInitialTBankFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TBANK);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch (e) {
    console.error('Failed to parse T-Bank favorites from storage', e);
  }
  return new Set();
}

// Global shared state across components
const favorites = ref(loadInitialFavorites());
const tbankFavorites = ref(loadInitialTBankFavorites());
const tbankFavoritesLoading = ref(false);

export function useFavorites() {
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites.value)));
    } catch (e) {
      console.error('Failed to save favorites to storage', e);
    }
  }

  function persistTBank() {
    try {
      localStorage.setItem(STORAGE_KEY_TBANK, JSON.stringify(Array.from(tbankFavorites.value)));
    } catch (e) {
      console.error('Failed to save T-Bank favorites to storage', e);
    }
  }

  function toggleFavorite(ticker) {
    const next = new Set(favorites.value);
    if (next.has(ticker)) {
      next.delete(ticker);
    } else {
      next.add(ticker);
    }
    favorites.value = next;
    persist();
  }

  function isFavorite(ticker) {
    return favorites.value.has(ticker);
  }

  function getFavoritesArray() {
    return Array.from(favorites.value);
  }

  function setTBankFavorites(tickers) {
    if (!Array.isArray(tickers)) return;
    tbankFavorites.value = new Set(tickers.map((t) => String(t).toUpperCase()));
    persistTBank();
  }

  function isTBankFavorite(ticker) {
    return tbankFavorites.value.has(ticker);
  }

  function getTBankFavoritesArray() {
    return Array.from(tbankFavorites.value);
  }

  async function fetchTBankFavorites(port = 3001) {
    if (tbankFavoritesLoading.value) return;
    tbankFavoritesLoading.value = true;
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/api/favorites`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.tickers) && data.tickers.length > 0) {
          setTBankFavorites(data.tickers);
        }
      }
    } catch (err) {
      console.warn('Could not fetch T-Bank favorites via REST:', err?.message || err);
    } finally {
      tbankFavoritesLoading.value = false;
    }
  }

  return {
    favorites,
    tbankFavorites,
    tbankFavoritesLoading,
    toggleFavorite,
    isFavorite,
    getFavoritesArray,
    setTBankFavorites,
    isTBankFavorite,
    getTBankFavoritesArray,
    fetchTBankFavorites,
  };
}
