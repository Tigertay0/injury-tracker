// Training load (ACWR), recovery, injury-history and composite risk (PRD 2.1, 2.2, 2.4, 2.5).
// Every function takes `today` so results are deterministic and testable.
import { addDays, dayNumber, daysBetween } from './dates';
import type {
  AcwrZone,
  CompositeZone,
  EquipmentRisk,
  Injury,
  InjuryFactor,
  RecoveryZone,
  TrainingSession,
} from './types';

export const ACUTE_DAYS = 7;
export const CHRONIC_DAYS = 28;
const CHRONIC_WEEKS = CHRONIC_DAYS / ACUTE_DAYS;
const RECENT_INJURY_DAYS = 42;
const MULTIPLIER_CAP = 2;

export function sessionLoad(duration: number, rpe: number): number {
  return duration * rpe;
}

/** Sum of load over the last `days` calendar days, including today. Future-dated sessions are ignored. */
function loadInWindow(sessions: readonly TrainingSession[], today: string, days: number): number {
  const end = dayNumber(today);
  const start = end - (days - 1);
  return sessions.reduce((sum, s) => {
    const d = dayNumber(s.date);
    return d >= start && d <= end ? sum + s.load : sum;
  }, 0);
}

export function acuteLoad(sessions: readonly TrainingSession[], today: string): number {
  return loadInWindow(sessions, today, ACUTE_DAYS);
}

export function chronicLoad(sessions: readonly TrainingSession[], today: string): number {
  return loadInWindow(sessions, today, CHRONIC_DAYS) / CHRONIC_WEEKS;
}

/** How many of the 28 baseline days the player's history covers. */
export function baselineProgress(sessions: readonly TrainingSession[], today: string) {
  if (sessions.length === 0) return { daysCovered: 0, ready: false };
  const oldest = sessions.reduce((min, s) => (s.date < min ? s.date : min), sessions[0].date);
  const daysCovered = Math.min(Math.max(daysBetween(oldest, today) + 1, 0), CHRONIC_DAYS);
  return { daysCovered, ready: daysCovered >= CHRONIC_DAYS };
}

/** ACWR = acute / chronic, or null until there are 4 full weeks of history (PRD 2.1.4). */
export function calculateACWR(sessions: readonly TrainingSession[], today: string): number | null {
  if (!baselineProgress(sessions, today).ready) return null;
  const chronic = chronicLoad(sessions, today);
  if (chronic === 0) return null;
  return Math.round((acuteLoad(sessions, today) / chronic) * 100) / 100;
}

export function acwrZone(acwr: number | null): AcwrZone {
  if (acwr === null) return 'NA';
  if (acwr < 0.8) return 'UNDERTRAINING';
  if (acwr <= 1.3) return 'SWEET_SPOT';
  if (acwr <= 1.5) return 'CAUTION';
  return 'DANGER';
}

export function acwrRiskScore(zone: Exclude<AcwrZone, 'NA'>): number {
  const scores = { SWEET_SPOT: 10, UNDERTRAINING: 40, CAUTION: 50, DANGER: 85 } as const;
  return scores[zone];
}

/** Per-day load for the last `days` days, oldest first. Used by the load chart. */
export function dailyLoads(sessions: readonly TrainingSession[], today: string, days: number) {
  const totals = new Map<string, number>();
  for (const s of sessions) totals.set(s.date, (totals.get(s.date) ?? 0) + s.load);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, load: totals.get(date) ?? 0 };
  });
}

// --- Recovery (PRD 2.2) ---

export function sleepScore(hours: number): number {
  if (hours >= 8) return 10;
  if (hours >= 7) return 8;
  if (hours >= 6) return 5;
  return 2;
}

export interface RecoveryInput {
  sleep: number;
  soreness: number;
  stress: number;
  nutrition: number;
}

export function recoveryScore({ sleep, soreness, stress, nutrition }: RecoveryInput): number {
  const total = sleepScore(sleep) + (10 - soreness) + (10 - stress) + nutrition;
  return Math.round((total / 4) * 10) / 10;
}

export function recoveryZone(score: number): RecoveryZone {
  if (score >= 7) return 'GOOD';
  if (score >= 4) return 'MODERATE';
  return 'POOR';
}

export function recoveryRiskScore(zone: RecoveryZone): number {
  const scores = { GOOD: 10, MODERATE: 45, POOR: 80 } as const;
  return scores[zone];
}

// --- Equipment (PRD 2.5.1 conversions) ---

export function equipmentRiskScore(risk: EquipmentRisk): number {
  const scores = { LOW: 5, MEDIUM: 40, HIGH: 75, VERY_HIGH: 95 } as const;
  return scores[risk];
}

// --- Injury history (PRD 2.4.3) ---

const FACTOR_WEIGHTS: Record<InjuryFactor, number> = {
  ACL_HISTORY: 0.4,
  ANKLE_SPRAIN_HISTORY: 0.25,
  HAMSTRING_HISTORY: 0.2,
  RECENT_INJURY: 0.3,
};

function factorsFor(injury: Injury, today: string): InjuryFactor[] {
  const part = injury.bodyPart.toLowerCase();
  const type = injury.injuryType.toLowerCase();
  const factors: InjuryFactor[] = [];
  if (part.startsWith('knee') && type === 'tear') factors.push('ACL_HISTORY');
  if (part.startsWith('ankle') && type === 'sprain' && injury.severity === 'severe') factors.push('ANKLE_SPRAIN_HISTORY');
  if (part.startsWith('hamstring') && (type === 'strain' || type === 'tear')) factors.push('HAMSTRING_HISTORY');

  const recentStart = dayNumber(today) - (RECENT_INJURY_DAYS - 1);
  const isRecent = [injury.injuryDate, injury.returnDate].some((d) => d !== null && dayNumber(d) >= recentStart);
  if (isRecent) factors.push('RECENT_INJURY');
  return factors;
}

/** Each factor counts once; factors add together and the total is capped at 2.0x. */
export function injuryMultiplier(injuries: readonly Injury[], today: string) {
  const factors = new Set<InjuryFactor>(injuries.flatMap((i) => factorsFor(i, today)));
  const ordered = (Object.keys(FACTOR_WEIGHTS) as InjuryFactor[]).filter((f) => factors.has(f));
  const raw = ordered.reduce((m, f) => m + FACTOR_WEIGHTS[f], 1);
  return { value: Math.min(Math.round(raw * 100) / 100, MULTIPLIER_CAP), factors: ordered };
}

// --- Composite (PRD 2.5) ---

export interface CompositeInput {
  acwrRisk: number;
  recoveryRisk: number;
  equipmentRisk: number;
  multiplier: number;
}

export function compositeScore({ acwrRisk, recoveryRisk, equipmentRisk, multiplier }: CompositeInput): number {
  const base = acwrRisk * 0.45 + recoveryRisk * 0.3 + equipmentRisk * 0.25;
  return Math.min(Math.round(base * multiplier), 100);
}

export function compositeZone(score: number): CompositeZone {
  if (score <= 30) return 'LOW';
  if (score <= 59) return 'MODERATE';
  if (score <= 79) return 'HIGH';
  return 'VERY_HIGH';
}
