import { serializeWell } from '@welldot/core';

/**
 * Composable for exporting the current profile.
 *
 * Raw serialisation is delegated here so the store stays free of DOM and
 * browser-specific concerns. The store provides `getExportableWell()` which
 * returns the key-free Well ready for serialisation.
 */
export function useProfileExport() {
  const store = useProfileStore();

  /** Serialise the current well to a JSON string, or null if no well is loaded. */
  function getRawJson(): string | null {
    const well = store.getExportableWell();
    if (!well) return null;
    return serializeWell(well);
  }

  /**
   * Trigger a `.well` file download in the browser.
   * No-ops on the server (SSR guard) and when no well is loaded.
   *
   * @param filename - Override the default `<wellName>.well` filename.
   */
  function download(filename?: string): void {
    if (import.meta.server) return;

    const json = getRawJson();
    if (!json) return;

    const well = store.getExportableWell()!;
    const name = filename ?? `${well.name ?? 'well'}.well`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return { getRawJson, download };
}
