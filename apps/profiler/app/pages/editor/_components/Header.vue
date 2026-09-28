<script setup lang="ts">
import ShareProfile from '~/components/ShareProfile.vue';
import SettingsModal from '~/components/SettingsModal.vue';
import ExportPdfDialog from '~/components/ExportPdfDialog.vue';
import AiImporterDialog from '~/components/AiImporterDialog.vue';
import ToolsMenu, { type ToolItem } from './ToolsMenu.vue';

const props = defineProps<{ mobileView: 'profile' | 'data' }>();
const emit = defineEmits<{
  'update:mobileView': [value: 'profile' | 'data'];
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const store = useProfileStore();
const { save, saveAs } = useProfileExport();
const persistence = useFilePersistence();

const viewport = useViewport();
const isMobile = computed(() => viewport.isLessThan('lg'));

// ── Store-derived computeds ─────────────────────────────────────────
const hasWell = computed(() => !!store.well);
const wellName = computed(() => store.well?.name ?? '—');
const depthDisplay = computed(() =>
  store.maxDepth > 0 ? `${store.maxDepth} M` : '—',
);
const totalLayers = computed(
  () => store.totalGeologicLayers + store.totalConstructiveLayers,
);

// ── Open ────────────────────────────────────────────────────────────
const fileInputRef = ref<HTMLInputElement | null>(null);
const confirm = useConfirm();

async function _doOpenFile() {
  if (persistence.hasFileSystemAccess) {
    const text = await persistence.open();
    if (text !== null) store.loadWell(text);
  } else {
    fileInputRef.value?.click();
  }
}

async function openFile() {
  if (store.isDirty && hasWell.value) {
    confirm.require({
      icon: 'ph:warning-duotone',
      header: t('editor.confirmOpen.header'),
      message: t('editor.confirmOpen.message'),
      acceptLabel: t('editor.confirmOpen.accept'),
      rejectLabel: t('editor.confirmOpen.reject'),
      defaultFocus: 'reject',
      rejectProps: { text: true, severity: 'secondary' },
      accept: () => _doOpenFile(),
    });
  } else {
    await _doOpenFile();
  }
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  persistence.clearHandle();
  store.loadWell(await file.text());
  input.value = '';
}

// ── Save / Save As ───────────────────────────────────────────────────
async function saveFile() {
  await save();
}

async function saveFileAs() {
  await saveAs();
}

// ── Clear ────────────────────────────────────────────────────────────
function clearWell() {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.confirmClear.header'),
    message: t('editor.confirmClear.message'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => store.clear(),
  });
}

// ── Keyboard shortcuts ───────────────────────────────────────────────
function _onKeyDown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || !hasWell.value) return;
  if (e.key === 's' && e.shiftKey) {
    e.preventDefault();
    saveFileAs();
  } else if (e.key === 's') {
    e.preventDefault();
    saveFile();
  }
}

onMounted(() => document.addEventListener('keydown', _onKeyDown));
onBeforeUnmount(() => document.removeEventListener('keydown', _onKeyDown));

// ── Share dialog ────────────────────────────────────────────────────
const shareVisible = ref(false);
const shareVisibilityStore = useShareVisibilityStore();

// ── Settings dialog ─────────────────────────────────────────────────
const settingsVisible = ref(false);
const bus = useBus();
let _offOpenSettings: (() => void) | undefined;

onMounted(() => {
  _offOpenSettings = bus.on('ui:open-settings', () => {
    settingsVisible.value = true;
  });
});
onBeforeUnmount(() => _offOpenSettings?.());

// ── Export PDF dialog ────────────────────────────────────────────────
const exportPdfVisible = ref(false);

// ── AI importer dialog ───────────────────────────────────────────────
const aiImporterVisible = ref(false);

// ── Tools menu ──────────────────────────────────────────────────────
const toolsMenuVisible = ref(false);

const toolItems = computed<ToolItem[]>(() => [
  {
    label: t('editor.save'),
    icon: 'ph:floppy-disk-duotone',
    disabled: !hasWell.value,
    onClick: saveFile,
  },
  {
    label: t('editor.saveAs'),
    icon: 'ph:floppy-disk-back-duotone',
    disabled: !hasWell.value,
    alwaysInMenu: true,
    onClick: saveFileAs,
  },
  {
    label: t('editor.open'),
    icon: 'ph:folder-open-duotone',
    onClick: openFile,
  },
  {
    label: t('editor.share'),
    icon: 'ph:share-network-duotone',
    disabled: !hasWell.value,
    onClick: () => (shareVisible.value = true),
  },
  {
    label: t('editor.settings.title'),
    icon: 'ph:gear-six-duotone',
    onClick: () => (settingsVisible.value = true),
  },
  {
    label: t('editor.exportPdf'),
    icon: 'ph:file-pdf-duotone',
    onClick: () => (exportPdfVisible.value = true),
  },
  {
    label: t('editor.aiImporter.title'),
    icon: 'welldot:file-ai',
    comingSoon: true,
    onClick: () => (aiImporterVisible.value = true),
  },
  {
    label: t('editor.importSiagas'),
    icon: 'ph:download-simple-duotone',
    comingSoon: true,
    alwaysInMenu: true,
    disabled: true,
  },
  {
    label: t('editor.clearWell'),
    icon: 'welldot:delete-well',
    disabled: !hasWell.value,
    alwaysInMenu: true,
    onClick: clearWell,
  },
]);

// Extra tools shown in the desktop menu, on top of the dedicated buttons
// already present in the nav.
const extraToolItems = computed<ToolItem[]>(() =>
  toolItems.value.filter(item => item.alwaysInMenu),
);

// ── Pass-through ────────────────────────────────────────────────────
const actionBtnPt = {
  root: {
    class: [
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium',
      'text-content-400 hover:text-content-0 hover:bg-surface-100',
      'transition-colors duration-150 cursor-pointer border-none bg-transparent',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    ],
  },
};

const iconBtnPt = {
  root: {
    class: [
      'size-8 rounded-full border border-surface-200 flex items-center justify-center shrink-0',
      'text-content-400 hover:text-content-0 hover:border-surface-300',
      'transition-colors duration-150 cursor-pointer bg-transparent',
    ],
  },
};

const viewOptions = computed(() => [
  {
    value: 'profile',
    label: t('editor.viewProfile'),
    icon: 'ph:chart-bar-horizontal-duotone',
  },
  { value: 'data', label: t('editor.viewData'), icon: 'ph:table-duotone' },
]);
</script>

<template>
  <!-- ─── Desktop nav (hidden on mobile) ───────────────────────────── -->
  <nav
    class="glass-nav hidden lg:flex sticky top-0 z-50 shrink-0 items-center gap-3 px-6 py-3"
  >
    <!-- Brand -->
    <NuxtLink
      :to="localePath('/')"
      class="flex items-center gap-2.5 font-bold text-base tracking-tight text-content-0 no-underline shrink-0"
    >
      <Icon name="welldot:logo" class="size-6.5 shrink-0" />
      welldot
    </NuxtLink>

    <!-- Breadcrumb separator -->
    <span class="text-content-400 text-sm select-none">/</span>

    <!-- Well label + name + status -->
    <div class="flex flex-col min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="kicker shrink-0">{{ t('editor.well') }}</span>
        <span
          class="font-semibold text-[15px] text-content-0 truncate leading-tight"
        >
          {{ wellName }}
        </span>
      </div>
      <div class="flex items-center gap-1.5 mt-0.5">
        <span class="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
        <span
          class="font-mono text-[10px] tracking-[0.12em] uppercase text-content-400"
        >
          <template v-if="hasWell">
            {{
              store.isDirty
                ? t('editor.status.unsaved')
                : t('editor.status.saved')
            }}
            · {{ depthDisplay }} · {{ totalLayers }}
            {{ t('editor.status.layers').toUpperCase() }}
          </template>
          <template v-else>—</template>
        </span>
      </div>
    </div>

    <div class="flex-1" />

    <!-- Action buttons -->
    <div class="flex items-center gap-0.5">
      <Button
        v-tooltip.bottom="t('editor.aiImporter.title')"
        :aria-label="t('editor.aiImporter.title')"
        unstyled
        :pt="actionBtnPt"
        @click="aiImporterVisible = true"
      >
        <template #icon>
          <Icon name="welldot:file-ai" class="size-4 shrink-0" />
        </template>
      </Button>
      <Button
        :label="t('editor.save')"
        :disabled="!hasWell"
        unstyled
        :pt="actionBtnPt"
        @click="saveFile"
      >
        <template #icon>
          <Icon name="ph:floppy-disk-duotone" class="size-4 shrink-0" />
        </template>
      </Button>
      <Button
        :label="t('editor.open')"
        unstyled
        :pt="actionBtnPt"
        @click="openFile"
      >
        <template #icon>
          <Icon name="ph:folder-open-duotone" class="size-4 shrink-0" />
        </template>
      </Button>
      <Button
        :label="t('editor.share')"
        :disabled="!hasWell"
        unstyled
        :pt="actionBtnPt"
        @click="shareVisible = true"
      >
        <template #icon>
          <span class="relative inline-flex shrink-0">
            <Icon name="ph:share-network-duotone" class="size-4 shrink-0" />
            <span
              v-if="shareVisibilityStore.hasHidden"
              class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary-500"
            />
          </span>
        </template>
      </Button>
      <Button
        :aria-label="t('editor.settings.title')"
        data-tip="settings"
        unstyled
        :pt="actionBtnPt"
        @click="settingsVisible = true"
      >
        <template #icon>
          <Icon name="ph:gear-six-duotone" class="size-4 shrink-0" />
        </template>
      </Button>
      <Button
        :aria-label="t('editor.toolsMenu.title')"
        unstyled
        :pt="actionBtnPt"
        @click="toolsMenuVisible = true"
      >
        <template #icon>
          <Icon name="ph:dots-three-outline-light" class="size-4 shrink-0" />
        </template>
      </Button>
    </div>

    <!-- Divider -->
    <div class="w-px h-5 bg-surface-200/80 shrink-0" />

    <Button
      :label="t('editor.exportPdf')"
      size="small"
      @click="exportPdfVisible = true"
    >
      <template #icon>
        <Icon name="ph:file-pdf-duotone" class="size-4 shrink-0" />
      </template>
    </Button>
  </nav>

  <!-- ─── Mobile sticky header (hidden on desktop) ──────────────────── -->
  <div
    class="lg:hidden sticky top-0 z-40 bg-surface-0 border-b border-surface-200/60"
  >
    <!-- Row 1: top bar -->
    <div class="flex items-center gap-3 px-4 py-3">
      <NuxtLink
        :to="localePath('/')"
        class="size-8 rounded-full border border-surface-200 flex items-center justify-center text-content-400 hover:text-content-0 hover:border-surface-300 transition-colors shrink-0"
        :aria-label="t('editor.back')"
      >
        <Icon name="ph:arrow-left" class="size-4" />
      </NuxtLink>

      <div class="flex flex-col min-w-0 flex-1">
        <span class="kicker leading-none mb-0.5">{{ t('editor.well') }}</span>
        <span
          class="font-semibold text-[15px] text-content-0 truncate leading-tight"
        >
          {{ wellName }}
        </span>
      </div>

      <Button
        :aria-label="t('editor.toolsMenu.title')"
        data-tip="settings-mobile"
        unstyled
        :pt="iconBtnPt"
        @click="toolsMenuVisible = true"
      >
        <template #icon>
          <Icon name="ph:dots-three-outline-light" class="size-4" />
        </template>
      </Button>
    </div>

    <!-- Row 2: status bar -->
    <div class="flex items-center gap-2 px-4 pb-2.5">
      <span class="size-1.5 rounded-full bg-primary-500 shrink-0" />
      <span
        class="font-mono text-[10px] tracking-[0.12em] uppercase text-content-400"
      >
        <template v-if="hasWell">
          {{
            store.isDirty
              ? t('editor.status.unsaved')
              : t('editor.status.saved')
          }}
          · {{ depthDisplay }} · {{ totalLayers }}
          {{ t('editor.status.layers').toUpperCase() }}
        </template>
        <template v-else>—</template>
      </span>
    </div>

    <!-- Row 3: Profile / Data view toggle -->
    <div class="flex items-center gap-2 px-4 pb-3">
      <SelectButton
        :model-value="props.mobileView"
        :options="viewOptions"
        option-value="value"
        :option-label="() => ''"
        data-key="value"
        :allow-empty="false"
        @update:model-value="emit('update:mobileView', $event)"
      >
        <template #option="{ option }">
          <Icon :name="option.icon" class="size-3.5 shrink-0" />
          {{ option.label }}
        </template>
      </SelectButton>
    </div>
  </div>

  <!-- ─── Share dialog ──────────────────────────────────────────────── -->
  <ShareProfile v-if="shareVisible" v-model="shareVisible" />

  <!-- ─── Settings dialog ───────────────────────────────────────────── -->
  <SettingsModal v-if="settingsVisible" v-model="settingsVisible" />

  <!-- ─── Export PDF dialog ─────────────────────────────────────────── -->
  <ExportPdfDialog v-if="exportPdfVisible" v-model="exportPdfVisible" />

  <!-- ─── AI importer dialog ────────────────────────────────────────── -->
  <AiImporterDialog v-if="aiImporterVisible" v-model="aiImporterVisible" />

  <!-- ─── Tools menu ────────────────────────────────────────────────── -->
  <ToolsMenu
    v-if="toolsMenuVisible"
    v-model="toolsMenuVisible"
    :items="isMobile ? toolItems : extraToolItems"
  />

  <!-- ─── Hidden file input ─────────────────────────────────────────── -->
  <ClientOnly>
    <input
      ref="fileInputRef"
      type="file"
      accept=".well,.json"
      class="sr-only"
      @change="onFileSelected"
    />
  </ClientOnly>
</template>
