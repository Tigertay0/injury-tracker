// Sends the dashboard's tile order to the server. Outside the arrange mode a move is saved a moment after
// the player stops moving tiles. While arranging nothing is saved on a timer: keyboard moves come in long
// runs and writes are rate limited (30 a minute), so the whole arrangement is saved once, when the player
// presses Done or leaves the page.
// It knows nothing about React or the screen: the screen shows each move at once, and this decides
// when to save and what to put back if the server refuses.

/** How long after the last move the order is saved. */
export const SAVE_DELAY_MS = 600;

export interface TileOrderSyncOptions {
  /** The order the server holds now. */
  initial: readonly string[];
  /** Stores a full order. Rejects when the server refuses it. */
  save: (order: string[]) => Promise<void>;
  /**
   * Called when the newest save was refused, with the last order the server kept, so the screen can
   * go back to it. An older save that fails after a newer move is not reported: the newer save sends
   * the full order and answers for it.
   */
  onFailed: (keptOrder: string[], cause: unknown) => void;
  delayMs?: number;
}

export interface TileOrderSync {
  /**
   * A new order is on screen. Saved after the delay unless another move comes first. With `hold` it is
   * not saved on a timer at all, only when `flush` runs (Done, the page being hidden, the screen going away).
   */
  change: (order: readonly string[], options?: { hold?: boolean }) => void;
  /** Save a pending order now. */
  flush: () => void;
  /** The screen is going away: save anything pending. */
  dispose: () => void;
}

export function createTileOrderSync({ initial, save, onFailed, delayMs = SAVE_DELAY_MS }: TileOrderSyncOptions): TileOrderSync {
  let kept = [...initial];
  let latest = [...initial];
  let version = 0;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    pending = false;
    const sent = [...latest];
    const sentVersion = version;
    let request: Promise<void>;
    try {
      request = save(sent);
    } catch (err) {
      request = Promise.reject(err);
    }
    request.then(
      () => {
        kept = sent;
      },
      (err: unknown) => {
        if (version === sentVersion) onFailed([...kept], err);
      },
    );
  };

  return {
    change(order, options) {
      latest = [...order];
      version += 1;
      pending = true;
      clearTimeout(timer);
      timer = options?.hold ? undefined : setTimeout(flush, delayMs);
    },
    flush,
    dispose: flush,
  };
}
