import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { VariantMeta } from './shared';

const VARIANTS = [
  { to: '/preview/floodlit', name: 'Floodlit', text: 'Dark and cinematic. A moving glass shader behind the headline, then the real dashboard tilts into view as you scroll.' },
  { to: '/preview/horizon', name: 'Horizon', text: 'A 3D night scene with stars and mountain layers. The camera flies forward as you scroll through load, recovery and play.' },
  { to: '/preview/liquid', name: 'Liquid', text: 'Light and premium. A liquid-metal shield and a headline that dissolves into each of the four things that set your risk.' },
] as const;

export default function Chooser() {
  return (
    <main className="mx-auto min-h-dvh max-w-[760px] bg-ground px-5 py-16 sm:px-8">
      <VariantMeta title="Choose" />
      <h1 className="font-display text-display-s font-extrabold text-ink">Three home pages</h1>
      <p className="mt-3 text-lead text-ink-2">Same copy and the same app, three different looks. Open each on your laptop and your phone.</p>
      <ul className="mt-10 grid gap-3">
        {VARIANTS.map((v, i) => (
          <li key={v.to}>
            <Link to={v.to} className="group flex items-start gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <span className="tnum font-display text-h2 font-extrabold text-ink-3">{i + 1}</span>
              <span className="flex-1">
                <span className="block font-display text-h3 font-extrabold text-ink">{v.name}</span>
                <span className="mt-1 block text-body text-ink-2">{v.text}</span>
              </span>
              <ArrowRight aria-hidden weight="bold" className="mt-2 size-5 text-ink-2 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
