<script setup lang="ts">
import { useDark } from '@vueuse/core';
import type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
  VolumeUnits,
} from '@welldot/core';
import type { CoordinateFormat } from '~/stores/ui.store';

const visible = defineModel<boolean>({ default: false });

const { t, locale, locales, setLocale } = useI18n();
const uiStore = useUiStore();

const viewport = useViewport();
const isMobile = computed(() => viewport.isLessThan('lg'));

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark-mode',
  valueLight: '',
});

const lengthUnitOptions: LengthUnits[] = ['m', 'ft'];
const diameterUnitOptions: DiameterUnits[] = ['mm', 'inches'];
const flowUnitOptions = (['m3/h', 'L/s', 'gpm'] as FlowUnits[]).map(value => ({
  value,
  label: resolveFlowUnitLabel(value),
}));
const powerUnitOptions: PowerUnits[] = ['kW', 'cv', 'hp'];
const volumeUnitOptions = (['m3', 'L', 'ft3', 'gal'] as VolumeUnits[]).map(
  value => ({ value, label: resolveVolumeUnitLabel(value) }),
);
const coordinateFormatOptions: CoordinateFormat[] = ['DD', 'DMS'];

const currentLocale = computed({
  get: () => locale.value,
  set: (val: string) => setLocale(val as 'en' | 'pt'),
});

const localeOptions = locales.value.map(l => l.code);

const togglePt = {
  root: {
    class: [
      'size-8 rounded-lg border flex items-center justify-center cursor-pointer',
      'transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      'border-surface-200 text-content-400',
      'hover:border-surface-300 hover:text-content-0',
    ],
  },
};
</script>

<template>
  <Drawer
    v-model:visible="visible"
    :position="isMobile ? 'bottom' : 'right'"
    :header="t('editor.settings.title')"
    :class="isMobile ? 'h-auto max-h-[85vh] rounded-t-2xl' : 'w-104!'"
  >
    <div class="flex flex-col gap-5 pt-1">
      <!-- Units -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 text-content-400">
          <Icon name="ph:ruler-duotone" class="size-4 shrink-0" />
          <span class="text-xs font-semibold uppercase tracking-wider">
            {{ t('editor.settings.units.title') }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.units.length') }}
          </span>
          <SelectButton
            v-model="uiStore.lengthUnit"
            :options="lengthUnitOptions"
            :allow-empty="false"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.units.diameter') }}
          </span>
          <SelectButton
            v-model="uiStore.diameterUnit"
            :options="diameterUnitOptions"
            :allow-empty="false"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.units.flow') }}
          </span>
          <SelectButton
            v-model="uiStore.flowUnit"
            :options="flowUnitOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.units.power') }}
          </span>
          <SelectButton
            v-model="uiStore.powerUnit"
            :options="powerUnitOptions"
            :allow-empty="false"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.units.volume') }}
          </span>
          <SelectButton
            v-model="uiStore.volumeUnit"
            :options="volumeUnitOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
        </div>
      </div>

      <Divider />

      <!-- Coordinates -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 text-content-400">
          <Icon name="ph:map-pin-duotone" class="size-4 shrink-0" />
          <span class="text-xs font-semibold uppercase tracking-wider">
            {{ t('editor.settings.coordinates.title') }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.coordinates.format') }}
          </span>
          <SelectButton
            v-model="uiStore.coordinateFormat"
            :options="coordinateFormatOptions"
            :allow-empty="false"
          />
        </div>
      </div>

      <Divider />

      <!-- Appearance -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 text-content-400">
          <Icon name="ph:palette-duotone" class="size-4 shrink-0" />
          <span class="text-xs font-semibold uppercase tracking-wider">
            {{ t('editor.settings.appearance.title') }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.appearance.theme') }}
          </span>
          <ToggleButton
            v-model="isDark"
            :on-label="''"
            :off-label="''"
            :aria-label="isDark ? t('nav.theme.light') : t('nav.theme.dark')"
            unstyled
            :pt="togglePt"
          >
            <Transition name="icon-rotate" mode="out-in">
              <Icon
                v-if="isDark"
                key="sun"
                name="heroicons:sun"
                class="size-4 shrink-0"
              />
              <Icon
                v-else
                key="moon"
                name="heroicons:moon"
                class="size-4 shrink-0"
              />
            </Transition>
          </ToggleButton>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-content-0">
            {{ t('editor.settings.appearance.language') }}
          </span>
          <SelectButton
            v-model="currentLocale"
            :options="localeOptions"
            :allow-empty="false"
          />
        </div>
      </div>
    </div>
  </Drawer>
</template>
