// The last 28 days as a small calendar, four weeks of seven days, with a filled cell for each day that has a
// logged session. It shows the player how far the baseline has come.
import { cn } from '@/lib/utils';

export function SessionStrip({ days, className }: { days: readonly boolean[]; className?: string }) {
  const logged = days.filter(Boolean).length;
  return (
    <div
      role="img"
      aria-label={logged === 0 ? 'No sessions logged in the last 28 days' : `Sessions logged on ${logged} of the last ${days.length} days`}
      className={cn('grid grid-cols-7 gap-1', className)}
    >
      {days.map((on, i) => (
        <div key={i} className={cn('h-3.5 rounded-[var(--radius-chip)]', on ? 'bg-accent' : 'bg-sunken ring-1 ring-inset ring-line')} />
      ))}
    </div>
  );
}
