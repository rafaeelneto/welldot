import textures from 'textures';

export type WellTextures = {
  pad: ReturnType<typeof textures.lines>;
  conflict: ReturnType<typeof textures.lines>;
  cave_dry: ReturnType<typeof textures.lines>;
  cave_wet: ReturnType<typeof textures.lines>;
  seal: ReturnType<typeof textures.lines>;
  gravel_pack: ReturnType<typeof textures.circles>;
  well_screen: ReturnType<typeof textures.paths>;
};

export function createWellTextures(): WellTextures {
  return {
    pad: textures.lines().heavier(10).thinner(1.5).background('#ffffff'),
    conflict: textures.lines().heavier().stroke('#E52117'),
    cave_dry: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#333333'),
    cave_wet: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#1a6fa8'),
    seal: textures.lines().thicker().background('#ffffff'),
    gravel_pack: textures.circles().complement().background('#ffffff'),
    well_screen: textures
      .paths()
      .d(s => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
      .size(40)
      .strokeWidth(2)
      .thicker(2)
      .background('#fff'),
  };
}
