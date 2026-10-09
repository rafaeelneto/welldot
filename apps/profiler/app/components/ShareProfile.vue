<script setup lang="ts">
import { isWellEmpty, redactWell } from '@welldot/core';
import { format } from 'date-fns';
import { renderSVG } from 'uqr';

const visible = defineModel<boolean>({ default: false });

const { t } = useI18n();
const { download, getShareableJson } = useProfileExport();
const { copyShareLink, isGenerating } = useProfileShare();
const profileStore = useProfileStore();
const shareVisibilityStore = useShareVisibilityStore();

const isEmpty = computed(() =>
  isWellEmpty(redactWell(profileStore.well, shareVisibilityStore.visibility)),
);
const showVisibilityChecklist = ref(false);
const linkErrorReason = ref<'tooLarge' | 'error' | null>(null);
const shareUrl = ref<string | null>(null);
const shareExpiresAt = ref<string | null>(null);
const copied = ref(false);

const qrSvg = computed(() =>
  shareUrl.value ? renderSVG(shareUrl.value, { pixelSize: 4 }) : null,
);
const validUntilLabel = computed(() =>
  shareExpiresAt.value
    ? t('editor.shareDialog.linkValidUntil', {
        date: format(new Date(shareExpiresAt.value), 'd MMM yyyy'),
      })
    : null,
);

// Reset the generated-link panel each time the dialog is (re)opened, since
// the well may have changed since the last time a link was generated.
watch(visible, isVisible => {
  if (isVisible) {
    shareUrl.value = null;
    shareExpiresAt.value = null;
    linkErrorReason.value = null;
    copied.value = false;
  }
});

async function copyJson() {
  const json = getShareableJson();
  if (json) await copyToClipboard(json);
  visible.value = false;
}

function downloadWell() {
  download();
  visible.value = false;
}

function flashCopied() {
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

async function copyLink() {
  linkErrorReason.value = null;
  const result = await copyShareLink();
  if (result.ok) {
    shareUrl.value = result.url;
    shareExpiresAt.value = result.expiresAt;
    flashCopied();
  } else if (result.reason !== 'empty') {
    linkErrorReason.value = result.reason;
  }
}

async function recopyLink() {
  if (!shareUrl.value) return;
  const ok = await copyToClipboard(shareUrl.value);
  if (ok) flashCopied();
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('editor.shareDialog.title')"
    :style="{ width: '24rem' }"
  >
    <div class="flex flex-col gap-2 pt-1">
      <Button
        severity="secondary"
        text
        size="small"
        class="self-start"
        :label="t('editor.shareVisibility.title')"
        @click="showVisibilityChecklist = !showVisibilityChecklist"
      >
        <template #icon>
          <Icon
            :name="
              showVisibilityChecklist
                ? 'ph:caret-down-bold'
                : 'ph:caret-right-bold'
            "
            class="size-3 shrink-0"
          />
        </template>
      </Button>

      <div
        v-if="showVisibilityChecklist"
        class="p-3 rounded-lg border border-surface-200 mb-1"
      >
        <ShareVisibilityChecklist />
      </div>

      <Button
        unstyled
        :pt="{
          root: 'flex items-center gap-4 p-3 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-surface-50 transition-colors text-left w-full cursor-pointer',
        }"
        @click="copyJson"
      >
        <Icon
          name="ph:clipboard-text-duotone"
          class="size-6 text-primary-500 shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-content-0">
            {{ t('editor.shareDialog.copyJson') }}
          </div>
          <div class="text-xs text-content-400 mt-0.5">
            {{ t('editor.shareDialog.copyJsonDesc') }}
          </div>
        </div>
      </Button>

      <Button
        unstyled
        :pt="{
          root: 'flex items-center gap-4 p-3 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-surface-50 transition-colors text-left w-full cursor-pointer',
        }"
        @click="downloadWell"
      >
        <Icon
          name="ph:download-simple-duotone"
          class="size-6 text-primary-500 shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-content-0">
            {{ t('editor.shareDialog.downloadWell') }}
          </div>
          <div class="text-xs text-content-400 mt-0.5">
            {{ t('editor.shareDialog.downloadWellDesc') }}
          </div>
        </div>
      </Button>

      <Button
        unstyled
        :disabled="isEmpty"
        :pt="{
          root: 'flex items-center gap-4 p-3 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-surface-50 transition-colors text-left w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-surface-200 disabled:hover:bg-transparent',
        }"
        @click="copyLink"
      >
        <Icon
          v-if="isGenerating"
          name="ph:circle-notch-duotone"
          class="size-6 text-primary-500 shrink-0 animate-spin"
        />
        <Icon
          v-else
          name="ph:link-duotone"
          class="size-6 text-primary-500 shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-content-0">
            {{ t('editor.shareDialog.copyLink') }}
          </div>
          <div class="text-xs text-content-400 mt-0.5">
            {{ t('editor.shareDialog.copyLinkDesc') }}
          </div>
          <div
            v-if="linkErrorReason === 'tooLarge'"
            class="text-xs text-error-700 mt-0.5"
          >
            {{ t('editor.shareDialog.copyLinkTooLarge') }}
          </div>
          <div
            v-else-if="linkErrorReason"
            class="text-xs text-error-700 mt-0.5"
          >
            {{ t('editor.shareDialog.copyLinkError') }}
          </div>
        </div>
      </Button>

      <div
        v-if="shareUrl"
        class="flex flex-col items-center gap-3 p-3 rounded-lg border border-primary-200 bg-surface-100/40"
      >
        <div
          class="flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300"
        >
          <Icon name="ph:check-circle-duotone" class="size-4 shrink-0" />
          {{
            copied
              ? t('editor.shareDialog.linkCopied')
              : t('editor.shareDialog.linkReady')
          }}
        </div>

        <div class="flex items-center gap-2 w-full">
          <InputText
            :model-value="shareUrl"
            disabled
            class="flex-1 min-w-0 font-mono text-xs"
          />
          <Button
            unstyled
            :aria-label="t('editor.shareDialog.copyLinkAgain')"
            :pt="{
              root: 'size-9 shrink-0 rounded-md border border-surface-200 bg-surface-0 flex items-center justify-center text-primary-500 hover:bg-surface-50 transition-colors cursor-pointer',
            }"
            @click="recopyLink"
          >
            <template #icon>
              <Icon
                :name="copied ? 'ph:check-bold' : 'ph:copy-duotone'"
                class="size-4"
              />
            </template>
          </Button>
        </div>

        <!-- eslint-disable vue/no-v-html -->
        <div
          class="p-2 bg-surface-0 rounded-md [&_svg]:size-32"
          v-html="qrSvg"
        />
        <!-- eslint-enable vue/no-v-html -->

        <div v-if="validUntilLabel" class="text-xs text-content-400">
          {{ validUntilLabel }}
        </div>
      </div>
    </div>
  </Dialog>
</template>
