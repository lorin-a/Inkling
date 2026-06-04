-- Comment pins on a moodboard: Figma-style annotation droppable anywhere, each a
-- short thread. Private notes now; the same data is the client-comment layer when a
-- board is shared (VISION §16F). A jsonb array, mirroring blocks + sections.
-- Shape: [{ id, x, y, messages: [{ author, text, at }], resolved, createdAt }]

ALTER TABLE moodboards ADD COLUMN IF NOT EXISTS comments JSONB NOT NULL DEFAULT '[]'::jsonb;
