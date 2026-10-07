import { describe, expect, it } from 'vitest';
import { WELLDOT_LOGO_SVG } from './assets/welldotLogo';
import { buildDocDefinition } from './buildDocDefinition';
import { baseWell, keyLabels, makeTestContext } from './test-utils';
import type { PdfExportOptions, RenderedSvg } from './types/options.types';
import type { Content, ContentSvg } from './types/pdfmake.types';

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
  legend: RenderedSvg | null = null,
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

  it('omits the metadata table entirely when metadataPosition is null', () => {
    const doc = build({}, [svg], null, baseWell({ name: 'Well A' }));
    expect(JSON.stringify(doc.content)).not.toContain('Well A');
  });

  it('places the populated metadata table before the SVG when "before"', () => {
    const doc = build(
      { metadataPosition: 'before' },
      [svg],
      null,
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
      null,
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

  it('includes the legend svg when provided', () => {
    const legend: RenderedSvg = {
      markup: '<svg id="legend"></svg>',
      width: 500,
      height: 40,
    };
    expect(JSON.stringify(build({}, [svg], legend).content)).toContain(
      'legend',
    );
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
    const doc = buildDocDefinition(baseWell(), [svg], null, { locale: 'en' });
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
      build({ sections: { order: ['historyLog'] } }, [svg], null, well).content,
    );
    expect(ordered.indexOf('historyLog')).toBeLessThan(
      ordered.indexOf('boreHole'),
    );

    const withoutConstruction = JSON.stringify(
      build(
        { sections: { include: { construction: false } } },
        [svg],
        null,
        well,
      ).content,
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
});
