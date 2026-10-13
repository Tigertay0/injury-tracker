import { cn } from '@/lib/utils';

const ZONE_SEGMENTS = [
  { from: 0.4, to: 0.8, color: 'oklch(0.84 0.12 88)' },
  { from: 0.8, to: 1.3, color: 'oklch(0.78 0.13 152)' },
  { from: 1.3, to: 1.5, color: 'oklch(0.78 0.13 55)' },
  { from: 1.5, to: 2.0, color: 'oklch(0.74 0.15 27)' },
];
const pct = (v: number) => ((v - 0.4) / 1.6) * 100;

/** Workload-ratio scale with the app's four zones and a marker at `value`. Decorative. */
export function ZoneBar({ value, tone, className }: { value: number; tone: 'dark' | 'light'; className?: string }) {
  const dark = tone === 'dark';
  return (
    <div className={cn('relative pt-2', className)} aria-hidden>
      <div className="flex h-2.5 gap-[3px]">
        {ZONE_SEGMENTS.map((z) => (
          <div key={z.from} className="h-full" style={{ width: `${pct(z.to) - pct(z.from)}%`, background: z.color, opacity: dark ? 0.85 : 1 }} />
        ))}
      </div>
      <div className="absolute top-0 h-[22px] w-[3px] -translate-x-1/2" style={{ left: `${pct(value)}%`, background: dark ? '#fff' : '#0b0d12' }} />
      <div className={cn('tnum relative mt-2 h-4 text-caption', dark ? 'text-white/55' : 'text-black/55')}>
        {[0.8, 1.3, 1.5].map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
            {t.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
