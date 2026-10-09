import type { Well } from '@welldot/core';
import { redactWell, serializeWell } from '@welldot/core';

/**
 * Composable for exporting the current profile.
 *
 * Raw serialisation is delegated here so the store stays free of DOM and
 * browser-specific concerns. The store provides `getExportableWell()` which
 * returns the key-free Well ready for serialisation.
 */
export function useProfileExport() {
  const store = useProfileStore();
  const shareVisibilityStore = useShareVisibilityStore();
  const persistence = useFilePersistence();

  /** Serialise the current well to a JSON string, or null if no well is loaded. */
  function getRawJson(): string | null {
    const well = store.getExportableWell();
    if (!well) return null;
    return serializeWell(well);
  }

  /**
   * Serialise the current well to JSON with the shared section-visibility
   * preference applied — used by the Share dialog, never by Save/Save As.
   */
  function getShareableJson(): string | null {
    const well = store.getExportableWell();
    if (!well) return null;
    return serializeWell(redactWell(well, shareVisibilityStore.visibility));
  }

  function _defaultName(well: Well | null): string {
    return `${well?.name ?? 'well'}.well`;
  }

  /**
   * Save to the currently open file handle, or prompt with Save As if no
   * handle exists. Falls back to a blob download on unsupported browsers.
   */
  async function save(): Promise<void> {
    if (import.meta.server) return;
    const json = getRawJson();
    if (!json) return;
    const ok = await persistence.save(
      json,
      _defaultName(store.getExportableWell()),
    );
    if (ok) store.markClean();
  }

  /**
   * Always prompt the user to choose a save location, then store the new
   * handle for future saves. Falls back to download on unsupported browsers.
   */
  async function saveAs(): Promise<void> {
    if (import.meta.server) return;
    const json = getRawJson();
    if (!json) return;
    const ok = await persistence.saveAs(
      json,
      _defaultName(store.getExportableWell()),
    );
    if (ok) store.markClean();
  }

  /**
   * Trigger a `.well` file download in the browser, with the shared
   * section-visibility preference applied.
   * No-ops on the server (SSR guard) and when no well is loaded.
   *
   * @param filename - Override the default `<wellName>.well` filename.
   */
  function download(filename?: string): void {
    if (import.meta.server) return;

    const well = store.getExportableWell();
    if (!well) return;
    const redacted = redactWell(well, shareVisibilityStore.visibility);
    const json = serializeWell(redacted);

    const name = filename ?? _defaultName(redacted);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return { getRawJson, getShareableJson, save, saveAs, download };
}
