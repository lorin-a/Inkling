import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Did .env.local pull?');
  process.exit(1);
}

const sql = neon(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS instances (
    id            TEXT PRIMARY KEY,
    slug          TEXT NOT NULL,
    owner_key     TEXT NOT NULL,
    audience      TEXT NOT NULL CHECK (audience IN ('public', 'private')),
    vote_unit     TEXT NOT NULL CHECK (vote_unit IN ('preset', 'element')),
    project_state JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS invites (
    id                  TEXT PRIMARY KEY,
    instance_id         TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    token               TEXT NOT NULL UNIQUE,
    label               TEXT,
    claimed_session_id  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    instance_id   TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS presets (
    id                 TEXT PRIMARY KEY,
    instance_id        TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    author_session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    snapshot           JSONB NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS votes (
    id            TEXT PRIMARY KEY,
    instance_id   TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    target_type   TEXT NOT NULL CHECK (target_type IN ('preset', 'palette', 'font', 'mark')),
    target_id     TEXT NOT NULL,
    value         INTEGER NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, target_type, target_id)
  )`,

  `CREATE TABLE IF NOT EXISTS comments (
    id            TEXT PRIMARY KEY,
    instance_id   TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    target_type   TEXT NOT NULL,
    target_id     TEXT NOT NULL,
    body          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_invites_instance ON invites(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_instance ON sessions(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_presets_instance ON presets(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_votes_instance ON votes(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(instance_id, target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(instance_id, target_type, target_id)`,
];

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
  process.stdout.write(`→ ${preview}…  `);
  await sql.query(stmt);
  process.stdout.write('ok\n');
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`
);
console.log('\nTables in public schema:');
for (const row of tables) console.log(`  • ${row.table_name}`);
