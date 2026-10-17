// My drills (PitchSafe Plus): describe a drill, let AI estimate how it loads the body, check the
// values and save. Removing a drill archives it, so sessions that used it keep its name and load.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CUSTOM_DESCRIPTION_MAX, CUSTOM_NAME_MAX, MAX_CUSTOM_DRILLS } from '@shared/custom-drills';
import { DRILL_CATEGORIES, DRILL_CATEGORY_LABEL, type DrillCategory } from '@shared/drills';
import { MOVEMENT_LABEL, MOVEMENT_TYPES } from '@shared/movement';
import type { CustomDrill, MovementType } from '@shared/types';
import { ValidationError, validateCustomDrill, validateEstimateRequest } from '@shared/validation';
import { ConfirmDelete } from '@/components/confirm-delete';
import { Field, FieldSet, inputClass } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ApiError, errorMessage } from '@/lib/api';
import { blankProfile, draftToValues, firstInvalidShare, isWholePercent, markEstimateStale, matchesEstimate, profileFromEstimate, type ProfileDraft } from '@/lib/custom-drill-form';
import { useAccount, useAppBase, useOverview, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

const NO_DRILLS: readonly CustomDrill[] = [];
const CARD = 'rounded-[var(--radius-panel)] border border-line bg-surface';
const ALERT = 'rounded-[var(--radius-control)] bg-risk-very-high-soft px-4 py-3 text-small font-medium text-risk-very-high';
const TEXT_CHANGED_NOTE = 'Your text changed after the estimate. Estimate again to update it.';
const SHARE_INPUT = 'tnum h-11 pr-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

type ErrorField = 'name' | 'description' | 'category' | 'shares' | 'form';
type Errors = Partial<Record<ErrorField, string>>;

/** Server and validation field names that have a place on the form; anything else shows above the buttons. */
const FIELD_FOR: Record<string, ErrorField> = { name: 'name', description: 'description', category: 'category', profile: 'shares', shares: 'shares' };
const errorField = (field: string | undefined): ErrorField => (field && FIELD_FOR[field]) || 'form';

/** Where focus goes once the list has rendered: a row, or (null) the list heading. */
interface FocusRequest {
  id: string | null;
}

const newestFirst = (a: CustomDrill, b: CustomDrill) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

function SourceTag({ aiEstimated, className }: { aiEstimated: boolean; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-[var(--radius-chip)] border border-line bg-sunken px-2.5 py-0.5 text-caption font-semibold text-ink-2', className)}>{aiEstimated ? 'Estimated by AI' : 'Your values'}</span>;
}

interface ProfileEditorProps {
  draft: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  errors: Errors;
  attempt: number;
  categoryRef: RefObject<HTMLSelectElement | null>;
  shareRefs: RefObject<Map<MovementType, HTMLInputElement>>;
}

/** Category, intensity and the six movement shares, filled in by the AI or by the player. */
function ProfileEditor({ draft, onChange, errors, attempt, categoryRef, shareRefs }: ProfileEditorProps) {
  const id = useId();
  const { estimate } = draft;
  // The AI tag and its reason describe the model's values for the text it was given, so they show only while the values are still exactly those and the text is unchanged
  const asEstimated = matchesEstimate(draft);
  const estimateNotes = !estimate ? undefined : asEstimated ? `${id}-reason ${id}-check` : `${id}-changed`;

  return (
    <div role="group" aria-labelledby={`${id}-title`} className="flex flex-col gap-5 border-t border-line pt-5">
      <h3 id={`${id}-title`} className="text-body font-semibold text-ink">
        How it loads your body
      </h3>

      {estimate && (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-control)] border border-line bg-sunken p-4">
          {asEstimated ? (
            <>
              <SourceTag aiEstimated className="bg-surface" />
              {estimate.reason && (
                <p id={`${id}-reason`} className="text-body text-ink wrap-anywhere">
                  {estimate.reason}
                </p>
              )}
              <p id={`${id}-check`} className="text-label text-ink-2">
                Check the values and change any that look wrong.
              </p>
            </>
          ) : (
            <p id={`${id}-changed`} className="text-label text-ink-2">
              {draft.stale ? TEXT_CHANGED_NOTE : "You changed the AI's values."}
            </p>
          )}
        </div>
      )}

      <Field label="Category" error={errors.category} shakeKey={attempt}>
        {(p) => (
          <select
            {...p}
            ref={categoryRef}
            aria-describedby={[p['aria-describedby'], estimateNotes].filter(Boolean).join(' ') || undefined}
            className={cn(inputClass, 'h-11')}
            value={draft.category}
            onChange={(e) => onChange({ ...draft, category: e.target.value as DrillCategory | '' })}
          >
            <option value="">Choose a category</option>
            {DRILL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {DRILL_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span id={`${id}-intensity`} className="text-small font-semibold text-ink">
            Intensity
          </span>
          <span className="tnum text-small font-semibold text-ink" aria-hidden>
            {draft.intensity} of 10
          </span>
        </div>
        <Slider
          aria-labelledby={`${id}-intensity`}
          aria-valuetext={`${draft.intensity} out of 10`}
          min={1}
          max={10}
          step={1}
          value={[draft.intensity]}
          onValueChange={([v]) => onChange({ ...draft, intensity: v })}
        />
        <div className="flex justify-between text-caption text-ink-3">
          <span>1 Very light</span>
          <span>10 All-out</span>
        </div>
      </div>

      <FieldSet legend="Share of drill time" hint="How much of the drill goes on each kind of movement. The numbers do not need to add up to 100." error={errors.shares}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
          {MOVEMENT_TYPES.map((type) => {
            const inputId = `${id}-${type}`;
            return (
              <div key={type} className="flex flex-col justify-between gap-1.5">
                <label htmlFor={inputId} className="text-label font-semibold text-ink-2">
                  {MOVEMENT_LABEL[type]}
                  <span className="sr-only"> % of drill time</span>
                </label>
                <div className="relative">
                  <input
                    id={inputId}
                    ref={(el) => {
                      if (el) shareRefs.current.set(type, el);
                      else shareRefs.current.delete(type);
                    }}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    className={cn(inputClass, SHARE_INPUT)}
                    value={draft.shares[type]}
                    aria-invalid={Boolean(errors.shares) && !isWholePercent(draft.shares[type])}
                    onChange={(e) => onChange({ ...draft, shares: { ...draft.shares, [type]: e.target.value } })}
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-body text-ink-3">
                    %
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </FieldSet>
    </div>
  );
}

function LimitCard() {
  return (
    <section className={cn(CARD, 'p-5 md:p-6')}>
      <h2 className="text-lead font-semibold text-ink">Add a drill</h2>
      <p className="mt-2 text-body text-ink-2">You have {MAX_CUSTOM_DRILLS} drills, the most you can keep. Remove one to make room for another.</p>
    </section>
  );
}

const PENDING_BUTTON = 'aria-disabled:cursor-progress aria-disabled:opacity-55';

/**
 * What happened to the last estimate, shown in the status line: it arrived, the text changed after it
 * arrived (the editor shows that note itself, so the status line only announces it), or the text
 * changed before it arrived and it was dropped.
 */
type EstimateNote = 'ready' | 'edited' | 'stale';
const ESTIMATE_NOTE_TEXT: Record<EstimateNote, string> = {
  ready: 'Estimate ready. Check the values above.',
  edited: TEXT_CHANGED_NOTE,
  stale: 'Your text changed, so the estimate was not used. Estimate again.',
};

interface FormActionsProps {
  /** describe: name and description only. review: an AI estimate is in the editor. manual: the player's own values. */
  stage: 'describe' | 'review' | 'manual';
  estimating: boolean;
  saving: boolean;
  estimateNote: EstimateNote | null;
  estimateError: string | null;
  onEstimate: () => void;
  onEnterValues: () => void;
  actionsRef: RefObject<HTMLDivElement | null>;
}

/** The buttons, the estimate's progress for screen readers, and its failure message. */
function FormActions({ stage, estimating, saving, estimateNote, estimateError, onEstimate, onEnterValues, actionsRef }: FormActionsProps) {
  const disclosureId = useId();
  return (
    <>
      <div ref={actionsRef} aria-busy={estimating} className="flex flex-col gap-3 sm:flex-row">
        {stage === 'describe' ? (
          <>
            <Button key="estimate" type="submit" size="lg" aria-disabled={estimating} aria-describedby={disclosureId} className={cn('w-full sm:w-auto', PENDING_BUTTON)}>
              {estimating ? 'Estimating…' : 'Estimate with AI'}
            </Button>
            <Button key="manual" type="button" size="lg" variant="secondary" onClick={onEnterValues} className="w-full sm:w-auto">
              Enter values yourself
            </Button>
          </>
        ) : (
          <>
            {/* aria-disabled, not disabled: the buttons keep keyboard focus, and save() ignores the press */}
            <Button key="save" type="submit" size="lg" aria-disabled={saving || estimating} className={cn('w-full sm:w-auto', PENDING_BUTTON)}>
              {saving ? 'Saving…' : 'Save drill'}
            </Button>
            <Button key="estimate-again" type="button" size="lg" variant="secondary" aria-disabled={estimating || saving} aria-describedby={disclosureId} onClick={onEstimate} className={cn('w-full sm:w-auto', PENDING_BUTTON)}>
              {estimating ? 'Estimating…' : stage === 'review' ? 'Estimate again' : 'Estimate with AI'}
            </Button>
          </>
        )}
      </div>

      <p id={disclosureId} className="-mt-1 text-label text-ink-2">
        Estimating sends the drill's name and description to Anthropic.{' '}
        <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink underline underline-offset-2">
          How we use it<span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </p>

      {/* Outside the busy region, which would hold back announcements made inside it */}
      <p role="status" className={cn('-mt-2 text-label text-ink-2', !estimating && estimateNote !== 'stale' && 'sr-only')}>
        {estimating ? 'Estimating how this drill loads your body. This can take a few seconds.' : estimateNote ? ESTIMATE_NOTE_TEXT[estimateNote] : ''}
      </p>
      {estimateError && (
        <p role="alert" className={ALERT}>
          {estimateError}
        </p>
      )}
    </>
  );
}

function DrillForm({ onSaved }: { onSaved: (id: string) => void }) {
  const { actions } = usePlayerData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState<EstimateNote | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editorFocus, setEditorFocus] = useState(0);

  // Each estimate gets a number. An answer is only used if it is still the latest request, so one that
  // arrives after the form was reset, switched to manual entry or left is ignored.
  const latestRequest = useRef(0);
  // The text as it is now, which an estimate that resolves later is checked against
  const currentText = useRef({ name: '', description: '' });
  const categoryRef = useRef<HTMLSelectElement>(null);
  const shareRefs = useRef(new Map<MovementType, HTMLInputElement>());
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      latestRequest.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (editorFocus > 0) categoryRef.current?.focus();
  }, [editorFocus]);

  const clearError = (field: ErrorField) => setErrors((x) => (x[field] ? { ...x, [field]: undefined } : x));

  function fail(err: unknown, shares?: ProfileDraft['shares']) {
    if (!(err instanceof ValidationError) && !(err instanceof ApiError)) throw err;
    const field = errorField(err.field);
    setErrors({ [field]: err.message });
    setAttempt((a) => a + 1);
    if (field === 'shares' && shares) {
      const bad = firstInvalidShare(shares);
      if (bad) shareRefs.current.get(bad)?.focus();
    }
  }

  // Once an estimate is in, editing the name or description means it was made for different text
  function textEdited() {
    if (!draft || draft.estimate === null || draft.stale) return;
    setDraft(markEstimateStale(draft));
    setEstimateNote('edited');
  }

  function reset() {
    latestRequest.current += 1;
    currentText.current = { name: '', description: '' };
    setName('');
    setDescription('');
    setDraft(null);
    setEstimating(false);
    setEstimateNote(null);
    setEstimateError(null);
    setErrors({});
  }

  function enterValues() {
    latestRequest.current += 1;
    setEstimating(false);
    setEstimateNote(null);
    setEstimateError(null);
    setDraft(blankProfile());
    setEditorFocus((n) => n + 1);
  }

  async function estimate() {
    if (estimating || saving) return;
    let input;
    try {
      input = validateEstimateRequest({ name, description });
    } catch (err) {
      fail(err);
      return;
    }
    const request = ++latestRequest.current;
    setErrors({});
    setEstimateError(null);
    setEstimateNote(null);
    setEstimating(true);
    try {
      const result = await actions.estimateDrill(input);
      if (request !== latestRequest.current) return;
      // Text the player changed while waiting is not what was estimated, so the answer is not used
      const now = currentText.current;
      if (now.name.trim() !== input.name || now.description.trim() !== input.description) {
        setEstimateNote('stale');
        return;
      }
      // Keep the player where they are if they moved on to another field while waiting
      const focused = document.activeElement;
      const stayedPut = focused === null || focused === document.body || actionsRef.current?.contains(focused);
      setDraft(profileFromEstimate(result));
      setEstimateNote('ready');
      if (stayedPut) setEditorFocus((n) => n + 1);
    } catch (err) {
      if (request !== latestRequest.current) return;
      setEstimateError(errorMessage(err));
    } finally {
      if (request === latestRequest.current) setEstimating(false);
    }
  }

  async function save() {
    if (!draft || saving || estimating) return;
    let input;
    try {
      validateEstimateRequest({ name, description }); // checks the name and description first, so errors come in form order
      input = validateCustomDrill({ name, description, ...draftToValues(draft) });
    } catch (err) {
      fail(err, draft.shares);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const drill = await actions.addCustomDrill(input);
      reset();
      toast.success('Drill saved');
      onSaved(drill.id);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void (draft ? save() : estimate());
  }

  return (
    <form noValidate onSubmit={onSubmit} className={cn(CARD, 'flex flex-col gap-4 p-5 md:p-6')}>
      <h2 className="text-lead font-semibold text-ink">Add a drill</h2>

      <Field label="Name" error={errors.name} shakeKey={attempt}>
        {(p) => (
          <input
            {...p}
            className={cn(inputClass, 'h-11')}
            value={name}
            maxLength={CUSTOM_NAME_MAX}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              currentText.current = { ...currentText.current, name: e.target.value };
              clearError('name');
              textEdited();
            }}
          />
        )}
      </Field>

      <Field label="Description (optional)" hint="For example: 4v4 in a 20×25 grid, two-touch, 4 × 4 min" error={errors.description} shakeKey={attempt}>
        {(p) => (
          <textarea
            {...p}
            rows={3}
            maxLength={CUSTOM_DESCRIPTION_MAX}
            className={`${inputClass} py-2.5`}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              currentText.current = { ...currentText.current, description: e.target.value };
              clearError('description');
              textEdited();
            }}
          />
        )}
      </Field>

      {draft && (
        <ProfileEditor
          draft={draft}
          errors={errors}
          attempt={attempt}
          categoryRef={categoryRef}
          shareRefs={shareRefs}
          onChange={(next) => {
            setDraft(next);
            if (next.category !== draft.category) clearError('category');
            if (next.shares !== draft.shares) clearError('shares');
          }}
        />
      )}

      {errors.form && (
        <p role="alert" className={ALERT}>
          {errors.form}
        </p>
      )}

      <FormActions
        actionsRef={actionsRef}
        stage={draft === null ? 'describe' : draft.estimate ? 'review' : 'manual'}
        estimating={estimating}
        saving={saving}
        estimateNote={estimateNote}
        estimateError={estimateError}
        onEstimate={() => void estimate()}
        onEnterValues={enterValues}
      />
    </form>
  );
}

interface DrillListProps {
  drills: readonly CustomDrill[];
  focusRequest: FocusRequest | null;
  onRemoved: (neighbourId: string | null) => void;
}

function DrillList({ drills, focusRequest, onRemoved }: DrillListProps) {
  const { actions } = usePlayerData();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!focusRequest) return;
    const row = focusRequest.id === null ? null : rowRefs.current.get(focusRequest.id);
    (row ?? headingRef.current)?.focus();
  }, [focusRequest]);

  async function remove(drill: CustomDrill) {
    const index = drills.findIndex((d) => d.id === drill.id);
    const neighbour = drills[index + 1] ?? drills[index - 1];
    try {
      await actions.archiveCustomDrill(drill.id);
      toast.success('Drill removed');
      onRemoved(neighbour?.id ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <section aria-labelledby="drill-list-title" className={cn(CARD, 'self-start')}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5 md:px-6">
        <h2 id="drill-list-title" ref={headingRef} tabIndex={-1} className="text-lead font-semibold text-ink">
          Your drills
        </h2>
        <p className="tnum text-label text-ink-2">
          {drills.length} of {MAX_CUSTOM_DRILLS}
          <span className="sr-only"> drills</span>
        </p>
      </div>
      {drills.length === 0 ? (
        <p className="px-5 pt-2 pb-5 text-body text-ink-2 md:px-6">None yet. Drills you create show up here, and in the drill list when you log a session.</p>
      ) : (
        <ul className="mt-2">
          {drills.map((d) => (
            <li
              key={d.id}
              ref={(el) => {
                if (el) rowRefs.current.set(d.id, el);
                else rowRefs.current.delete(d.id);
              }}
              tabIndex={-1}
              className="flex items-start gap-3 border-t border-line py-4 pr-3 pl-5 focus-visible:outline-offset-[-2px] last:rounded-b-[calc(var(--radius-panel)-1px)] md:pl-6"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <p className="text-body font-semibold text-ink wrap-anywhere">{d.name}</p>
                <p className="tnum text-label text-ink-2">
                  {DRILL_CATEGORY_LABEL[d.category]} · Intensity {d.profile.intensity} of 10
                </p>
                <SourceTag aiEstimated={d.aiEstimated} />
              </div>
              <ConfirmDelete
                label={`Remove ${d.name}`}
                title="Remove this drill?"
                description="It stays in sessions you already logged."
                confirmLabel="Remove"
                busyLabel="Removing…"
                onConfirm={() => remove(d)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The player's active drills, newest first. Archived ones stay in their old sessions, not here. */
function useActiveDrills(): readonly CustomDrill[] {
  const { customDrills = NO_DRILLS } = useOverview();
  return useMemo(() => customDrills.filter((d) => !d.archived).sort(newestFirst), [customDrills]);
}

const TWO_COLUMNS = 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';

function PlusDrills() {
  const drills = useActiveDrills();
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusRow = (id: string | null) => setFocusRequest({ id });

  return (
    <>
      <PageHeader title="My drills" description="Describe a drill and AI estimates how it loads your body. Check the numbers, then pick it when you log a session." />
      <div className={TWO_COLUMNS}>
        {drills.length >= MAX_CUSTOM_DRILLS ? <LimitCard /> : <DrillForm onSaved={focusRow} />}
        <DrillList drills={drills} focusRequest={focusRequest} onRemoved={focusRow} />
      </div>
    </>
  );
}

/** Players without Plus: the upgrade card, plus any drills they saved while they had it, which they can still remove. */
function UpgradeToPlus({ base }: { base: string }) {
  const drills = useActiveDrills();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  // With the last drill gone the list disappears, so focus goes to the one control left on the page
  const focusAfterRemoval = (id: string | null) => (id === null ? linkRef.current?.focus() : setFocusRequest({ id }));

  return (
    <>
      <PageHeader title="My drills" />
      <div className={cn(drills.length > 0 && TWO_COLUMNS)}>
        <section className={cn(CARD, 'flex max-w-xl flex-col items-start gap-5 self-start p-5 md:p-6')}>
          <p className="text-body text-ink">Create your own drills and personal workouts, and AI works out how each one loads your body. Part of PitchSafe Plus, $60 a year or $9.99 a month.</p>
          <Button asChild size="lg">
            <Link ref={linkRef} to={`${base}/settings#plus`}>
              See PitchSafe Plus
            </Link>
          </Button>
        </section>
        {drills.length > 0 && <DrillList drills={drills} focusRequest={focusRequest} onRemoved={focusAfterRemoval} />}
      </div>
    </>
  );
}

export default function CustomDrills() {
  const { plus, plusAvailable } = useAccount();
  const base = useAppBase();

  if (!plusAvailable) return <PageHeader title="My drills" description="PitchSafe Plus isn't available yet." />;
  if (!plus) return <UpgradeToPlus base={base} />;
  return <PlusDrills />;
}
