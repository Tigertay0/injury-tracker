import { describe, expect, it } from 'vitest';
import { DRILLS, DRILL_CATEGORIES, DRILL_IDS, drillById } from '../shared/drills';

const SHARES = ['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'] as const;

describe('built-in drill library', () => {
  it('has about thirty drills with unique, stable ids', () => {
    expect(DRILLS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
    for (const d of DRILLS) expect(d.id).toMatch(/^[a-z0-9_]{2,40}$/);
  });

  it('keeps every profile in range', () => {
    for (const d of DRILLS) {
      expect(Number.isInteger(d.profile.intensity)).toBe(true);
      expect(d.profile.intensity).toBeGreaterThanOrEqual(1);
      expect(d.profile.intensity).toBeLessThanOrEqual(10);
      for (const k of SHARES) {
        expect(d.profile[k]).toBeGreaterThanOrEqual(0);
        expect(d.profile[k]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses every category', () => {
    for (const c of DRILL_CATEGORIES) expect(DRILLS.some((d) => d.category === c)).toBe(true);
  });

  it('looks drills up by id', () => {
    expect(drillById('rondo_4v2')?.name).toBe('Rondo (4v2, 5v2)');
    expect(drillById('nope')).toBeUndefined();
    expect(DRILL_IDS.has('nordic_curls')).toBe(true);
  });
});
