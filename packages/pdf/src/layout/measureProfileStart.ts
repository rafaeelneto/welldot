import type { Well } from '@welldot/core';
import {
  buildDocShell,
  buildLeadContent,
  toPdfContext,
} from '../buildDocDefinition';
import type { PdfContext, PdfExportOptions } from '../types/options.types';
import type {
  NodePosition,
  PdfMakeStatic,
  TDocumentDefinition,
} from '../types/pdfmake.types';

/** Id of the zero-content node that marks where the profile would start. */
export const PROFILE_PROBE_ID = 'welldot-profile-start';

export interface ProfileStartPosition {
  /** 1-based page the profile starts on. */
  pageNumber: number;
  /** Height (pt) left on that page, from the profile's top to the body's bottom. */
  remaining: number;
}

/**
 * Lays out the content that precedes the profile (`buildLeadContent`) with
 * pdfmake and reports where the profile starts and how much of that page
 * is left. Pass `remaining` to `buildSvgProfiles` as `firstPageRemaining`.
 * Fonts must already be registered on `pdfMake`. Resolves to `null` when
 * `breakPages` is off or the layout fails.
 */
export async function measureProfileStart(
  well: Well,
  options: PdfExportOptions | PdfContext,
  pdfMake: PdfMakeStatic,
): Promise<ProfileStartPosition | null> {
  const ctx = toPdfContext(options);
  if (!ctx.breakPages) return null;

  let position: NodePosition | undefined;
  const doc: TDocumentDefinition = {
    ...buildDocShell(ctx),
    content: [
      ...buildLeadContent(well, ctx),
      { text: ' ', id: PROFILE_PROBE_ID, fontSize: 1 },
    ],
    pageBreakBefore: node => {
      if (node.id === PROFILE_PROBE_ID) position = node.startPosition;
      return false;
    },
  };

  try {
    await pdfMake.createPdf(doc).getBuffer();
  } catch {
    return null;
  }
  if (!position) return null;

  return {
    pageNumber: position.pageNumber,
    remaining: position.pageInnerHeight * (1 - position.verticalRatio),
  };
}
