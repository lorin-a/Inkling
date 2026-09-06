-- Comments on cards: the shared vocabulary. Unlike votes and their "why",
-- a comment is addressed to the others and is visible to everyone at once.

CREATE TABLE IF NOT EXISTS studio_comments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id    TEXT NOT NULL REFERENCES studio_boards(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES studio_members(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_comments_board ON studio_comments(board_id, card_id);
