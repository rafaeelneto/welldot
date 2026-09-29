/**
 * Common construction materials offered as combo suggestions for free-text
 * `type` fields (screens, reducers, centralizers). There is no canonical
 * material vocabulary in the .well spec, so the translated label itself is
 * stored as the value — it then reads naturally in the canvas, summary and
 * PDF without any key → label mapping.
 */
export const MATERIAL_KEYS = [
  'pvc',
  'geomechanicalPvc',
  'carbonSteel',
  'galvanizedSteel',
  'stainlessSteel',
  'fiberglass',
] as const;

export type MaterialKey = (typeof MATERIAL_KEYS)[number];

export function materialOptions(
  t: (key: string) => string,
  keys: readonly MaterialKey[] = MATERIAL_KEYS,
): Array<{ label: string; value: string }> {
  return keys.map(key => {
    const label = t(`editor.construction.materials.${key}`);
    return { label, value: label };
  });
}
