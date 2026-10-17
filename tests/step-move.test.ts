// The one-place move that the Alt and arrow keys and the move buttons share.
import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER, TILE_MODES, tileItems, type TileId } from '@/app/dashboard-order';
import { canonical, layout, moveTo, sameOrder, stepMove, type WidgetItem, type WidgetSize } from '@/lib/widget-layout';

const ids = (items: WidgetItem[]) => items.map((item) => item.id);
const labels = Object.fromEntries(DEFAULT_ORDER.map((id) => [id, id])) as Record<TileId, string>;
const COLUMN_COUNTS = { desktop: [4, 3, 2], phone: [2], compact: [2] } as const;

const make = (sizes: WidgetSize[]): WidgetItem[] => sizes.map((size, i) => ({ id: `w${i}`, size }));

describe('stepMove', () => {
  it('moves a tile one place later or earlier', () => {
    const items = make(['sm', 'sm', 'sm', 'sm']);
    expect(ids(stepMove(items, 'w1', 1, 2) ?? [])).toEqual(['w0', 'w2', 'w1', 'w3']);
    expect(ids(stepMove(items, 'w2', -1, 2) ?? [])).toEqual(['w0', 'w2', 'w1', 'w3']);
  });

  it('says no when the tile is already first or last', () => {
    const items = make(['sm', 'sm', 'sm', 'sm']);
    expect(stepMove(items, 'w0', -1, 2)).toBeNull();
    expect(stepMove(items, 'w3', 1, 2)).toBeNull();
  });

  it('says no for an id that is not there', () => {
    expect(stepMove(make(['sm', 'sm']), 'nope', 1, 2)).toBeNull();
  });

  it('never changes the list it was given', () => {
    const items = make(['sm', 'wide', 'sm', 'sm']);
    const before = ids(items);
    stepMove(items, 'w0', 1, 2);
    expect(ids(items)).toEqual(before);
  });

  it('goes on past a place where nothing would visibly change', () => {
    // Two columns: wide tile w2 cannot sit beside a small one, so putting it between w0 and w1 lays out as before.
    const items = make(['sm', 'sm', 'wide']);
    expect(sameOrder(canonical(moveTo(items, 'w2', 1), 2), items)).toBe(true);
    expect(ids(stepMove(items, 'w2', -1, 2) ?? [])).toEqual(['w2', 'w0', 'w1']);
  });

  for (const mode of TILE_MODES) {
    for (const columns of COLUMN_COUNTS[mode]) {
      describe(`the real tiles, ${mode} layout at ${columns} columns`, () => {
        const items = tileItems(DEFAULT_ORDER, mode, labels);

        it('always returns every tile once, laid out without losing any', () => {
          for (const item of items) {
            for (const delta of [-1, 1] as const) {
              const next = stepMove(items, item.id, delta, columns);
              if (!next) continue;
              expect(ids(next).sort()).toEqual(ids(items).sort());
              expect(layout(next, columns)).toHaveLength(items.length);
              expect(sameOrder(next, items)).toBe(false);
            }
          }
        });

        it('never sends a tile the wrong way, and says no for the first tile going earlier and the last going later', () => {
          for (const delta of [-1, 1] as const) {
            for (const item of items) {
              const next = stepMove(items, item.id, delta, columns);
              if (!next) continue;
              const from = ids(items).indexOf(item.id);
              const to = ids(next).indexOf(item.id);
              // Re-sequencing into reading order can keep a tile's own index while its neighbours reorder around it
              expect(Math.sign(to - from) * delta).toBeGreaterThanOrEqual(0);
            }
          }
          expect(stepMove(items, items[0].id, -1, columns)).toBeNull();
          expect(stepMove(items, items[items.length - 1].id, 1, columns)).toBeNull();
        });

        it('walks the first tile to the end in a bounded number of presses, then stops', () => {
          let order = items;
          const id = items[0].id;
          let presses = 0;
          for (let next = stepMove(order, id, 1, columns); next; next = stepMove(order, id, 1, columns)) {
            order = next;
            presses += 1;
            expect(presses).toBeLessThanOrEqual(items.length);
          }
          expect(presses).toBeGreaterThan(0);
          expect(stepMove(order, id, 1, columns)).toBeNull();
          expect(ids(order).indexOf(id)).toBeGreaterThanOrEqual(items.length - 2);
        });

        it('keeps the reading order canonical after a move', () => {
          for (const item of items) {
            const next = stepMove(items, item.id, 1, columns);
            if (next) expect(canonical(next, columns)).toBe(next);
          }
        });
      });
    }
  }
});
