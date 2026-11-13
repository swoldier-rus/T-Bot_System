<template>
  <div class="flex-1 overflow-auto min-h-0">
    <table class="screener-table">
      <TableHeader
        :sort-by="sortBy"
        :sort-desc="sortDesc"
        :use-c-c-i="useCCI"
        :use-s-t-c-h="useSTCH"
        :volume-days-x="volumeDaysX"
        @sort="$emit('sort', $event)"
      />

      <tbody class="tabular-nums">
        <tr v-if="rows.length === 0">
          <td colspan="8" class="text-center py-8 text-xs" style="color: var(--text-secondary);">
            По выбранным фильтрам инструментов не найдено.
            <button
              type="button"
              @click="$emit('resetFilters')"
              class="text-[#62A1FF] underline bg-transparent border-none cursor-pointer"
            >
              Сбросить фильтры
            </button>
          </td>
        </tr>

        <tr
          v-for="row in rows"
          :key="row.ticker"
          :class="rowFlashMap[row.ticker] || ''"
        >
          <!-- 1. Instrument -->
          <RowInstrument
            :row="row"
            :is-favorite="isFavorite(row.ticker)"
            :edit-favorites-mode="editFavoritesMode"
            @toggle-favorite="$emit('toggleFavorite', $event)"
          />

          <!-- 2. Price / Change -->
          <RowPrice
            :price="row.price"
            :change="row.change"
          />

          <!-- 3. Volume -->
          <RowVolume
            :volume-diff="row.volumeDiff"
            :vol-rub-mln="row.volRubMln"
            :volume-days-x="volumeDaysX"
          />

          <!-- 4. RSI -->
          <RowIndicatorCell
            :value="row.rsi"
            :signal="row.rsiSignal"
            type="rsi"
            :participates="activeIndicators.rsi"
          />

          <!-- 5. NW -->
          <RowIndicatorCell
            :value="row.nw"
            :signal="row.nwSignal"
            type="nw"
            :participates="activeIndicators.nw"
          />

          <!-- 6. CCI -->
          <RowIndicatorCell
            :value="row.cci"
            :signal="row.cciSignal"
            type="cci"
            :participates="activeIndicators.cci"
          />

          <!-- 7. STCH -->
          <RowIndicatorCell
            :value="row.stch"
            :signal="row.stchSignal"
            type="stch"
            :participates="activeIndicators.stch"
          />

          <!-- 8. Status -->
          <RowStatus
            :status="row.finalStatus"
            :reasons-text="row.reasonsText"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TableHeader from './TableHeader.vue';
import RowInstrument from './RowInstrument.vue';
import RowPrice from './RowPrice.vue';
import RowVolume from './RowVolume.vue';
import RowIndicatorCell from './RowIndicatorCell.vue';
import RowStatus from './RowStatus.vue';

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  rowFlashMap: {
    type: Object,
    default: () => ({}),
  },
  sortBy: {
    type: String,
    default: 'statusScore',
  },
  sortDesc: {
    type: Boolean,
    default: true,
  },
  strategyMode: {
    type: String,
    default: 'rsi_nw',
  },
  useCCI: {
    type: Boolean,
    default: true,
  },
  useSTCH: {
    type: Boolean,
    default: true,
  },
  volumeDaysX: {
    type: Number,
    default: 20,
  },
  editFavoritesMode: {
    type: Boolean,
    default: false,
  },
  isFavorite: {
    type: Function,
    required: true,
  },
});

defineEmits(['sort', 'resetFilters', 'toggleFavorite']);

const activeIndicators = computed(() => {
  const mode = props.strategyMode;
  return {
    rsi: mode === 'rsi_nw' || mode === 'rsi_only' || mode === 'rsi_or_nw',
    nw: mode === 'rsi_nw' || mode === 'nw_only' || mode === 'rsi_or_nw',
    cci: mode !== 'rsi_nw' && props.useCCI,
    stch: mode !== 'rsi_nw' && props.useSTCH,
  };
});
</script>
