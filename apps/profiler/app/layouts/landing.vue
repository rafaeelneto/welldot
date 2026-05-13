<script setup lang="ts">
import { useDark } from '@vueuse/core';

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
            Editor
          </NuxtLink>
          <NuxtLink
            to="https://github.com/rafaeelneto/welldot"
            target="_blank"
            class="text-content-400 hover:text-content-0 font-medium transition-colors no-underline"
          >
            GitHub
          </NuxtLink>
        </div>

        <div class="flex-1" />

        <!-- Dark mode toggle -->
        <ToggleButton
          v-model="isDark"
          :on-label="''"
          :off-label="''"
          :aria-label="isDark ? 'Modo claro' : 'Modo escuro'"
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
          label="Abrir editor"
          size="small"
          as="a"
          href="#"
          class="hidden lg:inline-flex"
        />

        <!-- Mobile: primary CTA -->
        <Button label="Editor" size="small" as="a" href="#" class="lg:hidden" />

        <!-- Mobile hamburger -->
        <button
          class="lg:hidden w-8 h-8 border border-surface-200 rounded-lg flex items-center justify-center text-content-0"
          aria-label="Menu"
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

    <!-- Page content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-surface-200/60">
      <div
        class="container-landing py-7 font-mono text-[11px] text-content-500 flex flex-wrap gap-6"
      >
        <span>welldot · v1.0.0</span>
        <span>.well spec v1.0</span>
        <span class="flex-1" />
        <span>Aberto · Apache 2.0</span>
      </div>
    </footer>
  </div>
</template>
