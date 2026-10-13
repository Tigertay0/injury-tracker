// Home page variant 3, "Liquid": light and premium. A liquid-metal shield (Paper
// shaders, as used by cult-ui's Hero Liquid Metal on 21st.dev) and a headline line
// that vaporizes into each of the four things that set your risk.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { LiquidMetal } from '@paper-design/shaders-react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, Prohibit } from '@phosphor-icons/react';
import { VaporizeTextCycle } from '@/components/fx/vapour-text';
import { cn } from '@/lib/utils';
import { ACWR, CLOSE, HERO, INPUTS, LIMITS, SCREENS } from './content';
import { VariantFooter, VariantMeta, ZoneBar } from './shared';
import './variants.css';

const INK = '#0b0d12';
const ACCENT = '#2f55e8';

// A shield, drawn black on transparent: the shader turns its outline into liquid metal
const SHIELD = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="600" viewBox="0 0 260 300"><path d="M130 8 L246 50 V142 C246 214 197 266 130 292 C63 266 14 214 14 142 V50 Z" fill="black"/></svg>',
)}`;

// Lowercase so they read as the end of the sentence "Your risk comes down to …"
const RISK_FACTORS = ['training load.', 'recovery.', 'your cleats.', 'injury history.'];
const VAPOUR_FONT_DESKTOP = { fontFamily: '"Public Sans", system-ui, sans-serif', fontSize: '52px', fontWeight: 600 };
const VAPOUR_FONT_MOBILE = { fontFamily: '"Public Sans", system-ui, sans-serif', fontSize: '32px', fontWeight: 600 };
const VAPOUR_TIMING = { vaporizeDuration: 1.6, fadeInDuration: 0.8, waitDuration: 1.6 };

function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function Pill({ to, children, variant = 'dark', className }: { to: string; children: React.ReactNode; variant?: 'dark' | 'light'; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f55e8]',
        variant === 'dark'
          ? 'bg-[#0b0d12] text-white shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_8px_24px_-8px_rgb(11_13_18/0.5)] hover:bg-[#23262f]'
          : 'border border-black/10 bg-white text-[#0b0d12] shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:bg-[#f1f2f5]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f7f7f8]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link to="/preview/liquid" className="font-display text-[1.375rem] leading-none font-extrabold" style={{ color: INK }} aria-label="PitchSafe home">
          PitchSafe
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <a href="#how" className="rounded-full px-3.5 py-2 text-small font-medium text-black/65 transition-colors hover:bg-black/5 hover:text-black">
            How it works
          </a>
          <Link to="/science" className="rounded-full px-3.5 py-2 text-small font-medium text-black/65 transition-colors hover:bg-black/5 hover:text-black">
            The science
          </Link>
          <Link to="/demo" className="rounded-full px-3.5 py-2 text-small font-medium text-black/65 transition-colors hover:bg-black/5 hover:text-black">
            Sample dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link to="/sign-in" className="hidden rounded-full px-3.5 py-2 text-small font-medium text-black/70 hover:text-black sm:inline-flex">
            Sign in
          </Link>
          <Link to={HERO.primary.to} className="inline-flex h-10 items-center rounded-full bg-[#0b0d12] px-4 text-small font-semibold text-white transition-colors hover:bg-[#23262f]">
            {HERO.primary.label}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)} aria-hidden>
      {/* Soft floor shadow so the metal sits on the page */}
      <div className="absolute inset-x-[22%] bottom-[6%] h-[7%] rounded-[50%] bg-[#0b0d12]/20 blur-2xl" />
      <LiquidMetal
        image={SHIELD}
        colorBack="#ffffff00"
        colorTint="#9fb4ff"
        repetition={6}
        softness={0.8}
        shiftRed={1}
        shiftBlue={-1}
        distortion={0.4}
        contour={0.4}
        angle={0}
        speed={1}
        scale={0.8}
        fit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

function Hero() {
  const wide = useIsWide();
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_30%,rgb(47_85_232/0.10),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgb(47_85_232/0.06),transparent_70%)]" />
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-6 px-5 pt-14 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:pt-20 lg:pb-24">
        <div>
          <p className="fl-rise inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-label font-medium text-black/70 shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
            <span className="size-1.5 rounded-full" style={{ background: ACCENT }} aria-hidden />
            Free injury-risk tracking for amateur players
          </p>
          <h1
            className="fl-rise mt-6 max-w-[14ch] text-[clamp(2.75rem,6.4vw,5.25rem)] leading-[0.98] font-medium tracking-[-0.055em] text-balance"
            style={{ color: INK, animationDelay: '80ms' }}
          >
            {HERO.title}
          </h1>

          <div className="fl-rise mt-6" style={{ animationDelay: '160ms' }}>
            <p className="text-lead text-black/55">Your risk comes down to</p>
            <p className="sr-only">training load, recovery, your cleats and injury history.</p>
            {reduce ? (
              <p aria-hidden className="mt-1 text-[clamp(1.6rem,3.2vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em]" style={{ color: ACCENT }}>
                load, recovery, cleats and injuries.
              </p>
            ) : (
              <div aria-hidden className="-ml-px h-14 w-full max-w-[34rem] sm:h-20">
                <VaporizeTextCycle
                  texts={RISK_FACTORS}
                  font={wide ? VAPOUR_FONT_DESKTOP : VAPOUR_FONT_MOBILE}
                  color="rgb(47, 85, 232)"
                  spread={4}
                  density={6}
                  animation={VAPOUR_TIMING}
                  direction="left-to-right"
                  alignment="left"
                />
              </div>
            )}
          </div>

          <p className="fl-rise mt-4 max-w-[34rem] text-lead text-black/65" style={{ animationDelay: '240ms' }}>
            {HERO.lead}
          </p>
          <div className="fl-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '320ms' }}>
            <Pill to={HERO.primary.to}>
              {HERO.primary.label}
              <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Pill>
            <Pill to={HERO.secondary.to} variant="light">
              {HERO.secondary.label}
            </Pill>
          </div>
          {/* Badge row, after the original component's tech-stack badges */}
          <ul className="fl-rise mt-8 flex flex-wrap gap-2" style={{ animationDelay: '400ms' }} aria-label="How the score is weighted">
            {INPUTS.slice(0, 3).map((i) => (
              <li key={i.key} className="rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-small shadow-[0_1px_3px_rgb(0_0_0/0.06)]">
                <span className="tnum font-semibold" style={{ color: INK }}>
                  {i.weight}
                </span>{' '}
                <span className="text-black/60">{i.name.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
        <Shield className="mx-auto aspect-[520/600] w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[520px]" />
      </div>
    </section>
  );
}

function Phones() {
  return (
    <section className="px-3 sm:px-5">
      <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#e9ecf5,#f7f7f8)] px-5 pt-16 sm:px-10 lg:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(2.1rem,4.5vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.045em] text-balance" style={{ color: INK }}>
            Made for the bus home.
          </h2>
          <p className="mt-4 text-lead text-black/60">Log a session in under a minute on your phone. Add PitchSafe to your home screen and it opens like any other app.</p>
        </div>
        <div className="mx-auto mt-14 flex max-w-[980px] items-end justify-center gap-3 sm:gap-6">
          {SCREENS.map((s, i) => (
            <figure key={s.src} className={cn('w-[31%] max-w-[300px]', i === 1 ? 'z-10' : 'translate-y-8 sm:translate-y-12')}>
              <img
                src={s.src}
                alt={s.alt}
                width={780}
                height={1587}
                loading="lazy"
                decoding="async"
                className="aspect-[780/1587] w-full rounded-[18px] border-[5px] border-[#0b0d12] bg-white object-cover object-top shadow-[0_30px_60px_-20px_rgb(11_13_18/0.35)] sm:rounded-[30px] sm:border-[8px]"
              />
              <figcaption className="sr-only">
                {s.title} {s.text}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inputs() {
  return (
    <section id="how" className="scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="max-w-[16ch] text-[clamp(2.1rem,4.5vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.045em] text-balance" style={{ color: INK }}>
          Four quick inputs. One clear answer.
        </h2>
        <p className="mt-4 max-w-xl text-lead text-black/60">No GPS vest, no watch. A minute after training and a minute once a week.</p>
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-[28px] border border-black/[0.07] bg-black/[0.07] md:grid-cols-2">
          {INPUTS.map((input, n) => (
            <article key={input.key} className="flex flex-col bg-white p-7 sm:p-9">
              <div className="flex items-baseline justify-between gap-4">
                <span className="tnum text-[3.5rem] leading-none font-medium tracking-[-0.06em] text-black/15">0{n + 1}</span>
                <span className="text-label font-semibold" style={{ color: ACCENT }}>
                  {input.when}
                </span>
              </div>
              <h3 className="mt-6 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]" style={{ color: INK }}>
                {input.name}
              </h3>
              <p className="mt-2 text-body text-black/60">{input.log}</p>
              {input.key === 'load' && <ZoneBar value={1.08} tone="light" className="mt-6 max-w-sm" />}
              <p className="mt-auto pt-6 text-body font-medium" style={{ color: INK }}>
                <span className="sr-only">You get: </span>
                {input.get}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Recipe() {
  return (
    <section className="px-5 pb-24 sm:px-8 lg:pb-32">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h2 className="max-w-[14ch] text-[clamp(2.1rem,4.5vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.045em] text-balance" style={{ color: INK }}>
            No black box. Here is the whole recipe.
          </h2>
          <p className="mt-4 max-w-md text-lead text-black/60">
            Session load is minutes × effort ({ACWR.formula}). A workload ratio from 0.8 to 1.3 is the sweet spot; above 1.5 is a spike linked to more injuries ({ACWR.source}).
          </p>
          <Link to="/science" className="group mt-6 inline-flex items-center gap-1.5 text-body font-semibold underline-offset-4 hover:underline" style={{ color: ACCENT }}>
            Read the full method and sources
            <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {INPUTS.map((i) => (
            <div key={i.key} className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <dt className="text-small text-black/55">{i.name}</dt>
              <dd className="tnum mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)] leading-none font-medium tracking-[-0.05em]" style={{ color: INK }}>
                {i.weight}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function LimitsAndClose() {
  return (
    <>
      <section className="border-y border-black/[0.06] bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1240px]">
          <h2 className="text-[clamp(2.1rem,4.5vw,3.25rem)] leading-[1.02] font-medium tracking-[-0.045em]" style={{ color: INK }}>
            Honest about its limits.
          </h2>
          <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-5 md:grid-cols-2">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-3 text-body text-black/75">
                <Prohibit aria-hidden weight="bold" className="mt-1 size-5 shrink-0 text-black/30" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="px-3 py-16 sm:px-5">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[36px] bg-[#0b0d12] px-6 py-20 text-center sm:px-10 lg:py-28">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgb(47_85_232/0.35),transparent_70%)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[0.98] font-medium tracking-[-0.05em] text-balance text-white">{CLOSE.title}</h2>
            <p className="mx-auto mt-5 max-w-md text-lead text-white/65">{CLOSE.lead}</p>
            <Pill to={HERO.primary.to} variant="light" className="mt-9">
              {HERO.primary.label}
              <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Pill>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Liquid() {
  return (
    <div className="min-h-dvh bg-[#f7f7f8] font-sans antialiased selection:bg-[#2f55e8] selection:text-white" style={{ color: INK, colorScheme: 'light' }}>
      <VariantMeta title="Liquid" />
      <a href="#main" className="sr-only z-50 rounded-full bg-black px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Phones />
        <Inputs />
        <Recipe />
        <LimitsAndClose />
      </main>
      <VariantFooter tone="light" className="bg-[#f7f7f8]" />
    </div>
  );
}
