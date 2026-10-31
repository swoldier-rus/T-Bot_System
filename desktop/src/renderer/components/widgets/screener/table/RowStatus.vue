<template>
  <td class="text-right">
    <span
      v-if="status === 'BUY'"
      class="sig-pill sig-buy"
      :title="`Сигналы за Покупку: ${reasonsText}`"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-[#2CE89C]"></span>
      <span>Покупка</span>
    </span>

    <span
      v-else-if="status === 'SELL'"
      class="sig-pill sig-sell"
      :title="`Сигналы за Продажу: ${reasonsText}`"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-[#FF6969]"></span>
      <span>Продажа</span>
    </span>

    <span
      v-else
      class="sig-pill sig-neutral"
      :title="reasonsText"
    >
      <span>Ожидание</span>
    </span>
  </td>
</template>

<script setup>
defineProps({
  status: {
    type: String,
    required: true, // 'BUY' | 'SELL' | 'NEUTRAL'
  },
  reasonsText: {
    type: String,
    default: 'Нет выраженных сигналов',
  },
});
</script>
