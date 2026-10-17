// Data access on Neon Postgres (through Cloudflare Hyperdrive). Each request runs in
// one transaction as the restricted pitchsafe_app role with the verified player id set,
// so row-level security limits every query to that player's rows even if a query
// below forgot its user_id filter.
import pg from 'pg';
import type { Injury, Overview, Profile, RecoveryLog, SessionDrill, TrainingSession } from '../shared/types';
import type { EquipmentInput, InjuryInput, ProfileInput, RecoveryCheckIn, SessionInput } from '../shared/validation';

export const CONSENT_VERSION = '2026-10';
const MAX_SESSIONS = 500;
const MAX_CHECKINS = 104;
const MAX_INJURIES = 200;

export type { Overview };

export interface PlayerRepo {
  overview(): Promise<Overview>;
  /** Everything, without the overview's row caps (data export). */
  exportAll(): Promise<Overview>;
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

/** Thrown for database failures; `code` is the Postgres SQLSTATE when there is one. */
export class RepoError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

export const NO_ROWS = 'NO_ROWS';

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
  createdAt: new Date(r.created_at as string).toISOString(),
});

const toSession = (r: Row, drills: SessionDrill[] = []): TrainingSession => ({
  id: r.id as string,
  date: r.session_date as string,
  type: r.session_type as TrainingSession['type'],
  duration: Number(r.duration_min),
  rpe: Number(r.rpe),
  load: Number(r.load),
  notes: (r.notes as string) ?? '',
  drills,
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

// Keep DATE columns as YYYY-MM-DD strings; pg would otherwise build local-time Dates
const DATE_OID = 1082;
const typeParsers = {
  getTypeParser: (oid: number, format?: 'text' | 'binary') =>
    oid === DATE_OID ? (value: string) => value : pg.types.getTypeParser(oid, format ?? 'text'),
} as unknown as pg.CustomTypesConfig;

// A stalled connection must fail (and be logged) rather than hang the request
const TIMEOUTS = { connectionTimeoutMillis: 5000, query_timeout: 10000 };

type Query = (text: string, values?: unknown[]) => Promise<Row[]>;

/** Runs `fn` in a transaction as pitchsafe_app with app.user_id set to the player. */
export async function asPlayer<T>(connectionString: string, userId: string, fn: (q: Query) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString, types: typeParsers, ...TIMEOUTS });
  try {
    await client.connect();
  } catch (err) {
    throw new RepoError(`Database connection failed: ${err instanceof Error ? err.message : 'unknown'}`, 'CONNECT');
  }
  const q: Query = async (text, values) => (await client.query(text, values)).rows as Row[];
  try {
    await client.query('begin');
    await client.query('set local role pitchsafe_app');
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(q);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    if (err instanceof RepoError) throw err;
    const code = (err as { code?: string }).code;
    throw new RepoError(err instanceof Error ? err.message : 'Database error', code);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Connects as the worker role and checks that the schema this release needs is there. It only
 * looks the table up in the catalog, so it reads no player data. `session_drills` comes from
 * migration 0002: if that has not run, the health check fails instead of the drills feature.
 */
export async function pingDatabase(connectionString: string): Promise<boolean> {
  const client = new pg.Client({ connectionString, ...TIMEOUTS });
  try {
    await client.connect();
    const { rows } = await client.query("select to_regclass('public.session_drills') is not null as ok");
    return rows[0]?.ok === true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function profileAssignments(input: ProfileInput | EquipmentInput): { sql: string; values: unknown[] } {
  const pairs: [string, unknown][] = [];
  if ('position' in input && input.position !== undefined) pairs.push(['position', input.position]);
  if ('displayName' in input && input.displayName !== undefined) pairs.push(['display_name', input.displayName]);
  if ('cleatType' in input && input.cleatType !== undefined) pairs.push(['cleat_type', input.cleatType]);
  if ('surfaceType' in input && input.surfaceType !== undefined) pairs.push(['surface_type', input.surfaceType]);
  // Column names come from the fixed list above, never from input
  return { sql: pairs.map(([col], i) => `${col} = $${i + 2}`).join(', '), values: pairs.map(([, v]) => v) };
}

function one<T>(rows: Row[], map: (r: Row) => T): T {
  if (rows.length === 0) throw new RepoError('Expected a row but got none', NO_ROWS);
  return map(rows[0]);
}

export function postgresRepo(connectionString: string, userId: string): PlayerRepo {
  const run = <T,>(fn: (q: Query) => Promise<T>) => asPlayer(connectionString, userId, fn);

  async function readAll(q: Query, caps: { sessions?: number; recovery?: number; injuries?: number }): Promise<Overview> {
    const limit = (n?: number) => (n ? `limit ${Math.trunc(n)}` : '');
    const profile = await q(`select ${PROFILE_COLUMNS} from public.profiles where user_id = $1`, [userId]);
    const sessions = await q(
      `select ${SESSION_COLUMNS} from public.training_sessions where user_id = $1 order by session_date desc, created_at desc ${limit(caps.sessions)}`,
      [userId],
    );
    const sessionIds = sessions.map((r) => r.id as string);
    const drillRows = sessionIds.length
      ? await q('select session_id, drill_id, minutes from public.session_drills where user_id = $1 and session_id = any($2::uuid[]) order by created_at, drill_id', [userId, sessionIds])
      : [];
    const drillsBySession = new Map<string, SessionDrill[]>();
    for (const d of drillRows) {
      const list = drillsBySession.get(d.session_id as string) ?? [];
      list.push({ drillId: d.drill_id as string, minutes: Number(d.minutes) });
      drillsBySession.set(d.session_id as string, list);
    }
    const recovery = await q(`select ${CHECKIN_COLUMNS} from public.recovery_checkins where user_id = $1 order by week_start desc ${limit(caps.recovery)}`, [userId]);
    const injuries = await q(`select ${INJURY_COLUMNS} from public.injuries where user_id = $1 order by injury_date desc ${limit(caps.injuries)}`, [userId]);
    return {
      profile: profile[0] ? toProfile(profile[0]) : null,
      sessions: sessions.map((r) => toSession(r, drillsBySession.get(r.id as string) ?? [])),
      recovery: recovery.map(toCheckIn),
      injuries: injuries.map(toInjury),
    };
  }

  return {
    overview: () => run((q) => readAll(q, { sessions: MAX_SESSIONS, recovery: MAX_CHECKINS, injuries: MAX_INJURIES })),

    exportAll: () =>
      run(async (q) => {
        const data = await readAll(q, {});
        const consent = await q('select consent_version, consented_at from public.profiles where user_id = $1', [userId]);
        const profile = data.profile && consent[0] ? { ...data.profile, consentVersion: consent[0].consent_version, consentedAt: consent[0].consented_at } : data.profile;
        return { ...data, profile } as Overview;
      }),

    getProfile: () =>
      run(async (q) => {
        const rows = await q(`select ${PROFILE_COLUMNS} from public.profiles where user_id = $1`, [userId]);
        return rows[0] ? toProfile(rows[0]) : null;
      }),

    createProfile: (input) =>
      run(async (q) =>
        one(
          await q(
            `insert into public.profiles (user_id, position, display_name, consent_version, age_confirmed)
             values ($1, $2, $3, $4, true) returning ${PROFILE_COLUMNS}`,
            [userId, input.position ?? null, input.displayName ?? '', CONSENT_VERSION],
          ),
          toProfile,
        ),
      ),

    updateProfile: (input) =>
      run(async (q) => {
        const { sql, values } = profileAssignments(input);
        if (!sql) throw new RepoError('Nothing to update', NO_ROWS);
        return one(await q(`update public.profiles set ${sql} where user_id = $1 returning ${PROFILE_COLUMNS}`, [userId, ...values]), toProfile);
      }),

    deleteAllData: () =>
      run(async (q) => {
        // Sessions, check-ins and injuries cascade from the profile row
        await q('delete from public.profiles where user_id = $1', [userId]);
      }),

    addSession: (input) =>
      run(async (q) => {
        const session = one(
          await q(
            `insert into public.training_sessions (session_date, session_type, duration_min, rpe, notes)
             values ($1, $2, $3, $4, $5) returning ${SESSION_COLUMNS}`,
            [input.date, input.type, input.duration, input.rpe, input.notes],
          ),
          (r) => r,
        );
        const drills = input.drills ?? [];
        if (drills.length > 0) {
          await q(
            `insert into public.session_drills (session_id, drill_id, minutes)
             select $1::uuid, d.drill_id, d.minutes from unnest($2::text[], $3::int[]) as d(drill_id, minutes)`,
            [session.id, drills.map((d) => d.drillId), drills.map((d) => d.minutes)],
          );
        }
        return toSession(session, drills);
      }),

    deleteSession: (id) => run(async (q) => (await q('delete from public.training_sessions where user_id = $1 and id = $2 returning id', [userId, id])).length > 0),

    saveCheckIn: (input) =>
      run(async (q) =>
        one(
          await q(
            `insert into public.recovery_checkins (week_start, sleep_hours, soreness, stress, nutrition)
             values ($1, $2, $3, $4, $5)
             on conflict (user_id, week_start) do update
               set sleep_hours = excluded.sleep_hours, soreness = excluded.soreness,
                   stress = excluded.stress, nutrition = excluded.nutrition
             returning ${CHECKIN_COLUMNS}`,
            [input.weekStart, input.sleep, input.soreness, input.stress, input.nutrition],
          ),
          toCheckIn,
        ),
      ),

    deleteCheckIn: (id) => run(async (q) => (await q('delete from public.recovery_checkins where user_id = $1 and id = $2 returning id', [userId, id])).length > 0),

    addInjury: (input) =>
      run(async (q) =>
        one(
          await q(
            `insert into public.injuries (body_part, injury_type, severity, injury_date, return_date)
             values ($1, $2, $3, $4, $5) returning ${INJURY_COLUMNS}`,
            [input.bodyPart, input.injuryType, input.severity, input.injuryDate, input.returnDate],
          ),
          toInjury,
        ),
      ),

    getInjury: (id) =>
      run(async (q) => {
        const rows = await q(`select ${INJURY_COLUMNS} from public.injuries where user_id = $1 and id = $2`, [userId, id]);
        return rows[0] ? toInjury(rows[0]) : null;
      }),

    setInjuryReturn: (id, returnDate) =>
      run(async (q) => {
        const rows = await q(`update public.injuries set return_date = $3 where user_id = $1 and id = $2 returning ${INJURY_COLUMNS}`, [userId, id, returnDate]);
        return rows[0] ? toInjury(rows[0]) : null;
      }),

    deleteInjury: (id) => run(async (q) => (await q('delete from public.injuries where user_id = $1 and id = $2 returning id', [userId, id])).length > 0),
  };
}
