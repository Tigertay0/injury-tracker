import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries: { text: string; values?: unknown[] }[] = [];
let activeCount = 0;

vi.mock('pg', () => {
  class Client {
    connect = async () => undefined;
    end = async () => undefined;
    query = async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      if (text.includes('count(*)')) return { rows: [{ n: activeCount }] };
      if (text.includes('insert into public.custom_drills')) {
        return { rows: [{ id: 'd1', name: 'Grid', description: '', category: 'small_sided', intensity: 7, sprint: 0, hsr: 0, cod: 0, jump: 0, contact: 0, strength: 0, ai_estimated: false, archived_at: null, created_at: '2026-10-18T00:00:00Z' }] };
      }
      return { rows: [] };
    };
  }
  return { default: { Client, types: { getTypeParser: () => (v: string) => v } } };
});

import { CUSTOM_DRILL_LIMIT, postgresRepo } from '../worker/repo';
import { MAX_CUSTOM_DRILLS } from '../shared/custom-drills';
import type { CustomDrillInput } from '../shared/validation';

const input: CustomDrillInput = {
  name: 'Grid',
  description: '',
  category: 'small_sided',
  profile: { intensity: 7, sprint: 0, hsr: 0, cod: 0, jump: 0, contact: 0, strength: 0 },
  aiEstimated: false,
};

const index = (needle: string) => queries.findIndex((q) => q.text.includes(needle));

describe('addCustomDrill locking', () => {
  beforeEach(() => {
    queries.length = 0;
    activeCount = 0;
  });

  it('takes the per-player advisory lock before counting, inside the transaction', async () => {
    await postgresRepo('postgres://x', 'user_1').addCustomDrill(input);
    const lock = index('pg_advisory_xact_lock');
    expect(lock).toBeGreaterThan(index('begin'));
    expect(lock).toBeLessThan(index('count(*)'));
    expect(lock).toBeLessThan(index('insert into public.custom_drills'));
    expect(queries[lock].values).toEqual(['user_1']);
    expect(index('commit')).toBeGreaterThan(index('insert into public.custom_drills'));
  });

  it('still rejects at the limit with the same code, without inserting', async () => {
    activeCount = MAX_CUSTOM_DRILLS;
    await expect(postgresRepo('postgres://x', 'user_1').addCustomDrill(input)).rejects.toMatchObject({
      code: CUSTOM_DRILL_LIMIT,
      message: `You can keep ${MAX_CUSTOM_DRILLS} drills. Archive one to add another.`,
    });
    expect(index('pg_advisory_xact_lock')).toBeLessThan(index('count(*)'));
    expect(index('insert into public.custom_drills')).toBe(-1);
    expect(index('rollback')).toBeGreaterThan(-1);
  });
});
