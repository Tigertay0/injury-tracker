// Home page variant 2, "Horizon": a 3D night scene the camera flies through as you
// scroll the intro, then an editorial page on black.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Prohibit } from '@phosphor-icons/react';
import { createHorizonScene, type HorizonScene } from '@/components/fx/horizon-scene';
import { ACWR, CLOSE, HERO, INPUTS, LIMITS, SCREENS } from './content';
import { VariantFooter, VariantMeta, ZoneBar } from './shared';
import './variants.css';

const SCENES = [
  { word: 'PitchSafe', lines: ['Know when training turns risky.'], hero: true },
  { word: 'Load', lines: ['Every session is minutes × how hard it felt.', 'A week far above your usual is the warning sign.'] },
  { word: 'Recover', lines: ['Sleep, soreness, stress and food,', 'scored out of 10 once a week.'] },
] as const;

function SplitWord({ word, delay = 0 }: { word: string; delay?: number }) {
  return (
    <span aria-hidden className="block">
      {word.split('').map((ch, i) => (
        <span key={i} className="hz-char" style={{ animationDelay: `${delay + i * 55}ms` }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

function useHorizon(canvasRef: React.RefObject<HTMLCanvasElement | null>, introRef: React.RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const intro = introRef.current;
    if (!canvas || !intro) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene: HorizonScene;
    try {
      scene = createHorizonScene(canvas, { still });
    } catch {
      setFailed(true);
      return;
    }

    const onScroll = () => {
      const span = intro.offsetHeight - window.innerHeight;
      const p = span > 0 ? Math.min(Math.max(window.scrollY / span, 0), 1) : 0;
      scene.setProgress(p);
      setProgress(p);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Only draw while the intro is on screen
    const observer = new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting));
    observer.observe(intro);

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      scene.dispose();
    };
  }, [canvasRef, introRef]);

  return { progress, failed };
}

function Header() {
  // Transparent over the sky; solid once the page content scrolls underneath
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * (SCENES.length - 0.6));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 ${solid ? 'border-white/10 bg-black/80 backdrop-blur-lg' : 'border-transparent'}`}>
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-10">
        <Link to="/preview/horizon" className="font-display text-[1.35rem] leading-none font-extrabold tracking-[0.02em] text-white" aria-label="PitchSafe home">
          PitchSafe
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link to="/science" className="hidden px-3 py-2 text-label font-semibold tracking-[0.16em] text-white/70 uppercase hover:text-white sm:inline-flex">
            The science
          </Link>
          <Link to="/sign-in" className="hidden px-3 py-2 text-label font-semibold tracking-[0.16em] text-white/70 uppercase hover:text-white sm:inline-flex">
            Sign in
          </Link>
          <Link
            to={HERO.primary.to}
            className="inline-flex h-10 items-center gap-2 border border-white/30 px-4 text-label font-semibold tracking-[0.16em] text-white uppercase backdrop-blur-sm transition-colors hover:border-white hover:bg-white hover:text-black"
          >
            {HERO.primary.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Intro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const { progress, failed } = useHorizon(canvasRef, introRef);
  const scene = Math.min(Math.floor(progress * SCENES.length), SCENES.length - 1);

  return (
    <div ref={introRef} className="relative">
      {/* Fixed sky behind the three intro screens; later sections cover it */}
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_50%_80%,#0f2a6b_0%,#03050b_60%)]">
        {!failed && <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />}
      </div>

      {SCENES.map((s, i) => (
        <section key={s.word} className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 text-center">
          {/* Darkens the sky just behind the words so they stay readable over bright patches */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_40%_at_50%_52%,rgb(0_0_0/0.5),transparent_75%)]" />
          <p className="font-display text-[clamp(3.25rem,13vw,11rem)] leading-[0.85] font-semibold tracking-[0.06em] text-white uppercase [text-shadow:0_0_40px_rgb(120_160_255/0.35)]">
            <SplitWord word={s.word} delay={i === 0 ? 200 : 0} />
          </p>
          {'hero' in s ? (
            <>
              <h1 className="fl-rise mt-6 max-w-[22ch] font-display text-[clamp(1.6rem,3.6vw,2.75rem)] leading-[1.05] font-extrabold text-balance text-white" style={{ animationDelay: '700ms' }}>
                <span className="sr-only">PitchSafe. </span>
                {s.lines[0]}
              </h1>
              <p className="fl-rise mt-4 max-w-[34rem] text-lead text-white/70" style={{ animationDelay: '850ms' }}>
                {HERO.lead}
              </p>
              <div className="fl-rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '1000ms' }}>
                <Link to={HERO.primary.to} className="group inline-flex h-12 items-center gap-2 bg-white px-6 text-small font-bold tracking-[0.14em] text-black uppercase transition-colors hover:bg-[#cfe0ff]">
                  {HERO.primary.label}
                  <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                </Link>
                <Link to={HERO.secondary.to} className="inline-flex h-12 items-center border border-white/35 px-6 text-small font-bold tracking-[0.14em] text-white uppercase backdrop-blur-sm transition-colors hover:border-white">
                  {HERO.secondary.label}
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-6 space-y-1 text-[clamp(1.05rem,2vw,1.35rem)] text-white/80">
              {s.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Scroll progress, from the original component */}
      <div
        aria-hidden
        className="pointer-events-none fixed right-5 bottom-6 z-20 hidden items-center gap-4 text-caption font-semibold tracking-[0.2em] text-white/70 transition-opacity duration-300 sm:flex sm:right-10"
        style={{ opacity: progress >= 1 ? 0 : 1 }}
      >
        <span>SCROLL</span>
        <span className="relative h-px w-28 bg-white/20">
          <span className="absolute inset-y-0 left-0 bg-white" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="tnum">
          {String(scene + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

function Cadence() {
  return (
    <section id="how" className="px-5 py-24 sm:px-10 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <p className="text-label font-semibold tracking-[0.2em] text-[#9fc0ff] uppercase">How it works</p>
        <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[0.95] font-extrabold text-balance text-white">
          Four quick inputs. One clear answer.
        </h2>
        <ol className="relative mt-16 grid grid-cols-[minmax(0,1fr)] gap-10 md:grid-cols-4 md:gap-8">
          {/* The horizon line the four steps sit on */}
          <span aria-hidden className="absolute top-[7px] right-0 left-0 hidden h-px bg-gradient-to-r from-[#3a6bff] via-white/40 to-transparent md:block" />
          {INPUTS.map((input) => (
            <li key={input.key} className="relative">
              <span aria-hidden className="block size-[15px] rounded-full border-2 border-[#7aa2ff] bg-black shadow-[0_0_16px_#3a6bff]" />
              <p className="mt-6 text-label font-semibold tracking-[0.16em] text-white/50 uppercase">{input.when}</p>
              <h3 className="mt-2 font-display text-[1.75rem] leading-tight font-extrabold text-white">{input.name}</h3>
              <p className="mt-3 text-body text-white/65">{input.log}</p>
              <p className="mt-4 border-t border-white/10 pt-4 text-body text-white">
                <span className="sr-only">You get: </span>
                {input.get}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Screens() {
  return (
    <section className="overflow-hidden px-5 py-24 sm:px-10 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-[14ch] font-display text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[0.95] font-extrabold text-balance text-white">Made for the bus home.</h2>
          <Link to="/demo" className="group inline-flex items-center gap-2 text-small font-bold tracking-[0.14em] text-white uppercase">
            Open the sample dashboard
            <ArrowUpRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-8 sm:grid-cols-3 sm:gap-6">
          {SCREENS.map((s, i) => (
            <figure key={s.src} className={i === 1 ? 'sm:-translate-y-10' : 'sm:translate-y-6'}>
              <img
                src={s.src}
                alt={s.alt}
                width={780}
                height={1587}
                loading="lazy"
                decoding="async"
                className="mx-auto aspect-[780/1587] w-[78%] rounded-[26px] border border-white/15 object-cover object-top shadow-[0_40px_80px_-20px_rgb(40_90_255/0.35)] sm:w-full"
              />
              <figcaption className="mt-5 text-body text-white">
                <span className="font-semibold">{s.title}</span> <span className="text-white/60">{s.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Recipe() {
  const parts = INPUTS.slice(0, 3);
  return (
    <section className="border-y border-white/10 px-5 py-24 sm:px-10 lg:py-32">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="max-w-[16ch] font-display text-[clamp(2.4rem,5vw,4.25rem)] leading-[0.95] font-extrabold text-balance text-white">No black box. Here is the whole recipe.</h2>
          <p className="mt-5 max-w-lg text-lead text-white/65">The same load formulas pro clubs use, from peer-reviewed research. Every number on your dashboard can be traced back.</p>
          <Link to="/science" className="group mt-8 inline-flex items-center gap-2 text-small font-bold tracking-[0.14em] text-white uppercase">
            Read the method and sources
            <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="space-y-12">
          <div>
            <p className="text-label font-semibold tracking-[0.16em] text-white/50 uppercase">The score, out of 100</p>
            <div className="mt-4 flex h-14 gap-1" aria-hidden>
              {parts.map((p, i) => (
                <div
                  key={p.key}
                  className="flex items-end p-3 text-small font-bold text-white"
                  style={{ width: p.weight, background: ['#2a4fe8', '#3f74ff', '#7aa2ff'][i], color: i === 2 ? '#04060d' : '#fff' }}
                >
                  {p.weight}
                </div>
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 text-body text-white/75 sm:grid-cols-3">
              {parts.map((p) => (
                <li key={p.key}>
                  <span className="tnum font-semibold text-white">{p.weight}</span> {p.name.toLowerCase()}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-body text-white/65">Then past injuries can raise it, up to double. A torn knee ligament adds the most.</p>
          </div>
          <div>
            <p className="text-label font-semibold tracking-[0.16em] text-white/50 uppercase">Workload ratio</p>
            <p className="mt-3 text-lead text-white">{ACWR.ratio}</p>
            <ZoneBar value={1.08} tone="dark" className="mt-4" />
            <p className="mt-3 text-small text-white/55">0.8 to 1.3 is the sweet spot. Above 1.5 is a spike linked to more injuries ({ACWR.source}).</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LimitsAndClose() {
  return (
    <>
      <section className="px-5 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="font-display text-[clamp(2.2rem,4.5vw,3.75rem)] leading-[0.95] font-extrabold text-white">Honest about its limits.</h2>
          <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-6 md:grid-cols-2">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-3 border-t border-white/10 pt-5 text-body text-white/80">
                <Prohibit aria-hidden weight="bold" className="mt-1 size-5 shrink-0 text-white/40" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="relative overflow-hidden px-5 py-28 text-center sm:px-10 lg:py-40">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_60%_100%_at_50%_100%,rgb(42_79_232/0.45),transparent_70%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-[30%] h-px bg-gradient-to-r from-transparent via-[#7aa2ff] to-transparent" />
        <div className="relative">
          <h2 className="mx-auto max-w-[14ch] font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.9] font-semibold tracking-[0.03em] text-balance text-white uppercase">{CLOSE.title}</h2>
          <p className="mx-auto mt-6 max-w-md text-lead text-white/70">{CLOSE.lead}</p>
          <Link to={HERO.primary.to} className="group mt-10 inline-flex h-12 items-center gap-2 bg-white px-7 text-small font-bold tracking-[0.14em] text-black uppercase transition-colors hover:bg-[#cfe0ff]">
            {HERO.primary.label}
            <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </>
  );
}

export default function Horizon() {
  return (
    <div className="min-h-dvh bg-black font-sans text-white antialiased selection:bg-[#2a4fe8]" style={{ colorScheme: 'dark' }}>
      <VariantMeta title="Horizon" />
      <a href="#main" className="sr-only z-50 bg-white px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Intro />
        {/* Solid ground from here down covers the fixed 3D sky */}
        <div className="relative z-10 bg-black">
          <Cadence />
          <Screens />
          <Recipe />
          <LimitsAndClose />
        </div>
      </main>
      <VariantFooter tone="dark" className="relative z-10 bg-black" />
    </div>
  );
}
