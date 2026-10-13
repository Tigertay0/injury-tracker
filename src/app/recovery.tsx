// Weekly recovery check-in (PRD 2.2). One per week; saving the same week again updates it.
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { recoveryScore, recoveryZone } from '@shared/calculations';
import type { RecoveryLog } from '@shared/types';
import { addDays, localToday, mondayOf } from '@shared/dates';
import { ValidationError, validateRecovery } from '@shared/validation';
import { ConfirmDelete } from '@/components/confirm-delete';
import { RiskChip } from '@/components/risk-chip';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { errorMessage } from '@/lib/api';
import { RECOVERY_LABEL, RECOVERY_TONE, TONE_TEXT, fmtDate } from '@/lib/labels';
import { useOverview, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

const ZONE_MEANING = {
  GOOD: 'You are recovering well. Train as planned.',
  MODERATE: 'Some fatigue. Protect your sleep and keep hard sessions apart.',
  POOR: 'You are under-recovered. Take a rest day before your next hard session.',
} as const;

interface SliderRowProps {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  low: string;
  high: string;
  format: (v: number) => string;
}

function SliderRow({ id, label, value, onChange, min, max, step, low, high, format }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-small font-semibold text-ink">
          {label}
        </span>
        <span className="tnum text-small font-semibold text-ink" aria-hidden>
          {format(value)}
        </span>
      </div>
      <Slider aria-labelledby={id} aria-valuetext={format(value)} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
      <div className="flex justify-between text-caption text-ink-3">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

const DEFAULTS = { sleep: 7.5, soreness: 3, stress: 3, nutrition: 7 };

export default function Recovery() {
  const { recovery } = useOverview();
  const today = useMemo(() => localToday(), []);
  const thisWeek = mondayOf(today);
  const [week, setWeek] = useState(thisWeek);
  const existing = recovery.find((r) => r.weekStart === week) ?? null;

  return (
    <>
      <PageHeader title="Weekly check-in" description="Four questions about the past week. Your answers set your recovery score." />
      {/* Re-mount the form per week (and per saved record) so answers never leak between weeks */}
      <CheckInForm key={`${week}:${existing?.id ?? 'new'}`} week={week} onWeekChange={setWeek} thisWeek={thisWeek} existing={existing} today={today} />
    </>
  );
}

function CheckInForm({
  week,
  onWeekChange,
  thisWeek,
  existing,
  today,
}: {
  week: string;
  onWeekChange: (w: string) => void;
  thisWeek: string;
  existing: RecoveryLog | null;
  today: string;
}) {
  const { recovery } = useOverview();
  const { actions } = usePlayerData();
  const lastWeek = addDays(thisWeek, -7);
  const initial = existing ?? DEFAULTS;
  const [sleep, setSleep] = useState(initial.sleep);
  const [soreness, setSoreness] = useState(initial.soreness);
  const [stress, setStress] = useState(initial.stress);
  const [nutrition, setNutrition] = useState(initial.nutrition);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const score = recoveryScore({ sleep, soreness, stress, nutrition });
  const zone = recoveryZone(score);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let input;
    try {
      input = validateRecovery({ weekStart: week, sleep, soreness, stress, nutrition }, today);
    } catch (err) {
      if (err instanceof ValidationError) return setError(err.message);
      throw err;
    }
    setSaving(true);
    try {
      const log = await actions.saveCheckIn(input);
      toast.success(`Check-in saved: recovery ${log.score.toFixed(1)}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
          <div className="flex flex-col gap-2">
            <span className="text-small font-semibold text-ink">Which week?</span>
            <Segmented
              label="Week"
              size="lg"
              value={week}
              onChange={onWeekChange}
              options={[
                { value: thisWeek, label: `This week (${fmtDate(thisWeek)})` },
                { value: lastWeek, label: `Last week` },
              ]}
              className="self-start"
            />
            {existing && <p className="text-label text-ink-2">You already checked in for this week. Saving again updates it.</p>}
          </div>

          <SliderRow id="sleep" label="Average sleep per night" value={sleep} onChange={setSleep} min={0} max={12} step={0.5} low="0 h" high="12 h" format={(v) => `${v} h`} />
          <SliderRow id="soreness" label="Muscle soreness" value={soreness} onChange={setSoreness} min={1} max={10} step={1} low="1 None" high="10 Very sore" format={(v) => `${v} / 10`} />
          <SliderRow id="stress" label="Stress (school, work, life)" value={stress} onChange={setStress} min={1} max={10} step={1} low="1 Calm" high="10 Very stressed" format={(v) => `${v} / 10`} />
          <SliderRow id="nutrition" label="How well you ate" value={nutrition} onChange={setNutrition} min={1} max={10} step={1} low="1 Poorly" high="10 Very well" format={(v) => `${v} / 10`} />

          {error && (
            <p role="alert" className="rounded-[var(--radius-control)] bg-risk-very-high-soft px-4 py-3 text-small font-medium text-risk-very-high">
              {error}
            </p>
          )}

          <p className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-sunken px-4 py-3 lg:hidden" aria-hidden>
            <span className="text-small font-semibold text-ink-2">Recovery score</span>
            <span className="flex items-center gap-2">
              <span className="tnum font-display text-h2 font-extrabold text-ink">{score.toFixed(1)}</span>
              <RiskChip tone={RECOVERY_TONE[zone]}>{RECOVERY_LABEL[zone]}</RiskChip>
            </span>
          </p>

          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto sm:self-start">
            {saving ? (
              'Saving…'
            ) : existing ? (
              'Update check-in'
            ) : (
              'Save check-in'
            )}
          </Button>
        </form>

        <div className="flex flex-col gap-6">
          <section aria-label="Score preview" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
            <p className="text-label font-semibold text-ink-2">Recovery score</p>
            <p className="mt-1 flex items-baseline gap-2" aria-live="polite">
              <span className={cn('tnum font-display text-display-s font-extrabold', TONE_TEXT[RECOVERY_TONE[zone]])}>{score.toFixed(1)}</span>
              <span className="text-lead font-semibold text-ink-3">/ 10</span>
            </p>
            <RiskChip tone={RECOVERY_TONE[zone]} className="mt-2">
              {RECOVERY_LABEL[zone]}
            </RiskChip>
            <p className="mt-3 text-body text-ink-2">{ZONE_MEANING[zone]}</p>
          </section>

          <section aria-labelledby="history-title" className="rounded-[var(--radius-panel)] border border-line bg-surface">
            <h2 id="history-title" className="px-5 pt-5 text-lead font-semibold text-ink md:px-6">
              Past check-ins
            </h2>
            {recovery.length === 0 ? (
              <p className="px-5 pt-2 pb-5 text-body text-ink-2 md:px-6">Your first check-in will appear here.</p>
            ) : (
              <ul className="mt-2">
                {recovery.slice(0, 12).map((r) => {
                  const z = recoveryZone(r.score);
                  return (
                    <li key={r.id} className="flex items-center gap-3 border-t border-line py-2 pr-2 pl-5 md:pl-6">
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold text-ink">Week of {fmtDate(r.weekStart)}</p>
                        <p className="tnum text-label text-ink-2">
                          {r.sleep} h sleep, soreness {r.soreness}, stress {r.stress}, food {r.nutrition}
                        </p>
                      </div>
                      <span className="tnum text-body font-semibold text-ink">{r.score.toFixed(1)}</span>
                      <RiskChip tone={RECOVERY_TONE[z]} className="hidden sm:inline-flex">
                        {RECOVERY_LABEL[z]}
                      </RiskChip>
                      <ConfirmDelete
                        label={`Delete check-in for week of ${fmtDate(r.weekStart)}`}
                        title="Delete this check-in?"
                        description={`The check-in for the week of ${fmtDate(r.weekStart, true)} will be removed. This cannot be undone.`}
                        onConfirm={async () => {
                          try {
                            await actions.deleteCheckIn(r.id);
                            toast.success('Check-in deleted');
                          } catch (err) {
                            toast.error(errorMessage(err));
                          }
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
