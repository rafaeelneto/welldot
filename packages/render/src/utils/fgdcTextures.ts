import { TextureCode } from '@welldot/core';

/**
 * Dynamically imports the FGDC texture registry (SVG path data keyed by texture code).
 * Useful for external UIs that need to display texture thumbnails in selection controls.
 */
export async function importFgdcTextures(): Promise<{
  [code: TextureCode]: string;
}> {
  const fgdcTextures = await import('../data/fgdcTextures.json');
  return fgdcTextures.default as { [code: TextureCode]: string };
}
