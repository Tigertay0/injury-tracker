// Domain types shared by the browser app and the Worker API
import type { DrillCategory } from './drills';

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type SessionType = 'training' | 'match' | 'gym';
export type Severity = 'mild' | 'moderate' | 'severe';
export type CleatType = 'FG_BLADED' | 'FG_CONICAL' | 'AG' | 'SG' | 'MG' | 'INDOOR';
export type SurfaceType = 'NATURAL_GOOD' | 'NATURAL_POOR' | '3G_TURF' | '2G_TURF' | 'HARD_GROUND' | 'INDOOR';

export type EquipmentRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type AcwrZone = 'NA' | 'UNDERTRAINING' | 'SWEET_SPOT' | 'CAUTION' | 'DANGER';
export type RecoveryZone = 'GOOD' | 'MODERATE' | 'POOR';
export type CompositeZone = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type InjuryFactor = 'ACL_HISTORY' | 'ANKLE_SPRAIN_HISTORY' | 'HAMSTRING_HISTORY' | 'RECENT_INJURY';

export interface Profile {
  position: Position | null;
  displayName: string;
  cleatType: CleatType | null;
  surfaceType: SurfaceType | null;
  /** Dashboard tile ids in the order the player arranged them; empty means the default order. */
  dashboardOrder: string[];
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  date: string; // YYYY-MM-DD, player's local calendar day
  type: SessionType;
  duration: number; // minutes
  rpe: number; // 1-10
  load: number; // duration x rpe
  notes: string;
  /** Drills done in this session (optional; older sessions have none). */
  drills?: SessionDrill[];
}

export interface RecoveryLog {
  id: string;
  weekStart: string; // Monday, YYYY-MM-DD
  sleep: number;
  soreness: number;
  stress: number;
  nutrition: number;
  score: number; // 0-10, one decimal
}

export interface Injury {
  id: string;
  bodyPart: string;
  injuryType: string;
  severity: Severity;
  injuryDate: string;
  returnDate: string | null;
}

export type MovementType = 'sprint' | 'hsr' | 'cod' | 'jump' | 'contact' | 'strength';

/** How a drill loads the body: typical intensity, and the share of its time in each kind of movement. */
export interface MovementProfile {
  intensity: number; // 1-10
  sprint: number; // 0-1
  hsr: number;
  cod: number;
  jump: number;
  contact: number;
  strength: number;
}

export interface SessionDrill {
  drillId: string;
  minutes: number;
}

/** A drill a Plus player made. Archived drills stay resolvable so old sessions keep their movement load. */
export interface CustomDrill {
  id: string; // uuid
  name: string;
  description: string;
  category: DrillCategory;
  profile: MovementProfile;
  aiEstimated: boolean;
  archived: boolean;
  createdAt: string;
}

export interface AccountStatus {
  plusAvailable: boolean;
  plus: boolean;
}

// One player's data as the app holds it: what GET /overview returns, and what the demo builds
export interface Overview {
  profile: Profile | null;
  sessions: TrainingSession[];
  recovery: RecoveryLog[];
  injuries: Injury[];
  customDrills?: CustomDrill[];
  account?: AccountStatus;
}
