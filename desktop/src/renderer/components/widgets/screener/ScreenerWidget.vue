<template>
  <div class="pro-widget-shell" id="screener-widget">
    <!-- 1. Header -->
    <ScreenerHeader
      :timeframe="timeframe"
      :total-count="counts.filtered"
      v-model:search-query="searchQuery"
      :edit-favorites-mode="editFavoritesMode"
      :link-group-color="linkGroupColor"
      :link-group-tooltip="linkGroupTooltip"
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
      :row-flash-map="rowFlashMap"
      :sort-by="sortBy"
      :sort-desc="sortDesc"
      :strategy-mode="strategyMode"
      :use-c-c-i="useCCI"
      :use-s-t-c-h="useSTCH"
      :volume-days-x="settings.volumeDaysX"
      :columns="settings.tableColumns"
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
      :indicator-params="settings.indicatorParams"
      :table-columns="settings.tableColumns"
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
  rowFlashMap,
  editFavoritesMode,
  linkGroupColor,
  linkGroupTooltip,
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
  realConnected,
  serverPingLabel,
  toggleServerConnection,
  syncFavoritesWithBackend,
  start: startWS,
  stop: stopWS,
} = useWebSocket();

function handleSaveSettings(newSettings) {
  if (typeof newSettings.volumeDaysX === 'number') settings.volumeDaysX = newSettings.volumeDaysX;
  if (newSettings.thresholds) settings.thresholds = { ...newSettings.thresholds };
  if (newSettings.indicatorParams) settings.indicatorParams = { ...newSettings.indicatorParams };
  if (Array.isArray(newSettings.tableColumns)) settings.tableColumns = newSettings.tableColumns;
  persist();
  isSettingsOpen.value = false;
}

function triggerMarketPulse() {
  const pulseEl = document.getElementById('screener-widget');
  if (pulseEl) {
    pulseEl.classList.add('widget-pulse');
    setTimeout(() => pulseEl.classList.remove('widget-pulse'), 1200);
  }
}

onMounted(() => {
  startWS();
});

onUnmounted(() => {
  stopWS();
});
</script>
