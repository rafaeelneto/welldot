import { isWellEmpty } from '@welldot/core';

/** One entry of `@welldot/core/examples/index.json`, served at `/examples/`. */
export interface WellExample {
  slug: string;
  file: string;
  title: { pt: string; en: string };
  summary: { pt: string; en: string };
  tags: string[];
  well_depth: number;
  well_type: string;
  place: string;
}

interface WellExampleIndex {
  version: number;
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
      examples.value = index.examples;
      failed.value = false;
    } catch {
      failed.value = true;
    }
  }

  function exampleText(text: { pt: string; en: string }): string {
    return locale.value === 'pt' ? text.pt : text.en;
  }

  async function _load(example: WellExample): Promise<boolean> {
    loadingSlug.value = example.slug;
    try {
      const json = await $fetch<string>(`${EXAMPLES_BASE}/${example.file}`, {
        responseType: 'text',
      });
      // An example is not the file the user opened: Save must ask for a name.
      persistence.clearHandle();
      return store.loadWell(json);
    } catch {
      failed.value = true;
      return false;
    } finally {
      loadingSlug.value = null;
    }
  }

  /** Load an example, asking first when the current well has unsaved changes. */
  function openExample(example: WellExample): Promise<boolean> {
    if (!store.isDirty || isWellEmpty(store.well)) return _load(example);
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
    failed,
    loadingSlug,
    fetchExamples,
    openExample,
    exampleText,
  };
}
