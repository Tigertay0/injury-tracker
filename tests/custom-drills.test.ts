import { describe, expect, it } from 'vitest';
import { customDrillIdFromKey, customDrillKey, makeDrillLookup } from '../shared/custom-drills';
import { movementLoad } from '../shared/movement';
import type { CustomDrill } from '../shared/types';

const ID = '3f2a8c1e-9b4d-4e6f-8a2b-1c3d5e7f9a0b';
const drill: CustomDrill = {
  id: ID,
  name: 'Box to box runs',
  description: '',
  category: 'conditioning',
  profile: { intensity: 8, sprint: 0.2, hsr: 0.5, cod: 0, jump: 0, contact: 0, strength: 0 },
  aiEstimated: true,
  archived: true,
  createdAt: '2026-10-17T00:00:00.000Z',
};

describe('custom drill keys', () => {
  it('round-trips custom keys and rejects anything else', () => {
    expect(customDrillKey(ID)).toBe(`custom:${ID}`);
    expect(customDrillIdFromKey(`custom:${ID}`)).toBe(ID);
    for (const bad of ['rondo_4v2', 'custom:', 'custom:not-a-uuid', `custom:${ID.toUpperCase()}`, `x${ID}`]) {
      expect(customDrillIdFromKey(bad)).toBeNull();
    }
  });
});

describe('makeDrillLookup', () => {
  it('looks up built-in and custom drills (archived ones too)', () => {
    const lookup = makeDrillLookup([drill]);
    expect(lookup('rondo_4v2')).toMatchObject({ name: 'Rondo (4v2, 5v2)', custom: false });
    expect(lookup(`custom:${ID}`)).toMatchObject({ name: 'Box to box runs', custom: true, aiEstimated: true, profile: drill.profile });
    expect(lookup('custom:00000000-0000-4000-8000-000000000000')).toBeUndefined();
    expect(makeDrillLookup(undefined)('rondo_4v2')?.custom).toBe(false);
  });

  it('can be passed straight to movementLoad', () => {
    const sessions = [{ id: 's1', date: '2026-10-11', type: 'training' as const, duration: 60, rpe: 5, load: 300, notes: '', drills: [{ drillId: `custom:${ID}`, minutes: 20 }] }];
    const known = movementLoad(sessions, '2026-10-12', makeDrillLookup([drill]));
    expect(known.types.find((t) => t.type === 'sprint')?.thisWeek).toBe(4);
    const unknown = movementLoad(sessions, '2026-10-12', makeDrillLookup([]));
    expect(unknown.types.find((t) => t.type === 'sprint')?.thisWeek).toBe(0);
  });
});
