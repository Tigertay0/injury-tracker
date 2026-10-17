import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, requirePlus, type Deps } from '../worker/app';
import { CUSTOM_DRILL_LIMIT, NO_ROWS, RepoError, UNKNOWN_DRILL, type Overview, type PlayerRepo } from '../worker/repo';
import { recoveryScore } from '../shared/calculations';
import { MAX_CUSTOM_DRILLS, MAX_DAILY_ESTIMATES, customDrillIdFromKey, type DrillEstimate } from '../shared/custom-drills';
import { DrillEstimateError } from '../worker/drill-estimate-error';
import type { CustomDrill, Injury, Profile, RecoveryLog, TrainingSession } from '../shared/types';

const TODAY = '2026-10-12';
const TOKENS: Record<string, { userId: string; plus: boolean }> = {
  'token-a': { userId: 'user_a', plus: false },
  'token-b': { userId: 'user_b', plus: false },
  'token-plus': { userId: 'user_plus', plus: true },
};

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

function call(method: string, path: string, { token = 'token-a', body, headers: extra }: { token?: string | null; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...extra };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return app.request(`/api${path}`, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
}

async function onboard(token = 'token-a') {
  return call('POST', '/me', { token, body: { position: 'MID', consent: true, ageConfirmed: true } });
}

beforeEach(() => {
  // Some tests lapse the Plus player; start each one with Plus active again
  TOKENS['token-plus'].plus = true;
  store = memoryStore();
  deps = {
    verifyToken: async (t) => TOKENS[t] ?? null,
    repoFor: (_token, userId) => store.repoFor(userId),
    allow: vi.fn(async () => true),
    deleteClerkUser: vi.fn(async () => undefined),
    today: () => TODAY,
    plusEnabled: true,
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

describe('account', () => {
  it('reports a free player as not on Plus', async () => {
    const body = await (await call('GET', '/overview')).json();
    expect(body.account).toEqual({ plusAvailable: true, plus: false });
  });

  it('reports a Plus player from the session token', async () => {
    const body = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(body.account).toEqual({ plusAvailable: true, plus: true });
  });

  it('keeps the rest of the overview intact', async () => {
    const body = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(body).toMatchObject({ profile: null, sessions: [], recovery: [], injuries: [], customDrills: [] });
  });

  it('hides Plus from everyone while the switch is off', async () => {
    app = createApp({ ...deps, plusEnabled: false });
    const body = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(body.account).toEqual({ plusAvailable: false, plus: false });
  });

  it('treats a missing switch as off', async () => {
    const { plusEnabled: _omitted, ...withoutSwitch } = deps;
    app = createApp(withoutSwitch);
    const body = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(body.account).toEqual({ plusAvailable: false, plus: false });
  });
});

// requirePlus guards the paid routes added later; here it runs on a throwaway app, after a
// stand-in for the auth middleware that sets the flag the real one takes from the token
describe('requirePlus', () => {
  const guarded = (plusEnabled: boolean, plus: boolean) => {
    const paid = new Hono<{ Variables: { plus: boolean } }>();
    paid.use('*', async (c, next) => {
      c.set('plus', plus);
      await next();
    });
    paid.get('/paid', requirePlus(plusEnabled), (c) => c.json({ ok: true }));
    return paid;
  };

  it('lets a Plus player through when Plus is on', async () => {
    const res = await guarded(true, true).request('/paid');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('asks a free player to upgrade', async () => {
    const res = await guarded(true, false).request('/paid');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Custom drills need PitchSafe Plus.', code: 'plus_required' });
  });

  it('says Plus is not available yet while the switch is off, even for a Plus token', async () => {
    const res = await guarded(false, true).request('/paid');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'PitchSafe Plus is not available yet.' });
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

describe('custom drills', () => {
  const drill = {
    name: 'Grid 4v4',
    description: 'two-touch',
    category: 'small_sided',
    profile: { intensity: 7, sprint: 0.05, hsr: 0.1, cod: 0.4, jump: 0, contact: 0.2, strength: 0 },
    aiEstimated: false,
  };
  const PLUS_REQUIRED = { error: 'Custom drills need PitchSafe Plus.', code: 'plus_required' };
  const session = (drillId: string) => ({ date: TODAY, type: 'training', duration: 90, rpe: 6, drills: [{ drillId, minutes: 15 }] });
  const create = async (token = 'token-plus') => (await call('POST', '/drills/custom', { token, body: drill })).json();

  it('lets Plus players create custom drills and blocks free players', async () => {
    await onboard('token-plus');
    await onboard('token-a');
    const created = await call('POST', '/drills/custom', { token: 'token-plus', body: drill });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ ...drill, archived: false });
    const free = await call('POST', '/drills/custom', { token: 'token-a', body: drill });
    expect(free.status).toBe(403);
    expect(await free.json()).toEqual(PLUS_REQUIRED);
    const overview = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(overview.customDrills).toHaveLength(1);
  });

  it('answers 403 "not available yet" when Plus is switched off', async () => {
    await onboard('token-plus');
    app = createApp({ ...deps, plusEnabled: false });
    const res = await call('POST', '/drills/custom', { token: 'token-plus', body: drill });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'PitchSafe Plus is not available yet.' });
  });

  it('checks Plus before the body, so a free player with a bad body gets 403', async () => {
    await onboard('token-a');
    const res = await call('POST', '/drills/custom', { token: 'token-a', body: { name: '' } });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(PLUS_REQUIRED);
  });

  it('validates the drill for Plus players with a field-level 400', async () => {
    await onboard('token-plus');
    const res = await call('POST', '/drills/custom', { token: 'token-plus', body: { ...drill, name: '  ' } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Give the drill a name.', field: 'name' });
    expect((await call('POST', '/drills/custom', { token: 'token-plus', body: '{not json' })).status).toBe(400);
  });

  it('asks a Plus player without a profile to finish setting up', async () => {
    const res = await call('POST', '/drills/custom', { token: 'token-plus', body: drill });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/profile/i);
  });

  it("keeps a lapsed player's drills working", async () => {
    await onboard('token-plus');
    const created = await create();
    TOKENS['token-plus'].plus = false;

    const logged = await call('POST', '/sessions', { token: 'token-plus', body: session(`custom:${created.id}`) });
    expect(logged.status).toBe(201);
    const overview = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(overview.account).toEqual({ plusAvailable: true, plus: false });
    expect(overview.customDrills.map((d: CustomDrill) => d.id)).toEqual([created.id]);
    expect(overview.sessions[0].drills).toEqual([{ drillId: `custom:${created.id}`, minutes: 15 }]);

    const again = await call('POST', '/drills/custom', { token: 'token-plus', body: drill });
    expect(again.status).toBe(403);
    expect(await again.json()).toEqual(PLUS_REQUIRED);
  });

  it('rejects unknown custom drills on sessions with 400', async () => {
    await onboard('token-plus');
    const res = await call('POST', '/sessions', { token: 'token-plus', body: session('custom:00000000-0000-4000-8000-0000000000ff') });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Choose drills from the list.', field: 'drills' });
    expect((await (await call('GET', '/overview', { token: 'token-plus' })).json()).sessions).toEqual([]);
  });

  it("rejects another player's custom drill on sessions", async () => {
    await onboard('token-plus');
    await onboard('token-a');
    const created = await create();
    const res = await call('POST', '/sessions', { token: 'token-a', body: session(`custom:${created.id}`) });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('drills');
  });

  it('archives with DELETE even without Plus, then refuses it on new sessions', async () => {
    await onboard('token-plus');
    const created = await create();
    TOKENS['token-plus'].plus = false;
    const res = await call('DELETE', `/drills/custom/${created.id}`, { token: 'token-plus' });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    const overview = await (await call('GET', '/overview', { token: 'token-plus' })).json();
    expect(overview.customDrills[0]).toMatchObject({ id: created.id, archived: true });
    const logged = await call('POST', '/sessions', { token: 'token-plus', body: session(`custom:${created.id}`) });
    expect(logged.status).toBe(400);
  });

  it('answers 404 for unknown drills and 400 for ids that are not UUIDs', async () => {
    await onboard('token-plus');
    const unknown = await call('DELETE', '/drills/custom/00000000-0000-4000-8000-000000000999', { token: 'token-plus' });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: 'Drill not found.' });
    expect((await call('DELETE', '/drills/custom/..%2Fprofiles', { token: 'token-plus' })).status).toBe(400);
  });

  it("cannot archive another player's drill", async () => {
    await onboard('token-plus');
    await onboard('token-a');
    const created = await create();
    expect((await call('DELETE', `/drills/custom/${created.id}`, { token: 'token-a' })).status).toBe(404);
    expect((await call('DELETE', `/drills/custom/${created.id}`, { token: 'token-plus' })).status).toBe(204);
  });

  it('maps the 100-drill limit to 409', async () => {
    await onboard('token-plus');
    for (let i = 0; i < MAX_CUSTOM_DRILLS; i++) {
      expect((await call('POST', '/drills/custom', { token: 'token-plus', body: drill })).status).toBe(201);
    }
    const res = await call('POST', '/drills/custom', { token: 'token-plus', body: drill });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'You can keep up to 100 custom drills. Remove one first.' });
  });

  it('never lets a client decide whether it is Plus', async () => {
    await onboard('token-a');
    const overview = await call('GET', '/overview?plus=1', { token: 'token-a', headers: { 'X-Plus': 'true' } });
    expect((await overview.json()).account.plus).toBe(false);
    const res = await call('POST', '/drills/custom?plus=1', { token: 'token-a', headers: { 'X-Plus': 'true' }, body: { ...drill, plus: true } });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(PLUS_REQUIRED);
  });
});

describe('drill estimates', () => {
  const body = { name: '  Grid 4v4  ', description: 'two-touch, 4 x 4 min' };
  const estimate: DrillEstimate = {
    category: 'small_sided',
    profile: { intensity: 7, sprint: 0.05, hsr: 0.1, cod: 0.4, jump: 0, contact: 0.2, strength: 0 },
    reason: 'Tight grid, many turns.',
  };
  const PLUS_REQUIRED = { error: 'Custom drills need PitchSafe Plus.', code: 'plus_required' };
  const DAILY_LIMIT = { error: "You've used today's 20 AI estimates. Enter the values yourself, or try again tomorrow." };
  const estimateCall = (token = 'token-plus', payload: unknown = body) => call('POST', '/drills/custom/estimate', { token, body: payload });
  const withEstimator = (estimateDrill: Deps['estimateDrill']) => {
    deps.estimateDrill = estimateDrill;
    app = createApp(deps);
  };

  it('returns the estimate to a Plus player, from the trimmed name and description', async () => {
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    const res = await estimateCall();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(estimate);
    expect(estimateDrill).toHaveBeenCalledExactlyOnceWith({ name: 'Grid 4v4', description: 'two-touch, 4 x 4 min' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('blocks free players before anything is spent', async () => {
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    const res = await estimateCall('token-a', { name: '' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(PLUS_REQUIRED);
    expect(estimateDrill).not.toHaveBeenCalled();
    expect(deps.allow).not.toHaveBeenCalledWith('ai', 'user_a');
  });

  it('says Plus is not available yet while the switch is off', async () => {
    deps.estimateDrill = vi.fn(async () => estimate);
    app = createApp({ ...deps, plusEnabled: false });
    const res = await estimateCall();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'PitchSafe Plus is not available yet.' });
    expect(deps.estimateDrill).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After when the AI limiter says no', async () => {
    deps.allow = vi.fn(async (bucket) => bucket !== 'ai');
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    const res = await estimateCall();
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
    expect(await res.json()).toEqual({ error: 'Too many estimates. Wait a minute and try again.' });
    expect(deps.allow).toHaveBeenCalledWith('ai', 'user_plus');
    expect(estimateDrill).not.toHaveBeenCalled();
  });

  it('allows 20 estimates a day and refuses the 21st, counting per day', async () => {
    let day = TODAY;
    deps.today = () => day;
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    for (let i = 0; i < MAX_DAILY_ESTIMATES; i++) expect((await estimateCall()).status).toBe(200);

    const refused = await estimateCall();
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual(DAILY_LIMIT);
    expect(estimateDrill).toHaveBeenCalledTimes(MAX_DAILY_ESTIMATES);
    expect((await estimateCall()).status).toBe(429);

    day = '2026-10-13';
    expect((await estimateCall()).status).toBe(200);
  });

  it('counts each player separately', async () => {
    TOKENS['token-other-plus'] = { userId: 'user_other_plus', plus: true };
    try {
      withEstimator(vi.fn(async () => estimate));
      for (let i = 0; i < MAX_DAILY_ESTIMATES; i++) await estimateCall();
      expect((await estimateCall()).status).toBe(429);
      expect((await estimateCall('token-other-plus')).status).toBe(200);
    } finally {
      delete TOKENS['token-other-plus'];
    }
  });

  it('answers 502 with a friendly message when the estimator fails', async () => {
    withEstimator(vi.fn(async () => { throw new DrillEstimateError('internal detail: model said SECRET'); }));
    const res = await estimateCall();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "We couldn't estimate this drill. Enter the values yourself." });
  });

  it('keeps unexpected estimator failures as a generic 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    withEstimator(vi.fn(async () => { throw new TypeError('kaboom'); }));
    const res = await estimateCall();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong on our side. Try again.' });
  });

  it('answers 503 when no estimator is configured, without using up an estimate', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await estimateCall();
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'AI estimates are not available right now. Enter the values yourself.' });
    }
    withEstimator(vi.fn(async () => estimate));
    for (let i = 0; i < MAX_DAILY_ESTIMATES; i++) expect((await estimateCall()).status).toBe(200);
    expect((await estimateCall()).status).toBe(429);
  });

  it('rejects an invalid body with 400 before the estimator runs or anything is counted', async () => {
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    const noName = await estimateCall('token-plus', { name: '  ', description: 'x' });
    expect(noName.status).toBe(400);
    expect((await noName.json()).field).toBe('name');
    expect((await estimateCall('token-plus', { name: 'a'.repeat(61) })).status).toBe(400);
    expect((await estimateCall('token-plus', { name: 'ok', description: 'a'.repeat(501) })).status).toBe(400);
    expect((await estimateCall('token-plus', '{not json')).status).toBe(400);
    expect((await estimateCall('token-plus', [])).status).toBe(400);
    expect(estimateDrill).not.toHaveBeenCalled();

    for (let i = 0; i < MAX_DAILY_ESTIMATES; i++) expect((await estimateCall()).status).toBe(200);
    expect((await estimateCall()).status).toBe(429);
  });

  it('does not take extra fields from the request into the estimator', async () => {
    const estimateDrill = vi.fn(async () => estimate);
    withEstimator(estimateDrill);
    await estimateCall('token-plus', { name: 'Grid', description: '', userId: 'user_a', email: 'a@b.c', profile: { intensity: 1 } });
    expect(estimateDrill).toHaveBeenCalledExactlyOnceWith({ name: 'Grid', description: '' });
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
