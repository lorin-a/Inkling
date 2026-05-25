-- Training signal + saved-snapshot tables.
--
-- palettes_saved   the ★ Save on /colors palette rows. Palette-level
--                  taste data. The Brand shuffle samples weighted 4× from
--                  these.
-- colors_saved     atomic hex stars ("My colors" in the audit). Optional
--                  for the user; supports the "I have a color in mind"
--                  Stage 3 flow.
-- project_palette  the locked brand identity colors + curated rows + the
--                  source-pool seeds for a project. JSONB to match the
--                  current file-based shape from lib/paletteStore.js
--                  exactly.
-- bookmarked_palettes  ★ Bookmark palette on /brand. Lightweight color-
--                      only saves; lighter than brand_presets.
-- brand_presets    full identity snapshots — palette + fonts + textures
--                  + role overrides — distinct from Moodvote's existing
--                  instance-scoped `presets` table.

CREATE TABLE IF NOT EXISTS palettes_saved (
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pin_id       TEXT NOT NULL,
  saved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, pin_id),
  FOREIGN KEY (project_id, pin_id) REFERENCES pins(project_id, pin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS colors_saved (
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hex         TEXT NOT NULL CHECK (hex ~* '^#[0-9a-f]{6}$'),
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, hex)
);

CREATE TABLE IF NOT EXISTS project_palette (
  project_id   TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  brand        JSONB NOT NULL DEFAULT '{}'::jsonb,
  inspiration  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarked_palettes (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT,
  hexes        JSONB NOT NULL,
  pool_key     TEXT,
  size         INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_presets (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  snapshot      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_palettes_saved_project ON palettes_saved(project_id);
CREATE INDEX IF NOT EXISTS idx_colors_saved_project ON colors_saved(project_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_project ON bookmarked_palettes(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_presets_project ON brand_presets(project_id, created_at DESC);
