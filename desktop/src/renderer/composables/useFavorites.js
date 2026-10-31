import { ref } from 'vue';

const STORAGE_KEY = 'moex_screener_favorites';
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

// Global shared state across components
const favorites = ref(loadInitialFavorites());

export function useFavorites() {
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites.value)));
    } catch (e) {
      console.error('Failed to save favorites to storage', e);
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

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoritesArray,
  };
}
