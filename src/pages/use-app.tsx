// "Use our app": the gateway from the site into the app. One card with the account
// actions (Strava's single-card pattern), the first three steps, and how to add
// PitchSafe to a phone's home screen.
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAppAuth } from '@/lib/auth';

const STEPS = [
  { title: 'Create your free account', text: 'Use your email or Google. You need to be 13 or older.' },
  { title: 'Pick your position and cleats', text: 'Your cleat check works straight away.' },
  { title: 'Log your next session the same day', text: 'Minutes and effort. It takes under a minute.' },
];

const INSTALL = [
  { platform: 'iPhone', how: 'In Safari, tap Share, then Add to Home Screen.' },
  { platform: 'Android', how: 'In Chrome, open the three-dot menu, then Install app.' },
];

export default function UseApp() {
  const { isSignedIn, isLoaded } = useAppAuth();

  return (
    // DOM order is intro, account, steps, so phones (and keyboards) reach the main
    // action early; on desktop the account column sits beside both
    <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 px-5 pt-10 pb-20 sm:px-8 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-10">
      <div className="max-w-xl lg:col-start-1 lg:row-start-1">
        <h1 className="font-display text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] text-ink sm:text-display-m">Start tracking in two minutes.</h1>
        <p className="mt-5 text-lead text-ink-2">Free. Works in the browser on any phone or computer. Nothing to download from an app store.</p>
      </div>

      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <section aria-labelledby="account-title" className="shadow-lift rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
          <h2 id="account-title" className="font-display text-h2 font-bold text-ink">
            {isSignedIn ? 'You are signed in' : 'Get started'}
          </h2>
          <p className="mt-2 text-body text-ink-2">{isSignedIn ? 'Your dashboard is ready.' : 'One account keeps your data safe across your phone and computer.'}</p>
          <div className="mt-6 flex flex-col gap-3">
            {!isLoaded ? (
              <div className="h-[6.5rem]" aria-hidden />
            ) : isSignedIn ? (
              <Button asChild size="lg">
                <Link to="/app">
                  Open the app
                  <ArrowRight aria-hidden weight="bold" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/sign-up">Create a free account</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              </>
            )}
          </div>
          <p className="mt-5 text-label text-ink-3">
            By creating an account you agree to the{' '}
            <Link to="/terms" className="text-ink-2 underline underline-offset-2 hover:text-ink">
              terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-ink-2 underline underline-offset-2 hover:text-ink">
              privacy policy
            </Link>
            .
          </p>
        </section>

        {/* Quiet note, not a second card: two one-line instructions, no switcher */}
        <section aria-labelledby="install-title" className="border-t border-line pt-6">
          <h2 id="install-title" className="text-body font-semibold text-ink">
            Add it to your home screen
          </h2>
          <p className="mt-1 text-small text-ink-2">It then opens full screen, like any other app.</p>
          <dl className="mt-4 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-small">
            {INSTALL.map((row) => (
              <div key={row.platform} className="contents">
                <dt className="font-semibold text-ink">{row.platform}</dt>
                <dd className="text-ink-2">{row.how}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="max-w-xl lg:col-start-1 lg:row-start-2">
        <ol className="space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
              <span aria-hidden className="tnum grid size-10 place-items-center bg-accent-soft font-display text-h3 font-bold text-accent-ink">
                {i + 1}
              </span>
              <div>
                <p className="text-lead font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-body text-ink-2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-md text-small text-ink-2">Your full risk score appears after four weeks of sessions. Until then you will see your baseline fill up day by day.</p>
        <Link to="/demo" className="mt-4 inline-flex items-center gap-1.5 text-small font-semibold text-accent-ink underline-offset-4 hover:underline">
          Not sure yet? Try the sample dashboard
          <ArrowRight aria-hidden weight="bold" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
