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

  // 80 min of short sprints = 20 min of sprinting per session, so a 4-week average of 10 or
  // more clears the 5-minute floor and only the weeks rule can hold the ratio back.
  const BIG_SPRINTS: SessionDrill[] = [{ drillId: 'sprints_short', minutes: 80 }];

  it('has no baseline with drills in only 2 of the last 4 weeks', () => {
    const m = movementLoad([session(1, BIG_SPRINTS), session(8, BIG_SPRINTS)], TODAY);
    expect(m.types.find((t) => t.type === 'sprint')?.ratio).toBeNull();
    expect(m.ready).toBe(false);
    expect(m.maxPoints).toBe(0);
  });

  it('has a baseline once drills appear in 3 of the last 4 weeks', () => {
    const m = movementLoad([session(1, BIG_SPRINTS), session(8, BIG_SPRINTS), session(15, BIG_SPRINTS)], TODAY);
    expect(m.types.find((t) => t.type === 'sprint')?.ratio).not.toBeNull();
    expect(m.ready).toBe(true);
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
