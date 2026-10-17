// Keeping the player's Plus status in step with Clerk billing. After checkout the new plan can
// take a moment to reach the session token, so the account is refreshed a few times. Reloading
// the account swaps the whole page for a skeleton, so the progress lives in the history entry's
// state, which survives that remount. This file is plain logic: the hook that wires it to React,
// Clerk and the router is use-plus-status.ts.

/** Clerk returns the player to Settings with this query after checkout. */
export const PLUS_RETURN_PARAM = 'plus';
const PLUS_RETURN_VALUE = 'welcome';
export const PLUS_RETURN_URL = `/app/settings?${PLUS_RETURN_PARAM}=${PLUS_RETURN_VALUE}#plus`;

export const CHECKOUT_ATTEMPTS = 3;
export const MANUAL_ATTEMPTS = 1;
export const RETRY_GAP_MS = 2000;

export type PlusCheckKind = 'checkout' | 'manual';

export interface PlusCheck {
  kind: PlusCheckKind;
  /** Refreshes started so far. */
  done: number;
  /** Refreshes allowed in all. */
  max: number;
}

export type PlusAnnouncement = 'welcome' | 'pending' | 'still-free' | 'refresh-failed';

export const PLUS_MESSAGES: Record<PlusAnnouncement, string> = {
  welcome: 'Welcome to PitchSafe Plus',
  pending: 'Your payment went through. Plus can take a minute to turn on. Use Check again below, or reload this page.',
  'still-free': 'Still on the free plan.',
  'refresh-failed': "We couldn't refresh your plan. Check your connection, then use Check again.",
};

export type PlusStep =
  | { type: 'idle' }
  | { type: 'announce'; announcement: Exclude<PlusAnnouncement, 'refresh-failed'> }
  | { type: 'refresh'; delayMs: number; next: PlusCheck };

export function isPlusReturn(search: string): boolean {
  return new URLSearchParams(search).get(PLUS_RETURN_PARAM) === PLUS_RETURN_VALUE;
}

export function startCheck(kind: PlusCheckKind): PlusCheck {
  return { kind, done: 0, max: kind === 'checkout' ? CHECKOUT_ATTEMPTS : MANUAL_ATTEMPTS };
}

/** What goes in the history entry's state. A check is the only thing stored there. */
export function plusCheckState(check: PlusCheck | null): { plusCheck: PlusCheck } | null {
  return check && { plusCheck: check };
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** Reads a check back out of history state, ignoring anything that is not one of ours. */
export function readPlusCheck(state: unknown): PlusCheck | null {
  if (typeof state !== 'object' || state === null || !('plusCheck' in state)) return null;
  const raw = state.plusCheck;
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, done, max } = raw as Record<string, unknown>;
  if (kind !== 'checkout' && kind !== 'manual') return null;
  // The cap keeps a hand-edited state from turning into an endless refresh loop
  if (!isCount(done) || !isCount(max) || max > CHECKOUT_ATTEMPTS) return null;
  return { kind, done, max };
}

/** The next thing to do, given whether the account now has Plus and the check in progress. */
export function nextStep(plus: boolean, check: PlusCheck | null): PlusStep {
  if (!check) return { type: 'idle' };
  if (plus) return { type: 'announce', announcement: 'welcome' };
  if (check.done >= check.max) return { type: 'announce', announcement: check.kind === 'checkout' ? 'pending' : 'still-free' };
  return { type: 'refresh', delayMs: check.done === 0 ? 0 : RETRY_GAP_MS, next: { ...check, done: check.done + 1 } };
}

export interface PlusIo {
  announce(announcement: PlusAnnouncement): void;
  /** Writes the check to history state; null clears it. */
  setCheck(check: PlusCheck | null): void;
  /** Gets a fresh session token, which carries the changed features. False when that failed. */
  freshToken(): Promise<boolean>;
  /** Reloads the account, which remounts the page. */
  reload(): Promise<void>;
}

/**
 * Carries out one step. Returns a cancel function for the effect cleanup: after it runs, a
 * pending refresh never starts, and a refresh already under way writes nothing more.
 */
export function runStep(step: PlusStep, io: PlusIo): () => void {
  if (step.type === 'idle') return () => undefined;
  if (step.type === 'announce') {
    io.announce(step.announcement);
    io.setCheck(null);
    return () => undefined;
  }
  let cancelled = false;
  const timer = setTimeout(async () => {
    const fresh = await io.freshToken();
    if (cancelled) return;
    if (!fresh) {
      io.announce('refresh-failed');
      io.setCheck(null);
      return;
    }
    // Written before the reload, because the reload remounts the page
    io.setCheck(step.next);
    await io.reload();
  }, step.delayMs);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/**
 * One per mounted page. While a refresh is under way, the check state is rewritten (so the
 * attempt count survives the remount) before the reload lands; running the steps again then
 * would judge the old account and announce too early. So `sync` does nothing until the reload
 * has remounted the page, which makes a fresh runner.
 */
export function createPlusRunner(io: PlusIo) {
  let refreshing = false;
  const guarded: PlusIo = {
    ...io,
    async freshToken() {
      refreshing = true;
      const fresh = await io.freshToken();
      if (!fresh) refreshing = false;
      return fresh;
    },
  };
  return {
    /** Carries out the next step for this account and check. Returns the effect cleanup. */
    sync(plus: boolean, check: PlusCheck | null): () => void {
      if (refreshing) return () => undefined;
      return runStep(nextStep(plus, check), guarded);
    },
  };
}
