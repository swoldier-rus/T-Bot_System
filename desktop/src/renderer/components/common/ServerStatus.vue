<template>
  <button
    type="button"
    class="server-status-btn"
    :title="'Статус подключения к серверу котировок: ' + (online ? 'Онлайн' : 'Офлайн')"
    @click="$emit('toggle')"
  >
    <span
      class="text-[11px] font-mono hidden md:inline"
      :style="{ color: online ? 'var(--text-secondary)' : 'var(--signal-sell-text)' }"
    >
      {{ label }}
    </span>
    <span class="server-dot" :class="online ? 'online' : 'offline'"></span>
  </button>
</template>

<script setup>
defineProps({
  online: {
    type: Boolean,
    default: true,
  },
  label: {
    type: String,
    default: 'MOEX · 14 мс',
  },
});

defineEmits(['toggle']);
</script>
