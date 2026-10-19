// Data access on Neon Postgres (through Cloudflare Hyperdrive). Each request runs in
// one transaction as the restricted pitchsafe_app role with the verified player id set,
// so row-level security limits every query to that player's rows even if a query
// below forgot its user_id filter.
import pg from 'pg';
import type { DrillCategory } from '../shared/drills';
import { CUSTOM_DRILL_PREFIX, MAX_CUSTOM_DRILLS, customDrillIdFromKey, customDrillKey } from '../shared/custom-drills';
import type { CustomDrill, Injury, Overview, Profile, RecoveryLog, SessionDrill, TrainingSession } from '../shared/types';
import type { CustomDrillInput, EquipmentInput, InjuryInput, ProfileInput, RecoveryCheckIn, SessionInput } from '../shared/validation';

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
  /** Throws CUSTOM_DRILL_LIMIT when the player already has MAX_CUSTOM_DRILLS active drills. */
  addCustomDrill(input: CustomDrillInput): Promise<CustomDrill>;
  /** Idempotent: true for any drill the player owns (archived already or not), false for unknown ids. */
  archiveCustomDrill(id: string): Promise<boolean>;
  /** Counts one AI estimate against `day` (YYYY-MM-DD) and returns that day's new total. */
  countEstimate(day: string): Promise<number>;
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
/** addCustomDrill: the player already has MAX_CUSTOM_DRILLS active drills. */
export const CUSTOM_DRILL_LIMIT = 'CUSTOM_DRILL_LIMIT';
/** addSession: a `custom:` drill is not an active drill of this player. Nothing is saved. */
export const UNKNOWN_DRILL = 'UNKNOWN_DRILL';

// --- Row mapping (snake_case in Postgres, camelCase in the app) ---

type Row = Record<string, unknown>;

const PROFILE_COLUMNS = 'position, display_name, cleat_type, surface_type, created_at';
const SESSION_COLUMNS = 'id, session_date, session_type, duration_min, rpe, load, notes';
const CHECKIN_COLUMNS = 'id, week_start, sleep_hours, soreness, stress, nutrition, score';
const INJURY_COLUMNS = 'id, body_part, injury_type, severity, injury_date, return_date';
const CUSTOM_DRILL_COLUMNS = 'id, name, description, category, intensity, sprint, hsr, cod, jump, contact, strength, ai_estimated, archived_at, created_at';

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

// numeric columns come back from pg as strings, hence Number()
const toCustomDrill = (r: Row): CustomDrill => ({
  id: r.id as string,
  name: r.name as string,
  description: (r.description as string) ?? '',
  category: r.category as DrillCategory,
  profile: {
    intensity: Number(r.intensity),
    sprint: Number(r.sprint),
    hsr: Number(r.hsr),
    cod: Number(r.cod),
    jump: Number(r.jump),
    contact: Number(r.contact),
    strength: Number(r.strength),
  },
  aiEstimated: r.ai_estimated === true,
  archived: r.archived_at !== null && r.archived_at !== undefined,
  createdAt: new Date(r.created_at as string).toISOString(),
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
 * looks the tables up in the catalog, so it reads no player data. `session_drills` comes from
 * migration 0002 and `custom_drills` and `ai_usage` from 0003: if one has not run, the health
 * check fails instead of the drills feature.
 */
export async function pingDatabase(connectionString: string): Promise<boolean> {
  const client = new pg.Client({ connectionString, ...TIMEOUTS });
  try {
    await client.connect();
    const { rows } = await client.query(
      `select to_regclass('public.session_drills') is not null
          and to_regclass('public.custom_drills') is not null
          and to_regclass('public.ai_usage') is not null as ok`,
    );
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
      ? await q(
          'select session_id, drill_id, custom_drill_id, minutes from public.session_drills where user_id = $1 and session_id = any($2::uuid[]) order by created_at, drill_id, custom_drill_id',
          [userId, sessionIds],
        )
      : [];
    const drillsBySession = new Map<string, SessionDrill[]>();
    for (const d of drillRows) {
      const list = drillsBySession.get(d.session_id as string) ?? [];
      // Exactly one of the two columns is set (a check constraint guarantees it)
      const drillId = (d.drill_id as string | null) ?? customDrillKey(d.custom_drill_id as string);
      list.push({ drillId, minutes: Number(d.minutes) });
      drillsBySession.set(d.session_id as string, list);
    }
    const customDrills = await q(`select ${CUSTOM_DRILL_COLUMNS} from public.custom_drills where user_id = $1 order by created_at, id`, [userId]);
    const recovery = await q(`select ${CHECKIN_COLUMNS} from public.recovery_checkins where user_id = $1 order by week_start desc ${limit(caps.recovery)}`, [userId]);
    const injuries = await q(`select ${INJURY_COLUMNS} from public.injuries where user_id = $1 order by injury_date desc ${limit(caps.injuries)}`, [userId]);
    return {
      profile: profile[0] ? toProfile(profile[0]) : null,
      sessions: sessions.map((r) => toSession(r, drillsBySession.get(r.id as string) ?? [])),
      recovery: recovery.map(toCheckIn),
      injuries: injuries.map(toInjury),
      customDrills: customDrills.map(toCustomDrill),
    };
  }

  /** Throws UNKNOWN_DRILL unless every id is an active (not archived) custom drill of this player. */
  async function requireActiveCustomDrills(q: Query, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const rows = await q('select id from public.custom_drills where user_id = $1 and id = any($2::uuid[]) and archived_at is null', [userId, ids]);
    const active = new Set(rows.map((r) => r.id as string));
    if (ids.some((id) => !active.has(id))) throw new RepoError('Unknown or archived custom drill', UNKNOWN_DRILL);
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
        // Sessions (and their drills), check-ins, injuries, custom drills and AI usage cascade from the profile row
        await q('delete from public.profiles where user_id = $1', [userId]);
      }),

    addSession: (input) =>
      run(async (q) => {
        const drills = input.drills ?? [];
        const builtIn = drills.filter((d) => !d.drillId.startsWith(CUSTOM_DRILL_PREFIX));
        const customKeys = drills.filter((d) => d.drillId.startsWith(CUSTOM_DRILL_PREFIX));
        const custom = customKeys.flatMap((d) => {
          const id = customDrillIdFromKey(d.drillId);
          return id ? [{ id, minutes: d.minutes }] : [];
        });
        // Check the custom drills first, in this transaction, so a bad one saves nothing at all
        if (custom.length < customKeys.length) throw new RepoError('Unknown or archived custom drill', UNKNOWN_DRILL);
        await requireActiveCustomDrills(q, custom.map((d) => d.id));

        const session = one(
          await q(
            `insert into public.training_sessions (session_date, session_type, duration_min, rpe, notes)
             values ($1, $2, $3, $4, $5) returning ${SESSION_COLUMNS}`,
            [input.date, input.type, input.duration, input.rpe, input.notes],
          ),
          (r) => r,
        );
        if (builtIn.length > 0) {
          await q(
            `insert into public.session_drills (session_id, drill_id, minutes)
             select $1::uuid, d.drill_id, d.minutes from unnest($2::text[], $3::int[]) as d(drill_id, minutes)`,
            [session.id, builtIn.map((d) => d.drillId), builtIn.map((d) => d.minutes)],
          );
        }
        if (custom.length > 0) {
          await q(
            `insert into public.session_drills (session_id, custom_drill_id, minutes)
             select $1::uuid, d.custom_drill_id, d.minutes from unnest($2::uuid[], $3::int[]) as d(custom_drill_id, minutes)`,
            [session.id, custom.map((d) => d.id), custom.map((d) => d.minutes)],
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

    addCustomDrill: (input) =>
      run(async (q) => {
        // Serialize concurrent adds for this player so the count below can't be stale. The lock is
        // transaction-scoped (released at commit/rollback), so it is safe through pooled connections
        await q("select pg_advisory_xact_lock(hashtext('custom_drills'), hashtext($1))", [userId]);
        const active = await q('select count(*)::int as n from public.custom_drills where user_id = $1 and archived_at is null', [userId]);
        if (Number(active[0]?.n) >= MAX_CUSTOM_DRILLS) {
          throw new RepoError(`You can keep ${MAX_CUSTOM_DRILLS} drills. Archive one to add another.`, CUSTOM_DRILL_LIMIT);
        }
        const p = input.profile;
        return one(
          await q(
            `insert into public.custom_drills (name, description, category, intensity, sprint, hsr, cod, jump, contact, strength, ai_estimated)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning ${CUSTOM_DRILL_COLUMNS}`,
            [input.name, input.description, input.category, p.intensity, p.sprint, p.hsr, p.cod, p.jump, p.contact, p.strength, input.aiEstimated],
          ),
          toCustomDrill,
        );
      }),

    // Archiving twice is fine: the first time stays, so the answer is "does this drill exist"
    archiveCustomDrill: (id) =>
      run(async (q) => (await q('update public.custom_drills set archived_at = coalesce(archived_at, now()) where user_id = $1 and id = $2 returning id', [userId, id])).length > 0),

    countEstimate: (day) =>
      run(async (q) =>
        one(
          await q(
            `insert into public.ai_usage (day, estimates) values ($1, 1)
             on conflict (user_id, day) do update set estimates = least(public.ai_usage.estimates + 1, 1000)
             returning estimates`,
            [day],
          ),
          (r) => Number(r.estimates),
        ),
      ),
  };
}
