-- Moodboard canvases, per project.
--
-- A "moodboard" here is the spatial canvas (Act I) — distinct from the
-- `boards` table, which holds imported Pinterest board metadata. Each row
-- is one canvas document: a name plus a JSONB array of blocks. Blocks are
-- our own data (not an engine's shapes), so image blocks carry their pin's
-- source URL + credit inline — credit preservation is a hard requirement.
--
--   block = { id, type, x, y, w, h, z, payload }
--   image payload → { src, sourceUrl, pinId, credit, sourceDomain }
--
-- Whole-document save (the route PUTs the full board); object-per-block
-- granularity is a later (Liveblocks) concern this shape already maps onto.

CREATE TABLE IF NOT EXISTS moodboards (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled board',
  blocks      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboards_project ON moodboards(project_id, updated_at DESC);
