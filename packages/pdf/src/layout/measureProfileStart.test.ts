import { describe, expect, it } from 'vitest';
import { baseWell, makeTestContext } from '../test-utils';
import type {
  PageBreakNodeInfo,
  PdfMakeStatic,
  TDocumentDefinition,
} from '../types/pdfmake.types';
import { PROFILE_PROBE_ID, measureProfileStart } from './measureProfileStart';

/** pdfmake stand-in that reports `position` for the probe node. */
function fakePdfMake(
  position: PageBreakNodeInfo['startPosition'] | null,
  docs: TDocumentDefinition[] = [],
): PdfMakeStatic {
  return {
    createPdf(doc) {
      docs.push(doc);
      return {
        async getBuffer() {
          if (!position) throw new Error('layout failed');
          doc.pageBreakBefore?.({
            id: 'other',
            startPosition: { ...position, verticalRatio: 0 },
            pageNumbers: [1],
            pages: 1,
          });
          doc.pageBreakBefore?.({
            id: PROFILE_PROBE_ID,
            startPosition: position,
            pageNumbers: [position.pageNumber],
            pages: position.pageNumber,
          });
          return new Uint8Array();
        },
      } as unknown as ReturnType<PdfMakeStatic['createPdf']>;
    },
    addVirtualFileSystem() {},
    addFonts() {},
  };
}

const position = {
  pageNumber: 1,
  pageInnerHeight: 740,
  pageInnerWidth: 535,
  left: 30,
  top: 290,
  verticalRatio: 0.25,
  horizontalRatio: 0,
};

describe('measureProfileStart', () => {
  it('reports the page and the height left below the probe', async () => {
    const result = await measureProfileStart(
      baseWell(),
      makeTestContext({ breakPages: true, metadataPosition: 'before' }),
      fakePdfMake(position),
    );
    expect(result).toEqual({ pageNumber: 1, remaining: 740 * 0.75 });
  });

  it('lays out only the lead content followed by the probe', async () => {
    const docs: TDocumentDefinition[] = [];
    const ctx = makeTestContext({ breakPages: true });
    await measureProfileStart(baseWell(), ctx, fakePdfMake(position, docs));

    const doc = docs[0]!;
    expect(doc.content[doc.content.length - 1]).toMatchObject({
      id: PROFILE_PROBE_ID,
    });
    expect(doc.header).toBeUndefined();
    expect(doc.footer).toBeUndefined();
    expect(doc.pageMargins).toEqual([30, 40, 30, 60]);
  });

  it('resolves to null when breakPages is off or layout fails', async () => {
    expect(
      await measureProfileStart(
        baseWell(),
        makeTestContext({ breakPages: false }),
        fakePdfMake(position),
      ),
    ).toBeNull();
    expect(
      await measureProfileStart(
        baseWell(),
        makeTestContext({ breakPages: true }),
        fakePdfMake(null),
      ),
    ).toBeNull();
  });
});
