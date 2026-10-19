// The dashboard's tile order on screen. The order changes the moment the grid reports a move and
// is never replaced by an older copy; saving to the account happens a moment later (tile-order-sync.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { announceMove, movedTile, reconcileOrder } from './dashboard-order';
import { createTileOrderSync } from './tile-order-sync';

export const SAVE_FAILED_MESSAGE = "Couldn't save your tile layout. Try again.";
/** The layout has already gone back to the saved one, so the message stays long enough to read and to reach with the keyboard. */
export const SAVE_FAILED_DURATION_MS = 20_000;

interface Options {
  /** The order saved on the account. Read once, when the dashboard opens. */
  saved: readonly string[];
  save: (order: string[]) => Promise<void>;
  /** The accessible name of each tile, for the announcement after a move. */
  labelOf: (id: string) => string;
  /** Called after a refused save put the older order back, so the screen can redraw the tiles in that order. */
  onReverted?: () => void;
  /** While true, moves are not saved on a timer. They are saved together when `flush` runs (Done, leaving the page). */
  arranging: boolean;
}

export function useTileOrder({ saved, save, labelOf, onReverted, arranging }: Options) {
  const [order, setOrder] = useState(() => reconcileOrder(saved));
  const [announcement, setAnnouncement] = useState('');
  const orderRef = useRef(order);
  const saveRef = useRef(save);
  const labelRef = useRef(labelOf);
  const revertedRef = useRef(onReverted);
  const arrangingRef = useRef(arranging);
  useEffect(() => {
    saveRef.current = save;
    labelRef.current = labelOf;
    revertedRef.current = onReverted;
    arrangingRef.current = arranging;
  });

  const [sync] = useState(() =>
    createTileOrderSync({
      initial: order,
      save: (next) => saveRef.current(next),
      onFailed: (kept) => {
        // The server kept an older order, so show that one rather than a layout that will not survive a reload
        orderRef.current = kept;
        setOrder(kept);
        revertedRef.current?.();
        toast.error(SAVE_FAILED_MESSAGE, { duration: SAVE_FAILED_DURATION_MS });
      },
    }),
  );
  // Leaving the arrange mode saves whatever it left pending, including a move reported in the same render as Done
  useEffect(() => {
    if (!arranging) sync.flush();
  }, [arranging, sync]);
  // Leaving the page (closing the tab, switching app on a phone) must not lose a move made a moment ago
  useEffect(() => {
    const flush = () => sync.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') sync.flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      sync.dispose();
    };
  }, [sync]);

  /** Says something through the live region. A trailing space makes a repeated sentence a new message, so it is read out again. */
  const announce = useCallback((message: string) => setAnnouncement((was) => message + (was.endsWith(' ') ? '' : ' ')), []);

  /** Called with the full new order each time the grid reports a move, and the tile that was moved. */
  const change = useCallback(
    (next: string[], movedId?: string) => {
      const before = orderRef.current;
      orderRef.current = next;
      setOrder(next);
      const focused = document.activeElement?.closest('[data-widget-id]')?.getAttribute('data-widget-id');
      const moved = movedTile(before, next, movedId ?? focused);
      if (moved) announce(announceMove(labelRef.current(moved), next, moved));
      // Arranging can mean dozens of moves, and writes are rate limited: save once, on Done
      sync.change(next, { hold: arrangingRef.current });
    },
    [sync, announce],
  );

  const clearAnnouncement = useCallback(() => setAnnouncement(''), []);

  return { order, change, flush: sync.flush, announcement, announce, clearAnnouncement };
}
