// A box that scrolls only when its content is taller than it is. While it scrolls it is a labelled group
// that can take keyboard focus, so arrow keys and Page Down work without a mouse; when everything fits it
// is a plain box, so it adds no tab stop. If it stops scrolling while it has focus, focus moves to the
// tile first, so it does not fall to the page.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Moves keyboard focus to the tile's region (it takes focus from code, not from Tab). */
export function focusTile(from: Element | null): void {
  from?.closest('section')?.focus({ preventScroll: true });
}

interface ScrollRegionProps {
  /** Names the region for screen readers while it scrolls, for example "All actions, scrollable". */
  label: string;
  children: ReactNode;
  className?: string;
  /** The content is hidden from assistive technology because the tile offers it another way. The box is hidden too, and never takes focus. */
  hidden?: boolean;
}

export function ScrollRegion({ label, children, className, hidden = false }: ScrollRegionProps) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);

  // One observer for the life of the box. It watches the box and its children, and the children are looked at
  // again when they are added or removed.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const next = el.scrollHeight > el.clientHeight + 1;
      if (!next && document.activeElement === el) focusTile(el);
      setScrolls(next);
    };
    const resizes = new ResizeObserver(measure);
    const watch = () => {
      resizes.disconnect();
      resizes.observe(el);
      for (const child of Array.from(el.children)) resizes.observe(child);
    };
    watch();
    measure();
    const changes = new MutationObserver(() => {
      watch();
      measure();
    });
    changes.observe(el, { childList: true });
    return () => {
      resizes.disconnect();
      changes.disconnect();
    };
  }, []);

  return (
    <div
      ref={box}
      className={cn('min-h-0 overflow-x-hidden overflow-y-auto', className)}
      tabIndex={scrolls && !hidden ? 0 : undefined}
      role={scrolls && !hidden ? 'group' : undefined}
      aria-label={scrolls && !hidden ? label : undefined}
      aria-hidden={hidden || undefined}
    >
      {children}
    </div>
  );
}
