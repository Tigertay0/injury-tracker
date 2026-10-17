import { describe, expect, it } from 'vitest';
import {
  candidatesFor,
  canonical,
  choose,
  layout,
  moveTo,
  overlaps,
  pack,
  reconcileItems,
  sameItems,
  sameOrder,
  sizeOf,
  tile,
  type Box,
  type Candidate,
  type Placement,
  type Slot,
  type WidgetItem,
  type WidgetSize,
} from '../src/lib/widget-layout';

const COLUMN_COUNTS = [1, 2, 3, 4];

const SIZES: WidgetSize[] = ['sm', 'wide', 'tall', 'lg'];
const SPAN: Record<WidgetSize, { col: number; row: number }> = {
  sm: { col: 1, row: 1 },
  wide: { col: 2, row: 1 },
  tall: { col: 1, row: 2 },
  lg: { col: 2, row: 2 },
};

const make = (sizes: WidgetSize[], prefix = 'w'): WidgetItem[] =>
  sizes.map((size, i) => ({ id: `${prefix}${i}`, size }));
const ids = (items: WidgetItem[]) => items.map((item) => item.id);

/** Small deterministic generator, so a failing set can be reproduced. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomSets(count: number, maxItems: number): WidgetItem[][] {
  const next = seeded(20261017);
  return Array.from({ length: count }, () => {
    const n = 1 + Math.floor(next() * maxItems);
    return make(Array.from({ length: n }, () => SIZES[Math.floor(next() * SIZES.length)]));
  });
}

/** Item sets mixing every size, hand picked first, then generated. */
const SETS: WidgetItem[][] = [
  make(['sm']),
  make(['wide']),
  make(['tall']),
  make(['lg']),
  make(['lg', 'lg']),
  make(['sm', 'wide', 'tall', 'lg']),
  make(['wide', 'sm', 'sm', 'sm', 'wide', 'sm', 'sm', 'wide', 'sm']),
  make(['lg', 'sm', 'sm', 'wide', 'tall']),
  make(['tall', 'tall', 'tall', 'lg', 'wide', 'sm', 'sm']),
  make(['lg', 'tall', 'sm', 'wide', 'wide', 'lg', 'sm', 'tall']),
  ...randomSets(150, 12),
];

/** Cells covered by a widget set, with spans narrowed to the column count. */
const areaOf = (items: WidgetItem[], columns: number) =>
  items.reduce((n, item) => n + Math.min(SPAN[item.size].col, columns) * SPAN[item.size].row, 0);

const heightOf = (places: Placement[]) => places.reduce((n, p) => Math.max(n, p.row + p.h), 0);

/** Every item placed once, inside the columns, with no two widgets overlapping. */
function expectValid(items: WidgetItem[], places: Placement[], columns: number) {
  expect(places.map((p) => p.id).sort()).toEqual(ids(items).sort());
  for (const p of places) {
    expect(p.w).toBeGreaterThanOrEqual(1);
    expect(p.h).toBeGreaterThanOrEqual(1);
    expect(p.col).toBeGreaterThanOrEqual(0);
    expect(p.row).toBeGreaterThanOrEqual(0);
    expect(p.col + p.w).toBeLessThanOrEqual(columns);
  }
  for (let i = 0; i < places.length; i++)
    for (let j = i + 1; j < places.length; j++)
      expect(overlaps(places[i], places[j]), `${places[i].id} overlaps ${places[j].id}`).toBe(false);
}

/** How many times each cell of the bounding rectangle is covered. */
function coverage(places: Placement[], columns: number): number[] {
  const cells = new Array<number>(heightOf(places) * columns).fill(0);
  for (const p of places)
    for (let y = p.row; y < p.row + p.h; y++)
      for (let x = p.col; x < p.col + p.w; x++) cells[y * columns + x] += 1;
  return cells;
}

const byId = (places: Placement[]) => new Map(places.map((p) => [p.id, p]));

describe('layout', () => {
  it('places every item exactly once, inside the columns, with no overlaps', () => {
    for (const items of SETS)
      for (const columns of COLUMN_COUNTS) expectValid(items, layout(items, columns), columns);
  });

  it('returns nothing for an empty set or no columns', () => {
    expect(layout([], 3)).toEqual([]);
    expect(layout(make(['sm']), 0)).toEqual([]);
  });

  it('narrows wide widgets to one column on a one column grid', () => {
    const places = layout(make(['wide', 'lg', 'tall', 'sm']), 1);
    expect(places.every((p) => p.w === 1 && p.col === 0)).toBe(true);
    expect(places.map((p) => p.h)).toEqual([1, 2, 2, 1]);
  });

  it('uses the exact tiling whenever one exists', () => {
    let tiled = 0;
    for (const items of SETS)
      for (const columns of COLUMN_COUNTS) {
        const exact = tile(items, columns);
        if (!exact) continue;
        tiled += 1;
        expect(layout(items, columns)).toEqual(exact);
      }
    expect(tiled).toBeGreaterThan(50);
  });

  it('falls back to the row packer when no tiling exists', () => {
    // Two 2x2 widgets cannot fill three columns without a gap.
    const items = make(['lg', 'lg']);
    expect(tile(items, 3)).toBeNull();
    expect(layout(items, 3)).toEqual(pack(items, 3));
    expectValid(items, layout(items, 3), 3);

    let fellBack = 0;
    for (const set of SETS)
      for (const columns of COLUMN_COUNTS) {
        if (tile(set, columns)) continue;
        fellBack += 1;
        expect(layout(set, columns)).toEqual(pack(set, columns));
      }
    expect(fellBack).toBeGreaterThan(0);
  });
});

describe('tile', () => {
  it('returns a gap-free rectangle whenever the area divides evenly and a tiling exists', () => {
    let checked = 0;
    for (const items of SETS)
      for (const columns of COLUMN_COUNTS) {
        const area = areaOf(items, columns);
        if (area % columns !== 0) continue;
        const places = tile(items, columns);
        if (!places) continue;
        checked += 1;
        expectValid(items, places, columns);
        expect(heightOf(places)).toBe(area / columns);
        expect(coverage(places, columns).every((n) => n === 1)).toBe(true);
      }
    expect(checked).toBeGreaterThan(30);
  });

  it('finds the known tilings', () => {
    const cases: Array<[WidgetSize[], number, number]> = [
      [['wide', 'sm', 'sm'], 2, 2],
      [['lg', 'lg', 'wide', 'wide'], 4, 3],
      [['tall', 'tall', 'wide'], 2, 3],
      [['wide', 'wide'], 1, 2],
      [['sm', 'sm', 'sm', 'sm', 'sm', 'sm'], 3, 2],
    ];
    for (const [sizes, columns, rows] of cases) {
      const items = make(sizes);
      const places = tile(items, columns);
      expect(places, `${sizes.join(',')} at ${columns}`).not.toBeNull();
      expect(heightOf(places as Placement[])).toBe(rows);
      expect(coverage(places as Placement[], columns).every((n) => n === 1)).toBe(true);
    }
  });

  it('gives up when no arrangement fits', () => {
    expect(tile(make(['lg', 'lg']), 3)).toBeNull();
  });
});

describe('pack', () => {
  it('keeps every widget inside the columns without overlap, at any column count', () => {
    for (const items of SETS)
      for (const columns of COLUMN_COUNTS) expectValid(items, pack(items, columns), columns);
  });
});

describe('moveTo', () => {
  const items = make(['sm', 'wide', 'tall', 'lg', 'sm']);

  it('keeps the same item set for every move', () => {
    for (const from of items)
      for (let to = 0; to < items.length; to++) {
        const next = moveTo(items, from.id, to);
        expect(ids(next).sort()).toEqual(ids(items).sort());
        for (const item of next) expect(items).toContain(item);
      }
  });

  it('puts the widget at the requested index', () => {
    expect(ids(moveTo(items, 'w0', 3))).toEqual(['w1', 'w2', 'w3', 'w0', 'w4']);
    expect(ids(moveTo(items, 'w4', 0))).toEqual(['w4', 'w0', 'w1', 'w2', 'w3']);
  });

  it('does not change the input', () => {
    const before = ids(items);
    moveTo(items, 'w0', 3);
    expect(ids(items)).toEqual(before);
  });

  it('returns the same list when there is nothing to move', () => {
    expect(moveTo(items, 'w2', 2)).toBe(items);
    expect(moveTo(items, 'missing', 1)).toBe(items);
    expect(moveTo(items, 'w2', -1)).toBe(items);
    expect(moveTo(items, 'w2', items.length)).toBe(items);
  });
});

describe('canonical', () => {
  it('keeps the same item set and the same layout', () => {
    for (const items of SETS)
      for (const columns of COLUMN_COUNTS) {
        const next = canonical(items, columns);
        expect(ids(next).sort()).toEqual(ids(items).sort());
        for (const item of next) expect(items).toContain(item);
        const before = byId(layout(items, columns));
        for (const p of layout(next, columns)) expect(before.get(p.id)).toEqual(p);
      }
  });

  it('keeps the same item set after a move, and settles on one order', () => {
    const items = make(['sm', 'wide', 'tall', 'lg', 'sm', 'sm', 'wide']);
    for (const columns of COLUMN_COUNTS)
      for (let to = 0; to < items.length; to++) {
        const next = canonical(moveTo(items, 'w3', to), columns);
        expect(ids(next).sort()).toEqual(ids(items).sort());
        expect(canonical(next, columns)).toBe(next);
      }
  });

  it('returns the same list when it is already in reading order', () => {
    const items = make(['wide', 'sm', 'sm']);
    expect(canonical(items, 2)).toBe(items);
  });

  it('keeps the order when reading order would change the layout', () => {
    // At three columns the tiler puts the tall widget before the last wide one, but
    // listing them in that reading order would pack the widgets differently.
    for (const sizes of [
      ['wide', 'wide', 'wide', 'tall', 'wide'],
      ['wide', 'wide', 'wide', 'wide', 'tall'],
    ] as WidgetSize[][]) {
      const items = make(sizes);
      expect(canonical(items, 3), sizes.join(',')).toBe(items);
    }
  });
});

describe('sizeOf', () => {
  it('names a span', () => {
    expect(sizeOf(1, 1)).toBe('sm');
    expect(sizeOf(2, 1)).toBe('wide');
    expect(sizeOf(1, 2)).toBe('tall');
    expect(sizeOf(2, 2)).toBe('lg');
    expect(sizeOf(3, 3)).toBe('lg');
  });
});

describe('sameOrder and sameItems', () => {
  const a = make(['sm', 'wide', 'tall']);

  it('sameOrder compares ids only', () => {
    expect(sameOrder(a, [...a])).toBe(true);
    expect(sameOrder(a, [a[1], a[0], a[2]])).toBe(false);
    expect(sameOrder(a, a.slice(0, 2))).toBe(false);
    expect(sameOrder(a, a.map((item) => ({ ...item, size: 'lg' as const })))).toBe(true);
  });

  it('sameItems compares id, size and label', () => {
    expect(sameItems(a, a.map((item) => ({ ...item })))).toBe(true);
    expect(sameItems(a, [a[1], a[0], a[2]])).toBe(false);
    expect(sameItems(a, [a[0], a[1], { ...a[2], size: 'lg' }])).toBe(false);
    expect(sameItems(a, [a[0], a[1], { ...a[2], label: 'Named' }])).toBe(false);
    expect(sameItems(a, a.slice(0, 2))).toBe(false);
  });
});

describe('choose', () => {
  const home: Slot = { left: 0, top: 0, right: 100, bottom: 100 };
  const orderA = make(['sm', 'sm'], 'a');
  const orderB = make(['sm', 'sm'], 'b');
  const slotAt = (left: number): Slot => ({ left, top: 0, right: left + 100, bottom: 100 });

  it('returns null when the dragged centre is inside its home slot', () => {
    const candidates: Candidate[] = [
      { order: orderA, slot: slotAt(110) },
      // A candidate that overlaps home still cannot win while the centre is home.
      { order: orderB, slot: slotAt(40) },
    ];
    for (const [cx, cy] of [
      [50, 50],
      [1, 1],
      [99, 99],
      [100, 50], // on the edge counts as inside
      [0, 0],
    ])
      expect(choose(home, candidates, cx, cy), `${cx},${cy}`).toBeNull();
  });

  it('measures home at full size, so a small slot next to it cannot win from the shared edge', () => {
    const small: Candidate[] = [{ order: orderA, slot: { left: 100, top: 0, right: 140, bottom: 100 } }];
    expect(choose(home, small, 100, 50)).toBeNull();
  });

  it('returns null with nothing to choose from', () => {
    expect(choose(home, [], 500, 500)).toBeNull();
  });

  it('takes the candidate slot the centre has moved into', () => {
    const candidates: Candidate[] = [
      { order: orderA, slot: slotAt(110) },
      { order: orderB, slot: slotAt(330) },
    ];
    expect(choose(home, candidates, 160, 50)).toBe(orderA);
    expect(choose(home, candidates, 380, 50)).toBe(orderB);
  });

  it('keeps the current arrangement until the centre is well inside the next slot', () => {
    const candidates: Candidate[] = [{ order: orderA, slot: slotAt(102) }];
    // One pixel outside home: home is nearer than the shrunk candidate slot.
    expect(choose(home, candidates, 101, 50)).toBeNull();
    // Deep inside the candidate slot.
    expect(choose(home, candidates, 152, 50)).toBe(orderA);
  });

  it('prefers the earlier candidate on an exact tie', () => {
    const first = make(['sm'], 'first');
    const second = make(['sm'], 'second');
    const candidates: Candidate[] = [
      { order: first, slot: slotAt(200) },
      { order: second, slot: slotAt(200) },
    ];
    expect(choose(home, candidates, 250, 50)).toBe(first);
  });

  it('breaks a tie between slots the centre is inside by the nearer slot centre', () => {
    const near = make(['sm'], 'near');
    const far = make(['sm'], 'far');
    const candidates: Candidate[] = [
      { order: far, slot: slotAt(200) }, // centre 250
      { order: near, slot: slotAt(250) }, // centre 300
    ];
    // 280 is inside the shrunk area of both slots; 300 is the nearer centre.
    expect(choose(home, candidates, 280, 50)).toBe(near);
  });
});

describe('candidatesFor', () => {
  // 110px steps: 100px cells with a 10px gap.
  const toSlot = (box: Box): Slot => ({
    left: box.col * 110,
    top: box.row * 110,
    right: box.col * 110 + box.w * 110 - 10,
    bottom: box.row * 110 + box.h * 110 - 10,
  });

  it('returns nothing for an unknown widget', () => {
    expect(candidatesFor(make(['sm', 'sm']), 'missing', 2, toSlot)).toEqual([]);
  });

  it('only offers arrangements of the same item set', () => {
    for (const items of SETS.slice(0, 40))
      for (const columns of COLUMN_COUNTS)
        for (const target of items.slice(0, 3)) {
          const candidates = candidatesFor(items, target.id, columns, toSlot);
          for (const { order } of candidates) {
            expect(ids(order).sort()).toEqual(ids(items).sort());
            for (const item of order) expect(items).toContain(item);
          }
        }
  });

  it('offers a move to every other index', () => {
    const items = make(['sm', 'sm', 'sm', 'sm']);
    const candidates = candidatesFor(items, 'w1', 2, toSlot);
    const orders = candidates.map((c) => ids(c.order).join(','));
    expect(orders).toContain('w1,w0,w2,w3');
    expect(orders).toContain('w0,w2,w1,w3');
    expect(orders).toContain('w0,w2,w3,w1');
    expect(orders).not.toContain('w0,w1,w2,w3');
  });

  it('lists a group swap first: a large widget trades places with the small ones filling its area', () => {
    // Two columns: big fills rows 0-1; a, b and c fill rows 2-3.
    const items: WidgetItem[] = [
      { id: 'big', size: 'lg' },
      { id: 'a', size: 'sm' },
      { id: 'b', size: 'sm' },
      { id: 'c', size: 'wide' },
    ];
    const candidates = candidatesFor(items, 'big', 2, toSlot);
    expect(ids(candidates[0].order)).toEqual(['a', 'b', 'c', 'big']);
    // The slot is the area the big widget would take: rows 2-3.
    expect(candidates[0].slot).toEqual({ left: 0, top: 220, right: 210, bottom: 430 });
  });
});

describe('reconcileItems', () => {
  const saved = make(['wide', 'sm', 'sm', 'tall']);
  const reordered = [saved[3], saved[0], saved[1], saved[2]];

  it('adopts a new order when the prop changes while not dragging', () => {
    const result = reconcileItems(saved, saved, reordered, false);
    expect(result.items).toBe(reordered);
    expect(result.seen).toBe(reordered);
  });

  it('adopts a different set of ids', () => {
    const next = [...saved.slice(0, 3), { id: 'extra', size: 'lg' as const }];
    expect(reconcileItems(saved, saved, next, false).items).toBe(next);
  });

  it('adopts a size or label change', () => {
    const resized = [{ ...saved[0], size: 'lg' as const }, ...saved.slice(1)];
    expect(reconcileItems(saved, saved, resized, false).items).toBe(resized);
    const renamed = [{ ...saved[0], label: 'Renamed' }, ...saved.slice(1)];
    expect(reconcileItems(saved, saved, renamed, false).items).toBe(renamed);
  });

  it('changes nothing when the prop has the same widgets, even as a new array', () => {
    const copy = saved.map((item) => ({ ...item }));
    const result = reconcileItems(reordered, saved, copy, false);
    expect(result.items).toBe(reordered);
    expect(result.seen).toBe(saved);
  });

  it('does not undo a drop when the parent ignores onChange', () => {
    // The user dropped into `reordered`; the parent keeps passing the original items.
    const again = saved.map((item) => ({ ...item }));
    expect(reconcileItems(reordered, saved, again, false).items).toBe(reordered);
  });

  it('keeps the current list when the parent echoes the drop back', () => {
    const echo = [...reordered];
    const result = reconcileItems(reordered, saved, echo, false);
    expect(result.items).toBe(reordered);
    // The echo is now the prop already looked at, so the next change is compared with it.
    expect(result.seen).toBe(echo);
  });

  it('waits for the drop to finish, then adopts the newer prop', () => {
    const during = reconcileItems(saved, saved, reordered, true);
    expect(during.items).toBe(saved);
    expect(during.seen).toBe(saved);
    const after = reconcileItems(during.items, during.seen, reordered, false);
    expect(after.items).toBe(reordered);
  });
});
