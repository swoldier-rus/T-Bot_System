<template>
  <div class="kit-select-wrap relative" ref="dropdownRef">
    <button
      type="button"
      class="kit-select-btn"
      :class="{ open: isOpen }"
      @click="toggle"
      :title="title"
    >
      <slot name="trigger-prefix" />
      <span>{{ activeLabel }}</span>
      <svg class="w-3.5 h-3.5 kit-select-chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div class="kit-dropdown-menu" :class="{ open: isOpen }">
      <div
        v-for="item in items"
        :key="item.value"
        class="kit-dropdown-item"
        :class="{ selected: item.value === modelValue }"
        @click="selectItem(item)"
      >
        <span>{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="text-[10px] font-mono"
          :class="item.badgeClass || 'opacity-75'"
          :style="item.badgeStyle"
        >
          {{ item.badge }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  items: {
    type: Array,
    default: () => [], // [{ value: 'all', label: 'Все акции', badge: 'MOEX', badgeClass: '...' }]
  },
  title: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'select']);

const isOpen = ref(false);
const dropdownRef = ref(null);

const activeLabel = computed(() => {
  const match = props.items.find(i => i.value === props.modelValue);
  return match ? match.label : props.modelValue;
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function selectItem(item) {
  emit('update:modelValue', item.value);
  emit('select', item);
  isOpen.value = false;
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
