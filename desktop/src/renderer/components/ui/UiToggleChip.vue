<template>
  <button
    type="button"
    class="ind-toggle-chip"
    :class="{ active: modelValue }"
    :title="title"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="ind-toggle-dot"></span>
    <span>{{ label }}</span>
    <span class="text-[10px] font-mono opacity-70">{{ modelValue ? 'ON' : 'OFF' }}</span>
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
});

defineEmits(['update:modelValue']);
</script>
