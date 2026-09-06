-- The studio, on the server (Phase 1).
--
-- One row per studio board: the pool of cards it was opened with (a snapshot
-- of the library, so the board is self-contained wherever it is read from) and
-- the shared state (positions, groups, notes, which steps have been taken).
-- Shared state saves whole-document; that is fine for two people reacting
-- alone at different times and is not fine for two hands on one board at
-- once, which is why grouping stays one-driver until multiplayer.
--
-- Members join by link: the token IS the identity. No account needed.
-- Votes are one row per member per card and are private until the reveal.

CREATE TABLE IF NOT EXISTS studio_boards (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_slug  TEXT NOT NULL,
  name          TEXT NOT NULL,
  cards         JSONB NOT NULL DEFAULT '[]'::jsonb,
  state         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_members (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id    TEXT NOT NULL REFERENCES studio_boards(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_votes (
  board_id    TEXT NOT NULL REFERENCES studio_boards(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES studio_members(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,
  tag         TEXT CHECK (tag IN ('keep', 'maybe', 'no', 'undecided')),
  why         TEXT,
  round       INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, member_id, card_id)
);

-- A member's own words, private until the reveal: first words about the brand
-- (before the vote) and, later, anything else that is theirs alone.
CREATE TABLE IF NOT EXISTS studio_words (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id    TEXT NOT NULL REFERENCES studio_boards(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES studio_members(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'first',
  text        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_members_board ON studio_members(board_id);
CREATE INDEX IF NOT EXISTS idx_studio_votes_board ON studio_votes(board_id);
CREATE INDEX IF NOT EXISTS idx_studio_words_board ON studio_words(board_id);
