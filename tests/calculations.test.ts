import { describe, expect, it } from 'vitest';
import {
  sessionLoad,
  acuteLoad,
  chronicLoad,
  calculateACWR,
  acwrZone,
  acwrRiskScore,
  sleepScore,
  recoveryScore,
  recoveryZone,
  recoveryRiskScore,
  equipmentRiskScore,
  injuryMultiplier,
  compositeScore,
  compositeZone,
  baselineProgress,
  dailyLoads,
} from '../shared/calculations';
import { addDays } from '../shared/dates';
import type { TrainingSession, Injury } from '../shared/types';

const TODAY = '2026-10-12';

function session(daysAgo: number, duration: number, rpe: number): TrainingSession {
  return {
    id: `s${daysAgo}-${duration}-${rpe}`,
    date: addDays(TODAY, -daysAgo),
    type: 'training',
    duration,
    rpe,
    load: duration * rpe,
    notes: '',
  };
}

function injury(partial: Partial<Injury>): Injury {
  return {
    id: 'i1',
    bodyPart: 'Knee (L)',
    injuryType: 'Strain',
    severity: 'mild',
    injuryDate: '2025-01-01',
    returnDate: '2025-01-05',
    ...partial,
  };
}

describe('session load', () => {
  it('is duration x RPE', () => {
    expect(sessionLoad(90, 6)).toBe(540);
  });
});

describe('acute and chronic load', () => {
  it('acute sums the last 7 calendar days including today', () => {
    const sessions = [session(0, 60, 5), session(6, 60, 5), session(7, 60, 5)];
    expect(acuteLoad(sessions, TODAY)).toBe(600);
  });

  it('chronic is the 28-day total divided by 4 weeks', () => {
    const sessions = [session(0, 100, 4), session(27, 100, 4), session(28, 100, 4)];
    expect(chronicLoad(sessions, TODAY)).toBe(200);
  });

  it('ignores sessions dated in the future', () => {
    const future = { ...session(0, 60, 5), date: addDays(TODAY, 2) };
    expect(acuteLoad([future], TODAY)).toBe(0);
  });
});

describe('ACWR', () => {
  it('is N/A (null) until the history covers a full 4 weeks', () => {
    const sessions = [session(0, 60, 5), session(10, 60, 5), session(26, 60, 5)];
    expect(calculateACWR(sessions, TODAY)).toBeNull();
  });

  it('is N/A when there are no sessions', () => {
    expect(calculateACWR([], TODAY)).toBeNull();
  });

  it('is 1.0 for perfectly even weekly load', () => {
    const sessions = [session(6, 60, 5), session(13, 60, 5), session(20, 60, 5), session(27, 60, 5)];
    expect(calculateACWR(sessions, TODAY)).toBe(1);
  });

  it('rounds to two decimals', () => {
    const sessions = [session(6, 100, 5), session(13, 60, 5), session(20, 60, 5), session(27, 60, 5)];
    // acute 500, chronic (500+300+300+300)/4 = 350 -> 1.428...
    expect(calculateACWR(sessions, TODAY)).toBe(1.43);
  });

  it('maps ratios to PRD zones', () => {
    expect(acwrZone(null)).toBe('NA');
    expect(acwrZone(0.79)).toBe('UNDERTRAINING');
    expect(acwrZone(0.8)).toBe('SWEET_SPOT');
    expect(acwrZone(1.3)).toBe('SWEET_SPOT');
    expect(acwrZone(1.31)).toBe('CAUTION');
    expect(acwrZone(1.5)).toBe('CAUTION');
    expect(acwrZone(1.51)).toBe('DANGER');
  });

  it('converts zones to PRD risk scores', () => {
    expect(acwrRiskScore('SWEET_SPOT')).toBe(10);
    expect(acwrRiskScore('UNDERTRAINING')).toBe(40);
    expect(acwrRiskScore('CAUTION')).toBe(50);
    expect(acwrRiskScore('DANGER')).toBe(85);
  });
});

describe('recovery', () => {
  it('scores sleep by PRD bands', () => {
    expect(sleepScore(8)).toBe(10);
    expect(sleepScore(7.5)).toBe(8);
    expect(sleepScore(6)).toBe(5);
    expect(sleepScore(5.5)).toBe(2);
  });

  it('averages sleep, inverted soreness, inverted stress and nutrition', () => {
    // sleep 8h -> 10, soreness 2 -> 8, stress 3 -> 7, nutrition 7 -> 7 => 32/4 = 8
    expect(recoveryScore({ sleep: 8, soreness: 2, stress: 3, nutrition: 7 })).toBe(8);
  });

  it('keeps one decimal', () => {
    // 5 + 5 + 4 + 6 = 20 / 4 = 5 ; 8 + 6 + 5 + 6 = 25/4 = 6.25 -> 6.3
    expect(recoveryScore({ sleep: 7, soreness: 4, stress: 5, nutrition: 6 })).toBe(6.3);
  });

  it('maps scores to zones and risk', () => {
    expect(recoveryZone(7)).toBe('GOOD');
    expect(recoveryZone(6.9)).toBe('MODERATE');
    expect(recoveryZone(4)).toBe('MODERATE');
    expect(recoveryZone(3.9)).toBe('POOR');
    expect(recoveryRiskScore('GOOD')).toBe(10);
    expect(recoveryRiskScore('MODERATE')).toBe(45);
    expect(recoveryRiskScore('POOR')).toBe(80);
  });
});

describe('equipment risk score', () => {
  it('uses PRD conversions', () => {
    expect(equipmentRiskScore('LOW')).toBe(5);
    expect(equipmentRiskScore('MEDIUM')).toBe(40);
    expect(equipmentRiskScore('HIGH')).toBe(75);
    expect(equipmentRiskScore('VERY_HIGH')).toBe(95);
  });
});

describe('injury history multiplier', () => {
  it('is 1.0 with no history', () => {
    expect(injuryMultiplier([], TODAY).value).toBe(1);
  });

  it('adds 0.4 for a knee tear (ACL history)', () => {
    expect(injuryMultiplier([injury({ bodyPart: 'Knee (R)', injuryType: 'Tear' })], TODAY).value).toBe(1.4);
  });

  it('adds 0.25 only for a severe ankle sprain', () => {
    const severeSprain = injury({ bodyPart: 'Ankle (L)', injuryType: 'Sprain', severity: 'severe' });
    const mildSprain = injury({ bodyPart: 'Ankle (L)', injuryType: 'Sprain', severity: 'mild' });
    const severeFracture = injury({ bodyPart: 'Ankle (L)', injuryType: 'Fracture', severity: 'severe' });
    expect(injuryMultiplier([severeSprain], TODAY).value).toBe(1.25);
    expect(injuryMultiplier([mildSprain], TODAY).value).toBe(1);
    expect(injuryMultiplier([severeFracture], TODAY).value).toBe(1);
  });

  it('adds 0.2 for a hamstring strain', () => {
    expect(injuryMultiplier([injury({ bodyPart: 'Hamstring (L)', injuryType: 'Strain' })], TODAY).value).toBe(1.2);
  });

  it('adds 0.3 once for any injury in the last 6 weeks, by injury or return date', () => {
    const recentInjury = injury({ injuryDate: addDays(TODAY, -10), returnDate: null });
    const recentReturn = injury({ injuryDate: addDays(TODAY, -90), returnDate: addDays(TODAY, -5) });
    expect(injuryMultiplier([recentInjury], TODAY).value).toBe(1.3);
    expect(injuryMultiplier([recentInjury, recentReturn], TODAY).value).toBe(1.3);
  });

  it('applies each history factor once even with repeats', () => {
    const tears = [injury({ id: 'a', bodyPart: 'Knee (L)', injuryType: 'Tear' }), injury({ id: 'b', bodyPart: 'Knee (R)', injuryType: 'Tear' })];
    expect(injuryMultiplier(tears, TODAY).value).toBe(1.4);
  });

  it('is additive and capped at 2.0', () => {
    const many = [
      injury({ id: 'a', bodyPart: 'Knee (L)', injuryType: 'Tear', injuryDate: addDays(TODAY, -3), returnDate: null }),
      injury({ id: 'b', bodyPart: 'Ankle (R)', injuryType: 'Sprain', severity: 'severe' }),
      injury({ id: 'c', bodyPart: 'Hamstring (R)', injuryType: 'Strain' }),
    ];
    // 1 + 0.4 + 0.25 + 0.2 + 0.3 = 2.15 -> 2.0
    expect(injuryMultiplier(many, TODAY).value).toBe(2);
  });

  it('lists the factors it applied', () => {
    const result = injuryMultiplier([injury({ bodyPart: 'Knee (R)', injuryType: 'Tear' })], TODAY);
    expect(result.factors).toEqual(['ACL_HISTORY']);
  });
});

describe('composite score', () => {
  it('weights ACWR 45%, recovery 30%, equipment 25%', () => {
    // 10*0.45 + 10*0.30 + 5*0.25 = 4.5 + 3 + 1.25 = 8.75 -> 9
    expect(compositeScore({ acwrRisk: 10, recoveryRisk: 10, equipmentRisk: 5, multiplier: 1 })).toBe(9);
  });

  it('applies the injury multiplier and caps at 100', () => {
    expect(compositeScore({ acwrRisk: 85, recoveryRisk: 80, equipmentRisk: 95, multiplier: 1.4 })).toBe(100);
    expect(compositeScore({ acwrRisk: 50, recoveryRisk: 45, equipmentRisk: 40, multiplier: 1.2 })).toBe(55);
  });

  it('maps to PRD bands', () => {
    expect(compositeZone(30)).toBe('LOW');
    expect(compositeZone(31)).toBe('MODERATE');
    expect(compositeZone(59)).toBe('MODERATE');
    expect(compositeZone(60)).toBe('HIGH');
    expect(compositeZone(79)).toBe('HIGH');
    expect(compositeZone(80)).toBe('VERY_HIGH');
  });
});

describe('baseline progress', () => {
  it('counts days since the oldest session, up to 28', () => {
    expect(baselineProgress([], TODAY)).toEqual({ daysCovered: 0, ready: false });
    expect(baselineProgress([session(9, 60, 5)], TODAY)).toEqual({ daysCovered: 10, ready: false });
    expect(baselineProgress([session(40, 60, 5)], TODAY)).toEqual({ daysCovered: 28, ready: true });
  });
});

describe('daily loads', () => {
  it('returns one entry per day, oldest first, summing same-day sessions', () => {
    const days = dailyLoads([session(0, 60, 5), session(0, 30, 4), session(2, 50, 2)], TODAY, 3);
    expect(days).toEqual([
      { date: addDays(TODAY, -2), load: 100 },
      { date: addDays(TODAY, -1), load: 0 },
      { date: TODAY, load: 420 },
    ]);
  });
});
