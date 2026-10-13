// Injury history (PRD 2.4): log injuries, mark them recovered, and see how each one
// changes the score.
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { injuryMultiplier } from '@shared/calculations';
import { localToday } from '@shared/dates';
import type { Injury, InjuryFactor, Severity } from '@shared/types';
import { BODY_PARTS, INJURY_TYPES, SEVERITIES, ValidationError, validateInjury, validateInjuryReturn } from '@shared/validation';
import { ConfirmDelete } from '@/components/confirm-delete';
import { Field, FieldSet, inputClass } from '@/components/field';
import { RiskChip } from '@/components/risk-chip';
import { Button } from '@/components/ui/button';
import { RadioRows } from '@/components/ui/radio-rows';
import { ApiError, errorMessage } from '@/lib/api';
import { SEVERITY_HINT, SEVERITY_LABEL, fmtDate } from '@/lib/labels';
import { useOverview, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

const FACTOR_TEXT: Record<InjuryFactor, string> = {
  ACL_HISTORY: 'Knee ligament tear in your history: +40%',
  ANKLE_SPRAIN_HISTORY: 'Severe ankle sprain in your history: +25%',
  HAMSTRING_HISTORY: 'Hamstring strain in your history: +20%',
  RECENT_INJURY: 'Injured or returned in the last 6 weeks: +30%',
};

const GROUPS = [
  { label: 'Upper body', parts: BODY_PARTS.slice(0, 7) },
  { label: 'Hips and thighs', parts: BODY_PARTS.slice(7, 14) },
  { label: 'Knee and below', parts: BODY_PARTS.slice(14) },
];

type Errors = Partial<Record<'bodyPart' | 'injuryType' | 'severity' | 'injuryDate' | 'returnDate' | 'form', string>>;

function ReturnControl({ injury }: { injury: Injury }) {
  const { actions } = usePlayerData();
  const today = useMemo(() => localToday(), []);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (injury.returnDate) {
    return <RiskChip tone="low">Back {fmtDate(injury.returnDate)}</RiskChip>;
  }
  if (!editing) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
        Mark as recovered
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-start gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          const { returnDate } = validateInjuryReturn({ returnDate: date }, injury.injuryDate, today);
          setBusy(true);
          await actions.setInjuryReturn(injury.id, returnDate);
          toast.success('Marked as recovered');
        } catch (err) {
          setError(err instanceof ValidationError ? err.message : errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="sr-only" htmlFor={`ret-${injury.id}`}>
        Date you returned to full training
      </label>
      <input id={`ret-${injury.id}`} type="date" value={date} min={injury.injuryDate} onChange={(e) => setDate(e.target.value)} className={cn(inputClass, 'h-9 w-40 text-small')} />
      <Button size="sm" type="submit" disabled={busy}>
        Save
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
        Cancel
      </Button>
      {error && (
        <p role="alert" className="w-full text-label text-risk-very-high">
          {error}
        </p>
      )}
    </form>
  );
}

export default function Injuries() {
  const { injuries } = useOverview();
  const { actions } = usePlayerData();
  const today = useMemo(() => localToday(), []);
  const multiplier = useMemo(() => injuryMultiplier(injuries, today), [injuries, today]);

  const [bodyPart, setBodyPart] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [injuryDate, setInjuryDate] = useState('');
  const [stillOut, setStillOut] = useState(true);
  const [returnDate, setReturnDate] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let input;
    try {
      if (!bodyPart) throw new ValidationError('Choose where the injury was.', 'bodyPart');
      if (!injuryType) throw new ValidationError('Choose the type of injury.', 'injuryType');
      if (!severity) throw new ValidationError('Choose how serious it was.', 'severity');
      input = validateInjury({ bodyPart, injuryType, severity, injuryDate, returnDate: stillOut ? null : returnDate }, today);
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field ?? 'form']: err.message });
        setAttempt((a) => a + 1);
        return;
      }
      throw err;
    }
    setErrors({});
    setSaving(true);
    try {
      await actions.addInjury(input);
      toast.success('Injury added');
      setBodyPart('');
      setInjuryType('');
      setSeverity(null);
      setInjuryDate('');
      setReturnDate('');
      setStillOut(true);
    } catch (err) {
      setErrors({ [err instanceof ApiError && err.field ? err.field : 'form']: errorMessage(err) });
      setAttempt((a) => a + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Injury history" description="A past injury is the strongest predictor of the next one. Add any you have had, even old ones." />

      <section aria-labelledby="impact-title" className="mb-6 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="impact-title" className="text-lead font-semibold text-ink">
            Effect on your score
          </h2>
          <span className="tnum font-display text-h1 font-extrabold text-ink">×{multiplier.value.toFixed(2)}</span>
        </div>
        {multiplier.factors.length === 0 ? (
          <p className="mt-2 text-body text-ink-2">Nothing in your history raises your score right now.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {multiplier.factors.map((f) => (
              <li key={f} className="text-body text-ink">
                {FACTOR_TEXT[f]}
              </li>
            ))}
            {multiplier.value === 2 && <li className="text-label text-ink-2">The total is capped at double.</li>}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
          <h2 className="text-lead font-semibold text-ink">Add an injury</h2>

          <Field label="Where" error={errors.bodyPart} shakeKey={attempt}>
            {(p) => (
              <select {...p} className={cn(inputClass, 'h-11')} value={bodyPart} onChange={(e) => setBodyPart(e.target.value)}>
                <option value="">Choose a body part</option>
                {GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.parts.map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </Field>

          <Field label="Type" error={errors.injuryType} shakeKey={attempt}>
            {(p) => (
              <select {...p} className={cn(inputClass, 'h-11')} value={injuryType} onChange={(e) => setInjuryType(e.target.value)}>
                <option value="">Choose a type</option>
                {INJURY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <FieldSet legend="How serious" error={errors.severity}>
            <RadioRows
              aria-label="How serious"
              value={severity}
              onValueChange={setSeverity}
              options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s], description: SEVERITY_HINT[s] }))}
            />
          </FieldSet>

          <Field label="Date it happened" error={errors.injuryDate} shakeKey={attempt}>
            {(p) => <input {...p} type="date" max={today} className={cn(inputClass, 'h-11 max-w-56')} value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />}
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
            <input type="checkbox" checked={stillOut} onChange={(e) => setStillOut(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Still recovering
          </label>

          {!stillOut && (
            <Field label="Date you returned to full training" error={errors.returnDate} shakeKey={attempt}>
              {(p) => <input {...p} type="date" className={cn(inputClass, 'h-11 max-w-56')} value={returnDate} min={injuryDate || undefined} onChange={(e) => setReturnDate(e.target.value)} />}
            </Field>
          )}

          {errors.form && (
            <p role="alert" className="rounded-[var(--radius-control)] bg-risk-very-high-soft px-4 py-3 text-small font-medium text-risk-very-high">
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto sm:self-start">
            {saving ? 'Saving…' : 'Add injury'}
          </Button>
        </form>

        <section aria-labelledby="list-title" className="self-start rounded-[var(--radius-panel)] border border-line bg-surface">
          <h2 id="list-title" className="px-5 pt-5 text-lead font-semibold text-ink md:px-6">
            Your injuries
          </h2>
          {injuries.length === 0 ? (
            <p className="px-5 pt-2 pb-5 text-body text-ink-2 md:px-6">None logged. If you have never been injured, there is nothing to add.</p>
          ) : (
            <ul className="mt-2">
              {injuries.map((i) => (
                <li key={i.id} className="flex flex-col gap-3 border-t border-line px-5 py-4 md:px-6">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-ink">
                        {i.bodyPart} {i.injuryType.toLowerCase()}
                      </p>
                      <p className="text-label text-ink-2">
                        {SEVERITY_LABEL[i.severity]}, {fmtDate(i.injuryDate, true)}
                      </p>
                    </div>
                    <ConfirmDelete
                      label={`Delete ${i.bodyPart} ${i.injuryType.toLowerCase()}`}
                      title="Delete this injury?"
                      description={`${i.bodyPart} ${i.injuryType.toLowerCase()} from ${fmtDate(i.injuryDate, true)} will be removed from your history and score. This cannot be undone.`}
                      onConfirm={async () => {
                        try {
                          await actions.deleteInjury(i.id);
                          toast.success('Injury deleted');
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                      }}
                    />
                  </div>
                  <div className="flex">
                    <ReturnControl injury={i} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
