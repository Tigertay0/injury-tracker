import { describe, expect, it, vi } from 'vitest';
import { createOrderSaver } from '../src/lib/order-saver';

const ORIGINAL = ['score', 'load_chart', 'movement'];
const FIRST = ['movement', 'score', 'load_chart'];
const SECOND = ['load_chart', 'movement', 'score'];

/** A screen and a server in one: what is shown, what was stored, and sends the test settles by hand. */
function fakeApp(initial: string[] = ORIGINAL) {
  const app = {
    shown: initial,
    stored: initial,
    sent: [] as string[][],
    waiting: [] as { order: string[]; resolve: () => void; reject: (err: Error) => void }[],
    shows: [] as string[][],
  };
  const ports = {
    read: () => app.shown,
    show: (order: string[]) => {
      app.shown = order;
      app.shows.push(order);
    },
    send: (order: string[]) =>
      new Promise<string[]>((resolve, reject) => {
        app.sent.push(order);
        app.waiting.push({
          order,
          resolve: () => {
            app.stored = order;
            resolve(order);
          },
          reject,
        });
      }),
  };
  return { app, ports };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createOrderSaver', () => {
  it('shows the new order straight away, before the server answers', async () => {
    const { app, ports } = fakeApp();
    const save = createOrderSaver().save(FIRST, ports);
    expect(app.shown).toEqual(FIRST);
    await settle();
    expect(app.sent).toEqual([FIRST]);
    app.waiting[0].resolve();
    await expect(save).resolves.toBeUndefined();
    expect(app.shown).toEqual(FIRST);
    expect(app.stored).toEqual(FIRST);
  });

  it('puts the old order back and rethrows when the server refuses', async () => {
    const { app, ports } = fakeApp();
    const failure = new Error('offline');
    const save = createOrderSaver().save(FIRST, ports);
    await settle();
    app.waiting[0].reject(failure);
    await expect(save).rejects.toBe(failure);
    expect(app.shown).toEqual(ORIGINAL);
    expect(app.stored).toEqual(ORIGINAL);
  });

  it('does not share the array it was given', async () => {
    const { app, ports } = fakeApp();
    const order = [...FIRST];
    const save = createOrderSaver().save(order, ports);
    order.reverse();
    await settle();
    expect(app.sent[0]).toEqual(FIRST);
    expect(app.shown).toEqual(FIRST);
    app.waiting[0].resolve();
    await save;
  });

  it('sends overlapping saves one at a time, in the order they were made', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const one = saver.save(FIRST, ports);
    const two = saver.save(SECOND, ports);
    expect(app.shown).toEqual(SECOND);
    await settle();
    expect(app.sent).toEqual([FIRST]);
    app.waiting[0].resolve();
    await one;
    await settle();
    expect(app.sent).toEqual([FIRST, SECOND]);
    app.waiting[1].resolve();
    await two;
    expect(app.stored).toEqual(SECOND);
    expect(app.shown).toEqual(SECOND);
  });

  it('keeps a newer order on screen when an older save fails', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const one = saver.save(FIRST, ports);
    const two = saver.save(SECOND, ports);
    await settle();
    app.waiting[0].reject(new Error('offline'));
    await expect(one).rejects.toThrow('offline');
    expect(app.shown).toEqual(SECOND);
    await settle();
    app.waiting[1].resolve();
    await two;
    expect(app.shown).toEqual(SECOND);
    expect(app.stored).toEqual(SECOND);
  });

  it('ends on the stored order when every overlapping save fails', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const one = saver.save(FIRST, ports);
    const two = saver.save(SECOND, ports);
    await settle();
    app.waiting[0].reject(new Error('offline'));
    await expect(one).rejects.toThrow();
    await settle();
    app.waiting[1].reject(new Error('offline'));
    await expect(two).rejects.toThrow();
    expect(app.shown).toEqual(ORIGINAL);
    expect(app.stored).toEqual(ORIGINAL);
  });

  it('goes back to the last order the server kept, not the one before it', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const ok = saver.save(FIRST, ports);
    await settle();
    app.waiting[0].resolve();
    await ok;
    const bad = saver.save(SECOND, ports);
    await settle();
    app.waiting[1].reject(new Error('offline'));
    await expect(bad).rejects.toThrow();
    expect(app.shown).toEqual(FIRST);
    expect(app.stored).toEqual(FIRST);
  });

  it('keeps saving after a failure', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const bad = saver.save(FIRST, ports);
    await settle();
    app.waiting[0].reject(new Error('offline'));
    await expect(bad).rejects.toThrow();
    const good = saver.save(SECOND, ports);
    await settle();
    app.waiting[1].resolve();
    await good;
    expect(app.shown).toEqual(SECOND);
    expect(app.stored).toEqual(SECOND);
  });

  it('starts from what is on screen when the data was loaded again in between', async () => {
    const { app, ports } = fakeApp();
    const saver = createOrderSaver();
    const ok = saver.save(FIRST, ports);
    await settle();
    app.waiting[0].resolve();
    await ok;
    // Another device changed the order and the app reloaded it
    app.shown = ['movement', 'load_chart', 'score'];
    app.stored = app.shown;
    const bad = saver.save(SECOND, ports);
    await settle();
    app.waiting[1].reject(new Error('offline'));
    await expect(bad).rejects.toThrow();
    expect(app.shown).toEqual(['movement', 'load_chart', 'score']);
  });

  it('shows a reverted order at most once per failed save', async () => {
    const { app, ports } = fakeApp();
    const show = vi.spyOn(ports, 'show');
    const save = createOrderSaver().save(FIRST, ports);
    await settle();
    app.waiting[0].reject(new Error('offline'));
    await expect(save).rejects.toThrow();
    expect(show).toHaveBeenCalledTimes(2);
  });
});
