/* eslint-disable import/prefer-default-export */
import React from 'react';
import PDFDocument from 'pdfkit';
import download from 'downloadjs';
import { format } from 'date-fns';
import BlobStream from 'blob-stream';

import '../../register-files';

export const usePrint = () => {
  const wellName = 'P1 - TESTE';
  const print = () => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: 50,
    });
    const stream = doc.pipe(BlobStream());

    doc.registerFont('Roboto', 'fonts/Roboto-Regular.ttf');
    // Add another page
    doc.text('Hello world!', 1, 1);

    doc.end();
    stream.on('finish', function () {
      // get a blob you can do whatever you like with
      const blob = stream.toBlob('application/pdf');

      download(blob, `perfil_teste.pdf`, 'application/pdf');
    });
  };

  return print;
};
