// transitions.dev "Text states swap" (04): old text exits up with blur, new text
// enters from below. Used where a status word changes while the user watches.
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const SWAP_MS = 150;

export function TextSwap({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || text === shown) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      return;
    }
    el.classList.add('is-exit');
    const t = setTimeout(() => {
      setShown(text);
      el.classList.remove('is-exit');
      el.classList.add('is-enter-start');
      void el.offsetHeight;
      el.classList.remove('is-enter-start');
    }, SWAP_MS);
    return () => clearTimeout(t);
  }, [text, shown]);

  return (
    <span ref={ref} className={cn('t-text-swap', className)}>
      {shown}
    </span>
  );
}
