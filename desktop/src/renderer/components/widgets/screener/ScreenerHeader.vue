<template>
  <div class="pro-widget-header select-none transition-all" @dblclick="handleHeaderDblClick">
    <!-- Left: Link group dot + Title + TF Badge + Paper counter -->
    <div class="flex items-center gap-2 min-w-0 no-drag">
      <button
        type="button"
        @click="$emit('cycleColor')"
        class="rounded-full ring-2 shrink-0 cursor-pointer border-none transition"
        :class="condensed ? 'w-3 h-3' : 'w-3.5 h-3.5'"
        :style="{ backgroundColor: linkGroupColor, '--tw-ring-color': linkGroupColor + '4D' }"
        :title="linkGroupTooltip"
      ></button>

      <!-- Title & Badges: Hidden in compact mode -->
      <template v-if="!condensed">
        <span class="font-semibold text-[13px] tracking-tight truncate max-w-[130px] sm:max-w-none" style="color: var(--text-primary);">
          RSI + Nadaraya-Watson
        </span>

        <span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[rgba(51,111,238,0.18)] text-[#62A1FF]">
          {{ timeframe }}
        </span>

        <span
          class="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[rgba(112,139,164,0.14)]"
          style="color: var(--text-secondary);"
        >
          Бумаг: <strong class="text-white tabular-nums">{{ totalCount }}</strong>
        </span>
      </template>
    </div>

    <!-- Right: Search + Edit Favs + Settings + Pin + 4-Dots (compact) + Window Controls -->
    <div class="flex items-center gap-1.5 no-drag">
      <!-- Search Input: Normal vs Compact Expanding Search -->
      <template v-if="!condensed">
        <UiSearchInput
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
        />
      </template>
      <template v-else>
        <!-- Expanding search in compact mode -->
        <div class="relative flex items-center">
          <div
            v-if="isSearchOpen || (searchQuery && searchQuery.length > 0)"
            class="relative flex items-center animate-fade-in"
          >
            <input
              ref="compactSearchInputRef"
              type="text"
              :value="searchQuery"
              @input="$emit('update:searchQuery', $event.target.value)"
              @blur="handleSearchBlur"
              @keydown.esc="closeSearch"
              placeholder="Поиск..."
              class="h-[22px] w-[110px] sm:w-[130px] pl-6 pr-5 rounded text-[11px] bg-[rgba(112,139,164,0.22)] focus:bg-[#21313F] focus:ring-1 focus:ring-[#428BF9] outline-none transition text-white border border-[rgba(140,167,190,0.25)]"
            />
            <svg
              class="w-3 h-3 absolute left-1.5 pointer-events-none text-[#708BA4]"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <button
              v-if="searchQuery && searchQuery.length > 0"
              type="button"
              @mousedown.prevent
              @click="clearSearch"
              class="absolute right-1.5 text-[#8CA7BE] hover:text-white bg-transparent border-none cursor-pointer text-[10px] p-0 flex items-center justify-center w-3 h-3"
              title="Очистить"
            >
              ✕
            </button>
          </div>
          <button
            v-else
            type="button"
            @click="openSearch"
            class="w-[24px] h-[24px] rounded flex items-center justify-center bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)] transition cursor-pointer border-none"
            title="Поиск инструментов"
          >
            <svg class="w-3.5 h-3.5" style="color: var(--icon-primary);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
          </button>
        </div>
      </template>

      <!-- Edit Favorites Mode Toggle (Icon only) -->
      <button
        type="button"
        @click="$emit('toggleEditFavorites')"
        class="rounded flex items-center justify-center transition cursor-pointer border border-transparent"
        :class="[
          condensed ? 'w-[24px] h-[24px]' : 'w-[26px] h-[26px]',
          editFavoritesMode
            ? '!bg-[#336FEE] !text-white !border-[#428BF9]'
            : 'bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)]'
        ]"
        :title="editFavoritesMode ? 'Готово (сохранить выбор избранных)' : 'Изменить избранные инструменты'"
      >
        <svg v-if="editFavoritesMode" class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="w-3.5 h-3.5" style="color: var(--icon-primary);" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <!-- Settings button (Icon only) -->
      <button
        type="button"
        @click="$emit('openSettings')"
        class="rounded flex items-center justify-center bg-transparent hover:bg-[rgba(112,139,164,0.20)] transition cursor-pointer border-none"
        :class="condensed ? 'w-[24px] h-[24px]' : 'w-[26px] h-[26px]'"
        style="color: var(--text-secondary);"
        title="Настройки"
      >
        <svg class="w-3.5 h-3.5" style="color: var(--icon-primary);" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <!-- Pin (Always on top) button (Icon only) -->
      <button
        type="button"
        @click="toggleAlwaysOnTop"
        class="rounded flex items-center justify-center transition cursor-pointer border border-transparent"
        :class="[
          condensed ? 'w-[24px] h-[24px]' : 'w-[26px] h-[26px]',
          isAlwaysOnTop
            ? '!bg-[#336FEE] !text-white !border-[#428BF9]'
            : 'bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)]'
        ]"
        :title="isAlwaysOnTop ? 'Открепить (поверх всех окон)' : 'Закрепить поверх всех окон'"
      >
        <svg
          v-if="isAlwaysOnTop"
          class="w-3.5 h-3.5 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="17" x2="12" y2="22" stroke-width="2" />
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </svg>
        <svg
          v-else
          class="w-3.5 h-3.5"
          style="color: var(--icon-primary);"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="17" x2="12" y2="22" />
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </svg>
      </button>

      <!-- Divider before 4-dots (compact mode only) -->
      <div v-if="condensed" class="h-3.5 w-[1px] bg-[rgba(140,167,190,0.18)] mx-0.5"></div>

      <!-- 4-dots Dropdown Menu Button (compact mode only) -->
      <div v-if="condensed" class="relative" ref="compactMenuContainerRef">
        <button
          type="button"
          @click="toggleCompactMenu"
          class="w-[24px] h-[24px] rounded flex items-center justify-center transition cursor-pointer border border-transparent"
          :class="isCompactMenuOpen
            ? '!bg-[#336FEE] !text-white !border-[#428BF9]'
            : 'bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)]'"
          title="Фильтры и статус сервера"
        >
          <!-- 4 dots in 2x2 grid SVG -->
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="5" r="1.75" />
            <circle cx="11" cy="5" r="1.75" />
            <circle cx="5" cy="11" r="1.75" />
            <circle cx="11" cy="11" r="1.75" />
          </svg>
        </button>

        <!-- Popover Menu duplicating toolbar -->
        <div
          v-if="isCompactMenuOpen"
          class="absolute right-0 top-full mt-1.5 z-[100] bg-[#161B22] border border-[rgba(140,167,190,0.25)] rounded-lg shadow-2xl p-2.5 min-w-[260px] space-y-2 select-none"
        >
          <!-- 1. Timeframes -->
          <div class="w-full">
            <TimeframeGroup
              class="w-full"
              :model-value="timeframe"
              @update:model-value="$emit('update:timeframe', $event)"
            />
          </div>

          <div class="h-[1px] bg-[rgba(140,167,190,0.14)] w-full"></div>

          <!-- 2. Asset list dropdown -->
          <div>
            <UiDropdown
              :model-value="assetFilter"
              :items="assetOptions"
              title="Фильтр списка инструментов"
              class="w-full"
              @update:model-value="$emit('update:assetFilter', $event)"
            />
          </div>

          <div class="h-[1px] bg-[rgba(140,167,190,0.14)] w-full"></div>

          <!-- 3. Strategy dropdown -->
          <div>
            <UiDropdown
              :model-value="strategyMode"
              :items="strategyOptions"
              title="Режим сигналов стратегии"
              class="w-full"
              @update:model-value="$emit('update:strategyMode', $event)"
            >
              <template #trigger-prefix>
                <span class="w-1.5 h-1.5 rounded-full bg-[#336FEE]"></span>
              </template>
            </UiDropdown>
          </div>

          <div class="h-[1px] bg-[rgba(140,167,190,0.14)] w-full"></div>

          <!-- 4. CCI & STCH Toggles -->
          <div class="grid grid-cols-2 gap-2 w-full">
            <UiToggleChip
              :model-value="useCCI"
              label="CCI"
              class="w-full justify-center"
              :title="strategyMode === 'rsi_nw' ? 'Включить/выключить индекс товарного канала' : 'Фильтрация по CCI'"
              @update:model-value="$emit('update:useCCI', $event)"
            />
            <UiToggleChip
              :model-value="useSTCH"
              label="STCH"
              class="w-full justify-center"
              :title="strategyMode === 'rsi_nw' ? 'Включить/выключить стохастический осциллятор' : 'Фильтрация по STCH'"
              @update:model-value="$emit('update:useSTCH', $event)"
            />
          </div>

          <div class="h-[1px] bg-[rgba(140,167,190,0.14)] w-full"></div>

          <!-- 5. Server Connection Status -->
          <div class="flex items-center justify-between px-1 pt-0.5">
            <span class="text-[11px] text-[var(--text-secondary)]">Сервер:</span>
            <ServerStatus
              :online="serverOnline"
              :label="serverPingLabel"
              :show-label-always="true"
              @toggle="$emit('toggleServer')"
            />
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-3.5 w-[1px] bg-[rgba(140,167,190,0.18)] mx-0.5"></div>

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
          class="window-control-btn close-btn"
          title="Закрыть"
          @click="closeWindow"
        >
          &#10005;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import TimeframeGroup from '@/components/common/TimeframeGroup.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiToggleChip from '@/components/ui/UiToggleChip.vue';
import ServerStatus from '@/components/common/ServerStatus.vue';

const props = defineProps({
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
  linkGroupTooltip: {
    type: String,
    default: 'Фильтр сигналов (клик для смены)',
  },
  condensed: {
    type: Boolean,
    default: false,
  },
  assetFilter: {
    type: String,
    default: 'all',
  },
  strategyMode: {
    type: String,
    default: 'rsi_nw',
  },
  useCCI: {
    type: Boolean,
    default: true,
  },
  useSTCH: {
    type: Boolean,
    default: true,
  },
  serverOnline: {
    type: Boolean,
    default: true,
  },
  serverPingLabel: {
    type: String,
    default: 'MOEX · 14 мс',
  },
});

const emit = defineEmits([
  'cycleColor',
  'update:searchQuery',
  'toggleEditFavorites',
  'openSettings',
  'update:timeframe',
  'update:assetFilter',
  'update:strategyMode',
  'update:useCCI',
  'update:useSTCH',
  'toggleServer',
]);

const assetOptions = [
  { value: 'all', label: 'Все акции', badge: 'MOEX', badgeClass: 'opacity-75' },
  { value: 'favorites', label: 'Избранные', badge: '★', badgeClass: 'opacity-75' },
  { value: 'bluechips', label: 'Голубые фишки', badge: '⚡', badgeClass: 'text-[#2CE89C]' },
  { value: 'tbank_favorites', label: 'Избранное Т-Банк', badge: '💛', badgeClass: 'text-[#FFDD2D]' },
];

const strategyOptions = [
  { value: 'rsi_nw', label: 'RSI + NW', badge: 'Default', badgeClass: 'opacity-75' },
  { value: 'rsi_or_nw', label: 'RSI или NW' },
  { value: 'nw_only', label: 'Только NW' },
  { value: 'rsi_only', label: 'Только RSI' },
];

const isMaximized = ref(false);
const isAlwaysOnTop = ref(false);
let removeStateListener = null;

// Compact search state
const isSearchOpen = ref(false);
const compactSearchInputRef = ref(null);

function openSearch() {
  isSearchOpen.value = true;
  nextTick(() => {
    compactSearchInputRef.value?.focus();
  });
}

function handleSearchBlur() {
  if (!props.searchQuery || props.searchQuery.trim().length === 0) {
    isSearchOpen.value = false;
  }
}

function clearSearch() {
  emit('update:searchQuery', '');
  isSearchOpen.value = false;
}

function closeSearch() {
  emit('update:searchQuery', '');
  isSearchOpen.value = false;
}

// Compact 4-dots dropdown menu state
const isCompactMenuOpen = ref(false);
const compactMenuContainerRef = ref(null);

function toggleCompactMenu() {
  isCompactMenuOpen.value = !isCompactMenuOpen.value;
}

function handleOutsideClick(e) {
  if (compactMenuContainerRef.value && !compactMenuContainerRef.value.contains(e.target)) {
    isCompactMenuOpen.value = false;
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (isCompactMenuOpen.value) {
      isCompactMenuOpen.value = false;
    }
  }
}

onMounted(() => {
  // Restore persisted "always on top" preference
  try {
    const saved = localStorage.getItem('moex_screener_always_on_top');
    if (saved === 'true') {
      isAlwaysOnTop.value = true;
      if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setAlwaysOnTop === 'function') {
        window.electronAPI.setAlwaysOnTop(true);
      }
    }
  } catch (e) {}

  if (typeof window.electronAPI !== 'undefined') {
    if (window.electronAPI.isMaximized) {
      window.electronAPI.isMaximized().then(val => {
        isMaximized.value = !!val;
      }).catch(() => {});
    }
    if (window.electronAPI.isAlwaysOnTop) {
      window.electronAPI.isAlwaysOnTop().then(val => {
        isAlwaysOnTop.value = !!val;
      }).catch(() => {});
    }
    if (window.electronAPI.onWindowStateChange) {
      removeStateListener = window.electronAPI.onWindowStateChange(state => {
        if (typeof state.isMaximized === 'boolean') {
          isMaximized.value = state.isMaximized;
        }
        if (typeof state.isAlwaysOnTop === 'boolean') {
          isAlwaysOnTop.value = state.isAlwaysOnTop;
          try {
            localStorage.setItem('moex_screener_always_on_top', String(state.isAlwaysOnTop));
          } catch (e) {}
        }
      });
    }
  }

  document.addEventListener('click', handleOutsideClick);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (typeof removeStateListener === 'function') {
    removeStateListener();
  }
  document.removeEventListener('click', handleOutsideClick);
  window.removeEventListener('keydown', handleKeydown);
});

function toggleAlwaysOnTop() {
  const nextVal = !isAlwaysOnTop.value;
  isAlwaysOnTop.value = nextVal;
  try {
    localStorage.setItem('moex_screener_always_on_top', String(nextVal));
  } catch (e) {}
  if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setAlwaysOnTop === 'function') {
    window.electronAPI.setAlwaysOnTop(nextVal);
  }
}

function handleHeaderDblClick(e) {
  if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, input, select, .no-drag')) {
    return;
  }
  maximizeWindow();
}

function minimizeWindow() {
  if (typeof window.electronAPI !== 'undefined') {
    if (typeof window.electronAPI.minimize === 'function') {
      window.electronAPI.minimize();
    } else if (typeof window.electronAPI.minimizeWindow === 'function') {
      window.electronAPI.minimizeWindow();
    }
  }
}

function maximizeWindow() {
  if (typeof window.electronAPI !== 'undefined') {
    if (typeof window.electronAPI.maximize === 'function') {
      window.electronAPI.maximize();
    } else if (typeof window.electronAPI.maximizeWindow === 'function') {
      window.electronAPI.maximizeWindow();
    }
  }
}

function closeWindow() {
  if (typeof window.electronAPI !== 'undefined') {
    if (typeof window.electronAPI.close === 'function') {
      window.electronAPI.close();
    } else if (typeof window.electronAPI.closeWindow === 'function') {
      window.electronAPI.closeWindow();
    } else {
      window.close();
    }
  } else {
    window.close();
  }
}
</script>
