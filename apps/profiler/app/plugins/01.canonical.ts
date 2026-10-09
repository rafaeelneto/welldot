export default defineNuxtPlugin({
  name: 'canonical',
  enforce: 'pre',
  setup() {
    const url = useRequestURL();

    const cleanCanonical = () => {
      const cleanUrl = new URL(url.toString());

      const paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'fbclid',
        'gclid',
      ];
      paramsToRemove.forEach(param => cleanUrl.searchParams.delete(param));

      return cleanUrl.toString();
    };

    useHead(() => ({
      link: [
        {
          rel: 'canonical',
          href: cleanCanonical(),
        },
      ],
    }));

    const siteConfig = useSiteConfig();

    useSeoMeta({
      ogUrl: () => cleanCanonical(),
      ogImage: () => `${siteConfig.url}/og-image.png`,
      ogImageWidth: 1200,
      ogImageHeight: 600,
      twitterCard: 'summary_large_image',
    });
  },
});
