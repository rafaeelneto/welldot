import { describe, expect, it } from 'vitest';
import {
  compareFormatVersions,
  parseFormatVersion,
  WELL_FORMAT_VERSION,
} from './version.utils';

describe('format version', () => {
  it('is 2.4', () => {
    expect(WELL_FORMAT_VERSION).toBe('2.4');
  });
  it('parses integers and M.m strings', () => {
    expect(parseFormatVersion(1)).toEqual({ major: 1, minor: undefined });
    expect(parseFormatVersion(2)).toEqual({ major: 2, minor: undefined });
    expect(parseFormatVersion('2.4')).toEqual({ major: 2, minor: 4 });
    expect(parseFormatVersion('2.10')).toEqual({ major: 2, minor: 10 });
  });
  it('rejects malformed versions', () => {
    for (const v of [2.4, '2.4.1', 'v2.4', '2', '', null, -1, 1.5])
      expect(parseFormatVersion(v)).toBeUndefined();
  });
  it('compares as two integers', () => {
    expect(compareFormatVersions('2.10', '2.9')).toBeGreaterThan(0);
    expect(compareFormatVersions('2.4', '2.4')).toBe(0);
    expect(compareFormatVersions('2.4', '3.0')).toBeLessThan(0);
  });
});
