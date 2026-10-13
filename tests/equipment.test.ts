import { describe, expect, it } from 'vitest';
import { equipmentRisk, CLEAT_TYPES, SURFACE_TYPES, saferCleatsFor } from '../shared/equipment';

describe('equipment risk matrix (PRD 2.3.3)', () => {
  it('matches the PRD table for every published cell', () => {
    const expected: Record<string, string[]> = {
      // NATURAL_GOOD, NATURAL_POOR, 3G_TURF, 2G_TURF, HARD_GROUND
      FG_BLADED: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'VERY_HIGH'],
      FG_CONICAL: ['LOW', 'MEDIUM', 'HIGH', 'HIGH', 'VERY_HIGH'],
      AG: ['MEDIUM', 'MEDIUM', 'LOW', 'LOW', 'HIGH'],
      SG: ['LOW', 'LOW', 'VERY_HIGH', 'VERY_HIGH', 'VERY_HIGH'],
      MG: ['MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'HIGH'],
      INDOOR: ['HIGH', 'HIGH', 'HIGH', 'HIGH', 'MEDIUM'],
    };
    const surfaces = ['NATURAL_GOOD', 'NATURAL_POOR', '3G_TURF', '2G_TURF', 'HARD_GROUND'] as const;
    for (const [cleat, row] of Object.entries(expected)) {
      surfaces.forEach((surface, i) => {
        expect(equipmentRisk(cleat as never, surface), `${cleat} on ${surface}`).toBe(row[i]);
      });
    }
  });

  it('rates indoor shoes on an indoor court as low risk', () => {
    expect(equipmentRisk('INDOOR', 'INDOOR')).toBe('LOW');
  });

  it('exposes six cleats and six surfaces', () => {
    expect(CLEAT_TYPES).toHaveLength(6);
    expect(SURFACE_TYPES).toHaveLength(6);
  });

  it('suggests only low-risk cleats for a surface', () => {
    expect(saferCleatsFor('3G_TURF')).toEqual(['AG']);
    expect(saferCleatsFor('NATURAL_GOOD')).toEqual(['FG_BLADED', 'FG_CONICAL', 'SG']);
  });
});
