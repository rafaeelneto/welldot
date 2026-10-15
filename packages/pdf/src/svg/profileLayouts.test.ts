import type { Lithology } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../test-utils';
import {
  buildCompactLayout,
  buildDetailedLayout,
  buildPanelCaptions,
  fillTemplate,
  formatScale,
  getLithologyContacts,
  mergeDeep,
} from './profileLayouts';

const lithology = [
  { from: 0, to: 12, geologic_unit: 'Serra Geral', description: 'Solo' },
  { from: 12, to: 455, geologic_unit: 'Serra Geral', description: 'Basalto' },
  { from: 455, to: 615, geologic_unit: 'Botucatu', description: 'Arenito' },
] as Lithology[];

describe('getLithologyContacts', () => {
  it('lists each contact with the units on both sides', () => {
    expect(getLithologyContacts(lithology)).toEqual([
      { depth: 12, above: 'Serra Geral', below: 'Serra Geral' },
      { depth: 455, above: 'Serra Geral', below: 'Botucatu' },
    ]);
  });
});

describe('mergeDeep', () => {
  it('merges plain objects and replaces arrays and scalars', () => {
    expect(
      mergeDeep<Record<string, unknown>>(
        { a: { b: 1, c: [1, 2] }, d: true },
        { a: { c: [3] }, d: undefined },
        { a: { e: 'x' } },
      ),
    ).toEqual({ a: { b: 1, c: [3], e: 'x' }, d: true });
  });
});

describe('fillTemplate', () => {
  it('fills known placeholders and keeps unknown ones', () => {
    expect(fillTemplate('p. {page} {x}', { page: 2 })).toBe('p. 2 {x}');
  });
});

describe('formatScale', () => {
  it('groups digits for the locale', () => {
    expect(formatScale(2000, 'pt')).toBe('1:2.000');
    expect(formatScale(1999.6, 'en')).toBe('1:2,000');
  });
});

describe('profile layouts', () => {
  it('puts the description column right of the construction labels', () => {
    const layout = buildDetailedLayout(makeTestContext(), 535, {
      overview: true,
      overviewHeight: 300,
    });
    const labels = layout.renderConfig.labels!;
    expect(layout.renderConfig.overview).toMatchObject({
      active: true,
      height: 300,
    });
    expect(layout.renderConfig.constructionLabels).toMatchObject({
      active: true,
      side: 'right',
    });
    expect(labels.descriptionXOffset).toBeGreaterThan(100);
    expect(labels.descriptionMaxWidth).toBeGreaterThan(200);
    expect(layout.margins.left).toBeGreaterThan(
      buildDetailedLayout(makeTestContext(), 535, {
        overview: false,
        overviewHeight: 0,
      }).margins.left,
    );
  });

  it('turns text off and markers on in the compact column', () => {
    const ctx = makeTestContext({ format: 'compact' });
    const layout = buildCompactLayout(ctx, 171);
    expect(layout.renderConfig).toMatchObject({
      labels: { active: false },
      constructionLabels: { active: false },
      markers: { lithology: true, fractures: true },
      columnHeaders: {
        active: true,
        labels: { construction: ctx.labels.profile.columns.well },
      },
    });
  });
});

describe('buildPanelCaptions', () => {
  const panels = [
    { depthFrom: 0, depthTo: 120, breakBefore: false },
    { depthFrom: 115, depthTo: 455, breakBefore: true },
    { depthFrom: 450, depthTo: 615, breakBefore: true },
  ];

  it('points compact panels to the page the profile continues on', () => {
    const ctx = makeTestContext({ format: 'compact', locale: 'pt' });
    const captions = buildPanelCaptions(panels, ctx, {
      lithology,
      scale: 2000,
      startPage: 1,
    });
    expect(captions.map(c => c?.text)).toEqual([
      '1:2.000 · continua na pág. 2 ↓',
      '1:2.000 · continua na pág. 3 ↓',
      '1:2.000',
    ]);
  });

  it('shows only the scale a fitted compact profile was drawn at', () => {
    const ctx = makeTestContext({
      format: 'compact',
      locale: 'en',
      profileFit: 'content',
    });
    const [caption] = buildPanelCaptions([panels[0]!], ctx, {
      lithology,
      scale: 731.4,
    });
    expect(caption?.text).toBe('1:731');
  });

  it('notes the cut layer or the snapped contact under detailed pages', () => {
    const ctx = makeTestContext({ locale: 'pt' });
    const captions = buildPanelCaptions(
      [
        panels[0]!,
        {
          ...panels[1]!,
          snap: { depth: 455, above: 'Serra Geral', below: 'Botucatu' },
        },
        panels[2]!,
      ],
      ctx,
      { lithology, scale: 500 },
    );
    expect(captions[0]).toEqual({
      text: 'continua ↓ até 455 m',
      kind: 'caption',
      align: 'end',
    });
    expect(captions[1]).toEqual({
      text: 'quebra ajustada ao contato 455 m (Serra Geral / Botucatu)',
      kind: 'snap',
      align: 'start',
    });
    expect(captions[2]).toBeNull();
  });
});
