<template>
  <div class="tf-group" role="group" aria-label="Таймфрейм">
    <button
      v-for="tf in timeframes"
      :key="tf"
      type="button"
      class="tf-btn"
      :class="{ active: tf === modelValue }"
      @click="$emit('update:modelValue', tf)"
    >
      {{ tf }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '15м',
  },
  timeframes: {
    type: Array,
    default: () => ['5м', '15м', '1ч', '4ч', 'Д'],
  },
});

defineEmits(['update:modelValue']);
</script>
