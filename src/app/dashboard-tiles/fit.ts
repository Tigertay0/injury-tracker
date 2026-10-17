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
