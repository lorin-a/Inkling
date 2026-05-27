-- Community submissions: resource suggestions and feedback / feature
-- requests. Anyone can submit (anonymously); an admin reviews. Approved
-- resources surface on /resources alongside the curated seed; feedback is
-- read-only for the admin. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS submissions (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('resource', 'feedback')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  payload         JSONB NOT NULL,        -- resource: {name,url,category,note}; feedback: {topic,message}
  submitter_email TEXT,                  -- optional; null for anonymous
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
);

-- The review queue is read by status (pending first); index it.
CREATE INDEX IF NOT EXISTS submissions_status_created_idx
  ON submissions (status, created_at DESC);

-- /resources reads approved resources; index that hot path.
CREATE INDEX IF NOT EXISTS submissions_kind_status_idx
  ON submissions (kind, status);
