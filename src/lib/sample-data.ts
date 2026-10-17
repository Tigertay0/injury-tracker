// Sample player for the public demo: six weeks of a midfielder's season with a heavy
// current week, an old hamstring strain and bladed cleats on 3G turf. Clearly labelled
// as sample data wherever it is shown.
import { addDays, mondayOf } from '@shared/dates';
import { recoveryScore } from '@shared/calculations';
import type { Injury, Overview, RecoveryLog, SessionDrill, TrainingSession } from '@shared/types';

const WEEK: { offset: number; type: TrainingSession['type']; duration: number; rpe: number; notes?: string; drills: SessionDrill[] }[] = [
  { offset: 0, type: 'training', duration: 75, rpe: 6, drills: [{ drillId: 'warmup_dynamic', minutes: 10 }, { drillId: 'rondo_4v2', minutes: 15 }, { drillId: 'ssg_5v5', minutes: 25 }, { drillId: 'finishing_drill', minutes: 15 }] },
  { offset: 2, type: 'training', duration: 90, rpe: 5, drills: [{ drillId: 'fifa_11_plus', minutes: 15 }, { drillId: 'passing_pattern', minutes: 20 }, { drillId: 'possession_large', minutes: 25 }, { drillId: 'sprints_short', minutes: 10 }] },
  { offset: 3, type: 'gym', duration: 45, rpe: 6, drills: [{ drillId: 'gym_lower', minutes: 30 }, { drillId: 'nordic_curls', minutes: 10 }] },
  { offset: 5, type: 'match', duration: 90, rpe: 8, drills: [{ drillId: 'match_11v11', minutes: 90 }] },
];
const WEEK_SCALE = [0.9, 1.0, 1.08, 0.95, 1.02, 1.45];
const CURRENT_WEEK = WEEK_SCALE.length - 1;
// Tuned so sprinting reads as a caution (ratio 1.3 to 1.5) whichever weekday the demo opens;
// tests/risk-model.test.ts pins this for all seven days.
const CURRENT_WEEK_SPRINT_MINUTES = 15;

export function sampleOverview(today: string): Overview {
  const firstMonday = addDays(mondayOf(today), -35);
  const sessions: TrainingSession[] = WEEK_SCALE.flatMap((scale, week) =>
    WEEK.map((s, i) => {
      const date = addDays(firstMonday, week * 7 + s.offset);
      // Drill minutes scale with the week, floored so they never exceed the scaled duration
      const drills = s.drills.map((d) => ({ drillId: d.drillId, minutes: Math.max(1, Math.floor(d.minutes * scale)) }));
      // The current week opens with a long-sprint block: sprinting climbs while the workload ratio stays fine
      if (week === CURRENT_WEEK && s.offset === 0) drills.push({ drillId: 'sprints_long', minutes: CURRENT_WEEK_SPRINT_MINUTES });
      const duration = Math.max(Math.round(s.duration * scale), drills.reduce((n, d) => n + d.minutes, 0));
      return { id: `00000000-0000-4000-8000-${String(week * 10 + i).padStart(12, '0')}`, date, type: s.type, duration, rpe: s.rpe, load: duration * s.rpe, notes: week === CURRENT_WEEK && s.type === 'match' ? 'Extra time, legs heavy' : '', drills };
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
    profile: { position: 'MID', displayName: 'Sam', cleatType: 'FG_BLADED', surfaceType: '3G_TURF', dashboardOrder: [], createdAt: `${addDays(today, -60)}T00:00:00Z` },
    sessions,
    recovery,
    injuries,
    customDrills: [],
    // The demo never sells Plus. Dev builds can preview it with ?plus=1 (see the demo provider).
    account: { plusAvailable: false, plus: false },
  };
}
