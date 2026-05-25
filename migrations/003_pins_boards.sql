-- Pinterest moodboard storage, per project.
--
-- `pins` mirrors the shape of objects in lib/moodboardStore.js so
-- migrating file-based library.json data is mostly a 1:1 column copy.
-- `boards` captures the metadata for each imported Pinterest board.

CREATE TABLE IF NOT EXISTS pins (
  project_id           TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pin_id               TEXT NOT NULL,
  pin_url              TEXT,
  image_original       TEXT,
  image_display        TEXT,
  thumbnail_236        TEXT,
  alt                  TEXT,
  title                TEXT,
  description          TEXT,
  source_url           TEXT,
  source_domain        TEXT,
  pinner               TEXT,
  pinner_url           TEXT,
  palette              JSONB,
  palette_extracted_at TIMESTAMPTZ,
  enriched_at          TIMESTAMPTZ,
  enrichment_ok        BOOLEAN,
  tags                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  added_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, pin_id)
);

CREATE TABLE IF NOT EXISTS boards (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  board_url    TEXT NOT NULL,
  board_name   TEXT,
  pinner       TEXT,
  captured_at  TIMESTAMPTZ,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INTEGER,
  UNIQUE (project_id, board_url)
);

CREATE INDEX IF NOT EXISTS idx_pins_project ON pins(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_added ON pins(project_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_missing_palette ON pins(project_id) WHERE palette IS NULL;
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
