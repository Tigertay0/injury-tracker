// Wires the Plus status checks in plus-status.ts to Clerk, the account data and the router.
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@clerk/react';
import { toast } from 'sonner';
import { usePlayerData } from './player-data';
import {
  PLUS_MESSAGES,
  createPlusRunner,
  isPlusReturn,
  plusCheckState,
  readPlusCheck,
  startCheck,
  type PlusAnnouncement,
  type PlusCheck,
  type PlusIo,
} from './plus-status';

const PENDING_TOAST_MS = 12_000;

function announce(announcement: PlusAnnouncement) {
  // A fixed id per message, so a repeated effect run (React strict mode) shows it once
  const id = `plus-${announcement}`;
  const message = PLUS_MESSAGES[announcement];
  if (announcement === 'welcome') toast.success(message, { id });
  else if (announcement === 'refresh-failed') toast.error(message, { id });
  else toast(message, { id, duration: announcement === 'pending' ? PENDING_TOAST_MS : undefined });
}

/**
 * Keeps the account's Plus status current for the Plus card.
 * - After checkout (Clerk returns with ?plus=welcome) it refreshes up to three times, two seconds
 *   apart, stopping as soon as Plus shows up, and says how it ended.
 * - `checkAgain` makes one refresh for a player who is already subscribed.
 * - `refreshNow` makes one quiet refresh, for after a cancellation.
 */
export function usePlusStatus(plus: boolean) {
  const { getToken } = useAuth();
  const { actions } = usePlayerData();
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();

  const setCheck = useCallback(
    (check: PlusCheck | null) => {
      // preventScrollReset: this only keeps notes in the history entry, so the page must not jump
      navigate({ pathname, hash }, { replace: true, preventScrollReset: true, state: plusCheckState(check) });
    },
    [navigate, pathname, hash],
  );

  const freshToken = useCallback(async () => {
    try {
      // The cached session token can be a minute old, and only a new one carries the new plan
      await getToken({ skipCache: true });
      return true;
    } catch {
      return false;
    }
  }, [getToken]);

  const io = useMemo<PlusIo>(() => ({ announce, setCheck, freshToken, reload: actions.reload }), [setCheck, freshToken, actions.reload]);

  // Clerk's return query becomes a check in the history state, which also drops the query
  useEffect(() => {
    if (isPlusReturn(search)) setCheck(startCheck('checkout'));
  }, [search, setCheck]);

  const check = readPlusCheck(state);
  const runner = useMemo(() => createPlusRunner(io), [io]);
  // Depends on the state object, not the parsed check, which is a new object every render
  useEffect(() => runner.sync(plus, readPlusCheck(state)), [runner, plus, state]);

  const checkAgain = useCallback(() => setCheck(startCheck('manual')), [setCheck]);

  const refreshNow = useCallback(async () => {
    if (!(await freshToken())) {
      announce('refresh-failed');
      return;
    }
    await actions.reload();
  }, [freshToken, actions]);

  return { checking: check !== null && !plus, checkAgain, refreshNow };
}
