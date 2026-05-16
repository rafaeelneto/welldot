<script setup lang="ts">
import { useDark } from '@vueuse/core';

const { t, locale, locales } = useI18n();

function setLocale(code: string) {
  locale.value = code as 'pt' | 'en';
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
      'w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer',
      'transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      'border-surface-200 text-content-400',
      'hover:border-surface-300 hover:text-content-0',
    ],
  },
};
</script>

<template>
  <div class="landing-bg min-h-dvh text-content-0 font-display">
    <!-- Sticky glass nav -->
    <nav class="glass-nav sticky top-0 z-50 font-display text-[13px]">
      <div class="container-landing flex items-center gap-4 lg:gap-6 py-3">
        <!-- Brand -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 font-bold text-base tracking-tight text-content-0 no-underline"
        >
          <div
            class="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-mono text-[10px] font-semibold"
          >
            wd
          </div>
          welldot
        </NuxtLink>

        <!-- Desktop text links -->
        <div class="hidden lg:flex items-center gap-6">
          <NuxtLink
            to="/"
            class="text-content-400 hover:text-content-0 font-medium transition-colors no-underline"
          >
            {{ t('nav.editor') }}
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
              class="w-4 h-4 shrink-0"
            />
            <Icon
              v-else
              key="moon"
              name="heroicons:moon"
              class="w-4 h-4 shrink-0"
            />
          </Transition>
        </ToggleButton>

        <!-- Desktop primary CTA -->
        <Button
          :label="t('nav.openEditor')"
          size="small"
          as="a"
          href="#"
          class="hidden lg:inline-flex"
        />

        <!-- Mobile: primary CTA -->
        <Button
          :label="t('nav.openEditorMobile')"
          size="small"
          as="a"
          href="#"
          class="lg:hidden"
        />

        <!-- Mobile hamburger -->
        <button
          class="lg:hidden w-8 h-8 border border-surface-200 rounded-lg flex items-center justify-center text-content-0"
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
          to="/"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-content-200 hover:text-content-0 hover:bg-surface-100 transition-colors no-underline"
          @click="drawerOpen = false"
        >
          <Icon name="heroicons:pencil-square" class="w-4 h-4 shrink-0" />
          {{ t('nav.editor') }}
        </NuxtLink>
        <NuxtLink
          to="https://github.com/rafaeelneto/welldot"
          target="_blank"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-content-200 hover:text-content-0 hover:bg-surface-100 transition-colors no-underline"
          @click="drawerOpen = false"
        >
          <Icon
            name="heroicons:arrow-top-right-on-square"
            class="w-4 h-4 shrink-0"
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
              class="w-4 h-4 shrink-0"
            />
            <Icon
              v-else
              key="moon"
              name="heroicons:moon"
              class="w-4 h-4 shrink-0"
            />
          </Transition>
        </ToggleButton>
      </div>

      <template #footer>
        <Button
          :label="t('nav.openEditor')"
          class="w-full"
          as="a"
          href="#"
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
            @click="setLocale(loc.code)"
          >
            {{ loc.code }}
          </button>
        </div>
        <span>{{ t('footer.license') }}</span>
      </div>
    </footer>
  </div>
</template>
