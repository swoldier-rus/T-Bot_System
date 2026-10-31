<template>
  <td class="ticker-cell">
    <div class="flex items-center gap-2">
      <!-- Checkbox for edit favorites mode -->
      <input
        v-if="editFavoritesMode"
        type="checkbox"
        :checked="isFavorite"
        @change="$emit('toggleFavorite', row.ticker)"
        class="w-3.5 h-3.5 rounded accent-[#336FEE] bg-[#12151B] border border-[rgba(140,167,190,0.4)] cursor-pointer shrink-0"
        :title="`Добавить/удалить ${row.ticker} в избранное`"
      />

      <!-- Logo or letter fallback avatar -->
      <img
        v-if="row.logoUrl"
        :src="row.logoUrl"
        class="w-5 h-5 rounded-full object-cover shrink-0"
        :style="{ backgroundColor: row.logoColor || row.color || '#333' }"
        @error="handleImageError"
        :alt="row.ticker"
      />
      <span
        v-else
        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        :style="{ backgroundColor: row.color, color: row.textDark ? '#12151B' : '#FFFFFF' }"
      >
        {{ row.ticker.slice(0, 1) }}
      </span>

      <!-- Ticker code & Hover swap full name -->
      <div class="ticker-swap-wrap flex-1 min-w-0">
        <span class="ticker-code-label flex items-center gap-1">
          <span>{{ row.ticker }}</span>
          <span
            v-if="isFavorite"
            class="text-[#f0b90b] text-[11px] leading-none select-none"
            title="В избранном"
          >
            ★
          </span>
        </span>
        <span class="ticker-fullname-label truncate">
          {{ row.fullName }}
        </span>
      </div>
    </div>
  </td>
</template>

<script setup>
defineProps({
  row: {
    type: Object,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  editFavoritesMode: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggleFavorite']);

function handleImageError(e) {
  e.target.style.display = 'none';
}
</script>
