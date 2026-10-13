import { describe, expect, it } from 'vitest';
import { buildRiskModel } from '../shared/risk-model';
import { addDays } from '../shared/dates';
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
