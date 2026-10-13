// "How to use it": an auto-playing tutorial. A phone shows the real app screens while a
// tap marker moves to each control the player uses, with a caption. Steps advance on
// their own (story-style progress bars), can be picked by hand, pause while off screen,
// and sit still for reduced motion.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type Target = { label: string; x: number; y: number };
type Step = { id: string; title: string; text: string; alt: string; targets: Target[] };

// Target positions are percentages of the 390x844 screen, measured from the real app
const STEPS: Step[] = [
  {
    id: 'setup',
    title: 'Set up in a minute',
    text: 'Create your free account, then pick your position, the surface you usually play on and your cleats. The cleat check works straight away.',
    alt: 'The cleats and surface screen: 3G artificial turf and firm ground bladed cleats selected, marked high risk',
    targets: [
      { label: 'Pick your usual surface', x: 11, y: 17.8 },
      { label: 'Pick your cleats', x: 11, y: 63 },
    ],
  },
  {
    id: 'log',
    title: 'Log every session',
    text: 'After training, choose the minutes and slide to how hard it felt. It takes under a minute, on the bus home.',
    alt: 'The log session screen with minutes, an effort slider set to 5, hard, and the Save session button',
    targets: [
      { label: 'Choose the minutes', x: 75.1, y: 19.2 },
      { label: 'How hard did it feel?', x: 45.8, y: 39 },
      { label: 'Save it', x: 50, y: 76.5 },
    ],
  },
  {
    id: 'recovery',
    title: 'Check in once a week',
    text: 'Four sliders: sleep, muscle soreness, stress and how well you ate. You get a recovery score out of 10.',
    alt: 'The weekly recovery check-in with sliders for sleep, soreness, stress and food, and a recovery score of 5.0',
    targets: [
      { label: 'Average sleep', x: 53.1, y: 18 },
      { label: 'Muscle soreness', x: 54.2, y: 31.6 },
      { label: 'Save your check-in', x: 50, y: 78.8 },
    ],
  },
  {
    id: 'score',
    title: 'Read your score, then act',
    text: 'Your 0 to 100 risk score, the reasons behind it and the one thing to do first. Tap any piece of advice to go straight to it.',
    alt: 'The dashboard: injury risk score 44 out of 100, moderate risk, and the advice to switch cleats',
    targets: [
      { label: 'Your risk score', x: 25.5, y: 32.4 },
      { label: 'Do this first', x: 23, y: 59.6 },
    ],
  },
];

const TAP_MS = 1700; // time on each target
const EXTRA_MS = 1200; // pause before moving to the next step

const stepDuration = (s: Step) => s.targets.length * TAP_MS + EXTRA_MS;

function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

export function Walkthrough() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);
  const [stepIndex, setStepIndex] = useState(0);
  const [tapIndex, setTapIndex] = useState(0);
  const playing = inView && !reduce;
  const step = STEPS[stepIndex];

  // Walk the tap marker through the targets, then move to the next step
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        if (tapIndex < step.targets.length - 1) setTapIndex((i) => i + 1);
        else {
          setTapIndex(0);
          setStepIndex((i) => (i + 1) % STEPS.length);
        }
      },
      tapIndex < step.targets.length - 1 ? TAP_MS : TAP_MS + EXTRA_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, tapIndex, step.targets.length]);

  const choose = (i: number) => {
    setStepIndex(i);
    setTapIndex(0);
  };

  const target = step.targets[tapIndex];

  return (
    <section ref={sectionRef} id="walkthrough" aria-labelledby="walkthrough-title" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-[1200px]">
        <h2 id="walkthrough-title" className="max-w-[16ch] font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[1] font-bold tracking-[-0.04em] text-balance text-white">
          How to use it, in four steps.
        </h2>
        <p className="mt-4 max-w-xl text-lead text-white/65">From sign-up to your first piece of advice. These are the real screens.</p>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-center gap-6 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
          {/* Phones: story bars and the current step above the phone, so both stay in view */}
          <div className="lg:hidden">
            <div className="grid grid-cols-4 gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => choose(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  className="py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a6d8ff]"
                >
                  <span className="block h-0.5 bg-white/15">
                    {i < stepIndex && <span className="block h-full w-full bg-[#a6d8ff]" />}
                    {i === stepIndex && (
                      <span
                        key={`${s.id}-${playing}`}
                        className={cn('block h-full bg-[#a6d8ff]', playing ? 'walk-progress' : 'w-full')}
                        style={playing ? { animationDuration: `${stepDuration(s)}ms` } : undefined}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-small font-semibold text-[#a6d8ff]">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <p className="mt-1 text-lead font-semibold text-white">{step.title}</p>
            <p className="mt-1 min-h-[4.5rem] text-body text-white/65">{step.text}</p>
          </div>

          {/* Desktop: story-style progress bars, each step a button */}
          <ol className="order-2 hidden gap-2 lg:order-1 lg:grid">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'group relative w-full overflow-hidden border px-5 py-5 text-left transition-colors duration-200 ease-out sm:px-6',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a6d8ff]',
                      active ? 'border-white/20 bg-white/[0.06]' : 'border-white/10 bg-transparent hover:bg-white/[0.03]',
                    )}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className={cn('tnum font-display text-h2 font-bold tracking-[-0.03em]', active ? 'text-[#a6d8ff]' : 'text-white/35')}>{i + 1}</span>
                      <span className="min-w-0">
                        <span className={cn('block text-lead font-semibold', active ? 'text-white' : 'text-white/70')}>{s.title}</span>
                        {/* Grid-rows accordion keeps every step's text in the DOM */}
                        <span className={cn('grid transition-[grid-template-rows] duration-300 ease-out', active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                          <span className="overflow-hidden">
                            <span className="block pt-2 text-body text-white/65">{s.text}</span>
                          </span>
                        </span>
                      </span>
                    </span>
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                      {active && (
                        <span
                          key={`${s.id}-${playing}`}
                          className={cn('block h-full bg-[#a6d8ff]', playing ? 'walk-progress' : 'w-full')}
                          style={playing ? { animationDuration: `${stepDuration(s)}ms` } : undefined}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* The phone */}
          <div className="order-1 mx-auto w-full max-w-[16.5rem] sm:max-w-[20rem] lg:order-2">
            <div className="relative aspect-[390/844] w-full overflow-hidden border border-white/15 bg-[#0b1020] shadow-[0_40px_80px_-24px_rgb(29_63_214/0.55)]">
              <AnimatePresence initial={false}>
                <motion.img
                  key={step.id}
                  src={`/walkthrough/${step.id}.webp`}
                  width={780}
                  height={1688}
                  alt={step.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={reduce ? false : { opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={reduce ? undefined : { opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>

              {/* Tap marker: glides between targets, ripples on arrival, carries a caption */}
              {reduce ? (
                step.targets.map((t, i) => (
                  <span key={t.label} aria-hidden className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-white bg-[#2346e0] text-label font-bold text-white" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
                    {i + 1}
                  </span>
                ))
              ) : (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute z-10"
                  initial={false}
                  animate={{ left: `${target.x}%`, top: `${target.y}%` }}
                  transition={{ type: 'spring', stiffness: 170, damping: 24 }}
                >
                  <span key={`${step.id}-${tapIndex}`} className="walk-ripple absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#a6d8ff]" />
                  <span className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/25 shadow-[0_0_24px_rgb(166_216_255/0.8)] backdrop-blur-[1px]" />
                  <span
                    key={`label-${step.id}-${tapIndex}`}
                    className={cn(
                      'walk-label absolute whitespace-nowrap bg-white px-2.5 py-1 text-label font-semibold text-[#060a1a] shadow-[0_6px_20px_rgb(0_0_0/0.4)]',
                      target.y > 70 ? 'bottom-7' : 'top-7',
                      target.x > 60 ? 'right-0' : target.x < 35 ? 'left-[-0.5rem]' : '-translate-x-1/2',
                    )}
                  >
                    {target.label}
                  </span>
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
