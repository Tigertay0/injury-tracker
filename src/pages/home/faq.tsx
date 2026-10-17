// FAQ list. Accordion motion from transitions.dev "Accordion expand" (21); structure
// follows 21st.dev shadcnblockscom/faq3 (https://21st.dev/@shadcnblockscom/components/faq3):
// stacked questions in one column, answers revealed in place.
import { useId, useState } from 'react';

const QUESTIONS = [
  { q: 'Is it really free?', a: 'Yes. The core app is free, with no ads. PitchSafe Plus, an optional paid plan for custom drills with AI estimates, is coming soon. PitchSafe exists so players without a sports scientist still get the basics of load monitoring.' },
  { q: 'What is ACWR?', a: 'The acute:chronic workload ratio. It compares the load of your last 7 days with your average week over the last 28. Sudden jumps above your usual level are linked to more soft-tissue injuries.' },
  { q: 'Why do I wait four weeks for a score?', a: 'The ratio needs a month of history to know what "normal" means for you. Until then, the app still checks your cleats and recovery and shows how many days of baseline you have.' },
  { q: 'Who can see my data?', a: 'Only you. Your data is tied to your login and locked to your account in the database. There are no ad trackers. You can download or delete your data from Settings at any time.' },
  { q: 'Can my coach use it?', a: 'Each player can download a one-page PDF report from their dashboard and send it to a coach or physio.' },
  { q: 'How old do I need to be?', a: 'You need to be 13 or older to create an account.' },
];

function Chevron() {
  return (
    <span className="t-acc-chevron text-ink-2" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 5.5 8 10.5 13 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className="t-acc border-b border-line" data-open={open}>
      <h3>
        <button
          id={`${id}-button`}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left text-lead font-semibold text-ink hover:text-accent-ink"
        >
          {q}
          <Chevron />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} className="t-acc-panel" inert={!open}>
        <div className="t-acc-panel-inner">
          <p className="max-w-2xl pb-5 text-body text-ink-2">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  // One answer open at a time, like faq3
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <h2 className="font-display text-[2.25rem] leading-[1] font-bold tracking-[-0.04em] text-ink sm:text-display-s">Questions players ask</h2>
        <div className="border-t border-line">
          {QUESTIONS.map((item, i) => (
            <Item key={item.q} {...item} open={openIndex === i} onToggle={() => setOpenIndex((o) => (o === i ? null : i))} />
          ))}
        </div>
      </div>
    </section>
  );
}
