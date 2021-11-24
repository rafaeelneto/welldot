import PDFDocument from 'pdfkit';
import download from 'downloadjs';
import { format } from 'date-fns';
import BlobStream from 'blob-stream';

import PdfTable from 'voilab-pdf-table';
// import FitCollumnPlugin from 'voilab-pdf-table/plugins/fitcolumn';

import SVGtoPDF from 'svg-to-pdfkit';
// import PDFDocument from '../../utils/pdfKitTable';

import { SvgInfo, infoType } from '../../types/profile2Export.types';

import '../../register-files';

// @ts-ignore
PDFDocument.prototype.addSVG = function (svg, x, y, options) {
  return [SVGtoPDF(this, svg, x, y, options), this];
};

const MARGIN = 30;

export const exportPdfProfile = (
  headingInfo: infoType[],
  endInfo: infoType[],
  svgs: SvgInfo[],
  iframeId?: string
) => {
  const headerLabel = 'P2 - Água Boa';

  const doc = new PDFDocument({
    margin: MARGIN,
    autoFirstPage: false,
  });
  const stream = doc.pipe(BlobStream());

  // doc.registerFont('Roboto', 'fonts/Roboto-Regular.ttf');
  // doc.registerFont('Roboto-Medium', 'fonts/Roboto-Medium.ttf');
  // doc.registerFont('Roboto-Bold', 'fonts/Roboto-Bold.ttf');
  doc.registerFont('OpenSans', '/fonts/OpenSans.ttf');

  const availableFonts = [
    { fullName: 'OpenSans', filePath: '/fonts/OpenSans.ttf' },
  ];

  // @ts-ignore
  doc.font = 'OpenSans';

  let pageNumber = 0;

  doc.on('pageAdded', () => {
    // eslint-disable-next-line no-plusplus
    pageNumber++;
    const { bottom } = doc.page.margins;

    // @ts-ignore
    doc.font = 'OpenSans';

    doc
      .fontSize(10)
      .fillColor('#54575C')
      .text('', MARGIN, MARGIN - 5)
      .image('/logo_pdf_horizontal.png', { width: 100 })
      .text('wellprofiler.com');

    doc.fontSize(16).text(headerLabel, MARGIN, MARGIN + 1, {
      // width: 200,
      align: 'center',
      underline: true,
    });

    doc
      .fontSize(11)
      .text(`Pág. ${pageNumber}`, doc.page.width - 80, MARGIN + 5, {
        width: 50,
        align: 'right',
        lineBreak: false,
      });

    // Reset text writer position
    doc.text('', 30, 65);
    doc.page.margins.bottom = bottom;
  });

  let yPos = MARGIN;

  svgs.forEach((svgInfo, key) => {
    const svg = document.getElementById(svgInfo.id);
    if (!svg!.getAttribute('height') || !svg!.getAttribute('width')) {
      return;
    }

    const svgHeight = parseFloat(svg!.getAttribute('height') || '0');
    const svgWidth = parseFloat(svg!.getAttribute('width') || '0');

    const pageSize =
      svgs.length > 1 || svgHeight < 835.88 ? 'A4' : [595.28, svgHeight];

    // Add another page
    doc.addPage({ size: pageSize, margin: MARGIN });

    if (key < 1) {
      doc.fontSize(6).moveDown();

      if (headingInfo.length > 0) {
        doc.fontSize(11);
        const table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        const headingInfoMap: { col1: string; col2?: string }[] = [];

        for (let i = 0; i < headingInfo.length; i += 2) {
          const info1 = headingInfo[i];

          if (i + 1 === headingInfo.length) {
            headingInfoMap.push({
              col1: `${info1.label}: ${info1.value}`,
            });
            break;
          }

          const info2 = headingInfo[i + 1];
          headingInfoMap.push({
            col1: `${info1.label}: ${info1.value}`,
            col2: `${info2.label}: ${info2.value}`,
          });
        }

        table
          .setColumnsDefaults({
            borderOpacity: 0.7,
            // @ts-ignore
            border: ['L', 'B', 'R', 'T'],
            align: 'left',
            padding: [2],
          })
          .addColumns([
            {
              id: 'col1',
              width: 267.64,
            },
            {
              id: 'col2',
              width: 267.64,
            },
          ])
          .addHeader()
          .addBody(headingInfoMap);
      }
    }

    // @ts-ignore
    doc.addSVG(svg, 0, doc.y, {
      width: svgWidth,
      // assumePt: true,
      // height: svgHeight + 60,
      // preserveAspectRatio: `${(svgWidth * 72) / 96}x${svgHeight}`,
    });

    yPos = parseFloat(svg!.getAttribute('height') || '0') / 1.33;
  });

  doc.text('', MARGIN, yPos);

  doc.fontSize(19).text('fnfuibasdhfa', { align: 'center', underline: true });

  if (endInfo.length > 0) {
    doc.fontSize(11);
    const table = new PdfTable(doc, {
      bottomMargin: 30,
    });

    const endInfoMap: { col1: string; col2?: string }[] = [];

    for (let i = 0; i < endInfo.length; i += 2) {
      const info1 = endInfo[i];

      if (i + 1 === endInfo.length) {
        endInfoMap.push({
          col1: `${info1.label}: ${info1.value}`,
        });
        break;
      }

      const info2 = endInfo[i + 1];
      endInfoMap.push({
        col1: `${info1.label}: ${info1.value}`,
        col2: `${info2.label}: ${info2.value}`,
      });
    }

    table
      .setColumnsDefaults({
        borderOpacity: 0.7,
        // @ts-ignore
        border: ['L', 'B', 'R', 'T'],
        align: 'left',
        padding: [2],
      })
      .addColumns([
        {
          id: 'col1',
          width: 267.64,
        },
        {
          id: 'col2',
          width: 267.64,
        },
      ])
      .addHeader()
      .addBody(endInfoMap);
  }

  doc.end();
  stream.on('finish', function () {
    // get a blob you can do whatever you like with
    const blob = stream.toBlob('application/pdf');

    if (iframeId) {
      const iframe = document.getElementById(iframeId);
      // @ts-ignore
      iframe.src = stream.toBlobURL('application/pdf');
    } else {
      download(blob, `perfil_teste.pdf`, 'application/pdf');
    }
  });
};

export default exportPdfProfile;
