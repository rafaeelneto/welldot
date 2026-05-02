import { TextureCode } from '@welldot/core';

export async function importFgdcTextures(): Promise<{
  [code: TextureCode]: string;
}> {
  const fgdcTextures = await import('../data/fgdcTextures.json');
  return fgdcTextures.default as { [code: TextureCode]: string };
}
