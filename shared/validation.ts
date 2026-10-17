// Input validation shared by the browser forms and the Worker API.
// Reject-on-invalid: values are coerced only where the form sends strings.
import { CUSTOM_DESCRIPTION_MAX, CUSTOM_NAME_MAX, customDrillIdFromKey } from './custom-drills';
import { addDays, isIsoDate, isMonday } from './dates';
import { DRILL_CATEGORIES, DRILL_IDS, type DrillCategory } from './drills';
import type { CleatType, MovementProfile, Position, SessionDrill, SessionType, Severity, SurfaceType } from './types';

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const POSITIONS: readonly Position[] = ['GK', 'DEF', 'MID', 'FWD'];
export const SESSION_TYPES: readonly SessionType[] = ['training', 'match', 'gym'];
export const SEVERITIES: readonly Severity[] = ['mild', 'moderate', 'severe'];
export const CLEATS: readonly CleatType[] = ['FG_BLADED', 'FG_CONICAL', 'AG', 'SG', 'MG', 'INDOOR'];
export const SURFACES: readonly SurfaceType[] = ['NATURAL_GOOD', 'NATURAL_POOR', '3G_TURF', '2G_TURF', 'HARD_GROUND', 'INDOOR'];
export const BODY_PARTS: readonly string[] = [
  'Head', 'Neck', 'Shoulder (L)', 'Shoulder (R)', 'Wrist (L)', 'Wrist (R)', 'Lower back', 'Groin',
  'Hip (L)', 'Hip (R)', 'Quadriceps (L)', 'Quadriceps (R)', 'Hamstring (L)', 'Hamstring (R)',
  'Knee (L)', 'Knee (R)', 'Calf (L)', 'Calf (R)', 'Ankle (L)', 'Ankle (R)', 'Foot (L)', 'Foot (R)',
];
export const INJURY_TYPES: readonly string[] = ['Strain', 'Sprain', 'Tear', 'Fracture', 'Contusion', 'Other'];

const EARLIEST_DATE = '1990-01-01';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = Record<string, unknown>;

function asObject(raw: unknown): Raw {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Expected a JSON object.');
  }
  return raw as Raw;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, label: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`Choose a valid ${label}.`, field);
  }
  return value as T;
}

function integer(value: unknown, min: number, max: number, field: string, label: string): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${label} must be a whole number from ${min} to ${max}.`, field);
  }
  return n;
}

function date(value: unknown, field: string, label: string, today: string, { maxDaysAhead = 1 } = {}): string {
  if (!isIsoDate(value)) throw new ValidationError(`${label}: enter a real date.`, field);
  if (value < EARLIEST_DATE || value > addDays(today, maxDaysAhead)) {
    throw new ValidationError(`${label} is outside the allowed range.`, field);
  }
  return value;
}

function text(value: unknown, maxLength: number, field: string, label: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new ValidationError(`${label} must be text.`, field);
  // Postgres rejects NUL, and control characters have no place in names or notes
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) throw new ValidationError(`${label} contains characters that are not allowed.`, field);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`, field);
  return trimmed;
}

export interface SessionInput {
  date: string;
  type: SessionType;
  duration: number;
  rpe: number;
  notes: string;
  drills?: SessionDrill[];
}

export const MAX_DRILLS_PER_SESSION = 12;
export const MAX_DRILL_MINUTES = 300;

function drills(value: unknown, sessionMinutes: number): SessionDrill[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('Drills must be a list.', 'drills');
  if (value.length > MAX_DRILLS_PER_SESSION) throw new ValidationError(`Add up to ${MAX_DRILLS_PER_SESSION} drills per session.`, 'drills');
  const seen = new Set<string>();
  const out = value.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new ValidationError('Choose drills from the list.', 'drills');
    const r = item as Raw;
    const drillId = typeof r.drillId === 'string' ? r.drillId : '';
    // Custom keys only need the right shape here; the repository checks the player owns them
    if (!DRILL_IDS.has(drillId) && customDrillIdFromKey(drillId) === null) throw new ValidationError('Choose drills from the list.', 'drills');
    if (seen.has(drillId)) throw new ValidationError('Add each drill once, with its total minutes.', 'drills');
    seen.add(drillId);
    return { drillId, minutes: integer(r.minutes, 1, MAX_DRILL_MINUTES, 'drills', 'Drill minutes') };
  });
  const total = out.reduce((sum, d) => sum + d.minutes, 0);
  if (total > sessionMinutes) throw new ValidationError(`Drill minutes add up to ${total}, more than the session's ${sessionMinutes}.`, 'drills');
  return out;
}

export function validateSession(raw: unknown, today: string): SessionInput {
  const r = asObject(raw);
  const duration = integer(r.duration, 1, 300, 'duration', 'Duration');
  return {
    date: date(r.date, 'date', 'Session date', today),
    type: oneOf(r.type, SESSION_TYPES, 'type', 'session type'),
    duration,
    rpe: integer(r.rpe, 1, 10, 'rpe', 'Effort'),
    notes: text(r.notes, 500, 'notes', 'Notes'),
    drills: drills(r.drills, duration),
  };
}

const SHARE_KEYS = ['sprint', 'hsr', 'cod', 'jump', 'contact', 'strength'] as const;
const roundShare = (n: number) => Math.round(n * 100) / 100;

function share(value: unknown, field: string): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) throw new ValidationError('Each share must be between 0 and 1.', field);
  return roundShare(n);
}

export function validateMovementProfile(raw: unknown, field = 'profile'): MovementProfile {
  const r = asObject(raw);
  return {
    intensity: integer(r.intensity, 1, 10, field, 'Intensity'),
    sprint: share(r.sprint, field),
    hsr: share(r.hsr, field),
    cod: share(r.cod, field),
    jump: share(r.jump, field),
    contact: share(r.contact, field),
    strength: share(r.strength, field),
  };
}

/** Forces a model's profile into range. Null when it is not an object of finite numbers. */
export function clampMovementProfile(raw: unknown): MovementProfile | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Raw;
  const isFiniteNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (![r.intensity, ...SHARE_KEYS.map((k) => r[k])].every(isFiniteNumber)) return null;
  const num = (key: string) => r[key] as number; // checked above
  const clampShare = (key: string) => roundShare(Math.min(1, Math.max(0, num(key))));
  return {
    intensity: Math.min(10, Math.max(1, Math.round(num('intensity')))),
    sprint: clampShare('sprint'),
    hsr: clampShare('hsr'),
    cod: clampShare('cod'),
    jump: clampShare('jump'),
    contact: clampShare('contact'),
    strength: clampShare('strength'),
  };
}

function drillName(value: unknown): string {
  const name = text(value, CUSTOM_NAME_MAX, 'name', 'Name');
  if (name === '') throw new ValidationError('Give the drill a name.', 'name');
  return name;
}

export interface CustomDrillInput {
  name: string;
  description: string;
  category: DrillCategory;
  profile: MovementProfile;
  aiEstimated: boolean;
}

export function validateCustomDrill(raw: unknown): CustomDrillInput {
  const r = asObject(raw);
  const name = drillName(r.name);
  const description = text(r.description, CUSTOM_DESCRIPTION_MAX, 'description', 'Description');
  if (typeof r.category !== 'string' || !(DRILL_CATEGORIES as readonly string[]).includes(r.category)) {
    throw new ValidationError('Choose a category.', 'category');
  }
  const profile = validateMovementProfile(r.profile);
  if (r.aiEstimated !== undefined && typeof r.aiEstimated !== 'boolean') {
    throw new ValidationError('The AI estimate flag must be true or false.', 'aiEstimated');
  }
  return { name, description, category: r.category as DrillCategory, profile, aiEstimated: r.aiEstimated ?? false };
}

export interface EstimateRequest {
  name: string;
  description: string;
}

export function validateEstimateRequest(raw: unknown): EstimateRequest {
  const r = asObject(raw);
  return { name: drillName(r.name), description: text(r.description, CUSTOM_DESCRIPTION_MAX, 'description', 'Description') };
}

export interface RecoveryCheckIn {
  weekStart: string;
  sleep: number;
  soreness: number;
  stress: number;
  nutrition: number;
}

export function validateRecovery(raw: unknown, today: string): RecoveryCheckIn {
  const r = asObject(raw);
  const weekStart = date(r.weekStart, 'weekStart', 'Week', today);
  if (!isMonday(weekStart)) throw new ValidationError('The week must start on a Monday.', 'weekStart');

  const sleepRaw = typeof r.sleep === 'string' && r.sleep.trim() !== '' ? Number(r.sleep) : r.sleep;
  if (typeof sleepRaw !== 'number' || !Number.isFinite(sleepRaw) || sleepRaw < 0 || sleepRaw > 12) {
    throw new ValidationError('Sleep must be between 0 and 12 hours.', 'sleep');
  }
  return {
    weekStart,
    sleep: Math.round(sleepRaw * 2) / 2,
    soreness: integer(r.soreness, 1, 10, 'soreness', 'Soreness'),
    stress: integer(r.stress, 1, 10, 'stress', 'Stress'),
    nutrition: integer(r.nutrition, 1, 10, 'nutrition', 'Nutrition'),
  };
}

export interface InjuryInput {
  bodyPart: string;
  injuryType: string;
  severity: Severity;
  injuryDate: string;
  returnDate: string | null;
}

function returnDate(value: unknown, injuryDate: string, today: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  // Planned return dates up to a year ahead are allowed
  const parsed = date(value, 'returnDate', 'Return date', today, { maxDaysAhead: 365 });
  if (parsed < injuryDate) throw new ValidationError('The return date cannot be before the injury date.', 'returnDate');
  return parsed;
}

export function validateInjury(raw: unknown, today: string): InjuryInput {
  const r = asObject(raw);
  const injuryDate = date(r.injuryDate, 'injuryDate', 'Injury date', today);
  return {
    bodyPart: oneOf(r.bodyPart, BODY_PARTS, 'bodyPart', 'body part'),
    injuryType: oneOf(r.injuryType, INJURY_TYPES, 'injuryType', 'injury type'),
    severity: oneOf(r.severity, SEVERITIES, 'severity', 'severity'),
    injuryDate,
    returnDate: returnDate(r.returnDate, injuryDate, today),
  };
}

export function validateInjuryReturn(raw: unknown, injuryDate: string, today: string): { returnDate: string | null } {
  const r = asObject(raw);
  return { returnDate: returnDate(r.returnDate, injuryDate, today) };
}

export interface ProfileInput {
  position?: Position;
  displayName?: string;
}

export function validateProfile(raw: unknown, { creating }: { creating: boolean }): ProfileInput {
  const r = asObject(raw);
  if (creating) {
    if (r.consent !== true) throw new ValidationError('Please give consent for PitchSafe to store your training data.', 'consent');
    if (r.ageConfirmed !== true) throw new ValidationError('Please confirm the age requirement.', 'ageConfirmed');
  }
  const out: ProfileInput = {};
  if (creating || r.position !== undefined) out.position = oneOf(r.position, POSITIONS, 'position', 'position');
  if (r.displayName !== undefined) out.displayName = text(r.displayName, 40, 'displayName', 'Display name');
  return out;
}

export interface EquipmentInput {
  cleatType?: CleatType;
  surfaceType?: SurfaceType;
}

export function validateEquipment(raw: unknown): EquipmentInput {
  const r = asObject(raw);
  const out: EquipmentInput = {};
  if (r.cleatType !== undefined) out.cleatType = oneOf(r.cleatType, CLEATS, 'cleatType', 'cleat type');
  if (r.surfaceType !== undefined) out.surfaceType = oneOf(r.surfaceType, SURFACES, 'surfaceType', 'surface');
  if (Object.keys(out).length === 0) throw new ValidationError('Choose a cleat type or a surface.');
  return out;
}

export function requireId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new ValidationError('Invalid record id.');
  return value.toLowerCase();
}
