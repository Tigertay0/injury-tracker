// First visit: two short steps, one decision each (Hick). Creates the profile row
// that every other record hangs off.
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import type { Position } from '@shared/types';
import { POSITIONS } from '@shared/validation';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { RadioRows } from '@/components/ui/radio-rows';
import { Field, FieldSet, inputClass } from '@/components/field';
import { errorMessage } from '@/lib/api';
import { POSITION_LABEL } from '@/lib/labels';
import { usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';

const POSITION_HINT: Record<Position, string> = {
  GK: 'Shoulder and wrist load from diving and catching',
  DEF: 'Sharp turns and tackles, heavy on knees and hamstrings',
  MID: 'The most running, so fatigue builds fastest',
  FWD: 'The most sprinting, so hamstrings take the strain',
};

export function Onboarding() {
  const { actions } = usePlayerData();
  const [step, setStep] = useState<1 | 2>(1);
  const [position, setPosition] = useState<Position | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function next() {
    if (!position) {
      setError({ field: 'position', message: 'Choose the position you play most.' });
      return;
    }
    setError(null);
    setStep(2);
  }

  async function finish() {
    if (!consent) return setError({ field: 'consent', message: 'PitchSafe needs your agreement to store your training data.' });
    if (!age) return setError({ field: 'age', message: 'You need to be 13 or older to use PitchSafe.' });
    if (!position) return setStep(1);
    setError(null);
    setSaving(true);
    try {
      await actions.createProfile({ position, displayName: displayName.trim() || undefined, consent: true, ageConfirmed: true });
    } catch (err) {
      setError({ field: 'form', message: errorMessage(err) });
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-12">
      <Link to="/" aria-label="PitchSafe home">
        <Wordmark />
      </Link>
      <p className="mt-10 text-label font-semibold text-ink-2" aria-live="polite">
        Setup {step} of 2
      </p>

      {step === 1 ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <h1 className="font-display text-h1 font-bold text-ink">Where do you play?</h1>
          <p className="mt-2 text-body text-ink-2">Each position strains the body differently, so your advice changes with it.</p>
          <FieldSet legend="Position" error={error?.field === 'position' ? error.message : null} className="mt-6">
            <RadioRows
              aria-label="Position"
              value={position}
              onValueChange={(v) => {
                setPosition(v);
                setError(null);
              }}
              options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p], description: POSITION_HINT[p] }))}
            />
          </FieldSet>
          <Field label="Name for your coach report (optional)" hint="A first name or nickname is enough." className="mt-2">
            {(props) => (
              <input {...props} className={cn(inputClass, 'h-11')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} autoComplete="given-name" />
            )}
          </Field>
          <Button type="submit" size="lg" className="mt-4 w-full">
            Continue
            <ArrowRight aria-hidden weight="bold" />
          </Button>
        </form>
      ) : (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void finish();
          }}
        >
          <h1 className="font-display text-h1 font-bold text-ink">Your data, your call</h1>
          <p className="mt-2 text-body text-ink-2">
            PitchSafe stores your sessions, recovery check-ins, cleats and injuries so it can work out your risk. Only you can see them. You can download or delete everything in Settings.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {[
              { id: 'consent', checked: consent, set: setConsent, text: 'I agree to PitchSafe storing my training and health data to calculate my injury risk.' },
              { id: 'age', checked: age, set: setAge, text: 'I am 13 years old or older.' },
            ].map((c) => (
              <div key={c.id} className="t-input-wrap">
                <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4 hover:bg-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={(e) => {
                      c.set(e.target.checked);
                      setError(null);
                    }}
                    aria-invalid={error?.field === c.id}
                    aria-describedby={error?.field === c.id ? `${c.id}-error` : undefined}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="text-body text-ink">{c.text}</span>
                </label>
                {error?.field === c.id && (
                  <p id={`${c.id}-error`} role="alert" className="mt-1.5 text-label font-medium text-risk-very-high">
                    {error.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-label text-ink-2">
            Read the{' '}
            <Link to="/privacy" className="underline underline-offset-2">
              privacy policy
            </Link>{' '}
            and{' '}
            <Link to="/terms" className="underline underline-offset-2">
              terms
            </Link>
            .
          </p>

          {error?.field === 'form' && (
            <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-risk-very-high-soft px-4 py-3 text-small font-medium text-risk-very-high">
              {error.message}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)} disabled={saving} aria-label="Back to position">
              <ArrowLeft aria-hidden weight="bold" />
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={saving}>
              {saving ? 'Setting up…' : 'Start using PitchSafe'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
