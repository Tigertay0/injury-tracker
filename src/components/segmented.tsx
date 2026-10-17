// Segmented control: transitions.dev "Tabs sliding" (16) as a radio group, styled as a joined,
// bordered button group. The accent fill slides to the selected option; it is measured from that
// option and snaps on first paint and resize.
import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'md' | 'lg';
}

export function Segmented<T extends string>({ label, options, value, onChange, className, size = 'md' }: SegmentedProps<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const firstPaint = useRef(true);

  const place = useCallback((animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    const tab = bar?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    if (!bar || !pill || !tab) return;
    // The fill now sits flush against the border, so measure fractional layout rects (offsetLeft and
    // offsetWidth round to whole pixels and would leave a sliver). Dividing by the bar's scale keeps
    // the maths right if an ancestor is mid-transform (a dialog opening).
    const barRect = bar.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const style = getComputedStyle(bar);
    const scale = barRect.width / (parseFloat(style.width) || barRect.width) || 1;
    const x = (tabRect.left - barRect.left) / scale - (parseFloat(style.borderLeftWidth) || 0);
    const width = tabRect.width / scale;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${x}px)`;
      pill.style.width = `${width}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${x}px)`;
      pill.style.width = `${width}px`;
    }
  }, []);

  useLayoutEffect(() => {
    place(!firstPaint.current);
    firstPaint.current = false;
  }, [value, place]);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => place(false));
    if (barRef.current) ro.observe(barRef.current);
    document.fonts?.ready.then(() => place(false));
    return () => ro.disconnect();
  }, [place]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = options.findIndex((o) => o.value === value);
    let nextIndex: number;
    if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = options.length - 1;
    else {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      nextIndex = (i + step + options.length) % options.length;
    }
    e.preventDefault();
    const next = options[nextIndex];
    onChange(next.value);
    barRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  }

  // 44px touch target for lg, 40px for md; labels never wrap.
  const tabSize = size === 'lg' ? 'h-11 px-4 text-body' : 'h-10 px-3.5 text-small';

  return (
    <div ref={barRef} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn('t-tabs max-w-full', className)}>
      <span ref={pillRef} aria-hidden className="t-tabs-pill" />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-value={o.value}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              't-tab inline-flex items-center justify-center font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              tabSize,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
