-- Board-level background colour for moodboards. A hex string (or NULL for the
-- default dot-grid surface). Kept simple as TEXT; if board texture/paper lands
-- later it can grow into its own column or a jsonb blob.

ALTER TABLE moodboards ADD COLUMN IF NOT EXISTS background TEXT;
