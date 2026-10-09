import { Icon } from '#components';

/**
 * Renders `@welldot/vue` string icons (e.g. `<WellChip icon="ph:drop">`) with
 * `@nuxt/icon`. Contract: `WellIconProps` (`{ name }`).
 */
const AppIconPart = defineComponent({
  name: 'AppIconPart',
  props: { name: { type: String, required: true } },
  setup: props => () => h(Icon, { name: props.name }),
});

/**
 * App layer of the `@welldot/vue` configuration: display units and the
 * coordinate format come from the UI store (Settings). The `@welldot/vue/nuxt`
 * module's own plugin wires `locale` from `$i18n`; this `createWelldot`
 * layers on top of it.
 */
export default defineNuxtPlugin(nuxtApp => {
  const ui = useUiStore();
  nuxtApp.vueApp.use(
    createWelldot({
      units: () => ({
        length: ui.lengthUnit,
        diameter: ui.diameterUnit,
        flow: ui.flowUnit,
        power: ui.powerUnit,
        volume: ui.volumeUnit,
      }),
      coordinateFormat: () => ui.coordinateFormat,
      components: { icon: AppIconPart },
    }),
  );
});
