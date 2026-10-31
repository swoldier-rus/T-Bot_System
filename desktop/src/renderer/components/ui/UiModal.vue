<template>
  <div
    class="settings-modal-backdrop"
    :class="{ open: isOpen }"
    @click="handleBackdropClick"
  >
    <div class="settings-dialog" @click.stop>
      <!-- Header -->
      <div class="px-4 py-3 border-b border-[rgba(140,167,190,0.14)] flex items-center justify-between">
        <span class="font-semibold text-[15px]" style="color: var(--text-primary);">
          {{ title }}
        </span>
        <button
          type="button"
          @click="close"
          class="text-[#8CA7BE] hover:text-white bg-transparent border-none cursor-pointer p-1"
          title="Закрыть"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <slot />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Настройки',
  },
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}

function handleBackdropClick(e) {
  if (e.target.classList.contains('settings-modal-backdrop')) {
    close();
  }
}
</script>
