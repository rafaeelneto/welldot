<script setup lang="ts">
import type { Attachment, PumpInstallation } from '@welldot/core';
import {
  calculateSubmergence,
  getCurrentPump,
  getPumpInstallationWarnings,
} from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  resolvePowerSourceLabel,
  resolvePumpTypeLabel,
} from '~/utils/pumpVocab';
import PumpInstallationDialog from './PumpInstallationDialog.vue';

const { t } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { formatLength, formatDiameter, formatFlow, formatPower } =
  useUnitFormat();
const { formatNumber } = useNumberFormat();

// ─── Installations ────────────────────────────────────────────────────────────

const installations = computed<PumpInstallation[]>(() =>
  [...(profileStore.well.pump_installations ?? [])].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  ),
);

const currentPumpId = computed(() => getCurrentPump(profileStore.well)?.id);
const submergence = computed(() => calculateSubmergence(profileStore.well));

const warnings = computed(() => getPumpInstallationWarnings(profileStore.well));

/** Warning messages per installation id, for the card badges. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of warnings.value) {
    for (const id of w.ids) {
      const list = map.get(id) ?? [];
      list.push(t(`editor.operation.pump.warnings.${w.code}`));
      map.set(id, list);
    }
  }
  return map;
});

// ─── Dialog ───────────────────────────────────────────────────────────────────

const installationDraft = ref<PumpInstallation | null>(null);
const installationDialogVisible = ref(false);

function addInstallation() {
  installationDraft.value = null;
  installationDialogVisible.value = true;
}

function editInstallation(p: PumpInstallation) {
  installationDraft.value = p;
  installationDialogVisible.value = true;
}

function upsertInstallation(p: PumpInstallation) {
  profileStore.updateWell(draft => {
    if (!draft.pump_installations) draft.pump_installations = [];
    const idx = draft.pump_installations.findIndex(e => e.id === p.id);
    if (idx === -1) draft.pump_installations.push(p);
    else draft.pump_installations[idx] = p;
  });
}

function deleteInstallation(id: string) {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.operation.pump.deleteConfirm'),
    message: t('editor.operation.pump.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.pump_installations = draft.pump_installations?.filter(
          e => e.id !== id,
        );
        if (!draft.pump_installations?.length) delete draft.pump_installations;
      });
    },
  });
}

// ─── Attachments on saved installations ──────────────────────────────────────

function setAttachments(id: string, list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.pump_installations?.find(p => p.id === id),
      list,
    );
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function specs(p: PumpInstallation) {
  return [
    {
      label: t('editor.operation.pump.fields.intakeDepth'),
      value: p.intake_depth != null ? formatLength(p.intake_depth) : null,
    },
    {
      label: t('editor.operation.pump.fields.ratedFlowRate'),
      value: p.rated_flow_rate != null ? formatFlow(p.rated_flow_rate) : null,
    },
    {
      label: t('editor.operation.pump.fields.ratedHead'),
      value: p.rated_head != null ? formatLength(p.rated_head) : null,
    },
    {
      label: t('editor.operation.pump.fields.ratedPower'),
      value: p.rated_power != null ? formatPower(p.rated_power) : null,
    },
    {
      label: t('editor.operation.pump.fields.riser'),
      value:
        p.riser_diameter != null
          ? [formatDiameter(p.riser_diameter), p.riser_material]
              .filter(Boolean)
              .join(' · ')
          : (p.riser_material ?? null),
    },
    {
      label: t('editor.operation.pump.fields.electrical'),
      value: p.electrical
        ? [
            p.electrical.voltage != null ? `${p.electrical.voltage} V` : null,
            p.electrical.phases != null ? `${p.electrical.phases}φ` : null,
            p.electrical.cable_section != null
              ? `${formatNumber(p.electrical.cable_section, { maximumFractionDigits: 2 })} mm²`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || null
        : null,
    },
  ].filter(s => s.value);
}

function equipmentName(p: PumpInstallation): string {
  return [p.manufacturer, p.model].filter(Boolean).join(' ');
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <h3
      class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
    >
      {{ t('editor.operation.pump.title') }}
    </h3>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.operation.pump.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.operation.pump.add')"
        @click="addInstallation"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Current state ─────────────────────────────────────────────────── -->
    <div
      v-if="currentPumpId && submergence !== undefined"
      class="flex items-center gap-3 rounded-xl border border-surface-200/70 bg-surface-50 px-4 py-3"
    >
      <Icon
        name="ph:drop-half-bottom-duotone"
        class="size-5 text-content-300"
      />
      <div class="flex flex-col">
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
        >
          {{ t('editor.operation.pump.submergence') }}
        </span>
        <span class="font-mono text-sm text-content-0">
          {{ formatLength(submergence) }}
        </span>
      </div>
      <span class="text-[11px] text-content-400 ml-auto max-w-56 text-right">
        {{
          submergence < 0
            ? t('editor.operation.pump.submergenceNegative')
            : t('editor.operation.pump.submergenceInfo')
        }}
      </span>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!installations.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:engine-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.operation.pump.empty') }}</p>
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="p in installations"
        :key="p.id"
        class="rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
        :class="{ 'opacity-75': p.removed_at }"
      >
        <!-- header -->
        <div class="flex items-center flex-wrap gap-2">
          <Tag
            v-if="p.id === currentPumpId"
            :value="t('editor.operation.pump.current')"
            severity="success"
            class="text-[11px]"
          />
          <Tag
            v-else-if="p.removed_at"
            :value="t('editor.operation.pump.removed')"
            severity="secondary"
            class="text-[11px]"
          />
          <span class="text-sm font-medium text-content-0">
            {{ resolvePumpTypeLabel(p.type, t) }}
          </span>
          <span
            v-if="p.power_source"
            class="text-xs text-content-400 flex items-center gap-1"
          >
            <Icon name="ph:lightning-duotone" class="size-3.5" />
            {{ resolvePowerSourceLabel(p.power_source, t) }}
          </span>
          <span class="ml-auto font-mono text-xs text-content-300">
            {{ formatDate(p.installed_at, 'dd/MM/yyyy') }}
            <template v-if="p.removed_at">
              → {{ formatDate(p.removed_at, 'dd/MM/yyyy') }}
            </template>
          </span>
        </div>

        <!-- equipment -->
        <div
          v-if="equipmentName(p) || p.serial"
          class="flex items-center gap-2 text-xs text-content-300"
        >
          <span v-if="equipmentName(p)">{{ equipmentName(p) }}</span>
          <span v-if="p.serial" class="font-mono text-content-400">
            S/N {{ p.serial }}
          </span>
        </div>

        <!-- crew -->
        <div
          v-if="p.installed_by || (p.removed_at && p.removed_by)"
          class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-300"
        >
          <span v-if="p.installed_by">
            {{ t('editor.operation.pump.fields.installedBy') }}:
            {{ p.installed_by }}
          </span>
          <span v-if="p.removed_at && p.removed_by">
            {{ t('editor.operation.pump.fields.removedBy') }}:
            {{ p.removed_by }}
          </span>
        </div>

        <!-- specs -->
        <div
          v-if="specs(p).length"
          class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2"
        >
          <div v-for="s in specs(p)" :key="s.label" class="flex flex-col">
            <span
              class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
            >
              {{ s.label }}
            </span>
            <span class="font-mono text-sm text-content-100">
              {{ s.value }}
            </span>
          </div>
        </div>

        <!-- warnings -->
        <Message
          v-for="msg in warningsById.get(p.id) ?? []"
          :key="msg"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ msg }}
        </Message>

        <p
          v-if="p.notes"
          class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
        >
          {{ p.notes }}
        </p>

        <!-- attachments -->
        <AttachmentField
          :model-value="p.attachments"
          context="pump"
          confirm-delete
          @update:model-value="setAttachments(p.id, $event)"
        />

        <!-- footer -->
        <div
          class="flex items-center justify-end gap-2 pt-1 border-t border-surface-100"
        >
          <Button
            severity="secondary"
            text
            size="small"
            :label="t('editor.edit')"
            :aria-label="t('editor.operation.pump.edit')"
            @click="editInstallation(p)"
          >
            <template #icon>
              <Icon name="ph:pencil-simple-duotone" />
            </template>
          </Button>
          <Button
            severity="danger"
            text
            size="small"
            :aria-label="t('editor.operation.pump.deleteConfirm')"
            @click="deleteInstallation(p.id)"
          >
            <template #icon>
              <Icon name="ph:x-bold" />
            </template>
          </Button>
        </div>
      </div>
    </div>
  </div>

  <PumpInstallationDialog
    v-if="installationDialogVisible"
    v-model="installationDraft"
    v-model:visible="installationDialogVisible"
    @save="upsertInstallation"
  />
</template>

<style scoped>
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
