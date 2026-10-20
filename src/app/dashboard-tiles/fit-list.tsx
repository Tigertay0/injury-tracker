// A list for a tile of fixed size. It shows the first items that fit, whole, and a "See all"
// button for the rest; opening it lets the list scroll inside the tile. An item is never cut: a
// hidden copy of the list is measured, and only the items that fit are drawn. If even the first item
// is too tall for the tile, every item is shown in a list that scrolls instead.
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fitState, focusWouldBeLost, footerMode, trailingFits, type FitState, type FocusTarget } from './fit';
import { focusTile, ScrollRegion } from './scroll-region';

/** The "See all" button (36px) and the gap above it. */
const TOGGLE_RESERVE = 44;
/** The gap between the list area, the button and the footer. */
const BOX_GAP = 8;
/** The height, in rem, that a cramped tile keeps for its list at the least, so that the list is never squeezed to nothing. */
const CRAMPED_LIST_MIN_REM = 6;

interface FitListProps<T> {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** What the items are, for the button: "See all 5 actions". */
  noun: string;
  /** Names the list for screen readers while it scrolls: "All actions, scrollable". */
  scrollLabel: string;
  /**
   * Hide the list from screen readers, when the tile offers the same information another way. The "See all" button and the
   * scrolling box stay reachable by keyboard, so a sighted keyboard player can still open and scroll the list.
   */
  listHidden?: boolean;
  /** Classes for the list itself, which set the space between items. */
  listClassName?: string;
  /** Always in view under the list. It follows the list when everything fits, and is pinned to the bottom of the tile while "See all" or a scrolling list is there. */
  footer?: ReactNode;
  /** Extra content for the bottom of the tile, drawn only when it fits without crowding the list or the footer. */
  trailing?: ReactNode;
  className?: string;
}

interface Layout {
  fit: FitState;
  trailingShown: boolean;
  /** In a cramped tile, the height the box is given so that its list is not squeezed to nothing; 0 otherwise (see `measure`). */
  minHeight: number;
}

/** What kind of element has focus inside the list, for deciding whether a layout change would take it away. */
function focusKind(box: HTMLElement | null): FocusTarget {
  const focused = document.activeElement;
  if (!box || !focused || !box.contains(focused)) return 'other';
  if (focused.hasAttribute('data-fit-toggle')) return 'toggle';
  return focused.getAttribute('role') === 'group' ? 'scroller' : 'other';
}

export function FitList<T>({ items, keyOf, renderItem, noun, scrollLabel, listHidden, listClassName = 'flex flex-col gap-2', footer, trailing, className }: FitListProps<T>) {
  const box = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLOListElement>(null);
  const ghostFooter = useRef<HTMLDivElement>(null);
  const ghostTrailing = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [layout, setLayout] = useState<Layout>({ fit: { count: items.length, hidden: 0, cramped: false }, trailingShown: false, minHeight: 0 });
  const [open, setOpen] = useState(false);
  // The measuring function lives as long as the list, so it reads the latest values through a ref that is
  // brought up to date after each render and before the list is measured
  const latest = useRef({ open, layout });
  useLayoutEffect(() => {
    latest.current = { open, layout };
  });

  const measure = useCallback(() => {
    const copy = ghost.current;
    if (!box.current || !copy) return;
    const footerBlock = ghostFooter.current?.offsetHeight ? ghostFooter.current.offsetHeight + BOX_GAP : 0;
    const room = box.current.clientHeight - footerBlock;
    const heights = Array.from(copy.children, (child) => (child as HTMLElement).offsetHeight);
    const gap = Number.parseFloat(getComputedStyle(copy).rowGap) || 0;
    const fit = fitState(heights, gap, room, TOGGLE_RESERVE);
    const listHeight = heights.reduce((sum, h, i) => sum + h + (i > 0 ? gap : 0), 0);
    const trailingHeight = ghostTrailing.current?.offsetHeight ?? 0;
    const trailingShown = trailingHeight > 0 && fit.hidden === 0 && !fit.cramped && trailingFits(room, listHeight, trailingHeight, BOX_GAP);
    // A cramped tile may have so little room left that its list shrinks to nothing. The box then keeps a minimum for the list
    // (CRAMPED_LIST_MIN_REM, and always a pixel short of the first item, so that it stays cramped and cannot flip back and forth), and
    // the tile around it scrolls to reach it. The box really takes up that room, so nothing else in the tile is drawn over it.
    // A box that already has that much is left as it is.
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const minHeight = fit.cramped ? Math.max(0, Math.min((heights[0] ?? 0) - 1, CRAMPED_LIST_MIN_REM * rem)) + footerBlock : 0;

    const { open: wasOpen, layout: was } = latest.current;
    // Keep keyboard focus on something steady if this change takes the focused element away
    if (focusWouldBeLost(focusKind(box.current), { open: wasOpen, cramped: was.fit.cramped }, fit)) focusTile(box.current);
    setLayout((prev) =>
      prev.trailingShown === trailingShown &&
      prev.minHeight === minHeight &&
      prev.fit.count === fit.count &&
      prev.fit.hidden === fit.hidden &&
      prev.fit.cramped === fit.cramped
        ? prev
        : { fit, trailingShown, minHeight },
    );
    // A bigger tile can make everything fit while the list is open: close it, so it is not left open and scrolling
    if (fit.hidden === 0) setOpen(false);
  }, []);

  // Measure before the first paint, and again whenever the tile or the text inside it changes size
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [box.current, ghost.current, ghostFooter.current, ghostTrailing.current]) if (el) observer.observe(el);
    return () => observer.disconnect();
    // footer and trailing are new nodes on every render; the observer already sees their size change
  }, [measure, items, footer != null, trailing != null]);

  const { fit, trailingShown, minHeight } = layout;
  const { cramped, hidden } = fit;
  const showAll = open || cramped;
  const shown = showAll ? items : items.slice(0, fit.count);
  const list = (
    <ol id={listId} aria-hidden={listHidden || undefined} className={listClassName}>
      {shown.map((item, i) => (
        <li key={keyOf(item)}>{renderItem(item, i)}</li>
      ))}
    </ol>
  );

  return (
    <div ref={box} className={cn('relative flex min-h-0 flex-1 flex-col gap-2', className)} style={minHeight ? { minHeight } : undefined}>
      {/* The padding gives a row that bleeds past the text edge (a hover fill) room inside the clip */}
      {showAll ? (
        <ScrollRegion label={scrollLabel} className="-mx-2.5 px-2.5">
          {list}
        </ScrollRegion>
      ) : (
        <div className="-mx-2.5 min-h-0 overflow-hidden px-2.5">{list}</div>
      )}
      {hidden > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          data-fit-toggle
          aria-expanded={listHidden ? undefined : open}
          aria-controls={listHidden ? undefined : listId}
          onClick={() => setOpen((was) => !was)}
        >
          {open ? 'Show fewer' : `See all ${items.length} ${noun}`}
        </Button>
      )}
      {footer && <div className={footerMode(fit) === 'pinned' ? 'mt-auto' : undefined}>{footer}</div>}
      {trailingShown && <div className="mt-auto">{trailing}</div>}
      {/* The same list, footer and extra content, unseen, to read their heights at the tile's width. Zero tall and clipped,
          so that however long it is it adds nothing to the scrollable area of the tile around it. */}
      <div aria-hidden inert className="pointer-events-none invisible absolute inset-x-0 top-0 -z-10 h-0 overflow-hidden">
        <ol ref={ghost} className={listClassName}>
          {items.map((item, i) => (
            <li key={keyOf(item)}>{renderItem(item, i)}</li>
          ))}
        </ol>
        {footer && <div ref={ghostFooter}>{footer}</div>}
        {trailing && <div ref={ghostTrailing}>{trailing}</div>}
      </div>
    </div>
  );
}
