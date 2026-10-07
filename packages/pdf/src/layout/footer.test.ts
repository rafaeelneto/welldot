import { renderSVG } from 'uqr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keyT, makeTestContext } from '../test-utils';
import type { PdfExportOptions } from '../types/options.types';
import { buildFooterContent } from './footer';

vi.mock('uqr', () => ({
  renderSVG: vi.fn((text: string) => `<svg data-text="${text}"></svg>`),
}));

// Deliberately not welldot.org/pages.dev-shaped, so a test passing can't be
// explained by a hardcoded fallback matching this value by coincidence.
const BASE_URL = 'https://example.test:4173';
const SHARE_URL = 'https://example.test:4173/editor?share=abc123';

function ctx(overrides: PdfExportOptions = {}, t = keyT) {
  return makeTestContext({ baseUrl: BASE_URL, ...overrides }, t);
}

type FooterRow = { columns: Array<{ text?: unknown; width?: unknown }> };
function row(content: unknown): FooterRow {
  return (content as { stack: [unknown, FooterRow] }).stack[1];
}

beforeEach(() => {
  vi.mocked(renderSVG).mockClear();
});

describe('buildFooterContent', () => {
  it('labels the footer with the host derived from baseUrl, protocol/port stripped from the label', () => {
    expect(row(buildFooterContent(ctx(), true)).columns[1]!.text).toBe(
      'example.test:4173',
    );
  });

  it('encodes a QR svg', () => {
    const content = JSON.stringify(buildFooterContent(ctx(), true));
    expect(content).toContain('<svg');
  });

  it('uses page margins in page mode, none otherwise', () => {
    const withBreaks = buildFooterContent(ctx(), true) as { margin: number[] };
    const withoutBreaks = buildFooterContent(ctx(), false) as {
      margin: number[];
    };
    expect(withBreaks.margin).toEqual([30, 10, 30, 10]);
    expect(withoutBreaks.margin).toEqual([0, 0, 0, 0]);
  });

  it('follows custom page margins in page mode', () => {
    const footer = buildFooterContent(
      ctx({ page: { margins: [40, 20, 50, 20] } }),
      true,
    ) as { margin: number[] };
    expect(footer.margin).toEqual([40, 10, 50, 10]);
  });

  it('encodes shareUrl in the QR when provided', () => {
    buildFooterContent(ctx({ shareUrl: SHARE_URL }), true);
    expect(renderSVG).toHaveBeenCalledWith(SHARE_URL, expect.anything());
  });

  it('falls back to baseUrl in the QR when shareUrl is absent', () => {
    buildFooterContent(ctx(), true);
    expect(renderSVG).toHaveBeenCalledWith(BASE_URL, expect.anything());
  });

  it('prefers footer.qrUrl over shareUrl', () => {
    buildFooterContent(
      ctx({ shareUrl: SHARE_URL, footer: { qrUrl: 'https://acme.test' } }),
      true,
    );
    expect(renderSVG).toHaveBeenCalledWith(
      'https://acme.test',
      expect.anything(),
    );
  });

  it('uses the fallback tagline (not the share tagline) when shareUrl is absent', () => {
    const content = JSON.stringify(buildFooterContent(ctx(), true));
    expect(content).toContain('document.footerTaglineFallback');
    expect(content).not.toContain('"document.footerTagline"');
  });

  it('uses the share tagline and omits a valid-until line when shareUrl has no expiresAt', () => {
    const content = JSON.stringify(
      buildFooterContent(ctx({ shareUrl: SHARE_URL }), true),
    );
    expect(content).toContain('document.footerTagline');
    expect(content).not.toContain('document.footerValidUntilLabel');
  });

  it('appends a valid-until line when both shareUrl and shareExpiresAt are given', () => {
    // Noon UTC keeps the formatted day stable regardless of the test
    // runner's local timezone (`format` renders in local time).
    const content = JSON.stringify(
      buildFooterContent(
        ctx({
          shareUrl: SHARE_URL,
          shareExpiresAt: '2026-09-14T12:00:00.000Z',
        }),
        true,
      ),
    );
    expect(content).toContain('document.footerValidUntilLabel');
    expect(content).toContain('14 Sep 2026');
  });

  it('formats the valid-until month in Portuguese for pt', () => {
    const content = JSON.stringify(
      buildFooterContent(
        ctx({
          locale: 'pt',
          shareUrl: SHARE_URL,
          shareExpiresAt: '2026-09-14T12:00:00.000Z',
        }),
        true,
      ),
    );
    expect(content).toContain('14 set 2026');
  });

  it('drops the QR column when omitShareBlock or footer.showQr is false', () => {
    for (const options of [
      { omitShareBlock: true },
      { footer: { showQr: false } },
    ]) {
      const content = buildFooterContent(ctx(options), true);
      expect(JSON.stringify(content)).not.toContain('<svg');
      expect(row(content).columns).toHaveLength(2);
    }
    expect(renderSVG).not.toHaveBeenCalled();
  });

  it('uses footer.text and can hide the host', () => {
    const content = buildFooterContent(
      ctx({ footer: { text: 'ACME Drilling', showHost: false } }),
      true,
    );
    const serialized = JSON.stringify(content);
    expect(row(content).columns[0]!.text).toBe('ACME Drilling');
    expect(serialized).not.toContain('example.test:4173"');
  });

  it('applies the theme footer color and rule width', () => {
    const content = buildFooterContent(
      ctx({
        page: { size: 'A3' },
        theme: { colors: { footerText: '#123456' } },
      }),
      true,
    ) as { stack: [{ canvas: Array<{ x2: number }> }, FooterRow] };
    expect(JSON.stringify(content)).toContain('#123456');
    expect(content.stack[0].canvas[0]!.x2).toBeCloseTo(841.89 - 60);
  });
});
