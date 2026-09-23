// ACWR, Recovery, and Composite Risk Calculation Engines
// Based on PRD §2.1, §2.2, §2.5

// --- ACWR ---
export function calculateSessionLoad(duration, rpe) {
  return duration * rpe;
}

const ACUTE_DAYS = 7;
const CHRONIC_DAYS = 28;
const CHRONIC_WEEKS = CHRONIC_DAYS / 7;

// Stored dates are YYYY-MM-DD local calendar days. new Date('YYYY-MM-DD') would
// parse them as UTC midnight and shift window boundaries for non-UTC users.
function parseLocalDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

// Local midnight at the start of a window covering `days` calendar days, including today
function windowStart(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function sumLoadSince(sessions, days) {
  const start = windowStart(days);
  return sessions
    .filter(s => parseLocalDate(s.date) >= start)
    .reduce((sum, s) => sum + (s.load || s.duration * s.rpe), 0);
}

export function calculateAcuteWorkload(sessions) {
  return sumLoadSince(sessions, ACUTE_DAYS);
}

export function calculateChronicWorkload(sessions) {
  // Average weekly load over 4 weeks
  return sumLoadSince(sessions, CHRONIC_DAYS) / CHRONIC_WEEKS;
}

// True once the session history reaches back into the 4th week of the chronic
// window. With less history, chronic load is under-counted and ACWR is inflated.
function hasFullChronicHistory(sessions) {
  const fourthWeekEnd = windowStart(CHRONIC_DAYS - 7);
  return sessions.some(s => parseLocalDate(s.date) < fourthWeekEnd);
}

export function calculateACWR(sessions) {
  // PRD §2.1: fewer than 4 weeks of data → N/A
  if (!hasFullChronicHistory(sessions)) return null;

  const acute = calculateAcuteWorkload(sessions);
  const chronic = calculateChronicWorkload(sessions);

  if (chronic === 0) return null; // N/A for new users
  return Math.round((acute / chronic) * 100) / 100;
}

export function getACWRZone(acwr) {
  if (acwr === null) return 'N/A';
  if (acwr < 0.8) return 'UNDERTRAINING';
  if (acwr <= 1.3) return 'SWEET_SPOT';
  if (acwr <= 1.5) return 'CAUTION';
  return 'DANGER';
}

export function getACWRRiskScore(acwr) {
  if (acwr === null) return 30;
  const zone = getACWRZone(acwr);
  switch (zone) {
    case 'SWEET_SPOT': return 10;
    case 'UNDERTRAINING': return 40;
    case 'CAUTION': return 50;
    case 'DANGER': return 85;
    default: return 30;
  }
}

// --- Recovery ---
export function calculateSleepScore(hours) {
  if (hours >= 8) return 10;
  if (hours >= 7) return 8;
  if (hours >= 6) return 5;
  return 2;
}

export function calculateRecoveryScore(sleep, soreness, stress, nutrition) {
  const sleepScore = calculateSleepScore(sleep);
  const sorenessScore = 10 - soreness; // inverted
  const stressScore = 10 - stress; // inverted
  const nutritionScore = nutrition; // raw

  return Math.round(((sleepScore + sorenessScore + stressScore + nutritionScore) / 4) * 10) / 10;
}

export function getRecoveryZone(score) {
  if (score >= 7) return 'GOOD';
  if (score >= 4) return 'MODERATE';
  return 'POOR';
}

export function getRecoveryRiskScore(score) {
  const zone = getRecoveryZone(score);
  switch (zone) {
    case 'GOOD': return 10;
    case 'MODERATE': return 45;
    case 'POOR': return 80;
    default: return 45;
  }
}

// --- Composite Risk ---
export function getEquipmentRiskScore(level) {
  switch (level) {
    case 'LOW': return 5;
    case 'MEDIUM': return 40;
    case 'HIGH': return 75;
    case 'VERY_HIGH': return 95;
    default: return 40;
  }
}

export function calculateInjuryMultiplier(injuries) {
  let multiplier = 1.0;
  const sixWeeksAgo = windowStart(42);

  for (const injury of injuries) {
    // Recent injury (within 6 weeks)
    if (parseLocalDate(injury.injuryDate) >= sixWeeksAgo) {
      multiplier += 0.3;
    }
    // Specific injury type multipliers
    const part = (injury.bodyPart || '').toLowerCase();
    const type = (injury.injuryType || '').toLowerCase();

    if (part.includes('knee') && type.includes('tear')) {
      multiplier += 0.4; // ACL tear
    } else if (part.includes('ankle') && injury.severity === 'severe') {
      multiplier += 0.25;
    } else if (part.includes('hamstring')) {
      multiplier += 0.2;
    }
  }

  return Math.min(multiplier, 2.0); // cap at 2.0x
}

export function calculateCompositeScore(acwrRiskScore, recoveryRiskScore, equipmentRiskScore, injuries = []) {
  const base = (acwrRiskScore * 0.45) + (recoveryRiskScore * 0.30) + (equipmentRiskScore * 0.25);
  const multiplier = calculateInjuryMultiplier(injuries);
  return Math.min(Math.round(base * multiplier), 100);
}

export function getCompositeZone(score) {
  if (score <= 30) return 'LOW';
  if (score <= 59) return 'MODERATE';
  if (score <= 79) return 'HIGH';
  return 'VERY_HIGH';
}

export function getRiskColor(zone) {
  switch (zone) {
    case 'LOW':
    case 'SWEET_SPOT':
    case 'GOOD':
      return 'var(--risk-green)';
    case 'MODERATE':
    case 'CAUTION':
    case 'UNDERTRAINING':
      return 'var(--risk-yellow)';
    case 'HIGH':
      return 'var(--risk-orange)';
    case 'VERY_HIGH':
    case 'DANGER':
    case 'POOR':
      return 'var(--risk-red)';
    default:
      return 'var(--outline)';
  }
}

export function getRiskBadgeClass(zone) {
  switch (zone) {
    case 'LOW':
    case 'SWEET_SPOT':
    case 'GOOD':
      return 'risk-badge-low';
    case 'MODERATE':
    case 'CAUTION':
    case 'UNDERTRAINING':
      return 'risk-badge-moderate';
    case 'HIGH':
      return 'risk-badge-high';
    case 'VERY_HIGH':
    case 'DANGER':
    case 'POOR':
      return 'risk-badge-very-high';
    default:
      return '';
  }
}

export function getZoneLabel(zone) {
  switch (zone) {
    case 'LOW': return 'Low Risk';
    case 'SWEET_SPOT': return 'Sweet Spot';
    case 'GOOD': return 'Good';
    case 'MODERATE': return 'Moderate';
    case 'CAUTION': return 'Caution';
    case 'UNDERTRAINING': return 'Undertraining';
    case 'HIGH': return 'High Risk';
    case 'VERY_HIGH': return 'Very High';
    case 'DANGER': return 'Danger';
    case 'POOR': return 'Poor';
    default: return zone || 'N/A';
  }
}
