<template>
  <div class="relative flex items-center">
    <svg
      class="w-3.5 h-3.5 absolute left-2 pointer-events-none"
      style="color: var(--icon-primary);"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="M21 21l-4.35-4.35"></path>
    </svg>
    <input
      ref="inputRef"
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      class="h-[24px] w-[95px] min-w-[75px] xs:w-[125px] sm:w-[155px] pl-7 pr-6 rounded text-[12px] bg-[rgba(112,139,164,0.16)] focus:bg-[#21313F] focus:ring-1 focus:ring-[#428BF9] outline-none transition"
      style="color: var(--text-primary);"
    />
    <button
      v-if="modelValue && modelValue.length > 0"
      type="button"
      @click="clear"
      class="absolute right-1.5 text-[#8CA7BE] hover:text-white bg-transparent border-none cursor-pointer p-0"
      title="Очистить поиск"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Тикер или имя...',
  },
});

const emit = defineEmits(['update:modelValue', 'clear']);
const inputRef = ref(null);

function clear() {
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}
</script>
