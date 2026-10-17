// Saves a list order the way a drag-and-drop screen needs: the new order shows at once, the
// server hears about it in the order the changes were made, and a refusal puts back the last
// order the server kept. It knows nothing about React; the screen and the API come in as ports.

export interface OrderSavePorts {
  /** The order on screen right now. */
  read(): string[];
  /** Puts an order on screen. */
  show(order: string[]): void;
  /** Sends an order to the server and resolves with the order it stored. */
  send(order: string[]): Promise<string[]>;
}

export interface OrderSaver {
  /** Resolves once the server has stored `order`; rejects, after putting the old order back, if it refused. */
  save(order: string[], ports: OrderSavePorts): Promise<void>;
}

export function createOrderSaver(): OrderSaver {
  // What the server holds as far as we know. It is read from the screen whenever no save is
  // in flight, so a reload (or another device's change) is picked up without any bookkeeping.
  let confirmed: string[] = [];
  let latest: string[] = [];
  let inFlight = 0;
  // One request at a time: a slow older save must not land after a newer one and win
  let queue: Promise<unknown> = Promise.resolve();

  return {
    save(order, ports) {
      const next = [...order];
      if (inFlight === 0) confirmed = ports.read();
      inFlight += 1;
      latest = next;
      ports.show(next);

      const run = queue.then(async () => {
        try {
          confirmed = await ports.send(next);
        } catch (err) {
          // A newer save has put its own order on screen and is responsible for it now
          if (latest === next) {
            latest = confirmed;
            ports.show(confirmed);
          }
          throw err;
        } finally {
          inFlight -= 1;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
