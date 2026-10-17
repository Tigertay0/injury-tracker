// A list for a tile of fixed size. It shows the first items that fit, whole, and a "See all"
// button for the rest; opening it lets the list scroll inside the tile. An item is never cut: a
// hidden copy of the list is measured, and only the items that fit are drawn. If even the first item
// is too tall for the tile, every item is shown in a list that scrolls instead.
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { countThatFit } from './fit';

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
  /** Hide the list from screen readers, when the tile offers the same information another way. */
  listHidden?: boolean;
  /** Classes for the list itself, which set the space between items. */
  listClassName?: string;
  /** Always in view under the list, for text that must not be missed. In a cramped tile it scrolls with the list. */
  footer?: ReactNode;
  className?: string;
}

export function FitList<T>({ items, keyOf, renderItem, noun, listHidden, listClassName = 'flex flex-col gap-2', footer, className }: FitListProps<T>) {
  const box = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLOListElement>(null);
  const ghostFooter = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [fit, setFit] = useState(items.length);
  const [open, setOpen] = useState(false);
  // The first item alone can be too tall for a small tile, even without the button. Then every item is
  // shown whole in a list that scrolls, rather than a button that would leave no room to read one.
  const [cramped, setCramped] = useState(false);

  const measure = useCallback(() => {
    const copy = ghost.current;
    if (!box.current || !copy) return;
    const footerHeight = ghostFooter.current?.offsetHeight ?? 0;
    const room = box.current.clientHeight - (footerHeight > 0 ? footerHeight + BOX_GAP : 0);
    const heights = Array.from(copy.children, (child) => (child as HTMLElement).offsetHeight);
    const gap = Number.parseFloat(getComputedStyle(copy).rowGap) || 0;
    const count = countThatFit(heights, gap, room, TOGGLE_RESERVE);
    const total = heights.reduce((sum, h, i) => sum + h + (i > 0 ? gap : 0), 0);
    const first = (heights[0] ?? 0) + (heights.length > 1 ? TOGGLE_RESERVE : 0);
    setFit(count);
    setCramped(total > room && first > room);
  }, []);

  // Measure before the first paint, and again whenever the tile or the text inside it changes size
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [box.current, ghost.current, ghostFooter.current]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items, footer]);

  const hidden = cramped ? 0 : Math.max(0, items.length - fit);
  const shown = open || cramped ? items : items.slice(0, fit);
  const scrolls = open || cramped;

  return (
    <div ref={box} className={cn('relative flex min-h-0 flex-1 flex-col gap-2', className)}>
      <div
        // The padding gives a row that bleeds past the text edge (a hover fill) room inside the clip
        className={cn('-mx-2.5 min-h-0 px-2.5', scrolls ? 'overflow-y-auto' : 'overflow-hidden')}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? 'group' : undefined}
        aria-label={scrolls ? noun : undefined}
      >
        <ol id={listId} aria-hidden={listHidden || undefined} className={listClassName}>
          {shown.map((item, i) => (
            <li key={keyOf(item)}>{renderItem(item, i)}</li>
          ))}
        </ol>
        {cramped && footer && <div className="mt-2">{footer}</div>}
      </div>
      {hidden > 0 && (
        <Button type="button" variant="secondary" size="sm" className="self-start" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((was) => !was)}>
          {open ? 'Show fewer' : `See all ${items.length} ${noun}`}
        </Button>
      )}
      {!cramped && footer && <div className="mt-auto">{footer}</div>}
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
