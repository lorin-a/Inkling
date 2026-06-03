-- The cross-project "well": every tagged reference a user has pulled, from any
-- project (VISION §15). Unlike pins / moodboards / palettes (project_id-scoped),
-- the well is scoped by USER so atoms surface across all their projects.
-- project_id + pin_id are kept for PROVENANCE only (nullable, ON DELETE SET NULL
-- for the project) — losing the source project must not lose the atom.
--
-- `visual` is JSONB (kind-specific: image crop / color hex / type specimen) so
-- one table unifies color/type/image without a column-per-kind sprawl. The
-- stable `id` lets a future votes.target_type='reference' / comments address an
-- atom with no remodel (the dormant collab substrate, migrations/001).
--
--   atom = { id, kind, dimension, tags[], visual{}, source{}, created_at, updated_at }

CREATE TABLE IF NOT EXISTS atoms (
  id          TEXT PRIMARY KEY DEFAULT ('at_' || gen_random_uuid()::text),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'image',       -- image | color | type
  dimension   TEXT NOT NULL DEFAULT '',            -- type | color | imagery | …
  tags        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- the user's words
  visual      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- kind-specific render data
  source      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {sourceUrl,sourceDomain,credit,pinId,projectId}
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,  -- provenance only
  pin_id      TEXT,                                 -- provenance only (pins are composite-keyed)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atoms_user ON atoms(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atoms_user_dim ON atoms(user_id, dimension);
