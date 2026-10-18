// How many list items fit in a tile without cutting one. Kept apart from the component so the
// arithmetic can be tested without a DOM.

/**
 * @param heights  the height of each item, in order
 * @param gap      the space between two items
 * @param room     the height the whole list may use
 * @param reserve  the height of the "See all" button and the gap above it, kept free whenever
 *                 something is hidden
 * @returns how many leading items to show: all of them if they fit, otherwise as many as fit
 *          beside the button, and never fewer than one
 */
export function countThatFit(heights: readonly number[], gap: number, room: number, reserve: number): number {
  if (heights.length === 0) return 0;
  const total = heights.reduce((sum, h, i) => sum + h + (i > 0 ? gap : 0), 0);
  if (total <= room) return heights.length;
  let used = 0;
  let shown = 0;
  for (const h of heights) {
    const next = used + (shown > 0 ? gap : 0) + h;
    if (next + reserve > room) break;
    used = next;
    shown += 1;
  }
  return Math.max(1, shown);
}

export interface FitState {
  /** How many leading items to show. */
  count: number;
  /** How many items sit behind "See all". Zero when everything fits, and in a cramped tile. */
  hidden: number;
  /** Even the first item is too tall for the tile, so every item is shown in a list that scrolls. */
  cramped: boolean;
}

/** `countThatFit`, plus what the tile needs to know to lay itself out. */
export function fitState(heights: readonly number[], gap: number, room: number, reserve: number): FitState {
  const count = countThatFit(heights, gap, room, reserve);
  const total = heights.reduce((sum, h, i) => sum + h + (i > 0 ? gap : 0), 0);
  const first = (heights[0] ?? 0) + (heights.length > 1 ? reserve : 0);
  const cramped = total > room && first > room;
  return { count, hidden: cramped ? 0 : heights.length - count, cramped };
}

/** The footer follows the list; it is pinned to the bottom of the tile only while "See all" or a scrolling list is there. */
export function footerMode({ hidden, cramped }: FitState): 'flow' | 'pinned' {
  return hidden > 0 || cramped ? 'pinned' : 'flow';
}

/**
 * Whether extra content (the fuel trigger pills) fits under the list and the footer.
 * @param room     the height left once the footer is counted
 * @param listHeight  the height of the whole list
 */
export function trailingFits(room: number, listHeight: number, trailingHeight: number, gap: number): boolean {
  return listHeight + gap + trailingHeight <= room;
}

/**
 * Whether the content of a box is taller than the box, so part of it is out of reach without scrolling.
 *
 * `scrollHeight` is the browser's figure, and it counts the padding after the last child. A box whose content ends just
 * inside it (a tight tile, at the normal text size) therefore reads as taller than it is by up to that padding, and
 * must not turn into a scroller. So only when the figure is within the padding of fitting is the real end of the
 * content looked up, which costs a walk through the box.
 *
 * @param scrollHeight  the height of everything in the box (`scrollHeight`)
 * @param clientHeight  the height of the box (`clientHeight`)
 * @param paddingBottom the padding at the bottom of the box
 * @param contentEnd    the bottom of the content itself, measured from the top of the box
 */
export function contentOverflows(scrollHeight: number, clientHeight: number, paddingBottom: number, contentEnd: () => number): boolean {
  if (scrollHeight <= clientHeight + 1) return false;
  // The content ends at least this far down, whether or not the padding was counted
  if (scrollHeight - paddingBottom > clientHeight + 1) return true;
  return contentEnd() > clientHeight + 1;
}

export type FocusTarget = 'toggle' | 'scroller' | 'other';

/**
 * Whether the element that has keyboard focus is about to leave the page. The "See all" button goes when
 * nothing is hidden any more; the scrolling list goes when it closes by itself or the tile is no longer
 * cramped. The tile then moves focus somewhere steady first, so it does not fall to the page.
 */
export function focusWouldBeLost(focused: FocusTarget, now: { open: boolean; cramped: boolean }, next: FitState): boolean {
  if (focused === 'toggle') return next.hidden === 0;
  if (focused === 'scroller') {
    const keepsScroller = (now.open && next.hidden > 0) || next.cramped;
    return !keepsScroller;
  }
  return false;
}
