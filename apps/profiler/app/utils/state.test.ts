import { describe, expect, it, vi } from 'vitest';
import { makeDeepProxy } from './state';

// ─── makeDeepProxy ───────────────────────────────────────────────────────────

describe('makeDeepProxy', () => {
  // ── get ──────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns primitive values as-is', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ name: 'test', depth: 42 }, [], updater);
      expect(proxy.name).toBe('test');
      expect(proxy.depth).toBe(42);
    });

    it('returns null as-is (not wrapped in a proxy)', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy(
        { value: null } as { value: null | object },
        [],
        updater,
      );
      expect(proxy.value).toBeNull();
    });

    it('wraps nested objects in a proxy', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ nested: { x: 1 } }, [], updater);
      proxy.nested.x = 99;
      expect(updater).toHaveBeenCalledOnce();
    });

    it('wraps nested arrays in a proxy', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ items: [{ v: 1 }, { v: 2 }] }, [], updater);
      proxy.items[0].v = 99;
      expect(updater).toHaveBeenCalledOnce();
    });

    it('passes Symbol keys through without proxying', () => {
      const sym = Symbol('test');
      const target = { [sym]: 'symbol-value', name: 'x' } as any;
      const proxy = makeDeepProxy(target, [], vi.fn());
      expect(proxy[sym]).toBe('symbol-value');
    });
  });

  // ── set ──────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('calls updater when a top-level property is set', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ name: 'old' }, [], updater);
      proxy.name = 'new';
      expect(updater).toHaveBeenCalledOnce();
    });

    it('does not call updater on a Symbol set', () => {
      const sym = Symbol('test');
      const updater = vi.fn();
      const proxy = makeDeepProxy({} as any, [], updater);
      const result = (proxy as any)[sym];
      expect(updater).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('recipe navigates and sets the correct top-level path', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ name: 'old' }, [], updater);
      proxy.name = 'São João';

      const draft = { name: 'old' };
      const [recipe] = updater.mock.calls[0]!;
      recipe(draft);
      expect(draft.name).toBe('São João');
    });

    it('recipe navigates and sets a nested property path', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ location: { city: 'A' } }, [], updater);
      proxy.location.city = 'B';

      const draft = { location: { city: 'A' } };
      const [recipe] = updater.mock.calls[0]!;
      recipe(draft);
      expect(draft.location.city).toBe('B');
    });

    it('recipe navigates array index then nested property', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy(
        { events: [{ steps: { level: 0 } }] },
        [],
        updater,
      );
      proxy.events[0].steps.level = 12.3;

      const draft = { events: [{ steps: { level: 0 } }] };
      const [recipe] = updater.mock.calls[0]!;
      recipe(draft);
      expect(draft.events[0].steps.level).toBe(12.3);
    });

    it('each assignment triggers a separate updater call', () => {
      const updater = vi.fn();
      const proxy = makeDeepProxy({ a: 1, b: 2 }, [], updater);
      proxy.a = 10;
      proxy.b = 20;
      expect(updater).toHaveBeenCalledTimes(2);
    });

    it('works when the proxy itself starts at a non-root path', () => {
      const updater = vi.fn();
      // Simulates a nested proxy returned from a parent get
      const proxy = makeDeepProxy(
        { level: 0 },
        ['events', 0, 'steps'],
        updater,
      );
      proxy.level = 99;

      const draft = { events: [{ steps: { level: 0 } }] };
      const [recipe] = updater.mock.calls[0]!;
      recipe(draft);
      expect(draft.events[0].steps.level).toBe(99);
    });
  });
});
