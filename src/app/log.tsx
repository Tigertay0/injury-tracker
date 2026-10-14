// Log a session. The load preview sits beside the inputs, with the last session of
// the same type ghosted next to it for comparison (Hevy's "previous" column).
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { sessionLoad } from '@shared/calculations';
import type { SessionType } from '@shared/types';
import { ValidationError, validateSession } from '@shared/validation';
import { ConfirmDelete } from '@/components/confirm-delete';
import { Field, inputClass } from '@/components/field';
import { Segmented } from '@/components/segmented';
import { SuccessCheck } from '@/components/success-check';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ApiError, errorMessage } from '@/lib/api';
import { SESSION_LABEL, fmtDate, fmtWeekday } from '@/lib/labels';
import { useOverview, usePlayerData } from '@/lib/player-data';
import { useLocalToday } from '@/lib/use-local-today';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

const EFFORT_LABEL = ['', 'Very easy', 'Easy', 'Moderate', 'Somewhat hard', 'Hard', 'Hard', 'Very hard', 'Very hard', 'Close to max', 'All-out'];
const QUICK_MINUTES = [45, 60, 75, 90];
const TYPES: { value: SessionType; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'match', label: 'Match' },
  { value: 'gym', label: 'Gym' },
];

const LOG_FIELDS = new Set(['date', 'duration', 'notes']);

type Errors = Partial<Record<'date' | 'duration' | 'rpe' | 'notes' | 'form', string>>;

export default function LogSession() {
  const { sessions } = useOverview();
  const { actions } = usePlayerData();
  const today = useLocalToday();

  // The date follows today (also past midnight) until the player picks one
  const [pickedDate, setDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [type, setType] = useState<SessionType>('training');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const minutes = Number(duration);
  const load = Number.isInteger(minutes) && minutes > 0 && minutes <= 300 ? sessionLoad(minutes, rpe) : null;
  const previous = sessions.find((s) => s.type === type);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let input;
    try {
      input = validateSession({ date, type, duration, rpe, notes }, today);
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field && LOG_FIELDS.has(err.field) ? err.field : 'form']: err.message });
        setAttempt((a) => a + 1);
        return;
      }
      throw err;
    }
    setErrors({});
    setSaving(true);
    try {
      await actions.addSession(input);
      setSaved(true);
      setDuration('');
      setNotes('');
      toast.success(`${SESSION_LABEL[input.type]} saved: load ${sessionLoad(input.duration, input.rpe)}`);
      setTimeout(() => setSaved(false), 1600);
    } catch (err) {
      const field = err instanceof ApiError && err.field && LOG_FIELDS.has(err.field) ? err.field : 'form';
      setErrors({ [field]: errorMessage(err) });
      setAttempt((a) => a + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Log a session" description="Right after training is best, while you still remember how hard it felt." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
          <div className="flex flex-col gap-2">
            <span id="type-label" className="text-small font-semibold text-ink">
              Session type
            </span>
            <Segmented label="Session type" size="lg" value={type} onChange={setType} options={TYPES} className="self-start" />
          </div>

          <Field label="Date" error={errors.date} shakeKey={attempt}>
            {(p) => <input {...p} type="date" className={cn(inputClass, 'h-11 max-w-56')} value={date} max={today} onChange={(e) => setDate(e.target.value)} required />}
          </Field>

          <Field label="Minutes played or trained" error={errors.duration} shakeKey={attempt}>
            {(p) => (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={300}
                  placeholder="75"
                  className={cn(inputClass, 'tnum h-11 w-28')}
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    if (errors.duration) setErrors((x) => ({ ...x, duration: undefined }));
                  }}
                  required
                />
                {QUICK_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(String(m))}
                    aria-label={`${m} minutes`}
                    className={cn(
                      'press tnum h-11 min-w-12 rounded-[var(--radius-control)] border px-3 text-small font-semibold',
                      Number(duration) === m ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span id="rpe-label" className="text-small font-semibold text-ink">
                How hard did it feel?
              </span>
              <span className="tnum text-small font-semibold text-ink" aria-hidden>
                {rpe} · {EFFORT_LABEL[rpe]}
              </span>
            </div>
            <Slider aria-labelledby="rpe-label" aria-valuetext={`${rpe} out of 10, ${EFFORT_LABEL[rpe]}`} min={1} max={10} step={1} value={[rpe]} onValueChange={([v]) => setRpe(v)} />
            <div className="flex justify-between text-caption text-ink-3">
              <span>1 Very easy</span>
              <span>10 All-out</span>
            </div>
          </div>

          <Field label="Notes (optional)" error={errors.notes} shakeKey={attempt}>
            {(p) => (
              <textarea {...p} rows={2} maxLength={500} className={`${inputClass} py-2.5`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering, like a tight hamstring" />
            )}
          </Field>

          {errors.form && (
            <p role="alert" className="rounded-[var(--radius-control)] bg-risk-very-high-soft px-4 py-3 text-small font-medium text-risk-very-high">
              {errors.form}
            </p>
          )}

          <p className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-sunken px-4 py-3 lg:hidden" aria-hidden>
            <span className="text-small font-semibold text-ink-2">Session load</span>
            <span className="tnum font-display text-h2 font-bold text-ink">{load ?? 0}</span>
          </p>

          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto sm:self-start">
            {saved ? (
              <>
                <SuccessCheck />
                Saved
              </>
            ) : saving ? (
              'Saving…'
            ) : (
              'Save session'
            )}
          </Button>
        </form>

        <div className="flex flex-col gap-6">
          <section aria-label="Load preview" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
            <p className="text-label font-semibold text-ink-2">This session's load</p>
            <p className="tnum mt-1 font-display text-display-s font-bold text-ink" aria-live="polite">
              {load ?? <span className="text-ink-3">0</span>}
            </p>
            <p className="tnum mt-1 text-small text-ink-2">{load ? `${minutes} min × effort ${rpe}` : 'Minutes × effort'}</p>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-label font-semibold text-ink-2">Last {SESSION_LABEL[type].toLowerCase()}</p>
              {previous ? (
                <p className="tnum mt-1 text-body text-ink-3">
                  {fmtDate(previous.date)}: {previous.duration} min × {previous.rpe} = <span className="font-semibold text-ink-2">{previous.load}</span>
                </p>
              ) : (
                <p className="mt-1 text-body text-ink-3">None logged yet</p>
              )}
            </div>
          </section>

          <section aria-labelledby="recent-title" className="rounded-[var(--radius-panel)] border border-line bg-surface">
            <h2 id="recent-title" className="px-5 pt-5 text-lead font-semibold text-ink md:px-6">
              Recent sessions
            </h2>
            {sessions.length === 0 ? (
              <p className="px-5 pt-2 pb-5 text-body text-ink-2 md:px-6">Nothing yet. Your first session will appear here.</p>
            ) : (
              <ul className="mt-2">
                {sessions.slice(0, 12).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 border-t border-line py-2 pr-2 pl-5 md:pl-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-ink">
                        {SESSION_LABEL[s.type]} <span className="font-normal text-ink-2">{fmtWeekday(s.date)} {fmtDate(s.date)}</span>
                      </p>
                      <p className="tnum text-label text-ink-2">
                        {s.duration} min × {s.rpe}
                        {s.notes ? `, ${s.notes}` : ''}
                      </p>
                    </div>
                    <span className="tnum text-body font-semibold text-ink">{s.load}</span>
                    <ConfirmDelete
                      label={`Delete ${SESSION_LABEL[s.type].toLowerCase()} on ${fmtDate(s.date)}`}
                      title="Delete this session?"
                      description={`${SESSION_LABEL[s.type]} on ${fmtDate(s.date, true)}, load ${s.load}. Your score will be recalculated without it. This cannot be undone.`}
                      onConfirm={async () => {
                        try {
                          await actions.deleteSession(s.id);
                          toast.success('Session deleted');
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
