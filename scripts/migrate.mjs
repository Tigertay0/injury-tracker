// Applies db/migrations/*.sql in name order, once each, inside a transaction per file.
// Usage: DATABASE_URL=postgres://owner:...@host/db?sslmode=require node scripts/migrate.mjs
// The URL must be the Neon owner role (direct, not pooled). It is read from the
// environment or from .dev.vars (git-ignored); it is never printed.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const devVars = join(root, '.dev.vars');
  if (existsSync(devVars)) {
    const line = readFileSync(devVars, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  }
  throw new Error('DATABASE_URL is not set (environment or .dev.vars).');
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
try {
  await client.query(`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await client.query('select name from public._migrations')).rows.map((r) => r.name));
  const dir = join(root, 'db', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into public._migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log(`applied ${file}`);
      ran++;
    } catch (err) {
      await client.query('rollback');
      throw new Error(`${file} failed: ${err.message}`);
    }
  }
  console.log(ran ? `${ran} migration(s) applied` : 'database is up to date');
} finally {
  await client.end();
}
