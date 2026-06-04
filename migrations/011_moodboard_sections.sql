-- Workshop-board affinity sections (VISION §15/§16D). Named, resizable zones
-- you sort references into; membership is computed from block position, so a
-- section stores only its own frame + label + an optional reflective note.
-- A jsonb array, mirroring how blocks live on the board document.

ALTER TABLE moodboards ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;
