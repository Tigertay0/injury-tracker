# Drill Library and Movement Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can attach drills from a built-in library to a logged session, and the drills' movement profiles add a "movement load" check to the training part of the risk score.

**Architecture:**
- The drill library and all scoring math live in `shared/`, as pure, tested TypeScript used by both the browser and the Worker.
- Drills are stored per session in a new Postgres table, `session_drills`. It has row-level security, and a composite foreign key ties each row to the player's own session.
- The API accepts drills inside the existing `POST /api/sessions` body and returns them with each session.
- The UI adds a drill picker to Log session and a "Movement this week" panel to the dashboard.

**Tech Stack:** TypeScript 7, React 19, Vite 8, Tailwind 4, Hono on Cloudflare Workers, Neon Postgres via Hyperdrive (`pg`), Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-13-drills-and-plus-design.md` (Part 1).

## Global Constraints

- Session load stays `duration × rpe`. Drills never change it.
- The composite weighting stays 45/30/25 with the injury multiplier unchanged. Only the 45% training input becomes `max(workload-ratio points, highest movement-spike points)`.
- Movement types: `sprint`, `hsr`, `cod`, `jump`, `contact`, `strength`. Profile shares are 0 to 1, and intensity is an integer from 1 to 10.
- Scored types: `sprint`, `hsr`, `cod`, `jump` and `contact`. `strength` is shown but never scored.
- Spike thresholds: a ratio up to 1.3 means no points, up to 1.5 gives 50 points, and above 1.5 gives 85 points.
- Baseline: drills must be logged in at least 3 of the last 4 weeks (days 0-6, 7-13, 14-20 and 21-27 before today), and the type's average week must be at least 5 minutes.
- Limits:
  - at most 12 drills per session;
  - each drill 1 to 300 minutes;
  - drill minutes must not add up to more than the session's minutes;
  - each built-in drill at most once per session;
  - drill ids must exist in the built-in library;
  - per-player cap of 20,000 `session_drills` rows.
- Every number shown to players uses `.tnum`. Square corners only (`rounded-[var(--radius-…)]` tokens are 0). Host Grotesk. No new fonts or colours: use existing tokens (`chart-past`, `chart-now`, `TONE_CHIP`).
- Copy: sentence case, no em dashes, and built-in profiles are labelled as estimates.
- Commits have no attribution lines.

## Review Focus

1. **Old sessions without drills** (every session logged before this ships, and `undefined` drills from older API responses). Expect no change to any score, no crash, and no movement panel.
2. **Unknown drill id in stored data** (a drill removed from the library later). Expect it to be ignored in scoring and shown as "Removed drill" in history.
3. **Drill minutes that exceed the session**, including after the player edits the session minutes down once drills are added. Expect an inline error on submit and nothing saved.
4. **Sparse logging** (drills in only 1 or 2 of the last 4 weeks, or tiny usual minutes). Expect no ratio, no points and no advice.
5. **Another player's session id posted as a drill's `session_id`** (direct SQL as the app role). Expect the database to reject it (composite foreign key).

Each is pinned by a test in the owning task: 1 in Tasks 2, 3 and 7; 2 in Tasks 2 and 7; 3 in Tasks 4 and 7; 4 in Task 2; 5 in Task 5.

---

## File Structure

| File | Responsibility |
|---|---|
| `shared/types.ts` (modify) | `MovementType`, `MovementProfile`, `SessionDrill`; optional `drills` on `TrainingSession` |
| `shared/drills.ts` (create) | Built-in drill library, categories, lookup |
| `shared/movement.ts` (create) | Exposure, weekly movement ratios, spike levels and points |
| `shared/risk-model.ts` (modify) | Feeds movement points into the training input; exposes `movement` |
| `shared/recommendations.ts` (modify) | Movement-spike advice |
| `shared/validation.ts` (modify) | Validates `drills` on sessions |
| `db/migrations/0002_session_drills.sql` (create) | Table, composite FK, grants, RLS, row cap |
| `worker/repo.ts` (modify) | Reads and writes drills with sessions |
| `src/lib/sample-data.ts` (modify) | Demo sessions carry drills |
| `src/app/drill-picker.tsx` (create) | Drill picker used by Log session |
| `src/app/log.tsx` (modify) | Uses the picker; history shows drills |
| `src/app/movement-panel.tsx` (create) | "Movement this week" dashboard panel |
| `src/app/dashboard.tsx` (modify) | Renders the panel |
| `src/pages/science.tsx` (modify) | "Movement load" section and source |
| Tests | `tests/drills.test.ts`, `tests/movement.test.ts` (create); `tests/risk-model.test.ts`, `tests/recommendations.test.ts`, `tests/validation.test.ts`, `tests/api.test.ts`, `tests/db/rls.test.ts`, `tests/db/api-flow.test.ts` (modify) |

---

### Task 1: Types and built-in drill library

**Files:**
- Modify: `shared/types.ts`
- Create: `shared/drills.ts`
- Test: `tests/drills.test.ts`

**Interfaces:**
- Produces:
  - `type MovementType = 'sprint' | 'hsr' | 'cod' | 'jump' | 'contact' | 'strength'`
  - `interface MovementProfile { intensity: number; sprint: number; hsr: number; cod: number; jump: number; contact: number; strength: number }`
  - `interface SessionDrill { drillId: string; minutes: number }`
  - `TrainingSession.drills?: SessionDrill[]`
  - `type DrillCategory`
  - `interface Drill { id: string; name: string; category: DrillCategory; profile: MovementProfile }`
  - `DRILLS: readonly Drill[]`, `DRILL_CATEGORIES: readonly DrillCategory[]`, `DRILL_CATEGORY_LABEL: Record<DrillCategory, string>`
  - `drillById(id: string): Drill | undefined`
  - `DRILL_IDS: ReadonlySet<string>`

- [ ] **Step 1: Write the failing test** `tests/drills.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DRILLS, DRILL_CATEGORIES, DRILL_IDS, drillById } from '../shared/drills';

const SHARES = ['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'] as const;

describe('built-in drill library', () => {
  it('has about thirty drills with unique, stable ids', () => {
    expect(DRILLS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
    for (const d of DRILLS) expect(d.id).toMatch(/^[a-z0-9_]{2,40}$/);
  });

  it('keeps every profile in range', () => {
    for (const d of DRILLS) {
      expect(Number.isInteger(d.profile.intensity)).toBe(true);
      expect(d.profile.intensity).toBeGreaterThanOrEqual(1);
      expect(d.profile.intensity).toBeLessThanOrEqual(10);
      for (const k of SHARES) {
        expect(d.profile[k]).toBeGreaterThanOrEqual(0);
        expect(d.profile[k]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses every category', () => {
    for (const c of DRILL_CATEGORIES) expect(DRILLS.some((d) => d.category === c)).toBe(true);
  });

  it('looks drills up by id', () => {
    expect(drillById('rondo_4v2')?.name).toBe('Rondo (4v2, 5v2)');
    expect(drillById('nope')).toBeUndefined();
    expect(DRILL_IDS.has('nordic_curls')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/drills.test.ts`
Expected: FAIL, "Cannot find module '../shared/drills'".

- [ ] **Step 3: Add the types** to the end of `shared/types.ts`, and add `drills?` to `TrainingSession`

```ts
// In TrainingSession, after `notes: string;`:
  /** Drills done in this session (optional; older sessions have none). */
  drills?: SessionDrill[];
```

```ts
export type MovementType = 'sprint' | 'hsr' | 'cod' | 'jump' | 'contact' | 'strength';

/** How a drill loads the body: typical intensity, and the share of its time in each kind of movement. */
export interface MovementProfile {
  intensity: number; // 1-10
  sprint: number; // 0-1
  hsr: number;
  cod: number;
  jump: number;
  contact: number;
  strength: number;
}

export interface SessionDrill {
  drillId: string;
  minutes: number;
}
```

- [ ] **Step 4: Create `shared/drills.ts`**

```ts
// Built-in drill library. Profiles are estimates informed by published football drill
// research, and are labelled as estimates in the app. Ids are permanent: rename a drill
// freely, but never change or reuse an id, because logged sessions store it.
import type { MovementProfile } from './types';

export type DrillCategory =
  | 'warm_up' | 'technical' | 'possession' | 'small_sided' | 'tactical' | 'finishing'
  | 'crossing' | 'speed' | 'conditioning' | 'strength' | 'goalkeeper' | 'cool_down';

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  profile: MovementProfile;
}

export const DRILL_CATEGORIES: readonly DrillCategory[] = [
  'warm_up', 'technical', 'possession', 'small_sided', 'tactical', 'finishing',
  'crossing', 'speed', 'conditioning', 'strength', 'goalkeeper', 'cool_down',
];

export const DRILL_CATEGORY_LABEL: Record<DrillCategory, string> = {
  warm_up: 'Warm-up',
  technical: 'Technical',
  possession: 'Rondos and possession',
  small_sided: 'Games',
  tactical: 'Tactical',
  finishing: 'Finishing',
  crossing: 'Crossing and heading',
  speed: 'Speed and agility',
  conditioning: 'Conditioning',
  strength: 'Strength and prevention',
  goalkeeper: 'Goalkeeper',
  cool_down: 'Cool-down',
};

const p = (intensity: number, sprint: number, hsr: number, cod: number, jump: number, contact: number, strength: number): MovementProfile => ({
  intensity, sprint, hsr, cod, jump, contact, strength,
});

export const DRILLS: readonly Drill[] = [
  { id: 'warmup_dynamic', name: 'Dynamic warm-up', category: 'warm_up', profile: p(3, 0.02, 0.05, 0.1, 0.05, 0, 0.05) },
  { id: 'fifa_11_plus', name: 'FIFA 11+ warm-up', category: 'warm_up', profile: p(4, 0.05, 0.08, 0.15, 0.15, 0, 0.25) },
  { id: 'passing_pairs', name: 'Passing in pairs', category: 'technical', profile: p(3, 0, 0.02, 0.05, 0, 0, 0) },
  { id: 'passing_pattern', name: 'Passing pattern (diamond or Y)', category: 'technical', profile: p(4, 0.02, 0.08, 0.1, 0, 0, 0) },
  { id: 'dribbling_gates', name: 'Dribbling through gates', category: 'technical', profile: p(4, 0.03, 0.05, 0.3, 0, 0, 0) },
  { id: 'first_touch', name: 'First touch and receiving', category: 'technical', profile: p(3, 0, 0.02, 0.1, 0.02, 0, 0) },
  { id: 'rondo_4v2', name: 'Rondo (4v2, 5v2)', category: 'possession', profile: p(5, 0.02, 0.04, 0.35, 0, 0.05, 0) },
  { id: 'possession_large', name: 'Possession game with neutrals', category: 'possession', profile: p(6, 0.04, 0.1, 0.25, 0.02, 0.1, 0) },
  { id: 'ssg_3v3', name: 'Small-sided game (3v3, 4v4)', category: 'small_sided', profile: p(8, 0.05, 0.08, 0.4, 0.03, 0.2, 0) },
  { id: 'ssg_5v5', name: 'Small-sided game (5v5, 6v6)', category: 'small_sided', profile: p(7, 0.06, 0.1, 0.3, 0.03, 0.15, 0) },
  { id: 'ssg_large', name: 'Large-sided game (8v8 and up)', category: 'small_sided', profile: p(7, 0.08, 0.15, 0.2, 0.03, 0.12, 0) },
  { id: 'match_11v11', name: '11v11 match play', category: 'small_sided', profile: p(8, 0.05, 0.12, 0.15, 0.04, 0.1, 0) },
  { id: 'shape_walkthrough', name: 'Team shape walk-through', category: 'tactical', profile: p(2, 0, 0.02, 0.05, 0, 0, 0) },
  { id: 'pressing_transition', name: 'Pressing and transition drill', category: 'tactical', profile: p(7, 0.1, 0.15, 0.25, 0, 0.1, 0) },
  { id: 'set_pieces', name: 'Set pieces', category: 'tactical', profile: p(3, 0.02, 0.02, 0.05, 0.2, 0.15, 0) },
  { id: 'finishing_drill', name: 'Finishing drill', category: 'finishing', profile: p(6, 0.1, 0.08, 0.15, 0.02, 0.02, 0) },
  { id: 'shooting_static', name: 'Shooting practice (static)', category: 'finishing', profile: p(3, 0, 0.02, 0.03, 0, 0, 0) },
  { id: 'crossing_finishing', name: 'Crossing and finishing', category: 'crossing', profile: p(6, 0.12, 0.12, 0.1, 0.1, 0.08, 0) },
  { id: 'heading', name: 'Heading practice', category: 'crossing', profile: p(4, 0, 0.02, 0.05, 0.35, 0.1, 0) },
  { id: 'sprints_short', name: 'Short sprints (5 to 20 m)', category: 'speed', profile: p(9, 0.25, 0.1, 0.05, 0, 0, 0) },
  { id: 'sprints_long', name: 'Long sprints (30 to 40 m)', category: 'speed', profile: p(9, 0.3, 0.15, 0, 0, 0, 0) },
  { id: 'agility_cod', name: 'Agility and change of direction', category: 'speed', profile: p(7, 0.05, 0.05, 0.45, 0.1, 0, 0) },
  { id: 'plyometrics', name: 'Plyometrics (jumps and bounds)', category: 'speed', profile: p(8, 0, 0.02, 0.05, 0.5, 0, 0.1) },
  { id: 'interval_runs', name: 'Interval runs', category: 'conditioning', profile: p(8, 0.05, 0.45, 0, 0, 0, 0) },
  { id: 'shuttle_runs', name: 'Shuttle runs or beep test', category: 'conditioning', profile: p(9, 0.1, 0.3, 0.3, 0, 0, 0) },
  { id: 'steady_run', name: 'Steady run', category: 'conditioning', profile: p(5, 0, 0.05, 0, 0, 0, 0) },
  { id: 'nordic_curls', name: 'Nordic curls', category: 'strength', profile: p(7, 0, 0, 0, 0, 0, 0.8) },
  { id: 'copenhagen_plank', name: 'Copenhagen adductor plank', category: 'strength', profile: p(6, 0, 0, 0, 0, 0, 0.7) },
  { id: 'gym_lower', name: 'Gym: lower body', category: 'strength', profile: p(7, 0, 0, 0, 0.05, 0, 0.7) },
  { id: 'core_balance', name: 'Core and balance', category: 'strength', profile: p(4, 0, 0, 0, 0, 0, 0.5) },
  { id: 'gk_diving', name: 'Goalkeeper diving and handling', category: 'goalkeeper', profile: p(6, 0, 0, 0.2, 0.3, 0.05, 0) },
  { id: 'gk_distribution', name: 'Goalkeeper distribution', category: 'goalkeeper', profile: p(3, 0, 0, 0.02, 0, 0, 0) },
  { id: 'cool_down', name: 'Cool-down and stretching', category: 'cool_down', profile: p(1, 0, 0, 0, 0, 0, 0) },
];

const BY_ID = new Map(DRILLS.map((d) => [d.id, d]));

export const DRILL_IDS: ReadonlySet<string> = new Set(BY_ID.keys());

export function drillById(id: string): Drill | undefined {
  return BY_ID.get(id);
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run tests/drills.test.ts && npx tsc -b`
Expected: 4 tests PASS and no type errors.

- [ ] **Step 6: Commit**

```bash
git add shared/types.ts shared/drills.ts tests/drills.test.ts
git commit -m "feat: built-in drill library with movement profiles"
```

---

### Task 2: Movement load math

**Files:**
- Create: `shared/movement.ts`
- Test: `tests/movement.test.ts`

**Interfaces:**
- Consumes: `drillById`, `SessionDrill`, `TrainingSession`, `MovementType`, `MovementProfile` (Task 1); `dayNumber` from `shared/dates`.
- Produces:
  - `MOVEMENT_TYPES: readonly MovementType[]`
  - `SCORED_TYPES: readonly MovementType[]`
  - `MOVEMENT_LABEL: Record<MovementType, string>`
  - `type Exposure = Record<MovementType, number>`
  - `sessionExposure(drills: readonly SessionDrill[] | undefined, lookup?: DrillLookup): Exposure`
  - `type SpikeLevel = 'NA' | 'NONE' | 'CAUTION' | 'DANGER'`
  - `spikeLevel(ratio: number | null): SpikeLevel`
  - `spikePoints(level: SpikeLevel): number`
  - `interface MovementStatus { type: MovementType; thisWeek: number; usualWeek: number; ratio: number | null; level: SpikeLevel; points: number }`
  - `interface MovementSummary { ready: boolean; types: MovementStatus[]; maxPoints: number; worst: MovementStatus | null }`
  - `movementLoad(sessions: readonly TrainingSession[], today: string, lookup?: DrillLookup): MovementSummary`
  - `type DrillLookup = (id: string) => { profile: MovementProfile } | undefined`

- [ ] **Step 1: Write the failing tests** `tests/movement.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { movementLoad, sessionExposure, spikeLevel, spikePoints } from '../shared/movement';
import { addDays } from '../shared/dates';
import type { SessionDrill, TrainingSession } from '../shared/types';

const TODAY = '2026-10-12';

function session(daysAgo: number, drills?: SessionDrill[]): TrainingSession {
  return { id: `s${daysAgo}`, date: addDays(TODAY, -daysAgo), type: 'training', duration: 90, rpe: 5, load: 450, notes: '', drills };
}

// 20 min of short sprints = 5 min sprint, 2 min high-speed, 1 min change of direction
const SPRINTS: SessionDrill[] = [{ drillId: 'sprints_short', minutes: 20 }];

describe('sessionExposure', () => {
  it('multiplies drill minutes by the profile shares', () => {
    const e = sessionExposure(SPRINTS);
    expect(e.sprint).toBeCloseTo(5);
    expect(e.hsr).toBeCloseTo(2);
    expect(e.cod).toBeCloseTo(1);
    expect(e.jump).toBe(0);
  });

  it('treats missing drills and unknown ids as no exposure', () => {
    expect(sessionExposure(undefined).sprint).toBe(0);
    expect(sessionExposure([{ drillId: 'removed_drill', minutes: 30 }]).sprint).toBe(0);
  });
});

describe('spike levels and points', () => {
  it('uses the workload-ratio thresholds', () => {
    expect(spikeLevel(null)).toBe('NA');
    expect(spikeLevel(1.3)).toBe('NONE');
    expect(spikeLevel(1.31)).toBe('CAUTION');
    expect(spikeLevel(1.5)).toBe('CAUTION');
    expect(spikeLevel(1.51)).toBe('DANGER');
    expect([spikePoints('NA'), spikePoints('NONE'), spikePoints('CAUTION'), spikePoints('DANGER')]).toEqual([0, 0, 50, 85]);
  });
});

describe('movementLoad', () => {
  it('is not ready without drills (old sessions change nothing)', () => {
    const m = movementLoad([session(1), session(8), session(15), session(22)], TODAY);
    expect(m.ready).toBe(false);
    expect(m.maxPoints).toBe(0);
    expect(m.worst).toBeNull();
  });

  it('needs drills in at least 3 of the last 4 weeks', () => {
    const m = movementLoad([session(1, SPRINTS), session(8, SPRINTS)], TODAY);
    expect(m.types.find((t) => t.type === 'sprint')?.ratio).toBeNull();
    expect(m.maxPoints).toBe(0);
  });

  it('needs at least 5 minutes in an average week', () => {
    const tiny: SessionDrill[] = [{ drillId: 'sprints_short', minutes: 4 }]; // 1 min sprint a week
    const m = movementLoad([1, 8, 15, 22].map((d) => session(d, tiny)), TODAY);
    expect(m.types.find((t) => t.type === 'sprint')?.ratio).toBeNull();
  });

  it('scores a steady week as no spike', () => {
    const m = movementLoad([1, 8, 15, 22].map((d) => session(d, SPRINTS)), TODAY);
    const sprint = m.types.find((t) => t.type === 'sprint')!;
    expect(sprint.ratio).toBe(1);
    expect(sprint.level).toBe('NONE');
    expect(m.ready).toBe(true);
    expect(m.maxPoints).toBe(0);
  });

  it('flags a sprint spike and reports it as the worst type', () => {
    const sessions = [session(1, SPRINTS), session(2, SPRINTS), session(3, SPRINTS), ...[8, 15, 22].map((d) => session(d, SPRINTS))];
    const m = movementLoad(sessions, TODAY);
    const sprint = m.types.find((t) => t.type === 'sprint')!;
    expect(sprint.thisWeek).toBe(15);
    expect(sprint.usualWeek).toBe(7.5);
    expect(sprint.ratio).toBe(2);
    expect(sprint.level).toBe('DANGER');
    expect(m.maxPoints).toBe(85);
    expect(m.worst?.type).toBe('sprint');
  });

  it('never scores strength work', () => {
    const gym: SessionDrill[] = [{ drillId: 'nordic_curls', minutes: 30 }];
    const sessions = [session(1, gym), session(2, gym), session(3, gym), ...[8, 15, 22].map((d) => session(d, gym))];
    const m = movementLoad(sessions, TODAY);
    expect(m.types.find((t) => t.type === 'strength')?.level).toBe('DANGER');
    expect(m.maxPoints).toBe(0);
  });

  it('ignores future-dated and older-than-28-day sessions', () => {
    const m = movementLoad([session(-2, SPRINTS), session(30, SPRINTS), session(1, SPRINTS)], TODAY);
    expect(m.types.find((t) => t.type === 'sprint')?.thisWeek).toBe(5);
    expect(m.types.find((t) => t.type === 'sprint')?.usualWeek).toBe(1.3);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/movement.test.ts`
Expected: FAIL, "Cannot find module '../shared/movement'".

- [ ] **Step 3: Create `shared/movement.ts`**

```ts
// Movement load: what kind of work a player did, from the drills on their sessions.
// Mirrors the workload ratio: this week's exposure against the average week over the
// last 28 days. Only judged once there is enough drill history (see the spec).
import { dayNumber } from './dates';
import { drillById } from './drills';
import type { MovementProfile, MovementType, SessionDrill, TrainingSession } from './types';

export const MOVEMENT_TYPES: readonly MovementType[] = ['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'];
/** Types whose spikes count toward risk. Strength work is shown but never scored. */
export const SCORED_TYPES: readonly MovementType[] = ['sprint', 'hsr', 'cod', 'jump', 'contact'];

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  sprint: 'Sprinting',
  hsr: 'High-speed running',
  cod: 'Change of direction',
  jump: 'Jumping and landing',
  contact: 'Contact and duels',
  strength: 'Strength work',
};

const WINDOW_DAYS = 28;
const WEEKS = 4;
const MIN_WEEKS_WITH_DRILLS = 3;
const MIN_USUAL_MINUTES = 5;

export type Exposure = Record<MovementType, number>;
export type DrillLookup = (id: string) => { profile: MovementProfile } | undefined;
export type SpikeLevel = 'NA' | 'NONE' | 'CAUTION' | 'DANGER';

export interface MovementStatus {
  type: MovementType;
  thisWeek: number; // minutes, one decimal
  usualWeek: number; // minutes, one decimal
  ratio: number | null; // two decimals; null until there is a baseline
  level: SpikeLevel;
  points: number;
}

export interface MovementSummary {
  ready: boolean;
  types: MovementStatus[];
  maxPoints: number;
  worst: MovementStatus | null;
}

const empty = (): Exposure => ({ sprint: 0, hsr: 0, cod: 0, jump: 0, contact: 0, strength: 0 });
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

export function sessionExposure(drills: readonly SessionDrill[] | undefined, lookup: DrillLookup = drillById): Exposure {
  const out = empty();
  for (const d of drills ?? []) {
    const drill = lookup(d.drillId);
    if (!drill) continue; // a drill removed from the library no longer counts
    for (const t of MOVEMENT_TYPES) out[t] += d.minutes * drill.profile[t];
  }
  return out;
}

export function spikeLevel(ratio: number | null): SpikeLevel {
  if (ratio === null) return 'NA';
  if (ratio <= 1.3) return 'NONE';
  if (ratio <= 1.5) return 'CAUTION';
  return 'DANGER';
}

export function spikePoints(level: SpikeLevel): number {
  return { NA: 0, NONE: 0, CAUTION: 50, DANGER: 85 }[level];
}

export function movementLoad(sessions: readonly TrainingSession[], today: string, lookup: DrillLookup = drillById): MovementSummary {
  const end = dayNumber(today);
  const acute = empty();
  const window = empty();
  const weeksWithDrills = new Set<number>();

  for (const s of sessions) {
    if (!s.drills?.length) continue;
    const age = end - dayNumber(s.date);
    if (age < 0 || age >= WINDOW_DAYS) continue;
    weeksWithDrills.add(Math.floor(age / 7));
    const e = sessionExposure(s.drills, lookup);
    for (const t of MOVEMENT_TYPES) {
      window[t] += e[t];
      if (age < 7) acute[t] += e[t];
    }
  }

  const enoughWeeks = weeksWithDrills.size >= MIN_WEEKS_WITH_DRILLS;
  const types: MovementStatus[] = MOVEMENT_TYPES.map((type) => {
    const usual = window[type] / WEEKS;
    const ratio = enoughWeeks && usual >= MIN_USUAL_MINUTES ? round(acute[type] / usual, 2) : null;
    const level = spikeLevel(ratio);
    return { type, thisWeek: round(acute[type], 1), usualWeek: round(usual, 1), ratio, level, points: SCORED_TYPES.includes(type) ? spikePoints(level) : 0 };
  });

  const worst = types.reduce<MovementStatus | null>((w, t) => (t.points > (w?.points ?? 0) ? t : w), null);
  return { ready: types.some((t) => t.ratio !== null), types, maxPoints: worst?.points ?? 0, worst };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/movement.test.ts`
Expected: all PASS. In the last test only the 1-day-old session is inside the window, because the future-dated and 30-day-old sessions are skipped. So `thisWeek` is 5 and `usualWeek` is 5 / 4 = 1.25, which rounds to 1.3.

- [ ] **Step 5: Commit**

```bash
git add shared/movement.ts tests/movement.test.ts
git commit -m "feat: movement load ratios from logged drills"
```

---

### Task 3: Risk model and advice use movement load

**Files:**
- Modify: `shared/risk-model.ts`, `shared/recommendations.ts`
- Test: `tests/risk-model.test.ts`, `tests/recommendations.test.ts`

**Interfaces:**
- Consumes: `movementLoad`, `MovementSummary`, `MOVEMENT_LABEL`, `SpikeLevel` (Task 2).
- Produces:
  - `RiskModel.movement: MovementSummary`
  - `RecommendationInput.movementSpike?: { type: MovementType; level: 'CAUTION' | 'DANGER' } | null`

- [ ] **Step 1: Write the failing tests.** Append to `tests/risk-model.test.ts`:

```ts
describe('movement load in the risk model', () => {
  const recovery = [checkIn('2026-10-12', 8)];

  it('has no movement points when no drills are logged', () => {
    const plain = buildRiskModel({ profile, sessions: evenWeeks(), recovery, injuries: [] }, TODAY);
    expect(plain.movement.ready).toBe(false);
    expect(plain.movement.maxPoints).toBe(0);
    expect(plain.acwrZone).toBe('SWEET_SPOT');
  });

  it('raises the training input to the movement-spike points when they are higher', () => {
    // Same sessions and total load (workload ratio 1). Only the drills differ: 60 min of
    // long sprints this week (18 min sprinting) against 20 min of short sprints before (5 min).
    const thisWeek = addDays(TODAY, -6);
    const sessions = evenWeeks().map((s) => ({
      ...s,
      drills: s.date === thisWeek ? [{ drillId: 'sprints_long', minutes: 60 }] : [{ drillId: 'sprints_short', minutes: 20 }],
    }));
    const calm = buildRiskModel({ profile, sessions: evenWeeks(), recovery, injuries: [] }, TODAY);
    const spiky = buildRiskModel({ profile, sessions, recovery, injuries: [] }, TODAY);
    expect(spiky.acwr).toBe(1);
    expect(spiky.movement.worst?.type).toBe('sprint');
    expect(spiky.movement.maxPoints).toBe(85);
    expect(spiky.composite!.score).toBeGreaterThan(calm.composite!.score);
    expect(spiky.recommendations.some((r) => r.text.includes('hamstring'))).toBe(true);
  });
});
```

Append to `tests/recommendations.test.ts`:

```ts
describe('movement spike advice', () => {
  const base = { acwrZone: 'SWEET_SPOT' as const, recoveryZone: 'GOOD' as const, equipmentRisk: 'LOW' as const, position: null, injuryFactors: [] };

  it('gives hamstring advice for a sprint spike, ranked as urgent load advice', () => {
    const recs = recommendations({ ...base, movementSpike: { type: 'sprint', level: 'DANGER' } });
    const advice = recs.find((r) => r.text.includes('hamstring'));
    expect(advice).toMatchObject({ category: 'Training load', priority: 1, citation: 'Duhig et al., 2016' });
  });

  it('gives knee and ankle advice for a change-of-direction caution', () => {
    const recs = recommendations({ ...base, movementSpike: { type: 'cod', level: 'CAUTION' } });
    expect(recs.find((r) => r.text.includes('knees and ankles'))).toMatchObject({ priority: 2 });
  });

  it('adds nothing without a spike', () => {
    expect(recommendations({ ...base, movementSpike: null })).toEqual(recommendations(base));
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/risk-model.test.ts tests/recommendations.test.ts`
Expected: FAIL, because `movement` is undefined on the model and there is no hamstring advice.

- [ ] **Step 3: Add movement advice** in `shared/recommendations.ts`

Add the import `import type { MovementType } from './types';` to the type import line (it already imports from `./types`). Then add `movementSpike` to `RecommendationInput`:

```ts
  /** Highest scored movement spike this week, if any. */
  movementSpike?: { type: MovementType; level: 'CAUTION' | 'DANGER' } | null;
```

Add after `historyAdvice`:

```ts
function movementAdvice(spike: RecommendationInput['movementSpike']): Recommendation | null {
  if (!spike) return null;
  const danger = spike.level === 'DANGER';
  const priority = danger ? 1 : 2;
  switch (spike.type) {
    case 'sprint':
    case 'hsr':
      return danger
        ? { priority, category: 'Training load', text: 'Your sprinting and high-speed running this week are well above your usual. Ease off max-speed work for a few days and keep Nordic curls in your week to protect your hamstrings.', citation: 'Duhig et al., 2016' }
        : { priority, category: 'Training load', text: 'Your sprinting is climbing above your usual. Hold it steady this week rather than adding more max-speed work, to spare your hamstrings.', citation: 'Duhig et al., 2016' };
    case 'cod':
      return { priority, category: 'Training load', text: danger ? 'Much more cutting and turning than usual this week. Keep small-sided games shorter and warm up with side-to-side movement to protect your knees and ankles.' : 'More cutting and turning than usual. Warm up with side-to-side movement to protect your knees and ankles.', citation: 'Gabbett, 2016' };
    case 'jump':
      return { priority, category: 'Training load', text: danger ? 'A lot more jumping and landing than usual. Cut back on jump work for a few days to spare your knee tendons.' : 'More jumping and landing than usual. Land softly and keep jump work steady this week.', citation: 'Gabbett, 2016' };
    case 'contact':
      return { priority, category: 'Training load', text: danger ? 'Far more contact and duels than usual this week. Expect knocks, and give bruises a day or two before full-contact work.' : 'More contact than usual this week. Look after any knocks before your next full-contact session.', citation: 'Gabbett, 2016' };
    case 'strength':
      return null;
  }
}
```

In `recommendations()`, add `movementAdvice(input.movementSpike ?? null),` to the list, after `loadAdvice(input.acwrZone),`.

- [ ] **Step 4: Use movement load in `shared/risk-model.ts`**

Add the import `import { movementLoad, type MovementSummary } from './movement';`. Add `movement: MovementSummary;` to `RiskModel` after `days`. Then, in `buildRiskModel`, after `const zone = acwrZone(acwr);`:

```ts
  const movement = movementLoad(sessions, today);
```

Inside the composite IIFE, replace `acwrRisk: acwrRiskScore(zone),` with:

```ts
            // Training input: the worse of the workload ratio and the biggest movement spike
            acwrRisk: Math.max(acwrRiskScore(zone), movement.maxPoints),
```

Add `movement,` to the returned object after `days: …`. Add to the `recommendations({...})` call:

```ts
      movementSpike: movement.worst && (movement.worst.level === 'CAUTION' || movement.worst.level === 'DANGER') ? { type: movement.worst.type, level: movement.worst.level } : null,
```

- [ ] **Step 5: Run the whole unit suite**

Run: `npx vitest run && npx tsc -b`
Expected: everything PASSES (existing tests unchanged, because no fixture has drills).

- [ ] **Step 6: Commit**

```bash
git add shared/risk-model.ts shared/recommendations.ts tests/risk-model.test.ts tests/recommendations.test.ts
git commit -m "feat: movement spikes feed the training input and advice"
```

---

### Task 4: Validate drills on sessions

**Files:**
- Modify: `shared/validation.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Consumes: `DRILL_IDS`, `SessionDrill`.
- Produces:
  - `SessionInput.drills?: SessionDrill[]` (`validateSession` always returns an array)
  - `MAX_DRILLS_PER_SESSION = 12`

- [ ] **Step 1: Update and add the failing tests** in `tests/validation.test.ts`

Change the existing expectation in 'accepts a valid session and coerces numbers' to include `drills: []`:

```ts
    expect(validateSession(ok, TODAY)).toEqual({ date: '2026-10-11', type: 'match', duration: 90, rpe: 7, notes: 'felt fine', drills: [] });
```

Add:

```ts
describe('validateSession drills', () => {
  const ok = { date: '2026-10-11', type: 'training', duration: 90, rpe: 6 };

  it('accepts built-in drills and coerces minutes', () => {
    const s = validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: '15' }, { drillId: 'ssg_5v5', minutes: 30 }] }, TODAY);
    expect(s.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }, { drillId: 'ssg_5v5', minutes: 30 }]);
  });

  it('rejects unknown drills', () => {
    expect(() => validateSession({ ...ok, drills: [{ drillId: 'made_up', minutes: 10 }] }, TODAY)).toThrow(/from the list/);
  });

  it('rejects drill minutes that add up to more than the session', () => {
    expect(() => validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: 60 }, { drillId: 'ssg_5v5', minutes: 31 }] }, TODAY)).toThrow(/more than the session/);
  });

  it('rejects the same drill twice, too many drills, and non-lists', () => {
    expect(() => validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: 5 }, { drillId: 'rondo_4v2', minutes: 5 }] }, TODAY)).toThrow(/once/);
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ drillId: ['rondo_4v2', 'ssg_5v5', 'passing_pairs', 'heading', 'set_pieces', 'cool_down', 'steady_run', 'core_balance', 'nordic_curls', 'first_touch', 'finishing_drill', 'warmup_dynamic', 'sprints_short'][i], minutes: 1 }));
    expect(() => validateSession({ ...ok, drills: thirteen }, TODAY)).toThrow(/12/);
    expect(() => validateSession({ ...ok, drills: 'rondo' }, TODAY)).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/validation.test.ts`
Expected: FAIL. `drills` is missing from the output and nothing is rejected.

- [ ] **Step 3: Implement** in `shared/validation.ts`

Add the imports `import { DRILL_IDS } from './drills';` and `SessionDrill` to the type import from `./types`. Add `drills?: SessionDrill[];` to `SessionInput`. Then add above `validateSession`:

```ts
export const MAX_DRILLS_PER_SESSION = 12;

function drills(value: unknown, sessionMinutes: number): SessionDrill[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('Drills must be a list.', 'drills');
  if (value.length > MAX_DRILLS_PER_SESSION) throw new ValidationError(`Add up to ${MAX_DRILLS_PER_SESSION} drills per session.`, 'drills');
  const seen = new Set<string>();
  const out = value.map((item) => {
    const r = asObject(item);
    const drillId = typeof r.drillId === 'string' ? r.drillId : '';
    if (!DRILL_IDS.has(drillId)) throw new ValidationError('Choose drills from the list.', 'drills');
    if (seen.has(drillId)) throw new ValidationError('Add each drill once, with its total minutes.', 'drills');
    seen.add(drillId);
    return { drillId, minutes: integer(r.minutes, 1, 300, 'drills', 'Drill minutes') };
  });
  const total = out.reduce((sum, d) => sum + d.minutes, 0);
  if (total > sessionMinutes) throw new ValidationError(`Drill minutes add up to ${total}, more than the session's ${sessionMinutes}.`, 'drills');
  return out;
}
```

Replace the body of `validateSession` with:

```ts
  const r = asObject(raw);
  const duration = integer(r.duration, 1, 300, 'duration', 'Duration');
  return {
    date: date(r.date, 'date', 'Session date', today),
    type: oneOf(r.type, SESSION_TYPES, 'type', 'session type'),
    duration,
    rpe: integer(r.rpe, 1, 10, 'rpe', 'Effort'),
    notes: text(r.notes, 500, 'notes', 'Notes'),
    drills: drills(r.drills, duration),
  };
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/validation.ts tests/validation.test.ts
git commit -m "feat: validate drills on logged sessions"
```

---

### Task 5: Database table, repository and API

**Files:**
- Create: `db/migrations/0002_session_drills.sql`
- Modify: `worker/repo.ts`, `tests/api.test.ts`, `tests/db/rls.test.ts`, `tests/db/api-flow.test.ts`

**Interfaces:**
- Consumes: `SessionInput.drills`, `SessionDrill`.
- Produces:
  - `PlayerRepo.addSession` stores drills and returns them.
  - `overview()` and `exportAll()` return `drills` on every session (`[]` when none).
  - `POST /api/sessions` accepts `drills`.

- [ ] **Step 1: Write the failing API test.** In `tests/api.test.ts`, change the memory repo's `addSession` to keep drills:

```ts
        const s: TrainingSession = { id: uuid(), ...input, drills: input.drills ?? [], load: input.duration * input.rpe };
```

Then add these tests inside `describe('sessions', …)` (around line 187). The file's helpers are `call(method, path, { token?, body? })` and `onboard(token?)`:

```ts
  it('stores drills with a session and returns them in the overview', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { date: TODAY, type: 'training', duration: 90, rpe: 6, drills: [{ drillId: 'rondo_4v2', minutes: 15 }] } });
    expect(res.status).toBe(201);
    expect((await res.json()).drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }]);
    const overview = await (await call('GET', '/overview')).json();
    expect(overview.sessions[0].drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }]);
  });

  it('rejects drills that do not fit the session', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { date: TODAY, type: 'training', duration: 20, rpe: 6, drills: [{ drillId: 'rondo_4v2', minutes: 30 }] } });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('drills');
  });
```

- [ ] **Step 2: Run them**

Run: `npx vitest run tests/api.test.ts`
Expected: the new tests PASS straight away, because the route uses `validateSession`. That confirms the API layer. The real storage is tested against Neon below.

- [ ] **Step 3: Write the migration** `db/migrations/0002_session_drills.sql`

```sql
-- Drills done in a training session. Built-in drill ids come from shared/drills.ts.
-- The composite foreign key ties every row to a session owned by the same player,
-- so a player can never attach drills to someone else's session.

alter table public.training_sessions
  add constraint training_sessions_id_user_key unique (id, user_id);

create table public.session_drills (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.current_player_id()
                references public.profiles (user_id) on delete cascade,
  session_id  uuid not null,
  drill_id    text not null check (drill_id ~ '^[a-z0-9_]{2,40}$'),
  minutes     smallint not null check (minutes between 1 and 300),
  created_at  timestamptz not null default now(),
  foreign key (session_id, user_id) references public.training_sessions (id, user_id) on delete cascade,
  unique (session_id, drill_id)
);

create index session_drills_user_session_idx on public.session_drills (user_id, session_id);

create trigger session_drills_row_cap before insert on public.session_drills
  for each row execute function public.enforce_row_cap('20000');

revoke all on public.session_drills from public;
grant select, delete on public.session_drills to pitchsafe_app;
grant insert (session_id, drill_id, minutes) on public.session_drills to pitchsafe_app;

alter table public.session_drills enable row level security;

create policy session_drills_owner on public.session_drills
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);
```

- [ ] **Step 4: Write the failing database tests**

In `tests/db/rls.test.ts`, inside the `run(...)` block, add:

```ts
  it('stores drills with a session and keeps them per player', async () => {
    const s = await a.addSession({ date: today, type: 'training', duration: 60, rpe: 6, notes: '', drills: [{ drillId: 'rondo_4v2', minutes: 20 }] });
    expect(s.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 20 }]);
    const own = (await a.overview()).sessions.find((x) => x.id === s.id);
    expect(own?.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 20 }]);
    const theirs = await asPlayer(url!, B, (q) => q('select id from public.session_drills'));
    expect(theirs).toHaveLength(0);
  });

  it("cannot attach drills to another player's session", async () => {
    await expect(
      asPlayer(url!, B, (q) => q("insert into public.session_drills (session_id, drill_id, minutes) values ($1, 'rondo_4v2', 10)", [aSessionId])),
    ).rejects.toMatchObject({ code: '23503' });
  });
```

In `tests/db/api-flow.test.ts`, change the first session POST in 'logs sessions with the load worked out by the database' to send drills, and assert them:

```ts
    const res = await call(A, 'POST', '/sessions', { date: today, type: 'training', duration: 60, rpe: 7, notes: '', drills: [{ drillId: 'ssg_5v5', minutes: 25 }] });
    expect(res.status).toBe(201);
    const session = await res.json();
    expect(session).toMatchObject({ date: today, load: 420, drills: [{ drillId: 'ssg_5v5', minutes: 25 }] });
```

- [ ] **Step 5: Apply the migration to the test and dev branches and watch the tests fail**

```bash
DATABASE_URL="$(tr -d '\r\n' < .secrets/neon-test.url)" npm run db:migrate
DATABASE_URL="$(tr -d '\r\n' < .secrets/neon-dev.url)" npm run db:migrate
DATABASE_URL_TEST="$(tr -d '\r\n' < .secrets/neon-test.url)" npx vitest run --config vitest.db.config.ts tests/db/rls.test.ts
```

Expected: the two new RLS tests FAIL, because `addSession` ignores drills and `drills` is undefined.

- [ ] **Step 6: Implement in `worker/repo.ts`**

Add `SessionDrill` to the type import from `../shared/types`. Change `toSession` to take drills:

```ts
const toSession = (r: Row, drills: SessionDrill[] = []): TrainingSession => ({
  id: r.id as string,
  date: r.session_date as string,
  type: r.session_type as TrainingSession['type'],
  duration: Number(r.duration_min),
  rpe: Number(r.rpe),
  load: Number(r.load),
  notes: (r.notes as string) ?? '',
  drills,
});
```

In `readAll`, replace the `sessions` mapping with a drills lookup:

```ts
    const sessionIds = sessions.map((r) => r.id as string);
    const drillRows = sessionIds.length
      ? await q('select session_id, drill_id, minutes from public.session_drills where user_id = $1 and session_id = any($2::uuid[]) order by created_at', [userId, sessionIds])
      : [];
    const drillsBySession = new Map<string, SessionDrill[]>();
    for (const d of drillRows) {
      const list = drillsBySession.get(d.session_id as string) ?? [];
      list.push({ drillId: d.drill_id as string, minutes: Number(d.minutes) });
      drillsBySession.set(d.session_id as string, list);
    }
```

and return `sessions: sessions.map((r) => toSession(r, drillsBySession.get(r.id as string) ?? [])),`.

Replace `addSession` with:

```ts
    addSession: (input) =>
      run(async (q) => {
        const session = one(
          await q(
            `insert into public.training_sessions (session_date, session_type, duration_min, rpe, notes)
             values ($1, $2, $3, $4, $5) returning ${SESSION_COLUMNS}`,
            [input.date, input.type, input.duration, input.rpe, input.notes],
          ),
          (r) => r,
        );
        const drills = input.drills ?? [];
        if (drills.length > 0) {
          await q(
            `insert into public.session_drills (session_id, drill_id, minutes)
             select $1, d.drill_id, d.minutes from unnest($2::text[], $3::int[]) as d(drill_id, minutes)`,
            [session.id, drills.map((d) => d.drillId), drills.map((d) => d.minutes)],
          );
        }
        return toSession(session, drills);
      }),
```

- [ ] **Step 7: Run all tests, including the database suites**

```bash
npx vitest run && npx tsc -b
DATABASE_URL_TEST="$(tr -d '\r\n' < .secrets/neon-test.url)" npx vitest run --config vitest.db.config.ts tests/db/rls.test.ts
DATABASE_URL_TEST_WORKER="$(tr -d '\r\n' < .secrets/neon-dev-worker.url)" npx vitest run --config vitest.db.config.ts tests/db/api-flow.test.ts
```

Expected: all PASS (the RLS suite now has 11 tests, the journey 12).

- [ ] **Step 8: Commit**

```bash
git add db/migrations/0002_session_drills.sql worker/repo.ts tests/api.test.ts tests/db/rls.test.ts tests/db/api-flow.test.ts
git commit -m "feat: store drills with sessions (table, RLS, repo, API)"
```

---

### Task 6: Demo player logs drills

**Files:**
- Modify: `src/lib/sample-data.ts`
- Test: `tests/risk-model.test.ts` (append)

**Interfaces:**
- Consumes: `SessionDrill`, `buildRiskModel`.
- Produces: `sampleOverview(today)` sessions carry `drills`, with a sprint spike in the current week.

- [ ] **Step 1: Write the failing test.** Append to `tests/risk-model.test.ts`:

```ts
import { sampleOverview } from '../src/lib/sample-data';

describe('sample player', () => {
  it('has drills with a movement baseline and rising sprinting on every weekday', () => {
    for (let d = 0; d < 7; d++) {
      const day = addDays(TODAY, d);
      const model = buildRiskModel(sampleOverview(day), day);
      expect(model.movement.ready).toBe(true);
      expect(['CAUTION', 'DANGER']).toContain(model.movement.types.find((t) => t.type === 'sprint')?.level);
    }
  });
});
```

If the test cannot import `@shared/*` from `src/lib/sample-data.ts`, check that `vitest.config.ts` defines the `@shared` alias. If it does not, add `resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)), '@': fileURLToPath(new URL('./src', import.meta.url)) } }`, matching `vite.config.ts`.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/risk-model.test.ts`
Expected: FAIL, `movement.ready` is false. After Step 3, if a weekday lands below 1.3×, raise the current-week long sprints (for example to 30 minutes) until the test passes for all seven days. The demo must show a sprint warning whatever day it is opened.

- [ ] **Step 3: Implement** in `src/lib/sample-data.ts`

Add drills to the weekly template, and scale them with the week:

```ts
import type { Injury, RecoveryLog, SessionDrill, TrainingSession } from '@shared/types';

const WEEK: { offset: number; type: TrainingSession['type']; duration: number; rpe: number; drills: SessionDrill[] }[] = [
  { offset: 0, type: 'training', duration: 75, rpe: 6, drills: [{ drillId: 'warmup_dynamic', minutes: 10 }, { drillId: 'rondo_4v2', minutes: 15 }, { drillId: 'ssg_5v5', minutes: 25 }, { drillId: 'finishing_drill', minutes: 15 }] },
  { offset: 2, type: 'training', duration: 90, rpe: 5, drills: [{ drillId: 'fifa_11_plus', minutes: 15 }, { drillId: 'passing_pattern', minutes: 20 }, { drillId: 'possession_large', minutes: 25 }, { drillId: 'sprints_short', minutes: 10 }] },
  { offset: 3, type: 'gym', duration: 45, rpe: 6, drills: [{ drillId: 'gym_lower', minutes: 30 }, { drillId: 'nordic_curls', minutes: 10 }] },
  { offset: 5, type: 'match', duration: 90, rpe: 8, drills: [{ drillId: 'match_11v11', minutes: 90 }] },
];
```

In the session map, add drills scaled by the week (floored, so they never exceed the scaled duration). In the current week (`week === 5`), add 25 minutes of long sprints to the Monday session:

```ts
      const drills = s.drills.map((d) => ({ drillId: d.drillId, minutes: Math.max(1, Math.floor(d.minutes * scale)) }));
      if (week === 5 && s.offset === 0) drills.push({ drillId: 'sprints_long', minutes: 25 });
      return { id: …, date, type: s.type, duration: Math.max(duration, drills.reduce((n, d) => n + d.minutes, 0)), rpe: s.rpe, load: …, notes: …, drills };
```

Keep `load` as `duration * s.rpe`, using the final duration value.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sample-data.ts tests/risk-model.test.ts vitest.config.ts
git commit -m "feat: demo player logs drills with a sprint spike"
```

---

### Task 7: Drill picker on Log session

**Files:**
- Create: `src/app/drill-picker.tsx`
- Modify: `src/app/log.tsx`

**Interfaces:**
- Consumes: `DRILLS`, `DRILL_CATEGORIES`, `DRILL_CATEGORY_LABEL`, `drillById`, `MAX_DRILLS_PER_SESSION`, `SessionDrill`, and the `Field`, `inputClass` and `Button` components.
- Produces: `<DrillPicker value onChange sessionMinutes error />`

- [ ] **Step 1: Create `src/app/drill-picker.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire it into `src/app/log.tsx`**

- Add `'drills'` to the `Errors` keys: `Partial<Record<'date' | 'duration' | 'rpe' | 'notes' | 'drills' | 'form', string>>`.
- Add the state `const [drills, setDrills] = useState<SessionDrill[]>([]);`, the imports `import { DrillPicker } from './drill-picker';` and `import { drillById } from '@shared/drills';`, and `SessionDrill` in the type import from `@shared/types`.
- In `onSubmit`, pass drills to validation: `validateSession({ date, type, duration, rpe, notes, drills }, today)`. Where the existing catch maps `ValidationError.field` to `errors`, `'drills'` now maps to the drill picker's error automatically, because it uses the same `field` key.
- After a successful save, where the other fields reset, add `setDrills([]);`.
- Render `<DrillPicker value={drills} onChange={setDrills} sessionMinutes={Number.isInteger(minutes) && minutes > 0 ? minutes : null} error={errors.drills} />` after the Notes field and before the submit button.
- In "Recent sessions", under the `{s.duration} min × {s.rpe}` line, add:

```tsx
                      {s.drills && s.drills.length > 0 && (
                        <p className="text-label text-ink-3">{s.drills.map((d) => `${drillById(d.drillId)?.name ?? 'Removed drill'} ${d.minutes}′`).join(', ')}</p>
                      )}
```

- [ ] **Step 3: Typecheck, run the tests, and check it in the browser**

Run: `npx tsc -b && npx vitest run`
Then, with `npx vite --port 5173`, open `http://localhost:5173/demo/log` at 390 px and 1440 px.
- Add two drills and save. The toast appears, and Recent sessions shows the drill names.
- Set the minutes to 20, add a 30-minute drill and save. The error "Drill minutes add up to 30, more than the session's 20." shows under the picker, and nothing is saved.
- Check that there are no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/drill-picker.tsx src/app/log.tsx
git commit -m "feat: drill picker on log session"
```

---

### Task 8: "Movement this week" dashboard panel

**Files:**
- Create: `src/app/movement-panel.tsx`
- Modify: `src/app/dashboard.tsx`

**Interfaces:**
- Consumes: `RiskModel.movement`, `MOVEMENT_LABEL`, `MovementStatus`, `RiskChip`, `Tone`.
- Produces: `<MovementPanel movement={model.movement} />`, which renders nothing until `movement.ready`.

- [ ] **Step 1: Create `src/app/movement-panel.tsx`**

```tsx
// Paired bars per movement type: this week against the player's usual week. Two series
// with a legend; values are printed beside the bars, and a table serves screen readers.
import { MOVEMENT_LABEL, type MovementStatus, type MovementSummary } from '@shared/movement';
import { RiskChip } from '@/components/risk-chip';
import type { Tone } from '@/lib/labels';

const LEVEL_CHIP: Partial<Record<MovementStatus['level'], { tone: Tone; text: string }>> = {
  CAUTION: { tone: 'high', text: 'Rising' },
  DANGER: { tone: 'very-high', text: 'Spike' },
};

export function MovementPanel({ movement }: { movement: MovementSummary }) {
  if (!movement.ready) return null;
  const rows = movement.types.filter((t) => t.usualWeek > 0 || t.thisWeek > 0);
  const max = Math.max(1, ...rows.flatMap((t) => [t.thisWeek, t.usualWeek]));

  return (
    <section aria-labelledby="movement-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
      <h2 id="movement-title" className="text-lead font-semibold text-ink">
        Movement this week
      </h2>
      <p className="mt-1 text-body text-ink-2">Minutes of each kind of movement from your drills, against your usual week. Drill profiles are estimates.</p>

      <div className="mt-4 flex gap-5 text-label text-ink-2" aria-hidden>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-past" />Usual week</span>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-now" />This week</span>
      </div>

      <ul className="mt-4 grid gap-4" aria-hidden>
        {rows.map((t) => {
          const chip = LEVEL_CHIP[t.level];
          return (
            <li key={t.type}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-small font-semibold text-ink">{MOVEMENT_LABEL[t.type]}</span>
                <span className="flex items-center gap-2">
                  {chip && <RiskChip tone={chip.tone}>{chip.text}</RiskChip>}
                  <span className="tnum text-label text-ink-2">
                    {t.thisWeek} min · usual {t.usualWeek}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 grid gap-[2px]">
                <div className="h-2 bg-chart-past" style={{ width: `${(t.usualWeek / max) * 100}%` }} />
                <div className="h-2 bg-chart-now" style={{ width: `${(t.thisWeek / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <table className="sr-only">
        <caption>Movement this week against your usual week, in minutes</caption>
        <thead>
          <tr><th scope="col">Movement</th><th scope="col">This week</th><th scope="col">Usual week</th><th scope="col">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.type}>
              <th scope="row">{MOVEMENT_LABEL[t.type]}</th>
              <td>{t.thisWeek}</td>
              <td>{t.usualWeek}</td>
              <td>{LEVEL_CHIP[t.level]?.text ?? (t.ratio === null ? 'Not enough data yet' : 'Normal')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Render it in `src/app/dashboard.tsx`**

Import `import { MovementPanel } from './movement-panel';` and render `<MovementPanel movement={model.movement} />` directly after the training-load section (the `<section aria-labelledby="load-title" …>` block), as its next sibling.

- [ ] **Step 3: Typecheck and check it in the browser**

Run: `npx tsc -b && npx vitest run`
Open `http://localhost:5173/demo` at 390 px and 1440 px, in light and dark.
- The panel shows rows, and Sprinting shows a "Spike" chip.
- The "What to do now" list includes the hamstring advice.
- Run the dataviz validator on the two bar colours: `node <dataviz skill>/scripts/validate_palette.js "<chart-past hex>,<chart-now hex>" --mode light`, then repeat with `--mode dark`. Use the existing token values; they already passed for the load chart.
- Check there are no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/movement-panel.tsx src/app/dashboard.tsx
git commit -m "feat: movement this week panel on the dashboard"
```

---

### Task 9: Science page section and source

**Files:**
- Modify: `src/pages/science.tsx`

- [ ] **Step 1: Add the section**

Add `{ id: 'movement', title: 'Movement load' },` to `SECTIONS` after the `load` entry. Add this to `SOURCES`, after the Gabbett line:

```ts
  'Duhig, S., Shield, A.J., Opar, D., Gabbett, T.J., Ferguson, C. & Williams, M. (2016). Effect of high-speed running on hamstring strain injury risk. British Journal of Sports Medicine, 50(24), 1536-1540.',
```

Insert after the closing `</Section>` of `id="load"`:

```tsx
          <Section id="movement" title="Movement load">
            <p>If you add drills to a session, PitchSafe also tracks what kind of work you did. Each drill has an estimated profile: how much of its time is sprinting, high-speed running, change of direction, jumping and landing, contact, and strength work.</p>
            <p className="mt-3">For each kind of movement, your minutes over the last 7 days are compared with your average week over the last 28 days, the same way as the workload ratio. A kind of movement is only judged once you have logged drills in at least 3 of the last 4 weeks, with at least 5 minutes of it in an average week.</p>
            <Table
              caption="Movement load zones"
              head={['This week against your usual', 'Zone', 'Risk points']}
              rows={[
                ['Up to 1.3×', 'Normal', 0],
                ['Above 1.3× to 1.5×', 'Rising', 50],
                ['Above 1.5×', 'Spike', 85],
              ]}
            />
            <p className="mt-3">The training part of your score uses whichever is higher: your workload-ratio points or your biggest movement spike. Strength work is shown but never scored. Spikes in sprinting and high-speed running are linked to hamstring strains (Duhig et al., 2016).</p>
            <p className="mt-3 text-ink-2">Limits: drill profiles are estimates, and the minutes are what you enter.</p>
          </Section>
```

Match the paragraph classes used inside the existing `load` Section. Read that block first and copy its `<p>` class names, so the new section matches.

- [ ] **Step 2: Check it**

Run: `npx tsc -b`, then open `http://localhost:5173/science`. The new section appears in the side index and the content, and the table matches the others.

- [ ] **Step 3: Commit**

```bash
git add src/pages/science.tsx
git commit -m "docs: explain movement load on the science page"
```

---

### Task 10: Ship: production migration, reviews, PR, deploy

**Files:** none new.

- [ ] **Step 1: Full verification**

```bash
npx tsc -b && npx vitest run
DATABASE_URL_TEST="$(tr -d '\r\n' < .secrets/neon-test.url)" npx vitest run --config vitest.db.config.ts tests/db/rls.test.ts
DATABASE_URL_TEST_WORKER="$(tr -d '\r\n' < .secrets/neon-dev-worker.url)" npx vitest run --config vitest.db.config.ts tests/db/api-flow.test.ts
```

Expected: all PASS. Take screenshots of `/demo`, `/demo/log` and `/science` at 390 and 1440, and check there are no console errors.

- [ ] **Step 2: Reviews (background, Sonnet)**

Run the `database-reviewer` on `db/migrations/0002_session_drills.sql` and `worker/repo.ts`, and the `react-reviewer` on `src/app/drill-picker.tsx`, `src/app/movement-panel.tsx` and `src/app/log.tsx`. Fix the clear findings and list anything that needs the owner.

- [ ] **Step 3: Apply the migration to production before merging.** The table is new, so old code keeps working against it.

```bash
DATABASE_URL="$(tr -d '\r\n' < .secrets/neon-main.url)" npm run db:migrate
```

Expected: `applied 0002_session_drills.sql`.

- [ ] **Step 4: Push and open the PR into `main`** (no attribution), then wait for the check to pass and merge. The merge deploys through CI. Confirm the live `/api/health?db=1` and `/demo` afterwards.

- [ ] **Step 5: Update memory** (`pitchsafe-drills-plus.md`): part 1 shipped, and the next step is part 2 (Clerk Billing).
