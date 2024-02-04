import {
  PROFILE_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
  BORE_HOLE_COMPONENT_TYPE,
  CEMENT_PAD_COMPONENT_TYPE,
  SURFACE_CASE_COMPONENT_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
} from '../types/profile.types';

import { PROFILE_DEFAULT } from './profileDefaults';

export const getProfileLastItemsDepths = (profile: PROFILE_TYPE): number[] => {
  return [
    profile.geologic.length === 0
      ? 0
      : profile.geologic[profile.geologic.length - 1].to,
    profile.constructive.bore_hole.length === 0
      ? 0
      : profile.constructive.bore_hole[
          profile.constructive.bore_hole.length - 1
        ].to,
    profile.constructive.hole_fill.length === 0
      ? 0
      : profile.constructive.hole_fill[
          profile.constructive.hole_fill.length - 1
        ].to,
    profile.constructive.well_case.length === 0
      ? 0
      : profile.constructive.well_case[
          profile.constructive.well_case.length - 1
        ].to,
    profile.constructive.well_screen.length === 0
      ? 0
      : profile.constructive.well_screen[
          profile.constructive.well_screen.length - 1
        ].to,
  ];
};

export const getProfileDiamValues = (
  constructionData: CONSTRUCTIVE_COMPONENT_TYPE,
): number[] => [
  ...constructionData.bore_hole.map(
    (d: BORE_HOLE_COMPONENT_TYPE) =>
      // divide by 1 to convert text to number
      // eslint-disable-next-line implicit-arrow-linebreak
      // @ts-ignore
      parseFloat(d.diam_pol),
    // eslint-disable-next-line function-paren-newline
  ),
  ...constructionData.hole_fill.map((d: HOLE_FILL_COMPONENT_TYPE) =>
    // @ts-ignore
    parseFloat(d.diam_pol),
  ),
  ...constructionData.well_screen.map((d: WELL_SCREEN_COMPONENT_TYPE) =>
    // @ts-ignore
    parseFloat(d.diam_pol),
  ),
  ...constructionData.well_case.map((d: WELL_CASE_COMPONENT_TYPE) =>
    // @ts-ignore
    parseFloat(d.diam_pol),
  ),
];

export const isProfileEmpty = (profile: PROFILE_TYPE): boolean => {
  if (!profile) return true;
  if (!profile.constructive && !profile.geologic) return true;

  const noComponent =
    profile.geologic.length === 0 &&
    profile.constructive.bore_hole.length === 0 &&
    profile.constructive.hole_fill.length === 0 &&
    profile.constructive.well_case.length === 0 &&
    profile.constructive.well_screen.length === 0;

  return noComponent;
};

export const numberFormater = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const numberFormaterInches = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

export const calculateVolume = (diamPol: number, height: number) => {
  return Math.PI * (diamPol / 39.37 / 2) ** 2 * height;
};

export const calculateHoleFillVolume = (
  type: string,
  profile: PROFILE_TYPE,
) => {
  let volume = 0;

  const { well_case: wellCase, well_screen: wellScreen } = profile.constructive;

  const holeFillType = profile.constructive.hole_fill.filter(
    el => el.type === type,
  );

  holeFillType.forEach(el => {
    // CALCULATE THE OUTER VOLUME
    let outerVolume = calculateVolume(el.diam_pol, el.to - el.from);

    // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL CASE SECTION
    for (let i = 0; i < wellCase.length; i++) {
      const wC = wellCase[i];

      if (wC.from > el.to || wC.to < el.from) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line prefer-destructuring
      let { from, to } = el;
      if (wC.from > el.from) from = wC.from;
      if (wC.to < el.to) to = wC.to;

      const wellSectionVolume = calculateVolume(wC.diam_pol, to - from);

      outerVolume -= wellSectionVolume;
    }

    // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL SCREEN SECTION
    for (let i = 0; i < wellScreen.length; i++) {
      const wS = wellScreen[i];

      if (wS.from > el.to || wS.to < el.from) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line prefer-destructuring
      let { from, to } = el;
      if (wS.from > el.from) from = wS.from;
      if (wS.to < el.to) to = wS.to;

      const wellSectionVolume = calculateVolume(wS.diam_pol, to - from);

      outerVolume -= wellSectionVolume;
    }

    // console.log(outerVolume);
    volume += outerVolume;
  });

  return volume;
};

export const convertProfile = (jsonString: string) => {
  let perfilImported = JSON.parse(jsonString);

  let noPerfil = true;
  if (perfilImported.geologic && perfilImported.constructive) {
    if (perfilImported.constructive.bole_hole) {
      perfilImported.constructive = {
        ...perfilImported.constructive,
        bore_hole: [...perfilImported.constructive.bole_hole],
      };

      delete perfilImported.constructive.bole_hole;
    }

    noPerfil = isProfileEmpty(perfilImported);
  }

  if (noPerfil) {
    const perfilConverted = {
      ...PROFILE_DEFAULT,
      constructive: { ...PROFILE_DEFAULT.constructive },
    };
    if (perfilImported.geologico || perfilImported.construtivo) {
      if (perfilImported.geologico.length > 0) {
        perfilConverted.geologic = perfilImported.geologico.map(
          (camada: any) => {
            return {
              from: parseFloat(camada.de),
              to: parseFloat(camada.ate),
              fgdc_texture: camada.fgdc_texture || '',
              color: camada.color || '',
              description: camada.descricao || '',
              geologic_unit: camada.unidade_geologica || '',
            };
          },
        );
      }
      if (perfilImported.construtivo.furo.length > 0) {
        perfilConverted.constructive.bore_hole =
          perfilImported.construtivo.furo.map((camada: any) => {
            return {
              from: parseFloat(camada.de),
              to: parseFloat(camada.ate),
              diam_pol: parseFloat(camada.diam_pol) || 0,
            };
          });
      }
      if (perfilImported.construtivo.espaco_anelar.length > 0) {
        perfilConverted.constructive.hole_fill =
          perfilImported.construtivo.espaco_anelar.map((camada: any) => {
            let tipo = 'gravel_pack';
            if (camada.tipo === 'cimento') {
              tipo = 'seal';
            }
            return {
              from: parseFloat(camada.de),
              to: parseFloat(camada.ate),
              diam_pol: parseFloat(camada.diam_pol) || 0,
              description: camada.descricao || '',
              // eslint-disable-next-line eqeqeq
              type: tipo,
            };
          });
      }
      if (perfilImported.construtivo.filtros.length > 0) {
        perfilConverted.constructive.well_screen =
          perfilImported.construtivo.filtros.map((camada: any) => {
            return {
              from: parseFloat(camada.de),
              to: parseFloat(camada.ate),
              type: camada.tipo || '',
              diam_pol: parseFloat(camada.diam_pol) || 0,
              screen_slot_mm: parseFloat(camada.ranhura_mm) || 0,
            };
          });
      }
      if (perfilImported.construtivo.revestimento.length > 0) {
        perfilConverted.constructive.well_case =
          perfilImported.construtivo.revestimento.map((camada: any) => {
            return {
              from: parseFloat(camada.de),
              to: parseFloat(camada.ate),
              type: camada.tipo || '',
              diam_pol: parseFloat(camada.diam_pol) || 0,
            };
          });
      }
      if (perfilImported.construtivo.tubo_boca.length > 0) {
        perfilConverted.constructive.surface_case =
          perfilImported.construtivo.tubo_boca.map((camada: any) => {
            const depth =
              parseFloat(camada.altura) || parseFloat(camada.depth) || 0;
            return {
              from: camada.from || 0,
              to: camada.to || depth,
              diam_pol: parseFloat(camada.diam_pol) || 0,
            };
          });
      }
      if (perfilImported.construtivo.laje.largura) {
        perfilConverted.constructive.cement_pad = {
          type: perfilImported.construtivo.laje.tipo,
          thickness: parseFloat(perfilImported.construtivo.laje.espessura),
          width: parseFloat(perfilImported.construtivo.laje.largura),
          length: parseFloat(perfilImported.construtivo.laje.comprimento),
        };
      }

      perfilImported = { ...perfilConverted };
    } else {
      throw new Error('Erro ao carregar perfil');
    }
  }

  perfilImported.geologic = perfilImported.geologic.map((layer: any) => {
    return { ...layer, from: parseFloat(layer.from), to: parseFloat(layer.to) };
  });

  perfilImported.constructive.bore_hole =
    perfilImported.constructive.bore_hole.map((item: any) => {
      return {
        ...item,
        from: parseFloat(item.from),
        to: parseFloat(item.to),
        diam_pol: parseFloat(item.diam_pol),
      };
    });

  perfilImported.constructive.well_case =
    perfilImported.constructive.well_case.map((item: any) => {
      return {
        ...item,
        from: parseFloat(item.from),
        to: parseFloat(item.to),
        diam_pol: parseFloat(item.diam_pol),
      };
    });

  perfilImported.constructive.well_screen =
    perfilImported.constructive.well_screen.map((item: any) => {
      return {
        ...item,
        from: parseFloat(item.from),
        to: parseFloat(item.to),
        diam_pol: parseFloat(item.diam_pol),
        screen_slot_mm: parseFloat(item.screen_slot_mm),
      };
    });

  perfilImported.constructive.surface_case =
    perfilImported.constructive.surface_case.map((item: any) => {
      return {
        ...item,
        from: parseFloat(item.from),
        to: parseFloat(item.to),
        diam_pol: parseFloat(item.diam_pol),
      };
    });
  perfilImported.constructive.hole_fill =
    perfilImported.constructive.hole_fill.map((item: any) => {
      return {
        ...item,
        from: parseFloat(item.from),
        to: parseFloat(item.to),
        diam_pol: parseFloat(item.diam_pol),
      };
    });

  if (perfilImported.constructive.reduction) {
    perfilImported.constructive.reduction =
      perfilImported.constructive.reduction.map((item: any) => {
        return {
          ...item,
          from: parseFloat(item.from),
          to: parseFloat(item.to),
          diam_from: parseFloat(item.diam_from),
          diam_to: parseFloat(item.diam_to),
        };
      });
  }

  perfilImported.constructive.intake_depth = parseFloat(
    perfilImported.constructive.intake_depth,
  );

  perfilImported.constructive.cement_pad = {
    ...perfilImported.constructive.cement_pad,
    width: perfilImported.constructive.cement_pad.width,
    thickness: perfilImported.constructive.cement_pad.thickness,
    length: perfilImported.constructive.cement_pad.length,
  };

  // check if cementPad exists
  let cementPad = false;

  if (
    perfilImported.constructive &&
    perfilImported.constructive.cement_pad &&
    perfilImported.constructive.cement_pad.width
  ) {
    cementPad = true;
  }

  return {
    perfilImported,
    cementPad,
  };
};
