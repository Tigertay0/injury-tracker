import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { DISCLAIMER, FOOT_LINKS } from './content';

/** Page title, and keeps the preview pages out of search results. */
export function VariantMeta({ title }: { title: string }) {
  return (
    <>
      <title>{`${title} · PitchSafe home preview`}</title>
      <meta name="robots" content="noindex" />
    </>
  );
}

export function VariantFooter({ tone, className }: { tone: 'dark' | 'light'; className?: string }) {
  const dark = tone === 'dark';
  return (
    <footer className={cn('border-t', dark ? 'border-white/10 text-white' : 'border-black/[0.07] text-[#0b0d12]', className)}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-md">
          <p className="font-display text-[1.375rem] leading-none font-extrabold">PitchSafe</p>
          <p className={cn('mt-3 text-small', dark ? 'text-white/60' : 'text-black/60')}>{DISCLAIMER}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-6 gap-y-3 md:justify-end">
          {FOOT_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={cn('text-small underline-offset-4 hover:underline', dark ? 'text-white/70 hover:text-white' : 'text-black/65 hover:text-black')}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={cn('mx-auto max-w-[1200px] px-5 pb-8 text-caption sm:px-8', dark ? 'text-white/45' : 'text-black/50')}>© 2026 PitchSafe</div>
    </footer>
  );
}

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
          <div key={z.from} className="h-full rounded-full" style={{ width: `${pct(z.to) - pct(z.from)}%`, background: z.color, opacity: dark ? 0.85 : 1 }} />
        ))}
      </div>
      <div className="absolute top-0 h-[22px] w-[3px] -translate-x-1/2 rounded-full" style={{ left: `${pct(value)}%`, background: dark ? '#fff' : '#0b0d12' }} />
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
