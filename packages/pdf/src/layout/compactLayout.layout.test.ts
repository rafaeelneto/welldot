import type { Lithology } from '@welldot/core';
import pdfmakeNode from 'pdfmake';
import { describe, expect, it } from 'vitest';
import { buildDocDefinition } from '../buildDocDefinition';
import { resolveBodyMargins } from '../context';
import {
  computePageSvgHeight,
  LEGEND_GAP,
  PDF_MARGINS,
  planProfilePanels,
} from '../svg/buildSvgProfiles';
import { computeCompactColumnWidth } from '../svg/profileLayouts';
import { baseWell, makeTestContext } from '../test-utils';
import type {
  PdfContext,
  RenderedLegendItem,
  RenderedSvg,
} from '../types/options.types';
import type {
  ContentColumns,
  ContentStack,
  ContentTable,
  PdfMakeStatic,
  TDocumentDefinition,
} from '../types/pdfmake.types';
import { computeLegendStripHeight } from './legend';
import {
  measureCompactContentHeight,
  measureCompactSideSplit,
  measureLegendBreak,
  measureProfileStart,
} from './measureProfileStart';

// Real pdfmake layout (Node build) with the Roboto files pdfmake ships.
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

const fonts = { body: 'Roboto', heading: 'Roboto', label: 'Roboto' };

function layers(count: number): Lithology[] {
  return Array.from({ length: count }, (_, i) => ({
    from: i * 10,
    to: (i + 1) * 10,
    description: 'Arenito fino a médio, róseo, bem selecionado. '.repeat(2),
    color: '#e5a98c',
    texture: { code: 607 },
    geologic_unit: 'Formação Botucatu',
    aquifer_unit: 'Sistema Aquífero Guarani',
  })) as unknown as Lithology[];
}

function svg(width: number, height: number): RenderedSvg {
  return {
    markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ccc"/></svg>`,
    width,
    height,
  };
}

describe('compact layout (pdfmake)', () => {
  it('puts each profile panel on its own page beside the flowing tables', async () => {
    const well = baseWell({ name: 'TC-02', lithology: layers(40) });
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const start = await measureProfileStart(well, ctx, node);
    expect(start).not.toBeNull();

    const pageHeight = computePageSvgHeight(ctx.page);
    const panels = planProfilePanels({
      totalHeight: pageHeight * 2.3,
      breakPages: true,
      pageHeight,
      firstPageRemaining: start!.remaining,
    });
    const width = computeCompactColumnWidth(ctx.page);

    const doc = buildDocDefinition(
      well,
      panels.map(p => svg(width, p.height)),
      [],
      ctx,
    );
    const columns = doc.content.find(
      (c): c is ContentColumns => typeof c === 'object' && 'columns' in c,
    )!;
    const profileStack = columns.columns[0] as ContentStack;
    profileStack.stack.forEach((item, i) => {
      (item as { id?: string }).id = `panel-${i}`;
    });
    const sideStack = columns.columns[1] as ContentStack;
    sideStack.stack.push({ text: ' ', id: 'side-end', fontSize: 1 });

    const pages: Record<string, number> = {};
    await node
      .createPdf({
        ...doc,
        pageBreakBefore: n => {
          if (n.id) pages[n.id] = n.startPosition.pageNumber;
          return false;
        },
      })
      .getBuffer();

    panels.forEach((_, i) => {
      expect(pages[`panel-${i}`]).toBe(start!.pageNumber + i);
    });
    // 40 lithology rows run past the first page beside the profile.
    expect(pages['side-end']).toBeGreaterThan(1);
  });

  it('measures the side column height, which grows with its tables', async () => {
    const measure = (count: number) =>
      measureCompactContentHeight(
        baseWell({ lithology: layers(count) }),
        makeTestContext({ format: 'compact', theme: { fonts } }),
        node,
      );
    const short = await measure(2);
    const long = await measure(8);
    expect(short).toBeGreaterThan(PDF_MARGINS.top);
    expect(long!).toBeGreaterThan(short! + 100);
  });

  it('moves the tables that start after a short profile to full width', async () => {
    const well = baseWell({
      name: 'TC-02',
      lithology: layers(30),
      bore_hole: [{ from: 0, to: 300, diameter: 300 }],
      well_case: [{ from: 0, to: 300, diameter: 200, type: 'steel' }],
    } as never);
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const width = computeCompactColumnWidth(ctx.page);
    const short = [svg(width, 150)];

    const split = await measureCompactSideSplit(well, short, [], ctx, node);
    // General info and lithology start beside the profile; the rest no
    // longer fit beside it.
    expect(split).toBe(2);

    const doc = buildDocDefinition(well, short, [], ctx, {
      compactSideSplit: split,
    });
    const index = doc.content.findIndex(
      c => typeof c === 'object' && 'columns' in c,
    );
    const columns = doc.content[index] as ContentColumns;
    expect((columns.columns[1] as ContentStack).stack).toHaveLength(2);
    // The bore hole and casing tables follow the columns, full width.
    const after = JSON.stringify(doc.content.slice(index + 1));
    expect(after).toContain(ctx.labels.construction.boreHole.title);
    expect(after).toContain(ctx.labels.construction.wellCase.title);
  });

  it('measures the split from the last panel, not the legend strip after the first', async () => {
    const well = baseWell({
      name: 'TC-02',
      lithology: layers(30),
      bore_hole: [{ from: 0, to: 300, diameter: 300 }],
      well_case: [{ from: 0, to: 300, diameter: 200, type: 'steel' }],
    } as never);
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const width = computeCompactColumnWidth(ctx.page);
    const short = [svg(width, 150)];
    const legend: RenderedLegendItem[] = [
      { label: 'Perfuração', symbol: svg(28, 16) },
    ];
    expect(await measureCompactSideSplit(well, short, legend, ctx, node)).toBe(
      await measureCompactSideSplit(well, short, [], ctx, node),
    );
  });

  it('keeps every table beside a profile that outlasts them', async () => {
    const well = baseWell({ lithology: layers(2) });
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const width = computeCompactColumnWidth(ctx.page);
    expect(
      await measureCompactSideSplit(well, [svg(width, 600)], [], ctx, node),
    ).toBeUndefined();
  });
});

const legend: RenderedLegendItem[] = [
  'Perfuração',
  'Revestimento',
  'Filtro',
].map(label => ({ label, symbol: svg(28, 16) }));

/** Top (pt) of the legend strip at the foot of a page. */
function stripTopOf(ctx: PdfContext): number {
  const [, , , bottom] = resolveBodyMargins(ctx.page, true);
  return (
    ctx.page.height -
    bottom -
    computeLegendStripHeight(
      legend.map(item => item.label),
      ctx,
    )
  );
}

/** Lays `doc` out and returns the page/top of every node with an id. */
async function layout(doc: TDocumentDefinition) {
  const at: Record<string, { page: number; top: number }> = {};
  await node
    .createPdf({
      ...doc,
      pageBreakBefore: n => {
        if (n.id && !at[n.id]) {
          at[n.id] = {
            page: n.startPosition.pageNumber,
            top: n.startPosition.top,
          };
        }
        return false;
      },
    })
    .getBuffer();
  return at;
}

describe('legend strip clearance (pdfmake)', () => {
  it('starts the side row that would cross the strip on the next page', async () => {
    const well = baseWell({ lithology: layers(40) });
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const start = await measureProfileStart(well, ctx, node);
    const reserve =
      computeLegendStripHeight(
        legend.map(item => item.label),
        ctx,
      ) + LEGEND_GAP;
    const width = computeCompactColumnWidth(ctx.page);
    const pageHeight = computePageSvgHeight(ctx.page);
    const svgs = planProfilePanels({
      totalHeight: pageHeight * 1.5,
      breakPages: true,
      pageHeight,
      firstPageRemaining: start!.remaining,
      firstPanelReserve: reserve,
    }).map(p => svg(width, p.height));

    const cut = await measureLegendBreak(well, svgs, legend, ctx, node);
    expect(cut).toMatchObject({ scope: 'side', block: 0 });
    expect(cut!.row).toBeGreaterThan(2);

    const doc = buildDocDefinition(well, svgs, legend, ctx, {
      legendBreak: cut,
    });
    const columns = doc.content.find(
      (c): c is ContentColumns => typeof c === 'object' && 'columns' in c,
    )!;
    const [before, after] = (columns.columns[1] as ContentStack)
      .stack as ContentTable[];
    // Tag the last row before the cut and the first row after it.
    const lastBefore = before!.table.body[before!.table.body.length - 1]!;
    (lastBefore[1] as { id?: string }).id = 'last-before';
    const firstAfter = after!.table.body[after!.table.headerRows!]!;
    (firstAfter[1] as { id?: string }).id = 'first-after';

    const at = await layout(doc);
    expect(at['last-before']!.page).toBe(start!.pageNumber);
    expect(at['last-before']!.top).toBeLessThan(stripTopOf(ctx));
    expect(at['first-after']!.page).toBe(start!.pageNumber + 1);
  });

  it('starts the content after a one-page detailed profile on the next page', async () => {
    const well = baseWell({
      well_case: Array.from({ length: 60 }, (_, i) => ({
        from: i,
        to: i + 1,
        diameter: 200 + (i % 2),
        type: 'steel',
      })),
    } as never);
    const ctx = makeTestContext({
      format: 'detailed',
      breakPages: true,
      theme: { fonts },
    });
    const cut = await measureLegendBreak(
      well,
      [svg(ctx.page.contentWidth, 150)],
      legend,
      ctx,
      node,
    );
    expect(cut?.scope).toBe('after');
  });

  it('leaves short content alone', async () => {
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: true,
      theme: { fonts },
    });
    const width = computeCompactColumnWidth(ctx.page);
    expect(
      await measureLegendBreak(
        baseWell({ lithology: layers(2) }),
        [svg(width, 300)],
        legend,
        ctx,
        node,
      ),
    ).toBeUndefined();
  });
});
