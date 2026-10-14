// Keeps "today" current while a screen stays open. A value computed once at mount
// goes stale when the app is left open past midnight, so screens read it from here.
import { useEffect, useState } from 'react';
import { localToday } from '@shared/dates';

const CHECK_MS = 60_000;

/**
 * Calls onChange with the new local date whenever the calendar day moves on from
 * `current`. Checks every minute (robust to sleep, DST and time zone changes) and
 * again when the tab becomes visible, since background timers are throttled.
 * Returns an unsubscribe function.
 */
export function watchLocalDay(onChange: (today: string) => void, current: string = localToday()): () => void {
  let last = current;
  const check = () => {
    const next = localToday();
    if (next !== last) {
      last = next;
      onChange(next);
    }
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  const timer = setInterval(check, CHECK_MS);
  const hasDocument = typeof document !== 'undefined';
  if (hasDocument) document.addEventListener('visibilitychange', onVisible);
  // The day may already have changed between render and subscribing
  check();
  return () => {
    clearInterval(timer);
    if (hasDocument) document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Today's local date (YYYY-MM-DD), updated when the day changes without a remount. */
export function useLocalToday(): string {
  const [today, setToday] = useState(localToday);
  useEffect(() => watchLocalDay(setToday, today), [today]);
  return today;
}
