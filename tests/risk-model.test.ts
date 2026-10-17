import { describe, expect, it } from 'vitest';
import { buildRiskModel } from '../shared/risk-model';
import { addDays } from '../shared/dates';
import { DRILL_IDS } from '../shared/drills';
import { validateSession } from '../shared/validation';
import { sampleOverview } from '../src/lib/sample-data';
import type { Profile, RecoveryLog, TrainingSession } from '../shared/types';

const TODAY = '2026-10-12'; // a Monday

const profile: Profile = { position: 'MID', displayName: '', cleatType: 'AG', surfaceType: '3G_TURF', createdAt: '2026-09-01T00:00:00Z' };

function evenWeeks(): TrainingSession[] {
  // One 60-minute RPE-5 session in each of the last four weeks, oldest 27 days ago
  return [6, 13, 20, 27].map((d) => ({ id: `s${d}`, date: addDays(TODAY, -d), type: 'training', duration: 60, rpe: 5, load: 300, notes: '' }));
}

function checkIn(weekStart: string, score: number): RecoveryLog {
  return { id: `r-${weekStart}`, weekStart, sleep: 8, soreness: 2, stress: 3, nutrition: 7, score };
}

describe('buildRiskModel', () => {
  it('holds back the composite score until the 4-week baseline is ready', () => {
    const model = buildRiskModel({ profile, sessions: [], recovery: [], injuries: [] }, TODAY);
    expect(model.baseline).toEqual({ daysCovered: 0, ready: false });
    expect(model.composite).toBeNull();
    expect(model.acwr).toBeNull();
  });

  it('computes a low score for even load, good recovery and matched cleats', () => {
    const model = buildRiskModel({ profile, sessions: evenWeeks(), recovery: [checkIn('2026-10-12', 8)], injuries: [] }, TODAY);
    expect(model.acwr).toBe(1);
    expect(model.acwrZone).toBe('SWEET_SPOT');
    expect(model.equipmentRisk).toBe('LOW');
    // 10*0.45 + 10*0.3 + 5*0.25 = 8.75 -> 9
    expect(model.composite).toEqual({ score: 9, zone: 'LOW' });
  });

  it('ignores check-ins older than two weeks and assumes moderate recovery', () => {
    const stale = checkIn(addDays(TODAY, -21), 9);
    const model = buildRiskModel({ profile, sessions: evenWeeks(), recovery: [stale], injuries: [] }, TODAY);
    expect(model.recovery).toBeNull();
    expect(model.assumptions).toContain('NO_RECENT_CHECKIN');
    // 4.5 + 45*0.3 + 1.25 = 19.25 -> 19
    expect(model.composite?.score).toBe(19);
  });

  it('assumes medium equipment risk when cleats are not set', () => {
    const model = buildRiskModel({ profile: { ...profile, cleatType: null }, sessions: evenWeeks(), recovery: [checkIn('2026-10-12', 8)], injuries: [] }, TODAY);
    expect(model.equipmentRisk).toBeNull();
    expect(model.assumptions).toContain('NO_EQUIPMENT');
    // 4.5 + 3 + 40*0.25 = 17.5 -> 18
    expect(model.composite?.score).toBe(18);
  });

  it('builds 28 days of chart data and the acute and chronic loads', () => {
    const model = buildRiskModel({ profile, sessions: evenWeeks(), recovery: [], injuries: [] }, TODAY);
    expect(model.days).toHaveLength(28);
    expect(model.days[0].date).toBe(addDays(TODAY, -27));
    expect(model.acute).toBe(300);
    expect(model.chronic).toBe(300);
  });

  it('flags a recent match or hard session for the fuel notes', () => {
    const hard: TrainingSession = { id: 'h', date: addDays(TODAY, -1), type: 'match', duration: 90, rpe: 8, load: 720, notes: '' };
    const model = buildRiskModel({ profile, sessions: [hard], recovery: [], injuries: [] }, TODAY);
    expect(model.fuel.map((f) => f.id)).toContain('POST_SESSION');
  });

  it('returns recommendations', () => {
    const model = buildRiskModel({ profile, sessions: evenWeeks(), recovery: [], injuries: [] }, TODAY);
    expect(model.recommendations.length).toBeGreaterThan(0);
  });
});

describe('movement load in the risk model', () => {
  const recovery = [checkIn('2026-10-12', 8)];

  it('has no movement points when no drills are logged', () => {
    const plain = buildRiskModel({ profile, sessions: evenWeeks(), recovery, injuries: [] }, TODAY);
    expect(plain.movement.ready).toBe(false);
    expect(plain.movement.maxPoints).toBe(0);
    expect(plain.movement.worst).toBeNull();
    expect(plain.composite).toEqual({ score: 9, zone: 'LOW' });
    expect(plain.trainingInput).toEqual({ points: 10, source: 'workload' });
    expect(plain.recommendations.some((r) => r.text.includes('hamstring'))).toBe(false);
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
    expect(calm.composite!.score).toBe(9);
    // 85*0.45 + 10*0.3 + 5*0.25 = 42.5 -> 43
    expect(spiky.composite).toEqual({ score: 43, zone: 'MODERATE' });
    expect(spiky.trainingInput).toEqual({ points: 85, source: 'movement' });
    expect(spiky.recommendations.some((r) => r.text.includes('hamstring'))).toBe(true);
  });

  it('still holds back the composite when the workload baseline is not ready', () => {
    // Drills in 3 of the last 4 weeks, but the oldest session is only 20 days old
    const sessions = evenWeeks()
      .filter((s) => s.date !== addDays(TODAY, -27))
      .map((s) => ({ ...s, drills: s.date === addDays(TODAY, -6) ? [{ drillId: 'sprints_long', minutes: 60 }] : [{ drillId: 'sprints_short', minutes: 20 }] }));
    const model = buildRiskModel({ profile, sessions, recovery, injuries: [] }, TODAY);
    expect(model.acwrZone).toBe('NA');
    expect(model.movement.maxPoints).toBe(85);
    expect(model.composite).toBeNull();
    // nothing is scored yet, so the training input is not credited to movement
    expect(model.trainingInput).toEqual({ points: 0, source: 'workload' });
  });

  it('credits the workload ratio when its points tie with or beat the movement spike', () => {
    // A hard last week (workload ratio well above 1.5) and the same sprint spike as above
    const thisWeek = addDays(TODAY, -6);
    const sessions = evenWeeks().map((s) =>
      s.date === thisWeek
        ? { ...s, duration: 120, rpe: 10, load: 1200, drills: [{ drillId: 'sprints_long', minutes: 60 }] }
        : { ...s, drills: [{ drillId: 'sprints_short', minutes: 20 }] },
    );
    const model = buildRiskModel({ profile, sessions, recovery, injuries: [] }, TODAY);
    expect(model.acwrZone).toBe('DANGER');
    expect(model.movement.maxPoints).toBe(85);
    expect(model.trainingInput).toEqual({ points: 85, source: 'workload' });
  });
});

describe('sample player', () => {
  it('shows the same sprint caution and risk zone on every weekday', () => {
    const zones = new Set<string | undefined>();
    for (let d = 0; d < 7; d++) {
      const day = addDays(TODAY, d);
      const model = buildRiskModel(sampleOverview(day), day);
      expect(model.movement.ready, day).toBe(true);
      expect(model.movement.types.find((t) => t.type === 'sprint')?.level, day).toBe('CAUTION');
      expect(model.movement.worst?.type, day).toBe('sprint');
      zones.add(model.composite?.zone);
    }
    expect([...zones]).toHaveLength(1);
    expect(zones.has(undefined)).toBe(false);
  });

  it('logs only valid sessions with known drill ids on every weekday', () => {
    for (let d = 0; d < 7; d++) {
      const day = addDays(TODAY, d);
      for (const s of sampleOverview(day).sessions) {
        const { date, type, duration, rpe, notes, drills } = s;
        expect(drills?.length, `${s.date} has drills`).toBeGreaterThan(0);
        expect(() => validateSession({ date, type, duration, rpe, notes, drills }, day)).not.toThrow();
        for (const drill of drills ?? []) expect(DRILL_IDS.has(drill.drillId), drill.drillId).toBe(true);
      }
    }
  });
});
