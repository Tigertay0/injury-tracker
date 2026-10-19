// A box that scrolls only when its content is taller than it is. While it scrolls it is a labelled group
// that can take keyboard focus, so arrow keys and Page Down work without a mouse; when everything fits it
// is a plain box, so it adds no tab stop. If it stops scrolling while it has focus, focus moves to the
// tile first, so it does not fall to the page.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { contentOverflows } from './fit';

/**
 * The bottom of the content itself, measured from the top of the box: the lowest edge of anything drawn in it. It leaves out
 * the inside of a nested box that scrolls or clips (that keeps its content to itself) and the unseen copies used for measuring.
 */
function contentBottom(box: HTMLElement): number {
  const rect = box.getBoundingClientRect();
  // The rects are drawn pixels, which a transform scales (a tile starts its entrance at 97%); the box is measured in layout pixels
  const scale = box.offsetHeight > 0 && rect.height > 0 ? rect.height / box.offsetHeight : 1;
  const top = rect.top + box.clientTop * scale - box.scrollTop * scale;
  let end = 0;
  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (!(child instanceof HTMLElement || child instanceof SVGElement) || child.hasAttribute('inert')) continue;
      const { bottom, width, height } = child.getBoundingClientRect();
      if (width === 0 && height === 0) continue;
      end = Math.max(end, (bottom - top) / scale);
      if (child instanceof HTMLElement && getComputedStyle(child).overflowY === 'visible') visit(child);
    }
  };
  visit(box);
  return end;
}

/** Moves keyboard focus to the tile's region (it takes focus from code, not from Tab), or to the tile's link or button when it has no region. */
export function focusTile(from: Element | null): void {
  const target = from?.closest('section') ?? from?.querySelector('a, button');
  (target as HTMLElement | null)?.focus({ preventScroll: true });
}

interface ScrollRegionProps {
  /** Names the region for screen readers while it scrolls, for example "All actions, scrollable". */
  label: string;
  children: ReactNode;
  className?: string;
}

export function ScrollRegion({ label, children, className }: ScrollRegionProps) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const scrolling = useRef(false);

  // One observer for the life of the box. It watches the box and everything inside it, not only its children: a
  // descendant can grow past its parent (a list with a minimum height, in a box that stays the same size) without
  // any child of the box changing size. Everything is looked at again, once a frame, when elements are added or removed.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      // A scrollbar that takes layout width (not an overlay one) makes the content narrower, and so sometimes shorter, once the box scrolls.
      // The box therefore keeps scrolling until the content fits with that much to spare, or it would switch on and off with every pass.
      const bar = scrolling.current ? Math.max(0, el.offsetWidth - el.clientWidth) : 0;
      const next = contentOverflows(el.scrollHeight, el.clientHeight - bar, Number.parseFloat(getComputedStyle(el).paddingBottom) || 0, () => contentBottom(el));
      scrolling.current = next;
      if (!next && document.activeElement === el) focusTile(el);
      setScrolls(next);
    };
    const resizes = new ResizeObserver(measure);
    const watch = () => {
      resizes.disconnect();
      resizes.observe(el);
      // Page elements only: the parts of a drawing (svg) never change size by themselves, and an unseen copy used for measuring (inert) does not
      // count. Only an inert box inside this one is skipped: while tiles are being arranged the whole tile is inert, and everything in it still counts.
      for (const node of Array.from(el.getElementsByTagName('*'))) {
        const inert = node.closest('[inert]');
        if (node instanceof HTMLElement && !(inert && el.contains(inert))) resizes.observe(node);
      }
    };
    watch();
    measure();
    let queued = 0;
    const changes = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        watch();
        measure();
      });
    });
    changes.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(queued);
      resizes.disconnect();
      changes.disconnect();
    };
  }, []);

  return (
    <div
      ref={box}
      // Hidden, not auto, while everything fits: a box whose content ends just inside it would otherwise scroll by its padding
      className={cn('min-h-0 overflow-x-hidden', scrolls ? 'overflow-y-auto' : 'overflow-y-hidden', className)}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? 'group' : undefined}
      aria-label={scrolls ? label : undefined}
    >
      {children}
    </div>
  );
}
