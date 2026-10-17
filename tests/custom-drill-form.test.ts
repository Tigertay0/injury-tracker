import { describe, expect, it } from 'vitest';
import type { DrillEstimate } from '../shared/custom-drills';
import { ValidationError } from '../shared/validation';
import { blankProfile, draftToValues, firstInvalidShare, profileFromEstimate, SHARES_ERROR } from '../src/lib/custom-drill-form';

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
