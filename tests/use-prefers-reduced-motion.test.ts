import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

/** A stand-in for window.matchMedia that can flip, the way an OS setting change does. */
function stubMatchMedia(initial: boolean) {
  const handlers = new Set<Listener>();
  const state = { matches: initial };
  const mql = {
    get matches() {
      return state.matches;
    },
    addEventListener: vi.fn((_type: string, handler: Listener) => handlers.add(handler)),
    removeEventListener: vi.fn((_type: string, handler: Listener) => handlers.delete(handler)),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal('window', { matchMedia });
  return {
    mql,
    matchMedia,
    handlers,
    flip(next: boolean) {
      state.matches = next;
      [...handlers].forEach((handler) => handler());
    },
  };
}

// The module keeps one shared listener, so each test loads a fresh copy against a fresh stub
async function loadStore() {
  vi.resetModules();
  const { reducedMotionStore } = await import('@/lib/use-prefers-reduced-motion');
  return reducedMotionStore;
}

describe('reducedMotionStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the current preference, and asks for the reduce query', async () => {
    const media = stubMatchMedia(true);
    const store = await loadStore();
    expect(store.getSnapshot()).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('follows a change made while subscribed', async () => {
    const media = stubMatchMedia(false);
    const store = await loadStore();
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    expect(store.getSnapshot()).toBe(false);
    media.flip(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(true);
    media.flip(false);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toBe(false);
    unsubscribe();
  });

  it('shares one media query listener across subscribers and removes it with the last one', async () => {
    const media = stubMatchMedia(false);
    const store = await loadStore();
    const a = vi.fn();
    const b = vi.fn();
    const offA = store.subscribe(a);
    const offB = store.subscribe(b);
    expect(media.mql.addEventListener).toHaveBeenCalledTimes(1);
    expect(media.mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    media.flip(true);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    expect(media.mql.removeEventListener).not.toHaveBeenCalled();
    media.flip(false);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    offB();
    expect(media.mql.removeEventListener).toHaveBeenCalledTimes(1);
    expect(media.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(media.handlers.size).toBe(0);
  });

  it('assumes motion is fine on a server', async () => {
    stubMatchMedia(true);
    const store = await loadStore();
    expect(store.getServerSnapshot()).toBe(false);
  });
});
