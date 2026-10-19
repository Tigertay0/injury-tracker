// A live prefers-reduced-motion value. Motion's own useReducedMotion reads the setting once, when it
// first runs, so a mounted button would ignore a change made in the OS while the app is open. This
// subscribes to the media query instead, through one shared listener however many buttons mount.
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

let query: MediaQueryList | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

function subscribe(listener: () => void) {
  query ??= window.matchMedia(QUERY);
  if (listeners.size === 0) query.addEventListener('change', notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) query?.removeEventListener('change', notify);
  };
}

// Reuses the subscribed query so a render never allocates a new MediaQueryList
const getSnapshot = () => (query ??= window.matchMedia(QUERY)).matches;

// Nothing renders on a server here, but the argument is required: assume motion is fine
const getServerSnapshot = () => false;

/** Exposed for the unit tests; components use usePrefersReducedMotion. */
export const reducedMotionStore = { subscribe, getSnapshot, getServerSnapshot };

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
