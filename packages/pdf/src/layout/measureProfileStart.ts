import type { Well } from '@welldot/core';
import {
  buildCompactSideContent,
  buildDocDefinition,
  buildDocShell,
  buildLeadContent,
  COMPACT_COLUMNS_ID,
  LEGEND_STRIP_ID,
  toPdfContext,
} from '../buildDocDefinition';
import { resolveBodyMargins } from '../context';
import {
  COMPACT_COLUMN_GAP,
  computeCompactColumnWidth,
  computeCompactSideWidth,
} from '../svg/profileLayouts';
import type {
  PdfContext,
  PdfExportOptions,
  PdfRenderedExtras,
  RenderedLegendItem,
  RenderedSvg,
} from '../types/options.types';
import type {
  Content,
  ContentColumns,
  ContentStack,
  ContentSvg,
  NodePosition,
  PdfMakeStatic,
  TDocumentDefinition,
} from '../types/pdfmake.types';
import { computeLegendStripHeight } from './legend';

/** Id of the zero-content node that marks where the profile would start. */
export const PROFILE_PROBE_ID = 'welldot-profile-start';

/** Id of the zero-content node that marks where the compact side column ends. */
export const SIDE_END_PROBE_ID = 'welldot-side-end';

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

/**
 * Lays out the compact format's side column (sections and end info) beside an empty profile column on one auto-height page and returns its
 * height (pt), from the top of the columns block to the end of the last
 * table. The compact profile drawn this tall follows the content
 * (`profileFit: 'content'`). Fonts must already be registered on
 * `pdfMake`. Resolves to `null` when the layout fails.
 */
export async function measureCompactContentHeight(
  well: Well,
  options: PdfExportOptions | PdfContext,
  pdfMake: PdfMakeStatic,
): Promise<number | null> {
  const ctx = toPdfContext(options);
  const shellCtx: PdfContext = { ...ctx, breakPages: false };

  let start: NodePosition | undefined;
  let end: NodePosition | undefined;
  const doc: TDocumentDefinition = {
    ...buildDocShell(shellCtx),
    content: [
      ...buildLeadContent(well, ctx),
      { text: ' ', id: PROFILE_PROBE_ID, fontSize: 1 },
      {
        columns: [
          { width: computeCompactColumnWidth(ctx.page), text: '' },
          {
            width: computeCompactSideWidth(ctx.page),
            stack: [
              ...buildCompactSideContent(well, ctx),
              { text: ' ', id: SIDE_END_PROBE_ID, fontSize: 1 },
            ],
          },
        ],
        columnGap: COMPACT_COLUMN_GAP,
      },
    ],
    pageBreakBefore: node => {
      if (node.id === PROFILE_PROBE_ID) start = node.startPosition;
      if (node.id === SIDE_END_PROBE_ID) end = node.startPosition;
      return false;
    },
  };

  try {
    await pdfMake.createPdf(doc).getBuffer();
  } catch {
    return null;
  }
  if (!start || !end) return null;
  return Math.max(0, end.top - start.top);
}

/** Id of the last compact profile panel during {@link measureCompactSideSplit}. */
export const PROFILE_END_ID = 'welldot-profile-end';

/** Id prefix of the compact side blocks during {@link measureCompactSideSplit}. */
export const SIDE_BLOCK_ID = 'welldot-side-block';

/**
 * Room (pt) a side block needs above the profile's end to stay in the side
 * column; a block starting lower moves below the profile at full width.
 */
export const COMPACT_SPLIT_MIN_ROOM = 60;

/**
 * Lays the compact document out with every block in the side column and
 * finds the first block that starts after the profile ends (less than
 * {@link COMPACT_SPLIT_MIN_ROOM} above its bottom). Resolves to that block's
 * index — pass it as `extras.compactSideSplit` so the blocks from there on
 * fill the page width below the profile — or to `undefined` when every
 * block starts beside the profile, the format is not compact, or the
 * layout fails. Fonts must already be registered on `pdfMake`.
 */
export async function measureCompactSideSplit(
  well: Well,
  svgs: RenderedSvg[],
  legend: RenderedLegendItem[],
  options: PdfExportOptions | PdfContext,
  pdfMake: PdfMakeStatic,
  extras: PdfRenderedExtras = {},
): Promise<number | undefined> {
  const ctx = toPdfContext(options);
  if (ctx.format !== 'compact' || svgs.length === 0) return undefined;

  const doc = buildDocDefinition(well, svgs, legend, ctx, {
    ...extras,
    compactSideSplit: undefined,
  });
  const block = doc.content.find(
    (c): c is ContentColumns =>
      typeof c === 'object' && 'columns' in c && c.id === COMPACT_COLUMNS_ID,
  );
  if (!block) return undefined;
  const [profile, side] = block.columns as ContentStack[];
  // The last panel, not the last item: the legend strip sits after the first panel.
  const panels = profile!.stack.filter(
    (item): item is ContentSvg => typeof item === 'object' && 'svg' in item,
  );
  const last = panels[panels.length - 1];
  if (!last) return undefined;
  last.id = PROFILE_END_ID;
  side!.stack.forEach((item: Content, index: number) => {
    if (typeof item === 'object') {
      (item as { id?: string }).id = `${SIDE_BLOCK_ID}-${index}`;
    }
  });

  const positions: Record<string, NodePosition> = {};
  doc.pageBreakBefore = node => {
    if (node.id) positions[node.id] = node.startPosition;
    return false;
  };

  try {
    await pdfMake.createPdf(doc).getBuffer();
  } catch {
    return undefined;
  }
  const end = positions[PROFILE_END_ID];
  if (!end) return undefined;
  const endTop = end.top + svgs[svgs.length - 1]!.height;

  for (let index = 0; index < side!.stack.length; index++) {
    const start = positions[`${SIDE_BLOCK_ID}-${index}`];
    if (!start) return undefined;
    const beside =
      start.pageNumber < end.pageNumber ||
      (start.pageNumber === end.pageNumber &&
        start.top < endTop - COMPACT_SPLIT_MIN_ROOM);
    if (!beside) return index;
  }
  return undefined;
}

/** Id of the first profile panel during {@link measureLegendBreak}. */
const FIRST_PANEL_ID = 'welldot-first-panel';

type BreakScope = 'side' | 'after';

/** A piece of a block that can start the next page: a table row, a stack item or the whole block. */
interface Piece {
  id: string;
  block: number;
  /** Table body row or stack item; `undefined` for a whole block. */
  row?: number;
  /** First row/item that keeps the block whole when cut there. */
  firstRow: number;
}

/** Suffix of the probe id that marks where a block ends. */
const END = '~end';

/**
 * Gives a cell (or stack item, or block) an id. pdfmake requires unique
 * ids, so each one gets a `#n` suffix; positions are grouped by the part
 * before it.
 */
function tagCell(cell: unknown, id: string): unknown {
  if (typeof cell === 'string') return cell ? { text: cell, id } : cell;
  if (cell && typeof cell === 'object' && Object.keys(cell).length > 0) {
    (cell as { id?: string }).id = id;
  }
  return cell;
}

/**
 * Tags the pieces of `blocks` with ids, adds a probe after each block that
 * marks where it ends, and lists the pieces in document order. The probe is
 * a 0.01 pt line, so the layout is the one the real document gets. (Probes
 * inside table rows would not help: pdfmake lays an unbreakable row out as
 * one block and reports every node in it at the row's start.)
 */
function tagPieces(blocks: Content[], scope: BreakScope): Piece[] {
  const pieces: Piece[] = [];
  blocks.forEach((block, b) => {
    if (typeof block === 'object' && 'table' in block) {
      const headerRows = block.table.headerRows ?? 0;
      block.table.body.forEach((row, r) => {
        const id = `${scope}:${b}:${r}`;
        block.table.body[r] = row.map((cell, c) =>
          tagCell(cell, `${id}#${c}`),
        ) as typeof row;
        pieces.push({ id, block: b, row: r, firstRow: headerRows });
      });
    } else if (typeof block === 'object' && 'stack' in block) {
      block.stack.forEach((item, i) => {
        const id = `${scope}:${b}:${i}`;
        block.stack[i] = tagCell(item, `${id}#0`) as Content;
        pieces.push({ id, block: b, row: i, firstRow: 0 });
      });
    } else {
      const id = `${scope}:${b}`;
      blocks[b] = tagCell(block, `${id}#0`) as Content;
      pieces.push({ id, block: b, firstRow: 0 });
    }
  });
  const withProbes = blocks.flatMap((block, b): Content[] => [
    block,
    { text: ' ', fontSize: 0.01, id: `${scope}:${b}${END}` },
  ]);
  blocks.splice(0, blocks.length, ...withProbes);
  return pieces;
}

/**
 * With `breakPages`, the legend strip is drawn at the foot of the first
 * profile page, outside the flow. This lays the document out and finds the
 * first piece of the content beside or after the profile — a table row, a
 * stack item or a whole block — that would run into the strip on that
 * page. Pass it as `extras.legendBreak` so that piece starts on the next
 * page (a cut table repeats its title and header). Resolves to `undefined`
 * when nothing reaches the strip, without page breaks or legend, or when
 * the layout fails. Fonts must already be registered on `pdfMake`.
 */
export async function measureLegendBreak(
  well: Well,
  svgs: RenderedSvg[],
  legend: RenderedLegendItem[],
  options: PdfExportOptions | PdfContext,
  pdfMake: PdfMakeStatic,
  extras: PdfRenderedExtras = {},
): Promise<PdfRenderedExtras['legendBreak']> {
  const ctx = toPdfContext(options);
  if (!ctx.breakPages || svgs.length === 0 || legend.length === 0) {
    return undefined;
  }

  const doc = buildDocDefinition(well, svgs, legend, ctx, {
    ...extras,
    legendBreak: undefined,
  });
  const content = doc.content;

  // Locate the first panel, the side column (compact) and what follows.
  let side: Content[] = [];
  let afterStart: number;
  const columnsAt = content.findIndex(
    c => typeof c === 'object' && 'columns' in c && c.id === COMPACT_COLUMNS_ID,
  );
  if (columnsAt >= 0) {
    const [profile, sideColumn] = (content[columnsAt] as ContentColumns)
      .columns as ContentStack[];
    (profile!.stack[0] as { id?: string }).id = FIRST_PANEL_ID;
    side = sideColumn!.stack;
    afterStart = columnsAt + 1;
  } else {
    const panelAt = content.findIndex(c => typeof c === 'object' && 'svg' in c);
    if (panelAt < 0) return undefined;
    (content[panelAt] as { id?: string }).id = FIRST_PANEL_ID;
    let last = panelAt;
    content.forEach((c, i) => {
      if (
        typeof c === 'object' &&
        ('svg' in c || (c as { id?: string }).id === LEGEND_STRIP_ID)
      ) {
        last = i;
      }
    });
    afterStart = last + 1;
  }
  const after = content.slice(afterStart);

  const scopes: [BreakScope, Content[]][] = [
    ['side', side],
    ['after', after],
  ];
  const pieces = new Map<BreakScope, Piece[]>();
  for (const [scope, blocks] of scopes) {
    pieces.set(scope, tagPieces(blocks, scope));
  }
  content.splice(afterStart, content.length - afterStart, ...after);

  // Cells of one row share the part before `#`: keep the earliest start.
  const positions = new Map<string, NodePosition>();
  doc.pageBreakBefore = node => {
    if (!node.id) return false;
    const key = node.id.split('#')[0]!;
    const seen = positions.get(key);
    const at = node.startPosition;
    if (
      !seen ||
      at.pageNumber < seen.pageNumber ||
      (at.pageNumber === seen.pageNumber && at.top < seen.top)
    ) {
      positions.set(key, at);
    }
    return false;
  };

  try {
    await pdfMake.createPdf(doc).getBuffer();
  } catch {
    return undefined;
  }

  const first = positions.get(FIRST_PANEL_ID);
  if (!first) return undefined;
  const [, , , bottom] = resolveBodyMargins(ctx.page, true);
  const bodyBottom = ctx.page.height - bottom;
  const stripTop =
    bodyBottom -
    computeLegendStripHeight(
      legend.map(item => item.label),
      ctx,
    );

  for (const [scope] of scopes) {
    const list = pieces.get(scope)!;
    for (let i = 0; i < list.length; i++) {
      const piece = list[i]!;
      const start = positions.get(piece.id);
      if (!start || start.pageNumber !== first.pageNumber) continue;
      // A piece ends where the next piece of its block starts, the last one
      // where its block's end probe sits. A next piece pushed to a later
      // page leaves this one's end unknown: assume it reaches the bottom.
      const next = list[i + 1];
      const end = positions.get(
        next && next.block === piece.block
          ? next.id
          : `${scope}:${piece.block}${END}`,
      );
      const endTop =
        end && end.pageNumber === start.pageNumber ? end.top : bodyBottom;
      if (endTop <= stripTop) continue;
      const whole = piece.row == null || piece.row <= piece.firstRow;
      return {
        scope,
        block: piece.block,
        ...(whole ? {} : { row: piece.row }),
      };
    }
  }
  return undefined;
}
