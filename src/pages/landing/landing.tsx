import { Link } from 'react-router';
import { ArrowRight, Check, Prohibit } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { LoadDemo } from './load-demo';
import { EquipmentMatrix } from './equipment-matrix';
import { Faq } from './faq';

const LOG_GET = [
  { when: 'After every session', log: 'How long you played and how hard it felt, from 1 to 10.', get: 'Your training load, and how this week compares with your last four.' },
  { when: 'Once a week', log: 'Sleep, muscle soreness, stress and how well you ate.', get: 'A recovery score out of 10.' },
  { when: 'Once', log: 'Your cleats and the surface you usually play on.', get: 'Whether your studs suit the ground, and safer options if not.' },
  { when: 'When it happens', log: 'Any injury: where, what type, how bad.', get: 'Extra weight for the injuries most likely to come back.' },
];

const LIMITS = [
  'It cannot diagnose an injury or tell you that you are fit to play.',
  'It relies on how hard you say a session felt, which is subjective.',
  'It cannot see contact injuries or freak accidents coming.',
  'It has not been tested in a clinical trial against real injury outcomes.',
];

export default function Landing() {
  return (
    <>
      {/* Hero: the claim on the left, the working mechanism on the right */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-10 pb-16 sm:px-8 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-24">
        <div className="max-w-xl">
          <h1 className="font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.015em] text-ink sm:text-display-m lg:text-[4.25rem]">
            Know when training turns risky.
          </h1>
          <p className="mt-5 max-w-[34rem] text-lead text-ink-2">
            Log your sessions, recovery and cleats. PitchSafe turns them into one injury-risk score, built on published sports science. Free.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/use">
                Use our app
                <ArrowRight aria-hidden weight="bold" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how">How it works</a>
            </Button>
          </div>
        </div>
        <LoadDemo />
      </section>

      {/* What you log, what you get */}
      <section id="how" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="max-w-2xl font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.01em] text-ink sm:text-display-s">
            Four quick inputs. One clear answer.
          </h2>
          <p className="mt-4 max-w-xl text-lead text-ink-2">No GPS vest, no watch. A minute after training and a minute once a week.</p>

          <div className="mt-10 overflow-hidden rounded-[var(--radius-panel)] border border-line">
            <div className="hidden grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] gap-6 bg-sunken px-6 py-3 text-label font-semibold text-ink-2 md:grid">
              <span>When</span>
              <span>You log</span>
              <span>You get</span>
            </div>
            {LOG_GET.map((row, i) => (
              <div key={row.when} className={`grid gap-2 px-5 py-5 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:px-6 ${i % 2 === 1 ? 'bg-ground' : 'bg-surface'}`}>
                <p className="text-small font-semibold text-accent-ink">{row.when}</p>
                <p className="text-body text-ink">{row.log}</p>
                <p className="flex gap-2 text-body text-ink-2">
                  <Check aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-risk-low" />
                  <span>
                    <span className="sr-only">You get: </span>
                    {row.get}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-body text-ink">
            Together they make a <strong className="font-semibold">0 to 100 risk score</strong> with up to five actions to take, and a one-page report you can send your coach.
          </p>
        </div>
      </section>

      {/* How the score is built */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
        <h2 className="max-w-2xl font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.01em] text-ink sm:text-display-s">
          No black box. Here is the whole recipe.
        </h2>
        <p className="mt-4 max-w-xl text-lead text-ink-2">The same formulas pro clubs use for load monitoring, from peer-reviewed research. Every number on your dashboard can be traced back.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          <article className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 lg:col-span-4">
            <h3 className="text-h3 font-display font-extrabold text-ink">Training load</h3>
            <p className="mt-2 max-w-lg text-body text-ink-2">Each session's load is minutes times effort. Your ratio compares the last 7 days with your average week over the last 28.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-control)] bg-sunken p-4">
                <p className="text-label font-semibold text-ink-2">Session load</p>
                <p className="tnum mt-1 text-lead font-semibold text-ink">60 min × effort 7 = 420</p>
              </div>
              <div className="rounded-[var(--radius-control)] bg-sunken p-4">
                <p className="text-label font-semibold text-ink-2">Workload ratio (ACWR)</p>
                <p className="mt-1 text-lead font-semibold text-ink">Last 7 days ÷ average week</p>
              </div>
            </div>
            <p className="mt-4 text-small text-ink-2">0.8 to 1.3 is the sweet spot. Above 1.5 is a spike linked to more injuries (Hulin et al., 2016; Gabbett, 2016).</p>
          </article>

          <article className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 lg:col-span-2">
            <h3 className="text-h3 font-display font-extrabold text-ink">The weighting</h3>
            <dl className="mt-4 space-y-3">
              {[
                ['45%', 'Training load'],
                ['30%', 'Recovery'],
                ['25%', 'Cleats and surface'],
              ].map(([pctValue, label]) => (
                <div key={label} className="flex items-baseline gap-3 border-b border-line pb-3 last:border-b-0">
                  <dt className="tnum w-16 font-display text-h2 font-extrabold text-ink">{pctValue}</dt>
                  <dd className="text-body text-ink-2">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-small text-ink-2">Then past injuries can raise it, up to double. A torn knee ligament adds the most.</p>
          </article>

          <article className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 lg:col-span-3">
            <h3 className="text-h3 font-display font-extrabold text-ink">Cleats and surface</h3>
            <p className="mt-2 text-body text-ink-2">Studs that grip too hard on artificial turf lock your foot while your body turns. This is the full table PitchSafe checks you against.</p>
            <EquipmentMatrix className="mt-5" />
          </article>

          <article className="flex flex-col rounded-[var(--radius-panel)] border border-line bg-accent-soft p-6 lg:col-span-3">
            <h3 className="text-h3 font-display font-extrabold text-ink">Recovery</h3>
            <p className="mt-2 text-body text-ink">Sleep, soreness, stress and food each score out of 10. The average is your recovery score. Under 4 is a red flag.</p>
            <ul className="mt-5 grid grid-cols-2 gap-2 text-small text-ink">
              {['8+ hours sleep scores 10', 'Soreness counts against you', 'So does stress', 'Eating well scores up'].map((t) => (
                <li key={t} className="rounded-[var(--radius-control)] bg-surface/70 px-3 py-2.5">
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/science" className="group mt-auto inline-flex items-center gap-1.5 pt-6 text-small font-semibold text-accent-ink underline-offset-4 hover:underline">
              Read the full method and sources
              <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
          </article>
        </div>
      </section>

      {/* Honest limits */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.01em] text-ink sm:text-display-s">Honest about its limits.</h2>
          <p className="mt-4 max-w-xl text-lead text-ink-2">PitchSafe is an early-warning tool, not a doctor. Here is what it cannot do.</p>
          <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-3 text-body text-ink">
                <Prohibit aria-hidden weight="bold" className="mt-1 size-5 shrink-0 text-ink-3" />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-10 border-t border-line pt-6 text-lead font-semibold text-ink">If something hurts, stop and see a physio or doctor.</p>
        </div>
      </section>

      <Faq />

      {/* Close */}
      <section className="bg-accent">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between lg:py-20">
          <div>
            <h2 className="font-display text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.01em] text-on-accent sm:text-display-s">Your next session is day one.</h2>
            <p className="mt-3 max-w-lg text-lead text-on-accent/85">Start now and your first full risk score is four weeks away.</p>
          </div>
          <Button asChild size="lg" variant="inverse">
            <Link to="/use">
              Use our app
              <ArrowRight aria-hidden weight="bold" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
