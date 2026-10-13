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
