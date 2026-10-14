import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localToday } from '../shared/dates';
import { watchLocalDay } from '../src/lib/use-local-today';

describe('watchLocalDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Local time, so the rollover happens at the device's midnight
    vi.setSystemTime(new Date(2026, 9, 14, 23, 58, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('reports the new day once local midnight passes, without a remount', () => {
    const onChange = vi.fn();
    const stop = watchLocalDay(onChange);
    vi.advanceTimersByTime(60_000);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60_000);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-10-15');
    vi.advanceTimersByTime(10 * 60_000);
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it('catches a day that changed before it subscribed', () => {
    const onChange = vi.fn();
    const stale = localToday();
    vi.setSystemTime(new Date(2026, 9, 15, 0, 5, 0));
    const stop = watchLocalDay(onChange, stale);
    expect(onChange).toHaveBeenCalledWith('2026-10-15');
    stop();
  });

  it('stops checking after unsubscribe', () => {
    const onChange = vi.fn();
    watchLocalDay(onChange)();
    vi.advanceTimersByTime(24 * 60 * 60_000);
    expect(onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
