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
