<template>
  <td class="text-center" :class="[isMono ? 'font-mono' : '', muted ? 'col-muted' : '']">
    <span class="sig-pill" :class="[pillClass, minWidthClass]">
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
  muted: {
    type: Boolean,
    default: false,
  },
  minWidth: {
    type: String,
    default: '',
  },
});

const isMono = computed(() => props.type !== 'nw');

const pillClass = computed(() => {
  if (props.signal > 0) return 'sig-buy';
  if (props.signal < 0) return 'sig-sell';
  return 'sig-neutral';
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
    if (props.signal > 0) return 'Покупка';
    if (props.signal < 0) return 'Продажа';
    return 'Нейтрально';
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
</script>
