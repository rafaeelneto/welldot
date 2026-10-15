<script setup lang="ts">
import { normalizeSiagasCode } from '@welldot/utils/siagas';
import ExamplesPanel from './ExamplesPanel.vue';
import PasteJsonPanel from './PasteJsonPanel.vue';
import SiagasPanel from './SiagasPanel.vue';
import type { NewWellSection } from '~/composables/useNewWellDialog';

const { t } = useI18n();
const store = useProfileStore();
const { visible, section, close, startBlank } = useNewWellDialog();
const { openFile, openDroppedFile } = useOpenWellFile();
const { examples, fetchExamples } = useWellExamples();

const viewport = useViewport();
const isMobile = computed(() => viewport.isLessThan('lg'));

// On mobile the options are the first screen and a section opens over them.
const mobilePanelOpen = ref(false);
const pasteText = ref('');
const siagasCode = ref('');
const loadError = ref<string | null>(null);

watch(
  visible,
  v => {
    if (!v) return;
    fetchExamples();
    loadError.value = null;
    mobilePanelOpen.value = false;
  },
  { immediate: true },
);

// Any well that starts being edited (example, file, paste, blank) closes it.
watch(
  () => store.wellSession,
  () => close(),
);

function showSection(to: NewWellSection) {
  section.value = to;
  mobilePanelOpen.value = true;
}

function reportLoad(result: boolean | null) {
  if (result === false) {
    loadError.value = store.errors.root ?? t('editor.newWell.loadError');
  } else if (result) {
    loadError.value = null;
  }
}

async function pickFile() {
  loadError.value = null;
  reportLoad(await openFile());
}

// ── Shortcuts ────────────────────────────────────────────────────────
const isMac = import.meta.client && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl+';

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function onKeyDown(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
  if (e.key.toLowerCase() === 'o') {
    e.preventDefault();
    pickFile();
  }
}

// Pasting anywhere in the dialog (outside a text field) opens "Paste JSON",
// or the SIAGAS import when the text is a SIAGAS code or link.
function onPaste(e: ClipboardEvent) {
  if (isTextField(e.target)) return;
  const pasted = e.clipboardData?.getData('text') ?? '';
  if (!pasted.trim()) return;
  e.preventDefault();
  if (normalizeSiagasCode(pasted)) {
    siagasCode.value = pasted.trim();
    showSection('siagas');
    return;
  }
  pasteText.value = pasted;
  showSection('paste');
}

watch(
  visible,
  v => {
    if (import.meta.server) return;
    if (v) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('paste', onPaste);
    } else {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('paste', onPaste);
});

// ── Drag and drop ────────────────────────────────────────────────────
// dragenter/dragleave fire for every child, so count them.
const dragDepth = ref(0);
const dragging = computed(() => dragDepth.value > 0);

function hasFiles(e: DragEvent): boolean {
  return !!e.dataTransfer?.types.includes('Files');
}

function onDragEnter(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth.value++;
}

function onDragOver(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}

function onDragLeave(e: DragEvent) {
  if (!hasFiles(e)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

async function onDrop(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth.value = 0;
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  loadError.value = null;
  reportLoad(await openDroppedFile(file));
}

// ── Options ──────────────────────────────────────────────────────────
const examplesSubtitle = computed(() =>
  examples.value
    ? t(
        'editor.newWell.examples.subtitle',
        { count: examples.value.length },
        examples.value.length,
      )
    : t('editor.newWell.examples.subtitleLoading'),
);

/** Option button classes; `current` marks the section shown in the panel. */
function optionClass(current = false) {
  return current && !isMobile.value
    ? 'border-primary-500 bg-surface-0'
    : 'border-transparent hover:bg-surface-100';
}

const showOptions = computed(() => !isMobile.value || !mobilePanelOpen.value);
const showPanel = computed(() => !isMobile.value || mobilePanelOpen.value);

const dialogStyle = computed(() =>
  isMobile.value
    ? {
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        maxHeight: '100dvh',
        margin: 0,
        borderRadius: 0,
      }
    : {
        width: 'calc(100vw - 4rem)',
        maxWidth: '84rem',
        height: 'min(90vh, 54rem)',
      },
);
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :show-header="false"
    :dismissable-mask="true"
    :style="dialogStyle"
    :pt="{ content: { class: 'p-0! h-full overflow-hidden' } }"
  >
    <div
      class="relative flex h-full overflow-hidden"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- ─── Options ───────────────────────────────────────────────── -->
      <aside
        v-if="showOptions"
        class="flex flex-col w-full lg:w-96 shrink-0 h-full overflow-y-auto bg-surface-50 lg:border-r border-surface-200"
      >
        <div class="flex flex-col gap-1 px-6 lg:px-8 pt-6 lg:pt-10 pb-6">
          <span class="kicker">{{ t('editor.newWell.kicker') }}</span>
          <h2
            class="m-0 font-serif italic text-3xl lg:text-4xl font-semibold tracking-tight text-content-0 leading-tight pr-10 lg:pr-0"
          >
            {{ t('editor.newWell.title') }}
          </h2>
        </div>

        <div class="flex flex-col gap-6 px-3 lg:px-5 pb-6">
          <section class="flex flex-col gap-1">
            <span class="kicker px-3 pb-1">{{
              t('editor.newWell.groups.start')
            }}</span>
            <button
              type="button"
              class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer"
              :class="optionClass()"
              @click="startBlank"
            >
              <span
                class="size-11 rounded-lg flex items-center justify-center shrink-0 bg-primary-500 text-content-950 dark:text-content-0"
              >
                <Icon name="ph:plus-bold" class="size-5" />
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-base font-semibold text-content-0 leading-snug"
                >
                  {{ t('editor.newWell.blank.title') }}
                </span>
                <span class="text-sm text-content-400 leading-snug">
                  {{ t('editor.newWell.blank.subtitle') }}
                </span>
              </span>
            </button>
            <button
              type="button"
              class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer"
              :class="optionClass(section === 'examples')"
              :aria-current="
                section === 'examples' && !isMobile ? 'true' : undefined
              "
              @click="showSection('examples')"
            >
              <span
                class="size-11 rounded-lg flex items-center justify-center shrink-0 border bg-surface-0 border-surface-200 text-content-0"
              >
                <Icon name="ph:books-duotone" class="size-5" />
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-base font-semibold text-content-0 leading-snug"
                >
                  {{ t('editor.newWell.examples.title') }}
                </span>
                <span class="text-sm text-content-400 leading-snug">
                  {{ examplesSubtitle }}
                </span>
              </span>
              <Icon
                v-if="isMobile"
                name="ph:caret-right"
                class="size-4 shrink-0 text-content-400"
              />
            </button>
          </section>

          <section class="flex flex-col gap-1">
            <span class="kicker px-3 pb-1">{{
              t('editor.newWell.groups.import')
            }}</span>
            <button
              type="button"
              class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer"
              :class="optionClass()"
              @click="pickFile"
            >
              <span
                class="size-11 rounded-lg flex items-center justify-center shrink-0 border bg-surface-0 border-surface-200 text-content-0"
              >
                <Icon name="ph:folder-open-duotone" class="size-5" />
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-base font-semibold text-content-0 leading-snug"
                >
                  {{ t('editor.newWell.open.title') }}
                </span>
                <span class="text-sm text-content-400 leading-snug">
                  {{
                    t(
                      isMobile
                        ? 'editor.newWell.open.subtitleMobile'
                        : 'editor.newWell.open.subtitle',
                    )
                  }}
                </span>
              </span>
              <kbd
                v-if="!isMobile"
                class="shrink-0 font-mono text-xs text-content-400"
              >
                {{ modKey }}O
              </kbd>
            </button>
            <button
              type="button"
              class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer"
              :class="optionClass(section === 'paste')"
              :aria-current="
                section === 'paste' && !isMobile ? 'true' : undefined
              "
              @click="showSection('paste')"
            >
              <span
                class="size-11 rounded-lg flex items-center justify-center shrink-0 border bg-surface-0 border-surface-200 text-content-0"
              >
                <Icon name="ph:brackets-curly-duotone" class="size-5" />
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-base font-semibold text-content-0 leading-snug"
                >
                  {{ t('editor.newWell.paste.title') }}
                </span>
                <span class="text-sm text-content-400 leading-snug">
                  {{ t('editor.newWell.paste.subtitle') }}
                </span>
              </span>
              <kbd
                v-if="!isMobile"
                class="shrink-0 font-mono text-xs text-content-400"
              >
                {{ modKey }}V
              </kbd>
              <Icon
                v-if="isMobile"
                name="ph:caret-right"
                class="size-4 shrink-0 text-content-400"
              />
            </button>
            <button
              type="button"
              class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer"
              :class="optionClass(section === 'siagas')"
              :aria-current="
                section === 'siagas' && !isMobile ? 'true' : undefined
              "
              @click="showSection('siagas')"
            >
              <span
                class="size-11 rounded-lg flex items-center justify-center shrink-0 border bg-surface-0 border-surface-200 text-content-0"
              >
                <Icon name="ph:download-simple-duotone" class="size-5" />
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-base font-semibold text-content-0 leading-snug"
                >
                  {{ t('editor.importSiagas') }}
                </span>
                <span class="text-sm text-content-400 leading-snug">
                  {{ t('editor.newWell.siagas.subtitle') }}
                </span>
              </span>
              <Icon
                v-if="isMobile"
                name="ph:caret-right"
                class="size-4 shrink-0 text-content-400"
              />
            </button>
          </section>

          <Message
            v-if="loadError"
            severity="error"
            closable
            class="mx-3"
            @close="loadError = null"
          >
            <span class="flex flex-col gap-0.5">
              <span>{{ t('editor.newWell.loadError') }}</span>
              <span class="font-mono text-xs break-all opacity-80">
                {{ loadError }}
              </span>
            </span>
          </Message>
        </div>

        <p
          class="m-0 mt-auto mx-6 lg:mx-8 py-5 border-t border-surface-200 flex items-start gap-2.5 text-sm text-content-400 leading-snug"
        >
          <Icon name="ph:info" class="size-4 shrink-0 mt-0.5" />
          {{ t('editor.newWell.note') }}
        </p>
      </aside>

      <!-- ─── Section panel ─────────────────────────────────────────── -->
      <main v-if="showPanel" class="flex flex-col flex-1 min-w-0 h-full">
        <button
          v-if="isMobile"
          type="button"
          class="self-start flex items-center gap-1.5 mx-4 mt-4 px-2 py-1.5 rounded-lg border-none bg-transparent text-sm text-content-400 hover:text-content-0 hover:bg-surface-100 cursor-pointer"
          @click="mobilePanelOpen = false"
        >
          <Icon name="ph:arrow-left" class="size-4" />
          {{ t('editor.newWell.back') }}
        </button>
        <ExamplesPanel v-if="section === 'examples'" />
        <SiagasPanel v-else-if="section === 'siagas'" v-model="siagasCode" />
        <PasteJsonPanel v-else v-model="pasteText" />
      </main>

      <button
        type="button"
        class="absolute top-4 right-4 lg:top-6 lg:right-6 size-10 rounded-full flex items-center justify-center border border-surface-200 bg-surface-0 text-content-400 hover:text-content-0 hover:border-surface-300 transition-colors cursor-pointer"
        :aria-label="t('editor.newWell.close')"
        @click="close"
      >
        <Icon name="ph:x" class="size-4" />
      </button>

      <!-- ─── Drop overlay ──────────────────────────────────────────── -->
      <div
        v-if="dragging"
        class="absolute inset-3 z-10 rounded-2xl border-2 border-dashed border-primary-500 bg-surface-0/90 flex flex-col items-center justify-center gap-3 pointer-events-none"
      >
        <Icon
          name="ph:file-arrow-down-duotone"
          class="size-10 text-primary-500"
        />
        <span class="text-lg font-semibold text-content-0">
          {{ t('editor.newWell.dropHint') }}
        </span>
      </div>
    </div>
  </Dialog>
</template>
