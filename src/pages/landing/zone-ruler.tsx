// ACWR scale from 0.4 to 2.0 with the four PRD zones and a marker for the current value.
import { cn } from '@/lib/utils';

const MIN = 0.4;
const MAX = 2.0;
const ZONES = [
  { from: MIN, to: 0.8, label: 'Under', className: 'bg-risk-moderate-soft' },
  { from: 0.8, to: 1.3, label: 'Sweet spot', className: 'bg-risk-low-soft' },
  { from: 1.3, to: 1.5, label: 'Caution', className: 'bg-risk-high-soft' },
  { from: 1.5, to: MAX, label: 'Danger', className: 'bg-risk-very-high-soft' },
];

const pct = (v: number) => ((Math.min(Math.max(v, MIN), MAX) - MIN) / (MAX - MIN)) * 100;

export function ZoneRuler({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('relative overflow-x-clip pt-3', className)} aria-hidden>
      <div className="flex h-3 overflow-hidden rounded-full">
        {ZONES.map((z) => (
          <div key={z.label} className={cn('h-full border-r-2 border-surface last:border-r-0', z.className)} style={{ width: `${pct(z.to) - pct(z.from)}%` }} />
        ))}
      </div>
      {/* Full-width track moved by transform, so translateX(%) maps to the scale */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${pct(value)}%)` }}
      >
        <div className="h-[26px] w-[3px] -translate-x-1/2 rounded-full bg-ink" />
      </div>
      <div className="relative mt-1.5 h-4 text-caption text-ink-2">
        {ZONES.map((z) => (
          <span key={z.label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(pct(z.from) + pct(z.to)) / 2}%` }}>
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
