// A list for a tile of fixed size. It shows the first items that fit, whole, and a "See all"
// button for the rest; opening it lets the list scroll inside the tile. An item is never cut: a
// hidden copy of the list is measured, and only the items that fit are drawn. If even the first item
// is too tall for the tile, every item is shown in a list that scrolls instead.
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fitState, footerMode, type FitState } from './fit';
import { ScrollRegion } from './scroll-region';

/** The "See all" button (36px) and the gap above it. */
const TOGGLE_RESERVE = 44;
/** The gap between the list area, the button and the footer. */
const BOX_GAP = 8;

interface FitListProps<T> {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** What the items are, for the button: "See all 5 actions". */
  noun: string;
  /** Names the list for screen readers while it scrolls: "All actions, scrollable". */
  scrollLabel: string;
  /** Hide the list from screen readers, when the tile offers the same information another way. */
  listHidden?: boolean;
  /** Classes for the list itself, which set the space between items. */
  listClassName?: string;
  /** Always in view under the list. It follows the list when everything fits, and is pinned to the bottom of the tile while "See all" or a scrolling list is there. */
  footer?: ReactNode;
  className?: string;
}

export function FitList<T>({ items, keyOf, renderItem, noun, scrollLabel, listHidden, listClassName = 'flex flex-col gap-2', footer, className }: FitListProps<T>) {
  const box = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLOListElement>(null);
  const ghostFooter = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [fit, setFit] = useState<FitState>({ count: items.length, hidden: 0, cramped: false });
  const [open, setOpen] = useState(false);

  const measure = useCallback(() => {
    const copy = ghost.current;
    if (!box.current || !copy) return;
    const footerHeight = ghostFooter.current?.offsetHeight ?? 0;
    const room = box.current.clientHeight - (footerHeight > 0 ? footerHeight + BOX_GAP : 0);
    const heights = Array.from(copy.children, (child) => (child as HTMLElement).offsetHeight);
    const gap = Number.parseFloat(getComputedStyle(copy).rowGap) || 0;
    const next = fitState(heights, gap, room, TOGGLE_RESERVE);
    setFit((was) => (was.count === next.count && was.hidden === next.hidden && was.cramped === next.cramped ? was : next));
    // A bigger tile can make everything fit while the list is open: close it, so it is not left open and scrolling
    if (next.hidden === 0) setOpen(false);
  }, []);

  // Measure before the first paint, and again whenever the tile or the text inside it changes size
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [box.current, ghost.current, ghostFooter.current]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items, footer]);

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
    <div ref={box} className={cn('relative flex min-h-0 flex-1 flex-col gap-2', className)}>
      {/* The padding gives a row that bleeds past the text edge (a hover fill) room inside the clip */}
      {showAll ? (
        <ScrollRegion label={scrollLabel} className="-mx-2.5 px-2.5">
          {list}
        </ScrollRegion>
      ) : (
        <div className="-mx-2.5 min-h-0 overflow-hidden px-2.5">{list}</div>
      )}
      {hidden > 0 && (
        <Button type="button" variant="secondary" size="sm" className="self-start" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((was) => !was)}>
          {open ? 'Show fewer' : `See all ${items.length} ${noun}`}
        </Button>
      )}
      {footer && <div className={footerMode(fit) === 'pinned' ? 'mt-auto' : undefined}>{footer}</div>}
      {/* The same list and footer, unseen, to read their heights at the tile's width */}
      <div aria-hidden inert className="pointer-events-none invisible absolute inset-x-0 top-0 -z-10">
        <ol ref={ghost} className={listClassName}>
          {items.map((item, i) => (
            <li key={keyOf(item)}>{renderItem(item, i)}</li>
          ))}
        </ol>
        {footer && <div ref={ghostFooter}>{footer}</div>}
      </div>
    </div>
  );
}
