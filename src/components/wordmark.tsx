import { cn } from '@/lib/utils';

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-display text-[1.375rem] leading-none font-extrabold tracking-[-0.01em] text-ink', className)}>PitchSafe</span>;
}
