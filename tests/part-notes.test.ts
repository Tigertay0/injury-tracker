import { describe, expect, it } from 'vitest';
import type { Injury } from '@shared/types';
import { equipmentNote, injuryNote, recoveryNote } from '@/app/dashboard-tiles/part-notes';

const injury = (returnDate: string | null): Injury => ({
  id: 'i',
  bodyPart: 'Hamstring (L)',
  injuryType: 'Strain',
  severity: 'mild',
  injuryDate: '2026-01-01',
  returnDate,
});

describe('recoveryNote', () => {
  it('names the week of the latest check-in', () => {
    expect(recoveryNote({ weekStart: '2026-10-12' })).toBe('Check-in for the week of Oct 12');
  });

  it('says so when there is no recent check-in', () => {
    expect(recoveryNote(null)).toBe('No check-in in the last two weeks');
  });
});

describe('equipmentNote', () => {
  it('names the cleats and the surface', () => {
    expect(equipmentNote({ cleatType: 'FG_BLADED', surfaceType: '3G_TURF' })).toBe('Firm ground, bladed on 3G artificial turf');
  });

  it('writes a surface name that starts with a word in lower case', () => {
    expect(equipmentNote({ cleatType: 'SG', surfaceType: 'NATURAL_GOOD' })).toBe('Soft ground on natural grass, good');
  });

  it('copes with a missing surface', () => {
    expect(equipmentNote({ cleatType: 'AG', surfaceType: null })).toBe('Artificial ground, surface not set');
  });

  it('says so when the cleats are not set', () => {
    expect(equipmentNote({ cleatType: null, surfaceType: null })).toBe('Cleats not set');
    expect(equipmentNote(null)).toBe('Cleats not set');
  });
});

describe('injuryNote', () => {
  it('counts the injuries on record and those not yet back', () => {
    expect(injuryNote([injury('2026-02-01'), injury(null), injury(null)])).toBe('3 on record, 2 not yet back');
  });

  it('says when everything is healed', () => {
    expect(injuryNote([injury('2026-02-01')])).toBe('1 on record, all back');
  });

  it('says when there is nothing on record', () => {
    expect(injuryNote([])).toBe('No injuries on record');
  });
});
