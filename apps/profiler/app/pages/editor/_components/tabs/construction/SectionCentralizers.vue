<script setup lang="ts">
import type { Centralizer, Well } from '@welldot/core';
import type { WellGridColumn } from '~/components/DataGrid/types';
import { materialOptions } from '~/utils/materialOptions';

const { t } = useI18n();
const profileStore = useProfileStore();

// Spec-recommended centralizer kinds (stored as keys) followed by common
// materials (stored as their label).
const typeOptions = computed(() => [
  ...CENTRALIZER_TYPE_VALUES.map(value => ({
    label: resolveCentralizerTypeLabel(value, t),
    value,
  })),
  ...materialOptions(t, ['carbonSteel', 'galvanizedSteel', 'stainlessSteel']),
]);

const centralizerColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.centralizer.from'),
    unitType: 'length',
    size: 120,
  },
  {
    prop: 'to',
    label: t('editor.construction.centralizer.to'),
    unitType: 'length',
    size: 120,
  },
  {
    prop: 'spacing',
    label: t('editor.construction.centralizer.spacing'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'type',
    label: t('editor.construction.centralizer.type'),
    info: t('editor.construction.centralizer.typeInfo'),
    infoHighlight: t('editor.construction.centralizer.typeFreeText'),
    type: 'combo',
    options: typeOptions.value,
    size: 170,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.centralizer.diameter'),
    unitType: 'diameter',
    size: 140,
  },
  {
    prop: 'description',
    label: t('editor.construction.centralizer.description'),
    info: t('editor.construction.centralizer.descriptionInfo'),
    type: 'text',
    stretch: true,
    minSize: 180,
  },
]);

/** Optional props that must be omitted (not stored as null/0) when cleared. */
const OPTIONAL_NUMERIC_PROPS = new Set(['spacing', 'diameter']);

const rows = computed(() => [...(profileStore.well.centralizers ?? [])]);

function addCentralizer() {
  const last = profileStore.well.centralizers?.at(-1);
  const start = last ? last.to : 0;
  const entry: Centralizer = {
    from: start,
    to: start,
    type: 'spring_bow',
  };
  profileStore.updateWell((draft: Well) => {
    if (!draft.centralizers) draft.centralizers = [];
    draft.centralizers.push(entry);
  });
}

function deleteCentralizer(index: number) {
  profileStore.updateWell((draft: Well) => {
    draft.centralizers?.splice(index, 1);
    if (draft.centralizers?.length === 0) delete draft.centralizers;
  });
}

function updateCentralizer(index: number, prop: string, value: unknown) {
  profileStore.updateWell((draft: Well) => {
    const item = draft.centralizers?.[index] as
      | Record<string, unknown>
      | undefined;
    if (!item) return;
    const cleared =
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value === 'number' && (isNaN(value) || value <= 0));
    if (OPTIONAL_NUMERIC_PROPS.has(prop) && cleared) delete item[prop];
    else if (prop === 'description' && value === '') delete item[prop];
    else item[prop] = value;
  });
}

function reorderCentralizer(from: number, to: number) {
  const items = [...(profileStore.well.centralizers ?? [])];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell((draft: Well) => {
    draft.centralizers = items;
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.centralizer.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.centralizer.tag') }}
      </span>
    </div>
    <p class="m-0 text-sm text-content-400">
      {{ t('editor.construction.centralizer.hint') }}
    </p>
    <WellDataGrid
      :rows="rows"
      :columns="centralizerColumns"
      :add-label="t('editor.construction.centralizer.addRow')"
      @add="addCentralizer"
      @delete="deleteCentralizer"
      @change="updateCentralizer"
      @reorder="reorderCentralizer"
    />
  </section>
</template>
