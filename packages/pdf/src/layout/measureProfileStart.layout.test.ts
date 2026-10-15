import pdfmakeNode from 'pdfmake';
import { describe, expect, it } from 'vitest';
import { baseWell, makeTestContext } from '../test-utils';
import type { PdfMakeStatic } from '../types/pdfmake.types';
import { measureProfileStart } from './measureProfileStart';

// Real pdfmake layout (Node build). Uses the Roboto files pdfmake ships
// rather than the 1.7 MB `@welldot/pdf/fonts` bundle, which is slow to load
// in Vitest; the metrics only need to be real, not the Welldot ones.
const roboto = (file: string) =>
  decodeURIComponent(
    new URL(`../../node_modules/pdfmake/fonts/Roboto/${file}`, import.meta.url)
      .pathname,
  );
const node = pdfmakeNode as unknown as PdfMakeStatic & {
  setFonts(fonts: unknown): void;
  setUrlAccessPolicy(policy: () => boolean): void;
};
node.setUrlAccessPolicy(() => false);
node.setFonts({
  Roboto: {
    normal: roboto('Roboto-Regular.ttf'),
    bold: roboto('Roboto-Medium.ttf'),
    italics: roboto('Roboto-Italic.ttf'),
    bolditalics: roboto('Roboto-MediumItalic.ttf'),
  },
});

const measure = (obs?: string) =>
  measureProfileStart(
    baseWell({ name: 'Poço TC-02', well_driller: 'Petrosolo', obs }),
    makeTestContext({
      breakPages: true,
      metadataPosition: 'before',
      theme: { fonts: { body: 'Roboto', heading: 'Roboto', label: 'Roboto' } },
    }),
    node,
  );

describe('measureProfileStart (pdfmake layout)', () => {
  it('leaves less room for the profile as the metadata grows', async () => {
    const short = await measure();
    const long = await measure(
      'Poço jorrante no Aquífero Guarani. '.repeat(30),
    );

    expect(short?.pageNumber).toBe(1);
    expect(long?.pageNumber).toBe(1);
    // A4 body: 841.89 − (30 + 10) − (30 + 30).
    expect(short!.remaining).toBeLessThan(841.89 - 100);
    expect(short!.remaining).toBeGreaterThan(400);
    expect(long!.remaining).toBeLessThan(short!.remaining - 40);
  });
});
