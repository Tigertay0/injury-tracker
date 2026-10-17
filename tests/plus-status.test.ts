import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECKOUT_ATTEMPTS,
  PLUS_MESSAGES,
  PLUS_RETURN_URL,
  RETRY_GAP_MS,
  createPlusRunner,
  isPlusReturn,
  nextStep,
  plusCheckState,
  readPlusCheck,
  runStep,
  startCheck,
  type PlusAnnouncement,
  type PlusCheck,
  type PlusIo,
} from '../src/lib/plus-status';

describe('return from checkout', () => {
  it('recognises the query Clerk comes back with, and nothing else', () => {
    expect(isPlusReturn('?plus=welcome')).toBe(true);
    expect(isPlusReturn('?a=1&plus=welcome')).toBe(true);
    expect(isPlusReturn('')).toBe(false);
    expect(isPlusReturn('?plus=1')).toBe(false);
    expect(isPlusReturn('?plus=')).toBe(false);
  });

  it('sends Clerk back to the Plus card on Settings', () => {
    expect(PLUS_RETURN_URL).toBe('/app/settings?plus=welcome#plus');
  });
});

describe('check state in the history entry', () => {
  it('starts a checkout check with three refreshes and a manual one with one', () => {
    expect(startCheck('checkout')).toEqual({ kind: 'checkout', done: 0, max: 3 });
    expect(startCheck('manual')).toEqual({ kind: 'manual', done: 0, max: 1 });
  });

  it('round-trips through history state and clears with null', () => {
    const check = { kind: 'checkout', done: 2, max: 3 } as const;
    expect(readPlusCheck(plusCheckState(check))).toEqual(check);
    expect(plusCheckState(null)).toBeNull();
    expect(readPlusCheck(plusCheckState(null))).toBeNull();
  });

  it('ignores state that is not one of its own', () => {
    const bad: unknown[] = [
      undefined,
      'plusCheck',
      {},
      { plusCheck: null },
      { plusCheck: 'x' },
      { plusCheck: { kind: 'other', done: 0, max: 1 } },
      { plusCheck: { kind: 'manual', done: -1, max: 1 } },
      { plusCheck: { kind: 'manual', done: 0.5, max: 1 } },
      { plusCheck: { kind: 'manual', done: '0', max: 1 } },
      { plusCheck: { kind: 'checkout', done: 0, max: 50 } },
      { plusWelcome: true },
    ];
    for (const state of bad) expect(readPlusCheck(state)).toBeNull();
  });
});

describe('nextStep', () => {
  it('does nothing without a check', () => {
    expect(nextStep(false, null)).toEqual({ type: 'idle' });
    expect(nextStep(true, null)).toEqual({ type: 'idle' });
  });

  it('welcomes the player as soon as Plus shows up, whatever attempt it is', () => {
    expect(nextStep(true, startCheck('checkout'))).toEqual({ type: 'announce', announcement: 'welcome' });
    expect(nextStep(true, { kind: 'checkout', done: 3, max: 3 })).toEqual({ type: 'announce', announcement: 'welcome' });
    expect(nextStep(true, startCheck('manual'))).toEqual({ type: 'announce', announcement: 'welcome' });
  });

  it('refreshes at once the first time, then waits between attempts', () => {
    expect(nextStep(false, startCheck('checkout'))).toEqual({ type: 'refresh', delayMs: 0, next: { kind: 'checkout', done: 1, max: 3 } });
    expect(nextStep(false, { kind: 'checkout', done: 1, max: 3 })).toEqual({ type: 'refresh', delayMs: RETRY_GAP_MS, next: { kind: 'checkout', done: 2, max: 3 } });
    expect(nextStep(false, { kind: 'checkout', done: 2, max: 3 })).toEqual({ type: 'refresh', delayMs: RETRY_GAP_MS, next: { kind: 'checkout', done: 3, max: 3 } });
  });

  it('gives up with the right message once the attempts are used', () => {
    expect(nextStep(false, { kind: 'checkout', done: 3, max: 3 })).toEqual({ type: 'announce', announcement: 'pending' });
    expect(nextStep(false, { kind: 'manual', done: 1, max: 1 })).toEqual({ type: 'announce', announcement: 'still-free' });
  });

  it('says what the player needs to hear', () => {
    expect(PLUS_MESSAGES.pending).toBe('Your payment went through. Plus can take a minute to turn on. Use Check again below, or reload this page.');
    expect(PLUS_MESSAGES['still-free']).toBe('Still on the free plan.');
    expect(PLUS_MESSAGES.welcome).toBe('Welcome to PitchSafe Plus');
  });
});

function makeIo(overrides: Partial<PlusIo> = {}) {
  const io = {
    announce: vi.fn<(a: PlusAnnouncement) => void>(),
    setCheck: vi.fn<(c: PlusCheck | null) => void>(),
    freshToken: vi.fn(async () => true),
    reload: vi.fn(async () => undefined),
    ...overrides,
  };
  return io;
}

describe('runStep', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces and clears the check in one go', () => {
    const io = makeIo();
    runStep({ type: 'announce', announcement: 'welcome' }, io);
    expect(io.announce).toHaveBeenCalledExactlyOnceWith('welcome');
    expect(io.setCheck).toHaveBeenCalledExactlyOnceWith(null);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing when idle', () => {
    const io = makeIo();
    runStep({ type: 'idle' }, io)();
    expect(io.announce).not.toHaveBeenCalled();
    expect(io.setCheck).not.toHaveBeenCalled();
  });

  it('waits out the delay, then gets a fresh token, records the attempt and reloads, in that order', async () => {
    const calls: string[] = [];
    const io = makeIo({
      freshToken: vi.fn(async () => {
        calls.push('token');
        return true;
      }),
      setCheck: vi.fn((c) => calls.push(`set:${c?.done}`)),
      reload: vi.fn(async () => void calls.push('reload')),
    });
    const next = { kind: 'checkout', done: 2, max: 3 } as const;
    runStep({ type: 'refresh', delayMs: RETRY_GAP_MS, next }, io);
    await vi.advanceTimersByTimeAsync(RETRY_GAP_MS - 1);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['token', 'set:2', 'reload']);
  });

  it('never starts a refresh that was cancelled, and leaves no timer behind', async () => {
    const io = makeIo();
    const cancel = runStep({ type: 'refresh', delayMs: RETRY_GAP_MS, next: startCheck('checkout') }, io);
    cancel();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10 * RETRY_GAP_MS);
    expect(io.freshToken).not.toHaveBeenCalled();
    expect(io.reload).not.toHaveBeenCalled();
  });

  it('refreshes once when the effect runs twice (strict mode: run, clean up, run)', async () => {
    const io = makeIo();
    const step = { type: 'refresh', delayMs: 0, next: { kind: 'checkout', done: 1, max: 3 } } as const;
    runStep(step, io)();
    runStep(step, io);
    await vi.advanceTimersByTimeAsync(RETRY_GAP_MS);
    expect(io.freshToken).toHaveBeenCalledTimes(1);
    expect(io.reload).toHaveBeenCalledTimes(1);
  });

  it('reports a token that could not be refreshed and stops', async () => {
    const io = makeIo({ freshToken: vi.fn(async () => false) });
    runStep({ type: 'refresh', delayMs: 0, next: startCheck('checkout') }, io);
    await vi.advanceTimersByTimeAsync(0);
    expect(io.announce).toHaveBeenCalledExactlyOnceWith('refresh-failed');
    expect(io.setCheck).toHaveBeenCalledExactlyOnceWith(null);
    expect(io.reload).not.toHaveBeenCalled();
  });

  it('writes nothing if the page is left while the token is being fetched', async () => {
    let finishToken: (ok: boolean) => void = () => undefined;
    const io = makeIo({ freshToken: vi.fn(() => new Promise<boolean>((resolve) => (finishToken = resolve))) });
    const cancel = runStep({ type: 'refresh', delayMs: 0, next: startCheck('checkout') }, io);
    await vi.advanceTimersByTimeAsync(0);
    expect(io.freshToken).toHaveBeenCalledTimes(1);
    cancel();
    finishToken(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(io.setCheck).not.toHaveBeenCalled();
    expect(io.reload).not.toHaveBeenCalled();
    expect(io.announce).not.toHaveBeenCalled();
  });
});

describe('createPlusRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ignores a re-run while a refresh is under way, so the last attempt is not judged on the old account', async () => {
    const io = makeIo();
    const runner = createPlusRunner(io);
    runner.sync(false, startCheck('checkout'));
    await vi.advanceTimersByTimeAsync(0);
    expect(io.reload).toHaveBeenCalledTimes(1);
    // What the page does when the check state is rewritten just before the reload
    const lastAttempt = { kind: 'checkout', done: 3, max: 3 } as const;
    runner.sync(false, lastAttempt)();
    expect(io.announce).not.toHaveBeenCalled();
    expect(io.setCheck).toHaveBeenCalledTimes(1);
  });

  it('works again after a token failure, which leaves the page mounted', async () => {
    const io = makeIo({ freshToken: vi.fn(async () => false) });
    const runner = createPlusRunner(io);
    runner.sync(false, startCheck('manual'));
    await vi.advanceTimersByTimeAsync(0);
    expect(io.announce).toHaveBeenCalledExactlyOnceWith('refresh-failed');
    runner.sync(false, { kind: 'manual', done: 1, max: 1 });
    expect(io.announce).toHaveBeenLastCalledWith('still-free');
  });
});

/**
 * Plays the part of the Settings page: every reload unmounts it and mounts a new one (new
 * runner), and every change to the history state re-runs its effect. `plusAfter` is the
 * reload number after which the account shows Plus (null: never).
 */
function playPage(start: PlusCheck, plusAfter: number | null) {
  const t0 = Date.now();
  const reloadTimes: number[] = [];
  const announced: PlusAnnouncement[] = [];
  const page = { plus: false, check: start as PlusCheck | null };
  let runner = createPlusRunner(io());
  let cancel = () => {};
  const effect = () => {
    cancel();
    cancel = runner.sync(page.plus, page.check);
  };
  function io(): PlusIo {
    return {
      announce: (a) => announced.push(a),
      setCheck: (c) => {
        page.check = c;
        effect();
      },
      freshToken: async () => true,
      reload: async () => {
        reloadTimes.push(Date.now() - t0);
        cancel();
        await Promise.resolve();
        if (plusAfter !== null && reloadTimes.length >= plusAfter) page.plus = true;
        runner = createPlusRunner(io());
        effect();
      },
    };
  }
  effect();
  return { page, reloadTimes, announced, stop: () => cancel() };
}

describe('a whole check, as the page remounts around it', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('after checkout, tries three times two seconds apart, then says the payment went through', async () => {
    const run = playPage(startCheck('checkout'), null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0, RETRY_GAP_MS, 2 * RETRY_GAP_MS]);
    expect(run.reloadTimes).toHaveLength(CHECKOUT_ATTEMPTS);
    expect(run.announced).toEqual(['pending']);
    expect(run.page.check).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('welcomes a plan that only comes through on the last attempt, rather than giving up early', async () => {
    const run = playPage(startCheck('checkout'), 3);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0, RETRY_GAP_MS, 2 * RETRY_GAP_MS]);
    expect(run.announced).toEqual(['welcome']);
  });

  it('stops as soon as Plus shows up and welcomes the player once', async () => {
    const run = playPage(startCheck('checkout'), 2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0, RETRY_GAP_MS]);
    expect(run.announced).toEqual(['welcome']);
    expect(run.page.check).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('welcomes at the first refresh when the plan is already through', async () => {
    const run = playPage(startCheck('checkout'), 1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0]);
    expect(run.announced).toEqual(['welcome']);
  });

  it('a manual check refreshes once and reports a plan that is still free', async () => {
    const run = playPage(startCheck('manual'), null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0]);
    expect(run.announced).toEqual(['still-free']);
    expect(run.page.check).toBeNull();
  });

  it('a manual check welcomes a player whose plan has come through', async () => {
    const run = playPage(startCheck('manual'), 1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.announced).toEqual(['welcome']);
  });

  it('leaves no timer running when the player leaves the page between attempts', async () => {
    const run = playPage(startCheck('checkout'), null);
    await vi.advanceTimersByTimeAsync(RETRY_GAP_MS / 2);
    run.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run.reloadTimes).toEqual([0]);
    expect(run.announced).toEqual([]);
  });
});
