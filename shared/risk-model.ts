// One read-out of a player's risk, used by the dashboard, the coach PDF and the landing demo.
import {
  CHRONIC_DAYS,
  acuteLoad,
  acwrRiskScore,
  acwrZone,
  baselineProgress,
  calculateACWR,
  chronicLoad,
  compositeScore,
  compositeZone,
  dailyLoads,
  equipmentRiskScore,
  injuryMultiplier,
  recoveryRiskScore,
  recoveryZone,
} from './calculations';
import { dayNumber } from './dates';
import { equipmentRisk } from './equipment';
import { fuelNotes, recommendations, type FuelNote, type Recommendation } from './recommendations';
import type { AcwrZone, CompositeZone, EquipmentRisk, Injury, InjuryFactor, Profile, RecoveryLog, RecoveryZone, TrainingSession } from './types';

const RECENT_CHECKIN_DAYS = 14;
const HARD_SESSION_DAYS = 2;
const HARD_RPE = 7;
const MISSING_RECOVERY_RISK = recoveryRiskScore('MODERATE');
const MISSING_EQUIPMENT_RISK = equipmentRiskScore('MEDIUM');

export type Assumption = 'NO_RECENT_CHECKIN' | 'NO_EQUIPMENT';

export interface RiskInput {
  profile: Profile | null;
  sessions: readonly TrainingSession[];
  recovery: readonly RecoveryLog[];
  injuries: readonly Injury[];
}

export interface RiskModel {
  today: string;
  baseline: { daysCovered: number; ready: boolean };
  acwr: number | null;
  acwrZone: AcwrZone;
  acute: number;
  chronic: number;
  days: { date: string; load: number }[];
  recovery: RecoveryLog | null;
  recoveryZone: RecoveryZone | null;
  equipmentRisk: EquipmentRisk | null;
  injury: { value: number; factors: InjuryFactor[] };
  composite: { score: number; zone: CompositeZone } | null;
  assumptions: Assumption[];
  recommendations: Recommendation[];
  fuel: FuelNote[];
}

function latestRecentCheckIn(logs: readonly RecoveryLog[], today: string): RecoveryLog | null {
  const cutoff = dayNumber(today) - RECENT_CHECKIN_DAYS;
  const recent = logs.filter((l) => dayNumber(l.weekStart) > cutoff && dayNumber(l.weekStart) <= dayNumber(today));
  return recent.reduce<RecoveryLog | null>((latest, l) => (!latest || l.weekStart > latest.weekStart ? l : latest), null);
}

export function buildRiskModel(input: RiskInput, today: string): RiskModel {
  const { profile, sessions, injuries } = input;
  const baseline = baselineProgress(sessions, today);
  const acwr = calculateACWR(sessions, today);
  const zone = acwrZone(acwr);

  const recovery = latestRecentCheckIn(input.recovery, today);
  const recZone = recovery ? recoveryZone(recovery.score) : null;

  const equip = profile?.cleatType && profile.surfaceType ? equipmentRisk(profile.cleatType, profile.surfaceType) : null;
  const injury = injuryMultiplier(injuries, today);

  const assumptions: Assumption[] = [];
  if (!recovery) assumptions.push('NO_RECENT_CHECKIN');
  if (!equip) assumptions.push('NO_EQUIPMENT');

  const composite =
    zone === 'NA'
      ? null
      : (() => {
          const score = compositeScore({
            acwrRisk: acwrRiskScore(zone),
            recoveryRisk: recZone ? recoveryRiskScore(recZone) : MISSING_RECOVERY_RISK,
            equipmentRisk: equip ? equipmentRiskScore(equip) : MISSING_EQUIPMENT_RISK,
            multiplier: injury.value,
          });
          return { score, zone: compositeZone(score) };
        })();

  const hardStart = dayNumber(today) - HARD_SESSION_DAYS;
  const hadHardSessionRecently = sessions.some((s) => {
    const d = dayNumber(s.date);
    return d >= hardStart && d <= dayNumber(today) && (s.type === 'match' || s.rpe >= HARD_RPE);
  });

  return {
    today,
    baseline,
    acwr,
    acwrZone: zone,
    acute: acuteLoad(sessions, today),
    chronic: Math.round(chronicLoad(sessions, today)),
    days: dailyLoads(sessions, today, CHRONIC_DAYS),
    recovery,
    recoveryZone: recZone,
    equipmentRisk: equip,
    injury,
    composite,
    assumptions,
    recommendations: recommendations({
      acwrZone: zone,
      recoveryZone: recZone,
      equipmentRisk: equip,
      position: profile?.position ?? null,
      injuryFactors: injury.factors,
    }),
    fuel: fuelNotes({ acwr, recoveryScore: recovery?.score ?? null, hadHardSessionRecently }),
  };
}
