<template>
  <td class="text-center" :title="cellTooltip" :class="[isMono ? 'font-mono' : '', muted ? 'col-muted' : '']">
    <span
      v-if="participates"
      class="sig-pill"
      :class="[pillClass, minWidthClass]"
    >
      {{ displayValue }}
    </span>
    <span
      v-else
      class="inline-block text-[11px] leading-[15px] font-semibold text-center"
      :class="[textSignalClass, minWidthClass]"
    >
      {{ displayValue }}
    </span>
  </td>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: [Number, String],
    required: true,
  },
  signal: {
    type: Number,
    default: 0, // 1: buy, -1: sell, 0: neutral
  },
  type: {
    type: String,
    default: 'number', // 'rsi' | 'nw' | 'cci' | 'stch' | 'number'
  },
  participates: {
    type: Boolean,
    default: true,
  },
  muted: {
    type: Boolean,
    default: false,
  },
  minWidth: {
    type: String,
    default: '',
  },
  bands: {
    type: Object,
    default: null,
  },
  currentPrice: {
    type: Number,
    default: null,
  },
});

const isMono = computed(() => props.type !== 'nw');

const pillClass = computed(() => {
  if (props.signal > 0) return 'sig-buy';
  if (props.signal < 0) return 'sig-sell';
  return 'sig-neutral';
});

const textSignalClass = computed(() => {
  if (props.signal > 0) return 'sig-text-buy';
  if (props.signal < 0) return 'sig-text-sell';
  return 'sig-text-neutral';
});

const minWidthClass = computed(() => {
  if (props.minWidth) return props.minWidth;
  if (props.type === 'rsi') return 'min-w-[48px]';
  if (props.type === 'cci') return 'min-w-[50px]';
  if (props.type === 'stch') return 'min-w-[48px]';
  return '';
});

const displayValue = computed(() => {
  if (props.type === 'nw') {
    if (props.signal > 0) return 'Buy';
    if (props.signal < 0) return 'Sell';
    return 'Wait';
  }
  if (props.type === 'cci') {
    const num = Math.round(Number(props.value));
    return (num > 0 ? '+' : '') + num;
  }
  if (typeof props.value === 'number') {
    return props.value.toFixed(1);
  }
  return props.value;
});

const cellTooltip = computed(() => {
  if (props.type === 'nw' && props.bands) {
    const upper = typeof props.bands.upper === 'number' ? props.bands.upper : '—';
    const lower = typeof props.bands.lower === 'number' ? props.bands.lower : '—';
    const price = typeof props.currentPrice === 'number' ? props.currentPrice : '—';
    return `NWE Конверт:\nВерхняя: ${upper}\nЦена: ${price}\nНижняя: ${lower}`;
  }
  return null;
});
</script>
