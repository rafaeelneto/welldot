import { describe, expect, it } from 'vitest';
import { PDF_SECTION_KEYS, resolvePdfContext } from './context';

describe('resolvePdfContext: profile format', () => {
  it('defaults to the detailed format at a fixed scale', () => {
    const ctx = resolvePdfContext();
    expect(ctx.format).toBe('detailed');
    expect(ctx.profileFit).toBe('scale');
  });

  it('fits to one page in either format, with or without page breaks', () => {
    const fit = (options: Parameters<typeof resolvePdfContext>[0]) =>
      resolvePdfContext({ profileFit: 'page', ...options }).profileFit;
    for (const format of ['compact', 'detailed'] as const) {
      expect(fit({ format, breakPages: false })).toBe('page');
      expect(fit({ format, breakPages: true })).toBe('page');
    }
  });

  it('follows the content only without page breaks', () => {
    const fit = (breakPages: boolean) =>
      resolvePdfContext({
        format: 'compact',
        breakPages,
        profileFit: 'content',
      }).profileFit;
    expect(fit(false)).toBe('content');
    expect(fit(true)).toBe('scale');
  });

  it('fits to the content only in the compact format', () => {
    expect(
      resolvePdfContext({
        format: 'detailed',
        breakPages: false,
        profileFit: 'content',
      }).profileFit,
    ).toBe('scale');
  });

  it('orders lithology, caves and fractures before construction', () => {
    expect(PDF_SECTION_KEYS.slice(0, 4)).toEqual([
      'lithology',
      'caves',
      'fractures',
      'construction',
    ]);
  });

  it('keeps caves and fractures right after lithology in a custom order', () => {
    expect(
      resolvePdfContext({
        sections: { order: ['fractures', 'permits', 'lithology', 'caves'] },
      }).sections.order.slice(0, 4),
    ).toEqual(['permits', 'lithology', 'caves', 'fractures']);
  });
});
