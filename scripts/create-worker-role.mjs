// Creates (or rotates the password of) the login role the Worker uses: pitchsafe_worker.
// It owns nothing, cannot bypass RLS, and may only SET ROLE to pitchsafe_app, so a query
// that skipped the per-request player id would still see no rows.
//
// Usage: DATABASE_URL=<owner url> node scripts/create-worker-role.mjs <output-file>
// Writes the worker's connection string to <output-file> (keep it out of git) and
// prints nothing secret.
import { randomBytes } from 'node:crypto';
import { renameSync, unlinkSync, writeFileSync } from 'node:fs';
import pg from 'pg';

const out = process.argv[2];
if (!process.env.DATABASE_URL || !out) {
  console.error('Usage: DATABASE_URL=<owner url> node scripts/create-worker-role.mjs <output-file>');
  process.exit(1);
}

const ROLE = 'pitchsafe_worker';
const password = randomBytes(24).toString('base64url'); // 192 bits, URL-safe
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  // Write a temp file first: if the path is bad we fail before the live password changes, and the
  // real file is only replaced once the role is set
  const url = new URL(process.env.DATABASE_URL);
  url.username = ROLE;
  url.password = password;
  url.searchParams.delete('channel_binding');
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, url.toString(), { mode: 0o600 });

  const exists = (await client.query('select 1 from pg_roles where rolname = $1', [ROLE])).rowCount > 0;
  const pw = client.escapeLiteral(password);
  if (exists) {
    await client.query(`alter role ${ROLE} with login nobypassrls noinherit nosuperuser nocreaterole nocreatedb password ${pw}`);
  } else {
    await client.query(`create role ${ROLE} with login nobypassrls noinherit password ${pw}`);
  }
  await client.query(`grant pitchsafe_app to ${ROLE}`);
  await client.query(`grant connect on database ${client.escapeIdentifier(client.database)} to ${ROLE}`);
  renameSync(tmp, out);
  console.log(`${exists ? 'rotated' : 'created'} ${ROLE}; connection string written to ${out}`);
} catch (err) {
  // Never leave a connection string whose password was not set
  try { unlinkSync(`${out}.tmp`); } catch {}
  throw err;
} finally {
  await client.end();
}
