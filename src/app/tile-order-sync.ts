// Sends the dashboard's tile order to the server a moment after the player stops moving tiles.
// Keyboard moves come in bursts and writes are rate limited, so one save carries the last order.
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
  onFailed: (keptOrder: string[]) => void;
  delayMs?: number;
}

export interface TileOrderSync {
  /** A new order is on screen. Saved after the delay unless another move comes first. */
  change: (order: readonly string[]) => void;
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
      () => {
        if (version === sentVersion) onFailed([...kept]);
      },
    );
  };

  return {
    change(order) {
      latest = [...order];
      version += 1;
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
    dispose: flush,
  };
}
