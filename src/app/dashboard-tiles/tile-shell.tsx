// The frame every dashboard tile shares, in the style of the 21st.dev draggable widget grid demo:
// a small uppercase title with optional meta on the right, then the content, with the key figure
// near the top and the supporting content pinned to the bottom (`mt-auto`). The shell is a
// container, so a tile adapts to the width it is given with `@[...]` variants, whatever column count
// the grid has at that moment.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ScrollRegion } from './scroll-region';

/** `wrap-anywhere`: a long word breaks rather than being cut off, when enlarged text leaves a tile narrower than the word. */
export const TILE_LABEL = 'text-label font-semibold uppercase tracking-[0.08em] text-ink-2 wrap-anywhere';

/** Padding steps from 16px in a small cell to 20px once the tile is 300px wide. */
export const TILE_PADDING = 'p-4 @[300px]:p-5';

/** The key figure of a tile. */
export const BIG_NUMBER = 'tnum font-display text-h2 font-bold text-ink';

interface TileShellProps {
  title: string;
  /** Id of the title, which names the tile's region. */
  titleId: string;
  /** Muted text or a small control on the right of the title. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TileShell({ title, titleId, meta, children, className }: TileShellProps) {
  return (
    <section aria-labelledby={titleId} tabIndex={-1} className="@container flex h-full min-h-0 flex-1 flex-col">
      {/* The cell is a fixed square, so enlarged text or text spacing can make the content taller than the tile. It scrolls
          then instead of being cut off (WCAG 1.4.4, 1.4.12). At the normal size nothing overflows and this is a plain box. */}
      <ScrollRegion label={`${title}, scrollable`} className={cn('flex flex-1 flex-col gap-3', TILE_PADDING, className)}>
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h2 id={titleId} className={TILE_LABEL}>
            {title}
          </h2>
          {meta}
        </header>
        {children}
      </ScrollRegion>
    </section>
  );
}
