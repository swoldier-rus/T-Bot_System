<template>
  <footer
    class="px-3 py-2 border-t border-[rgba(140,167,190,0.14)] bg-[#12151B]/80 flex flex-wrap items-center justify-between gap-2 text-[11px]"
    style="color: var(--text-secondary);"
  >
    <div class="flex items-center gap-3">
      <span>Покупка: <strong class="text-[#2CE89C] font-mono">{{ buyCount }}</strong></span>
      <span>Продажа: <strong class="text-[#FF6969] font-mono">{{ sellCount }}</strong></span>
      <span>Нейтрально: <strong class="font-mono text-white">{{ neutralCount }}</strong></span>
    </div>

    <div class="flex items-center gap-3 font-mono">
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
    required: true,
  },
  volumeDaysX: {
    type: Number,
    default: 20,
  },
});
</script>
