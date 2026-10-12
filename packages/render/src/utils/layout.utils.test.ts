import { describe, expect, it } from 'vitest';
import {
  formatOverlapLabel,
  getColumnHeaderPositions,
  getFractureMarkers,
  getLithologyMarkers,
  getOverviewGeometry,
  resolvePanelWindows,
} from './layout.utils';

describe('resolvePanelWindows', () => {
  it('splits the depth in proportion to the panel heights', () => {
    expect(
      resolvePanelWindows([{ height: 100 }, { height: 300 }], 200),
    ).toEqual([
      [0, 50],
      [50, 200],
    ]);
  });

  it('gives a single panel the whole depth', () => {
    expect(resolvePanelWindows([{ height: 10 }], 80)).toEqual([[0, 80]]);
  });

  it('uses explicit depth ranges when every panel has one', () => {
    expect(
      resolvePanelWindows(
        [
          { height: 100, depthRange: [0, 124] },
          { height: 100, depthRange: [116, 292] },
        ],
        600,
      ),
    ).toEqual([
      [0, 124],
      [116, 292],
    ]);
  });

  it('ignores depth ranges when only some panels have one', () => {
    expect(
      resolvePanelWindows(
        [{ height: 100, depthRange: [0, 10] }, { height: 100 }],
        200,
      ),
    ).toEqual([
      [0, 100],
      [100, 200],
    ]);
  });
});

describe('getColumnHeaderPositions', () => {
  it('offsets column centers by the left margin', () => {
    expect(
      getColumnHeaderPositions({
        marginLeft: 40,
        geoXLeft: 10,
        geoXRight: 30,
        pocoCenterX: 80,
        descriptionX: 200,
      }),
    ).toEqual({
      depth: 38,
      lithology: 60,
      construction: 120,
      description: 240,
    });
  });

  it('omits the description column when there are no annotations', () => {
    const positions = getColumnHeaderPositions({
      marginLeft: 0,
      geoXLeft: 0,
      geoXRight: 10,
      pocoCenterX: 20,
    });
    expect(positions.description).toBeUndefined();
  });
});

describe('getLithologyMarkers', () => {
  const lithology = [
    { from: 0, to: 12 },
    { from: 12, to: 455 },
    { from: 455, to: 615 },
  ];

  it('numbers layers by their position in the whole list', () => {
    expect(getLithologyMarkers(lithology, 300, 500)).toEqual([
      { index: 2, from: 300, to: 455 },
      { index: 3, from: 455, to: 500 },
    ]);
  });

  it('skips layers outside the window', () => {
    expect(getLithologyMarkers(lithology, 0, 12)).toEqual([
      { index: 1, from: 0, to: 12 },
    ]);
  });
});

describe('getFractureMarkers', () => {
  it('labels fractures inside [from, to) as F{n}', () => {
    const fractures = [{ depth: 50 }, { depth: 188 }, { depth: 300 }];
    expect(getFractureMarkers(fractures, 100, 300)).toEqual([
      { label: 'F2', depth: 188 },
    ]);
  });
});

describe('getOverviewGeometry', () => {
  it('maps the panel window onto the overview height', () => {
    const { y, window } = getOverviewGeometry(600, 300, 120, 300);
    expect(y(600)).toBe(300);
    expect(window).toEqual({ y: 60, height: 90 });
  });

  it('clamps depths to the overview', () => {
    const { y } = getOverviewGeometry(100, 50, 0, 100);
    expect(y(-5)).toBe(0);
    expect(y(150)).toBe(50);
  });
});

describe('formatOverlapLabel', () => {
  it('fills in the repeated range', () => {
    expect(
      formatOverlapLabel('{range} repetido da pág. anterior', '116–124 m'),
    ).toBe('116–124 m repetido da pág. anterior');
  });
});
