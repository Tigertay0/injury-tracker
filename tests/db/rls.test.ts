// Runs against a real Neon database (a throwaway branch), never production.
// DATABASE_URL_TEST must point at a database where `npm run db:migrate` has run.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { asPlayer, CUSTOM_DRILL_LIMIT, NO_ROWS, postgresRepo, RepoError, UNKNOWN_DRILL } from '../../worker/repo';
import { addDays, mondayOf, utcToday } from '../../shared/dates';
import { MAX_CUSTOM_DRILLS } from '../../shared/custom-drills';
import type { CustomDrillInput } from '../../shared/validation';

const url = process.env.DATABASE_URL_TEST;
const run = url ? describe : describe.skip;

const stamp = Date.now().toString(36);
const A = `user_test_a_${stamp}`;
const B = `user_test_b_${stamp}`;
const C = `user_test_c_limit_${stamp}`;
const today = utcToday();

const gridDrill: CustomDrillInput = {
  name: 'Grid 4v4',
  description: 'two-touch',
  category: 'small_sided',
  profile: { intensity: 7, sprint: 0.05, hsr: 0.1, cod: 0.4, jump: 0, contact: 0.2, strength: 0 },
  aiEstimated: true,
};

run('Neon schema and row-level security', () => {
  const a = postgresRepo(url!, A);
  const b = postgresRepo(url!, B);
  const c = postgresRepo(url!, C);
  let aSessionId = '';

  beforeAll(async () => {
    await a.createProfile({ position: 'MID', displayName: 'A' });
    await b.createProfile({ position: 'DEF' });
    aSessionId = (await a.addSession({ date: today, type: 'training', duration: 60, rpe: 7, notes: 'test' })).id;
    await a.saveCheckIn({ weekStart: mondayOf(today), sleep: 8, soreness: 2, stress: 3, nutrition: 7 });
    await a.addInjury({ bodyPart: 'Knee (L)', injuryType: 'Tear', severity: 'severe', injuryDate: addDays(today, -100), returnDate: null });
  });

  afterAll(async () => {
    await a.deleteAllData().catch(() => undefined);
    await b.deleteAllData().catch(() => undefined);
    await c.deleteAllData().catch(() => undefined);
  });

  it('returns generated values and keeps dates as calendar strings', async () => {
    const o = await a.overview();
    expect(o.sessions[0]).toMatchObject({ date: today, load: 420 });
    expect(o.recovery[0]).toMatchObject({ weekStart: mondayOf(today), score: 8 });
    expect(o.injuries[0].injuryDate).toBe(addDays(today, -100));
  });

  it("does not show one player's rows to another", async () => {
    const o = await b.overview();
    expect(o.profile?.position).toBe('DEF');
    expect(o.sessions).toHaveLength(0);
    expect(o.recovery).toHaveLength(0);
    expect(o.injuries).toHaveLength(0);
  });

  it('filters rows by policy even without a user_id filter in the query', async () => {
    const rows = await asPlayer(url!, B, (q) => q('select id from public.training_sessions'));
    expect(rows).toHaveLength(0);
    const own = await asPlayer(url!, A, (q) => q('select id from public.training_sessions'));
    expect(own.map((r) => r.id)).toContain(aSessionId);
  });

  it("cannot delete or update another player's rows", async () => {
    expect(await b.deleteSession(aSessionId)).toBe(false);
    const updated = await asPlayer(url!, B, (q) => q("update public.profiles set position = 'GK' where user_id = $1 returning user_id", [A]));
    expect(updated).toHaveLength(0);
    expect((await a.overview()).sessions.map((s) => s.id)).toContain(aSessionId);
  });

  it('cannot write rows for someone else', async () => {
    await expect(
      asPlayer(url!, B, (q) => q("insert into public.profiles (user_id, position, consent_version, age_confirmed) values ($1, 'GK', 'x', true)", [`user_test_c_${stamp}`])),
    ).rejects.toThrow(RepoError);
  });

  it('cannot set protected columns such as the consent time', async () => {
    await expect(asPlayer(url!, B, (q) => q("update public.profiles set consented_at = now() - interval '5 years' where user_id = $1", [B]))).rejects.toMatchObject({ code: '42501' });
  });

  it('stores a dashboard order per player and reads it back', async () => {
    expect((await a.overview()).profile?.dashboardOrder).toEqual([]);
    expect(await a.updateDashboardOrder(['movement', 'score', 'load_chart'])).toEqual(['movement', 'score', 'load_chart']);
    expect((await a.overview()).profile?.dashboardOrder).toEqual(['movement', 'score', 'load_chart']);
    expect((await a.getProfile())?.dashboardOrder).toEqual(['movement', 'score', 'load_chart']);
    expect((await a.exportAll()).profile?.dashboardOrder).toEqual(['movement', 'score', 'load_chart']);
    expect((await b.overview()).profile?.dashboardOrder).toEqual([]);
    expect(await a.updateDashboardOrder(['score'])).toEqual(['score']); // replaces, does not append
    expect(await a.updateDashboardOrder([])).toEqual([]);
    expect((await a.overview()).profile?.dashboardOrder).toEqual([]);
  });

  it("cannot change another player's dashboard order", async () => {
    await a.updateDashboardOrder(['movement', 'score']);
    const updated = await asPlayer(url!, B, (q) => q("update public.profiles set dashboard_order = '{hacked}' where user_id = $1 returning user_id", [A]));
    expect(updated).toHaveLength(0);
    expect((await a.overview()).profile?.dashboardOrder).toEqual(['movement', 'score']);
    expect((await b.overview()).profile?.dashboardOrder).toEqual([]);
    await a.updateDashboardOrder([]);
  });

  it('refuses a dashboard order for a player with no profile', async () => {
    const nobody = postgresRepo(url!, `user_test_nobody_${stamp}`);
    await expect(nobody.updateDashboardOrder(['score'])).rejects.toMatchObject({ code: NO_ROWS });
  });

  it('caps the dashboard order at 30 tiles in the database', async () => {
    const tiles = (n: number) => Array.from({ length: n }, (_, i) => `tile_${i}`);
    expect(await a.updateDashboardOrder(tiles(30))).toHaveLength(30);
    await expect(a.updateDashboardOrder(tiles(31))).rejects.toMatchObject({ code: '23514' });
    await expect(
      asPlayer(url!, A, (q) => q("update public.profiles set dashboard_order = array(select 'tile_' || g from generate_series(1, 31) as g) where user_id = $1", [A])),
    ).rejects.toMatchObject({ code: '23514' });
    expect((await a.overview()).profile?.dashboardOrder).toEqual(tiles(30)); // the refused writes changed nothing
    await a.updateDashboardOrder([]);
  });

  it('enforces checks in the database too', async () => {
    await expect(a.addSession({ date: addDays(today, 30), type: 'training', duration: 60, rpe: 5, notes: '' })).rejects.toMatchObject({ code: '23514' });
  });

  it('replaces the check-in when the same week is saved again', async () => {
    await a.saveCheckIn({ weekStart: mondayOf(today), sleep: 5, soreness: 8, stress: 8, nutrition: 3 });
    const o = await a.overview();
    expect(o.recovery).toHaveLength(1);
    expect(o.recovery[0].sleep).toBe(5);
  });

  it('stores drills with a session and keeps them per player', async () => {
    const s = await a.addSession({ date: today, type: 'training', duration: 60, rpe: 6, notes: '', drills: [{ drillId: 'rondo_4v2', minutes: 20 }] });
    expect(s.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 20 }]);
    const own = (await a.overview()).sessions.find((x) => x.id === s.id);
    expect(own?.drills).toEqual([{ drillId: 'rondo_4v2', minutes: 20 }]);
    const theirs = await asPlayer(url!, B, (q) => q('select id from public.session_drills'));
    expect(theirs).toHaveLength(0);
  });

  it('removes the drills when their session is deleted', async () => {
    const s = await a.addSession({ date: today, type: 'training', duration: 60, rpe: 5, notes: '', drills: [{ drillId: 'rondo_4v2', minutes: 10 }] });
    const before = await asPlayer(url!, A, (q) => q('select id from public.session_drills where session_id = $1', [s.id]));
    expect(before).toHaveLength(1);
    expect(await a.deleteSession(s.id)).toBe(true);
    const after = await asPlayer(url!, A, (q) => q('select id from public.session_drills where session_id = $1', [s.id]));
    expect(after).toHaveLength(0);
  });

  it("cannot attach drills to another player's session", async () => {
    await expect(
      asPlayer(url!, B, (q) => q("insert into public.session_drills (session_id, drill_id, minutes) values ($1, 'rondo_4v2', 10)", [aSessionId])),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('stores custom drills per player and logs them on sessions', async () => {
    const d = await a.addCustomDrill(gridDrill);
    expect(d).toMatchObject({ ...gridDrill, archived: false });
    expect(d.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const s = await a.addSession({ date: today, type: 'training', duration: 60, rpe: 6, notes: '', drills: [{ drillId: `custom:${d.id}`, minutes: 25 }, { drillId: 'rondo_4v2', minutes: 10 }] });
    expect(s.drills).toEqual([{ drillId: `custom:${d.id}`, minutes: 25 }, { drillId: 'rondo_4v2', minutes: 10 }]);
    const o = await a.overview();
    expect(o.customDrills?.map((x) => x.id)).toContain(d.id);
    expect(o.customDrills?.find((x) => x.id === d.id)).toEqual(d);
    expect(o.sessions.find((x) => x.id === s.id)?.drills).toContainEqual({ drillId: `custom:${d.id}`, minutes: 25 });
    expect((await a.exportAll()).customDrills?.map((x) => x.id)).toContain(d.id);
    expect(await asPlayer(url!, B, (q) => q('select id from public.custom_drills'))).toHaveLength(0);
    expect((await b.overview()).customDrills).toEqual([]);
  });

  it("rejects archived, unknown and another player's custom drills, saving nothing", async () => {
    const d = await a.addCustomDrill(gridDrill);
    expect(await a.archiveCustomDrill(d.id)).toBe(true);
    expect(await a.archiveCustomDrill(d.id)).toBe(true); // archiving again changes nothing
    expect(await a.archiveCustomDrill(randomUUID())).toBe(false);
    const before = (await a.overview()).sessions.length;
    const session = (drillId: string) => ({ date: today, type: 'training' as const, duration: 30, rpe: 5, notes: '', drills: [{ drillId, minutes: 10 }] });
    await expect(a.addSession(session(`custom:${d.id}`))).rejects.toMatchObject({ code: UNKNOWN_DRILL });
    await expect(a.addSession(session(`custom:${randomUUID()}`))).rejects.toMatchObject({ code: UNKNOWN_DRILL });
    await expect(a.addSession(session('custom:not-a-uuid'))).rejects.toMatchObject({ code: UNKNOWN_DRILL });
    await expect(a.addSession({ ...session(`custom:${d.id}`), drills: [{ drillId: 'rondo_4v2', minutes: 10 }, { drillId: `custom:${d.id}`, minutes: 10 }] })).rejects.toMatchObject({ code: UNKNOWN_DRILL });
    await expect(b.addSession(session(`custom:${d.id}`))).rejects.toMatchObject({ code: UNKNOWN_DRILL });
    expect((await a.overview()).sessions.length).toBe(before);
    expect((await b.overview()).sessions).toHaveLength(0);
    expect((await a.overview()).customDrills?.find((x) => x.id === d.id)?.archived).toBe(true);
    expect(await b.archiveCustomDrill(d.id)).toBe(false);
  });

  it('keeps archived drills on the sessions that already used them', async () => {
    const d = await a.addCustomDrill(gridDrill);
    const s = await a.addSession({ date: today, type: 'training', duration: 40, rpe: 5, notes: '', drills: [{ drillId: `custom:${d.id}`, minutes: 15 }] });
    expect(await a.archiveCustomDrill(d.id)).toBe(true);
    const o = await a.overview();
    expect(o.sessions.find((x) => x.id === s.id)?.drills).toEqual([{ drillId: `custom:${d.id}`, minutes: 15 }]);
    expect(o.customDrills?.find((x) => x.id === d.id)).toMatchObject({ archived: true, name: gridDrill.name });
  });

  it('stops new custom drills at the active limit, and archived ones do not count', async () => {
    await c.createProfile({ position: 'GK' });
    await asPlayer(url!, C, (q) =>
      q(
        `insert into public.custom_drills (name, category, intensity, sprint, hsr, cod, jump, contact, strength)
         select 'Drill ' || g, 'technical', 5, 0, 0, 0, 0, 0, 0 from generate_series(1, ${MAX_CUSTOM_DRILLS}) as g`,
      ),
    );
    await expect(c.addCustomDrill(gridDrill)).rejects.toMatchObject({ code: CUSTOM_DRILL_LIMIT });
    const first = (await c.overview()).customDrills![0];
    expect(await c.archiveCustomDrill(first.id)).toBe(true);
    await expect(c.addCustomDrill(gridDrill)).resolves.toMatchObject({ name: gridDrill.name });
    await expect(c.addCustomDrill(gridDrill)).rejects.toMatchObject({ code: CUSTOM_DRILL_LIMIT });
  });

  it("blocks direct SQL attaching another player's custom drill", async () => {
    const d = await a.addCustomDrill(gridDrill);
    const bSession = await b.addSession({ date: today, type: 'training', duration: 30, rpe: 5, notes: '' });
    await expect(
      asPlayer(url!, B, (q) => q('insert into public.session_drills (session_id, custom_drill_id, minutes) values ($1, $2, 10)', [bSession.id, d.id])),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('needs exactly one kind of drill per session row', async () => {
    const d = await a.addCustomDrill(gridDrill);
    await expect(asPlayer(url!, A, (q) => q('insert into public.session_drills (session_id, minutes) values ($1, 10)', [aSessionId]))).rejects.toMatchObject({ code: '23514' });
    await expect(
      asPlayer(url!, A, (q) => q("insert into public.session_drills (session_id, drill_id, custom_drill_id, minutes) values ($1, 'rondo_4v2', $2, 10)", [aSessionId, d.id])),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('cannot hard-delete or edit custom drills as the app role', async () => {
    const d = await a.addCustomDrill(gridDrill);
    await expect(asPlayer(url!, A, (q) => q('delete from public.custom_drills where id = $1', [d.id]))).rejects.toMatchObject({ code: '42501' });
    await expect(asPlayer(url!, A, (q) => q("update public.custom_drills set name = 'x' where id = $1", [d.id]))).rejects.toMatchObject({ code: '42501' });
    await expect(asPlayer(url!, A, (q) => q('update public.custom_drills set intensity = 1 where id = $1', [d.id]))).rejects.toMatchObject({ code: '42501' });
    expect((await a.overview()).customDrills?.find((x) => x.id === d.id)?.name).toBe(gridDrill.name);
  });

  it('counts estimates per day and per player', async () => {
    expect(await a.countEstimate(today)).toBe(1);
    expect(await a.countEstimate(today)).toBe(2);
    expect(await a.countEstimate(addDays(today, -1))).toBe(1);
    expect(await b.countEstimate(today)).toBe(1);
    expect(await asPlayer(url!, B, (q) => q('select day from public.ai_usage'))).toHaveLength(1);
  });

  it('cannot move a check-in to another week (no week_start update grant)', async () => {
    await expect(
      asPlayer(url!, A, (q) => q('update public.recovery_checkins set week_start = $1 where user_id = $2', [addDays(mondayOf(today), -7), A])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('deleting the profile removes every record (cascade)', async () => {
    // Make sure there are drills to remove, so the check below cannot pass on an empty table
    await a.addSession({ date: today, type: 'training', duration: 60, rpe: 5, notes: '', drills: [{ drillId: 'rondo_4v2', minutes: 10 }] });
    const d = await a.addCustomDrill(gridDrill);
    await a.addSession({ date: today, type: 'training', duration: 60, rpe: 5, notes: '', drills: [{ drillId: `custom:${d.id}`, minutes: 10 }] });
    await a.countEstimate(today);
    const before = await asPlayer(url!, A, (q) => q('select id from public.session_drills'));
    expect(before.length).toBeGreaterThan(0);
    expect(await asPlayer(url!, A, (q) => q('select id from public.custom_drills'))).not.toHaveLength(0);
    expect(await asPlayer(url!, A, (q) => q('select day from public.ai_usage'))).not.toHaveLength(0);
    await a.deleteAllData();
    const o = await a.overview();
    expect(o.profile).toBeNull();
    expect(o.sessions).toHaveLength(0);
    expect(o.injuries).toHaveLength(0);
    expect(o.customDrills).toHaveLength(0);
    const after = await asPlayer(url!, A, (q) => q('select id from public.session_drills'));
    expect(after).toHaveLength(0);
    expect(await asPlayer(url!, A, (q) => q('select id from public.custom_drills'))).toHaveLength(0);
    expect(await asPlayer(url!, A, (q) => q('select day from public.ai_usage'))).toHaveLength(0);
  });
});
