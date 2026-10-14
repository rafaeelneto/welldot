import { describe, expect, it } from 'vitest';
import { getPumpDiameters, getPumpSpans, getRiserTop } from './pump.renderer';

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

describe('getPumpDiameters', () => {
  const cfg = { bodyWidthRatio: 0.6, riserWidthRatio: 0.3 };

  it('keeps the body inside the casing at the intake, with a gap', () => {
    // A 152 mm riser in a 168 mm casing used to give a 213 mm body.
    const { body, riser } = getPumpDiameters(168, 168, 152, cfg);
    expect(body).toBeLessThan(168);
    expect(riser).toBeLessThan(body);
  });

  it('shrinks the riser to the narrowest pipe it hangs through', () => {
    const { riser } = getPumpDiameters(273, 100, 152, cfg);
    expect(riser).toBeCloseTo(70);
  });

  it('keeps a declared riser that fits', () => {
    expect(getPumpDiameters(219, 219, 60, cfg)).toEqual({
      riser: 60,
      body: 219 * 0.6,
    });
  });

  it('falls back to the configured ratios without a riser diameter', () => {
    const { riser, body } = getPumpDiameters(200, 200, undefined, cfg);
    expect(riser).toBeCloseTo(60);
    expect(body).toBeCloseTo(120);
  });
});

describe('getRiserTop', () => {
  it('ends the riser on a break line at the wellhead', () => {
    expect(getRiserTop(0, 6, 10, true)).toEqual({
      edge: 'L2,8L4,12L6,10',
      breakLine: 'M0,10L2,8L4,12L6,10',
    });
  });

  it('leaves a plain open top at a panel cut', () => {
    expect(getRiserTop(0, 6, 10, false)).toEqual({
      edge: 'H6',
      breakLine: '',
    });
  });
});
