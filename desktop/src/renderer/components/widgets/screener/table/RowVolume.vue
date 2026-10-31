<template>
  <td class="text-right font-mono" :title="tooltipText">
    <div class="flex flex-col items-end gap-0.5">
      <span class="text-[12px]" :style="volStyle">
        {{ volSign }}{{ volumeDiff.toFixed(1) }}%
      </span>
      <div class="w-16 h-1 rounded-full bg-[rgba(112,139,164,0.18)] overflow-hidden">
        <div
          class="h-full rounded-full"
          :style="{ width: volBarWidth + '%', backgroundColor: volBarColor }"
        ></div>
      </div>
    </div>
  </td>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  volumeDiff: {
    type: Number,
    required: true,
  },
  volRubMln: {
    type: Number,
    default: 0,
  },
  volumeDaysX: {
    type: Number,
    default: 20,
  },
});

const volSign = computed(() => (props.volumeDiff > 0 ? '+' : ''));

const volStyle = computed(() => {
  if (props.volumeDiff >= 25) {
    return { color: 'var(--signal-buy-text)', fontWeight: '600' };
  }
  if (props.volumeDiff < 0) {
    return { color: 'var(--signal-sell-text)' };
  }
  return { color: 'var(--text-secondary)' };
});

const volBarWidth = computed(() => {
  return Math.min(100, Math.max(8, Math.round(Math.abs(props.volumeDiff) * 0.8)));
});

const volBarColor = computed(() => (props.volumeDiff >= 0 ? '#19B26B' : '#F23645'));

const tooltipText = computed(() => {
  const rubMld = (props.volRubMln / 1000).toFixed(1);
  return `Текущий объем: ${rubMld} млрд ₽ (отклонение от среднего за ${props.volumeDaysX} дн.)`;
});
</script>
