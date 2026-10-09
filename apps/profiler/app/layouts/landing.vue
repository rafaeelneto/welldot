<script setup lang="ts">
import { useDark } from '@vueuse/core';
import { NuxtLink } from '#components';

const { t, locale, locales, setLocale } = useI18n();
const localePath = useLocalePath();

function changeLocale(code: string) {
  setLocale(code as 'en' | 'pt');
}

const drawerOpen = ref(false);

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

// Shared by the topbar and drawer "coming soon" markers.
const previewPillClass =
  'text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 ' +
  'rounded-full bg-surface-100 text-content-400';

// Same 32px bordered box as the theme toggle, so the two drawer rows align.
const localeBtnClass =
  'size-8 rounded-lg border flex items-center justify-center cursor-pointer ' +
  'font-mono text-xs uppercase transition-colors duration-200 outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1';
</script>

<template>
  <div class="landing-bg min-h-dvh text-content-0 font-display">
    <!-- Sticky glass nav -->
    <nav class="glass-nav sticky top-0 z-50 font-display text-[13px]">
      <div class="container-landing flex items-center gap-4 lg:gap-6 py-3">
        <!-- Brand -->
        <NuxtLink
          :to="localePath('/')"
          class="flex items-center gap-2.5 font-bold text-base tracking-tight text-content-0 no-underline"
        >
          <Icon name="welldot:logo" class="size-6.5 shrink-0" />
          welldot
        </NuxtLink>

        <!-- Desktop text links -->
        <div class="hidden lg:flex items-center gap-6">
          <NuxtLink
            :to="localePath('/editor')"
            class="text-content-400 hover:text-content-0 font-medium transition-colors no-underline"
          >
            {{ t('nav.editor') }}
          </NuxtLink>
          <NuxtLink
            v-tooltip.bottom="t('nav.managerTooltip')"
            to="https://manager.welldot.org/"
            target="_blank"
            class="flex items-center gap-2 text-content-400 hover:text-content-0 font-medium transition-colors no-underline"
          >
            {{ t('nav.manager') }}
            <span :class="previewPillClass">{{ t('nav.preview') }}</span>
          </NuxtLink>
          <NuxtLink
            to="https://github.com/rafaeelneto/welldot"
            target="_blank"
            class="text-content-400 hover:text-content-0 font-medium transition-colors no-underline"
          >
            {{ t('nav.github') }}
          </NuxtLink>
        </div>

        <div class="flex-1" />

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

        <!-- Desktop primary CTA -->
        <Button
          :label="t('nav.openEditor')"
          size="small"
          :as="NuxtLink"
          :to="localePath('/editor')"
          class="hidden lg:inline-flex"
        />

        <!-- Mobile: primary CTA -->
        <Button
          :label="t('nav.openEditorMobile')"
          size="small"
          :as="NuxtLink"
          :to="localePath('/editor')"
          class="lg:hidden"
        />

        <!-- Mobile hamburger -->
        <button
          class="lg:hidden size-8 border border-surface-200 rounded-lg flex items-center justify-center text-content-0"
          :aria-label="t('nav.menu')"
          @click="drawerOpen = true"
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <rect width="16" height="1.5" rx="0.75" fill="currentColor" />
            <rect
              y="5.25"
              width="16"
              height="1.5"
              rx="0.75"
              fill="currentColor"
            />
            <rect
              y="10.5"
              width="16"
              height="1.5"
              rx="0.75"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Mobile nav drawer -->
    <Drawer v-model:visible="drawerOpen" position="right" class="w-72!">
      <template #header>
        <span class="font-bold text-base tracking-tight">welldot</span>
      </template>

      <nav class="flex flex-col gap-1 mt-2">
        <NuxtLink
          :to="localePath('/editor')"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-content-200 hover:text-content-0 hover:bg-surface-100 transition-colors no-underline"
          @click="drawerOpen = false"
        >
          <Icon name="heroicons:pencil-square" class="size-4 shrink-0" />
          {{ t('nav.editor') }}
        </NuxtLink>
        <NuxtLink
          to="https://manager.welldot.org/"
          target="_blank"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-content-200 hover:text-content-0 hover:bg-surface-100 transition-colors no-underline"
          @click="drawerOpen = false"
        >
          <Icon name="heroicons:squares-2x2" class="size-4 shrink-0" />
          {{ t('nav.manager') }}
          <span :class="[previewPillClass, 'ml-auto']">{{
            t('nav.preview')
          }}</span>
        </NuxtLink>
        <NuxtLink
          to="https://github.com/rafaeelneto/welldot"
          target="_blank"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-content-200 hover:text-content-0 hover:bg-surface-100 transition-colors no-underline"
          @click="drawerOpen = false"
        >
          <Icon
            name="heroicons:arrow-top-right-on-square"
            class="size-4 shrink-0"
          />
          {{ t('nav.github') }}
        </NuxtLink>
      </nav>

      <Divider class="my-4" />

      <div class="flex items-center gap-2 px-1">
        <span class="text-xs text-content-400 font-mono uppercase mr-auto">{{
          t('nav.theme.light')
        }}</span>
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
      </div>

      <div class="flex items-center gap-2 px-1 mt-3">
        <span class="text-xs text-content-400 font-mono uppercase mr-auto">{{
          t('nav.language')
        }}</span>
        <button
          v-for="loc in locales"
          :key="loc.code"
          :class="[
            localeBtnClass,
            locale === loc.code
              ? 'border-primary-500 text-content-0'
              : 'border-surface-200 text-content-400 hover:border-surface-300 hover:text-content-0',
          ]"
          :aria-pressed="locale === loc.code"
          @click="changeLocale(loc.code)"
        >
          {{ loc.code }}
        </button>
      </div>

      <template #footer>
        <Button
          :label="t('nav.openEditor')"
          class="w-full"
          :as="NuxtLink"
          :to="localePath('/editor')"
          @click="drawerOpen = false"
        />
      </template>
    </Drawer>

    <!-- Page content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-surface-200/60">
      <div
        class="container-landing py-7 font-mono text-[11px] text-content-500 flex flex-wrap gap-6"
      >
        <span>{{ t('footer.version') }}</span>
        <span>{{ t('footer.spec') }}</span>
        <span class="flex-1" />
        <div class="flex items-center gap-3">
          <button
            v-for="loc in locales"
            :key="loc.code"
            class="uppercase transition-colors cursor-pointer"
            :class="
              locale === loc.code ? 'text-content-0' : 'hover:text-content-300'
            "
            @click="changeLocale(loc.code)"
          >
            {{ loc.code }}
          </button>
        </div>
        <span>{{ t('footer.license') }}</span>
      </div>
    </footer>
  </div>
</template>
