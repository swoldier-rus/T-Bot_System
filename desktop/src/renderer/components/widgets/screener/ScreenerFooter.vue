<template>
  <footer
    class="pro-widget-footer px-3 border-t border-[rgba(140,167,190,0.14)] bg-[#12151B]/80 flex flex-wrap items-center justify-between gap-2 transition-all select-none"
    :class="condensed ? 'h-[22px] min-h-[22px] py-0 text-[10px]' : 'py-2 text-[11px]'"
    style="color: var(--text-secondary);"
  >
    <div class="flex items-center gap-2.5">
      <span>Покупка: <strong class="text-[#2CE89C] font-mono">{{ buyCount }}</strong></span>
      <span>Продажа: <strong class="text-[#FF6969] font-mono">{{ sellCount }}</strong></span>
      <span>Нейтрально: <strong class="font-mono text-white">{{ neutralCount }}</strong></span>
    </div>

    <div v-if="!condensed" class="flex items-center gap-3 font-mono">
      <span>
        Пороги: RSI {{ thresholds.rsiLow }}/{{ thresholds.rsiHigh }} · CCI {{ thresholds.cciLow }}/+{{ thresholds.cciHigh }} · STCH {{ thresholds.stchLow }}/{{ thresholds.stchHigh }} · Ср. объем за {{ volumeDaysX }} дн.
      </span>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  buyCount: {
    type: Number,
    default: 0,
  },
  sellCount: {
    type: Number,
    default: 0,
  },
  neutralCount: {
    type: Number,
    default: 0,
  },
  thresholds: {
    type: Object,
    default: () => ({ rsiLow: 30, rsiHigh: 70, cciLow: -100, cciHigh: 100, stchLow: 20, stchHigh: 80 }),
  },
  volumeDaysX: {
    type: Number,
    default: 20,
  },
  condensed: {
    type: Boolean,
    default: false,
  },
});
</script>
