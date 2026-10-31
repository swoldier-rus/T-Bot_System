<template>
  <div class="pro-widget-shell" id="screener-widget">
    <!-- 1. Header -->
    <ScreenerHeader
      :timeframe="timeframe"
      :total-count="counts.total"
      v-model:search-query="searchQuery"
      :edit-favorites-mode="editFavoritesMode"
      :link-group-color="linkGroupColor"
      @cycle-color="cycleLinkGroupColor"
      @toggle-edit-favorites="toggleEditFavoritesMode"
      @open-settings="isSettingsOpen = true"
    />

    <!-- 2. Toolbar -->
    <ScreenerToolbar
      :timeframe="timeframe"
      :asset-filter="assetFilter"
      :strategy-mode="strategyMode"
      :use-c-c-i="useCCI"
      :use-s-t-c-h="useSTCH"
      :server-online="serverOnline"
      :server-ping-label="serverPingLabel"
      @update:timeframe="selectTimeframe"
      @update:asset-filter="assetFilter = $event"
      @update:strategy-mode="strategyMode = $event"
      @update:use-c-c-i="useCCI = $event"
      @update:use-s-t-c-h="useSTCH = $event"
      @toggle-server="toggleServerConnection"
    />

    <!-- 3. Table -->
    <ScreenerTable
      :rows="filteredAndSortedRows"
      :sort-by="sortBy"
      :sort-desc="sortDesc"
      :use-c-c-i="useCCI"
      :use-s-t-c-h="useSTCH"
      :volume-days-x="settings.volumeDaysX"
      :edit-favorites-mode="editFavoritesMode"
      :is-favorite="isFavorite"
      @sort="setSortColumn"
      @reset-filters="resetFilters"
      @toggle-favorite="toggleFavorite"
    />

    <!-- 4. Footer -->
    <ScreenerFooter
      :buy-count="counts.buy"
      :sell-count="counts.sell"
      :neutral-count="counts.neutral"
      :thresholds="settings.thresholds"
      :volume-days-x="settings.volumeDaysX"
    />

    <!-- 5. Settings Modal -->
    <SettingsModal
      :is-open="isSettingsOpen"
      :volume-days-x="settings.volumeDaysX"
      :thresholds="settings.thresholds"
      :theme="settings.theme"
      :condensed="settings.condensed"
      :contrast="settings.contrast"
      @close="isSettingsOpen = false"
      @save="handleSaveSettings"
      @reset="resetDefaults"
      @toggle-theme="toggleTheme"
      @toggle-condensed="toggleCondensed"
      @toggle-contrast="toggleContrast"
      @trigger-pulse="triggerMarketPulse"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ScreenerHeader from './ScreenerHeader.vue';
import ScreenerToolbar from './ScreenerToolbar.vue';
import ScreenerTable from './table/ScreenerTable.vue';
import ScreenerFooter from './ScreenerFooter.vue';
import SettingsModal from './SettingsModal.vue';

import { useScreenerState } from '@/composables/useScreenerState';
import { useFavorites } from '@/composables/useFavorites';
import { useSettings } from '@/composables/useSettings';
import { useWebSocket } from '@/composables/useWebSocket';

const isSettingsOpen = ref(false);

const {
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
} = useScreenerState();

const { isFavorite, toggleFavorite } = useFavorites();
const {
  settings,
  persist,
  resetDefaults,
  toggleTheme,
  toggleCondensed,
  toggleContrast,
} = useSettings();

const {
  serverOnline,
  serverPingLabel,
  toggleServerConnection,
  start,
  stop,
} = useWebSocket();

function handleSaveSettings(newSettings) {
  settings.volumeDaysX = newSettings.volumeDaysX;
  settings.thresholds = { ...newSettings.thresholds };
  persist();
}

function triggerMarketPulse() {
  instruments.forEach(item => {
    const impulse = (Math.random() - 0.45) * 1.8;
    item.price = Math.max(1, Number((item.price * (1 + impulse / 100)).toFixed(2)));
    item.change = Number((item.change + impulse * 0.5).toFixed(2));
    item.volDiffBase = Number((item.volDiffBase + Math.abs(impulse) * 14).toFixed(1));
  });
}

onMounted(() => {
  start();
});

onUnmounted(() => {
  stop();
});
</script>
