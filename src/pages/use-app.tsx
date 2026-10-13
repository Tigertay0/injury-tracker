// "Use our app": the gateway from the site into the app. One card with the account
// actions (Strava's single-card pattern), the first three steps, and how to add
// PitchSafe to a phone's home screen.
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, DeviceMobile } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/segmented';
import { useAppAuth } from '@/lib/auth';

const STEPS = [
  { title: 'Create your free account', text: 'Use your email or Google. You need to be 13 or older.' },
  { title: 'Pick your position and cleats', text: 'Your cleat check works straight away.' },
  { title: 'Log your next session the same day', text: 'Minutes and effort. It takes under a minute.' },
];

const INSTALL = {
  iphone: ['Open PitchSafe in Safari.', 'Tap the Share button at the bottom of the screen.', 'Choose "Add to Home Screen", then tap Add.'],
  android: ['Open PitchSafe in Chrome.', 'Tap the three-dot menu at the top right.', 'Choose "Add to Home screen" or "Install app", then confirm.'],
} as const;

type Platform = keyof typeof INSTALL;

export default function UseApp() {
  const { isSignedIn, isLoaded } = useAppAuth();
  const [platform, setPlatform] = useState<Platform>(() => (/android/i.test(navigator.userAgent) ? 'android' : 'iphone'));

  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-5 pt-10 pb-20 sm:px-8 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
      <div className="max-w-xl">
        <h1 className="font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.015em] text-ink sm:text-display-m">Start tracking in two minutes.</h1>
        <p className="mt-5 text-lead text-ink-2">Free. Works in the browser on any phone or computer. Nothing to download from an app store.</p>

        <ol className="mt-10 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
              <span aria-hidden className="tnum grid size-10 place-items-center rounded-full bg-accent-soft font-display text-h3 font-extrabold text-accent-ink">
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
      </div>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="account-title" className="shadow-lift rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
          <h2 id="account-title" className="font-display text-h2 font-extrabold text-ink">
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

        <section aria-labelledby="install-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <DeviceMobile aria-hidden className="size-6 text-accent-ink" />
            <h2 id="install-title" className="text-lead font-semibold text-ink">
              Put it on your home screen
            </h2>
          </div>
          <p className="mt-2 text-body text-ink-2">It then opens full screen like any other app.</p>
          <Segmented
            className="mt-5"
            label="Phone type"
            value={platform}
            onChange={setPlatform}
            options={[
              { value: 'iphone', label: 'iPhone' },
              { value: 'android', label: 'Android' },
            ]}
          />
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-body text-ink marker:font-semibold marker:text-ink-2">
            {INSTALL[platform].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
