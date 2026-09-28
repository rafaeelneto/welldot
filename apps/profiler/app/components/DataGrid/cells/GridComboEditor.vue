<script setup lang="ts">
import { useGridOverlayFocusGuard } from '../composables/useGridOverlayFocusGuard';

const MAX_LENGTH = 90;
const PANEL_MAX_HEIGHT = 240;

type ComboOption = { label: string; value: string };

const props = defineProps<{
  val?: unknown;
  save: (value: any, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
  options: ComboOption[];
}>();

const listId = `well-combo-${useId()}`;
const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const overlayFocusGuard = useGridOverlayFocusGuard();

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function findOption(text: string) {
  const needle = normalize(text);
  if (!needle) return undefined;
  return props.options.find(
    o => normalize(o.label) === needle || normalize(o.value) === needle,
  );
}

// Show the option's label for canonical values, the raw text otherwise —
// the same display rule PrimeVue's editable Select applied.
const rawVal = typeof props.val === 'string' ? props.val : '';
const initialText =
  props.options.find(o => o.value === rawVal)?.label ?? rawVal;

const text = ref(initialText);
const open = ref(true);
const activeIndex = ref(-1);
const panelStyle = ref<Record<string, string>>({});
let committed = false;

// Until the user edits, the input holds the current value — filtering by it
// would hide every other suggestion, so list them all.
const filtered = computed(() => {
  const needle = normalize(text.value);
  if (!needle || text.value === initialText) return props.options;
  return props.options.filter(
    o =>
      normalize(o.label).includes(needle) ||
      normalize(o.value).includes(needle),
  );
});

const selectedValue = computed(() => findOption(text.value)?.value);
const panelVisible = computed(() => open.value && filtered.value.length > 0);

watch(filtered, () => {
  activeIndex.value = -1;
});

function commit(value: string, preventFocus = true) {
  if (committed) return;
  committed = true;
  const trimmed = value.trim();
  props.save(findOption(trimmed)?.value ?? trimmed, preventFocus);
}

function pick(option: ComboOption) {
  text.value = option.label;
  commit(option.label);
  props.close();
}

function updatePosition() {
  const el = rootRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const flip = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow;
  panelStyle.value = {
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    ...(flip
      ? { bottom: `${window.innerHeight - rect.top + 2}px` }
      : { top: `${rect.bottom + 2}px` }),
  };
}

function scrollActiveIntoView() {
  nextTick(() => {
    panelRef.value
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });
}

function moveActive(delta: number) {
  if (!open.value) {
    open.value = true;
    return;
  }
  const count = filtered.value.length;
  if (!count) return;
  activeIndex.value = (activeIndex.value + delta + count) % count;
  scrollActiveIntoView();
}

function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value;
  open.value = true;
}

function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      e.stopPropagation();
      moveActive(1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      e.stopPropagation();
      moveActive(-1);
      break;
    case 'Enter': {
      e.preventDefault();
      e.stopPropagation();
      const option = panelVisible.value
        ? filtered.value[activeIndex.value]
        : undefined;
      if (option) text.value = option.label;
      commit(text.value, false);
      break;
    }
    case 'Tab':
      commit(text.value);
      break;
    case 'Escape':
      e.stopPropagation();
      if (panelVisible.value) {
        open.value = false;
      } else {
        committed = true;
        props.close();
      }
      break;
  }
}

function onBlur() {
  commit(text.value);
}

function togglePanel() {
  open.value = !open.value;
  inputRef.value?.focus();
}

watch(panelVisible, visible => {
  if (visible) nextTick(updatePosition);
});

onMounted(() => {
  updatePosition();
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
});
</script>

<template>
  <div ref="rootRef" class="well-cell-combo">
    <input
      ref="inputRef"
      :value="text"
      :maxlength="MAX_LENGTH"
      class="well-cell-combo-input"
      type="text"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-expanded="panelVisible"
      :aria-controls="listId"
      :aria-activedescendant="
        activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
      "
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <button
      type="button"
      tabindex="-1"
      class="well-cell-combo-toggle"
      aria-hidden="true"
      @mousedown.prevent="togglePanel"
    >
      <Icon name="ph:caret-down" class="size-3.5" />
    </button>

    <Teleport to="body">
      <ul
        v-if="panelVisible"
        :id="listId"
        ref="panelRef"
        role="listbox"
        class="well-combo-panel"
        :style="panelStyle"
        v-bind="overlayFocusGuard"
        @mousedown.prevent
      >
        <li
          v-for="(option, i) in filtered"
          :id="`${listId}-${i}`"
          :key="option.value"
          :data-index="i"
          role="option"
          :aria-selected="option.value === selectedValue"
          class="well-combo-option text-sm p-1"
          :class="{
            'is-active': i === activeIndex,
            'is-selected': option.value === selectedValue,
          }"
          @mouseenter="activeIndex = i"
          @click="pick(option)"
        >
          {{ option.label }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>
