// Home page variant 1, "Floodlit": dark and cinematic. A WebGL glass shader behind the
// hero, then the real dashboard tilting into view on scroll.
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bed, FirstAidKit, Prohibit, SneakerMove, Timer, type Icon } from '@phosphor-icons/react';
import { GlassFold } from '@/components/fx/glass-fold';
import { ContainerScroll } from '@/components/fx/container-scroll';
import { cn } from '@/lib/utils';
import { ACWR, CLOSE, HERO, INPUTS, LIMITS } from './content';
import { VariantFooter, VariantMeta, ZoneBar } from './shared';
import './variants.css';

const NIGHT = '#04060d';
const ICONS: Record<(typeof INPUTS)[number]['key'], Icon> = { load: Timer, recovery: Bed, cleats: SneakerMove, injuries: FirstAidKit };

function PillLink({ to, children, variant = 'solid', className }: { to: string; children: ReactNode; variant?: 'solid' | 'ghost'; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold transition-[background-color,transform] duration-200 ease-out active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9fd2ff]',
        variant === 'solid' ? 'bg-white text-[#060a1a] hover:bg-[#dfe9ff]' : 'border border-white/20 bg-white/[0.04] text-white backdrop-blur-md hover:bg-white/10',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-3 z-30 px-3 sm:top-5">
      <div className="mx-auto flex h-14 max-w-[920px] items-center justify-between gap-4 rounded-full border border-white/10 bg-[#070b18]/55 pr-2 pl-5 shadow-[0_8px_32px_rgb(0_0_0/0.35)] backdrop-blur-xl">
        <Link to="/preview/floodlit" className="font-display text-[1.3rem] leading-none font-extrabold text-white" aria-label="PitchSafe home">
          PitchSafe
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {[
            { label: 'How it works', href: '#how' },
            { label: 'The score', href: '#score' },
          ].map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-small font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              {n.label}
            </a>
          ))}
          <Link to="/science" className="rounded-full px-3.5 py-2 text-small font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            The science
          </Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link to="/sign-in" className="hidden rounded-full px-3.5 py-2 text-small font-medium text-white/80 hover:text-white sm:inline-flex">
            Sign in
          </Link>
          <Link to={HERO.primary.to} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-small font-semibold text-[#060a1a] transition-colors hover:bg-[#dfe9ff]">
            {HERO.primary.label}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-[max(100svh,680px)] items-center overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: NIGHT }}>
        <GlassFold color1="#1d3fd6" color2="#03050c" color3="#a6d8ff" speed={0.45} scale={1.05} noise={0.1} />
      </div>
      {/* Lets the shader melt into the page and keeps the copy readable */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgb(4_6_13/0.55),transparent_75%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-b from-transparent to-[#04060d]" />

      <div className="mx-auto w-full max-w-[1100px] px-5 pt-28 pb-20 text-center sm:px-8">
        <p className="fl-rise mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-label font-medium text-white/85 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-[#7fe0a6] shadow-[0_0_10px_#7fe0a6]" aria-hidden />
          Free, and built on published sports science
        </p>
        <h1
          className="fl-rise mx-auto mt-7 max-w-[13ch] font-display text-[clamp(3.1rem,9vw,7.75rem)] leading-[0.9] font-extrabold tracking-[-0.02em] text-balance text-white"
          style={{ animationDelay: '80ms' }}
        >
          {HERO.title}
        </h1>
        <p className="fl-rise mx-auto mt-7 max-w-[36rem] text-lead text-white/72 sm:text-[1.25rem]" style={{ animationDelay: '160ms' }}>
          {HERO.lead}
        </p>
        <div className="fl-rise mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: '240ms' }}>
          <PillLink to={HERO.primary.to}>
            {HERO.primary.label}
            <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </PillLink>
          <PillLink to={HERO.secondary.to} variant="ghost">
            {HERO.secondary.label}
          </PillLink>
        </div>
      </div>
    </section>
  );
}

function ProductReveal() {
  return (
    <section id="score" className="scroll-mt-24 overflow-hidden" aria-labelledby="score-title">
      <ContainerScroll
        frameClassName="border-white/15 bg-[#0b1020]"
        titleComponent={
          <div className="px-4">
            <p className="text-label font-semibold tracking-[0.14em] text-[#9fd2ff] uppercase">The dashboard</p>
            <h2 id="score-title" className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.015em] text-balance text-white">
              Your whole week in one score.
            </h2>
            <p className="mx-auto mt-5 mb-16 max-w-xl text-lead text-white/65 md:mb-20">
              A number from 0 to 100, the reasons behind it, and the one thing to do before your next hard session.
            </p>
          </div>
        }
      >
        <picture>
          <source media="(max-width: 768px)" srcSet="/screens/dashboard-mobile-dark.webp" width={780} height={1600} />
          <img
            src="/screens/dashboard-desktop-dark.webp"
            width={2880}
            height={1800}
            alt="The PitchSafe dashboard for a sample player: risk score 44 out of 100, moderate risk, with the advice to switch cleats, plus workload ratio, recovery, cleats and injury history"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover [object-position:0_0]"
            draggable={false}
          />
        </picture>
      </ContainerScroll>
    </section>
  );
}

/** Card with a soft light that follows the pointer (21st.dev "spotlight card" pattern). */
function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - r.left}px`);
    el.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn(
        'group/spot relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-6 sm:p-8',
        'before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        'before:bg-[radial-gradient(420px_circle_at_var(--x,50%)_var(--y,50%),rgb(120_170_255/0.13),transparent_65%)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function InputCard({ input, className, children }: { input: (typeof INPUTS)[number]; className?: string; children?: ReactNode }) {
  const IconCmp = ICONS[input.key];
  return (
    <SpotlightCard className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#a6d8ff]">
          <IconCmp aria-hidden weight="duotone" className="size-5" />
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-label font-semibold text-white/75">
          <span className="tnum">{input.weight}</span>
          {input.key === 'injuries' ? '' : ' of the score'}
        </span>
      </div>
      <p className="mt-6 text-label font-semibold tracking-[0.12em] text-white/45 uppercase">{input.when}</p>
      <h3 className="mt-1.5 font-display text-[1.75rem] leading-tight font-extrabold text-white">{input.name}</h3>
      <p className="mt-2 max-w-md text-body text-white/65">{input.log}</p>
      {children}
      <p className="mt-auto flex gap-2 pt-6 text-body text-white">
        <ArrowRight aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-[#7fe0a6]" />
        <span>
          <span className="sr-only">You get: </span>
          {input.get}
        </span>
      </p>
    </SpotlightCard>
  );
}

function Inputs() {
  const [load, recovery, cleats, injuries] = INPUTS;
  return (
    <section id="how" className="scroll-mt-24 px-5 pt-8 pb-24 sm:px-8 lg:pb-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <h2 className="max-w-[14ch] font-display text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.015em] text-balance text-white">
            Four quick inputs. One clear answer.
          </h2>
          <p className="text-lead text-white/65">No GPS vest, no watch. A minute after training and a minute once a week.</p>
        </div>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
          <InputCard input={load} className="lg:col-span-2">
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-label text-white/55">Session load</p>
                <p className="tnum mt-1 text-lead font-semibold text-white">{ACWR.formula}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-label text-white/55">Workload ratio, sample player</p>
                <p className="tnum mt-1 text-lead font-semibold text-white">1.08 · sweet spot</p>
                <ZoneBar value={1.08} tone="dark" className="mt-2" />
              </div>
            </div>
          </InputCard>
          <InputCard input={recovery} />
          <InputCard input={cleats} />
          <InputCard input={injuries} className="lg:col-span-2" />
        </div>
      </div>
    </section>
  );
}

function Recipe() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02] px-5 py-24 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="max-w-[18ch] font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.015em] text-balance text-white">
          No black box. Here is the whole recipe.
        </h2>
        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {INPUTS.map((i) => (
            <div key={i.key} className="border-t border-white/15 pt-5">
              <dt className="tnum bg-gradient-to-b from-white to-white/45 bg-clip-text font-display text-[clamp(2.75rem,6vw,4.75rem)] leading-none font-extrabold text-transparent">
                {i.weight}
              </dt>
              <dd className="mt-3 text-body text-white/70">{i.name}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 max-w-2xl text-body text-white/65">
          A workload ratio between 0.8 and 1.3 is the sweet spot. Above 1.5 is a spike linked to more injuries ({ACWR.source}).{' '}
          <Link to="/science" className="font-semibold text-[#a6d8ff] underline-offset-4 hover:underline">
            Read the full method and sources
          </Link>
        </p>
      </div>
    </section>
  );
}

function Limits() {
  return (
    <section className="px-5 py-24 sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h2 className="font-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.015em] text-white">Honest about its limits.</h2>
          <p className="mt-4 max-w-md text-lead text-white/65">PitchSafe is an early-warning tool, not a doctor.</p>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10">
          {LIMITS.map((l) => (
            <li key={l} className="flex gap-3 bg-[#060914] px-5 py-5 text-body text-white/85">
              <Prohibit aria-hidden weight="bold" className="mt-1 size-5 shrink-0 text-white/40" />
              {l}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="px-3 pb-16 sm:px-5">
      <div className="relative isolate mx-auto max-w-[1240px] overflow-hidden rounded-[36px] border border-white/10">
        <div className="absolute inset-0 -z-10" style={{ background: NIGHT }}>
          <GlassFold color1="#2a4fe8" color2="#050816" color3="#b9e2ff" speed={0.35} scale={1.6} noise={0.1} />
        </div>
        <div className="absolute inset-0 -z-10 bg-[#04060d]/45" />
        <div className="px-6 py-20 text-center sm:px-10 lg:py-28">
          <h2 className="mx-auto max-w-[14ch] font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] font-extrabold tracking-[-0.015em] text-balance text-white">{CLOSE.title}</h2>
          <p className="mx-auto mt-5 max-w-md text-lead text-white/75">{CLOSE.lead}</p>
          <div className="mt-9 flex justify-center">
            <PillLink to={HERO.primary.to}>
              {HERO.primary.label}
              <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </PillLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Floodlit() {
  return (
    <div className="min-h-dvh font-sans text-white antialiased selection:bg-[#2a4fe8] selection:text-white" style={{ background: NIGHT, colorScheme: 'dark' }}>
      <VariantMeta title="Floodlit" />
      <a href="#main" className="sr-only z-50 rounded-full bg-white px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <ProductReveal />
        <Inputs />
        <Recipe />
        <Limits />
        <Close />
      </main>
      <VariantFooter tone="dark" />
    </div>
  );
}
