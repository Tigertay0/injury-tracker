// End-to-end player journey through the real Hono API and a real Neon database, connected
// as the restricted worker role so row-level security applies exactly as in production.
// Only Clerk is stubbed: the bearer token "t-<id>" stands for the signed-in user <id>.
// DATABASE_URL_TEST_WORKER must point at a migrated, non-production branch.
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../worker/app';
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

const app = createApp({
  verifyToken: async (token) => (token.startsWith('t-') ? token.slice(2) : null),
  repoFor: (_token, userId) => postgresRepo(url!, userId),
  allow: async () => true,
  deleteClerkUser: async (userId) => {
    deletedClerkUsers.push(userId);
  },
  pingDatabase: () => pingDatabase(url!),
});

function call(user: string, method: string, path: string, body?: unknown) {
  return app.request(`/api${path}`, {
    method,
    headers: { Authorization: `Bearer t-${user}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

run('Player journey through the API on Neon', () => {
  let sessionId = '';
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
    const res = await call(A, 'POST', '/sessions', { date: today, type: 'training', duration: 60, rpe: 7, notes: '' });
    expect(res.status).toBe(201);
    const session = await res.json();
    expect(session).toMatchObject({ date: today, load: 420 });
    sessionId = session.id;

    const match = await call(A, 'POST', '/sessions', { date: addDays(today, -2), type: 'match', duration: 90, rpe: 8, notes: 'league' });
    expect(match.status).toBe(201);

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
  });

  it('deletes a session', async () => {
    expect((await call(A, 'DELETE', `/sessions/${sessionId}`)).status).toBe(204);
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o.sessions).toHaveLength(1);
  });

  it('deletes the account: data first, then the login', async () => {
    const res = await call(A, 'DELETE', '/me');
    expect(res.status).toBe(204);
    expect(deletedClerkUsers).toContain(A);
    const o = await (await call(A, 'GET', '/overview')).json();
    expect(o).toMatchObject({ profile: null, sessions: [], recovery: [], injuries: [] });
  });
});
