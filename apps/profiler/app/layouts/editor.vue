<script setup lang="ts">
import { useDark } from '@vueuse/core';

const { t } = useI18n();

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark-mode',
  valueLight: '',
});

const togglePt = {
  root: {
    class: [
      'size-8 rounded-lg border flex items-center justify-center cursor-pointer',
      'transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      'border-surface-200 text-content-400',
      'hover:border-surface-300 hover:text-content-0',
    ],
  },
};

const actionBtnPt = {
  root: {
    class: [
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium',
      'text-content-400 hover:text-content-0 hover:bg-surface-100',
      'transition-colors duration-150 cursor-pointer border-none bg-transparent',
    ],
  },
};
</script>

<template>
  <div
    class="landing-bg h-dvh flex flex-col overflow-hidden text-content-0 font-display"
  >
    <!-- Desktop nav (hidden on mobile) -->
    <nav
      class="glass-nav hidden lg:flex sticky top-0 z-50 shrink-0 items-center gap-3 px-6 py-3"
    >
      <!-- Brand -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5 font-bold text-base tracking-tight text-content-0 no-underline shrink-0"
      >
        <div
          class="w-6.5 h-6.5 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-mono text-[10px] font-semibold"
        >
          wd
        </div>
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
            >P4 — Exemplo</span
          >
        </div>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
          <span
            class="font-mono text-[10px] tracking-[0.12em] uppercase text-content-400"
          >
            {{ t('editor.status.saved') }} · 160 M · 15
            {{ t('editor.status.layers').toUpperCase() }}
          </span>
        </div>
      </div>

      <div class="flex-1" />

      <!-- Action buttons -->
      <div class="flex items-center gap-0.5">
        <Button :label="t('editor.save')" unstyled :pt="actionBtnPt">
          <template #icon>
            <Icon name="ph:floppy-disk-duotone" class="size-4 shrink-0" />
          </template>
        </Button>
        <Button :label="t('editor.open')" unstyled :pt="actionBtnPt">
          <template #icon>
            <Icon name="ph:folder-open-duotone" class="size-4 shrink-0" />
          </template>
        </Button>
        <Button :label="t('editor.share')" unstyled :pt="actionBtnPt">
          <template #icon>
            <Icon name="ph:share-network-duotone" class="size-4 shrink-0" />
          </template>
        </Button>
      </div>

      <!-- Divider -->
      <div class="w-px h-5 bg-surface-200/80 shrink-0" />

      <!-- Dark mode toggle -->
      <ToggleButton
        v-model="isDark"
        :on-label="''"
        :off-label="''"
        :aria-label="isDark ? t('nav.theme.light') : t('nav.theme.dark')"
        unstyled
        :pt="togglePt"
      >
        <Transition name="icon-rotate" mode="out-in">
          <Icon
            v-if="isDark"
            key="sun"
            name="heroicons:sun"
            class="size-4 shrink-0"
          />
          <Icon
            v-else
            key="moon"
            name="heroicons:moon"
            class="size-4 shrink-0"
          />
        </Transition>
      </ToggleButton>

      <!-- Export PDF (primary CTA) -->
      <Button :label="t('editor.exportPdf')" size="small">
        <template #icon>
          <Icon name="ph:file-pdf-duotone" class="size-4 shrink-0" />
        </template>
      </Button>
    </nav>

    <!-- Content slot — fills remaining height on desktop -->
    <div class="flex-1 flex flex-col min-h-0">
      <slot />
    </div>
  </div>
</template>
