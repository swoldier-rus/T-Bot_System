<template>
  <div class="pro-widget-toolbar">
    <!-- 1. Timeframe selector -->
    <TimeframeGroup
      :model-value="timeframe"
      @update:model-value="$emit('update:timeframe', $event)"
    />

    <!-- Divider -->
    <div class="h-4 w-[1px] bg-[rgba(140,167,190,0.16)] mx-0.5 hidden sm:block"></div>

    <!-- 2. Assets dropdown -->
    <UiDropdown
      :model-value="assetFilter"
      :items="assetOptions"
      title="Фильтр списка инструментов"
      @update:model-value="$emit('update:assetFilter', $event)"
    />

    <!-- 3. Strategy dropdown -->
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

    <!-- Divider -->
    <div class="h-4 w-[1px] bg-[rgba(140,167,190,0.16)] mx-0.5 hidden sm:block"></div>

    <!-- 4. CCI Toggle -->
    <UiToggleChip
      :model-value="useCCI"
      label="CCI"
      title="Включить/выключить индекс товарного канала"
      @update:model-value="$emit('update:useCCI', $event)"
    />

    <!-- 5. STCH Toggle -->
    <UiToggleChip
      :model-value="useSTCH"
      label="STCH"
      title="Включить/выключить стохастический осциллятор"
      @update:model-value="$emit('update:useSTCH', $event)"
    />

    <!-- 6. Server Connection Status -->
    <ServerStatus
      :online="serverOnline"
      :label="serverPingLabel"
      @toggle="$emit('toggleServer')"
    />
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
];

const strategyOptions = [
  { value: 'rsi_nw', label: 'RSI + NW', badge: 'Default', badgeClass: 'opacity-75' },
  { value: 'rsi_or_nw', label: 'RSI или NW' },
  { value: 'nw_only', label: 'Только NW' },
  { value: 'rsi_only', label: 'Только RSI' },
];
</script>
