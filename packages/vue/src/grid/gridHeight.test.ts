import { describe, expect, it } from 'vitest';
import { gridHeight } from './gridHeight';

describe('gridHeight', () => {
  it('grows with its rows: header 38 + rows × 30 + 2', () => {
    expect(gridHeight(2)).toBe(100);
    expect(gridHeight(10)).toBe(340);
  });

  it('keeps room for one row when empty', () => {
    expect(gridHeight(0)).toBe(70);
  });

  it('stops at maxHeight', () => {
    expect(gridHeight(500, 420)).toBe(420);
    expect(gridHeight(2, 420)).toBe(100);
  });

  it('ignores an unset maxHeight', () => {
    expect(gridHeight(500)).toBe(15040);
  });
});
