// The dashboard's tiles, their default order and sizes, and what to do with an order saved
// on the player's account. Plain TypeScript with no React, so it can be tested without a DOM.
import type { WidgetItem, WidgetSize } from '@/lib/widget-layout';

/** Every tile on the dashboard. A saved order may hold fewer, more or repeated ids; see `reconcileOrder`. */
export const TILE_IDS = ['score', 'workload', 'recovery', 'equipment', 'injury', 'load', 'movement', 'actions', 'fuel', 'report'] as const;
export type TileId = (typeof TILE_IDS)[number];

/** What a player sees until they arrange their own. */
export const DEFAULT_ORDER: readonly TileId[] = TILE_IDS;

/**
 * Turns a saved order into the order to show: the saved ids that this release knows, each once and
 * in their saved place, then any tile the save does not mention in default order. A later release can
 * add or drop a tile without a migration, and junk in the saved list cannot hide or repeat a tile.
 */
export function reconcileOrder(saved: readonly string[] | null | undefined, known: readonly string[] = DEFAULT_ORDER): string[] {
  const knownIds = new Set(known);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of saved ?? []) {
    if (typeof id !== 'string' || !knownIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  for (const id of known) if (!seen.has(id)) order.push(id);
  return order;
}

/** The title of each tile, which is also its accessible name. The score tile has three (see `scoreTitle`). */
export const TILE_TITLES = {
  workload: 'Workload ratio',
  recovery: 'Recovery',
  equipment: 'Cleats',
  injury: 'Injury history',
  load: 'Training load, last 28 days',
  movement: 'Movement this week',
  actions: 'What to do now',
  fuel: 'Fuel and recovery',
  report: 'Coach report',
} as const satisfies Record<Exclude<TileId, 'score'>, string>;

/* ------------------------------ Sizes ------------------------------ */

/**
 * `desktop` is three or four columns, `phone` is two columns below 768px, and `compact` is the
 * narrowest phones (under 372px), where a square cell is about 140px and too small for a score part.
 */
export const TILE_MODES = ['desktop', 'phone', 'compact'] as const;
export type TileMode = (typeof TILE_MODES)[number];

const PHONE_MAX_WIDTH = 768;
const COMPACT_MAX_WIDTH = 372;

/** The layout mode for a viewport width in CSS pixels. */
export function tileMode(viewportWidth: number): TileMode {
  if (viewportWidth < COMPACT_MAX_WIDTH) return 'compact';
  if (viewportWidth < PHONE_MAX_WIDTH) return 'phone';
  return 'desktop';
}

/*
 * Sizes are chosen so the default order tiles without a gap at four columns (desktop) and at two
 * (every mode), and so each tile's content fits its cell:
 * - desktop: the score and movement are large, the actions and fuel notes are tall columns, the load
 *   chart and the report are wide, and the four score parts are small squares;
 * - phone: two columns, so everything with a list or a chart is a full-width large tile;
 * - compact: as phone, with the score parts stretched across both columns.
 */
const SIZES: Record<TileMode, Record<TileId, WidgetSize>> = {
  desktop: { score: 'lg', workload: 'sm', recovery: 'sm', equipment: 'sm', injury: 'sm', load: 'wide', movement: 'lg', actions: 'tall', fuel: 'tall', report: 'wide' },
  phone: { score: 'lg', workload: 'sm', recovery: 'sm', equipment: 'sm', injury: 'sm', load: 'lg', movement: 'lg', actions: 'lg', fuel: 'lg', report: 'wide' },
  compact: { score: 'lg', workload: 'wide', recovery: 'wide', equipment: 'wide', injury: 'wide', load: 'lg', movement: 'lg', actions: 'lg', fuel: 'lg', report: 'wide' },
};

const isTileId = (id: string): id is TileId => (TILE_IDS as readonly string[]).includes(id);

/** The grid's items for an order: each tile with its size in this mode and its accessible name. */
export function tileItems(order: readonly string[], mode: TileMode, labels: Readonly<Record<TileId, string>>): WidgetItem[] {
  return order.filter(isTileId).map((id) => ({ id, size: SIZES[mode][id], label: labels[id] }));
}

/* ------------------------- Announcing a move ------------------------ */

/**
 * The tile a rearrangement moved. The tile that has keyboard focus wins when it changed place, since
 * that is the one the player moved. Otherwise it is the tile that travelled farthest.
 */
export function movedTile(before: readonly string[], after: readonly string[], focusedId?: string | null): string | null {
  const shift = (id: string) => {
    const was = before.indexOf(id);
    return was < 0 ? 0 : after.indexOf(id) - was;
  };
  if (focusedId && after.includes(focusedId) && shift(focusedId) !== 0) return focusedId;
  let best: string | null = null;
  let farthest = 0;
  for (const id of after) {
    const distance = Math.abs(shift(id));
    if (distance > farthest) {
      farthest = distance;
      best = id;
    }
  }
  return best;
}

/** What a screen reader hears after a move, for example "Recovery moved to position 3 of 10". */
export function announceMove(label: string, order: readonly string[], id: string): string {
  const index = order.indexOf(id);
  return index < 0 ? '' : `${label} moved to position ${index + 1} of ${order.length}`;
}
