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

    useServerSeoMeta({
      ogUrl: () => cleanCanonical(),
    });
  },
});
