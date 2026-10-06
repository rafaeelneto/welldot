<script setup lang="ts">
import {
  calculateHoleFillSegmentVolume,
  getCentralizerDepths,
} from '@welldot/utils';
import type { SummaryColumn, SummaryGroup } from './SummaryTable.vue';
import SummaryTable from './SummaryTable.vue';
import SummaryField from './SummaryField.vue';
import SummaryEmpty from './SummaryEmpty.vue';

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatLength, formatDiameter, formatVolume } = useUnitFormat();
const { formatNumber } = useNumberFormat();

// ─── Furo (bore_hole) ──────────────────────────────────────────────────────

const boreHoleColumns = computed<SummaryColumn[]>(() => [
  { key: 'diameter', label: t('editor.summary.boreHole.diameter'), lead: true },
  { key: 'from', label: t('editor.summary.boreHole.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.boreHole.to'), align: 'right' },
  { key: 'length', label: t('editor.summary.boreHole.length'), align: 'right' },
]);

const boreHoleGroups = computed<SummaryGroup[]>(() => {
  const items = profileStore.well.bore_hole;
  const rows = items.map(b => ({
    cells: {
      diameter: formatDiameter(b.diameter),
      from: formatLength(b.from),
      to: formatLength(b.to),
      length: formatLength(b.to - b.from),
    },
  }));
  const totalLength = items.reduce((sum, b) => sum + (b.to - b.from), 0);
  return [
    {
      rows,
      total: {
        label: t('editor.summary.boreHole.total'),
        value: formatLength(totalLength),
        colspan: 3,
      },
    },
  ];
});

// ─── Tubo de Boca (surface_case) ───────────────────────────────────────────

const surfaceCaseColumns = computed<SummaryColumn[]>(() => [
  {
    key: 'diameter',
    label: t('editor.summary.surfaceCase.diameter'),
    lead: true,
  },
  { key: 'from', label: t('editor.summary.surfaceCase.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.surfaceCase.to'), align: 'right' },
  {
    key: 'length',
    label: t('editor.summary.surfaceCase.length'),
    align: 'right',
  },
]);

const surfaceCaseGroups = computed<SummaryGroup[]>(() => {
  const items = profileStore.well.surface_case;
  const rows = items.map(s => ({
    cells: {
      diameter: formatDiameter(s.diameter),
      from: formatLength(s.from),
      to: formatLength(s.to),
      length: formatLength(s.to - s.from),
    },
  }));
  const totalLength = items.reduce((sum, s) => sum + (s.to - s.from), 0);
  return [
    {
      rows,
      total: {
        label: t('editor.summary.surfaceCase.total'),
        value: formatLength(totalLength),
        colspan: 3,
      },
    },
  ];
});

// ─── Revestimento (well_case) ───────────────────────────────────────────────

const casingColumns = computed<SummaryColumn[]>(() => [
  { key: 'type', label: t('editor.summary.casing.type'), lead: true },
  { key: 'diameter', label: t('editor.summary.casing.diameter') },
  { key: 'from', label: t('editor.summary.casing.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.casing.to'), align: 'right' },
  { key: 'length', label: t('editor.summary.casing.length'), align: 'right' },
]);

const casingGroups = computed<SummaryGroup[]>(() => {
  const items = [...profileStore.well.well_case].sort(
    (a, b) => a.from - b.from,
  );
  const rows = items.map(c => ({
    cells: {
      type: c.type || '—',
      diameter: formatDiameter(c.diameter),
      from: formatLength(c.from),
      to: formatLength(c.to),
      length: formatLength(c.to - c.from),
    },
  }));
  const totalLength = items.reduce((sum, c) => sum + (c.to - c.from), 0);
  return [
    {
      rows,
      total: {
        label: t('editor.summary.casing.total'),
        value: formatLength(totalLength),
        colspan: 4,
      },
    },
  ];
});

// ─── Filtro (well_screen) ───────────────────────────────────────────────────

const screenColumns = computed<SummaryColumn[]>(() => [
  { key: 'type', label: t('editor.summary.screen.type'), lead: true },
  { key: 'diameter', label: t('editor.summary.screen.diameter') },
  { key: 'slot', label: t('editor.summary.screen.slot'), align: 'right' },
  { key: 'from', label: t('editor.summary.screen.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.screen.to'), align: 'right' },
  { key: 'length', label: t('editor.summary.screen.length'), align: 'right' },
]);

const screenGroups = computed<SummaryGroup[]>(() => {
  const items = [...profileStore.well.well_screen].sort(
    (a, b) => a.from - b.from,
  );
  const rows = items.map(s => ({
    cells: {
      type: s.type || '—',
      diameter: formatDiameter(s.diameter),
      slot:
        s.screen_slot != null
          ? formatNumber(s.screen_slot, {
              maximumFractionDigits: 2,
              suffix: 'mm',
            })
          : '—',
      from: formatLength(s.from),
      to: formatLength(s.to),
      length: formatLength(s.to - s.from),
    },
  }));
  const totalLength = items.reduce((sum, s) => sum + (s.to - s.from), 0);
  return [
    {
      rows,
      total: {
        label: t('editor.summary.screen.total'),
        value: formatLength(totalLength),
        colspan: 5,
      },
    },
  ];
});

// ─── Redução (reduction) ────────────────────────────────────────────────────

const reductionColumns = computed<SummaryColumn[]>(() => [
  { key: 'type', label: t('editor.summary.reduction.type'), lead: true },
  { key: 'diamFrom', label: t('editor.summary.reduction.diamFrom') },
  { key: 'diamTo', label: t('editor.summary.reduction.diamTo') },
  { key: 'from', label: t('editor.summary.reduction.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.reduction.to'), align: 'right' },
]);

const reductionGroups = computed<SummaryGroup[]>(() => {
  const items = profileStore.well.reduction;
  const rows = items.map(r => ({
    cells: {
      type: r.type || '—',
      diamFrom: formatDiameter(r.diam_from),
      diamTo: formatDiameter(r.diam_to),
      from: formatLength(r.from),
      to: formatLength(r.to),
    },
  }));
  return [{ rows }];
});

// ─── Centralizadores (centralizers) ─────────────────────────────────────────

const centralizerColumns = computed<SummaryColumn[]>(() => [
  { key: 'type', label: t('editor.summary.centralizer.type'), lead: true },
  { key: 'diameter', label: t('editor.summary.centralizer.diameter') },
  {
    key: 'spacing',
    label: t('editor.summary.centralizer.spacing'),
    align: 'right',
  },
  { key: 'from', label: t('editor.summary.centralizer.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.centralizer.to'), align: 'right' },
  {
    key: 'count',
    label: t('editor.summary.centralizer.count'),
    align: 'right',
  },
]);

const centralizerGroups = computed<SummaryGroup[]>(() => {
  const items = [...(profileStore.well.centralizers ?? [])].sort(
    (a, b) => a.from - b.from,
  );
  // The count is derived (never stored) and only known when the interval is a
  // single centralizer or has a spacing — otherwise it's shown as unknown.
  const counts = items.map(c =>
    c.from === c.to || c.spacing ? getCentralizerDepths(c).length : null,
  );
  const rows = items.map((c, i) => ({
    cells: {
      type: resolveCentralizerTypeLabel(c.type, t) || '—',
      diameter: c.diameter != null ? formatDiameter(c.diameter) : '—',
      spacing: c.spacing != null ? formatLength(c.spacing) : '—',
      from: formatLength(c.from),
      to: formatLength(c.to),
      count: counts[i] != null ? String(counts[i]) : '—',
    },
  }));
  const knownTotal = counts.reduce<number>((sum, n) => sum + (n ?? 0), 0);
  const hasUnknown = counts.some(n => n == null);
  return [
    {
      rows,
      total: {
        label: t('editor.summary.centralizer.total'),
        value: hasUnknown ? `≥ ${knownTotal}` : String(knownTotal),
        colspan: 5,
      },
    },
  ];
});

// ─── Espaço Anular (hole_fill) ──────────────────────────────────────────────

const holeFillColumns = computed<SummaryColumn[]>(() => [
  {
    key: 'description',
    label: t('editor.summary.holeFill.description'),
    lead: true,
  },
  { key: 'diameter', label: t('editor.summary.holeFill.diameter') },
  { key: 'from', label: t('editor.summary.holeFill.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.holeFill.to'), align: 'right' },
  { key: 'volume', label: t('editor.summary.holeFill.volume'), align: 'right' },
]);

const holeFillGroups = computed<SummaryGroup[]>(() => {
  const well = profileStore.well;
  const sorted = [...well.hole_fill].sort((a, b) => a.from - b.from);
  const groupTypes: { type: 'seal' | 'gravel_pack'; label: string }[] = [
    { type: 'seal', label: t('editor.summary.holeFill.groupSeal') },
    {
      type: 'gravel_pack',
      label: t('editor.summary.holeFill.groupGravelPack'),
    },
  ];

  return groupTypes.map(({ type, label }) => {
    const items = sorted.filter(f => f.type === type);
    const volumes = items.map(f => calculateHoleFillSegmentVolume(f, well));
    const rows = items.map((f, i) => ({
      cells: {
        description: f.description || label,
        diameter: formatDiameter(f.diameter),
        from: formatLength(f.from),
        to: formatLength(f.to),
        volume: formatVolume(volumes[i] ?? 0),
      },
    }));
    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
    return {
      rows,
      total: {
        label: t('editor.summary.holeFill.groupTotal', { group: label }),
        value: formatVolume(totalVolume),
        colspan: 4,
      },
    };
  });
});

// ─── Litologia (lithology, grouped by geologic_unit) ───────────────────────

const lithologyColumns = computed<SummaryColumn[]>(() => [
  { key: 'unit', label: t('editor.summary.lithology.unit'), lead: true },
  {
    key: 'layers',
    label: t('editor.summary.lithology.layers'),
    align: 'right',
  },
  { key: 'from', label: t('editor.summary.lithology.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.lithology.to'), align: 'right' },
  {
    key: 'thickness',
    label: t('editor.summary.lithology.thickness'),
    align: 'right',
  },
]);

const lithologyGroups = computed<SummaryGroup[]>(() => {
  const order: string[] = [];
  const buckets = new Map<
    string,
    { from: number; to: number; color: string; count: number }
  >();

  for (const layer of profileStore.well.lithology) {
    const existing = buckets.get(layer.geologic_unit);
    if (!existing) {
      order.push(layer.geologic_unit);
      buckets.set(layer.geologic_unit, {
        from: layer.from,
        to: layer.to,
        color: layer.color,
        count: 1,
      });
    } else {
      existing.from = Math.min(existing.from, layer.from);
      existing.to = Math.max(existing.to, layer.to);
      existing.count += 1;
    }
  }

  const rows = order.map(unit => {
    const group = buckets.get(unit)!;
    return {
      cells: {
        unit,
        layers: String(group.count),
        from: formatLength(group.from),
        to: formatLength(group.to),
        thickness: formatLength(group.to - group.from),
      },
      color: group.color,
    };
  });

  return [{ rows }];
});

// ─── Laje de proteção (cement_pad) ──────────────────────────────────────────

const cementPad = computed(() => {
  const pad = profileStore.well.cement_pad;
  return pad && pad.thickness > 0 ? pad : null;
});

const sections = computed(() =>
  [
    {
      key: 'boreHole',
      columns: boreHoleColumns.value,
      groups: boreHoleGroups.value,
    },
    {
      key: 'surfaceCase',
      columns: surfaceCaseColumns.value,
      groups: surfaceCaseGroups.value,
    },
    { key: 'casing', columns: casingColumns.value, groups: casingGroups.value },
    { key: 'screen', columns: screenColumns.value, groups: screenGroups.value },
    {
      key: 'reduction',
      columns: reductionColumns.value,
      groups: reductionGroups.value,
    },
    {
      key: 'centralizer',
      columns: centralizerColumns.value,
      groups: centralizerGroups.value,
    },
    {
      key: 'holeFill',
      columns: holeFillColumns.value,
      groups: holeFillGroups.value,
    },
  ].filter(s => s.groups.some(g => g.rows.length > 0)),
);

const hasLithology = computed(() => profileStore.well.lithology.length > 0);
</script>

<template>
  <div class="flex flex-col gap-6">
    <SummaryEmpty
      v-if="!sections.length && !cementPad && !hasLithology"
      :text="t('editor.summary.construction.empty')"
    />

    <section
      v-for="section in sections"
      :key="section.key"
      class="flex flex-col gap-3"
    >
      <div class="flex items-baseline justify-between">
        <h4
          class="m-0 font-serif text-[17px] font-medium tracking-[-0.01em] text-content-0"
        >
          {{ t(`editor.summary.${section.key}.title`) }}
        </h4>
        <span
          class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t(`editor.summary.${section.key}.tag`) }}
        </span>
      </div>
      <SummaryTable :columns="section.columns" :groups="section.groups" />
    </section>

    <section v-if="cementPad" class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between">
        <h4
          class="m-0 font-serif text-[17px] font-medium tracking-[-0.01em] text-content-0"
        >
          {{ t('editor.summary.cementPad.title') }}
        </h4>
        <span
          class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.cementPad.tag') }}
        </span>
      </div>
      <dl
        class="m-0 grid grid-cols-2 gap-3 rounded-lg border border-surface-200 p-3 sm:grid-cols-4"
      >
        <SummaryField
          :label="t('editor.summary.cementPad.type')"
          :value="cementPad.type"
        />
        <SummaryField
          :label="t('editor.summary.cementPad.width')"
          :value="formatLength(cementPad.width)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.cementPad.length')"
          :value="formatLength(cementPad.length)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.cementPad.thickness')"
          :value="formatLength(cementPad.thickness)"
          mono
        />
      </dl>
    </section>

    <section v-if="hasLithology" class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between">
        <h4
          class="m-0 font-serif text-[17px] font-medium tracking-[-0.01em] text-content-0"
        >
          {{ t('editor.summary.lithology.title') }}
        </h4>
        <span
          class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.lithology.tag') }}
        </span>
      </div>
      <SummaryTable :columns="lithologyColumns" :groups="lithologyGroups" />
    </section>
  </div>
</template>
