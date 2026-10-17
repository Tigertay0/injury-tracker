// The four risk zones as a bar, with a marker where the score sits. The number and the zone chip already say
// the same in words, so the gauge is hidden from screen readers. It takes the free height of its tile: the bar
// grows (up to a limit) and the zone names above it and the scores below it stay with it, centred in what is left.
import { COMPOSITE_LABEL, COMPOSITE_TONE, TONE_FILL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { gaugeSegments, gaugeTicks, markerPosition } from './zones';

const SEGMENTS = gaugeSegments();
const TICKS = gaugeTicks();
/** The columns of the bar and of the labels around it, each as wide as the scores its zone covers. */
const COLUMNS = SEGMENTS.map((s) => `${s.end - s.start}fr`).join(' ');
/** Zones other than the current one stay visible but quiet. */
const QUIET_OPACITY = 0.35;

export function ZoneGauge({ score, className }: { score: number; className?: string }) {
  const { index, fraction } = markerPosition(score);
  return (
    <div aria-hidden className={cn('flex min-h-0 w-full flex-1 flex-col justify-center gap-2 px-1', className)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: COLUMNS }}>
        {SEGMENTS.map((segment, i) => (
          <span key={segment.zone} className={cn('whitespace-nowrap text-center text-caption leading-none', i === index ? 'font-semibold text-ink' : 'text-ink-3')}>
            {COMPOSITE_LABEL[segment.zone].replace(' risk', '')}
          </span>
        ))}
      </div>
      <div className="grid max-h-16 min-h-2.5 flex-1 gap-1" style={{ gridTemplateColumns: COLUMNS }}>
        {SEGMENTS.map((segment, i) => (
          <div
            key={segment.zone}
            className="relative rounded-[var(--radius-chip)]"
            style={{ background: TONE_FILL[COMPOSITE_TONE[segment.zone]], opacity: i === index ? 1 : QUIET_OPACITY }}
          >
            {i === index && (
              <div
                className="absolute -top-1 -bottom-1 w-1.5 -translate-x-1/2 rounded-[var(--radius-chip)] bg-ink ring-2 ring-surface"
                style={{ left: `${fraction * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>
      {/* Where each zone starts, and the top of the scale */}
      <div className="relative h-4">
        {SEGMENTS.map((segment, i) => (
          <span
            key={segment.zone}
            className="tnum absolute top-0 text-label leading-none text-ink-2"
            style={{ left: `${segment.start}%`, transform: i === 0 ? undefined : 'translateX(-50%)' }}
          >
            {TICKS[i]}
          </span>
        ))}
        <span className="tnum absolute top-0 right-0 text-label leading-none text-ink-2">{TICKS[TICKS.length - 1]}</span>
      </div>
    </div>
  );
}
