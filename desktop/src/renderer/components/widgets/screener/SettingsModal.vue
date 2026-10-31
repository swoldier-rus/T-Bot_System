<template>
  <UiModal
    :is-open="isOpen"
    title="Настройки скринера сигналов"
    @close="$emit('close')"
  >
    <!-- Body: Tabs left + Content right -->
    <div class="flex min-h-[280px]">
      <!-- Vertical tabs -->
      <div class="settings-vert-tabs">
        <div
          class="settings-vert-tab"
          :class="{ active: activeTab === 'volume' }"
          @click="activeTab = 'volume'"
        >
          <span>Объем (X дней)</span>
        </div>
        <div
          class="settings-vert-tab"
          :class="{ active: activeTab === 'thresholds' }"
          @click="activeTab = 'thresholds'"
        >
          <span>Пороги RSI / CCI</span>
        </div>
        <div
          class="settings-vert-tab"
          :class="{ active: activeTab === 'appearance' }"
          @click="activeTab = 'appearance'"
        >
          <span>Внешний вид</span>
        </div>
      </div>

      <!-- Tab content -->
      <div class="flex-1 p-4 space-y-4">
        <!-- Tab 1: Volume -->
        <div v-show="activeTab === 'volume'" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-medium" style="color: var(--text-secondary);">
                Период среднего объема (X дней)
              </label>
              <span class="text-xs font-mono font-bold text-[#62A1FF]">
                {{ localDaysX }} дней
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              v-model.number="localDaysX"
              class="kit-slider"
            />
            <div class="flex justify-between text-[10px] font-mono text-[#8CA7BE] mt-1">
              <span>5 дн.</span>
              <span>14 дн.</span>
              <span>20 дн.</span>
              <span>30 дн.</span>
              <span>60 дн.</span>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-[#12151B]/70 border border-[rgba(140,167,190,0.14)] text-xs space-y-1" style="color: var(--text-secondary);">
            <div class="font-medium" style="color: var(--text-primary);">Как считается колонка «Объем»:</div>
            <p class="leading-relaxed m-0">
              Показывает в процентах, насколько текущий дневной объем торгов выше (<span class="text-[#2CE89C]">+64%</span>) или ниже (<span class="text-[#FF6969]">-28%</span>) среднедневного значения за выбранные <strong>X дней</strong>.
            </p>
          </div>
        </div>

        <!-- Tab 2: Thresholds -->
        <div v-show="activeTab === 'thresholds'" class="space-y-3 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span style="color: var(--text-secondary);">Уровни RSI (Покупка / Продажа):</span>
            <div class="flex items-center gap-1.5 font-mono">
              <input
                type="number"
                v-model.number="localThresholds.rsiLow"
                min="10"
                max="45"
                class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#2CE89C]"
              />
              <span>/</span>
              <input
                type="number"
                v-model.number="localThresholds.rsiHigh"
                min="55"
                max="90"
                class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#FF6969]"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-2">
            <span style="color: var(--text-secondary);">Уровни CCI (Покупка / Продажа):</span>
            <div class="flex items-center gap-1.5 font-mono">
              <input
                type="number"
                v-model.number="localThresholds.cciLow"
                step="10"
                class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#2CE89C]"
              />
              <span>/</span>
              <input
                type="number"
                v-model.number="localThresholds.cciHigh"
                step="10"
                class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#FF6969]"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-2">
            <span style="color: var(--text-secondary);">Уровни STCH (Покупка / Продажа):</span>
            <div class="flex items-center gap-1.5 font-mono">
              <input
                type="number"
                v-model.number="localThresholds.stchLow"
                min="5"
                max="40"
                class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#2CE89C]"
              />
              <span>/</span>
              <input
                type="number"
                v-model.number="localThresholds.stchHigh"
                min="60"
                max="95"
                class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-[#FF6969]"
              />
            </div>
          </div>
        </div>

        <!-- Tab 3: Appearance -->
        <div v-show="activeTab === 'appearance'" class="space-y-3 text-xs">
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(140,167,190,0.12)]">
            <div>
              <div class="font-medium text-white">Тема оформления</div>
              <div class="text-[11px] text-[#8CA7BE]">Переключение темной и светлой темы терминала</div>
            </div>
            <button
              type="button"
              @click="$emit('toggleTheme')"
              class="pro-btn pro-btn-secondary !h-7 !px-3"
            >
              Тема: <strong class="text-[#62A1FF] ml-1">{{ theme === 'night' ? 'Night' : 'Light' }}</strong>
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(140,167,190,0.12)]">
            <div>
              <div class="font-medium text-white">Компактный режим строк</div>
              <div class="text-[11px] text-[#8CA7BE]">Уменьшение высоты строк таблицы для большего обзора</div>
            </div>
            <button
              type="button"
              @click="$emit('toggleCondensed')"
              class="pro-btn pro-btn-secondary !h-7 !px-3"
            >
              Компакт: <strong class="text-white ml-1">{{ condensed ? 'ON' : 'OFF' }}</strong>
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(140,167,190,0.12)]">
            <div>
              <div class="font-medium text-white">Повышенный контраст</div>
              <div class="text-[11px] text-[#8CA7BE]">Более четкие разделители и яркие фоны сигналов</div>
            </div>
            <button
              type="button"
              @click="$emit('toggleContrast')"
              class="pro-btn pro-btn-secondary !h-7 !px-3"
            >
              Контраст: <strong class="text-white ml-1">{{ contrast ? 'ON' : 'OFF' }}</strong>
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <div>
              <div class="font-medium text-white">Тест симуляции рынка</div>
              <div class="text-[11px] text-[#8CA7BE]">Симулировать моментальный импульс котировок</div>
            </div>
            <button
              type="button"
              @click="$emit('triggerPulse')"
              class="pro-btn pro-btn-secondary !h-7 !px-3"
            >
              <span class="text-[#FFDD2D]">⚡</span> Импульс рынка
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Footer -->
    <div class="px-4 py-3 border-t border-[rgba(140,167,190,0.14)] flex items-center justify-end gap-2">
      <button
        type="button"
        @click="resetToDefaults"
        class="pro-btn pro-btn-secondary"
      >
        Сбросить по умолчанию
      </button>
      <button
        type="button"
        @click="saveAndClose"
        class="pro-btn pro-btn-primary"
      >
        Сохранить
      </button>
    </div>
  </UiModal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import UiModal from '@/components/ui/UiModal.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  volumeDaysX: {
    type: Number,
    default: 20,
  },
  thresholds: {
    type: Object,
    required: true,
  },
  theme: {
    type: String,
    default: 'night',
  },
  condensed: {
    type: Boolean,
    default: false,
  },
  contrast: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'close',
  'save',
  'reset',
  'toggleTheme',
  'toggleCondensed',
  'toggleContrast',
  'triggerPulse',
]);

const activeTab = ref('volume');
const localDaysX = ref(props.volumeDaysX);
const localThresholds = reactive({ ...props.thresholds });

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    localDaysX.value = props.volumeDaysX;
    Object.assign(localThresholds, props.thresholds);
  }
});

function resetToDefaults() {
  emit('reset');
  localDaysX.value = 20;
  Object.assign(localThresholds, {
    rsiLow: 30,
    rsiHigh: 70,
    cciLow: -100,
    cciHigh: 100,
    stchLow: 20,
    stchHigh: 80,
  });
}

function saveAndClose() {
  emit('save', {
    volumeDaysX: localDaysX.value,
    thresholds: { ...localThresholds },
  });
  emit('close');
}
</script>
