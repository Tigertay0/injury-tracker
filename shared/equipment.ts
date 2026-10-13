// Cleat x surface risk matrix (PRD 2.3.3). The INDOOR surface column is not in the
// PRD table; it follows the same rotational-traction reasoning.
import type { CleatType, EquipmentRisk, SurfaceType } from './types';

const MATRIX: Record<CleatType, Record<SurfaceType, EquipmentRisk>> = {
  FG_BLADED: { NATURAL_GOOD: 'LOW', NATURAL_POOR: 'MEDIUM', '3G_TURF': 'HIGH', '2G_TURF': 'VERY_HIGH', HARD_GROUND: 'VERY_HIGH', INDOOR: 'HIGH' },
  FG_CONICAL: { NATURAL_GOOD: 'LOW', NATURAL_POOR: 'MEDIUM', '3G_TURF': 'HIGH', '2G_TURF': 'HIGH', HARD_GROUND: 'VERY_HIGH', INDOOR: 'HIGH' },
  AG: { NATURAL_GOOD: 'MEDIUM', NATURAL_POOR: 'MEDIUM', '3G_TURF': 'LOW', '2G_TURF': 'LOW', HARD_GROUND: 'HIGH', INDOOR: 'HIGH' },
  SG: { NATURAL_GOOD: 'LOW', NATURAL_POOR: 'LOW', '3G_TURF': 'VERY_HIGH', '2G_TURF': 'VERY_HIGH', HARD_GROUND: 'VERY_HIGH', INDOOR: 'VERY_HIGH' },
  MG: { NATURAL_GOOD: 'MEDIUM', NATURAL_POOR: 'MEDIUM', '3G_TURF': 'MEDIUM', '2G_TURF': 'MEDIUM', HARD_GROUND: 'HIGH', INDOOR: 'MEDIUM' },
  INDOOR: { NATURAL_GOOD: 'HIGH', NATURAL_POOR: 'HIGH', '3G_TURF': 'HIGH', '2G_TURF': 'HIGH', HARD_GROUND: 'MEDIUM', INDOOR: 'LOW' },
};

export interface Option<T extends string> {
  id: T;
  name: string;
  short: string;
  description: string;
}

export const CLEAT_TYPES: readonly Option<CleatType>[] = [
  { id: 'FG_BLADED', name: 'Firm ground, bladed', short: 'FG-B', description: 'Blade-shaped studs for dry natural grass' },
  { id: 'FG_CONICAL', name: 'Firm ground, conical', short: 'FG-C', description: 'Round studs for dry natural grass' },
  { id: 'AG', name: 'Artificial ground', short: 'AG', description: 'Many short studs made for synthetic turf' },
  { id: 'SG', name: 'Soft ground', short: 'SG', description: 'Long, often metal studs for wet or muddy grass' },
  { id: 'MG', name: 'Multi-ground', short: 'MG', description: 'Mid-length studs meant for mixed surfaces' },
  { id: 'INDOOR', name: 'Indoor or futsal', short: 'IN', description: 'Flat rubber sole for courts and sports halls' },
];

export const SURFACE_TYPES: readonly Option<SurfaceType>[] = [
  { id: 'NATURAL_GOOD', name: 'Natural grass, good', short: 'Grass', description: 'Even, well-kept natural pitch' },
  { id: 'NATURAL_POOR', name: 'Natural grass, poor', short: 'Worn grass', description: 'Worn, bumpy or waterlogged pitch' },
  { id: '3G_TURF', name: '3G artificial turf', short: '3G', description: 'Long fibres with rubber crumb infill' },
  { id: '2G_TURF', name: '2G artificial turf', short: '2G', description: 'Older, short sand-filled carpet' },
  { id: 'HARD_GROUND', name: 'Hard ground', short: 'Hard', description: 'Concrete, tarmac or baked earth' },
  { id: 'INDOOR', name: 'Indoor court', short: 'Court', description: 'Sports hall or futsal floor' },
];

export function equipmentRisk(cleat: CleatType, surface: SurfaceType): EquipmentRisk {
  return MATRIX[cleat][surface];
}

/** Cleats that are low risk on the given surface, in display order. */
export function saferCleatsFor(surface: SurfaceType): CleatType[] {
  return CLEAT_TYPES.filter((c) => MATRIX[c.id][surface] === 'LOW').map((c) => c.id);
}

export function equipmentExplanation(risk: EquipmentRisk): string {
  switch (risk) {
    case 'LOW':
      return 'These studs release from this surface the way they are designed to. Low rotational grip risk.';
    case 'MEDIUM':
      return 'Workable, but not matched to the surface. Expect more slipping or more grip than ideal.';
    case 'HIGH':
      return 'The studs grip this surface too hard when you twist, which loads the knee and ankle. Linked to more ACL and ankle sprains (Livesay et al., 2006).';
    case 'VERY_HIGH':
      return 'Strong mismatch. Your foot can lock in place while your body turns, a known pattern behind ACL tears and ankle sprains. Change cleats before your next session (Livesay et al., 2006; Meyers & Barnhill, 2004).';
  }
}

export function cleatName(id: CleatType | null): string {
  return CLEAT_TYPES.find((c) => c.id === id)?.name ?? 'Not set';
}

export function surfaceName(id: SurfaceType | null): string {
  return SURFACE_TYPES.find((s) => s.id === id)?.name ?? 'Not set';
}
