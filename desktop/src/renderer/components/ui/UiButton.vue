<template>
  <button
    :type="type"
    :class="computedClasses"
    :title="title"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'button',
  },
  variant: {
    type: String,
    default: 'default', // 'default' | 'tool' | 'window' | 'window-close'
  },
  active: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
});

defineEmits(['click']);

const computedClasses = computed(() => {
  if (props.variant === 'window') {
    return 'window-control-btn';
  }
  if (props.variant === 'window-close') {
    return 'window-control-btn close-btn';
  }
  if (props.variant === 'tool') {
    return [
      'h-[26px] px-2 rounded flex items-center gap-1.5 text-[12px] font-medium transition cursor-pointer',
      props.active
        ? '!bg-[#336FEE] !text-white !border-[#428BF9]'
        : 'bg-transparent hover:bg-[rgba(112,139,164,0.20)] text-[var(--text-secondary)] border border-transparent',
    ];
  }
  return '';
});
</script>
