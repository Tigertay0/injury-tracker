// Pure layout logic for the draggable widget grid (src/components/ui/draggable-widget-grid.tsx).
//
// Adapted from the 21st.dev "Draggable Widget Grid". The algorithms are unchanged; they are
// split out here, typed and exported, so they can be tested without a DOM.
//
// The layout is a sequence of widgets plus a size per widget. `tile` turns that into a gap-free
// rectangle when one exists, and `pack` is the fallback when it does not.

/** Column x row span: `sm` 1x1, `wide` 2x1, `tall` 1x2, `lg` 2x2. */
export type WidgetSize = 'sm' | 'wide' | 'tall' | 'lg';

export interface WidgetItem {
  /** Stable, unique id. */
  id: string;
  size: WidgetSize;
  /** Accessible name for the widget. */
  label?: string;
}

/** Where a widget sits in the grid, in whole cells. */
export interface Placement {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface Box {
  col: number;
  row: number;
  w: number;
  h: number;
}

/** Viewport rectangle of a widget in the settled layout. */
export interface Slot {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Candidate {
  order: WidgetItem[];
  slot: Slot;
}

const SPANS: { [K in WidgetSize]: { col: number; row: number } } = {
  sm: { col: 1, row: 1 },
  wide: { col: 2, row: 1 },
  tall: { col: 1, row: 2 },
  lg: { col: 2, row: 2 },
};

/** The size name for a span of `w` columns by `h` rows (anything 2 or wider counts as wide). */
export function sizeOf(w: number, h: number): WidgetSize {
  if (w >= 2 && h >= 2) return 'lg';
  if (w >= 2) return 'wide';
  if (h >= 2) return 'tall';
  return 'sm';
}

export const overlaps = (a: Box, b: Box): boolean =>
  a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;

export const contains = (outer: Box, inner: Box): boolean =>
  inner.col >= outer.col &&
  inner.row >= outer.row &&
  inner.col + inner.w <= outer.col + outer.w &&
  inner.row + inner.h <= outer.row + outer.h;

/** The span of an item, narrowed so it never exceeds the column count. */
function spanOf(item: WidgetItem, columns: number): { w: number; h: number } {
  return { w: Math.min(SPANS[item.size].col, columns), h: SPANS[item.size].row };
}

/**
 * Places every widget. Tries an exact tiling first (no gaps, no stretching);
 * falls back to a row packer that grows widgets to close gaps.
 */
export function layout(items: WidgetItem[], columns: number): Placement[] {
  if (columns < 1 || items.length === 0) return [];
  return tile(items, columns) ?? pack(items, columns);
}

const TILING_BUDGET = 20000;

/**
 * Exact tiling. The first empty cell in reading order takes the earliest
 * widget that fits there and still lets the rest be placed. Returns null when
 * no tiling is found within the search budget.
 */
export function tile(items: WidgetItem[], columns: number): Placement[] | null {
  const spans = items.map((item) => spanOf(item, columns));
  const area = spans.reduce((n, s) => n + s.w * s.h, 0);
  const rows = Math.ceil(area / columns);
  const grid: boolean[] = new Array(rows * columns).fill(false);
  const used: boolean[] = new Array(items.length).fill(false);
  const out: Placement[] = [];
  let budget = TILING_BUDGET;

  const fits = (w: number, h: number, r: number, c: number) => {
    if (c + w > columns || r + h > rows) return false;
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) if (grid[y * columns + x]) return false;
    return true;
  };
  const mark = (w: number, h: number, r: number, c: number, v: boolean) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y * columns + x] = v;
  };

  const place = (count: number): boolean => {
    if (count === items.length) return true;
    if (--budget < 0) return false;
    const i = grid.indexOf(false);
    if (i < 0) return false;
    const r = Math.floor(i / columns);
    const c = i % columns;
    // Widgets of the same shape are interchangeable at this cell.
    const tried = new Set<string>();
    for (let k = 0; k < items.length; k++) {
      if (used[k]) continue;
      const { w, h } = spans[k];
      const shape = `${w}x${h}`;
      if (tried.has(shape) || !fits(w, h, r, c)) continue;
      tried.add(shape);
      used[k] = true;
      mark(w, h, r, c, true);
      out.push({ id: items[k].id, col: c, row: r, w, h });
      if (place(count + 1)) return true;
      out.pop();
      mark(w, h, r, c, false);
      used[k] = false;
    }
    return false;
  };

  return place(0) ? out : null;
}

/** Fallback: fill rows in order, then widen widgets to close each row. */
export function pack(items: WidgetItem[], columns: number): Placement[] {
  const out: Placement[] = [];
  let row = 0;
  let queue = items.map((item) => ({ id: item.id, ...spanOf(item, columns) }));

  while (queue.length > 0) {
    const height = Math.max(...queue.slice(0, columns).map((q) => q.h));
    const cells: boolean[] = new Array(height * columns).fill(false);
    const band: Placement[] = [];
    const rest: typeof queue = [];

    for (const q of queue) {
      let spot = -1;
      for (let i = 0; i < cells.length && spot < 0; i++) {
        const r = Math.floor(i / columns);
        const c = i % columns;
        if (c + q.w > columns || r + q.h > height) continue;
        let free = true;
        for (let y = r; y < r + q.h && free; y++)
          for (let x = c; x < c + q.w && free; x++) if (cells[y * columns + x]) free = false;
        if (free) spot = i;
      }
      if (spot < 0 || rest.length > 0) {
        rest.push(q);
        continue;
      }
      const r = Math.floor(spot / columns);
      const c = spot % columns;
      for (let y = r; y < r + q.h; y++) for (let x = c; x < c + q.w; x++) cells[y * columns + x] = true;
      band.push({ id: q.id, col: c, row: r, w: q.w, h: q.h });
    }

    // Grow widgets right, then down, into any cell left empty.
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      const r = Math.floor(i / columns);
      const c = i % columns;
      const left = band.find((p) => p.col + p.w === c && p.row <= r && p.row + p.h > r && p.h === 1);
      const above = band.find((p) => p.row + p.h === r && p.col === c && p.w === 1);
      const grow = left ?? above;
      if (!grow) continue;
      if (grow === left) grow.w += 1;
      else grow.h += 1;
      cells[i] = true;
    }

    out.push(...band.map((p) => ({ ...p, row: p.row + row })));
    row += height;
    queue = rest;
  }
  return out;
}

/** Reorders `items` to match the reading order of their layout. */
export function canonical(items: WidgetItem[], columns: number): WidgetItem[] {
  const places = layout(items, columns);
  if (places.length !== items.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const sorted = [...places]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((p) => byId.get(p.id) as WidgetItem);
  if (sorted.every((item, i) => item === items[i])) return items;
  // Only adopt the reading order when it produces the same layout.
  const at = new Map(places.map((p) => [p.id, p]));
  const same = layout(sorted, columns).every((p) => {
    const q = at.get(p.id);
    return q && q.col === p.col && q.row === p.row && q.w === p.w && q.h === p.h;
  });
  return same ? sorted : items;
}

/** Moves the widget `id` to position `index`. Returns `items` itself when nothing changes. */
export function moveTo(items: WidgetItem[], id: string, index: number): WidgetItem[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0 || from === index || index < 0 || index >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(index, 0, moved);
  return next;
}

/**
 * Moves the widget `id` one place earlier (`delta` -1) or later (+1) in the sequence, going on past any
 * place where the layout would not change (two widgets that swap without anything visibly moving).
 * Returns the new order, or null when the widget cannot move any further that way. This is what the
 * Alt and arrow keys and the move buttons both run.
 */
export function stepMove(items: WidgetItem[], id: string, delta: -1 | 1, columns: number): WidgetItem[] | null {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return null;
  for (let to = from + delta; to >= 0 && to < items.length; to += delta) {
    const next = canonical(moveTo(items, id, to), columns);
    if (!sameOrder(next, items)) return next;
  }
  return null;
}

/** True when both lists hold the same ids in the same order. */
export const sameOrder = (a: WidgetItem[], b: WidgetItem[]): boolean =>
  a.length === b.length && a.every((item, i) => item.id === b[i].id);

/** True when both lists are the same widgets (id, size and label) in the same order. */
export const sameItems = (a: WidgetItem[], b: WidgetItem[]): boolean =>
  a.length === b.length &&
  a.every((item, i) => item.id === b[i].id && item.size === b[i].size && item.label === b[i].label);

/**
 * Decides what the grid shows when its `items` prop changes (for example when the
 * saved layout finishes loading).
 *
 * The grid keeps its own copy of the order while a widget is dragged, and parents
 * often ignore `onChange`, so the prop is not treated as the single source of truth.
 * It is adopted only when it has changed since the last one the grid looked at:
 * - while a widget is being dragged, nothing changes and the new prop is looked at
 *   again once the drag ends;
 * - a prop with the same widgets as before (including one echoing a drop back, or a
 *   new array with the same contents) changes nothing, so a drop is never undone;
 * - otherwise the grid shows the new prop.
 *
 * `seen` is the last prop already looked at; store the returned value for the next call.
 */
export function reconcileItems(
  current: WidgetItem[],
  seen: WidgetItem[],
  incoming: WidgetItem[],
  dragging: boolean,
): { items: WidgetItem[]; seen: WidgetItem[] } {
  if (dragging || sameItems(seen, incoming)) return { items: current, seen };
  return { items: sameItems(current, incoming) ? current : incoming, seen: incoming };
}

/* ----------------------- Drop target selection ---------------------- */

/** Fraction of a slot the dragged widget's centre must enter to take it. */
const ENTER = 0.18;

/**
 * Picks the arrangement whose slot for `id` is nearest to the dragged
 * widget's centre, or null to keep the current one.
 *
 * Candidates are measured to a slot shrunk by `ENTER`; the current slot is
 * measured unshrunk. Every accepted move therefore strictly reduces that
 * distance, which rules out oscillating between arrangements.
 */
export function choose(home: Slot, candidates: Candidate[], cx: number, cy: number): WidgetItem[] | null {
  const distance = (s: Slot, inset: number) => {
    const ix = (s.right - s.left) * inset;
    const iy = (s.bottom - s.top) * inset;
    const dx = Math.max(s.left + ix - cx, 0, cx - (s.right - ix));
    const dy = Math.max(s.top + iy - cy, 0, cy - (s.bottom - iy));
    return Math.hypot(dx, dy);
  };
  const toCentre = (s: Slot) => Math.hypot((s.left + s.right) / 2 - cx, (s.top + s.bottom) / 2 - cy);

  let best = distance(home, 0);
  if (best === 0) return null;
  let pick: WidgetItem[] | null = null;
  let bestCentre = Infinity;
  for (const { order, slot } of candidates) {
    const d = distance(slot, ENTER);
    const c = toCentre(slot);
    // On a tie the earlier candidate wins; group swaps are listed first.
    if (d < best || (d === best && pick && c < bestCentre)) {
      best = d;
      bestCentre = c;
      pick = order;
    }
  }
  return pick;
}

/**
 * Every arrangement one move away from `items`:
 * - group swaps: a same-shaped area filled entirely by smaller widgets trades
 *   places with the dragged widget, keeping its internal arrangement;
 * - sequence moves: the dragged widget takes another index.
 */
export function candidatesFor(
  items: WidgetItem[],
  id: string,
  columns: number,
  toSlot: (box: Box) => Slot,
): Candidate[] {
  const places = layout(items, columns);
  const me = places.find((p) => p.id === id);
  if (!me) return [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = Math.max(...places.map((p) => p.row + p.h));
  const out: Candidate[] = [];

  for (let row = 0; row + me.h <= rows; row++) {
    for (let col = 0; col + me.w <= columns; col++) {
      const area = { col, row, w: me.w, h: me.h };
      if (overlaps(area, me)) continue;
      const group = places.filter((p) => overlaps(p, area));
      if (group.length < 2 || !group.every((p) => contains(area, p))) continue;
      const moved = places.map((p) =>
        p.id === id
          ? { ...p, col, row }
          : group.includes(p)
            ? { ...p, col: p.col - col + me.col, row: p.row - row + me.row }
            : p,
      );
      moved.sort((a, b) => a.row - b.row || a.col - b.col);
      out.push({
        order: moved.map((p) => byId.get(p.id) as WidgetItem),
        slot: toSlot(area),
      });
    }
  }

  const from = items.findIndex((item) => item.id === id);
  for (let i = 0; i < items.length; i++) {
    if (i === from) continue;
    const order = moveTo(items, id, i);
    const p = layout(order, columns).find((q) => q.id === id);
    if (p) out.push({ order, slot: toSlot(p) });
  }
  return out;
}
