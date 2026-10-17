// The dashboard's tile order on screen. The order changes the moment the grid reports a move and
// is never replaced by an older copy; saving to the account happens a moment later (tile-order-sync.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { announceMove, movedTile, reconcileOrder } from './dashboard-order';
import { createTileOrderSync } from './tile-order-sync';

export const SAVE_FAILED_MESSAGE = "Couldn't save your tile layout. Try again.";

interface Options {
  /** The order saved on the account. Read once, when the dashboard opens. */
  saved: readonly string[];
  save: (order: string[]) => Promise<void>;
  /** The accessible name of each tile, for the announcement after a move. */
  labelOf: (id: string) => string;
}

export function useTileOrder({ saved, save, labelOf }: Options) {
  const [order, setOrder] = useState(() => reconcileOrder(saved));
  const [announcement, setAnnouncement] = useState('');
  const orderRef = useRef(order);
  const saveRef = useRef(save);
  const labelRef = useRef(labelOf);
  useEffect(() => {
    saveRef.current = save;
    labelRef.current = labelOf;
  });

  const [sync] = useState(() =>
    createTileOrderSync({
      initial: order,
      save: (next) => saveRef.current(next),
      onFailed: (kept) => {
        // The server kept an older order, so show that one rather than a layout that will not survive a reload
        orderRef.current = kept;
        setOrder(kept);
        toast.error(SAVE_FAILED_MESSAGE);
      },
    }),
  );
  useEffect(() => () => sync.dispose(), [sync]);

  /** Called with the full new order each time the grid reports a move. */
  const change = useCallback(
    (next: string[]) => {
      const before = orderRef.current;
      orderRef.current = next;
      setOrder(next);
      const focused = document.activeElement?.closest('[data-widget-id]')?.getAttribute('data-widget-id');
      const moved = movedTile(before, next, focused);
      // A trailing space makes a repeated sentence a new message, so it is read out again
      if (moved) setAnnouncement((was) => announceMove(labelRef.current(moved), next, moved) + (was.endsWith(' ') ? '' : ' '));
      sync.change(next);
    },
    [sync],
  );

  return { order, change, flush: sync.flush, announcement };
}
