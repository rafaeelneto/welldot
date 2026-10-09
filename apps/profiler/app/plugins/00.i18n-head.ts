export default defineNuxtPlugin({
  name: 'i18n-head',
  setup() {
    const i18nHead = useLocaleHead();

    useHead(() => ({
      htmlAttrs: i18nHead.value.htmlAttrs,
      // 01.canonical.ts already owns the canonical <link> (it strips tracking
      // params) and og:url — drop i18n's copies here to avoid duplicates.
      link: i18nHead.value.link.filter(l => l.rel !== 'canonical'),
      meta: i18nHead.value.meta.filter(m => m.property !== 'og:url'),
    }));
  },
});
