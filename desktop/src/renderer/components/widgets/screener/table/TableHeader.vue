<template>
  <thead>
    <tr>
      <th class="w-[145px] text-left cursor-pointer" @click="$emit('sort', 'ticker')">
        <div class="flex items-center gap-1">
          <span>Инструмент</span>
          <span class="text-[10px]" :class="sortBy === 'ticker' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'ticker' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th class="w-[115px] text-right cursor-pointer" @click="$emit('sort', 'change')">
        <div class="flex items-center justify-end gap-1">
          <span>Цена / Изм</span>
          <span class="text-[10px]" :class="sortBy === 'change' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'change' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th class="w-[145px] text-right cursor-pointer" @click="$emit('sort', 'volumeDiff')" :title="`Отклонение текущего объема от среднего за ${volumeDaysX} дней`">
        <div class="flex items-center justify-end gap-1">
          <span>Объем ({{ volumeDaysX }}д)</span>
          <span class="text-[10px]" :class="sortBy === 'volumeDiff' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'volumeDiff' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th class="w-[95px] text-center cursor-pointer" @click="$emit('sort', 'rsi')">
        <div class="flex items-center justify-center gap-1">
          <span>RSI</span>
          <span class="text-[10px]" :class="sortBy === 'rsi' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'rsi' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th class="w-[115px] text-center cursor-pointer" @click="$emit('sort', 'nw')">
        <div class="flex items-center justify-center gap-1">
          <span>NW</span>
          <span class="text-[10px]" :class="sortBy === 'nw' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'nw' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th
        class="w-[95px] text-center cursor-pointer"
        :class="{ 'col-muted': !useCCI }"
        @click="$emit('sort', 'cci')"
      >
        <div class="flex items-center justify-center gap-1">
          <span>CCI</span>
          <span class="text-[10px]" :class="sortBy === 'cci' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'cci' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th
        class="w-[95px] text-center cursor-pointer"
        :class="{ 'col-muted': !useSTCH }"
        @click="$emit('sort', 'stch')"
      >
        <div class="flex items-center justify-center gap-1">
          <span>STCH</span>
          <span class="text-[10px]" :class="sortBy === 'stch' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'stch' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>

      <th class="w-[135px] text-right cursor-pointer" @click="$emit('sort', 'statusScore')">
        <div class="flex items-center justify-end gap-1">
          <span>Статус</span>
          <span class="text-[10px]" :class="sortBy === 'statusScore' ? 'text-[#62A1FF]' : 'opacity-60'">
            {{ sortBy === 'statusScore' ? (sortDesc ? '▼' : '▲') : '' }}
          </span>
        </div>
      </th>
    </tr>
  </thead>
</template>

<script setup>
defineProps({
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
});

defineEmits(['sort']);
</script>
