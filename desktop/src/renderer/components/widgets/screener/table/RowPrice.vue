<template>
  <td class="text-right font-mono">
    <div class="inline-flex items-baseline justify-end gap-1.5">
      <span class="font-semibold" style="color: var(--text-primary);">
        {{ priceFormatted }} ₽
      </span>
      <span class="text-[11px] font-medium" :class="changeColorClass">
        {{ changeSign }}{{ changeFormatted }}%
      </span>
    </div>
  </td>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  price: {
    type: Number,
    required: true,
  },
  change: {
    type: Number,
    required: true,
  },
});

const priceFormatted = computed(() => {
  const p = props.price;
  if (!p && p !== 0) return '0.00';
  if (p >= 1000) {
    return p.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (p < 0.1) {
    return p.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  }
  if (p < 1) {
    return p.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return p.toFixed(2);
});

const changeSign = computed(() => (props.change > 0 ? '+' : ''));
const changeFormatted = computed(() => props.change.toFixed(2));
const changeColorClass = computed(() => (props.change >= 0 ? 'text-[#2CE89C]' : 'text-[#FF6969]'));
</script>
