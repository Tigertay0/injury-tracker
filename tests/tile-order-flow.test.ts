// The client's save path as the dashboard wires it: the arrange-mode timing in tile-order-sync, over the
// serial queue and revert in order-saver, over a fake server. Each layer keeps its own idea of the last order
// the server kept, so this pins that they agree about what to show after a refusal.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrderSaver } from '@/lib/order-saver';
import { createTileOrderSync, SAVE_DELAY_MS } from '@/app/tile-order-sync';

const SAVED = ['score', 'load', 'report', 'fuel'];
const B = ['load', 'score', 'report', 'fuel'];
const C = ['report', 'load', 'score', 'fuel'];
const D = ['fuel', 'report', 'load', 'score'];

/** A screen, an account and a server that answers each request as the test says. */
function setup(initial: string[] = SAVED) {
  const state = {
    screen: [...initial],
    stored: [...initial],
    requests: [] as string[][],
    answers: [] as { order: string[]; ok: () => void; refuse: (status?: number) => void }[],
    failures: [] as string[][],
  };
  const saver = createOrderSaver();
  const ports = {
    read: () => state.screen,
    show: (order: string[]) => {
      state.screen = order;
    },
    send: (order: string[]) =>
      new Promise<string[]>((resolve, reject) => {
        state.requests.push(order);
        state.answers.push({
          order,
          ok: () => {
            state.stored = order;
            resolve(order);
          },
          refuse: (status = 500) => reject(new Error('HTTP ' + status)),
        });
      }),
  };
  const sync = createTileOrderSync({
    initial,
    save: (order) => saver.save(order, ports),
    // What the dashboard's hook does: take the kept order back onto the screen
    onFailed: (kept) => {
      state.failures.push(kept);
      state.screen = kept;
    },
  });
  /** The grid reports a move: it is on screen at once, and the sync decides when to save. */
  const move = (order: string[], hold = false) => {
    state.screen = order;
    sync.change(order, { hold });
  };
  return { state, sync, move };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('tile order: sync over saver over server', () => {
  it('a refused save goes back to the last confirmed order, and a later save that succeeds sticks', async () => {
    const { state, sync, move } = setup();
    move(B);
    sync.flush();
    await settle();
    state.answers[0].refuse();
    await settle();
    expect(state.screen).toEqual(SAVED);
    expect(state.stored).toEqual(SAVED);
    expect(state.failures).toEqual([SAVED]);

    move(C);
    sync.flush();
    await settle();
    state.answers[1].ok();
    await settle();
    expect(state.screen).toEqual(C);
    expect(state.stored).toEqual(C);
    expect(state.failures).toHaveLength(1);
  });

  it('after a good save, a refusal goes back to that saved order, not to the one the page opened with', async () => {
    const { state, sync, move } = setup();
    move(B);
    sync.flush();
    await settle();
    state.answers[0].ok();
    await settle();
    move(C);
    sync.flush();
    await settle();
    state.answers[1].refuse(429);
    await settle();
    expect(state.screen).toEqual(B);
    expect(state.stored).toEqual(B);
    expect(state.failures).toEqual([B]);
  });

  it('a refusal of the older of two saves is left to the newer one, which then decides what stays', async () => {
    const { state, sync, move } = setup();
    move(B);
    sync.flush();
    await settle();
    move(C);
    sync.flush();
    await settle();
    // Requests go one at a time: the second is only sent once the first has been answered
    expect(state.requests).toEqual([B]);
    state.answers[0].refuse();
    await settle();
    expect(state.failures).toEqual([]);
    expect(state.requests).toEqual([B, C]);
    state.answers[1].ok();
    await settle();
    expect(state.screen).toEqual(C);
    expect(state.stored).toEqual(C);
  });

  it('when every save is refused the screen ends on the original order and nothing is stored', async () => {
    const { state, sync, move } = setup();
    for (const order of [B, C, D]) {
      move(order);
      sync.flush();
      await settle();
      state.answers[state.answers.length - 1].refuse();
      await settle();
      expect(state.screen).toEqual(SAVED);
    }
    expect(state.stored).toEqual(SAVED);
    expect(state.failures).toHaveLength(3);
  });

  it('an arrangement of 40 moves is one request on Done, and a refusal then reverts the whole arrangement', async () => {
    const { state, sync, move } = setup();
    const orders = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? B : i % 3 === 1 ? C : D));
    for (const order of orders) {
      move(order, true);
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(state.requests).toHaveLength(0);
    expect(state.screen).toEqual(orders[39]);

    sync.flush(); // Done
    await settle();
    expect(state.requests).toEqual([orders[39]]);
    state.answers[0].refuse(429);
    await settle();
    expect(state.screen).toEqual(SAVED);
    expect(state.failures).toEqual([SAVED]);
  });

  it('an arrangement saved on Done stays, and a move made outside the arrange mode goes back to the debounce', async () => {
    const { state, sync, move } = setup();
    move(B, true);
    move(C, true);
    sync.flush();
    await settle();
    state.answers[0].ok();
    await settle();
    expect(state.stored).toEqual(C);

    move(D);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(state.requests).toEqual([C, D]);
    state.answers[1].ok();
    await settle();
    expect(state.stored).toEqual(D);
    expect(state.screen).toEqual(D);
  });
});
