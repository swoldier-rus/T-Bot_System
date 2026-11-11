<template>
  <button
    type="button"
    class="ind-toggle-chip"
    :class="{
      active: modelValue && !disabled,
      'opacity-40 cursor-not-allowed pointer-events-none': disabled
    }"
    :title="disabled ? 'Недоступно в текущем режиме стратегии' : title"
    :disabled="disabled"
    @click="!disabled && $emit('update:modelValue', !modelValue)"
  >
    <span class="ind-toggle-dot"></span>
    <span>{{ label }}</span>
    <span class="text-[10px] font-mono opacity-70">{{ modelValue && !disabled ? 'ON' : 'OFF' }}</span>
  </button>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  label: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
</script>
