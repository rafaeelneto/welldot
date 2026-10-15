import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), Icons({ compiler: 'vue3' })],
  resolve: {
    alias: {
      // Nuxt's virtual module, used by `src/nuxt/runtime/plugin.ts`.
      '#imports': fileURLToPath(
        new URL('./src/test/nuxtImports.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
