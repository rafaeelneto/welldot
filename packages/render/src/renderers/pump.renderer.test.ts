import { describe, expect, it } from 'vitest';
import { getPumpSpans } from './pump.renderer';

describe('getPumpSpans', () => {
  it('draws the riser and body whole when they fit the panel', () => {
    expect(getPumpSpans(0, 500, 300, 322)).toEqual({
      riserBottom: 300,
      body: { top: 300, bottom: 322, cutTop: false, cutBottom: false },
    });
  });

  it('stops the riser at the panel bottom when the pump is on a later page', () => {
    expect(getPumpSpans(0, 500, 900, 922)).toEqual({
      riserBottom: 500,
      body: null,
    });
  });

  it('cuts a body that straddles the panel bottom', () => {
    expect(getPumpSpans(0, 500, 490, 512)).toEqual({
      riserBottom: 490,
      body: { top: 490, bottom: 500, cutTop: false, cutBottom: true },
    });
  });

  it('cuts a body that straddles the panel top, with no riser left', () => {
    expect(getPumpSpans(0, 500, -10, 12)).toEqual({
      riserBottom: 0,
      body: { top: 0, bottom: 12, cutTop: true, cutBottom: false },
    });
  });
});
