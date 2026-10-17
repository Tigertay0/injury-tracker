// Custom drills (PitchSafe Plus): how they are keyed on sessions and looked up next to the
// built-in library. Archived drills stay resolvable so old sessions keep their movement load.
import { drillById, type DrillCategory } from './drills';
import type { CustomDrill, MovementProfile } from './types';

export const CUSTOM_DRILL_PREFIX = 'custom:';
export const MAX_CUSTOM_DRILLS = 100;
export const MAX_DAILY_ESTIMATES = 20;
export const CUSTOM_NAME_MAX = 60;
export const CUSTOM_DESCRIPTION_MAX = 500;

const CUSTOM_KEY = /^custom:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** What the AI (or a fallback) suggests for a drill the player described. */
export interface DrillEstimate {
  category: DrillCategory;
  profile: MovementProfile;
  reason: string;
}

export interface DrillInfo {
  name: string;
  category: DrillCategory;
  profile: MovementProfile;
  custom: boolean;
  aiEstimated: boolean;
}

/** Also a valid `DrillLookup`, so it can be passed straight to `movementLoad`. */
export type DrillInfoLookup = (key: string) => DrillInfo | undefined;

/** The id a session stores for a custom drill. */
export function customDrillKey(id: string): string {
  return `${CUSTOM_DRILL_PREFIX}${id}`;
}

/** The uuid inside a custom key, or null for anything that is not `custom:` plus a lowercase uuid. */
export function customDrillIdFromKey(key: string): string | null {
  return CUSTOM_KEY.exec(key)?.[1] ?? null;
}

export function makeDrillLookup(custom: readonly CustomDrill[] | undefined): DrillInfoLookup {
  const byKey = new Map((custom ?? []).map((d) => [customDrillKey(d.id), d]));
  return (key) => {
    const builtIn = drillById(key);
    if (builtIn) return { name: builtIn.name, category: builtIn.category, profile: builtIn.profile, custom: false, aiEstimated: false };
    const drill = byKey.get(key);
    return drill && { name: drill.name, category: drill.category, profile: drill.profile, custom: true, aiEstimated: drill.aiEstimated };
  };
}
