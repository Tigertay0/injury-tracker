// Sample player for the public demo: six weeks of a midfielder's season with a heavy
// current week, an old hamstring strain and bladed cleats on 3G turf. Clearly labelled
// as sample data wherever it is shown.
import { addDays, mondayOf } from '@shared/dates';
import { recoveryScore } from '@shared/calculations';
import type { Injury, RecoveryLog, TrainingSession } from '@shared/types';
import type { Overview } from './player-data';

const WEEK: { offset: number; type: TrainingSession['type']; duration: number; rpe: number; notes?: string }[] = [
  { offset: 0, type: 'training', duration: 75, rpe: 6 },
  { offset: 2, type: 'training', duration: 90, rpe: 5 },
  { offset: 3, type: 'gym', duration: 45, rpe: 6 },
  { offset: 5, type: 'match', duration: 90, rpe: 8 },
];
const WEEK_SCALE = [0.9, 1.0, 1.08, 0.95, 1.02, 1.45];

export function sampleOverview(today: string): Overview {
  const firstMonday = addDays(mondayOf(today), -35);
  const sessions: TrainingSession[] = WEEK_SCALE.flatMap((scale, week) =>
    WEEK.map((s, i) => {
      const date = addDays(firstMonday, week * 7 + s.offset);
      const duration = Math.round(s.duration * scale);
      return { id: `00000000-0000-4000-8000-${String(week * 10 + i).padStart(12, '0')}`, date, type: s.type, duration, rpe: s.rpe, load: duration * s.rpe, notes: week === 5 && s.type === 'match' ? 'Extra time, legs heavy' : '' };
    }),
  )
    .filter((s) => s.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const checkIns = [
    { weeksAgo: 0, sleep: 6.5, soreness: 6, stress: 5, nutrition: 6 },
    { weeksAgo: 1, sleep: 7.5, soreness: 4, stress: 4, nutrition: 7 },
    { weeksAgo: 2, sleep: 8, soreness: 3, stress: 3, nutrition: 8 },
  ];
  const recovery: RecoveryLog[] = checkIns.map((c, i) => ({
    id: `00000000-0000-4000-9000-${String(i).padStart(12, '0')}`,
    weekStart: addDays(mondayOf(today), -7 * c.weeksAgo),
    sleep: c.sleep,
    soreness: c.soreness,
    stress: c.stress,
    nutrition: c.nutrition,
    score: recoveryScore(c),
  }));

  const injuries: Injury[] = [
    { id: '00000000-0000-4000-a000-000000000001', bodyPart: 'Hamstring (L)', injuryType: 'Strain', severity: 'moderate', injuryDate: addDays(today, -260), returnDate: addDays(today, -238) },
  ];

  return {
    profile: { position: 'MID', displayName: 'Sam', cleatType: 'FG_BLADED', surfaceType: '3G_TURF', createdAt: `${addDays(today, -60)}T00:00:00Z` },
    sessions,
    recovery,
    injuries,
  };
}
