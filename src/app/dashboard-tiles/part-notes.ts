// The short line under the figure of a score part, written from the player's own records.
import { cleatName, surfaceName } from '@shared/equipment';
import type { CleatType, Injury, Profile, RecoveryLog, SurfaceType } from '@shared/types';
import { fmtDate } from '@/lib/labels';

export function recoveryNote(latest: Pick<RecoveryLog, 'weekStart'> | null): string {
  return latest ? `Check-in for the week of ${fmtDate(latest.weekStart)}` : 'No check-in in the last two weeks';
}

/** "Natural grass, good" reads on a sentence as "natural grass, good"; "3G artificial turf" keeps its capitals. */
const lowerFirst = (name: string) => (/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);

export function equipmentNote(profile: { cleatType: CleatType | null; surfaceType: SurfaceType | null } | Pick<Profile, 'cleatType' | 'surfaceType'> | null | undefined): string {
  if (!profile?.cleatType) return 'Cleats not set';
  const cleats = cleatName(profile.cleatType);
  return profile.surfaceType ? `${cleats} on ${lowerFirst(surfaceName(profile.surfaceType))}` : `${cleats}, surface not set`;
}

export function injuryNote(injuries: readonly Pick<Injury, 'returnDate'>[]): string {
  if (injuries.length === 0) return 'No injuries on record';
  const stillOut = injuries.filter((i) => i.returnDate === null).length;
  return `${injuries.length} on record, ${stillOut > 0 ? `${stillOut} not yet back` : 'all back'}`;
}
