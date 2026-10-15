// PitchSafe API. Every route except /api/health needs a valid Clerk session token.
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { utcToday } from '../shared/dates';
import {
  ValidationError,
  requireId,
  validateEquipment,
  validateInjury,
  validateInjuryReturn,
  validateProfile,
  validateRecovery,
  validateSession,
} from '../shared/validation';
import { NO_ROWS, RepoError, type PlayerRepo } from './repo';

export interface Deps {
  /** Returns the Clerk user id for a valid session token, or null. */
  verifyToken(token: string): Promise<string | null>;
  repoFor(token: string, userId: string): PlayerRepo;
  /** True when the caller is still under the limit for this bucket. */
  allow(bucket: 'read' | 'write', userId: string): Promise<boolean>;
  deleteClerkUser(userId: string): Promise<void>;
  /** Cheap database round trip for monitoring, which also confirms the schema is migrated; no player data involved. */
  pingDatabase?(): Promise<boolean>;
  today?(): string;
}

type Vars = { userId: string; repo: PlayerRepo };
type Ctx = Context<{ Variables: Vars }>;

const MAX_BODY_BYTES = 8 * 1024;
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_PROGRAM_LIMIT = '54000';

function bearerToken(header: string | undefined): string | null {
  const match = header ? /^Bearer\s+(\S+)$/i.exec(header) : null;
  return match ? match[1] : null;
}

// Size is enforced by the bodyLimit middleware, which counts streamed bytes
async function readJson(c: Ctx): Promise<unknown> {
  try {
    return JSON.parse(await c.req.text());
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }
}

export function createApp(deps: Deps) {
  const today = deps.today ?? (() => utcToday());
  const app = new Hono<{ Variables: Vars }>().basePath('/api');

  app.use('*', secureHeaders({ crossOriginResourcePolicy: 'same-origin' }));
  app.use('*', bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: 'Request body is too large.' }, 413) }));

  app.get('/health', async (c) => {
    if (c.req.query('db') === undefined || !deps.pingDatabase) return c.json({ ok: true });
    const database = await deps.pingDatabase().catch((err: unknown) => {
      console.error('[health] database ping failed', { message: err instanceof Error ? err.message : 'unknown', code: (err as { code?: string }).code });
      return false;
    });
    return c.json({ ok: database, database }, database ? 200 : 503);
  });

  // Auth, then per-user rate limit
  app.use('*', async (c, next) => {
    const token = bearerToken(c.req.header('authorization'));
    const userId = token ? await deps.verifyToken(token) : null;
    if (!token || !userId) return c.json({ error: 'Sign in to continue.' }, 401);

    const bucket = c.req.method === 'GET' ? 'read' : 'write';
    if (!(await deps.allow(bucket, userId))) {
      return c.json({ error: 'Too many requests. Wait a minute and try again.' }, 429, { 'Retry-After': '60' });
    }
    c.set('userId', userId);
    c.set('repo', deps.repoFor(token, userId));
    c.header('Cache-Control', 'no-store');
    await next();
  });

  // --- Profile ---

  app.get('/overview', async (c) => c.json(await c.var.repo.overview()));

  app.post('/me', async (c) => {
    const input = validateProfile(await readJson(c), { creating: true });
    const existing = await c.var.repo.getProfile();
    if (existing) return c.json({ error: 'Your profile already exists.' }, 409);
    return c.json(await c.var.repo.createProfile(input), 201);
  });

  app.patch('/me', async (c) => {
    const input = validateProfile(await readJson(c), { creating: false });
    if (Object.keys(input).length === 0) throw new ValidationError('Nothing to update.');
    return c.json(await c.var.repo.updateProfile(input));
  });

  app.patch('/me/equipment', async (c) => {
    const input = validateEquipment(await readJson(c));
    return c.json(await c.var.repo.updateProfile(input));
  });

  app.get('/me/export', async (c) => {
    const data = await c.var.repo.exportAll();
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
    return c.body(body, 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="pitchsafe-export-${today()}.json"`,
    });
  });

  // Deletes every row first; the Clerk account goes only after the data is gone
  app.delete('/me', async (c) => {
    await c.var.repo.deleteAllData();
    try {
      await deps.deleteClerkUser(c.var.userId);
    } catch (err) {
      console.error('[api] data deleted but Clerk user deletion failed', { message: err instanceof Error ? err.message : 'unknown' });
      return c.json({ error: 'Your data was deleted, but we could not remove your login. Try again, or contact us.' }, 502);
    }
    // A request from another tab may have written rows between the two deletes; the
    // token is still valid for a minute, so sweep once more (best effort)
    await c.var.repo.deleteAllData().catch((err: unknown) => {
      console.error('[api] post-delete sweep failed', { message: err instanceof Error ? err.message : 'unknown' });
    });
    return c.body(null, 204);
  });

  // --- Training sessions ---

  app.post('/sessions', async (c) => {
    const input = validateSession(await readJson(c), today());
    return c.json(await c.var.repo.addSession(input), 201);
  });

  app.delete('/sessions/:id', async (c) => {
    const removed = await c.var.repo.deleteSession(requireId(c.req.param('id')));
    return removed ? c.body(null, 204) : c.json({ error: 'Session not found.' }, 404);
  });

  // --- Recovery check-ins (one per week; saving again replaces it) ---

  app.put('/recovery', async (c) => {
    const input = validateRecovery(await readJson(c), today());
    return c.json(await c.var.repo.saveCheckIn(input));
  });

  app.delete('/recovery/:id', async (c) => {
    const removed = await c.var.repo.deleteCheckIn(requireId(c.req.param('id')));
    return removed ? c.body(null, 204) : c.json({ error: 'Check-in not found.' }, 404);
  });

  // --- Injuries ---

  app.post('/injuries', async (c) => {
    const input = validateInjury(await readJson(c), today());
    return c.json(await c.var.repo.addInjury(input), 201);
  });

  app.patch('/injuries/:id', async (c) => {
    const id = requireId(c.req.param('id'));
    const injury = await c.var.repo.getInjury(id);
    if (!injury) return c.json({ error: 'Injury not found.' }, 404);
    const { returnDate } = validateInjuryReturn(await readJson(c), injury.injuryDate, today());
    const updated = await c.var.repo.setInjuryReturn(id, returnDate);
    return updated ? c.json(updated) : c.json({ error: 'Injury not found.' }, 404);
  });

  app.delete('/injuries/:id', async (c) => {
    const removed = await c.var.repo.deleteInjury(requireId(c.req.param('id')));
    return removed ? c.body(null, 204) : c.json({ error: 'Injury not found.' }, 404);
  });

  app.notFound((c) => c.json({ error: 'Not found.' }, 404));

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message, field: err.field }, 400);
    if (err instanceof RepoError && err.code === PG_FOREIGN_KEY_VIOLATION) {
      return c.json({ error: 'Finish setting up your profile first.' }, 409);
    }
    if (err instanceof RepoError && err.code === PG_PROGRAM_LIMIT) {
      return c.json({ error: 'This account has reached its storage limit.' }, 409);
    }
    if (err instanceof RepoError && err.code === NO_ROWS) {
      return c.json({ error: 'Finish setting up your profile first.' }, 404);
    }
    if (err instanceof RepoError && err.code === PG_UNIQUE_VIOLATION) {
      return c.json({ error: 'That record already exists.' }, 409);
    }
    console.error('[api] unhandled error', { path: c.req.path, method: c.req.method, name: err.name, message: err.message, code: err instanceof RepoError ? err.code : undefined });
    return c.json({ error: 'Something went wrong on our side. Try again.' }, 500);
  });

  return app;
}
