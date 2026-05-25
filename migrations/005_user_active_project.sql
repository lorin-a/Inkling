-- Active project per user. Replaces data/active-project.json from the
-- single-tenant file-based model. Nullable because a brand-new user
-- hasn't created a project yet.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_project_id TEXT
    REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_project ON users(last_active_project_id);
