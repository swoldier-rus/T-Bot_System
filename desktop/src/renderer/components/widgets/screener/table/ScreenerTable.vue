<template>
  <div class="flex-1 overflow-auto min-h-0">
    <table class="screener-table" :style="{ minWidth: tableMinWidth + 'px' }">
      <TableHeader
        :sort-by="sortBy"
        :sort-desc="sortDesc"
        :use-c-c-i="useCCI"
        :use-s-t-c-h="useSTCH"
        :volume-days-x="volumeDaysX"
        :columns="columns"
        @sort="$emit('sort', $event)"
      />

      <tbody class="tabular-nums">
        <tr v-if="rows.length === 0">
          <td :colspan="1 + visibleColumns.length" class="text-center py-8 text-xs" style="color: var(--text-secondary);">
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
          <!-- 1. Instrument (Always Fixed First) -->
          <RowInstrument
            :row="row"
            :is-favorite="isFavorite(row.ticker)"
            :edit-favorites-mode="editFavoritesMode"
            @toggle-favorite="$emit('toggleFavorite', $event)"
          />

          <!-- 2. Dynamic Reorderable Columns -->
          <template v-for="col in visibleColumns" :key="col.id">
            <RowPrice
              v-if="col.id === 'price'"
              :price="row.price"
              :change="row.change"
            />

            <RowVolume
              v-else-if="col.id === 'volume'"
              :volume-diff="row.volumeDiff"
              :vol-rub-mln="row.volRubMln"
              :volume-days-x="volumeDaysX"
            />

            <RowIndicatorCell
              v-else-if="col.id === 'rsi'"
              :value="row.rsi"
              :signal="row.rsiSignal"
              type="rsi"
              :participates="activeIndicators.rsi"
            />

            <RowIndicatorCell
              v-else-if="col.id === 'nw'"
              :value="row.nw"
              :signal="row.nwSignal"
              type="nw"
              :participates="activeIndicators.nw"
            />

            <RowIndicatorCell
              v-else-if="col.id === 'cci'"
              :value="row.cci"
              :signal="row.cciSignal"
              type="cci"
              :participates="activeIndicators.cci"
            />

            <RowIndicatorCell
              v-else-if="col.id === 'stch'"
              :value="row.stch"
              :signal="row.stchSignal"
              type="stch"
              :participates="activeIndicators.stch"
            />

            <RowStatus
              v-else-if="col.id === 'status'"
              :status="row.finalStatus"
              :reasons-text="row.reasonsText"
            />
          </template>
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
import { DEFAULT_TABLE_COLUMNS, calculateMinTableWidth } from '@/composables/useSettings.js';

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
  columns: {
    type: Array,
    default: () => [],
  },
});

defineEmits(['sort', 'resetFilters', 'toggleFavorite']);

const tableMinWidth = computed(() => calculateMinTableWidth(props.columns));

const visibleColumns = computed(() => {
  if (Array.isArray(props.columns) && props.columns.length > 0) {
    return props.columns.filter(c => c.visible !== false);
  }
  return DEFAULT_TABLE_COLUMNS;
});

const activeIndicators = computed(() => {
  const mode = props.strategyMode;
  if (mode === 'rsi_nw') {
    return {
      rsi: true,
      nw: true,
      cci: props.useCCI,
      stch: props.useSTCH,
    };
  } else if (mode === 'rsi_only') {
    return {
      rsi: true,
      nw: false,
      cci: props.useCCI,
      stch: props.useSTCH,
    };
  } else if (mode === 'nw_only') {
    return {
      rsi: false,
      nw: true,
      cci: props.useCCI,
      stch: props.useSTCH,
    };
  } else if (mode === 'rsi_or_nw') {
    return {
      rsi: true,
      nw: true,
      cci: props.useCCI,
      stch: props.useSTCH,
    };
  }
  return {
    rsi: true,
    nw: true,
    cci: props.useCCI,
    stch: props.useSTCH,
  };
});
</script>
