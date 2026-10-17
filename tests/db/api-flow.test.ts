// End-to-end player journey through the real Hono API and a real Neon database, connected
// as the restricted worker role so row-level security applies exactly as in production.
// Only Clerk is stubbed: the bearer token "t-<id>" stands for the signed-in user <id>. Two apps
// share the database: the default one (Plus not on sale) and one with Plus on whose tokens carry it.
// DATABASE_URL_TEST_WORKER must point at a migrated, non-production branch.
import { afterAll, describe, expect, it } from 'vitest';
import { createApp, type Deps } from '../../worker/app';
import { pingDatabase, postgresRepo } from '../../worker/repo';
import { addDays, mondayOf, utcToday } from '../../shared/dates';

const url = process.env.DATABASE_URL_TEST_WORKER;
// The production Neon endpoint: this suite writes rows, so it must never run there
const PRODUCTION_ENDPOINT = 'ep-young-pine-b7ocxaba';
if (url?.includes(PRODUCTION_ENDPOINT)) throw new Error('DATABASE_URL_TEST_WORKER points at production. Use the dev or test branch.');
const run = url ? describe : describe.skip;

const stamp = Date.now().toString(36);
const A = `user_flow_a_${stamp}`;
const B = `user_flow_b_${stamp}`;
const today = utcToday();
const deletedClerkUsers: string[] = [];

const sharedDeps: Omit<Deps, 'verifyToken'> = {
  repoFor: (_token, userId) => postgresRepo(url!, userId),
  allow: async () => true,
  deleteClerkUser: async (userId) => {
    deletedClerkUsers.push(userId);
  },
  pingDatabase: () => pingDatabase(url!),
};

const app = createApp({
  ...sharedDeps,
  verifyToken: async (token) => (token.startsWith('t-') ? { userId: token.slice(2), plus: false } : null),
});

const plusApp = createApp({
  ...sharedDeps,
  plusEnabled: true,
  verifyToken: async (token) => (token.startsWith('t-') ? { userId: token.slice(2), plus: true } : null),
});

function caller(target: ReturnType<typeof createApp>) {
  return (user: string, method: string, path: string, body?: unknown) =>
    target.request(`/api${path}`, {
      method,
      headers: { Authorization: `Bearer t-${user}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
}

const call = caller(app);
const callPlus = caller(plusApp);

run('Player journey through the API on Neon', () => {
  let sessionId = '';
  let matchId = '';
  let injuryId = '';

  afterAll(async () => {
    // Clean up even if a step failed part way
    await postgresRepo(url!, A).deleteAllData().catch(() => undefined);
    await postgresRepo(url!, B).deleteAllData().catch(() => undefined);
  });

  it('reports the database as healthy', async () => {
    const res = await app.request('/api/health?db=1');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, database: true });
  });

  it('rejects requests without a valid login', async () => {
    expect((await app.request('/api/overview')).status).toBe(401);
  });

  it('starts empty, then creates a profile with consent', async () => {
    const empty = await (await call(A, 'GET', '/overview')).json();
    expect(empty.profile).toBeNull();

    const created = await call(A, 'POST', '/me', { position: 'MID', displayName: 'Flow test', consent: true, ageConfirmed: true });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ position: 'MID', displayName: 'Flow test' });

    expect((await call(A, 'POST', '/me', { position: 'MID', consent: true, ageConfirmed: true })).status).toBe(409);
  });

  it('saves cleats and surface', async () => {
    const res = await call(A, 'PATCH', '/me/equipment', { cleatType: 'FG_BLADED', surfaceType: '3G_TURF' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ cleatType: 'FG_BLADED', surfaceType: '3G_TURF' });
  });

  it('logs sessions with the load worked out by the database', async () => {
    const res = await call(A, 'POST', '/sessions', { date: today, type: 'training', duration: 60, rpe: 7, notes: '', drills: [{ drillId: 'ssg_5v5', minutes: 25 }] });
    expect(res.status).toBe(201);
    const session = await res.json();
    expect(session).toMatchObject({ date: today, load: 420, drills: [{ drillId: 'ssg_5v5', minutes: 25 }] });
    sessionId = session.id;

    const match = await call(A, 'POST', '/sessions', { date: addDays(today, -2), type: 'match', duration: 90, rpe: 8, notes: 'league' });
    expect(match.status).toBe(201);
    const matchSession = await match.json();
    expect(matchSession).toMatchObject({ type: 'match', load: 720, drills: [] });
    matchId = matchSession.id;

    const invalid = await call(A, 'POST', '/sessions', { date: today, type: 'training', duration: 60, rpe: 11 });
    expect(invalid.status).toBe(400);
  });

  it('saves and replaces the weekly recovery check-in', async () => {
    const week = mondayOf(today);
    const first = await call(A, 'PUT', '/recovery', { weekStart: week, sleep: 8, soreness: 2, stress: 3, nutrition: 7 });
    expect(first.status).toBe(200);
    const again = await call(A, 'PUT', '/recovery', { weekStart: week, sleep: 6, soreness: 5, stress: 5, nutrition: 6 });
    expect(again.status).toBe(200);
    const overview = await (await call(A, 'GET', '/overview')).json();
    expect(overview.recovery).toHaveLength(1);
    expect(overview.recovery[0]).toMatchObject({ weekStart: week, sleep: 6 });
  });

  it('records an injury and its return date', async () => {
    const res = await call(A, 'POST', '/injuries', { bodyPart: 'Hamstring (L)', injuryType: 'Strain', severity: 'moderate', injuryDate: addDays(today, -40), returnDate: null });
    expect(res.status).toBe(201);
    injuryId = (await res.json()).id;

    const back = await call(A, 'PATCH', `/injuries/${injuryId}`, { returnDate: addDays(today, -20) });
    expect(back.status).toBe(200);
    expect(await back.json()).toMatchObject({ returnDate: addDays(today, -20) });
  });

  it('shows everything on the overview', async () => {
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o.profile).toMatchObject({ position: 'MID', cleatType: 'FG_BLADED' });
    expect(o.sessions).toHaveLength(2);
    expect(o.sessions.find((s: { id: string }) => s.id === sessionId).drills).toEqual([{ drillId: 'ssg_5v5', minutes: 25 }]);
    expect(o.sessions.find((s: { id: string }) => s.id === matchId).drills).toEqual([]);
    expect(o.injuries).toHaveLength(1);
  });

  it("keeps one player's data away from another", async () => {
    const other = await (await call(B, 'GET', '/overview')).json();
    expect(other).toMatchObject({ profile: null, sessions: [], recovery: [], injuries: [] });
    expect((await call(B, 'DELETE', `/sessions/${sessionId}`)).status).toBe(404);
    expect((await call(B, 'PATCH', `/injuries/${injuryId}`, { returnDate: null })).status).toBe(404);
  });

  it('exports all data as a download', async () => {
    const res = await call(A, 'GET', '/me/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const data = await res.json();
    expect(data.profile).toMatchObject({ consentVersion: expect.any(String) });
    expect(data.sessions).toHaveLength(2);
    expect(data.sessions.find((s: { id: string }) => s.id === sessionId).drills).toEqual([{ drillId: 'ssg_5v5', minutes: 25 }]);
    expect(data.sessions.find((s: { id: string }) => s.id === matchId).drills).toEqual([]);
  });

  it('deletes a session', async () => {
    expect((await call(A, 'DELETE', `/sessions/${sessionId}`)).status).toBe(204);
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o.sessions).toHaveLength(1);
  });

  it('logs a custom drill on a session and still lists it after it is archived', async () => {
    const repo = postgresRepo(url!, A);
    const drill = await repo.addCustomDrill({
      name: 'Grid 4v4',
      description: 'two-touch',
      category: 'small_sided',
      profile: { intensity: 7, sprint: 0.05, hsr: 0.1, cod: 0.4, jump: 0, contact: 0.2, strength: 0 },
      aiEstimated: true,
    });
    const logged = await call(A, 'POST', '/sessions', { date: today, type: 'training', duration: 50, rpe: 6, notes: '', drills: [{ drillId: `custom:${drill.id}`, minutes: 20 }] });
    expect(logged.status).toBe(201);
    const session = await logged.json();
    expect(session.drills).toEqual([{ drillId: `custom:${drill.id}`, minutes: 20 }]);

    expect(await repo.archiveCustomDrill(drill.id)).toBe(true);
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o.customDrills).toContainEqual(expect.objectContaining({ id: drill.id, name: 'Grid 4v4', aiEstimated: true, archived: true }));
    expect(o.sessions.find((s: { id: string }) => s.id === session.id).drills).toEqual([{ drillId: `custom:${drill.id}`, minutes: 20 }]);

    const exported = await (await call(A, 'GET', '/me/export')).json();
    expect(exported.customDrills).toContainEqual(expect.objectContaining({ id: drill.id, archived: true }));
    expect((await (await call(B, 'GET', '/overview')).json()).customDrills).toEqual([]);
  });

  it('lets a Plus player create, use and remove a custom drill over HTTP', async () => {
    const body = {
      name: 'Rondo 5v2',
      description: 'one-touch, 3 x 4 min',
      category: 'small_sided',
      profile: { intensity: 6, sprint: 0, hsr: 0.05, cod: 0.3, jump: 0, contact: 0, strength: 0 },
      aiEstimated: false,
    };
    // Plus is not on sale for the default app, so the route stays closed
    expect((await call(A, 'POST', '/drills/custom', body)).status).toBe(403);

    const created = await callPlus(A, 'POST', '/drills/custom', body);
    expect(created.status).toBe(201);
    const drill = await created.json();
    expect(drill).toMatchObject({ name: 'Rondo 5v2', category: 'small_sided', aiEstimated: false, archived: false });

    const key = `custom:${drill.id}`;
    const logged = await callPlus(A, 'POST', '/sessions', { date: today, type: 'training', duration: 45, rpe: 5, notes: '', drills: [{ drillId: key, minutes: 15 }] });
    expect(logged.status).toBe(201);
    const session = await logged.json();
    expect(session.drills).toEqual([{ drillId: key, minutes: 15 }]);

    const before = await (await callPlus(A, 'GET', '/overview')).json();
    expect(before.account).toEqual({ plusAvailable: true, plus: true });
    expect(before.customDrills).toContainEqual(expect.objectContaining({ id: drill.id, archived: false }));

    expect((await callPlus(A, 'DELETE', `/drills/custom/${drill.id}`)).status).toBe(204);
    expect((await callPlus(A, 'DELETE', `/drills/custom/${crypto.randomUUID()}`)).status).toBe(404);

    const after = await (await callPlus(A, 'GET', '/overview')).json();
    expect(after.customDrills).toContainEqual(expect.objectContaining({ id: drill.id, name: 'Rondo 5v2', archived: true }));
    expect(after.sessions.find((x: { id: string }) => x.id === session.id).drills).toEqual([{ drillId: key, minutes: 15 }]);
    expect((await (await callPlus(B, 'GET', '/overview')).json()).customDrills).toEqual([]);
  });

  it('deletes the account: data first, then the login', async () => {
    const res = await call(A, 'DELETE', '/me');
    expect(res.status).toBe(204);
    expect(deletedClerkUsers).toContain(A);
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o).toMatchObject({ profile: null, sessions: [], recovery: [], injuries: [] });
  });
});
