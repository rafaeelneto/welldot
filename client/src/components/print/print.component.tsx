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
  const wellName = 'P1 - TESTE';

  const doc = new PDFDocument({
    margin: MARGIN,
    autoFirstPage: false,
  });
  const stream = doc.pipe(BlobStream());

  doc.registerFont('Roboto', 'fonts/Roboto-Regular.ttf');
  doc.registerFont('Roboto-Medium', 'fonts/Roboto-Medium.ttf');
  doc.registerFont('Roboto-Bold', 'fonts/Roboto-Bold.ttf');

  // @ts-ignore
  doc.font = 'Roboto';

  svgs.forEach((svgInfo, key) => {
    const svg = document.getElementById(svgInfo.id);
    if (!svg!.getAttribute('height') || !svg!.getAttribute('width')) {
      return;
    }

    const svgHeight = parseFloat(svg!.getAttribute('height') || '0');
    const svgWidth = parseFloat(svg!.getAttribute('width') || '0');

    const pageSize = svgs.length > 1 ? 'A4' : [595.28, svgHeight * 0.75 + 200];

    doc.addPage({ size: pageSize, margin: MARGIN });
    // Add another page

    doc.fontSize(19).text(wellName, { align: 'center', underline: true });
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
            // @ts-ignore
            border: ['L', 'B', 'R', 'T'],
            align: 'left',
            padding: [4],
            borderOpacity: 0.7,
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
      width: (svgWidth * 72) / 96,
      // height: svgHeight + 60,
      // assumePt: true,
      // preserveAspectRatio: `${(svgWidth * 72) / 96}x${svgHeight}`,
    });
  });
  doc.fontSize(19).text(wellName, { align: 'center', underline: true });

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
