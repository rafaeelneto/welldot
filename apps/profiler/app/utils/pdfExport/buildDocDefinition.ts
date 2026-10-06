import type { Well } from '@welldot/core';
import logoSvg from '~/assets/icons/logo.svg?raw';
import { buildFooterContent } from './footer';
import { buildHistoryLogSection } from './historyLogTable';
import { buildHydrodynamicEventsSection } from './hydrodynamicEventsTable';
import { buildMetadataTable, packLabelValueRows } from './metadataTable';
import type {
  Content,
  ContentTable,
  TDocumentDefinition,
} from './pdfmake.types';
import { buildPermitSection } from './permitTable';
import { buildPumpInstallationSection } from './pumpInstallationTable';
import { buildSectionTables, withTableTitle } from './sectionTables';
import type { PdfExportOptions, PdfTranslate, RenderedSvg } from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 30;

function infoTable(items: { label: string; value: string }[]): ContentTable {
  return {
    layout: 'noBorders',
    table: {
      widths: ['*', '*', '*', '*'],
      body: packLabelValueRows(items, 4),
    },
  };
}

/**
 * Pure assembly of the full typed `pdfmake` document definition from
 * already-rendered profile/legend SVGs, the well's metadata/section
 * content, and export options. No store or DOM access.
 */
export function buildDocDefinition(
  well: Well,
  svgs: RenderedSvg[],
  legendSvg: RenderedSvg | null,
  options: PdfExportOptions,
  t: PdfTranslate,
): TDocumentDefinition {
  const { breakPages, header, headingInfo, endInfo, metadataPosition } =
    options;

  const content: Content[] = [{ text: ' ' }];

  if (headingInfo.length > 0) {
    content.push(infoTable(headingInfo));
  }

  const beforeMetadataTable =
    metadataPosition === 'before' ? buildMetadataTable(well, options, t) : null;
  if (beforeMetadataTable) {
    content.push(
      withTableTitle(t('editor.general.generalInfo'), beforeMetadataTable),
    );
  }

  svgs.forEach((svg, index) => {
    content.push({
      svg: svg.markup,
      width: svg.width,
      height: svg.height,
      ...(breakPages && index > 0 ? { pageBreak: 'before' } : {}),
    });
  });

  if (legendSvg) {
    content.push({
      svg: legendSvg.markup,
      width: legendSvg.width,
      height: legendSvg.height,
      margin: [0, 8, 0, 0],
    });
  }

  if (endInfo.length > 0) {
    content.push(
      withTableTitle(
        t('editor.exportPdfDialog.finalInfo.title'),
        infoTable(endInfo),
      ),
    );
  }

  const afterMetadataTable =
    metadataPosition === 'after' ? buildMetadataTable(well, options, t) : null;
  if (afterMetadataTable) {
    content.push(
      withTableTitle(t('editor.general.generalInfo'), afterMetadataTable),
    );
  }

  content.push(...buildSectionTables(well, options, t));

  const hydrodynamicSection = buildHydrodynamicEventsSection(well, options, t);
  if (hydrodynamicSection) content.push(hydrodynamicSection);

  const historySection = buildHistoryLogSection(well, options, t);
  if (historySection) content.push(historySection);

  const pumpSection = buildPumpInstallationSection(well, options, t);
  if (pumpSection) content.push(pumpSection);

  const permitSection = buildPermitSection(well, options, t);
  if (permitSection) content.push(permitSection);

  const footerShare = {
    baseUrl: options.baseUrl,
    shareUrl: options.shareUrl,
    shareExpiresAt: options.shareExpiresAt,
    omit: options.omitShareBlock,
  };

  if (!breakPages) {
    content.push(buildFooterContent(false, t, footerShare));
  }

  return {
    content,
    defaultStyle: { font: 'jetBrainsMono', fontSize: 11, color: '#3d3d3d' },
    pageSize: { width: PAGE_WIDTH, height: breakPages ? PAGE_HEIGHT : 'auto' },
    pageMargins: [
      MARGIN,
      MARGIN + (breakPages ? 10 : 0),
      MARGIN,
      MARGIN + (breakPages ? 30 : 0),
    ],
    header: (currentPage, pageCount) => [
      {
        stack: [
          {
            columns: [
              {
                columns: [
                  { svg: logoSvg, width: 22, height: 22 },
                  {
                    stack: [
                      {
                        text: 'Welldot',
                        font: 'spaceGrotesk',
                        bold: true,
                        fontSize: 10,
                        color: '#1a1a2e',
                      },
                      {
                        text: 'welldot.org',
                        font: 'spaceGrotesk',
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
                text: header,
                font: 'ibmPlexSerif',
                alignment: 'center',
                fontSize: 12,
                bold: true,
                decoration: 'underline',
                width: 330,
              },
              {
                text: `${t('editor.exportPdfDialog.content.page')} ${currentPage}/${pageCount}`,
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
    ],
    footer: (_currentPage, _pageCount) =>
      breakPages ? buildFooterContent(true, t, footerShare) : undefined,
    styles: {
      title: {
        bold: true,
        fontSize: 13,
        font: 'ibmPlexSerif',
        color: '#001537',
      },
      columnRight: { alignment: 'right' },
      sumRow: { bold: true, fontSize: 12, font: 'spaceGrotesk' },
      metadataLabel: { fontSize: 8, font: 'spaceGrotesk', color: '#3d3d3d' },
      metadataValue: { fontSize: 10, font: 'spaceGrotesk', color: '#3d3d3d' },
      tableHeader: {
        font: 'spaceGrotesk',
        bold: true,
        fontSize: 9,
        color: '#555555',
      },
    },
  };
}
