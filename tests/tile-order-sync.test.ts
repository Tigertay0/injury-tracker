import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTileOrderSync, SAVE_DELAY_MS } from '@/app/tile-order-sync';

const A = ['score', 'load', 'report'];
const B = ['load', 'score', 'report'];
const C = ['report', 'load', 'score'];

/** A save that the test settles by hand. */
function fakeSave() {
  const calls: { order: string[]; resolve: () => void; reject: (err: Error) => void }[] = [];
  const save = vi.fn(
    (order: string[]) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ order, resolve, reject });
      }),
  );
  return { save, calls };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createTileOrderSync', () => {
  it('waits for the player to stop before saving', async () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    sync.change(B);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS - 1);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(B);
  });

  it('saves a burst of moves once, with the last order', async () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    sync.change(B);
    await vi.advanceTimersByTimeAsync(400);
    sync.change(C);
    await vi.advanceTimersByTimeAsync(400);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(C);
  });

  it('flush saves at once and nothing is saved twice', async () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    sync.change(B);
    sync.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS * 2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush does nothing when there is nothing to save', () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    sync.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('dispose saves a pending change so leaving the screen does not lose it', () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    sync.change(B);
    sync.dispose();
    expect(save).toHaveBeenCalledWith(B);
  });

  it('sends a copy, so later edits to the caller list change nothing', async () => {
    const { save } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    const moved = [...B];
    sync.change(moved);
    moved.reverse();
    sync.flush();
    expect(save).toHaveBeenCalledWith(B);
  });

  it('reports a refusal with the last order that was kept', async () => {
    const { save, calls } = fakeSave();
    const onFailed = vi.fn();
    const sync = createTileOrderSync({ initial: A, save, onFailed });
    sync.change(B);
    sync.flush();
    calls[0].reject(new Error('refused'));
    await settle();
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(A);
  });

  it('after a good save, a later refusal goes back to that saved order', async () => {
    const { save, calls } = fakeSave();
    const onFailed = vi.fn();
    const sync = createTileOrderSync({ initial: A, save, onFailed });
    sync.change(B);
    sync.flush();
    calls[0].resolve();
    await settle();
    sync.change(C);
    sync.flush();
    calls[1].reject(new Error('offline'));
    await settle();
    expect(onFailed).toHaveBeenCalledWith(B);
  });

  it('stays quiet about an older refusal when the player has moved on, and never echoes an old order', async () => {
    const { save, calls } = fakeSave();
    const onFailed = vi.fn();
    const sync = createTileOrderSync({ initial: A, save, onFailed });
    sync.change(B);
    sync.flush();
    sync.change(C); // a newer move made while the first save is still on its way
    calls[0].reject(new Error('refused'));
    await settle();
    expect(onFailed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(save).toHaveBeenLastCalledWith(C);
  });

  it('does not throw an unhandled rejection when a save fails', async () => {
    const { save, calls } = fakeSave();
    const sync = createTileOrderSync({ initial: A, save, onFailed: vi.fn() });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    sync.change(B);
    sync.flush();
    calls[0].reject(new Error('refused'));
    await settle();
    await vi.advanceTimersByTimeAsync(10);
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('survives a save that throws before returning a promise', async () => {
    const onFailed = vi.fn();
    const sync = createTileOrderSync({
      initial: A,
      save: () => {
        throw new Error('boom');
      },
      onFailed,
    });
    sync.change(B);
    expect(() => sync.flush()).not.toThrow();
    await settle();
    expect(onFailed).toHaveBeenCalledWith(A);
  });
});
