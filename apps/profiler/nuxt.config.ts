import tailwindcss from '@tailwindcss/vite';
import type { PwaModuleOptions } from '@vite-pwa/nuxt';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

const pwaConfig: PwaModuleOptions = isDev
  ? {}
  : {
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      client: {
        installPrompt: true,
        periodicSyncForUpdates: 3600,
      },
      manifest: false,
    };

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['@/assets/styles/main.css'],

  pages: {
    pattern: ['**/*.vue', '!**/_*/**'],
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-viewport',
    '@nuxtjs/seo',
    '@vite-pwa/nuxt',
  ],

  // @ts-ignore
  viewport: {
    breakpoints: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    defaultBreakpoints: {
      desktop: 'lg',
      mobile: 'xs',
      tablet: 'md',
    },
    fallbackBreakpoint: 'lg',
    cookie: {
      expires: 365,
      name: 'viewport',
      path: '/',
      sameSite: 'Strict',
      secure: true,
    },
    feature: 'minWidth',
  },

  // @ts-ignore
  primevue: {
    importPT: {
      as: 'customPt',
      from: path.resolve(__dirname, './app/theme/customPt.js'),
    },
    importTheme: { from: '@/theme/customTheme.ts' },
    autoImport: true,
    directives: {
      include: ['*'],
    },
    options: {
      inputVariant: 'filled',
    },
  },

  icon: {
    mode: 'svg',
    customCollections: [
      {
        prefix: 'welldot',
        dir: './app/assets/icons',
        normalizeIconName: true,
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  site: {
    indexable: !isDev,
    url: isDev ? 'http://localhost:3000' : 'https://welldot.org',
    name: 'Welldot',
    description:
      'Open-source geological well log visualization and profiling tool',
    defaultLocale: 'en',
    identity: {
      type: 'Organization',
      name: 'Welldot',
      logo: '/favicon.svg',
    },
  },

  ogImage: {
    enabled: false,
  },

  schemaOrg: {
    identity: 'Organization',
  },

  pwa: {
    ...pwaConfig,
  },

  app: {
    head: {
      templateParams: {
        separator: '·',
      },
      htmlAttrs: {
        lang: 'en',
      },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
      meta: [
        { name: 'theme-color', content: '#181825' },
        { name: 'apple-mobile-web-app-title', content: 'Welldot' },
      ],
    },
  },

  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      crawlLinks: true,
      routes: ['/sitemap.xml', '/robots.txt'],
    },
  },
});
