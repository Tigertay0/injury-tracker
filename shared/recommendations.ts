// Rule-based recommendations (PRD 2.6) and nutrition awareness notes (PRD 2.7).
// No AI here: every line is a fixed rule tied to a published source.
import type { AcwrZone, EquipmentRisk, InjuryFactor, Position, RecoveryZone } from './types';

export type RecommendationCategory = 'Equipment' | 'Training load' | 'Recovery' | 'Position' | 'Injury history';

export interface Recommendation {
  priority: number; // 0 = most urgent
  category: RecommendationCategory;
  text: string;
  citation?: string;
  urgent?: boolean;
}

export interface RecommendationInput {
  acwrZone: AcwrZone;
  recoveryZone: RecoveryZone | null;
  equipmentRisk: EquipmentRisk | null;
  position: Position | null;
  injuryFactors: readonly InjuryFactor[];
}

const MAX_RECOMMENDATIONS = 5;

function loadAdvice(zone: AcwrZone): Recommendation | null {
  switch (zone) {
    case 'DANGER':
      return { priority: 1, category: 'Training load', text: 'Your load this week jumped well above your 4-week average. Cut total training volume by 20 to 30% this week.', citation: 'Gabbett, 2016' };
    case 'CAUTION':
      return { priority: 2, category: 'Training load', text: 'You are close to the danger zone. Hold your load where it is and do not add extra hard sessions this week.', citation: 'Hulin et al., 2016' };
    case 'UNDERTRAINING':
      return { priority: 2, category: 'Training load', text: 'Your load has dropped below your usual level. Build back up by about 10 to 15% a week rather than jumping straight back in.', citation: 'Gabbett, 2016' };
    case 'SWEET_SPOT':
      return { priority: 4, category: 'Training load', text: 'Your load is in the range linked to the lowest injury rates. Keep the same rhythm.', citation: 'Hulin et al., 2016' };
    case 'NA':
      return null;
  }
}

function positionAdvice(position: Position | null, zone: AcwrZone): Recommendation | null {
  const spike = zone === 'DANGER' || zone === 'CAUTION';
  switch (position) {
    case 'MID':
      return spike
        ? { priority: 2, category: 'Position', text: 'Midfielders cover the most ground. Swap one high-intensity session for low-intensity technical work and leave 48 hours between hard sessions.', citation: 'Malone et al., 2019' }
        : { priority: 3, category: 'Position', text: 'Midfielders build fatigue through sheer distance. Keep at least one genuinely easy day between hard sessions.', citation: 'Malone et al., 2019' };
    case 'FWD':
      return spike
        ? { priority: 2, category: 'Position', text: 'Your sprint load is up. Cut sprint-heavy drills by about a quarter this week and add hamstring work to your warm-up.', citation: 'Malone et al., 2019' }
        : { priority: 3, category: 'Position', text: 'Forwards and wingers sprint the most, which strains the hamstrings. Do eccentric hamstring work, such as Nordic curls, twice a week.' };
    case 'DEF':
      return { priority: 3, category: 'Position', text: 'Defenders cut and turn sharply, which stresses the knee. Warm up with lateral movement and landing drills before every session.' };
    case 'GK':
      return { priority: 3, category: 'Position', text: 'Goalkeepers take the most shoulder and wrist impacts. Add shoulder stability and wrist strength work to your warm-up.' };
    default:
      return { priority: 4, category: 'Position', text: 'Add your position in Settings to get advice for the way you play.' };
  }
}

function recoveryAdvice(zone: RecoveryZone | null): Recommendation | null {
  if (zone === 'POOR') return { priority: 1, category: 'Recovery', text: 'Your recovery is low. Aim for 8 or more hours of sleep and take a rest day before your next hard session.', citation: 'Thomas et al., 2016' };
  if (zone === 'MODERATE') return { priority: 2, category: 'Recovery', text: 'Recovery is middling. Protect your sleep and keep today lighter if you feel heavy.', citation: 'Thomas et al., 2016' };
  if (zone === null) return { priority: 3, category: 'Recovery', text: 'Do this week\'s recovery check-in. It takes under a minute and makes your score more accurate.' };
  return null;
}

function equipmentAdvice(risk: EquipmentRisk | null): Recommendation | null {
  if (risk === 'VERY_HIGH') return { priority: 0, category: 'Equipment', urgent: true, text: 'Your cleats grip your usual surface far too hard. Change to surface-matched cleats before your next session.', citation: 'Livesay et al., 2006' };
  if (risk === 'HIGH') return { priority: 1, category: 'Equipment', text: 'Your cleat and surface pairing raises knee and ankle sprain risk. Switch to cleats made for this surface when you can.', citation: 'Meyers & Barnhill, 2004' };
  if (risk === null) return { priority: 3, category: 'Equipment', text: 'Tell us your cleats and usual surface so we can check how well they match.' };
  return null;
}

function historyAdvice(factors: readonly InjuryFactor[]): Recommendation | null {
  if (factors.includes('RECENT_INJURY')) return { priority: 1, category: 'Injury history', text: 'You were injured in the last 6 weeks. Build back gradually and stop if the same area hurts. A physio can confirm you are ready for full training.' };
  if (factors.includes('ACL_HISTORY')) return { priority: 2, category: 'Injury history', text: 'A past knee ligament tear raises the chance of another. Keep doing your strength and landing exercises even when you feel fine.' };
  if (factors.includes('HAMSTRING_HISTORY')) return { priority: 2, category: 'Injury history', text: 'Hamstring strains tend to come back. Keep eccentric hamstring work in your weekly routine.' };
  if (factors.includes('ANKLE_SPRAIN_HISTORY')) return { priority: 2, category: 'Injury history', text: 'After a bad ankle sprain, balance training on one leg helps prevent the next one.' };
  return null;
}

export function recommendations(input: RecommendationInput): Recommendation[] {
  const recs = [
    equipmentAdvice(input.equipmentRisk),
    loadAdvice(input.acwrZone),
    recoveryAdvice(input.recoveryZone),
    historyAdvice(input.injuryFactors),
    positionAdvice(input.position, input.acwrZone),
  ].filter((r): r is Recommendation => r !== null);
  // Array.prototype.sort is stable, so equal priorities keep the order above
  return [...recs].sort((a, b) => a.priority - b.priority).slice(0, MAX_RECOMMENDATIONS);
}

// --- Nutrition awareness (PRD 2.7) ---

export const FUEL_DISCLAIMER =
  'These are general nutrition principles for soccer players from published sports science. Individual needs vary a lot. For personal advice, see a registered sports dietitian.';

export interface FuelNote {
  id: 'HIGH_LOAD' | 'POOR_RECOVERY' | 'POST_SESSION';
  title: string;
  text: string;
  citation: string;
}

export function fuelNotes({ acwr, recoveryScore, hadHardSessionRecently }: { acwr: number | null; recoveryScore: number | null; hadHardSessionRecently: boolean }): FuelNote[] {
  const notes: FuelNote[] = [];
  if (acwr !== null && acwr > 1.3) {
    notes.push({ id: 'HIGH_LOAD', title: 'Heavy week: refuel', text: 'Hard training drains the carbohydrate stored in your muscles. Base meals around rice, pasta, potatoes or bread, and spread protein across the day rather than one big serving.', citation: 'Thomas et al., 2016' });
  }
  if (recoveryScore !== null && recoveryScore < 4) {
    notes.push({ id: 'POOR_RECOVERY', title: 'Low recovery: sleep and fluids', text: 'Poor sleep and under-eating feed each other. Drink regularly through the day and avoid going to bed hungry or right after caffeine.', citation: 'Thomas et al., 2016' });
  }
  if (hadHardSessionRecently) {
    notes.push({ id: 'POST_SESSION', title: 'After a match or hard session', text: 'A meal or snack with both carbohydrate and protein in the first couple of hours after playing helps muscles recover.', citation: 'Thomas et al., 2016' });
  }
  return notes;
}
