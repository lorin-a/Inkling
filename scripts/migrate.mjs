import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv(); // also pick up .env if present
import { neon } from '@neondatabase/serverless';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Did .env.local pull?');
  process.exit(1);
}

const sql = neon(url);
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Track which migration files have run so re-runs are no-ops. The
// tracking table itself is bootstrapped here (idempotent).
await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const applied = new Set(
  (await sql.query('SELECT filename FROM schema_migrations')).map((r) => r.filename),
);

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found in migrations/. Nothing to do.');
  process.exit(0);
}

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`✓ ${file} (already applied)`);
    continue;
  }
  const path = join(MIGRATIONS_DIR, file);
  const body = await readFile(path, 'utf8');
  // Strip line comments and split on bare semicolons. SQL files in
  // migrations/ avoid functions/triggers that need $$ blocks, so this
  // simple split is enough.
  const statements = body
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  process.stdout.write(`→ ${file} (${statements.length} statements)…  `);
  try {
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    await sql.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    process.stdout.write('ok\n');
    ran++;
  } catch (e) {
    process.stdout.write('FAIL\n');
    console.error(`\nMigration ${file} failed:\n  ${e.message}`);
    process.exit(1);
  }
}

if (ran === 0) {
  console.log('\nAll migrations already applied. Nothing to do.');
} else {
  console.log(`\nApplied ${ran} migration${ran === 1 ? '' : 's'}.`);
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`,
);
console.log('\nTables in public schema:');
for (const row of tables) console.log(`  • ${row.table_name}`);
