import { describe, expect, it } from 'vitest';
import { WELLDOT_LOGO_SVG } from './assets/welldotLogo';
import { buildDocDefinition, startOnNextPage } from './buildDocDefinition';
import { baseWell, keyLabels, makeTestContext } from './test-utils';
import type {
  PdfExportOptions,
  RenderedLegendItem,
  RenderedSvg,
} from './types/options.types';
import type {
  Content,
  ContentColumns,
  ContentStack,
  ContentSvg,
  ContentTable,
} from './types/pdfmake.types';

// Deliberately not welldot.org-shaped, so a passing assertion can't be
// explained by a hardcoded fallback matching this value by coincidence.
const BASE_URL = 'https://example.test';

const baseOptions: PdfExportOptions = {
  title: 'My Well Profile',
  metadataPosition: null,
  locale: 'pt',
  baseUrl: BASE_URL,
};

const svg: RenderedSvg = { markup: '<svg></svg>', width: 400, height: 600 };

/** Builds with the test context and a key-echo translate. */
function build(
  options: PdfExportOptions = {},
  svgs: RenderedSvg[] = [svg],
  legend: RenderedLegendItem[] = [],
  well = baseWell(),
) {
  return buildDocDefinition(
    well,
    svgs,
    legend,
    makeTestContext({ ...baseOptions, ...options }, keyLabels),
  );
}

function svgBlocks(content: Content[]): ContentSvg[] {
  return content.filter(
    (c): c is ContentSvg => typeof c === 'object' && 'svg' in c,
  );
}

describe('buildDocDefinition', () => {
  it('renders one SVG panel per page with no pageBreak on the first', () => {
    const blocks = svgBlocks(build({}, [svg, svg]).content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.pageBreak).toBeUndefined();
  });

  it('adds pageBreak before subsequent panels when breakPages is true', () => {
    const blocks = svgBlocks(build({ breakPages: true }, [svg, svg]).content);
    expect(blocks[0]!.pageBreak).toBeUndefined();
    expect(blocks[1]!.pageBreak).toBe('before');
  });

  it('follows the breakBefore flag of each panel when set', () => {
    const blocks = svgBlocks(
      build({ breakPages: true }, [
        { ...svg, breakBefore: true },
        { ...svg, breakBefore: true },
      ]).content,
    );
    expect(blocks[0]!.pageBreak).toBe('before');
    expect(blocks[1]!.pageBreak).toBe('before');
  });

  it('omits the metadata table entirely when metadataPosition is null', () => {
    const doc = build({}, [svg], [], baseWell({ name: 'Well A' }));
    expect(JSON.stringify(doc.content)).not.toContain('Well A');
  });

  it('places the populated metadata table before the SVG when "before"', () => {
    const doc = build(
      { metadataPosition: 'before' },
      [svg],
      [],
      baseWell({ name: 'Well A' }),
    );
    const svgIndex = doc.content.findIndex(
      c => typeof c === 'object' && 'svg' in c,
    );
    const metaIndex = doc.content.findIndex(c =>
      JSON.stringify(c).includes('Well A'),
    );
    expect(metaIndex).toBeGreaterThanOrEqual(0);
    expect(metaIndex).toBeLessThan(svgIndex);
  });

  it('places the populated metadata table after the SVG when "after"', () => {
    const doc = build(
      { metadataPosition: 'after' },
      [svg],
      [],
      baseWell({ name: 'Well A' }),
    );
    const svgIndex = doc.content.findIndex(
      c => typeof c === 'object' && 'svg' in c,
    );
    const metaIndex = doc.content.findIndex(c =>
      JSON.stringify(c).includes('Well A'),
    );
    expect(metaIndex).toBeGreaterThan(svgIndex);
  });

  it('omits heading/end info tables when empty', () => {
    expect(JSON.stringify(build().content)).not.toContain('finalInfo');
  });

  it('renders heading and end info as tables when non-empty', () => {
    const serialized = JSON.stringify(
      build({
        headingInfo: [{ label: 'Client', value: 'Acme' }],
        endInfo: [{ label: 'Notes', value: 'All good' }],
      }).content,
    );
    expect(serialized).toContain('Client');
    expect(serialized).toContain('Acme');
    expect(serialized).toContain('Notes');
    expect(serialized).toContain('All good');
  });

  describe('legend strip', () => {
    const legendItems = (count: number): RenderedLegendItem[] =>
      Array.from({ length: count }, (_, i) => ({
        label: `Item ${i}`,
        symbol: {
          markup: `<svg id="symbol-${i}"></svg>`,
          width: 28,
          height: 16,
        },
      }));
    const TITLE = 'DOCUMENT.LEGENDTITLE';
    const isStrip = (c: Content) =>
      typeof c === 'object' && JSON.stringify(c).includes(TITLE);

    it('sits at the foot of the first profile page when pages break', () => {
      const doc = build({ breakPages: true }, [svg, svg], legendItems(2));
      const at = doc.content.findIndex(isStrip);
      const strip = doc.content[at] as ContentStack;
      // Right after the first panel, drawn at a fixed position.
      expect(doc.content[at - 1]).toMatchObject({ svg: svg.markup });
      expect(strip.absolutePosition).toBeDefined();
      expect(strip.absolutePosition!.y).toBeGreaterThan(700);
      expect(JSON.stringify(strip)).toContain('symbol-1');
    });

    it('follows the profile in the flow without page breaks', () => {
      const doc = build({ breakPages: false }, [svg], legendItems(2));
      const at = doc.content.findIndex(isStrip);
      expect(doc.content[at - 1]).toMatchObject({ svg: svg.markup });
      expect(
        (doc.content[at] as ContentStack).absolutePosition,
      ).toBeUndefined();
    });

    it('goes in the compact profile column, after the first panel', () => {
      const doc = build(
        { breakPages: true, format: 'compact' },
        [svg, svg],
        legendItems(1),
      );
      const columns = doc.content.find(
        (c): c is ContentColumns => typeof c === 'object' && 'columns' in c,
      )!;
      const profile = (columns.columns[0] as ContentStack).stack;
      expect(profile).toHaveLength(3);
      expect(isStrip(profile[1]!)).toBe(true);
    });

    it('omits the strip when there are no entries', () => {
      expect(build({}, [svg], []).content.some(isStrip)).toBe(false);
    });
  });

  describe('legend break', () => {
    const titled = (rows: number): ContentTable =>
      ({
        table: {
          headerRows: 2,
          body: [
            [{ text: 'title' }],
            [{ text: 'head' }],
            ...Array.from({ length: rows }, (_, i) => [{ text: `r${i}` }]),
          ],
        },
      }) as ContentTable;

    it('splits a table at a row and repeats its title and header', () => {
      const [before, after] = startOnNextPage(titled(4), 4) as ContentTable[];
      expect(
        before!.table.body.map(r => (r[0] as { text: string }).text),
      ).toEqual(['title', 'head', 'r0', 'r1']);
      expect(
        after!.table.body.map(r => (r[0] as { text: string }).text),
      ).toEqual(['title', 'head', 'r2', 'r3']);
      expect(after!.pageBreak).toBe('before');
      expect(before!.pageBreak).toBeUndefined();
    });

    it('moves the whole table when cut at its first data row', () => {
      const moved = startOnNextPage(titled(3), 2);
      expect(moved).toHaveLength(1);
      expect((moved[0] as ContentTable).pageBreak).toBe('before');
    });

    it('splits a stack at an item', () => {
      const [before, after] = startOnNextPage(
        { stack: ['a', 'b', 'c'] },
        1,
      ) as ContentStack[];
      expect(before!.stack).toEqual(['a']);
      expect(after).toMatchObject({ stack: ['b', 'c'], pageBreak: 'before' });
    });

    it('continues a cut compact side column at full width when the profile ends', () => {
      const well = baseWell({
        name: 'TC-02',
        bore_hole: [{ from: 0, to: 10, diameter: 200 }],
      });
      const ctx = makeTestContext(
        {
          ...baseOptions,
          format: 'compact',
          breakPages: true,
          metadataPosition: 'before',
        },
        keyLabels,
      );
      const one = buildDocDefinition(well, [svg], [], ctx, {
        legendBreak: { scope: 'side', block: 1 },
      });
      const columnsAt = one.content.findIndex(
        c => typeof c === 'object' && 'columns' in c,
      );
      const side = (
        (one.content[columnsAt] as ContentColumns).columns[1] as ContentStack
      ).stack;
      // General info stays beside the profile; the bore hole table moves on.
      expect(side).toHaveLength(1);
      const next = one.content[columnsAt + 1] as ContentTable;
      expect(JSON.stringify(next)).toContain('boreHole');
      expect(next.pageBreak).toBe('before');

      // With the profile continuing on the next page, it stays in the column.
      const two = buildDocDefinition(well, [svg, svg], [], ctx, {
        legendBreak: { scope: 'side', block: 1 },
      });
      const twoSide = (
        (
          two.content.find(
            c => typeof c === 'object' && 'columns' in c,
          ) as ContentColumns
        ).columns[1] as ContentStack
      ).stack as ContentTable[];
      expect(twoSide).toHaveLength(2);
      expect(twoSide[1]!.pageBreak).toBe('before');
    });

    it('applies extras.legendBreak to the content after the profile', () => {
      const well = baseWell({
        bore_hole: [{ from: 0, to: 10, diameter: 200 }],
      });
      const doc = buildDocDefinition(
        well,
        [svg],
        [],
        makeTestContext({ ...baseOptions, breakPages: true }, keyLabels),
        { legendBreak: { scope: 'after', block: 0 } },
      );
      const moved = doc.content.find(
        c => typeof c === 'object' && JSON.stringify(c).includes('boreHole'),
      ) as ContentTable;
      expect(moved.pageBreak).toBe('before');
    });
  });

  it('sets page height to auto when breakPages is false, fixed A4 otherwise', () => {
    expect(build().pageSize?.height).toBe('auto');
    expect(build({ breakPages: true }).pageSize?.height).toBe(841.89);
  });

  it('appends the footer inline only when breakPages is false', () => {
    const single = build();
    expect(JSON.stringify(single.content)).toContain('example.test');
    expect(single.footer).toBeUndefined();

    const paged = build({ breakPages: true });
    expect(JSON.stringify(paged.content)).not.toContain('example.test');
    expect(paged.footer?.(1, 2)).toBeDefined();
  });

  it('threads options.shareUrl through to the footer QR', () => {
    const withoutShareUrl = build();
    const withShareUrl = build({ shareUrl: `${BASE_URL}/s/abc123` });
    expect(JSON.stringify(withShareUrl.content)).not.toEqual(
      JSON.stringify(withoutShareUrl.content),
    );
  });

  // --- customization ---------------------------------------------------

  it('accepts raw options and resolves them (default locale title)', () => {
    const doc = buildDocDefinition(baseWell(), [svg], [], { locale: 'en' });
    expect(
      JSON.stringify(doc.header?.(1, 1, { width: 0, height: 0 })),
    ).toContain('GEOLOGICAL PROFILE');
    expect(doc.info?.title).toBe('GEOLOGICAL PROFILE');
  });

  it('draws the Welldot branding by default', () => {
    const header = JSON.stringify(
      build().header?.(1, 1, { width: 0, height: 0 }),
    );
    expect(header).toContain(JSON.stringify(WELLDOT_LOGO_SVG).slice(1, 40));
    expect(header).toContain('Welldot');
    expect(header).toContain('welldot.org');
  });

  it('swaps the logo for an image and hides name/subtitle', () => {
    const header = JSON.stringify(
      build({
        branding: {
          logo: { image: 'data:image/png;base64,AAAA', width: 40, height: 20 },
          name: false,
          subtitle: 'acme.test',
        },
      }).header?.(1, 1, { width: 0, height: 0 }),
    );
    expect(header).toContain('data:image/png;base64,AAAA');
    expect(header).toContain('[40,20]');
    expect(header).not.toContain('Welldot');
    expect(header).toContain('acme.test');
  });

  it('removes the logo with branding.logo: false', () => {
    const header = JSON.stringify(
      build({ branding: { logo: false } }).header?.(1, 1, {
        width: 0,
        height: 0,
      }),
    );
    expect(header).not.toContain('"svg"');
  });

  it('adds a text watermark', () => {
    const doc = build({
      watermark: { text: 'DRAFT', opacity: 0.2, angle: 45 },
    });
    expect(doc.watermark).toMatchObject({
      text: 'DRAFT',
      opacity: 0.2,
      angle: 45,
    });
    expect(doc.background).toBeUndefined();
  });

  it('adds an image watermark centered on the page', () => {
    const doc = build({
      watermark: { image: 'data:image/png;base64,BBBB', imageWidth: 200 },
    });
    expect(doc.watermark).toBeUndefined();
    const bg = doc.background?.(1, { width: 600, height: 800 }) as {
      image: string;
      absolutePosition: { x: number; y: number };
    };
    expect(bg.image).toBe('data:image/png;base64,BBBB');
    expect(bg.absolutePosition).toEqual({ x: 200, y: 300 });
  });

  it('honors page size, orientation and margins', () => {
    const doc = build({
      breakPages: true,
      page: { size: 'A4', orientation: 'landscape', margins: 20 },
    });
    expect(doc.pageSize).toEqual({ width: 841.89, height: 595.28 });
    expect(doc.pageMargins).toEqual([20, 30, 20, 50]);
  });

  it('can disable the header and replace the footer', () => {
    const doc = build({
      breakPages: true,
      header: { enabled: false },
      footer: {
        content: (page, count) => ({ text: `custom ${page}/${count}` }),
      },
    });
    expect(doc.header).toBeUndefined();
    expect(doc.footer?.(2, 3)).toEqual({ text: 'custom 2/3' });
  });

  it('hides the page counter when header.showPageNumbers is false', () => {
    const header = JSON.stringify(
      build({ header: { showPageNumbers: false } }).header?.(1, 2, {
        width: 0,
        height: 0,
      }),
    );
    expect(header).not.toContain('document.page');
  });

  it('skips disabled sections and follows a custom order', () => {
    const well = baseWell({
      bore_hole: [{ from: 0, to: 10, diameter: 200 }],
      history_logs: [
        {
          id: 'h1',
          datetime: '2024-01-01T10:00:00-03:00',
          category: 'inspection',
          description: 'Checked',
        },
      ],
    } as never);
    const ordered = JSON.stringify(
      build({ sections: { order: ['historyLog'] } }, [svg], [], well).content,
    );
    expect(ordered.indexOf('historyLog')).toBeLessThan(
      ordered.indexOf('boreHole'),
    );

    const withoutConstruction = JSON.stringify(
      build({ sections: { include: { construction: false } } }, [svg], [], well)
        .content,
    );
    expect(withoutConstruction).not.toContain('boreHole');
    expect(withoutConstruction).toContain('historyLog');
  });

  it('applies theme fonts and colors to the default style and title style', () => {
    const doc = build({
      theme: {
        fonts: { body: 'Roboto', heading: 'Merriweather' },
        colors: { text: '#111111', title: '#222222' },
      },
    });
    expect(doc.defaultStyle).toMatchObject({
      font: 'Roboto',
      color: '#111111',
    });
    expect(doc.styles?.title).toMatchObject({
      font: 'Merriweather',
      color: '#222222',
    });
  });

  describe('formats', () => {
    const well = baseWell({
      lithology: [
        {
          from: 0,
          to: 12,
          description: 'Solo',
          color: '#7a3b2e',
          texture: { code: 607 },
          geologic_unit: 'Serra Geral',
          aquifer_unit: '',
        },
      ],
      fractures: [
        {
          depth: 188,
          water_intake: true,
          description: 'Disjunção horizontal',
          swarm: false,
          azimuth: null,
          dip: null,
        },
      ],
      bore_hole: [{ from: 0, to: 12, diameter: 200 }],
    } as never);

    const columnsOf = (content: Content[]) =>
      content.filter(
        (c): c is ContentColumns => typeof c === 'object' && 'columns' in c,
      );

    it('lays the detailed profile out full width, without lithology or fracture tables', () => {
      const doc = build({ format: 'detailed' }, [svg], [], well);
      const text = JSON.stringify(doc.content);
      expect(columnsOf(doc.content)).toHaveLength(0);
      expect(svgBlocks(doc.content)).toHaveLength(1);
      expect(text).not.toContain('lithology.title');
      expect(text).not.toContain('fractures.title');
      expect(text).toContain('boreHole');
    });

    it('puts the compact profile in a column beside the section tables', () => {
      const doc = build({ format: 'compact' }, [svg, svg], [], well);
      const [block] = columnsOf(doc.content);
      const [profile, side] = block!.columns as ContentStack[];

      expect(profile!.stack).toHaveLength(2);
      expect(svgBlocks(profile!.stack).every(b => !b.pageBreak)).toBe(true);
      const sideText = JSON.stringify(side!.stack);
      expect(sideText.indexOf('lithology.title')).toBeLessThan(
        sideText.indexOf('fractures.title'),
      );
      expect(sideText.indexOf('fractures.title')).toBeLessThan(
        sideText.indexOf('boreHole'),
      );
      expect(sideText).toContain('F1 · ');
      // The first table lines up with the profile's column titles.
      expect((side!.stack[0] as ContentTable).margin).toEqual([0, 0, 0, 0]);
    });

    it('puts the legend right after the columns, before the full-width tables', () => {
      const symbol = { markup: '<svg></svg>', width: 28, height: 16 };
      const doc = buildDocDefinition(
        well,
        [svg],
        [{ label: 'Perfuração', symbol }],
        makeTestContext({ ...baseOptions, format: 'compact' }, keyLabels),
        { compactSideSplit: 1 },
      );
      const columnsAt = doc.content.findIndex(
        c => typeof c === 'object' && 'columns' in c,
      );
      const after = doc.content
        .slice(columnsAt + 1)
        .map(c => JSON.stringify(c));
      expect(after[0]).toContain('DOCUMENT.LEGENDTITLE');
      expect(after.slice(1).join()).toContain('boreHole');
    });

    it('opens the compact side column with the general info, in two columns', () => {
      const doc = build(
        { format: 'compact', metadataPosition: 'before' },
        [svg],
        [],
        baseWell({ ...well, name: 'TC-02' } as never),
      );
      const columnsAt = doc.content.findIndex(
        c => typeof c === 'object' && 'columns' in c,
      );
      const lead = JSON.stringify(doc.content.slice(0, columnsAt));
      expect(lead).not.toContain('general.generalInfo');

      const side = (
        (doc.content[columnsAt] as ContentColumns).columns[1] as ContentStack
      ).stack;
      const first = side[0] as ContentTable;
      expect(JSON.stringify(first)).toContain('general.generalInfo');
      expect(first.table.widths).toEqual(['*', '*']);
      expect(first.margin).toEqual([0, 0, 0, 0]);
    });

    it('keeps the general info above the detailed profile', () => {
      const doc = build(
        { format: 'detailed', metadataPosition: 'before' },
        [svg],
        [],
        baseWell({ name: 'TC-02' }),
      );
      const svgAt = doc.content.findIndex(
        c => typeof c === 'object' && 'svg' in c,
      );
      expect(JSON.stringify(doc.content.slice(0, svgAt))).toContain(
        'general.generalInfo',
      );
    });

    it('draws the lithology swatch from the rendered extras', () => {
      const swatch = { markup: '<svg id="sw"></svg>', width: 9, height: 9 };
      const doc = buildDocDefinition(
        well,
        [svg],
        [],
        makeTestContext({ ...baseOptions, format: 'compact' }, keyLabels),
        { lithologySwatches: [swatch] },
      );
      expect(JSON.stringify(doc.content)).toContain('<svg id=\\"sw\\">');
    });
  });
});
