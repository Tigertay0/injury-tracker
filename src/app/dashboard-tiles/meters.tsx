// Mini visuals for the small score tiles: a thin track with a fill, a marker or segments. They only
// repeat what the status chip already says in words, so they are hidden from screen readers.
// The data attributes are hooks for the forced-colours rules in styles.css: a track gets a border, a fill the Highlight colour.
import { TONE_FILL, type Tone } from '@/lib/labels';
import { cn } from '@/lib/utils';

const TRACK = 'relative h-2 w-full rounded-[var(--radius-chip)] bg-sunken ring-1 ring-inset ring-line';
const ROUND = 'rounded-[var(--radius-chip)]';

const percent = (fraction: number) => `${Math.round(Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0)) * 100)}%`;

/** A track filled from the left up to `fraction` (0 to 1). */
export function FillMeter({ fraction, tone, className }: { fraction: number; tone: Tone; className?: string }) {
  return (
    <div aria-hidden data-meter-track className={cn(TRACK, 'overflow-hidden', className)}>
      <div data-meter-fill className={cn('h-full', ROUND)} style={{ width: percent(fraction), background: TONE_FILL[tone] }} />
    </div>
  );
}

/** `filled` of `total` equal segments lit, for a small set of levels. */
export function SegmentMeter({ filled, total, tone, className }: { filled: number; total: number; tone: Tone; className?: string }) {
  return (
    <div aria-hidden className={cn('flex h-2 w-full gap-1', className)}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          data-meter-track
          data-meter-fill={i < filled ? '' : undefined}
          className={cn('h-full flex-1 ring-1 ring-inset ring-line', ROUND, i >= filled && 'bg-sunken')}
          style={i < filled ? { background: TONE_FILL[tone] } : undefined}
        />
      ))}
    </div>
  );
}

/** The workload ratio on a 0 to 2 scale, with the 0.8 to 1.3 sweet spot shaded and a marker at the ratio. */
const SCALE_MAX = 2;
const SWEET_FROM = 0.8;
const SWEET_TO = 1.3;

export function RatioMeter({ ratio, tone, className }: { ratio: number | null; tone: Tone; className?: string }) {
  return (
    <div aria-hidden data-meter-track className={cn(TRACK, className)}>
      <div
        className={cn('absolute inset-y-0 bg-risk-low-soft', ROUND)}
        style={{ left: percent(SWEET_FROM / SCALE_MAX), width: percent((SWEET_TO - SWEET_FROM) / SCALE_MAX) }}
      />
      {ratio !== null && (
        <div
          data-meter-fill
          className={cn('absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 ring-2 ring-surface', ROUND)}
          style={{ left: percent(ratio / SCALE_MAX), background: TONE_FILL[tone] }}
        />
      )}
    </div>
  );
}
