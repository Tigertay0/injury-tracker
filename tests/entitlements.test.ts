import { describe, expect, it } from 'vitest';
import { PLUS_FEATURE, hasUserFeature } from '../worker/entitlements';

describe('PLUS_FEATURE', () => {
  it('names the Clerk Billing feature', () => {
    expect(PLUS_FEATURE).toBe('custom_drills');
  });
});

// Mirrors splitByScope in @clerk/shared (dist/authorization.mjs): scopes u, ou and uo are
// user features, o is organization only, and a malformed list grants nothing.
describe('hasUserFeature', () => {
  it.each([
    ['u:custom_drills', true],
    ['u:other,u:custom_drills', true],
    ['ou:custom_drills', true],
    ['uo:custom_drills', true],
    ['o:custom_drills', false],
    ['', false],
    [undefined, false],
    [42, false],
    ['custom_drills', false],
    ['u:custom_drills_x', false],
    ['u:,,', false],
  ])('hasUserFeature(%j) is %s', (fea, expected) => expect(hasUserFeature(fea, 'custom_drills')).toBe(expected));

  it.each([
    [' u:custom_drills ', true],
    ['u:other, u:custom_drills', true],
    ['o:custom_drills,u:custom_drills', true],
    ['o:custom_drills,u:other', false],
    ['x:custom_drills', false],
    ['u:custom_drills,broken', false],
    ['U:custom_drills', false],
    [null, false],
    [true, false],
    [{}, false],
    [['u:custom_drills'], false],
  ])('hasUserFeature(%j) is %s', (fea, expected) => expect(hasUserFeature(fea, 'custom_drills')).toBe(expected));

  it('never matches an empty feature name', () => {
    expect(hasUserFeature('u:', '')).toBe(false);
    expect(hasUserFeature('u:custom_drills', '')).toBe(false);
  });
});
