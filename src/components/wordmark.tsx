import { useId } from 'react';
import { cn } from '@/lib/utils';

/** The PitchSafe crest: a shield cut by a pitch's halfway line and centre circle. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('size-[1.1em] shrink-0', className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d93ff" />
          <stop offset="1" stopColor="#2346e0" />
        </linearGradient>
      </defs>
      <path d="M10 7H54V29C54 41 47 50 32 58C17 50 10 41 10 29Z" fill={`url(#${id})`} />
      <path d="M10 30H54" stroke="var(--ground, #070b18)" strokeWidth="3.5" />
      <circle cx="32" cy="30" r="8" fill="none" stroke="var(--ground, #070b18)" strokeWidth="3.5" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-[1.375rem] leading-none font-bold tracking-[-0.03em] text-ink', className)}>
      <LogoMark />
      PitchSafe
    </span>
  );
}
