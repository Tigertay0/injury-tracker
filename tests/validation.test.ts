import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  validateSession,
  validateRecovery,
  validateInjury,
  validateInjuryReturn,
  validateProfile,
  validateEquipment,
  requireId,
} from '../shared/validation';

const TODAY = '2026-10-12';

describe('validateSession', () => {
  const ok = { date: '2026-10-11', type: 'match', duration: '90', rpe: 7, notes: ' felt fine ' };

  it('accepts a valid session and coerces numbers', () => {
    expect(validateSession(ok, TODAY)).toEqual({ date: '2026-10-11', type: 'match', duration: 90, rpe: 7, notes: 'felt fine' });
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

describe('requireId', () => {
  it('accepts UUIDs only', () => {
    expect(requireId('0b9f4f3c-6a4e-4a8e-9a1d-2f6c1c1b7e2a')).toBe('0b9f4f3c-6a4e-4a8e-9a1d-2f6c1c1b7e2a');
    expect(() => requireId('../users')).toThrow(ValidationError);
  });
});
