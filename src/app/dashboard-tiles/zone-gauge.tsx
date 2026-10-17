// The four risk zones as a bar, with a marker where the score sits. The number and the zone chip already say
// the same in words, so the gauge is hidden from screen readers.
import { COMPOSITE_TONE, TONE_FILL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { gaugeSegments, gaugeTicks, markerPosition } from './zones';

const SEGMENTS = gaugeSegments();
const TICKS = gaugeTicks();
/** The columns of the bar and of the labels under it, each as wide as the scores its zone covers. */
const COLUMNS = SEGMENTS.map((s) => `${s.end - s.start}fr`).join(' ');
/** Zones other than the current one stay visible but quiet. */
const QUIET_OPACITY = 0.35;

export function ZoneGauge({ score, className }: { score: number; className?: string }) {
  const { index, fraction } = markerPosition(score);
  return (
    <div aria-hidden className={cn('w-full px-1', className)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: COLUMNS }}>
        {SEGMENTS.map((segment, i) => (
          <div
            key={segment.zone}
            className="relative h-2.5 rounded-[var(--radius-chip)]"
            style={{ background: TONE_FILL[COMPOSITE_TONE[segment.zone]], opacity: i === index ? 1 : QUIET_OPACITY }}
          >
            {i === index && (
              <div
                className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-chip)] bg-ink ring-2 ring-surface"
                style={{ left: `${fraction * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>
      {/* Where each zone starts. Left out in a narrow tile, where the labels would run together. */}
      <div className="relative mt-1.5 hidden h-4 @[400px]:block">
        {SEGMENTS.map((segment, i) => (
          <span
            key={segment.zone}
            className="tnum absolute top-0 text-caption leading-none text-ink-3"
            style={{ left: `${segment.start}%`, transform: i === 0 ? undefined : 'translateX(-50%)' }}
          >
            {TICKS[i]}
          </span>
        ))}
        <span className="tnum absolute top-0 right-0 text-caption leading-none text-ink-3">{TICKS[TICKS.length - 1]}</span>
      </div>
    </div>
  );
}
