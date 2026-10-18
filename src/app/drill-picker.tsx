// Optional "What did you do?" step on Log session: pick drills from the built-in library
// and give each its minutes. Sessions without drills work exactly as before.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Plus, X } from '@phosphor-icons/react';
import { customDrillKey } from '@shared/custom-drills';
import { DRILL_CATEGORIES, DRILL_CATEGORY_LABEL, DRILLS } from '@shared/drills';
import { MAX_DRILLS_PER_SESSION, MAX_DRILL_MINUTES } from '@shared/validation';
import type { CustomDrill, SessionDrill } from '@shared/types';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/field';
import { useAccount, useAppBase, useDrillLookup } from '@/lib/player-data';
import { cn } from '@/lib/utils';

interface Props {
  value: SessionDrill[];
  onChange: (next: SessionDrill[]) => void;
  /** The player's own drills; archived ones are not offered. */
  customDrills: readonly CustomDrill[];
  /** The session's minutes, when valid; drill minutes must fit inside it. */
  sessionMinutes: number | null;
  error?: string;
}

/** Where focus goes once the next `value` has rendered: the drill select, or a row's Remove button. */
type FocusTarget = { kind: 'select' } | { kind: 'remove'; drillId: string };

export function DrillPicker({ value, onChange, customDrills, sessionMinutes, error }: Props) {
  const id = useId();
  const lookup = useDrillLookup();
  const base = useAppBase();
  const { plus, plusAvailable } = useAccount();
  const selectRef = useRef<HTMLSelectElement>(null);
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [drillId, setDrillId] = useState('');
  const [minutes, setMinutes] = useState('15');
  const used = value.reduce((n, d) => n + d.minutes, 0);
  const over = sessionMinutes !== null && used > sessionMinutes;
  // Spoken as well as shown: the over state is text, not only colour.
  const totalText =
    value.length === 0
      ? ''
      : `${used}${sessionMinutes !== null ? ` of ${sessionMinutes}` : ''} minutes in drills${over ? `, ${used - sessionMinutes} over` : ''}`;
  const picked = (key: string) => value.some((v) => v.drillId === key);
  const available = DRILLS.filter((d) => !picked(d.id));
  const mine = customDrills.filter((d) => !d.archived && !picked(customDrillKey(d.id)));
  const nameOf = (key: string) => lookup(key)?.name;
  const canAdd = drillId !== '' && Number.isInteger(Number(minutes)) && Number(minutes) >= 1 && Number(minutes) <= MAX_DRILL_MINUTES && value.length < MAX_DRILLS_PER_SESSION;

  // Add disables itself once the drill resets, and Remove unmounts the focused button, so the
  // next focus stop is chosen here and applied after the new list has rendered.
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) return;
    const remove = target.kind === 'remove' ? removeRefs.current.get(target.drillId) : undefined;
    (remove ?? selectRef.current)?.focus();
  }, [value]);

  const add = () => {
    if (!canAdd) return;
    pendingFocus.current = { kind: 'select' };
    onChange([...value, { drillId, minutes: Number(minutes) }]);
    setDrillId('');
  };

  const remove = (removedId: string) => {
    const index = value.findIndex((v) => v.drillId === removedId);
    const next = value.filter((v) => v.drillId !== removedId);
    const neighbour = next[index] ?? next[index - 1];
    pendingFocus.current = neighbour ? { kind: 'remove', drillId: neighbour.drillId } : { kind: 'select' };
    onChange(next);
  };

  // Enter inside the picker adds the drill; it never saves the session.
  const addOnEnter = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    add();
  };

  return (
    <fieldset
      className={cn('t-input-wrap flex min-w-0 flex-col gap-3 border-t border-line pt-5', error && 'is-error')}
      aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
    >
      <legend className="text-small font-semibold text-ink">What did you do? (optional)</legend>
      <p id={`${id}-hint`} className="-mt-1 text-label text-ink-2">
        Add the drills from this session. They make your movement load more accurate. Profiles are estimates.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1.5">
          <label htmlFor={`${id}-drill`} className="text-label font-semibold text-ink-2">
            Drill
          </label>
          <select id={`${id}-drill`} ref={selectRef} value={drillId} onChange={(e) => setDrillId(e.target.value)} onKeyDown={addOnEnter} className={cn(inputClass, 'h-11')}>
            <option value="">Choose a drill</option>
            {mine.length > 0 && (
              <optgroup label="My drills">
                {mine.map((d) => (
                  <option key={d.id} value={customDrillKey(d.id)}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
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
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <label htmlFor={`${id}-minutes`} className="text-label font-semibold text-ink-2">
            Minutes
          </label>
          <input id={`${id}-minutes`} type="number" inputMode="numeric" min={1} max={MAX_DRILL_MINUTES} value={minutes} onChange={(e) => setMinutes(e.target.value)} onKeyDown={addOnEnter} className={cn(inputClass, 'tnum h-11')} />
        </div>
        <Button type="button" variant="secondary" onClick={add} disabled={!canAdd}>
          <Plus aria-hidden weight="bold" />
          Add
        </Button>
      </div>

      {plusAvailable && (
        // A new tab, so the session being filled in is not lost
        <Link
          to={`${base}/drills`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center self-start text-label font-semibold text-accent-ink underline underline-offset-2"
        >
          {plus ? 'Create a custom drill' : 'Create a custom drill (Plus)'}
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      )}

      {value.length > 0 && (
        <ul className="border border-line">
          {value.map((d) => (
            <li key={d.drillId} className="flex items-center gap-3 border-b border-line pr-1 pl-3 last:border-b-0">
              <span className="min-w-0 flex-1 py-2 text-body text-ink wrap-anywhere">{nameOf(d.drillId) ?? 'Removed drill'}</span>
              <span className="tnum text-small text-ink-2">{d.minutes} min</span>
              <button
                type="button"
                ref={(el) => {
                  if (el) removeRefs.current.set(d.drillId, el);
                  else removeRefs.current.delete(d.drillId);
                }}
                onClick={() => remove(d.drillId)}
                aria-label={`Remove ${nameOf(d.drillId) ?? 'drill'}`}
                className="grid size-11 place-items-center text-ink-2 hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Always mounted so a screen reader announces each change; empty (and out of the layout) with no drills. */}
      <p role="status" className={cn('tnum text-label empty:sr-only', over ? 'font-semibold text-risk-very-high' : 'text-ink-2')}>
        {totalText}
      </p>
      <p id={`${id}-error`} role="alert" className="t-error-msg min-h-5 text-label font-medium text-risk-very-high">
        {error ?? ''}
      </p>
    </fieldset>
  );
}
