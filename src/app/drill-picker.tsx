// Optional "What did you do?" step on Log session: pick drills from the built-in library
// and give each its minutes. Sessions without drills work exactly as before.
import { useId, useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { DRILL_CATEGORIES, DRILL_CATEGORY_LABEL, DRILLS, drillById } from '@shared/drills';
import { MAX_DRILLS_PER_SESSION } from '@shared/validation';
import type { SessionDrill } from '@shared/types';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/field';
import { cn } from '@/lib/utils';

interface Props {
  value: SessionDrill[];
  onChange: (next: SessionDrill[]) => void;
  /** The session's minutes, when valid; drill minutes must fit inside it. */
  sessionMinutes: number | null;
  error?: string;
}

export function DrillPicker({ value, onChange, sessionMinutes, error }: Props) {
  const id = useId();
  const [drillId, setDrillId] = useState('');
  const [minutes, setMinutes] = useState('15');
  const used = value.reduce((n, d) => n + d.minutes, 0);
  const over = sessionMinutes !== null && used > sessionMinutes;
  const available = DRILLS.filter((d) => !value.some((v) => v.drillId === d.id));
  const canAdd = drillId !== '' && Number.isInteger(Number(minutes)) && Number(minutes) >= 1 && Number(minutes) <= 300 && value.length < MAX_DRILLS_PER_SESSION;

  const add = () => {
    if (!canAdd) return;
    onChange([...value, { drillId, minutes: Number(minutes) }]);
    setDrillId('');
  };

  return (
    <fieldset className="flex flex-col gap-3 border-t border-line pt-5" aria-describedby={error ? `${id}-error` : `${id}-hint`}>
      <legend className="text-small font-semibold text-ink">What did you do? (optional)</legend>
      <p id={`${id}-hint`} className="-mt-1 text-label text-ink-2">
        Add the drills from this session. They make your movement load more accurate. Profiles are estimates.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1.5">
          <span className="text-label font-semibold text-ink-2">Drill</span>
          <select value={drillId} onChange={(e) => setDrillId(e.target.value)} className={cn(inputClass, 'h-11')}>
            <option value="">Choose a drill</option>
            {DRILL_CATEGORIES.map((c) => {
              const options = available.filter((d) => d.category === c);
              return options.length === 0 ? null : (
                <optgroup key={c} label={DRILL_CATEGORY_LABEL[c]}>
                  {options.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-label font-semibold text-ink-2">Minutes</span>
          <input type="number" inputMode="numeric" min={1} max={300} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cn(inputClass, 'tnum h-11')} />
        </label>
        <Button type="button" variant="secondary" onClick={add} disabled={!canAdd}>
          <Plus aria-hidden weight="bold" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="border border-line">
          {value.map((d) => (
            <li key={d.drillId} className="flex items-center gap-3 border-b border-line py-2 pr-1 pl-3 last:border-b-0">
              <span className="min-w-0 flex-1 text-body text-ink">{drillById(d.drillId)?.name ?? 'Removed drill'}</span>
              <span className="tnum text-small text-ink-2">{d.minutes} min</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.drillId !== d.drillId))}
                aria-label={`Remove ${drillById(d.drillId)?.name ?? 'drill'}`}
                className="grid size-9 place-items-center text-ink-2 hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <p className={cn('tnum text-label', over ? 'font-semibold text-risk-very-high' : 'text-ink-2')}>
          {used} {sessionMinutes !== null ? `of ${sessionMinutes}` : ''} minutes in drills
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-small font-semibold text-risk-very-high">
          {error}
        </p>
      )}
    </fieldset>
  );
}
