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
import { makeDrillLookup } from './custom-drills';
import { dayNumber } from './dates';
import { equipmentRisk } from './equipment';
import { movementLoad, type MovementSummary } from './movement';
import { fuelNotes, recommendations, type FuelNote, type Recommendation } from './recommendations';
import type { AcwrZone, CompositeZone, CustomDrill, EquipmentRisk, Injury, InjuryFactor, Profile, RecoveryLog, RecoveryZone, TrainingSession } from './types';

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
  /** The player's own drills, so sessions that log them count toward movement load. */
  customDrills?: readonly CustomDrill[];
}

export interface RiskModel {
  today: string;
  baseline: { daysCovered: number; ready: boolean };
  acwr: number | null;
  acwrZone: AcwrZone;
  acute: number;
  chronic: number;
  days: { date: string; load: number }[];
  movement: MovementSummary;
  /** The 45% training part of the score: the points used, and whether workload or a movement spike set them. */
  trainingInput: { points: number; source: 'workload' | 'movement' };
  recovery: RecoveryLog | null;
  recoveryZone: RecoveryZone | null;
  equipmentRisk: EquipmentRisk | null;
  injury: { value: number; factors: InjuryFactor[] };
  composite: { score: number; zone: CompositeZone } | null;
  assumptions: Assumption[];
  recommendations: Recommendation[];
  fuel: FuelNote[];
}

// Training input: the worse of the workload ratio and the biggest movement spike. Movement is only
// credited when it is strictly higher. With no workload baseline (zone NA) nothing is scored yet.
function trainingInputFor(zone: AcwrZone, movement: MovementSummary): RiskModel['trainingInput'] {
  if (zone === 'NA') return { points: 0, source: 'workload' };
  const workloadPoints = acwrRiskScore(zone);
  return movement.maxPoints > workloadPoints ? { points: movement.maxPoints, source: 'movement' } : { points: workloadPoints, source: 'workload' };
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
  const movement = movementLoad(sessions, today, makeDrillLookup(input.customDrills));
  const trainingInput = trainingInputFor(zone, movement);

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
            acwrRisk: trainingInput.points,
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
    movement,
    trainingInput,
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
      movementSpike: movement.worst && (movement.worst.level === 'CAUTION' || movement.worst.level === 'DANGER') ? { type: movement.worst.type, level: movement.worst.level } : null,
    }),
    fuel: fuelNotes({ acwr, recoveryScore: recovery?.score ?? null, hadHardSessionRecently }),
  };
}
