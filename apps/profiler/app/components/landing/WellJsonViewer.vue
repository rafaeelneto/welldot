<script setup lang="ts">
const props = defineProps<{
  json: string;
  depth?: number;
  theme?: 'light' | 'dark';
}>();

const resolvedTheme = computed(() => props.theme ?? 'dark');

const contentRef = ref<HTMLElement>();

const filename = computed(() => {
  try {
    const name: string = JSON.parse(props.json)?.name ?? 'well';
    return (
      name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/^poco\s*/i, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '.well'
    );
  } catch {
    return 'well.well';
  }
});

function highlight(raw: string): string {
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // property keys
  s = s.replace(
    /"((?:[^"\\]|\\.)*)"\s*:/g,
    (_, k) => `<span class="k">"${k}"</span>:`,
  );
  // string values
  s = s.replace(
    /([:\[,]\s*)"((?:[^"\\]|\\.)*)"/g,
    (_, pre, v) => `${pre}<span class="s">"${v}"</span>`,
  );
  // numbers
  s = s.replace(
    /([:\[,]\s*)(-?\d+\.?\d*)/g,
    (_, pre, n) => `${pre}<span class="n">${n}</span>`,
  );
  // booleans / null
  s = s.replace(
    /([:\[,]\s*)(true|false|null)\b/g,
    (_, pre, v) => `${pre}<span class="b">${v}</span>`,
  );
  return s;
}

const highlighted = computed(() => highlight(props.json));

watch(
  () => props.json,
  async () => {
    await nextTick();
    const el = contentRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<template>
  <div class="viewer" :data-theme="resolvedTheme">
    <div class="chrome">
      <div class="dots">
        <span class="dot" style="background: #ff5f57" />
        <span class="dot" style="background: #febc2e" />
        <span class="dot" style="background: #28c840" />
      </div>
      <span class="fname">{{ filename }}</span>
      <span v-if="depth" class="badge">{{ depth }} m</span>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <pre ref="contentRef" class="content" v-html="highlighted" />
  </div>
</template>

<style scoped>
/*
 * Tokens reference the design-system palette from customTheme.ts:
 *   surface light: 0=#fff  50=#f7f8fa  100=#eef0f3  200=#d8dde3
 *   surface dark:  0=#0d1218  50=#131922  100=#1a2230  200=#2a3344
 *   content-400 = #7888a0 (both modes)   primary-500 = #5d86d2
 */

/* ── Dark tokens ──────────────────────────────────────────────────────────── */
.viewer[data-theme='dark'] {
  --bg: #131922; /* surface-50  dark */
  --chrome-bg: #1a2230; /* surface-100 dark */
  --border: #2a3344; /* surface-200 dark */
  --text: #d8dde3; /* surface-200 light — comfortable reading */
  --fname: #7888a0; /* content-400 */
  --badge-bg: rgba(93, 134, 210, 0.14);
  --badge-fg: #92b1e6; /* primary-300 */
  --badge-border: rgba(93, 134, 210, 0.28);
  --scroll-thumb: rgba(255, 255, 255, 0.1);
  --k: #e06c75;
  --s: #98c379;
  --n: #61afef;
  --b: #d19a66;
}

/* ── Light tokens ─────────────────────────────────────────────────────────── */
.viewer[data-theme='light'] {
  --bg: #f7f8fa; /* surface-50  light — just off-white */
  --chrome-bg: #eef0f3; /* surface-100 light */
  --border: #d8dde3; /* surface-200 light — clear card edge */
  --text: #1a2230; /* surface-800 dark  — rich dark text  */
  --fname: #7888a0; /* content-400 */
  --badge-bg: rgba(93, 134, 210, 0.08);
  --badge-fg: #3d6bc0; /* primary-600 adjusted for light bg */
  --badge-border: rgba(93, 134, 210, 0.22);
  --scroll-thumb: rgba(0, 0, 0, 0.1);
  --k: #c7254e;
  --s: #22863a;
  --n: #005cc5;
  --b: #c05a14;
}

/* ── Structure ────────────────────────────────────────────────────────────── */
.viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border);
  overflow: hidden;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.viewer[data-theme='light'] {
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.03);
}

.chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--chrome-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fname {
  flex: 1;
  font-size: 12px;
  color: var(--fname);
  font-family: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  font-size: 11px;
  font-family: inherit;
  background: var(--badge-bg);
  color: var(--badge-fg);
  border: 1px solid var(--badge-border);
  border-radius: var(--radius-pill, 999px);
  padding: 2px 8px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 12px 16px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text);
  white-space: pre;
  scroll-behavior: smooth;
}

.content::-webkit-scrollbar {
  width: 4px;
}
.content::-webkit-scrollbar-track {
  background: transparent;
}
.content::-webkit-scrollbar-thumb {
  background: var(--scroll-thumb);
  border-radius: 2px;
}

/* ── Syntax ───────────────────────────────────────────────────────────────── */
:deep(.k) {
  color: var(--k);
}
:deep(.s) {
  color: var(--s);
}
:deep(.n) {
  color: var(--n);
}
:deep(.b) {
  color: var(--b);
}
</style>
