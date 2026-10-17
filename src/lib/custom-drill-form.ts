// The My drills editor: the profile as the player sees and types it (whole percents), and the
// rule for when a saved drill still counts as "estimated by AI".
import type { DrillEstimate } from '@shared/custom-drills';
import type { DrillCategory } from '@shared/drills';
import { MOVEMENT_TYPES } from '@shared/movement';
import type { MovementProfile, MovementType } from '@shared/types';
import { ValidationError } from '@shared/validation';

/** What the player typed in each share box: whole percents, kept as text so a box can be empty. */
export type ShareInputs = Record<MovementType, string>;

export interface ProfileDraft {
  category: DrillCategory | '';
  intensity: number;
  shares: ShareInputs;
  /** What the AI suggested, when the player asked for an estimate. Decides `aiEstimated` and shows the reason. */
  estimate: DrillEstimate | null;
}

export const DEFAULT_INTENSITY = 5;
export const SHARES_ERROR = 'Enter a whole number from 0 to 100 for each kind of movement.';

const WHOLE_PERCENT = /^\d{1,3}$/;

const toPercentText = (share: number) => String(Math.round(share * 100));

const mapShares = (fn: (type: MovementType) => string): ShareInputs => ({
  sprint: fn('sprint'),
  hsr: fn('hsr'),
  cod: fn('cod'),
  jump: fn('jump'),
  contact: fn('contact'),
  strength: fn('strength'),
});

/** The editor for a player who fills in the values themselves. */
export function blankProfile(): ProfileDraft {
  return { category: '', intensity: DEFAULT_INTENSITY, shares: mapShares(() => '0'), estimate: null };
}

/** The editor filled in from an AI estimate. */
export function profileFromEstimate(estimate: DrillEstimate): ProfileDraft {
  return {
    category: estimate.category,
    intensity: estimate.profile.intensity,
    shares: mapShares((type) => toPercentText(estimate.profile[type])),
    estimate,
  };
}

export function isWholePercent(text: string): boolean {
  const trimmed = text.trim();
  return WHOLE_PERCENT.test(trimmed) && Number(trimmed) <= 100;
}

/** The first share box (in display order) that is not a whole number from 0 to 100. */
export function firstInvalidShare(shares: ShareInputs): MovementType | null {
  return MOVEMENT_TYPES.find((type) => !isWholePercent(shares[type])) ?? null;
}

export interface DraftValues {
  category: DrillCategory;
  profile: MovementProfile;
  aiEstimated: boolean;
}

/**
 * The values to save. Percents become shares of 0 to 1 with two decimals. `aiEstimated` is true only
 * when the category, intensity and all six shares equal the estimate's exactly.
 */
export function draftToValues(draft: ProfileDraft): DraftValues {
  if (draft.category === '') throw new ValidationError('Choose a category.', 'category');
  if (firstInvalidShare(draft.shares) !== null) throw new ValidationError(SHARES_ERROR, 'shares');
  const share = (type: MovementType) => Math.round(Number(draft.shares[type].trim())) / 100;
  const profile: MovementProfile = {
    intensity: draft.intensity,
    sprint: share('sprint'),
    hsr: share('hsr'),
    cod: share('cod'),
    jump: share('jump'),
    contact: share('contact'),
    strength: share('strength'),
  };
  const { estimate } = draft;
  const aiEstimated =
    estimate !== null &&
    draft.category === estimate.category &&
    profile.intensity === estimate.profile.intensity &&
    MOVEMENT_TYPES.every((type) => profile[type] === estimate.profile[type]);
  return { category: draft.category, profile, aiEstimated };
}
