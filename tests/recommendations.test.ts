import { describe, expect, it } from 'vitest';
import { recommendations, fuelNotes } from '../shared/recommendations';
import type { RecommendationInput } from '../shared/recommendations';

const base: RecommendationInput = {
  acwrZone: 'SWEET_SPOT',
  recoveryZone: 'GOOD',
  equipmentRisk: 'LOW',
  position: 'MID',
  injuryFactors: [],
};

describe('recommendations', () => {
  it('puts a very-high equipment alert first', () => {
    const recs = recommendations({ ...base, acwrZone: 'DANGER', equipmentRisk: 'VERY_HIGH' });
    expect(recs[0].category).toBe('Equipment');
    expect(recs[0].urgent).toBe(true);
  });

  it('gives midfielders the PRD load advice in the danger zone', () => {
    const recs = recommendations({ ...base, acwrZone: 'DANGER' });
    expect(recs.some((r) => r.category === 'Position' && /48 hours/.test(r.text))).toBe(true);
  });

  it('always includes one position-specific tip', () => {
    for (const position of ['GK', 'DEF', 'MID', 'FWD'] as const) {
      const recs = recommendations({ ...base, position });
      expect(recs.filter((r) => r.category === 'Position')).toHaveLength(1);
    }
  });

  it('caps the list at five and sorts by priority', () => {
    const recs = recommendations({
      acwrZone: 'DANGER',
      recoveryZone: 'POOR',
      equipmentRisk: 'VERY_HIGH',
      position: 'FWD',
      injuryFactors: ['ACL_HISTORY', 'RECENT_INJURY', 'HAMSTRING_HISTORY'],
    });
    expect(recs.length).toBeLessThanOrEqual(5);
    const priorities = recs.map((r) => r.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it('cites a source on every load and equipment recommendation', () => {
    const recs = recommendations({ ...base, acwrZone: 'CAUTION', equipmentRisk: 'HIGH' });
    recs
      .filter((r) => r.category === 'Training load' || r.category === 'Equipment')
      .forEach((r) => expect(r.citation).toBeTruthy());
  });

  it('never uses emoji', () => {
    const recs = recommendations({ ...base, acwrZone: 'DANGER', equipmentRisk: 'VERY_HIGH', recoveryZone: 'POOR' });
    recs.forEach((r) => expect(r.text).not.toMatch(/\p{Extended_Pictographic}/u));
  });
});

describe('fuel notes (PRD 2.7)', () => {
  it('is empty when load and recovery are fine', () => {
    expect(fuelNotes({ acwr: 1.1, recoveryScore: 8, hadHardSessionRecently: false })).toEqual([]);
  });

  it('covers carbohydrate and protein when load is high', () => {
    const notes = fuelNotes({ acwr: 1.4, recoveryScore: 8, hadHardSessionRecently: false });
    expect(notes.map((n) => n.id)).toContain('HIGH_LOAD');
  });

  it('covers sleep and hydration when recovery is poor', () => {
    const notes = fuelNotes({ acwr: null, recoveryScore: 3, hadHardSessionRecently: false });
    expect(notes.map((n) => n.id)).toContain('POOR_RECOVERY');
  });

  it('covers the post-session window after a match or hard session', () => {
    const notes = fuelNotes({ acwr: null, recoveryScore: null, hadHardSessionRecently: true });
    expect(notes.map((n) => n.id)).toContain('POST_SESSION');
  });
});
