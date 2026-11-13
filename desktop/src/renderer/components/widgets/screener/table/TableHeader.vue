<template>
  <thead>
    <tr>
      <!-- Fixed 1st Column: Instrument -->
      <th class="w-[145px] text-left cursor-pointer" @click="$emit('sort', 'ticker')">
        <div class="flex items-center gap-1">
          <span>Инструмент</span>
          <span class="text-[10px]" :class="sortBy === 'ticker' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'ticker' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <!-- Reorderable & Hideable Dynamic Columns -->
      <template v-for="col in visibleColumns" :key="col.id">
        <!-- 1. Price / Change -->
        <th
          v-if="col.id === 'price'"
          class="w-[115px] text-right cursor-pointer"
          @click="$emit('sort', 'change')"
        >
          <div class="flex items-center justify-end gap-1">
            <span>Цена / Изм</span>
            <span class="text-[10px]" :class="sortBy === 'change' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'change' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 2. Volume -->
        <th
          v-else-if="col.id === 'volume'"
          class="w-[145px] text-right cursor-pointer"
          @click="$emit('sort', 'volumeDiff')"
          :title="`Отклонение текущего объема от среднего за ${volumeDaysX} дней`"
        >
          <div class="flex items-center justify-end gap-1">
            <span>Объем ({{ volumeDaysX }}д)</span>
            <span class="text-[10px]" :class="sortBy === 'volumeDiff' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'volumeDiff' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 3. RSI -->
        <th
          v-else-if="col.id === 'rsi'"
          class="w-[95px] text-center cursor-pointer"
          @click="$emit('sort', 'rsi')"
        >
          <div class="flex items-center justify-center gap-1">
            <span>RSI</span>
            <span class="text-[10px]" :class="sortBy === 'rsi' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'rsi' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 4. NW -->
        <th
          v-else-if="col.id === 'nw'"
          class="w-[115px] text-center cursor-pointer"
          @click="$emit('sort', 'nw')"
        >
          <div class="flex items-center justify-center gap-1">
            <span>NW</span>
            <span class="text-[10px]" :class="sortBy === 'nw' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'nw' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 5. CCI -->
        <th
          v-else-if="col.id === 'cci'"
          class="w-[95px] text-center cursor-pointer"
          @click="$emit('sort', 'cci')"
        >
          <div class="flex items-center justify-center gap-1">
            <span>CCI</span>
            <span class="text-[10px]" :class="sortBy === 'cci' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'cci' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 6. STCH -->
        <th
          v-else-if="col.id === 'stch'"
          class="w-[95px] text-center cursor-pointer"
          @click="$emit('sort', 'stch')"
        >
          <div class="flex items-center justify-center gap-1">
            <span>STCH</span>
            <span class="text-[10px]" :class="sortBy === 'stch' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'stch' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>

        <!-- 7. Status -->
        <th
          v-else-if="col.id === 'status'"
          class="w-[135px] text-right cursor-pointer"
          @click="$emit('sort', 'statusScore')"
        >
          <div class="flex items-center justify-end gap-1">
            <span>Статус</span>
            <span class="text-[10px]" :class="sortBy === 'statusScore' ? 'text-[#62A1FF]' : 'opacity-60'">
              {{ sortBy === 'statusScore' ? (sortDesc ? '▼' : '▲') : '' }}
            </span>
          </div>
        </th>
      </template>
    </tr>
  </thead>
</template>

<script setup>
import { computed } from 'vue';
import { DEFAULT_TABLE_COLUMNS } from '@/composables/useSettings.js';

const props = defineProps({
  sortBy: {
    type: String,
    default: 'statusScore',
  },
  sortDesc: {
    type: Boolean,
    default: true,
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
  columns: {
    type: Array,
    default: () => [],
  },
});

defineEmits(['sort']);

const visibleColumns = computed(() => {
  if (Array.isArray(props.columns) && props.columns.length > 0) {
    return props.columns.filter(c => c.visible !== false);
  }
  return DEFAULT_TABLE_COLUMNS;
});
</script>
