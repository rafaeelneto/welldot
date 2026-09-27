<script setup lang="ts">
import {
  calculateHoleFillSegmentVolume,
  getCentralizerDepths,
} from '@welldot/utils';
import type { SummaryColumn, SummaryGroup } from './summary/SummaryTable.vue';
import SummaryTable from './summary/SummaryTable.vue';
import SummaryKpis from './summary/SummaryKpis.vue';

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatLength, formatDiameter, formatVolume } = useUnitFormat();

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

// ─── Revestimento (well_case ⊎ well_screen) ────────────────────────────────

const casingColumns = computed<SummaryColumn[]>(() => [
  { key: 'type', label: t('editor.summary.casing.type'), lead: true },
  { key: 'diameter', label: t('editor.summary.casing.diameter') },
  { key: 'from', label: t('editor.summary.casing.from'), align: 'right' },
  { key: 'to', label: t('editor.summary.casing.to'), align: 'right' },
  { key: 'length', label: t('editor.summary.casing.length'), align: 'right' },
]);

const casingGroups = computed<SummaryGroup[]>(() => {
  const caseItems = profileStore.well.well_case.map(c => ({
    from: c.from,
    to: c.to,
    diameter: c.diameter,
    type: t('editor.summary.casing.kindCase'),
  }));
  const screenItems = profileStore.well.well_screen.map(s => ({
    from: s.from,
    to: s.to,
    diameter: s.diameter,
    type: t('editor.summary.casing.kindScreen'),
  }));
  const items = [...caseItems, ...screenItems].sort((a, b) => a.from - b.from);

  const rows = items.map(item => ({
    cells: {
      type: item.type,
      diameter: formatDiameter(item.diameter),
      from: formatLength(item.from),
      to: formatLength(item.to),
      length: formatLength(item.to - item.from),
    },
  }));
  const totalLength = items.reduce(
    (sum, item) => sum + (item.to - item.from),
    0,
  );
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
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <div>
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.tabs.summary') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.tag') }}
        </span>
      </div>
      <div class="mt-4">
        <SummaryKpis />
      </div>
    </div>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.boreHole.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.boreHole.tag') }}
        </span>
      </div>
      <SummaryTable :columns="boreHoleColumns" :groups="boreHoleGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.surfaceCase.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.surfaceCase.tag') }}
        </span>
      </div>
      <SummaryTable :columns="surfaceCaseColumns" :groups="surfaceCaseGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.casing.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.casing.tag') }}
        </span>
      </div>
      <SummaryTable :columns="casingColumns" :groups="casingGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.reduction.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.reduction.tag') }}
        </span>
      </div>
      <SummaryTable :columns="reductionColumns" :groups="reductionGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.centralizer.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.centralizer.tag') }}
        </span>
      </div>
      <SummaryTable :columns="centralizerColumns" :groups="centralizerGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.holeFill.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.holeFill.tag') }}
        </span>
      </div>
      <SummaryTable :columns="holeFillColumns" :groups="holeFillGroups" />
    </section>

    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.summary.lithology.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.lithology.tag') }}
        </span>
      </div>
      <SummaryTable :columns="lithologyColumns" :groups="lithologyGroups" />
    </section>
  </div>
</template>
