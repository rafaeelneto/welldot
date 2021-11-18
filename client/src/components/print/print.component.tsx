/* eslint-disable import/prefer-default-export */
import React from 'react';
import PDFDocument from 'pdfkit';
import download from 'downloadjs';
import { format } from 'date-fns';
import BlobStream from 'blob-stream';

import SVGtoPDF from 'svg-to-pdfkit';

import '../../register-files';

PDFDocument.prototype.addSVG = function (svg, x, y, options) {
  return [SVGtoPDF(this, svg, x, y, options), this];
};

export const pdfExportProfile = () => {
  const wellName = 'P1 - TESTE';

  const pdfGenerate = (svg) => {
    if (!svg.getAttribute('height') || !svg.getAttribute('width')) {
      return;
    }

    const svgHeight = parseFloat(svg.getAttribute('height')) || 0;
    const svgWidth = parseFloat(svg.getAttribute('width')) || 0;

    const doc = new PDFDocument({
      size: [595.28, svgHeight * 0.75],
    });
    const stream = doc.pipe(BlobStream());

    doc.registerFont('Roboto', 'fonts/Roboto-Regular.ttf');

    doc.font = 'Roboto';

    // Add another page
    doc.text(wellName, 20, 20);

    doc.addSVG(svg, 0, 40, {
      width: (svgWidth * 72) / 96,
      assumePt: true,
      preserveAspectRatio: `${(svgWidth * 72) / 96}x${svgHeight}`,
    });

    doc.end();
    stream.on('finish', function () {
      // get a blob you can do whatever you like with
      const blob = stream.toBlob('application/pdf');

      download(blob, `perfil_teste.pdf`, 'application/pdf');
    });
  };

  return pdfGenerate;
};
