-- ─── Sprint 5: Client Approval, Budget Tracking ──────────────────────────────

-- New enum types
CREATE TYPE client_approval_status AS ENUM ('none', 'pending', 'client_approved', 'client_rejected');
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'client_review';

-- Client approval fields on tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_approval          client_approval_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS client_rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS client_reviewed_by       UUID REFERENCES client_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_reviewed_at       TIMESTAMPTZ;

-- Budget entries
CREATE TABLE IF NOT EXISTS budget_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES users(id),
  amount       NUMERIC(12,2) NOT NULL,
  category     TEXT        NOT NULL,
  description  TEXT,
  entry_date   DATE        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_entries_project_id ON budget_entries(project_id);
