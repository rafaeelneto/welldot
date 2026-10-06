<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import AppChip from '~/components/AppChip.vue';
import EventCard from './hydrodynamicEvents/EventCard.vue';
import EventDialog from './hydrodynamicEvents/EventDialog.vue';

const { t } = useI18n();
const profileStore = useProfileStore();
const { toFlow, flowUnit, toSpecificCapacity, specificCapacityUnit } =
  useUnitFormat();
const { typeOptions } = useHydrodynamicEventTypes();
const eventDialogRef =
  useTemplateRef<InstanceType<typeof EventDialog>>('eventDialogRef');

// ─── Sub-tab ──────────────────────────────────────────────────────────────────

const activeSubTab = ref<string>('measurements');

// ─── Type filter ──────────────────────────────────────────────────────────────

const activeTypeFilter = ref<string | null>(null);

// ─── Events ───────────────────────────────────────────────────────────────────

const allEvents = computed<HydrodynamicEvent[]>(() =>
  [...(profileStore.well.hydrodynamic_events ?? [])].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  ),
);

const filteredEvents = computed<HydrodynamicEvent[]>(() => {
  if (!activeTypeFilter.value) return allEvents.value;
  return allEvents.value.filter(e => e.type === activeTypeFilter.value);
});

// ─── Current State ────────────────────────────────────────────────────────────

const { state: currentState } = useAquiferState();

const analysesCount = computed(
  () => profileStore.well.aquifer_analysis?.length ?? 0,
);

// ─── Display helpers ──────────────────────────────────────────────────────────

function methodLabel(method?: string): string {
  return aquiferMethodLabel(method);
}

function formatTransmissivityMantissa(val: number): string {
  return scientificParts(val).mantissa;
}

function formatTransmissivityExp(val: number): string {
  return scientificParts(val).exp;
}

function toggleTypeFilter(type: string) {
  activeTypeFilter.value = activeTypeFilter.value === type ? null : type;
}
</script>

<template>
  <div class="flex flex-col overflow-auto">
    <!-- ── Current State ─────────────────────────────────────────────────────── -->
    <div class="px-6 pt-6 pb-5 border-b border-surface-200/60">
      <div class="flex items-baseline justify-between mb-4">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.hydrodynamicEvents.currentState.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          CONSULTAS · § ESTADO
        </span>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- NE ATUAL -->
        <div class="stat-card">
          <span class="stat-label">{{
            t('editor.hydrodynamicEvents.currentState.ne')
          }}</span>
          <template v-if="currentState.ne">
            <div class="stat-value">
              {{ currentState.ne.value.toFixed(2)
              }}<span class="stat-unit">m</span>
            </div>
            <span class="stat-sub font-mono text-[10px] text-content-400">
              {{ formatDate(currentState.ne.datetime, 'dd MMM yyyy') }}
            </span>
          </template>
          <span v-else class="stat-value stat-empty">—</span>
        </div>

        <!-- CAP. ESPECÍFICA -->
        <div class="stat-card">
          <span class="stat-label">{{
            t('editor.hydrodynamicEvents.currentState.specificCapacity')
          }}</span>
          <template v-if="currentState.specificCapacity">
            <div class="stat-value">
              {{
                toSpecificCapacity(currentState.specificCapacity.value).toFixed(
                  1,
                )
              }}<span class="stat-unit">{{ specificCapacityUnit }}</span>
            </div>
            <span v-if="currentState.specificCapacity.method" class="stat-sub">
              {{ methodLabel(currentState.specificCapacity.method) }}
            </span>
          </template>
          <span v-else class="stat-value stat-empty">—</span>
        </div>

        <!-- TRANSMISSIVIDADE -->
        <div class="stat-card">
          <span class="stat-label">{{
            t('editor.hydrodynamicEvents.currentState.transmissivity')
          }}</span>
          <template v-if="currentState.transmissivity">
            <div class="stat-value transmissivity-value">
              {{
                formatTransmissivityMantissa(currentState.transmissivity.value)
              }}
              <span class="stat-unit"> · 10</span>
              <sup>{{
                formatTransmissivityExp(currentState.transmissivity.value)
              }}</sup>
              <span class="stat-unit"> m²/s</span>
            </div>
            <span v-if="currentState.transmissivity.method" class="stat-sub">
              {{ methodLabel(currentState.transmissivity.method) }}
            </span>
          </template>
          <span v-else class="stat-value stat-empty">—</span>
        </div>

        <!-- ND (optional) -->
        <div v-if="currentState.dynamicLevel" class="stat-card">
          <span class="stat-label">{{
            t('editor.hydrodynamicEvents.currentState.dynamicLevel')
          }}</span>
          <div class="stat-value">
            {{ currentState.dynamicLevel.value.toFixed(2)
            }}<span class="stat-unit">m</span>
          </div>
        </div>

        <!-- VAZÃO Q (optional) -->
        <div v-if="currentState.flowRate" class="stat-card">
          <span class="stat-label">{{
            t('editor.hydrodynamicEvents.currentState.flowRate')
          }}</span>
          <div class="stat-value">
            {{
              toFlow(currentState.flowRate.value).toFixed(
                flowUnit === 'm³/h' ? 0 : 1,
              )
            }}<span class="stat-unit">{{ flowUnit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Ledger note ──────────────────────────────────────────────────────── -->
    <div
      class="flex items-center gap-2 px-6 py-2.5 text-[11px] text-content-400 border-b border-surface-200/40 bg-surface-50"
    >
      <Icon
        name="ph:clock-counter-clockwise-duotone"
        class="size-3.5 shrink-0 opacity-70"
      />
      {{ t('editor.hydrodynamicEvents.ledgerNote') }}
    </div>

    <!-- ── Sub-tabs ─────────────────────────────────────────────────────────── -->
    <Tabs v-model:value="activeSubTab">
      <TabList class="pl-6">
        <Tab value="measurements">
          <span class="flex items-center gap-1.5">
            {{ t('editor.hydrodynamicEvents.tabs.measurements') }}
            <Badge
              v-if="allEvents.length"
              :value="allEvents.length"
              severity="secondary"
              class="!text-[10px] !min-w-4 !h-4"
            />
          </span>
        </Tab>
        <Tab value="analyses" disabled>
          <span class="flex items-center gap-1.5">
            {{ t('editor.hydrodynamicEvents.tabs.analyses') }}
            <Badge
              v-if="analysesCount"
              :value="analysesCount"
              severity="secondary"
              class="!text-[10px] !min-w-4 !h-4"
            />
            <span
              class="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-surface-200 text-content-400"
            >
              {{ t('editor.tabs.inDevelopment') }}
            </span>
          </span>
        </Tab>
      </TabList>

      <TabPanels>
        <!-- ── MEASUREMENTS ────────────────────────────────────────────────── -->
        <TabPanel value="measurements">
          <div class="flex flex-col gap-4 p-6">
            <!-- toolbar -->
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="flex flex-wrap gap-1.5">
                <AppChip
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :active="activeTypeFilter === opt.value"
                  @click="toggleTypeFilter(opt.value)"
                />
              </div>
              <Button
                unstyled
                class="add-entry-btn shrink-0"
                type="button"
                :label="t('editor.hydrodynamicEvents.addEvent')"
                @click="eventDialogRef?.openAdd()"
              >
                <template #icon>
                  <Icon name="ph:plus" />
                </template>
              </Button>
            </div>

            <!-- empty state -->
            <div
              v-if="!allEvents.length"
              class="flex flex-col items-center gap-4 py-10 text-content-400"
            >
              <Icon name="ph:chart-line-duotone" class="size-12 opacity-40" />
              <p class="text-sm m-0">
                {{ t('editor.hydrodynamicEvents.empty') }}
              </p>
            </div>

            <!-- no results -->
            <div
              v-else-if="!filteredEvents.length"
              class="flex flex-col items-center gap-3 py-10 text-content-400"
            >
              <Icon
                name="ph:funnel-simple-duotone"
                class="size-10 opacity-40"
              />
              <p class="text-sm m-0">
                {{ t('editor.hydrodynamicEvents.noResults') }}
              </p>
            </div>

            <!-- event cards -->
            <div v-else class="flex flex-col gap-3">
              <EventCard
                v-for="event in filteredEvents"
                :key="event.id"
                :event="event"
                @edit="eventDialogRef?.openEdit($event)"
              />
            </div>
          </div>
        </TabPanel>

        <!-- ── ANALYSES (in-development placeholder) ──────────────────────── -->
        <TabPanel value="analyses">
          <div class="flex flex-col items-center gap-5 py-16 px-6 text-center">
            <Icon
              name="ph:chart-line-up-duotone"
              class="size-14 text-content-300 opacity-30"
            />
            <div class="flex flex-col gap-2">
              <p class="font-serif text-xl text-content-100 m-0">
                Análises de Aquífero
              </p>
              <p class="text-sm text-content-400 max-w-sm m-0">
                {{ t('editor.hydrodynamicEvents.analyses.inDevBody') }}
              </p>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>

  <EventDialog ref="eventDialogRef" />
</template>

<style scoped>
/* ── Current State stat cards ──────────────────────────────────────────────── */

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-0);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--color-content-0);
  line-height: 1;
}

.stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-content-300);
  margin-left: 2px;
}

.stat-empty {
  color: var(--color-content-400);
  font-size: 20px;
}

.stat-sub {
  font-size: 11px;
  color: var(--color-content-400);
}

.transmissivity-value {
  font-size: 18px;
}

/* ── Add button ───────────────────────────────────────────────────────────── */

.add-entry-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.add-entry-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.add-entry-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}
</style>
