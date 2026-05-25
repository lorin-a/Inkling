-- Identity layer (Auth.js-compatible) + project ownership.
--
-- Auth.js v5 with Postgres + JWT session strategy needs three tables:
--   users                — the account itself
--   accounts             — linked OAuth providers (Google, etc.)
--   verification_tokens  — magic-link tokens
-- (No `sessions` table — JWT strategy keeps session in the cookie, and
--  also avoids colliding with Moodvote's existing `sessions` table for
--  anonymous rater sessions.)
--
-- Column naming follows Auth.js conventions exactly. The camelCase
-- identifiers are quoted because Postgres lowercases unquoted ones.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT,
  email           TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  "userId"             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  provider             TEXT NOT NULL,
  "providerAccountId"  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           BIGINT,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  PRIMARY KEY (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Projects — the multi-tenant unit. One owner, many projects.
-- Slug is unique per owner, not globally, so two users can both have
-- a project called "whelm" without colliding.
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  wordmark        TEXT,
  period          TEXT DEFAULT '.',
  initial         TEXT,
  tagline         TEXT,
  body            TEXT,
  fonts           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts("userId");
