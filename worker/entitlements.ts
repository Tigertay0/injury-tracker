// PitchSafe Plus is a paid Clerk Billing plan. Clerk puts the player's features in the
// session token's `fea` claim, so entitlement comes from the verified token, never from
// anything the client sends.

/** The Clerk Billing feature that PitchSafe Plus grants. */
export const PLUS_FEATURE = 'custom_drills';

// Scopes in the claim: `o` organization, `u` user, `ou` and `uo` both
const USER_SCOPES: ReadonlySet<string> = new Set(['u', 'ou', 'uo']);

/**
 * True when the `fea` claim lists `feature` for the user. The claim is a comma list of
 * `scope:value` (for example `u:custom_drills,o:other`). Follows `splitByScope` in
 * @clerk/shared, which rejects the whole claim when any element has no colon; here that
 * means false, so a malformed claim never grants access. Never throws.
 */
export function hasUserFeature(fea: unknown, feature: string): boolean {
  if (typeof fea !== 'string' || fea === '' || feature === '') return false;
  let granted = false;
  for (const element of fea.split(',')) {
    const part = element.trim();
    const colon = part.indexOf(':');
    if (colon === -1) return false;
    if (USER_SCOPES.has(part.slice(0, colon)) && part.slice(colon + 1) === feature) granted = true;
  }
  return granted;
}
