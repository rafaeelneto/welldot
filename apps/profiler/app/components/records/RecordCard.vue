<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem';

/**
 * Shared shell for every editor ledger card (history logs, hydrodynamic
 * events, pumps, meters, regimes, production, permits, water samples):
 * tags + date header, free body, and a footer with who/meta on the left and
 * the record actions on the right.
 */
export type RecordAction = {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  /** `danger` = delete: icon-only, never collapsed, always rendered last. */
  severity?: 'secondary' | 'danger';
  disabled?: boolean;
  /** Shown on hover, also while disabled (e.g. why delete is blocked). */
  tooltip?: string;
  ariaLabel?: string;
};

const props = defineProps<{
  /** Already formatted, rendered at the right of the header. */
  date?: string;
  /** Footer-left items, e.g. "por CAGEPA", "Instalado por X". */
  meta?: (string | null | undefined | false)[];
  actions: RecordAction[];
  /** `true` = inactive record (opacity-75), `strong` = retracted (opacity-60). */
  dimmed?: boolean | 'strong';
}>();

const { t } = useI18n();

/** Non-danger actions kept as buttons; the rest overflow into a menu. */
const MAX_INLINE = 3;

const metaItems = computed(() =>
  (props.meta ?? []).filter((m): m is string => !!m),
);

const regular = computed(() =>
  props.actions.filter(a => a.severity !== 'danger'),
);
const danger = computed(() =>
  props.actions.filter(a => a.severity === 'danger'),
);
const inline = computed(() =>
  regular.value.length > MAX_INLINE
    ? regular.value.slice(0, MAX_INLINE - 1)
    : regular.value,
);
const overflowItems = computed<MenuItem[]>(() =>
  regular.value.length > MAX_INLINE
    ? regular.value.slice(MAX_INLINE - 1).map(a => ({
        key: a.key,
        label: a.label,
        icon: a.icon,
        disabled: a.disabled,
        command: a.onClick,
      }))
    : [],
);

const overflowMenu = ref();
</script>

<template>
  <div
    class="@container rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
    :class="{
      'opacity-75': dimmed === true,
      'opacity-60': dimmed === 'strong',
    }"
  >
    <!-- ── header: tags + date ────────────────────────────────────────── -->
    <div class="flex items-center flex-wrap gap-2">
      <slot name="tags" />
      <span v-if="date" class="ml-auto font-mono text-xs text-content-300">
        {{ date }}
      </span>
    </div>

    <slot />

    <!-- ── footer: meta + actions ─────────────────────────────────────── -->
    <div
      v-if="actions.length || metaItems.length || $slots.meta"
      class="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 border-t border-surface-100"
    >
      <div
        v-if="metaItems.length || $slots.meta"
        class="flex flex-wrap items-center gap-x-2 gap-y-0.5 basis-full @sm:basis-auto @sm:flex-1 min-w-0 text-xs text-content-400"
      >
        <slot name="meta">
          <span
            v-for="(m, i) in metaItems"
            :key="m"
            :class="{ 'before:content-[\'·\'] before:mr-2': i > 0 }"
          >
            {{ m }}
          </span>
        </slot>
      </div>

      <div class="ml-auto flex items-center gap-1">
        <span v-for="a in inline" :key="a.key" v-tooltip.top="a.tooltip">
          <Button
            severity="secondary"
            text
            size="small"
            :disabled="a.disabled"
            :aria-label="a.ariaLabel ?? a.label"
            @click="a.onClick"
          >
            <Icon :name="a.icon" />
            <span class="hidden @sm:inline">{{ a.label }}</span>
          </Button>
        </span>

        <template v-if="overflowItems.length">
          <Button
            severity="secondary"
            text
            size="small"
            aria-haspopup="true"
            :aria-label="t('editor.record.moreActions')"
            @click="overflowMenu?.toggle($event)"
          >
            <template #icon>
              <Icon name="ph:dots-three-bold" />
            </template>
          </Button>
          <Menu ref="overflowMenu" :model="overflowItems" popup>
            <template #itemicon="{ item }">
              <Icon :name="item.icon as string" class="size-4" />
            </template>
          </Menu>
        </template>

        <span v-for="a in danger" :key="a.key" v-tooltip.top="a.tooltip">
          <Button
            severity="danger"
            text
            size="small"
            :disabled="a.disabled"
            :aria-label="a.ariaLabel ?? a.label"
            @click="a.onClick"
          >
            <template #icon>
              <Icon :name="a.icon" />
            </template>
          </Button>
        </span>
      </div>
    </div>
  </div>
</template>
