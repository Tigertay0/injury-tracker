import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type Deps } from '../worker/app';
import { CUSTOM_DRILL_LIMIT, NO_ROWS, RepoError, UNKNOWN_DRILL, type Overview, type PlayerRepo } from '../worker/repo';
import { recoveryScore } from '../shared/calculations';
import { MAX_CUSTOM_DRILLS, customDrillIdFromKey } from '../shared/custom-drills';
import type { CustomDrill, Injury, Profile, RecoveryLog, TrainingSession } from '../shared/types';

const TODAY = '2026-10-12';
const TOKENS: Record<string, string> = { 'token-a': 'user_a', 'token-b': 'user_b' };

// In-memory stand-in for Supabase, keyed by user like RLS would be
function memoryStore() {
  const data = new Map<string, Overview>();
  // AI estimates counted per player per day, like the ai_usage table
  const estimates = new Map<string, number>();
  let seq = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  const forUser = (userId: string) => {
    if (!data.has(userId)) data.set(userId, { profile: null, sessions: [], recovery: [], injuries: [], customDrills: [] });
    return data.get(userId)!;
  };
  const requireProfile = (o: Overview) => {
    if (!o.profile) throw new RepoError('insert or update violates foreign key constraint', '23503');
  };

  const repoFor = (userId: string): PlayerRepo => {
    const o = forUser(userId);
    return {
      overview: async () => structuredClone(o),
      exportAll: async () => structuredClone(o),
      getProfile: async () => o.profile,
      createProfile: async (input) => {
        o.profile = { position: input.position ?? null, displayName: input.displayName ?? '', cleatType: null, surfaceType: null, createdAt: '2026-10-12T00:00:00Z' };
        return o.profile;
      },
      updateProfile: async (input) => {
        if (!o.profile) throw new RepoError('no rows', NO_ROWS);
        o.profile = { ...o.profile, ...(input as Partial<Profile>) };
        return o.profile;
      },
      deleteAllData: async () => {
        data.delete(userId);
        for (const key of [...estimates.keys()]) if (key.startsWith(`${userId}|`)) estimates.delete(key);
      },
      addSession: async (input) => {
        requireProfile(o);
        const customIds = (input.drills ?? []).filter((d) => d.drillId.startsWith('custom:')).map((d) => customDrillIdFromKey(d.drillId));
        const active = new Set((o.customDrills ?? []).filter((d) => !d.archived).map((d) => d.id));
        if (customIds.some((id) => id === null || !active.has(id))) throw new RepoError('Unknown or archived custom drill', UNKNOWN_DRILL);
        const s: TrainingSession = { id: uuid(), ...input, drills: input.drills ?? [], load: input.duration * input.rpe };
        o.sessions.unshift(s);
        return s;
      },
      deleteSession: async (id) => {
        const before = o.sessions.length;
        o.sessions = o.sessions.filter((s) => s.id !== id);
        return o.sessions.length < before;
      },
      saveCheckIn: async (input) => {
        requireProfile(o);
        const existing = o.recovery.find((r) => r.weekStart === input.weekStart);
        const log: RecoveryLog = { id: existing?.id ?? uuid(), ...input, score: recoveryScore(input) };
        o.recovery = [log, ...o.recovery.filter((r) => r.weekStart !== input.weekStart)];
        return log;
      },
      deleteCheckIn: async (id) => {
        const before = o.recovery.length;
        o.recovery = o.recovery.filter((r) => r.id !== id);
        return o.recovery.length < before;
      },
      addInjury: async (input) => {
        requireProfile(o);
        const i: Injury = { id: uuid(), ...input };
        o.injuries.unshift(i);
        return i;
      },
      getInjury: async (id) => o.injuries.find((i) => i.id === id) ?? null,
      setInjuryReturn: async (id, returnDate) => {
        const i = o.injuries.find((x) => x.id === id);
        if (!i) return null;
        i.returnDate = returnDate;
        return i;
      },
      deleteInjury: async (id) => {
        const before = o.injuries.length;
        o.injuries = o.injuries.filter((i) => i.id !== id);
        return o.injuries.length < before;
      },
      addCustomDrill: async (input) => {
        requireProfile(o);
        const drills = (o.customDrills ??= []);
        if (drills.filter((d) => !d.archived).length >= MAX_CUSTOM_DRILLS) throw new RepoError('Too many drills', CUSTOM_DRILL_LIMIT);
        const d: CustomDrill = { id: uuid(), ...input, archived: false, createdAt: '2026-10-12T00:00:00Z' };
        drills.push(d);
        return structuredClone(d);
      },
      archiveCustomDrill: async (id) => {
        const d = o.customDrills?.find((x) => x.id === id);
        if (d) d.archived = true;
        return d !== undefined;
      },
      countEstimate: async (day) => {
        const key = `${userId}|${day}`;
        const n = (estimates.get(key) ?? 0) + 1;
        estimates.set(key, n);
        return n;
      },
    };
  };
  return { data, repoFor };
}

let store: ReturnType<typeof memoryStore>;
let deps: Deps;
let app: ReturnType<typeof createApp>;

function call(method: string, path: string, { token = 'token-a', body }: { token?: string | null; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return app.request(`/api${path}`, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
}

async function onboard(token = 'token-a') {
  return call('POST', '/me', { token, body: { position: 'MID', consent: true, ageConfirmed: true } });
}

beforeEach(() => {
  store = memoryStore();
  deps = {
    verifyToken: async (t) => TOKENS[t] ?? null,
    repoFor: (_token, userId) => store.repoFor(userId),
    allow: vi.fn(async () => true),
    deleteClerkUser: vi.fn(async () => undefined),
    today: () => TODAY,
  };
  app = createApp(deps);
});

describe('auth', () => {
  it('serves health without a token', async () => {
    const res = await call('GET', '/health', { token: null });
    expect(res.status).toBe(200);
  });

  it('rejects missing and invalid tokens', async () => {
    expect((await call('GET', '/overview', { token: null })).status).toBe(401);
    expect((await call('GET', '/overview', { token: 'forged' })).status).toBe(401);
  });

  it('marks API responses as not cacheable', async () => {
    const res = await call('GET', '/overview');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('rate limiting', () => {
  it('returns 429 with Retry-After when the limiter says no', async () => {
    deps.allow = vi.fn(async () => false);
    app = createApp(deps);
    const res = await call('POST', '/sessions', { body: {} });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
  });

  it('uses the write bucket for mutations and read for GET', async () => {
    await call('GET', '/overview');
    await call('DELETE', '/sessions/00000000-0000-4000-8000-000000000001');
    expect(deps.allow).toHaveBeenNthCalledWith(1, 'read', 'user_a');
    expect(deps.allow).toHaveBeenNthCalledWith(2, 'write', 'user_a');
  });
});

describe('profile', () => {
  it('starts with no profile', async () => {
    const body = await (await call('GET', '/overview')).json();
    expect(body.profile).toBeNull();
  });

  it('requires consent to create a profile', async () => {
    const res = await call('POST', '/me', { body: { position: 'MID', consent: false, ageConfirmed: true } });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('consent');
  });

  it('creates once, then refuses a second create', async () => {
    expect((await onboard()).status).toBe(201);
    expect((await onboard()).status).toBe(409);
  });

  it('updates equipment', async () => {
    await onboard();
    const res = await call('PATCH', '/me/equipment', { body: { cleatType: 'AG', surfaceType: '3G_TURF' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ cleatType: 'AG', surfaceType: '3G_TURF' });
  });

  it('returns 404 when updating a profile that does not exist yet', async () => {
    expect((await call('PATCH', '/me', { body: { displayName: 'Ade' } })).status).toBe(404);
  });

  it('sends security headers on API responses', async () => {
    const res = await call('GET', '/health', { token: null });
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rejects an empty profile update', async () => {
    await onboard();
    expect((await call('PATCH', '/me', { body: {} })).status).toBe(400);
  });
});

describe('sessions', () => {
  const valid = { date: '2026-10-11', type: 'training', duration: 75, rpe: 6 };

  it('asks for onboarding before logging', async () => {
    const res = await call('POST', '/sessions', { body: valid });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/profile/i);
  });

  it('logs a session with its load', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: valid });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ load: 450, notes: '' });
  });

  it('stores drills with a session and returns them in the overview', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { date: TODAY, type: 'training', duration: 90, rpe: 6, drills: [{ drillId: 'rondo_4v2', minutes: 15 }] } });
    expect(res.status).toBe(201);
    expect((await res.json()).drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }]);
    const overview = await (await call('GET', '/overview')).json();
    expect(overview.sessions[0].drills).toEqual([{ drillId: 'rondo_4v2', minutes: 15 }]);
  });

  it('rejects drills that do not fit the session', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { date: TODAY, type: 'training', duration: 20, rpe: 6, drills: [{ drillId: 'rondo_4v2', minutes: 30 }] } });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('drills');
  });

  it('returns field-level validation errors', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { ...valid, rpe: 12 } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field: 'rpe' });
  });

  it('rejects malformed JSON and oversized bodies', async () => {
    await onboard();
    expect((await call('POST', '/sessions', { body: '{not json' })).status).toBe(400);
    expect((await call('POST', '/sessions', { body: { ...valid, notes: 'x'.repeat(9000) } })).status).toBe(413);
  });

  it('rejects control characters in notes', async () => {
    await onboard();
    const res = await call('POST', '/sessions', { body: { ...valid, notes: 'tight hamstring' } });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('notes');
  });

  it('rejects non-UUID ids and returns 404 for unknown ones', async () => {
    await onboard();
    expect((await call('DELETE', '/sessions/..%2Fprofiles')).status).toBe(400);
    expect((await call('DELETE', '/sessions/00000000-0000-4000-8000-000000000999')).status).toBe(404);
  });

  it("cannot delete another player's session", async () => {
    await onboard('token-a');
    await onboard('token-b');
    const created = await (await call('POST', '/sessions', { body: valid, token: 'token-a' })).json();
    expect((await call('DELETE', `/sessions/${created.id}`, { token: 'token-b' })).status).toBe(404);
    expect((await call('DELETE', `/sessions/${created.id}`, { token: 'token-a' })).status).toBe(204);
  });
});

describe('recovery', () => {
  it('replaces the check-in when the same week is saved again', async () => {
    await onboard();
    const week = { weekStart: '2026-10-12', sleep: 8, soreness: 2, stress: 3, nutrition: 7 };
    await call('PUT', '/recovery', { body: week });
    const res = await call('PUT', '/recovery', { body: { ...week, sleep: 5 } });
    expect(res.status).toBe(200);
    const overview = await (await call('GET', '/overview')).json();
    expect(overview.recovery).toHaveLength(1);
    expect(overview.recovery[0].sleep).toBe(5);
  });
});

describe('injuries', () => {
  const injury = { bodyPart: 'Hamstring (L)', injuryType: 'Strain', severity: 'moderate', injuryDate: '2026-09-20' };

  it('marks an injury as recovered, validating against the injury date', async () => {
    await onboard();
    const created = await (await call('POST', '/injuries', { body: injury })).json();
    expect(created.returnDate).toBeNull();
    expect((await call('PATCH', `/injuries/${created.id}`, { body: { returnDate: '2026-09-01' } })).status).toBe(400);
    const ok = await call('PATCH', `/injuries/${created.id}`, { body: { returnDate: '2026-10-05' } });
    expect(await ok.json()).toMatchObject({ returnDate: '2026-10-05' });
  });
});

describe('export and delete', () => {
  it('exports all data as a JSON download', async () => {
    await onboard();
    const res = await call('GET', '/me/export');
    expect(res.headers.get('content-disposition')).toContain('pitchsafe-export-2026-10-12.json');
    expect(await res.json()).toMatchObject({ profile: { position: 'MID' } });
  });

  it('deletes data before deleting the Clerk account, then sweeps again', async () => {
    await onboard();
    const order: string[] = [];
    const repo = store.repoFor('user_a');
    deps.repoFor = () => ({ ...repo, deleteAllData: async () => { order.push('data'); await repo.deleteAllData(); } });
    deps.deleteClerkUser = vi.fn(async () => { order.push('clerk'); });
    app = createApp(deps);
    expect((await call('DELETE', '/me')).status).toBe(204);
    expect(order).toEqual(['data', 'clerk', 'data']);
    expect(store.data.has('user_a')).toBe(false);
  });

  it('keeps the Clerk account if deleting data fails', async () => {
    await onboard();
    const repo = store.repoFor('user_a');
    deps.repoFor = () => ({ ...repo, deleteAllData: async () => { throw new RepoError('db down'); } });
    app = createApp(deps);
    expect((await call('DELETE', '/me')).status).toBe(500);
    expect(deps.deleteClerkUser).not.toHaveBeenCalled();
  });

  it('reports a clear error when the data is gone but the login could not be removed', async () => {
    await onboard();
    deps.deleteClerkUser = vi.fn(async () => { throw new Error('clerk down'); });
    app = createApp(deps);
    const res = await call('DELETE', '/me');
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/data was deleted/i);
  });
});
