import { format } from 'date-fns';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { encode as encodeQR } from 'uqr';

import { SvgInfo, infoType } from '../../../src_old/types/profile2Export.types';

import { Profile } from '@/src/types/profile.types';

import { DiameterUnits, LengthUnits, useUIStore } from '@/src/store/ui.store';
import { formatCoord } from '@/src/utils/coords.utils';

import { DeepPartial, RenderConfig, WellRenderer } from '@welldot/render';
import { calculateHoleFillVolume } from '@welldot/utils';
import {
  A4_SVG_HEIGHT,
  PDF_CONTENT_WIDTH,
  PDF_MARGINS,
  buildSvgProfiles,
} from './buildSvgProfiles';

const numberFormater = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// @ts-ignore
// eslint-disable-next-line no-import-assign
pdfMake.vfs = pdfFonts.default;

// @ts-ignore
// eslint-disable-next-line no-import-assign
pdfMake.fonts = {
  jetBrainsMono: {
    normal: 'JetBrainsMono-Regular.ttf',
    bold: 'JetBrainsMono-Bold.ttf',
    italics: 'JetBrainsMono-Italic.ttf',
    bolditalics: 'JetBrainsMono-BoldItalic.ttf',
  },
  spaceGrotesk: {
    normal: 'SpaceGrotesk-Regular.ttf',
    bold: 'SpaceGrotesk-Bold.ttf',
    italics: 'SpaceGrotesk-Regular.ttf',
    bolditalics: 'SpaceGrotesk-Bold.ttf',
  },
  ibmPlexSerif: {
    normal: 'IBMPlexSerif-Regular.ttf',
    bold: 'IBMPlexSerif-Bold.ttf',
    italics: 'IBMPlexSerif-Italic.ttf',
    bolditalics: 'IBMPlexSerif-BoldItalic.ttf',
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

function qrSvg(text: string, sizePt: number): string {
  const { data, size } = encodeQR(text);
  const cell = sizePt / size;
  const rects = data
    .flatMap((row, r) =>
      row.map((dark, c) =>
        dark
          ? `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`
          : '',
      ),
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePt} ${sizePt}"><rect width="${sizePt}" height="${sizePt}" fill="white"/><g fill="#222">${rects}</g></svg>`;
}

function base64ToBlob(base64String, contentType = '') {
  // Remove data URL prefix if it exists
  const base64Data = base64String.replace(/^data:([^;]+);base64,/, '');

  // Convert base64 to raw binary data
  const binaryData = atob(base64Data);

  // Create array buffer from binary data
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  // Fill array buffer with binary data
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }

  // Create blob from array buffer
  const blob = new Blob([arrayBuffer], { type: contentType });

  // Create and return blob URL
  return URL.createObjectURL(blob);
}

const buildMetaItems = (data: { label: string; value: any }[]) =>
  data.map(item => [
    {
      width: '*',
      text: [
        { text: `${item.label} \n`, style: 'metadataLabel' },
        { text: item.value ?? '-', style: 'metadataValue' },
      ],
    },
  ]);

const buildMetadataRows = (
  arr: { label: string; value: any }[],
  maxColumns: number,
) => {
  const rows = buildMetaItems(arr).reduce((rows, item, i) => {
    if (i % maxColumns === 0) {
      rows.push([item]);
    } else {
      rows[rows.length - 1].push(item);
    }
    return rows;
  }, [] as any[][]);
  rows.forEach(row => {
    while (row.length < maxColumns) {
      row.push({ width: '*', text: '' });
    }
  });
  return rows;
};

export const exportPdfProfile = async (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  breakPages: boolean,
  zoomLevel: number,
  header = 'Perfil Geológico-Construtivo',
  lengthUnits: LengthUnits = 'm',
  diameterUnits: DiameterUnits = 'mm',
  metadataPosition: 'before' | 'after' | null = null,
  renderConfig?: DeepPartial<RenderConfig>,
) => {
  const { coord_format: coordFormat } = useUIStore.getState();
  const fmtLen = (m: number) =>
    lengthUnits === 'ft'
      ? numberFormater.format(m * 3.28084)
      : numberFormater.format(m);
  const fmtCoordField = (
    key: keyof typeof profile | string,
    val: unknown,
  ): string => {
    if (key === 'lat' && typeof val === 'number')
      return formatCoord(val, coordFormat, true);
    if (key === 'lng' && typeof val === 'number')
      return formatCoord(val, coordFormat, false);
    return String(val ?? '');
  };
  const fmtDiam = (mm: number) =>
    diameterUnits === 'inches'
      ? numberFormater.format(mm * 0.0393701)
      : numberFormater.format(mm);
  const lenUnit = lengthUnits === 'ft' ? 'ft' : 'm';
  const diamUnit = diameterUnits === 'inches' ? '"' : 'mm';

  const titleFont = 'ibmPlexSerif';
  const dataFont = 'jetBrainsMono';
  const uiFont = 'spaceGrotesk';

  const buildProfileMetadataTable = (profile: Profile) => {
    const metaFields: {
      key: keyof Profile | string;
      label: string;
      getter?: (profile: Profile) => string;
    }[] = [
      { key: 'name', label: 'Nome' },
      { key: 'well_type', label: 'Tipo' },
      { key: 'well_driller', label: 'Perfurador' },
      {
        key: 'construction_date',
        label: 'Data de Construção',
        getter: profile =>
          profile.construction_date
            ? format(new Date(profile.construction_date), 'dd/MM/yyyy')
            : '',
      },
      {
        key: 'coordinates',
        label: 'Coordenadas',
        getter: profile => {
          const lat = profile.lat;
          const lng = profile.lng;
          if (lat !== undefined && lng !== undefined) {
            return `${fmtCoordField('lat', lat)}, ${fmtCoordField('lng', lng)}`;
          }
          return '';
        },
      },
      {
        key: 'elevation',
        label: 'Elevação',
        getter: profile =>
          profile.elevation !== undefined
            ? `${fmtLen(profile.elevation)} ${lenUnit}`
            : '',
      },
      { key: 'obs', label: 'Observações' },
    ];
    const populated = metaFields.filter(f => {
      const val = f.getter ? f.getter(profile) : profile[f.key];
      return val !== undefined && val !== null && val !== '';
    });
    if (populated.length > 0) {
      const metaBody: { label: string; value: string }[] = [];
      for (let i = 0; i < populated.length; i += 2) {
        const f1 = populated[i];
        const f2 = populated[i + 1];
        const v1 = f1.getter ? f1.getter(profile) : profile[f1.key];
        if (!f2) {
          metaBody.push({ label: f1.label, value: v1 });
        } else {
          const v2 = f2.getter ? f2.getter(profile) : profile[f2.key];
          metaBody.push({ label: f1.label, value: v1 });
          metaBody.push({ label: f2.label, value: v2 });
        }
      }
      return {
        layout: 'noBorders',
        table: {
          widths: ['*', '*', '*'],
          dontBreakRows: false,
          body: [...buildMetadataRows(metaBody, 3)],
        },
      };
    }
  };

  const docDefinition: any = {
    defaultStyle: {
      font: dataFont,
      fontSize: 11,
      color: '#3d3d3d',
    },
    pageSize: {
      width: 595.28,
      height: breakPages ? 841.89 : 'auto',
    },
    pageMargins: [MARGIN, MARGIN + 10, MARGIN, MARGIN + 30],
    header: (currentPage: any, _pageCount: any, pageSize: any) => {
      // you can apply any logic and return any valid pdfmake element
      return [
        {
          stack: [
            {
              columns: [
                {
                  columns: [
                    {
                      image:
                        'data:image/png;base64,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',
                      width: 22,
                      height: 22,
                    },
                    {
                      stack: [
                        {
                          text: 'Well Profiler',
                          font: 'spaceGrotesk',
                          bold: true,
                          fontSize: 10,
                          color: '#1a1a2e',
                        },
                        {
                          text: 'wellprofiler.com',
                          font: 'spaceGrotesk',
                          bold: false,
                          fontSize: 8,
                          color: '#888888',
                        },
                      ],
                      margin: [4, 0, 0, 0],
                    },
                  ],
                  width: '*',
                },
                {
                  text: `${header}`,
                  font: titleFont,
                  alignment: 'center',
                  fontSize: 12,
                  bold: true,
                  decoration: 'underline',
                  width: 330,
                },
                {
                  text: `Pág. ${currentPage}/${_pageCount}`,
                  alignment: 'right',
                  fontSize: 8,
                  width: '*',
                },
              ],
            },
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 535,
                  y2: 0,
                  lineWidth: 0.5,
                  lineColor: '#cccccc',
                },
              ],
              margin: [0, 3, 0, 0],
            },
          ],
          margin: [30, 14, 30, 0],
        },
      ];
    },
    footer: (_currentPage: any, _pageCount: any) => {
      return {
        stack: [
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 535,
                y2: 0,
                lineWidth: 0.5,
                lineColor: '#cccccc',
              },
            ],
            margin: [0, 0, 0, 5],
          },
          {
            columns: [
              {
                text: `.well v1`,
                font: 'jetBrainsMono',
                fontSize: 7,
                color: '#404040',
                width: 84,
                alignment: 'left',
              },
              {
                text: 'wellprofiler.com',
                font: 'spaceGrotesk',
                fontSize: 7,
                color: '#494949',
                alignment: 'center',
                width: '*',
              },
              {
                columns: [
                  {
                    text: 'veja esse\nperfil online',
                    font: 'spaceGrotesk',
                    fontSize: 7,
                    color: '#494949',
                    alignment: 'right',
                    width: 46,
                  },
                  {
                    svg: qrSvg('https://wellprofiler.com', 34),
                    width: 34,
                    height: 34,
                  },
                ],
                columnGap: 4,
                width: 84,
              },
            ],
          },
        ],
        margin: [30, 10, 30, 10],
      };
    },
    styles: {
      title: {
        bold: true,
        fontSize: 13,
        font: titleFont,
        color: '#001537',
      },
      column_right: {
        alignment: 'right',
      },
      sum_row: {
        bold: true,
        fontSize: 12,
        font: uiFont,
      },
      metadataLabel: {
        fontSize: 8,
        font: uiFont,
        color: '#3d3d3d',
      },
      metadataValue: {
        fontSize: 10,
        font: uiFont,
        color: '#3d3d3d',
      },
      tableHeader: {
        font: uiFont,
        bold: true,
        fontSize: 9,
        color: '#555555',
      },
    },
  };

  const content: any[] = [];

  content.push({ text: ' ' });

  if (headingInfo.length > 0) {
    const maxColumns = 4;

    content.push({
      layout: 'noBorders',
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          ...buildMetadataRows(
            headingInfo.map((item, i) => ({
              label: item.label,
              value: item.value,
            })),
            maxColumns,
          ),
        ],
      },
    });
  }

  if (metadataPosition === 'before') {
    content.push({ text: 'Dados do Poço', style: 'title' });
    content.push(buildProfileMetadataTable(profile));
  }

  const PT_TO_PX = 1.33;
  // Single-line text (spacer, title): ~15pt. Two-line cell (metadataLabel 8pt + metadataValue 10pt + padding): ~26pt.
  const SINGLE_ROW_H = 15 * PT_TO_PX;
  const CELL_ROW_H = 26 * PT_TO_PX;

  let firstPageUsedHeight = SINGLE_ROW_H; // { text: ' ' } spacer before SVG
  if (headingInfo.length > 0) {
    firstPageUsedHeight += Math.ceil(headingInfo.length / 4) * CELL_ROW_H;
  }
  if (metadataPosition === 'before') {
    firstPageUsedHeight += SINGLE_ROW_H; // 'Dados do Poço' title
    firstPageUsedHeight += 3 * CELL_ROW_H; // metadata table (max 3 rows × 3 cols)
  }
  const firstPageAvailableHeight = A4_SVG_HEIGHT - firstPageUsedHeight;

  const svgs: SvgInfo[] = buildSvgProfiles({
    profile,
    breakPages: breakPages,
    zoomLevel,
    firstPageAvailableHeight,
  });

  const renderer = new WellRenderer(
    svgs.map(svgInfo => ({
      selector: `#${svgInfo.id}`,
      height: svgInfo.height - PDF_MARGINS.top - PDF_MARGINS.bottom,
      width: PDF_CONTENT_WIDTH,
      margins: {
        top: PDF_MARGINS.top,
        right: PDF_MARGINS.right,
        bottom: PDF_MARGINS.bottom,
        left: PDF_MARGINS.left + 10,
      },
    })),
    {
      renderConfig: {
        ...renderConfig,
        zoom: false,
        pan: false,
        animation: { duration: 0 },
        constructionLabels: {
          ...renderConfig?.constructionLabels,
        },
        labels: {
          ...renderConfig?.labels,
        },
        legend: {
          height: 30,
          ...renderConfig?.legend,
          maxWidth: 595.28 - MARGIN * 2,
        },
      },
      theme: {
        labels: {
          headerFont: 'jetBrainsMono',
          bodyFont: 'jetBrainsMono',
          scaleFont: 'jetBrainsMono',
        },
        constructionLabels: {
          fontFamily: 'spaceGrotesk',
        },
      },
      units: { length: lengthUnits, diameter: diameterUnits },
    },
  );

  const legendId = 'svgLegendCanvas';
  const svgDraftContainer = document.getElementById('svgDraftContainer');
  document.getElementById(legendId)?.remove();
  const legendSvgEl = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  legendSvgEl.id = legendId;
  (svgDraftContainer ?? document.body).appendChild(legendSvgEl);

  renderer.prepareSvg();
  renderer.draw(profile);
  renderer.renderLegend(`#${legendId}`, profile);

  await new Promise(resolve => requestAnimationFrame(resolve));

  svgs.forEach((svgInfo, index) => {
    const svg = document.getElementById(svgInfo.id);
    if (!svg?.getAttribute('height') || !svg?.getAttribute('width')) {
      return;
    }

    const svgHeight = parseFloat(svg.getAttribute('height') || '0');
    const svgWidth = parseFloat(svg.getAttribute('width') || '0');

    content.push({
      svg: svg.outerHTML,
      width: svgWidth,
      height: svgHeight,
      ...(breakPages && index > 0 ? { pageBreak: 'before' } : {}),
    });
  });

  const legendSvg = document.getElementById(legendId);
  if (legendSvg) {
    const lw = parseFloat(legendSvg.getAttribute('width') || '0');
    const lh = parseFloat(legendSvg.getAttribute('height') || '0');
    if (lw > 0 && lh > 0) {
      const pdfWidth = 595.28 - MARGIN * 2;
      content.push({
        svg: legendSvg.outerHTML,
        width: pdfWidth,
        height: lh * (pdfWidth / lw),
        margin: [0, 8, 0, 0],
      });
    }
    legendSvg.remove();
  }

  if (endInfo.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Informações Finais', style: 'title' });

    const maxColumns = 4;

    content.push({
      layout: 'noBorders',
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          ...buildMetadataRows(
            endInfo.map((item, i) => ({
              label: item.label,
              value: item.value,
            })),
            maxColumns,
          ),
        ],
      },
    });
  }

  if (metadataPosition === 'after') {
    content.push({ text: ' ' });
    content.push({ text: 'Dados do Poço', style: 'title' });
    content.push(buildProfileMetadataTable(profile));
  }

  if (profile.cement_pad.thickness && profile.cement_pad.width) {
    content.push({ text: ' ' });
    content.push({ text: 'Laje de proteção', style: 'title' });

    const cementPadBody: any[][] = [
      [
        { text: `Espessura (${lenUnit})`, style: 'tableHeader' },
        fmtLen(profile.cement_pad.thickness),
      ],
      [
        { text: `Largura (${lenUnit})`, style: 'tableHeader' },
        fmtLen(profile.cement_pad.width),
      ],
      [
        { text: `Comprimento (${lenUnit})`, style: 'tableHeader' },
        fmtLen(profile.cement_pad.length),
      ],
      [{ text: `Material`, style: 'tableHeader' }, profile.cement_pad.type],
    ];

    content.push({
      layout: {
        hLineWidth: (i: any, node: any) => {
          if (i === node.table.body.length || i === 0) return 1;
          return 0;
        },
        vLineWidth: () => 0,
        hLineColor: () => '#3d3d3d',
      },
      table: {
        heights: 15,
        widths: [267.64 - 10, 267.64 - 10],
        dontBreakRows: true,
        body: [...cementPadBody],
      },
    });
  }

  if (profile.bore_hole.length > 0) {
    content.push({ text: ' ' });
    content.push({ text: 'Furo', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: `Diâmetro (${diamUnit})`, style: 'tableHeader' },
        { text: `De (${lenUnit})`, style: ['tableHeader', 'column_right'] },
        { text: `Até (${lenUnit})`, style: ['tableHeader', 'column_right'] },
      ],
    ];

    for (let i = 0; i < profile.bore_hole.length; i++) {
      const item = profile.bore_hole[i];

      endingInfoBody.push([
        { text: `${fmtDiam(item.diameter)} ${diamUnit}` },
        { text: fmtLen(item.from), style: 'column_right' },
        { text: fmtLen(item.to), style: 'column_right' },
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
        { text: `Diâmetro (${diamUnit})`, style: 'tableHeader' },
        { text: `De (${lenUnit})`, style: ['tableHeader', 'column_right'] },
        { text: `Até (${lenUnit})`, style: ['tableHeader', 'column_right'] },
      ],
    ];

    for (let i = 0; i < profile.surface_case.length; i++) {
      const item = profile.surface_case[i];

      endingInfoBody.push([
        { text: `${fmtDiam(item.diameter)} ${diamUnit}` },
        { text: fmtLen(item.from), style: 'column_right' },
        { text: fmtLen(item.to), style: 'column_right' },
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
    content.push({ text: 'Espaço Anular', style: 'title' });

    const endingInfoBody: any[][] = [
      [
        { text: 'Descrição', style: 'tableHeader' },
        {
          text: `Diâmetro (${diamUnit})`,
          style: ['tableHeader', 'column_right'],
        },
        { text: `De (${lenUnit})`, style: ['tableHeader', 'column_right'] },
        { text: `Até (${lenUnit})`, style: ['tableHeader', 'column_right'] },
      ],
    ];

    for (let i = 0; i < profile.hole_fill.length; i++) {
      const item = profile.hole_fill[i];

      endingInfoBody.push([
        `${item.description ? item.description : item.type}`,
        {
          text: `${fmtDiam(item.diameter)} ${diamUnit}`,
          style: 'column_right',
        },
        { text: fmtLen(item.from), style: 'column_right' },
        { text: fmtLen(item.to), style: 'column_right' },
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
            text: (() => {
              const volM3 = calculateHoleFillVolume(item.type, profile);
              return lengthUnits === 'ft'
                ? `${numberFormater.format(parseFloat((volM3 * 35.3147).toFixed(3)))} ft³`
                : `${numberFormater.format(volM3)} m³`;
            })(),
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
        { text: 'Tipo', style: 'tableHeader' },
        {
          text: `Diâmetro (${diamUnit})`,
          style: ['tableHeader', 'column_right'],
        },
        { text: `De (${lenUnit})`, style: ['tableHeader', 'column_right'] },
        { text: `Até (${lenUnit})`, style: ['tableHeader', 'column_right'] },
      ],
    ];

    for (let i = 0; i < profile.well_case.length; i++) {
      const item = profile.well_case[i];

      endingInfoBody.push([
        `${item.type}`,
        {
          text: `${fmtDiam(item.diameter)} ${diamUnit}`,
          style: 'column_right',
        },
        { text: fmtLen(item.from), style: 'column_right' },
        { text: fmtLen(item.to), style: 'column_right' },
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
            text: `${fmtLen(totalHeight)} ${lenUnit}`,
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
        { text: 'Tipo', style: 'tableHeader' },
        {
          text: `Diâmetro (${diamUnit})`,
          style: ['tableHeader', 'column_right'],
        },
        {
          text: `Ranhura (${diamUnit})`,
          style: ['tableHeader', 'column_right'],
        },
        { text: `De (${lenUnit})`, style: ['tableHeader', 'column_right'] },
        { text: `Até (${lenUnit})`, style: ['tableHeader', 'column_right'] },
      ],
    ];

    for (let i = 0; i < profile.well_screen.length; i++) {
      const item = profile.well_screen[i];

      endingInfoBody.push([
        `${item.type}`,
        {
          text: `${fmtDiam(item.diameter)} ${diamUnit}`,
          style: 'column_right',
        },
        {
          text: fmtDiam(item.screen_slot_mm),
          style: 'column_right',
        },
        { text: fmtLen(item.from), style: 'column_right' },
        { text: fmtLen(item.to), style: 'column_right' },
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
            text: `${fmtLen(totalHeight)} ${lenUnit}`,
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

export const innerRenderPdf = async (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  breakPages: boolean,
  zoomLevel: number,
  iframeId: string,
  header = 'Perfil Geológico-Construtivo',
  lengthUnits: LengthUnits = 'm',
  diameterUnits: DiameterUnits = 'mm',
  metadataPosition: 'before' | 'after' | null = null,
  renderConfig?: DeepPartial<RenderConfig>,
) => {
  const docDefinition = await exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    breakPages,
    zoomLevel,
    header,
    lengthUnits,
    diameterUnits,
    metadataPosition,
    renderConfig,
  );
  // @ts-ignore
  try {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    console.log('Generating PDF...', pdfDocGenerator);
    const pdfDataUrl = await pdfDocGenerator.getDataUrl();
    const blobUrl = base64ToBlob(pdfDataUrl, 'application/pdf');
    console.log('PDF generated, setting iframe src...', blobUrl);
    if (iframeId) {
      const iframe = document.getElementById(iframeId);
      // @ts-ignore
      iframe.src = blobUrl;
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

export const printPdf = async (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  breakPages: boolean,
  zoomLevel: number,
  header = 'Perfil Geológico-Construtivo',
  lengthUnits: LengthUnits = 'm',
  diameterUnits: DiameterUnits = 'mm',
  metadataPosition: 'before' | 'after' | null = null,
  renderConfig?: DeepPartial<RenderConfig>,
) => {
  const docDefinition = await exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    breakPages,
    zoomLevel,
    header,
    lengthUnits,
    diameterUnits,
    metadataPosition,
    renderConfig,
  );
  // @ts-ignore
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.print();
};

export const downloadPdf = async (
  profile: Profile,
  headingInfo: infoType[],
  endInfo: infoType[],
  breakPages: boolean,
  zoomLevel: number,
  header = 'Perfil Geológico-Construtivo',
  lengthUnits: LengthUnits = 'm',
  diameterUnits: DiameterUnits = 'mm',
  metadataPosition: 'before' | 'after' | null = null,
  renderConfig?: DeepPartial<RenderConfig>,
) => {
  const docDefinition = await exportPdfProfile(
    profile,
    headingInfo,
    endInfo,
    breakPages,
    zoomLevel,
    header,
    lengthUnits,
    diameterUnits,
    metadataPosition,
    renderConfig,
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
