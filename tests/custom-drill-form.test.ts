import { describe, expect, it } from 'vitest';
import type { DrillEstimate } from '../shared/custom-drills';
import { ValidationError } from '../shared/validation';
import { blankProfile, draftToValues, firstInvalidShare, markEstimateStale, matchesEstimate, profileFromEstimate, SHARES_ERROR } from '../src/lib/custom-drill-form';

const ESTIMATE: DrillEstimate = {
  category: 'small_sided',
  profile: { intensity: 8, sprint: 0.05, hsr: 0.08, cod: 0.4, jump: 0.03, contact: 0.2, strength: 0 },
  reason: 'Short, sharp games with lots of turning.',
};

describe('profileFromEstimate', () => {
  it('shows shares as whole percents', () => {
    const draft = profileFromEstimate(ESTIMATE);
    expect(draft.category).toBe('small_sided');
    expect(draft.intensity).toBe(8);
    expect(draft.shares).toEqual({ sprint: '5', hsr: '8', cod: '40', jump: '3', contact: '20', strength: '0' });
  });

  it('survives shares that do not multiply cleanly by 100', () => {
    const draft = profileFromEstimate({ ...ESTIMATE, profile: { ...ESTIMATE.profile, sprint: 0.07, hsr: 0.29, cod: 0.57 } });
    expect(draft.shares).toMatchObject({ sprint: '7', hsr: '29', cod: '57' });
  });
});

describe('draftToValues', () => {
  it('converts percents to shares and keeps aiEstimated when nothing changed', () => {
    const values = draftToValues(profileFromEstimate(ESTIMATE));
    expect(values.profile).toEqual(ESTIMATE.profile);
    expect(values.category).toBe('small_sided');
    expect(values.aiEstimated).toBe(true);
  });

  it('keeps aiEstimated for shares that are not exact binary fractions', () => {
    const estimate = { ...ESTIMATE, profile: { ...ESTIMATE.profile, sprint: 0.07, hsr: 0.29, cod: 0.57 } };
    expect(draftToValues(profileFromEstimate(estimate)).aiEstimated).toBe(true);
  });

  it('drops aiEstimated when the category changes', () => {
    const draft = { ...profileFromEstimate(ESTIMATE), category: 'technical' as const };
    expect(draftToValues(draft).aiEstimated).toBe(false);
  });

  it('drops aiEstimated when the intensity changes', () => {
    const draft = { ...profileFromEstimate(ESTIMATE), intensity: 7 };
    expect(draftToValues(draft).aiEstimated).toBe(false);
  });

  it.each(['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'] as const)('drops aiEstimated when %s changes by one point', (type) => {
    const base = profileFromEstimate(ESTIMATE);
    const draft = { ...base, shares: { ...base.shares, [type]: String(Number(base.shares[type]) + 1) } };
    expect(draftToValues(draft).aiEstimated).toBe(false);
  });

  it('is never AI-estimated without an estimate', () => {
    const draft = { ...blankProfile(), category: 'technical' as const };
    expect(draftToValues(draft).aiEstimated).toBe(false);
  });

  it('turns whole percents into two-decimal shares', () => {
    const draft = { ...blankProfile(), category: 'speed' as const, shares: { ...blankProfile().shares, sprint: '25', hsr: '100', jump: ' 7 ' } };
    expect(draftToValues(draft).profile).toMatchObject({ sprint: 0.25, hsr: 1, jump: 0.07, strength: 0 });
  });

  it('asks for a category before anything else', () => {
    expect(() => draftToValues(blankProfile())).toThrowError(new ValidationError('Choose a category.', 'category'));
  });

  it.each(['', '  ', '101', '-1', '12.5', '1e1', 'abc'])('rejects the share "%s"', (bad) => {
    const draft = { ...blankProfile(), category: 'speed' as const, shares: { ...blankProfile().shares, cod: bad } };
    expect(() => draftToValues(draft)).toThrowError(new ValidationError(SHARES_ERROR, 'shares'));
  });
});

describe('firstInvalidShare', () => {
  it('is null when every share is a whole percent', () => {
    expect(firstInvalidShare(blankProfile().shares)).toBeNull();
  });

  it('names the first bad box in display order', () => {
    expect(firstInvalidShare({ ...blankProfile().shares, jump: '', cod: '300' })).toBe('cod');
  });
});

describe('matchesEstimate', () => {
  const TYPES = ['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'] as const;

  it('is true for an untouched estimate', () => {
    expect(matchesEstimate(profileFromEstimate(ESTIMATE))).toBe(true);
  });

  it('is false after changing the category', () => {
    expect(matchesEstimate({ ...profileFromEstimate(ESTIMATE), category: 'technical' })).toBe(false);
  });

  it('is false after changing the intensity', () => {
    expect(matchesEstimate({ ...profileFromEstimate(ESTIMATE), intensity: 7 })).toBe(false);
  });

  it.each(TYPES)('is false after changing %s by one point, in either direction', (type) => {
    const base = profileFromEstimate(ESTIMATE);
    const at = (delta: number) => ({ ...base, shares: { ...base.shares, [type]: String(Number(base.shares[type]) + delta) } });
    expect(matchesEstimate(at(1))).toBe(false);
    expect(matchesEstimate(at(-1))).toBe(false);
  });

  it('is true again when the player changes each value back', () => {
    const base = profileFromEstimate(ESTIMATE);
    const edited = { ...base, category: 'speed' as const, intensity: 3, shares: { ...base.shares, cod: '41', strength: '9' } };
    expect(matchesEstimate(edited)).toBe(false);
    const partlyBack = { ...edited, category: base.category, intensity: base.intensity };
    expect(matchesEstimate(partlyBack)).toBe(false);
    const allBack = { ...partlyBack, shares: { ...base.shares } };
    expect(matchesEstimate(allBack)).toBe(true);
  });

  it('is true for the same percent typed with spaces', () => {
    const base = profileFromEstimate(ESTIMATE);
    expect(matchesEstimate({ ...base, shares: { ...base.shares, cod: ' 40 ' } })).toBe(true);
  });

  it('is false while a share box is empty or invalid', () => {
    const base = profileFromEstimate(ESTIMATE);
    expect(matchesEstimate({ ...base, shares: { ...base.shares, hsr: '' } })).toBe(false);
    expect(matchesEstimate({ ...base, shares: { ...base.shares, hsr: '8.5' } })).toBe(false);
  });

  it('is false without an estimate, even for matching-looking values', () => {
    const manual = { ...profileFromEstimate(ESTIMATE), estimate: null };
    expect(matchesEstimate(manual)).toBe(false);
    expect(matchesEstimate(blankProfile())).toBe(false);
  });

  it('is false while no category is chosen', () => {
    expect(matchesEstimate({ ...profileFromEstimate(ESTIMATE), category: '' })).toBe(false);
  });

  it('agrees with the aiEstimated flag that is saved', () => {
    const base = profileFromEstimate(ESTIMATE);
    for (const draft of [base, { ...base, intensity: 2 }, { ...base, shares: { ...base.shares, jump: '4' } }]) {
      expect(draftToValues(draft).aiEstimated).toBe(matchesEstimate(draft));
    }
  });
});

describe('markEstimateStale', () => {
  it('starts fresh: an estimate that just arrived is not stale', () => {
    expect(profileFromEstimate(ESTIMATE).stale).toBe(false);
    expect(blankProfile().stale).toBe(false);
  });

  it('marks an estimate stale and keeps the values the player sees', () => {
    const fresh = profileFromEstimate(ESTIMATE);
    const stale = markEstimateStale(fresh);
    expect(stale.stale).toBe(true);
    expect(stale.estimate).toBe(fresh.estimate);
    expect(stale.category).toBe(fresh.category);
    expect(stale.intensity).toBe(fresh.intensity);
    expect(stale.shares).toEqual(fresh.shares);
  });

  it('returns a new draft and leaves the original alone', () => {
    const fresh = profileFromEstimate(ESTIMATE);
    const stale = markEstimateStale(fresh);
    expect(stale).not.toBe(fresh);
    expect(fresh.stale).toBe(false);
  });

  it('stops matching the estimate, even though every value is still the AI\'s', () => {
    const fresh = profileFromEstimate(ESTIMATE);
    expect(matchesEstimate(fresh)).toBe(true);
    expect(matchesEstimate(markEstimateStale(fresh))).toBe(false);
  });

  it('saves aiEstimated as false once the text changed', () => {
    const fresh = profileFromEstimate(ESTIMATE);
    expect(draftToValues(fresh).aiEstimated).toBe(true);
    const values = draftToValues(markEstimateStale(fresh));
    expect(values.aiEstimated).toBe(false);
    expect(values.profile).toEqual(ESTIMATE.profile);
    expect(values.category).toBe('small_sided');
  });

  it('stays stale when the values are edited and then changed back', () => {
    const fresh = profileFromEstimate(ESTIMATE);
    const edited = { ...markEstimateStale(fresh), intensity: 3, shares: { ...fresh.shares, cod: '41' } };
    const restored = { ...edited, intensity: fresh.intensity, shares: { ...fresh.shares } };
    expect(matchesEstimate(restored)).toBe(false);
    expect(restored.stale).toBe(true);
  });

  it('is already stale after the first edit, so more edits change nothing', () => {
    const stale = markEstimateStale(profileFromEstimate(ESTIMATE));
    expect(markEstimateStale(stale)).toBe(stale);
  });

  it('does nothing without an estimate, so typed values are never marked', () => {
    const manual = { ...blankProfile(), category: 'technical' as const };
    expect(markEstimateStale(manual)).toBe(manual);
    expect(markEstimateStale(manual).stale).toBe(false);
  });

  it('a fresh estimate after a stale one starts clean', () => {
    const stale = markEstimateStale(profileFromEstimate(ESTIMATE));
    const again = profileFromEstimate({ ...ESTIMATE, category: 'speed' });
    expect(stale.stale).toBe(true);
    expect(again.stale).toBe(false);
    expect(matchesEstimate(again)).toBe(true);
  });
});
