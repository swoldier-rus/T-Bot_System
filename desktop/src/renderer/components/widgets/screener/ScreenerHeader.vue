<template>
  <div class="pro-widget-header">
    <!-- Left: Link group dot + Title + TF Badge + Paper counter -->
    <div class="flex items-center gap-2.5 min-w-0 no-drag">
      <button
        type="button"
        @click="$emit('cycleColor')"
        class="w-3.5 h-3.5 rounded-full ring-2 shrink-0 cursor-pointer border-none transition"
        :style="{ backgroundColor: linkGroupColor, '--tw-ring-color': linkGroupColor + '4D' }"
        title="Группа связки виджета (кликните для смены цвета)"
      ></button>

      <span class="font-semibold text-[13px] tracking-tight truncate" style="color: var(--text-primary);">
        RSI + Nadaraya-Watson
      </span>

      <span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[rgba(51,111,238,0.18)] text-[#62A1FF]">
        {{ timeframe }}
      </span>

      <span
        class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[rgba(112,139,164,0.14)]"
        style="color: var(--text-secondary);"
      >
        Бумаг: <strong class="text-white tabular-nums">{{ totalCount }}</strong>
      </span>
    </div>

    <!-- Right: Search + Edit Favs + Settings + Electron Window Controls -->
    <div class="flex items-center gap-1.5 no-drag">
      <UiSearchInput
        :model-value="searchQuery"
        @update:model-value="$emit('update:searchQuery', $event)"
      />

      <!-- Edit Favorites Mode Toggle -->
      <button
        type="button"
        @click="$emit('toggleEditFavorites')"
        class="h-[26px] px-2 rounded flex items-center gap-1.5 text-[12px] font-medium transition cursor-pointer border border-transparent"
        :class="editFavoritesMode
          ? '!bg-[#336FEE] !text-white !border-[#428BF9]'
          : 'bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)]'"
        :title="editFavoritesMode ? 'Сохранить выбор избранных и скрыть чекбоксы' : 'Выбрать избранные инструменты (чекбоксы)'"
      >
        <svg class="w-3.5 h-3.5" style="color: var(--icon-primary);" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="hidden sm:inline">{{ editFavoritesMode ? 'Готово' : 'Изменить' }}</span>
      </button>

      <!-- Settings button -->
      <button
        type="button"
        @click="$emit('openSettings')"
        class="h-[26px] px-2 rounded flex items-center gap-1.5 text-[12px] font-medium bg-transparent hover:bg-[rgba(112,139,164,0.20)] transition cursor-pointer border-none"
        style="color: var(--text-secondary);"
        title="Настройки индикаторов, периода объема и внешнего вида"
      >
        <svg class="w-3.5 h-3.5" style="color: var(--icon-primary);" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span class="hidden sm:inline">настройки</span>
      </button>

      <!-- Divider -->
      <div class="h-4 w-[1px] bg-[rgba(140,167,190,0.18)] mx-0.5"></div>

      <!-- Electron window buttons -->
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="window-control-btn"
          title="Свернуть"
          @click="minimizeWindow"
        >
          &#8212;
        </button>
        <button
          type="button"
          class="window-control-btn"
          :title="isMaximized ? 'Восстановить окно' : 'Развернуть'"
          @click="maximizeWindow"
        >
          <span v-if="isMaximized">&#10697;</span>
          <span v-else>&#9633;</span>
        </button>
        <button
          type="button"
          class="window-control-btn"
          :title="isFullscreen ? 'Обычный режим (Esc)' : 'Полный экран'"
          @click="toggleFullscreen"
        >
          <span v-if="isFullscreen">&#10530;</span>
          <span v-else>&#9974;</span>
        </button>
        <button
          type="button"
          class="window-control-btn close-btn"
          title="Свернуть в трей"
          @click="closeWindow"
        >
          &#10005;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';

defineProps({
  timeframe: {
    type: String,
    default: '15м',
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  editFavoritesMode: {
    type: Boolean,
    default: false,
  },
  linkGroupColor: {
    type: String,
    default: '#336FEE',
  },
});

defineEmits([
  'cycleColor',
  'update:searchQuery',
  'toggleEditFavorites',
  'openSettings',
]);

const isMaximized = ref(false);
const isFullscreen = ref(false);
let cleanupStateListener = null;

onMounted(() => {
  if (typeof window.electronAPI !== 'undefined') {
    if (window.electronAPI.isMaximized) {
      window.electronAPI.isMaximized().then(val => { isMaximized.value = !!val; }).catch(() => {});
    }
    if (window.electronAPI.isFullscreen) {
      window.electronAPI.isFullscreen().then(val => { isFullscreen.value = !!val; }).catch(() => {});
    }
    if (window.electronAPI.onWindowStateChange) {
      cleanupStateListener = window.electronAPI.onWindowStateChange((state) => {
        if (typeof state.isMaximized === 'boolean') isMaximized.value = state.isMaximized;
        if (typeof state.isFullscreen === 'boolean') isFullscreen.value = state.isFullscreen;
      });
    }
  }
});

onUnmounted(() => {
  if (cleanupStateListener) cleanupStateListener();
});

function minimizeWindow() {
  if (window.electronAPI?.minimize) window.electronAPI.minimize();
}

function maximizeWindow() {
  if (window.electronAPI?.maximize) window.electronAPI.maximize();
}

function toggleFullscreen() {
  if (window.electronAPI?.toggleFullscreen) window.electronAPI.toggleFullscreen();
}

function closeWindow() {
  if (window.electronAPI?.close) window.electronAPI.close();
}
</script>
