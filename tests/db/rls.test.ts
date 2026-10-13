// Runs against a real Neon database (a throwaway branch), never production.
// DATABASE_URL_TEST must point at a database where `npm run db:migrate` has run.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asPlayer, postgresRepo, RepoError } from '../../worker/repo';
import { addDays, mondayOf, utcToday } from '../../shared/dates';

const url = process.env.DATABASE_URL_TEST;
const run = url ? describe : describe.skip;

const stamp = Date.now().toString(36);
const A = `user_test_a_${stamp}`;
const B = `user_test_b_${stamp}`;
const today = utcToday();

run('Neon schema and row-level security', () => {
  const a = postgresRepo(url!, A);
  const b = postgresRepo(url!, B);
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

  it('enforces checks in the database too', async () => {
    await expect(a.addSession({ date: addDays(today, 30), type: 'training', duration: 60, rpe: 5, notes: '' })).rejects.toMatchObject({ code: '23514' });
  });

  it('replaces the check-in when the same week is saved again', async () => {
    await a.saveCheckIn({ weekStart: mondayOf(today), sleep: 5, soreness: 8, stress: 8, nutrition: 3 });
    const o = await a.overview();
    expect(o.recovery).toHaveLength(1);
    expect(o.recovery[0].sleep).toBe(5);
  });

  it('deleting the profile removes every record (cascade)', async () => {
    await a.deleteAllData();
    const o = await a.overview();
    expect(o.profile).toBeNull();
    expect(o.sessions).toHaveLength(0);
    expect(o.injuries).toHaveLength(0);
  });
});
