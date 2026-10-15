import { hasWellData } from '@welldot/core';

/** One entry of `@welldot/core/examples/index.json`, served at `/examples/`. */
export interface WellExample {
  slug: string;
  file: string;
  title: { pt: string; en: string };
  summary: { pt: string; en: string };
  tags: string[];
  /** Ids of the `WellExampleCategory` filters this example appears under. */
  categories: string[];
  well_depth: number;
  well_type: string;
  place: string;
  /** SVG drawn by the renderer, relative to the examples folder. */
  thumbnail: string;
}

/** A filter of the example list, in the order the index declares them. */
export interface WellExampleCategory {
  id: string;
  title: { pt: string; en: string };
}

interface WellExampleIndex {
  version: number;
  categories: WellExampleCategory[];
  examples: WellExample[];
}

const EXAMPLES_BASE = '/examples';

/**
 * Example wells from `packages/core/examples`, served by Nitro at `/examples`.
 * The index is fetched once per session; a well is fetched only when opened.
 */
export function useWellExamples() {
  const { t, locale } = useI18n();
  const store = useProfileStore();
  const persistence = useFilePersistence();
  const confirm = useConfirm();

  const examples = useState<WellExample[] | null>('well-examples', () => null);
  const categories = useState<WellExampleCategory[]>(
    'well-example-categories',
    () => [],
  );
  const failed = useState('well-examples-failed', () => false);
  const loadingSlug = useState<string | null>(
    'well-examples-loading',
    () => null,
  );

  async function fetchExamples(): Promise<void> {
    if (examples.value) return;
    try {
      const index = await $fetch<WellExampleIndex>(
        `${EXAMPLES_BASE}/index.json`,
      );
      categories.value = index.categories ?? [];
      examples.value = index.examples;
      failed.value = false;
    } catch {
      failed.value = true;
    }
  }

  function thumbnailUrl(example: WellExample): string {
    return `${EXAMPLES_BASE}/${example.thumbnail}`;
  }

  function exampleText(text: { pt: string; en: string }): string {
    return locale.value === 'pt' ? text.pt : text.en;
  }

  /** The raw `.well` text of an example. */
  function fetchExampleText(example: WellExample): Promise<string> {
    return $fetch<string>(`${EXAMPLES_BASE}/${example.file}`, {
      responseType: 'text',
    });
  }

  async function _load(example: WellExample): Promise<boolean> {
    loadingSlug.value = example.slug;
    try {
      const json = await fetchExampleText(example);
      // An example is not the file the user opened: Save must ask for a name.
      persistence.clearHandle();
      const loaded = store.loadWell(json);
      if (loaded)
        trackEvent('well_open', { source: 'example', example: example.slug });
      return loaded;
    } catch {
      failed.value = true;
      return false;
    } finally {
      loadingSlug.value = null;
    }
  }

  /** Load an example, asking first when the current well has unsaved changes. */
  function openExample(example: WellExample): Promise<boolean> {
    if (!store.isDirty || !hasWellData(store.well)) return _load(example);
    return new Promise(resolve => {
      confirm.require({
        icon: 'ph:warning-duotone',
        header: t('editor.examples.confirm.header'),
        message: t('editor.examples.confirm.message'),
        acceptLabel: t('editor.examples.confirm.accept'),
        rejectLabel: t('editor.examples.confirm.reject'),
        defaultFocus: 'reject',
        rejectProps: { text: true, severity: 'secondary' },
        accept: () => resolve(_load(example)),
        reject: () => resolve(false),
      });
    });
  }

  return {
    examples,
    categories,
    failed,
    loadingSlug,
    fetchExamples,
    openExample,
    fetchExampleText,
    exampleText,
    thumbnailUrl,
  };
}
