import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { format } from 'date-fns';

import { SvgInfo, infoType } from '../../../src_old/types/profile2Export.types';

// import '../../register-files';
import { Profile } from '@/src/types/profile.types';

import {
  calculateHoleFillVolume,
  numberFormater,
} from '../../utils/profile.utils';

// @ts-ignore
// eslint-disable-next-line no-import-assign
// pdfMake.vfs = pdfFonts.pdfMake.vfs;

// @ts-ignore
// eslint-disable-next-line no-import-assign
pdfMake.fonts = {
  openSans: {
    normal: 'OpenSans-Regular.ttf',
    bold: 'OpenSans-Semibold.ttf',
    italics: 'OpenSans-Italic.ttf',
    bolditalics: 'OpenSans-SemiboldItalic.ttf',
  },
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Bold.ttf',
  },
  poppins: {
    normal: 'Poppins-Regular.ttf',
    bold: 'Poppins-SemiBold.ttf',
  },
};

// @ts-ignore
// eslint-disable-next-line no-import-assign
pdfMake.tableLayouts = {
  infoLayout: {
    hLineWidth: (i: any, node: any) => {
      if (i === node.table.body.length || i === 0) return 1;
      return 0;
    },
    vLineWidth: (i: any) => {
      return 0;
    },
    hLineColor: (i: any, node: any) => {
      return '#3d3d3d';
    },
  },
};

const MARGIN = 30;

export const exportPdfProfile = (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  svgs: SvgInfo[],
  breakPages: boolean,
  header = 'Perfil Geológico-Construtivo',
) => {
  const docDefinition: any = {
    defaultStyle: {
      font: 'openSans',
      fontSize: 11,
      color: '#3d3d3d',
    },
    pageSize: {
      width: 595.28,
      height: breakPages ? 841.89 : 'auto',
    },
    pageMargins: [MARGIN, MARGIN + 10, MARGIN, MARGIN],
    header: (currentPage: any, _pageCount: any, pageSize: any) => {
      // you can apply any logic and return any valid pdfmake element
      return [
        {
          columns: [
            {
              columns: [{ image: 'logo_horizontal_pdf.png', width: 100 }],
              width: '*',
            },
            {
              text: `${header}`,
              font: 'poppins',
              alignment: 'center',
              fontSize: 13,
              bold: true,
              decoration: 'underline',
              width: 330,
            },
            {
              text: `Pág. ${currentPage}/${_pageCount}`,
              alignment: 'right',
              width: '*',
            },
          ],
          margin: [30, 20, 30, 0],
        },
      ];
    },
    styles: {
      title: {
        bold: true,
        fontSize: 14,
        font: 'poppins',
        color: '#001537',
      },
      column_right: {
        alignment: 'right',
      },
      sum_row: {
        bold: true,
        fontSize: 12,
      },
    },
  };

  const content: any[] = [];

  content.push({ text: ' ' });

  if (headingInfo.length > 0) {
    const headingInfoBody: string[][] = [];

    for (let i = 0; i < headingInfo.length; i += 2) {
      const info1 = headingInfo[i];

      if (i + 1 >= headingInfo.length) {
        headingInfoBody.push([`${info1.label}: ${info1.value}`, ``]);
        break;
      }

      const info2 = headingInfo[i + 1];
      headingInfoBody.push([
        `${info1.label}: ${info1.value}`,
        `${info2.label}: ${info2.value}`,
      ]);
    }

    content.push({
      layout: {
        hLineWidth: (i: any, node: any) => {
          if (i === node.table.body.length || i === 0) return 1;
          return 0;
        },
        vLineWidth: (i: any) => {
          return 0;
        },
        hLineColor: (i: any, node: any) => {
          return '#3d3d3d';
        },
      },
      table: {
        heights: 15,
        widths: [267.64 - 10, 267.64 - 10],

        body: [...headingInfoBody],
      },
    });
  }

  svgs.forEach((svgInfo, key) => {
    const svg = document.getElementById(svgInfo.id);
    if (!svg!.getAttribute('height') || !svg!.getAttribute('width')) {
      return;
    }
    const svgHeight = parseFloat(svg!.getAttribute('height') || '0');
    const svgWidth = parseFloat(svg!.getAttribute('width') || '0');

    content.push({
      svg: svg?.outerHTML,
      width: svgWidth * 0.75,
      height: svgHeight,
    });
  });

  if (endInfo.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Informações Finais', style: 'title' });

    const endingInfoBody: string[][] = [];

    for (let i = 0; i < endInfo.length; i += 2) {
      const info1 = endInfo[i];

      if (i + 1 >= endInfo.length) {
        endingInfoBody.push([`${info1.label}: ${info1.value}`, ``]);
        break;
      }

      const info2 = endInfo[i + 1];
      endingInfoBody.push([
        `${info1.label}: ${info1.value}`,
        `${info2.label}: ${info2.value}`,
      ]);
    }

    content.push({
      layout: {
        hLineWidth: (i: any, node: any) => {
          if (i === node.table.body.length || i === 0) return 1;
          return 0;
        },
        vLineWidth: (i: any) => {
          return 0;
        },
        hLineColor: (i: any, node: any) => {
          return '#3d3d3d';
        },
      },
      table: {
        heights: 15,
        widths: [267.64 - 10, 267.64 - 10],
        dontBreakRows: true,
        body: [...endingInfoBody],
      },
    });
  }

  if (profile.bore_hole.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Furo', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Diâmetro' },
        { text: 'De (m)', style: 'column_right' },
        { text: 'Até (m)', style: 'column_right' },
      ],
    ];

    for (let i = 0; i < profile.bore_hole.length; i++) {
      const item = profile.bore_hole[i];

      endingInfoBody.push([
        { text: `${numberFormater.format(item.diameter)} mm` },
        { text: `${numberFormater.format(item.from)}`, style: 'column_right' },
        { text: `${numberFormater.format(item.to)}`, style: 'column_right' },
      ]);
    }

    content.push({
      layout: 'lightHorizontalLines',
      table: {
        heights: 15,
        widths: ['auto', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: true,
        body: [...endingInfoBody],
      },
    });
  }

  if (profile.surface_case.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Tubo de Boca', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Diâmetro' },
        { text: 'De (m)', style: 'column_right' },
        { text: 'Até (m)', style: 'column_right' },
      ],
    ];

    for (let i = 0; i < profile.surface_case.length; i++) {
      const item = profile.surface_case[i];

      endingInfoBody.push([
        { text: `${numberFormater.format(item.diameter)} mm` },
        { text: `${numberFormater.format(item.from)}`, style: 'column_right' },
        { text: `${numberFormater.format(item.to)}`, style: 'column_right' },
      ]);
    }

    content.push({
      layout: 'lightHorizontalLines',
      table: {
        heights: 15,
        widths: ['*', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: true,
        body: [...endingInfoBody],
      },
    });
  }

  if (profile.hole_fill.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Espaço Anelar', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Descrição' },
        { text: 'Diâmetro', style: 'column_right' },
        { text: 'De (m)', style: 'column_right' },
        { text: 'Até (m)', style: 'column_right' },
      ],
    ];

    for (let i = 0; i < profile.hole_fill.length; i++) {
      const item = profile.hole_fill[i];

      endingInfoBody.push([
        `${item.description ? item.description : item.type}`,
        {
          text: `${numberFormater.format(item.diameter)} mm`,
          style: 'column_right',
        },
        { text: `${numberFormater.format(item.from)}`, style: 'column_right' },
        { text: `${numberFormater.format(item.to)}`, style: 'column_right' },
      ]);

      if (
        item.type !== profile.hole_fill[i + 1]?.type ||
        i === profile.hole_fill.length - 1
      ) {
        endingInfoBody.push([
          { text: `Volume total`, style: 'sum_row', colSpan: 3 },
          {},
          {},
          {
            text: `${numberFormater.format(
              calculateHoleFillVolume(item.type, profile),
            )} m³`,
            style: 'sum_row',
            align: 'right',
          },
        ]);
      }
    }

    content.push({
      layout: 'lightHorizontalLines',
      table: {
        heights: 15,
        widths: ['*', 'auto', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: true,
        body: [...endingInfoBody],
      },
    });
  }

  if (profile.well_case.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Revestimento', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Tipo' },
        { text: 'Diâmetro', style: 'column_right' },
        { text: 'De (m)', style: 'column_right' },
        { text: 'Até (m)', style: 'column_right' },
      ],
    ];

    for (let i = 0; i < profile.well_case.length; i++) {
      const item = profile.well_case[i];

      endingInfoBody.push([
        `${item.type}`,
        {
          text: `${numberFormater.format(item.diameter)} mm`,
          style: 'column_right',
        },
        { text: `${numberFormater.format(item.from)}`, style: 'column_right' },
        { text: `${numberFormater.format(item.to)}`, style: 'column_right' },
      ]);

      if (
        item.type !== profile.well_case[i + 1]?.type ||
        item.diameter !== profile.well_case[i + 1]?.diameter
      ) {
        let totalHeight = 0;
        const filteredWC = profile.well_case.filter(
          el => el.type === item.type && el.diameter === item.diameter,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        endingInfoBody.push([
          { text: `Total`, style: 'sum_row', colSpan: 3 },
          {},
          {},
          {
            text: `${numberFormater.format(totalHeight)} m`,
            style: 'sum_row',
            align: 'right',
          },
        ]);
      }
    }

    content.push({
      layout: 'lightHorizontalLines',
      table: {
        heights: 15,
        widths: ['*', 'auto', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: true,
        body: [...endingInfoBody],
      },
    });
  }

  if (profile.well_screen.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Filtros', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Tipo' },
        { text: 'Diâmetro', style: 'column_right' },
        { text: 'Ranhura (mm)', style: 'column_right' },
        { text: 'De (m)', style: 'column_right' },
        { text: 'Até (m)', style: 'column_right' },
      ],
    ];

    for (let i = 0; i < profile.well_screen.length; i++) {
      const item = profile.well_screen[i];

      endingInfoBody.push([
        `${item.type}`,
        {
          text: `${numberFormater.format(item.diameter)} mm`,
          style: 'column_right',
        },
        {
          text: `${numberFormater.format(item.screen_slot_mm)}`,
          style: 'column_right',
        },
        { text: `${numberFormater.format(item.from)}`, style: 'column_right' },
        { text: `${numberFormater.format(item.to)}`, style: 'column_right' },
      ]);

      if (
        item.type !== profile.well_screen[i + 1]?.type ||
        item.diameter !== profile.well_screen[i + 1]?.diameter
      ) {
        let totalHeight = 0;
        const filteredWC = profile.well_screen.filter(
          el => el.type === item.type && el.diameter === item.diameter,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        endingInfoBody.push([
          { text: `Total`, style: 'sum_row', colSpan: 4 },
          {},
          {},
          {},
          {
            text: `${numberFormater.format(totalHeight)} m`,
            style: 'sum_row',
            align: 'right',
          },
        ]);
      }
    }

    content.push({
      layout: 'lightHorizontalLines',
      table: {
        heights: 15,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],

        body: [...endingInfoBody],
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: true,
      },
    });
  }

  docDefinition.content = content;
  // @ts-ignore
  return docDefinition;
};

export const innerRenderPdf = (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  svgs: SvgInfo[],
  breakPages: boolean,
  iframeId: string,
  header = 'Perfil Geológico-Construtivo',
) => {
  const docDefinition = exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    svgs,
    breakPages,
    header,
  );
  // @ts-ignore
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.getDataUrl(dataUrl => {
    if (iframeId) {
      const iframe = document.getElementById(iframeId);
      // @ts-ignore
      iframe.src = dataUrl;
    }
  });
};

export const printPdf = (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  svgs: SvgInfo[],
  breakPages: boolean,
  header = 'Perfil Geológico-Construtivo',
) => {
  const docDefinition = exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    svgs,
    breakPages,
    header,
  );
  // @ts-ignore
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.print();
};

export const downloadPdf = (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  svgs: SvgInfo[],
  breakPages: boolean,
  header = 'Perfil Geológico-Construtivo',
) => {
  const docDefinition = exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    svgs,
    breakPages,
    header,
  );
  // @ts-ignore
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(
    `perfil_${(profile.name || '').replace(/ /g, '_').toLowerCase()}_${format(
      new Date(),
      'dd_MM_yyyy__hh_mm',
    )}.pdf`,
  );
};

export default exportPdfProfile;
