<template>
  <div class="pro-widget-toolbar flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-1.5">
    <!-- Group 1: Timeframe selector -->
    <div class="flex items-center shrink-0">
      <TimeframeGroup
        :model-value="timeframe"
        @update:model-value="$emit('update:timeframe', $event)"
      />
    </div>

    <!-- Group 2: Assets & Strategy dropdowns -->
    <div class="flex items-center gap-1.5 shrink-0">
      <UiDropdown
        :model-value="assetFilter"
        :items="assetOptions"
        title="Фильтр списка инструментов"
        @update:model-value="$emit('update:assetFilter', $event)"
      />

      <UiDropdown
        :model-value="strategyMode"
        :items="strategyOptions"
        title="Режим сигналов стратегии"
        @update:model-value="$emit('update:strategyMode', $event)"
      >
        <template #trigger-prefix>
          <span class="w-1.5 h-1.5 rounded-full bg-[#336FEE]"></span>
        </template>
      </UiDropdown>
    </div>

    <!-- Group 3: CCI & STCH Toggles -->
    <div class="flex items-center gap-1.5 shrink-0">
      <UiToggleChip
        :model-value="useCCI"
        label="CCI"
        :title="strategyMode === 'rsi_nw' ? 'Включить/выключить индекс товарного канала' : 'Фильтрация по CCI (совместно со стратегией)'"
        @update:model-value="$emit('update:useCCI', $event)"
      />

      <UiToggleChip
        :model-value="useSTCH"
        label="STCH"
        :title="strategyMode === 'rsi_nw' ? 'Включить/выключить стохастический осциллятор' : 'Фильтрация по STCH (совместно со стратегией)'"
        @update:model-value="$emit('update:useSTCH', $event)"
      />
    </div>

    <!-- Group 4: Server Connection Status -->
    <div class="flex items-center shrink-0 ml-auto sm:ml-0">
      <ServerStatus
        :online="serverOnline"
        :label="serverPingLabel"
        @toggle="$emit('toggleServer')"
      />
    </div>
  </div>
</template>

<script setup>
import TimeframeGroup from '@/components/common/TimeframeGroup.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiToggleChip from '@/components/ui/UiToggleChip.vue';
import ServerStatus from '@/components/common/ServerStatus.vue';

defineProps({
  timeframe: {
    type: String,
    default: '15м',
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

defineEmits([
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
</script>
