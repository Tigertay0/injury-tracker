import { describe, expect, it } from 'vitest';
import { DRILLS } from '../shared/drills';
import {
  ValidationError,
  clampMovementProfile,
  validateSession,
  validateRecovery,
  validateInjury,
  validateInjuryReturn,
  validateProfile,
  validateEquipment,
  validateDashboardOrder,
  MAX_DASHBOARD_TILES,
  validateCustomDrill,
  validateEstimateRequest,
  validateMovementProfile,
  requireId,
} from '../shared/validation';

const TODAY = '2026-10-12';

function thrown(fn: () => unknown): ValidationError {
  try {
    fn();
  } catch (err) {
    if (err instanceof ValidationError) return err;
    throw err;
  }
  throw new Error('Expected a ValidationError, but nothing was thrown.');
}

describe('validateSession', () => {
  const ok = { date: '2026-10-11', type: 'match', duration: '90', rpe: 7, notes: ' felt fine ' };

  it('accepts a valid session and coerces numbers', () => {
    expect(validateSession(ok, TODAY)).toEqual({ date: '2026-10-11', type: 'match', duration: 90, rpe: 7, notes: 'felt fine', drills: [] });
  });

  it('rejects unknown session types', () => {
    expect(() => validateSession({ ...ok, type: 'nap' }, TODAY)).toThrow(ValidationError);
  });

  it('rejects out-of-range duration and RPE', () => {
    expect(() => validateSession({ ...ok, duration: 0 }, TODAY)).toThrow(/duration/i);
    expect(() => validateSession({ ...ok, duration: 301 }, TODAY)).toThrow(/duration/i);
    expect(() => validateSession({ ...ok, rpe: 11 }, TODAY)).toThrow(/effort/i);
    expect(() => validateSession({ ...ok, rpe: 6.5 }, TODAY)).toThrow(/effort/i);
  });

  it('rejects dates more than a day in the future or malformed', () => {
    expect(() => validateSession({ ...ok, date: '2026-10-14' }, TODAY)).toThrow(/date/i);
    expect(() => validateSession({ ...ok, date: '2026-02-30' }, TODAY)).toThrow(/date/i);
    expect(() => validateSession({ ...ok, date: '12/10/2026' }, TODAY)).toThrow(/date/i);
  });

  it('allows tomorrow to absorb time-zone differences', () => {
    expect(validateSession({ ...ok, date: '2026-10-13' }, TODAY).date).toBe('2026-10-13');
  });

  it('limits notes to 500 characters', () => {
    expect(() => validateSession({ ...ok, notes: 'x'.repeat(501) }, TODAY)).toThrow(/notes/i);
  });

  it('defaults missing notes to an empty string', () => {
    const { notes: _omit, ...rest } = ok;
    expect(validateSession(rest, TODAY).notes).toBe('');
  });

  it('rejects non-object input', () => {
    expect(() => validateSession(null, TODAY)).toThrow(ValidationError);
  });
});

describe('validateSession drills', () => {
  const ok = { date: '2026-10-11', type: 'training', duration: 90, rpe: 6 };

  it('accepts built-in drills and coerces minutes', () => {
    const s = validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: '15' }, { drillId: 'ssg_5v5', minutes: 30 }] }, TODAY);
    expect(s.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }, { drillId: 'ssg_5v5', minutes: 30 }]);
  });

  it('rejects unknown drills', () => {
    const err = thrown(() => validateSession({ ...ok, drills: [{ drillId: 'made_up', minutes: 10 }] }, TODAY));
    expect(err.message).toMatch(/from the list/);
    expect(err.field).toBe('drills');
  });

  it('rejects drill minutes that add up to more than the session', () => {
    const err = thrown(() => validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: 60 }, { drillId: 'ssg_5v5', minutes: 31 }] }, TODAY));
    expect(err.message).toMatch(/more than the session/);
    expect(err.field).toBe('drills');
  });

  it('rejects the same drill twice, too many drills, and non-lists', () => {
    expect(() => validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes: 5 }, { drillId: 'rondo_4v2', minutes: 5 }] }, TODAY)).toThrow(/once/);
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ drillId: ['rondo_4v2', 'ssg_5v5', 'passing_pairs', 'heading', 'set_pieces', 'cool_down', 'steady_run', 'core_balance', 'nordic_curls', 'first_touch', 'finishing_drill', 'warmup_dynamic', 'sprints_short'][i], minutes: 1 }));
    expect(() => validateSession({ ...ok, drills: thirteen }, TODAY)).toThrow(/12/);
    expect(() => validateSession({ ...ok, drills: 'rondo' }, TODAY)).toThrow(ValidationError);
  });

  it('rejects more than 12 drills and reports the drills field', () => {
    const err = thrown(() => validateSession({ ...ok, drills: DRILLS.slice(0, 13).map((d) => ({ drillId: d.id, minutes: 1 })) }, TODAY));
    expect(err.message).toMatch(/12/);
    expect(err.field).toBe('drills');
  });

  it('accepts exactly 12 drills', () => {
    const twelve = DRILLS.slice(0, 12).map((d) => ({ drillId: d.id, minutes: 1 }));
    expect(validateSession({ ...ok, drills: twelve }, TODAY).drills).toEqual(twelve);
  });

  it('accepts drill minutes that equal the session duration', () => {
    const drills = [{ drillId: 'rondo_4v2', minutes: 60 }, { drillId: 'ssg_5v5', minutes: 30 }];
    expect(validateSession({ ...ok, drills }, TODAY).drills).toEqual(drills);
  });

  it('treats null drills as none', () => {
    expect(validateSession({ ...ok, drills: null }, TODAY).drills).toEqual([]);
  });

  it.each([0, 301, 7.5])('rejects %s drill minutes', (minutes) => {
    const err = thrown(() => validateSession({ ...ok, drills: [{ drillId: 'rondo_4v2', minutes }] }, TODAY));
    expect(err.message).toMatch(/whole number from 1 to 300/);
    expect(err.field).toBe('drills');
  });

  it.each([[null], ['x']])('rejects the non-object drill item %j', (item) => {
    const err = thrown(() => validateSession({ ...ok, drills: [item] }, TODAY));
    expect(err.message).toMatch(/from the list/);
    expect(err.field).toBe('drills');
  });

  it('rejects __proto__ as a drill id', () => {
    const err = thrown(() => validateSession({ ...ok, drills: [{ drillId: '__proto__', minutes: 5 }] }, TODAY));
    expect(err.message).toMatch(/from the list/);
    expect(err.field).toBe('drills');
  });
});

describe('custom drills', () => {
  const ID = '3f2a8c1e-9b4d-4e6f-8a2b-1c3d5e7f9a0b';
  const profile = { intensity: 6, sprint: 0.1, hsr: 0.2, cod: 0.3, jump: 0, contact: 0.15, strength: 0 };

  it('accepts a valid custom drill and trims text', () => {
    expect(validateCustomDrill({ name: '  4v4 grid ', description: 'two-touch', category: 'small_sided', profile, aiEstimated: true }))
      .toEqual({ name: '4v4 grid', description: 'two-touch', category: 'small_sided', profile, aiEstimated: true });
  });

  it('treats a missing aiEstimated as false and rejects non-boolean values', () => {
    expect(validateCustomDrill({ name: 'a', category: 'small_sided', profile }).aiEstimated).toBe(false);
    for (const bad of ['true', 1, null]) {
      const err = thrown(() => validateCustomDrill({ name: 'a', category: 'small_sided', profile, aiEstimated: bad }));
      expect(err.field).toBe('aiEstimated');
    }
  });

  it('rejects bad names, categories and profiles', () => {
    expect(() => validateCustomDrill({ name: '', category: 'small_sided', profile })).toThrow('Give the drill a name.');
    expect(() => validateCustomDrill({ name: 'x'.repeat(61), category: 'small_sided', profile })).toThrow('60 characters');
    expect(() => validateCustomDrill({ name: 'a', description: 'x'.repeat(501), category: 'small_sided', profile })).toThrow('500 characters');
    expect(() => validateCustomDrill({ name: 'a', category: 'yoga', profile })).toThrow('Choose a category.');
    expect(() => validateMovementProfile({ ...profile, intensity: 11 })).toThrow('Intensity must be a whole number from 1 to 10.');
    expect(() => validateMovementProfile({ ...profile, sprint: 1.2 })).toThrow('Each share must be between 0 and 1.');
    expect(validateMovementProfile({ ...profile, cod: 0.333 }).cod).toBe(0.33);
  });

  it('reports the field for each problem', () => {
    expect(thrown(() => validateCustomDrill({ name: '  ', category: 'small_sided', profile })).field).toBe('name');
    expect(thrown(() => validateCustomDrill({ name: 'a', category: 'yoga', profile })).field).toBe('category');
    expect(thrown(() => validateCustomDrill({ name: 'a', category: 'small_sided', profile: { ...profile, hsr: -0.1 } })).field).toBe('profile');
    expect(thrown(() => validateCustomDrill({ name: 'a', description: 'x'.repeat(501), category: 'small_sided', profile })).field).toBe('description');
  });

  it('rejects a missing profile and shares that are not numbers', () => {
    expect(() => validateCustomDrill({ name: 'a', category: 'small_sided' })).toThrow(ValidationError);
    expect(() => validateMovementProfile({ ...profile, jump: 'lots' })).toThrow('Each share must be between 0 and 1.');
    expect(() => validateMovementProfile({ ...profile, contact: Number.NaN })).toThrow('Each share must be between 0 and 1.');
  });

  it('clamps model output and rejects non-numbers', () => {
    expect(clampMovementProfile({ intensity: 14.6, sprint: -0.2, hsr: 1.7, cod: 0.456, jump: 0, contact: 0, strength: 0 }))
      .toEqual({ intensity: 10, sprint: 0, hsr: 1, cod: 0.46, jump: 0, contact: 0, strength: 0 });
    expect(clampMovementProfile({ ...profile, intensity: 0.2 })?.intensity).toBe(1);
    expect(clampMovementProfile({ ...profile, jump: 'lots' })).toBeNull();
    expect(clampMovementProfile({ ...profile, jump: Number.POSITIVE_INFINITY })).toBeNull();
    expect(clampMovementProfile({ intensity: 5 })).toBeNull();
    expect(clampMovementProfile(null)).toBeNull();
  });

  it('validates estimate requests', () => {
    expect(validateEstimateRequest({ name: 'Grid', description: '4v4' })).toEqual({ name: 'Grid', description: '4v4' });
    expect(validateEstimateRequest({ name: 'Grid' })).toEqual({ name: 'Grid', description: '' });
    expect(() => validateEstimateRequest({ name: ' ', description: '4v4' })).toThrow('Give the drill a name.');
    expect(() => validateEstimateRequest({ name: 'x'.repeat(61), description: '' })).toThrow('60 characters');
    expect(() => validateEstimateRequest({ name: 'a', description: 'x'.repeat(501) })).toThrow('500 characters');
  });

  it('accepts custom keys on sessions', () => {
    const s = validateSession({ date: '2026-10-12', type: 'training', duration: 60, rpe: 6, drills: [{ drillId: `custom:${ID}`, minutes: 20 }] }, '2026-10-12');
    expect(s.drills).toEqual([{ drillId: `custom:${ID}`, minutes: 20 }]);
    expect(() => validateSession({ date: '2026-10-12', type: 'training', duration: 60, rpe: 6, drills: [{ drillId: 'custom:nope', minutes: 20 }] }, '2026-10-12')).toThrow('Choose drills from the list.');
  });
});

describe('validateRecovery', () => {
  const ok = { weekStart: '2026-10-12', sleep: 7.5, soreness: 3, stress: 4, nutrition: 7 };

  it('accepts a valid check-in', () => {
    expect(validateRecovery(ok, TODAY)).toEqual(ok);
  });

  it('requires the week to start on a Monday', () => {
    expect(() => validateRecovery({ ...ok, weekStart: '2026-10-13' }, TODAY)).toThrow(/monday/i);
  });

  it('rounds sleep to the nearest half hour and bounds it', () => {
    expect(validateRecovery({ ...ok, sleep: 7.3 }, TODAY).sleep).toBe(7.5);
    expect(() => validateRecovery({ ...ok, sleep: 13 }, TODAY)).toThrow(/sleep/i);
  });

  it('bounds the 1-10 sliders', () => {
    expect(() => validateRecovery({ ...ok, soreness: 0 }, TODAY)).toThrow(/soreness/i);
    expect(() => validateRecovery({ ...ok, nutrition: 11 }, TODAY)).toThrow(/nutrition/i);
  });
});

describe('validateInjury', () => {
  const ok = { bodyPart: 'Knee (L)', injuryType: 'Tear', severity: 'severe', injuryDate: '2026-03-01', returnDate: '2026-09-01' };

  it('accepts a valid injury', () => {
    expect(validateInjury(ok, TODAY)).toEqual(ok);
  });

  it('treats an empty return date as still recovering', () => {
    expect(validateInjury({ ...ok, returnDate: '' }, TODAY).returnDate).toBeNull();
  });

  it('rejects body parts and types outside the list', () => {
    expect(() => validateInjury({ ...ok, bodyPart: 'Elbow' }, TODAY)).toThrow(ValidationError);
    expect(() => validateInjury({ ...ok, injuryType: '<script>' }, TODAY)).toThrow(ValidationError);
  });

  it('rejects a return before the injury', () => {
    expect(() => validateInjury({ ...ok, returnDate: '2026-02-01' }, TODAY)).toThrow(/return/i);
  });

  it('validates a return-date update against the injury date', () => {
    expect(validateInjuryReturn({ returnDate: '2026-04-01' }, '2026-03-01', TODAY)).toEqual({ returnDate: '2026-04-01' });
    expect(() => validateInjuryReturn({ returnDate: '2026-02-01' }, '2026-03-01', TODAY)).toThrow(/return/i);
  });
});

describe('validateProfile', () => {
  it('requires consent and an age confirmation when creating', () => {
    expect(() => validateProfile({ position: 'MID', consent: false, ageConfirmed: true }, { creating: true })).toThrow(/consent/i);
    expect(() => validateProfile({ position: 'MID', consent: true, ageConfirmed: false }, { creating: true })).toThrow(/age/i);
  });

  it('accepts a position and optional display name', () => {
    expect(validateProfile({ position: 'FWD', displayName: '  Sam  ', consent: true, ageConfirmed: true }, { creating: true })).toEqual({
      position: 'FWD',
      displayName: 'Sam',
    });
  });

  it('allows partial updates without consent fields', () => {
    expect(validateProfile({ displayName: 'Ade' }, { creating: false })).toEqual({ displayName: 'Ade' });
  });

  it('rejects unknown positions and long names', () => {
    expect(() => validateProfile({ position: 'STRIKER' }, { creating: false })).toThrow(ValidationError);
    expect(() => validateProfile({ displayName: 'x'.repeat(41) }, { creating: false })).toThrow(/name/i);
  });
});

describe('validateEquipment', () => {
  it('accepts either field', () => {
    expect(validateEquipment({ cleatType: 'AG' })).toEqual({ cleatType: 'AG' });
    expect(validateEquipment({ surfaceType: '3G_TURF' })).toEqual({ surfaceType: '3G_TURF' });
  });

  it('rejects empty or unknown updates', () => {
    expect(() => validateEquipment({})).toThrow(ValidationError);
    expect(() => validateEquipment({ cleatType: 'SPIKES' })).toThrow(ValidationError);
  });
});

describe('validateDashboardOrder', () => {
  it('accepts a list of tile ids and returns it as sent', () => {
    expect(validateDashboardOrder({ order: ['score', 'load_chart', 'tile_3'] })).toEqual(['score', 'load_chart', 'tile_3']);
  });

  it('accepts an empty list, which means the default order', () => {
    expect(validateDashboardOrder({ order: [] })).toEqual([]);
  });

  it('accepts exactly the most tiles allowed, and no more', () => {
    const ids = Array.from({ length: MAX_DASHBOARD_TILES }, (_, i) => `tile_${i}`);
    expect(MAX_DASHBOARD_TILES).toBe(30);
    expect(validateDashboardOrder({ order: ids })).toEqual(ids);
    expect(() => validateDashboardOrder({ order: [...ids, 'one_more'] })).toThrow(ValidationError);
  });

  it('names the order field in its errors', () => {
    expect(thrown(() => validateDashboardOrder({ order: ['Score'] })).field).toBe('order');
    expect(thrown(() => validateDashboardOrder({ order: ['score', 'score'] })).field).toBe('order');
    expect(thrown(() => validateDashboardOrder({})).field).toBe('order');
  });

  it('rejects a body that is not an object holding a list', () => {
    for (const body of [null, undefined, 'score', 7, ['score']]) {
      expect(() => validateDashboardOrder(body)).toThrow(/JSON object/);
    }
    for (const order of [undefined, null, 'score', 7, true, { 0: 'score' }]) {
      expect(() => validateDashboardOrder({ order })).toThrow(/list/i);
    }
  });

  it('rejects ids that are not lowercase letters, digits and underscores starting with a letter', () => {
    const bad = ['', 'a', 'Score', '1score', '_score', 'two words', 'with-dash', 'café', 'x'.repeat(31), '__proto__', 'a.b', 'a/b', 'a;b', 'ab\n'];
    for (const id of bad) expect(() => validateDashboardOrder({ order: [id] }), id).toThrow(ValidationError);
  });

  it('accepts the shortest and longest ids', () => {
    expect(validateDashboardOrder({ order: ['ab', 'a'.repeat(30)] })).toEqual(['ab', 'a'.repeat(30)]);
  });

  it('rejects entries that are not text', () => {
    for (const id of [null, undefined, 5, true, {}, ['score']]) {
      expect(() => validateDashboardOrder({ order: [id] })).toThrow(ValidationError);
    }
  });

  it('rejects a tile listed twice', () => {
    expect(() => validateDashboardOrder({ order: ['score', 'load_chart', 'score'] })).toThrow(/once/i);
  });

  it('does not change the list it was given', () => {
    const order = ['score', 'load_chart'];
    const result = validateDashboardOrder({ order });
    expect(result).not.toBe(order);
    expect(order).toEqual(['score', 'load_chart']);
  });
});

describe('requireId', () => {
  it('accepts UUIDs only', () => {
    expect(requireId('0b9f4f3c-6a4e-4a8e-9a1d-2f6c1c1b7e2a')).toBe('0b9f4f3c-6a4e-4a8e-9a1d-2f6c1c1b7e2a');
    expect(() => requireId('../users')).toThrow(ValidationError);
  });
});
