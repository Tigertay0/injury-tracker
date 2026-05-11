// Equipment × Surface Risk Matrix
// Based on PRD §2.3.3

const RISK_MATRIX = {
  'FG_BLADED': {
    'NATURAL_GOOD': 'LOW',
    'NATURAL_POOR': 'MEDIUM',
    '3G_TURF': 'HIGH',
    '2G_TURF': 'VERY_HIGH',
    'HARD_GROUND': 'VERY_HIGH',
    'INDOOR': 'HIGH',
  },
  'FG_CONICAL': {
    'NATURAL_GOOD': 'LOW',
    'NATURAL_POOR': 'MEDIUM',
    '3G_TURF': 'HIGH',
    '2G_TURF': 'HIGH',
    'HARD_GROUND': 'VERY_HIGH',
    'INDOOR': 'HIGH',
  },
  'AG': {
    'NATURAL_GOOD': 'MEDIUM',
    'NATURAL_POOR': 'MEDIUM',
    '3G_TURF': 'LOW',
    '2G_TURF': 'LOW',
    'HARD_GROUND': 'HIGH',
    'INDOOR': 'HIGH',
  },
  'SG': {
    'NATURAL_GOOD': 'LOW',
    'NATURAL_POOR': 'LOW',
    '3G_TURF': 'VERY_HIGH',
    '2G_TURF': 'VERY_HIGH',
    'HARD_GROUND': 'VERY_HIGH',
    'INDOOR': 'VERY_HIGH',
  },
  'MG': {
    'NATURAL_GOOD': 'MEDIUM',
    'NATURAL_POOR': 'MEDIUM',
    '3G_TURF': 'MEDIUM',
    '2G_TURF': 'MEDIUM',
    'HARD_GROUND': 'HIGH',
    'INDOOR': 'MEDIUM',
  },
  'INDOOR': {
    'NATURAL_GOOD': 'HIGH',
    'NATURAL_POOR': 'HIGH',
    '3G_TURF': 'HIGH',
    '2G_TURF': 'HIGH',
    'HARD_GROUND': 'MEDIUM',
    'INDOOR': 'LOW',
  },
};

export function getEquipmentRisk(cleatType, surfaceType) {
  const cleat = RISK_MATRIX[cleatType];
  if (!cleat) return 'MEDIUM';
  return cleat[surfaceType] || 'MEDIUM';
}

export const CLEAT_TYPES = [
  { id: 'FG_BLADED', name: 'Firm Ground (Bladed)', short: 'FG-B', desc: 'Blade-shaped studs for firm natural surfaces' },
  { id: 'FG_CONICAL', name: 'Firm Ground (Conical)', short: 'FG-C', desc: 'Round studs for firm natural surfaces' },
  { id: 'AG', name: 'Artificial Ground', short: 'AG', desc: 'Short studs designed for synthetic turf' },
  { id: 'SG', name: 'Soft Ground', short: 'SG', desc: 'Long metal studs for wet/muddy pitches' },
  { id: 'MG', name: 'Multi-Ground', short: 'MG', desc: 'Versatile studs for mixed surfaces' },
  { id: 'INDOOR', name: 'Indoor / Futsal', short: 'IN', desc: 'Flat rubber sole for indoor courts' },
];

export const SURFACE_TYPES = [
  { id: 'NATURAL_GOOD', name: 'Natural Grass (Good)', desc: 'Well-maintained natural pitch' },
  { id: 'NATURAL_POOR', name: 'Natural Grass (Poor)', desc: 'Worn, uneven, or waterlogged pitch' },
  { id: '3G_TURF', name: '3G Artificial Turf', desc: 'Modern rubber crumb artificial surface' },
  { id: '2G_TURF', name: '2G Artificial Turf', desc: 'Older sand-based artificial surface' },
  { id: 'HARD_GROUND', name: 'Hard Ground', desc: 'Concrete, tarmac, or packed earth' },
  { id: 'INDOOR', name: 'Indoor Court', desc: 'Sports hall or futsal court' },
];

export function getEquipmentRiskExplanation(cleatType, surfaceType, risk) {
  if (risk === 'LOW') return 'This cleat-surface combination has low rotational traction risk.';
  if (risk === 'MEDIUM') return 'Acceptable combination, but not optimal. Consider matching your cleats to your surface.';
  if (risk === 'HIGH') return 'Elevated injury risk. The rotational traction from this combination increases ACL and ankle sprain risk (Livesay et al., 2006).';
  if (risk === 'VERY_HIGH') return 'Significantly elevated injury risk. This cleat-surface mismatch is strongly associated with increased ACL tear and ankle sprain rates. Change cleats immediately (Livesay et al., 2006; Meyers & Barnhill, 2004).';
  return '';
}
