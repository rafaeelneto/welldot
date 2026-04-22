import textures from 'textures';

// ── Per-texture config types ──────────────────────────────────────────────────

export type PadTextureConfig = {
  background: string;
  stroke: string;
};

export type ConflictTextureConfig = {
  stroke: string;
};

export type CaveDryTextureConfig = {
  size: number;
  stroke: string;
  background: string;
};

export type CaveWetTextureConfig = {
  size: number;
  stroke: string;
  background: string;
};

export type SealTextureConfig = {
  background: string;
};

export type GravelPackTextureConfig = {
  size: number;
  background: string;
};

export type WellScreenTextureConfig = {
  size: number;
  strokeWidth: number;
  background: string;
};

export type SurfaceCaseTextureConfig = {
  orientation: string[];
  size: number;
  strokeWidth: number;
  shapeRendering: string;
  stroke: string;
  background: string;
};

// ── Aggregate ─────────────────────────────────────────────────────────────────

export type TexturesConfig = {
  pad?: Partial<PadTextureConfig>;
  conflict?: Partial<ConflictTextureConfig>;
  cave_dry?: Partial<CaveDryTextureConfig>;
  cave_wet?: Partial<CaveWetTextureConfig>;
  seal?: Partial<SealTextureConfig>;
  gravel_pack?: Partial<GravelPackTextureConfig>;
  well_screen?: Partial<WellScreenTextureConfig>;
  surface_case?: Partial<SurfaceCaseTextureConfig>;
};

export type WellTextures = {
  pad: ReturnType<typeof textures.lines>;
  conflict: ReturnType<typeof textures.lines>;
  cave_dry: ReturnType<typeof textures.lines>;
  cave_wet: ReturnType<typeof textures.lines>;
  seal: ReturnType<typeof textures.lines>;
  gravel_pack: ReturnType<typeof textures.circles>;
  well_screen: ReturnType<typeof textures.paths>;
  surface_case: ReturnType<typeof textures.lines>;
};

export function createWellTextures(cfg?: TexturesConfig): WellTextures {
  const pad: PadTextureConfig = {
    background: '#ffffff',
    stroke: '#303030',
    ...cfg?.pad,
  };

  const conflict: ConflictTextureConfig = {
    stroke: '#E52117',
    ...cfg?.conflict,
  };

  const cave_dry: CaveDryTextureConfig = {
    size: 8,
    stroke: '#333333',
    background: '#ffffff',
    ...cfg?.cave_dry,
  };

  const cave_wet: CaveWetTextureConfig = {
    size: 8,
    stroke: '#1a6fa8',
    background: '#ffffff',
    ...cfg?.cave_wet,
  };

  const seal: SealTextureConfig = {
    background: '#ffffff',
    ...cfg?.seal,
  };

  const gravel_pack: GravelPackTextureConfig = {
    size: 16,
    background: '#ffffff',
    ...cfg?.gravel_pack,
  };

  const well_screen: WellScreenTextureConfig = {
    size: 40,
    strokeWidth: 2,
    background: '#ffffff',
    ...cfg?.well_screen,
  };

  const surface_case: SurfaceCaseTextureConfig = {
    orientation: ['vertical', 'horizontal'],
    size: 4,
    strokeWidth: 1,
    shapeRendering: 'crispEdges',
    stroke: '#303030',
    background: '#fff',
    ...cfg?.surface_case,
  } as SurfaceCaseTextureConfig;

  return {
    pad: textures
      .lines()
      .heavier(10)
      .thinner(1.5)
      .stroke(pad.stroke)
      .background(pad.background),
    conflict: textures.lines().heavier().stroke(conflict.stroke),
    cave_dry: textures
      .lines()
      .size(cave_dry.size)
      .orientation('6/8')
      .heavier(0.3)
      .thinner(0.8)
      .background(cave_dry.background)
      .stroke(cave_dry.stroke),
    cave_wet: textures
      .lines()
      .size(cave_wet.size)
      .orientation('6/8')
      .heavier(0.3)
      .thinner(0.8)
      .background(cave_wet.background)
      .stroke(cave_wet.stroke),
    seal: textures.lines().thicker().background(seal.background),
    gravel_pack: textures
      .circles()
      .size(gravel_pack.size)
      .complement()
      .background(gravel_pack.background),
    well_screen: textures
      .paths()
      .d(s => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
      .size(well_screen.size)
      .strokeWidth(well_screen.strokeWidth)
      .thicker(2)
      .background(well_screen.background),
    surface_case: (textures.lines() as any)
      .orientation(...surface_case.orientation)
      .size(surface_case.size)
      .strokeWidth(surface_case.strokeWidth)
      .shapeRendering(surface_case.shapeRendering)
      .stroke(surface_case.stroke)
      .background(surface_case.background) as ReturnType<typeof textures.lines>,
  };
}
