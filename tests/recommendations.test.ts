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

  const cases = [
    ['sprint', 'hamstrings', 'Duhig et al., 2016'],
    ['hsr', 'hamstrings', 'Duhig et al., 2016'],
    ['cod', 'knees and ankles', 'Gabbett, 2016'],
    ['jump', 'jump', 'Gabbett, 2016'],
    ['contact', 'contact', 'Gabbett, 2016'],
  ] as const;
  for (const [type, keyword, citation] of cases) {
    for (const [level, priority] of [['DANGER', 1], ['CAUTION', 2]] as const) {
      it(`maps a ${type} ${level.toLowerCase()} to priority ${priority} advice citing ${citation}`, () => {
        const recs = recommendations({ ...base, movementSpike: { type, level } });
        const advice = recs.find((r) => r.citation === citation && r.category === 'Training load');
        expect(advice?.priority).toBe(priority);
        expect(advice?.text.toLowerCase()).toContain(keyword);
      });
    }
  }

  it('never gives advice for a strength spike', () => {
    expect(recommendations({ ...base, movementSpike: { type: 'strength', level: 'DANGER' } })).toEqual(recommendations(base));
  });

  it('adds nothing without a spike', () => {
    expect(recommendations({ ...base, movementSpike: null })).toEqual(recommendations(base));
  });
});
