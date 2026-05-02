export type TextureCode = number | string;
export type Texture = {
  code: TextureCode;
  label: string;
  /** Texture image not yet implemented; omit or false means available. Transitional flag — remove once all textures are complete. */
  pending?: true;
};
