// Data access. Every query runs with the player's own Clerk token, so Supabase RLS
// limits it to their rows even if this code had a bug.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Injury, Profile, RecoveryLog, TrainingSession } from '../shared/types';
import type { EquipmentInput, InjuryInput, ProfileInput, RecoveryCheckIn, SessionInput } from '../shared/validation';

export const CONSENT_VERSION = '2026-10';
const MAX_SESSIONS = 500;
const MAX_CHECKINS = 104;
const MAX_INJURIES = 200;

export interface Overview {
  profile: Profile | null;
  sessions: TrainingSession[];
  recovery: RecoveryLog[];
  injuries: Injury[];
}

export interface PlayerRepo {
  overview(): Promise<Overview>;
  getProfile(): Promise<Profile | null>;
  createProfile(input: ProfileInput): Promise<Profile>;
  updateProfile(input: ProfileInput | EquipmentInput): Promise<Profile>;
  deleteAllData(): Promise<void>;
  addSession(input: SessionInput): Promise<TrainingSession>;
  deleteSession(id: string): Promise<boolean>;
  saveCheckIn(input: RecoveryCheckIn): Promise<RecoveryLog>;
  deleteCheckIn(id: string): Promise<boolean>;
  addInjury(input: InjuryInput): Promise<Injury>;
  getInjury(id: string): Promise<Injury | null>;
  setInjuryReturn(id: string, returnDate: string | null): Promise<Injury | null>;
  deleteInjury(id: string): Promise<boolean>;
}

/** Thrown for database failures; `code` is the Postgres error code when there is one. */
export class RepoError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

// --- Row mapping (snake_case in Postgres, camelCase in the app) ---

type Row = Record<string, unknown>;

const PROFILE_COLUMNS = 'position, display_name, cleat_type, surface_type, created_at';
const SESSION_COLUMNS = 'id, session_date, session_type, duration_min, rpe, load, notes';
const CHECKIN_COLUMNS = 'id, week_start, sleep_hours, soreness, stress, nutrition, score';
const INJURY_COLUMNS = 'id, body_part, injury_type, severity, injury_date, return_date';

const toProfile = (r: Row): Profile => ({
  position: (r.position as Profile['position']) ?? null,
  displayName: (r.display_name as string) ?? '',
  cleatType: (r.cleat_type as Profile['cleatType']) ?? null,
  surfaceType: (r.surface_type as Profile['surfaceType']) ?? null,
  createdAt: r.created_at as string,
});

const toSession = (r: Row): TrainingSession => ({
  id: r.id as string,
  date: r.session_date as string,
  type: r.session_type as TrainingSession['type'],
  duration: Number(r.duration_min),
  rpe: Number(r.rpe),
  load: Number(r.load),
  notes: (r.notes as string) ?? '',
});

const toCheckIn = (r: Row): RecoveryLog => ({
  id: r.id as string,
  weekStart: r.week_start as string,
  sleep: Number(r.sleep_hours),
  soreness: Number(r.soreness),
  stress: Number(r.stress),
  nutrition: Number(r.nutrition),
  score: Number(r.score),
});

const toInjury = (r: Row): Injury => ({
  id: r.id as string,
  bodyPart: r.body_part as string,
  injuryType: r.injury_type as string,
  severity: r.severity as Injury['severity'],
  injuryDate: r.injury_date as string,
  returnDate: (r.return_date as string | null) ?? null,
});

function profileColumns(input: ProfileInput | EquipmentInput): Row {
  const row: Row = {};
  if ('position' in input && input.position !== undefined) row.position = input.position;
  if ('displayName' in input && input.displayName !== undefined) row.display_name = input.displayName;
  if ('cleatType' in input && input.cleatType !== undefined) row.cleat_type = input.cleatType;
  if ('surfaceType' in input && input.surfaceType !== undefined) row.surface_type = input.surfaceType;
  return row;
}

interface Result<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

function maybe<R extends Result<unknown>>(result: R): NonNullable<R['data']> | null {
  if (result.error) throw new RepoError(result.error.message, result.error.code);
  return (result.data ?? null) as NonNullable<R['data']> | null;
}

function one<R extends Result<unknown>>(result: R): NonNullable<R['data']> {
  const data = maybe(result);
  if (data === null) throw new RepoError('Expected a row but got none', 'PGRST116');
  return data;
}

function many<R extends Result<unknown[]>>(result: R): NonNullable<R['data']> {
  return (maybe(result) ?? []) as NonNullable<R['data']>;
}

// --- Supabase implementation ---

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function supabaseRepo(config: SupabaseConfig, accessToken: string, userId: string): PlayerRepo {
  const db: SupabaseClient = createClient(config.url, config.publishableKey, {
    accessToken: async () => accessToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    async overview() {
      const [profile, sessions, recovery, injuries] = await Promise.all([
        db.from('profiles').select(PROFILE_COLUMNS).maybeSingle(),
        db.from('training_sessions').select(SESSION_COLUMNS).order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(MAX_SESSIONS),
        db.from('recovery_checkins').select(CHECKIN_COLUMNS).order('week_start', { ascending: false }).limit(MAX_CHECKINS),
        db.from('injuries').select(INJURY_COLUMNS).order('injury_date', { ascending: false }).limit(MAX_INJURIES),
      ]);
      const profileRow = maybe(profile);
      return {
        profile: profileRow ? toProfile(profileRow) : null,
        sessions: many(sessions).map(toSession),
        recovery: many(recovery).map(toCheckIn),
        injuries: many(injuries).map(toInjury),
      };
    },

    async getProfile() {
      const row = maybe(await db.from('profiles').select(PROFILE_COLUMNS).maybeSingle());
      return row ? toProfile(row) : null;
    },

    async createProfile(input) {
      const row = one(
        await db
          .from('profiles')
          .insert({ ...profileColumns(input), consent_version: CONSENT_VERSION, age_confirmed: true })
          .select(PROFILE_COLUMNS)
          .single(),
      );
      return toProfile(row);
    },

    async updateProfile(input) {
      const row = one(await db.from('profiles').update(profileColumns(input)).eq('user_id', userId).select(PROFILE_COLUMNS).single());
      return toProfile(row);
    },

    async deleteAllData() {
      // Sessions, check-ins and injuries cascade from the profile row
      maybe(await db.from('profiles').delete().eq('user_id', userId));
    },

    async addSession(input) {
      const row = one(
        await db
          .from('training_sessions')
          .insert({ session_date: input.date, session_type: input.type, duration_min: input.duration, rpe: input.rpe, notes: input.notes })
          .select(SESSION_COLUMNS)
          .single(),
      );
      return toSession(row);
    },

    async deleteSession(id) {
      const rows = many(await db.from('training_sessions').delete().eq('user_id', userId).eq('id', id).select('id'));
      return rows.length > 0;
    },

    async saveCheckIn(input) {
      const row = one(
        await db
          .from('recovery_checkins')
          .upsert(
            { week_start: input.weekStart, sleep_hours: input.sleep, soreness: input.soreness, stress: input.stress, nutrition: input.nutrition },
            { onConflict: 'user_id,week_start' },
          )
          .select(CHECKIN_COLUMNS)
          .single(),
      );
      return toCheckIn(row);
    },

    async deleteCheckIn(id) {
      const rows = many(await db.from('recovery_checkins').delete().eq('user_id', userId).eq('id', id).select('id'));
      return rows.length > 0;
    },

    async addInjury(input) {
      const row = one(
        await db
          .from('injuries')
          .insert({
            body_part: input.bodyPart,
            injury_type: input.injuryType,
            severity: input.severity,
            injury_date: input.injuryDate,
            return_date: input.returnDate,
          })
          .select(INJURY_COLUMNS)
          .single(),
      );
      return toInjury(row);
    },

    async getInjury(id) {
      const row = maybe(await db.from('injuries').select(INJURY_COLUMNS).eq('user_id', userId).eq('id', id).maybeSingle());
      return row ? toInjury(row) : null;
    },

    async setInjuryReturn(id, returnDate) {
      const row = maybe(await db.from('injuries').update({ return_date: returnDate }).eq('user_id', userId).eq('id', id).select(INJURY_COLUMNS).maybeSingle());
      return row ? toInjury(row) : null;
    },

    async deleteInjury(id) {
      const rows = many(await db.from('injuries').delete().eq('user_id', userId).eq('id', id).select('id'));
      return rows.length > 0;
    },
  };
}
