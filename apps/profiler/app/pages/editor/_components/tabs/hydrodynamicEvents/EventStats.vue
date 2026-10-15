<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';

const props = defineProps<{ event: HydrodynamicEvent }>();

const { t } = useI18n();
const { measurementMethodLabel } = useHydrodynamicEventTypes();

const event = computed(() => props.event as Record<string, unknown>);

// Flows are stored in m³/h; show them in the unit chosen in Settings.
const { toFlow, flowUnit, toSpecificCapacity, specificCapacityUnit } =
  useUnitFormat();
const { formatNumber } = useNumberFormat();
const flow = (value: number) =>
  formatNumber(toFlow(value), { maximumFractionDigits: 2 });
</script>

<template>
  <!-- spot_measurement -->
  <div v-if="event.type === 'spot_measurement'" class="stats-row">
    <div class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.ne')
      }}</span>
      <span class="stat-chip-value">
        {{
          event.static_level != null
            ? (event.static_level as number).toFixed(2)
            : '—'
        }}<span class="stat-chip-unit">m</span>
      </span>
    </div>
    <div v-if="event.measurement_method" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.method')
      }}</span>
      <span class="stat-chip-value">
        {{ measurementMethodLabel(event.measurement_method as string) }}
      </span>
    </div>
  </div>

  <!-- constant_rate -->
  <div v-else-if="event.type === 'constant_rate'" class="stats-row">
    <div v-if="event.static_level != null" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.ne')
      }}</span>
      <span class="stat-chip-value">
        {{ (event.static_level as number).toFixed(2)
        }}<span class="stat-chip-unit">m</span>
      </span>
    </div>
    <template v-if="lastReading(props.event)">
      <div class="stat-chip">
        <span class="stat-chip-label">{{
          t('editor.hydrodynamicEvents.stats.nd')
        }}</span>
        <span class="stat-chip-value">
          {{ lastReading(props.event)!.depth.toFixed(2)
          }}<sup class="stat-chip-final">f</sup
          ><span class="stat-chip-unit">m</span>
        </span>
      </div>
      <div
        v-if="event.static_level != null"
        class="stat-chip stat-chip--accent"
      >
        <span class="stat-chip-label">{{
          t('editor.hydrodynamicEvents.stats.drawdown')
        }}</span>
        <span class="stat-chip-value">
          {{
            (
              lastReading(props.event)!.depth - (event.static_level as number)
            ).toFixed(2)
          }}<sup class="stat-chip-final">f</sup
          ><span class="stat-chip-unit">m</span>
        </span>
      </div>
    </template>
    <div v-if="stepRate(props.event, 0) != null" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.flowRate')
      }}</span>
      <span class="stat-chip-value">
        {{ flow(stepRate(props.event, 0)!)
        }}<span class="stat-chip-unit">{{ flowUnit }}</span>
      </span>
    </div>
    <div
      v-if="
        event.static_level != null &&
        lastReading(props.event) != null &&
        stepRate(props.event, 0) != null
      "
      class="stat-chip stat-chip--accent"
    >
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.specificCapacity')
      }}</span>
      <span class="stat-chip-value">
        {{
          toSpecificCapacity(
            stepRate(props.event, 0)! /
              (lastReading(props.event)!.depth -
                (event.static_level as number)),
          ).toFixed(2)
        }}<sup class="stat-chip-final">f</sup
        ><span class="stat-chip-unit">{{ specificCapacityUnit }}</span>
      </span>
    </div>
  </div>

  <!-- step_drawdown -->
  <div v-else-if="event.type === 'step_drawdown'" class="stats-row">
    <div class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.steps')
      }}</span>
      <span class="stat-chip-value">
        {{ (event.steps as unknown[])?.length ?? 0 }}
      </span>
    </div>
    <div v-if="event.static_level != null" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.ne')
      }}</span>
      <span class="stat-chip-value">
        {{ (event.static_level as number).toFixed(2)
        }}<span class="stat-chip-unit">m</span>
      </span>
    </div>
    <div v-if="lastReading(props.event)" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.nd')
      }}</span>
      <span class="stat-chip-value">
        {{ lastReading(props.event)!.depth.toFixed(2)
        }}<sup class="stat-chip-final">f</sup
        ><span class="stat-chip-unit">m</span>
      </span>
    </div>
  </div>

  <!-- airlift -->
  <div v-else-if="event.type === 'airlift'" class="stats-row">
    <div v-if="stepRate(props.event, 0) != null" class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.stats.flowRate')
      }}</span>
      <span class="stat-chip-value">
        {{ flow(stepRate(props.event, 0)!)
        }}<span class="stat-chip-unit">{{ flowUnit }}</span>
      </span>
    </div>
    <div v-if="lastReading(props.event)" class="stat-chip">
      <span class="stat-chip-label">ND APROX.</span>
      <span class="stat-chip-value">
        {{ lastReading(props.event)!.depth.toFixed(1)
        }}<span class="stat-chip-unit">m</span>
      </span>
    </div>
  </div>

  <!-- recovery_only -->
  <div v-else-if="event.type === 'recovery_only'" class="stats-row">
    <div v-if="event.pumping_rate != null" class="stat-chip">
      <span class="stat-chip-label">VAZÃO EST.</span>
      <span class="stat-chip-value">
        {{ flow(event.pumping_rate as number)
        }}<span class="stat-chip-unit">{{ flowUnit }}</span>
      </span>
    </div>
    <div v-if="event.pumping_duration != null" class="stat-chip">
      <span class="stat-chip-label">DURAÇÃO EST.</span>
      <span class="stat-chip-value">
        {{ event.pumping_duration }}<span class="stat-chip-unit">min</span>
      </span>
    </div>
    <div class="stat-chip">
      <span class="stat-chip-label">{{
        t('editor.hydrodynamicEvents.fields.readings')
      }}</span>
      <span class="stat-chip-value">{{
        recoveryReadingsCount(props.event)
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--color-surface-50);
  border: 1px solid var(--color-surface-100);
  min-width: 60px;
}

.stat-chip--accent {
  background: color-mix(in srgb, var(--color-primary-500) 6%, transparent);
  border-color: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
}

.stat-chip--accent .stat-chip-value {
  color: var(--color-primary-500);
}

.stat-chip-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}

.stat-chip-value {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 500;
  color: var(--color-content-0);
  line-height: 1;
}

.stat-chip-unit {
  font-size: 10px;
  color: var(--color-content-300);
  margin-left: 1px;
}

.stat-chip-final {
  font-size: 9px;
  color: var(--color-content-400);
  vertical-align: super;
  margin-left: 1px;
}
</style>
