// A box that scrolls only when its content is taller than it is. While it scrolls it is a labelled group
// that can take keyboard focus, so arrow keys and Page Down work without a mouse; when everything fits it
// is a plain box, so it adds no tab stop.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollRegionProps {
  /** Names the region for screen readers while it scrolls, for example "All actions, scrollable". */
  label: string;
  children: ReactNode;
  className?: string;
}

export function ScrollRegion({ label, children, className }: ScrollRegionProps) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  });

  return (
    <div
      ref={box}
      className={cn('min-h-0 overflow-x-hidden overflow-y-auto', className)}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? 'group' : undefined}
      aria-label={scrolls ? label : undefined}
    >
      {children}
    </div>
  );
}
