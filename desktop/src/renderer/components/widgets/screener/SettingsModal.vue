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
          :class="{ active: activeTab === 'table' }"
          @click="activeTab = 'table'"
        >
          <span>Настройки таблицы</span>
        </div>
        <div
          class="settings-vert-tab"
          :class="{ active: activeTab === 'alerts' }"
          @click="activeTab = 'alerts'"
        >
          <span>Оповещения</span>
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
              <span class="font-medium text-xs text-white">RSI (Индекс относительной силы)</span>
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
              <span class="font-medium text-xs text-white">NWE (Конверт Надарая-Ватсона)</span>
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
              <span class="font-medium text-xs text-white">CCI (Индекс товарного канала)</span>
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
              <span class="font-medium text-xs text-white">STCH (Стохастический осциллятор)</span>
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
              <span class="font-medium text-xs text-white">RVol (Относительный объем торгов)</span>
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

        <!-- Tab 2: Table Columns Reorder & Visibility -->
        <div v-show="activeTab === 'table'" class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          <div class="text-[11px] text-[#8CA7BE] mb-2 px-0.5">
            Перетаскивайте строки для настройки порядка столбцов в таблице. Используйте чекбоксы для скрытия или отображения столбцов.
          </div>

          <div class="space-y-1.5 select-none">
            <div
              v-for="(col, idx) in localTableColumns"
              :key="col.id"
              draggable="true"
              @dragstart="onDragStart(idx, $event)"
              @dragover.prevent="onDragOver(idx, $event)"
              @dragleave="onDragLeave(idx)"
              @drop="onDrop(idx, $event)"
              @dragend="onDragEnd"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition cursor-default bg-[#161B22] hover:bg-[#1C2128]"
              :class="[
                dragOverIndex === idx ? 'border-[#336FEE] bg-[#1E2633]' : 'border-[rgba(140,167,190,0.14)]',
                dragIndex === idx ? 'opacity-40' : 'opacity-100'
              ]"
            >
              <!-- Drag handle -->
              <div
                class="cursor-grab active:cursor-grabbing text-[#708BA4] hover:text-white transition p-0.5"
                title="Потяните для изменения порядка"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>

              <!-- Checkbox + Label -->
              <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  v-model="col.visible"
                  class="sr-only"
                />
                <div
                  class="w-4 h-4 rounded flex items-center justify-center transition border"
                  :class="col.visible ? 'bg-[#336FEE] border-[#428BF9] text-white' : 'bg-[#12151B] border-[rgba(140,167,190,0.3)] text-transparent'"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-xs font-medium text-white truncate">{{ col.label }}</span>
              </label>

              <!-- Help/Tooltip icon -->
              <div class="relative group/tip shrink-0">
                <button
                  type="button"
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[#708BA4] hover:text-white hover:bg-[rgba(140,167,190,0.15)] transition cursor-help border-none bg-transparent"
                  :title="col.hint"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2.5" stroke-linecap="round" />
                  </svg>
                </button>
                <div
                  class="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block z-50 w-64 p-2 text-[11px] leading-tight text-white bg-[#1C2128] border border-[rgba(140,167,190,0.25)] rounded shadow-xl pointer-events-none"
                >
                  {{ col.hint }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Alerts Settings -->
        <div v-show="activeTab === 'alerts'" class="space-y-3 max-h-[420px] overflow-y-auto pr-1 text-xs">
          <!-- Card 1: Trigger Mode & Scope -->
          <div class="rounded-lg p-3 bg-[#161B22] border border-[rgba(140,167,190,0.18)] space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-medium text-white text-xs">Режим срабатывания</span>
              <span class="text-[10px] text-[#8CA7BE]">По активному фильтру тулбара</span>
            </div>

            <div class="space-y-2 pt-0.5">
              <label class="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="triggerMode"
                  value="once"
                  v-model="localAlerts.triggerMode"
                  class="mt-0.5 accent-[#336FEE]"
                />
                <div>
                  <div class="text-white font-medium">Однократно при возникновении сигнала</div>
                  <div style="color: var(--text-secondary);" class="text-[11px]">
                    Срабатывает один раз при переходе в Buy или Sell. Повтор только после сброса в Wait.
                  </div>
                </div>
              </label>

              <label class="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="triggerMode"
                  value="interval"
                  v-model="localAlerts.triggerMode"
                  class="mt-0.5 accent-[#336FEE]"
                />
                <div>
                  <div class="text-white font-medium">Повторять пока сигнал действует</div>
                  <div style="color: var(--text-secondary);" class="text-[11px]">
                    Периодически напоминать о действующем сигнале через заданный интервал.
                  </div>
                </div>
              </label>
            </div>

            <!-- Interval duration (if interval selected) -->
            <div
              v-show="localAlerts.triggerMode === 'interval'"
              class="flex items-center justify-between pt-2 border-t border-[rgba(140,167,190,0.12)]"
            >
              <span style="color: var(--text-secondary);">Интервал повтора:</span>
              <div class="flex items-center gap-1.5 font-mono">
                <input
                  type="number"
                  v-model.number="localAlerts.repeatIntervalMin"
                  min="1"
                  max="60"
                  class="w-16 h-7 px-2 text-center text-xs rounded bg-[#0D1117] border border-[rgba(140,167,190,0.2)] text-white focus:outline-none focus:border-[#336FEE]"
                />
                <span class="text-[11px] text-[#8CA7BE]">мин</span>
              </div>
            </div>
          </div>

          <!-- Card 2: System Notifications -->
          <div class="rounded-lg p-3 bg-[#161B22] border border-[rgba(140,167,190,0.18)] flex items-center justify-between gap-2">
            <div>
              <div class="font-medium text-white text-xs">Системные уведомления Windows</div>
              <div class="text-[11px]" style="color: var(--text-secondary);">
                Всплывающие карточки на рабочем столе с тикером, ценой и индикаторами
              </div>
            </div>
            <button
              type="button"
              @click="localAlerts.systemNotifications = !localAlerts.systemNotifications"
              class="pro-btn pro-btn-secondary !h-7 !px-3"
            >
              Уведомления: <strong :class="localAlerts.systemNotifications ? 'text-[#2CE89C]' : 'text-[#8CA7BE]'" class="ml-1">{{ localAlerts.systemNotifications ? 'ВКЛ' : 'ВЫКЛ' }}</strong>
            </button>
          </div>

          <!-- Card 3: Sound Alerts & Custom Files -->
          <div class="rounded-lg p-3 bg-[#161B22] border border-[rgba(140,167,190,0.18)] space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="font-medium text-white text-xs">Звуковые сигналы</div>
                <div class="text-[11px]" style="color: var(--text-secondary);">
                  Воспроизведение звука при поступлении сигнала
                </div>
              </div>
              <button
                type="button"
                @click="localAlerts.soundEnabled = !localAlerts.soundEnabled"
                class="pro-btn pro-btn-secondary !h-7 !px-3"
              >
                Звук: <strong :class="localAlerts.soundEnabled ? 'text-[#2CE89C]' : 'text-[#8CA7BE]'" class="ml-1">{{ localAlerts.soundEnabled ? 'ВКЛ' : 'ВЫКЛ' }}</strong>
              </button>
            </div>

            <!-- Volume Slider -->
            <div class="flex items-center justify-between gap-3 pt-1 border-t border-[rgba(140,167,190,0.12)]" :class="{ 'opacity-50 pointer-events-none': !localAlerts.soundEnabled }">
              <span style="color: var(--text-secondary);" class="whitespace-nowrap">Громкость звука:</span>
              <div class="flex items-center gap-2 flex-1 max-w-[200px]">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  v-model.number="localAlerts.soundVolume"
                  class="w-full h-1.5 bg-[#21262D] rounded-lg appearance-none cursor-pointer accent-[#336FEE]"
                />
                <span class="font-mono text-white min-w-[34px] text-right">{{ localAlerts.soundVolume }}%</span>
              </div>
            </div>

            <!-- Buy Sound File -->
            <div class="pt-2 border-t border-[rgba(140,167,190,0.12)] space-y-1.5" :class="{ 'opacity-50 pointer-events-none': !localAlerts.soundEnabled }">
              <div class="flex items-center justify-between">
                <span class="font-medium text-[#2CE89C] flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#2CE89C]"></span>
                  Звук для Buy (Покупка):
                </span>
                <button
                  type="button"
                  @click="testSoundPreview('BUY')"
                  class="px-2 py-0.5 rounded text-[11px] bg-[rgba(44,232,156,0.15)] text-[#2CE89C] hover:bg-[rgba(44,232,156,0.25)] border border-[rgba(44,232,156,0.3)] cursor-pointer transition flex items-center gap-1"
                >
                  ▶ Прослушать
                </button>
              </div>

              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 px-2.5 py-1 text-[11px] rounded bg-[#0D1117] border border-[rgba(140,167,190,0.2)] text-[#8CA7BE] truncate font-mono">
                  {{ localAlerts.buySoundPath ? getFilename(localAlerts.buySoundPath) : 'Встроенный синтезатор (аккорд C-E-G)' }}
                </div>
                <button
                  type="button"
                  @click="chooseSoundFile('BUY')"
                  class="px-2.5 py-1 rounded text-xs bg-[#21262D] hover:bg-[#30363D] text-white border border-[rgba(140,167,190,0.25)] cursor-pointer transition whitespace-nowrap"
                >
                  Обзор...
                </button>
                <button
                  v-if="localAlerts.buySoundPath"
                  type="button"
                  @click="localAlerts.buySoundPath = ''"
                  title="Сбросить на встроенный звук"
                  class="px-2 py-1 rounded text-xs text-[#FF6969] hover:bg-[#FF6969]/10 border border-transparent cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Sell Sound File -->
            <div class="pt-2 border-t border-[rgba(140,167,190,0.12)] space-y-1.5" :class="{ 'opacity-50 pointer-events-none': !localAlerts.soundEnabled }">
              <div class="flex items-center justify-between">
                <span class="font-medium text-[#FF6969] flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#FF6969]"></span>
                  Звук для Sell (Продажа):
                </span>
                <button
                  type="button"
                  @click="testSoundPreview('SELL')"
                  class="px-2 py-0.5 rounded text-[11px] bg-[rgba(255,105,105,0.15)] text-[#FF6969] hover:bg-[rgba(255,105,105,0.25)] border border-[rgba(255,105,105,0.3)] cursor-pointer transition flex items-center gap-1"
                >
                  ▶ Прослушать
                </button>
              </div>

              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 px-2.5 py-1 text-[11px] rounded bg-[#0D1117] border border-[rgba(140,167,190,0.2)] text-[#8CA7BE] truncate font-mono">
                  {{ localAlerts.sellSoundPath ? getFilename(localAlerts.sellSoundPath) : 'Встроенный синтезатор (аккорд G-E-C)' }}
                </div>
                <button
                  type="button"
                  @click="chooseSoundFile('SELL')"
                  class="px-2.5 py-1 rounded text-xs bg-[#21262D] hover:bg-[#30363D] text-white border border-[rgba(140,167,190,0.25)] cursor-pointer transition whitespace-nowrap"
                >
                  Обзор...
                </button>
                <button
                  v-if="localAlerts.sellSoundPath"
                  type="button"
                  @click="localAlerts.sellSoundPath = ''"
                  title="Сбросить на встроенный звук"
                  class="px-2 py-1 rounded text-xs text-[#FF6969] hover:bg-[#FF6969]/10 border border-transparent cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Appearance -->
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
import { DEFAULT_TABLE_COLUMNS, DEFAULT_ALERTS } from '@/composables/useSettings.js';
import { playAlertSound } from '@/services/soundService.js';

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
  alerts: {
    type: Object,
    default: () => ({ ...DEFAULT_ALERTS }),
  },
  tableColumns: {
    type: Array,
    default: () => [],
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


const localAlerts = reactive({
  ...DEFAULT_ALERTS,
  ...(props.alerts || {}),
});

watch(() => props.alerts, (newA) => {
  if (newA) Object.assign(localAlerts, newA);
}, { deep: true });

function getFilename(path) {
  if (!path) return '';
  const parts = path.split(/[\/\\]/);
  return parts[parts.length - 1];
}

async function chooseSoundFile(direction) {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.selectAudioFile === 'function') {
    const filePath = await window.electronAPI.selectAudioFile();
    if (filePath) {
      if (direction === 'BUY') {
        localAlerts.buySoundPath = filePath;
      } else {
        localAlerts.sellSoundPath = filePath;
      }
    }
  }
}

function testSoundPreview(direction) {
  const customPath = direction === 'BUY' ? localAlerts.buySoundPath : localAlerts.sellSoundPath;
  playAlertSound({
    direction,
    customPath,
    volume: localAlerts.soundVolume,
  });
}

const localTableColumns = reactive([]);

function syncLocalColumns(cols) {
  localTableColumns.length = 0;
  if (Array.isArray(cols) && cols.length > 0) {
    cols.forEach(c => localTableColumns.push({ ...c }));
  } else {
    DEFAULT_TABLE_COLUMNS.forEach(c => localTableColumns.push({ ...c }));
  }
}

watch(() => props.tableColumns, (cols) => {
  syncLocalColumns(cols);
}, { immediate: true, deep: true });

const dragIndex = ref(null);
const dragOverIndex = ref(null);

function onDragStart(index, event) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = index;
}

function onDragLeave(index) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
}

function onDrop(index, event) {
  event.preventDefault();
  const fromIndex = dragIndex.value;
  const toIndex = index;
  if (fromIndex !== null && fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
    const item = localTableColumns.splice(fromIndex, 1)[0];
    localTableColumns.splice(toIndex, 0, item);
  }
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

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
    alerts: { ...localAlerts },
    tableColumns: localTableColumns.map(c => ({ ...c })),
  });
  emit('close');
}
</script>
