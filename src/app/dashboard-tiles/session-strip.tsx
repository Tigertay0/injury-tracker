// The last 28 days as a small calendar, four weeks of seven days, with a filled cell for each day that has a
// logged session. It shows the player how far the baseline has come. The rows share the height it is given,
// up to a limit, so it fills the free space of its tile.
import { cn } from '@/lib/utils';

export function SessionStrip({ days, className }: { days: readonly boolean[]; className?: string }) {
  const logged = days.filter(Boolean).length;
  return (
    <div
      role="img"
      aria-label={logged === 0 ? 'No sessions logged in the last 28 days' : `Sessions logged on ${logged} of the last ${days.length} days`}
      className={cn('grid max-h-56 min-h-[4.25rem] flex-1 auto-rows-fr grid-cols-7 gap-1', className)}
    >
      {days.map((on, i) => (
        <div
          key={i}
          // Forced-colours hooks (styles.css): a logged day is a fill, an empty day a bordered track
          data-meter-fill={on ? '' : undefined}
          data-meter-track={on ? undefined : ''}
          className={cn('rounded-[var(--radius-chip)]', on ? 'bg-accent' : 'bg-sunken ring-1 ring-inset ring-line')}
        />
      ))}
    </div>
  );
}
