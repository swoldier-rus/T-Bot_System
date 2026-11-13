<template>
  <UiModal
    :is-open="isOpen"
    title="Настройки скринера сигналов"
    @close="$emit('close')"
  >
    <!-- Body: Tabs left + Content right -->
    <div class="flex min-h-[320px]">
      <!-- Vertical tabs -->
      <div class="settings-vert-tabs">
        <div
          class="settings-vert-tab"
          :class="{ active: activeTab === 'indicators' }"
          @click="activeTab = 'indicators'"
        >
          <span>Индикаторы</span>
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
      <div class="flex-1 p-4 overflow-hidden flex flex-col">
        <!-- Tab 1: Indicators Accordion -->
        <div v-show="activeTab === 'indicators'" class="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          <!-- 1. RSI Accordion Card -->
          <div class="rounded-lg overflow-hidden border border-[rgba(140,167,190,0.18)] bg-[#12151B]/80 transition">
            <div
              class="p-2.5 bg-[#161B22] hover:bg-[#1C2128] cursor-pointer flex items-center justify-between select-none transition"
              @click="toggleSection('rsi')"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">📊</span>
                <span class="font-medium text-xs text-white">RSI (Индекс относительной силы)</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12151B] text-[#8CA7BE] border border-[rgba(140,167,190,0.15)]">
                  Период: {{ localIndicatorParams.rsiPeriod }} [{{ localThresholds.rsiLow }}/{{ localThresholds.rsiHigh }}]
                </span>
              </div>
              <span
                class="text-xs text-[#8CA7BE] transition-transform duration-200"
                :class="{ 'rotate-180': openSections.rsi }"
              >
                ▼
              </span>
            </div>

            <div v-show="openSections.rsi" class="p-3 bg-[#12151B]/90 border-t border-[rgba(140,167,190,0.12)] space-y-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">Длина RSI (Период):</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.rsiPeriod"
                    min="2"
                    max="50"
                    class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
                  />
                </div>
              </div>

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
            </div>
          </div>

          <!-- 2. Nadaraya-Watson (NW) Accordion Card -->
          <div class="rounded-lg overflow-hidden border border-[rgba(140,167,190,0.18)] bg-[#12151B]/80 transition">
            <div
              class="p-2.5 bg-[#161B22] hover:bg-[#1C2128] cursor-pointer flex items-center justify-between select-none transition"
              @click="toggleSection('nw')"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">🌊</span>
                <span class="font-medium text-xs text-white">Nadaraya-Watson (NW Envelope)</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12151B] text-[#8CA7BE] border border-[rgba(140,167,190,0.15)]">
                  h: {{ localIndicatorParams.nwBandwidth }} | Mult: {{ localIndicatorParams.nwMult }}
                </span>
              </div>
              <span
                class="text-xs text-[#8CA7BE] transition-transform duration-200"
                :class="{ 'rotate-180': openSections.nw }"
              >
                ▼
              </span>
            </div>

            <div v-show="openSections.nw" class="p-3 bg-[#12151B]/90 border-t border-[rgba(140,167,190,0.12)] space-y-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">Ширина окна Bandwidth (h):</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.nwBandwidth"
                    min="1"
                    max="50"
                    step="0.5"
                    class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">Множитель полос (Multiplier):</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.nwMult"
                    min="0.5"
                    max="10"
                    step="0.5"
                    class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between gap-2 pt-1 border-t border-[rgba(140,167,190,0.10)]">
                <div>
                  <div class="font-medium text-white">Режим LuxAlgo 500 баров</div>
                  <div class="text-[11px] text-[#8CA7BE]">Окно расчёта по алгоритму LuxAlgo TradingView</div>
                </div>
                <input
                  type="checkbox"
                  v-model="localIndicatorParams.nwRepaint"
                  class="cursor-pointer w-4 h-4 accent-[#336FEE]"
                />
              </div>
            </div>
          </div>

          <!-- 3. CCI Accordion Card -->
          <div class="rounded-lg overflow-hidden border border-[rgba(140,167,190,0.18)] bg-[#12151B]/80 transition">
            <div
              class="p-2.5 bg-[#161B22] hover:bg-[#1C2128] cursor-pointer flex items-center justify-between select-none transition"
              @click="toggleSection('cci')"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">🧭</span>
                <span class="font-medium text-xs text-white">CCI (Commodity Channel Index)</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12151B] text-[#8CA7BE] border border-[rgba(140,167,190,0.15)]">
                  Период: {{ localIndicatorParams.cciPeriod }} [{{ localThresholds.cciLow }}/{{ localThresholds.cciHigh }}]
                </span>
              </div>
              <span
                class="text-xs text-[#8CA7BE] transition-transform duration-200"
                :class="{ 'rotate-180': openSections.cci }"
              >
                ▼
              </span>
            </div>

            <div v-show="openSections.cci" class="p-3 bg-[#12151B]/90 border-t border-[rgba(140,167,190,0.12)] space-y-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">Длина CCI (Период):</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.cciPeriod"
                    min="2"
                    max="100"
                    class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
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
            </div>
          </div>

          <!-- 4. Stochastic Oscillator (STCH) Accordion Card -->
          <div class="rounded-lg overflow-hidden border border-[rgba(140,167,190,0.18)] bg-[#12151B]/80 transition">
            <div
              class="p-2.5 bg-[#161B22] hover:bg-[#1C2128] cursor-pointer flex items-center justify-between select-none transition"
              @click="toggleSection('stch')"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">⚡</span>
                <span class="font-medium text-xs text-white">Stochastic Oscillator (STCH)</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12151B] text-[#8CA7BE] border border-[rgba(140,167,190,0.15)]">
                  %K: {{ localIndicatorParams.stochK }} [{{ localThresholds.stchLow }}/{{ localThresholds.stchHigh }}]
                </span>
              </div>
              <span
                class="text-xs text-[#8CA7BE] transition-transform duration-200"
                :class="{ 'rotate-180': openSections.stch }"
              >
                ▼
              </span>
            </div>

            <div v-show="openSections.stch" class="p-3 bg-[#12151B]/90 border-t border-[rgba(140,167,190,0.12)] space-y-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">%K Период:</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.stochK"
                    min="2"
                    max="50"
                    class="w-16 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between gap-2">
                <span style="color: var(--text-secondary);">Сглаживание (%K Smooth / %D):</span>
                <div class="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.stochSmooth"
                    min="1"
                    max="10"
                    class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    v-model.number="localIndicatorParams.stochD"
                    min="1"
                    max="10"
                    class="w-14 h-7 px-2 rounded bg-[#12151B] border border-[rgba(140,167,190,0.2)] text-center text-white"
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
          </div>

          <!-- 5. RVol (Объем) Accordion Card -->
          <div class="rounded-lg overflow-hidden border border-[rgba(140,167,190,0.18)] bg-[#12151B]/80 transition">
            <div
              class="p-2.5 bg-[#161B22] hover:bg-[#1C2128] cursor-pointer flex items-center justify-between select-none transition"
              @click="toggleSection('rvol')"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">📦</span>
                <span class="font-medium text-xs text-white">RVol (Относительный объем торгов)</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12151B] text-[#8CA7BE] border border-[rgba(140,167,190,0.15)]">
                  Период: {{ localDaysX }} дн.
                </span>
              </div>
              <span
                class="text-xs text-[#8CA7BE] transition-transform duration-200"
                :class="{ 'rotate-180': openSections.rvol }"
              >
                ▼
              </span>
            </div>

            <div v-show="openSections.rvol" class="p-3 bg-[#12151B]/90 border-t border-[rgba(140,167,190,0.12)] space-y-3 text-xs">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-medium" style="color: var(--text-secondary);">
                    Период среднего объема (X дней):
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
                  class="kit-slider w-full"
                />
                <div class="flex justify-between text-[10px] font-mono text-[#8CA7BE] mt-1">
                  <span>5 дн.</span>
                  <span>14 дн.</span>
                  <span>20 дн.</span>
                  <span>30 дн.</span>
                  <span>60 дн.</span>
                </div>
              </div>

              <div class="p-2.5 rounded bg-[#12151B] border border-[rgba(140,167,190,0.12)] text-[11px] leading-relaxed text-[#8CA7BE]">
                Показывает в процентах, насколько текущий объем выше (<span class="text-[#2CE89C]">+64%</span>) или ниже (<span class="text-[#FF6969]">-28%</span>) среднедневного за выбранные <strong>{{ localDaysX }} дн.</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Appearance -->
        <div v-show="activeTab === 'appearance'" class="space-y-3 text-xs max-h-[420px] overflow-y-auto pr-1">
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
  indicatorParams: {
    type: Object,
    default: () => ({
      rsiPeriod: 14,
      stochK: 14,
      stochSmooth: 3,
      stochD: 3,
      nwBandwidth: 8.0,
      nwMult: 3.0,
      nwRepaint: true,
      cciPeriod: 20,
    }),
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

const activeTab = ref('indicators');

const openSections = reactive({
  rsi: true,
  nw: false,
  cci: false,
  stch: false,
  rvol: false,
});

function toggleSection(section) {
  openSections[section] = !openSections[section];
}

const localDaysX = ref(props.volumeDaysX);
const localThresholds = reactive({ ...props.thresholds });
const localIndicatorParams = reactive({ ...props.indicatorParams });

watch(() => props.volumeDaysX, (v) => {
  localDaysX.value = v;
});

watch(() => props.thresholds, (t) => {
  Object.assign(localThresholds, t);
}, { deep: true });

watch(() => props.indicatorParams, (p) => {
  if (p) Object.assign(localIndicatorParams, p);
}, { deep: true });

function resetToDefaults() {
  emit('reset');
  emit('close');
}

function saveAndClose() {
  emit('save', {
    volumeDaysX: localDaysX.value,
    thresholds: { ...localThresholds },
    indicatorParams: { ...localIndicatorParams },
  });
  emit('close');
}
</script>
