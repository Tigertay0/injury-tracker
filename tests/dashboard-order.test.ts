import { describe, expect, it } from 'vitest';
import { validateDashboardOrder } from '@shared/validation';
import { layout, sizeOf } from '@/lib/widget-layout';
import {
  DEFAULT_ORDER,
  TILE_IDS,
  TILE_MODES,
  TILE_TITLES,
  announceMove,
  movedTile,
  reconcileOrder,
  tileItems,
  tileMode,
  type TileId,
} from '@/app/dashboard-order';

describe('the tile catalogue', () => {
  it('lists every tile once, in the default order', () => {
    expect(TILE_IDS).toEqual(['score', 'workload', 'recovery', 'equipment', 'injury', 'load', 'movement', 'actions', 'fuel', 'report']);
    expect(new Set(TILE_IDS).size).toBe(TILE_IDS.length);
    expect(DEFAULT_ORDER).toEqual(TILE_IDS);
  });

  it('has a title for every tile but the score, whose title depends on its state', () => {
    expect(Object.keys(TILE_TITLES).sort()).toEqual(TILE_IDS.filter((id) => id !== 'score').sort());
    for (const title of Object.values(TILE_TITLES)) expect(title).toMatch(/^[A-Z][^—–]*$/);
  });

  it('is a list the server accepts as a saved order', () => {
    expect(validateDashboardOrder({ order: [...DEFAULT_ORDER] })).toEqual([...DEFAULT_ORDER]);
  });
});

describe('reconcileOrder', () => {
  it('uses the default order when nothing is saved', () => {
    expect(reconcileOrder([])).toEqual([...DEFAULT_ORDER]);
    expect(reconcileOrder(undefined)).toEqual([...DEFAULT_ORDER]);
    expect(reconcileOrder(null)).toEqual([...DEFAULT_ORDER]);
  });

  it('keeps a complete saved order as it is', () => {
    const saved = [...DEFAULT_ORDER].reverse();
    expect(reconcileOrder(saved)).toEqual(saved);
  });

  it('puts saved tiles first and appends the missing ones in default order', () => {
    expect(reconcileOrder(['movement', 'score'])).toEqual(['movement', 'score', 'workload', 'recovery', 'equipment', 'injury', 'load', 'actions', 'fuel', 'report']);
  });

  it('drops ids this release does not know', () => {
    expect(reconcileOrder(['sleep_chart', 'score', 'load_chart', 'workload'])).toEqual(['score', 'workload', 'recovery', 'equipment', 'injury', 'load', 'movement', 'actions', 'fuel', 'report']);
  });

  it('drops duplicates and keeps the first place of each tile', () => {
    expect(reconcileOrder(['load', 'score', 'load', 'score', 'load'])).toEqual(['load', 'score', 'workload', 'recovery', 'equipment', 'injury', 'movement', 'actions', 'fuel', 'report']);
  });

  it('copes with junk entries', () => {
    const junk = [null, 7, {}, [], '', 'SCORE', ' score', 'score'] as unknown as string[];
    expect(reconcileOrder(junk)).toEqual([...DEFAULT_ORDER]);
  });

  it('always shows every current tile exactly once', () => {
    const noisy = ['x', 'fuel', 'fuel', 'report', 'y', 'score', 'score', 'z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v'];
    const out = reconcileOrder(noisy);
    expect([...out].sort()).toEqual([...TILE_IDS].sort());
    expect(out.length).toBeLessThanOrEqual(30);
  });

  it('does not change its input and returns a new list', () => {
    const saved = ['report', 'score'];
    const copy = [...saved];
    const out = reconcileOrder(saved);
    expect(saved).toEqual(copy);
    expect(out).not.toBe(saved);
  });

  it('is stable: reconciling twice gives the same order', () => {
    const once = reconcileOrder(['injury', 'nope', 'injury', 'score']);
    expect(reconcileOrder(once)).toEqual(once);
  });

  it('can reconcile against another tile set', () => {
    expect(reconcileOrder(['b', 'z', 'a'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });
});

describe('tileMode', () => {
  it('is compact on the narrowest phones, phone below 768px and desktop from there', () => {
    expect(tileMode(320)).toBe('compact');
    expect(tileMode(371)).toBe('compact');
    expect(tileMode(372)).toBe('phone');
    expect(tileMode(390)).toBe('phone');
    expect(tileMode(767)).toBe('phone');
    expect(tileMode(768)).toBe('desktop');
    expect(tileMode(1440)).toBe('desktop');
  });
});

describe('tileItems', () => {
  const labels: Record<TileId, string> = Object.fromEntries(TILE_IDS.map((id) => [id, `Label ${id}`])) as Record<TileId, string>;

  it('gives every tile a size and an accessible name, in the given order', () => {
    const order = reconcileOrder(['report', 'score']);
    const items = tileItems(order, 'desktop', labels);
    expect(items.map((i) => i.id)).toEqual(order);
    for (const item of items) {
      expect(item.size).toMatch(/^(sm|wide|tall|lg)$/);
      expect(item.label).toBe(`Label ${item.id}`);
    }
  });

  it('keeps the score a large tile and the four score parts small on desktop', () => {
    const sizes = Object.fromEntries(tileItems([...DEFAULT_ORDER], 'desktop', labels).map((i) => [i.id, i.size]));
    expect(sizes.score).toBe('lg');
    for (const id of ['workload', 'recovery', 'equipment', 'injury']) expect(sizes[id]).toBe('sm');
  });

  it('turns the score parts wide on the narrowest phones only', () => {
    const sizes = (mode: 'compact' | 'phone') => Object.fromEntries(tileItems([...DEFAULT_ORDER], mode, labels).map((i) => [i.id, i.size]));
    expect(sizes('compact').workload).toBe('wide');
    expect(sizes('phone').workload).toBe('sm');
  });

  it('gives the heavy tiles a full-width large tile on phones', () => {
    const sizes = Object.fromEntries(tileItems([...DEFAULT_ORDER], 'phone', labels).map((i) => [i.id, i.size]));
    for (const id of ['load', 'movement', 'actions', 'fuel']) expect(sizes[id]).toBe('lg');
  });
});

describe('the default arrangement', () => {
  const holes = (mode: (typeof TILE_MODES)[number], columns: number) => {
    const items = tileItems([...DEFAULT_ORDER], mode, Object.fromEntries(TILE_IDS.map((id) => [id, id])) as Record<TileId, string>);
    const places = layout(items, columns);
    const rows = Math.max(...places.map((p) => p.row + p.h));
    const filled = places.reduce((n, p) => n + p.w * p.h, 0);
    const grown = places.filter((p) => items.find((i) => i.id === p.id)?.size !== sizeOf(p.w, p.h));
    return { rows, empty: rows * columns - filled, grown: grown.map((p) => p.id), placed: places.length };
  };

  it('has no empty cell at four columns on desktop', () => {
    expect(holes('desktop', 4)).toMatchObject({ empty: 0, grown: [], placed: 10 });
  });

  it('has no empty cell at two columns in every mode', () => {
    for (const mode of TILE_MODES) expect(holes(mode, 2)).toMatchObject({ empty: 0, grown: [], placed: 10 });
  });

  it('leaves at most one empty cell at three columns on desktop, and stretches no tile', () => {
    const h = holes('desktop', 3);
    expect(h.empty).toBeLessThanOrEqual(1);
    expect(h.grown).toEqual([]);
  });
});

describe('movedTile', () => {
  const before = ['a', 'b', 'c', 'd'];

  it('names the tile that moved', () => {
    expect(movedTile(before, ['a', 'c', 'd', 'b'])).toBe('b');
    expect(movedTile(before, ['d', 'a', 'b', 'c'])).toBe('d');
  });

  it('prefers the focused tile when it changed place', () => {
    expect(movedTile(before, ['b', 'a', 'c', 'd'], 'a')).toBe('a');
    expect(movedTile(before, ['b', 'a', 'c', 'd'], 'b')).toBe('b');
  });

  it('ignores a focused tile that did not change place', () => {
    expect(movedTile(before, ['a', 'c', 'd', 'b'], 'a')).toBe('b');
  });

  it('returns null when nothing changed', () => {
    expect(movedTile(before, [...before])).toBeNull();
    expect(movedTile(before, [...before], 'a')).toBeNull();
  });
});

describe('announceMove', () => {
  it('says which tile went where', () => {
    expect(announceMove('Recovery', ['score', 'workload', 'recovery', 'equipment'], 'recovery')).toBe('Recovery moved to position 3 of 4');
  });

  it('says nothing for a tile that is not in the list', () => {
    expect(announceMove('Recovery', ['score'], 'recovery')).toBe('');
  });
});
