import type { Well } from '@welldot/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileShare } from './useProfileShare';

const { getExportableWell } = vi.hoisted(() => ({
  getExportableWell: vi.fn(),
}));

vi.mock('~/stores/profile.store', () => ({
  useProfileStore: () => ({ getExportableWell }),
}));

vi.mock('~/stores/shareVisibility.store', () => ({
  useShareVisibilityStore: () => ({
    visibility: {
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
    },
  }),
}));

const nonEmptyWell = {
  version: 2,
  bore_hole: [{ top: 0, bottom: 1, diameter: 100 }],
  well_case: [],
  reduction: [],
  well_screen: [],
  surface_case: [],
  hole_fill: [],
  lithology: [],
  fractures: [],
  caves: [],
} as unknown as Well;

const fetchMock = vi.fn(async () => ({
  id: 'abc123',
  expiresAt: '2026-09-14T00:00:00.000Z',
}));

beforeEach(() => {
  vi.stubGlobal('$fetch', fetchMock);
  fetchMock.mockClear();
  getExportableWell.mockReset();
});

describe('useProfileShare', () => {
  it('returns null for an empty profile without calling $fetch', async () => {
    getExportableWell.mockReturnValue(null);

    const { getShare } = useProfileShare();
    const share = await getShare();

    expect(share).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls $fetch once on a cache miss and caches the result', async () => {
    getExportableWell.mockReturnValue(nonEmptyWell);

    const { getShare } = useProfileShare();
    const first = await getShare();
    const second = await getShare();

    expect(first).toEqual({
      id: 'abc123',
      expiresAt: '2026-09-14T00:00:00.000Z',
    });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips $fetch entirely on a cache hit from a fresh composable instance', async () => {
    getExportableWell.mockReturnValue(nonEmptyWell);

    await useProfileShare().getShare();
    fetchMock.mockClear();

    const share = await useProfileShare().getShare();

    expect(share?.id).toBe('abc123');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a distinct reason when the server rejects an oversized payload', async () => {
    // Distinct content (not shared with other cases) so this hits $fetch
    // instead of a cached result from an earlier test in this file.
    getExportableWell.mockReturnValue({
      ...nonEmptyWell,
      bore_hole: [{ top: 0, bottom: 1, diameter: 101 }],
    } as unknown as Well);
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('too large'), { statusCode: 413 }),
    );

    const { copyShareLink } = useProfileShare();
    const result = await copyShareLink();

    expect(result).toEqual({ ok: false, reason: 'tooLarge' });
  });

  it('falls back to a generic error reason for other failures', async () => {
    getExportableWell.mockReturnValue({
      ...nonEmptyWell,
      bore_hole: [{ top: 0, bottom: 1, diameter: 102 }],
    } as unknown as Well);
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { statusCode: 500 }),
    );

    const { copyShareLink } = useProfileShare();
    const result = await copyShareLink();

    expect(result).toEqual({ ok: false, reason: 'error' });
  });
});
